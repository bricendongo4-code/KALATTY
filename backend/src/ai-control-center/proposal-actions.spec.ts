import { AiControlCenterController } from './ai-control-center.controller';
const id = '00000000-0000-4000-8000-000000000001';
const previousEmail = process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
function setup(patch: unknown = null, found = true) {
  const rpc = jest.fn().mockResolvedValue({
    data: found ? [{ id, patch, status: 'approved' }] : [],
    error: null,
  });
  const supervision = {
    prepareRecommendation: jest.fn().mockResolvedValue({}),
    prepareApproved: jest.fn().mockResolvedValue({}),
  };
  const getUserById = jest.fn().mockResolvedValue({
    data: {
      user: { email: 'owner@example.test', email_confirmed_at: '2026-01-01' },
    },
  });
  const controller = new AiControlCenterController(
    { client: { rpc, auth: { admin: { getUserById } } } } as never,
    supervision as never,
  );
  return { controller, rpc, supervision };
}
beforeEach(() => {
  process.env.KALATTY_PLATFORM_ADMIN_EMAIL = 'owner@example.test';
});
afterAll(() => {
  if (previousEmail === undefined)
    delete process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
  else process.env.KALATTY_PLATFORM_ADMIN_EMAIL = previousEmail;
});
const request = { user: { id: 'owner', email: 'owner@example.test' } };
it('keeps legacy acknowledgement requests from starting new preparation', async () => {
  const s = setup();
  expect(
    await s.controller.decideProposal(request, id, { decision: 'approved' }),
  ).toMatchObject({ preparationQueued: false });
  expect(s.supervision.prepareRecommendation).not.toHaveBeenCalled();
  expect(s.rpc).toHaveBeenCalledWith(
    'decide_ai_proposal',
    expect.objectContaining({ p_decision: 'approved' }),
  );
});
it('starts preparation when the owner approves a recommendation without a patch', async () => {
  const s = setup();
  expect(
    await s.controller.decideProposal(request, id, {
      decision: 'approved',
      prepareImplementation: true,
    }),
  ).toMatchObject({
    preparationQueued: true,
    correctionQueued: false,
    productionModified: false,
  });
  expect(s.rpc).toHaveBeenCalledWith('decide_ai_proposal', {
    p_id: id,
    p_owner: 'owner',
    p_decision: 'approved_prepare',
    p_note: null,
  });
  expect(s.supervision.prepareRecommendation).toHaveBeenCalledTimes(1);
  expect(s.supervision.prepareApproved).not.toHaveBeenCalled();
});
it('queues only the existing patch when its exact change is approved', async () => {
  const s = setup({ file: 'frontend/app/courses/page.tsx' });
  expect(
    await s.controller.decideProposal(request, id, { decision: 'approved' }),
  ).toMatchObject({ preparationQueued: false, correctionQueued: true });
  expect(s.supervision.prepareApproved).toHaveBeenCalledTimes(1);
  expect(s.supervision.prepareRecommendation).not.toHaveBeenCalled();
});
it.each(['rejected', 'revision_requested'])(
  'never starts preparation for %s decisions',
  async (decision) => {
    const s = setup();
    await s.controller.decideProposal(request, id, {
      decision,
      note: 'Préciser les preuves',
    });
    expect(s.supervision.prepareRecommendation).not.toHaveBeenCalled();
    expect(s.supervision.prepareApproved).not.toHaveBeenCalled();
    expect(s.rpc).toHaveBeenCalledTimes(1);
  },
);
it('does not queue a proposal that is no longer pending', async () => {
  const s = setup(null, false);
  await expect(
    s.controller.decideProposal(request, id, { decision: 'approved' }),
  ).rejects.toThrow('not pending');
  expect(s.supervision.prepareRecommendation).not.toHaveBeenCalled();
});
it('rejects a non-owner before changing or queuing a proposal', async () => {
  const s = setup();
  await expect(
    s.controller.decideProposal(
      { user: { id: 'other', email: 'other@example.test' } },
      id,
      { decision: 'approved' },
    ),
  ).rejects.toThrow('administrator');
  expect(s.rpc).not.toHaveBeenCalled();
  expect(s.supervision.prepareRecommendation).not.toHaveBeenCalled();
});
