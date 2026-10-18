begin;
CREATE OR REPLACE FUNCTION ffh_private.earnings_action(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid text:=public.ffh_my_staff_id();target text;mid uuid;row public.ffh_income_entries%rowtype;reason_text text;can_approve boolean;d date;g jsonb;startd date;endd date;settings jsonb;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 can_approve:=public.ffh_owner() or exists(select 1 from public.ffh_income_approvers where staff_id=sid);
 if action='state' then
 return jsonb_build_object('can_approve',can_approve,'settings',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_income_settings x where public.ffh_staff_view(staff_id)),'[]'::jsonb),'offers',coalesce((select jsonb_agg(to_jsonb(x)) from public.ffh_reward_offers x where assigned_to='ALL' or public.ffh_staff_view(assigned_to)),'[]'::jsonb),'entries',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc) from public.ffh_income_entries x where public.ffh_staff_view(x.staff_id)),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.ffh_income_events x where exists(select 1 from public.ffh_income_entries e where e.id=x.entry_id and public.ffh_staff_view(e.staff_id))),'[]'::jsonb),'approvers',coalesce((select jsonb_agg(staff_id) from public.ffh_income_approvers),'[]'::jsonb));
 elsif action='grant' then
 if not public.ffh_owner() then raise exception 'Owner alone grants approval access' using errcode='42501';end if;
 target:=payload->>'staff_id';if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid staff';end if;
 if (payload->>'enabled')::boolean then insert into public.ffh_income_approvers values(target,sid,now()) on conflict(staff_id) do nothing;else delete from public.ffh_income_approvers where staff_id=target;end if;
 return jsonb_build_object('ok',true);
 elsif action='settings' then
 target:=payload->>'staff_id';if not public.ffh_staff_edit(target,'income') then raise exception 'Income edit access required' using errcode='42501';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(payload->'sku_targets','[]')) x where coalesce(x->>'sku','')='' or coalesce((x->>'target')::numeric,0)<=0) then raise exception 'Invalid SKU target';end if;
 insert into public.ffh_income_settings(staff_id,month,actual_target,planning_target,basic,fuel,house_rent,sku_targets,manager_rule,updated_by)
 values(target,payload->>'month',(payload->>'actual_target')::numeric,(payload->>'planning_target')::numeric,coalesce((payload->>'basic')::numeric,0),coalesce((payload->>'fuel')::numeric,0),coalesce((payload->>'house_rent')::numeric,0),coalesce(payload->'sku_targets','[]'),coalesce(payload->'manager_rule','{}'),sid)
 on conflict(staff_id,month) do update set actual_target=excluded.actual_target,planning_target=excluded.planning_target,basic=excluded.basic,fuel=excluded.fuel,house_rent=excluded.house_rent,sku_targets=excluded.sku_targets,manager_rule=excluded.manager_rule,updated_by=sid,updated_at=now();
 return jsonb_build_object('ok',true);
 elsif action='offer' then
 if not public.ffh_module_edit('income') then raise exception 'Offer publisher access required' using errcode='42501';end if;
 target:=coalesce(payload->>'assigned_to','ALL');if target<>'ALL' and not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid recipient';end if;
 if target='ALL' and not public.ffh_owner() then raise exception 'Use scoped company offer publishing';end if;if target<>'ALL' and not public.ffh_staff_view(target) then raise exception 'Recipient outside permitted zones';end if;
 startd:=(payload->>'start_date')::date;endd:=(payload->>'end_date')::date;
 if endd<startd or endd<(now() at time zone 'Asia/Kuala_Lumpur')::date or length(trim(coalesce(payload->>'title','')))=0 or jsonb_typeof(payload->'groups')<>'array' or jsonb_array_length(payload->'groups')=0 then raise exception 'Invalid offer dates or groups';end if;
 for g in select value from jsonb_array_elements(payload->'groups') loop
 if coalesce(g->>'basis','delivered') not in ('delivered','order') or coalesce(g->>'period','window') not in ('daily','window') then raise exception 'Invalid sales basis or reward period';end if;
 if coalesce(g->>'mode','') not in ('sales','single','combo','orders','outlets') or coalesce((g->>'target')::numeric,0)<=0 or coalesce((g->>'reward')::numeric,0)<=0 or (g->>'mode'='single' and jsonb_array_length(g->'skus')<>1) or (g->>'mode'='combo' and jsonb_array_length(g->'skus')<2) then raise exception 'Invalid offer rule';end if;
 end loop;
 insert into public.ffh_reward_offers(title,assigned_to,start_date,end_date,groups,poster_url,created_by) values(payload->>'title',target,startd,endd,payload->'groups',nullif(payload->>'poster_url',''),sid) returning id into mid;
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'incentive','New incentive · '||(payload->>'title'),'Offer active '||startd||' to '||endd,now(),'scheduled',sid,'offer:'||mid||':'||p.staff_id from public.ffh_profiles p where active and login_approved and (target='ALL' or staff_id=target);
 return jsonb_build_object('id',mid);
 elsif action='propose' then
 target:=payload->>'staff_id';reason_text:=trim(payload->>'reason');d:=coalesce(nullif(payload->>'entry_date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date);
 if not public.ffh_staff_view(target) then raise exception 'Recipient outside permitted zones';end if;
 if not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) or d>(now() at time zone 'Asia/Kuala_Lumpur')::date or reason_text is null then raise exception 'Invalid staff, date or reason';end if;
 if (select count(*) from public.ffh_income_entries where created_by=sid and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many requests; retry later';end if;
 insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by) values(target,d,payload->>'kind',(payload->>'amount')::numeric,reason_text,sid) returning * into row;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,'Proposed',sid,reason_text);
 elsif action in ('approve','reject','reverse') then
 select * into row from public.ffh_income_entries where id=(payload->>'id')::uuid for update;
 if not found or not public.ffh_staff_view(row.staff_id) then raise exception 'Entry not found in your scope';end if;
 reason_text:=trim(payload->>'reason');if reason_text is null or length(reason_text) not between 1 and 2000 then raise exception 'Reason is required';end if;
 if action='reverse' then
 if row.created_by<>sid then raise exception 'Only the issuer may refund/withdraw' using errcode='42501';end if;
 if row.status not in ('Pending','Approved') then raise exception 'Entry already closed';end if;
 update public.ffh_income_entries set status='Reversed',reversed_by=sid,reversed_at=now(),reversal_reason=reason_text where id=row.id returning * into row;
 else
 if not can_approve then raise exception 'Owner or delegated approver required' using errcode='42501';end if;
 if row.status<>'Pending' then raise exception 'Entry already reviewed';end if;
 update public.ffh_income_entries set status=case when action='approve' then 'Approved' else 'Rejected' end,approved_by=sid,approved_at=now() where id=row.id returning * into row;
 end if;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(row.id,initcap(action),sid,reason_text);
 else raise exception 'Unknown earnings action';end if;
 -- Everyone sees notices/adjustment history; affected staff + approvers get push.
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select distinct p.staff_id,'notice',row.kind||' · '||row.status,row.staff_id||' · RM '||row.amount||' · '||coalesce(reason_text,row.reason),now(),'scheduled',sid,'income:'||row.id||':'||row.status||':'||p.staff_id
 from public.ffh_profiles p where p.active and p.login_approved and (p.staff_id in (row.staff_id,row.created_by,'M21954') or exists(select 1 from public.ffh_income_approvers a where a.staff_id=p.staff_id) or (p.can_manage and (p.zone_id=(select zone_id from public.ffh_profiles where staff_id=row.staff_id) or exists(select 1 from public.ffh_zone_access za where za.staff_id=p.staff_id and za.zone_id in ('*',(select zone_id from public.ffh_profiles where staff_id=row.staff_id)))))) on conflict(source_key) where source_key is not null do nothing;
 return to_jsonb(row);
end $function$;

create or replace function ffh_private.scoped_earnings(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p record;ids jsonb:='[]';r jsonb;begin
 if auth.uid() is null or sid is null then raise exception 'Active login required';end if;
 if action='offer' and payload->>'assigned_to'='ALL' and not public.ffh_owner() then
 if not public.ffh_module_edit('income') then raise exception 'Income edit permission required';end if;
 for p in select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id) loop
 r:=ffh_private.earnings_action(action,jsonb_set(payload,'{assigned_to}',to_jsonb(p.staff_id)));ids:=ids||jsonb_build_array(r);end loop;return ids;
 end if;return ffh_private.earnings_action(action,payload);end$$;
revoke all on function ffh_private.scoped_earnings(text,jsonb) from public,anon;grant execute on function ffh_private.scoped_earnings(text,jsonb) to authenticated;
create or replace function public.ffh_earnings(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.scoped_earnings(action,payload)$$;
commit;
