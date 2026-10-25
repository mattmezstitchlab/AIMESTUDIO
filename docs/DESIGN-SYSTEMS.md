# Design Systems : démonstration dans le Canevas

**Une direction artistique en un clic. Le contenu reste identique, seule la présentation change.**

Cette démonstration est limitée à un mini-site du Point Zéro, ouvert dans le Canevas, avec les quatre directions venues d'Arena. Aucune application React n'est intégrée. Le rendu reste celui du moteur de pages (`vitrine/rendu.js`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `design/systemes.js` (`AIMEDesign`, UMD pur) | Valide un système, le traduit pour le moteur de pages, gère le pointeur (appliquer, annuler, restaurer) et calcule l'empreinte du contenu. |
| `design/charger.js` (`AIMEDesignCharger`) | Charge et valide le catalogue dans le navigateur. En cas d'échec, renvoie un catalogue vide : l'ambiance d'origine reste. |
| `design/catalogue/*.json` | Les quatre directions au format `aime-design-system` 3.0 : `aime-original`, `aime-minimal`, `aime-editorial`, `aime-pro`. |
| `vitrine/rendu.js` | Lit `presentation.design` seulement si l'appelant fournit `P.systemes`. Une garde vérifie les couleurs et les polices avant d'écrire la feuille de style. Les rayons sont appliqués par contexte. |
| `canevas/adaptateurs/site.js`, `.css` | Bouton « Design System » sur la page et action du même nom dans l'inspecteur. Le panneau propose les directions, la comparaison avant / après, l'annulation et la restauration. |
| `projet/projet.js` | L'aperçu du projet affiche le même Design System. |

## Ce qui est enregistré

Dans le mini-site (`aime-sites`, sur l'appareil), et seulement après « Enregistrer » :

```json
"presentation": {
  "ambiance": "editorial",
  "design": { "id": "aime-editorial", "revision": "1.0.0" },
  "historique": [ { "design": null } ]
}
```

- **L'ambiance d'origine n'est jamais effacée.** « Revenir à l'apparence d'origine » remet `design` à `null`.
- **L'historique** garde les 20 derniers pointeurs. « Annuler le changement » remonte d'un cran, et une restauration s'annule elle aussi.
- **Pages, sections, listes, infos et médias ne sont jamais touchés.** Avant d'accepter un changement, le Canevas compare l'empreinte du contenu (`AIMEDesign.empreinte`). Si elle diffère, le changement est refusé.

## Validation : six règles

1. **Format et version.** Le format doit être `aime-design-system`, en version majeure 3. Une version majeure future ou ancienne est refusée.
2. **Identité.** L'identifiant est stable (`a-z0-9-`), la révision est de la forme `1.0.0`, et le mode vaut `clair` ou `sombre`.
3. **Types.**
   - Une couleur s'écrit exactement `#RRGGBB`. Une valeur comme `red;}body{…`, `url(…)`, `var(…)` ou `#FFF` est refusée. Une couleur ne peut donc jamais injecter de CSS.
   - Une police est un identifiant du registre `POLICES`. La pile CSS et l'adresse Google Fonts viennent du registre, jamais du fichier.
4. **Bornes selon le contexte.** Une valeur hors bornes est ramenée dans les bornes et signalée.

   | Propriété | Bornes |
   |---|---|
   | Rayon des surfaces (sections, cartes) | 0 à 32 px |
   | Rayon des contrôles (boutons, champs) | 0 à 24 px |
   | Rayon des médias (images, vidéos, plans) | 0 à 40 px |
   | Rayon des pastilles et avatars | 0 à 999 px |
   | Graisse des titres | 300 à 900 |
   | Interligne des titres | 0,85 à 1,4 |
   | Interligne du texte | 1,3 à 1,9 |
   | Approche | -0,06 à 0,12 em |

   Le moteur re-borne aussi les rayons au moment du rendu.
5. **Complétude.** Ce qui manque est repris du système de base du **même** mode : Minimal Clair pour un système clair, Original Iris pour un système sombre. Un système incomplet sans base est refusé.
6. **Contraste.** Les paires suivantes doivent atteindre le niveau AA (4,5:1) :
   - texte sur fond ;
   - texte sur surface ;
   - texte doux sur fond ;
   - couleur principale sur fond.

   La paire texte sur « relief » (fonds d'avatars, bandes, dégradés) doit atteindre 3:1. Sous ces seuils, le système est refusé.

Le contrôle de contraste a trouvé un vrai défaut dans Pro Atelier : le texte clair posé sur le cyan secondaire n'atteint que 2,18:1. Le format 3.0 sépare donc deux couleurs :
- la **secondaire**, qui reste celle d'Arena ;
- le **relief**, qu'utilise le moteur pour les fonds (`--c2`).

Pour Pro Atelier, le relief est `#1C6E80`, qui atteint 5,27:1.

## Tests

- **`tests/design.test.cjs`** (17 tests) :
  - catalogue ;
  - injection par une couleur ou une police ;
  - bornes des rayons ;
  - versions ;
  - complétion par le même mode ;
  - contraste ;
  - import ;
  - empreinte identique dans les quatre directions ;
  - annuler et restaurer ;
  - rendu identique sans pointeur ;
  - retour à l'ambiance pour un identifiant inconnu ;
  - garde du moteur contre un système altéré ;
  - mini-site vide ;
  - le Point Zéro garde le Design System quand il rafraîchit le contenu ;
  - la Régie ne charge aucun Design System.
- **`tests/navigateur/parcours.cjs`** suit le parcours : Point Zéro → Canevas → Éditorial → Annuler → Éditorial → Enregistrer. Il vérifie ensuite que l'aperçu du projet montre le même Design System.
- **Contrôle manuel**, sur ordinateur (1440 px) et téléphone (390 px) :
  - clavier : flèches dans la liste, Échap, focus rendu au bouton ;
  - axe-core sur le panneau et la comparaison ;
  - aucune erreur JavaScript.

## Hors de cette démonstration

- les planches ;
- l'import d'un fichier venu d'Arena dans l'interface (`AIMEDesign.importer` existe et il est testé, mais il n'a pas encore d'écran) ;
- le gel de plusieurs révisions d'un même système (une seule révision existe, la 1.0.0) ;
- les autres réalisations (Cube, sites de l'ancien générateur) ;
- la Régie, qui garde ses ambiances.

## 25/10/2026 (soir) — décisions de Matt sur l'accueil

- **Plus de fond en couleur derrière l'écran du héros** : l'écran est blanc, c'est le cadre noir qui le tient. La couleur d'une place passe désormais dans le **fond** des sept téléphones (teinte douce calculée depuis `coeur/roles.js`), plus dans un **liseré**.
- **Les boutons principaux sont noirs** (`#111114`, survol `#000000`) : le bleu-violet `#4C28E8` ne va pas. `--accent` vaut donc `#111114` ; la seule couleur reste l'orbe et le + irisé. Les états choisis passent au gris (`#F4F4F8`) avec un filet noir.
- **Plus de vidéos de présentation** : la section « Le film » et son lecteur sont retirés, les mp4/jpg/vtt aussi. La page s'allège ; la démonstration suffit.
- **Le pied de page est refait** : la marque et l'orbe, « Un projet. Chacun son écran. », deux colonnes (Le produit · Informations légales), une ligne du bas (AIME® · 2026, « Réduire les animations »). Le `nav.pied-legal` garde ses quatre liens dans l'ordre pour `tests/pages-legales.test.cjs`.

