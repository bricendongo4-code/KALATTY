-- Real database acceptance test; all counter changes are rolled back.
begin;
do $$
declare i integer;
begin
  insert into public.ai_usage_daily(day,calls,automatic_calls) values(current_date,0,0)
    on conflict(day) do update set calls=0,automatic_calls=0;
  for i in 1..80 loop
    if not public.reserve_agent_ai_call('groq',true) then raise exception 'Groq automatic call % refused',i; end if;
  end loop;
  if public.reserve_agent_ai_call('groq',true) then raise exception 'Automatic work consumed manual reserve'; end if;
  for i in 1..20 loop
    if not public.reserve_agent_ai_call('groq',false) then raise exception 'Manual reserve refused'; end if;
  end loop;
  if public.reserve_agent_ai_call('groq',false) then raise exception 'Groq cap exceeded'; end if;
  if public.reserve_agent_ai_call('openai',false) then raise exception 'Provider switch bypassed the conservative OpenAI cap'; end if;
  update public.ai_usage_daily set calls=0,automatic_calls=0 where day=current_date;
  for i in 1..10 loop
    if not public.reserve_agent_ai_call('openai',true) then raise exception 'OpenAI automatic call refused'; end if;
  end loop;
  if public.reserve_agent_ai_call('openai',true) then raise exception 'OpenAI manual reserve consumed'; end if;
  for i in 1..2 loop
    if not public.reserve_agent_ai_call('openai',false) then raise exception 'OpenAI manual reserve refused'; end if;
  end loop;
  if public.reserve_agent_ai_call('openai',false) then raise exception 'OpenAI cap exceeded'; end if;
  if public.reserve_agent_ai_call('unsupported',false) or public.reserve_agent_ai_call('groq',null)
    then raise exception 'Invalid provider or category accepted'; end if;
  if has_function_privilege('anon','public.reserve_agent_ai_call(text,boolean)','execute')
    or has_function_privilege('authenticated','public.reserve_agent_ai_call(text,boolean)','execute')
    then raise exception 'Quota function is public'; end if;
end $$;
rollback;
