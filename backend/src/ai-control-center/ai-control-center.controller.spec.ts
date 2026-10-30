import { ForbiddenException } from '@nestjs/common';
import { AiControlCenterController } from './ai-control-center.controller';

describe('AiControlCenterController', () => {
  const controller = new AiControlCenterController({} as never);

  it('rejects unauthenticated or institution administrator identities', () => {
    for (const user of [undefined, { id: 'user', role: 'admin' }, { id: 'user', role: 'teacher' }]) {
      expect(() => controller.catalog({ user })).toThrow(ForbiddenException);
    }
  });

  it('exposes only disconnected metadata to a platform administrator', () => {
    const response = controller.catalog({ user: { id: 'platform-user', role: 'platform_admin' } });
    expect(response.reportsConnected).toBe(false);
    expect(response.liveMonitoringEnabled).toBe(false);
    expect(response.mergeAuthorized).toBe(false);
    expect(response.deployAuthorized).toBe(false);
    expect(response.agents).toHaveLength(11);
    expect(response.agents.every(agent => agent.status === 'not-connected')).toBe(true);
  });
});
