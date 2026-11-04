# Correction à examiner : accès directs aux tables

Le contrôle du 4 novembre 2026 confirme 16 tables publiques sans RLS, avec des permissions de lecture et d'écriture pour `anon` et `authenticated`. Cela permet de contourner l'API Kalatty pour accéder directement à ces tables via la Data API Supabase. Ce contrôle porte sur les permissions et le schéma ; il ne démontre pas qu'un accès malveillant a eu lieu.

## Changement proposé

La migration `backend/migrations/20261104144901_restrict_private_table_access.sql` active la RLS et retire les permissions directes de `PUBLIC`, `anon` et `authenticated` sur les 16 tables listées. Elle conserve l'accès du backend via `service_role`. Les données, colonnes et règles métier ne sont pas modifiées. Les politiques existantes de `room_invites` sont conservées ; les accès clients passent par les routes du backend qui utilisent l'identité Kalatty.

Le code frontend du dépôt ne contient aucun client Supabase direct ; ses appels métier passent par l'API. Le backend possède `SUPABASE_SERVICE_ROLE_KEY` dans Railway (présence vérifiée sans lecture de sa valeur), et le rôle `service_role` dispose du contournement RLS requis. Des clients externes qui interrogent directement ces tables avec une clé publique perdraient cet accès : ils doivent utiliser les routes Kalatty autorisées.

## Vérification avant application

Le fichier `backend/test/private-table-access.sql` vérifie les 16 tables avec `anon`, `authenticated` et `service_role`, sans consulter ni modifier de données utilisateur (`LIMIT 0`, `WHERE false`). Le test vérifie aussi que l'audit des tables non protégées ne renvoie plus d'alerte dans la transaction d'essai.

Exécuter `BEGIN;`, le contenu de la migration, le contenu du test, puis `ROLLBACK;` pour examiner le résultat sans conserver les changements. Les délais de verrouillage et d'exécution sont bornés. Après approbation et application, revérifier les permissions, puis les parcours avec de vrais comptes autorisés ; le test de permissions ne remplace pas ce dernier contrôle.

Le test isolé `backend/test/private-table-access.mjs` reproduit les rôles et les 16 tables dans PostgreSQL embarqué (PGlite 0.5.15), sans connexion Supabase ni données utilisateur. Résultat obtenu : 16 tables exposées avant, 0 dans la transaction de test, puis 16 après annulation. Les lectures et mises à jour directes sont refusées aux deux rôles publics et restent possibles côté serveur. Ce test vérifie le SQL de permissions sur un schéma minimal ; il ne reproduit pas les parcours applicatifs complets.

Pour le reproduire sans ajouter une dépendance à l'application :

```sh
npm install --prefix /tmp/kalatty-rls-validation --no-save --ignore-scripts @electric-sql/pglite@0.5.15
NODE_PATH=/tmp/kalatty-rls-validation/node_modules node backend/test/private-table-access.mjs
```

## Portée

Cette proposition ferme les accès directs aux 16 tables recensées. Les contrôles de l'API backend, les fonctions privilégiées, vues et politiques de stockage sont des périmètres distincts : cette migration n'est pas une certification de sécurité globale de Kalatty. Aucun déploiement ni application définitive ne doit être présenté comme effectué avant validation du propriétaire.
