import { ServiceUnavailableException } from '@nestjs/common';
import { publicUrl } from './growth-model';
export class DeliveryError extends Error {
  constructor(
    public readonly uncertain: boolean,
    message: string,
  ) {
    super(message);
  }
}
export class GrowthProviders {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  connections() {
    return {
      directory_fr: true,
      brave_web: !!process.env.KALATTY_BRAVE_SEARCH_KEY,
      email: !!(
        process.env.KALATTY_RESEND_API_KEY &&
        process.env.KALATTY_GROWTH_FROM_EMAIL
      ),
      linkedin: !!(
        process.env.KALATTY_LINKEDIN_ACCESS_TOKEN &&
        /^urn:li:(person|organization):[\w-]+$/.test(
          process.env.KALATTY_LINKEDIN_AUTHOR_URN ?? '',
        ) &&
        /^\d{6}$/.test(process.env.KALATTY_LINKEDIN_API_VERSION ?? '')
      ),
      export: true,
    };
  }
  sender(channel: string) {
    return channel === 'email'
      ? (process.env.KALATTY_GROWTH_FROM_EMAIL ?? '')
      : channel === 'linkedin'
        ? (process.env.KALATTY_LINKEDIN_AUTHOR_URN ?? '')
        : '';
  }
  async discover(provider: string, query: string, country: string, page = 1) {
    const url = new URL(
      provider === 'directory_fr'
        ? 'https://recherche-entreprises.api.gouv.fr/search'
        : 'https://api.search.brave.com/res/v1/web/search',
    );
    const countryLabel: Record<string, string> = {
      CM: 'Cameroun',
      BE: 'Belgique',
      CA: 'Canada',
      SN: 'Sénégal',
      CI: 'Côte d’Ivoire',
    };
    url.searchParams.set(
      'q',
      provider === 'brave_web' && countryLabel[country]
        ? query + ' ' + countryLabel[country]
        : query,
    );
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (provider === 'directory_fr') {
      if (country !== 'FR')
        throw new ServiceUnavailableException(
          'L’annuaire officiel couvre uniquement la France. Utilisez la recherche web pour les autres pays.',
        );
      url.searchParams.set('per_page', '10');
      url.searchParams.set('page', String(Math.min(1000, Math.max(1, page))));
      url.searchParams.set('etat_administratif', 'A');
    } else {
      if (!process.env.KALATTY_BRAVE_SEARCH_KEY)
        throw new ServiceUnavailableException(
          'Clé de recherche web non configurée.',
        );
      headers['X-Subscription-Token'] = process.env.KALATTY_BRAVE_SEARCH_KEY;
      url.searchParams.set('count', '10');
      url.searchParams.set(
        'offset',
        String(Math.min(9, Math.max(0, page - 1))),
      );
      url.searchParams.set('search_lang', 'fr');
      if (country === 'FR') url.searchParams.set('country', 'FR');
    }
    let res: Response;
    try {
      res = await this.fetcher(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Source de prospection indisponible.',
      );
    }
    if (!res.ok)
      throw new ServiceUnavailableException(
        'Source de prospection indisponible (' + res.status + ').',
      );
    const body = await res.json();
    const rows = provider === 'directory_fr' ? body.results : body.web?.results;
    if (!Array.isArray(rows))
      throw new ServiceUnavailableException('Réponse de prospection invalide.');
    return rows.slice(0, 10).flatMap((r: any) => {
      try {
        if (provider === 'directory_fr') {
          if (
            !/^\d{9}$/.test(String(r.siren)) ||
            typeof r.nom_complet !== 'string' ||
            r.etat_administratif !== 'A'
          )
            return [];
          return [
            {
              source_key: 'siren:' + r.siren,
              company: r.nom_complet.slice(0, 200),
              source_url:
                'https://annuaire-entreprises.data.gouv.fr/entreprise/' +
                r.siren,
              country: 'FR',
              city: String(r.siege?.libelle_commune ?? '').slice(0, 200),
              industry: String(r.activite_principale ?? '').slice(0, 200),
              qualification:
                'Résultat de l’annuaire pour « ' +
                query +
                ' ». Pertinence commerciale à qualifier.',
            },
          ];
        }
        const source = publicUrl(r.url);
        const title = String(r.title ?? '')
          .replace(/<[^>]*>/g, '')
          .slice(0, 200);
        if (!title) return [];
        return [
          {
            source_key: 'web:' + new URL(source).hostname.toLowerCase(),
            company: title,
            source_url: source,
            country,
            city: '',
            industry: '',
            qualification:
              'Piste web non qualifiée : ' +
              String(r.description ?? '')
                .replace(/<[^>]*>/g, '')
                .slice(0, 500),
          },
        ];
      } catch {
        return [];
      }
    });
  }
  async deliver(action: Record<string, any>) {
    if (action.channel === 'export')
      return { status: 'exported', provider_id: null };
    if (
      !this.connections()[action.channel] ||
      !action.sender ||
      action.sender !== this.sender(action.channel)
    )
      throw new DeliveryError(
        false,
        'Canal ou identité d’envoi non configurés ; enregistrez à nouveau le brouillon après connexion.',
      );
    let res: Response;
    try {
      res = await this.fetcher(
        action.channel === 'email'
          ? 'https://api.resend.com/emails'
          : 'https://api.linkedin.com/rest/posts',
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
          headers:
            action.channel === 'email'
              ? {
                  Authorization: 'Bearer ' + process.env.KALATTY_RESEND_API_KEY,
                  'Content-Type': 'application/json',
                  'Idempotency-Key':
                    'kalatty-growth-' + action.id + '-' + action.digest,
                }
              : {
                  Authorization:
                    'Bearer ' + process.env.KALATTY_LINKEDIN_ACCESS_TOKEN,
                  'Content-Type': 'application/json',
                  'Linkedin-Version': process.env.KALATTY_LINKEDIN_API_VERSION!,
                  'X-Restli-Protocol-Version': '2.0.0',
                },
          body: JSON.stringify(
            action.channel === 'email'
              ? {
                  from: action.sender,
                  to: [action.recipient],
                  subject: action.subject,
                  text: action.body,
                }
              : {
                  author: action.sender,
                  commentary: action.body,
                  visibility: 'PUBLIC',
                  distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: [],
                  },
                  lifecycleState: 'PUBLISHED',
                  isReshareDisabledByAuthor: false,
                },
          ),
        },
      );
    } catch {
      throw new DeliveryError(
        true,
        'Résultat de l’envoi inconnu. Vérifiez le fournisseur avant toute nouvelle tentative.',
      );
    }
    if (!res.ok)
      throw new DeliveryError(
        res.status >= 500,
        'Le fournisseur a répondu ' +
          res.status +
          '. Aucun renvoi automatique.',
      );
    try {
      const id =
        action.channel === 'email'
          ? (await res.json()).id
          : res.headers.get('x-restli-id');
      if (typeof id !== 'string' || !id) throw Error();
      return { status: 'sent', provider_id: id.slice(0, 300) };
    } catch {
      throw new DeliveryError(
        true,
        'Envoi accepté, mais identifiant indisponible. Vérifiez le fournisseur.',
      );
    }
  }
}
