-- Fix learner access, scheduled enrollments, and self-managed profiles.
-- Safe to run repeatedly in Supabase SQL Editor.

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists acc_modules boolean not null default true;
alter table public.profiles add column if not exists acc_forum boolean not null default true;
alter table public.profiles add column if not exists acc_resources boolean not null default true;
alter table public.profiles add column if not exists acc_directory boolean not null default true;
alter table public.profiles add column if not exists institution text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists profession text;

update public.profiles
set acc_modules = true
where acc_modules is distinct from false;

alter table public.course_enrollments add column if not exists starts_at timestamptz;

create or replace function public.has_course_access(p_course uuid)
returns boolean language sql security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.courses c
                 where c.id = p_course and coalesce(c.enrollment_required,false) = false)
      or exists (select 1 from public.course_enrollments e
                 where e.course_id = p_course and e.user_id = auth.uid()
                   and (e.starts_at is null or e.starts_at <= now())
                   and (e.expires_at is null or e.expires_at > now()));
$$;
