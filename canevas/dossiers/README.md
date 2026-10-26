# Dossiers du Canevas — phase 1

Extension de l’architecture AIME, pas un remplacement du Studio ou du Canevas existants.

## Entrées

- `/studio/` → lien **Verticalités** dans la barre du Studio d’origine.
- `/studio/verticalites/` : catalogue éditorial, recherche, états réels, modules et création de dossier.
- `/canevas/dossiers/?id=<id>` : édition d’un dossier de **ce navigateur**.
- La liste est configurée dans `studio/verticalites/catalogue.json`. Les références aux modules AIME utilisent `modules/registre.js` ; un nom dans le catalogue ne confère jamais de droits.

## Parcours utilisable

Créer un dossier → ouvrir la bibliothèque → ajouter/glisser une verticalité → insérer texte, image et post-it → sélectionner et modifier dans Propriétés → déplacer / redimensionner → Enregistrer → Mes dossiers pour le retrouver. Le nom, les objets, ressources d’image et coordonnées de vue sont conservés. Une confirmation de fichier privé précède l’export JSON. L’import valide le schéma et crée **une copie**, jamais un écrasement.

## Gestes

- Sélection : clic/toucher ; Maj + clic pour une sélection multiple, ou rectangle sur le fond ; Ctrl/Cmd A sélectionne tout.
- Glisser pour déplacer ; poignée inférieure droite pour redimensionner, ou champs X/Y/largeur/hauteur dans Propriétés.
- Flèches : déplacer de 1 unité, Maj + flèches : 10 unités. Les objets verrouillés ne sont ni déplacés ni supprimés.
- Espace + glisser ou outil Main (H) : naviguer ; molette : zoom centré sur le pointeur ; pince à deux doigts : zoom et déplacement.
- T : texte ; N : post-it ; V : sélection ; 1 / Tout voir : cadrage des objets ; 100 % : échelle réelle.
- Ctrl/Cmd Z / Maj Z : annuler / rétablir (60 états en mémoire) ; Ctrl/Cmd D : dupliquer ; Suppr : retirer ; Ctrl/Cmd S : enregistrer.
- Images PNG/JPEG/WebP de 2 Mo maximum, dimensions ≤ 8192 px. SVG et HTML importés sont refusés ; textes affichés en texte brut.
- Alignement de sélection et magnétisme facultatif dans Propriétés. Les rails sont repliables et superposés, non permanents, sur mobile.

## Réutilisation et données

`canevas/scene.js` reste le moteur des coordonnées, zoom au pointeur, déplacement et cadrage. `model.js` n’en recopie pas les formules. Le renderer du dossier est une extension DOM, car le plan historique traite un calque métier et ses annotations, pas une collection de rectangles hétérogènes.

```text
Catalogue : définitions de verticalités + références de modules / états / routes
Dossier : format, schema, id, title, scope=device, view, revision
  objects[] : id stable, type, x/y/w/h, locked, groupId réservé, props, source
  resources[] : id stable, image locale et nom (pas de photo du compte)
  relations[] : contrat validé ; édition visuelle réservée à la phase 3
```

IndexedDB `aime-studio-dossiers-v1`, magasin `dossiers`. Aucun accès aux clés historiques `echos:v2`, `aime-canevas`, `aime-sites`, Carte ou fichiers métier. Pas de migration, suppression automatique, API, publication ou partage. Ces dossiers sont locaux, **non chiffrés et non cloisonnés par compte**, comme tout espace de cet appareil : l’interface le précise lors de la création. Un export JSON contient ses textes et ses images ; il n’est jamais public automatiquement. Les API existantes continuent de contrôler l’accès aux ressources métier quand on ouvre l’outil source.

L’éditeur attend la fin d’une transaction IndexedDB avant d’annoncer « Enregistré ». Une écriture périmée ne blanchit pas une version plus récente en mémoire. Une erreur laisse le dossier ouvert, annonce le défaut et permet de réessayer ou exporter. Les sauvegardes existantes ne sont jamais effacées. Le changement de dossier attend la sauvegarde ; la sortie navigateur prévient si une composition reste modifiée.

## Limites volontaires

Phase 2 non commencée : les outils sources s’ouvrent dans un nouvel onglet, sans perte du dossier. Aucun faux mini-studio Timbre ; l’adaptateur repéré est en lecture seule. Phase 3 : relations visuelles, groupes, médias/compositions avancés et publication. Phase 4 : partage, collaboration, historique durable. Pas de prétention à une sauvegarde serveur ou multiappareil.

## Validation

- `node --test tests/dossiers.test.cjs` : contrat, limites, références, IDs, image incluse, import sûr, verrou, duplication et zoom moteur.
- `scripts/test-dossiers-browser.cjs` : parcours dix étapes réel, IndexedDB, image incluse, égalité exacte après réouverture, export/import, mobile et reduced-motion.
- `scripts/test-dossiers-interactions-browser.cjs` : vrais événements tactiles/CDP, déplacement, pincement, glisser-déposer bibliothèque, clavier, sélection multiple, et simulation déclarée d’échec de stockage avec reprise.
- Ces scripts nécessitent Playwright et Chromium. Dans le sandbox, Chromium est fourni par `@sparticuz/chromium`, avec ses bibliothèques AL2023 extraites dans `/tmp/aime-browser-libs/lib`. Lancer avec `LD_LIBRARY_PATH=/tmp/aime-browser-libs/lib:$LD_LIBRARY_PATH` et `AIME_PREVIEW_URL=http://localhost:3002` si besoin.
