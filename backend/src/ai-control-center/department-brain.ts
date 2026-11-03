import { generateAgentText } from '../agent-ai/agent-brain';
import { ServiceUnavailableException } from '@nestjs/common';
import { DEPARTMENTS, Department, Plan } from './department-planner';
import { PROPOSAL_EXPLANATION } from './proposal-explanation';

const INSTRUCTIONS: Record<Department, string> = {
  security:
    'Assess access and privacy governance risks. Never request credentials or propose unauthorized access.',
  qa: 'Prioritize test coverage and regression risks without changing production.',
  developer:
    'Diagnose engineering priorities; code and deployment changes require review.',
  ux: 'Suggest accessibility and user journey improvements.',
  product: 'Prioritize catalog and learner outcomes with measurable evidence.',
  marketing: 'Suggest ethical campaigns without messaging users.',
  sales: 'Assess enrollment funnel without altering orders or pricing.',
  support: 'Suggest support improvements without exposing student records.',
  finance:
    'Identify reconciliation questions, never initiate transfers or refunds.',
  analytics: 'Explain limitations and suggest measurable experiments.',
  crm: 'Recommend retention workflows without contacting users.',
};

export async function analyzeWithBrain(
  plan: Plan,
  fetcher: typeof fetch = fetch,
) {
  if (
    !DEPARTMENTS.includes(plan.department) ||
    plan.state !== 'ready-for-review'
  ) {
    return {
      department: plan.department,
      status: 'blocked',
      reason: 'Source evidence unavailable',
    };
  }
  try {
    // Only bounded aggregate counts are sent, never raw student data.
    const analysis = (
      await generateAgentText(
        {
          instructions: `You are Kalatty's ${plan.department} analysis agent. ${INSTRUCTIONS[plan.department]}
Ground the recommendation ONLY in the provided aggregate evidence. No code patch is attached to this analysis.
Do not invent records or claim to have executed actions. Any change needs human approval.
${PROPOSAL_EXPLANATION}`,
          input: JSON.stringify({
            department: plan.department,
            evidence: plan.evidence,
            tasks: plan.tasks,
          }),
          maxOutputTokens: 850,
          timeoutMs: 15000,
        },
        fetcher,
      )
    ).slice(0, 3000);
    return {
      department: plan.department,
      status: 'analyzed',
      analysis,
      evidence: plan.evidence,
      requiresApproval: true,
      executedActions: 0,
    };
  } catch (error) {
    if (error instanceof ServiceUnavailableException) throw error;
    throw new ServiceUnavailableException('AI analysis failed');
  }
}
