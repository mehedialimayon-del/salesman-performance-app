begin;
create or replace function ffh_private.is_restore(t text,r jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.ffh_owner() and exists(select 1 from ffh_private.trash x where x.id::text=current_setting('ffh.restore_trash_id',true) and x.table_name=t and x.status='Deleted' and x.row_key <@ r)
$$;
revoke all on function ffh_private.is_restore(text,jsonb) from public,anon;grant execute on function ffh_private.is_restore(text,jsonb) to authenticated;
CREATE OR REPLACE FUNCTION ffh_private.campaign_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare c public.ffh_campaigns%rowtype;d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 select * into c from public.ffh_campaigns where id=new.campaign_id;
 if not found or not c.active or d<c.start_date or d>c.end_date or new.execution_date<>d or c.execution_mode='view' then raise exception 'Campaign not active for submission';end if;
 if c.assigned_to<>'ALL' and c.assigned_to<>new.sr_id then raise exception 'Campaign not assigned to this staff';end if;return new;end$function$;
CREATE OR REPLACE FUNCTION ffh_private.delivery_clock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$declare d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 if TG_OP='UPDATE' and old.status='Delivered' and (new.sale_date,new.sku,new.qty,new.delivered_amount,new.status) is distinct from (old.sale_date,old.sku,old.qty,old.delivered_amount,old.status) and (
 exists(select 1 from public.ffh_reward_offers o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d) or exists(select 1 from public.ffh_campaigns o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d)) then raise exception 'Closed offer sales are locked; use an approved adjustment for corrections';end if;
 if new.status='Delivered' and (TG_OP='INSERT' or old.status is distinct from 'Delivered') then new.delivered_at:=clock_timestamp();elsif TG_OP='UPDATE' then new.delivered_at:=old.delivered_at;end if;return new;end$function$;
CREATE OR REPLACE FUNCTION ffh_private.require_daily_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if; if auth.uid() is not null and not exists(select 1 from public.ffh_attendance where staff_id=public.ffh_my_staff_id() and duty_date=(now() at time zone 'Asia/Kuala_Lumpur')::date) then raise exception 'Daily attendance required before work updates' using errcode='42501'; end if; return new; end $function$;

create policy ffh_sales_delete_permission on public.ffh_sales for delete to authenticated using(ffh_private.allowed('sales','delete') and public.ffh_staff_view(sr_id));
create policy ffh_outlets_delete_permission on public.ffh_outlets for delete to authenticated using(ffh_private.allowed('outlets','delete') and public.ffh_staff_view(sr_id));
create policy ffh_routes_delete_permission on public.ffh_routes for delete to authenticated using(ffh_private.allowed('routes','delete') and public.ffh_staff_view(sr_id));
create policy ffh_tasks_delete_permission on public.ffh_tasks for delete to authenticated using(ffh_private.allowed('tasks','delete') and public.ffh_staff_view(assigned_to));
commit;
