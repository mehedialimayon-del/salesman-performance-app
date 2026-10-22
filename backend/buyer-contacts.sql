-- Route-private buyer contacts, including prospect outlets.
-- Reuses the application's approved-login and manager route visibility model.
begin;
create table public.ffh_buyer_contacts (
 id uuid primary key default gen_random_uuid(),
 sr_id text not null references public.ffh_profiles(staff_id),
 outlet_id uuid references public.ffh_outlets(id) on delete restrict,
 is_new boolean not null default false,
 category text not null check(category in ('management','buyer','staff')),
 outlet_name text not null check(length(trim(outlet_name)) between 1 and 200),
 name text not null check(length(trim(name)) between 1 and 150),
 designation text not null check(length(trim(designation)) between 1 and 150),
 whatsapp text not null check(whatsapp ~ '^[1-9][0-9]{6,14}$'),
 location text not null default '' check(length(location)<=1000),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180),
 notes text not null default '' check(length(notes)<=5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((is_new and outlet_id is null) or (not is_new and outlet_id is not null)),
 check((latitude is null)=(longitude is null))
);
create index ffh_buyer_route on public.ffh_buyer_contacts(sr_id,category);
create index ffh_buyer_outlet on public.ffh_buyer_contacts(outlet_id);
alter table public.ffh_buyer_contacts enable row level security;
revoke all on public.ffh_buyer_contacts from anon,authenticated;
grant select,insert,update,delete on public.ffh_buyer_contacts to authenticated;
-- Definer lookup is private: reading profiles/outlet ownership must not depend on
-- whether a client-side profile/outlet query was filtered. No buyer data is returned.
create function ffh_private.buyer_route_allowed(route_staff text, linked_outlet uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.ffh_profiles me
  join public.ffh_profiles target on target.staff_id=case when linked_outlet is null then route_staff else (select o.sr_id from public.ffh_outlets o where o.id=linked_outlet) end
  where me.auth_user_id=auth.uid() and me.active and me.login_approved
   and target.active and target.login_approved and target.can_sell
   and (me.staff_id='M21954' or me.staff_id=target.staff_id
    or (me.can_manage and ffh_private.staff_visible(target.staff_id)))
 )
$$;
revoke all on function ffh_private.buyer_route_allowed(text,uuid) from public,anon;
grant execute on function ffh_private.buyer_route_allowed(text,uuid) to authenticated;
create policy buyer_route_read on public.ffh_buyer_contacts for select to authenticated using(ffh_private.buyer_route_allowed(sr_id,outlet_id));
create policy buyer_route_insert on public.ffh_buyer_contacts for insert to authenticated with check(ffh_private.buyer_route_allowed(sr_id,outlet_id));
create policy buyer_route_update on public.ffh_buyer_contacts for update to authenticated using(ffh_private.buyer_route_allowed(sr_id,outlet_id)) with check(ffh_private.buyer_route_allowed(sr_id,outlet_id));
create policy buyer_route_delete on public.ffh_buyer_contacts for delete to authenticated using(ffh_private.buyer_route_allowed(sr_id,outlet_id));
create function ffh_private.prepare_buyer_contact() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.outlet_id is not null then
  select o.sr_id,o.outlet_name into new.sr_id,new.outlet_name from public.ffh_outlets o where o.id=new.outlet_id and o.active;
  if not found then raise exception 'Choose an active assigned outlet' using errcode='23514';end if;
 end if;
 if TG_OP='UPDATE' then new.created_at=old.created_at;end if;
 new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function ffh_private.prepare_buyer_contact() from public,anon,authenticated;
create trigger ffh_prepare_buyer_contact before insert or update on public.ffh_buyer_contacts for each row execute function ffh_private.prepare_buyer_contact();
commit;
