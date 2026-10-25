# Engagements (V1, PR P6, 25/10/2026)

« Qui doit quoi à qui, et pour quand. » Une promesse datée entre personnes d'un même projet (décisions de Matt du 25/10 : une promesse entre personnes, qui naît dans un projet).

## Ce que c'est

- Un engagement : un texte court (« Envoyer la playlist du bal »), **qui s'engage**, **envers qui** (une personne du projet, ou l'organisation du projet), une **échéance** (un jour, entre aujourd'hui et trois ans).
- États : **en attente de réponse** (demandé par l'organisation), **en cours** (accepté), **tenu**, **refusé**, **annulé**. « En retard » n'est pas un état : il se calcule (en cours, échéance passée) et se dit en toutes lettres.

## Qui peut quoi (synchroview/permissions.js, type `engagement`)

| Geste | Qui |
|---|---|
| Voir | les personnes concernées (qui s'engage, envers qui, l'auteur) et l'organisation (propriétaire, coordination) |
| Prendre un engagement | tout membre sauf invité et lecture seule, **pour soi-même** : accepté d'emblée |
| Demander un engagement à quelqu'un | l'organisation seulement : il attend la réponse de la personne |
| Accepter / refuser | la personne sollicitée seulement, quand il est en attente |
| Marquer comme tenu | celui qui s'est engagé seulement, quand il est en cours |
| Annuler | l'auteur, ou le propriétaire, tant qu'il n'est pas clos |

Le serveur relit le rôle (date de fin comprise) et la règle à chaque appel, dans une transaction qui verrouille l'engagement. Mauvaise personne : 403 ; mauvais moment (déjà accepté, déjà clos) : 409 ; hors de portée : 404, comme s'il n'existait pas.

## Où on le voit (sans cinquième lieu dans le Dock)

- **Dans un projet, « Mon accès »** : la liste que je peux lire, ses gestes, et le formulaire. Le **+** du Dock propose « Prendre un engagement » à qui en a le droit (pas à l'invité).
- **Dans AI, « Mes engagements »** : mes engagements ouverts dans tous mes projets (ce que je dois, ce qu'on me doit nommément), avec « Réponse attendue ». Un toucher ouvre le projet.
- **Le journal du projet** dit chaque geste et l'échéance (« Alex a tenu un engagement (échéance le 4 décembre 2026) »), **jamais le texte**.

## Confidentialité

- Le navigateur ne reçoit jamais un identifiant de compte : les personnes sont désignées par une référence opaque propre au projet, recalculée au serveur. Une référence n'est valable que pour une personne active que l'auteur a le droit de voir (`member.read`).
- Une personne retirée du projet ne voit plus rien (404) ; ses engagements restent lisibles par l'organisation, et on ne peut plus rien lui demander.

## Technique

- Migration `db/migrations/2026-10-25-15-engagements.sql` (table `engagements`, effacée avec le projet). Sans elle : 503 dit, et « Mon accès » n'a pas le bloc.
- Serveur : `api/engagements.mjs` (route), `api/_engagements/moteur.mjs` (lecture, transaction, vue). Quota `engagement:geste` (60 par personne et par heure).
- Navigateur : `compte/engagements.js` (« Mon accès » et AI), branché dans `compte/projet.js` et `compte/ai.js`.
- Registre : module `engagements`, opérationnel, destination « Mon accès ».
- Tests : `tests/engagements.test.cjs` (règles, et 10 cas sur base avec cinq comptes), `tests/navigateur/engagements.cjs` (ordinateur et iPhone, axe WCAG 2.2 AA).

## Plus tard

- Les échéances dans le Calendrier du module Temps (migration 08, dates), et un rappel avant l'échéance.
- Un engagement né d'une demande reçue (« devis avant vendredi »), avant même qu'un projet existe.
