# Provenance des visuels et des polices de la vitrine

## Visuels
| Visuel | Source | Licence | Remplacement |
|---|---|---|---|
| Grand visuel du mariage (héro) | Création générative AIME, originale, calculée dans le navigateur par `vitrine/rendu.js` (`visuel(graine, ambiance)`), graine 1406 | Œuvre originale AIME, aucune image tierce | Renseigner `evenement.visuels.hero.photo` dans `vitrine/donnees/mariage.json` (chemin d'une photographie sous licence) et mettre à jour `credit` |
| Galerie « En images » (6 vignettes) | Idem, graines 31 à 260 | Idem | Ajouter `photo` à chaque entrée de `galerie` |
| Visuel du lieu | Idem, graine du héro + 5 | Idem | Prévu au même endroit |
| Grand visuel du séminaire Maison Orée (héro) | Création générative AIME de nature « architecture » (façades, travées, plan de lumière), `vitrine/rendu.js` (`archi`), graine 2030 | Œuvre originale AIME | `evenement.visuels.hero.photo` dans `vitrine/donnees/seminaire.json` |
| Galerie et lieu du séminaire | Idem, graines 41 à 266 | Idem | Idem |

L'ambiance « Pierre » (`vitrine/presentation/ambiances.json`) est une création AIME ; les autres reprennent les valeurs d'AIME Studio, en lecture seule.

Aucune photographie n'est utilisée aujourd'hui. Toute photographie ajoutée doit indiquer son auteur, sa licence et sa date d'acquisition dans ce fichier.

## Polices
| Police | Fichiers | Version | Licence |
|---|---|---|---|
| Fraunces (variable) | `/fonts/Fraunces-latin-wght.woff2`, `-italic` | @fontsource-variable/fraunces 5.3.0 | SIL Open Font License 1.1, `/fonts/OFL-Fraunces.txt` |
| Playfair Display (variable) | `/fonts/PlayfairDisplay-latin-wght.woff2`, `-italic` | @fontsource-variable/playfair-display 5.3.0 | SIL Open Font License 1.1, `/fonts/OFL-PlayfairDisplay.txt` (nom réservé « Playfair Display » : fichiers utilisés sans modification) |
| Inter, Cal Sans | déjà présents | — | SIL Open Font License 1.1 |

Repli si une police ne charge pas : Fraunces → Playfair Display → Georgia → Times New Roman → serif ; texte : Inter → système.
