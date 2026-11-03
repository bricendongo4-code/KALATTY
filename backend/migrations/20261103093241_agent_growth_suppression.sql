create table public.ai_growth_suppressions (
 owner_id uuid not null references auth.users(id) on delete cascade,
 email text not null, created_at timestamptz not null default now(), primary key(owner_id,email)
);
alter table public.ai_growth_suppressions enable row level security;
revoke all on public.ai_growth_suppressions from public,anon,authenticated;
grant all on public.ai_growth_suppressions to service_role;
create function public.suppress_ai_growth_contact() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.opt_out and new.email<>'' then
  insert into ai_growth_suppressions(owner_id,email) values(new.owner_id,lower(new.email)) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.suppress_ai_growth_contact() from public,anon,authenticated;
grant execute on function public.suppress_ai_growth_contact() to service_role;
create trigger suppress_growth_contact after insert or update on public.ai_growth_leads for each row execute function public.suppress_ai_growth_contact();
create or replace function public.claim_ai_growth_action(target_owner uuid, action_id uuid, expected_digest text)
returns setof public.ai_growth_actions language plpgsql security invoker set search_path=public as $$
declare a ai_growth_actions;
begin
 select * into a from ai_growth_actions where id=action_id and owner_id=target_owner for update;
 if not found or a.status<>'approved' or a.digest is distinct from expected_digest or a.approved_digest is distinct from a.digest then return; end if;
 if a.scheduled_for is not null and a.scheduled_for>now() then return; end if;
 if a.channel='email' and exists(select 1 from ai_growth_suppressions where owner_id=target_owner and email=lower(a.recipient)) then return; end if;
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
