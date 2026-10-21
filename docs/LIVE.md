# AIME Live · le jour J en direct

`/live/?u=mariage|seminaire[&qui=<personne>][&mode=salle]`

## Le principe
- Le contenu de l'événement (`vitrine/donnees/<u>.json`) et l'accès (`vitrine/acces/<u>.json`) restent la seule source.
- Le direct est un **journal d'actions** (`{qui, action, p, t}`) : `retarder` (± minutes, en cascade ou non), `fait`, `planB`, `annoncer` (tout le monde ou l'équipe).
- Chaque écran **rejoue** le journal avec les règles de l'espace (`synchroview/permissions.js`, règles `event.*` et `item.read`). Une action refusée reste inscrite, sans effet. Le rôle vient toujours de `acces.membres`, jamais de l'action.
- Effet papillon : retarder « en cascade » décale aussi tous les moments suivants non faits. La cascade est atomique : si l'auteur n'a pas le droit de modifier un seul des moments touchés, rien ne bouge.
- Chaque personne ne voit que ce que les règles lui ouvrent : moments publics pour les invités, consignes et annonces d'équipe pour l'équipe, gestes uniquement là où `event.edit` est accordé.
- **Écran de salle** (`mode=salle`) : un invité de l'espace, en grand, sans aucun contrôle.

## Ce que fait le canal aujourd'hui, et ce qu'il ne fait pas
- `live/canal.js` partage le journal, l'horloge de démonstration et la présence **entre les onglets d'un même navigateur** (localStorage + BroadcastChannel).
- **Entre deux appareils, il faut un serveur.** Ce n'est pas simulé. Proposition, à valider avant tout changement de base :
  1. une table `live_journal (espace, n, qui, action, p, t)` dans Neon, en ajout seul ;
  2. `POST /api/live/act` : l'identité vient de la session (Better Auth), l'action est revérifiée avec les mêmes règles avant d'être inscrite ;
  3. `GET /api/live/journal?depuis=n` (sondage court ou flux SSE) : chaque appareil reçoit les nouvelles lignes et rejoue.
- L'horloge est simulée (l'événement n'a pas eu lieu) ; le jour J, elle suivra l'heure réelle.
