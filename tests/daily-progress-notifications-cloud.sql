-- Run after daily-performance-cloud.sql inside one outer rollback transaction.
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare r jsonb;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
r:=public.ffh_reward_campaign('save',jsonb_build_object('title','QA changing progress','start_date',d,'end_date',d,'audience',jsonb_build_object('kind','staff','staff_ids',jsonb_build_array('QA_PERF_S1'),'zone_ids',jsonb_build_array('QA_PERF_A')),'groups','[{"name":"Daily sales","mode":"sales","basis":"delivered","period":"daily","target":10000,"reward":50}]'::jsonb));
perform set_config('qa.progress_offer',r->>'id',true);
end$$;
reset role;
do $$declare prefix text:='reward-progress:'||current_setting('qa.progress_offer')||':';n integer;begin
perform ffh_private.reward_daily_nudges('QA_PERF_S1','QA_PERF_A',false);
select count(*) into n from public.ffh_notification_jobs where source_key like prefix||'%:remaining:9400';
if n<>1 then raise exception 'Initial remaining sales notification missing';end if;
perform public.ffh_daily_sales('save',to_jsonb(u)||jsonb_build_object('submission_id',gen_random_uuid(),'expected_version',u.version,'entry_kind','daily','active_sales_amount',800,'delivered_amount',800)) from public.ffh_daily_updates u where staff_id='QA_PERF_S1';
perform ffh_private.reward_daily_nudges('QA_PERF_S1','QA_PERF_A',false);
perform ffh_private.reward_daily_nudges('QA_PERF_S1','QA_PERF_A',false);
select count(*) into n from public.ffh_notification_jobs where source_key like prefix||'%:remaining:9200';
if n<>1 then raise exception 'Changed gap must notify once, found %',n;end if;
end$$;
