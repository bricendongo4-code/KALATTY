-- Execute after the candidate migration inside the SAME transaction, then roll back.
-- Uses LIMIT 0 and WHERE false: no user record is read, inserted or updated.
do $$
declare target text; role_name text; first_column text; exposed jsonb;
begin
  foreach target in array array[
    'absence_justifications','announcements','assignment_files','course_reviews',
    'formations','institution_documents','institution_managed_users',
    'institution_pedagogy_scopes','room_attendance_records','room_attendance_sessions',
    'room_invites','room_member_controls','room_schedule_items','room_subjects',
    'subjects','teacher_reviews'
  ] loop
    if not (select relrowsecurity from pg_class where oid=to_regclass(format('public.%I',target))) then
      raise exception 'RLS missing: %',target;
    end if;
    select attname into first_column from pg_attribute
      where attrelid=to_regclass(format('public.%I',target)) and attnum>0 and not attisdropped
      order by attnum limit 1;
    foreach role_name in array array['anon','authenticated'] loop
      if has_table_privilege(role_name,format('public.%I',target),'select,insert,update,delete,truncate,references,trigger') then
        raise exception 'Unexpected direct privilege for % on %',role_name,target;
      end if;
      execute format('set local role %I',role_name);
      begin
        execute format('select 1 from public.%I limit 0',target);
        raise exception 'Direct read permitted for % on %',role_name,target;
      exception when insufficient_privilege then null;
      end;
      begin
        execute format('update public.%I set %I=%I where false',target,first_column,first_column);
        raise exception 'Direct update permitted for % on %',role_name,target;
      exception when insufficient_privilege then null;
      end;
      execute 'reset role';
    end loop;
    execute 'set local role service_role';
    execute format('select 1 from public.%I limit 0',target);
    execute format('update public.%I set %I=%I where false',target,first_column,first_column);
    execute 'reset role';
  end loop;
  select public.ai_security_snapshot()->'unprotected_tables' into exposed;
  if jsonb_array_length(exposed)<>0 then raise exception 'Audit still detects exposed tables: %',exposed; end if;
end $$;
