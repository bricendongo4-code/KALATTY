import { sign } from 'node:crypto';
export class GithubCredentials {
  private cached?: { token: string; expires: number };
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  get configured() {
    return !!(
      process.env.KALATTY_AGENT_GITHUB_TOKEN ||
      (process.env.KALATTY_GITHUB_APP_ID &&
        process.env.KALATTY_GITHUB_INSTALLATION_ID &&
        process.env.KALATTY_GITHUB_APP_PRIVATE_KEY)
    );
  }
  get mode() {
    return process.env.KALATTY_AGENT_GITHUB_TOKEN
      ? 'token'
      : this.configured
        ? 'github_app'
        : 'missing';
  }
  async token() {
    if (process.env.KALATTY_AGENT_GITHUB_TOKEN)
      return process.env.KALATTY_AGENT_GITHUB_TOKEN;
    if (!this.configured) return '';
    if (this.cached && this.cached.expires > Date.now() + 60000)
      return this.cached.token;
    const id = process.env.KALATTY_GITHUB_INSTALLATION_ID!;
    if (!/^\d+$/.test(id)) throw Error('Installation GitHub invalide');
    const now = Math.floor(Date.now() / 1000);
    const data =
      Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      ) +
      '.' +
      Buffer.from(
        JSON.stringify({
          iat: now - 60,
          exp: now + 540,
          iss: process.env.KALATTY_GITHUB_APP_ID,
        }),
      ).toString('base64url');
    let signature: string;
    try {
      signature = sign(
        'RSA-SHA256',
        Buffer.from(data),
        process.env.KALATTY_GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      ).toString('base64url');
    } catch {
      throw Error('Clé GitHub App invalide');
    }
    const r = await this.fetcher(
      'https://api.github.com/app/installations/' + id + '/access_tokens',
      {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
          Authorization: 'Bearer ' + data + '.' + signature,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositories: ['KALATTY'],
          permissions: {
            contents: 'write',
            pull_requests: 'write',
            checks: 'read',
            actions: 'read',
          },
        }),
      },
    );
    if (!r.ok)
      throw Error('Authentification GitHub App refusée (' + r.status + ')');
    const b = await r.json();
    if (
      typeof b.token !== 'string' ||
      !Number.isFinite(Date.parse(b.expires_at))
    )
      throw Error('Jeton GitHub App invalide');
    this.cached = { token: b.token, expires: Date.parse(b.expires_at) };
    return b.token;
  }
}
