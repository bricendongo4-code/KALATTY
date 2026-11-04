-- Durable mission coordination. No client access; owner-only server API.
create table public.ai_orchestrator_state (
 id boolean primary key default true check(id), enabled boolean not null default false,
 auto_assign boolean not null default true, next_dispatch_at timestamptz not null default now(),
 lease_owner uuid, lease_until timestamptz, last_cycle_at timestamptz, last_error text
);
insert into public.ai_orchestrator_state(id) values(true);
create table public.ai_agent_missions (
 id uuid primary key default gen_random_uuid(), source_key text not null unique,
 title text not null check(char_length(title) between 3 and 160),
 objective text not null check(char_length(objective) between 10 and 2000),
 context_note text not null default '' check(char_length(context_note)<=1000),
 department text not null check(department in ('security','qa','developer','ux','product','marketing','sales','support','finance','analytics','crm')),
 priority integer not null default 1 check(priority in (1,2)),
 origin text not null check(origin in ('manual','automatic')),
 status text not null default 'active' check(status in ('active','awaiting_approval','completed','blocked','cancelled')),
 proposal_id uuid references public.ai_agent_proposals(id),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.ai_agent_tasks (
 id uuid primary key default gen_random_uuid(), mission_id uuid not null references public.ai_agent_missions(id),
 department text not null check(department in ('security','qa','developer','ux','product','marketing','sales','support','finance','analytics','crm')),
 stage text not null check(stage in ('analysis','review')), depends_on uuid references public.ai_agent_tasks(id),
 status text not null default 'queued' check(status in ('queued','running','completed','blocked','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 3),
 lease_owner uuid, lease_until timestamptz, retry_at timestamptz, last_error text,
 result jsonb, started_at timestamptz, finished_at timestamptz,
 created_at timestamptz not null default now(), unique(mission_id,stage)
);
create index on public.ai_agent_missions(created_by);
create index on public.ai_agent_missions(proposal_id);
create index on public.ai_agent_tasks(mission_id);
create index on public.ai_agent_tasks(depends_on);
create index on public.ai_agent_tasks(status,retry_at,created_at);
alter table public.ai_orchestrator_state enable row level security;
alter table public.ai_agent_missions enable row level security;
alter table public.ai_agent_tasks enable row level security;
revoke all on public.ai_orchestrator_state,public.ai_agent_missions,public.ai_agent_tasks from public,anon,authenticated;
grant all on public.ai_orchestrator_state,public.ai_agent_missions,public.ai_agent_tasks to service_role;

create function public.enqueue_ai_mission(p_owner uuid,p_key text,p_title text,p_objective text,p_department text,p_reviewer text,p_priority integer,p_origin text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare mission uuid; first_task uuid; existing ai_agent_missions;
begin
 perform pg_advisory_xact_lock(hashtext('kalatty-ai-mission-queue'));
 select * into existing from ai_agent_missions where source_key=p_key;
 if found then
   if existing.created_by<>p_owner or existing.title<>p_title or existing.objective<>p_objective or existing.department<>p_department or existing.priority<>p_priority
     then raise exception 'Mission request key already used'; end if;
   return existing.id;
 end if;
 if (select count(*) from ai_agent_missions where status in ('active','blocked','awaiting_approval'))>=50
   then raise exception 'Mission queue full'; end if;
 if p_origin='manual' and (select count(*) from ai_agent_missions where origin='manual' and created_at>=current_date)>=20
   then raise exception 'Daily mission limit reached'; end if;
 insert into ai_agent_missions(source_key,title,objective,department,priority,origin,created_by)
 values(p_key,p_title,p_objective,p_department,p_priority,p_origin,p_owner) returning id into mission;
 insert into ai_agent_tasks(mission_id,department,stage) values(mission,p_department,'analysis') returning id into first_task;
 insert into ai_agent_tasks(mission_id,department,stage,depends_on) values(mission,p_reviewer,'review',first_task);
 return mission;
end $$;

create function public.claim_ai_orchestrator(p_worker uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update ai_orchestrator_state set lease_owner=p_worker,lease_until=now()+interval '5 minutes',
   next_dispatch_at=now()+interval '1 minute'
 where id=true and enabled and next_dispatch_at<=now()
   and (lease_until is null or lease_until<now());
 return found;
end $$;

create function public.claim_ai_agent_task(p_worker uuid)
returns setof public.ai_agent_tasks language plpgsql security invoker set search_path=public as $$
declare chosen uuid;
begin
 if not exists(select 1 from ai_orchestrator_state where id=true and enabled and lease_owner=p_worker and lease_until>now()) then return; end if;
 update ai_agent_tasks set status='blocked',last_error='Trois interruptions successives. Relancez la mission.',retry_at=null
 where status='running' and lease_until<now() and attempts>=3;
 update ai_agent_missions m set status='blocked',updated_at=now() where m.status='active' and exists(select 1 from ai_agent_tasks t where t.mission_id=m.id and t.status='blocked' and t.attempts>=3);
 select t.id into chosen from ai_agent_tasks t join ai_agent_missions m on m.id=t.mission_id
 where m.status in ('active','blocked') and t.attempts<3
   and (m.origin='manual' or exists(select 1 from ai_supervision_state where id=true and ai_enabled))
   and (t.status='queued' or (t.status='running' and t.lease_until<now())
     or (t.status='blocked' and t.retry_at<=now()))
   and (t.depends_on is null or exists(select 1 from ai_agent_tasks d where d.id=t.depends_on and d.status='completed'))
 order by m.priority desc,m.created_at,t.created_at,t.id for update of t skip locked limit 1;
 if chosen is null then return; end if;
 update ai_agent_missions set status='active',updated_at=now() where id=(select mission_id from ai_agent_tasks where id=chosen);
 return query update ai_agent_tasks set status='running',attempts=attempts+1,lease_owner=p_worker,
   lease_until=now()+interval '5 minutes',retry_at=null,last_error=null,started_at=coalesce(started_at,now())
 where id=chosen returning *;
end $$;

create function public.finish_ai_agent_task(p_task uuid,p_worker uuid,p_result jsonb,p_error text,p_retry_at timestamptz)
returns boolean language plpgsql security invoker set search_path=public as $$
declare t ai_agent_tasks; m ai_agent_missions; proposal uuid;
begin
 select * into t from ai_agent_tasks where id=p_task for update;
 if not found or t.status<>'running' or t.lease_owner is distinct from p_worker or t.lease_until<=now() then return false; end if;
 select * into m from ai_agent_missions where id=t.mission_id for update;
 if m.status='cancelled' then return false; end if;
 if p_error is not null then
   update ai_agent_tasks set status='blocked',last_error=left(p_error,1000),retry_at=case when attempts<3 then p_retry_at else null end,lease_until=null where id=t.id;
   update ai_agent_missions set status='blocked',updated_at=now() where id=m.id;
   return true;
 end if;
 if jsonb_typeof(p_result)<>'object' or p_result is null or char_length(p_result::text)>24000
   or coalesce(p_result->>'outcome','') not in ('propose_change','no_change','needs_information')
   or char_length(coalesce(p_result->>'summary','')) not between 3 and 1200
   or char_length(coalesce(p_result->>'recommendation','')) not between 10 and 3500
   or jsonb_typeof(p_result->'evidence') is distinct from 'array'
   then raise exception 'Invalid task result'; end if;
 if t.stage='review' and p_result->>'outcome'='propose_change' then
   insert into ai_agent_proposals(department,title,rationale,created_by,evidence,source_key)
   values(m.department,left('Mission : '||m.title,200),p_result->>'recommendation',m.created_by,p_result->'evidence','orchestration:'||m.id)
   on conflict(source_key) where source_key is not null do update set source_key=excluded.source_key
   returning id into proposal;
   update ai_agent_missions set status='awaiting_approval',proposal_id=proposal,updated_at=now() where id=m.id;
 elsif t.stage='review' then
   update ai_agent_missions set status=case when p_result->>'outcome'='no_change' then 'completed' else 'blocked' end,updated_at=now() where id=m.id;
 end if;
 update ai_agent_tasks set status=case when p_result->>'outcome'='needs_information' then 'blocked' else 'completed' end,
   result=p_result,last_error=case when p_result->>'outcome'='needs_information' then p_result->>'summary' else null end,
   finished_at=now(),lease_until=null,retry_at=null where id=t.id;
 if p_result->>'outcome'='needs_information' then update ai_agent_missions set status='blocked',updated_at=now() where id=m.id; end if;
 return true;
end $$;

create function public.control_ai_mission(p_mission uuid,p_action text,p_note text)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 if char_length(coalesce(p_note,''))>1000 then return false; end if;
 if p_action='cancel' then
   update ai_agent_missions set status='cancelled',updated_at=now() where id=p_mission and status in ('active','blocked') and proposal_id is null;
   if not found then return false; end if;
   update ai_agent_tasks set status='cancelled',lease_until=null where mission_id=p_mission and status in ('queued','running','blocked');
 elsif p_action='retry' then
   update ai_agent_missions set status='active',context_note=coalesce(p_note,''),updated_at=now()
     where id=p_mission and status='blocked' and proposal_id is null;
   if not found then return false; end if;
   update ai_agent_tasks set status='queued',attempts=0,result=null,last_error=null,retry_at=null,
     lease_owner=null,lease_until=null,started_at=null,finished_at=null where mission_id=p_mission;
 else return false;
 end if;
 return true;
end $$;

create function public.ai_orchestrator_status()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('state',(select to_jsonb(s)-'lease_owner' from ai_orchestrator_state s where id=true),
 'usage',(select jsonb_build_object('calls',calls,'automaticCalls',automatic_calls) from ai_usage_daily where day=current_date),
 'missions',coalesce((select jsonb_agg(row_data) from (
   select to_jsonb(m)||jsonb_build_object(
     'tasks',(select coalesce(jsonb_agg(to_jsonb(t)-'lease_owner' order by t.stage),'[]'::jsonb) from ai_agent_tasks t where t.mission_id=m.id),
     'change',case when p.id is not null then jsonb_build_object('id',coalesce(c.id,p.id),'status',coalesce(c.status,p.status),
       'execution_status',coalesce(c.execution_status,p.execution_status),'execution_error',coalesce(c.execution_error,p.execution_error),
       'pull_request_url',coalesce(c.pull_request_url,p.pull_request_url)) else null end) as row_data
   from ai_agent_missions m left join ai_agent_proposals p on p.id=m.proposal_id
     left join ai_agent_proposals c on c.id=p.implementation_proposal_id
   order by case when m.status in ('active','blocked','awaiting_approval') then 0 else 1 end,m.priority desc,m.created_at desc limit 50
 ) missions),'[]'::jsonb));
$$;
revoke all on function public.enqueue_ai_mission(uuid,text,text,text,text,text,integer,text),public.claim_ai_orchestrator(uuid),
 public.claim_ai_agent_task(uuid),public.finish_ai_agent_task(uuid,uuid,jsonb,text,timestamptz),
 public.control_ai_mission(uuid,text,text),public.ai_orchestrator_status() from public,anon,authenticated;
grant execute on function public.enqueue_ai_mission(uuid,text,text,text,text,text,integer,text),public.claim_ai_orchestrator(uuid),
 public.claim_ai_agent_task(uuid),public.finish_ai_agent_task(uuid,uuid,jsonb,text,timestamptz),
 public.control_ai_mission(uuid,text,text),public.ai_orchestrator_status() to service_role;
