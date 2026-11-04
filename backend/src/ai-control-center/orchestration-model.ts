export const TASK_RESPONSE_SCHEMA = {
  name: 'kalatty_mission_result',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['outcome', 'summary', 'recommendation'],
    properties: {
      outcome: {
        type: 'string',
        enum: ['propose_change', 'no_change', 'needs_information'],
      },
      summary: {
        type: 'string',
        description: 'Résumé en français, entre 3 et 900 caractères.',
      },
      recommendation: {
        type: 'string',
        description:
          'Une chaîne de texte en français, six rubriques séparées par des retours à la ligne, entre 10 et 3000 caractères. Aucun objet ni tableau.',
      },
    },
  },
};
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
    throw new Error(
      'Réponse IA invalide (' +
        (!r || typeof r !== 'object'
          ? 'structure absente'
          : !['propose_change', 'no_change', 'needs_information'].includes(
                r.outcome,
              )
            ? 'décision non reconnue'
            : typeof r.summary !== 'string'
              ? 'résumé non textuel'
              : r.summary.length < 3 || r.summary.length > 1200
                ? 'longueur du résumé'
                : typeof r.recommendation !== 'string'
                  ? 'explication non textuelle'
                  : 'longueur de l’explication') +
        ') : relancez la mission.',
    );
  return {
    outcome: r.outcome as 'propose_change' | 'no_change' | 'needs_information',
    summary: r.summary,
    recommendation: r.recommendation.replace(/\\n/g, '\n'),
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

/** A language model cannot dismiss a signal still present in the measured snapshot. */
export function guardMissionReview<
  T extends { outcome: string; summary: string; recommendation: string },
>(result: T, evidence: MissionEvidence[]) {
  const alerts = evidence.filter(
    (e) =>
      !e.available ||
      /\/(failure|timed_out|cancelled)$/.test(e.detail ?? '') ||
      e.detail?.startsWith('risk:'),
  );
  if (result.outcome !== 'no_change' || !alerts.length) return result;
  const proof = alerts
    .slice(0, 4)
    .map(
      (e) =>
        `${e.source.slice(0, 120)} : ${(!e.available ? 'source inaccessible' : (e.detail ?? 'signal à vérifier')).slice(0, 350)}`,
    )
    .join('; ');
  return {
    ...result,
    outcome: 'needs_information' as const,
    modelOutcome: 'no_change',
    resolutionEvidenceMissing: true,
    summary:
      'Conclusion suspendue : des alertes restent présentes dans les contrôles. Leur résolution doit être vérifiée avant de clôturer la mission.',
    recommendation: [
      '1. Constat\nLe modèle a conclu à aucun changement, mais les contrôles contiennent encore des alertes. Cette conclusion ne permet pas de clôturer la mission.',
      '2. Preuves\n' + proof,
      '3. Action proposée\nLe service responsable doit vérifier les sources signalées, puis rafraîchir la supervision pour obtenir une preuve de résolution. Les seuls compteurs d’activité ne suffisent pas à écarter un risque explicite.',
      '4. Résultat attendu\nUn contrôle récent qui confirme la résolution, ou une proposition concrète à soumettre au propriétaire si le problème persiste.',
      '5. Limites et risques\nAucune preuve de résolution n’a été fournie. Aucun changement, paiement ou message n’a été exécuté. La conclusion automatique du modèle est suspendue.',
      '6. Décision demandée\nCompléter la mission avec les éléments de vérification, actualiser les contrôles puis relancer l’analyse et son contrôle. Aucune correction ne sera publiée sans validation.',
    ].join('\n\n'),
  };
}
