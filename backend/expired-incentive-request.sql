create unique index ffh_income_one_expired_reward_request on public.ffh_income_entries(legacy_id)
 where legacy_id like 'expired-reward:%';

create function ffh_private.request_expired_incentive(offer_id uuid, rule_index integer, request_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor text:=public.ffh_my_staff_id(); offer public.ffh_reward_offers; rule jsonb;
 today date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;
 clean_reason text:=trim(coalesce(request_reason,'')); reward numeric; target numeric;
 entry_id uuid; entry_reason text; dedup text;
begin
 if actor is null then raise exception 'Login required' using errcode='42501';end if;
 select * into offer from public.ffh_reward_offers where id=offer_id;
 if not found or not ffh_private.reward_recipient(offer.audience,offer.assigned_to,actor) then
  raise exception 'Incentive campaign is outside your assignment' using errcode='42501';
 end if;
 if not offer.active or today<=offer.end_date then raise exception 'This campaign has not expired';end if;
 if rule_index is null or rule_index<0 or rule_index>=jsonb_array_length(offer.groups) then raise exception 'Select a campaign rule';end if;
 rule:=offer.groups->rule_index;
 if coalesce(rule->>'period','window')<>'window' or rule->>'payout'='per-carton' then
  raise exception 'Only fixed date-range rewards are available for this request';
 end if;
 if char_length(clean_reason) not between 1 and 1000 then raise exception 'Enter a reason (1–1000 characters)';end if;
 reward:=(rule->>'reward')::numeric;
 target:=(rule->>'target')::numeric;
 if reward is null or target is null or reward<=0 or target<=0 then raise exception 'Campaign reward or target is missing';end if;
 if ffh_private.reward_measure(offer,rule,actor,false)>=target then raise exception 'This rule already qualifies for the campaign reward';end if;
 dedup:='expired-reward:'||offer.id::text||':'||rule_index||':'||actor;
 entry_reason:=left('Expired campaign: '||offer.title||' / '||coalesce(rule->>'name','Rule')||' · Ended '||offer.end_date||' · '||clean_reason,2000);
 insert into public.ffh_income_entries(staff_id,entry_date,kind,amount,reason,created_by,legacy_id)
  values(actor,today,'Incentive',reward,entry_reason,actor,dedup)
  on conflict(legacy_id) where legacy_id like 'expired-reward:%' do nothing returning id into entry_id;
 if entry_id is null then raise exception 'A request already exists for this campaign rule';end if;
 insert into public.ffh_income_events(entry_id,action,actor,reason) values(entry_id,'Proposed',actor,entry_reason);
 return entry_id;
end $$;
revoke all on function ffh_private.request_expired_incentive(uuid,integer,text) from public,anon;
grant execute on function ffh_private.request_expired_incentive(uuid,integer,text) to authenticated;

create function public.ffh_request_expired_incentive(offer_id uuid,rule_index integer,request_reason text)
returns uuid language sql security invoker set search_path='' as $$
 select ffh_private.request_expired_incentive(offer_id,rule_index,request_reason)
$$;
revoke all on function public.ffh_request_expired_incentive(uuid,integer,text) from public,anon;
grant execute on function public.ffh_request_expired_incentive(uuid,integer,text) to authenticated;
