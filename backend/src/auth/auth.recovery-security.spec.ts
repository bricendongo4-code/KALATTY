import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';

describe('Password recovery security contract (current behavior)', () => {
  it('rejects a normal session token without changing the password', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'not a recovery token' } });
    const updateUserById = jest.fn().mockResolvedValue({ error: null });
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'ordinary-access-token', password: 'new-password-123' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'ordinary-access-token', type: 'recovery' });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens', async () => {
    const updateUserById = jest.fn();
    const service = new AuthService({
      authClient: { auth: { verifyOtp: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }) } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'invalid', password: 'new-password-123' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateUserById).not.toHaveBeenCalled();
  });
  it('allows a verified recovery token to update the matching user', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    const updateUserById = jest.fn().mockResolvedValue({ error: null });
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'valid-recovery-hash', password: 'new-password-123' }))
      .resolves.toHaveProperty('message');
    expect(updateUserById).toHaveBeenCalledWith('test-user', { password: 'new-password-123' });
  });
  it('rejects an expired recovery token without updating any user', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Token has expired or is invalid' },
    });
    const updateUserById = jest.fn();
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'expired-hash', password: 'new-password-123' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('rejects a consumed recovery token on a second attempt', async () => {
    const verifyOtp = jest.fn()
      .mockResolvedValueOnce({ data: { user: { id: 'test-user' } }, error: null })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: 'already used' } });
    const updateUserById = jest.fn().mockResolvedValue({ error: null });
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'one-time-hash', password: 'new-password-123' }))
      .resolves.toHaveProperty('message');
    await expect(service.resetPassword({ accessToken: 'one-time-hash', password: 'another-password-123' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateUserById).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing recovery token before contacting Supabase', async () => {
    const verifyOtp = jest.fn();
    const updateUserById = jest.fn();
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: '', password: 'new-password-123' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('rejects a weak new password before consuming a recovery token', async () => {
    const verifyOtp = jest.fn();
    const updateUserById = jest.fn();
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'recovery-hash', password: 'short' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('surfaces an administrative password update failure', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
    const updateUserById = jest.fn().mockResolvedValue({ error: { message: 'update failed' } });
    const service = new AuthService({
      authClient: { auth: { verifyOtp } },
      client: { auth: { admin: { updateUserById } } },
    } as unknown as SupabaseService, {} as JwtService);
    await expect(service.resetPassword({ accessToken: 'recovery-hash', password: 'new-password-123' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(updateUserById).toHaveBeenCalledWith('test-user', { password: 'new-password-123' });
  });
});
