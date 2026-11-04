import { agentBrainStatus, generateAgentText } from './agent-brain';
import { analyzeWithBrain } from '../ai-control-center/department-brain';
import { AgentSupervisionService } from '../ai-control-center/agent-supervision.service';
import { GrowthService } from '../agent-growth/growth.service';
const env = { ...process.env };
const request = {
  instructions: 'Instructions de test',
  input: 'Données de test',
  maxOutputTokens: 250,
};
function reply(text: string, status = 'completed') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status,
      output: [
        {
          type: 'reasoning',
          content: [
            { type: 'reasoning_text', text: 'Ignored internal reasoning' },
          ],
        },
        { type: 'message', content: [{ type: 'output_text', text }] },
      ],
    }),
  } as Response;
}
beforeEach(() => {
  process.env = {
    ...env,
    KALATTY_AI_PROVIDER: 'groq',
    GROQ_API_KEY: 'groq-test-secret',
    KALATTY_GROQ_MODEL: 'openai/gpt-oss-20b',
    OPENAI_API_KEY: 'openai-test-secret',
    KALATTY_AI_MODEL: 'legacy-openai-model',
  };
});
afterEach(() => {
  process.env = { ...env };
  jest.restoreAllMocks();
});
describe('Agent provider isolation', () => {
  it('selects the fixed Groq endpoint and its own credential; returns visible text only', async () => {
    const fetcher = jest.fn().mockResolvedValue(reply('Analyse française'));
    expect(await generateAgentText(request, fetcher)).toBe('Analyse française');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/responses');
    expect(options.redirect).toBe('error');
    expect(options.headers.Authorization).toBe('Bearer groq-test-secret');
    expect(JSON.stringify(options)).not.toContain('openai-test-secret');
    expect(JSON.parse(options.body)).toMatchObject({
      store: false,
      model: 'openai/gpt-oss-20b',
      max_output_tokens: 1024,
      reasoning: { effort: 'low' },
    });
    expect(JSON.parse(options.body).tools).toBeUndefined();
    expect(JSON.stringify(agentBrainStatus())).not.toContain('secret');
  });
  it('does not use the existing OpenAI key when the Groq key is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const fetcher = jest.fn();
    expect(agentBrainStatus().brainConfigured).toBe(false);
    await expect(generateAgentText(request, fetcher)).rejects.toThrow(
      'incomplète',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['unsupported', 'https://evil.example'])(
    'rejects an invalid provider (%s) without sending credentials',
    async (provider) => {
      process.env.KALATTY_AI_PROVIDER = provider;
      const fetcher = jest.fn();
      await expect(generateAgentText(request, fetcher)).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('rejects unvalidated Groq models', async () => {
    process.env.KALATTY_GROQ_MODEL = 'groq/compound';
    const fetcher = jest.fn();
    await expect(generateAgentText(request, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('retains the existing OpenAI request format when that provider is explicitly selected', async () => {
    process.env.KALATTY_AI_PROVIDER = 'openai';
    const fetcher = jest.fn().mockResolvedValue(reply('OK'));
    await generateAgentText(request, fetcher);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://api.openai.com/v1/responses',
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      model: 'legacy-openai-model',
      max_output_tokens: 250,
      store: false,
    });
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(
      'groq-test-secret',
    );
  });
  it.each([401, 403, 429, 500])(
    'fails once without fallback and redacts provider errors (%s)',
    async (status) => {
      const fetcher = jest.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ message: 'SECRET provider payload' }),
      });
      await expect(generateAgentText(request, fetcher)).rejects.not.toThrow(
        'SECRET',
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toContain('api.groq.com');
    },
  );
  it('does not leak network error details or try another provider', async () => {
    const fetcher = jest.fn().mockRejectedValue(Error('groq-test-secret'));
    await expect(generateAgentText(request, fetcher)).rejects.toThrow(
      'injoignable',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['incomplete', 'failed'])(
    'rejects a partial response instead of claiming an analysis (%s)',
    async (status) => {
      await expect(
        generateAgentText(
          request,
          jest.fn().mockResolvedValue(reply('partial', status)),
        ),
      ).rejects.toThrow('incomplète');
    },
  );
});
describe('All agent workflows use the selected provider and approval boundaries', () => {
  it('analyzes aggregate evidence without executing any action', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(reply('Vérifier les indicateurs de test.'));
    const result = await analyzeWithBrain(
      {
        department: 'finance',
        state: 'ready-for-review',
        evidence: [{ table: 'payments', count: 4 }],
        tasks: [],
        executedActions: 0,
      },
      fetcher,
    );
    expect(result).toMatchObject({
      status: 'analyzed',
      requiresApproval: true,
      executedActions: 0,
    });
    expect(fetcher.mock.calls[0][0]).toContain('api.groq.com');
  });
  it('does not call a model for unavailable department evidence', async () => {
    const fetcher = jest.fn();
    await expect(
      analyzeWithBrain(
        {
          department: 'finance',
          state: 'blocked',
          evidence: [],
          tasks: [],
          executedActions: 0,
        },
        fetcher,
      ),
    ).resolves.toMatchObject({ status: 'blocked' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('prepares supervision recommendations with the shared persistent quota', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const svc = new AgentSupervisionService({ client: { rpc } } as never);
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        reply(
          '{"rationale":"Indicateurs à examiner, sans transfert.","patch":null}',
        ),
      );
    expect(await (svc as any).brain('finance', [])).toMatchObject({
      patch: null,
    });
    expect(rpc).toHaveBeenCalledWith(
      'reserve_agent_ai_call',
      expect.objectContaining({ p_provider: 'groq' }),
    );
    expect(fetcher.mock.calls[0][0]).toContain('api.groq.com');
  });
  it('prepares commercial text without invoking a delivery provider', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { ai_enabled: true }, error: null }),
    };
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const svc = new GrowthService({
      client: { from: () => chain, rpc },
    } as never);
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        reply(
          'Découvrez Kalatty : https://example.org. Répondez pour ne plus être contacté.',
        ),
      );
    expect(
      await (svc as any).generateAI(
        'owner',
        { cta: 'https://example.org' },
        'Entreprise de test',
        'email',
        'Base',
      ),
    ).toContain('https://example.org');
    expect(rpc).toHaveBeenCalledWith(
      'reserve_agent_ai_call',
      expect.objectContaining({ p_provider: 'groq' }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('api.groq.com');
  });
  it('blocks diagnostic calls when the shared daily quota is unavailable', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null });
    const svc = new AgentSupervisionService({ client: { rpc } } as never);
    const fetcher = jest.spyOn(global, 'fetch');
    await expect(svc.checkBrain()).rejects.toThrow('Quota');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('tests the connection with no user data, without enabling autonomy', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const from = jest.fn();
    const svc = new AgentSupervisionService({ client: { rpc, from } } as never);
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(reply('OK'));
    expect(await svc.checkBrain()).toMatchObject({
      connected: true,
      brainProvider: 'groq',
    });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.body).toContain(
      'sans données utilisateur',
    );
  });
  it('does not enable automatic AI with a missing Groq key', async () => {
    delete process.env.GROQ_API_KEY;
    const from = jest.fn();
    const svc = new AgentSupervisionService({ client: { from } } as never);
    await expect(svc.configure(true, true)).rejects.toThrow('incomplète');
    expect(from).not.toHaveBeenCalled();
  });
});
