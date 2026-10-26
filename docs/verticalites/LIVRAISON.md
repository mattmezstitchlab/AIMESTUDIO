# Phase 1 — livraison et preuve

## Portée

Extension du Studio à `/studio/verticalites/` et du Canevas à `/canevas/dossiers/`. Aucun remplacement de la racine, aucune nouvelle authentification, aucun changement de modèle métier ou d’API. Une entrée « Verticalités » est ajoutée dans la barre du Studio existant.

- Catalogue de douze univers initialement configurés en JSON, images existantes réutilisées, recherche et états explicites.
- Dossiers locaux IndexedDB : création, nom, ajout/modification d’objets, sauvegarde manuelle et automatique, liste et réouverture.
- Objets : verticalités et modules référencés, textes, images locales, post-it. IDs stables, géométrie, propriétés et ressources séparées.
- Navigation infinie, zoom au pointeur, pincement tactile, glisser-déposer de bibliothèque, sélection multiple, déplacement et redimensionnement.
- Propriétés au clavier, verrou, duplication, suppression, alignement, magnétisme facultatif, annuler/rétablir, cadrage « Tout voir ».
- Import JSON validé en copie et export privé consenti, avec les images incluses. Les anciens dossiers et stockages ne sont jamais écrasés.
- Chargement, introuvable, import invalide, image refusée et défaut de stockage signalés. Une écriture échouée n’est pas annoncée comme réussie.

## Hors portée / garde-fous

Phase 2 non commencée. Timbre reste explicitement en aperçu / raccord à prévoir. Les liens « outil source » ouvrent les véritables outils, mais ne constituent pas encore un mini-studio intégré. Les groupes, liens visuels, publication et collaboration sont des étapes ultérieures ; les champs de schéma ne valent pas interface opérationnelle. Le dock n’affiche pas une fausse commande Relier active.

Dossiers sur cet appareil, non chiffrés, non partagés et non synchronisés par compte. Les données privées existantes du compte, de la Carte et des projets ne sont pas lues par cette extension. Un fichier exporté contient uniquement le dossier et ses images explicitement insérées ; le téléchargement n’est ni public ni un hébergement.

## Tests exécutés

1. `tests/dossiers.test.cjs` + suites Canevas/universel/adaptateur Timbre : **13 tests réussis**.
2. Navigateur `scripts/test-dossiers-browser.cjs` : les dix étapes demandées, image réelle incluse, géométrie, sauvegarde et **égalité exacte du dossier après sortie/réouverture** ; JSON téléchargé identique, import en copie, refus du JSON inconnu ; mobile et reduced-motion ; zéro erreur JS observée.
3. Navigateur `scripts/test-dossiers-interactions-browser.cjs` : événements tactiles réels CDP (glisser et pincer), géométrie préservée pendant le zoom, bibliothèque glissée-déposée, sélection multiple, duplication, undo/redo clavier ; panne de stockage **injectée et déclarée**, composition conservée en mémoire, ancien enregistrement intact, réessai réussi.
4. État local historique initial : `npm test` → **803 tests, 636 réussis, 24 échecs, 143 ignorés**, correspondant aux contrats d’accueil antérieurs de la copie locale ; ne pas prétendre cette copie verte.
5. Validation isolée de la tête distante #153 `849da08` + les seuls ajouts phase 1, avec les dépendances du dépôt : `npm test` → **807 tests, 664 réussis, 0 échec, 143 ignorés**. `npm run build` déployable réussi. Les tests ignorés demandent notamment une DB de test ; aucune validation de connexion réelle ou d’e-mail n’est inventée.
6. Les tests navigateur n’ont pas utilisé de fixtures d’authentification. Ils exercent les dossiers locaux, pas la sécurité d’un backend collaboratif encore absent.

## Livraison Git

La branche Arena est fixe. Le checkout initial était en retard sur sa propre tête distante et contenait les travaux antérieurs non commitées. L’incrément phase 1 doit être poussé **sur la tête distante courante**, sans commit des versions anciennes de `index.html`, du package ou de la Fenêtre et sans forcer le push. Aucun merge de #155 ni nouvelle fusion de branche autorisée.

Voir `AUDIT.md` pour le détail main / #153 / #154 / #155 et `canevas/dossiers/README.md` pour le modèle, les raccourcis et les limitations.
