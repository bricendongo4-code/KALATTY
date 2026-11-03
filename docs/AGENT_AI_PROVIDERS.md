# Fournisseur IA des agents Kalatty

Les analyses par département, les recommandations/corrections proposées par la supervision et les brouillons commerciaux IA utilisent un seul connecteur serveur partagé. Les autres fonctions OpenAI de la plateforme (studio, etc.) conservent leur configuration propre.

## Groq pour les premiers essais

Variables du service backend Railway :

```
KALATTY_AI_PROVIDER=groq
KALATTY_GROQ_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=<clé privée créée dans votre compte Groq>
```

Créer la clé depuis https://console.groq.com/keys, puis l’enregistrer directement dans les variables serveur. Aucun secret ne doit être envoyé au frontend ou préfixé `NEXT_PUBLIC_`.

Le compte Groq doit rester sur son Free Plan pour utiliser ses quotas gratuits. Kalatty ne déduit pas le plan de facturation à partir de la clé et ne peut pas garantir la gratuité d’un compte que son propriétaire ferait évoluer vers un plan payant. Les quotas exacts et modèles accessibles se vérifient dans le compte Groq. Le modèle `openai/gpt-oss-120b` est également accepté comme choix explicite ; il n’existe aucun changement de modèle automatique.

En mode Groq, une clé absente/refusée, une limite atteinte (429), une indisponibilité ou une réponse incomplète arrête la génération. Il n’y a **ni repli sur OpenAI, ni nouvelle tentative automatique**. Les anciens `OPENAI_API_KEY` et `KALATTY_AI_MODEL` ne sont pas utilisés par les agents tant que Groq est sélectionné.

## Diagnostic et activation

1. Enregistrer la clé et attendre le redéploiement du backend.
2. Dans Control Center → Paramètres → Supervision des agents, vérifier le fournisseur/modèle affichés.
3. Cliquer **Tester la connexion IA**. Ce test, réservé au propriétaire confirmé, envoie uniquement une demande de diagnostic sans données utilisateur. Il consomme un appel du quota journalier partagé, ne change pas le réglage des analyses automatiques et ne prépare aucune correction.
4. Après un test réussi, activer les analyses automatiques si souhaité ou demander une analyse ciblée depuis un département.

`brainConfigured` signifie seulement que la configuration serveur requise est présente. Le bouton de test vérifie une requête réelle ; un succès n’est pas une garantie de disponibilité future du fournisseur.

Les analyses automatiques restent désactivées jusqu’à activation par le propriétaire. Le plafond existant de **12 appels IA/jour** est partagé par les trois usages et le diagnostic, via `reserve_ai_call`. Les quotas Groq peuvent limiter davantage les requêtes. Les propositions de patch restent validées contre la source exacte, approuvées par le propriétaire, préparées en PR et publiées uniquement par une décision distincte après CI. Les brouillons ne sont jamais envoyés par le connecteur IA.

## Compatibilité et confidentialité

Les deux fournisseurs utilisent Responses API sur des URL fixes :

- Groq : `https://api.groq.com/openai/v1/responses`
- OpenAI : `https://api.openai.com/v1/responses`

`store:false`, aucun outil externe et aucun suivi de redirection. La réponse exploitée contient seulement le texte final ; raisonnement interne, réponses interrompues et erreurs fournisseur brutes ne sont pas transmis à l’utilisateur. Les erreurs affichées ne contiennent ni clé ni corps de requête.

Les départements reçoivent des compteurs agrégés. Le développeur peut recevoir un fichier autorisé (moins de 10 000 octets sous Groq pour réduire la consommation) et les commentaires de révision comme données non fiables. Les brouillons reçoivent le brief commercial enregistré et les informations publiques de l’entreprise prospectée. Aucun historique de conversation n’est maintenu par le connecteur.

## Retour explicite à OpenAI

```
KALATTY_AI_PROVIDER=openai
KALATTY_AI_MODEL=<modèle configuré>
OPENAI_API_KEY=<clé serveur>
```

Le fournisseur implicite reste OpenAI pour les installations existantes sans `KALATTY_AI_PROVIDER`. Le passage à un fournisseur payant doit être un choix explicite de configuration ; une panne Groq ne le fait jamais.

## Validation

Tests du connecteur : sélection du bon hôte et de la bonne clé, absence de fuite ou de repli, réponses partielles/refusées, modèles autorisés, compatibilité des trois usages, respect du quota, contrôle d’activation et diagnostic sans action métier. Le test réel du compte Groq reste à effectuer après l’enregistrement de sa clé.

Références primaires :
- https://console.groq.com/docs/responses-api
- https://console.groq.com/docs/openai
- https://console.groq.com/docs/rate-limits
