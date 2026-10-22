-- Exercise real policies using disposable rows and roll back every test.
begin;
create temp table qa_buyer_auth as select staff_id,auth_user_id from public.ffh_profiles where staff_id in ('M21954','M22075','M22268','WAHID_ADMIN');
grant select on qa_buyer_auth to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from qa_buyer_auth where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
insert into public.ffh_buyer_contacts(sr_id,is_new,category,outlet_name,name,designation,whatsapp,notes) values('M22075',true,'buyer','QA ROLLBACK SHOP','QA ROLLBACK BUYER','Buyer supervisor','60123456789','QA rollback marker');
insert into public.ffh_buyer_contacts(sr_id,outlet_id,is_new,category,outlet_name,name,designation,whatsapp,notes) select 'M22075',id,false,'staff','ignored by trigger','QA ROLLBACK STAFF','Night staff','60123456789','QA rollback marker' from public.ffh_outlets where sr_id='M22075' and active limit 1;
do $$begin
 if (select count(*) from public.ffh_buyer_contacts where notes='QA rollback marker')<>2 then raise exception 'Own route CRUD failed';end if;
 begin
  insert into public.ffh_buyer_contacts(sr_id,is_new,category,outlet_name,name,designation,whatsapp) values('M22268',true,'buyer','Unauthorized','QA','Buyer','60123456789');
  raise exception 'Cross-route insert was allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.ffh_buyer_contacts set sr_id='M22268' where notes='QA rollback marker' and is_new;
  raise exception 'Cross-route reassignment was allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from qa_buyer_auth where staff_id='M22268'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare n int;begin
 if exists(select 1 from public.ffh_buyer_contacts where notes='QA rollback marker') then raise exception 'Other SR can read private contacts';end if;
 update public.ffh_buyer_contacts set name='Intrusion' where notes='QA rollback marker';get diagnostics n=row_count;if n<>0 then raise exception 'Other SR can update contacts';end if;
 delete from public.ffh_buyer_contacts where notes='QA rollback marker';get diagnostics n=row_count;if n<>0 then raise exception 'Other SR can delete contacts';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from qa_buyer_auth where staff_id='M21954'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin if (select count(*) from public.ffh_buyer_contacts where notes='QA rollback marker')<>2 then raise exception 'Owner cannot see all routes';end if;end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from qa_buyer_auth where staff_id='WAHID_ADMIN'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin if (select count(*) from public.ffh_buyer_contacts where notes='QA rollback marker')<>2 then raise exception 'Manager cannot see permitted routes';end if;end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id from qa_buyer_auth where staff_id='M22075'),'role','authenticated')::text,true);
set local role authenticated;
update public.ffh_buyer_contacts set location='Updated manual address',notes='QA rollback updated' where notes='QA rollback marker';
do $$begin if (select count(*) from public.ffh_buyer_contacts where notes='QA rollback updated')<>2 then raise exception 'Own route edit failed';end if;end $$;
delete from public.ffh_buyer_contacts where notes='QA rollback updated';
reset role;
select 'PASS private SR CRUD, cross-route read/write/reassignment denial, owner and permitted manager access' as result;
rollback;
