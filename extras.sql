-- =====================================================================
--  Portal LMS — Certificates, Drip, Prerequisites, Analytics access
--  Safe to run multiple times.
-- =====================================================================

-- ---- course + chapter settings -------------------------------------
alter table public.courses add column if not exists certificate_enabled boolean not null default true;
alter table public.courses add column if not exists prerequisite_course_id uuid references public.courses(id) on delete set null;
alter table public.courses add column if not exists pass_note text;      -- optional line printed on certificate
alter table public.modules add column if not exists drip_days int not null default 0;  -- 0 = available immediately

-- ---- CERTIFICATES ---------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  serial text not null,
  issued_at timestamptz not null default now(),
  unique(user_id, course_id)
);
alter table public.certificates enable row level security;
drop policy if exists "cert read own or admin" on public.certificates;
create policy "cert read own or admin" on public.certificates
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---- completion helper ---------------------------------------------
create or replace function public.course_completion(p_user uuid, p_course uuid)
returns jsonb language sql security definer set search_path = public as $$
  with ls as (
    select l.id from public.lessons l
    join public.modules m on m.id = l.module_id
    where m.course_id = p_course
  )
  select jsonb_build_object(
    'total', (select count(*) from ls),
    'done',  (select count(*) from ls where id in
               (select lesson_id from public.lesson_progress where user_id = p_user))
  );
$$;
grant execute on function public.course_completion(uuid, uuid) to authenticated;

-- ---- claim a certificate (only when 100% complete) -----------------
create or replace function public.claim_certificate(p_course uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare comp jsonb; cert public.certificates; en boolean;
begin
  select certificate_enabled into en from public.courses where id = p_course;
  if not coalesce(en, true) then return jsonb_build_object('issued', false, 'reason', 'certificates disabled'); end if;
  comp := public.course_completion(auth.uid(), p_course);
  if (comp->>'total')::int = 0 or (comp->>'done')::int < (comp->>'total')::int then
    return jsonb_build_object('issued', false, 'reason', 'not complete', 'progress', comp);
  end if;
  select * into cert from public.certificates where user_id = auth.uid() and course_id = p_course;
  if cert.id is null then
    insert into public.certificates(user_id, course_id, serial)
      values (auth.uid(), p_course, 'NNCC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)))
      returning * into cert;
  end if;
  return jsonb_build_object('issued', true, 'serial', cert.serial, 'issued_at', cert.issued_at);
end; $$;
grant execute on function public.claim_certificate(uuid) to authenticated;

-- ---- analytics: let admins read progress & attempts ----------------
drop policy if exists "progress read admin" on public.lesson_progress;
create policy "progress read admin" on public.lesson_progress
  for select to authenticated using (public.is_admin());

-- ---- analytics view: per-course rollups ----------------------------
create or replace view public.course_analytics with (security_invoker = true) as
  select c.id as course_id, c.title,
    (select count(*) from public.course_enrollments e where e.course_id = c.id) as enrollments,
    (select count(*) from public.certificates ce where ce.course_id = c.id) as completions,
    (select count(distinct lp.user_id) from public.lesson_progress lp
       join public.lessons l on l.id = lp.lesson_id
       join public.modules m on m.id = l.module_id
      where m.course_id = c.id) as active_learners
  from public.courses c;

-- =====================================================================
--  Done.
-- =====================================================================
