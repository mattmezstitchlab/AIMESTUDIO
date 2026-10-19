# AIME®

« Une info saisie une fois, propagée partout. »

Fusion en cours : AIME (planning) et AIME Studio (supports) deviennent une seule app.

- `index.html` : **la landing « Le monde AIME »**, qui présente six ateliers séparés. Les adresses d'AIME déjà diffusées sont renvoyées vers `/v1/`, celles du Studio (`#aime=`, `#atlas…`, `#commencer`) vers `/studio/`.
- `stitchlab/`, `web/`, `docs/`, `buro/`, `accessibilite/` : chaque atelier, ouvert seul (même moteur que le Studio, réglé par `window.AIME_ATELIER`).
- `v1/` : Timeline Jour J (AIME v72, gelé à la branche `avant-fusion`).
- `studio/` : le grand Studio (mosaïque, tous les supports), caché de la landing, gardé pour les liens existants.
- `sup/` : rendus d'AIME Studio utilisés par la landing et la Timeline.
- `docs/aime-handoff.md` : passation du module Planning.

## Étapes de la fusion

1. Coque commune, adresses renvoyées, événements AIME visibles dans « Mes projets » (planning et supports). ← fait
2. Un mariage = un projet, avec deux onglets Planning et Supports, sans pont encodé.
3. Reprise des données (`aime-app`, `aime-app-ev-*`, `jourj-plan-v5`, `aime-ma-carte`) et retrait des ponts.
4. Audit transversal, puis retrait de `/v1/` et de `/studio/` (redirections).

## Déploiement

Site statique, sans étape de build (Vercel, preset *Other*). Les données restent dans le navigateur (localStorage) ; la base Supabase viendra après la fusion.
