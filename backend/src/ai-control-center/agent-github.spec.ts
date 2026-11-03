import { AgentGithub } from './agent-github';
import { validatePatch } from './agent-patch';
describe('approved correction publisher', () => {
  const sha = 'a'.repeat(40);
  const patch = validatePatch(
    { file: 'frontend/app/courses/page.tsx', oldText: 'old', newText: 'new' },
    'old',
    sha,
  );
  it('never writes an altered approval', async () => {
    const fetcher = jest.fn();
    await expect(
      new AgentGithub(fetcher as never).prepare('id', {
        ...patch,
        newText: 'tampered',
      }),
    ).rejects.toThrow('Empreinte');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('refuses stale code before any branch mutation', async () => {
    const g = new AgentGithub();
    jest
      .spyOn(g, 'source')
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('changed');
    const api = jest
      .spyOn(g, 'api')
      .mockImplementation(async (path) =>
        path.startsWith('pulls?') ? [] : { object: { sha } },
      );
    await expect(g.prepare('id', patch)).rejects.toThrow('changé');
    expect(api.mock.calls.every((c) => !c[1] || c[1] === 'GET')).toBe(true);
  });
  it('blocks publishing a changed branch head', async () => {
    const g = new AgentGithub();
    const api = jest.spyOn(g, 'api').mockResolvedValue({
      state: 'open',
      head: { sha: 'b'.repeat(40) },
      base: { ref: 'master' },
    });
    await expect(g.release(1, sha)).rejects.toThrow('changé');
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('requires both genuine CI jobs and blocks pending tests', async () => {
    for (const checks of [
      [],
      [
        {
          name: 'Backend quality',
          app: { slug: 'github-actions' },
          conclusion: 'success',
          status: 'completed',
        },
      ],
      ['Backend quality', 'Frontend quality'].map((name) => ({
        name,
        app: { slug: 'github-actions' },
        conclusion: null,
        status: 'in_progress',
      })),
    ]) {
      const g = new AgentGithub();
      const api = jest.spyOn(g, 'api').mockImplementation(async (path) =>
        path === 'pulls/1'
          ? {
              state: 'open',
              head: { sha: 'b'.repeat(40), ref: 'ai/approved/test' },
              base: { ref: 'master', sha },
              changed_files: 1,
            }
          : path.includes('/files?')
            ? [{ filename: patch.file, status: 'modified' }]
            : path.includes('check-runs')
              ? { total_count: checks.length, check_runs: checks }
              : { statuses: [] },
      );
      jest
        .spyOn(g, 'source')
        .mockImplementation(async (_file, ref) =>
          ref === sha ? 'old' : 'new',
        );
      await expect(g.release(1, 'b'.repeat(40), patch)).rejects.toThrow('CI');
      expect(api.mock.calls.every((c) => !c[1])).toBe(true);
    }
  });
});

describe('release exactness and successful CI', () => {
  const baseSha = 'a'.repeat(40),
    headSha = 'b'.repeat(40);
  const patch = validatePatch(
    { file: 'frontend/app/courses/page.tsx', oldText: 'old', newText: 'new' },
    'old',
    baseSha,
  );
  function fixture(extraFile = false) {
    const g = new AgentGithub();
    jest
      .spyOn(g, 'source')
      .mockImplementation(async (_file, ref) =>
        ref === headSha ? 'new' : 'old',
      );
    const api = jest
      .spyOn(g, 'api')
      .mockImplementation(async (path, method) => {
        if (method === 'PUT') return { merged: true };
        if (path === 'pulls/1')
          return {
            state: 'open',
            draft: false,
            changed_files: extraFile ? 2 : 1,
            head: { sha: headSha, ref: 'ai/approved/test' },
            base: { sha: baseSha, ref: 'master' },
          };
        if (path.includes('/files?'))
          return [{ filename: patch.file, status: 'modified' }];
        if (path.includes('check-runs'))
          return {
            total_count: 2,
            check_runs: ['Backend quality', 'Frontend quality'].map((name) => ({
              name,
              status: 'completed',
              conclusion: 'success',
              app: { slug: 'github-actions' },
            })),
          };
        return { statuses: [] };
      });
    return { g, api };
  }
  it('merges only the exact prepared head after both CI jobs succeeded', async () => {
    const { g, api } = fixture();
    await g.release(1, headSha, patch);
    expect(api).toHaveBeenCalledWith('pulls/1/merge', 'PUT', {
      sha: headSha,
      merge_method: 'squash',
    });
  });
  it('blocks an additional file even when the resulting target content matches', async () => {
    const { g, api } = fixture(true);
    await expect(g.release(1, headSha, patch)).rejects.toThrow('différente');
    expect(api.mock.calls.every((c) => !c[1])).toBe(true);
  });
});
