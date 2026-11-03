# Agents Kalatty : capacités et prochaines étapes

Audit du code le 3 novembre 2026. Une interface ou une recommandation ne prouve pas qu’une action a été exécutée. L’état des connexions et l’activation IA se lisent dans le Control Center ; la présence d’une clé ne confirme pas son crédit ou ses autorisations.

## Ce qui existe

- Supervision persistante planifiée, avec lease en base pour éviter les doublons entre serveurs.
- Lecture de compteurs agrégés des 11 départements, audit RLS, contrôles CI GitHub et disponibilité de l’accueil et de la connexion publics.
- Analyse IA optionnelle : recommandations fondées sur ces compteurs. Aucun navigateur autonome ne teste tous les parcours connectés.
- Agent développeur : inspection bornée d’un fichier par cycle IA, proposition d’un remplacement exact, empreinte du changement, validation humaine, préparation d’une branche et d’une PR, publication distincte uniquement après vérification du changement et des tests.
- Les rapports et propositions ont des états persistants. Une approbation seule n’est pas une correction publiée.

## Limites par département

| Département               | Sources actuelles                                     | Action externe aujourd’hui                                                |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Sécurité                  | Demandes de confidentialité, comptes gérés, audit RLS | Aucune correction automatique de la sécurité                              |
| Qualité                   | Compteurs de travaux, CI, pages publiques             | Aucun parcours connecté autonome                                          |
| Développement             | Studio, fichier de code borné                         | PR et fusion conditionnées à l’accès GitHub du backend et aux validations |
| UX                        | Progression et favoris                                | Aucune analyse visuelle des écrans                                        |
| Produit                   | Cours, modules, leçons                                | Aucune édition automatique du catalogue                                   |
| Marketing / communication | Avis et favoris                                       | Ni prospection web, ni calendrier, ni publication                         |
| Commercial                | Inscriptions et paiements                             | Ni qualification de prospects, ni rendez-vous, ni relance, ni vente       |
| Support                   | Questions et demandes de confidentialité              | Aucune réponse envoyée                                                    |
| Finance                   | Nombre de paiements                                   | Aucun transfert, remboursement ou traitement comptable                    |
| Analyse                   | Inscriptions, progression, cours                      | Aucune attribution marketing complète                                     |
| CRM                       | Profils et inscriptions                               | Aucun pipeline commercial ni contact de prospects                         |

Il n’existe pas de département communication distinct. Les fonctions marketing actuelles se limitent à des recommandations.

## Accès GitHub à connecter

L’accès GitHub du collaborateur dans ChatGPT ne se transmet pas au backend Railway. Le code attend `KALATTY_AGENT_GITHUB_TOKEN` sur le service backend Kalatty. Configurer ce secret directement dans Railway, jamais dans le code, les rapports, les journaux ou une conversation.

Pour le mécanisme actuel, utiliser un jeton finement limité au dépôt `bricendongo4-code/KALATTY`, avec les accès nécessaires à la lecture et l’écriture du contenu et des pull requests, ainsi qu’à la lecture des contrôles/actions. Ne pas autoriser l’administration du dépôt ni la modification des workflows. Le statut « configuré » signifie que la variable est présente ; une première préparation de PR permettra de vérifier les permissions effectives. À terme, migrer vers une GitHub App avec des jetons d’installation courts et renouvelés automatiquement.

Les contraintes existantes sur les fichiers modifiables, l’empreinte approuvée et la vérification des tests restent applicables. Une proposition périmée doit être réanalysée.

## Améliorations nécessaires pour l’autonomie demandée

1. **Développement et qualité** : accès GitHub propre au backend, comptes de test isolés par rôle, parcours navigateur de connexion/cours/messagerie/studio, comparaison visuelle et environnement de préproduction. Livrable attendu : anomalie reproductible, preuve, patch, tests, PR ; publication du changement exact après validation.
2. **Marketing et communication** : brief commercial (public, offre, tarifs et promesses vérifiées), recherche web reliée à des sources, bibliothèque de contenus et calendrier éditorial. Livrable attendu : campagne avec objectif, cible, sources, budget éventuel et brouillons consultables. Brancher ensuite les canaux choisis ; toute publication doit avoir une validation portant sur le texte et le canal exacts.
3. **Prospection et CRM** : base de prospects séparée des utilisateurs de la plateforme, avec entreprise, source URL, contact professionnel, date, justification de pertinence, étape et historique. Ajouter dédoublonnage, qualification, exclusion des contacts refusant d’être sollicités et traçabilité. Livrable attendu : prospects sourcés à examiner, sans contacter automatiquement les élèves ni confondre inscriptions et prospects.
4. **Commercial** : pipeline (nouveau, qualifié, contact préparé, contact validé/envoyé, rendez-vous, gagné/perdu), scénarios de relance, connexion à une boîte professionnelle et à un agenda. Livrable attendu : messages et propositions de rendez-vous préparés, envoi après validation. Une vente réellement payée exige aussi un paiement opérationnel et son rapprochement.
5. **Mesure et budget** : suivi des conversions réelles et des erreurs, quotas séparés d’analyse/recherche/envoi, journal d’exécution, prévention des doublons et arrêt des campagnes. Une recharge de crédits IA n’ajoute aucun connecteur ni fonction manquante.

Ces étapes sont un plan d’implémentation ; elles ne sont pas des capacités déjà disponibles. Aucun message commercial, démarchage ou publication n’a été lancé par cet audit.
