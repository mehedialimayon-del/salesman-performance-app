begin;
-- Private implementation retains sender-only mutation, participant-only reads via existing RLS.
create or replace function ffh_private.live_location(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); m public.ffh_live_messages%rowtype; loc jsonb; until_at timestamptz;
begin
 if auth.uid() is null or sid is null then raise exception 'Approved active login required' using errcode='42501';end if;
 select * into m from public.ffh_live_messages where id=(payload->>'id')::uuid for update;
 if not found or m.sender_staff_id<>sid or m.unsent_at is not null or m.hidden_sender then raise exception 'Sender access required' using errcode='42501';end if;
 loc:=m.location_context;
 if loc is null or loc='null'::jsonb then raise exception 'Send a location first';end if;
 if action='start' then
 if loc ? 'live_until' or m.created_at<now()-interval '1 minute' then raise exception 'Send a new location to start sharing';end if;
 loc:=loc||jsonb_build_object('live_until',now()+interval '15 minutes','captured_at',now());
 elsif action='update' then
 until_at:=(loc->>'live_until')::timestamptz;
 if until_at is null or until_at<=now() or loc ? 'stopped_at' then raise exception 'Live sharing ended';end if;
 if not coalesce((payload->>'latitude')::numeric between -90 and 90,false) or not coalesce((payload->>'longitude')::numeric between -180 and 180,false) or not coalesce((payload->>'accuracy')::numeric between 0 and 100,false) then raise exception 'Accurate GPS required';end if;
 if (loc->>'captured_at')::timestamptz>now()-interval '10 seconds' then return jsonb_build_object('id',m.id,'throttled',true);end if;
 loc:=loc||jsonb_build_object('latitude',(payload->>'latitude')::numeric,'longitude',(payload->>'longitude')::numeric,'accuracy',(payload->>'accuracy')::numeric,'captured_at',now());
 elsif action='stop' then
 if not(loc ? 'live_until') then raise exception 'No live sharing';end if;
 loc:=loc||jsonb_build_object('stopped_at',now());
 else raise exception 'Unknown live location action';end if;
 update public.ffh_live_messages set location_context=loc where id=m.id;
 return jsonb_build_object('id',m.id,'ok',true);
end $$;
revoke all on function ffh_private.live_location(text,jsonb) from public,anon;
grant execute on function ffh_private.live_location(text,jsonb) to authenticated;
create or replace function public.ffh_live_location(action text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.live_location(action,payload)$$;
revoke all on function public.ffh_live_location(text,jsonb) from public,anon;
grant execute on function public.ffh_live_location(text,jsonb) to authenticated;
commit;
