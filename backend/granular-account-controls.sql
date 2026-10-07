begin;
-- The account service alone invokes this transaction, after authenticating Ayon.
create or replace function public.ffh_account_access(target text,permissions text[],route_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare codes text[];
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Account service required' using errcode='42501';end if;
 if target='M21954' or not exists(select 1 from public.ffh_profiles where staff_id=target) then raise exception 'Invalid target';end if;
 if cardinality(permissions)>20 or not permissions <@ array['accounts_create','accounts_edit','catalogue','outlets','routes','sales','tasks','cpo','income','kb','briefings','settings']::text[] then raise exception 'Invalid permissions';end if;
 if cardinality(route_ids)>5000 or exists(select 1 from unnest(route_ids) id where not exists(select 1 from public.ffh_outlets o where o.id=id)) then raise exception 'Invalid route outlets';end if;
 select coalesce(array_agg(distinct outlet_code),'{}'::text[]) into codes from public.ffh_outlets where id=any(route_ids);
 delete from public.ffh_access_grants where staff_id=target;
 insert into public.ffh_access_grants(staff_id,module,can_edit) select target,m,true from (select distinct unnest(permissions) m) x;
 update public.ffh_outlets set active=false,updated_at=now() where sr_id=target and not(outlet_code=any(codes));
 insert into public.ffh_outlets(sr_id,outlet_code,outlet_name,category,total_sku,active,source,assigned_at)
 select distinct on(outlet_code) target,outlet_code,outlet_name,category,total_sku,true,'account assignment',now() from public.ffh_outlets where id=any(route_ids) order by outlet_code,updated_at desc
 on conflict(sr_id,outlet_code) do update set active=true,outlet_name=excluded.outlet_name,category=excluded.category,total_sku=excluded.total_sku,assigned_at=now(),updated_at=now();
end$$;
revoke all on function public.ffh_account_access(text,text[],uuid[]) from public,anon,authenticated;
grant execute on function public.ffh_account_access(text,text[],uuid[]) to service_role;
-- Global product and knowledge masters require their own checkbox.
do $$declare t text;feature text;begin
 for t,feature in select * from (values ('ffh_catalogue_products','catalogue'),('ffh_catalogue_categories','catalogue'),('ffh_campaigns','cpo'),('ffh_ai_knowledge','kb'),('ffh_settings','settings'),('ffh_proposals','settings')) x(t,f) loop
 execute format('drop policy if exists ffh_granular_insert on public.%I',t);
 execute format('create policy ffh_granular_insert on public.%I for insert to authenticated with check(public.ffh_module_edit(%L))',t,feature);
 execute format('drop policy if exists ffh_granular_update on public.%I',t);
 execute format('create policy ffh_granular_update on public.%I for update to authenticated using(public.ffh_module_edit(%L)) with check(public.ffh_module_edit(%L))',t,feature,feature);
 execute format('drop policy if exists ffh_granular_delete on public.%I',t);
 execute format('create policy ffh_granular_delete on public.%I for delete to authenticated using(public.ffh_module_edit(%L))',t,feature);
 end loop;
end$$;
drop policy if exists ffh_briefings_granular on public.ffh_briefings;
create policy ffh_briefings_granular on public.ffh_briefings for all to authenticated using(public.ffh_module_edit('briefings')) with check(public.ffh_module_edit('briefings') and created_by=public.ffh_my_staff_id());
-- Read remains shared; no global manager write bypass is introduced.
commit;
-- Bulk catalogue and ordering use the same permission as individual product edits.
do $$declare r record;begin
 for r in select pg_get_functiondef(oid) definition from pg_proc where pronamespace='public'::regnamespace and proname in ('ffh_catalogue_bulk_save','ffh_reorder_catalogue') loop
 execute replace(replace(r.definition,'public.ffh_can_manage()','public.ffh_module_edit(''catalogue'')'),'not ffh_can_manage()','not public.ffh_module_edit(''catalogue'')');
 end loop;
end$$;
