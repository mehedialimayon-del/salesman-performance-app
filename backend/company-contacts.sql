-- Shared directory: every approved active employee can read; only Ayon edits.
-- Version comparison in the client makes serial reordering and undo atomic.
create table public.ffh_contacts (
 id integer primary key check (id = 1),
 contacts jsonb not null default '[]'::jsonb check (jsonb_typeof(contacts) = 'array' and pg_column_size(contacts) <= 5242880),
 version integer not null default 0 check (version >= 0),
 updated_at timestamptz not null default now()
);
alter table public.ffh_contacts enable row level security;
revoke all on public.ffh_contacts from anon,authenticated;
grant select,update on public.ffh_contacts to authenticated;
create policy contacts_employee_read on public.ffh_contacts for select to authenticated
using (exists(select 1 from public.ffh_profiles p where p.auth_user_id=(select auth.uid()) and p.active and p.login_approved));
create policy contacts_owner_update on public.ffh_contacts for update to authenticated
using (exists(select 1 from public.ffh_profiles p where p.auth_user_id=(select auth.uid()) and p.staff_id='M21954' and p.active and p.login_approved))
with check (exists(select 1 from public.ffh_profiles p where p.auth_user_id=(select auth.uid()) and p.staff_id='M21954' and p.active and p.login_approved));
insert into public.ffh_contacts(id) values(1);
alter publication supabase_realtime add table public.ffh_contacts;
