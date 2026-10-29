import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Private messaging isolation', () => {
  const query = (data: unknown) => {
    const q: any = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.maybeSingle.mockResolvedValue({ data, error: null });
    return q;
  };

  it('denies reading a thread when the user is not a participant', async () => {
    const participants = query(null);
    const from = jest.fn((table: string) => {
      if (table === 'message_participants') return participants;
      throw new Error('Other tables must not be queried');
    });
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.messages({ id: 'outsider' }, 'thread-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(participants.eq).toHaveBeenCalledWith('user_id', 'outsider');
  });

  it('rejects creation if recipient is not a member of the institution', async () => {
    const membership = query(null);
    const institution = query({ owner_user_id: 'sender' });
    const from = jest.fn((table: string) => {
      if (table === 'institution_members') return membership;
      if (table === 'institutions') return institution;
      throw new Error('No message may be created');
    });
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.create({ id: 'sender' }, 'school-1', 'outsider'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalledWith('message_threads');
  });

  it('rejects creating a thread with oneself', async () => {
    const from = jest.fn();
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.create({ id: 'same-user' }, 'school-1', 'same-user'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });
});
