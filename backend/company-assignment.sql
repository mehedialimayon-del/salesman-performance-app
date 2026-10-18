begin;
create or replace function ffh_private.assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p text;begin
 if auth.uid() is null then return new;end if;
 if TG_TABLE_NAME='ffh_briefings' then
 if not public.ffh_module_edit('briefings') then raise exception 'Notice / meeting edit permission required';end if;
 if 'ALL'=any(new.recipients) and not public.ffh_owner() then
  new.recipients:=array(select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id));
 end if;
 foreach p in array new.recipients loop if p<>'ALL' and not public.ffh_staff_view(p) then raise exception 'Recipient outside permitted zones';end if;end loop;
 elsif TG_TABLE_NAME='ffh_notification_jobs' then
 if new.created_by<>sid then raise exception 'Notification sender mismatch';end if;
 if new.recipient='ALL' and not public.ffh_owner() then raise exception 'Expand the permitted recipients before sending';end if;
 if new.recipient<>'ALL' and not public.ffh_staff_view(new.recipient) then raise exception 'Recipient outside permitted zones';end if;
 end if;return new;end$$;
create trigger ffh_briefing_assignment_guard before insert or update on public.ffh_briefings for each row execute function ffh_private.assignment_guard();
create policy ffh_scoped_notification_create on public.ffh_notification_jobs for insert to authenticated with check(created_by=public.ffh_my_staff_id() and status='scheduled' and recipient<>'ALL' and public.ffh_staff_view(recipient) and (public.ffh_module_edit('notifications') or public.ffh_module_edit('tasks') or public.ffh_module_edit('income')));
revoke all on function ffh_private.assignment_guard() from public,anon,authenticated;
create policy ffh_briefing_scope on public.ffh_briefings as restrictive for select to authenticated using(public.ffh_owner() or 'ALL'=any(recipients) or public.ffh_my_staff_id()=any(recipients) or exists(select 1 from unnest(recipients) p where public.ffh_staff_view(p)));
create policy ffh_proposal_delegated_create on public.ffh_proposals for insert to authenticated with check(public.ffh_module_edit('proposals'));
create policy ffh_proposal_delegated_update on public.ffh_proposals for update to authenticated using(public.ffh_module_edit('proposals')) with check(public.ffh_module_edit('proposals'));
create policy ffh_proposal_delegated_delete on public.ffh_proposals for delete to authenticated using(ffh_private.allowed('proposals','delete'));
create or replace function ffh_private.asset_upload_allowed(object_name text) returns boolean language sql stable security invoker set search_path='' as $$
 select public.ffh_owner() or
 (split_part(object_name,'/',1)='profiles' and split_part(object_name,'/',2)=lower(public.ffh_my_staff_id())) or
 (split_part(object_name,'/',1)='campaigns' and split_part(object_name,'/',2)='executions' and split_part(object_name,'/',4)=lower(public.ffh_my_staff_id())) or
 ffh_private.allowed(case split_part(object_name,'/',1) when 'campaigns' then 'cpo' when 'incentives' then 'income' when 'catalogue' then 'catalogue' when 'proposals' then 'proposals' when 'briefings' then 'briefings' else 'settings' end,'upload')
$$;
create policy ffh_asset_upload_permission on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name));
create policy ffh_asset_update_permission on storage.objects as restrictive for update to authenticated using(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name)) with check(bucket_id<>'ffh-public' or ffh_private.asset_upload_allowed(name));
revoke all on function ffh_private.asset_upload_allowed(text) from public,anon;grant execute on function ffh_private.asset_upload_allowed(text) to authenticated;
CREATE OR REPLACE FUNCTION ffh_private.briefing_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare person record;begin
 if TG_OP='UPDATE' and to_jsonb(new)-'updated_at'=to_jsonb(old)-'updated_at' then return new;end if;
 update public.ffh_notification_jobs set status='cancelled' where source_key like 'briefing-time:'||new.id||':%' and status='scheduled';
 if not new.active then return new;end if;
 for person in select staff_id from public.ffh_profiles where active and login_approved and ('ALL'=any(new.recipients) or staff_id=any(new.recipients)) loop
 insert into public.ffh_notification_jobs(recipient,type,title,body,status,created_by,source_key)
 values(person.staff_id,new.kind,new.title,new.description,'scheduled',new.created_by,'briefing:'||new.id||':'||person.staff_id||':'||new.updated_at) on conflict(source_key) where source_key is not null do nothing;
 if new.starts_at>now() then insert into public.ffh_notification_jobs(recipient,type,title,body,status,scheduled_at,created_by,source_key) values(person.staff_id,new.kind,'Reminder · '||new.title,new.description,'scheduled',new.starts_at,new.created_by,'briefing-time:'||new.id||':'||person.staff_id||':'||new.starts_at) on conflict(source_key) where source_key is not null do update set status='scheduled',title=excluded.title,body=excluded.body;end if;
 end loop;return new;end$function$;
commit;
