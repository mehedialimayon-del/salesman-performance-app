begin;
alter table public.ffh_profiles drop constraint ffh_profiles_monthly_target_check;
alter table public.ffh_profiles add constraint ffh_profiles_monthly_target_check check(monthly_target>=0 and (not can_sell or monthly_target>=50000));
alter table public.ffh_income_settings drop constraint ffh_income_settings_actual_target_check;
alter table public.ffh_income_settings add constraint ffh_income_settings_actual_target_check check(actual_target>=0);
alter table public.ffh_income_settings drop constraint ffh_income_settings_month_check;
alter table public.ffh_income_settings add constraint ffh_income_settings_month_check check(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

create table public.ffh_sales_baselines(
 staff_id text not null references public.ffh_profiles(staff_id),
 month text not null check(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 total_sales numeric(16,2) not null check(total_sales>=0),
 daily_sales jsonb not null default '{}' check(jsonb_typeof(daily_sales)='object'),
 updated_by text not null,updated_at timestamptz not null default now(),
 primary key(staff_id,month)
);
alter table public.ffh_sales_baselines enable row level security;
revoke all on public.ffh_sales_baselines from public,anon,authenticated;
grant select on public.ffh_sales_baselines to authenticated;
grant all on public.ffh_sales_baselines to service_role;
create policy ffh_scoped_baseline_read on public.ffh_sales_baselines for select to authenticated using(public.ffh_staff_view(staff_id));
create function ffh_private.save_sales_baseline(p_staff_id text,p_month text,p_total numeric,p_daily jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid text:=public.ffh_my_staff_id(); d record;maxday integer;total numeric:=0;
begin
 if sid is null or not public.ffh_staff_view(p_staff_id) or not exists(select 1 from public.ffh_profiles where staff_id=p_staff_id and can_sell and active and login_approved) then raise exception 'Active SR in your permitted scope required' using errcode='42501';end if;
 if sid<>p_staff_id and not public.ffh_staff_edit(p_staff_id,'sales') and not public.ffh_staff_edit(p_staff_id,'income') then raise exception 'Sales or Income edit access required' using errcode='42501';end if;
 if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or p_month>=to_char(now() at time zone 'Asia/Kuala_Lumpur','YYYY-MM') or p_total is null or p_total<0 or p_total>99999999999999 or p_daily is null or jsonb_typeof(p_daily)<>'object' then raise exception 'Choose a previous month and a valid nonnegative sales total';end if;
 maxday:=extract(day from (to_date(p_month||'-01','YYYY-MM-DD')+interval '1 month - 1 day'));
 for d in select key,value from jsonb_each(p_daily) loop
  if d.key !~ '^[1-9][0-9]?$' then raise exception 'Invalid day';end if;
  if d.key::integer>maxday or jsonb_typeof(d.value)<>'number' or (d.value::text)::numeric<0 then raise exception 'Invalid daily amount or day';end if;
  total:=total+(d.value::text)::numeric;
 end loop;
 if total>p_total then raise exception 'Daily history exceeds the full monthly total';end if;
 insert into public.ffh_sales_baselines values(p_staff_id,p_month,p_total,p_daily,sid,now()) on conflict(staff_id,month) do update set total_sales=excluded.total_sales,daily_sales=excluded.daily_sales,updated_by=sid,updated_at=now();
 return jsonb_build_object('saved',true);
end$$;
revoke all on function ffh_private.save_sales_baseline(text,text,numeric,jsonb) from public,anon;
grant execute on function ffh_private.save_sales_baseline(text,text,numeric,jsonb) to authenticated;
create function public.ffh_save_sales_baseline(p_staff_id text,p_month text,p_total numeric,p_daily jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select ffh_private.save_sales_baseline(p_staff_id,p_month,p_total,p_daily)$$;
revoke all on function public.ffh_save_sales_baseline(text,text,numeric,jsonb) from public,anon;
grant execute on function public.ffh_save_sales_baseline(text,text,numeric,jsonb) to authenticated;

create function ffh_private.validate_income_target() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.ffh_profiles where staff_id=new.staff_id and can_sell) then
  if new.actual_target<50000 then raise exception 'Own SR route target minimum RM 50,000';end if;
 else new.actual_target:=0;new.planning_target:=0;
 end if;return new;
end$$;
revoke all on function ffh_private.validate_income_target() from public,anon,authenticated;
create trigger ffh_income_route_target before insert or update on public.ffh_income_settings for each row execute function ffh_private.validate_income_target();
update public.ffh_profiles set monthly_target=0 where not can_sell and monthly_target<>0;
update public.ffh_income_settings s set actual_target=0,planning_target=0 where exists(select 1 from public.ffh_profiles p where p.staff_id=s.staff_id and not p.can_sell);
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.ffh_sales_baselines;end if;end$$;
commit;
