create table if not exists public.ffh_briefing_reads (
 briefing_id uuid not null references public.ffh_briefings(id),
 staff_id text not null,
 read_at timestamptz not null default now(),
 primary key(briefing_id,staff_id)
);
create table if not exists public.ffh_dated_minutes (
 briefing_id uuid not null references public.ffh_briefings(id),
 owner_staff_id text not null,
 minute_date date not null,
 notes text not null default '',
 updated_at timestamptz not null default now(),
 primary key(briefing_id,owner_staff_id,minute_date)
);
alter table public.ffh_briefing_reads enable row level security;
alter table public.ffh_dated_minutes enable row level security;
revoke all on public.ffh_briefing_reads,public.ffh_dated_minutes from anon,authenticated;
grant select,insert,update on public.ffh_briefing_reads,public.ffh_dated_minutes to authenticated;
create policy ffh_board_reads_self on public.ffh_briefing_reads for all to authenticated using(staff_id=(select public.ffh_my_staff_id())) with check(staff_id=(select public.ffh_my_staff_id()) and exists(select 1 from public.ffh_briefings b where b.id=briefing_id));
create policy ffh_dated_minutes_self on public.ffh_dated_minutes for all to authenticated using(owner_staff_id=(select public.ffh_my_staff_id())) with check(owner_staff_id=(select public.ffh_my_staff_id()) and exists(select 1 from public.ffh_briefings b where b.id=briefing_id and b.kind='meeting'));
insert into public.ffh_dated_minutes(briefing_id,owner_staff_id,minute_date,notes,updated_at) select briefing_id,owner_staff_id,(updated_at at time zone 'Asia/Kuala_Lumpur')::date,notes,updated_at from public.ffh_meeting_minutes on conflict do nothing;

-- Existing approved owner delegation applies to briefing publication too.
drop policy if exists ffh_briefings_owner_write on public.ffh_briefings;
create policy ffh_briefings_owner_write on public.ffh_briefings for all to authenticated using(public.ffh_owner()) with check(public.ffh_owner() and created_by=public.ffh_my_staff_id());

alter table public.ffh_briefing_reads add column if not exists seen_updated_at timestamptz;
alter publication supabase_realtime add table public.ffh_briefing_reads;
