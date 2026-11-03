-- Only newly queued, owner-approved recommendations may prepare a draft patch.
-- Existing approved recommendations are not automatically enrolled.
alter table public.ai_agent_proposals
  add column if not exists implementation_proposal_id uuid
  references public.ai_agent_proposals(id);
create index if not exists ai_proposal_implementation_link
  on public.ai_agent_proposals(implementation_proposal_id)
  where implementation_proposal_id is not null;

-- The approval and its work queue entry are one transaction, including on process crashes.
create or replace function public.decide_ai_proposal(p_id uuid, p_owner uuid, p_decision text, p_note text)
returns setof public.ai_agent_proposals
language sql security invoker set search_path=public as $$
  update ai_agent_proposals
  set status=p_decision, decided_by=p_owner, decided_at=now(), decision_note=p_note,
    execution_status=case
      when p_decision='approved' and patch is not null then 'queued'
      when p_decision='approved' then 'planning_queued'
      else execution_status end
  where id=p_id and status='pending' and p_owner is not null
    and p_decision in ('approved','rejected','revision_requested')
    and char_length(coalesce(p_note,''))<=2000
    and (p_decision<>'revision_requested' or char_length(trim(coalesce(p_note,'')))>0)
  returning *;
$$;
revoke all on function public.decide_ai_proposal(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.decide_ai_proposal(uuid,uuid,text,text) to service_role;

create or replace function public.claim_ai_implementation()
returns setof public.ai_agent_proposals
language sql security invoker set search_path=public as $$
  update ai_agent_proposals
  set execution_status='planning', execution_error=null, execution_claimed_at=now()
  where id=(
    select id from ai_agent_proposals
    where status='approved' and patch is null and decided_by is not null
      and (execution_status='planning_queued'
        or (execution_status='planning' and execution_claimed_at < now()-interval '15 minutes'))
    order by decided_at, id for update skip locked limit 1
  ) returning *;
$$;
revoke all on function public.claim_ai_implementation() from public, anon, authenticated;
grant execute on function public.claim_ai_implementation() to service_role;
