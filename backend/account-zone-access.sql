alter table public.ffh_profiles add column if not exists business_title text not null default '';
alter table public.ffh_profiles add column if not exists access_all_zones boolean not null default false;
alter table public.ffh_profiles add column if not exists accessible_zones text[] not null default '{}';
alter table public.ffh_profiles add column if not exists team_name text not null default '';
alter table public.ffh_profiles add column if not exists route_name text not null default '';
-- Canonical scope logic and legacy access import are in company-unified.sql.
