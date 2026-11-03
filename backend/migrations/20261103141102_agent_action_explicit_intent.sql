-- Compatibility: an older UI's acknowledgement must never start new implementation work.
create or replace function public.decide_ai_proposal(p_id uuid, p_owner uuid, p_decision text, p_note text)
returns setof public.ai_agent_proposals
language sql security invoker set search_path=public as $$
  update ai_agent_proposals
  set status=case when p_decision='approved_prepare' then 'approved' else p_decision end,
    decided_by=p_owner, decided_at=now(), decision_note=p_note,
    execution_status=case
      when p_decision in ('approved','approved_prepare') and patch is not null then 'queued'
      when p_decision='approved_prepare' then 'planning_queued'
      when p_decision='approved' then 'not_applicable'
      else execution_status end
  where id=p_id and status='pending' and p_owner is not null
    and p_decision in ('approved','approved_prepare','rejected','revision_requested')
    and char_length(coalesce(p_note,''))<=2000
    and (p_decision<>'revision_requested' or char_length(trim(coalesce(p_note,'')))>0)
  returning *;
$$;
revoke all on function public.decide_ai_proposal(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.decide_ai_proposal(uuid,uuid,text,text) to service_role;
