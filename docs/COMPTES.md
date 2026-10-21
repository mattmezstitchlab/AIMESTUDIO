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
   - `RESEND_API_KEY` et `AUTH_EMAIL_FROM` (ou `AUTH_FROM`) (ex. `AIME <connexion@votre-domaine-vérifié>`) pour l'envoi des liens. Sans elles, la connexion par lien répond « envoi des e-mails pas encore configuré ».
   - Facultatif : `BETTER_AUTH_URL` (sinon l'adresse de la branche Vercel est utilisée).
3. Redéployer `integration`.

## Limites connues
- Les clés d'accès sont liées au nom de domaine : une clé créée sur l'adresse de preview ne servira pas sur le domaine final.
- La protection Vercel de la preview s'applique aussi au lien reçu par e-mail : ouvrez-le dans un navigateur déjà connecté à Vercel.
- Les comptes sont ouverts en production (décision du 22/10/2026), toujours fermés (503) sans base ni secret.
- En production, les deux démonstrations d'AIME Live (mariage, séminaire) restent dans le navigateur : pas de journal public partagé. Seuls les espaces réels passent par le serveur, et les laissez-passer y sont signés avec un vrai secret (`LIVE_DEMO_SECRET`, sinon `BETTER_AUTH_SECRET`), jamais avec un secret dérivé du commit.
- Supprimer son compte (`/api/auth/delete-user`, session de moins de 24 h) efface le compte, les sessions et les clés d'accès, les espaces possédés (avec leurs membres, invitations et direct), les adhésions et les invitations non utilisées à son adresse. La page `/confidentialite/` le décrit.

### Mise en production : prérequis
1. Base Neon de **production** : `db/migrations/2026-10-21-live-journal.sql`, PUIS `db/migrations/2026-10-21-comptes.sql`, dans cet ordre.
2. Vercel, environnement Production : `BETTER_AUTH_URL=https://www.lemondeaime.com` (l'adresse exacte, celle des clés d'accès), `BETTER_AUTH_SECRET` (32 caractères ou plus), `DATABASE_URL`, `RESEND_API_KEY` et `AUTH_EMAIL_FROM` au format `AIME <connexion@lemondeaime.com>`.
3. `lemondeaime.com` redirige vers `www.lemondeaime.com` : une seule adresse pour les cookies et les clés d'accès.

## Tests
- `tests/comptes-statique.test.cjs` : fermeture par défaut, photo, absence de secret et d'innerHTML.
- `tests/comptes.test.cjs` : contre une **vraie base PostgreSQL locale** (`TEST_DATABASE_URL=… npm test`) — lien e-mail, invitations, règles, cloisonnement, direct réel. Ignoré sans base de test.
