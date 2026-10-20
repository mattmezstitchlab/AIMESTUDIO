# AIME SynchroView — audit et évolution

Branche : `synchroview`. `main` n'est pas modifiée. La page actuelle `/tout/` reste intacte : SynchroView vit à côté, sur `/synchroview/`.

## 1. Audit de « Tout voir » (état actuel sur main)

### Ce qui fonctionne
| Point | Constat mesuré |
|---|---|
| Quatre vues en grille | 4 iframes de la même page (`/?apercu&mode=…`), mises à l'échelle par `transform`. Lisible, rapide à comprendre. |
| Synchronisation | Le défilement de la page pilote les 4 vues par un pourcentage commun. Écart mesuré entre vues : 2 à 4 px, car les 4 modes ont aujourd'hui la même hauteur (25 580 px). |
| Mode aperçu | `?apercu` lit votre mémoire mais n'écrit rien (`save` neutralisé) : comparer ne modifie pas vos données. Testé : `aime-mem` reste vide après une session. |
| Coût | Prête en ~2,2 s en local ; 14 Mo de mémoire JS, 8 200 nœuds pour 4 vues. Fluidité relative : 4 vues ≈ 5 images/s contre 7 pour une seule page dans le navigateur de test sans carte graphique, donc un surcoût faible (les valeurs absolues ne reflètent pas un vrai ordinateur). |
| Index | Les repères sont calculés sur la 1re vue et permettent de sauter à une section. |

### Limites trouvées
1. **Le format « Mobile » n'est pas un vrai rendu mobile.** Après bascule, les vues font bien 390 px de large mais gardent la hauteur de page calculée à 900 px (25 580 px au lieu d'environ 22 700). La page AIME calcule certaines hauteurs au chargement. → Il faut recharger les vues quand le format change.
2. **Synchronisation au pourcentage.** Elle tient tant que les pages ont la même longueur. Entre formats ou entre versions différentes, 50 % ne tombe plus sur la même section.
3. **« Toucher » désynchronise sans retour.** Une vue défilée à la main reste seule (mesuré : 5 000 px contre 3 px pour les autres) et les autres ne suivent pas.
4. **Accès direct au contenu des cadres** (`contentWindow.document`). Cela ne marche que sur le même domaine : impossible de comparer un autre site, une version déployée ailleurs ou un fragment de l'Atlas.
5. **Pas d'état partageable.** « Copier la position » copie un texte, pas un lien qui rouvre la même comparaison.
6. **Repères codés en dur** dans `/tout/` (noms des chapitres) : la page n'est pas universelle.
7. Chaque vue fait tourner toutes ses animations ; avec 4 vues ou plus, c'est le premier poste de coût à surveiller.

## 2. Principe de l'évolution (non destructive)

Un **pont** (`/synchroview/bridge.js`) que n'importe quelle page charge en une ligne. Hors cadre, il ne fait rien. Dans SynchroView, il dialogue par `postMessage`, donc il fonctionnera aussi entre domaines (Atlas, autres projets).

Protocole v1 :

| Sens | Message | Rôle |
|---|---|---|
| SynchroView → page | `hello` | demande les repères |
| SynchroView → page | `go {id, k}` | aller à la section `id`, à `k` (0–1) de sa hauteur |
| SynchroView → page | `by {dy}` | défiler une vue libre |
| page → SynchroView | `anchors {list, max, w, h}` | sections contiguës `{id, label, top, h}` |
| page → SynchroView | `at {id, k}` | la vue a été défilée à la main |

Repères : la page peut fournir `window.svAnchors()` (AIME le fait pour ses 13 temps de Naissance) ; sinon le pont prend `[data-sv]`, puis `section[id]`. Toute page devient comparable sans code spécifique dans SynchroView.

## 3. Les 8 évolutions demandées

| # | Évolution | Proposition | Statut |
|---|---|---|---|
| 1 | Scroll synchronisé + désynchro par vue | Bouton « Liée / Libre » sur chaque vue. Une vue libre défile seule à la molette ; la relier la recale sur les autres. En « Toucher », la vue qu'on défile devient le guide et les vues liées suivent. | **Prototype** |
| 2 | Sync par sections | Ligne de temps commune = suite de sections ; chaque vue va à la même section et à la même proportion dans cette section. Mesuré : entre iPhone (390) et écran large (1920), même section à 2–7 px près, alors que les pages ont des longueurs différentes. Repli au pourcentage si une vue n'a pas la section. | **Prototype** |
| 3 | Moi, Pro, Participant, Coordinateur | Axe « Les 4 modes » (un format, 4 modes). | **Prototype** |
| 4 | iPhone, iPad, ordinateur, écran large | 390×844, 820×1180, 1440×900, 1920×1080. Axe « Les 4 formats » (un mode, 4 formats). Les vues sont rechargées au changement de format : vraie mise en page, plus le défaut n° 1. | **Prototype** |
| 5 | Inspection des différences | Le pont renvoie, pour une section ou un élément pointé, les styles calculés (police, taille, graisse, couleurs, rayons, espacements, boîte). SynchroView affiche un tableau « même élément × vues » et surligne ce qui diffère. Second niveau : inventaire des jetons de chaque vue (couleurs et polices réellement utilisées) pour repérer les écarts au design system. Message prévu : `inspect {selector}` → `styles {…}`. | Conçu |
| 6 | Atlas AIME | « Capturer » un fragment = `{source, commit, mode, format, section, sélecteur, html, styles, capture image, date}`. La provenance est gardée en entier pour retrouver d'où vient chaque fragment. Envoi vers l'Atlas quand son API existera ; d'ici là, export JSON. | Conçu |
| 7 | AIME ORB | L'orbe devient le pointeur de SynchroView. Elle sélectionne un élément dans une vue, puis le surligne dans toutes les vues via le même sélecteur. Son radial : Comparer, Capturer (Atlas), Proposer une correction. | Conçu |
| 8 | Modification commune prévisualisée | Une correction (CSS d'abord, puis texte) est diffusée à toutes les vues par `patch {css}` et injectée dans un `<style data-sv-patch>` temporaire. Rien n'est écrit dans les sources. « Confirmer » produit un correctif (diff) à valider puis à commiter sur une branche ; « Annuler » retire le style. | Conçu |

## 4. Ce qui est préservé
- `/tout/` est inchangée. SynchroView est une page à part, avec la même grille, la même molette et les mêmes gestes.
- Grille automatique : le nombre de colonnes est choisi pour que les vues soient les plus grandes possible, quel que soit le format.
- Le lien partagé rouvre la même comparaison à la même section (`?axis=formats&mode=pro&at=story2`).

## 5. Phases proposées
1. **Phase 1 (cette branche)** : pont, sync par sections, Liée/Libre, Toucher bidirectionnel, 4 formats, axe modes/formats, lien partageable, touches `j`/`k` pour passer d'une section à l'autre.
2. **Phase 2** : inspection des styles (n° 5), avec mise en pause des animations des vues inactives pour tenir la fluidité au-delà de 4 vues.
3. **Phase 3** : correction prévisualisée (n° 8), qui produit un diff sans écrire dans les sources.
4. **Phase 4** : Atlas (n° 6) et AIME ORB comme pointeur de SynchroView (n° 7).

## 6. Fichiers touchés sur la branche
- `synchroview/index.html` — nouvelle page.
- `synchroview/bridge.js` — le pont universel.
- `index.html` — ajoute `window.svAnchors` et le chargement du pont, juste avant `</body>`. Aucun autre changement ; hors cadre, le pont ne fait rien.
- `docs/SYNCHROVIEW.md` — ce document.
