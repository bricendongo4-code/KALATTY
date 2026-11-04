import {
  automaticMissions,
  financialAggregates,
  missionInput,
  REVIEWERS,
  safeTaskError,
  taskResult,
} from './orchestration-model';
import { DEPARTMENTS } from './department-planner';
const input = {
  title: 'Analyser les revenus',
  objective: 'Expliquer les revenus et les dépenses du mois.',
  department: 'finance',
  priority: 'normal',
  requestKey: 'ed9ee020-0e58-4ec9-8748-cd22e24f7f65',
};
describe('Orchestration contract', () => {
  it('validates bounded owner missions and assigns another agent to all departments', () => {
    expect(missionInput(input).priority).toBe(1);
    for (const d of DEPARTMENTS) expect(REVIEWERS[d]).not.toBe(d);
    for (const patch of [
      { title: 'a' },
      { objective: 'x' },
      { objective: 'x'.repeat(2001) },
      { department: 'admin' },
      { requestKey: 'wrong' },
      { priority: 2 },
    ])
      expect(() => missionInput({ ...input, ...patch })).toThrow();
  });
  it('does not manufacture work from zero counts or healthy CI', () => {
    expect(
      automaticMissions([
        {
          department: 'finance',
          source: 'payments',
          available: true,
          count: 0,
        },
        {
          department: 'qa',
          source: 'CI',
          available: true,
          detail: 'completed/success',
        },
      ]),
    ).toEqual([]);
  });
  it('deduplicates real alerts independently of aggregate counts and input order', () => {
    const a = {
      department: 'security',
      source: 'RLS',
      available: true,
      detail: 'risk:16',
    };
    const b = {
      department: 'security',
      source: 'privacy_requests',
      available: false,
    };
    expect(automaticMissions([a, b])[0].key).toEqual(
      automaticMissions([b, { ...a, count: 999 }])[0].key,
    );
    expect(
      automaticMissions([
        {
          department: 'qa',
          source: 'CI',
          available: true,
          detail: 'completed/failure',
        },
      ]),
    ).toHaveLength(1);
  });
  it('accepts an explicit no-change outcome without trusting invented evidence', () => {
    expect(
      taskResult(
        JSON.stringify({
          outcome: 'no_change',
          summary: 'Aucune anomalie',
          recommendation: 'Aucune action justifiée.',
          evidence: [{ secret: 'fabricated' }],
        }),
      ),
    ).toEqual({
      outcome: 'no_change',
      summary: 'Aucune anomalie',
      recommendation: 'Aucune action justifiée.',
    });
    for (const raw of [
      'bad',
      '{}',
      JSON.stringify({
        outcome: 'execute',
        summary: 'Test',
        recommendation: 'Do anything',
      }),
    ])
      expect(() => taskResult(raw)).toThrow();
  });
  it('strips financial identities and unexpected error payloads', () => {
    expect(
      financialAggregates({
        grossCollectedFcfa: 500,
        teacherPhone: 'secret',
        transactionId: 'private',
        plannedExpensesFcfa: 100,
        providerFeesFcfa: '12',
      }),
    ).toEqual({ grossCollectedFcfa: 500, plannedExpensesFcfa: 100 });
    expect(safeTaskError(new Error('api_key=secret'))).not.toContain('secret');
  });
});
