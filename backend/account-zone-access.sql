alter table public.ffh_profiles add column if not exists business_title text not null default '';
alter table public.ffh_profiles add column if not exists access_all_zones boolean not null default false;
alter table public.ffh_profiles add column if not exists accessible_zones text[] not null default '{}';
alter table public.ffh_profiles add column if not exists team_name text not null default '';
alter table public.ffh_profiles add column if not exists route_name text not null default '';
-- Extend the established scope helper without granting business write or account administration.
create or replace function public.ffh_staff_view(target_staff text) returns boolean
language sql stable security definer set search_path=public as $$
select ffh_owner() or target_staff=ffh_my_staff_id() or exists(
 select 1 from ffh_profiles me join ffh_profiles target
 on (target.zone_id=me.zone_id or me.access_all_zones or target.zone_id=any(me.accessible_zones))
 where me.auth_user_id=auth.uid() and me.active and me.login_approved
 and me.can_manage and target.staff_id=target_staff
)
$$;
