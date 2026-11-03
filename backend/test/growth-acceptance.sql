begin;
do $$
declare owner uuid; lead uuid; action uuid; n integer;
begin
 select id into owner from auth.users where email_confirmed_at is not null limit 1;
 if owner is null then raise exception 'No confirmed user for rollback fixture'; end if;
 insert into public.ai_growth_settings(owner_id) values(owner) on conflict do nothing;
 if not public.claim_ai_growth(owner,true) then raise exception 'Discovery first claim failed'; end if;
 if public.claim_ai_growth(owner,true) then raise exception 'Concurrent discovery accepted'; end if;
 insert into public.ai_growth_leads(owner_id,source_key,company,source_url,country,email,contact_source_url)
 values(owner,'rollback-fixture-'||gen_random_uuid(),'Rollback fixture','https://example.org/','FR','contact@example.org','https://example.org/contact') returning id into lead;
 insert into public.ai_growth_actions(owner_id,lead_id,channel,sender,recipient,subject,body,digest)
 values(owner,lead,'email','team@example.org','contact@example.org','Rollback fixture','No delivery',repeat('a',64)) returning id into action;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Unapproved accepted'; end if;
 update public.ai_growth_actions set status='approved',approved_digest=digest where id=action;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('b',64)); if n<>0 then raise exception 'Altered digest accepted'; end if;
 select count(*) into n from public.claim_ai_growth_action(gen_random_uuid(),action,repeat('a',64)); if n<>0 then raise exception 'Wrong owner accepted'; end if;
 update public.ai_growth_leads set opt_out=true where id=lead;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Optout accepted'; end if;
 update public.ai_growth_leads set opt_out=false where id=lead;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Suppression lost after optout reset'; end if;
 update public.ai_growth_leads set email='other@example.org' where id=lead;
 update public.ai_growth_actions set recipient='other@example.org' where id=action;
 update public.ai_growth_actions set scheduled_for=now()+interval '1 day' where id=action;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Future action accepted'; end if;
 update public.ai_growth_actions set scheduled_for=null where id=action;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>1 then raise exception 'Approved claim failed'; end if;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Duplicate claim accepted'; end if;
 update public.ai_growth_actions set status='approved' where id=action;
 update public.ai_growth_usage set deliveries=10 where owner_id=owner and day=current_date;
 select count(*) into n from public.claim_ai_growth_action(owner,action,repeat('a',64)); if n<>0 then raise exception 'Quota exceeded'; end if;
 insert into public.ai_growth_actions(owner_id,channel,subject,body,digest,dedup_key) values(owner,'export','Followup','No delivery',repeat('c',64),'rollback-followup-'||lead::text) on conflict(owner_id,dedup_key) do nothing;
 insert into public.ai_growth_actions(owner_id,channel,subject,body,digest,dedup_key) values(owner,'export','Followup','No delivery',repeat('c',64),'rollback-followup-'||lead::text) on conflict(owner_id,dedup_key) do nothing;
 if (select count(*) from public.ai_growth_actions where owner_id=owner and dedup_key='rollback-followup-'||lead::text)<>1 then raise exception 'Duplicate followup accepted'; end if;
 if (select count(*) from public.ai_growth_events where entity_id in (lead,action))<5 then raise exception 'Audit missing'; end if;
 if has_table_privilege('authenticated','public.ai_growth_leads','SELECT') then raise exception 'Public lead access'; end if;
 if has_function_privilege('anon','public.claim_ai_growth_action(uuid,uuid,text)','EXECUTE') then raise exception 'Public execution'; end if;
end $$;
select 'All workflow, opt-out, quota, ownership and audit assertions passed; fixture rolled back' as verification;
rollback;
