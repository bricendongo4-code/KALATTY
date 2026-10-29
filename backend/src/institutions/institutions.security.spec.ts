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
});
