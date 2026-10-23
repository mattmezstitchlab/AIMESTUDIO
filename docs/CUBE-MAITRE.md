# Le Cube Maître (`/maitre/`)

Le site AIME lui-même, vu comme un cube : six facettes alimentées par ses données réelles. **Lecture seule.**

| Facette | Face | Source | Pour qui |
|---|---|---|---|
| Pages et navigation | 0 | `nav/registre.js`, `regie/site.json` (version publiée) | Tous ; liens Régie (`#pages`, `#edition`) pour le propriétaire |
| Santé du système | 1 | `sante/modele.js`, `GET /api/health` | Tous |
| Moteurs et capacités | 2 | `moteurs.json`, `univers.json`, `reseau/registre.js` | Tous |
| Comptes et espaces | 3 | `GET /api/maitre` (compteurs agrégés) | Propriétaire seul ; 404 pour tout autre |
| Orbe | 4 | `regie/site.json` (orbe), vocabulaire de `regie/donnees.js` | Tous ; lien Régie `#orbe` pour le propriétaire |
| Contenu et réalisations | 5 | `regie/site.json`, `vitrine/rendu.js` (blocs) | Tous ; liens Régie `#realisations`, `#sites` pour le propriétaire |

## Fichiers

- `maitre/modele.js` (`AIMEMaitre`) : modèle **pur**, distinct du cube-personne, testé sous node. Il reçoit les sources et rend six résumés. Une source absente donne une facette « à venir », jamais un chiffre inventé.
- `maitre/sources.js` (`AIMEMaitreSources`) : charge les sources dans le navigateur. Il ne lit **aucun** stockage du navigateur : ni le brouillon ni la comptabilité de la Régie. Il ne demande `/api/maitre` qu'avec le droit propriétaire, et le serveur revérifie.
- `maitre/index.html`, `maitre/maitre.js`, `maitre/maitre.css` : l'app, avec la grammaire de Mon cube (`cube/regie.css`) et la **même vue 3D** (`cube/vue3d.js`, paramètre `modele`).
- `canevas/adaptateurs/maitre.js` : `/canevas/?maitre=<facette>`. Les six faces sont dépliées en croix, avec un inspecteur, « Voir en 3D », « Ouvrir dans l'app » et des liens vérifiés (`AIMEMaitre.lienOk`).
- `api/maitre.mjs` : `GET` seulement. `proprietaire(req)`, sinon 404. Des `count(*)` uniquement ; une table de la V1 absente donne `null`.
- `os/apps.js` : app système « Cube Maître » au catalogue (vue visiteur et vue propriétaire), **non épinglée** au dock.

## Ce qui ne change pas

- La Régie maîtresse : aucun fichier `regie/` n'est modifié, aucune écriture. Les seuls liens autorisés sont `#pages`, `#edition`, `#orbe`, `#realisations` et `#sites`. Jamais `#nouveau-devis`, `#docs`, `#clients` ni `#entreprise`.
- Le cube-personne : sans `modele`, `cube/vue3d.js` se comporte exactement comme avant, et la miniature du dock ne suit que lui.
- La base : aucune migration.

Tests : `tests/maitre.test.cjs`, plus des parcours dans `tests/navigateur/parcours.cjs` et `accessibilite.cjs`.
