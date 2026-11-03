alter table public.ai_growth_actions add column dedup_key text;
create unique index ai_growth_action_dedup on public.ai_growth_actions(owner_id,dedup_key);
alter table public.ai_growth_settings add column discovery_page integer not null default 1 check(discovery_page between 1 and 1000);
