-- Reviewed scope: these tables are consumed through Kalatty's server API.
-- The backend must have SUPABASE_SERVICE_ROLE_KEY before applying this migration.
-- No policy is invented from a client-editable role or metadata claim.
set local lock_timeout = '3s';
set local statement_timeout = '15s';
do $$
declare target text;
begin
  foreach target in array array[
    'absence_justifications','announcements','assignment_files','course_reviews',
    'formations','institution_documents','institution_managed_users',
    'institution_pedagogy_scopes','room_attendance_records','room_attendance_sessions',
    'room_invites','room_member_controls','room_schedule_items','room_subjects',
    'subjects','teacher_reviews'
  ] loop
    if to_regclass(format('public.%I',target)) is null then
      raise exception 'Expected table missing: %',target;
    end if;
    execute format('alter table public.%I enable row level security',target);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated',target);
    execute format('grant select, insert, update, delete on table public.%I to service_role',target);
  end loop;
end $$;
