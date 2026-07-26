-- =====================================================================
--  Portal LMS — People + Course settings + Self-signup + Bundles
--  Consolidated & idempotent. Run this once (supersedes users.sql).
-- =====================================================================

-- ---- member status --------------------------------------------------
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active','suspended'));

-- ---- course settings (Thinkific-style) ------------------------------
alter table public.courses add column if not exists enrollment_required boolean not null default false;
alter table public.courses add column if not exists self_enroll boolean not null default false;
alter table public.courses add column if not exists visibility text not null default 'published'
  check (visibility in ('draft','published','hidden'));
-- migrate legacy published flag -> visibility (first run only)
update public.courses set visibility = case when coalesce(published,true) then 'published' else 'draft' end
 where visibility is null;

-- ---- ENROLLMENTS ----------------------------------------------------
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz,
  enrolled_by uuid references auth.users(id) on delete set null,
  unique(course_id, user_id)
);
alter table public.course_enrollments enable row level security;
drop policy if exists "enroll read own or admin" on public.course_enrollments;
create policy "enroll read own or admin" on public.course_enrollments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "enroll write admin" on public.course_enrollments;
create policy "enroll write admin" on public.course_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- BUNDLES --------------------------------------------------------
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, cover_url text,
  visibility text not null default 'published' check (visibility in ('draft','published','hidden')),
  self_enroll boolean not null default false,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.bundle_courses (
  bundle_id uuid references public.bundles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  primary key (bundle_id, course_id)
);
create table if not exists public.bundle_enrollments (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid references public.bundles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  expires_at timestamptz,
  enrolled_by uuid references auth.users(id) on delete set null,
  unique(bundle_id, user_id)
);
alter table public.bundles enable row level security;
alter table public.bundle_courses enable row level security;
alter table public.bundle_enrollments enable row level security;
drop policy if exists "bundles read" on public.bundles;
create policy "bundles read" on public.bundles for select to authenticated
  using (public.is_admin() or visibility in ('published','hidden'));
drop policy if exists "bundles write admin" on public.bundles;
create policy "bundles write admin" on public.bundles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "bundle_courses read" on public.bundle_courses;
create policy "bundle_courses read" on public.bundle_courses for select to authenticated using (true);
drop policy if exists "bundle_courses write admin" on public.bundle_courses;
create policy "bundle_courses write admin" on public.bundle_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "bundle_enroll read own or admin" on public.bundle_enrollments;
create policy "bundle_enroll read own or admin" on public.bundle_enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "bundle_enroll write admin" on public.bundle_enrollments;
create policy "bundle_enroll write admin" on public.bundle_enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- ACCESS helper (visibility + enrollment + bundle) ---------------
create or replace function public.has_course_access(p_course uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.courses c
    where c.id = p_course and c.visibility <> 'draft'
      and ( coalesce(c.enrollment_required,false) = false
        or exists (select 1 from public.course_enrollments e
                   where e.course_id = c.id and e.user_id = auth.uid()
                     and (e.expires_at is null or e.expires_at > now()))
        or exists (select 1 from public.bundle_courses bc
                   join public.bundle_enrollments be on be.bundle_id = bc.bundle_id
                   where bc.course_id = c.id and be.user_id = auth.uid()
                     and (be.expires_at is null or be.expires_at > now())) )
  );
$$;

-- ---- self sign-up RPCs ----------------------------------------------
create or replace function public.self_enroll(p_course uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.courses where id = p_course and coalesce(self_enroll,false) = true) then
    raise exception 'Self sign-up is not enabled for this course';
  end if;
  insert into public.course_enrollments(course_id, user_id, enrolled_by)
    values (p_course, auth.uid(), auth.uid())
    on conflict (course_id, user_id) do nothing;
end; $$;
grant execute on function public.self_enroll(uuid) to authenticated;

create or replace function public.self_enroll_bundle(p_bundle uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.bundles where id = p_bundle and coalesce(self_enroll,false) = true) then
    raise exception 'Self sign-up is not enabled for this bundle';
  end if;
  insert into public.bundle_enrollments(bundle_id, user_id, enrolled_by)
    values (p_bundle, auth.uid(), auth.uid())
    on conflict (bundle_id, user_id) do nothing;
end; $$;
grant execute on function public.self_enroll_bundle(uuid) to authenticated;

-- ---- gated read policies (catalog vs content) -----------------------
-- Catalog: members see non-draft courses (so they can sign up); admins see all.
drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select to authenticated
  using (public.is_admin() or visibility in ('published','hidden'));

-- Content: modules/lessons gated by enrollment/bundle access.
drop policy if exists "modules read authenticated" on public.modules;
drop policy if exists "modules read access" on public.modules;
create policy "modules read access" on public.modules for select to authenticated
  using (public.has_course_access(course_id));

drop policy if exists "lessons read authenticated" on public.lessons;
drop policy if exists "lessons read access" on public.lessons;
create policy "lessons read access" on public.lessons for select to authenticated
  using (exists (select 1 from public.modules m
                 where m.id = lessons.module_id and public.has_course_access(m.course_id)));

-- ---- GROUPS ---------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  created_at timestamptz not null default now());
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, primary key (group_id, user_id));
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
drop policy if exists "groups admin" on public.groups;
create policy "groups admin" on public.groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "group members admin or self" on public.group_members;
create policy "group members admin or self" on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "group members write admin" on public.group_members;
create policy "group members write admin" on public.group_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- EMAIL log ------------------------------------------------------
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(), subject text, body text,
  sent_by uuid references auth.users(id) on delete set null,
  recipient_count int default 0, created_at timestamptz not null default now());
create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.email_messages(id) on delete cascade,
  email text, user_id uuid, status text default 'queued', error text,
  created_at timestamptz not null default now());
alter table public.email_messages enable row level security;
alter table public.email_recipients enable row level security;
drop policy if exists "email admin" on public.email_messages;
create policy "email admin" on public.email_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "email rcpt admin" on public.email_recipients;
create policy "email rcpt admin" on public.email_recipients for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- members overview view -----------------------------------------
create or replace view public.members_overview with (security_invoker = true) as
  select p.id, p.full_name, p.email, p.role, p.status, p.created_at,
    (select count(*) from public.course_enrollments e where e.user_id = p.id) as enrollments,
    (select count(*) from public.lesson_progress lp where lp.user_id = p.id) as lessons_done
  from public.profiles p;

-- =====================================================================
--  Done.
-- =====================================================================
