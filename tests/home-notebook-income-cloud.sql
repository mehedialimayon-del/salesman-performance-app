-- Execute after the migration in a single transaction, then roll back.
do $$begin
 perform set_config('ffh.test.owner',(select auth_user_id::text from public.ffh_profiles where staff_id='M21954'),true);
 perform set_config('ffh.test.sr',(select auth_user_id::text from public.ffh_profiles where staff_id='M22075'),true);
 perform set_config('ffh.test.manager',(select auth_user_id::text from public.ffh_profiles where staff_id='WAHID_ADMIN'),true);
end$$;
set local role authenticated;
do $$declare rowid uuid;denied boolean:=false;r jsonb;begin
 perform set_config('request.jwt.claim.sub',current_setting('ffh.test.owner'),true);
 insert into public.ffh_home_messages(message,start_date,end_date,text_color) values('TEST বাংলা English',(now() at time zone 'Asia/Kuala_Lumpur')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date,'#ff8a24') returning id into rowid;
 perform set_config('ffh.test.ticker',rowid::text,true);
 perform public.ffh_earnings('settings',jsonb_build_object('staff_id','M21954','month','2099-01','actual_target',0,'planning_target',0,'basic',3210,'fuel',0,'house_rent',0,'manager_rule',jsonb_build_object('commissionMode','tiers','commission',jsonb_build_object('lowerLimit',80,'upperLimit',100,'lowerRate',0.1,'middleRate',0.25,'upperRate',0.5))));
 perform set_config('request.jwt.claim.sub',current_setting('ffh.test.sr'),true);
 if not exists(select 1 from public.ffh_home_messages where id=rowid) then raise exception 'SR cannot read global ticker';end if;
 begin insert into public.ffh_home_messages(message,start_date,end_date) values('DENIED',current_date,current_date);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'SR was able to publish ticker';end if;
 update public.ffh_home_messages set message='DENIED' where id=rowid;
 if found then raise exception 'SR was able to edit ticker';end if;
 delete from public.ffh_home_messages where id=rowid;
 if found then raise exception 'SR was able to delete ticker';end if;
 insert into public.ffh_private_notebook(owner_staff_id,note_date,folder,title,notes) values('M22075',current_date,'Private tests','Private note','Only SR sees this') returning id into rowid;
 perform set_config('ffh.test.note',rowid::text,true);
 if exists(select 1 from public.ffh_income_settings where staff_id='M21954') then raise exception 'SR can read manager salary';end if;
 r:=public.ffh_earnings('state','{}');if exists(select 1 from jsonb_array_elements(r->'settings') x where x->>'staff_id'<>'M22075') then raise exception 'SR earnings RPC leaks private salary';end if;
 perform set_config('request.jwt.claim.sub',current_setting('ffh.test.manager'),true);
 if exists(select 1 from public.ffh_private_notebook where id=rowid) then raise exception 'Manager can read another person notebook';end if;
 if exists(select 1 from public.ffh_income_settings where staff_id='M21954' and month='2099-01') then raise exception 'Manager sees owner salary';end if;
 r:=public.ffh_earnings('state','{}');if exists(select 1 from jsonb_array_elements(r->'settings') x where x->>'staff_id'='M21954') then raise exception 'Manager RPC sees owner salary';end if;
 denied:=false;begin insert into public.ffh_home_messages(message,start_date,end_date) values('DENIED',current_date,current_date);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Delegated administrator can publish owner-only ticker';end if;
 perform set_config('request.jwt.claim.sub',current_setting('ffh.test.owner'),true);
 if exists(select 1 from public.ffh_private_notebook where id=rowid) then raise exception 'Owner can read another person private notebook';end if;
 if not exists(select 1 from public.ffh_home_messages where id=current_setting('ffh.test.ticker')::uuid and message='TEST বাংলা English') then raise exception 'Denied edits changed ticker';end if;
end$$;
reset role;
insert into public.ffh_access_grants(staff_id,module,can_edit,can_upload,can_delete) values
('WAHID_ADMIN','income_salary',true,false,false),('WAHID_ADMIN','income_targets',true,false,false),('WAHID_ADMIN','income_commission',false,false,false)
on conflict(staff_id,module) do update set can_edit=excluded.can_edit,can_upload=false,can_delete=false;
set local role authenticated;
do $$declare denied boolean:=false;begin
 perform set_config('request.jwt.claim.sub',current_setting('ffh.test.manager'),true);
 begin perform public.ffh_earnings('settings',jsonb_build_object('staff_id','WAHID_ADMIN','month','2099-02','actual_target',0,'planning_target',0,'basic',123,'fuel',0,'house_rent',0,'manager_rule',jsonb_build_object('commissionMode','tiers','commission',jsonb_build_object('lowerLimit',80,'upperLimit',100,'lowerRate',0.1,'middleRate',0.25,'upperRate',0.5))));exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Salary-only permission changed commission';end if;
 perform public.ffh_earnings('settings',jsonb_build_object('staff_id','WAHID_ADMIN','month','2099-02','actual_target',0,'planning_target',0,'basic',123,'fuel',0,'house_rent',0,'manager_rule','{}'::jsonb));
 if not exists(select 1 from public.ffh_income_settings where staff_id='WAHID_ADMIN' and month='2099-02' and basic=123) then raise exception 'Granted salary edit failed';end if;
end$$;
reset role;
select 'PASS owner-only ticker, SR/global visibility, notebook privacy including owner, salary RLS and RPC privacy, custom monthly commission storage' as result;
