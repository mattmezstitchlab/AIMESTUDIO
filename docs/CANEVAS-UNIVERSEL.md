# AIME — Canevas universel (refonte d'AIMESTUDIO)

Ce document répond au brief « Refonte générale d'AIMESTUDIO » et au brief « AIME Universal Studio » (23 octobre 2026). Il complète `docs/CONSTRUCTEUR-UNIVERSEL.md`, que Matt a fait évoluer le même jour : la cible est désormais **un Canevas à trois panneaux** (référence visuelle « AIME Studio · Canevas universel »), construit **sur les moteurs existants**.

## 1. Diagnostic

AIMESTUDIO compte déjà trois éditeurs, qui se recouvrent en partie :

| Éditeur | Route | Ce qu'il sait faire | Ce qui lui manque |
|---|---|---|---|
| Générateur de sites | `/sites/` | Pages, sections, palette de 47 blocs, médias, infos et listes « écrites une fois », aperçu ordinateur / tablette / téléphone, « voir comme » par rôle, annuler / rétablir (60 états), import et export | Design Systems, zoom, bande des pages, onglet Source |
| Canevas + adaptateur `site` | `/canevas/?site=` | Sélection, déplacement et redimensionnement sur grille, Design System avec avant / après, enregistrement explicite avec contrôle de conflit | Ne montre que la première page ; ne permet ni d'ajouter des blocs ni de modifier les listes |
| Canevas + adaptateur `publication` | `/canevas/?publication=` | Doubles pages, gabarits, chemin de fer, composition au clavier, à la souris et au doigt | Ne sert qu'aux publications |

Constat : le moteur est commun à tous (`vitrine/rendu.js` → `AIMESite`), mais **l'interface est éclatée**. La refonte ne crée donc pas de nouveau moteur. Elle réunit ces gestes dans une seule interface.

## 2. Cartographie des moteurs réutilisés

| Moteur | Fichier | Contrat | Réutilisé ici |
|---|---|---|---|
| Moteur de pages | `vitrine/rendu.js` | `AIMESite.document(site, {page, presentation, visuels, edition})` → `{html, titre, bilan}`. Registre `BLOCS` (47 blocs, plus 5 venus de la publication). `DEPS` indique quelle information alimente quels blocs. | Rendu central, miniatures, « avant » |
| Design Systems | `design/systemes.js`, `design/charger.js`, `design/catalogue/*.json` | `appliquer`, `annuler`, `restaurer` ne modifient que le pointeur `presentation.design`. `empreinte` vérifie que le contenu n'a pas changé. | Inspecteur, onglet Style |
| Stockage | `localStorage` « aime-sites » | `{sites:{id:site}, cur}`, format `aime-site` schéma 1 | Inchangé |
| Permissions | `synchroview/permissions.js`, `api/_auth/*` | Rôles et audiences. Better Auth côté serveur (lien e-mail, passkey). Le propriétaire est vérifié côté serveur, mais seulement pour `api/sv/*`. | Aperçu « voir comme » (une démonstration, voir § 3) |
| Publication | `publication/planche.js`, `canevas/adaptateurs/publication.js` | Doubles pages | Accessible par l'onglet « Publication » |

## 3. Audit des permissions (état réel)

- **Côté serveur :**
  - `api/_auth/auth.mjs` : Better Auth avec lien e-mail et passkey, sur Postgres/Neon (réponse 503 sans secret).
  - `api/espaces.mjs` : espaces, rôles, invitations.
  - `api/_auth/proprietaire.mjs` : `AIME_PROPRIETAIRES`, qui ne protège aujourd'hui que `api/sv/*`.
- **Côté navigateur seulement :**
  - les audiences de section et l'aperçu par rôle ;
  - le masquage de la Régie ;
  - **toute la persistance des sites**. Aucun `aime-site` n'est enregistré sur un serveur.
- **Conséquence :** dans le Canevas universel, « Qui voit cette section » et « Voir comme » sont des **aperçus**, et l'interface le dit. Le jour où les sites seront stockés sur un serveur, ce dernier devra filtrer les sections réservées avant de les transmettre. Cacher un bouton ne remplace jamais ce contrôle.
- **Pas de second système de comptes :** la PR #4 (connexion Neon séparée) a été fermée pour cette raison.

## 4. Régressions historiques (rappel)

- Timbre, Enveloppe et Ma Grande Verticalité : l'audit du 23/10 a montré que les données étaient intactes dans le navigateur. Les régressions venaient des commits du 19 et du 20 octobre.
- La collision de la clé `aime-os` a été corrigée : elle est devenue `aime-os-v2`, et l'ancien Bureau est préservé (#59, #60).
- Rien n'a été supprimé ni migré pendant cette refonte.

## 5. Architecture cible

```
Point Zéro (intention) → Projet (aime-projet v1, contrats/projet.js)
                           └─ réalisations : aime-site (pages, sections, infos, listes, presentation.design)
Canevas universel = une seule interface, des modes :
   Site ............ /sites/                 (cette tranche)
   Publication ..... /canevas/?publication=  (existant)
   Création, Présentation, Formation ........ plus tard, avec le même modèle de données
Inspecteur : Bloc · Contenu · Style (Design System) · Source
Moteurs : rendu (AIMESite), Design Systems (AIMEDesign), permissions (serveur)
```

Règle des sources (idée « BIGDAY »), aujourd'hui :

- **Contenu fixe** : écrit dans le bloc.
- **Référence interne** : le bloc lit une information du site (`infos`) ou une liste (`listes`), et le moteur le déclare dans `DEPS`. Une modification met à jour tous les blocs lecteurs, sur toutes les pages.
- **Instantané figé** : pas encore construit, et l'interface le dit.
- **Sources externes** : non promises.

## 6. Du visuel aux vrais composants

| Visuel | Composant réel |
|---|---|
| Logo irisé « AIME Studio · Canevas universel » | `.st-orbe`. L'irisé est réservé à la marque. |
| Onglets Site / Publication / Design System | `/sites/`, `/canevas/?publication=nouvelle`, onglet Style de l'inspecteur |
| Rail Pages / Blocs / Médias / Données / Styles / Sources | Liste des pages, palette des blocs (`PALETTE`), bibliothèque, « Vos informations », onglet Style, onglet Source |
| Arbre des pages, calques | `#pages`, `#sections` (monter, descendre, dupliquer, retirer) |
| Barre du canevas : appareil, zoom | `data-taille`, `data-zoom` (25 % à 200 %) |
| Rendu central sélectionnable | `AIMESite.document(…, {edition:true})` dans un cadre |
| Inspecteur Contenu / Style / Interactions | Bloc · Contenu · Style · **Source**. « Interactions » n'est **pas affiché** tant qu'il ne fait rien. |
| Bande des pages en bas | `#bande` : vraies miniatures rendues par le moteur, sans script |
| Bouton « Publier » | Remplacé par « Exporter » (.zip public, page .html, sauvegarde .json privée). Aucune publication serveur n'est promise. |

## 7. Plan de migration non destructif

1. **Fait (cette PR)** : le mode Site du Canevas universel, sur `/sites/`.
   - Même stockage, mêmes sites, aucune migration.
   - Le registre le nomme « Canevas universel · Site ».
   - Le Canevas vide propose « Composer un site ».
2. **Ensuite** : faire ouvrir les sites du Bureau dans le Canevas universel plutôt que dans l'adaptateur `site`, une fois le contrôle de conflit d'enregistrement de l'adaptateur porté (`D.reference`).
3. **Puis** : le mode Publication prend le même habillage (rail, inspecteur, bande).
4. **Puis** : les instantanés figés (Source), puis les interactions de l'Orbe, chacun dans son chantier séparé, avec prévisualisation et acceptation.
5. **On ne retire une ancienne entrée** (adaptateur `site`, ancien Studio) **qu'après une équivalence testée et la reprise des projets.**

## 8. La démonstration fonctionnelle (vérifiée par `tests/navigateur/parcours.cjs`)

Ordinateur, téléphone et mouvement réduit, sur le démonstrateur « Mariage · Léa & Marc » (données fictives) :

- ouvrir le projet, puis choisir un bloc dans les calques ;
- l'onglet Source affiche « Référence interne » pour l'en-tête ;
- appliquer « Éditorial Magazine », avec comparaison avant / après côte à côte ;
- zoomer, passer en aperçu téléphone ;
- recharger la page : le Design System est toujours appliqué ;
- exporter la sauvegarde `.json`.

Il n'y a aucun débordement horizontal ni aucune erreur JavaScript, et axe ne relève aucune anomalie grave dans l'atelier (Style et Source).

## 9. Garder les anciennes réalisations pendant la transition

- Le format `aime-site` est inchangé, et `migrer()` reste le seul point d'entrée des anciens sites.
- Les routes `/canevas/?site=`, `/projet/`, `/bureau/` et `/studio/` restent servies.
- Les données Timbre, Stitch, Studio et événements ne sont pas touchées.

## Critique (demandée par le brief)

- **Les huit modes et l'Orbe pilote** : construits d'un coup, ils compliqueraient l'expérience. On n'ajoute un mode que quand le précédent est terminé.
- **Les quatre Design Systems et les 36 ambiances** cohabitent dans l'onglet Style. C'est utile pour la compatibilité, mais à terme une seule liste doit rester visible : les ambiances deviendraient des variantes d'un Design System.
- **« Publier » et les permissions dans le Canevas** : ces boutons n'auront de sens qu'avec un stockage serveur des sites. Avant cela, les afficher serait trompeur.
