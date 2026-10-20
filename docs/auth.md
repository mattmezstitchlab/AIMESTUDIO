# Comptes AIME — Better Auth (lien par e-mail et passkey)

## Ce que fait cette version
- `/api/auth/*` : routes Better Auth 1.7.7 (réécriture dans `vercel.json` vers `api/auth.mjs`).
- Connexion par **lien e-mail** (valable 10 min, usage unique, jeton stocké haché) et par **passkey**.
- Pas de mot de passe. Rôle `member` par défaut ; `creator` ne s'attribue que dans la base.
- Cookies sécurisés (HttpOnly, Secure, SameSite=Lax), session 30 jours, révocable côté serveur.
- Origines acceptées : l'adresse du déploiement ; en production `www.lemondeaime.com` et `lemondeaime.com`.
- Passkeys : liées à `lemondeaime.com` en production ; chaque preview a les siennes (isolées).
- Migrations à chaque déploiement (`node scripts/migrate.mjs`, commande de build) : tables Better Auth,
  puis `db/schema.sql` (rejouable). Une migration qui échoue arrête le déploiement.
- Le Bureau : menu AIME › « Se connecter… » / « Mon compte ». Les données restent sur l'appareil :
  la synchronisation viendra dans une PR séparée.

## Variables à créer dans Vercel (jamais dans le dépôt)
| Nom | Environnements | Valeur |
|---|---|---|
| `BETTER_AUTH_SECRET` | Production et Preview (valeurs différentes) | 32 caractères aléatoires ou plus |
| `RESEND_API_KEY` | Production (Preview facultatif) | clé Resend, accès « envoi » seulement |
| `AUTH_EMAIL_FROM` | Production et Preview | `AIME <connexion@lemondeaime.com>` une fois le domaine vérifié dans Resend |

Sans `RESEND_API_KEY` en preview, le lien de connexion s'écrit dans les journaux du déploiement (pour tester).
En production, son absence fait échouer l'envoi : aucun lien n'est écrit.

## Vérifier sur la preview
1. `/`, `/bureau/`, `/studio/`, `/v1/` s'affichent comme en production.
2. `/api/health` → `{"ok":true}` ; `/api/auth/get-session` → `null`.
3. Bureau › AIME › Se connecter… : recevoir le lien, l'ouvrir, « Vous êtes connecté ».
4. Mon compte › Ajouter une passkey ici, se déconnecter, puis « Avec une passkey ».
5. Rouvrir le même lien : refusé (« Ce lien n'est plus valable »).

## Tests
`DATABASE_URL_TEST=postgres://… npm test` sur une base PostgreSQL jetable (jamais Neon) :
migrations rejouables, accès anonyme, lien réutilisé, origine étrangère, rôle non modifiable,
deux comptes isolés, déconnexion, session expirée, passkey réservée aux personnes connectées.
