import { agentBudget, reserveAgentAiCall } from './agent-budget';
const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});
it.each([
  ['groq', 100, 80, 20],
  ['openai', 12, 10, 2],
  ['unknown', 0, 0, 0],
])(
  'reports the %s budget without raising the OpenAI cap',
  (provider, daily, automatic, reserve) => {
    process.env.KALATTY_AI_PROVIDER = String(provider);
    expect(agentBudget()).toEqual({
      dailyAiCallLimit: daily,
      automaticDailyAiCallLimit: automatic,
      reservedManualAiCalls: reserve,
    });
  },
);
it('classifies explicit work as manual and scheduled work as automatic on the selected provider', async () => {
  process.env.KALATTY_AI_PROVIDER = 'groq';
  const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
  await reserveAgentAiCall({ rpc });
  await reserveAgentAiCall({ rpc }, true);
  expect(rpc.mock.calls).toEqual([
    ['reserve_agent_ai_call', { p_provider: 'groq', p_automatic: false }],
    ['reserve_agent_ai_call', { p_provider: 'groq', p_automatic: true }],
  ]);
});
