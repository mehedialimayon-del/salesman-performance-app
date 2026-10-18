begin;
select set_config('request.jwt.claims','{}',true);
insert into public.ffh_profiles(staff_id,full_name,role,zone_id,auth_user_id,active,login_approved,can_manage,can_sell) values('QA_CONTACT_EDITOR','QA Contacts Editor','SR','PRIMARY','00000000-0000-0000-0000-000000007001',true,true,false,true);
insert into public.ffh_access_grants(staff_id,module,can_edit,can_upload,can_delete) values('QA_CONTACT_EDITOR','contacts',true,true,true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007001","role":"authenticated"}',true);
do $$declare n int;begin
 if not ffh_private.asset_upload_allowed('contacts/qa/photo.jpg') then raise exception 'Explicit Contacts upload denied';end if;
 update public.ffh_contacts set version=version+1,contacts=contacts||'[{"id":"qa-contact-permission","name":"QA Temporary Contact","designation":"Post One","designation2":"Post Two","zone":"QA Zone","serial":999}]'::jsonb where id=1;get diagnostics n=row_count;if n<>1 then raise exception 'Explicit Contacts edit denied';end if;
 if not exists(select 1 from public.ffh_contacts c cross join lateral jsonb_array_elements(c.contacts) p where p->>'id'='qa-contact-permission' and p->>'designation2'='Post Two' and p->>'zone'='QA Zone') then raise exception 'Second post/zone not saved';end if;
 if public.ffh_module_edit('kb') then raise exception 'Contacts permission implies AI_BASE';end if;
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.ffh_access_grants set can_edit=true,can_delete=false where staff_id='QA_CONTACT_EDITOR';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007001","role":"authenticated"}',true);
do $$begin
 begin update public.ffh_contacts c set contacts=(select jsonb_agg(case when x->>'id'='qa-contact-permission' then x||jsonb_build_object('deleted_at',now()) else x end) from jsonb_array_elements(c.contacts) x);raise exception 'Edit-only user deleted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.ffh_access_grants set can_edit=false,can_delete=true where staff_id='QA_CONTACT_EDITOR';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007001","role":"authenticated"}',true);
do $$begin
 begin update public.ffh_contacts c set contacts=(select jsonb_agg(case when x->>'id'='qa-contact-permission' then x||'{"name":"Not allowed"}'::jsonb else x end) from jsonb_array_elements(c.contacts) x);raise exception 'Delete-only user edited';exception when insufficient_privilege then null;end;
 update public.ffh_contacts c set contacts=(select jsonb_agg(case when x->>'id'='qa-contact-permission' then x||jsonb_build_object('deleted_at',now()) else x end) from jsonb_array_elements(c.contacts) x);
end$$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.ffh_access_grants set can_edit=false,can_upload=false,can_delete=false where staff_id='QA_CONTACT_EDITOR';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000007001","role":"authenticated"}',true);
do $$declare n int;begin
 if ffh_private.asset_upload_allowed('contacts/qa/photo.jpg') then raise exception 'Revoked photo permission effective';end if;
 update public.ffh_contacts set version=version+1 where id=1;get diagnostics n=row_count;if n<>0 then raise exception 'Revoked Contact edit remains';end if;
end$$;
reset role;
rollback;
select 'PASS explicit Contacts edit/upload, post two and zone persistence, no AI escalation and immediate revoke; all fixtures rolled back' as result;
