# Kalatty — audit transversal des 7 domaines (revue statique initiale)

**Périmètre :** code sur `staging/preproduction-readiness`, arbre GitHub de 399 entrées ; examen des routes frontend, modules backend et contrôles existants. **Pas de test manuel connecté à Supabase, pas d'essai en production.** Les conclusions distinguent les défauts constatés des risques à tester.

## 1. Messagerie — CRITIQUE (fonctionnalité manquante / non démontrée)
- Aucun module backend dédié aux conversations privées (`messages`, `messaging`, `chat`) dans `backend/src` ni import correspondant dans `app.module.ts`.
- `frontend/app/establishment/[role]/[[...section]]/page.tsx` associe `admin/communication` à `ActivityPage` ; ce composant publie des **annonces** via `POST /campus/announcements`, pas des messages privés.
- **Conséquence :** envoi/réception privés, droits par conversation, pièces jointes et accusés de lecture non validables. Ne pas présenter les annonces comme une messagerie opérationnelle.
- À réaliser : spécification conversations, participants, isolation établissement, pièces jointes privées, permissions et tests multi-comptes.

## 2. Notifications — CRITIQUE / CORRECTION SUR BRANCHE
- **Défaut avéré :** `buildStudentNotifications` dans `backend/src/notifications/notifications.service.ts` filtrait les copies sur `status=reviewed` mais pas sur `published=true` et affichait `submission.score`. `getMyGrades` masque pourtant la note avant publication.
- **Correctif de branche :** ajout du filtre `.eq('published', true)` dans la requête des notifications de notes. Vérifier sur GitHub Actions et avec données réelles avant fusion.
- `NotificationBell.tsx` affiche les non-lues (6 max) et permet lecture individuelle / globale ; `notifications.controller.ts` expose GET, PATCH read-all, PATCH read, **pas de DELETE**. La suppression n'est donc pas implémentée par cette API.
- À tester : compteur après changement de compte, navigation, lecture concurrente, réception, suppression si exigée, erreurs RLS et liens autorisés. `markRead` écrit également un reçu pour la clé demandée ; vérifier que la politique RLS protège les reçus.

## 3. Administration — ÉLEVÉ
- Routes et services pour utilisateurs, établissements, classes, admissions, annonces et documents présents.
- Contrôles `assertInstitutionStaff` et vérifications d'appartenance présents sur plusieurs opérations ; tests mocks ajoutés pour ajouts/retraits, invitations et accès.
- Restent non prouvés : cloisonnement réel Supabase RLS entre établissements, cycle complet invitation/compte, import et suppression de documents, actions en concurrence, audit des actions sensibles.

## 4. Enseignants — ÉLEVÉ
- Routes frontend classes, séances, évaluations, devoirs ; backend affectations, remises et correction.
- `getMyGrades` masque les notes non publiées ; le canal notifications contournait cette confidentialité (corrigé sur branche).
- À tester : publication et dépublication, note hors barème, droits enseignant affecté/non affecté, upload privé, restitution à l'étudiant, cohérence des compteurs.

## 5. Étudiants — ÉLEVÉ
- Pages de travaux, résultats, présences, matières, cours et notifications présentes.
- Tests mock pour accès aux classes, remises, notes et autorisations ; pas de preuve d'exécution multi-comptes.
- À tester : étudiant A vs B, établissement A vs B, rendu hors délai, pièces jointes, cours gratuits/payants, progression et certificats.

## 6. Formateurs indépendants / Studio — ÉLEVÉ
- `StudioService` contient des vérifications de rôle via `profiles`, de propriété de formation, de projet par `teacher_id`, et de version optimiste pour les mises à jour.
- `StudioPage` propose projet, script, transcription, vidéo et assistant pédagogique ; l'IA dépend d'une configuration externe.
- À tester : accès à un projet d'autrui, modification concurrente, vidéo appartenant à autrui, droits Storage et limites de génération IA. Ne pas assimiler l'existence d'un bouton à un workflow vidéo complet validé.

## 7. Navigation, qualité et performance — MOYEN / ÉLEVÉ
- Le routeur `[role]/[[...section]]` vérifie les rôles/sections déclarés et renvoie 404 pour les sections non implémentées ; les pages consomment un contexte de rôle.
- `roles.ts` contient des noms de profil et compteurs de notifications d'exemple ; déterminer où ils sont réellement affichés avant de qualifier cela de fuite ou bug visible.
- Vérifier liens externes, erreurs API, états vides, mobile, clavier, chargements et temps de réponse avec tests navigateur authentifiés.
- Les résultats complets frontend et navigateur doivent être relevés sur les runs de la branche, pas supposés verts.

## Hors périmètre de validation immédiate : paiements
Le prestataire n'est **pas encore branché**, confirmé par le propriétaire. Ne pas activer CinetPay ni simuler de paiements réussis en production. Garder les protections contre l'accès non autorisé et le contournement des formations payantes ; tester le prestataire uniquement après intégration explicite.

## Conditions avant fusion / production
1. CI complète verte, incluant frontend et navigateur.
2. Tests d'intégration réels sur environnement isolé : comptes et établissements distincts, RLS, Storage, récupération e-mail, invitations.
3. Validation métier de la messagerie (ou annonce explicite de son absence), confidentialité des notes et notifications.
4. Vérification des parcours par rôle sur ordinateur et mobile.
5. Autorisation explicite du propriétaire avant merge ou déploiement.

**Statut :** audit statique initial des sept domaines, pas une certification de sécurité ni un audit exhaustif de chaque ligne ou écran.
