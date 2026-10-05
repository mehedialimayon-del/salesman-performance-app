begin;
create schema if not exists ffh_private;
revoke all on schema ffh_private from public,anon;
grant usage on schema ffh_private to authenticated;
create table public.ffh_duty_settings(id integer primary key check(id=1),attendance_required boolean not null default true,tracking_shared boolean not null default false,shift_hours integer not null default 12 check(shift_hours between 1 and 16),updated_at timestamptz not null default now());
insert into public.ffh_duty_settings(id) values(1);
create table public.ffh_tracking_grants(viewer_staff_id text primary key references public.ffh_profiles(staff_id),target_staff_ids text[] not null default '{}',granted_by text not null,updated_at timestamptz not null default now());
create table public.ffh_attendance(id uuid primary key default gen_random_uuid(),staff_id text not null references public.ffh_profiles(staff_id),duty_date date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,check_in timestamptz not null default now(),check_out timestamptz,shift_end timestamptz not null,latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),accuracy_m double precision not null check(accuracy_m between 0 and 100),photo_path text,consent_version text not null,tracking_mode text not null check(tracking_mode in ('web','android')),unique(staff_id,duty_date));
create table public.ffh_home_locations(staff_id text primary key references public.ffh_profiles(staff_id),latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),radius_m integer not null default 150 check(radius_m between 100 and 500),confirmed_at timestamptz not null default now());
create table public.ffh_location_points(id bigint generated always as identity primary key,attendance_id uuid not null references public.ffh_attendance(id),staff_id text not null references public.ffh_profiles(staff_id),latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),accuracy_m double precision not null check(accuracy_m between 0 and 100),speed_mps double precision,captured_at timestamptz not null,received_at timestamptz not null default now(),source text not null check(source in ('web','android')),unique(attendance_id,captured_at));
create index ffh_location_staff_time on public.ffh_location_points(staff_id,captured_at desc);
create index ffh_location_attendance_time on public.ffh_location_points(attendance_id,captured_at);
create table public.ffh_home_visit_state(attendance_id uuid primary key references public.ffh_attendance(id),has_left boolean not null default false,inside_since timestamptz,last_alert_at timestamptz,last_captured_at timestamptz);
create table public.ffh_live_messages(id uuid primary key default gen_random_uuid(),sender_staff_id text not null references public.ffh_profiles(staff_id),recipient_staff_id text not null references public.ffh_profiles(staff_id),body text not null check(length(trim(body)) between 1 and 1800),location_context jsonb,created_at timestamptz not null default now(),read_at timestamptz,check(sender_staff_id<>recipient_staff_id));
create index ffh_messages_recipient_created on public.ffh_live_messages(recipient_staff_id,created_at desc);
create index ffh_messages_sender_created on public.ffh_live_messages(sender_staff_id,created_at desc);
create or replace function ffh_private.tracking_view(target text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.ffh_my_staff_id() is not null and (public.ffh_owner() or (exists(select 1 from public.ffh_duty_settings where id=1 and tracking_shared) and exists(select 1 from public.ffh_tracking_grants where viewer_staff_id=public.ffh_my_staff_id() and target=any(target_staff_ids))));
$$;
revoke all on function ffh_private.tracking_view(text) from public,anon;
grant execute on function ffh_private.tracking_view(text) to authenticated;
-- Private SECURITY DEFINER RPC implementation is needed for atomic server time,
-- immutable sender identity and notification queue writes, not to bypass a failed policy.
create function ffh_private.duty_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); a public.ffh_attendance%rowtype; lat float8; lon float8; acc float8; ts timestamptz; result jsonb; h public.ffh_home_locations%rowtype; st public.ffh_home_visit_state%rowtype; distance_m float8; point_id bigint; recipient text; mid uuid; body_text text; hours integer;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved active login required' using errcode='42501'; end if;
 if action='state' then
 select to_jsonb(t) into result from public.ffh_attendance t where staff_id=sid and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date;
 return jsonb_build_object('attendance',result,'settings',(select to_jsonb(s) from public.ffh_duty_settings s where id=1),'can_track',public.ffh_owner() or (exists(select 1 from public.ffh_duty_settings where id=1 and tracking_shared) and exists(select 1 from public.ffh_tracking_grants where viewer_staff_id=sid)),'home',(select to_jsonb(x) from public.ffh_home_locations x where staff_id=sid));
 elsif action='directory' then
 return coalesce((select jsonb_agg(jsonb_build_object('staff_id',staff_id,'full_name',full_name,'role',role,'can_manage',can_manage)) from public.ffh_profiles where active and login_approved),'[]'::jsonb);
 elsif action='access' then
 if not public.ffh_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 update public.ffh_duty_settings set tracking_shared=coalesce((payload->>'shared')::boolean,false),updated_at=now() where id=1;
 if payload ? 'viewer' then
 recipient:=payload->>'viewer';
 if not exists(select 1 from public.ffh_profiles where staff_id=recipient and active and login_approved) then raise exception 'Invalid viewer'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(payload->'targets','[]'::jsonb)) t where not exists(select 1 from public.ffh_profiles p where p.staff_id=t and active)) then raise exception 'Invalid target';end if;
 insert into public.ffh_tracking_grants(viewer_staff_id,target_staff_ids,granted_by) values(recipient,array(select jsonb_array_elements_text(coalesce(payload->'targets','[]'::jsonb))),sid) on conflict(viewer_staff_id) do update set target_staff_ids=excluded.target_staff_ids,granted_by=sid,updated_at=now();
 end if;
 return jsonb_build_object('ok',true);
 elsif action='home' or action='checkin' or action='point' then
 lat:=(payload->>'latitude')::float8;lon:=(payload->>'longitude')::float8;acc:=(payload->>'accuracy_m')::float8;ts:=(payload->>'captured_at')::timestamptz;
 if lat is null or lon is null or acc is null or ts is null or not(lat between -90 and 90) or not(lon between -180 and 180) or not(acc between 0 and 100) or coalesce((payload->>'mocked')::boolean,false) then raise exception 'Valid non-mock GPS fix required';end if;
 if ts>now()+interval '30 seconds' then raise exception 'Invalid location time';end if;
 if action<>'point' and ts<now()-interval '2 minutes' then raise exception 'Get a fresh GPS fix';end if;
 if action='home' then
 insert into public.ffh_home_locations(staff_id,latitude,longitude,radius_m) values(sid,lat,lon,150) on conflict(staff_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,confirmed_at=now();
 return jsonb_build_object('ok',true);
 elsif action='checkin' then
 if payload->>'consent_version' is distinct from 'duty-location-v1' then raise exception 'Accept work-hours tracking disclosure';end if;
 if coalesce(payload->>'tracking_mode','') not in ('web','android') then raise exception 'Invalid tracking mode';end if;
 if nullif(payload->>'photo_path','') is not null and (split_part(payload->>'photo_path','/',1)<>sid or not exists(select 1 from storage.objects where bucket_id='ffh-attendance' and name=payload->>'photo_path')) then raise exception 'Invalid attendance photo';end if;
 select shift_hours into hours from public.ffh_duty_settings where id=1;
 insert into public.ffh_attendance(staff_id,shift_end,latitude,longitude,accuracy_m,photo_path,consent_version,tracking_mode) values(sid,now()+make_interval(hours=>hours),lat,lon,acc,nullif(payload->>'photo_path',''),'duty-location-v1',payload->>'tracking_mode') on conflict(staff_id,duty_date) do nothing;
 select * into a from public.ffh_attendance where staff_id=sid and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date;
 return to_jsonb(a);
 else
 select * into a from public.ffh_attendance where id=(payload->>'attendance_id')::uuid and staff_id=sid;
 if not found or a.check_out is not null or now()>=a.shift_end or ts<a.check_in-interval '30 seconds' or ts>a.shift_end or ts<now()-interval '12 hours' then raise exception 'Duty session inactive or location outside duty hours' using errcode='42501';end if;
 insert into public.ffh_location_points(attendance_id,staff_id,latitude,longitude,accuracy_m,speed_mps,captured_at,source) values(a.id,sid,lat,lon,acc,greatest(0,(payload->>'speed_mps')::float8),ts,case when payload->>'source'='android' then 'android' else 'web' end) on conflict(attendance_id,captured_at) do nothing returning id into point_id;
 if point_id is null then return jsonb_build_object('ok',true,'duplicate',true);end if;
 -- Home is explicitly confirmed. No attendance location is inferred to be home.
 select * into h from public.ffh_home_locations where staff_id=sid;
 if found and acc<=50 then
 insert into public.ffh_home_visit_state(attendance_id) values(a.id) on conflict do nothing;
 select * into st from public.ffh_home_visit_state where attendance_id=a.id for update;
 if st.last_captured_at is null or ts>st.last_captured_at then
 distance_m:=6371000*acos(greatest(-1,least(1,sin(radians(lat))*sin(radians(h.latitude))+cos(radians(lat))*cos(radians(h.latitude))*cos(radians(lon-h.longitude)))));
 if distance_m-acc>h.radius_m+50 then st.has_left:=true;st.inside_since:=null;
 elsif distance_m+acc<h.radius_m and st.has_left then
 if st.inside_since is null or st.last_captured_at<ts-interval '3 minutes' then st.inside_since:=ts; end if;
 if ts-st.inside_since>=interval '2 minutes' and (st.last_alert_at is null or ts-st.last_alert_at>interval '30 minutes') and ts>now()-interval '3 minutes' then
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'tracking','SR near confirmed home area',sid||' is near the confirmed home area during duty. Check GPS accuracy and ask for context.',now(),'scheduled',sid,'home:'||a.id||':'||p.staff_id||':'||floor(extract(epoch from ts)/1800)
 from public.ffh_profiles p where p.active and (p.staff_id='M21954' or (exists(select 1 from public.ffh_duty_settings where id=1 and tracking_shared) and exists(select 1 from public.ffh_tracking_grants g where g.viewer_staff_id=p.staff_id and sid=any(g.target_staff_ids)))) on conflict (source_key) where source_key is not null do nothing;
 st.last_alert_at:=ts;
 end if;
 else st.inside_since:=null;
 end if;
 update public.ffh_home_visit_state set has_left=st.has_left,inside_since=st.inside_since,last_alert_at=st.last_alert_at,last_captured_at=ts where attendance_id=a.id;
 end if;end if;
 return jsonb_build_object('ok',true);
 end if;
 elsif action='checkout' then
 update public.ffh_attendance set check_out=now() where staff_id=sid and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date and check_out is null returning * into a;
 return to_jsonb(a);
 elsif action='message' then
 recipient:=payload->>'recipient';body_text:=trim(payload->>'body');mid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 if recipient=sid or body_text is null or length(body_text) not between 1 and 1800 or not exists(select 1 from public.ffh_profiles where staff_id=recipient and active and login_approved) then raise exception 'Choose active recipient and write a message';end if;
 if (select count(*) from public.ffh_live_messages where sender_staff_id=sid and created_at>now()-interval '1 minute')>=30 then raise exception 'Please wait before sending more messages';end if;
 insert into public.ffh_live_messages(id,sender_staff_id,recipient_staff_id,body,location_context) values(mid,sid,recipient,body_text,payload->'location_context') on conflict(id) do nothing;
 if not exists(select 1 from public.ffh_live_messages where id=mid and sender_staff_id=sid and recipient_staff_id=recipient and body=body_text) then raise exception 'Message ID conflict';end if;
 return jsonb_build_object('id',mid);
 elsif action='read' then
 update public.ffh_live_messages set read_at=now() where recipient_staff_id=sid and sender_staff_id=payload->>'peer' and read_at is null;
 return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown action';
end $$;
revoke all on function ffh_private.duty_action(text,jsonb) from public,anon;
grant execute on function ffh_private.duty_action(text,jsonb) to authenticated;
create function public.ffh_duty(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.duty_action(action,payload)$$;
revoke all on function public.ffh_duty(text,jsonb) from public,anon;
grant execute on function public.ffh_duty(text,jsonb) to authenticated;
create function ffh_private.message_notify() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key) values(new.recipient_staff_id,'message',(select full_name from public.ffh_profiles where staff_id=new.sender_staff_id)||' · Live Communication',new.body,now(),'scheduled',new.sender_staff_id,'message:'||new.id) on conflict(source_key) where source_key is not null do nothing;
 return new;
end $$;
revoke all on function ffh_private.message_notify() from public,anon,authenticated;
create trigger ffh_live_message_notify after insert on public.ffh_live_messages for each row execute function ffh_private.message_notify();
-- Only RPCs may mutate attendance, locations, messages and grants.
do $$declare t text;begin foreach t in array array['ffh_duty_settings','ffh_tracking_grants','ffh_attendance','ffh_home_locations','ffh_location_points','ffh_home_visit_state','ffh_live_messages'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end$$;
grant select on public.ffh_duty_settings,public.ffh_tracking_grants,public.ffh_attendance,public.ffh_home_locations,public.ffh_location_points,public.ffh_live_messages to authenticated;
create policy duty_settings_read on public.ffh_duty_settings for select to authenticated using(public.ffh_my_staff_id() is not null);
create policy tracking_grants_read on public.ffh_tracking_grants for select to authenticated using(public.ffh_owner() or viewer_staff_id=public.ffh_my_staff_id());
create policy attendance_read on public.ffh_attendance for select to authenticated using(staff_id=public.ffh_my_staff_id() or ffh_private.tracking_view(staff_id));
create policy home_read on public.ffh_home_locations for select to authenticated using(staff_id=public.ffh_my_staff_id() or ffh_private.tracking_view(staff_id));
create policy location_read on public.ffh_location_points for select to authenticated using(ffh_private.tracking_view(staff_id));
create policy message_read on public.ffh_live_messages for select to authenticated using(public.ffh_my_staff_id() in(sender_staff_id,recipient_staff_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ffh-attendance','ffh-attendance',false,250000,array['image/jpeg']) on conflict(id) do nothing;
create policy attendance_photo_insert on storage.objects for insert to authenticated with check(bucket_id='ffh-attendance' and (storage.foldername(name))[1]=public.ffh_my_staff_id());
create policy attendance_photo_read on storage.objects for select to authenticated using(bucket_id='ffh-attendance' and ((storage.foldername(name))[1]=public.ffh_my_staff_id() or ffh_private.tracking_view((storage.foldername(name))[1])));
do $$declare t text;begin foreach t in array array['ffh_attendance','ffh_location_points','ffh_live_messages','ffh_tracking_grants','ffh_duty_settings'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;
-- Fixed retention for raw route points; photos have separate storage retention.
select cron.schedule('ffh-location-retention','10 19 * * *',$$delete from public.ffh_location_points where captured_at<now()-interval '30 days'$$);
create or replace function ffh_private.require_daily_attendance() returns trigger language plpgsql security definer set search_path='' as $$ begin if auth.uid() is not null and not exists(select 1 from public.ffh_attendance where staff_id=public.ffh_my_staff_id() and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date) then raise exception 'Daily attendance required before work updates' using errcode='42501'; end if; return new; end $$;
revoke all on function ffh_private.require_daily_attendance() from public,anon,authenticated;
create trigger ffh_sales_attendance before insert or update on public.ffh_sales for each row execute function ffh_private.require_daily_attendance();
create trigger ffh_routes_attendance before insert or update on public.ffh_routes for each row execute function ffh_private.require_daily_attendance();
create trigger ffh_execution_attendance before insert or update on public.ffh_campaign_executions for each row execute function ffh_private.require_daily_attendance();
create policy home_visit_internal_only on public.ffh_home_visit_state for select to authenticated using(false);
commit;
