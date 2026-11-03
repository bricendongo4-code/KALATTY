import { GithubCredentials } from './github-credentials';
import { AgentPatch, patchDigest, validatePatch } from './agent-patch';

export class AgentGithub {
  private readonly repo = 'bricendongo4-code/KALATTY';
  private readonly credentials: GithubCredentials;
  constructor(private readonly fetcher: typeof fetch = fetch) {
    this.credentials = new GithubCredentials(fetcher);
  }
  get writable() {
    return this.credentials.configured;
  }
  async api(path: string, method = 'GET', body?: unknown): Promise<any> {
    if (method !== 'GET' && !this.writable)
      throw Error('Accès GitHub des agents non configuré');
    const token = await this.credentials.token();
    const res = await this.fetcher(
      `https://api.github.com/repos/${this.repo}/${path}`,
      {
        method,
        signal: AbortSignal.timeout(20000),
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!res.ok) throw Error(`GitHub ${res.status}`);
    return res.status === 204 ? {} : res.json();
  }
  async diagnostic() {
    if (!this.writable)
      return {
        configured: false,
        authenticated: false,
        mode: this.credentials.mode,
        repositoryWritable: false,
        message:
          'Ajoutez un jeton limité au dépôt ou les identifiants de votre GitHub App dans Railway.',
      };
    try {
      const repo = await this.api('');
      await this.api('git/ref/heads/master');
      return {
        configured: true,
        authenticated: true,
        mode: this.credentials.mode,
        repositoryWritable: repo.permissions?.push === true,
        message:
          repo.permissions?.push === true
            ? 'Dépôt accessible en écriture. Les permissions PR seront vérifiées lors de la préparation.'
            : 'Lecture vérifiée ; droits d’écriture non confirmés.',
      };
    } catch {
      return {
        configured: true,
        authenticated: false,
        mode: this.credentials.mode,
        repositoryWritable: false,
        message:
          'Accès au dépôt refusé ou indisponible. Vérifiez les permissions et la validité des identifiants.',
      };
    }
  }
  async source(file: string, ref: string) {
    const data = await this.api(
      `contents/${file}?ref=${encodeURIComponent(ref)}`,
    );
    if (data.type !== 'file' || data.encoding !== 'base64' || data.size > 60000)
      throw Error('Source indisponible ou trop volumineuse');
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  async prepare(id: string, patch: AgentPatch) {
    if (patch.digest !== patchDigest(patch))
      throw Error('Empreinte de correction incorrecte');
    const original = await this.source(patch.file, patch.baseSha);
    validatePatch(patch, original, patch.baseSha);
    const branch = `ai/approved/${id}`;
    const existing = await this.api(
      `pulls?head=bricendongo4-code:${branch}&state=all`,
    );
    if (existing.length) {
      await this.verifyChange(existing[0].number, existing[0].head.sha, patch);
      return {
        branch_name: branch,
        pull_request_url: existing[0].html_url,
        pull_request_number: existing[0].number,
        result_sha: existing[0].head.sha,
      };
    }
    // Never silently apply an old proposal to changed production code.
    const head = await this.api('git/ref/heads/master');
    if ((await this.source(patch.file, head.object.sha)) !== original)
      throw Error('Le fichier a changé : nouvelle analyse requise');
    const base = await this.api(`git/commits/${head.object.sha}`);
    const tree = await this.api('git/trees', 'POST', {
      base_tree: base.tree.sha,
      tree: [
        {
          path: patch.file,
          mode: '100644',
          type: 'blob',
          content: original.replace(patch.oldText, patch.newText),
        },
      ],
    });
    const commit = await this.api('git/commits', 'POST', {
      message: `fix(agents): correction approuvée ${id}`,
      tree: tree.sha,
      parents: [head.object.sha],
    });
    try {
      await this.api('git/refs', 'POST', {
        ref: `refs/heads/${branch}`,
        sha: commit.sha,
      });
    } catch (error) {
      // Recovery may find an existing branch; accept only the exact proposed file.
      const ref = await this.api(`git/ref/heads/${branch}`);
      if (
        (await this.source(patch.file, ref.object.sha)) !==
        original.replace(patch.oldText, patch.newText)
      )
        throw error;
    }
    const pr = await this.api('pulls', 'POST', {
      title: `Correction validée — ${patch.file}`,
      head: branch,
      base: 'master',
      draft: true,
      body: `Correction approuvée dans le Control Center.\n\nProposition : ${id}\nEmpreinte : ${patch.digest}\n\nVérifier la CI avant publication depuis le Control Center. Aucun déploiement automatique par cet agent.`,
    });
    await this.verifyChange(pr.number, pr.head.sha, patch);
    return {
      branch_name: branch,
      pull_request_url: pr.html_url,
      pull_request_number: pr.number,
      result_sha: pr.head.sha,
    };
  }
  private async verifyChange(number: number, sha: string, patch: AgentPatch) {
    if (patch.digest !== patchDigest(patch))
      throw Error('Empreinte de correction incorrecte');
    const pr = await this.api(`pulls/${number}`);
    const files = await this.api(`pulls/${number}/files?per_page=2`);
    if (
      pr.head.sha !== sha ||
      pr.base.ref !== 'master' ||
      pr.changed_files !== 1 ||
      files.length !== 1 ||
      files[0].filename !== patch.file ||
      files[0].status !== 'modified'
    )
      throw Error('Correction GitHub différente de la proposition approuvée');
    const original = await this.source(patch.file, patch.baseSha);
    validatePatch(patch, original, patch.baseSha);
    if (
      (await this.source(patch.file, pr.base.sha)) !== original ||
      (await this.source(patch.file, sha)) !==
        original.replace(patch.oldText, patch.newText)
    )
      throw Error('Correction GitHub différente de la proposition approuvée');
  }
  async release(number: number, expectedSha: string, patch?: AgentPatch) {
    const pr = await this.api(`pulls/${number}`);
    if (pr.merged && pr.head.sha === expectedSha) return;
    if (
      pr.state !== 'open' ||
      pr.head.sha !== expectedSha ||
      pr.base.ref !== 'master' ||
      !pr.head.ref.startsWith('ai/approved/')
    )
      throw Error('La correction a changé ou ne peut plus être publiée');
    if (!patch) throw Error('Correction approuvée absente');
    await this.verifyChange(number, expectedSha, patch);
    const [checks, statuses] = await Promise.all([
      this.api(`commits/${expectedSha}/check-runs?per_page=100`),
      this.api(`commits/${expectedSha}/status?per_page=100`),
    ]);
    const runs = checks.check_runs ?? [];
    const required = ['Backend quality', 'Frontend quality'];
    if (
      checks.total_count > 100 ||
      !required.every((name) =>
        runs.some(
          (r: any) =>
            r.name === name &&
            r.conclusion === 'success' &&
            r.app?.slug === 'github-actions',
        ),
      ) ||
      runs.some(
        (r: any) =>
          r.status !== 'completed' ||
          !['success', 'skipped', 'neutral'].includes(r.conclusion),
      ) ||
      (statuses.statuses?.length && statuses.state !== 'success')
    )
      throw Error('Les vérifications CI requises ne sont pas toutes réussies');
    if (pr.draft) {
      const ready = await this.fetcher('https://api.github.com/graphql', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${await this.credentials.token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query:
            'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id}}}',
          variables: { id: pr.node_id },
        }),
      });
      const result = await ready.json();
      if (!ready.ok || result.errors?.length)
        throw Error('Impossible de préparer la publication GitHub');
    }
    const result = await this.api(`pulls/${number}/merge`, 'PUT', {
      sha: expectedSha,
      merge_method: 'squash',
    });
    if (!result.merged) throw Error('Fusion refusée par GitHub');
  }
}
