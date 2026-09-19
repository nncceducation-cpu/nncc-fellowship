-- Bulk administration hardening for the NNCC portal.
-- Issues certificates only to learners who have completed every course lesson.
create or replace function public.admin_issue_certificates(p_course uuid, p_users uuid[] default null)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  uid uuid;
  total_count integer;
  done_count integer;
  issued_count integer:=0;
  existing_count integer:=0;
  incomplete_count integer:=0;
  enabled boolean;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select certificate_enabled into enabled from public.courses where id=p_course;
  if not coalesce(enabled,true) then raise exception 'Certificates are disabled for this course'; end if;
  select count(*) into total_count from public.lessons l join public.modules m on m.id=l.module_id where m.course_id=p_course;
  if total_count=0 then raise exception 'This course has no lessons'; end if;
  for uid in select distinct p.id from public.profiles p where p.status<>'suspended' and (p_users is null or p.id=any(p_users))
  loop
    select count(*) into done_count from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id join public.modules m on m.id=l.module_id where lp.user_id=uid and m.course_id=p_course;
    if done_count<total_count then incomplete_count:=incomplete_count+1;
    elsif exists(select 1 from public.certificates c where c.user_id=uid and c.course_id=p_course) then existing_count:=existing_count+1;
    else
      insert into public.certificates(user_id,course_id,serial) values(uid,p_course,'NNCC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
      issued_count:=issued_count+1;
    end if;
  end loop;
  return jsonb_build_object('issued',issued_count,'existing',existing_count,'incomplete',incomplete_count);
end;
$$;
grant execute on function public.admin_issue_certificates(uuid,uuid[]) to authenticated;
