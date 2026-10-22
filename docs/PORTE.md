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

## Phase B · la révélation du Monde AIME

- **Départ** (`porte/revelation.js`, `revelation.css`) : au clic sur la flèche, la partie visible de la page se soulève comme un rideau (découpée à la fenêtre, coins arrondis) ; dessous, les couleurs du Monde AIME et le titre « Le monde AIME » apparaissent. Puis la page change. Mouvement réduit : immédiat. Jamais bloquant.
- **Arrivée** (`porte/arrivee.js`, sur `/aime/?depuis=porte`) : le même voile, posé dès le premier rendu, se dissipe sur le héros. Le cube qui tient la place du O s'efface, le timbre du compte descend jusqu'à lui, le cube revient avec le timbre sur sa face « vous » et se tourne vers la personne six secondes avant de reprendre sa rotation. L'orbe accueille, avec « Aller au Bureau ». L'adresse est nettoyée.
- **Deux modes** : personnel (timbre confirmé du compte, rien d'autre) ; découverte (`/aime/?demo=timbre`, timbre fictif « Camille », marqué « Démonstration », qui propose de créer le sien). Sans timbre, la page reste exactement comme avant.
- Le titre et le cube ne sont pas modifiés : le timbre est posé sur la face existante.

## Canevas

La porte partagée est montée dans la tête du Canevas (`position:'compact'`), à côté du retour au Bureau : jamais sur la palette basse, les notes, l'inspecteur ni le zoom, qui vivent sur le plan et en bas. Compacte à l'œil (32 px), sa zone tactile fait 46 px. Sur téléphone, le sous-titre du Canevas se masque pour que la tête tienne sur une ligne.

## Migration `identite` sur la branche Neon de préversion

Validée localement : rejouée deux fois sur une copie du schéma (rejouable), `user_id text` compatible avec `"user".id text` de Better Auth, aucune clé étrangère, aucune table existante modifiée. Prérequis : les tables Better Auth (`db/migrations/2026-10-21-comptes.sql`) déjà présentes.

1. Console Neon → projet AIME → branche de **préversion** (celle de `DATABASE_URL` des Previews Vercel), jamais la branche principale.
2. SQL Editor : coller le contenu de `db/migrations/2026-10-22-identite.sql`, exécuter.
3. Contrôle : `select column_name, data_type from information_schema.columns where table_name = 'identite';` → `user_id`, `timbre_le`, `monde_le`, `cree_le`.
4. Sur une préversion : créer un timbre au Point Zéro, cliquer la flèche, puis `select timbre_le is not null, monde_le is not null from identite;` → `t | t`. Revenir sur la Page Zéro : la porte doit rester en mode « retour » et non revenir à « ↓ ».
5. Production : seulement après validation, même fichier, même contrôle.
