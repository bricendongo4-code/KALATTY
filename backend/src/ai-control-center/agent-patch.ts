import { createHash } from 'node:crypto';

export type AgentPatch = {
  file: string;
  oldText: string;
  newText: string;
  baseSha: string;
  digest: string;
};
// AI can propose application code, never workflow, auth, payment or secret configuration changes.
export function allowedPatchFile(path: string): boolean {
  return (
    /^(frontend\/app|backend\/src)\/[a-zA-Z0-9_./-]+\.(tsx?|jsx?|css)$/.test(
      path,
    ) &&
    !path.split('/').some((p) => p === '..' || p === '' || p.startsWith('.')) &&
    !/(auth|login|password|payment|billing|supabase|middleware|ai-control-center|layout\.tsx|app\.module)/i.test(
      path,
    ) &&
    !/\.(spec|test)\./.test(path)
  );
}
export function patchDigest(patch: Omit<AgentPatch, 'digest'>): string {
  return createHash('sha256')
    .update(
      JSON.stringify([patch.file, patch.baseSha, patch.oldText, patch.newText]),
    )
    .digest('hex');
}
export function validatePatch(
  input: unknown,
  original: string,
  baseSha: string,
): AgentPatch {
  if (!input || typeof input !== 'object') throw Error('Correction absente');
  const p = input as Record<string, unknown>;
  if (
    typeof p.file !== 'string' ||
    !allowedPatchFile(p.file) ||
    typeof p.oldText !== 'string' ||
    typeof p.newText !== 'string' ||
    !p.oldText ||
    p.oldText === p.newText ||
    p.oldText.length > 5000 ||
    p.newText.length > 5000 ||
    !/^[a-f0-9]{40}$/.test(baseSha) ||
    original.split(p.oldText).length !== 2
  )
    throw Error('Correction invalide ou ambiguë');
  const patch = {
    file: p.file,
    oldText: p.oldText,
    newText: p.newText,
    baseSha,
  };
  return { ...patch, digest: patchDigest(patch) };
}
