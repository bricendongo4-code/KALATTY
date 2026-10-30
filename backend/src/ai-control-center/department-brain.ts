import { ServiceUnavailableException } from '@nestjs/common';
import { DEPARTMENTS, Department, Plan } from './department-planner';

const INSTRUCTIONS: Record<Department, string> = {
  security: 'Assess access and privacy governance risks. Never request credentials or propose unauthorized access.',
  qa: 'Prioritize test coverage and regression risks without changing production.',
  developer: 'Diagnose engineering priorities; code and deployment changes require review.',
  ux: 'Suggest accessibility and user journey improvements.',
  product: 'Prioritize catalog and learner outcomes with measurable evidence.',
  marketing: 'Suggest ethical campaigns without messaging users.',
  sales: 'Assess enrollment funnel without altering orders or pricing.',
  support: 'Suggest support improvements without exposing student records.',
  finance: 'Identify reconciliation questions, never initiate transfers or refunds.',
  analytics: 'Explain limitations and suggest measurable experiments.',
  crm: 'Recommend retention workflows without contacting users.',
};

export async function analyzeWithBrain(plan: Plan, fetcher: typeof fetch = fetch) {
  if (!DEPARTMENTS.includes(plan.department) || plan.state !== 'ready-for-review') {
    return { department: plan.department, status: 'blocked', reason: 'Source evidence unavailable' };
  }
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.KALATTY_AI_MODEL;
  if (!key || !model) {
    throw new ServiceUnavailableException('AI brain is not configured');
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    // The model receives only bounded aggregate counts, never raw student data.
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({
        model, store: false, max_output_tokens: 400,
        instructions: `You are Kalatty's ${plan.department} analysis agent. ${INSTRUCTIONS[plan.department]}
Return a concise French recommendation grounded ONLY in the provided aggregate evidence.
Do not invent records or claim to have executed actions. Any change needs human approval.`,
        input: JSON.stringify({ department: plan.department, evidence: plan.evidence, tasks: plan.tasks }),
      }),
    });
    if (!response.ok) throw new ServiceUnavailableException('AI provider unavailable');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('output' in result) || !Array.isArray(result.output)) {
      throw new ServiceUnavailableException('Invalid AI response');
    }
    const parts = result.output.flatMap((item: unknown) =>
      item && typeof item === 'object' && 'content' in item && Array.isArray(item.content)
        ? item.content : []);
    const analysis = parts.filter((part: unknown) =>
      part && typeof part === 'object' && 'type' in part && part.type === 'output_text' &&
      'text' in part && typeof part.text === 'string')
      .map((part: { text: string }) => part.text).join('\n').slice(0, 3000);
    if (!analysis) throw new ServiceUnavailableException('AI returned no analysis');
    return { department: plan.department, status: 'analyzed', analysis,
      evidence: plan.evidence, requiresApproval: true, executedActions: 0 };
  } catch {
    throw new ServiceUnavailableException('AI analysis failed');
  } finally {
    clearTimeout(timer);
  }
}
