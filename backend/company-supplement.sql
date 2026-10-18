create or replace function ffh_private.sales_correction_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or ffh_private.is_restore(TG_TABLE_NAME,to_jsonb(new)) then return new;end if;
 if (new.sr_id,new.sale_date,new.outlet_code,new.outlet_name,new.category,new.sku,new.qty,new.price,new.order_amount,new.remarks) is distinct from (old.sr_id,old.sale_date,old.outlet_code,old.outlet_name,old.category,old.sku,old.qty,old.price,old.order_amount,old.remarks) or (old.status='Delivered' and (new.delivered_amount,new.status) is distinct from (old.delivered_amount,old.status)) then
 if not public.ffh_staff_edit(old.sr_id,'sales') or not public.ffh_staff_view(new.sr_id) then raise exception 'Sales correction permission required' using errcode='42501';end if;
 end if;return new;
end$$;
revoke all on function ffh_private.sales_correction_guard() from public,anon,authenticated;
create trigger ffh_sales_correction_guard before update on public.ffh_sales for each row execute function ffh_private.sales_correction_guard();
-- Include directory changes in the same immutable owner history.
create trigger ffh_change_audit after insert or update or delete on public.ffh_contacts for each row execute function ffh_private.capture_change('settings');
