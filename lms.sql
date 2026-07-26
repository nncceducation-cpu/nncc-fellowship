-- =====================================================================
--  Portal LMS upgrade — Courses > Chapters > Lessons + media storage
--  Safe to run multiple times.
-- =====================================================================

-- 1. COURSES (top level) ------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  sort_order  int  default 0,
  published   boolean default true,
  created_at  timestamptz not null default now()
);
alter table public.courses enable row level security;

drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses
  for select to authenticated using (true);
drop policy if exists "courses write admin" on public.courses;
create policy "courses write admin" on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2. CHAPTERS = existing "modules" table, now nested under a course -----
alter table public.modules add column if not exists course_id uuid
  references public.courses(id) on delete cascade;

-- 3. LESSONS: richer media fields --------------------------------------
alter table public.lessons add column if not exists external_url text;
alter table public.lessons add column if not exists lesson_type  text;
alter table public.lessons add column if not exists file_url     text;   -- pdf / image / download / uploaded video
alter table public.lessons add column if not exists caption      text;   -- short description / instructions

-- 4. Seed a course for the already-imported AI chapters ----------------
insert into public.courses (title, description, sort_order, published)
select 'AI in Medicine: Practical Applications for Healthcare',
       'Practical AI skills for clinicians and researchers. Cloned from the NNCC Thinkific course.',
       1, true
where not exists (
  select 1 from public.courses
  where title = 'AI in Medicine: Practical Applications for Healthcare');

update public.modules
   set course_id = (select id from public.courses
                    where title = 'AI in Medicine: Practical Applications for Healthcare'
                    limit 1)
 where course_id is null;

-- 5. STORAGE bucket for uploaded media ---------------------------------
insert into storage.buckets (id, name, public)
values ('course-media', 'course-media', true)
on conflict (id) do nothing;

-- public read of course media
drop policy if exists "course-media public read" on storage.objects;
create policy "course-media public read" on storage.objects
  for select using (bucket_id = 'course-media');

-- only admins may upload / change / delete media
drop policy if exists "course-media admin write" on storage.objects;
create policy "course-media admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'course-media' and public.is_admin())
  with check (bucket_id = 'course-media' and public.is_admin());

-- =====================================================================
--  Done.
-- =====================================================================
