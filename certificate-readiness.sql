-- Certificate readiness hardening, sourced from the UCalgary CPD approval letters.
-- Safe to run more than once.

alter table public.courses add column if not exists rcpsc_id text;
alter table public.courses add column if not exists accredited_hours integer;

update public.courses set
  title='Neonatal Neuro Critical Care Module 7: Nursing Care of Infants with HIE Certification',
  rcpsc_id='00017855', accredited_hours=10
where (lower(title) like '%nursing care%' and lower(title) like '%hie%')
   or lower(title) like '%nursing nncc care%';

update public.courses set rcpsc_id='00017857', accredited_hours=2
where lower(title) like '%module 9:%' and lower(title) like '%neonatal stroke%';

update public.courses set rcpsc_id='00017858', accredited_hours=6
where lower(title) like '%module 10:%' and lower(title) like '%fetal monitoring%';

-- AI approval: 112 Section 3 SAP hours; Activity ID supplied by the program director.
update public.courses set accredited_hours=112, rcpsc_id='00018505'
where lower(title) like '%ai in medicine:%practical applications%'
   or lower(title) like '%practical ai in healthcare%';

-- Courses without lessons cannot satisfy completion requirements.
update public.courses c set certificate_enabled=false
where not exists (
  select 1 from public.modules m
  join public.lessons l on l.module_id=m.id
  where m.course_id=c.id
);

-- Issue immediately and server-side when the final lesson is completed.
create or replace function public.issue_certificate_on_progress()
returns trigger
language plpgsql security definer set search_path=public as $$
declare
  target_course uuid;
  total_lessons integer;
  completed_lessons integer;
  enabled boolean;
begin
  select m.course_id into target_course
  from public.lessons l join public.modules m on m.id=l.module_id
  where l.id=new.lesson_id;

  if target_course is null then return new; end if;
  select certificate_enabled into enabled from public.courses where id=target_course;
  if not coalesce(enabled,true) then return new; end if;

  select count(*) into total_lessons
  from public.lessons l join public.modules m on m.id=l.module_id
  where m.course_id=target_course;

  select count(*) into completed_lessons
  from public.lesson_progress lp
  join public.lessons l on l.id=lp.lesson_id
  join public.modules m on m.id=l.module_id
  where lp.user_id=new.user_id and m.course_id=target_course;

  if total_lessons>0 and completed_lessons=total_lessons then
    insert into public.certificates(user_id,course_id,serial)
    values(new.user_id,target_course,'NNCC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)))
    on conflict(user_id,course_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists issue_certificate_after_progress on public.lesson_progress;
create trigger issue_certificate_after_progress
after insert on public.lesson_progress
for each row execute function public.issue_certificate_on_progress();
