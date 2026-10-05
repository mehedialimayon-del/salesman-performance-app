begin;
create or replace function ffh_private.work_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();request_uuid uuid;entry jsonb;data jsonb;kind text;target text;result jsonb:='[]';one jsonb;mid uuid;campaign_id text;campaign jsonb;campaigns jsonb;old public.ffh_catalogue_products%rowtype;startd date;endd date;key text;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved login required' using errcode='42501';end if;
 if action='access' then return jsonb_build_object('owner',public.ffh_owner(),'actions',case when public.ffh_owner() then '["notice","penalty","incentive","cpo","catalogue","task","target"]'::jsonb else coalesce((select to_jsonb(actions) from public.ffh_ai_work_grants where staff_id=sid),'[]'::jsonb) end,'grants',case when public.ffh_owner() then coalesce((select jsonb_agg(to_jsonb(g)) from public.ffh_ai_work_grants g),'[]'::jsonb) else '[]'::jsonb end);
 elsif action='grant' then
 if not public.ffh_owner() then raise exception 'Owner alone grants AI Work access' using errcode='42501';end if;
 target:=payload->>'staff_id';if target='M21954' or not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid recipient';end if;
 if exists(select 1 from jsonb_array_elements_text(payload->'actions') x where x not in ('notice','penalty','incentive','cpo','catalogue','task','target')) then raise exception 'Invalid module permission';end if;
 insert into public.ffh_ai_work_grants(staff_id,actions,granted_by) values(target,array(select jsonb_array_elements_text(payload->'actions')),sid) on conflict(staff_id) do update set actions=excluded.actions,granted_by=sid,updated_at=now();return '{"ok":true}';
 elsif action='context' then
 if not exists(select 1 from public.ffh_ai_work_grants where staff_id=sid and cardinality(actions)>0) and not public.ffh_owner() then raise exception 'AI Work is disabled' using errcode='42501';end if;
 return jsonb_build_object('staff',coalesce((select jsonb_agg(jsonb_build_object('id',staff_id,'name',full_name,'role',role)) from public.ffh_profiles where active and login_approved),'[]'::jsonb),'catalogue',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',item_code,'name',name,'unit_price',piece_price,'carton_price',carton_price)) from public.ffh_catalogue_products where active),'[]'::jsonb),'today',(now() at time zone 'Asia/Kuala_Lumpur')::date,'allowed',(ffh_private.work_action('access','{}'))->'actions');
 elsif action<>'execute' then raise exception 'Unknown AI Work action';end if;
 request_uuid:=(payload->>'request_id')::uuid;if request_uuid is null then raise exception 'Request ID required';end if;perform pg_advisory_xact_lock(hashtextextended(request_uuid::text,0));
 if exists(select 1 from public.ffh_ai_work_runs where ffh_ai_work_runs.id=request_uuid) then if not exists(select 1 from public.ffh_ai_work_runs where ffh_ai_work_runs.id=request_uuid and actor=sid) then raise exception 'Request belongs to another staff' using errcode='42501';end if;return (select ffh_ai_work_runs.result from public.ffh_ai_work_runs where ffh_ai_work_runs.id=request_uuid);end if;
 if jsonb_typeof(payload->'actions')<>'array' or jsonb_array_length(payload->'actions') not between 1 and 20 then raise exception 'One to twenty supported actions required';end if;
 for entry in select value from jsonb_array_elements(payload->'actions') loop
 kind:=entry->>'kind';data:=entry->'data';if not ffh_private.work_allowed(kind) then raise exception 'AI Work permission denied: %',kind using errcode='42501';end if;
 if jsonb_typeof(data)<>'object' then raise exception 'Action data required';end if;
 target:=coalesce(nullif(data->>'staff_id',''),'ALL');if target<>'ALL' and not exists(select 1 from public.ffh_profiles where staff_id=target and active and login_approved) then raise exception 'Invalid/ambiguous staff identity';end if;
 if kind='notice' then
 if length(trim(coalesce(data->>'title',''))) not between 1 and 200 or length(trim(coalesce(data->>'body',''))) not between 1 and 10000 then raise exception 'Notice title/message required';end if;
 insert into public.ffh_briefings(kind,title,description,recipients,created_by,starts_at,cover_url) values('notice',data->>'title',data->>'body',array[target],sid,nullif(data->>'starts_at','')::timestamptz,nullif(data->>'image_url','')) returning ffh_briefings.id into mid;one:=jsonb_build_object('kind',kind,'id',mid,'status','Published');
 elsif kind in ('penalty','incentive') then
 if target='ALL' then raise exception 'Choose an individual staff for an adjustment';end if;
 one:=ffh_private.earnings_action('propose',jsonb_build_object('staff_id',target,'kind',case when kind='penalty' then 'Penalty' else 'Incentive' end,'amount',data->'amount','reason',data->>'reason','entry_date',coalesce(nullif(data->>'entry_date',''),((now() at time zone 'Asia/Kuala_Lumpur')::date)::text)));one:=jsonb_build_object('kind',kind,'id',one->>'id','status','Pending approval');
 elsif kind='task' then
 if length(trim(coalesce(data->>'title','')))=0 then raise exception 'Task title required';end if;
 campaign_id:='AI-'||gen_random_uuid();insert into public.ffh_tasks(id,title,description,assigned_to,given_by,given_by_id,due_date,created_date,status,proof_mode,remind_at) values(campaign_id,data->>'title',coalesce(data->>'body',''),target,(select full_name from public.ffh_profiles where staff_id=sid),sid,nullif(data->>'due_date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date,'Open',coalesce(nullif(data->>'proof_mode',''),'none'),nullif(data->>'remind_at','')::timestamptz);one:=jsonb_build_object('kind',kind,'id',campaign_id,'status','Assigned');
 elsif kind='cpo' then
 startd:=(data->>'start_date')::date;endd:=(data->>'end_date')::date;if startd is null or endd is null or endd<startd or endd<(now() at time zone 'Asia/Kuala_Lumpur')::date or length(trim(coalesce(data->>'title','')))=0 then raise exception 'Valid title/start/end date required';end if;
 if coalesce(data->>'campaign_type','CPO') not in ('CPO','Promotion') then raise exception 'Invalid campaign type';end if;
 if coalesce(data->>'execution_mode','proof') not in ('proof','view') then raise exception 'Invalid execution mode';end if;
 campaign_id:='AI-CP-'||gen_random_uuid();campaign:=jsonb_build_object('id',campaign_id,'title',data->>'title','type',coalesce(data->>'campaign_type','CPO'),'startDate',startd,'endDate',endd,'sr',target,'category','ALL','product','','productMode','single','productSkus','[]'::jsonb,'outletCodes','[]'::jsonb,'details',coalesce(data->>'body',''),'image',coalesce(data->>'image_url',''),'executionMode',coalesce(data->>'execution_mode','proof'),'active',true,'proofMode','both');
 select sc.payload into campaigns from public.ffh_shared_content sc where content_key='cpo_campaigns' for update;campaigns:=coalesce(campaigns,'[]')||jsonb_build_array(campaign);
 insert into public.ffh_campaigns(id,title,campaign_type,execution_mode,assigned_to,outlet_category,product,poster_url,start_date,end_date) values(campaign_id,data->>'title',campaign->>'type',campaign->>'executionMode',target,'ALL','',campaign->>'image',startd,endd);
 insert into public.ffh_shared_content(content_key,payload,updated_by) values('cpo_campaigns',campaigns,sid) on conflict(content_key) do update set payload=excluded.payload,updated_by=sid,updated_at=now();
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key) select staff_id,'cpo',data->>'title',coalesce(data->>'body',''),'scheduled',sid,'ai-cpo:'||campaign_id||':'||staff_id from public.ffh_profiles where active and login_approved and (target='ALL' or staff_id=target);one:=jsonb_build_object('kind',kind,'id',campaign_id,'status','Published');
 elsif kind='catalogue' then
 select * into old from public.ffh_catalogue_products where ffh_catalogue_products.id=data->>'product_id' and active for update;if not found then raise exception 'Select an exact existing product';end if;
 if jsonb_typeof(data->'changes')<>'object' or data->'changes'='{}'::jsonb then raise exception 'Catalogue changes required';end if;
 for key in select jsonb_object_keys(data->'changes') loop if key not in ('piece_price','carton_price','name','pack','description','description_bn','origin','origin_bn','process','process_bn','talking_points','talking_points_bn','pitch','pitch_bn','image_url') then raise exception 'Unsupported catalogue field: %',key;end if;if key in ('piece_price','carton_price') and (data->'changes'->>key)::numeric<0 then raise exception 'Price cannot be negative';end if;end loop;
 update public.ffh_catalogue_products set piece_price=coalesce((data->'changes'->>'piece_price')::numeric,old.piece_price),carton_price=coalesce((data->'changes'->>'carton_price')::numeric,old.carton_price),name=coalesce(nullif(data->'changes'->>'name',''),old.name),pack=coalesce(data->'changes'->>'pack',old.pack),description=coalesce(data->'changes'->>'description',old.description),description_bn=coalesce(data->'changes'->>'description_bn',old.description_bn),origin=coalesce(data->'changes'->>'origin',old.origin),origin_bn=coalesce(data->'changes'->>'origin_bn',old.origin_bn),process=coalesce(data->'changes'->>'process',old.process),process_bn=coalesce(data->'changes'->>'process_bn',old.process_bn),talking_points=coalesce(data->'changes'->>'talking_points',old.talking_points),talking_points_bn=coalesce(data->'changes'->>'talking_points_bn',old.talking_points_bn),pitch=coalesce(data->'changes'->>'pitch',old.pitch),pitch_bn=coalesce(data->'changes'->>'pitch_bn',old.pitch_bn),image_url=coalesce(data->'changes'->>'image_url',old.image_url),updated_at=now() where ffh_catalogue_products.id=old.id;one:=jsonb_build_object('kind',kind,'id',old.id,'status','Updated');
 elsif kind='target' then
 if target='ALL' then raise exception 'Choose an exact staff for target setup';end if;
 if not public.ffh_owner() and not public.ffh_staff_edit(target,'income') then raise exception 'Income edit access also required' using errcode='42501';end if;
 if data ? 'actual_target' and (data->>'actual_target')::numeric<50000 then raise exception 'Actual target minimum RM50000';end if;
 if data ? 'planning_target' and (data->>'planning_target')::numeric<0 then raise exception 'Planning target cannot be negative';end if;
 insert into public.ffh_income_settings(staff_id,month,actual_target,planning_target,updated_by) values(target,data->>'month',coalesce((data->>'actual_target')::numeric,50000),coalesce((data->>'planning_target')::numeric,50000),sid) on conflict(staff_id,month) do update set actual_target=coalesce((data->>'actual_target')::numeric,ffh_income_settings.actual_target),planning_target=coalesce((data->>'planning_target')::numeric,ffh_income_settings.planning_target),updated_by=sid,updated_at=now();one:=jsonb_build_object('kind',kind,'id',target,'status','Saved');
 else raise exception 'Unsupported action';end if;
 result:=result||jsonb_build_array(one);
 end loop;
 insert into public.ffh_ai_work_runs(id,actor,summary,actions,result) values(request_uuid,sid,left(coalesce(payload->>'summary',''),2000),payload->'actions',result);return result;
end$$;
revoke all on function ffh_private.work_action(text,jsonb) from public,anon;grant execute on function ffh_private.work_action(text,jsonb) to authenticated;
create function public.ffh_ai_work(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.work_action(action,payload)$$;
revoke all on function public.ffh_ai_work(text,jsonb) from public,anon;grant execute on function public.ffh_ai_work(text,jsonb) to authenticated;
commit;
