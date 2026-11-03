import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SearchService } from './search.service';

// In-memory query adapter executes the filters against cross-account fixtures.
function database(tables: Record<string, any[]>, unavailable?: string) {
  const calls: { table: string; op: string; args: any[] }[] = [];
  const client = {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const query: any = {
        select() {
          return query;
        },
        eq(key: string, value: any) {
          calls.push({ table, op: 'eq', args: [key, value] });
          rows = rows.filter((r) => r[key] === value);
          return query;
        },
        neq(key: string, value: any) {
          rows = rows.filter((r) => r[key] !== value);
          return query;
        },
        in(key: string, values: any[]) {
          rows = rows.filter((r) => values.includes(r[key]));
          return query;
        },
        ilike(key: string, value: string) {
          calls.push({ table, op: 'ilike', args: [key, value] });
          const term = value.replace(/%/g, '').toLowerCase();
          rows = rows.filter((r) =>
            String(r[key]).toLowerCase().includes(term),
          );
          return query;
        },
        order() {
          return query;
        },
        limit(n: number) {
          rows = rows.slice(0, n);
          return query;
        },
        then(resolve: any) {
          return Promise.resolve({
            data: rows,
            error: unavailable === table ? { message: 'offline' } : null,
          }).then(resolve);
        },
      };
      return query;
    },
  };
  return { client, calls };
}
const user = { id: 'me', role: 'admin' };
function service(db: any, role = 'student', roomIds = ['r1']) {
  const campus = {
    getContext: jest
      .fn()
      .mockResolvedValue({ institutionId: 'school-a', campusRole: role }),
    getSearchRoomIds: jest.fn().mockResolvedValue(roomIds),
  };
  return { search: new SearchService(db, campus as any), campus };
}
test('creator cannot search another owner even with an elevated JWT role', async () => {
  const db = database({
    courses: [
      { id: 'mine', title: 'SQL', teacher_id: 'me', status: 'draft' },
      {
        id: 'other',
        title: 'SQL private',
        teacher_id: 'other',
        status: 'draft',
      },
    ],
    studio_projects: [
      { id: 'mine-video', title: 'SQL', teacher_id: 'me' },
      { id: 'other-video', title: 'SQL', teacher_id: 'other' },
    ],
  });
  const result = await service(db).search.search(user, 'SQL', 'creator');
  expect(result.results.map((r) => r.id).sort()).toEqual([
    'mine',
    'mine-video',
  ]);
});
test('learner search exposes published courses only', async () => {
  const db = database({
    courses: [
      { id: 'public', title: 'SQL', status: 'published' },
      { id: 'private', title: 'SQL', status: 'draft' },
    ],
  });
  expect(
    (await service(db).search.search(user, 'SQL', 'learn')).results.map(
      (r) => r.id,
    ),
  ).toEqual(['public']);
});
test('student search excludes another institution, classmates and unattached courses', async () => {
  const db = database({
    rooms: [
      { id: 'r1', name: 'SQL', institution_id: 'school-a' },
      { id: 'r2', name: 'SQL private', institution_id: 'school-b' },
    ],
    room_members: [
      { room_id: 'r1', user_id: 'me', role: 'student' },
      { room_id: 'r2', user_id: 'me', role: 'student' },
      { room_id: 'r1', user_id: 'peer', role: 'student' },
      { room_id: 'r1', user_id: 'teacher', role: 'teacher' },
      { room_id: 'r2', user_id: 'other-teacher', role: 'teacher' },
    ],
    room_courses: [
      { room_id: 'r1', course_id: 'allowed' },
      { room_id: 'r2', course_id: 'secret' },
    ],
    courses: [
      { id: 'allowed', title: 'SQL' },
      { id: 'secret', title: 'SQL secret' },
    ],
    profiles: [
      { id: 'peer', fullname: 'SQL Peer' },
      { id: 'teacher', fullname: 'SQL Teacher' },
      { id: 'other-teacher', fullname: 'SQL Other' },
    ],
    institution_documents: [
      { id: 'secret-document', title: 'SQL', institution_id: 'school-a' },
    ],
  });
  const result = await service(db).search.search(user, 'SQL', 'campus');
  expect(result.results.map((r) => r.id).sort()).toEqual([
    'allowed',
    'r1',
    'teacher',
  ]);
});
test('pedagogical room scope and institution document isolation are preserved', async () => {
  const db = database({
    rooms: [
      { id: 'r1', name: 'SQL', institution_id: 'school-a' },
      { id: 'r2', name: 'SQL', institution_id: 'school-a' },
    ],
    institution_documents: [
      { id: 'allowed', title: 'SQL', institution_id: 'school-a' },
      { id: 'secret', title: 'SQL', institution_id: 'school-b' },
    ],
  });
  const { search, campus } = service(db, 'pedagogy');
  expect(
    (await search.search(user, 'SQL', 'campus')).results
      .map((r) => r.id)
      .sort(),
  ).toEqual(['allowed', 'r1']);
  expect(campus.getSearchRoomIds).toHaveBeenCalledWith(user);
});
test('absent membership denies campus search', async () => {
  const { search, campus } = service(database({}));
  campus.getContext.mockRejectedValue(new NotFoundException());
  await expect(search.search(user, 'SQL', 'campus')).rejects.toBeInstanceOf(
    ForbiddenException,
  );
});
test('input validation and partial failures do not masquerade as complete results', async () => {
  const { search } = service(database({}, 'courses'));
  await expect(search.search(user, 'x', 'learn')).rejects.toBeInstanceOf(
    BadRequestException,
  );
  await expect(search.search(user, 'SQL', 'admin')).rejects.toBeInstanceOf(
    BadRequestException,
  );
  expect(
    (await search.search(user, 'SQL', 'learn')).unavailableSources,
  ).toEqual(['cours']);
});
