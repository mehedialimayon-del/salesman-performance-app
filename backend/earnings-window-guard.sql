begin;
create or replace function ffh_private.delivery_clock() returns trigger language plpgsql set search_path='' as $$declare d date:=(now() at time zone 'Asia/Kuala_Lumpur')::date;begin
 if TG_OP='UPDATE' and old.status='Delivered' and (new.sale_date,new.sku,new.qty,new.delivered_amount,new.status) is distinct from (old.sale_date,old.sku,old.qty,old.delivered_amount,old.status) and (
 exists(select 1 from public.ffh_reward_offers o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d) or exists(select 1 from public.ffh_campaigns o where o.active and (o.assigned_to='ALL' or o.assigned_to=old.sr_id) and old.sale_date between o.start_date and o.end_date and o.end_date<d)) then raise exception 'Closed offer sales are locked; use an approved adjustment for corrections';end if;
 if new.status='Delivered' and (TG_OP='INSERT' or old.status is distinct from 'Delivered') then new.delivered_at:=clock_timestamp();elsif TG_OP='UPDATE' then new.delivered_at:=old.delivered_at;end if;return new;end$$;
commit;
