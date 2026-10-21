# Comptes, espaces partagés et invitations

## Ce qui existe
- **`/compte/`** : se connecter par **lien e-mail** (Resend, 15 min, usage unique) puis ajouter une **clé d'accès** (Face ID, Touch ID, empreinte). Profil : nom et **photo en timbre** (image réduite à 360 × 450, WebP, ≤ 150 Ko, jamais une adresse externe).
- **Espaces** : créer un espace (avec le programme de démonstration Mariage ou Séminaire, ou sans), inviter par **rôle**, rejoindre, voir les membres en timbres, retirer, annuler une invitation.
- **Invitations** : jeton aléatoire de 32 octets, seule son empreinte SHA-256 est en base, **usage unique**, 7 jours, éventuellement **réservé à une adresse**. Qui peut inviter qui : `synchroview/permissions.js` (`space.invite`) — propriétaire : tous les rôles sauf propriétaire ; coordination : lecture seule et invités.
- **Direct réel** : `/live/?espace=<id>` — la personne vient de la session, le rôle de `space_members`, relu à chaque action.
- Le propriétaire seul voit les adresses e-mail et les invitations ; un non-membre reçoit « Espace introuvable » (rien n'est révélé).

## Pour l'ouvrir sur la preview (à faire par vous)
1. **Base** : console SQL Neon, branche `preview/integration`, exécuter `db/migrations/2026-10-21-comptes.sql` (ajouts, rejouable).
2. **Variables Vercel (Preview seulement)** :
   - `BETTER_AUTH_SECRET` : une chaîne aléatoire d'au moins 32 caractères (par exemple le résultat de `openssl rand -hex 32`).
   - `RESEND_API_KEY` et `AUTH_FROM` (ex. `AIME <connexion@votre-domaine-vérifié>`) pour l'envoi des liens. Sans elles, la connexion par lien répond « envoi des e-mails pas encore configuré ».
   - Facultatif : `BETTER_AUTH_URL` (sinon l'adresse de la branche Vercel est utilisée).
3. Redéployer `integration`.

## Limites connues
- Les clés d'accès sont liées au nom de domaine : une clé créée sur l'adresse de preview ne servira pas sur le domaine final.
- La protection Vercel de la preview s'applique aussi au lien reçu par e-mail : ouvrez-le dans un navigateur déjà connecté à Vercel.
- En production, ces routes répondent 404 tant que rien n'est décidé.

## Tests
- `tests/comptes-statique.test.cjs` : fermeture par défaut, photo, absence de secret et d'innerHTML.
- `tests/comptes.test.cjs` : contre une **vraie base PostgreSQL locale** (`TEST_DATABASE_URL=… npm test`) — lien e-mail, invitations, règles, cloisonnement, direct réel. Ignoré sans base de test.
