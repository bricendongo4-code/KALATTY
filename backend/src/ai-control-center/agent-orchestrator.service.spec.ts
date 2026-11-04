import { AgentOrchestratorService } from './agent-orchestrator.service';
import { generateAgentText } from '../agent-ai/agent-brain';
import { reserveAgentAiCall } from '../agent-ai/agent-budget';
jest.mock('../agent-ai/agent-brain', () => ({
  agentBrainStatus: () => ({
    brainConfigured: true,
    brainProvider: 'groq',
    brainModel: 'test',
  }),
  assertAgentBrainConfigured: jest.fn(),
  generateAgentText: jest.fn(),
}));
jest.mock('../agent-ai/agent-budget', () => ({
  agentBudget: () => ({ dailyAiCallLimit: 100 }),
  reserveAgentAiCall: jest.fn(),
}));
jest.mock('../agent-growth/platform-owner.guard', () => ({
  assertOwner: jest.fn().mockResolvedValue('owner'),
}));
function fixture(origin = 'manual', stage = 'analysis') {
  const task = {
    id: 'task',
    mission_id: 'mission',
    stage,
    department: stage === 'analysis' ? 'developer' : 'qa',
    depends_on: stage === 'review' ? 'analysis' : null,
  };
  const rpc = jest.fn(async (name: string) => ({
    data:
      name === 'claim_ai_orchestrator'
        ? true
        : name === 'claim_ai_agent_task'
          ? [task]
          : true,
    error: null,
  }));
  const updates: unknown[] = [];
  const from = jest.fn((table: string) => {
    const result = {
      data:
        table === 'profiles'
          ? { id: 'owner' }
          : table === 'ai_supervision_state'
            ? { ai_enabled: true }
            : table === 'ai_orchestrator_state'
              ? { auto_assign: false }
              : table === 'ai_supervision_runs'
                ? [
                    {
                      finished_at: new Date().toISOString(),
                      evidence: [
                        {
                          department: 'developer',
                          source: 'projects',
                          available: true,
                          count: 0,
                        },
                      ],
                    },
                  ]
                : table === 'ai_agent_missions'
                  ? {
                      id: 'mission',
                      created_by: 'owner',
                      origin,
                      department: 'developer',
                      title: 'Diagnostic',
                      objective: 'Examiner la situation',
                      context_note: '',
                    }
                  : {
                      status: 'completed',
                      result: { outcome: 'no_change', summary: 'Healthy' },
                    },
      error: null,
    };
    const q: any = {
      select: () => q,
      eq: () => q,
      order: () => q,
      limit: () => q,
      single: () => Promise.resolve(result),
      update: (v: unknown) => {
        updates.push(v);
        return q;
      },
      then: (resolve: any) => Promise.resolve(result).then(resolve),
    };
    return q;
  });
  const supervision = { tick: jest.fn() };
  const service = new AgentOrchestratorService(
    { client: { rpc, from } } as any,
    supervision as any,
  );
  return { service, rpc, updates, from, supervision };
}
describe('Durable mission worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KALATTY_PLATFORM_ADMIN_EMAIL = 'owner@example.test';
    (reserveAgentAiCall as jest.Mock).mockResolvedValue({ data: true });
    (generateAgentText as jest.Mock).mockResolvedValue(
      JSON.stringify({
        outcome: 'no_change',
        summary: 'Aucune anomalie vérifiée',
        recommendation: 'Les compteurs ne prouvent aucun défaut.',
      }),
    );
  });
  it('never calls the provider without an exclusive lease', async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: false, error: null });
    await f.service.tick();
    expect(generateAgentText).not.toHaveBeenCalled();
    expect(f.from).not.toHaveBeenCalled();
  });
  it('uses the shared manual budget and persists server evidence', async () => {
    const f = fixture();
    await f.service.tick();
    expect(reserveAgentAiCall).toHaveBeenCalledWith(expect.anything(), false);
    expect(f.rpc).toHaveBeenCalledWith(
      'finish_ai_agent_task',
      expect.objectContaining({
        p_task: 'task',
        p_error: null,
        p_result: expect.objectContaining({
          executedActions: 0,
          evidence: [
            {
              department: 'developer',
              source: 'projects',
              available: true,
              count: 0,
            },
          ],
        }),
      }),
    );
    expect(f.updates).toContainEqual(
      expect.objectContaining({ lease_owner: null, last_error: null }),
    );
  });
  it('charges automatic missions to the automatic bucket, including their review', async () => {
    const f = fixture('automatic', 'review');
    await f.service.tick();
    expect(reserveAgentAiCall).toHaveBeenCalledWith(expect.anything(), true);
    const request = (generateAgentText as jest.Mock).mock.calls[0][0];
    expect(JSON.parse(request.input).previous.outcome).toBe('no_change');
    expect(f.rpc.mock.calls.map((c) => c[0])).not.toContain(
      'approve_ai_proposal',
    );
  });
  it('blocks quota exhaustion until the next UTC day without calling the provider', async () => {
    (reserveAgentAiCall as jest.Mock).mockResolvedValue({ data: false });
    const f = fixture();
    await f.service.tick();
    expect(generateAgentText).not.toHaveBeenCalled();
    expect(f.rpc).toHaveBeenCalledWith(
      'finish_ai_agent_task',
      expect.objectContaining({
        p_result: null,
        p_error: expect.stringContaining('Quota quotidien'),
        p_retry_at: expect.stringMatching(/T00:00:00.000Z$/),
      }),
    );
  });
  it('records safe retryable failures and releases the lease', async () => {
    (generateAgentText as jest.Mock).mockRejectedValue(
      new Error('credentials=secret'),
    );
    const f = fixture();
    await f.service.tick();
    expect(f.rpc).toHaveBeenCalledWith(
      'finish_ai_agent_task',
      expect.objectContaining({
        p_error:
          'Exécution interrompue. Vérifiez la connexion et relancez la mission.',
      }),
    );
    expect(JSON.stringify(f.updates)).not.toContain('secret');
  });
  it('treats a cancelled/expired completion as uncommitted without replaying work', async () => {
    const f = fixture();
    const original = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (name: string) =>
      name === 'finish_ai_agent_task'
        ? { data: false, error: null }
        : original(name),
    );
    await f.service.tick();
    expect(generateAgentText).toHaveBeenCalledTimes(1);
    expect(
      f.rpc.mock.calls.filter((c) => c[0] === 'finish_ai_agent_task'),
    ).toHaveLength(1);
  });
});
