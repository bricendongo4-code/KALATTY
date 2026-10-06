# Démarche Agile et chronologie des sprints

## Cadre de travail

Kalatty a été réalisé par un développeur unique avec une démarche Agile adaptée. Le projet n’a donc pas reproduit tous les rôles et toutes les cérémonies d’une équipe Scrum. Le travail a néanmoins suivi un cycle récurrent : identifier un besoin, le prioriser, définir un résultat observable, développer un incrément, le vérifier, le déployer puis intégrer les retours.

Les six sprints ci-dessous ont été reconstitués à partir des **175 commits** conservés dans Git entre le **7 avril et le 28 septembre 2026**. Les périodes correspondent aux vagues réelles de réalisation. Cette reconstitution rend la démarche vérifiable sans inventer de tickets ou de cérémonies qui n’existaient pas encore.

## Organisation d’une itération

1. **Entrée du backlog** : retour utilisateur, anomalie observée ou besoin du cahier des charges.
2. **Priorisation** : blocage de sécurité et parcours principal avant amélioration visuelle.
3. **Critères d’acceptation** : comportement attendu, rôle autorisé, réponse mobile et état d’erreur.
4. **Réalisation** : évolution du frontend, de l’API ou de la base selon le besoin.
5. **Vérification** : compilation, tests ciblés, recette par rôle et contrôle responsive.
6. **Livraison** : commit traçable, passage de la CI puis déploiement sur les services concernés.
7. **Rétrospective** : constat des limites et alimentation du sprint suivant.

## Vue d’ensemble

| Sprint | Période | Commits | Objectif principal | Incrément obtenu |
| --- | --- | ---: | --- | --- |
| 1 | 7 au 15 avril 2026 | 10 | Poser le socle fonctionnel et technique | Première plateforme, authentification, espaces et déploiement initial |
| 2 | 22 juin au 1er juillet 2026 | 47 | Rendre les parcours cours et établissement utilisables | Édition de cours, comptes gérés, progression, responsive et accès par classe |
| 3 | 27 au 28 juillet 2026 | 26 | Professionnaliser l’expérience avant lancement | Accueil marché, centres de commande, navigation, sécurité de session et avatar |
| 4 | 14 au 17 septembre 2026 | 32 | Stabiliser la sécurité et les parcours essentiels | Validation API, corrections d’autorisation, remises de devoirs et navigation par rôle |
| 5 | 21 au 23 septembre 2026 | 40 | Construire Campus V2 et ses rôles | Quatre espaces établissement, données réelles, emploi du temps, notes et absences |
| 6 | 24 au 28 septembre 2026 | 20 | Finaliser les fonctions différenciantes et la préparation production | Studio persistant, IA encadrée, paiement sécurisé, recherche, supervision et confidentialité |

## Sprint 1 : fondations de la plateforme

**Période :** 7 au 15 avril 2026  
**Volume :** 10 commits

**Objectif.** Obtenir une première version navigable de Kalatty et valider l’architecture générale avant d’élargir le périmètre.

**Éléments du backlog.** Importer le projet, créer les espaces principaux, initialiser les parcours établissement, synchroniser les rôles et préparer le déploiement.

**Livrables.** Première version des tableaux de bord, authentification, espace établissement, avis sur les cours et configuration de déploiement.

**Validation.** Un compte peut s’authentifier, rejoindre l’espace correspondant à son rôle et conserver sa progression. Le projet peut être construit puis déployé.

**Rétrospective.** Le socle prouve la faisabilité, mais les responsabilités entre comptes indépendants et comptes établissement restent insuffisamment séparées. Cette dette devient prioritaire pour les itérations suivantes.

**Preuves Git.** [Import initial](https://github.com/bricendongo4-code/KALATTY/commit/0265233), [espace établissement](https://github.com/bricendongo4-code/KALATTY/commit/df59407), [tableaux de bord](https://github.com/bricendongo4-code/KALATTY/commit/8a64c2a), [progression et espace Campus](https://github.com/bricendongo4-code/KALATTY/commit/b2ac2d2), [déploiement et rôles](https://github.com/bricendongo4-code/KALATTY/commit/a6ecb26).

## Sprint 2 : parcours pédagogiques et établissement

**Période :** 22 juin au 1er juillet 2026  
**Volume :** 47 commits

**Objectif.** Transformer le prototype en produit utilisable pour créer, modifier, publier et suivre un cours, tout en donnant à un établissement la maîtrise de ses comptes et de ses classes.

**Éléments du backlog.** Sécuriser les médias, modifier un cours existant, créer des comptes établissement, séparer les espaces, corriger le responsive, restaurer le mot de passe et gérer les brouillons.

**Livrables.** Éditeur complet de cours, comptes administrés, navigation adaptée aux rôles, progression, notifications, accès automatique des étudiants aux cours affectés à leur classe, miniatures privées et suppression protégée.

**Validation.** Un formateur peut reprendre un brouillon et gérer le contenu d’un cours. Un établissement peut provisionner ses membres. Un étudiant de classe accède à un cours affecté sans paiement individuel.

**Rétrospective.** Les fonctions couvrent le besoin, mais leur accumulation surcharge les pages. La priorité suivante devient la hiérarchie visuelle, la navigation et la cohérence mobile.

**Preuves Git.** [reprise de cours](https://github.com/bricendongo4-code/KALATTY/commit/419db09), [édition enseignant](https://github.com/bricendongo4-code/KALATTY/commit/b737aa3), [comptes gérés](https://github.com/bricendongo4-code/KALATTY/commit/be3cf95), [responsive](https://github.com/bricendongo4-code/KALATTY/commit/a2c6c25), [brouillons et notifications](https://github.com/bricendongo4-code/KALATTY/commit/9e6f0e3), [accès par classe](https://github.com/bricendongo4-code/KALATTY/commit/4a0da15), [suppression protégée](https://github.com/bricendongo4-code/KALATTY/commit/3615bca).

## Sprint 3 : expérience utilisateur orientée lancement

**Période :** 27 au 28 juillet 2026  
**Volume :** 26 commits

**Objectif.** Réduire la charge cognitive et rapprocher l’interface des standards d’une plateforme e-learning commercialisable.

**Éléments du backlog.** Repenser l’accueil, rendre les cartes actionnables, structurer les tableaux de bord, simplifier l’administration des établissements, clarifier le studio enseignant et fiabiliser la navigation mobile.

**Livrables.** Accueil de type place de marché, centres de commande par rôle, navigation améliorée, cartes de cours alignées, historique navigateur renforcé et photo de profil.

**Validation.** Les actions principales sont accessibles sans parcourir une page longue. Les cartes conservent leur alignement malgré des contenus variables. Les parcours critiques restent utilisables sur mobile.

**Rétrospective.** La présentation progresse, mais certains parcours restent seulement maquillés. Le projet doit revenir aux règles métier, aux autorisations et aux actions complètes plutôt qu’ajouter uniquement du style.

**Preuves Git.** [interface de lancement](https://github.com/bricendongo4-code/KALATTY/commit/d7bede2), [centre de commande](https://github.com/bricendongo4-code/KALATTY/commit/ec3ba53), [administration établissement](https://github.com/bricendongo4-code/KALATTY/commit/a9132cb), [tableaux de bord étudiant et enseignant](https://github.com/bricendongo4-code/KALATTY/commit/70954cc), [sécurité de session](https://github.com/bricendongo4-code/KALATTY/commit/ea9bf4a), [photo de profil](https://github.com/bricendongo4-code/KALATTY/commit/83d631c).

## Sprint 4 : stabilisation et parcours complets

**Période :** 14 au 17 septembre 2026  
**Volume :** 32 commits

**Objectif.** Corriger les faiblesses bloquantes avant l’extension de Campus et rendre les parcours étudiant, enseignant et administrateur réellement exécutables.

**Éléments du backlog.** Sécuriser les secrets, supprimer les dérives de schéma, empêcher l’escalade de privilèges, valider les entrées, corriger le tableau de bord, finaliser les remises de devoirs et clarifier les classes.

**Livrables.** Correctifs d’authentification, validation globale de l’API, remises de devoirs, gestion des effectifs, vue des notes, barres latérales persistantes et protection des invitations.

**Validation.** Les rôles ne peuvent plus être modifiés par une invitation inadaptée. Une remise de devoir est enregistrée puis consultable par l’enseignant. Les pages principales restent lisibles sur mobile.

**Rétrospective.** La stabilisation révèle qu’un espace établissement unique ne peut pas convenir à tous les métiers. La prochaine itération doit séparer clairement étudiant, professeur, responsable pédagogique et administrateur.

**Preuves Git.** [sécurité et schéma](https://github.com/bricendongo4-code/KALATTY/commit/f552b0d), [validation API](https://github.com/bricendongo4-code/KALATTY/commit/c4e03cc), [parcours par rôle](https://github.com/bricendongo4-code/KALATTY/commit/924804d), [remise de devoir](https://github.com/bricendongo4-code/KALATTY/commit/f1ec830), [effectifs et notes](https://github.com/bricendongo4-code/KALATTY/commit/73972fd), [navigation dédiée](https://github.com/bricendongo4-code/KALATTY/commit/0a4f252).

## Sprint 5 : Campus V2 et séparation des responsabilités

**Période :** 21 au 23 septembre 2026  
**Volume :** 40 commits

**Objectif.** Faire de l’espace établissement un véritable campus numérique, avec des responsabilités et des écrans propres à chaque métier.

**Éléments du backlog.** Ajouter le rôle pédagogique, enrichir le modèle de données, créer quatre accueils, connecter les données réelles, gérer emplois du temps, devoirs, résultats, présence et justificatifs d’absence.

**Livrables.** Campus V2, quatre espaces par rôle, formations et matières, planning, classes, évaluations, devoirs, résultats, présence, justificatifs et notifications de décision.

**Validation.** Un étudiant ne voit que les ressources de son établissement. Un professeur gère ses classes et ses travaux. Le responsable pédagogique supervise la progression. L’administrateur gère comptes, structure et paramètres sans se substituer au professeur.

**Rétrospective.** La séparation des rôles améliore fortement la compréhension, mais exige une navigation commune, une recherche globale et une discipline de déploiement pour éviter les régressions.

**Preuves Git.** [tests métier](https://github.com/bricendongo4-code/KALATTY/commit/2f68e8d), [quatre accueils](https://github.com/bricendongo4-code/KALATTY/commit/b7eda03), [schéma Campus V2](https://github.com/bricendongo4-code/KALATTY/commit/060fb27), [données réelles](https://github.com/bricendongo4-code/KALATTY/commit/07bfa82), [parcours étudiant](https://github.com/bricendongo4-code/KALATTY/commit/5fec6d7), [espaces connectés](https://github.com/bricendongo4-code/KALATTY/commit/6ebf2c0), [justificatifs d’absence](https://github.com/bricendongo4-code/KALATTY/commit/6d5cd16), [déploiements uniques](https://github.com/bricendongo4-code/KALATTY/commit/76f2cbb).

## Sprint 6 : différenciation et préparation à la production

**Période :** 24 au 28 septembre 2026  
**Volume :** 20 commits

**Objectif.** Finaliser les fonctions à forte valeur et traiter les risques de production identifiés pendant la recette.

**Éléments du backlog.** Rendre le Studio persistant, encadrer l’assistance IA, corriger les notifications mobiles, consolider les classes, sécuriser le paiement, ajouter la recherche globale et renforcer la confidentialité.

**Livrables.** Studio vidéo persistant, génération de quiz assistée, navigation mobile corrigée, supervision de classe, ressources privées, photos de profil, paiement contrôlé côté serveur, recherche par rôle, monitoring et règles de confidentialité.

**Validation.** Le paiement ne donne accès qu’après confirmation serveur. La recherche respecte le rôle connecté. Les ressources privées utilisent des accès temporaires. Les parcours mobiles conservent navigation, notifications et profil.

**Rétrospective.** Le produit devient démontrable et cohérent. Les prochains sprints doivent se concentrer sur un pilote terrain, l’exploitation, les tests de charge et l’accessibilité plutôt que multiplier les écrans.

**Preuves Git.** [Studio et IA](https://github.com/bricendongo4-code/KALATTY/commit/a4c0172), [notifications mobiles](https://github.com/bricendongo4-code/KALATTY/commit/3667624), [supervision de classe](https://github.com/bricendongo4-code/KALATTY/commit/bf072c3), [paiement sécurisé](https://github.com/bricendongo4-code/KALATTY/commit/789eb26), [recherche par rôle](https://github.com/bricendongo4-code/KALATTY/commit/52bf012), [sécurité et confidentialité](https://github.com/bricendongo4-code/KALATTY/commit/0f7f3f4), [mots de passe temporaires](https://github.com/bricendongo4-code/KALATTY/commit/d99e4b1).

## Définition de terminé

Une évolution peut être déclarée terminée lorsque les conditions applicables sont satisfaites :

- le comportement répond aux critères d’acceptation du ticket ;
- les contrôles d’autorisation existent côté API et pas uniquement dans l’interface ;
- la compilation du frontend et du backend réussit ;
- les tests ciblés réussissent et la recette manuelle couvre les rôles concernés ;
- l’affichage a été contrôlé sur ordinateur et mobile lorsqu’une interface change ;
- la migration SQL est versionnée lorsqu’une donnée évolue ;
- aucun secret ni donnée personnelle réelle n’est ajouté au dépôt ;
- le commit explique le résultat livré et le déploiement peut être diagnostiqué.

## Traçabilité GitHub à partir du prochain sprint

Les sprints historiques restent prouvés par leurs commits. Pour les prochaines itérations, chaque besoin doit utiliser le modèle `Tâche de sprint`, être associé à un jalon GitHub et être fermé par une pull request. La revue de sprint pourra ainsi s’appuyer directement sur le jalon, les tickets fermés, les tests et la démonstration du produit.
