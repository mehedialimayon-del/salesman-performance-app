begin;
-- Existing owner-only writes and staff reads continue to apply to these columns.
alter table public.ffh_home_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.ffh_home_messages add column if not exists link_url text;
alter table public.ffh_home_messages add column if not exists link_label text;
alter table public.ffh_home_messages drop constraint if exists ffh_home_messages_message_check;
alter table public.ffh_home_messages add constraint ffh_home_messages_message_check check(length(trim(message)) between 1 and 30000);
alter table public.ffh_home_messages drop constraint if exists ffh_ticker_attachments_check;
alter table public.ffh_home_messages add constraint ffh_ticker_attachments_check check(jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=6);
alter table public.ffh_home_messages drop constraint if exists ffh_ticker_link_check;
alter table public.ffh_home_messages add constraint ffh_ticker_link_check check(link_url is null or (length(link_url)<=4000 and link_url ~ '^https?://'));
alter table public.ffh_home_messages drop constraint if exists ffh_ticker_label_check;
alter table public.ffh_home_messages add constraint ffh_ticker_label_check check(link_label is null or length(link_label)<=80);
commit;
