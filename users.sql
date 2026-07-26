-- =====================================================================
--  Portal LMS — People: enrollment, groups, email, access gating
--  Safe to run multiple times.
-- =====================================================================

-- 0. member status (active / suspended) ------------------------------
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active','suspended'));

-- courses can require enrollment (default: open to all members) -------
alter table public.courses add column if not exists enrollment_required boolean not null default false;

-- 1. ENROLLMENTS -----------------------------------------------------
create table if not exists public.course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  expires_at  timestamptz,                 -- null = never expires
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

-- 2. ACCESS helper + enrollment-gated RLS ----------------------------
create or replace function public.has_course_access(p_course uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.courses c
                 where c.id = p_course and coalesce(c.enrollment_required,false) = false)
      or exists (select 1 from public.course_enrollments e
                 where e.course_id = p_course and e.user_id = auth.uid()
                   and (e.expires_at is null or e.expires_at > now()));
$$;

-- courses: members see only accessible courses (admins see all)
drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses
  for select to authenticated using (public.has_course_access(id));

-- modules gated by their course
drop policy if exists "modules read authenticated" on public.modules;
drop policy if exists "modules read access" on public.modules;
create policy "modules read access" on public.modules
  for select to authenticated using (public.has_course_access(course_id));

-- lessons gated by their module's course
drop policy if exists "lessons read authenticated" on public.lessons;
drop policy if exists "lessons read access" on public.lessons;
create policy "lessons read access" on public.lessons
  for select to authenticated using (
    exists (select 1 from public.modules m
            where m.id = lessons.module_id and public.has_course_access(m.course_id)));

-- 3. GROUPS ----------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  primary key (group_id, user_id)
);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
drop policy if exists "groups admin" on public.groups;
create policy "groups admin" on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "group members admin or self" on public.group_members;
create policy "group members admin or self" on public.group_members
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "group members write admin" on public.group_members;
create policy "group members write admin" on public.group_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. EMAIL log -------------------------------------------------------
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  subject text,
  body text,
  sent_by uuid references auth.users(id) on delete set null,
  recipient_count int default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.email_messages(id) on delete cascade,
  email text, user_id uuid,
  status text default 'queued', error text,
  created_at timestamptz not null default now()
);
alter table public.email_messages enable row level security;
alter table public.email_recipients enable row level security;
drop policy if exists "email admin" on public.email_messages;
create policy "email admin" on public.email_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "email rcpt admin" on public.email_recipients;
create policy "email rcpt admin" on public.email_recipients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. Convenience view: members with enrollment + progress counts -----
create or replace view public.members_overview
  with (security_invoker = true) as
  select p.id, p.full_name, p.email, p.role, p.status, p.created_at,
    (select count(*) from public.course_enrollments e where e.user_id = p.id) as enrollments,
    (select count(*) from public.lesson_progress lp where lp.user_id = p.id) as lessons_done
  from public.profiles p;

-- =====================================================================
--  Done.
-- =====================================================================
