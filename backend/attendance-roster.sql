create table public.ffh_attendance_roster (
 staff_id text not null references public.ffh_profiles(staff_id) on delete cascade,
 duty_date date not null,
 day_type text not null check(day_type in ('Working','Leave','Off')),
 starts_at time,
 ends_at time,
 updated_by text not null default public.ffh_my_staff_id() references public.ffh_profiles(staff_id),
 updated_at timestamptz not null default now(),
 primary key(staff_id,duty_date),
 check((day_type='Working' and starts_at is not null and ends_at>starts_at and ends_at is not null) or (day_type<>'Working' and starts_at is null and ends_at is null))
);
alter table public.ffh_attendance_roster enable row level security;
revoke all on public.ffh_attendance_roster from public,anon,authenticated;
grant select,insert,update on public.ffh_attendance_roster to authenticated;
create policy ffh_attendance_roster_read on public.ffh_attendance_roster for select to authenticated
 using(staff_id=(select public.ffh_my_staff_id()) or public.ffh_staff_edit(staff_id,'attendance'));
create policy ffh_attendance_roster_create on public.ffh_attendance_roster for insert to authenticated
 with check(public.ffh_staff_edit(staff_id,'attendance') and updated_by=(select public.ffh_my_staff_id()));
create policy ffh_attendance_roster_edit on public.ffh_attendance_roster for update to authenticated
 using(public.ffh_staff_edit(staff_id,'attendance'))
 with check(public.ffh_staff_edit(staff_id,'attendance') and updated_by=(select public.ffh_my_staff_id()));
