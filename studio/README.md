# AIME Studio

`studio/index.html` : AIME Studio, un seul fichier HTML statique, maintenu par la session Studio.

- Copie de l'artifact Claude, avec une en-tête de document complète (`<!doctype html>`, `charset`, `viewport`).
- Hors de Claude, le Studio se met en mode autonome : les liens et QR « AIME » pointent vers la racine du site (`/`), les fichiers se téléchargent directement, et les fonctions qui demandent Claude (écriture assistée, base partagée de l'artifact) se désactivent proprement.
- Données gardées dans le navigateur (localStorage) en attendant Supabase.
- Pont avec AIME : `#aime=` (entrée) et `#echos=` (retour), inchangés.
