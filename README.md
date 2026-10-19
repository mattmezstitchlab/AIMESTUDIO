# AIME®

« Une info saisie une fois, propagée partout. »

Fusion en cours : AIME (planning) et AIME Studio (supports) deviennent une seule app.

- `index.html` : **la coque commune** (AIME Studio : mosaïque des domaines, Mes projets, supports). Les adresses d'AIME déjà diffusées (`#AIME-…`, `#rsvp…`, `#capsule-…`, `#invite=…`, `#pro=…`, `#carte`, `#accueil`, `#aimenew.…`, `#echos=…`) sont renvoyées vers `/v1/`.
- `v1/` : le module Planning d'AIME (v72, gelé au repère `avant-fusion`), en attendant son intégration dans la coque.
- `studio/` : la même app que la racine, gardée pour les liens existants.
- `sup/` : rendus d'AIME Studio utilisés par le module Planning.
- `docs/aime-handoff.md` : passation du module Planning.

## Étapes de la fusion

1. Coque commune, adresses renvoyées, événements AIME visibles dans « Mes projets » (planning et supports). ← fait
2. Un mariage = un projet, avec deux onglets Planning et Supports, sans pont encodé.
3. Reprise des données (`aime-app`, `aime-app-ev-*`, `jourj-plan-v5`, `aime-ma-carte`) et retrait des ponts.
4. Audit transversal, puis retrait de `/v1/` et de `/studio/` (redirections).

## Déploiement

Site statique, sans étape de build (Vercel, preset *Other*). Les données restent dans le navigateur (localStorage) ; la base Supabase viendra après la fusion.
