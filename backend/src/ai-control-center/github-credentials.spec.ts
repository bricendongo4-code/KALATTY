import { generateKeyPairSync } from 'node:crypto';
import { GithubCredentials } from './github-credentials';
import { AgentGithub } from './agent-github';
const vars = { ...process.env };
afterEach(() => {
  process.env = { ...vars };
});
test('missing credentials are accurately reported without external writes', async () => {
  delete process.env.KALATTY_AGENT_GITHUB_TOKEN;
  delete process.env.KALATTY_GITHUB_APP_ID;
  const f = jest.fn();
  expect(await new AgentGithub(f as any).diagnostic()).toMatchObject({
    configured: false,
    authenticated: false,
  });
  expect(f).not.toHaveBeenCalled();
});
test('GitHub App token is restricted to Kalatty and cached until renewal', async () => {
  delete process.env.KALATTY_AGENT_GITHUB_TOKEN;
  process.env.KALATTY_GITHUB_APP_ID = '123';
  process.env.KALATTY_GITHUB_INSTALLATION_ID = '456';
  process.env.KALATTY_GITHUB_APP_PRIVATE_KEY = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey;
  const f = jest
    .fn()
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            token: 'short-lived-fixture',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          }),
        ),
    );
  const c = new GithubCredentials(f as any);
  expect(await c.token()).toBe('short-lived-fixture');
  expect(await c.token()).toBe('short-lived-fixture');
  expect(f).toHaveBeenCalledTimes(1);
  expect(JSON.parse(f.mock.calls[0][1].body).repositories).toEqual(['KALATTY']);
});
