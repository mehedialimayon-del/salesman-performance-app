-- Company teams hold report labels independently from real staff login identities.
create table public.ffh_company_teams(
 zone_id text primary key references public.ffh_zones(id),name text not null,manager_name text not null,
 manager_staff_id text references public.ffh_profiles(staff_id),active boolean not null default true,sort_order integer not null,
 source_month text not null,reported_target numeric not null default 0,unassigned_target numeric not null default 0,
 unassigned_label text not null default '',updated_at timestamptz not null default now());
create table public.ffh_company_roster_members(
 staff_id text primary key references public.ffh_profiles(staff_id),zone_id text not null references public.ffh_company_teams(zone_id),
 source_month text not null,source_actual_target numeric not null check(source_actual_target>=0));
alter table public.ffh_company_teams enable row level security;
alter table public.ffh_company_roster_members enable row level security;
grant select on public.ffh_company_teams,public.ffh_company_roster_members to authenticated;
grant all on public.ffh_company_teams,public.ffh_company_roster_members to service_role;
create policy ffh_company_teams_read on public.ffh_company_teams for select to authenticated using(ffh_private.is_owner() or ffh_private.zone_visible(zone_id) or zone_id=public.ffh_current_zone());
create policy ffh_company_roster_read on public.ffh_company_roster_members for select to authenticated using(public.ffh_staff_view(staff_id));

create or replace function ffh_private.protect_global_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not ffh_private.is_owner() then
  if TG_TABLE_NAME='ffh_zone_access' then
   if (TG_OP<>'INSERT' and old.zone_id='*') or (TG_OP<>'DELETE' and new.zone_id='*') then raise exception 'Only Ayon grants or revokes all-zone viewing' using errcode='42501';end if;
  elsif TG_OP='UPDATE' then
   if old.access_all_zones is distinct from new.access_all_zones or old.accessible_zones is distinct from new.accessible_zones and ('*'=any(old.accessible_zones) or '*'=any(new.accessible_zones)) then raise exception 'Only Ayon changes all-zone viewing' using errcode='42501';end if;
  elsif TG_OP='INSERT' and (new.access_all_zones or '*'=any(new.accessible_zones)) then raise exception 'Only Ayon grants all-zone viewing' using errcode='42501';end if;
 end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end$$;
revoke all on function ffh_private.protect_global_scope() from public,anon,authenticated;
create trigger ffh_global_scope_owner before insert or update or delete on public.ffh_zone_access for each row execute function ffh_private.protect_global_scope();
create trigger ffh_global_scope_owner before insert or update on public.ffh_profiles for each row execute function ffh_private.protect_global_scope();

create or replace function ffh_private.company_roster(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare own boolean:=ffh_private.is_owner();sid text:=public.ffh_my_staff_id();z text;target text;enabled boolean;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if action='state' then return jsonb_build_object('configured',true,'owner',own,'source_month','2026-10',
 'teams',coalesce((select jsonb_agg(to_jsonb(t) order by sort_order) from public.ffh_company_teams t where own or ffh_private.zone_visible(t.zone_id) or t.zone_id=public.ffh_current_zone()),'[]'),
 'member_ids',coalesce((select jsonb_agg(r.staff_id) from public.ffh_company_roster_members r join public.ffh_company_teams t using(zone_id) join public.ffh_profiles p on p.staff_id=r.staff_id where t.active and p.active and p.can_sell and public.ffh_staff_view(r.staff_id)),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('staff_id',p.staff_id,'company_staff_id',p.company_staff_id,'full_name',p.full_name,'zone_id',p.zone_id,'manager_id',p.manager_id,'can_manage',p.can_manage,'can_sell',p.can_sell,'active',p.active,'has_login',p.auth_user_id is not null,'monthly_target',p.monthly_target)) from public.ffh_profiles p where public.ffh_staff_view(p.staff_id)),'[]'),
 'source_members',coalesce((select jsonb_agg(to_jsonb(r)) from public.ffh_company_roster_members r where public.ffh_staff_view(r.staff_id)),'[]'));
 end if;
 if not own then raise exception 'Only Ayon changes company teams and global viewing' using errcode='42501';end if;
 if action='bind_manager' then
  z:=payload->>'zone_id';target:=payload->>'staff_id';
  if not exists(select 1 from public.ffh_company_teams where zone_id=z and active) then raise exception 'Choose an active company zone';end if;
  if not exists(select 1 from public.ffh_profiles where staff_id=target and active) or target in ('PERVES_HIRA','WAHID_ADMIN') then raise exception 'Create or choose the real zone manager account first';end if;
  update public.ffh_profiles set can_manage=true,role='MANAGER',designation='MANAGER',business_title='MANAGER',can_sell=case when can_manage then can_sell else false end,zone_id=case when not can_manage then z else zone_id end,updated_at=now() where staff_id=target;
  insert into public.ffh_zone_access(staff_id,zone_id) values(target,z) on conflict do nothing;
  update public.ffh_company_teams set manager_staff_id=target,updated_at=now() where zone_id=z;
  update public.ffh_profiles set manager_id=target,team_name=(select manager_name from public.ffh_company_teams where zone_id=z),updated_at=now() where staff_id in(select staff_id from public.ffh_company_roster_members where zone_id=z) and staff_id<>target;
  return jsonb_build_object('saved',true);
 elsif action='global_view' then
  target:=payload->>'staff_id';enabled:=(payload->>'enabled')::boolean;
  if not exists(select 1 from public.ffh_profiles where staff_id=target and active and can_manage) then raise exception 'Choose an active management account';end if;
  if target in ('PERVES_HIRA','WAHID_ADMIN') and not enabled then raise exception 'Use Head Office account access settings to change this account';end if;
  delete from public.ffh_zone_access where staff_id=target and zone_id='*';
  if enabled then insert into public.ffh_zone_access values(target,'*');end if;
  update public.ffh_profiles set access_all_zones=enabled,accessible_zones=array(select zone_id from public.ffh_zone_access where staff_id=target),updated_at=now() where staff_id=target;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Unknown company roster action';
end$$;
revoke all on function ffh_private.company_roster(text,jsonb) from public,anon;
grant execute on function ffh_private.company_roster(text,jsonb) to authenticated,service_role;
create function public.ffh_company_roster(action text default 'state',payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select ffh_private.company_roster(action,payload) $$;
revoke all on function public.ffh_company_roster(text,jsonb) from public,anon;
grant execute on function public.ffh_company_roster(text,jsonb) to authenticated,service_role;

alter table public.ffh_profiles add column company_staff_id text;
create unique index ffh_company_staff_id_unique on public.ffh_profiles(upper(company_staff_id)) where company_staff_id is not null;
update public.ffh_profiles set company_staff_id=staff_id where staff_id ~ '^M[0-9]+$' and staff_id<>'M22075';
create function ffh_private.protect_company_staff_id() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not ffh_private.is_owner() and ((TG_OP='UPDATE' and new.company_staff_id is distinct from old.company_staff_id) or (TG_OP='INSERT' and new.company_staff_id is not null)) then raise exception 'Only Ayon sets company Staff ID' using errcode='42501';end if;
 if new.company_staff_id is not null and new.company_staff_id !~ '^[A-Z][A-Z0-9_-]{2,29}$' then raise exception 'Invalid company Staff ID';end if;
 return new;
end$$;
revoke all on function ffh_private.protect_company_staff_id() from public,anon,authenticated;
create trigger ffh_company_id_owner before insert or update on public.ffh_profiles for each row execute function ffh_private.protect_company_staff_id();
