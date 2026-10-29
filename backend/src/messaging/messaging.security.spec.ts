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
  it('blocks sending when the sender is not a participant', async () => {
    const participants = query(null);
    const from = jest.fn((table: string) => {
      if (table === 'message_participants') return participants;
      throw new Error('No message write permitted');
    });
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.send({ id: 'outsider' }, 'thread-1', 'private content'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalledWith('private_messages');
  });

  it('blocks attachment downloads for nonparticipants', async () => {
    const participants = query(null);
    const from = jest.fn((table: string) => {
      if (table === 'message_participants') return participants;
      throw new Error('Storage must not be reached');
    });
    const storage = { from: jest.fn() };
    const service = new MessagingService({ client: { from, storage } } as unknown as SupabaseService);
    await expect(service.download({ id: 'outsider' }, 'thread-1', 'message-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.from).not.toHaveBeenCalled();
  });

  it('blocks oversized or invalid attachment types before storage access', async () => {
    const participant = query({ user_id: 'student' });
    const thread = query({ id: 'thread-1', institution_id: 'school-1' });
    const member = query({ user_id: 'student' });
    const institution = query({ owner_user_id: 'owner' });
    const from = jest.fn((table: string) => ({
      message_participants: participant, message_threads: thread,
      institution_members: member, institutions: institution,
    } as Record<string, unknown>)[table]);
    const storage = { from: jest.fn() };
    const service = new MessagingService({ client: { from, storage } } as unknown as SupabaseService);
    await expect(service.attach({ id: 'student' }, 'thread-1', {
      buffer: Buffer.from('invalid'), mimetype: 'application/x-msdownload',
      originalname: 'danger.exe', size: 7,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.from).not.toHaveBeenCalled();
  });

  it('rejects messages with only whitespace', async () => {
    const participant = query({ user_id: 'student' });
    const thread = query({ id: 'thread-1', institution_id: 'school-1' });
    const member = query({ user_id: 'student' });
    const institution = query({ owner_user_id: 'owner' });
    const from = jest.fn((table: string) => ({
      message_participants: participant, message_threads: thread,
      institution_members: member, institutions: institution,
    } as Record<string, unknown>)[table]);
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.send({ id: 'student' }, 'thread-1', '   '))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalledWith('private_messages');
  });

  it('blocks marking a conversation read for a nonparticipant', async () => {
    const participants = query(null);
    const from = jest.fn((table: string) => {
      if (table === 'message_participants') return participants;
      throw new Error('No write permitted');
    });
    const service = new MessagingService({ client: { from } } as unknown as SupabaseService);
    await expect(service.markRead({ id: 'outsider' }, 'thread-1'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

});
