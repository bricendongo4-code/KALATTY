-- Agent proposals are review records, never executable commands.
create table if not exists public.ai_agent_proposals (
 id uuid primary key default gen_random_uuid(),
 department text not null check (department in ('security','qa','developer','ux','product','marketing','sales','support','finance','analytics','crm')),
 title text not null check (char_length(title) between 3 and 200),
 rationale text not null check (char_length(rationale) between 3 and 4000),
 status text not null default 'pending' check (status in ('pending','approved','rejected','revision_requested')),
 decision_note text,
 created_by uuid not null references auth.users(id),
 decided_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 execution_authorized boolean not null default false check (execution_authorized = false)
);
create index if not exists ai_agent_proposals_created_at_idx on public.ai_agent_proposals(created_at desc);
alter table public.ai_agent_proposals enable row level security;
-- No client RLS policies: only verified owner-only NestJS service-role access.
revoke all on public.ai_agent_proposals from anon, authenticated;
comment on table public.ai_agent_proposals is 'Human-reviewed recommendations only. Approval never triggers execution.';
