# Contribuer à KALATTY

## Branches

Ne pas développer directement sur `master`.

- `feature/nom-court` : nouvelle fonctionnalité
- `fix/nom-court` : correction
- `docs/nom-court` : documentation
- `refactor/nom-court` : restructuration sans changement fonctionnel
- `chore/nom-court` : maintenance

## Commits

À partir de maintenant, utiliser des messages courts au format Conventional Commits :

```text
feat(courses): ajouter la reprise de lecture
fix(auth): contrôler le rôle après connexion
docs: compléter le cahier des charges
ci: vérifier le frontend et le backend
```

Types principaux : `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`.

L’ancien historique est conservé. Il ne doit pas être réécrit uniquement pour renommer les commits.

## Avant une pull request

```bash
cd frontend
npm ci
npm run lint
npm run build

cd ../backend
npm ci
npm run build
npm test -- --runInBand
```

## Pull request

Une pull request doit :

- référencer un ticket ;
- expliquer le besoin et les changements ;
- contenir des critères de vérification ;
- signaler toute migration ou variable d’environnement ;
- ne contenir aucun secret ;
- être suffisamment petite pour être relue.

## Base de données

Toute modification SQL doit être ajoutée dans `database/` et documenter son impact. Ne jamais modifier silencieusement une migration déjà appliquée en production.
