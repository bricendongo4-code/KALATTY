import { ForbiddenException } from '@nestjs/common';
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
});
