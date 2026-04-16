# Kalatty

Kalatty est une plateforme d'apprentissage avec trois espaces principaux:

- etudiants
- enseignants
- etablissements

Le projet contient:

- `frontend`: application Next.js
- `backend`: API NestJS
- `database`: scripts SQL d'evolution
- `mobile`: future application Flutter

## Demarrage local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

## Variables d'environnement

### Frontend

Copier `frontend/.env.example` vers `frontend/.env.local` puis definir:

- `NEXT_PUBLIC_API_BASE_URL`

### Backend

Copier `backend/.env.example` vers `backend/.env` puis definir:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## Point critique actuel

Pour la creation des cours et les uploads video, le backend doit utiliser
`SUPABASE_SERVICE_ROLE_KEY`.

Si le backend tourne avec une cle publishable seulement, Supabase bloque les
insertions avec une erreur de type:

`new row violates row-level security policy for table "courses"`

## Deploiement conseille pour les tests

### Frontend

- deployer `frontend` sur Vercel

Variables:

- `NEXT_PUBLIC_API_BASE_URL=https://...backend...`

### Backend

- deployer `backend` sur Render ou Railway

Variables:

- `PORT`
- `CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

Exemple:

- `CORS_ORIGINS=https://ton-frontend.vercel.app,http://localhost:3000`

### Render

Le depot contient un fichier `render.yaml` a la racine pour accelerer le
deploiement du backend.

## Base de donnees

Les scripts SQL lies aux etablissements et aux invitations sont dans:

- `database/2026-04-14_add_institutions.sql`
- `database/2026-04-14_add_room_invites.sql`
