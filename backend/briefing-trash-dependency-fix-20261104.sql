-- Fix: Owner Trash Bin > PERMANENT DELETE of an already soft-deleted briefing.
-- A deleted briefing can retain read receipts / dated minutes / meeting minutes;
-- these FK children must be removed in the same transaction before the parent.
-- Only this specific owner-approved purge path is affected. The existing
-- restore flow and other Trash records are unchanged.
-- Tested with owner-authorized purge inside BEGIN ... ROLLBACK on 2026-11-04.
do $fix$
declare old text; replacement text;
begin
 old := pg_get_functiondef('ffh_private.governance(text,jsonb)'::regprocedure);
 if position($anchor$execute format('delete from public.%I t where to_jsonb(t) @> $1',item.table_name) using item.row_key;$anchor$ in old)=0
    then raise exception 'Trash purge function changed; manual review required'; end if;
 if position($anchor$if item.table_name='ffh_briefings' then
    -- Purge only$anchor$ in old)>0 then
    raise notice 'Briefing dependency purge already installed';
    return;
 end if;
 replacement := replace(old,
   $anchor$   execute format('delete from public.%I t where to_jsonb(t) @> $1',item.table_name) using item.row_key;$anchor$,
   $new$   if item.table_name='ffh_briefings' then
    -- Purge only the read/meeting rows directly linked to this purged briefing.
    -- Transactional: FK errors roll back all changes.
    delete from public.ffh_briefing_reads where briefing_id=(item.row_key->>'id')::uuid;
    delete from public.ffh_meeting_minutes where briefing_id=(item.row_key->>'id')::uuid;
    delete from public.ffh_dated_minutes where briefing_id=(item.row_key->>'id')::uuid;
   end if;
   execute format('delete from public.%I t where to_jsonb(t) @> $1',item.table_name) using item.row_key;$new$);
 if replacement=old then raise exception 'Purge patch did not match function';end if;
 execute replacement;
end$fix$;
