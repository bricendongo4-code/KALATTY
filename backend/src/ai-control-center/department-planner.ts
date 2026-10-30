/**
 * Bounded, deterministic action planning for the eleven Kalatty departments.
 * No production mutations or customer-facing side effects.
 */
export const DEPARTMENTS = ['security','qa','developer','ux','product','marketing',
  'sales','support','finance','analytics','crm'] as const;
export type Department = typeof DEPARTMENTS[number];
export type Signal = { table: string; available: boolean; count?: number };
export type DepartmentSignals = { department: string; sources: (Signal | undefined)[]; available: boolean };
export type Plan = {
  department: Department;
  state: 'ready-for-review' | 'blocked';
  evidence: { table: string; count: number }[];
  tasks: { key: string; title: string; priority: 'normal' | 'high'; requiresApproval: true }[];
  executedActions: 0;
};
const TASKS: Record<Department, { key: string; title: string }> = {
  security: { key: 'audit-access', title: 'Review privacy request and account governance indicators' },
  qa: { key: 'review-submissions', title: 'Review assignment submission and activity coverage' },
  developer: { key: 'review-studio', title: 'Review studio generation failures and project activity' },
  ux: { key: 'review-journeys', title: 'Review learner progression and saved course adoption' },
  product: { key: 'review-catalog', title: 'Review course catalog completeness and lessons' },
  marketing: { key: 'review-reviews', title: 'Review feedback and course interest signals' },
  sales: { key: 'review-conversion', title: 'Review enrollment and payment conversion signals' },
  support: { key: 'review-questions', title: 'Review unanswered questions and privacy requests' },
  finance: { key: 'review-payments', title: 'Reconcile payment counts with trusted billing records' },
  analytics: { key: 'review-funnel', title: 'Review course engagement and enrollment funnel' },
  crm: { key: 'review-retention', title: 'Review account and enrollment retention signals' },
};
export function planDepartments(input: DepartmentSignals[]): Plan[] {
  const byName = new Map(input.map(x => [x.department, x]));
  return DEPARTMENTS.map(department => {
    const source = byName.get(department);
    const complete = !!source?.available && !!source.sources.length &&
      source.sources.every(s => s?.available && Number.isSafeInteger(s.count) && (s.count ?? -1) >= 0);
    const evidence = complete ? source!.sources.map(s => ({ table: s!.table, count: s!.count! })) : [];
    return {
      department, state: complete ? 'ready-for-review' : 'blocked',
      evidence,
      tasks: complete ? [{ ...TASKS[department], priority: 'normal', requiresApproval: true }] : [],
      executedActions: 0,
    };
  });
}
