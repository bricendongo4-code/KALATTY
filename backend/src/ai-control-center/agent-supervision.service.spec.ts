import { AgentSupervisionService } from './agent-supervision.service';
describe('durable autonomous supervision', () => {
  it('does not poll the preparation queue separately when supervision is not due', async () => {
    jest.useFakeTimers();
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null });
    const service = new AgentSupervisionService({ client: { rpc } } as never);
    try {
      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(120000);
      expect(rpc.mock.calls.map(([name]) => name)).toEqual([
        'claim_ai_supervision',
        'claim_ai_supervision',
        'claim_ai_supervision',
      ]);
    } finally {
      service.onModuleDestroy();
      jest.useRealTimers();
    }
  });
  it('does not execute when the database lease is held or a run is not due', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null });
    const from = jest.fn();
    const service = new AgentSupervisionService({
      client: { rpc, from },
    } as never);
    expect(await service.tick()).toEqual({
      started: false,
      reason: 'not-due-or-running',
    });
    expect(from).not.toHaveBeenCalled();
  });
  it('fails closed when the durable scheduler is unavailable', async () => {
    const service = new AgentSupervisionService({
      client: {
        rpc: jest.fn().mockResolvedValue({ error: { code: 'missing' } }),
      },
    } as never);
    await expect(service.tick()).rejects.toThrow('Migration');
  });
  it('does not execute refused or unapproved patches', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    const from = jest.fn();
    const service = new AgentSupervisionService({
      client: { rpc, from },
    } as never);
    await service.prepareApproved();
    expect(rpc).toHaveBeenCalledWith('claim_ai_patch');
    expect(from).not.toHaveBeenCalled();
  });
  it('records preparation failures for retry rather than claiming success', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    const rpc = jest.fn().mockResolvedValue({
      data: [{ id: 'test', patch: { digest: 'invalid' } }],
      error: null,
    });
    const service = new AgentSupervisionService({
      client: { rpc, from: () => ({ update }) },
    } as never);
    await service.prepareApproved();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ execution_status: 'failed' }),
    );
  });
});
