import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DEPARTMENTS, Department } from './department-planner';
export type MissionInput = {
  title: string;
  objective: string;
  department: Department;
  priority: number;
  requestKey: string;
};
export type MissionEvidence = {
  department: string;
  source: string;
  available: boolean;
  count?: number;
  detail?: string;
};
export const REVIEWERS: Record<Department, Department> = {
  security: 'qa',
  qa: 'developer',
  developer: 'qa',
  ux: 'qa',
  product: 'qa',
  marketing: 'sales',
  sales: 'marketing',
  support: 'product',
  finance: 'analytics',
  analytics: 'qa',
  crm: 'support',
};
export function missionInput(value: any): MissionInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Mission invalide.');
  const { title, objective, department, priority, requestKey } = value;
  if (
    typeof title !== 'string' ||
    title.trim().length < 3 ||
    title.trim().length > 160 ||
    typeof objective !== 'string' ||
    objective.trim().length < 10 ||
    objective.trim().length > 2000 ||
    !DEPARTMENTS.includes(department) ||
    !['normal', 'high'].includes(priority) ||
    typeof requestKey !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestKey,
    )
  )
    throw new BadRequestException(
      'Vérifiez le titre, l’objectif, le département et la priorité.',
    );
  return {
    title: title.trim(),
    objective: objective.trim(),
    department,
    priority: priority === 'high' ? 2 : 1,
    requestKey,
  };
}
export function taskResult(raw: string) {
  let r: any;
  try {
    r = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/, '')
        .replace(/\s*```$/, ''),
    );
  } catch {
    throw new Error('Réponse IA incomplète : relancez la mission.');
  }
  if (
    !r ||
    !['propose_change', 'no_change', 'needs_information'].includes(r.outcome) ||
    typeof r.summary !== 'string' ||
    r.summary.length < 3 ||
    r.summary.length > 1200 ||
    typeof r.recommendation !== 'string' ||
    r.recommendation.length < 10 ||
    r.recommendation.length > 3500
  )
    throw new Error('Réponse IA invalide : relancez la mission.');
  return {
    outcome: r.outcome as 'propose_change' | 'no_change' | 'needs_information',
    summary: r.summary,
    recommendation: r.recommendation,
  };
}
/** Counts, including zero, are activity indicators and never sufficient evidence of a defect. */
export function automaticMissions(evidence: MissionEvidence[]) {
  return DEPARTMENTS.flatMap((department) => {
    const alerts = evidence
      .filter(
        (e) =>
          e.department === department &&
          (!e.available ||
            /\/(failure|timed_out|cancelled)$/.test(e.detail ?? '') ||
            e.detail?.startsWith('risk:')),
      )
      .map(({ source, available, detail }) => ({ source, available, detail }))
      .sort((a, b) => a.source.localeCompare(b.source));
    if (!alerts.length) return [];
    return [
      {
        department,
        priority: department === 'security' ? 2 : 1,
        title: `Examiner les alertes : ${department}`,
        objective:
          'Examiner les alertes vérifiées de supervision. Expliquer leur impact, distinguer une source inaccessible d’un défaut confirmé et proposer une action seulement si les preuves le justifient.',
        key:
          'signal:' +
          department +
          ':' +
          createHash('sha256').update(JSON.stringify(alerts)).digest('hex'),
      },
    ];
  });
}
export function safeTaskError(error: unknown) {
  // Only application-owned error messages; never serialize SDK errors, request bodies or credentials.
  const message = error instanceof Error ? error.message : '';
  if (
    /^(Limite du fournisseur IA|Fournisseur IA injoignable|Connexion IA incomplète|Réponse IA (incomplète|invalide)|Quota quotidien atteint|Données de supervision indisponibles|Totaux financiers indisponibles)/.test(
      message,
    )
  )
    return message.slice(0, 500);
  return 'Exécution interrompue. Vérifiez la connexion et relancez la mission.';
}
export function financialAggregates(value: any) {
  const keys = [
    'grossCollectedFcfa',
    'kalattyRevenueFcfa',
    'teacherShareFcfa',
    'paidExpensesFcfa',
    'plannedExpensesFcfa',
    'providerFeesFcfa',
    'unknownProviderFees',
    'operatingResultFcfa',
    'unverifiedPaidCount',
    'reservedPayoutsFcfa',
    'teacherLiabilityFcfa',
  ];
  return Object.fromEntries(
    keys
      .filter(
        (k) => typeof value?.[k] === 'number' && Number.isFinite(value[k]),
      )
      .map((k) => [k, value[k]]),
  );
}
