# AIME — Page Zéro

La première page, avant la grande landing. Elle est verticale, en une seule colonne et en une seule narration, et n'a qu'une sortie.

- Route de travail : `/zero/` (branche `zero`, créée depuis `main`). La production n'est pas touchée.
- Fichiers :
  - `zero/index.html` : structure et styles ;
  - `zero/zero.js` : défilement ;
  - `zero/orbe.js` : l'orbe légère, réutilisable.

## 1. Audit des routes actuelles (`main`)

| Route | Contenu | Remarque |
|---|---|---|
| `/` | Grande landing AIME, « Le monde AIME » | Destination du bouton « Entrer dans AIME ». |
| `/tout/` | Tout voir | — |
| `/lab/orb/` | AIME ORB, laboratoire des formes | Utilise GSAP et MorphSVG ; ce n'est pas un composant isolable. |
| `/studio/`, `/stitchlab/`, `/web/`, `/buro/`, `/accessibilite/` | AIME Studio et ses ateliers | Non modifiés. |
| `/v1/` | Ancienne version | Conservée. |
| `/monde*`, `/lab/site*`, `/lab/socle*`, `/lab/orb/naissance*`, `/bureau*` | Redirections vers `/` (`vercel.json`) | Préservées : aucune redirection n'est modifiée. |

Hors de `main`, sur leurs branches : `/vitrine/world/`, `/synchroview/`, `/infinity/`, `/stitch/`, `/g44/`.

## 2. Séparation

Page Zéro (`/zero/`) → Grande landing (`/`) → Expériences, Bureau, projets.

La Page Zéro ne remplace rien et ne fusionne rien :
- un seul bouton, vers `/` ;
- pas de boucle : la landing ne renvoie pas vers la Page Zéro ;
- pas de second onboarding.

Quand vous voudrez que la Page Zéro devienne l'entrée du site, deux options s'offrent à vous (décision à prendre, rien n'est fait) :
- **A.** `/` devient la Page Zéro et la landing passe sur une route dédiée (par exemple `/aime/`). Il faut alors changer la cible du bouton et les liens internes qui pointent vers `/`, et les redirections existantes vers `/` atterriraient sur la Page Zéro.
- **B.** `/` reste la landing. Le domaine ou une campagne pointe vers `/zero/`. C'est plus prudent, et rien ne bouge.

## 3. L'orbe

La landing dessine l'orbe avec un cône de couleurs AIME découpé par une enveloppe animée par GSAP. Ce n'est pas un composant indépendant.

La Page Zéro utilise donc une **représentation légère et provisoire** (`zero/orbe.js`) :
- même cône de couleurs et même principe d'enveloppe ;
- l'enveloppe respire avec quatre ondes lentes ;
- pas de dépendance.

API : `AIMEOrbe.monter(element)` → `{ animer(bool), arreter() }`. Le moteur AIME ORB pourra la remplacer sans changer la page.

Un seul objet orbe traverse la page. Il rejoint des ancres posées dans le hero, dans le premier geste (où il reste présent) et dans la section finale (où il revient au centre).

## 4. Défilement

- Défilement vertical natif : pas de carrousel, pas de détournement de la molette.
- Trois sections utilisent une scène « collante » le temps de leur hauteur : le premier geste, la métamorphose, le lien. On continue de défiler normalement : rien n'emprisonne.
- Hauteur totale : environ 12 écrans au bureau comme sur iPhone, et 9 en mouvement réduit.
- « Passer l'introduction » mène directement à la section finale. « Réduire les animations » est mémorisé dans ce navigateur. `prefers-reduced-motion` est respecté.
- En mouvement réduit :
  - les six formes de la métamorphose s'affichent l'une sous l'autre, avec leur nom ;
  - le réseau du lien est entièrement tracé ;
  - tous les textes sont visibles.

## 5. Vérifications

Les mesures ont été faites dans Chromium sans accélération graphique : c'est un plancher, un vrai appareil fait mieux.

| Contexte | Résultat |
|---|---|
| Bureau 1440 × 900 | Pas de défilement horizontal, 60 images par seconde, aucune erreur |
| iPhone 13 (émulé) | 390 px, pas de défilement horizontal, 60 images par seconde, aucune erreur |
| Mouvement réduit | Lisible d'un bout à l'autre, rien ne bouge, aucune erreur |

Décision de performance : la lueur et la rotation des couleurs passent par la composition GPU (transform et opacité), et non par des filtres. Une première version avec filtres tombait à 4 images par seconde sans GPU.

## 6. Ce que la page ne contient volontairement pas

Pas de grille d'applications, pas de catalogue, pas de tableau de bord, pas de statistiques, pas de témoignages, pas de démonstration simulée, pas de menu hamburger. Un seul bouton.
