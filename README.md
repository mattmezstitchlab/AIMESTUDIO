# AIME®

« Une info saisie une fois, propagée partout. »

- `index.html` : AIME (landing mère, carte universelle, AIME WEDDING et l'app plein écran).
- `sup/` : rendus réels d'AIME Studio utilisés sur la landing.
- `studio/` : AIME Studio (à venir).

## Déploiement

Site statique, sans étape de build : importer le dépôt dans Vercel (Framework preset : *Other*), la racine sert `index.html`.

## État

Prototype issu des artifacts Claude. Les données sont pour l'instant gardées dans le navigateur (localStorage).
Prochaine étape : base Supabase (comptes, cartes, événements, pointages, avis, capsules) partagée par AIME et le Studio.
