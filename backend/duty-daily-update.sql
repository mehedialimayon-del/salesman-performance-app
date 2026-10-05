begin;
alter table public.ffh_attendance add column if not exists daily_home_enabled boolean not null default true;
alter table public.ffh_attendance add column if not exists daily_home_residence boolean not null default false;
alter table public.ffh_attendance add column if not exists home_set_by text;
create or replace function ffh_private.duty_action(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); a public.ffh_attendance%rowtype; lat float8; lon float8; acc float8; ts timestamptz; result jsonb; h public.ffh_home_locations%rowtype; st public.ffh_home_visit_state%rowtype; distance_m float8; point_id bigint; recipient text; mid uuid; body_text text; hours integer;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved active login required' using errcode='42501'; end if;
 if action='state' then
 select to_jsonb(t) into result from public.ffh_attendance t where staff_id=sid and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date;
 return jsonb_build_object('attendance',result,'settings',(select to_jsonb(s) from public.ffh_duty_settings s where id=1),'can_track',public.ffh_owner() or (exists(select 1 from public.ffh_duty_settings where id=1 and tracking_shared) and exists(select 1 from public.ffh_tracking_grants where viewer_staff_id=sid)),'home',null);
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
 elsif action='daily_home' then
 select * into a from public.ffh_attendance where id=(payload->>'attendance_id')::uuid;
 if not found or not (public.ffh_owner() or (ffh_private.tracking_view(a.staff_id) and exists(select 1 from public.ffh_profiles where staff_id=sid and can_manage))) then raise exception 'Assigned manager access required' using errcode='42501';end if;
 update public.ffh_attendance set daily_home_enabled=coalesce((payload->>'enabled')::boolean,true),daily_home_residence=coalesce((payload->>'residence')::boolean,false),home_set_by=sid where id=a.id;
 delete from public.ffh_home_visit_state where attendance_id=a.id;
 return jsonb_build_object('ok',true);
 elsif action='checkin' or action='point' then
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
 insert into public.ffh_attendance(staff_id,shift_end,latitude,longitude,accuracy_m,photo_path,consent_version,tracking_mode) values(sid,least(now()+make_interval(hours=>hours),(((now() at time zone 'Asia/Kuala_Lumpur')::date+1)::timestamp at time zone 'Asia/Kuala_Lumpur')),lat,lon,acc,nullif(payload->>'photo_path',''),'duty-location-v1',payload->>'tracking_mode') on conflict(staff_id,duty_date) do nothing;
 select * into a from public.ffh_attendance where staff_id=sid and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date;
 return to_jsonb(a);
 else
 select * into a from public.ffh_attendance where id=(payload->>'attendance_id')::uuid and staff_id=sid;
 if not found or a.check_out is not null or now()>=a.shift_end or a.duty_date<>(now() at time zone 'Asia/Kuala_Lumpur')::date or ts<a.check_in-interval '30 seconds' or ts>a.shift_end or ts<now()-interval '12 hours' then raise exception 'Duty session inactive or location outside duty hours' using errcode='42501';end if;
 insert into public.ffh_location_points(attendance_id,staff_id,latitude,longitude,accuracy_m,speed_mps,captured_at,source) values(a.id,sid,lat,lon,acc,greatest(0,(payload->>'speed_mps')::float8),ts,case when payload->>'source'='android' then 'android' else 'web' end) on conflict(attendance_id,captured_at) do nothing returning id into point_id;
 if point_id is null then return jsonb_build_object('ok',true,'duplicate',true);end if;
 -- Home is explicitly confirmed. No attendance location is inferred to be home.
 h.latitude:=a.latitude;h.longitude:=a.longitude;h.radius_m:=150;
 if a.daily_home_enabled and acc<=50 then
 insert into public.ffh_home_visit_state(attendance_id) values(a.id) on conflict do nothing;
 select * into st from public.ffh_home_visit_state where attendance_id=a.id for update;
 if st.last_captured_at is null or ts>st.last_captured_at then
 distance_m:=6371000*acos(greatest(-1,least(1,sin(radians(lat))*sin(radians(h.latitude))+cos(radians(lat))*cos(radians(h.latitude))*cos(radians(lon-h.longitude)))));
 if distance_m-acc>h.radius_m+50 then st.has_left:=true;st.inside_since:=null;
 elsif distance_m+acc<h.radius_m and st.has_left then
 if st.inside_since is null or st.last_captured_at<ts-interval '3 minutes' then st.inside_since:=ts; end if;
 if ts-st.inside_since>=interval '2 minutes' and (st.last_alert_at is null or ts-st.last_alert_at>interval '30 minutes') and ts>now()-interval '3 minutes' then
 insert into public.ffh_notification_jobs(recipient,type,title,body,scheduled_at,status,created_by,source_key)
 select p.staff_id,'tracking',case when a.daily_home_residence then 'SR near manager-marked home area' else 'SR near daily attendance area' end,sid||' returned near today''s attendance starting area during duty. This is an estimated GPS area; ask for context.',now(),'scheduled',sid,'home:'||a.id||':'||p.staff_id||':'||floor(extract(epoch from ts)/1800)
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

commit;
