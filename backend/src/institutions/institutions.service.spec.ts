import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

/**
 * Faux client Supabase en memoire : suffisant pour exercer la logique metier
 * (select / eq / maybeSingle / single / insert / update / upsert) sans reseau.
 */
function createFakeClient(db: Db) {
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let mode: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    let payload: Row = {};
    let conflict: string[] = [];

    const matching = () =>
      (db[table] ?? []).filter((row) =>
        filters.every(([key, value]) => row[key] === value),
      );

    const run = () => {
      if (mode === 'insert') {
        const row = {
          id: `${table}-${(db[table] ?? []).length + 1}`,
          ...payload,
        };
        db[table] = [...(db[table] ?? []), row];
        return [row];
      }
      if (mode === 'update') {
        const rows = matching();
        rows.forEach((row) => Object.assign(row, payload));
        return rows;
      }
      if (mode === 'upsert') {
        const existing = (db[table] ?? []).find((row) =>
          conflict.every((key) => row[key] === payload[key]),
        );
        if (existing) {
          Object.assign(existing, payload);
          return [existing];
        }
        db[table] = [...(db[table] ?? []), { ...payload }];
        return [payload];
      }
      return matching();
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return builder;
      },
      insert: (row: Row) => {
        mode = 'insert';
        payload = row;
        return builder;
      },
      update: (row: Row) => {
        mode = 'update';
        payload = row;
        return builder;
      },
      upsert: (row: Row, options?: { onConflict?: string }) => {
        mode = 'upsert';
        payload = row;
        conflict = (options?.onConflict ?? 'id').split(',');
        return builder;
      },
      maybeSingle: () =>
        Promise.resolve({ data: run()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: run(), error: null }),
    };
    return builder;
  };
  return { from };
}

const ROOM = { id: 'room-1', institution_id: 'inst-1', name: 'Terminale A' };
const STUDENT = { id: 'user-student', role: 'student' };

function buildService(db: Db) {
  const supabaseService = { client: createFakeClient(db) };
  return new InstitutionsService(supabaseService as never);
}

describe('InstitutionsService - remise de devoir', () => {
  let db: Db;

  beforeEach(() => {
    db = {
      rooms: [{ ...ROOM }],
      room_members: [
        { room_id: 'room-1', user_id: STUDENT.id, role: 'student' },
      ],
      assignments: [{ id: 'assign-1', room_id: 'room-1' }],
      assignment_submissions: [],
    };
  });

  it('refuse un utilisateur qui n est pas rattache a la classe', async () => {
    db.room_members = [];
    await expect(
      buildService(db).submitAssignment(STUDENT, 'room-1', 'assign-1', {
        content: 'Ma reponse',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse un devoir qui appartient a une autre classe', async () => {
    db.assignments = [{ id: 'assign-1', room_id: 'autre-room' }];
    await expect(
      buildService(db).submitAssignment(STUDENT, 'room-1', 'assign-1', {
        content: 'Ma reponse',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse une remise vide (ni texte ni fichier)', async () => {
    await expect(
      buildService(db).submitAssignment(STUDENT, 'room-1', 'assign-1', {
        content: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.assignment_submissions).toHaveLength(0);
  });

  it('cree la remise au statut submitted', async () => {
    const result = (await buildService(db).submitAssignment(
      STUDENT,
      'room-1',
      'assign-1',
      { content: '  Ma reponse  ' },
    )) as Row;

    expect(result.status).toBe('submitted');
    expect(result.content).toBe('Ma reponse');
    expect(result.student_id).toBe(STUDENT.id);
    expect(db.assignment_submissions).toHaveLength(1);
  });

  it('met a jour la remise existante au lieu d en creer une seconde', async () => {
    const service = buildService(db);
    await service.submitAssignment(STUDENT, 'room-1', 'assign-1', {
      content: 'Version 1',
    });
    await service.submitAssignment(STUDENT, 'room-1', 'assign-1', {
      content: 'Version 2',
    });

    expect(db.assignment_submissions).toHaveLength(1);
    expect(db.assignment_submissions[0].content).toBe('Version 2');
  });
});

describe('InstitutionsService - acceptation d invitation', () => {
  const INVITE = {
    id: 'invite-1',
    token: 'tok-123',
    room_id: 'room-1',
    invite_role: 'student',
    is_active: true,
    used_count: 0,
    max_uses: 5,
    expires_at: null,
  };

  it('ne retrograde pas le proprietaire de l etablissement en etudiant', async () => {
    const db: Db = {
      rooms: [{ ...ROOM }],
      institutions: [{ id: 'inst-1', owner_user_id: 'user-owner' }],
      institution_members: [],
      room_members: [],
      room_invites: [{ ...INVITE }],
    };

    const result = await buildService(db).redeemInvite(
      { id: 'user-owner', role: 'institution' },
      'tok-123',
    );

    expect(result.role).toBe('owner');
    expect(db.room_members).toHaveLength(0);
    expect(db.room_invites[0].used_count).toBe(1);
  });

  it('rattache un nouvel etudiant a l etablissement et a la classe', async () => {
    const db: Db = {
      rooms: [{ ...ROOM }],
      institutions: [{ id: 'inst-1', owner_user_id: 'user-owner' }],
      institution_members: [],
      room_members: [],
      room_invites: [{ ...INVITE }],
    };

    const result = await buildService(db).redeemInvite(STUDENT, 'tok-123');

    expect(result.role).toBe('student');
    expect(db.room_members).toHaveLength(1);
    expect(db.room_members[0]).toMatchObject({
      room_id: 'room-1',
      user_id: STUDENT.id,
      role: 'student',
    });
  });

  it('refuse une invitation inactive', async () => {
    const db: Db = {
      rooms: [{ ...ROOM }],
      institutions: [],
      institution_members: [],
      room_members: [],
      room_invites: [{ ...INVITE, is_active: false }],
    };

    await expect(
      buildService(db).redeemInvite(STUDENT, 'tok-123'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
