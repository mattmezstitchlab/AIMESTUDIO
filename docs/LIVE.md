# AIME Live · le jour J en direct

`/live/?u=mariage|seminaire[&qui=<personne>][&mode=salle]`

## Le principe
- Le contenu de l'événement (`vitrine/donnees/<u>.json`) et l'accès (`vitrine/acces/<u>.json`) restent la seule source.
- Le direct est un **journal d'actions** (`{qui, action, p, t}`) : `retarder` (± minutes, en cascade ou non), `fait`, `planB`, `annoncer` (tout le monde ou l'équipe).
- Chaque écran **rejoue** le journal avec les règles de l'espace (`synchroview/permissions.js`, règles `event.*` et `item.read`). Une action refusée reste inscrite, sans effet. Le rôle vient toujours de `acces.membres`, jamais de l'action.
- Effet papillon : retarder « en cascade » décale aussi tous les moments suivants non faits. La cascade est atomique : si l'auteur n'a pas le droit de modifier un seul des moments touchés, rien ne bouge.
- Chaque personne ne voit que ce que les règles lui ouvrent : moments publics pour les invités, consignes et annonces d'équipe pour l'équipe, gestes uniquement là où `event.edit` est accordé.
- **Écran de salle** (`mode=salle`) : un invité de l'espace, en grand, sans aucun contrôle.

## Les deux transports
- **Entre appareils** (badge « Entre appareils ») : `/api/live/passe`, `/api/live/act`, `/api/live/journal`.
  - Identité : un laissez-passer signé par le serveur (démonstration, en attendant les comptes Better Auth). Il ne contient pas le rôle : le rôle est relu dans `vitrine/acces` à chaque action.
  - `act` rejoue tout le journal de la base puis l'action reçue avec les règles ; refusée → 403, **rien n'est écrit**. Acceptée → une ligne ajoutée (jamais modifiée, jamais effacée).
  - `journal` renvoie les lignes après `depuis`, sans les annonces d'équipe pour qui n'est pas de l'équipe. Chaque appareil interroge toutes les 2 s et rejoue.
  - Fermé par défaut : sans `DATABASE_URL` ou sans la table → 503 et l'écran repasse « Dans ce navigateur » ; en production → 404.
- **Dans ce navigateur** (repli) : localStorage + BroadcastChannel, comme avant.
- L'horloge de démonstration et la présence restent propres à chaque navigateur.

## Ouvrir le direct entre appareils (à faire par vous, sur la base de preview d'abord)
1. Exécuter `db/migrations/2026-10-21-live-journal.sql` dans la console SQL Neon de la base **de preview** (ajout d'une table, rien d'autre).
2. `LIVE_SECRET` (chaîne aléatoire de 32 caractères au moins, propre au direct) dans les variables de Vercel. **Obligatoire en production** : sans lui, le direct reste fermé (503). Hors production, une clé de travail dérivée du commit est utilisée.
3. Redéployer la preview : le badge passe à « Entre appareils ».
