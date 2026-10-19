# AIME × Neon : plan de raccordement

*Rédigé pour la personne (ou l'agent) qui fera l'intégration. Aucun secret dans ce document.*

## 1. État actuel

- **Site** : statique sur Vercel (`index.html`, `/bureau/`, `/studio/`, ateliers, `/v1/`, `/monde/`). Aucun serveur, aucun `package.json`.
- **Données** : tout est dans le navigateur (`localStorage`).
  - `aime-os` : dossiers, cartes universelles, timeline perso, profil, équipe, identités.
  - `echos:v2` : projets des studios.
  - `aime-app` et `aime-app-ev-<id>` : événements Jour J, gérés par une autre session (voir `docs/aime-handoff.md`).
  - `aime-noyau` : le Noyau, **déjà chiffré** côté client.
- **Neon** : projet à créer via l'intégration **Vercel Marketplace → Neon**. Elle injecte `DATABASE_URL` dans les variables d'environnement Vercel.
- **Connexion des utilisateurs** : aucune pour l'instant. C'est le point à décider.

## 2. Principes

1. **Neon n'est joignable que côté serveur**, par des fonctions Vercel dans `/api/*`, avec `@neondatabase/serverless`. Jamais d'URL de base de données dans le navigateur.
2. **Une vraie authentification avant toute donnée partagée.** Recommandé : clés d'accès (passkeys / WebAuthn) plus lien magique par e-mail en secours, avec une session en cookie `HttpOnly; Secure; SameSite=Lax`. Alternative clé en main : Neon Auth, ou Auth.js.
3. **Contrôle d'accès dans chaque fonction `/api`**, à partir de l'utilisateur de la session, jamais à partir d'un identifiant envoyé par le navigateur. Tables privées par défaut.
4. **Le Noyau reste chiffré de bout en bout.** Le serveur ne stocke que le bloc chiffré (`ct`, `iv`, `salt`). La phrase secrète ne quitte jamais l'appareil.
5. **Zéro secret dans le dépôt.** La clé Supabase *service role* exposée dans 4 dépôts publics doit être révoquée de toute façon.

## 3. Schéma de départ

Voir `db/schema.sql`. Les tables :

| Table | Rôle |
|---|---|
| `users`, `passkeys`, `sessions` | Comptes et connexion |
| `cards` | Cartes universelles d'un utilisateur. `tpl` = futurs mariés, invité, prestataire… |
| `events` | Événements : mariage, concert… |
| `event_members` | Qui participe et avec quel rôle. Accès invité limité à **son** événement. |
| `timeline_items` | Timeline unique : rendez-vous, rappels, missions… |
| `projects` | Projets des studios, en JSON |
| `vault` | Noyau chiffré : `ct`, `iv`, `salt` uniquement |
| `map_presence` | Présence sur le globe, **opt-in**, ville seulement (pas de coordonnées précises) |

## 4. Étapes proposées (PR courtes)

1. **Socle.**
   - Ajouter `package.json` (dépendance `@neondatabase/serverless`) et `api/health.js`, qui exécute `select 1`.
   - Vérifier que le site statique se déploie toujours à l'identique.
2. **Authentification.**
   - `api/auth/*` : passkeys et lien magique, sessions en base.
   - Bouton « Se connecter » dans la barre du Bureau, à côté de l'orbe.
3. **Synchronisation.**
   - `api/sync` : `GET` et `PUT` sur `aime-os` et `echos:v2`, par utilisateur. Le `localStorage` reste le cache hors ligne.
   - Conflits : dernière écriture gagnante, avec horodatage.
4. **Noyau.**
   - `api/vault` : `GET` et `PUT` du bloc chiffré uniquement.
   - Test : la base ne doit jamais contenir de texte en clair.
5. **Partage.**
   - `events`, `event_members`, invitations par lien signé.
   - L'orchestrateur Jour J et la carte « Invité » lisent l'événement partagé.
   - À coordonner avec la session Timeline (`/v1/`).
6. **Globe.**
   - `map_presence` en opt-in.
   - Notifications de proximité, par exemple quand une demande de photographe concerne des prestataires proches.

## 5. Ce qu'il ne faut pas faire

- Exposer `DATABASE_URL` ou une clé dans du code client.
- Accepter un `user_id` venant du navigateur.
- Stocker la phrase secrète du Noyau, ou un numéro de carte bancaire.
- Modifier `/v1/` (Timeline Jour J) sans passer par sa session.
