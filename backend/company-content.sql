begin;
CREATE OR REPLACE FUNCTION ffh_private.publish_campaigns_legacy(campaigns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare old_payload jsonb; staff text;
begin
 if auth.uid() is null or not public.ffh_module_edit('cpo') then raise exception 'Manager access required' using errcode='42501'; end if;
 if campaigns is null or jsonb_typeof(campaigns)<>'array' then raise exception 'Campaign list must be an array'; end if;
 select staff_id into staff from public.ffh_profiles where auth_user_id=auth.uid() and active;
 select payload into old_payload from public.ffh_shared_content where content_key='cpo_campaigns' for update;
 if exists(select 1 from jsonb_array_elements(campaigns) c where coalesce(c->>'id','')='' or coalesce(c->>'title','')='' or (c->>'type') not in ('CPO','Promotion')
 or coalesce(c->>'executionMode','proof') not in ('proof','view')
 or nullif(c->>'endDate','')::date < coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date)) then raise exception 'Invalid campaign details or dates'; end if;
 insert into public.ffh_campaigns(id,title,campaign_type,execution_mode,assigned_to,outlet_category,product,poster_url,start_date,end_date,active,updated_at)
 select c->>'id',c->>'title',c->>'type',coalesce(c->>'executionMode','proof'),coalesce(nullif(c->>'sr',''),'ALL'),coalesce(nullif(c->>'category',''),'ALL'),coalesce(c->>'product',''),coalesce(c->>'image',''),
 coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),
 coalesce(nullif(c->>'endDate','')::date,nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),coalesce((c->>'active')::boolean,true),now()
 from jsonb_array_elements(campaigns) c
 on conflict(id) do update set title=excluded.title,campaign_type=excluded.campaign_type,execution_mode=excluded.execution_mode,assigned_to=excluded.assigned_to,outlet_category=excluded.outlet_category,product=excluded.product,poster_url=excluded.poster_url,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active,updated_at=excluded.updated_at;
 update public.ffh_campaigns set active=false,updated_at=now()
 where id in (select c->>'id' from jsonb_array_elements(coalesce(old_payload,'[]'::jsonb)) c)
 and id not in (select c->>'id' from jsonb_array_elements(campaigns) c);
 insert into public.ffh_shared_content(content_key,payload,updated_at,updated_by) values('cpo_campaigns',campaigns,now(),staff)
 on conflict(content_key) do update set payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $function$;

revoke all on function ffh_private.publish_campaigns_legacy(jsonb) from public,anon,authenticated;
alter table public.ffh_campaigns add column if not exists zone_ids text[] not null default '{}';
create or replace function ffh_private.campaign_visible(c jsonb) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and public.ffh_my_staff_id() is not null and (public.ffh_owner() or
(case when coalesce(c->>'sr','ALL')='ALL' then
(coalesce(jsonb_array_length(c->'zoneIds'),0)=0 or exists(select 1 from jsonb_array_elements_text(c->'zoneIds') z where ffh_private.zone_visible(z) or z=public.ffh_current_zone()))
else public.ffh_staff_view(c->>'sr') end))$$;
create or replace function ffh_private.campaign_state() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce((select jsonb_agg(c) from public.ffh_shared_content s cross join lateral jsonb_array_elements(s.payload) c where s.content_key='cpo_campaigns' and ffh_private.campaign_visible(c)),'[]'::jsonb)$$;
create or replace function public.ffh_campaign_state() returns jsonb language sql security invoker set search_path='' as $$select ffh_private.campaign_state()$$;
create policy ffh_campaign_zone_read on public.ffh_campaigns as restrictive for select to authenticated using(public.ffh_my_staff_id() is not null and (public.ffh_owner() or ((assigned_to='ALL' or public.ffh_staff_view(assigned_to)) and (cardinality(zone_ids)=0 or exists(select 1 from unnest(zone_ids) z where ffh_private.zone_visible(z) or z=public.ffh_current_zone())))));
create policy ffh_shared_campaign_private on public.ffh_shared_content as restrictive for select to authenticated using(content_key<>'cpo_campaigns' or public.ffh_owner());
create or replace function ffh_private.publish_campaigns(campaigns jsonb) returns void language plpgsql security definer set search_path='' as $$
declare own boolean:=public.ffh_owner();old_list jsonb;merged jsonb:='[]';c jsonb;prev jsonb;zone_list jsonb;begin
 if auth.uid() is null or not public.ffh_module_edit('cpo') then raise exception 'Campaign edit permission required' using errcode='42501';end if;
 if jsonb_typeof(campaigns)<>'array' then raise exception 'Campaign array required';end if;
 select payload into old_list from public.ffh_shared_content where content_key='cpo_campaigns' for update;
 select coalesce(jsonb_agg(id),'[]') into zone_list from public.ffh_zones where active and ffh_private.zone_visible(id);
 for c in select value from jsonb_array_elements(campaigns) loop
  select value into prev from jsonb_array_elements(coalesce(old_list,'[]')) where value->>'id'=c->>'id';
  if not own then
   if prev is not null and (not ffh_private.campaign_visible(prev) or (prev->>'sr'='ALL' and coalesce(jsonb_array_length(prev->'zoneIds'),0)=0)) and c<>prev then raise exception 'Campaign affects zones outside your scope';end if;
   if c->>'sr'='ALL' then
    if prev is null then c:=jsonb_set(c,'{zoneIds}',zone_list);
    elsif c<>prev and exists(select 1 from jsonb_array_elements_text(coalesce(c->'zoneIds','[]')) z where not ffh_private.zone_visible(z)) then raise exception 'Campaign zone outside your scope';end if;
   elsif not public.ffh_staff_view(c->>'sr') then raise exception 'Campaign recipient outside your scope';end if;
  end if;
  merged:=merged||jsonb_build_array(c);
 end loop;
 for c in select value from jsonb_array_elements(coalesce(old_list,'[]')) loop
  if not exists(select 1 from jsonb_array_elements(campaigns) n where n->>'id'=c->>'id') then
   if not ffh_private.campaign_visible(c) then merged:=merged||jsonb_build_array(c);
   elsif not ffh_private.allowed('cpo','delete') or (not own and c->>'sr'='ALL' and coalesce(jsonb_array_length(c->'zoneIds'),0)=0) then raise exception 'Campaign delete permission required' using errcode='42501';end if;
  end if;
 end loop;
 perform ffh_private.publish_campaigns_legacy(merged);
 update public.ffh_campaigns t set zone_ids=array(select jsonb_array_elements_text(jc.value->'zoneIds')) from jsonb_array_elements(merged) jc(value) where t.id=jc.value->>'id';
end$$;
create or replace function public.ffh_publish_campaigns(campaigns jsonb) returns void language sql security invoker set search_path='' as $$select ffh_private.publish_campaigns(campaigns)$$;
create or replace function ffh_private.shared_item_trash() returns trigger language plpgsql security definer set search_path='' as $$
declare c jsonb;sid text:=public.ffh_my_staff_id();begin
 if old.content_key<>'cpo_campaigns' or jsonb_typeof(old.payload)<>'array' then return new;end if;
 for c in select value from jsonb_array_elements(old.payload) loop
 if not exists(select 1 from jsonb_array_elements(new.payload) n where n->>'id'=c->>'id') then
  if auth.uid() is not null and not ffh_private.allowed('cpo','delete') then raise exception 'Campaign delete permission required' using errcode='42501';end if;
  insert into ffh_private.trash(table_name,row_key,row_data,deleted_by) values('ffh_shared_content',jsonb_build_object('content_key',old.content_key,'item_id',c->>'id'),jsonb_build_object('_shared_item',true,'content_key',old.content_key,'item',c),sid);
 end if;end loop;return new;end$$;
create trigger ffh_shared_item_trash before update on public.ffh_shared_content for each row execute function ffh_private.shared_item_trash();
revoke all on function ffh_private.shared_item_trash() from public,anon,authenticated;
do $$declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ffh_private' and p.proname in ('campaign_state','publish_campaigns','campaign_visible') loop execute format('revoke all on function %s from public,anon',f);execute format('grant execute on function %s to authenticated',f);end loop;end$$;
revoke all on function public.ffh_campaign_state() from public,anon;grant execute on function public.ffh_campaign_state() to authenticated;
commit;
