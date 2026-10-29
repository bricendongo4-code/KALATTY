import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const executor = new URL('./developer-execute.mjs', import.meta.url).pathname;
const file = 'backend/src/example.ts';
async function fixture({ approved = true, tamper = false, failAt = '' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'kalatty-executor-'));
  const request = { file, oldText: 'answer = 1', newText: 'answer = 2' };
  const requestPath = join(dir, 'request.json');
  const approvalPath = join(dir, 'approval.json');
  const bytes = JSON.stringify(request);
  await writeFile(requestPath, bytes);
  await writeFile(approvalPath, JSON.stringify({
    approved, file, approvedBy: 'trusted-reviewer',
    requestSha256: tamper ? 'a'.repeat(64) : createHash('sha256').update(bytes).digest('hex'),
  }));
  const harness = `
    import { readFileSync } from 'node:fs';
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
      const path = String(url).replace('https://api.github.com/repos/owner/repo/', '');
      const method = options.method || 'GET';
      calls.push(method + ' ' + path);
      if (path === process.env.FAIL_AT) return new Response('simulated failure', { status: 500 });
      let data;
      if (path === 'git/ref/heads/master') data = { object: { sha: 'a'.repeat(40) } };
      else if (path.startsWith('contents/') && method === 'GET') data = {
        type: 'file', encoding: 'base64', sha: 'b'.repeat(40),
        content: Buffer.from('const answer = 1;\\n').toString('base64')
      };
      else if (path === 'git/refs' && method === 'POST') data = { ref: 'refs/heads/ai/fix/test' };
      else if (path.startsWith('contents/') && method === 'PUT') {
        const body = JSON.parse(options.body);
        if (Buffer.from(body.content, 'base64').toString('utf8') !== 'const answer = 2;\\n') throw Error('Wrong patch content');
        data = { commit: { sha: 'c'.repeat(40) } };
      } else if (path === 'pulls' && method === 'POST') {
        const body = JSON.parse(options.body);
        if (!body.draft || body.base !== 'master') throw Error('Unsafe PR');
        data = { html_url: 'https://github.com/owner/repo/pull/123' };
      } else throw Error('Unexpected API call: ' + method + ' ' + path);
      return new Response(JSON.stringify(data), { status: 200 });
    };
    try { await import(process.env.EXECUTOR_URL); }
    finally { console.error('MOCK_CALLS=' + JSON.stringify(calls)); }
  `;
  const runner = join(dir, 'runner.mjs');
  await writeFile(runner, harness);
  const result = spawnSync(process.execPath, [runner, requestPath, approvalPath], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'fake-test-token',
      EXECUTOR_URL: 'file://' + executor, FAIL_AT: failAt },
  });
  return result;
}
test('creates only an isolated branch, single file update, and draft PR', async () => {
  const result = await fixture();
  assert.equal(result.status, 0, result.stderr);
  const calls = JSON.parse(result.stderr.split('MOCK_CALLS=')[1].split('\n')[0]);
  assert.deepEqual(calls.map(c => c.split(' ')[0]), ['GET', 'GET', 'POST', 'PUT', 'POST']);
  assert.match(result.stdout, /"draft":true/);
});
test('rejects unapproved requests before any API call', async () => {
  const result = await fixture({ approved: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MOCK_CALLS=\[\]/);
});
test('rejects tampered requests before any API call', async () => {
  const result = await fixture({ tamper: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MOCK_CALLS=\[\]/);
});
test('stops when GitHub branch creation fails', async () => {
  const result = await fixture({ failAt: 'git/refs' });
  assert.notEqual(result.status, 0);
  const calls = JSON.parse(result.stderr.split('MOCK_CALLS=')[1].split('\n')[0]);
  assert.equal(calls.length, 3);
});
