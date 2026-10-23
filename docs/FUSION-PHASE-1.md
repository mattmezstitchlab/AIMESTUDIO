# AIME — Phase 1 : inventaire et contrats de fusion (23 octobre 2026)

**Périmètre :** étude du dépôt AIMESTUDIO sur la branche `audit/fusion-generale-phase1-2026-10-23`. Aucune migration, suppression, changement de route ni de base de données. Ce dossier ne prétend pas inventorier chaque clé de l'ensemble du monorepo : il consolide les composants et chemins de stockage vérifiés, avec les points restant à explorer.

## Architecture existante (code lu)
| Source | Moteur / responsabilité | Statut cible |
|---|---|---|
| `/` (`index.html`) | Page Zéro, scène publique et transition vers `/aime/` | Entrée publique conservée |
| `/aime/` (`aime/index.html`) | Le Monde AIME, verticale, cube et orbe | Destination publique conservée |
| `vitrine/rendu.js` | `rendre()` événements ; `composer()` espaces ; accès, perspectives et présentation séparés | Moteur de page à adapter, ne pas dupliquer |
| `studio/index.html` | Studio volumineux et ateliers via rewrites `/web/`, `/docs/`, `/buro/`, `/image/`, `/accessibilite/`, `/stitchlab/` | Moteur métier autonome |
| `canevas/plan.js`, `canevas/canevas.js` | Plan neutre, adaptateurs métier, vue et annotations | Couche d'édition |
| `regie/scene.js` | Publication et aperçu des scènes, textes et appareils | Couche présentation/publication |
| `bureau/sources.js` | Inventaire en lecture seule, sauvegarde/restauration non destructive | Service de récupération, pas accueil public |
| `stitch/`, `synchroview/`, `v1/`, `infinity/`, `g44/` | Moteurs métier distincts | Préserver en tant qu'adaptateurs futurs |
| `db/schema.sql` | Modèle Neon espaces, membres, invitations, données et audit | Aucun déploiement de migration en phase 1 |

## Stockages et contrats observés
| Domaine | Clés / supports constatés | Producteur ou lecteur connu | Précaution |
|---|---|---|---|
| Studio | `echos:v2`, `echos:boards`, `echos:photo:*`, `echos:logo:*`, `aime-app`, `aime-app-ev-*` | `studio/index.html`, `bureau/sources.js` | IDs, médias et historiques restent natifs |
| Studio réglages | `aime-mode`, `aime:fg`, `aime:bdgctx`, `aime:pointage`, `aime:avis`, `aime:learn`, `aime:pd` | `studio/index.html` | Timbres et enveloppes protégés ; Carte Postale non poursuivie |
| Canevas | `aime-canevas` | `canevas/canevas.js` | Vue et notes, pas la source métier |
| Régie | `aime-regie`, `aime-regie-brouillon`, `aime-regie-morphs`, `aime-regie-apercu` | `regie/scene.js` | Distinguer brouillon et publié |
| Carte | `aime-carte`, `aime-carte-versions`, `aime-carte-contacts` | `carte/` et Bureau | Ne pas confondre avec la Carte Postale |
| Broderie | `stitch-brouillons`, `stitch-progression:*`, `stitch-mes-fils` | `stitch/` | Garder le modèle grille et la palette native |
| Jour J | `jourj-plan-v4`, `jourj-plan-v5` | `v1/` | Aucun écrasement des anciennes versions |
| Autres | `sv-compositions`, `aime-infinity`, `aime-sim-*` | Modules distincts | Les simulations ne sont pas des projets réels |
| Archives | `aime-wp`, `aime-wps`, `aime-tlz`, `aime-os` etc. | Ancien Bureau | Sauvegarder, ne jamais effacer |
| IndexedDB | `aime-point-zero` : `fichiers`, `projets` | Code sauvegarde `bureau/sources.js` | Vérifier blobs et tableaux typés avant migration |
| Neon | `spaces`, `user_data`, `items`, `vault`, `audit` | `db/schema.sql` | Schéma existant ≠ persistance universelle active |

## Contrat transversal minimal (proposé, pas activé)
Fichier `contrats/projet.js` : objet `aime-projet`, `schema:1`, `id`, `titre`, `provenance`, collections `contenus`, `medias`, `relations`, dictionnaire `extensions`. Chaque élément de collection possède `id` et `type`. Ce contrat est un **format d'échange**, pas une nouvelle base, un éditeur ni une conversion des originaux. Les extensions sont réservées à des adaptateurs explicitement validés.

Règles : provenance stable, autorisations séparées du rendu, identifiants préservés, aucun champ transformé implicitement, refus des schémas inconnus, sauvegardes locales intactes.

## Points à valider avant phase 2
1. Matrice exhaustive des clés et schémas par module, y compris IndexedDB et données internes de Studio.
2. Adaptateurs pilotes lecture seule : Studio Timbre et Canevas, puis un événement. Comparer le rendu original avant/après.
3. Schémas de médias et relations avec références persistantes ; documents longs et binaires jamais encodés aveuglément.
4. Reproduction des contenus invisibles de la verticale et contrôle des parcours mobiles.
5. CI `npm test` et vérification navigateur, y compris sauvegarde/restauration IndexedDB. Aucun résultat de tests n'est revendiqué avant exécution.

**Décision produit :** Page Zéro → Le Monde AIME. Le Bureau est secondaire, les Timbres restent, la Carte Postale est abandonnée comme développement ; conservation non destructive des archives.
