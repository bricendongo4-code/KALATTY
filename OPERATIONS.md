# Exploitation de Kalatty

## Supervision

- `GET /health/live` confirme que le processus NestJS répond.
- `GET /health/ready` vérifie également l’accès à Supabase. Railway utilise cette route avant de considérer un déploiement comme disponible.
- Chaque réponse API contient `x-request-id`. Les logs Railway sont structurés en JSON avec la route, le statut et la durée, sans contenu utilisateur ni jeton.
- Configurer un moniteur externe sur `https://kalatty-backend-production.up.railway.app/health/ready` et `https://kalatty-frontend.vercel.app/login`. Une alerte n’est utile qu’après deux échecs consécutifs.

## Sauvegardes Supabase

Le workflow `Encrypted Supabase backup` produit chaque nuit un dump PostgreSQL chiffré et vérifie sa structure avant stockage pendant sept jours.

Secrets GitHub requis :

- `SUPABASE_DB_URL` : chaîne PostgreSQL directe fournie par Supabase, réservée au workflow.
- `BACKUP_ENCRYPTION_KEY` : phrase secrète longue, conservée hors de GitHub dans le gestionnaire de secrets du responsable.

Sans ces deux secrets, le workflow se termine sans erreur et indique que la sauvegarde n’est pas configurée. Ne jamais stocker un dump non chiffré dans GitHub.

### Test de restauration trimestriel

1. Télécharger l’artefact chiffré le plus récent.
2. Déchiffrer dans un environnement isolé avec `openssl enc -d -aes-256-cbc -pbkdf2`.
3. Restaurer vers une base Supabase de test avec `pg_restore --clean --if-exists`.
4. Vérifier les comptes, cours, classes, devoirs et progressions.
5. Détruire la base de test et le dump déchiffré après validation.

## Incidents

1. Relever l’heure, la route et le `x-request-id` affiché dans les logs.
2. Vérifier Railway, Supabase puis Vercel dans cet ordre.
3. Ne jamais copier de mot de passe, jeton JWT ou clé Supabase dans un ticket.
4. Si des données personnelles sont concernées, conserver une chronologie et limiter immédiatement les accès compromis.

## Mise en production

- Exécuter lint, builds, tests backend et tests Playwright.
- Appliquer les migrations SQL non exécutées, notamment `2026-09-25_privacy_requests.sql`.
- Vérifier les variables CORS, Supabase, URL frontend, durée des liens médias et secrets de sauvegarde.
- Tester les trois parcours principaux sur mobile et ordinateur avant l’ouverture aux utilisateurs.
