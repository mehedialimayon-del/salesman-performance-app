-- Keep permission denials distinct from data/validation errors.
create or replace function ffh_private.assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id();p text;begin
 if auth.uid() is null then return new;end if;
 if TG_TABLE_NAME='ffh_briefings' then
 if not public.ffh_module_edit('briefings') then raise exception 'Notice / meeting edit permission required' using errcode='42501';end if;
 if 'ALL'=any(new.recipients) and not public.ffh_owner() then
  new.recipients:=array(select staff_id from public.ffh_profiles where active and login_approved and public.ffh_staff_view(staff_id));
 end if;
 foreach p in array new.recipients loop if p<>'ALL' and not public.ffh_staff_view(p) then raise exception 'Recipient outside permitted zones' using errcode='42501';end if;end loop;
 elsif TG_TABLE_NAME='ffh_notification_jobs' then
 if new.created_by<>sid then raise exception 'Notification sender mismatch' using errcode='42501';end if;
 if new.recipient='ALL' and not public.ffh_owner() then raise exception 'Expand the permitted recipients before sending' using errcode='42501';end if;
 if new.recipient<>'ALL' and not public.ffh_staff_view(new.recipient) then raise exception 'Recipient outside permitted zones' using errcode='42501';end if;
 end if;return new;end$$;
