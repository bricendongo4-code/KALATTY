-- Retain the shared UTC-day counter, including all calls already consumed today.
-- Old calls have no category; conservatively count them as automatic to preserve
-- the owner's manual reserve when the new budget is enabled.
do $$ begin
  if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='ai_usage_daily' and column_name='automatic_calls') then
    alter table public.ai_usage_daily add column automatic_calls integer not null default 0 check(automatic_calls>=0);
    update public.ai_usage_daily set automatic_calls=calls;
  end if;
end $$;

create or replace function public.reserve_agent_ai_call(p_provider text, p_automatic boolean default false)
returns boolean language plpgsql security invoker set search_path=public as $$
declare total_limit integer; auto_limit integer; used integer;
begin
  if p_provider='groq' then total_limit:=100; auto_limit:=80;
  elsif p_provider='openai' then total_limit:=12; auto_limit:=10;
  else return false;
  end if;
  if p_automatic is null then return false; end if;
  insert into ai_usage_daily(day,calls,automatic_calls)
    values(current_date,1,case when p_automatic then 1 else 0 end)
  on conflict(day) do update set
    calls=ai_usage_daily.calls+1,
    automatic_calls=ai_usage_daily.automatic_calls+case when p_automatic then 1 else 0 end
    where ai_usage_daily.calls<total_limit
      and (not p_automatic or ai_usage_daily.automatic_calls<auto_limit)
  returning calls into used;
  return used is not null;
end $$;
revoke all on function public.reserve_agent_ai_call(text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_agent_ai_call(text,boolean) to service_role;
-- Legacy reserve_ai_call() retains its conservative 12-call cap for older clients.
