# KALATTY

KALATTY est une plateforme d’apprentissage multi-acteurs qui réunit étudiants, enseignants et établissements dans un même environnement numérique.

## Vision

Simplifier la création, la diffusion et le suivi des apprentissages, tout en donnant à chaque acteur un espace adapté à ses responsabilités.

## Fonctionnalités présentes

- pages publiques, catalogue et consultation des cours ;
- inscription et authentification avec récupération de mot de passe ;
- espaces étudiant, enseignant et établissement ;
- création, modification et suivi des cours ;
- progression, avis et reprise de lecture ;
- comptes et classes gérés par les établissements ;
- notifications et premières fonctions de paiement ;
- API mobile en préparation.

Le périmètre détaillé et les priorités sont documentés dans le [cahier des charges](./docs/CAHIER-DES-CHARGES.md) et la [feuille de route](./ROADMAP.md).

## Architecture

```text
frontend/   Application Next.js / React
backend/    API NestJS
database/   Migrations et évolutions SQL Supabase
```

Consulter [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) pour les responsabilités, les flux et les règles de sécurité.

## Stack

- Next.js 16, React 19 et TypeScript
- NestJS 11 et API REST
- Supabase / PostgreSQL
- GitHub Actions
- Vercel pour le frontend
- Railway ou Render pour le backend

## Installation locale

### 1. Frontend

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm ci
npm run start:dev
```

Le frontend utilise par défaut `http://localhost:3000` et l’API `http://localhost:4000`.

## Variables d’environnement

Les modèles sont disponibles dans :

- `frontend/.env.example`
- `backend/.env.example`

Ne jamais versionner une clé Supabase privée, un jeton de déploiement ou un mot de passe.

## Qualité et contributions

Chaque modification doit passer par une branche dédiée et une pull request. Les conventions de branches, commits et revues sont décrites dans [CONTRIBUTING.md](./CONTRIBUTING.md).

La CI vérifie séparément le frontend et le backend à chaque push et pull request vers `master`.

## Déploiement

Le workflow `.github/workflows/deploy-kalatty.yml` gère le déploiement du backend Railway. Le fichier `render.yaml` permet une alternative Render.

Les déploiements nécessitent des secrets configurés dans GitHub ou dans la plateforme d’hébergement. Aucun secret ne doit apparaître dans ce dépôt public.

## État du projet

Le produit est fonctionnel mais reste en phase de stabilisation. Les priorités immédiates sont la sécurisation, les tests, la clarification des parcours et la fiabilisation du déploiement.
