# AIME STITCH · le patron vivant

Phase 0 (audit et stratégie) et phase 1 (prototype visuel) sur la branche `stitch`, créée depuis `main`. Rien n'est modifié dans `main`, AIME WORLD, SynchroView, le Studio, Stitchlab ni les autres dépôts. Aucun paiement, aucune donnée réelle, aucun contenu sous droits.

Phase 2 (moteur réel) en cours : export PDF vectoriel, outils d'édition avancés, et refonte visuelle épurée (style « Apple » : blanc, gris très clair, typographie système, une seule couleur d'action).

Pages : `/stitch/` (découvrir), `/stitch/patron/?id=…` (fiche), `/stitch/atelier/` (créer et corriger), `/stitch/broder/?id=…` (lecteur).

## 1. Audit des projets existants

| Projet | Ce qui existe vraiment | Verdict |
|---|---|---|
| **POINTZERO** (React 19, TS, Vite, ~474 tests) | Le plus abouti : modèle de patron complet (croix, demi-points, quarts, backstitch, nœuds, calques, provenance, licence), table DMC (craft-color-codes, 489 fils), CIEDE2000, symboles « un dessin, trois rendus », éditeur (~20 outils), mode broderie avec progression, export PDF jsPDF (couverture, légende, grilles paginées), OXS/SVG, import PDF vectoriel avec reconnaissance de symboles. Boutique = démo, aucun compte. | **Base technique à reprendre** (bibliothèque `src/lib/`), en l'extrayant du reste du dépôt (musique, mariage, budget…). Faiblesse : réduction des couleurs « les N plus fréquentes », qui perd les petites couleurs saillantes. |
| **Stitchlab** (dans ce dépôt) | Copie du moteur Point Zéro dans un fichier de 5 500 lignes, lui-même dupliqué dans 7 fichiers (studio, image, docs, web, buro…). Grille RLE, outils, PDF jsPDF par CDN. Aucun lecteur, aucun import PDF. Fortement couplé au Bureau. | Ne pas toucher (autre session). Seule reprise : la table DMC, en lecture, avec son attribution. |
| **UNIVERSALBRODERIE** (JS sans dépendance) | Très bon modèle (`project.mjs`), progression séparée de la grille (`progress.mjs`), historique, validation, échange versionné V1→V2, fiche imprimable. | Reprendre les **principes** (progression séparée, validation, migrations). Le dépôt a une régression : 29 tests sur 38 échouent depuis le passage à 456 couleurs pour 8 symboles. |
| **BRODIA** (Base44) | PDF de patron correct mais rastérisé, nettoyage des confettis, aide à l'achat de fils. Cellules stockées une par une (14 000 objets), couleurs en RGB. | Idées seulement. |
| **BRODEZ** | Maquette (génération par formules, 24 couleurs), aperçu 3D illustratif. **Contient une clé `service_role` Supabase en clair** (`agon-agent_1-01cb1f1d 2/vercel.json`), exposée par une API sans authentification. | À abandonner. **Clé à révoquer, historique à purger.** |
| Aime-coloria, ColorCard, stitch3D, aimeatelier, BRODEZVOTREMARIAGE | Coloriage par numéros, carte interactive, dépôts vides ou quasi vides. | Rien à reprendre (au mieux le schéma Stripe de Coloria, plus tard). |
| SynchroView, permissions AIME | Matrice explicite, vérification serveur, distinction carte d'usage / perspective / rôle. | Principes réutilisés (ci-dessous), code non modifié. |

**Licences.**
- Code POINTZERO : MIT.
- Table DMC : craft-color-codes, licence « MIT AND CC-BY-4.0 », avec attribution obligatoire dans chaque export.
- DMC est une marque. Ses couleurs d'écran ne sont pas officielles. Les références ne servent qu'à identifier un fil.
- Deux images de démonstration de POINTZERO sont sans provenance (`grille-roses.png`, `papillon.png`) : elles ne doivent pas être publiées.

## 2. Structure produit proposée

Un objet, cinq expériences.

```
            ┌──────────── patron canonique (versionné) ────────────┐
 Créer ─▶ conversion ─▶ brouillon ─▶ Corriger ─▶ publier (version figée) ─▶ fiche boutique, PDF
                                                        │
                    variante personnelle (mes fils) ◀───┤
                    progression de la brodeuse ◀────────┘  (séparée, liée à la version)
```

| Couche | Rôle | État en phase 1 |
|---|---|---|
| 1. Modèle canonique | `stitch/js/patron.js` : format `aime-stitch` schéma 1, matrice RLE, palette = références DMC seules (nom et couleur viennent de la table), symboles, demi-points, backstitch vectoriel, calques, provenance, licence, historique ; validation, migration, empreinte, publication figée | Fait |
| 2. Importateur | Images JPEG, PNG, WebP | Fait. PDF : phase 2 (reprise de l'import vectoriel POINTZERO, avec calibrage et validation humaine pour les scans) |
| 3. Moteur de conversion | `stitch/js/conversion.js` : redimensionnement par surface en lumière linéaire, segmentation (Sobel), k-moyennes en CIELAB avec départ fixe, DMC le plus proche (CIEDE2000), toile auto, points isolés, petites régions, protection des détails, vérification | Fait, quatre modes paramétrés |
| 4. Moteur d'édition | Crayon, pipette, remplir, remplacer partout, gomme, points isolés, fusion de couleur, annuler / rétablir | Fait (phase 1). Sélection, symétrie, backstitch, demi-points : phase 2 |
| 5. Rendu | `stitch/js/rendu.js` : aperçu brodé sur toile tissée, grille symboles / couleurs / mixte, repères 10 × 10 | Fait |
| 6. Lecteur | Zoom, déplacement, pincement, couleur suivie, points faits, restants par couleur, masquer les terminées, grande lisibilité, clavier, reprise | Fait. Hors connexion : phase 3 |
| 7. PDF | Couverture, légende, grilles couleur et noir et blanc, pages, repères, version, attribution | Phase 2 (jsPDF installé, pas de CDN) |
| 8. Catalogue / publication | Fiches calculées depuis le patron, filtres propres au point de croix, « réalisables avec mes fils » | Découverte et fiche faites ; publication : phase 4 |
| 9. Permissions | Matrice explicite (voir un patron public, prévisualiser un extrait, modifier le sien, publier, accéder à un achat, télécharger un PDF autorisé, voir ses ventes, modérer), vérifiée par le serveur | Démonstration côté navigateur ; matrice et serveur : phase 4 |
| 10. Stockage et versions | Brouillon, versions publiées figées, variantes personnelles, progression par (patron, version) | Brouillon et progression locaux ; serveur : phases 3-4 |

**Rôles.** On garde la règle AIME : une perspective (créatrice, brodeuse, visiteuse, gestionnaire de boutique, modératrice) n'est ni un rôle ni un droit. Une même personne peut être créatrice et acheteuse, et les droits portent sur des objets précis.

## 3. Ce que la phase 1 démontre

- **Une donnée, plusieurs représentations** : l'aperçu brodé, la grille, la légende, les quantités, la fiche et le lecteur lisent le même fichier `stitch/data/patrons/*.json`. Le catalogue ne recopie aucune donnée technique (testé).
- **Trois conversions comparées** avant de choisir (Simple, Équilibré, Précis), avec leurs chiffres : couleurs, isolés supprimés, régions fondues, détails protégés, fidélité (CIEDE2000 moyen), effort, niveau, temps de calcul (environ 0,15 à 0,25 s chacune).
- **Effort réel** : un indice expliqué en « équivalents points » (points, changements de fil par bloc de 10 × 10, régions, isolés, backstitch, demi-points), avec ses poids visibles et réglables. Aucune durée n'est promise.
- **Ma boîte à fils** : la fiche dit ce que la brodeuse possède, ce qui lui manque et le fil le plus proche qu'elle a (avec l'écart). La boutique filtre « réalisables avec mes fils ».
- **Versions** : la publication fige une version. Corriger le brouillon ne touche pas la version achetée (testé). La progression est enregistrée par (patron, version), en dehors du patron.
- **Accès** : un patron payant ne s'ouvre dans le lecteur qu'après une acquisition simulée. Un extrait de 20 × 20 points reste visible sur la fiche.

Les patrons de démonstration viennent d'illustrations originales dessinées en code (`stitch/js/motifs.js`), converties une fois par `stitch/outils/generer.html`. Les boutiques et les créatrices sont fictives.

## 4. Tests (phase 1)

`tests/stitch.test.cjs` : 10 tests.
- CIEDE2000 sur les paires de référence de Sharma.
- Table DMC intacte : 489 références, aucune inventée.
- Conversion déterministe, dimensions en points.
- Sérialisation, validation et migration.
- Publication figée.
- Quantités, dimensions, fournitures et effort décomposable.
- 48 symboles distincts.
- Catalogue sans copie de données.
- Progression hors du patron.
- Isolement des autres studios.

Vérifications dans le navigateur (Playwright, ordinateur et 390 px, sans erreur) :
- trois conversions en moins d'une seconde ;
- correction (77 points isolés supprimés, une couleur fondue, crayon, annuler, rétablir) ;
- validation et enregistrement du brouillon ;
- acquisition simulée, lecteur, couleur suivie, 20 points cochés, page fermée puis rouverte : les 20 points sont retrouvés.

## 5. Décisions à prendre avant la phase 2

1. **Où vit AIME STITCH.**
   - (a) Dans ce dépôt, en JavaScript sans dépendance, comme aujourd'hui (preview immédiate sur le même site).
   - (b) Dans un dépôt dédié en TypeScript, en reprenant la bibliothèque POINTZERO et ses tests. C'est ma recommandation pour la suite : la plus grande part du travail difficile (PDF, import PDF, éditeur complet, lecteur) y existe déjà et est testée.
   - Le prototype actuel servirait alors de maquette et de référence d'expérience.
2. **La conversion.** Je propose de garder le moteur de cette phase : k-moyennes en Lab, protection des détails, régions. Il pourra remplacer le « top N » de POINTZERO une fois comparé sur un jeu d'images réelles.
3. **Les données DMC.** Garder craft-color-codes avec attribution, ou obtenir une source sous licence plus simple avant toute commercialisation.

## 6. Limites connues

- Prototype sans serveur : brouillons, acquisitions et progression vivent dans le navigateur.
- Les poids de l'effort réel, la cadence (100 à 200 points par heure) et les quantités de fil (environ 1 800 points par écheveau en 14 ct, deux brins) sont des **hypothèses affichées**, à mesurer avec de vraies brodeuses.
- Les illustrations de démonstration sont simples. Il faut tester la conversion sur de vraies photographies : oiseau, fleurs, portraits.
- Les variantes personnelles, la composition florale par calques et le hors connexion sont prévus et non commencés.

## 7. Phase 2 · avancement

| Élément | État |
|---|---|
| **Refonte visuelle** | Typographie système (SF sur Apple, Inter ailleurs), grands titres serrés, sections blanches, grises et noires, surfaces arrondies, barres translucides, une seule couleur d'action (bleu), le motif brodé comme seule couleur forte. Les quatre pages, ordinateur et téléphone. |
| **Export PDF** | `stitch/js/pdf.js` + jsPDF 4.2.1 (MIT), servi depuis `stitch/vendor/` et non depuis un CDN. Le document est entièrement vectoriel : couverture avec aperçu en cases, chiffres et autres toiles ; légende avec symboles dessinés, couleurs, références, points, écheveaux ; consignes ; plan d'assemblage ; grilles en couleur puis en noir et blanc (55 × 75 points par page) ; lignes tous les 10 points numérotées depuis le début du motif ; flèches du centre ; pages voisines indiquées ; version et empreinte sur chaque page ; attribution des couleurs DMC. Dans l'atelier : PDF du brouillon. Sur la fiche : PDF seulement si le patron est offert ou acquis. |
| **Édition** | Sélection rectangulaire et déplacement, retournement horizontal et vertical, symétrie gauche → droite (sur la sélection ou le motif), backstitch vectoriel sur les intersections, effacement des backstitchs, annuler / rétablir (grille, palette et backstitchs). |
| **Correction d'un défaut** | L'empreinte d'un patron ne suivait pas les corrections faites en mémoire. Elle est maintenant recalculée sur la grille courante (testé). |
| **Tests** | 12 tests STITCH. S'ajoutent : le PDF comporte le bon nombre de pages, chaque référence DMC dans la légende, les symboles et l'empreinte du patron dans ses métadonnées, les dimensions, l'attribution et la version ; toute correction change l'empreinte. |

### Phase 2 · suite (import, demi-points, contours, régions)

| Élément | État |
|---|---|
| **Import d'un patron existant** (`/stitch/importer/`) | PDF (pdf.js 4.10.38, Apache-2.0, servi depuis `stitch/vendor/`) ou image. Déclaration d'usage personnel obligatoire avant toute lecture ; le fichier ne quitte pas le navigateur. Étapes : choix de la page (vignettes) → cadre tracé sur la grille (bords ajustables) → pas détecté et lignes superposées pour contrôle → lecture des cases → un groupe par symbole avec la case la plus typique, le nombre de cases, une suggestion DMC (CIEDE2000) seulement si la page est en couleur → **chaque groupe doit recevoir une référence DMC existante, ou être rendu à la toile** → brouillon privé (`licence: import-prive`, `provenance.source: import`) ouvert dans l'atelier. |
| **Lecture** (`stitch/js/lecture.js`) | Pas de grille : profil de « finesse » (médiane de l'écart à ±2 px), autocorrélation, puis choix du nombre de cases dont toutes les lignes tombent juste (gère les cases de taille non entière). Symboles : signature 16 × 16 prise sur le cadre de l'encre (insensible au décalage d'un pixel), regroupement en trois temps (affectation, fusion des groupes moyens, réaffectation). Réglage « fin / standard / large ». |
| **Mesures sur notre propre PDF** (7 pages, 13 fils) | Grille couleur : pas détecté 55 × 52, 27 groupes, 100 % des 2 860 cases reconstruites après validation. Grille noir et blanc : 55 × 52, 24 groupes, 99,97 % (une case). Un patron imprimé, scanné ou photographié sera moins net : l'atelier reste l'étape de vérification. |
| **Garde-fous** | Un import reste privé : l'atelier verrouille la licence d'un brouillon importé, même si l'on change le menu. Aucune référence DMC n'est créée : toute saisie hors table est refusée. |
| **Demi-points** | Outil « Demi » (pose `/`, tourne en `\`, retire) ; jamais sur une case déjà brodée en croix ; rendus dans l'atelier, le lecteur et le PDF ; comptés pour moitié dans les fournitures ; validés. |
| **Contours automatiques** | « Renforcer les contours » : backstitch qui suit le bord du motif, en polylignes simplifiées, dans la couleur la plus sombre de la palette. Annulable. |
| **Sélection de régions** | Baguette (points connectés de même couleur) → recolorer, fondre dans la couleur voisine dominante (une couleur brodée avant la toile), effacer. |
| **Brouillons** | `/stitch/atelier/?brouillon=<id>` rouvre un brouillon enregistré dans ce navigateur. |
| **Tests** | 15 tests STITCH, dont une grille synthétique relue case pour case et les opérations d'édition. |

### Assemblage de plusieurs pages (moteur de POINTZERO)

| Élément | État |
|---|---|
| **Origine** | Placement en puzzle porté de POINTZERO (`src/components/PdfPrep.tsx`, `positionsPuzzle` ; licence MIT, même auteur), réécrit en JS sans dépendance dans `stitch/js/lecture.js`. Ses deux tests d'origine (sans chevauchement, réordonnable) sont repris dans `tests/stitch.test.cjs`. |
| **Ce qui s'ajoute** | `analyserPages` lit chaque page à sa place dans une grille d'ensemble et regroupe les symboles sur toutes les pages à la fois : un fil garde un seul groupe, quelle que soit sa page. `lirePosition` place une page qui indique ses colonnes et ses lignes (« Colonnes 56 à 80 · lignes 1 à 75 ») ; sinon rien n'est deviné. |
| **Parcours** | « Ajouter cette page au patron » ; la page suivante reprend le cadre et le pas de la précédente ; liste des pages avec position corrigible, plan d'assemblage, signalement des recouvrements ; « Lire les N pages ». |
| **Mesure** | Notre PDF Mésange, pages 4 et 5 : grille d'ensemble 86 × 52, 27 groupes, 1 652 croix sur 1 652, 100 % des cases. |

Restent : patrons scannés de mauvaise qualité (redressement de perspective) ; lecture des demi-points et backstitchs d'un PDF existant ; recouvrements entre pages gérés par « la première page lue compte » (pas de recalage automatique).
