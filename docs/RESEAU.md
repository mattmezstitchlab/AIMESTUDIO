# Le Réseau des facettes vivantes

> Le Point Zéro comprend et construit. Le cube organise. Le Canevas permet de modifier. Le Réseau permet de découvrir. La facette permet de partager et de réutiliser. La bibliothèque conserve. La boutique, plus tard, commercialise. L'orbe accompagne.

## Audit : ce qui existe et se réutilise

| Brique | Où | Rôle dans le Réseau |
|---|---|---|
| Timbre | `compte/timbre.js` | L'identité du créateur, sur chaque carte |
| Cube-personne | `cube/modele.js` | Six facettes, privé par défaut, `publier()` et `publiques()` : la seule lecture que le Réseau aura des profils |
| Moteur de pages (Métamorphose) | `vitrine/rendu.js` (`AIMESite`) | Le rendu réel de chaque facette, les blocs, `ajouterSection`, `tasser`, `hauteur` |
| Mini-site d'un projet | `pointzero/minisite.js` | La page d'une création, construite à partir des données confirmées au Point Zéro |
| Projets du Point Zéro | IndexedDB `aime-point-zero` | Les créations réelles, sans duplication |
| Canevas et adaptateur `aime-site` | `canevas/` (#47) | L'édition des facettes ajoutées |
| Orbe | `orbe/`, la grande page | Le compagnon : ici, le menu des actions autorisées |
| Régie maîtresse | `regie/` | **Non touchée.** Ses mécanismes éditoriaux (publier, statuts) inspireront la publication, sans exposer ses droits d'administration |

**Ce qui n'existe pas encore** : la publication serveur, les permissions entre comptes, les licences, la persistance de la bibliothèque, les lecteurs média et audio, le paiement.

## Le démonstrateur (`/reseau/`)

Une interface **distincte**, annoncée comme démonstrateur. Elle montre **vos** créations comme elles apparaîtraient une fois publiées. **Rien n'est publié.**

- **Six entrées** : Profils, Créations, Médias, Musique, Modules, Boutique. Créations et Modules fonctionnent ; les quatre autres disent honnêtement ce qui viendra, sans données inventées.
- **La carte vivante** : une facette à la fois, rendue par le moteur avec ses vrais blocs (motif, palette DMC, dimensions, progression…).
  - Toucher la carte passe à la facette suivante, sans quitter sa place dans la mosaïque.
  - Six indicateurs montrent la progression et permettent d'aller à une facette précise.
  - La transition est un fondu glissé, inspiré de la grande page, sans rotation 3D.
  - Au clavier : flèches, Entrée. En mouvement réduit : pas d'animation. Le rendu se fait à l'approche de l'écran.
- **Une création** est un projet réel du Point Zéro : sa page est celle que la personne a composée, sinon celle que le moteur en tire (jamais enregistrée par le Réseau).
  - Au plus six facettes, comme les six faces du cube ; les facettes vides ou non publiques ne sont pas montrées.
  - S'il y en a plus de six, les moins parlantes cèdent la place (texte, puis chronologie).
- **L'identité** : le timbre du compte connecté, sinon celui de « Vous · cet appareil ».
- **Inspecter** : auteur, source, version, licence, visibilité.
- **Mettre de côté** : une **référence** (source, facette, auteur, version) dans la bibliothèque, **jamais une copie**. « Ma bibliothèque » la liste ; « Retrouver » rouvre la carte sur la bonne facette ; « Retirer » la retire.
- **Tester** (modules) : une page de démonstration, avec des **données fictives**, dans un cadre isolé (`sandbox`, aucun script, aucun accès au compte).
- **Ajouter à mon cube** (modules) : choisir son projet, puis AIME vérifie sept points.
  1. Compatibilité
  2. Version
  3. Dépendances
  4. Données nécessaires (rien n'est inventé)
  5. Droits de réutilisation (licence)
  6. Permissions (seulement ses propres projets)
  7. Configuration (pas deux fois)

  Si tout est vert, l'orbe demande seulement de confirmer. Une **instance** du bloc est ajoutée à la page du projet, à la fin de la grille, sans chevauchement, avec son origine (module, version, auteur, licence). Elle apparaît aussitôt dans le mini-site, sur la carte, et dans le Canevas.
- **Le registre des capacités** (`reseau/registre.js`) : Galerie, Palette DMC, Suivi de progression, Chronologie, Chiffres clés. Chacun est **un bloc existant du moteur**. **Aucun code communautaire n'est exécuté.**
- **L'orbe** propose les actions de la carte ; les mêmes boutons restent visibles pour qui ne l'utilise pas.

**Limites.** Bibliothèque et intégrations sont enregistrées sur cet appareil. Les créations sont les projets de ce navigateur.

## Ensuite, dans l'ordre

1. **Publication explicite** : choisir les facettes à rendre visibles (`publier()` du cube, Régie personnelle). Une facette complète ne devient jamais publique seule. Métadonnées : auteur, timbre, version, catégorie, licence, statut, visibilité, compatibilité.
2. **Persistance serveur et permissions des espaces** : bibliothèque, publications et instances.
3. **Point Zéro** : quand une capacité manque (par exemple une palette sans suivi de stock), l'orbe propose une facette compatible de la bibliothèque, une fois, sans publicité permanente. La causalité dit les dépendances et les conséquences de l'intégration.
4. **États des facettes** : à compléter, informations présentes, cohérence à vérifier, validée, à réexaminer après modification. Une décision modifiée fait repasser les facettes dépendantes « à vérifier ».
5. **Profils** (face Identité d'abord), **Médias** (visionneuse), **Musique** (lecteur, extraits autorisés, filtres par moment), **Boutique** (licences, retrait de la vente sans retirer les droits accordés).
