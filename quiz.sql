-- =====================================================================
--  Portal LMS — Quiz engine + Assignment submissions
--  Safe to run multiple times.
-- =====================================================================

-- ---------- QUIZ QUESTIONS (answers are admin-only) -------------------
create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid references public.lessons(id) on delete cascade,
  question    text not null,
  qtype       text not null default 'single' check (qtype in ('single','multi','tf')),
  options     jsonb not null default '[]'::jsonb,   -- [{"id":"a","text":"..."}]
  correct     jsonb not null default '[]'::jsonb,   -- ["a","c"]
  explanation text,
  sort_order  int  default 0,
  created_at  timestamptz not null default now()
);
alter table public.quiz_questions enable row level security;
-- students must NOT read this table directly (it holds the answers)
drop policy if exists "quiz questions admin" on public.quiz_questions;
create policy "quiz questions admin" on public.quiz_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- QUIZ ATTEMPTS --------------------------------------------
create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid references public.lessons(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  score      int, total int, passed boolean,
  answers    jsonb,
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
drop policy if exists "attempts own or admin" on public.quiz_attempts;
create policy "attempts own or admin" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- RPC: fetch a quiz WITHOUT the answers --------------------
create or replace function public.get_quiz(p_lesson uuid)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           jsonb_build_object('id',id,'question',question,'qtype',qtype,'options',options)
           order by sort_order, created_at), '[]'::jsonb)
  from public.quiz_questions where lesson_id = p_lesson;
$$;
grant execute on function public.get_quiz(uuid) to authenticated;

-- ---------- RPC: grade a quiz server-side ---------------------------
create or replace function public.grade_quiz(p_lesson uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q record; total int := 0; sc int := 0; ua jsonb; ok boolean;
  results jsonb := '[]'::jsonb; passmark numeric := 0.7;
begin
  for q in select * from public.quiz_questions where lesson_id = p_lesson order by sort_order, created_at loop
    total := total + 1;
    ua := coalesce(p_answers -> (q.id::text), '[]'::jsonb);
    ok := ( coalesce(jsonb_array_length(ua),0) = coalesce(jsonb_array_length(q.correct),0)
            and not exists (
              select 1 from jsonb_array_elements_text(ua) e
              where e not in (select jsonb_array_elements_text(q.correct)) ) );
    if ok then sc := sc + 1; end if;
    results := results || jsonb_build_object(
      'id', q.id, 'correct', ok, 'correct_ids', q.correct, 'explanation', q.explanation);
  end loop;
  insert into public.quiz_attempts(lesson_id,user_id,score,total,passed,answers)
    values (p_lesson, auth.uid(), sc, total, (total>0 and sc::numeric/total >= passmark), p_answers);
  return jsonb_build_object('score',sc,'total',total,
    'passed',(total>0 and sc::numeric/total >= passmark), 'results',results);
end; $$;
grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;

-- ---------- ASSIGNMENT SUBMISSIONS ----------------------------------
create table if not exists public.assignment_submissions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid references public.lessons(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  body       text,
  file_path  text,            -- object path in the private 'submissions' bucket
  status     text default 'submitted' check (status in ('submitted','graded')),
  grade      text,
  feedback   text,
  graded_by  uuid references auth.users(id) on delete set null,
  graded_at  timestamptz,
  created_at timestamptz not null default now()
);
alter table public.assignment_submissions enable row level security;
drop policy if exists "sub insert own" on public.assignment_submissions;
create policy "sub insert own" on public.assignment_submissions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "sub read own or admin" on public.assignment_submissions;
create policy "sub read own or admin" on public.assignment_submissions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "sub update admin" on public.assignment_submissions;
create policy "sub update admin" on public.assignment_submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sub delete own or admin" on public.assignment_submissions;
create policy "sub delete own or admin" on public.assignment_submissions
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace view public.assignment_submissions_view
  with (security_invoker = true) as
  select s.*, pr.full_name as author_name, pr.email as author_email
  from public.assignment_submissions s
  left join public.profiles pr on pr.id = s.user_id;

-- ---------- PRIVATE bucket for submitted files ----------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

drop policy if exists "submissions upload own" on storage.objects;
create policy "submissions upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "submissions read own or admin" on storage.objects;
create policy "submissions read own or admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'submissions'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
--  Done.
-- =====================================================================
