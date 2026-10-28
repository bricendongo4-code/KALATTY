import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';

describe('Password recovery security contract (current behavior)', () => {
  it('documents that a generic valid access token currently authorizes reset', async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    const updateUserById = jest.fn().mockResolvedValue({ error: null });
    const service = new AuthService({
      authClient: { auth: { getUser } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await service.resetPassword({ accessToken: 'ordinary-access-token', password: 'new-password-123' });
    expect(updateUserById).toHaveBeenCalledWith('test-user', { password: 'new-password-123' });
  });

  it('rejects invalid tokens', async () => {
    const updateUserById = jest.fn();
    const service = new AuthService({
      authClient: { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }) } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'invalid', password: 'new-password-123' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
