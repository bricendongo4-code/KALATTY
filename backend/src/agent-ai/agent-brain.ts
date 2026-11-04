import { ServiceUnavailableException } from '@nestjs/common';

type BrainRequest = {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  timeoutMs?: number;
  responseSchema?: { name: string; schema: Record<string, unknown> };
};
function config() {
  const provider =
    process.env.KALATTY_AI_PROVIDER?.trim().toLowerCase() || 'openai';
  if (provider === 'groq') {
    const model =
      process.env.KALATTY_GROQ_MODEL?.trim() || 'openai/gpt-oss-20b';
    return {
      provider,
      model,
      key: process.env.GROQ_API_KEY?.trim(),
      supported: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(model),
      endpoint: 'https://api.groq.com/openai/v1/responses',
    };
  }
  return {
    provider,
    model: process.env.KALATTY_AI_MODEL?.trim() || '',
    key: provider === 'openai' ? process.env.OPENAI_API_KEY?.trim() : undefined,
    supported: provider === 'openai',
    endpoint: 'https://api.openai.com/v1/responses',
  };
}
/** Public metadata deliberately omits credentials and never implies a successful live call. */
export function agentBrainStatus() {
  const c = config();
  return {
    brainProvider: c.supported ? c.provider : 'unsupported',
    brainModel: c.model,
    brainConfigured: Boolean(c.supported && c.model && c.key),
  };
}
export function assertAgentBrainConfigured() {
  if (!agentBrainStatus().brainConfigured)
    throw new ServiceUnavailableException(
      'Connexion IA incomplète : vérifiez le fournisseur, le modèle et sa clé serveur.',
    );
}
/** Fixed provider endpoints, no redirect, retry, tool execution or paid-provider fallback. */
export async function generateAgentText(
  request: BrainRequest,
  fetcher: typeof fetch = fetch,
) {
  assertAgentBrainConfigured();
  const c = config();
  let response: Response;
  try {
    response = await fetcher(c.endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(request.timeoutMs ?? 20000),
      headers: {
        Authorization: `Bearer ${c.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: c.model,
        store: false,
        instructions: request.instructions,
        input: request.input,
        ...(request.responseSchema
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: request.responseSchema.name,
                  strict: true,
                  schema: request.responseSchema.schema,
                },
              },
            }
          : {}),
        // Reasoning models need a small extra budget before their visible answer.
        max_output_tokens:
          c.provider === 'groq'
            ? Math.max(1024, request.maxOutputTokens + 512)
            : request.maxOutputTokens,
        ...(c.provider === 'groq' ? { reasoning: { effort: 'low' } } : {}),
      }),
    });
  } catch {
    throw new ServiceUnavailableException(
      'Fournisseur IA injoignable. Aucun autre fournisseur n’a été appelé.',
    );
  }
  if (!response.ok) {
    // Do not echo provider bodies: they may contain submitted data or credentials.
    await response.body?.cancel().catch(() => undefined);
    throw new ServiceUnavailableException(
      response.status === 429
        ? 'Limite du fournisseur IA atteinte. Réessayez plus tard ; aucun basculement payant.'
        : response.status === 401 || response.status === 403
          ? 'Clé IA refusée ou modèle non autorisé. Vérifiez votre compte fournisseur.'
          : 'Fournisseur IA indisponible. Aucun autre fournisseur n’a été appelé.',
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (
    !body ||
    typeof body !== 'object' ||
    !('output' in body) ||
    !Array.isArray(body.output) ||
    ('status' in body && body.status !== 'completed')
  )
    throw new ServiceUnavailableException(
      'Réponse IA absente ou incomplète. Aucune action autorisée.',
    );
  const parts: unknown[] = body.output.flatMap((item: unknown) =>
    item &&
    typeof item === 'object' &&
    'content' in item &&
    Array.isArray(item.content)
      ? item.content
      : [],
  );
  const result = parts
    .filter((p): p is { type: 'output_text'; text: string } =>
      Boolean(
        p &&
        typeof p === 'object' &&
        'type' in p &&
        p.type === 'output_text' &&
        'text' in p &&
        typeof p.text === 'string',
      ),
    )
    .map((p) => p.text)
    .join('\n')
    .trim();
  if (!result)
    throw new ServiceUnavailableException(
      'Le fournisseur IA n’a renvoyé aucun texte exploitable.',
    );
  return result;
}
