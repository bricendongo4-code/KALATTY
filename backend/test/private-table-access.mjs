// Isolated PostgreSQL permission test. No Supabase connection or production data.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const { PGlite } = createRequire(import.meta.url)('@electric-sql/pglite');
const root = new URL('../../', import.meta.url);
const tables = [
  'absence_justifications', 'announcements', 'assignment_files', 'course_reviews',
  'formations', 'institution_documents', 'institution_managed_users',
  'institution_pedagogy_scopes', 'room_attendance_records', 'room_attendance_sessions',
  'room_invites', 'room_member_controls', 'room_schedule_items', 'room_subjects',
  'subjects', 'teacher_reviews',
];
const db = await PGlite.create();
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;');
  for (const table of tables) {
    await db.exec(`create table public.${table}(id uuid); grant all on table public.${table} to anon,authenticated,service_role;`);
  }
  await db.exec(await readFile(new URL('backend/migrations/20261103_ai_security_signals.sql', root), 'utf8'));
  const count = async () => (await db.query('select public.ai_security_snapshot() as audit')).rows[0].audit.unprotected_tables.length;
  const before = await count();
  await db.exec('begin;' +
    await readFile(new URL('backend/migrations/20261104144901_restrict_private_table_access.sql', root), 'utf8') +
    await readFile(new URL('backend/test/private-table-access.sql', root), 'utf8'));
  const during = await count();
  await db.exec('rollback;');
  const after = await count();
  if (before !== 16 || during !== 0 || after !== 16) throw Error('Unexpected audit or rollback result');
  console.log(JSON.stringify({ validation: 'passed', tables: 16, roles: ['anon', 'authenticated', 'service_role'], before, during, after, productionChanged: false }));
} finally {
  await db.close();
}
