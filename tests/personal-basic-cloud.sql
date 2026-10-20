begin;
-- Execute inside one transaction with backend/chat-actions.sql; all fixtures roll back.
insert into public.ffh_zones(id,name) values('QA_CHAT','QA chat');
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved) select 'QA_CHAT_'||i,'QA chat '||i,'SR','QA_CHAT',('00000000-0000-0000-0000-'||lpad((9850+i)::text,12,'0'))::uuid,false,true,true,true from generate_series(1,3)i;
insert into storage.objects(bucket_id,name,metadata) values('ffh-chat-images','QA_CHAT_1/QA_CHAT_2/plan.pdf','{"mimetype":"application/pdf","size":400}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009851","role":"authenticated"}',true);set local role authenticated;
select public.ffh_personal_basic('{"staff_id":"QA_CHAT_1","month":"2026-10","basic":2500}');
do $$begin
if not exists(select 1 from public.ffh_income_settings where staff_id='QA_CHAT_1' and month='2026-10' and basic=2500 and manager_rule->>'basicInclusive'='true') then raise exception 'Basic not saved';end if;
begin perform public.ffh_personal_basic('{"staff_id":"QA_CHAT_2","month":"2026-10","basic":9999}');raise exception 'Foreign basic changed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.ffh_income_settings set manager_rule=manager_rule||'{"salesCommissionRate":0.25,"growthCommissionRate":70,"groups":[{"name":"Protected"}]}',actual_target=50000 where staff_id='QA_CHAT_1' and month='2026-10';
set local role authenticated;
select public.ffh_personal_basic('{"staff_id":"QA_CHAT_1","month":"2026-10","basic":2700}');
do $$begin
if not exists(select 1 from public.ffh_income_settings where staff_id='QA_CHAT_1' and month='2026-10' and basic=2700 and actual_target=50000 and (manager_rule->>'salesCommissionRate')::numeric=.25 and manager_rule->'groups'='[{"name":"Protected"}]'::jsonb) then raise exception 'Commission or target overwritten';end if;
end$$;reset role;rollback;
