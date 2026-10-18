-- Real database RLS checks; every test write is rolled back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare n integer;begin
 update ffh_contacts set contacts='[{"id":"qa-contact","name":"QA rollback only","serial":1}]',version=version+1 where id=1;
 get diagnostics n=row_count;if n<>1 then raise exception 'Owner contact save failed';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from ffh_profiles where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare n integer;begin
 if (select contacts->0->>'name' from ffh_contacts where id=1)<>'QA rollback only' then raise exception 'SR cannot read company contacts';end if;
 update ffh_contacts set contacts='[]' where id=1;get diagnostics n=row_count;
 if n<>0 then raise exception 'SR unexpectedly modified contacts';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS owner Contacts save and SR company-wide read/write-denial; zone grant coverage is in company-governance.sql' as result;
rollback;
