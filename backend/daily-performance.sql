begin;
alter table public.ffh_reward_offers add column if not exists audience jsonb;
alter table public.ffh_reward_offers add column if not exists description text not null default '';
alter table public.ffh_reward_offers add column if not exists version integer not null default 1;
alter table public.ffh_reward_offers add column if not exists updated_at timestamptz not null default now();
create table if not exists public.ffh_daily_updates(
 id uuid primary key default gen_random_uuid(), entry_scope text not null check(entry_scope in ('staff','zone')), scope_key text not null,
 staff_id text references public.ffh_profiles(staff_id),zone_id text not null references public.ffh_zones(id),sale_date date not null,
 order_amount numeric not null check(order_amount>=0 and order_amount<1000000000000),delivered_amount numeric not null check(delivered_amount>=0 and delivered_amount<1000000000000),
 order_count integer not null default 0 check(order_count between 0 and 1000000),delivered_count integer not null default 0 check(delivered_count between 0 and 1000000),order_cartons numeric not null default 0 check(order_cartons>=0 and order_cartons<1000000000),delivered_cartons numeric not null default 0 check(delivered_cartons>=0 and delivered_cartons<1000000000),
 product_lines jsonb not null default '[]',outlet_lines jsonb not null default '[]',remarks text not null default '',version integer not null default 1,
 created_by text not null references public.ffh_profiles(staff_id),updated_by text not null references public.ffh_profiles(staff_id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(scope_key,sale_date),check((entry_scope='staff' and staff_id is not null and scope_key='STAFF:'||staff_id) or(entry_scope='zone' and staff_id is null and scope_key='ZONE:'||zone_id))
);
create table if not exists public.ffh_daily_changes(
 id uuid primary key default gen_random_uuid(),submission_id uuid not null unique,update_id uuid not null references public.ffh_daily_updates(id),entry_scope text not null,staff_id text,zone_id text not null,sale_date date not null,
 delta jsonb not null,created_by text not null references public.ffh_profiles(staff_id),payload_hash text not null,result_version integer not null,created_at timestamptz not null default now()
);
create index if not exists ffh_daily_scope_day on public.ffh_daily_updates(zone_id,sale_date);
create index if not exists ffh_daily_changes_update on public.ffh_daily_changes(update_id,created_at);
alter table public.ffh_daily_updates enable row level security;
alter table public.ffh_daily_changes enable row level security;
revoke all on public.ffh_daily_updates,public.ffh_daily_changes from anon,authenticated;
grant select on public.ffh_daily_updates,public.ffh_daily_changes to authenticated;
create or replace function ffh_private.daily_visible(scope text,staff text,z text) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and public.ffh_my_staff_id() is not null and (public.ffh_owner() or (scope='staff' and public.ffh_staff_view(staff)) or (scope='zone' and exists(select 1 from public.ffh_profiles where staff_id=public.ffh_my_staff_id() and can_manage) and ffh_private.zone_visible(z)))$$;
revoke all on function ffh_private.daily_visible(text,text,text) from public,anon;grant execute on function ffh_private.daily_visible(text,text,text) to authenticated;
drop policy if exists ffh_daily_read on public.ffh_daily_updates;
create policy ffh_daily_read on public.ffh_daily_updates for select to authenticated using(ffh_private.daily_visible(entry_scope,staff_id,zone_id));
drop policy if exists ffh_daily_changes_read on public.ffh_daily_changes;
create policy ffh_daily_changes_read on public.ffh_daily_changes for select to authenticated using(ffh_private.daily_visible(entry_scope,staff_id,zone_id));
create or replace function ffh_private.reward_recipient(a jsonb,legacy text,rid text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.ffh_profiles p where p.staff_id=rid and p.active and p.login_approved and case when a is null then legacy in ('ALL',rid) else
(case when a->>'kind'='team' then p.can_manage else p.can_sell end) and ((jsonb_typeof(a->'staff_ids')='array' and a->'staff_ids' ? rid) or (a->>'staff_ids'='ALL' and(a->>'zone_ids'='ALL' or a->'zone_ids' ? p.zone_id))) end)$$;
create or replace function ffh_private.reward_visible(a jsonb,legacy text) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and public.ffh_my_staff_id() is not null and(public.ffh_owner() or ffh_private.reward_recipient(a,legacy,public.ffh_my_staff_id()) or (coalesce(a->>'kind','staff')='staff' and exists(select 1 from public.ffh_profiles p where p.active and p.login_approved and ffh_private.reward_recipient(a,legacy,p.staff_id) and p.staff_id<>public.ffh_my_staff_id() and public.ffh_staff_view(p.staff_id))))$$;
revoke all on function ffh_private.reward_recipient(jsonb,text,text),ffh_private.reward_visible(jsonb,text) from public,anon;
grant execute on function ffh_private.reward_recipient(jsonb,text,text),ffh_private.reward_visible(jsonb,text) to authenticated;
-- Replace only reward-offer SELECT policies; existing write guards remain in place.
do $$declare p record;begin for p in select policyname from pg_policies where schemaname='public' and tablename='ffh_reward_offers' and cmd='SELECT' loop execute format('drop policy %I on public.ffh_reward_offers',p.policyname);end loop;end$$;
create policy ffh_reward_scoped_read on public.ffh_reward_offers for select to authenticated using(ffh_private.reward_visible(audience,assigned_to));
create or replace function ffh_private.required_reward_skus(target text) returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(distinct s.value),'[]'::jsonb) from public.ffh_reward_offers o cross join lateral jsonb_array_elements(o.groups) g cross join lateral jsonb_array_elements_text(coalesce(g->'skus','[]')) s
where o.active and (now() at time zone 'Asia/Kuala_Lumpur')::date between o.start_date and o.end_date and g->>'mode' in ('single','combo') and (
ffh_private.reward_recipient(o.audience,o.assigned_to,target) or (o.audience->>'kind'='team' and exists(select 1 from public.ffh_profiles m join public.ffh_profiles t on t.staff_id=target where ffh_private.reward_recipient(o.audience,o.assigned_to,m.staff_id) and (m.zone_id=t.zone_id or m.owner_access or exists(select 1 from public.ffh_zone_access za where za.staff_id=m.staff_id and za.zone_id in ('*',t.zone_id))))))$$;
revoke all on function ffh_private.required_reward_skus(text) from public,anon;
create or replace function ffh_private.daily_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();r public.ffh_daily_updates%rowtype;prev public.ffh_daily_updates%rowtype;ev public.ffh_daily_changes%rowtype;target text;z text;k text;scope text;d date;request_id uuid;fingerprint text;products jsonb;ol jsonb;allowed jsonb;ln jsonb;oldp jsonb;delta_products jsonb:='[]';delta_outlets jsonb:='[]';hasold boolean;ord numeric;deliv numeric;oq numeric;dq numeric;cnt integer;dc integer;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved active login required' using errcode='42501';end if;
 if action='products' then target:=coalesce(payload->>'staff_id',sid);if not public.ffh_staff_view(target) then raise exception 'Staff outside your access' using errcode='42501';end if;return ffh_private.required_reward_skus(target);end if;
 if action<>'save' then raise exception 'Unknown daily sales action';end if;
 request_id:=(payload->>'submission_id')::uuid;fingerprint:=md5(payload::text);
 if request_id is null then raise exception 'Submission ID required';end if;
 select * into ev from public.ffh_daily_changes where submission_id=request_id;
 if found then if ev.created_by<>sid or ev.payload_hash<>fingerprint then raise exception 'Submission ID was already used for different data';end if;return jsonb_build_object('id',ev.update_id,'version',ev.result_version,'saved',true,'duplicate',true);end if;
 scope:=coalesce(payload->>'entry_scope','staff');d:=(payload->>'sale_date')::date;
 if d is null or d>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Choose today or an earlier date';end if;
 if scope='staff' then target:=coalesce(payload->>'staff_id',sid);select zone_id into z from public.ffh_profiles where staff_id=target and active and login_approved and can_sell;if z is null then raise exception 'Choose an active SR';end if;
 if not (target=sid or public.ffh_staff_edit(target,'sales')) then raise exception 'Sales edit access required for this SR' using errcode='42501';end if;
 if target=sid and not public.ffh_module_edit('sales') and d<>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Only today can be entered; request access for a previous date';end if;k:='STAFF:'||target;
 elsif scope='zone' then target:=null;z:=payload->>'zone_id';if not (public.ffh_module_edit('sales') and ffh_private.daily_visible('zone',null,z)) then raise exception 'Assigned zone and sales edit access required' using errcode='42501';end if;k:='ZONE:'||z;
 else raise exception 'Invalid daily sales scope';end if;
 perform pg_advisory_xact_lock(hashtextextended(k||d::text,0));
 select * into ev from public.ffh_daily_changes where submission_id=request_id;
 if found then if ev.created_by<>sid or ev.payload_hash<>fingerprint then raise exception 'Submission ID was already used for different data';end if;return jsonb_build_object('id',ev.update_id,'version',ev.result_version,'saved',true,'duplicate',true);end if;
 select * into prev from public.ffh_daily_updates where scope_key=k and sale_date=d for update;hasold:=found;
 if coalesce((payload->>'expected_version')::integer,0)<>(case when hasold then prev.version else 0 end) then raise exception 'This day changed on another device. Reload and review before saving.' using errcode='40001';end if;
 ord:=(payload->>'order_amount')::numeric;deliv:=(payload->>'delivered_amount')::numeric;oq:=coalesce((payload->>'order_cartons')::numeric,0);dq:=coalesce((payload->>'delivered_cartons')::numeric,0);cnt:=coalesce((payload->>'order_count')::integer,0);dc:=coalesce((payload->>'delivered_count')::integer,0);products:=coalesce(payload->'product_lines','[]');ol:=coalesce(payload->'outlet_lines','[]');
 if ord is null or deliv is null or not(ord>=0 and ord<1000000000000 and deliv>=0 and deliv<1000000000000 and oq>=0 and oq<1000000000 and dq>=0 and dq<1000000000 and cnt between 0 and 1000000 and dc between 0 and 1000000) then raise exception 'Enter valid nonnegative sales, cartons and PO totals';end if;
 if jsonb_typeof(products)<>'array' or jsonb_typeof(ol)<>'array' or jsonb_array_length(products)>1000 or jsonb_array_length(ol)>500 then raise exception 'Invalid detail lines';end if;
 if jsonb_array_length(products)<>(select count(distinct value->>'sku') from jsonb_array_elements(products)) then raise exception 'Enter each incentive SKU only once';end if;
 allowed:=case when target is null then coalesce((select jsonb_agg(distinct sk.value) from public.ffh_profiles p cross join lateral jsonb_array_elements_text(ffh_private.required_reward_skus(p.staff_id)) sk where p.active and p.can_sell and p.zone_id=z),'[]') else ffh_private.required_reward_skus(target) end;
 for ln in select value from jsonb_array_elements(products) loop
 if not(allowed ? (ln->>'sku')) and not exists(select 1 from jsonb_array_elements(coalesce(prev.product_lines,'[]')) old where old=ln) then raise exception 'SKU is not in an active assigned incentive';end if;
 if coalesce(ln->>'sku','')='' or not(coalesce((ln->>'order_qty')::numeric,-1)>=0 and (ln->>'order_qty')::numeric<1000000000 and coalesce((ln->>'delivered_qty')::numeric,-1)>=0 and (ln->>'delivered_qty')::numeric<1000000000) then raise exception 'Invalid product quantity';end if;end loop;
 if coalesce((select sum((value->>'order_qty')::numeric) from jsonb_array_elements(products)),0)>oq or coalesce((select sum((value->>'delivered_qty')::numeric) from jsonb_array_elements(products)),0)>dq then raise exception 'Total cartons must include the incentive product cartons';end if;
 for ln in select value from jsonb_array_elements(ol) loop
 if length(trim(coalesce(ln->>'name','')))=0 or not(coalesce((ln->>'order_amount')::numeric,-1)>=0 and (ln->>'order_amount')::numeric<1000000000000 and coalesce((ln->>'delivered_amount')::numeric,-1)>=0 and (ln->>'delivered_amount')::numeric<1000000000000 and coalesce((ln->>'order_count')::integer,-1)>=0) then raise exception 'Invalid outlet breakdown';end if;
 if target is not null and coalesce(ln->>'code','')<>'' and not exists(select 1 from public.ffh_outlets where sr_id=target and outlet_code=ln->>'code' and active) then raise exception 'Outlet is not assigned to this SR';end if;end loop;
 if coalesce((select sum((value->>'order_amount')::numeric) from jsonb_array_elements(ol)),0)>ord or coalesce((select sum((value->>'delivered_amount')::numeric) from jsonb_array_elements(ol)),0)>deliv or coalesce((select sum((value->>'order_count')::numeric) from jsonb_array_elements(ol)),0)>cnt then raise exception 'Outlet details cannot exceed the daily totals';end if;
 insert into public.ffh_daily_updates(entry_scope,scope_key,staff_id,zone_id,sale_date,order_amount,delivered_amount,order_count,delivered_count,order_cartons,delivered_cartons,product_lines,outlet_lines,remarks,created_by,updated_by)
 values(scope,k,target,z,d,ord,deliv,cnt,dc,oq,dq,products,ol,left(coalesce(payload->>'remarks',''),2000),sid,sid)
 on conflict(scope_key,sale_date) do update set order_amount=excluded.order_amount,delivered_amount=excluded.delivered_amount,order_count=excluded.order_count,delivered_count=excluded.delivered_count,order_cartons=excluded.order_cartons,delivered_cartons=excluded.delivered_cartons,product_lines=excluded.product_lines,outlet_lines=excluded.outlet_lines,remarks=excluded.remarks,updated_by=sid,updated_at=clock_timestamp(),version=public.ffh_daily_updates.version+1 returning * into r;
 for ln in select jsonb_build_object('sku',sk,'order_qty',coalesce((select (p->>'order_qty')::numeric from jsonb_array_elements(products)p where p->>'sku'=sk),0)-coalesce((select (p->>'order_qty')::numeric from jsonb_array_elements(coalesce(prev.product_lines,'[]'))p where p->>'sku'=sk),0),'delivered_qty',coalesce((select (p->>'delivered_qty')::numeric from jsonb_array_elements(products)p where p->>'sku'=sk),0)-coalesce((select (p->>'delivered_qty')::numeric from jsonb_array_elements(coalesce(prev.product_lines,'[]'))p where p->>'sku'=sk),0)) from (select value->>'sku' sk from jsonb_array_elements(products) union select value->>'sku' from jsonb_array_elements(coalesce(prev.product_lines,'[]'))) skus loop delta_products:=delta_products||jsonb_build_array(ln);end loop;
 for ln in with all_outlets as(select value v,false old from jsonb_array_elements(ol) union all select value,true from jsonb_array_elements(coalesce(prev.outlet_lines,'[]'))), flags as(select coalesce(nullif(v->>'code',''),lower(trim(v->>'name'))) outlet_key,max(v->>'name') outlet_name,coalesce(bool_or((v->>'order_amount')::numeric>0) filter(where not old),false)::integer-coalesce(bool_or((v->>'order_amount')::numeric>0) filter(where old),false)::integer ordered,coalesce(bool_or((v->>'delivered_amount')::numeric>0) filter(where not old),false)::integer-coalesce(bool_or((v->>'delivered_amount')::numeric>0) filter(where old),false)::integer delivered from all_outlets group by 1) select jsonb_build_object('code',outlet_key,'name',outlet_name,'order_delta',ordered,'delivery_delta',delivered) from flags loop delta_outlets:=delta_outlets||jsonb_build_array(ln);end loop;
 insert into public.ffh_daily_changes(submission_id,update_id,entry_scope,staff_id,zone_id,sale_date,delta,created_by,payload_hash,result_version)
 values(request_id,r.id,scope,target,z,d,jsonb_build_object('order_amount',ord-coalesce(prev.order_amount,0),'delivered_amount',deliv-coalesce(prev.delivered_amount,0),'order_qty',oq-coalesce(prev.order_cartons,0),'delivered_qty',dq-coalesce(prev.delivered_cartons,0),'order_count',cnt-coalesce(prev.order_count,0),'delivered_count',dc-coalesce(prev.delivered_count,0),'products',delta_products,'outlets',delta_outlets),sid,fingerprint,r.version);
 perform ffh_private.reward_daily_nudges(target,z,false);
 return jsonb_build_object('saved',true,'id',r.id,'version',r.version,'saved_at',r.updated_at);
end$$;
revoke all on function ffh_private.daily_action(text,jsonb) from public,anon;grant execute on function ffh_private.daily_action(text,jsonb) to authenticated;
create or replace function public.ffh_daily_sales(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.daily_action(action,payload)$$;
revoke all on function public.ffh_daily_sales(text,jsonb) from public,anon;grant execute on function public.ffh_daily_sales(text,jsonb) to authenticated;
create or replace function ffh_private.reward_campaign_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();r public.ffh_reward_offers%rowtype;a jsonb;g jsonb;rid text;zs jsonb;d1 date;d2 date;eid uuid;v integer;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 if action='state' then return coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from public.ffh_reward_offers o where ffh_private.reward_visible(o.audience,o.assigned_to)),'[]');end if;
 if action<>'save' or not public.ffh_module_edit('income') then raise exception 'Incentive edit permission required' using errcode='42501';end if;
 a:=payload->'audience';if not coalesce((jsonb_typeof(a)='object' and a->>'kind' in ('staff','team') and (a->>'staff_ids'='ALL' or (jsonb_typeof(a->'staff_ids')='array' and jsonb_array_length(a->'staff_ids')>0)) and (a->>'zone_ids'='ALL' or(jsonb_typeof(a->'zone_ids')='array' and jsonb_array_length(a->'zone_ids')>0))),false) then raise exception 'Choose recipients and zones';end if;
 if not public.ffh_owner() and not exists(select 1 from public.ffh_zone_access where staff_id=sid and zone_id='*') and a->>'zone_ids'='ALL' then select coalesce(jsonb_agg(id),'[]') into zs from public.ffh_zones where ffh_private.zone_visible(id);a:=jsonb_set(a,'{zone_ids}',zs);end if;
 if jsonb_typeof(a->'zone_ids')='array' then for rid in select jsonb_array_elements_text(a->'zone_ids') loop if not ffh_private.zone_visible(rid) then raise exception 'Zone outside your access' using errcode='42501';end if;end loop;end if;
 if jsonb_typeof(a->'staff_ids')='array' then for rid in select jsonb_array_elements_text(a->'staff_ids') loop if not public.ffh_staff_view(rid) or not ffh_private.reward_recipient(a,'',rid) then raise exception 'Recipient outside your access or role' using errcode='42501';end if;end loop;end if;
 d1:=(payload->>'start_date')::date;d2:=(payload->>'end_date')::date;
 if d1 is null or d2 is null or d2<d1 or length(trim(coalesce(payload->>'title','')))=0 or jsonb_typeof(payload->'groups')<>'array' or jsonb_array_length(payload->'groups') not between 1 and 50 then raise exception 'Choose campaign title, dates and incentive rules';end if;
 for g in select value from jsonb_array_elements(payload->'groups') loop
 if coalesce(g->>'mode','') not in ('sales','qty','single','combo','orders','outlets') or coalesce(g->>'basis','delivered') not in ('order','delivered') or coalesce(g->>'period','window') not in ('window','daily') or not(coalesce((g->>'target')::numeric,0)>0 and (g->>'target')::numeric<1000000000000 and coalesce((g->>'reward')::numeric,0)>0 and (g->>'reward')::numeric<1000000000000) then raise exception 'Invalid incentive rule';end if;
 if (g->>'mode'='single' and jsonb_array_length(coalesce(g->'skus','[]'))<>1) or(g->>'mode'='combo' and jsonb_array_length(coalesce(g->'skus','[]'))<2) then raise exception 'Choose one SKU or a combined SKU package';end if;end loop;
 eid:=nullif(payload->>'id','')::uuid;
 if eid is null then insert into public.ffh_reward_offers(title,assigned_to,start_date,end_date,groups,poster_url,created_by,audience,description) values(trim(payload->>'title'),'ALL',d1,d2,payload->'groups',nullif(payload->>'poster_url',''),sid,a,left(coalesce(payload->>'description',''),10000)) returning * into r;
 else select * into r from public.ffh_reward_offers where id=eid for update;if not found or not ffh_private.reward_visible(r.audience,r.assigned_to) or (not public.ffh_owner() and (r.audience is null or r.audience->>'zone_ids'='ALL')) then raise exception 'Campaign edit outside your access' using errcode='42501';end if;
 if coalesce((payload->>'expected_version')::integer,0)<>r.version then raise exception 'Campaign changed. Reload before editing.' using errcode='40001';end if;
 update public.ffh_reward_offers set title=trim(payload->>'title'),start_date=d1,end_date=d2,groups=payload->'groups',poster_url=nullif(payload->>'poster_url',''),audience=a,description=left(coalesce(payload->>'description',''),10000),updated_at=clock_timestamp(),version=version+1 where id=eid returning * into r;end if;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'incentive','Incentive · '||r.title,'Target and reward details updated. Active '||r.start_date||' to '||r.end_date,now(),'scheduled',sid,'reward-campaign:'||r.id||':'||r.version||':'||p.staff_id from public.ffh_profiles p where ffh_private.reward_recipient(r.audience,r.assigned_to,p.staff_id) on conflict(source_key) where source_key is not null do nothing;
 return to_jsonb(r);
end$$;
revoke all on function ffh_private.reward_campaign_action(text,jsonb) from public,anon;grant execute on function ffh_private.reward_campaign_action(text,jsonb) to authenticated;
create or replace function public.ffh_reward_campaign(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.reward_campaign_action(action,payload)$$;
revoke all on function public.ffh_reward_campaign(text,jsonb) from public,anon;grant execute on function public.ffh_reward_campaign(text,jsonb) to authenticated;
-- Preserve the existing earnings API and filter its offers through the same role guard.
create or replace function ffh_private.scoped_earnings(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p record;ids jsonb:='[]';r jsonb;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required';end if;
 if action='state' then r:=ffh_private.earnings_action(action,payload);return jsonb_set(r,'{offers}',coalesce((select jsonb_agg(to_jsonb(o)) from public.ffh_reward_offers o where ffh_private.reward_visible(o.audience,o.assigned_to)),'[]'));end if;
 if action='offer' and payload->>'assigned_to'='ALL' and not public.ffh_owner() then if not public.ffh_module_edit('income') then raise exception 'Income edit permission required';end if;for p in select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id) loop r:=ffh_private.earnings_action(action,jsonb_set(payload,'{assigned_to}',to_jsonb(p.staff_id)));ids:=ids||jsonb_build_array(r);end loop;return ids;end if;return ffh_private.earnings_action(action,payload);end$$;
-- Internal aggregate used for truthful progress reminders; no client-supplied progress.
create or replace function ffh_private.reward_measure(o public.ffh_reward_offers,g jsonb,recipient text,only_today boolean default false) returns numeric language plpgsql security definer set search_path='' as $$
declare ids text[];m public.ffh_profiles%rowtype;answer numeric;ordered boolean:=coalesce(g->>'basis','delivered')='order';kind text:=g->>'mode';today date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;
begin
 select * into m from public.ffh_profiles where staff_id=recipient;
 if o.audience->>'kind'='team' then select array_agg(p.staff_id) into ids from public.ffh_profiles p where p.active and p.login_approved and p.can_sell and(m.staff_id='M21954' or m.owner_access or p.zone_id=m.zone_id or exists(select 1 from public.ffh_zone_access z where z.staff_id=m.staff_id and z.zone_id in ('*',p.zone_id))) and(o.audience->>'zone_ids'='ALL' or o.audience->'zone_ids' ? p.zone_id);
 else ids:=array[recipient];end if;
 with controls as(select u.* from public.ffh_daily_updates u where o.audience->>'kind'='team' and u.entry_scope='zone' and exists(select 1 from public.ffh_profiles p where p.can_sell and p.active and p.staff_id=any(ids) and p.zone_id=u.zone_id) and not exists(select 1 from public.ffh_profiles p where p.can_sell and p.active and p.zone_id=u.zone_id and not(p.staff_id=any(ids)))),
 selected as(select u.* from public.ffh_daily_updates u where u.entry_scope='staff' and u.staff_id=any(ids) and not exists(select 1 from controls c where c.zone_id=u.zone_id and c.sale_date=u.sale_date) union all select * from controls),
 legacy as(select s.sr_id,s.sale_date,coalesce((case when ordered then s.created_at else s.delivered_at end at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) captured,s.sku,s.outlet_code,s.outlet_name,s.order_amount,s.delivered_amount,s.qty,case when ordered then 1 else case when s.status='Delivered' then 1 else 0 end end po from public.ffh_sales s join public.ffh_profiles p on p.staff_id=s.sr_id where s.sr_id=any(ids) and s.status not in ('Cancelled','Rejected') and(ordered or s.status='Delivered') and not exists(select 1 from selected u where u.entry_scope='staff' and u.staff_id=s.sr_id and u.sale_date=case when ordered then s.sale_date else coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) end) and not exists(select 1 from controls u where u.zone_id=p.zone_id and u.sale_date=case when ordered then s.sale_date else coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) end)),
 changes as(select e.*,(e.created_at at time zone 'Asia/Kuala_Lumpur')::date captured from public.ffh_daily_changes e join selected u on u.id=e.update_id where e.sale_date between o.start_date and o.end_date),
 numbers as(select case when kind='sales' then case when ordered then l.order_amount else l.delivered_amount end when kind='orders' then l.po else l.qty end value,l.captured from legacy l where (kind not in ('single','combo') or g->'skus' ? l.sku)
 union all select case when kind='sales' then coalesce((e.delta->>case when ordered then 'order_amount' else 'delivered_amount' end)::numeric,0) when kind='orders' then coalesce((e.delta->>case when ordered then 'order_count' else 'delivered_count' end)::numeric,0) else coalesce((e.delta->>case when ordered then 'order_qty' else 'delivered_qty' end)::numeric,0) end,e.captured from changes e where kind not in ('single','combo','outlets')
 union all select coalesce((p->>case when ordered then 'order_qty' else 'delivered_qty' end)::numeric,0),e.captured from changes e cross join lateral jsonb_array_elements(coalesce(e.delta->'products','[]'))p where kind in ('single','combo') and g->'skus' ? (p->>'sku')),
 outlet_events as(select l.sr_id||'|'||coalesce(nullif(l.outlet_code,''),l.outlet_name) k,1::numeric value,l.captured from legacy l where coalesce(nullif(l.outlet_code,''),l.outlet_name)<>'' and(case when ordered then l.order_amount else l.delivered_amount end>0 or l.qty>0)
 union all select coalesce(e.staff_id,'ZONE:'||e.zone_id)||'|'||(p->>'code'),coalesce((p->>case when ordered then 'order_delta' else 'delivery_delta' end)::numeric,0),e.captured from changes e cross join lateral jsonb_array_elements(coalesce(e.delta->'outlets','[]'))p),
 valid_numbers as(select * from numbers where captured between o.start_date and o.end_date and(not only_today or captured=today)),
 outlet_counts as(select k,sum(value) total from outlet_events where captured between o.start_date and o.end_date and(not only_today or captured=today) group by k)
 select case when kind='outlets' then(select count(*) from outlet_counts where total>0) else(select coalesce(sum(value),0) from valid_numbers) end into answer;
 return greatest(0,coalesce(answer,0));
end$$;
revoke all on function ffh_private.reward_measure(public.ffh_reward_offers,jsonb,text,boolean) from public,anon,authenticated;
create or replace function ffh_private.reward_daily_nudges(affected_staff text default null,affected_zone text default null,all_staff boolean default true) returns integer language plpgsql security definer set search_path='' as $$
declare o public.ffh_reward_offers%rowtype;p record;g jsonb;idx integer;got numeric;gap numeric;unit text;key text;body text;n integer:=0;today date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;period_key text;
begin
 for o in select * from public.ffh_reward_offers where active and today between start_date and end_date loop
 for p in select * from public.ffh_profiles where ffh_private.reward_recipient(o.audience,o.assigned_to,staff_id) and(all_staff or staff_id=affected_staff or(o.audience->>'kind'='team' and(zone_id=affected_zone or staff_id='M21954' or owner_access or exists(select 1 from public.ffh_zone_access z where z.staff_id=ffh_profiles.staff_id and z.zone_id in ('*',affected_zone))))) loop
 idx:=0;for g in select value from jsonb_array_elements(o.groups) loop
 got:=ffh_private.reward_measure(o,g,p.staff_id,coalesce(g->>'period','window')='daily');gap:=greatest(0,(g->>'target')::numeric-got);unit:=case g->>'mode' when 'sales' then 'RM' when 'orders' then 'POs' when 'outlets' then 'outlets' else 'cartons' end;
 period_key:=case when gap=0 and coalesce(g->>'period','window')<>'daily' then o.start_date::text else today::text end;
 key:='reward-progress:'||o.id||':'||o.version||':'||idx||':'||p.staff_id||':'||period_key||':'||case when gap=0 then 'earned' else 'remaining' end;
 body:=case when gap=0 then 'Target achieved. RM '||(g->>'reward')||' incentive · '||coalesce(g->>'name',o.title) else 'Only '||gap||' '||unit||' remaining to earn RM '||(g->>'reward')||'. Do not miss this opportunity.' end;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(p.staff_id,'incentive',o.title,body,now(),'scheduled',o.created_by,key) on conflict(source_key) where source_key is not null do nothing;
 idx:=idx+1;n:=n+1;
 end loop;end loop;end loop;return n;
end$$;
revoke all on function ffh_private.reward_daily_nudges(text,text,boolean) from public,anon,authenticated;


create or replace function ffh_private.daily_delivered(ids text[],from_day date,to_day date,combine_zones boolean) returns numeric language sql stable security definer set search_path='' as $$
with controls as(select u.* from public.ffh_daily_updates u where combine_zones and u.entry_scope='zone' and u.sale_date between from_day and to_day and exists(select 1 from public.ffh_profiles p where p.active and p.can_sell and p.staff_id=any(ids) and p.zone_id=u.zone_id) and not exists(select 1 from public.ffh_profiles p where p.active and p.can_sell and p.zone_id=u.zone_id and not(p.staff_id=any(ids)))),
values_by_staff as(select u.staff_id,u.zone_id,u.sale_date,u.delivered_amount from public.ffh_daily_updates u where u.entry_scope='staff' and u.staff_id=any(ids) and u.sale_date between from_day and to_day
union all select s.sr_id,p.zone_id,coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date),s.delivered_amount from public.ffh_sales s join public.ffh_profiles p on p.staff_id=s.sr_id where s.sr_id=any(ids) and s.status='Delivered' and coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) between from_day and to_day and not exists(select 1 from public.ffh_daily_updates u where u.entry_scope='staff' and u.staff_id=s.sr_id and u.sale_date=coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date)))
select coalesce((select sum(v.delivered_amount) from values_by_staff v where not exists(select 1 from controls c where c.zone_id=v.zone_id and c.sale_date=v.sale_date)),0)+coalesce((select sum(delivered_amount) from controls),0)
$$;
revoke all on function ffh_private.daily_delivered(text[],date,date,boolean) from public,anon,authenticated;
create or replace function ffh_private.sales_focus_payload(viewer text,report_day date) returns jsonb language sql stable security definer set search_path='' as $$
with team as(select p.staff_id,p.full_name,coalesce(i.actual_target,p.monthly_target,0) target from public.ffh_profiles p left join public.ffh_income_settings i on i.staff_id=p.staff_id and i.month=to_char(report_day,'YYYY-MM') where p.active and p.login_approved and p.can_sell and ffh_private.viewer_scope(viewer,p.staff_id)),
people as(select t.*,ffh_private.daily_delivered(array[t.staff_id],date_trunc('month',report_day)::date,report_day,false) delivered,
(select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active) outlets,
(select count(*) from public.ffh_outlets o where o.sr_id=t.staff_id and o.active and not exists(select 1 from public.ffh_sales s where s.sr_id=o.sr_id and s.outlet_code=o.outlet_code and s.status='Delivered' and s.delivered_amount>0 and coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date) between date_trunc('month',report_day)::date and report_day) and not exists(select 1 from public.ffh_daily_updates u cross join lateral jsonb_array_elements(u.outlet_lines) l where u.entry_scope='staff' and u.staff_id=o.sr_id and (l->>'code'=o.outlet_code or lower(trim(l->>'name'))=lower(trim(o.outlet_name))) and (l->>'delivered_amount')::numeric>0 and u.sale_date between date_trunc('month',report_day)::date and report_day)) zero,
(select count(*) from public.ffh_tasks x where x.assigned_to in(t.staff_id,'ALL') and x.status not in('Done','Completed','Cancelled','Pending Review')) pending_tasks from team t),
report as(select coalesce(sum(target),0) target,ffh_private.daily_delivered(array(select staff_id from team),date_trunc('month',report_day)::date,report_day,exists(select 1 from public.ffh_profiles where staff_id=viewer and can_manage)) delivered,coalesce(sum(outlets),0) outlets,coalesce(sum(zero),0) zero,
(select count(*) from public.ffh_tasks x where x.status not in('Done','Completed','Cancelled','Pending Review') and(x.assigned_to='ALL' or x.assigned_to in(select staff_id from team) or x.assigned_to=viewer)) pending_tasks from people)
select jsonb_build_object('target',r.target,'delivered',r.delivered,'shortfall',greatest(r.target-r.delivered,0),'outlets',r.outlets,'zero',r.zero,'pending_tasks',r.pending_tasks,
'body','MTD '||to_char(report_day,'YYYY-MM')||' | Target RM '||round(r.target,2)||' | Delivered RM '||round(r.delivered,2)||' | Shortfall RM '||round(greatest(r.target-r.delivered,0),2)||' | Outlets '||r.outlets||' | Zero outlets '||r.zero||' | Pending tasks '||r.pending_tasks,
'people',coalesce((select jsonb_agg(jsonb_build_object('staff_id',p.staff_id,'full_name',p.full_name,'target',p.target,'delivered',p.delivered,'shortfall',greatest(p.target-p.delivered,0),'outlets',p.outlets,'zero',p.zero,'body',p.full_name||' ('||p.staff_id||') | Target RM '||round(p.target,2)||' | Delivered RM '||round(p.delivered,2)||' | Shortfall RM '||round(greatest(p.target-p.delivered,0),2)||' | Outlets '||p.outlets||' | Zero outlets '||p.zero||' | Pending tasks '||p.pending_tasks) order by p.staff_id) from people p),'[]'::jsonb)) from report r
$$;
revoke all on function ffh_private.sales_focus_payload(text,date) from public,anon,authenticated;
grant execute on function ffh_private.sales_focus_payload(text,date) to service_role;
CREATE OR REPLACE FUNCTION ffh_private.daily_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare local_now timestamp:=now() at time zone 'Asia/Kuala_Lumpur';day date:=local_now::date;hm time:=date_trunc('minute',local_now)::time;
 pref public.ffh_notification_preferences%rowtype;r record;offr record;g jsonb;amt numeric;goal numeric;zero_count int;task_count int;progress numeric;msg text;report jsonb;person jsonb;inserted int;total int:=0;begin
 select * into pref from public.ffh_notification_preferences where id=1;if not found then return 0;end if;
 if pref.morning_enabled and hm=pref.morning_time then
 for r in select staff_id,full_name,can_manage,can_sell from public.ffh_profiles where active and login_approved and (can_manage or can_sell) loop
 report:=ffh_private.sales_focus_payload(r.staff_id,day);msg:=r.full_name||' | '||case when r.staff_id='M21954' then 'Company scope' when r.can_manage then 'Permitted team / zones' else 'Personal scope' end||' | '||(report->>'body');
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(r.staff_id,case when r.can_manage then 'manager-summary' else 'morning' end,case when r.can_manage then 'Your permitted zones · Sales focus' else 'Your sales focus' end,msg,now(),'scheduled','SYSTEM','morning-v2:'||day||':'||r.staff_id) on conflict(source_key) where source_key is not null do nothing;
 get diagnostics inserted=row_count;total:=total+inserted;
 -- Ayon receives the individual SR reports too. Each SR still receives only their own report.
 if r.staff_id='M21954' then
 for person in select value from jsonb_array_elements(report->'people') loop
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 values(r.staff_id,'manager-summary','SR report · '||(person->>'full_name'),person->>'body',now(),'scheduled','SYSTEM','morning-sr-copy:'||day||':'||(person->>'staff_id'))
 on conflict(source_key) where source_key is not null do nothing;get diagnostics inserted=row_count;total:=total+inserted;
 end loop;end if;
 -- Each person gets their own live incentive gap; managers get the scoped team summary above.
 perform ffh_private.reward_daily_nudges(r.staff_id,null,false);
 end loop;end if;
 if pref.evening_enabled and hm=pref.evening_time then
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select staff_id,'evening','Meeting & next-day plan','Prepare for the 20:30 meeting. Review your permitted scope, pending tasks and next-day route.',now(),'scheduled','SYSTEM','evening-v2:'||day||':'||staff_id from public.ffh_profiles where active and login_approved
 on conflict(source_key) where source_key is not null do nothing;get diagnostics inserted=row_count;total:=total+inserted;end if;
 return total;end$function$;



commit;
