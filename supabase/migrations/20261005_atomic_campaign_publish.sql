create or replace function public.ffh_publish_campaigns(campaigns jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare old_payload jsonb; staff text;
begin
 if auth.uid() is null or not public.ffh_can_manage() then raise exception 'Manager access required' using errcode='42501'; end if;
 if campaigns is null or jsonb_typeof(campaigns)<>'array' then raise exception 'Campaign list must be an array'; end if;
 select staff_id into staff from public.ffh_profiles where auth_user_id=auth.uid() and active;
 select payload into old_payload from public.ffh_shared_content where content_key='cpo_campaigns' for update;
 if exists(select 1 from jsonb_array_elements(campaigns) c where coalesce(c->>'id','')='' or coalesce(c->>'title','')='' or (c->>'type') not in ('CPO','Promotion')
 or coalesce(c->>'executionMode','proof') not in ('proof','view')
 or nullif(c->>'endDate','')::date < coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date)) then raise exception 'Invalid campaign details or dates'; end if;
 insert into public.ffh_campaigns(id,title,campaign_type,execution_mode,assigned_to,outlet_category,product,poster_url,start_date,end_date,active,updated_at)
 select c->>'id',c->>'title',c->>'type',coalesce(c->>'executionMode','proof'),coalesce(nullif(c->>'sr',''),'ALL'),coalesce(nullif(c->>'category',''),'ALL'),coalesce(c->>'product',''),coalesce(c->>'image',''),
 coalesce(nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),
 coalesce(nullif(c->>'endDate','')::date,nullif(c->>'startDate','')::date,nullif(c->>'date','')::date,(now() at time zone 'Asia/Kuala_Lumpur')::date),coalesce((c->>'active')::boolean,true),now()
 from jsonb_array_elements(campaigns) c
 on conflict(id) do update set title=excluded.title,campaign_type=excluded.campaign_type,execution_mode=excluded.execution_mode,assigned_to=excluded.assigned_to,outlet_category=excluded.outlet_category,product=excluded.product,poster_url=excluded.poster_url,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active,updated_at=excluded.updated_at;
 update public.ffh_campaigns set active=false,updated_at=now()
 where id in (select c->>'id' from jsonb_array_elements(coalesce(old_payload,'[]'::jsonb)) c)
 and id not in (select c->>'id' from jsonb_array_elements(campaigns) c);
 insert into public.ffh_shared_content(content_key,payload,updated_at,updated_by) values('cpo_campaigns',campaigns,now(),staff)
 on conflict(content_key) do update set payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end $$;
revoke all on function public.ffh_publish_campaigns(jsonb) from public,anon;
grant execute on function public.ffh_publish_campaigns(jsonb) to authenticated;