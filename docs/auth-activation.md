# Connexion AIME — activation explicite

Cette PR ajoute une connexion **par lien e-mail** avec Better Auth 1.7.12 sur
PostgreSQL Neon. Il ne s'agit pas du service managé Neon Auth : ses variables
`DATABASE_NEON_AUTH_BASE_URL` et `DATABASE_VITE_NEON_AUTH_URL` ne sont pas utilisées.
Aucune passkey, synchronisation de projets ni protection des API de démonstration
`/api/sv/*` n'est ajoutée. La page `/compte/` est accessible depuis le Bureau.
Les projets locaux restent utilisables sans compte ; se connecter ne les importe pas.

## Avant activation

1. Sur une **branche Neon de test séparée**, configurer les variables serveur :
   `DATABASE_URL`, `BETTER_AUTH_SECRET` (aléatoire, 32 caractères minimum),
   `BETTER_AUTH_URL` (origine HTTPS exacte, sans chemin), `RESEND_API_KEY` et
   `AUTH_EMAIL_FROM` (expéditeur réellement validé dans Resend).
   Ne pas copier une valeur chiffrée du dashboard comme adresse expéditeur.
2. Configurer Preview indépendamment de Production. Ne pas réutiliser une URL
   de production pour une preview. Ne pas autoriser de wildcard de previews.
   Une URL stable de branche facilite cette configuration. La clé Resend doit
   aussi être disponible dans Preview pour tester l'envoi.
3. Charger ces variables dans un environnement opérateur sécurisé, puis exécuter
   `node scripts/auth-schema.mjs` pour **inspecter** le SQL calculé par la version
   verrouillée de Better Auth. Cela lit le schéma, sans l'appliquer.
4. Après revue et sauvegarde, exécuter `node scripts/auth-schema.mjs --apply`
   **sur la branche de test uniquement**. Cela crée les tables préfixées
   `aime_auth_` (utilisateurs, comptes, sessions, vérifications et rate limit).
   Aucune migration n'est exécutée par le build ni par les requêtes.
5. Redéployer la preview avec sa propre origine, puis tester une adresse réelle :
   réception du lien, connexion, session, déconnexion, refus de réutilisation et
   expiration (5 minutes). Vérifier également les cookies Secure/HttpOnly/Lax.
6. Une activation production exige une validation séparée : origine courante,
   variables, expéditeur validé, migration revue et test du parcours après déploiement.
   Sans configuration complète, l'API renvoie 503 ; la PR seule n'active rien.

## Sécurité et vérifications

- Jeton de lien stocké haché, consommé une seule fois par la bibliothèque.
- Sessions stockées côté serveur, expiration à 7 jours, sans cookie-cache de session.
- Limitation anti-abus stockée en base pour les fonctions distribuées.
- Mutations limitées à l'origine exacte, protections Better Auth conservées.
- Aucune identité fournie par le navigateur ne doit autoriser un futur accès métier :
  chaque future API privée devra utiliser une session serveur vérifiée et ses ACL.
- Tests locaux avec adaptateur mémoire : session anonyme, comptes isolés,
  révocation, expiration de session et de lien, lien réutilisé, origine étrangère,
  configuration absente et méthodes interdites.
- Envoi Resend simulé dans les tests. Ils ne prouvent ni la connexion PostgreSQL,
  ni la migration réelle, ni la délivrabilité, ni le déploiement Vercel.
- La récupération de compte ne déchiffre pas le Noyau. Passkeys et stratégie
  de récupération du Noyau restent un chantier distinct.

Références : https://better-auth.com/docs/adapters/postgresql et
https://better-auth.com/docs/plugins/magic-link.
