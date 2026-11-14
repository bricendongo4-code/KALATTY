import type { AgentGithub } from './agent-github';

const targets = [
  {
    match: /\b(?:messagerie|messaging|chat)\b/i,
    files: [
      'backend/src/messaging/messaging.controller.ts',
      'backend/src/messaging/messaging.security.spec.ts',
    ],
  },
  {
    match: /\b(?:connexion|inscription|login|signup|authentification)\b/i,
    files: [
      'backend/src/auth/auth.controller.ts',
      'backend/src/auth/auth.controller.spec.ts',
    ],
  },
  {
    match: /\b(?:rls|truncate|postgrest)\b/i,
    files: ['backend/migrations/20261103_ai_security_signals.sql'],
  },
  {
    match: /\b(?:orchestrateur|orchestration|coordinateur)\b/i,
    files: [
      'backend/src/ai-control-center/orchestration.controller.ts',
      'backend/src/ai-control-center/orchestration-model.spec.ts',
    ],
  },
];

export async function missionCodeContext(
  github: Pick<AgentGithub, 'api' | 'source'>,
  department: string,
  objective: string,
) {
  if (!['developer', 'security', 'qa', 'product', 'ux'].includes(department))
    return null;
  // Never interpret model text or a mission as a GitHub path or ref.
  const target = targets.find(({ match }) => match.test(objective));
  if (!target) return null;
  let revision: string | null = null;
  try {
    const sha = (await github.api('git/ref/heads/master'))?.object?.sha;
    if (typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha)) revision = sha;
  } catch {
    // Unavailable is not evidence of a repository defect.
  }
  return {
    revision,
    files: await Promise.all(
      target.files.map(async (path) => {
        let excerpt: string | null = null;
        if (revision) {
          try {
            excerpt = (await github.source(path, revision)).slice(0, 3200);
          } catch {
            // Keep the missing source explicit, including for the reviewer.
          }
        }
        return { path, excerpt };
      }),
    ),
  };
}
