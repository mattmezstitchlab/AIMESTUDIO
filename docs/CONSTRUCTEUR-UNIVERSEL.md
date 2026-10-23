# AIME — Constructeur universel par blocs (direction validée le 23 octobre 2026)

## Décision produit
Page Zéro `/` → Le Monde AIME `/aime/` → **le constructeur existant** en bas de la page (`#build`, `#cnv5`, `#plus5`). C'est le seul langage d'édition visible à privilégier. On **ne crée pas un autre Bureau, un autre Canva ni un nouveau Studio de remplacement**.

## Constat sur le code réel
Le constructeur est intégré au grand fichier `aime/index.html`, avec :
- `#build` : section « Quelques gestes, votre site » ;
- `#cnv5` : grille du site ; blocs placés par `add(k,x,y,w)` et `layout()` ;
- `FORMS`, `formOf(k,w)` : variation de certains contenus suivant la largeur ;
- `PRE`, `preset(k)`, `siteFor()` : modèles et changements de contexte ;
- `#plus5`, `#pop5`, `siteAdd(kind)` : commande et insertion de contenus ;
- `AIMEM` et `aime-mem` : mémoire de la verticale ; **ne pas supposer que cette mémoire garantit la sauvegarde de chaque bloc d'un projet durable**.
- La fonction `siteAdd` recherche seulement un emplacement libre dans les **trois blocs** de `#nst` : cette limite devra être retirée ou repensée après tests, sans confondre ce formulaire et la grille principale.

## Périmètre du présent changement
`constructeur/capacites.js` = **registre descriptif pur**, sans mutation de la page. Statuts explicites : `existant`, `separe`, `a-adapter`, `externe`, `propose`. Un module qui n'est pas branché ne devient pas « disponible » par son inscription au registre.

Les tests verrouillent les points d'ancrage du constructeur, ses états déclarés et le parcours public. Aucune nouvelle interface, dépendance, route ou stockage.

## Architecture proposée (non livrée)
1. Extraire prudemment, à comportement constant, le modèle des blocs (identifiants stables, dimensions, positions et types) hors du HTML monolithique.
2. Créer une API d'adaptateurs : `decrire`, `rendre`, `inspecter`, `modifier`, `exporter`, avec des permissions propres à chaque module. Commencer par un bloc statique testable.
3. Stockage versionné du **projet de page**, distinct des données natives Studio, Timbres de compte, Stitch et événements. Sauvegarde, import, annulation et restauration avant toute migration.
4. Relier Canevas (interaction) et Régie (publication) comme capacités du constructeur **sans recopier leur code ni supprimer leurs pages**.
5. Adapter ensuite Studio, document, média, Timbre graphique éventuel, Magazine, Stitch, RIPPLECIRCLE. Certains moteurs restent spécialisés et ne livrent qu'une vue.
6. Lorsque le moteur est éprouvé, rendre les autres entrées d'édition secondaires, jamais les supprimer avant reprise des projets.

## Règles et interdits
- Timbre d'identité (`compte/timbre.js`) **séparé** de tout Timbre créatif ; aucune information du compte injectée dans une page sans consentement.
- Ne plus développer la Carte Postale ; préserver ses éventuelles données historiques.
- Aucune promesse de publication ou de persistance serveur avant vérification du chemin effectif.
- Pas de modification de `main` sans revue, tests GitHub et validation du parcours navigateur.

## Prototype technique ajouté — modèle de blocs V1
`constructeur/blocs.js` définit un format `aime-page-blocs` version 1 pour l'échange de blocs typés (`id,type,x,y,w,h,donnees`). Tests : aller-retour JSON, collision des identifiants, rejet d'une version inconnue et projection géométrique sans mutation. Ce module **n'est pas chargé par le site**, n'enregistre rien et n'a pas vocation à remplacer directement les formes complexes de `aime/index.html`.

La fonction `depuisGrille` ne conserve volontairement que positions et dimensions ; la propriété `donnees` est vide. Elle est **une démonstration de forme, pas un export sans perte**. Avant tout branchement réel : définir identifiants persistants, dimensions exactes, typages des contenus, licences médias, undo/redo et vérification fidèle des exports. Ne pas la présenter comme un bouton « Exporter projet » utilisable.
