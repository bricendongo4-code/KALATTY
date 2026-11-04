import { OrchestrationController } from './orchestration.controller';
import { PlatformOwnerGuard } from '../agent-growth/platform-owner.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
describe('Owner mission API', () => {
  const service = {
    create: jest.fn(),
    configure: jest.fn(),
    control: jest.fn(),
    requestCycle: jest.fn(),
    status: jest.fn(),
  };
  const controller = new OrchestrationController(service as any);
  it('protects every route with JWT and confirmed platform ownership', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OrchestrationController),
    ).toEqual(expect.arrayContaining([PlatformOwnerGuard]));
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OrchestrationController),
    ).toHaveLength(2);
  });
  it('rejects malformed controls and configuration', () => {
    expect(() =>
      controller.configure({ enabled: 'true', autoAssign: true }),
    ).toThrow();
    expect(() =>
      controller.control('id', { action: 'approve', note: '' }),
    ).toThrow();
    expect(() =>
      controller.control('id', { action: 'retry', note: 'x'.repeat(1001) }),
    ).toThrow();
  });
  it('uses the authenticated owner for creation', () => {
    controller.create({ user: { id: 'owner' } }, { created_by: 'attacker' });
    expect(service.create).toHaveBeenCalledWith('owner', {
      created_by: 'attacker',
    });
  });
});
