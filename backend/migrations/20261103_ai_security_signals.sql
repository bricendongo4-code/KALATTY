-- Schema-only audit: no student, message or payment records are read.
create or replace function public.ai_security_snapshot()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('unprotected_tables', coalesce(jsonb_agg(c.relname order by c.relname),'[]'::jsonb))
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity
 and (has_table_privilege('anon',c.oid,'select,insert,update,delete')
 or has_table_privilege('authenticated',c.oid,'select,insert,update,delete'));
$$;
revoke all on function public.ai_security_snapshot() from public,anon,authenticated;
grant execute on function public.ai_security_snapshot() to service_role;
