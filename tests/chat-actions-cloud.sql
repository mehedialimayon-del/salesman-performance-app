-- Execute inside one transaction with backend/chat-actions.sql; all fixtures roll back.
insert into public.ffh_zones(id,name) values('QA_CHAT','QA chat');
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,can_manage,can_sell,active,login_approved) select 'QA_CHAT_'||i,'QA chat '||i,'SR','QA_CHAT',('00000000-0000-0000-0000-'||lpad((9850+i)::text,12,'0'))::uuid,false,true,true,true from generate_series(1,3)i;
insert into storage.objects(bucket_id,name,metadata) values('ffh-chat-images','QA_CHAT_1/QA_CHAT_2/plan.pdf','{"mimetype":"application/pdf","size":400}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009851","role":"authenticated"}',true);set local role authenticated;
do $$declare mid uuid:=gen_random_uuid();r jsonb;begin
perform set_config('qa.chat_id',mid::text,true);
r:=public.ffh_chat('send',jsonb_build_object('id',mid,'recipient','QA_CHAT_2','body','Buyer plan','media_path','QA_CHAT_1/QA_CHAT_2/plan.pdf','media_type','file','media_name','Plan.pdf','contact_card','{"name":"Buyer","phone":"+60123456789"}'::jsonb,'location_context','{"latitude":3.139,"longitude":101.68}'::jsonb));
if not exists(select 1 from public.ffh_live_messages where id=mid and media_type='file' and contact_card->>'name'='Buyer') then raise exception 'Document/contact not saved';end if;
perform public.ffh_chat('edit',jsonb_build_object('id',mid,'body','Updated buyer plan'));
if not exists(select 1 from public.ffh_live_messages where id=mid and body='Updated buyer plan' and edited_at is not null) then raise exception 'Edit missing';end if;
begin perform public.ffh_chat('send',jsonb_build_object('recipient','QA_CHAT_3','body','Wrong target','media_path','QA_CHAT_1/QA_CHAT_2/plan.pdf','media_type','file'));raise exception 'Foreign recipient accepted';exception when insufficient_privilege then null;end;
begin perform public.ffh_chat('send','{"recipient":"QA_CHAT_2","body":"Invalid contact","contact_card":{"phone":"+6012345"}}');raise exception 'Missing contact name accepted';exception when others then if sqlerrm='Missing contact name accepted' then raise;end if;end;
end$$;reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009852","role":"authenticated"}',true);set local role authenticated;
do $$declare mid uuid:=current_setting('qa.chat_id')::uuid;begin
if not exists(select 1 from public.ffh_live_messages where id=mid and body='Updated buyer plan') then raise exception 'Recipient did not get edit';end if;
begin perform public.ffh_chat('edit',jsonb_build_object('id',mid,'body','Not mine'));raise exception 'Recipient edited sender message';exception when insufficient_privilege then null;end;
begin perform public.ffh_chat('unsend',jsonb_build_object('id',mid));raise exception 'Recipient unsent sender message';exception when insufficient_privilege then null;end;
perform public.ffh_chat('hide',jsonb_build_object('id',mid));
if exists(select 1 from public.ffh_live_messages where id=mid) then raise exception 'Delete-for-me remains visible';end if;
if exists(select 1 from storage.objects where bucket_id='ffh-chat-images' and name='QA_CHAT_1/QA_CHAT_2/plan.pdf') then raise exception 'Hidden attachment still readable';end if;
end$$;reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009853","role":"authenticated"}',true);set local role authenticated;
do $$begin if exists(select 1 from public.ffh_live_messages where id=current_setting('qa.chat_id')::uuid) then raise exception 'Private message leaked';end if;begin perform public.ffh_chat('hide',jsonb_build_object('id',current_setting('qa.chat_id')));raise exception 'Outsider altered message';exception when insufficient_privilege then null;end;end$$;reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000009851","role":"authenticated"}',true);set local role authenticated;
do $$declare mid uuid:=current_setting('qa.chat_id')::uuid;begin
if not exists(select 1 from public.ffh_live_messages where id=mid) then raise exception 'Recipient hide removed sender copy';end if;
perform public.ffh_chat('unsend',jsonb_build_object('id',mid));
if not exists(select 1 from public.ffh_live_messages where id=mid and unsent_at is not null and media_path is null and contact_card is null and location_context is null) then raise exception 'Unsend did not clear content';end if;
if exists(select 1 from storage.objects where bucket_id='ffh-chat-images' and name='QA_CHAT_1/QA_CHAT_2/plan.pdf') then raise exception 'Unsent attachment still readable';end if;
end$$;reset role;
do $$begin if exists(select 1 from public.ffh_notification_jobs where source_key='message:'||current_setting('qa.chat_id') and status='scheduled') then raise exception 'Unsend left a scheduled push';end if;end$$;
select set_config('request.jwt.claims','{}',true);set local role anon;
do $$begin begin perform public.ffh_chat('send','{}');raise exception 'Anonymous chat access allowed';exception when insufficient_privilege then null;end;end$$;reset role;
