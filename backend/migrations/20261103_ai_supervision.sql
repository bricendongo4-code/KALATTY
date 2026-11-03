-- Durable supervision and exact-change owner approval. Service-role only.
alter table public.ai_agent_proposals add column if not exists source_key text;
alter table public.ai_agent_proposals add column if not exists evidence jsonb not null default '[]';
alter table public.ai_agent_proposals add column if not exists patch jsonb;
alter table public.ai_agent_proposals add column if not exists execution_status text not null default 'not_applicable';
alter table public.ai_agent_proposals add column if not exists execution_error text;
alter table public.ai_agent_proposals add column if not exists pull_request_url text;
alter table public.ai_agent_proposals add column if not exists pull_request_number integer;
alter table public.ai_agent_proposals add column if not exists branch_name text;
alter table public.ai_agent_proposals add column if not exists result_sha text;
alter table public.ai_agent_proposals add column if not exists execution_claimed_at timestamptz;
create unique index if not exists ai_proposal_source_unique on public.ai_agent_proposals(source_key) where source_key is not null;

create table if not exists public.ai_supervision_state (
 id boolean primary key default true check(id), enabled boolean not null default true,
 ai_enabled boolean not null default false,
 next_run_at timestamptz not null default now(), last_run_at timestamptz,
 lease_until timestamptz, lease_owner uuid, last_error text
);
insert into public.ai_supervision_state(id) values(true) on conflict do nothing;
create table if not exists public.ai_supervision_runs (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 finished_at timestamptz, status text not null default 'running', evidence jsonb not null default '[]',
 error text
);
create table if not exists public.ai_usage_daily (
 day date primary key, calls integer not null default 0
);
alter table public.ai_supervision_state enable row level security;
alter table public.ai_supervision_runs enable row level security;
alter table public.ai_usage_daily enable row level security;
revoke all on public.ai_supervision_state, public.ai_supervision_runs, public.ai_usage_daily from anon, authenticated;

create or replace function public.claim_ai_supervision(worker uuid, force_run boolean default false)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update ai_supervision_state set lease_until=now()+interval '15 minutes',lease_owner=worker,
 next_run_at=now()+interval '1 hour'
 where id=true and (enabled or force_run) and (force_run or next_run_at<=now())
 and (lease_until is null or lease_until<now());
 return found;
end $$;
create or replace function public.reserve_ai_call()
returns boolean language plpgsql security invoker set search_path=public as $$
declare used integer;
begin
 insert into ai_usage_daily(day,calls) values(current_date,1)
 on conflict(day) do update set calls=ai_usage_daily.calls+1 where ai_usage_daily.calls<12
 returning calls into used;
 return used is not null;
end $$;
-- Claim one approved patch. A crashed worker can retry the same deterministic branch.
create or replace function public.claim_ai_patch()
returns setof public.ai_agent_proposals language sql security invoker set search_path=public as $$
 update ai_agent_proposals set execution_status='preparing', execution_error=null, execution_claimed_at=now()
 where id=(select id from ai_agent_proposals where status='approved' and patch is not null
 and (execution_status='queued' or (execution_status='preparing' and execution_claimed_at<now()-interval '15 minutes')) order by decided_at for update skip locked limit 1)
 returning *;
$$;
revoke all on function public.claim_ai_supervision(uuid,boolean), public.reserve_ai_call(), public.claim_ai_patch() from public,anon,authenticated;
grant execute on function public.claim_ai_supervision(uuid,boolean), public.reserve_ai_call(), public.claim_ai_patch() to service_role;
comment on table public.ai_agent_proposals is 'Owner decisions. Exact patches are prepared on isolated Git branches after approval; publishing requires explicit owner release and successful CI.';

grant all on public.ai_supervision_state,public.ai_supervision_runs,public.ai_usage_daily to service_role;
