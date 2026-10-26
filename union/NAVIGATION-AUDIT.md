# Audit de navigation — 26 octobre 2026

## Diagnostic

La capture montrait deux surfaces concurrentes, pas deux comptes ou deux moteurs :

| Élément | Ancien comportement | Décision |
| --- | --- | --- |
| Header historique de `index.html` | Masqué après montage du lecteur ; garde les anciennes commandes utilisées par les ponts | Reste masqué, aucune deuxième navigation visible |
| `.immersive-nav` | Navigation globale fixe de 100 px | Devient l’unique header visible, 80 px desktop / 72 px mobile |
| `#filters.story-toolbar` | Barre sticky indépendante sous le header, avec son propre fond et z-index | Formulaire original déplacé dans un panneau « Filtres » appartenant au header |
| Header personnel `.world-header` | Shell parent de la Fenêtre | Seul header dans la vue intégrée ; header enfant masqué |
| Capsule | Transport narratif approuvé | Aucun changement de structure, taille, style ou commandes |

Le cumul des deux premières barres visibles réservait environ 150–160 px en haut et multipliait les règles de positionnement. Certaines positions sticky des panoramas continuaient à se caler sur cette ancienne hauteur.

## Implémentation

- `union/navigation.js` déplace **les nœuds existants** : `#filters`, `#specialty`, `#kind`, `#reset`, `#result-count`, `#reading-simple`. Aucun formulaire ni état de filtre n’est copié. Les événements et le moteur de filtrage de `union/app.js` restent les mêmes.
- `.immersive-nav` est un véritable élément `header` ; son groupe de navigation possède son propre libellé accessible.
- Le bouton Filtres ouvre un `details/summary` natif, sans seconde bande sticky. Tabulation, Entrée, Échap, clic extérieur et indicateur de filtres actifs sont pris en charge. La fermeture du panneau conserve les filtres choisis.
- Les hauteurs du header, l’offset des panoramas et les marges de défilement utilisent `--reader-header-height`. Hors ouverture, son fond est opaque pour éviter que les grands numéros de chapitre transparaissent derrière le logo.
- Dans la Fenêtre intégrée, le formulaire reste dans son document d’origine pour ne pas rompre ses références DOM et ses événements. Seul un bouton de filtres local est visible dans le lecteur ; son header est masqué au profit du header parent.
- Navigation globale : Ouverture, Univers, catalogue d’activités/métiers, Récit, Perspectives, Recherche, Compte. Le catalogue n’est pas un filtre : le premier ouvre le référentiel ; le panneau Filtres affine les moments du récit.
- Sur petit écran, les actions moins présentes dans le header (Perspectives, par exemple) restent accessibles dans la capsule existante.

## Vérifications exécutées

`LD_LIBRARY_PATH=/tmp/aime-browser-libs/lib:$LD_LIBRARY_PATH node scripts/test-navigation-browser.cjs`

- Douze univers, desktop et mobile : un seul header visible, un seul exemplaire de chaque champ, pas de deuxième bande persistante ni de débordement horizontal.
- Filtres d’origine, réinitialisation, lecture simplifiée, ouverture clavier et fermeture Échap fonctionnelles.
- Menu mobile contenu dans le viewport ; menu de filtres positionné en absolu, pas sticky.
- Variante Renaissance : un seul header.
- Fenêtre intégrée : header enfant masqué, formulaire accessible et header parent unique.
- Zéro erreur JavaScript observée dans ce parcours.
- `npm run build` : 42 tests réussis.

Aucun changement aux données canoniques, aux API, à l’authentification ou aux permissions. Aucun test d’authentification réelle n’est revendiqué.
