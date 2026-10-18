begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if not (public.ffh_governance('state')->>'owner')::boolean then raise exception 'Owner state unavailable';end if;
 perform public.ffh_governance('history',jsonb_build_object('month',to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM')));
 perform public.ffh_governance('trash','{}');
end$$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from public.ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if (public.ffh_governance('state')->>'owner')::boolean then raise exception 'SR owner escalation';end if;
 if (select count(*) from public.ffh_contacts)<>1 then raise exception 'SR contacts unavailable';end if;
 begin perform public.ffh_governance('history','{"month":"2026-10"}');raise exception 'SR global history leaked';exception when insufficient_privilege then null;end;
 begin perform public.ffh_governance('trash','{}');raise exception 'SR global trash leaked';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'PASS real owner/SR management state, Contacts and private history/trash' as result;
rollback;
