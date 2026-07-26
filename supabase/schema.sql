-- =====================================================================
--  Harvey Sarnat NNCC Fellowship — Member Portal
--  Supabase database schema, security policies, and triggers
--  Run this ONCE in Supabase → SQL Editor → New query → Run
-- =====================================================================

-- =====================================================================
-- 1.  PROFILES  (one row per user, linked to auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        text not null default 'member' check (role in ('member','admin')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the *current* user an admin?  (SECURITY DEFINER avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Any signed-in member can read the directory of profiles
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may update their own name; admins may update anyone (e.g. change role)
drop policy if exists "profiles update self or admin" on public.profiles;
create policy "profiles update self or admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Only admins may delete a profile
drop policy if exists "profiles delete admin" on public.profiles;
create policy "profiles delete admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());


-- =====================================================================
-- 2.  AUTO-CREATE a profile whenever an auth user is created.
--     The first time khorshid.mohammad@gmail.com signs up / is invited,
--     they are automatically made an admin.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    case when lower(new.email) = 'khorshid.mohammad@gmail.com' then 'admin' else 'member' end
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email     = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =====================================================================
-- 3.  RESOURCES  (private members-only links / documents)
-- =====================================================================
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  url         text,
  category    text default 'General',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.resources enable row level security;

drop policy if exists "resources read authenticated" on public.resources;
create policy "resources read authenticated"
  on public.resources for select to authenticated using (true);

drop policy if exists "resources write admin" on public.resources;
create policy "resources write admin"
  on public.resources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- =====================================================================
-- 4.  MODULES + LESSONS  (Thinkific-style learning area)
-- =====================================================================
create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  sort_order  int  default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid references public.modules(id) on delete cascade,
  title       text not null,
  content     text,          -- HTML / text body of the lesson
  video_url   text,          -- optional embedded video (YouTube, etc.)
  sort_order  int  default 0,
  created_at  timestamptz not null default now()
);

-- Track which lessons a member has completed
create table if not exists public.lesson_progress (
  user_id      uuid references auth.users(id) on delete cascade,
  lesson_id    uuid references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "modules read authenticated" on public.modules;
create policy "modules read authenticated"
  on public.modules for select to authenticated using (true);
drop policy if exists "modules write admin" on public.modules;
create policy "modules write admin"
  on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lessons read authenticated" on public.lessons;
create policy "lessons read authenticated"
  on public.lessons for select to authenticated using (true);
drop policy if exists "lessons write admin" on public.lessons;
create policy "lessons write admin"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "progress owner" on public.lesson_progress;
create policy "progress owner"
  on public.lesson_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- =====================================================================
-- 5.  FORUM  (threads + posts)
-- =====================================================================
create table if not exists public.forum_threads (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid references public.forum_threads(id) on delete cascade,
  body        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.forum_threads enable row level security;
alter table public.forum_posts   enable row level security;

drop policy if exists "threads read authenticated" on public.forum_threads;
create policy "threads read authenticated"
  on public.forum_threads for select to authenticated using (true);
drop policy if exists "posts read authenticated" on public.forum_posts;
create policy "posts read authenticated"
  on public.forum_posts for select to authenticated using (true);

drop policy if exists "threads insert authenticated" on public.forum_threads;
create policy "threads insert authenticated"
  on public.forum_threads for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "posts insert authenticated" on public.forum_posts;
create policy "posts insert authenticated"
  on public.forum_posts for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "threads delete own or admin" on public.forum_threads;
create policy "threads delete own or admin"
  on public.forum_threads for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
drop policy if exists "posts delete own or admin" on public.forum_posts;
create policy "posts delete own or admin"
  on public.forum_posts for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());


-- =====================================================================
-- 6.  Convenience views: forum rows joined with author name
-- =====================================================================
create or replace view public.forum_threads_view
  with (security_invoker = true) as
  select t.*, pr.full_name as author_name,
         (select count(*) from public.forum_posts fp where fp.thread_id = t.id) as post_count
  from public.forum_threads t
  left join public.profiles pr on pr.id = t.created_by;

create or replace view public.forum_posts_view
  with (security_invoker = true) as
  select p.*, pr.full_name as author_name
  from public.forum_posts p
  left join public.profiles pr on pr.id = p.created_by;

-- =====================================================================
--  Done.  Next: deploy the 'invite-user' Edge Function (see guide).
-- =====================================================================
