begin;
create or replace function ffh_private.personal_basic(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); target text:=payload->>'staff_id'; m text:=payload->>'month'; amount numeric:=(payload->>'basic')::numeric;
begin
 if auth.uid() is null or sid is null or target is null then raise exception 'Approved active login required' using errcode='42501';end if;
 if target<>sid and not(ffh_private.allowed('income_salary','edit') and ffh_private.income_visible(target)) then raise exception 'Own basic or authorized salary edit only' using errcode='42501';end if;
 if m !~ '^\d{4}-(0[1-9]|1[0-2])$' or m is null or amount is null or amount<0 or amount>1000000 then raise exception 'Valid month and Basic RM required';end if;
 insert into public.ffh_income_settings(staff_id,month,actual_target,planning_target,basic,fuel,house_rent,sku_targets,manager_rule,updated_by)
 values(target,m,50000,50000,amount,0,0,'[]','{"basicInclusive":true}',sid)
 on conflict(staff_id,month) do update set basic=excluded.basic,manager_rule=public.ffh_income_settings.manager_rule||'{"basicInclusive":true}'::jsonb,updated_by=sid,updated_at=now();
 return jsonb_build_object('ok',true);
end $$;
revoke all on function ffh_private.personal_basic(jsonb) from public,anon;
grant execute on function ffh_private.personal_basic(jsonb) to authenticated;
create or replace function public.ffh_personal_basic(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select ffh_private.personal_basic(payload)$$;
revoke all on function public.ffh_personal_basic(jsonb) from public,anon;
grant execute on function public.ffh_personal_basic(jsonb) to authenticated;
commit;
