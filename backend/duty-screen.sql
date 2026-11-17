-- Attendance summary exposes shift times only. GPS and photos retain their existing policies.
create or replace function ffh_private.attendance_summary(from_day date, to_day date)
returns table(staff_id text, duty_date date, check_in timestamptz, check_out timestamptz, shift_end timestamptz)
language sql stable security definer set search_path = '' as $$
 select a.staff_id,a.duty_date,a.check_in,a.check_out,a.shift_end
 from public.ffh_attendance a
 where public.ffh_my_staff_id() is not null and to_day - from_day between 0 and 31
 and a.duty_date between from_day and to_day
 and (a.staff_id=public.ffh_my_staff_id() or public.ffh_staff_edit(a.staff_id,'attendance'))
$$;

create or replace function public.ffh_attendance_summary(from_day date, to_day date)
returns table(staff_id text, duty_date date, check_in timestamptz, check_out timestamptz, shift_end timestamptz)
language sql stable security invoker set search_path = '' as $$
 select * from ffh_private.attendance_summary(from_day,to_day)
$$;

-- A break changes duty status and excludes its duration from work hours.
-- The existing work-hours tracking session continues until checkout or shift end.
alter table public.ffh_attendance add column if not exists break_started_at timestamptz;
alter table public.ffh_attendance add column if not exists break_seconds integer not null default 0;

create or replace function ffh_private.set_duty_break(on_break boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if public.ffh_my_staff_id() is null or on_break is null then
  raise exception 'Approved active login required' using errcode='42501';
 end if;
 update public.ffh_attendance
 set break_seconds=break_seconds+case when not on_break and break_started_at is not null
        then greatest(0,extract(epoch from now()-break_started_at)::int) else 0 end,
     break_started_at=case when on_break then coalesce(break_started_at,now()) else null end
 where staff_id=public.ffh_my_staff_id()
   and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date
   and check_out is null and shift_end>now();
 if not found then raise exception 'Check in before changing your duty status'; end if;
end
$$;

create or replace function public.ffh_set_duty_break(on_break boolean) returns void
language sql security invoker set search_path = '' as $$
 select ffh_private.set_duty_break(on_break)
$$;

revoke all on function ffh_private.attendance_summary(date,date),public.ffh_attendance_summary(date,date),
 ffh_private.set_duty_break(boolean),public.ffh_set_duty_break(boolean) from public,anon;
grant execute on function ffh_private.attendance_summary(date,date),public.ffh_attendance_summary(date,date),
 ffh_private.set_duty_break(boolean),public.ffh_set_duty_break(boolean) to authenticated;

create or replace function ffh_private.attendance_team() returns jsonb
language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(p.staff_id order by p.staff_id),'[]'::jsonb)
 from public.ffh_profiles p
 where public.ffh_my_staff_id() is not null and p.active and p.login_approved
 and (p.staff_id=public.ffh_my_staff_id() or public.ffh_staff_edit(p.staff_id,'attendance'))
$$;

create or replace function public.ffh_attendance_team() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select ffh_private.attendance_team()
$$;
revoke all on function ffh_private.attendance_team(),public.ffh_attendance_team() from public,anon;
grant execute on function ffh_private.attendance_team(),public.ffh_attendance_team() to authenticated;
