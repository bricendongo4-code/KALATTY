-- Transactional acceptance test: no fixture or claim persists; no model is called.
begin;
do $$
declare owner_id uuid; pending_id uuid; rejected_id uuid; approved_id uuid; legacy_id uuid; claimed uuid;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  if owner_id is null then raise exception 'A test identity is required'; end if;
  insert into public.ai_agent_proposals(department,title,rationale,status,created_by,decided_by,decided_at,execution_status)
    values('developer','Test pending','Test only','pending',owner_id,owner_id,'1900-01-01','planning_queued') returning id into pending_id;
  insert into public.ai_agent_proposals(department,title,rationale,status,created_by,decided_by,decided_at,execution_status)
    values('developer','Test rejected','Test only','rejected',owner_id,owner_id,'1900-01-01','planning_queued') returning id into rejected_id;
  insert into public.ai_agent_proposals(department,title,rationale,status,created_by)
    values('developer','Test approved','Test only','pending',owner_id) returning id into approved_id;
  insert into public.ai_agent_proposals(department,title,rationale,status,created_by)
    values('developer','Test legacy acknowledgement','Test only','pending',owner_id) returning id into legacy_id;
  perform public.decide_ai_proposal(legacy_id,owner_id,'approved',null);
  if (select execution_status from public.ai_agent_proposals where id=legacy_id)<>'not_applicable'
    then raise exception 'A legacy acknowledgement started new work'; end if;
  perform public.decide_ai_proposal(approved_id,owner_id,'approved_prepare','Test transaction only');
  if (select execution_status from public.ai_agent_proposals where id=approved_id)<>'planning_queued'
    then raise exception 'Approval did not atomically queue the work'; end if;
  if exists(select 1 from public.decide_ai_proposal(approved_id,owner_id,'approved',null))
    then raise exception 'Repeated approval was accepted'; end if;
  update public.ai_agent_proposals set decided_at='1900-01-02' where id=approved_id;
  select id into claimed from public.claim_ai_implementation();
  if claimed is distinct from approved_id then raise exception 'Only an approved recommendation may be claimed'; end if;
  if (select execution_status from public.ai_agent_proposals where id=pending_id) <> 'planning_queued'
    or (select execution_status from public.ai_agent_proposals where id=rejected_id) <> 'planning_queued'
    then raise exception 'Unapproved records changed'; end if;
  update public.ai_agent_proposals set execution_claimed_at=now()-interval '16 minutes' where id=approved_id;
  select id into claimed from public.claim_ai_implementation();
  if claimed is distinct from approved_id then raise exception 'Expired work not recovered'; end if;
  if has_function_privilege('anon','public.claim_ai_implementation()','execute')
    or has_function_privilege('authenticated','public.claim_ai_implementation()','execute')
    or not has_function_privilege('service_role','public.claim_ai_implementation()','execute')
    then raise exception 'Invalid function privileges'; end if;
  if has_function_privilege('authenticated','public.decide_ai_proposal(uuid,uuid,text,text)','execute')
    or has_function_privilege('anon','public.decide_ai_proposal(uuid,uuid,text,text)','execute')
    then raise exception 'Decision function is not private'; end if;
end $$;
rollback;
