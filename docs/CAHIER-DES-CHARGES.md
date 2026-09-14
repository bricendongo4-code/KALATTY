# Cahier des charges — KALATTY

## 1. Contexte

KALATTY a commencé comme un prototype de plateforme e-learning. Le dépôt contient désormais un frontend, une API, une base de données évolutive et plusieurs parcours utilisateurs. Ce document fixe le périmètre pour transformer ce prototype en produit maintenable.

## 2. Objectif général

Permettre aux étudiants d’apprendre et de suivre leur progression, aux enseignants de produire et gérer des cours, et aux établissements d’administrer leurs comptes, classes et activités pédagogiques.

## 3. Utilisateurs

### Visiteur

- comprendre la proposition de valeur ;
- consulter les pages publiques et le catalogue accessible ;
- créer un compte ou se connecter.

### Étudiant

- gérer son profil ;
- rechercher et consulter des cours ;
- reprendre un apprentissage et suivre sa progression ;
- publier un avis selon les règles définies ;
- consulter ses notifications et son historique.

### Enseignant

- créer, modifier et organiser ses cours ;
- gérer les contenus et médias ;
- suivre l’activité liée à ses cours ;
- accéder à un tableau de bord adapté.

### Établissement

- gérer son espace organisationnel ;
- créer ou inviter des comptes ;
- organiser des classes ;
- consulter des indicateurs pédagogiques ;
- administrer ses enseignants et étudiants selon ses droits.

### Administrateur plateforme

Ce rôle doit être formalisé avant une mise en production complète. Il devra gérer les accès, les incidents, la modération et la configuration globale avec une traçabilité renforcée.

## 4. Périmètre fonctionnel

### 4.1 Accès et identité

- inscription par type de profil ;
- connexion et déconnexion ;
- réinitialisation de mot de passe ;
- invitation par jeton ;
- rôles et contrôle d’accès côté API ;
- avatar et profil.

### 4.2 Cours

- catalogue et fiche de cours ;
- création et édition par l’enseignant ;
- ressources pédagogiques et médias ;
- accès public ou restreint ;
- progression et reprise ;
- avis.

### 4.3 Tableaux de bord

- tableau de bord étudiant ;
- espace enseignant et studio de création ;
- espace établissement ;
- indicateurs adaptés au rôle ;
- navigation responsive.

### 4.4 Établissements

- création et gestion de l’établissement ;
- comptes gérés ;
- classes et invitations ;
- suivi de l’activité.

### 4.5 Services transverses

- notifications ;
- paiements, à stabiliser avant activation commerciale ;
- API mobile préparatoire ;
- assistance et pages de contact.

## 5. Hors périmètre immédiat

- application Flutter complète ;
- visioconférence native ;
- certification officielle ;
- marketplace financière en production ;
- fonctionnalités IA non cadrées.

Ces éléments devront faire l’objet de spécifications séparées.

## 6. Exigences non fonctionnelles

- interface responsive et accessible ;
- contrôle d’accès appliqué côté serveur ;
- validation des entrées et messages d’erreur compréhensibles ;
- aucune clé privée exposée au navigateur ;
- médias servis par des liens contrôlés ;
- journalisation des opérations sensibles ;
- sauvegarde et restauration documentées ;
- temps de chargement surveillé ;
- tests automatisés sur les parcours critiques.

## 7. Données principales

- utilisateurs, profils et rôles ;
- établissements, comptes gérés et classes ;
- cours, sections, ressources et médias ;
- inscriptions, accès et progression ;
- avis ;
- notifications ;
- paiements ;
- invitations.

Les migrations sont versionnées dans `database/`. Toute évolution de schéma doit être réversible ou accompagnée d’une procédure de retour arrière.

## 8. Critères de réussite du prochain jalon

- frontend et backend compilent automatiquement ;
- authentification et autorisations testées ;
- parcours étudiant, enseignant et établissement documentés ;
- aucun secret dans le dépôt ;
- déploiements reproductibles ;
- anomalies prioritaires enregistrées dans GitHub Issues ;
- environnement de démonstration stable.

## 9. Risques

- logique métier concentrée dans des services très volumineux ;
- couverture de tests insuffisante ;
- dépendance aux configurations Supabase et hébergement ;
- paiement présent dans le code avant validation complète du modèle métier ;
- dette documentaire et historique de commits peu normalisé.

## 10. Gouvernance

Le cahier des charges évolue par pull request. Toute nouvelle fonctionnalité doit avoir un ticket, des critères d’acceptation et une décision explicite sur sa priorité.
