# AIME Magazine n° 001

**Une encyclopédie visuelle et pédagogique d'AIME, publique, composée avec le moteur de pages qu'elle décrit.**

Le magazine sera servi à `/magazine/`, sans compte. Il est d'abord vérifié en aperçu privé et ne rejoint `main` qu'après validation explicite.

## Fabrication

| Fichier | Rôle |
|---|---|
| `magazine/n001.aime-site.json` | La source : un site `aime-site` ordinaire, à plusieurs pages, en Design System « Éditorial Magazine ». |
| `scripts/magazine.cjs` | Génère `magazine/*.html` avec `AIMESite.exporter`, qui ne produit que la vue publique, puis copie les photos citées depuis la bibliothèque d'images. `--verifier` échoue si une page n'est pas à jour. |
| `scripts/magazine-captures.cjs` | Capture les vrais écrans avec des données fictives (le projet « Renard d'automne »), à 1440 px et à 390 px, en `.webp`. |
| `magazine/medias/` | Les écrans capturés et les photos utilisées. |
| `tests/magazine.test.cjs` | Vérifie le contrat ci-dessous. Le parcours navigateur et le contrôle d'accessibilité couvrent aussi les pages. |

**Le magazine n'a pas de moteur à lui.** Une seule amélioration commune a été ajoutée, et elle sert toutes les réalisations : l'en-tête accepte sa propre image (`src`), ce qui permet une ouverture par page. Sans `src`, il reprend comme avant la première photo de la galerie.

### Mettre à jour

1. Modifier `magazine/n001.aime-site.json`.
2. Si une interface a changé, relancer `scripts/magazine-captures.cjs`.
3. Lancer `node scripts/magazine.cjs`.
4. Lancer `npm test`.

## Contrat

- **Aucune donnée privée :**
  - ni Régie ni route `/api/` ;
  - ni stockage ;
  - ni coordonnée ;
  - toutes les sections sont publiques.
- **Captures :** uniquement des données inventées. Les références DMC sont publiques.
- **Liens internes :** chacun mène à une page du magazine ou à un outil qui existe. Une balise `<base href="/magazine/">` garde les liens relatifs justes, que l'adresse se termine ou non par `/`.
- **Images :** chacune existe en local et a un texte alternatif qui décrit ce qu'elle montre.
- **Honnêteté :** ce qui n'existe pas encore est marqué « À venir », et les rubriques non écrites « à paraître ».
- **Numéro daté :** le n° 001 est daté (`infos.date`) et conservé comme édition de référence. Les évolutions techniques iront dans une documentation vivante distincte, vers laquelle le magazine renverra.

## État (22 octobre 2026)

**Écrit :**
- couverture et sommaire ;
- édito, premier jet à réécrire par Matt ;
- 01 · Point Zéro ;
- 09 · Métiers : musicien et artiste, prestataire événementiel et wedding planner, formateur et organisme de formation, atelier de broderie, couple, artisan, association, séminaire.

**À paraître :** 02 à 08, 10 et 11.

**Composants communs validés, à faire dans le lot suivant :**
- un bloc **Comparaison** ;
- un **écran annoté** : variante du bloc image, avec l'image et le texte côte à côte pour les doubles pages ;
- un **rendu multi-Design Systems** directement dans la page ;
- une **touche irisée** réservée à la signature AIME. Aucun Design System ne la porte encore : à définir comme jeton de signature.

**Limite du moteur, constatée :** les listes (galerie, chronologie, chiffres, liens) sont communes à tout le site. Une rubrique ne peut donc pas encore avoir sa propre galerie. Une liste par section serait une amélioration commune à proposer.

**À vérifier avant publication sur `main` :** l'origine et les droits des photos de la bibliothèque. Leur source est enregistrée (dépôt `MINISITEWEDDING`), mais pas leur licence.

**Pour plus tard :** les contenus pourront nourrir des parcours de formation guidés par l'Orbe. Academy n'est pas construit.
