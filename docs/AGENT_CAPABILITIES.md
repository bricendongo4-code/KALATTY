# Agents Kalatty : préparation des essais et connexions

État du 3 novembre 2026. Les connecteurs sont du code exécutable ; ils ne donnent aucun accès à un compte externe tant que ses propres identifiants ne sont pas configurés. La recharge OpenAI n’ajoute pas ces accès. Aucun démarchage ni publication réelle n’a été lancé pendant l’implémentation.

## Utilisation avant la recharge OpenAI

Dans le Control Center, ouvrir **Prospection & campagnes**.

1. **Brief & autonomie** : vérifier et enregistrer l’offre, le public, les bénéfices réels, le lien et la signature. Choisir le pays et la source. L’annuaire officiel couvre uniquement la France et fonctionne sans clé. La recherche web internationale exige une clé Brave ; le pays ciblé est ajouté à la requête et les résultats restent à qualifier.
2. **Prospects** : chercher ou importer une organisation avec son URL source. Le système déduplique les nouveaux résultats sans écraser une fiche existante. Le pipeline comporte nouveau, qualifié, contacté, rendez-vous, gagné et perdu. Ajouter ses notes, une prochaine relance et, si nécessaire, un email professionnel avec l’URL où il a été trouvé. Un refus de sollicitation bloque les exécutions suivantes. Lorsqu’un email est connu, son exclusion reste conservée même si la fiche est modifiée ou réimportée. Aucune levée automatique n’est prévue.
3. **Contenus & validations** : préparer un email personnalisé ou un contenu de réseau social. Sans l’option IA, le brouillon utilise uniquement le brief enregistré. Examiner puis modifier le contenu, son destinataire et sa date. La signature d’approbation lie aussi l’expéditeur et le canal. Toute modification remet le contenu à l’état brouillon.
4. **Exécution** : un contenu approuvé sans date attend le bouton d’exécution. Un contenu approuvé avec une date est exécuté à échéance lorsque son canal est connecté. L’export ne publie rien : il autorise un fichier texte. Les rappels .ics permettent d’importer les dates dans un agenda ; aucune invitation n’est envoyée.
5. **Autonomie** : l’option quotidienne cherche jusqu’à dix pistes et prépare jusqu’à trois brouillons pour les nouvelles organisations. Elle parcourt les pages de résultats suivantes sur les prochains cycles. Les relances échues des prospects qualifiés, contactés ou en rendez-vous préparent aussi un brouillon dédupliqué ; le rappel est consommé après sa préparation. Elle ne valide ni n’envoie les messages. Les pages montrent les 200 derniers prospects, les 100 derniers contenus et les 100 derniers événements ; les données plus anciennes restent conservées en base.

Quotas persistants par propriétaire : cinq recherches et dix exécutions par jour UTC. Les exécutions incluent les exports et les tentatives réellement réclamées au traitement. La génération IA partage le quota global de douze appels par jour. Les recherches Brave et les fournisseurs d’envoi peuvent avoir leur propre facturation.

## Connexions à configurer dans Railway

Configurer les variables sur le **backend Kalatty**, jamais dans des variables `NEXT_PUBLIC_`, du code, des messages de conversation ou le brief. La page Connexions affiche leur présence, sans exposer les secrets. Elle propose aussi un diagnostic GitHub qui teste réellement l’authentification et la lecture du dépôt.

| Fonction                         | Variables                                                                                      | Autorisations nécessaires                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub par jeton                 | `KALATTY_AGENT_GITHUB_TOKEN`                                                                   | Jeton finement limité à `bricendongo4-code/KALATTY`, contenu et PR en écriture, contrôles/actions en lecture ; sans administration ni modification des workflows                                    |
| GitHub App, alternative au jeton | `KALATTY_GITHUB_APP_ID`, `KALATTY_GITHUB_INSTALLATION_ID`, `KALATTY_GITHUB_APP_PRIVATE_KEY`    | App propre au propriétaire, installée sur KALATTY avec les mêmes permissions. Le backend signe son JWT et renouvelle un jeton d’installation limité à KALATTY ; aucune clé ChatGPT n’est réutilisée |
| Recherche web                    | `KALATTY_BRAVE_SEARCH_KEY`                                                                     | Abonnement à l’API Web Search Brave ; les pistes gardent leur source et ne deviennent pas automatiquement des prospects qualifiés                                                                   |
| Email professionnel              | `KALATTY_RESEND_API_KEY`, `KALATTY_GROWTH_FROM_EMAIL`                                          | Clé Resend autorisant l’envoi et domaine expéditeur validé chez Resend                                                                                                                              |
| LinkedIn                         | `KALATTY_LINKEDIN_ACCESS_TOKEN`, `KALATTY_LINKEDIN_AUTHOR_URN`, `KALATTY_LINKEDIN_API_VERSION` | Jeton propre au compte ou à la page, permission `w_member_social` ou `w_organization_social`, auteur `urn:li:person:…` ou `urn:li:organization:…` et version API supportée `YYYYMM`                 |

Après un changement d’identité d’envoi, enregistrer à nouveau les brouillons concernés et les approuver : une ancienne approbation ne peut pas être utilisée avec un autre expéditeur. La présence des variables ne prouve ni le crédit ni les permissions effectives du fournisseur.

Resend reçoit une clé d’idempotence stable par action. Les statuts incertains et les traitements interrompus ne sont jamais renvoyés automatiquement. Vérifier le fournisseur avant de créer une nouvelle action. Une acceptation par le fournisseur ne prouve ni livraison en boîte principale, ni lecture, ni vente.

## Développeur et qualité

Le circuit existant conserve le patch exact, son empreinte, l’approbation du propriétaire, une branche isolée, une PR et les contrôles de la CI. La publication reste une validation distincte. Le connecteur supporte désormais les jetons d’installation GitHub App renouvelés automatiquement. Sans accès propre au backend, le diagnostic signale le blocage et aucune PR n’est prétendue créée.

Le workflow **Kalatty QA - parcours navigateur** teste chaque jour les interfaces et les parcours avec des API simulées, sans OpenAI. Les tests couvrent les rôles, la recherche, la session, les menus, le branding et les approbations. Ils ne prouvent pas que tous les scénarios métier fonctionnent sur les données réelles.

Le parcours connecté en lecture est prêt mais nécessite six comptes QA dédiés. Dans GitHub, configurer :

- Variable `KALATTY_LIVE_QA_ENABLED=true` et `KALATTY_QA_BASE_URL` vers un déploiement HTTPS de `kalatty-frontend…vercel.app`.
- Secret `KALATTY_QA_ACCOUNTS` : objet JSON contenant les clés `learner`, `creator`, `student`, `teacher`, `pedagogy`, `admin`, chacune associée à `{ "email": "…", "password": "…" }`.

Ce job est explicitement ignoré si l’activation est absente ; s’il est activé sans les six comptes, il échoue. Il vérifie connexion, routage, contexte et recherche autorisée. Il n’envoie aucun message et ne modifie ni inscription, ni présence, ni paiement. Les traces, vidéos et captures sont désactivées pour ces comptes. Les tests de création/modification de données métier doivent rester réservés à un environnement et à des comptes de test isolés.

## Ce qui reste limité

- L’IA automatique reste désactivée jusqu’à son activation par le propriétaire ; la génération de brouillon IA vérifie cet état et réserve un appel dans le quota persistant. Aucun appel OpenAI n’est nécessaire aux brouillons modèles, aux recherches d’annuaire ou au pipeline.
- Une piste n’est pas un contact qualifié. Aucun email n’est deviné, aucun contact étudiant n’est transformé en prospect et les besoins commerciaux ne sont pas supposés.
- Le statut commercial « gagné » est déclaré par le propriétaire. Le paiement et son rapprochement doivent être opérationnels pour confirmer une vente encaissée.
- Pas de publicité payante, de publication Instagram/Facebook native, de lecture automatique des réponses email ou de synchronisation agenda OAuth dans cette version. Les contenus s’exportent et les dates se téléchargent en .ics.
- Support dispose désormais des avis privés sur Kalatty, d’un classement proposé et d’une orientation confirmée vers un service. Finance dispose des agrégats monétaires vérifiés, des dépenses déclarées et des demandes de retrait. Ces circuits déterministes fonctionnent sans crédits IA ; ils n’exécutent pas de transfert, de remboursement ou de réponse automatique. Voir [le fonctionnement détaillé](SUPPORT_FINANCE_PAYMENTS.md).

## Vérifications

Tests backend pour la validation des entrées, les droits du propriétaire, les sources de prospection, la liaison du contenu approuvé, la révocation des approbations, les envois incertains et l’authentification GitHub App. Tests navigateur des parcours de préparation et d’approbation sur plusieurs largeurs. Le script `backend/test/growth-acceptance.sql` vérifie en transaction les claims, les quotas, le refus de sollicitation et le journal, puis annule toutes les données d’essai.

Documentation des fournisseurs : [annuaire officiel](https://recherche-entreprises.api.gouv.fr/docs/), [Brave Web Search](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started), [Resend](https://resend.com/docs/api-reference/emails/send-email), [LinkedIn Posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api), [GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app).
