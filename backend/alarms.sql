create table if not exists public.ffh_alarm_schedules(id uuid primary key default gen_random_uuid(),staff_id text not null references public.ffh_profiles(staff_id),created_by text not null references public.ffh_profiles(staff_id),title text not null check(length(title) between 1 and 160),alarm_at timestamptz,time_of_day time,daily boolean not null default false,enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check((daily and time_of_day is not null) or (not daily and alarm_at is not null)));
alter table public.ffh_alarm_schedules enable row level security;
create policy ffh_alarm_read on public.ffh_alarm_schedules for select to authenticated using(staff_id=public.ffh_my_staff_id() or created_by=public.ffh_my_staff_id() or public.ffh_owner());
grant select on public.ffh_alarm_schedules to authenticated;
create or replace function public.ffh_alarms(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare me text:=ffh_my_staff_id(); dest text; r ffh_alarm_schedules; p jsonb; manager boolean; request_id uuid;
begin
 if me is null then raise exception 'Approved login required';end if;
 select can_manage into manager from ffh_profiles where staff_id=me and active and login_approved;
 if action='state' then return jsonb_build_object('manager',manager,'alarms',coalesce((select jsonb_agg(to_jsonb(a)) from ffh_alarm_schedules a where a.staff_id=me or a.created_by=me or ffh_owner()),'[]'::jsonb),'staff',coalesce((select jsonb_agg(jsonb_build_object('id',staff_id,'name',full_name)) from ffh_profiles where active and login_approved and (staff_id=me or (manager and ffh_staff_view(staff_id)))),'[]'::jsonb));end if;
 if action='save' then
 dest:=upper(payload->>'staff_id');request_id:=coalesce((payload->>'request_id')::uuid,gen_random_uuid());select * into r from ffh_alarm_schedules where id=request_id;if r.id is not null then if r.created_by<>me or r.staff_id<>dest then raise exception 'Alarm request ID conflict';end if;return to_jsonb(r);end if;if dest<>me and not (manager and ffh_staff_view(dest)) then raise exception 'No alarm permission for this staff';end if;
 if not exists(select 1 from ffh_profiles where staff_id=dest and active and login_approved) then raise exception 'Active staff required';end if;
 if coalesce((payload->>'daily')::boolean,false) then
 insert into ffh_alarm_schedules(id,staff_id,created_by,title,daily,time_of_day) values(request_id,dest,me,payload->>'title',true,(payload->>'time')::time) returning * into r;
 else
 if (payload->>'alarm_at')::timestamptz<now()+interval '1 minute' then raise exception 'Choose a future time';end if;
 insert into ffh_alarm_schedules(id,staff_id,created_by,title,daily,alarm_at) values(request_id,dest,me,payload->>'title',false,(payload->>'alarm_at')::timestamptz) returning * into r;end if;
 elsif action='cancel' then
 select * into r from ffh_alarm_schedules where id=(payload->>'id')::uuid and created_by=me;if r.id is null then raise exception 'Only the sender can cancel this alarm';end if;if not r.enabled then return to_jsonb(r);end if;
 update ffh_alarm_schedules set enabled=false,updated_at=now() where id=(payload->>'id')::uuid and created_by=me returning * into r;if r.id is null then raise exception 'Only the sender can cancel this alarm';end if;
 else raise exception 'Unknown alarm action';end if;
 p:=jsonb_build_object('id',r.id,'staff_id',r.staff_id,'title',r.title,'daily',r.daily,'enabled',r.enabled,'time',to_char(r.time_of_day,'HH24:MI'),'at',extract(epoch from r.alarm_at)*1000);
 insert into ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key,provider_response) values(r.staff_id,'alarm_setup',case when r.enabled then 'Alarm assigned: ' else 'Alarm cancelled: ' end||r.title,'Open FieldForce Alarms to enable phone alarms. Assigned by '||me,now(),'scheduled',me,'alarm:'||r.id||':'||r.enabled::text||':'||r.updated_at,jsonb_build_object('ffh_alarm',p));
 return to_jsonb(r);
end$$;
revoke execute on function public.ffh_alarms(text,jsonb) from public,anon;grant execute on function public.ffh_alarms(text,jsonb) to authenticated;
