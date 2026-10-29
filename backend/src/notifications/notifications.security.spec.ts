import { NotificationsService } from './notifications.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Notification ownership boundaries', () => {
  it('scopes marking a stored notification as read to the signed-in user', async () => {
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    const receiptQuery = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };
    const from = jest.fn((table: string) =>
      table === 'notifications' ? updateQuery : receiptQuery);
    const service = new NotificationsService({ client: { from } } as unknown as SupabaseService);
    await expect(service.markRead({ id: 'student-a' }, 'notification-1'))
      .resolves.toMatchObject({ notificationId: 'notification-1', status: 'read' });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'notification-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'student-a');
    expect(receiptQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'student-a', notification_key: 'notification-1' }),
      { onConflict: 'user_id,notification_key' },
    );
  });

  it('marks all stored notifications read only for the current user', async () => {
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    const from = jest.fn().mockReturnValue(updateQuery);
    const service = new NotificationsService({ client: { from } } as unknown as SupabaseService);
    // Empty generated set avoids querying additional sources while checking ownership filtering.
    jest.spyOn(service as any, 'buildGeneratedNotifications').mockResolvedValue([]);
    await expect(service.markAllRead({ id: 'student-a' })).resolves.toMatchObject({ status: 'read' });
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'student-a');
    expect(updateQuery.is).toHaveBeenCalledWith('read_at', null);
  });
});
