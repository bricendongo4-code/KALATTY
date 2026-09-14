# Architecture de KALATTY

## Vue d’ensemble

KALATTY suit une architecture web séparant l’interface, l’API métier et la persistance.

```text
Navigateur
   │
   ▼
Next.js / React (frontend)
   │ API REST
   ▼
NestJS (backend)
   │
   ▼
Supabase / PostgreSQL + stockage
```

## Frontend

Le répertoire `frontend/` contient l’application Next.js avec l’App Router. Il porte :

- les pages publiques ;
- l’authentification et les formulaires d’inscription ;
- les tableaux de bord selon le rôle ;
- le lecteur et les interfaces de cours ;
- les appels vers l’API.

Le frontend ne doit jamais utiliser une clé de service Supabase ni décider seul des autorisations.

## Backend

Le répertoire `backend/` contient l’API NestJS. Les modules existants couvrent :

- `auth` : authentification et sessions ;
- `courses` : cours, contenus et progression ;
- `dashboard` : agrégations par profil ;
- `institutions` : établissements, comptes et classes ;
- `notifications` : notifications ;
- `payments` : fonctions de paiement ;
- `mobile` : endpoints préparatoires ;
- `supabase` : accès à la plateforme de données.

Les services dépassant plusieurs centaines de lignes devront progressivement être séparés par cas d’usage et responsabilités.

## Base de données

Les scripts du répertoire `database/` décrivent les évolutions SQL. Une convention unique de migration doit être conservée :

`AAAA-MM-JJ_description.sql`

Chaque migration doit préciser ses prérequis, son impact et, lorsque possible, son retour arrière.

## Authentification et autorisations

L’identité est vérifiée par l’API. Chaque endpoint sensible doit contrôler le rôle et la propriété de la ressource. Les règles Supabase RLS constituent une protection complémentaire et non un remplacement de la logique d’autorisation serveur.

## Médias

Les vidéos, avatars et ressources privées doivent utiliser un stockage adapté avec des liens temporaires. Aucun média volumineux ni document utilisateur ne doit être versionné dans Git.

## Déploiement

- frontend : Vercel ;
- backend : Railway ou Render ;
- données : Supabase ;
- automatisation : GitHub Actions.

Les déploiements ne doivent s’exécuter qu’après les contrôles de qualité. Les environnements preview, recette et production devront être distingués.

## Observabilité à prévoir

- logs structurés sans données sensibles ;
- suivi des erreurs frontend et backend ;
- endpoint de santé ;
- alertes de déploiement ;
- indicateurs de performance et d’usage.

## Décisions à formaliser

- modèle économique et paiement ;
- règles précises d’accès aux cours ;
- rôle administrateur global ;
- conservation des données ;
- stratégie mobile ;
- politique de modération des contenus et avis.
