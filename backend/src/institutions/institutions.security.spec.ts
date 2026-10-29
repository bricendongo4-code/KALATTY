import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Institution access control', () => {
  it('rejects access when institution membership is absent', async () => {
    const query = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const institution = query({ owner_user_id: 'different-owner' });
    const membership = query(null);
    const from = jest.fn((table: string) => table === 'institutions' ? institution : membership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.getInstitutionDetails({ id: 'outsider' }, 'school-b'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(2);
    expect(membership.eq).toHaveBeenCalledWith('institution_id', 'school-b');
    expect(membership.eq).toHaveBeenCalledWith('user_id', 'outsider');
  });
  it('rejects a student member from reading management details', async () => {
    const query = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const institution = query({ owner_user_id: 'owner' });
    const membership = query({ role: 'student' });
    const from = jest.fn((table: string) => table === 'institutions' ? institution : membership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.getInstitutionDetails({ id: 'student' }, 'school-a'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(membership.eq).toHaveBeenCalledWith('institution_id', 'school-a');
    expect(membership.eq).toHaveBeenCalledWith('user_id', 'student');
  });

  it('rejects a teacher member from modifying institution settings', async () => {
    const query = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const institution = query({ owner_user_id: 'owner' });
    const membership = query({ role: 'teacher' });
    const from = jest.fn((table: string) => table === 'institutions' ? institution : membership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.updateInstitution({ id: 'teacher' }, 'school-a', { name: 'Changed' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('rejects institution creation by a student', async () => {
    const service = new InstitutionsService({ client: { from: jest.fn() } } as unknown as SupabaseService);
    await expect(service.createInstitution({ id: 'student', role: 'student' }, { name: 'Unauthorized School' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an empty institution name before database insertion', async () => {
    const service = new InstitutionsService({ client: { from: jest.fn() } } as unknown as SupabaseService);
    await expect(service.createInstitution({ id: 'owner', role: 'institution' }, { name: '   ' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid student capacity before database insertion', async () => {
    const service = new InstitutionsService({ client: { from: jest.fn() } } as unknown as SupabaseService);
    await expect(service.createInstitution({ id: 'owner', role: 'institution' }, { name: 'School', max_students: 0 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid room capacity before database insertion', async () => {
    const service = new InstitutionsService({ client: { from: jest.fn() } } as unknown as SupabaseService);
    await expect(service.createInstitution({ id: 'owner', role: 'institution' }, { name: 'School', max_rooms: -1 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects a teacher from creating a class in an institution', async () => {
    const room = { id: 'unused' };
    const institution = { owner_user_id: 'owner' };
    const query = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const from = jest.fn((table: string) =>
      table === 'institutions' ? query(institution) :
      table === 'institution_members' ? query({ role: 'teacher' }) : query(room));
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.createRoom({ id: 'teacher' }, 'school-a', { name: 'Math' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('rejects a student from creating an assignment in a class', async () => {
    const roomQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'room-a', institution_id: 'school-a', name: 'Math' }, error: null,
      }),
    };
    const institutionQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { owner_user_id: 'owner' }, error: null }),
    };
    const membershipQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
    };
    const from = jest.fn((table: string) =>
      table === 'rooms' ? roomQuery :
      table === 'institutions' ? institutionQuery : membershipQuery);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.createAssignment({ id: 'student' }, 'room-a', { title: 'Unauthorized assignment' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('denies class details to an outsider from another institution', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const room = makeQuery({ id: 'room-a', institution_id: 'school-a', name: 'Math' });
    const institution = makeQuery({ owner_user_id: 'owner-a' });
    const membership = makeQuery(null);
    const from = jest.fn((table: string) =>
      table === 'rooms' ? room : table === 'institutions' ? institution : membership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.getRoomDetails({ id: 'school-b-user' }, 'room-a'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(membership.eq).toHaveBeenCalledWith('institution_id', 'school-a');
    expect(membership.eq).toHaveBeenCalledWith('user_id', 'school-b-user');
  });

  it('denies class details to a teacher not assigned to that class', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const room = makeQuery({ id: 'room-a', institution_id: 'school-a', name: 'Math' });
    const institution = makeQuery({ owner_user_id: 'owner-a' });
    const membership = makeQuery({ role: 'teacher' });
    const roomMembership = makeQuery(null);
    const from = jest.fn((table: string) =>
      table === 'rooms' ? room : table === 'institutions' ? institution :
      table === 'institution_members' ? membership : roomMembership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.getRoomDetails({ id: 'unassigned-teacher' }, 'room-a'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(roomMembership.eq).toHaveBeenCalledWith('room_id', 'room-a');
    expect(roomMembership.eq).toHaveBeenCalledWith('user_id', 'unassigned-teacher');
    expect(roomMembership.eq).toHaveBeenCalledWith('role', 'teacher');
  });

  it('rejects a disabled class invitation before membership changes', async () => {
    const invite = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { is_active: false }, error: null }),
    };
    const from = jest.fn().mockReturnValue(invite);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.redeemInvite({ id: 'student' }, 'disabled-token'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('room_invites');
  });

  it('rejects an expired class invitation before membership changes', async () => {
    const invite = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { is_active: true, expires_at: '2020-01-01T00:00:00.000Z' }, error: null,
      }),
    };
    const from = jest.fn().mockReturnValue(invite);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.redeemInvite({ id: 'student' }, 'expired-token'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('rejects an exhausted class invitation before membership changes', async () => {
    const invite = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { is_active: true, used_count: 2, max_uses: 2 }, error: null,
      }),
    };
    const from = jest.fn().mockReturnValue(invite);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.redeemInvite({ id: 'student' }, 'used-token'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('prevents a teacher from enrolling a new institution member', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const institution = makeQuery({ owner_user_id: 'owner' });
    const membership = makeQuery({ role: 'teacher' });
    const from = jest.fn((table: string) =>
      table === 'institutions' ? institution : membership);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.addInstitutionMember(
      { id: 'teacher' }, 'school-a', { user_id: 'new-student', role: 'student' },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('rejects adding a room member who does not belong to the institution', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const room = makeQuery({ id: 'room-a', institution_id: 'school-a', name: 'Math' });
    const institution = makeQuery({ owner_user_id: 'owner' });
    const outsider = makeQuery(null);
    const from = jest.fn((table: string) =>
      table === 'rooms' ? room :
      table === 'institutions' ? institution : outsider);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.addRoomMember(
      { id: 'owner' }, 'room-a', { user_id: 'outsider', role: 'student' },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(outsider.eq).toHaveBeenCalledWith('institution_id', 'school-a');
    expect(outsider.eq).toHaveBeenCalledWith('user_id', 'outsider');
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('rejects a teacher removing a member from a class', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const room = makeQuery({ id: 'room-a', institution_id: 'school-a', name: 'Math' });
    const institution = makeQuery({ owner_user_id: 'owner' });
    const teacher = makeQuery({ role: 'teacher' });
    const from = jest.fn((table: string) =>
      table === 'rooms' ? room :
      table === 'institutions' ? institution : teacher);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.removeRoomMember({ id: 'teacher' }, 'room-a', 'student-a'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('rejects a teacher adding a member to a class', async () => {
    const makeQuery = (value: unknown) => {
      const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
      q.select.mockReturnValue(q);
      q.eq.mockReturnValue(q);
      q.maybeSingle.mockResolvedValue({ data: value, error: null });
      return q;
    };
    const room = makeQuery({ id: 'room-a', institution_id: 'school-a', name: 'Math' });
    const institution = makeQuery({ owner_user_id: 'owner' });
    const teacher = makeQuery({ role: 'teacher' });
    const from = jest.fn((table: string) =>
      table === 'rooms' ? room :
      table === 'institutions' ? institution : teacher);
    const service = new InstitutionsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.addRoomMember(
      { id: 'teacher' }, 'room-a', { user_id: 'student-a', role: 'student' },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(from).toHaveBeenCalledTimes(3);
  });

});
