-- Kalatty AI Control Center: global, privileged reports only.
-- Do not grant access to authenticated/anon roles or institution administrators.
create table if not exists public.ai_agent_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  generated_at timestamptz not null,
  data_mode text not null check (data_mode in ('synthetic','unverified')),
  report jsonb not null,
  submitted_by uuid not null,
  constraint ai_agent_reports_max_payload check (octet_length(report::text) <= 1048576),
  constraint ai_agent_reports_no_authority check (
    report -> 'mergeAuthorized' = 'false'::jsonb
    and report -> 'deployAuthorized' = 'false'::jsonb
    and report -> 'liveMonitoringEnabled' = 'false'::jsonb
  )
);
create index if not exists ai_agent_reports_recent on public.ai_agent_reports (created_at desc);
alter table public.ai_agent_reports enable row level security;
revoke all on public.ai_agent_reports from anon, authenticated;
-- Access is exclusively through the trusted backend service role after JWT role verification.
