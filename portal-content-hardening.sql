-- NNCC portal content-function hardening
-- Safe to run repeatedly in the Supabase SQL editor.

-- Registration totals are visible to authenticated learners without exposing
-- the identities of other registrants.
create or replace function public.event_registration_counts()
returns table(event_id uuid, registration_count bigint)
language sql security definer set search_path=public as $$
  select er.event_id, count(*)::bigint
  from public.event_registrations er
  join public.events e on e.id=er.event_id
  where auth.uid() is not null and (e.status='published' or public.is_admin())
  group by er.event_id;
$$;
grant execute on function public.event_registration_counts() to authenticated;

-- Atomic registration/cancellation prevents overbooking when the final place
-- is requested by more than one learner at the same time.
create or replace function public.toggle_event_registration(p_event uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  ev public.events;
  n integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into ev from public.events where id=p_event for update;
  if ev.id is null or (ev.status<>'published' and not public.is_admin()) then
    raise exception 'Event not available';
  end if;

  if exists(select 1 from public.event_registrations where event_id=p_event and user_id=auth.uid()) then
    delete from public.event_registrations where event_id=p_event and user_id=auth.uid();
    return jsonb_build_object('registered',false,'reason','cancelled');
  end if;

  select count(*) into n from public.event_registrations where event_id=p_event;
  if ev.capacity is not null and n>=ev.capacity then
    return jsonb_build_object('registered',false,'reason','full');
  end if;

  insert into public.event_registrations(event_id,user_id) values(p_event,auth.uid())
  on conflict(event_id,user_id) do nothing;
  return jsonb_build_object('registered',true,'reason','confirmed');
end;
$$;
grant execute on function public.toggle_event_registration(uuid) to authenticated;
