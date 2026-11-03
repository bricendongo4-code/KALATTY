import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { GrowthProviders, DeliveryError } from './growth-providers';
import { digest, publicUrl, brief, template, email } from './growth-model';
import { GrowthService } from './growth.service';
import { assertOwner } from './platform-owner.guard';
const offer = {
  offer: 'Kalatty',
  audience: 'les formateurs',
  benefit: 'Organiser les cours',
  cta: 'https://kalatty-frontend.vercel.app/',
  signature: 'Équipe Kalatty',
};
const draft = {
  id: 'a',
  owner_id: 'owner',
  lead_id: 'lead',
  channel: 'email',
  sender: 'team@kalatty.fr',
  recipient: 'contact@example.org',
  subject: 'Présentation',
  body: 'Texte approuvé',
  scheduled_for: null,
  status: 'draft',
  digest: '',
};
draft.digest = digest(draft);
afterEach(() => jest.restoreAllMocks());
test('URLs, contact email and commercial brief are validated', () => {
  for (const u of [
    'http://example.org',
    'https://127.0.0.1',
    'https://user:secret@example.org',
    'https://service.internal',
    'javascript:alert(1)',
  ])
    expect(() => publicUrl(u)).toThrow(BadRequestException);
  expect(() => email('x@example.org\r\nBcc: x@evil.org')).toThrow();
  expect(() => brief({})).toThrow();
  expect(template(brief(offer), 'Entreprise X', 'email')).toContain(
    'nous ne vous relancerons pas',
  );
});
test('approval digest binds text, target, sender, channel and execution date', () => {
  for (const field of [
    'body',
    'recipient',
    'sender',
    'channel',
    'scheduled_for',
    'lead_id',
  ])
    expect(digest({ ...draft, [field]: 'altered' })).not.toBe(draft.digest);
});
test('directory returns only active, identified, sourced organizations without invented emails', async () => {
  const fetcher = jest.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          {
            siren: '123456789',
            nom_complet: 'Formation A',
            etat_administratif: 'A',
            siege: { libelle_commune: 'Paris' },
          },
          {
            siren: '987654321',
            nom_complet: 'Fermée',
            etat_administratif: 'C',
          },
          { nom_complet: 'Sans identifiant' },
        ],
      }),
    ),
  );
  const result = await new GrowthProviders(fetcher as any).discover(
    'directory_fr',
    'formation',
    'FR',
  );
  expect(result).toHaveLength(1);
  expect(result[0].source_url).toContain('123456789');
  expect(result[0]).not.toHaveProperty('email');
  expect(fetcher.mock.calls[0][0].hostname).toBe(
    'recherche-entreprises.api.gouv.fr',
  );
  await expect(
    new GrowthProviders(fetcher as any).discover(
      'directory_fr',
      'formation',
      'CM',
    ),
  ).rejects.toThrow('France');
});
test('international web results are unqualified source links, deduplicated by domain key', async () => {
  const saved = process.env.KALATTY_BRAVE_SEARCH_KEY;
  process.env.KALATTY_BRAVE_SEARCH_KEY = 'fixture';
  try {
    const f = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: 'Centre Exemple',
                url: 'https://example.org/contact',
                description: 'Formation',
              },
              { title: 'Bad', url: 'http://localhost' },
            ],
          },
        }),
      ),
    );
    const result = await new GrowthProviders(f as any).discover(
      'brave_web',
      'formation Cameroun',
      'CM',
    );
    expect(result).toHaveLength(1);
    expect(result[0].source_key).toBe('web:example.org');
    expect(result[0].qualification).toContain('non qualifiée');
  } finally {
    if (saved === undefined) delete process.env.KALATTY_BRAVE_SEARCH_KEY;
    else process.env.KALATTY_BRAVE_SEARCH_KEY = saved;
  }
});
test('email delivery uses the approved sender and stable provider idempotency key', async () => {
  const vars = { ...process.env };
  process.env.KALATTY_RESEND_API_KEY = 'fixture';
  process.env.KALATTY_GROWTH_FROM_EMAIL = draft.sender;
  try {
    const f = jest
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'provider-1' })));
    const p = new GrowthProviders(f as any);
    expect(await p.deliver(draft)).toEqual({
      status: 'sent',
      provider_id: 'provider-1',
    });
    const request = f.mock.calls[0][1];
    expect(request.headers['Idempotency-Key']).toBe(
      'kalatty-growth-a-' + draft.digest,
    );
    expect(JSON.parse(request.body).to).toEqual([draft.recipient]);
    await expect(
      p.deliver({ ...draft, sender: 'other@example.org' }),
    ).rejects.toThrow(DeliveryError);
    expect(f).toHaveBeenCalledTimes(1);
  } finally {
    process.env = vars;
  }
});
test('network timeout and missing provider receipts remain uncertain, never successful', async () => {
  const vars = { ...process.env };
  process.env.KALATTY_RESEND_API_KEY = 'fixture';
  process.env.KALATTY_GROWTH_FROM_EMAIL = draft.sender;
  try {
    for (const f of [
      jest.fn().mockRejectedValue(Error('timeout')),
      jest.fn().mockResolvedValue(new Response('{}')),
    ]) {
      await expect(
        new GrowthProviders(f as any).deliver(draft),
      ).rejects.toMatchObject({ uncertain: true });
    }
  } finally {
    process.env = vars;
  }
});
test('platform owner requires matching server configuration and confirmed Auth identity', async () => {
  const original = process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
  process.env.KALATTY_PLATFORM_ADMIN_EMAIL = 'owner@example.org';
  const getUserById = jest.fn().mockResolvedValue({
    data: {
      user: { email: 'owner@example.org', email_confirmed_at: '2026-01-01' },
    },
  });
  const db = { auth: { admin: { getUserById } } };
  try {
    await expect(
      assertOwner(db, { id: 'owner', email: 'other@example.org' }),
    ).rejects.toThrow(ForbiddenException);
    expect(getUserById).not.toHaveBeenCalled();
    expect(
      await assertOwner(db, { id: 'owner', email: 'owner@example.org' }),
    ).toBe('owner');
    getUserById.mockResolvedValue({
      data: { user: { email: 'owner@example.org' } },
    });
    await expect(
      assertOwner(db, { id: 'owner', email: 'owner@example.org' }),
    ).rejects.toThrow(ForbiddenException);
  } finally {
    if (original === undefined) delete process.env.KALATTY_PLATFORM_ADMIN_EMAIL;
    else process.env.KALATTY_PLATFORM_ADMIN_EMAIL = original;
  }
});
function service(action: any = { ...draft }) {
  const updates: any[] = [];
  const filters: any[] = [];
  const db: any = {
    from: jest.fn(() => {
      const q: any = {
        select: () => q,
        eq: (k: string, v: any) => {
          filters.push([k, v]);
          return q;
        },
        maybeSingle: async () => ({ data: action }),
        update: (value: any) => {
          updates.push(value);
          return q;
        },
        then: (resolve: any) =>
          Promise.resolve({ data: [{ id: action.id }] }).then(resolve),
      };
      return q;
    }),
    rpc: jest.fn().mockResolvedValue({ data: [action] }),
  };
  const s = new GrowthService({ client: db } as any);
  return { s, db, updates, filters };
}
test('edited action is reset to draft and old approval is discarded', async () => {
  const { s, updates, filters } = service({ ...draft, status: 'approved' });
  await s.editAction('owner', 'a', {
    digest: draft.digest,
    subject: draft.subject,
    body: 'Nouveau texte',
    recipient: draft.recipient,
    scheduled_for: null,
  });
  expect(updates[0]).toMatchObject({
    status: 'draft',
    approved_digest: null,
    approved_at: null,
  });
  expect(updates[0].digest).not.toBe(draft.digest);
  expect(filters).toContainEqual(['owner_id', 'owner']);
  expect(filters).toContainEqual(['digest', draft.digest]);
});
test('changed content and opted-out leads cannot be approved', async () => {
  const { s } = service({ ...draft, body: 'unreviewed' });
  await expect(
    s.decide('owner', 'a', { digest: draft.digest, decision: 'approve' }),
  ).rejects.toThrow(ConflictException);
  const safe = service({ ...draft });
  jest.spyOn(safe.s as any, 'lead').mockResolvedValue({ opt_out: true });
  await expect(
    safe.s.decide('owner', 'a', { digest: draft.digest, decision: 'approve' }),
  ).rejects.toThrow('sourcé');
});
test('execution must claim the approved revision before any provider call', async () => {
  const { s, db } = service({ ...draft, status: 'approved' });
  jest
    .spyOn(s.providers, 'connections')
    .mockReturnValue({ email: true } as any);
  jest.spyOn(s.providers, 'sender').mockReturnValue(draft.sender);
  const deliver = jest
    .spyOn(s.providers, 'deliver')
    .mockResolvedValue({ status: 'sent', provider_id: 'p' });
  db.rpc.mockResolvedValue({ data: [] });
  await expect(s.dispatch('owner', 'a', draft.digest)).rejects.toThrow(
    ConflictException,
  );
  expect(deliver).not.toHaveBeenCalled();
});
test('an uncertain delivery is persisted as unknown with no automatic second attempt', async () => {
  const { s, db, updates } = service({ ...draft, status: 'approved' });
  jest
    .spyOn(s.providers, 'connections')
    .mockReturnValue({ email: true } as any);
  jest.spyOn(s.providers, 'sender').mockReturnValue(draft.sender);
  const deliver = jest
    .spyOn(s.providers, 'deliver')
    .mockRejectedValue(new DeliveryError(true, 'Résultat inconnu'));
  await expect(s.dispatch('owner', 'a', draft.digest)).rejects.toThrow(
    'inconnu',
  );
  expect(updates[0].status).toBe('unknown');
  db.rpc.mockResolvedValue({ data: [] });
  await expect(s.dispatch('owner', 'a', draft.digest)).rejects.toThrow(
    ConflictException,
  );
  expect(deliver).toHaveBeenCalledTimes(1);
});
