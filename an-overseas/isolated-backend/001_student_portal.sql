-- A&N OVERSEAS — isolated project only.
-- Never execute this in the FieldForce Hub Supabase project.
-- This schema DOES NOT create Auth accounts or store plaintext passwords.
-- Account provisioning must use authenticated Supabase Auth Admin API server-side.
create extension if not exists pgcrypto;

create table if not exists public.an_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  granted_at timestamptz not null default now()
);
alter table public.an_admins enable row level security;
drop policy if exists an_admin_self on public.an_admins;
create policy an_admin_self on public.an_admins for select to authenticated
  using (user_id = (select auth.uid()));

create sequence if not exists public.an_student_number_seq start 100001;
revoke all on sequence public.an_student_number_seq from public, anon, authenticated;

create table if not exists public.an_leads (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 applicant_name text not null check (char_length(btrim(applicant_name)) between 2 and 130),
 email text not null check (char_length(email) between 5 and 254 and position('@' in email)>1),
 mobile text not null check (char_length(mobile) between 7 and 35),
 country text not null default 'Malaysia',
 university text not null default '',
 programme text not null default '',
 note text not null default '' check (char_length(note)<=4000),
 state text not null default 'new' check (state in ('new','review','awaiting_payment','approved','closed')),
 payment_state text not null default 'unpaid' check (payment_state in ('unpaid','pending','confirmed','refunded')),
 verified_by uuid references auth.users(id),
 verified_at timestamptz,
 student_code text,
 constraint no_public_approval check (payment_state <> 'confirmed' or verified_by is not null)
);
create index if not exists an_leads_date_idx on public.an_leads(created_at desc);
create index if not exists an_leads_email_idx on public.an_leads(lower(email));
alter table public.an_leads enable row level security;
-- Anonymous visitors can submit enquiries but cannot read or approve other leads.
drop policy if exists an_leads_public_insert on public.an_leads;
create policy an_leads_public_insert on public.an_leads for insert to anon,authenticated
 with check (state='new' and payment_state='unpaid' and verified_by is null
   and verified_at is null and student_code is null);
drop policy if exists an_leads_admin_read on public.an_leads;
create policy an_leads_admin_read on public.an_leads for select to authenticated
 using (exists(select 1 from public.an_admins where user_id=(select auth.uid())));
drop policy if exists an_leads_admin_edit on public.an_leads;
create policy an_leads_admin_edit on public.an_leads for update to authenticated
 using (exists(select 1 from public.an_admins where user_id=(select auth.uid())))
 with check (exists(select 1 from public.an_admins where user_id=(select auth.uid())));

create table if not exists public.an_student_accounts (
 id uuid primary key default gen_random_uuid(),
 student_code text unique not null default (
  'ANO-' || nextval('public.an_student_number_seq'::regclass)::text
 ),
 lead_id uuid unique references public.an_leads(id) on delete restrict,
 auth_user_id uuid unique references auth.users(id) on delete set null,
 student_name text not null,
 contact_email text not null,
 contact_mobile text not null,
 account_status text not null default 'not_issued' check
 (account_status in ('not_issued','issued','active','suspended')),
 first_password_change_due boolean not null default true,
 issued_at timestamptz,
 issued_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists an_students_code_idx on public.an_student_accounts(student_code);
alter table public.an_student_accounts enable row level security;
drop policy if exists an_students_admin_all on public.an_student_accounts;
create policy an_students_admin_all on public.an_student_accounts for all to authenticated
 using (exists(select 1 from public.an_admins where user_id=(select auth.uid())))
 with check (exists(select 1 from public.an_admins where user_id=(select auth.uid())));
drop policy if exists an_students_self_read on public.an_student_accounts;
create policy an_students_self_read on public.an_student_accounts for select to authenticated
 using (auth_user_id=(select auth.uid()) and account_status in ('issued','active'));

create table if not exists public.an_password_help_requests (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 student_code text not null check(char_length(student_code) between 5 and 45),
 contact_name text not null default '' check(char_length(contact_name)<=130),
 contact_method text not null check(char_length(contact_method) between 5 and 254),
 note text not null default '' check(char_length(note)<=1200),
 status text not null default 'new' check(status in ('new','identity_checked','resolved','rejected')),
 handled_at timestamptz,
 handled_by uuid references auth.users(id)
);
create index if not exists an_password_help_date_idx on public.an_password_help_requests(created_at desc);
alter table public.an_password_help_requests enable row level security;
drop policy if exists an_password_help_request on public.an_password_help_requests;
create policy an_password_help_request on public.an_password_help_requests for insert to anon,authenticated
 with check (status='new' and handled_at is null and handled_by is null);
drop policy if exists an_password_help_admin on public.an_password_help_requests;
create policy an_password_help_admin on public.an_password_help_requests for all to authenticated
 using (exists(select 1 from public.an_admins where user_id=(select auth.uid())))
 with check (exists(select 1 from public.an_admins where user_id=(select auth.uid())));

create table if not exists public.an_account_audit (
 id bigint generated always as identity primary key,
 happened_at timestamptz not null default now(),
 actor_user_id uuid references auth.users(id),
 student_code text not null,
 action text not null check(action in
 ('lead_approved','payment_confirmed','credentials_issued','password_reset_requested',
  'identity_verified','temporary_password_reissued','first_password_changed','account_suspended')),
 details jsonb not null default '{}'::jsonb
);
-- Critical: Never place passwords, password hashes, recovery tokens or API keys in details.
alter table public.an_account_audit enable row level security;
drop policy if exists an_audit_admin_read on public.an_account_audit;
create policy an_audit_admin_read on public.an_account_audit for select to authenticated
 using (exists(select 1 from public.an_admins where user_id=(select auth.uid())));
drop policy if exists an_audit_admin_write on public.an_account_audit;
create policy an_audit_admin_write on public.an_account_audit for insert to authenticated
 with check (actor_user_id=(select auth.uid()) and
  exists(select 1 from public.an_admins where user_id=(select auth.uid())));

-- Explicit grants; table RLS remains the second authorization boundary.
grant usage on schema public to anon,authenticated;
grant insert on public.an_leads to anon,authenticated;
grant select,update on public.an_leads to authenticated;
grant select on public.an_admins to authenticated;
grant select,insert,update,delete on public.an_student_accounts to authenticated;
grant insert on public.an_password_help_requests to anon,authenticated;
grant select,update on public.an_password_help_requests to authenticated;
grant select,insert on public.an_account_audit to authenticated;

-- The client never receives Supabase service_role credentials.
-- Bootstrap the initial owner via Auth Users in the NEW project's Dashboard,
-- then add their confirmed user ID to an_admins using a privileged SQL session.
-- Admin-issued student ID/password will be implemented in a server-only Edge
-- Function after the project is created. The password is stored by Auth, not SQL.
