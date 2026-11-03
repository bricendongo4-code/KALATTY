import { allowedPatchFile, patchDigest, validatePatch } from './agent-patch';
describe('exact owner-reviewed patch', () => {
  const input = {
    file: 'frontend/app/courses/page.tsx',
    oldText: 'old',
    newText: 'new',
  };
  const sha = 'a'.repeat(40);
  it('binds the approved change to its path and revision', () => {
    const patch = validatePatch(input, 'one old value', sha);
    expect(patch.digest).toBe(patchDigest(patch));
    expect(patch.digest).not.toBe(
      patchDigest({ ...patch, newText: 'injected' }),
    );
  });
  it('rejects ambiguous, missing or out-of-scope corrections', () => {
    for (const original of ['old old', 'missing'])
      expect(() => validatePatch(input, original, sha)).toThrow();
    for (const file of [
      'frontend/app/../page.tsx',
      'backend/src/auth/auth.service.ts',
      '.github/workflows/ci.yml',
      'backend/src/ai-control-center/agent-patch.ts',
      'frontend/app/payment/page.tsx',
    ]) {
      expect(allowedPatchFile(file)).toBe(false);
      expect(() => validatePatch({ ...input, file }, 'old', sha)).toThrow();
    }
  });
});
