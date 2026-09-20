-- Learner course access requests and administrator approval.
-- Safe to run repeatedly in the Supabase SQL Editor.

create table if not exists public.course_access_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','declined')),
  message text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique(course_id, user_id)
);

alter table public.course_access_requests enable row level security;

drop policy if exists "access requests read own or admin" on public.course_access_requests;
create policy "access requests read own or admin" on public.course_access_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "access requests admin delete" on public.course_access_requests;
create policy "access requests admin delete" on public.course_access_requests
  for delete to authenticated
  using (public.is_admin());

create or replace function public.request_course_access(p_course uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course
      and visibility = 'published'
      and coalesce(enrollment_required, false) = true
  ) then
    raise exception 'This course is not available for access requests';
  end if;

  if exists (
    select 1 from public.course_enrollments
    where course_id = p_course and user_id = auth.uid()
  ) then
    raise exception 'You are already enrolled in this course';
  end if;

  insert into public.course_access_requests
    (course_id, user_id, status, message, created_at, reviewed_at, reviewed_by)
  values
    (p_course, auth.uid(), 'pending', nullif(trim(p_message), ''), now(), null, null)
  on conflict (course_id, user_id) do update
    set status = 'pending',
        message = excluded.message,
        created_at = now(),
        reviewed_at = null,
        reviewed_by = null;
end;
$$;

grant execute on function public.request_course_access(uuid, text) to authenticated;

create or replace function public.review_course_access(p_request uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.course_access_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into req
  from public.course_access_requests
  where id = p_request
  for update;

  if req.id is null then
    raise exception 'Access request not found';
  end if;

  if p_approve then
    insert into public.course_enrollments(course_id, user_id, enrolled_by)
    values (req.course_id, req.user_id, auth.uid())
    on conflict (course_id, user_id) do update
      set starts_at = null,
          expires_at = null,
          enrolled_by = auth.uid();
  end if;

  update public.course_access_requests
  set status = case when p_approve then 'approved' else 'declined' end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request;
end;
$$;

grant execute on function public.review_course_access(uuid, boolean) to authenticated;

