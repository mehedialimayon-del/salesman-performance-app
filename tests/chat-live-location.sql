begin;
-- Execute inside one transaction with backend/chat-actions.sql; all fixtures roll back.
insert into public.ffh_zones(id,name) values('QA_CHAT','QA chat');
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved) select 'QA_CHAT_'||i,'QA chat '||i,'SR','QA_CHAT',('00000000-0000-0000-0000-'||lpad((9850+i)::text,12,'0'))::uuid,false,true,true,true from generate_series(1,3)i;
insert into storage.objects(bucket_id,name,metadata) values('ffh-chat-images','QA_CHAT_1/QA_CHAT_2/plan.pdf','{"mimetype":"application/pdf","size":400}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009851","role":"authenticated"}',true);set local role authenticated;
do $$declare mid uuid:=gen_random_uuid();begin
perform set_config('qa.live_id',mid::text,true);
perform public.ffh_chat('send',jsonb_build_object('id',mid,'recipient','QA_CHAT_2','body','QA live location','location_context','{"latitude":3.13,"longitude":101.68}'::jsonb));
perform public.ffh_live_location('start',jsonb_build_object('id',mid));
if not exists(select 1 from public.ffh_live_messages where id=mid and location_context ? 'live_until') then raise exception 'Live start failed';end if;
begin perform public.ffh_live_location('start',jsonb_build_object('id',mid));raise exception 'Restart extended expiry';exception when others then if sqlerrm='Restart extended expiry' then raise;end if;end;
end$$;
reset role;
update public.ffh_live_messages set location_context=jsonb_set(location_context,'{captured_at}',to_jsonb(now()-interval '20 seconds')) where id=current_setting('qa.live_id')::uuid;
set local role authenticated;
do $$declare mid uuid:=current_setting('qa.live_id')::uuid;begin
perform public.ffh_live_location('update',jsonb_build_object('id',mid,'latitude',3.15,'longitude',101.7,'accuracy',10));
if not exists(select 1 from public.ffh_live_messages where id=mid and (location_context->>'latitude')::numeric=3.15) then raise exception 'Update failed';end if;
begin perform public.ffh_live_location('update',jsonb_build_object('id',mid,'latitude',200,'longitude',101.7,'accuracy',10));raise exception 'Invalid point accepted';exception when others then if sqlerrm='Invalid point accepted' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009852","role":"authenticated"}',true);set local role authenticated;
do $$begin
if not exists(select 1 from public.ffh_live_messages where id=current_setting('qa.live_id')::uuid) then raise exception 'Recipient cannot see location';end if;
begin perform public.ffh_live_location('stop',jsonb_build_object('id',current_setting('qa.live_id')));raise exception 'Recipient changed sender location';exception when insufficient_privilege then null;end;
end$$;reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009853","role":"authenticated"}',true);set local role authenticated;
do $$begin if exists(select 1 from public.ffh_live_messages where id=current_setting('qa.live_id')::uuid) then raise exception 'Location leaked to outsider';end if;end$$;reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009851","role":"authenticated"}',true);set local role authenticated;
do $$declare mid uuid:=current_setting('qa.live_id')::uuid;begin
perform public.ffh_live_location('stop',jsonb_build_object('id',mid));
begin perform public.ffh_live_location('update',jsonb_build_object('id',mid,'latitude',3.2,'longitude',101.7,'accuracy',10));raise exception 'Update after stop accepted';exception when others then if sqlerrm='Update after stop accepted' then raise;end if;end;
end$$;
reset role;
rollback;
