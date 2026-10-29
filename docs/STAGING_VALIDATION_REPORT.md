# Kalatty — bilan de validation préproduction

## Périmètre et sécurité
- Branche : `staging/preproduction-readiness` ; PR #13 (brouillon).
- Aucun merge dans `master`, aucun déploiement volontaire sur Vercel/Railway.
- Tests GitHub Actions avec mocks/fixtures ; ne constituent **pas** une validation Supabase en conditions réelles.

## Résultats vérifiés
Sur le commit `7dc045ca2a51098c50f3dfb0233437027896afcf` :
- CI / Backend quality : **success**.
- Quality gate / QA Agent unit tests : **success**.
- Quality gate / Developer behavioral red-green smoke : **success**.
- Security Agent : **success**.
- Quality gate / Developer security triage : **success**.
- Frontend quality et tests navigateur : **in_progress** au dernier contrôle ; ne pas les déclarer réussis.
- Quality gate / Backend build and tests et smoke backend isolé : **in_progress** au dernier contrôle.

## Scénarios ajoutés
- Authentification / récupération de mot de passe : jeton ordinaire, invalide, valide, expiré, réutilisé, absent, mot de passe faible, erreur d'écriture Supabase.
- Institutions : refus hors établissement, lecture par étudiant, modification par enseignant, création non autorisée, nom et capacités invalides.
- Classes / devoirs : création de classe par enseignant, création de devoir par étudiant, consultation hors établissement, enseignant non affecté.
- Invitations : désactivées, expirées, épuisées ; ajout non autorisé de membre d'établissement.
- Membres des classes : refus d'ajout d'un utilisateur extérieur, ajout/retrait non autorisés.
- Notes : confidentialité des notes et commentaires non publiés, visibilité après publication.

## Vérifications restant à faire
1. Attendre la fin des jobs frontend/navigateur et relever leurs conclusions exactes.
2. Vérifier les nouveaux tests de notes sur le dernier commit.
3. Ajouter ou compléter les tests automatisés sur les paiements, la messagerie et les notifications après inspection de leurs modules.
4. Sur un environnement isolé, tester les véritables comptes et rôles, les politiques RLS Supabase, les e-mails de récupération, les invitations concurrentes, les uploads et les flux multi-établissements.
5. Ne pas modifier le modèle d'e-mail Supabase de production avant coordination du déploiement de la nouvelle récupération de mot de passe.
6. Demander une autorisation explicite avant fusion ou déploiement.

**Attention :** une suite verte avec des mocks ne prouve ni l'absence de vulnérabilités ni le bon fonctionnement de bout en bout.
