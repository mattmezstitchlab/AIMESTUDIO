# La porte : le bouton universel d'accès (phase A)

Le rond irisé « + » de la grande page AIME Studio (`.plus5`, sous la démonstration du mini-site builder) devient un composant partagé : `porte/porte.js` + `porte/porte.css`. Même capsule, même contour conique, même taille, même geste.

## États (venus du compte, `/api/identite`)

| État | Quand | Le bouton | Le clic |
| --- | --- | --- | --- |
| `plus` | pas de session, ou pas de timbre confirmé | « + » | ouvre `/point-zero/?intention=identite` |
| `fleche` | timbre confirmé, Monde AIME jamais ouvert | « ↓ », pulsation 4 fois puis calme, « Découvrez votre Monde AIME » | marque la découverte, ouvre `/aime/?depuis=porte` |
| `retour` | Monde AIME déjà découvert | « ↓ » calme | ouvre `/aime/?depuis=porte` |

La révélation cinématographique (phase B) se branchera sur `AIMEPorte.revelation(cible, bouton)` ; sans elle, le clic part directement. Rien n'est jamais bloqué : au bout de 2,6 s on part quoi qu'il arrive.

## Où elle est

- Page Zéro : seul accès en haut (« MON BUREAU » et « AIME STUDIO » retirés), avec un lien discret « J'ai un compte » (`/compte/`). Les liens d'invitation (`/compte/?invitation=…`) ne changent pas.
- Point Zéro : dans l'en-tête, à côté de « Mon compte ».
- Bureau : dans la barre du haut, version compacte.
- Canevas : à ajouter quand la PR Canevas 0 sera fusionnée (la page n'est pas encore dans `integration`).

AIME OS laisse la porte ouvrir une vraie page (jamais une fenêtre).

## Le parcours d'identité (Point Zéro, `?intention=identite`, ou « Mon timbre » dans le menu du point)

Point (l'intention) → Ligne (l'adresse e-mail, lien de connexion Better Auth) → Relation (le nom d'affichage) → Grille (vérifier : l'adresse reste privée) → Composition (le timbre existant, photo facultative ou dégradé) → Projet (confirmer : `update-user`, puis `/api/identite` action `timbre`). Le bouton devient une flèche aussitôt.

## Serveur

- `api/identite.mjs` : GET l'état ; POST `timbre` (exige un nom) et `monde`. La personne vient de la session.
- `db/migrations/2026-10-22-identite.sql` : table `identite (user_id, timbre_le, monde_le)`, additive. **À exécuter sur la branche Neon de préversion, puis de production.** Sans la table, l'état se déduit du compte (un nom = un timbre) et la découverte du Monde n'est pas mémorisée.
- La suppression du compte efface la ligne `identite`.
