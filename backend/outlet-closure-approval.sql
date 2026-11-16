create table public.ffh_outlet_closures (
 id uuid primary key default gen_random_uuid(),
 outlet_id uuid not null,
 outlet_sr_id text not null references public.ffh_profiles(staff_id),
 outlet_code text not null,
 outlet_name text not null,
 requested_by text not null references public.ffh_profiles(staff_id),
 reason text not null check (char_length(reason) between 1 and 1000),
 status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
 created_at timestamptz not null default now(),
 reviewed_by text references public.ffh_profiles(staff_id),
 reviewed_at timestamptz,
 review_reason text,
 effective_on date
);
create unique index ffh_outlet_closures_one_pending on public.ffh_outlet_closures(outlet_id) where status='Pending';
create index ffh_outlet_closures_staff on public.ffh_outlet_closures(outlet_sr_id,created_at desc);
alter table public.ffh_outlet_closures enable row level security;
revoke all on table public.ffh_outlet_closures from public,anon,authenticated;
grant select on table public.ffh_outlet_closures to authenticated;
create policy ffh_outlet_closures_visible on public.ffh_outlet_closures for select to authenticated
 using(requested_by=(select public.ffh_my_staff_id()) or outlet_sr_id=(select public.ffh_my_staff_id()) or public.ffh_staff_edit(outlet_sr_id,'outlets'));

create function ffh_private.outlet_closure(action text, request_id uuid, reason_text text)
returns public.ffh_outlet_closures language plpgsql security definer set search_path='' as $$
declare actor text:=public.ffh_my_staff_id(); outlet public.ffh_outlets; request public.ffh_outlet_closures;
 clean_reason text:=trim(coalesce(reason_text,'')); decision_time timestamptz;
begin
 if actor is null then raise exception 'Login required' using errcode='42501'; end if;
 if action='request' then
  select * into outlet from public.ffh_outlets where id=request_id for update;
  if not found or (outlet.sr_id<>actor and not public.ffh_staff_edit(outlet.sr_id,'outlets')) then
   raise exception 'Outlet is outside your permitted assignment' using errcode='42501';
  end if;
  if not outlet.active then raise exception 'Outlet is already inactive'; end if;
  if char_length(clean_reason) not between 1 and 1000 then raise exception 'Enter a reason (1–1000 characters)'; end if;
  insert into public.ffh_outlet_closures(outlet_id,outlet_sr_id,outlet_code,outlet_name,requested_by,reason)
   values(outlet.id,outlet.sr_id,outlet.outlet_code,outlet.outlet_name,actor,clean_reason)
   on conflict(outlet_id) where status='Pending' do nothing returning * into request;
  if not found then raise exception 'A closure request is already pending for this outlet'; end if;
  return request;
 end if;
 if action not in ('approve','reject') or action is null then raise exception 'Unknown closure action'; end if;
 select * into request from public.ffh_outlet_closures where id=request_id;
 if not found or not public.ffh_staff_edit(request.outlet_sr_id,'outlets') then
  raise exception 'Outlet review permission required' using errcode='42501';
 end if;
 -- Use the same outlet-first lock order as submissions.
 select * into outlet from public.ffh_outlets where id=request.outlet_id for update;
 select * into request from public.ffh_outlet_closures where id=request_id for update;
 if request.status<>'Pending' then raise exception 'This request was already reviewed'; end if;
 if outlet.id is null or outlet.sr_id<>request.outlet_sr_id or outlet.outlet_code<>request.outlet_code then
  raise exception 'The outlet assignment changed. Submit a new request.';
 end if;
 if char_length(clean_reason)>1000 then raise exception 'Review reason must be 1,000 characters or less'; end if;
 if action='reject' and clean_reason='' then raise exception 'Enter a rejection reason'; end if;
 decision_time:=clock_timestamp();
 if action='approve' then
  update public.ffh_outlets set active=false,updated_at=decision_time where id=outlet.id;
 end if;
 update public.ffh_outlet_closures set status=case when action='approve' then 'Approved' else 'Rejected' end,
  reviewed_by=actor,reviewed_at=decision_time,review_reason=nullif(clean_reason,''),
  effective_on=case when action='approve' then (decision_time at time zone 'Asia/Kuala_Lumpur')::date+1 end
 where id=request_id returning * into request;
 return request;
end $$;
revoke all on function ffh_private.outlet_closure(text,uuid,text) from public,anon;
grant execute on function ffh_private.outlet_closure(text,uuid,text) to authenticated;

create function public.ffh_outlet_closure(action text, request_id uuid, reason_text text default '')
returns public.ffh_outlet_closures language sql security invoker set search_path='' as $$
 select ffh_private.outlet_closure(action,request_id,reason_text)
$$;
revoke all on function public.ffh_outlet_closure(text,uuid,text) from public,anon;
grant execute on function public.ffh_outlet_closure(text,uuid,text) to authenticated;

create function ffh_private.block_closed_outlet_orders() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' or new.sr_id is distinct from old.sr_id or new.outlet_code is distinct from old.outlet_code or new.sale_date is distinct from old.sale_date
      or (new.status='Delivered' and (new.status is distinct from old.status or new.delivered_at is distinct from old.delivered_at)))
 and exists(select 1 from public.ffh_outlets o join public.ffh_outlet_closures c on c.outlet_id=o.id
  where o.sr_id=new.sr_id and o.outlet_code=new.outlet_code and not o.active and c.status='Approved'
    and greatest(new.sale_date, coalesce((new.delivered_at at time zone 'Asia/Kuala_Lumpur')::date,new.sale_date))>=c.effective_on-1)
 then raise exception 'This outlet is closed. Choose an active outlet.' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function ffh_private.block_closed_outlet_orders() from public,anon,authenticated;
create trigger ffh_block_closed_outlet_orders before insert or update on public.ffh_sales
 for each row execute function ffh_private.block_closed_outlet_orders();
