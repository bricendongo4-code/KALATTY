import { ForbiddenException } from '@nestjs/common';
import { AiControlCenterController } from './ai-control-center.controller';

describe('AiControlCenterController', () => {
  const originalEmail = process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
  const getUserById = jest.fn();
  const controller = new AiControlCenterController({
    client: { auth: { admin: { getUserById } } },
  } as never);

  beforeEach(() => {
    process.env.KALATTY_PLATFORM_ADMIN_EMAIL = 'owner@example.test';
    getUserById.mockReset();
  });
  afterAll(() => {
    if (originalEmail === undefined) delete process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
    else process.env.KALATTY_PLATFORM_ADMIN_EMAIL = originalEmail;
  });

  it('rejects missing and non-owner identities', async () => {
    for (const user of [undefined, { id: 'user', email: 'other@example.test' },
      { id: 'user', role: 'institution', email: 'other@example.test' }]) {
      await expect(controller.catalog({ user })).rejects.toThrow(ForbiddenException);
    }
    expect(getUserById).not.toHaveBeenCalled();
  });

  it('fails closed without explicit owner configuration', async () => {
    delete process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
    await expect(controller.catalog({ user: { id: 'owner', email: 'owner@example.test' } }))
      .rejects.toThrow(ForbiddenException);
  });

  it('rejects an unconfirmed or mismatched Supabase identity', async () => {
    getUserById.mockResolvedValueOnce({ data: { user: { email: 'owner@example.test' } }, error: null });
    await expect(controller.catalog({ user: { id: 'owner', email: 'owner@example.test' } }))
      .rejects.toThrow(ForbiddenException);
    getUserById.mockResolvedValueOnce({ data: { user: { email: 'other@example.test', email_confirmed_at: '2026-01-01' } }, error: null });
    await expect(controller.catalog({ user: { id: 'owner', email: 'owner@example.test' } }))
      .rejects.toThrow(ForbiddenException);
  });

  it('allows only the confirmed Supabase platform owner', async () => {
    getUserById.mockResolvedValue({ data: { user: { email: 'owner@example.test', email_confirmed_at: '2026-01-01' } }, error: null });
    const response = await controller.catalog({ user: { id: 'owner', role: 'student', email: 'owner@example.test' } });
    expect(response.reportsConnected).toBe(false);
    expect(response.liveMonitoringEnabled).toBe(false);
    expect(response.mergeAuthorized).toBe(false);
    expect(response.deployAuthorized).toBe(false);
    expect(response.agents).toHaveLength(11);
  });
});
