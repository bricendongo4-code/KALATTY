import {
  automaticMissions,
  guardMissionReview,
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

it('rejects structured or ambiguous recommendations with a safe diagnosis', () => {
  expect(() =>
    taskResult(
      JSON.stringify({
        outcome: 'propose_change',
        summary: 'Risque identifié',
        recommendation: { constat: 'hidden private contents' },
      }),
    ),
  ).toThrow('explication non textuelle');
  expect(() =>
    taskResult(
      JSON.stringify({
        outcome: 'propose_change|no_change|needs_information',
        summary: 'Risque identifié',
        recommendation: 'hidden private contents',
      }),
    ),
  ).toThrow('décision non reconnue');
  try {
    taskResult(
      JSON.stringify({
        outcome: 'propose_change',
        summary: 'secret',
        recommendation: { secret: 'private' },
      }),
    );
  } catch (e) {
    expect(String(e)).not.toContain('private');
  }
});

describe('Unresolved evidence gate', () => {
  const conclusion = {
    outcome: 'no_change',
    summary: 'Pas de risque critique',
    recommendation: 'Aucun ajustement nécessaire.',
  };
  it('does not close an explicit risk merely because the model dismisses it', () => {
    const result = guardMissionReview(conclusion, [
      {
        department: 'security',
        source: 'RLS',
        available: true,
        count: 16,
        detail: 'risk: public access without RLS',
      },
    ]);
    expect(result).toMatchObject({
      outcome: 'needs_information',
      modelOutcome: 'no_change',
      resolutionEvidenceMissing: true,
    });
    expect(result.recommendation).toContain('risk: public access without RLS');
    expect(result.recommendation).toContain('6. Décision demandée');
    expect(result.recommendation.length).toBeLessThanOrEqual(3500);
  });
  it('keeps inaccessible sources and failed checks unresolved', () => {
    for (const e of [
      { department: 'qa', source: 'GitHub', available: false },
      {
        department: 'qa',
        source: 'CI',
        available: true,
        detail: 'completed/failure',
      },
    ])
      expect(guardMissionReview(conclusion, [e]).outcome).toBe(
        'needs_information',
      );
  });
  it('preserves healthy no-change outcomes and proposed owner-reviewed changes', () => {
    expect(
      guardMissionReview(conclusion, [
        {
          department: 'finance',
          source: 'payments',
          available: true,
          count: 0,
        },
      ]),
    ).toBe(conclusion);
    const proposal = { ...conclusion, outcome: 'propose_change' };
    expect(
      guardMissionReview(proposal, [
        {
          department: 'security',
          source: 'RLS',
          available: true,
          detail: 'risk: access',
        },
      ]),
    ).toBe(proposal);
  });
  it('renders provider double-escaped line breaks as readable paragraphs', () => {
    expect(
      taskResult(
        JSON.stringify({
          ...conclusion,
          recommendation: 'Constat : preuve\\nAction : vérifier',
        }),
      ).recommendation,
    ).toBe('Constat : preuve\nAction : vérifier');
  });
});
