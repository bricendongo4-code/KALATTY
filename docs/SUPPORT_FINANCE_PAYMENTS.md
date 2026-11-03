# Avis, support et finance — Kalatty

## Espaces disponibles

- `/feedback`, accessible depuis les six espaces : avis sur Kalatty, note, sujet, commentaire et suivi privé. Les avis sur les cours restent distincts. Maximum cinq avis par compte sur 24 heures. Pas de publication publique automatique.
- Control Center → **Avis & support** : lecture des avis, proposition déterministe de service, correction de cette proposition par le propriétaire, confirmation de l’orientation, suivi en cours/traité et note visible par l’auteur. L’orientation crée une proposition **en attente**, sans patch ni publication automatique. Le contenu d’un avis reste une donnée ; il n’autorise aucune action.
- Control Center → **Suivi financier** : période UTC, sommes vérifiées et tableau des transactions avec payeur et bénéficiaire. Totaux calculés sur toutes les lignes de la période ; tableau paginé par 50 et CSV de la page affichée. Frais prestataire rapprochés manuellement avec référence, dépenses payées/prévisionnelles, annulation journalisée d’une mauvaise saisie, conditions et décisions de retrait.
- Formateur → **Revenus** : portefeuille, compte Orange Money / MTN MoMo camerounais et demandes de retrait. Minimum initial configurable : **5 000 XAF** ; disponibilité initiale : **7 jours** après confirmation. Plafond d’une demande : 700 000 XAF. Ces valeurs sont des paramètres de Kalatty, pas une promesse de conditions contractuelles du prestataire.
- Apprenant → paiement d’un cours → `/checkout?course=…` : guichet Mobile Money et carte conditionnelle. Le code secret Mobile Money et les données de carte sont saisis chez le prestataire, jamais chez Kalatty.
- Direction établissement → **Abonnement** : choix/renouvellement d’un forfait, historique et échéance. Le responsable paie pour l’établissement, pas chaque compte interne. Prix existants conservés : Starter 25 000, Growth 65 000, Campus 120 000 XAF pour 30 jours ; aucun prélèvement récurrent. Un forfait payé expiré bloque les parcours campus et l’accès aux cours seulement fourni par l’établissement ; contexte et facturation restent accessibles pour renouveler. Les espaces historiques/d’essai sans échéance ne sont pas convertis automatiquement en comptes payants. Leur politique de fin d’essai reste à décider avant lancement commercial.

## Calculs

- Encaissements bruts : cours et forfaits dont le paiement est confirmé en XAF par CinetPay.
- Chiffre d’affaires Kalatty : commissions des cours (taux existant : 15 %) + forfaits établissements confirmés. La part professeur n’est pas du chiffre d’affaires Kalatty.
- Résultat de gestion **provisoire** : chiffre d’affaires − dépenses payées déclarées − frais prestataire renseignés. Les dépenses prévisionnelles sont affichées à part. Les frais inconnus sont signalés, pas inventés. Ne pas enregistrer une seconde fois comme dépense les frais déjà déduits sur une transaction.
- Les anciennes lignes `paid` sans preuve de confirmation conservée sont marquées `legacy` ; les démonstrations sont `demo`. Elles restent visibles, mais n’alimentent ni les recettes vérifiées ni les retraits. Aucun ancien paiement n’a été déclaré encaissé par supposition.
- Le résultat de gestion n’est ni un bilan comptable, ni un calcul d’impôts, ni le solde bancaire. Pas de rapprochement automatique de factures Railway/Vercel/OpenAI, de conversion de devise, de remboursement ou de gestion de contestation. Une facture étrangère doit être saisie avec le montant XAF effectivement payé et sa référence/taux.

## Retraits : préparation et décision uniquement

Les transferts sortants ne sont **pas connectés**. Enregistrer ou approuver une demande réserve les fonds, sans les envoyer. Le bénéficiaire (opérateur, numéro, nom) est figé sur la demande, indépendamment des changements ultérieurs du compte de retrait. Les demandes concurrentes partagent un verrou par professeur ; une clé d’idempotence empêche une double réservation. Le rejet libère le montant réservé. Aucun endpoint ne permet de s’attribuer un statut `paid` ou de déclencher un transfert.

Avant de brancher les versements : contractualiser le service de payout, vérifier le titulaire et les obligations du prestataire, convenir des frais et conditions, implémenter confirmation, rapprochement, idempotence et état ambigu sans renvoi automatique, puis faire des essais contrôlés. Les fonctions encaissement et versement d’un prestataire sont des intégrations distinctes.

## Connexion des encaissements

Le code utilise CinetPay Checkout : `PAYMENT_PROVIDER=cinetpay`, `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `PUBLIC_API_URL`, `FRONTEND_URL`. Les secrets restent au serveur. Sans configuration complète, l’API refuse tout lancement et l’écran le dit explicitement. Ne pas fournir les secrets dans une discussion.

La carte est désactivée tant que `CINETPAY_CARD_ENABLED` n’est pas exactement `true`. Ne l’activer qu’après validation du moyen de paiement pour le contrat marchand et essais. Les coordonnées de facturation requises sont demandées, pas inventées. Les canaux disponibles dépendent du compte marchand et du pays.

Webhook : `POST /payments/cinetpay/notify`. Chaque notification provoque une vérification serveur auprès de CinetPay ; statut, montant et devise doivent correspondre. Le retour navigateur ne confirme jamais un paiement. Les confirmations et activations sont atomiques. Une notification répétée ne modifie pas la date de confirmation ni ne prolonge une seconde fois le forfait. Une référence de paiement en attente est réutilisée ; le lien de guichet et son canal sont conservés. Une réponse ambiguë ne crée pas une nouvelle transaction payante.

Avant lancement : vérifier les parcours marchands et webhooks avec les comptes de test/production autorisés, décider la fin des essais établissements, les conditions commerciales, la politique de remboursements et les conditions de versement. Aucun encaissement ou transfert réel n’a été exécuté pour cette livraison. Ne pas activer `PAYMENTS_DEMO_MODE` sur un service commercial.

## Protection et validation

Les sept nouvelles tables sont privées au service backend (RLS + absence de droits `anon`/`authenticated`). Les endpoints utilisateurs déduisent l’identité du JWT, jamais d’un identifiant fourni dans le corps. Le portefeuille exige un rôle professeur relu en base. Les écrans support/finance et leurs mutations exigent le propriétaire confirmé via Auth en direct. Les termes financiers et confirmations ne sont pas modifiables directement via la Data API ; les changements sont journalisés.

`backend/test/commerce-acceptance.sql` vérifie dans une transaction annulée : calculs et dépenses, réservation et rejet, idempotence, bénéficiaire figé, répétition des confirmations cours/forfaits, orientation des avis et interdiction d’accès direct aux tables/fonctions. Les tests unitaires couvrent notamment montant/devise erronés, carte non activée, rôle et validation des données. Les tests navigateur utilisent des fixtures et ne prouvent pas une intégration marchande réelle.

Les contrôles de sécurité signalent par ailleurs des problèmes **préexistants** sur d’autres tables de la plateforme. Cette livraison ne constitue pas un audit global ni une certification de sécurité.
