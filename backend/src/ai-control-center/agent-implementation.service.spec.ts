import { AgentImplementationService } from './agent-implementation.service';
import * as brain from '../agent-ai/agent-brain';

const originalEnv = { ...process.env };
const file = 'frontend/app/courses/page.tsx';
const sha = 'a'.repeat(40);
function setup(
  options: { job?: boolean; existing?: boolean; quotas?: boolean[] } = {},
) {
  const updates: any[] = [],
    inserts: any[] = [];
  const job = {
    id: 'parent',
    department: 'ux',
    title: 'Clarifier le titre',
    rationale: 'Le titre est incomplet.',
    decided_by: 'owner',
    evidence: [],
    execution_claimed_at: '2026-11-03T10:00:00Z',
  };
  const rpc = jest.fn(async (name: string) => ({
    data:
      name === 'claim_ai_implementation'
        ? options.job === false
          ? []
          : [job]
        : (options.quotas?.shift() ?? true),
    error: null,
  }));
  const from = jest.fn(() => {
    const q: any = {
      select: () => q,
      eq: () => q,
      update: (values: any) => {
        updates.push(values);
        return q;
      },
      insert: (values: any) => {
        inserts.push(values);
        return q;
      },
      maybeSingle: async () => ({
        data: options.existing ? { id: 'child' } : null,
        error: null,
      }),
      single: async () => ({ data: { id: 'child' }, error: null }),
      then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
    };
    return q;
  });
  const service = new AgentImplementationService({
    client: { rpc, from },
  } as never);
  const github = {
    writable: true,
    api: jest.fn(async (path: string) =>
      path.startsWith('git/ref')
        ? { object: { sha } }
        : {
            tree: [
              { path: file, size: 100, type: 'blob' },
              {
                path: 'backend/src/auth/auth.service.ts',
                size: 20,
                type: 'blob',
              },
            ],
          },
    ),
    source: jest.fn(async () => 'const title = "Cours";'),
  };
  (service as any).github = github;
  const generate = jest
    .spyOn(brain, 'generateAgentText')
    .mockResolvedValueOnce(JSON.stringify({ file }))
    .mockResolvedValueOnce(
      JSON.stringify({
        rationale: 'Clarifier le titre, changement exact à approuver.',
        patch: { file, oldText: '"Cours"', newText: '"Tous les cours"' },
      }),
    );
  return { service, updates, inserts, rpc, from, github, generate };
}
beforeEach(() => {
  process.env.KALATTY_AI_PROVIDER = 'groq';
  process.env.KALATTY_GROQ_MODEL = 'openai/gpt-oss-20b';
  process.env.GROQ_API_KEY = 'test-only';
});
afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

it('does no work without an owner-approved queue claim', async () => {
  const s = setup({ job: false });
  expect(await s.service.prepareOne()).toEqual({ started: false });
  expect(s.from).not.toHaveBeenCalled();
  expect(s.generate).not.toHaveBeenCalled();
});
it('recovers an existing child after a crash without spending quota or creating another patch', async () => {
  const s = setup({ existing: true });
  expect(await s.service.prepareOne()).toMatchObject({ prepared: true });
  expect(s.rpc).toHaveBeenCalledTimes(1);
  expect(s.inserts).toHaveLength(0);
  expect(s.generate).not.toHaveBeenCalled();
  expect(s.updates.at(-1)).toMatchObject({
    execution_status: 'review_ready',
    implementation_proposal_id: 'child',
  });
});
it('creates an exact pending patch linked to the recommendation, with no repository mutation', async () => {
  const s = setup();
  expect(await s.service.prepareOne()).toMatchObject({ prepared: true });
  expect(
    s.rpc.mock.calls.filter(([name]) => name === 'reserve_agent_ai_call'),
  ).toHaveLength(2);
  expect(s.inserts[0]).toMatchObject({
    status: 'pending',
    execution_status: 'awaiting_approval',
    source_key: 'implementation:parent',
    created_by: 'owner',
    patch: { file, baseSha: sha },
  });
  expect(s.inserts[0].patch.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(s.github.api.mock.calls.every((args) => args.length === 1)).toBe(true);
  expect(s.generate.mock.calls[0][0].input).not.toContain('auth.service');
  expect(s.updates.at(-1).execution_status).toBe('review_ready');
});
it.each([[false], [true, false]])(
  'records a clear quota block at either planning step (%j)',
  async (...quotas) => {
    const s = setup({ quotas: quotas as boolean[] });
    expect(await s.service.prepareOne()).toMatchObject({ prepared: false });
    expect(s.inserts).toHaveLength(0);
    expect(s.updates.at(-1)).toMatchObject({
      execution_status: 'blocked',
      execution_error: expect.stringContaining('Quota'),
    });
  },
);
it('does not call a model or GitHub with a missing AI key', async () => {
  const s = setup();
  delete process.env.GROQ_API_KEY;
  await s.service.prepareOne();
  expect(s.generate).not.toHaveBeenCalled();
  expect(s.github.api).not.toHaveBeenCalled();
  expect(s.updates.at(-1).execution_status).toBe('blocked');
});
it('blocks without spending quota when GitHub is not connected', async () => {
  const s = setup();
  s.github.writable = false;
  await s.service.prepareOne();
  expect(s.rpc).toHaveBeenCalledTimes(1);
  expect(s.generate).not.toHaveBeenCalled();
  expect(s.updates.at(-1).execution_error).toContain('GitHub non configuré');
});
it.each([null, 'backend/src/auth/auth.service.ts', '../../secrets'])(
  'rejects unsupported or unlisted actions before reading a file (%s)',
  async (target) => {
    const s = setup();
    s.generate.mockReset().mockResolvedValue(JSON.stringify({ file: target }));
    await s.service.prepareOne();
    expect(s.github.source).not.toHaveBeenCalled();
    expect(s.inserts).toHaveLength(0);
    expect(s.updates.at(-1).execution_status).toBe('blocked');
  },
);
it('rejects a model patch that does not match the actual source', async () => {
  const s = setup();
  s.generate
    .mockReset()
    .mockResolvedValueOnce(JSON.stringify({ file }))
    .mockResolvedValueOnce(
      JSON.stringify({
        rationale: 'Test',
        patch: { file, oldText: 'absent', newText: 'new' },
      }),
    );
  await s.service.prepareOne();
  expect(s.inserts).toHaveLength(0);
  expect(s.updates.at(-1).execution_error).toContain('invalide');
});
it('does not persist raw provider or repository errors', async () => {
  const s = setup();
  s.github.api.mockRejectedValueOnce(Error('SECRET raw response'));
  await s.service.prepareOne();
  expect(JSON.stringify(s.updates)).not.toContain('SECRET');
  expect(s.inserts).toHaveLength(0);
});
