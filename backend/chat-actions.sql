begin;
alter table public.ffh_live_messages add column if not exists edited_at timestamptz;
alter table public.ffh_live_messages add column if not exists unsent_at timestamptz;
alter table public.ffh_live_messages add column if not exists hidden_sender boolean not null default false;
alter table public.ffh_live_messages add column if not exists hidden_recipient boolean not null default false;
alter table public.ffh_live_messages add column if not exists contact_card jsonb;
alter table public.ffh_live_messages drop constraint if exists ffh_live_messages_media_type_check;
alter table public.ffh_live_messages add constraint ffh_live_messages_media_type_check check(media_type in ('photo','video','audio','file'));
update storage.buckets set allowed_mime_types= array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/3gpp','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/3gpp','application/pdf','text/plain','text/csv','text/vcard','application/zip','application/x-zip-compressed','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'] where id='ffh-chat-images';
drop policy if exists message_read on public.ffh_live_messages;
create policy message_read on public.ffh_live_messages for select to authenticated using((public.ffh_my_staff_id()=sender_staff_id and not hidden_sender) or (public.ffh_my_staff_id()=recipient_staff_id and not hidden_recipient));
create or replace function ffh_private.chat_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); mid uuid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid()); m public.ffh_live_messages%rowtype; recipient text:=payload->>'recipient'; txt text:=trim(payload->>'body'); path text:=nullif(payload->>'media_path',''); kind text:=nullif(payload->>'media_type',''); card jsonb:=payload->'contact_card'; loc jsonb:=payload->'location_context'; mime text; bytes bigint;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved active login required' using errcode='42501';end if;
 if action='send' then
 if recipient=sid or not exists(select 1 from public.ffh_profiles where staff_id=recipient and active and login_approved) then raise exception 'Choose an active recipient' using errcode='42501';end if;
 if txt is null or length(txt) not between 1 and 1800 then raise exception 'Message must contain 1–1800 characters';end if;
 if path is not null then
 select metadata->>'mimetype',coalesce((metadata->>'size')::bigint,0) into mime,bytes from storage.objects where bucket_id='ffh-chat-images' and name=path and (storage.foldername(name))[1]=sid and (storage.foldername(name))[2]=recipient;
 if mime is null or bytes<=0 or bytes>(case kind when 'audio' then 10485760 when 'video' then 18874368 else 26214400 end) or not coalesce(case kind when 'photo' then mime in ('image/jpeg','image/png','image/webp') when 'video' then mime in ('video/mp4','video/webm','video/3gpp') when 'audio' then mime like 'audio/%' when 'file' then mime in ('application/pdf','text/plain','text/csv','text/vcard','application/zip','application/x-zip-compressed','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation') else false end,false) then raise exception 'Upload a supported attachment for this recipient first' using errcode='42501';end if;
 elsif kind is not null then raise exception 'Attachment missing';end if;
 if card is not null and card<>'null'::jsonb then
 if jsonb_typeof(card)<>'object' or not coalesce(length(trim(card->>'name')) between 1 and 120,false) or not coalesce((card->>'phone') ~ '^\+?[0-9 ()-]{5,30}$',false) then raise exception 'Contact name and phone number required';end if;
 card:=jsonb_build_object('name',trim(card->>'name'),'phone',card->>'phone');else card:=null;end if;
 if loc is not null and loc<>'null'::jsonb then
 if jsonb_typeof(loc)<>'object' or not coalesce((loc->>'latitude')::numeric between -90 and 90,false) or not coalesce((loc->>'longitude')::numeric between -180 and 180,false) then raise exception 'Valid current location required';end if;
 loc:=jsonb_build_object('latitude',(loc->>'latitude')::numeric,'longitude',(loc->>'longitude')::numeric,'accuracy',loc->'accuracy','captured_at',now());else loc:=null;end if;
 select * into m from public.ffh_live_messages where id=mid;
 if found then if m.sender_staff_id=sid and m.recipient_staff_id=recipient and m.body=txt and m.media_path is not distinct from path and m.unsent_at is null then return jsonb_build_object('id',mid,'duplicate',true);else raise exception 'Message ID conflict';end if;end if;
 if(select count(*) from public.ffh_live_messages where sender_staff_id=sid and created_at>now()-interval '1 minute')>=30 then raise exception 'Please wait before sending more messages';end if;
 insert into public.ffh_live_messages(id,sender_staff_id,recipient_staff_id,body,media_path,media_type,media_name,location_context,contact_card) values(mid,sid,recipient,txt,path,kind,left(payload->>'media_name',200),loc,card);
 return jsonb_build_object('id',mid);
 end if;
 select * into m from public.ffh_live_messages where id=mid for update;
 if not found or sid not in(m.sender_staff_id,m.recipient_staff_id) then raise exception 'Message access denied' using errcode='42501';end if;
 if action='hide' then
 if m.sender_staff_id=sid then update public.ffh_live_messages set hidden_sender=true where id=mid;else update public.ffh_live_messages set hidden_recipient=true where id=mid;end if;
 elsif action in ('edit','unsend') then
 if sid<>m.sender_staff_id or m.unsent_at is not null then raise exception 'Only the sender can change a sent message' using errcode='42501';end if;
 if action='edit' then
 if txt is null or length(txt) not between 1 and 1800 then raise exception 'Message must contain 1–1800 characters';end if;
 update public.ffh_live_messages set body=txt,edited_at=now() where id=mid;
 update public.ffh_notification_jobs set body=txt where source_key='message:'||mid and status='scheduled';
 else
 update public.ffh_live_messages set body='This message was unsent',media_path=null,photo_path=null,media_type=null,media_name=null,contact_card=null,location_context=null,unsent_at=now() where id=mid;
 update public.ffh_notification_jobs set status='cancelled' where source_key='message:'||mid and status='scheduled';
 end if;
 else raise exception 'Unknown chat action';end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function ffh_private.chat_action(text,jsonb) from public,anon;
grant execute on function ffh_private.chat_action(text,jsonb) to authenticated;
create or replace function public.ffh_chat(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.chat_action(action,payload)$$;
revoke all on function public.ffh_chat(text,jsonb) from public,anon;
grant execute on function public.ffh_chat(text,jsonb) to authenticated;
commit;
