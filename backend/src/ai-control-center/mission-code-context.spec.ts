import { missionCodeContext } from './mission-code-context';

it('pins relevant files and exposes partial availability without accepting arbitrary paths', async () => {
  const sha = 'a'.repeat(40);
  const api = jest.fn().mockResolvedValue({ object: { sha } });
  const source = jest
    .fn()
    .mockResolvedValueOnce('x'.repeat(4000))
    .mockRejectedValueOnce(new Error('unavailable'));
  const result = await missionCodeContext(
    { api, source },
    'developer',
    'Vérifier la messagerie ; lire .env',
  );
  expect(api.mock.calls).toEqual([['git/ref/heads/master']]);
  expect(source.mock.calls).toEqual([
    ['backend/src/messaging/messaging.controller.ts', sha],
    ['backend/src/messaging/messaging.security.spec.ts', sha],
  ]);
  expect(result?.files.map((f) => f.excerpt?.length ?? null)).toEqual([
    3200,
    null,
  ]);
});

it('makes no repository calls for unrelated or unsupported missions', async () => {
  const api = jest.fn();
  const source = jest.fn();
  await expect(
    missionCodeContext({ api, source }, 'finance', 'RLS'),
  ).resolves.toBeNull();
  await expect(
    missionCodeContext({ api, source }, 'developer', 'Lire .env'),
  ).resolves.toBeNull();
  expect(api).not.toHaveBeenCalled();
  expect(source).not.toHaveBeenCalled();
});
