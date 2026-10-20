begin;
alter table public.ffh_sales_baselines add column if not exists daily_only boolean not null default false;
create table if not exists public.ffh_daily_comparison_history(
 id uuid primary key default gen_random_uuid(),entry_scope text not null check(entry_scope in ('staff','zone')),scope_key text not null,
 staff_id text references public.ffh_profiles(staff_id),zone_id text not null references public.ffh_zones(id),sale_date date not null,amount numeric(16,2) not null check(amount>=0),
 updated_by text not null,updated_at timestamptz not null default now(),unique(scope_key,sale_date),check((entry_scope='staff' and staff_id is not null and scope_key='STAFF:'||staff_id) or(entry_scope='zone' and staff_id is null and scope_key='ZONE:'||zone_id))
);
alter table public.ffh_daily_comparison_history enable row level security;
revoke all on public.ffh_daily_comparison_history from public,anon,authenticated;
grant select on public.ffh_daily_comparison_history to authenticated;
drop policy if exists ffh_comparison_history_scope on public.ffh_daily_comparison_history;
create policy ffh_comparison_history_scope on public.ffh_daily_comparison_history for select to authenticated using(ffh_private.daily_visible(entry_scope,staff_id,zone_id));
create or replace function ffh_private.daily_history(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();scope text:=coalesce(payload->>'entry_scope','staff');target text;z text;k text;d date:=(payload->>'sale_date')::date;v numeric:=(payload->>'amount')::numeric;b public.ffh_sales_baselines%rowtype;days jsonb;total numeric;
begin
 if auth.uid() is null or sid is null then raise exception 'Active login required' using errcode='42501';end if;
 if d is null or d>=(now() at time zone 'Asia/Kuala_Lumpur')::date or v is null or v<0 or v>=1000000000000 then raise exception 'Choose a historical day and nonnegative amount';end if;
 if scope='staff' then target:=coalesce(payload->>'staff_id',sid);select zone_id into z from public.ffh_profiles where staff_id=target and active and login_approved and can_sell;
 if z is null or not(target=sid or public.ffh_staff_edit(target,'sales')) then raise exception 'Sales edit access required' using errcode='42501';end if;k:='STAFF:'||target;
 elsif scope='zone' then z:=payload->>'zone_id';if not(public.ffh_module_edit('sales') and ffh_private.daily_visible('zone',null,z)) then raise exception 'Assigned zone edit access required' using errcode='42501';end if;k:='ZONE:'||z;
 else raise exception 'Invalid scope';end if;
 -- Actual app records always take priority over manually supplied comparison history.
 if exists(select 1 from public.ffh_daily_updates u where u.scope_key=k and u.sale_date=d) or (scope='staff' and exists(select 1 from public.ffh_sales s where s.sr_id=target and s.status='Delivered' and coalesce((s.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,s.sale_date)=d)) then return jsonb_build_object('saved',false,'source','App sales');end if;
 perform pg_advisory_xact_lock(hashtextextended('history:'||k||to_char(d,'YYYY-MM'),0));
 insert into public.ffh_daily_comparison_history(entry_scope,scope_key,staff_id,zone_id,sale_date,amount,updated_by) values(scope,k,target,z,d,v,sid) on conflict(scope_key,sale_date) do update set amount=excluded.amount,updated_by=sid,updated_at=clock_timestamp();
 if scope='staff' then
 select * into b from public.ffh_sales_baselines where staff_id=target and month=to_char(d,'YYYY-MM') for update;
 days:=coalesce(b.daily_sales,'{}')||jsonb_build_object(extract(day from d)::integer::text,v);
 select coalesce(sum(value::numeric),0) into total from jsonb_each_text(days);
 insert into public.ffh_sales_baselines(staff_id,month,total_sales,daily_sales,updated_by,daily_only) values(target,to_char(d,'YYYY-MM'),case when b.staff_id is null or b.daily_only then total else greatest(coalesce(b.total_sales,0),total) end,days,sid,(b.staff_id is null or b.daily_only) and (select count(*) from jsonb_each(days))<extract(day from (date_trunc('month',d)+interval '1 month - 1 day'))) on conflict(staff_id,month) do update set daily_sales=excluded.daily_sales,total_sales=excluded.total_sales,daily_only=excluded.daily_only,updated_by=sid,updated_at=clock_timestamp();
 end if;
 return jsonb_build_object('saved',true);
end$$;
revoke all on function ffh_private.daily_history(jsonb) from public,anon;grant execute on function ffh_private.daily_history(jsonb) to authenticated;
create or replace function public.ffh_daily_history(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.daily_history(payload)$$;
revoke all on function public.ffh_daily_history(jsonb) from public,anon;grant execute on function public.ffh_daily_history(jsonb) to authenticated;
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
 if target=sid and not public.ffh_module_edit('sales') and coalesce(payload->>'entry_kind','')<>'delivery' and d<>(now() at time zone 'Asia/Kuala_Lumpur')::date then raise exception 'Only today can be entered; request access for a previous date';end if;k:='STAFF:'||target;
 elsif scope='zone' then target:=null;z:=payload->>'zone_id';if not (public.ffh_module_edit('sales') and ffh_private.daily_visible('zone',null,z)) then raise exception 'Assigned zone and sales edit access required' using errcode='42501';end if;k:='ZONE:'||z;
 else raise exception 'Invalid daily sales scope';end if;
 perform pg_advisory_xact_lock(hashtextextended(k||d::text,0));
 select * into ev from public.ffh_daily_changes where submission_id=request_id;
 if found then if ev.created_by<>sid or ev.payload_hash<>fingerprint then raise exception 'Submission ID was already used for different data';end if;return jsonb_build_object('id',ev.update_id,'version',ev.result_version,'saved',true,'duplicate',true);end if;
 select * into prev from public.ffh_daily_updates where scope_key=k and sale_date=d for update;hasold:=found;
 if payload->>'entry_kind'='delivery' then
 if not hasold then raise exception 'Save orders before confirming delivery';end if;
 if (payload->>'order_amount')::numeric<>prev.order_amount or (payload->>'order_count')::integer<>prev.order_count or (payload->>'order_cartons')::numeric<>prev.order_cartons then raise exception 'Delivery confirmation cannot change the original orders';end if;
 if (select coalesce(jsonb_agg(jsonb_build_object('sku',p->>'sku','qty',(p->>'order_qty')::numeric) order by p->>'sku'),'[]') from jsonb_array_elements(coalesce(payload->'product_lines','[]')) p) is distinct from (select coalesce(jsonb_agg(jsonb_build_object('sku',p->>'sku','qty',(p->>'order_qty')::numeric) order by p->>'sku'),'[]') from jsonb_array_elements(prev.product_lines) p) then raise exception 'Delivery confirmation cannot change ordered products';end if;
 if (select coalesce(jsonb_agg(p-'delivered_amount' order by p->>'code',p->>'name'),'[]') from jsonb_array_elements(coalesce(payload->'outlet_lines','[]'))p) is distinct from (select coalesce(jsonb_agg(p-'delivered_amount' order by p->>'code',p->>'name'),'[]') from jsonb_array_elements(prev.outlet_lines)p) then raise exception 'Delivery confirmation cannot change ordered outlets';end if;
 if (payload->>'delivered_amount')::numeric>prev.order_amount or (payload->>'delivered_count')::integer>prev.order_count then raise exception 'Actual delivery cannot exceed the collected order';end if;
 end if;
 if coalesce((payload->>'ppr_amount')::numeric,prev.ppr_amount,0)<0 or coalesce((payload->>'active_sales_amount')::numeric,prev.active_sales_amount,0)<0 then raise exception 'Activity amounts cannot be negative';end if;
 if coalesce((payload->>'expected_version')::integer,0)<>(case when hasold then prev.version else 0 end) then raise exception 'This day changed on another device. Reload and review before saving.' using errcode='40001';end if;
 ord:=(payload->>'order_amount')::numeric;deliv:=(payload->>'delivered_amount')::numeric;oq:=coalesce((payload->>'order_cartons')::numeric,0);dq:=coalesce((payload->>'delivered_cartons')::numeric,0);cnt:=coalesce((payload->>'order_count')::integer,0);dc:=coalesce((payload->>'delivered_count')::integer,0);products:=coalesce(payload->'product_lines','[]');ol:=coalesce(payload->'outlet_lines','[]');
 if ord is null or deliv is null or not(ord>=0 and ord<1000000000000 and deliv>=0 and deliv<1000000000000 and oq>=0 and oq<1000000000 and dq>=0 and dq<1000000000 and cnt between 0 and 1000000 and dc between 0 and 1000000) then raise exception 'Enter valid nonnegative sales, cartons and PO totals';end if;
 if jsonb_typeof(products)<>'array' or jsonb_typeof(ol)<>'array' or jsonb_array_length(products)>1000 or jsonb_array_length(ol)>500 then raise exception 'Invalid detail lines';end if;
 if jsonb_array_length(products)<>(select count(distinct value->>'sku') from jsonb_array_elements(products)) then raise exception 'Enter each incentive SKU only once';end if;
 allowed:=case when target is null then coalesce((select jsonb_agg(distinct sk.value) from public.ffh_profiles p cross join lateral jsonb_array_elements_text(ffh_private.required_reward_skus(p.staff_id)) sk where p.active and p.can_sell and p.zone_id=z),'[]') else ffh_private.required_reward_skus(target) end;
 for ln in select value from jsonb_array_elements(products) loop
 if not(allowed ? (ln->>'sku')) and not exists(select 1 from jsonb_array_elements(coalesce(prev.product_lines,'[]')) old where old=ln or (payload->>'entry_kind'='delivery' and old->>'sku'=ln->>'sku' and (old->>'order_qty')::numeric=(ln->>'order_qty')::numeric)) then raise exception 'SKU is not in an active assigned incentive';end if;
 if coalesce(ln->>'sku','')='' or not(coalesce((ln->>'order_qty')::numeric,-1)>=0 and (ln->>'order_qty')::numeric<1000000000 and coalesce((ln->>'delivered_qty')::numeric,-1)>=0 and (ln->>'delivered_qty')::numeric<1000000000) then raise exception 'Invalid product quantity';end if;
 if payload->>'entry_kind'='delivery' and (ln->>'delivered_qty')::numeric>(ln->>'order_qty')::numeric then raise exception 'Delivered cartons cannot exceed ordered cartons';end if;
 if ln ? 'outlets' then
 if jsonb_typeof(ln->'outlets')<>'array' then raise exception 'Invalid incentive outlets';end if;
 if exists(select 1 from jsonb_array_elements(ln->'outlets') p where coalesce((p->>'order_qty')::numeric,-1)<0 or coalesce((p->>'delivered_qty')::numeric,-1)<0 or (p->>'delivered_qty')::numeric>(p->>'order_qty')::numeric) then raise exception 'Invalid outlet incentive cartons';end if;
 if coalesce((select sum((p->>'order_qty')::numeric) from jsonb_array_elements(ln->'outlets')p),0)<>(ln->>'order_qty')::numeric or coalesce((select sum((p->>'delivered_qty')::numeric) from jsonb_array_elements(ln->'outlets')p),0)<>(ln->>'delivered_qty')::numeric then raise exception 'Outlet incentive cartons must equal SKU totals';end if;
 end if;end loop;
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
 update public.ffh_daily_updates set ppr_amount=coalesce((payload->>'ppr_amount')::numeric,prev.ppr_amount,0),active_sales_amount=coalesce((payload->>'active_sales_amount')::numeric,prev.active_sales_amount,0),delivery_completed=coalesce((payload->>'delivery_completed')::boolean,prev.delivery_completed,false) where id=r.id;
 if payload ? 'previous_sales_amount' and payload->>'previous_sales_amount' is not null then perform ffh_private.daily_history(jsonb_build_object('entry_scope',scope,'staff_id',target,'zone_id',z,'sale_date',(d-interval '1 month')::date,'amount',(payload->>'previous_sales_amount')::numeric));end if;
 perform ffh_private.reward_daily_nudges(target,z,false);
 return jsonb_build_object('saved',true,'id',r.id,'version',r.version,'saved_at',r.updated_at);
end$$;
revoke all on function ffh_private.daily_action(text,jsonb) from public,anon;grant execute on function ffh_private.daily_action(text,jsonb) to authenticated;

create or replace function ffh_private.save_sales_baseline(p_staff_id text,p_month text,p_total numeric,p_daily jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); d record;maxday integer;total numeric:=0;
begin
 if sid is null or not public.ffh_staff_view(p_staff_id) or not exists(select 1 from public.ffh_profiles where staff_id=p_staff_id and can_sell and active and login_approved) then raise exception 'Active SR in your permitted scope required' using errcode='42501';end if;
 if sid<>p_staff_id and not public.ffh_staff_edit(p_staff_id,'sales') and not public.ffh_staff_edit(p_staff_id,'income') then raise exception 'Sales or Income edit access required' using errcode='42501';end if;
 if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or p_month>=to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM') or p_total is null or p_total<0 or p_total>99999999999999 or p_daily is null or jsonb_typeof(p_daily)<>'object' then raise exception 'Choose a previous month and a valid nonnegative sales total';end if;
 maxday:=extract(day from (to_date(p_month||'-01','YYYY-MM-DD')+interval '1 month - 1 day'));
 for d in select key,value from jsonb_each(p_daily) loop
  if d.key !~ '^[1-9][0-9]?$' then raise exception 'Invalid day';end if;
  if d.key::integer>maxday or jsonb_typeof(d.value)<>'number' or (d.value::text)::numeric<0 then raise exception 'Invalid daily amount or day';end if;
  total:=total+(d.value::text)::numeric;
 end loop;
 if total>p_total then raise exception 'Daily history exceeds the full monthly total';end if;
 insert into public.ffh_sales_baselines values(p_staff_id,p_month,p_total,p_daily,sid,now()) on conflict(staff_id,month) do update set total_sales=excluded.total_sales,daily_sales=excluded.daily_sales,updated_by=sid,updated_at=now(),daily_only=false;
 return jsonb_build_object('saved',true);
end$$;

commit;
