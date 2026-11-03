create table public.ai_growth_settings (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 brief jsonb not null default '{}', discovery_enabled boolean not null default false,
 provider text not null default 'directory_fr' check(provider in ('directory_fr','brave_web')),
 query text not null default 'centre de formation', country text not null default 'FR',
 next_run_at timestamptz not null default now(), lease_until timestamptz,
 last_run_at timestamptz, last_error text, updated_at timestamptz not null default now()
);
create table public.ai_growth_leads (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null, company text not null, source_url text not null, country text not null,
 city text not null default '', industry text not null default '', qualification text not null default '',
 email text not null default '', contact_source_url text not null default '', opt_out boolean not null default false,
 stage text not null default 'new' check(stage in ('new','qualified','contacted','meeting','won','lost')),
 notes text not null default '', next_followup_at timestamptz, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,source_key), unique(owner_id,id)
);
create table public.ai_growth_actions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 lead_id uuid,
 channel text not null check(channel in ('email','linkedin','export')),
 recipient text not null default '', sender text not null default '', subject text not null, body text not null,
 scheduled_for timestamptz, generation_mode text not null default 'template',
 status text not null default 'draft' check(status in ('draft','approved','rejected','dispatching','sent','exported','failed','unknown')),
 digest text not null, approved_digest text, approved_at timestamptz,
 provider_id text, error text, claimed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(owner_id,lead_id) references public.ai_growth_leads(owner_id,id) on delete cascade
);
create table public.ai_growth_events (
 id bigint generated always as identity primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 entity_type text not null, entity_id uuid not null, event text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.ai_growth_usage (
 owner_id uuid not null references auth.users(id) on delete cascade, day date not null,
 deliveries integer not null default 0, discoveries integer not null default 0, primary key(owner_id,day)
);
create index ai_growth_actions_owner_date on public.ai_growth_actions(owner_id,created_at desc);
create index ai_growth_leads_owner_date on public.ai_growth_leads(owner_id,created_at desc);
create index ai_growth_events_owner_date on public.ai_growth_events(owner_id,created_at desc);
alter table public.ai_growth_settings enable row level security;
alter table public.ai_growth_leads enable row level security;
alter table public.ai_growth_actions enable row level security;
alter table public.ai_growth_events enable row level security;
alter table public.ai_growth_usage enable row level security;
revoke all on public.ai_growth_settings,public.ai_growth_leads,public.ai_growth_actions,public.ai_growth_events,public.ai_growth_usage from public,anon,authenticated;
grant all on public.ai_growth_settings,public.ai_growth_leads,public.ai_growth_actions,public.ai_growth_events,public.ai_growth_usage to service_role;
grant usage,select on sequence public.ai_growth_events_id_seq to service_role;

create function public.audit_ai_growth() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 insert into ai_growth_events(owner_id,entity_type,entity_id,event,details)
 values(new.owner_id,tg_table_name,new.id,case when tg_op='INSERT' then 'created' else 'updated' end,
 case when tg_table_name='ai_growth_actions' then jsonb_build_object('status',to_jsonb(new)->>'status','digest',to_jsonb(new)->>'digest','channel',to_jsonb(new)->>'channel')
 else jsonb_build_object('stage',to_jsonb(new)->>'stage','opt_out',to_jsonb(new)->'opt_out') end);
 return new;
end $$;
create trigger audit_growth_lead after insert or update on public.ai_growth_leads for each row execute function public.audit_ai_growth();
create trigger audit_growth_action after insert or update on public.ai_growth_actions for each row execute function public.audit_ai_growth();

create function public.claim_ai_growth(target_owner uuid, force_run boolean default false)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update ai_growth_settings set lease_until=now()+interval '10 minutes',next_run_at=now()+interval '1 day'
 where owner_id=target_owner and (discovery_enabled or force_run) and (force_run or next_run_at<=now()) and (lease_until is null or lease_until<now());
 if not found then return false; end if;
 insert into ai_growth_usage(owner_id,day,discoveries) values(target_owner,current_date,1)
 on conflict(owner_id,day) do update set discoveries=ai_growth_usage.discoveries+1 where ai_growth_usage.discoveries<5;
 if not found then
  update ai_growth_settings set lease_until=null where owner_id=target_owner;
  return false;
 end if;
 return true;
end $$;

create function public.claim_ai_growth_action(target_owner uuid, action_id uuid, expected_digest text)
returns setof public.ai_growth_actions language plpgsql security invoker set search_path=public as $$
declare a ai_growth_actions;
begin
 select * into a from ai_growth_actions where id=action_id and owner_id=target_owner for update;
 if not found or a.status<>'approved' or a.digest is distinct from expected_digest or a.approved_digest is distinct from a.digest then return; end if;
 if a.scheduled_for is not null and a.scheduled_for>now() then return; end if;
 if a.lead_id is not null then
  perform 1 from ai_growth_leads where id=a.lead_id and owner_id=target_owner and not opt_out and (a.channel<>'email' or (email=a.recipient and contact_source_url<>'')) for update;
  if not found then return; end if;
 end if;
 insert into ai_growth_usage(owner_id,day,deliveries) values(target_owner,current_date,1)
 on conflict(owner_id,day) do update set deliveries=ai_growth_usage.deliveries+1 where ai_growth_usage.deliveries<10;
 if not found then return; end if;
 return query update ai_growth_actions set status='dispatching',claimed_at=now(),updated_at=now()
 where id=action_id and owner_id=target_owner returning *;
end $$;
revoke all on function public.audit_ai_growth(), public.claim_ai_growth(uuid,boolean),public.claim_ai_growth_action(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.audit_ai_growth(),public.claim_ai_growth(uuid,boolean),public.claim_ai_growth_action(uuid,uuid,text) to service_role;
