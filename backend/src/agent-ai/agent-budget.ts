import { agentBrainStatus } from './agent-brain';

/** Must match reserve_agent_ai_call's fail-closed provider limits. */
export function agentBudget() {
  const provider = agentBrainStatus().brainProvider;
  const dailyAiCallLimit =
    provider === 'groq' ? 100 : provider === 'openai' ? 12 : 0;
  const automaticDailyAiCallLimit =
    provider === 'groq' ? 80 : provider === 'openai' ? 10 : 0;
  return {
    dailyAiCallLimit,
    automaticDailyAiCallLimit,
    reservedManualAiCalls: dailyAiCallLimit - automaticDailyAiCallLimit,
  };
}

export function reserveAgentAiCall(
  db: { rpc: (...args: any[]) => any },
  automatic = false,
) {
  return db.rpc('reserve_agent_ai_call', {
    p_provider: agentBrainStatus().brainProvider,
    p_automatic: automatic,
  });
}
