import { DEPARTMENTS, planDepartments } from './department-planner';

describe('department work planner', () => {
  it('builds eleven evidence-backed approval-only work plans', () => {
    const plans = planDepartments(DEPARTMENTS.map(department => ({
      department, available: true,
      sources: [{ table: 'courses', available: true, count: 12 }],
    })));
    expect(plans).toHaveLength(11);
    expect(plans.every(p => p.state === 'ready-for-review')).toBe(true);
    expect(plans.every(p => p.tasks.length === 1 && p.tasks[0].requiresApproval)).toBe(true);
    expect(plans.every(p => p.executedActions === 0)).toBe(true);
  });

  it('blocks missing and invalid source evidence without inventing counts', () => {
    const plans = planDepartments([{
      department: 'security', available: true,
      sources: [{ table: 'privacy_requests', available: true, count: -1 }],
    }]);
    expect(plans).toHaveLength(11);
    expect(plans.every(p => p.state === 'blocked' && p.tasks.length === 0)).toBe(true);
  });
});
