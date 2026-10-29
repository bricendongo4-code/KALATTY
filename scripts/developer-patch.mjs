#!/usr/bin/env node
/**
 * Developer Agent v2 — controlled patch preparation.
 * Produces a minimal unified diff for one explicit allowlisted source file.
 * Never writes repository files, pushes branches, or deploys.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve, isAbsolute, sep } from 'node:path';

const [requestFile = 'developer-reports/patch-request.json', outputDir = 'developer-reports'] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestFile, 'utf8'));
const root = process.cwd();
const file = String(request.file ?? '');
const oldText = request.oldText;
const newText = request.newText;
if (!/^(frontend|backend)\/[^\0\r\n]+\.(ts|tsx|js|jsx|css)$/.test(file) || file.includes('..') || file.includes('\\') || isAbsolute(file)) {
  throw new Error('Refusing non-allowlisted source path');
}
if (typeof oldText !== 'string' || typeof newText !== 'string' || !oldText || oldText === newText || oldText.length > 5000 || newText.length > 5000) {
  throw new Error('Expected a bounded nonempty exact replacement');
}
const path = resolve(root, file);
if (relative(root, path).startsWith('..' + sep)) throw new Error('Path traversal rejected');
const original = await readFile(path, 'utf8');
const matches = original.split(oldText).length - 1;
if (matches !== 1) throw new Error(`Expected exactly one occurrence, got ${matches}`);
const updated = original.replace(oldText, newText);
if (updated === original) throw new Error('No changes produced');
const lines = text => text.split('\n').map(s => s.replace(/\r$/, ''));
const before = lines(original), after = lines(updated);
let prefix = 0;
while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
let suffix = 0;
while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
const context = 3;
const start = Math.max(0, prefix - context);
const oldEnd = Math.min(before.length, before.length - suffix + context);
const newEnd = Math.min(after.length, after.length - suffix + context);
const commonPrefix = before.slice(start, prefix).map(s => ' ' + s);
const commonSuffix = before.slice(before.length - suffix, oldEnd).map(s => ' ' + s);
const removed = before.slice(prefix, before.length - suffix).map(s => '-' + s);
const added = after.slice(prefix, after.length - suffix).map(s => '+' + s);
const patch = [
  `--- a/${file}`,
  `+++ b/${file}`,
  `@@ -${start + 1},${oldEnd - start} +${start + 1},${newEnd - start} @@`,
  ...commonPrefix, ...removed, ...added, ...commonSuffix,
  '',
].join('\n');
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'proposed.patch'), patch);
await writeFile(resolve(outputDir, 'patch-manifest.json'), JSON.stringify({
  file, status: 'requires-human-review', changed: true, applied: false,
  testsRequired: ['unit/regression', 'build', 'security review'],
}, null, 2));
console.log(`Generated proposed.patch for ${file}. No source files changed.`);
