# AIME Studio : fusion par étapes

## Étape 1 : faite (21/10/2026)

- **Un seul fichier.** `studio/index.html` sert le Studio et ses six ateliers : `/web/`, `/docs/`, `/buro/`, `/image/`, `/accessibilite/`, `/stitchlab/`.
  - `vercel.json` réécrit chaque adresse vers `/studio/`.
  - Une ligne en tête du Studio lit l'atelier dans l'adresse (`location.pathname` → `window.AIME_ATELIER`).
  - Les six copies identiques sont retirées : environ 6 Mo de moins. Une correction du Studio vaut désormais pour tous les ateliers.
- **Adresses et données inchangées.** Le Studio ne charge aucune ressource relative : son emplacement ne change rien.
- **Vérifié sur la preview.** Les huit adresses répondent 200. `/stitchlab/` ouvre bien le mode broderie (titre « Stitchlab · Le monde AIME »), et `/docs/BUREAU.md` reste servi.
- **Garde-fou.** `tests/bureau.test.cjs` échoue si une copie revient ou si une réécriture manque.
- **À savoir pour l'autre session.** `main` modifiait encore ces copies. Lors d'une fusion de `main` vers `integration`, garder le `studio/index.html` de `main` et ne pas recréer les copies.

## Étape 2 : audit (rien n'est modifié)

Le Studio fait 5 523 lignes. Pour chaque capacité, la question est : existe-t-elle ailleurs, et doit-elle remonter dans le moteur partagé ou rester dans l'éditeur ?

### Remonter dans le moteur partagé (données ou logique pure, utiles à plusieurs pages)

| Capacité | Dans le Studio | Où ailleurs aujourd'hui |
|---|---|---|
| `themeVars` : marque → variables CSS, avec contrôle du contraste | l. 1466, `normB`, `mix`, `CR`, `best` l. 940-943 | Nulle part : **à faire en premier** |
| Ambiances (36), motifs, préréglages | `AMBS` l. 1125-1161 | `vitrine/presentation/ambiances.json` n'en copie que 9 : le JSON doit devenir la source unique, avec les 36 |
| Polices (10) | `FONTS` l. 1116, `WEBF` | En partie dans `ambiances.json` |
| Packs d'univers : libellés, phases, exemples | `PACKS` l. 1170-1401, environ 53 ko | `vitrine/donnees` et `perspectives` (mariage et séminaire seulement) |
| Catalogue de formats (environ 113) | `FL` l. 948-1106 | Aucun |
| Générateur de site multipage | `siteDoc`, `webBlocks0`, `sitePlan`, `WEB_CSS` l. 1576-1713 | Le constructeur « Votre site » de `/aime/` fait doublon partiel ; `vitrine/rendu.js` |
| QR, ICS, Factur-X | `QR` l. 1487, `ics*`, `facturX` l. 4812-4845 | `v1/` (QR) |
| Accessibilité : `siteA11y`, `a11yScan`, braille | l. 1823-1885, l. 4847 | Aucun |
| Lecture des événements AIME | `aimeEvents` l. 3744 | `bureau/sources.js` : une seule lecture commune |
| Rôles fictifs `OS_D` | l. 5223-5329 | `vitrine/perspectives` (même idée, autres données) |
| Registre des verbes et contrat de commandes | `VM`, `VCAP`, `CMDS` l. 4157-4288 | `docs/verbes.md` (spécification seulement) |
| Parseur de documents (markdown → pages) | `dkParse` l. 1738 | Aucun |

### Doublons à supprimer côté Studio
- **Le moteur de broderie de Stitchlab** : `DMC_RAW` (13 ko) et les fonctions `pz*`, soit environ 53 ko, l. 2715-2834. AIME Stitch a son propre moteur, plus complet (`stitch/data/dmc.json`, `stitch/js/conversion.js`, `symboles.js`, `pdf.js`). Le Studio doit l'appeler. L'éditeur `br*` reste dans le Studio.
- **jsPDF** : le Studio charge la 2.5.1, G44 vendorise la 4.2.1. Il faut aligner les versions.

### Garder dans le Studio (comportement d'éditeur)
- Les gabarits `TPL` : 90 ko, liés à `P`, `LOGO` et `QR`.
- Le mode Image, l'éditeur broderie, l'apprentissage, l'atlas, la mosaïque, l'accueil et Web Studio.
- Annuler / rétablir.
- L'interface des badgeuses et des avis. Leurs pages générées et le format de leurs lignes peuvent remonter.

### À arbitrer
- **Les « cartes universelles » du Studio** (`uni*`, l. 4976-5091, clés `aime:uni`, `aime:cards`) et **`carte/`** : deux modèles de carte. Avec « Votre carte » de `/aime/`, cela en fait trois. Il en faut une seule.
- **La sauvegarde distante du Studio** (`window.claude.use('db')`) ne fonctionne que dans un artefact Claude. Sur le site, elle ne fait rien.

### Clés du navigateur écrites par le Studio
- **Projets et médias.** `echos:v2` (projets : `{id, name, pack, formats, versions[{d, b, lay}], brod, updated…}`). `echos:photo*:<id>`, `echos:logo:<id>` (data-URL). `echos:styles`, `echos:boards`.
- **Badgeuses et avis.** `aime:pointage` (3 000 lignes au plus), `aime:bdgctx`, `aime:avis` (2 000 au plus).
- **Cartes universelles.** `aime:uni`, `aime:unilinks`, `aime:cards`.
- **Navigation et préférences.** `aime:back`, `aime:learn`, `aime:fg`, `aime:pd`.
- **Clés d'autres modules que le Studio modifie.** Il ajoute `cur` dans `aime-app` et écrit `aime-mode`.

Toutes ces clés sont incluses dans la sauvegarde du Bureau.

### Étape 3 : faite (21/10/2026), Stitchlab sur le moteur d'AIME Stitch
- **« Aplats nets » passe par AIME Stitch.** Dans Stitchlab, ce mode appelle `StitchConversion.convertir` (`stitch/js/conversion.js` et `couleur.js`, chargés par le Studio). Le moteur regroupe les couleurs en CIELAB, prend le fil DMC le plus proche (CIEDE2000), retire la toile et nettoie les points isolés et les petites régions en protégeant les détails.
  - L'ancien calcul « aplats » du Studio ne sert plus qu'en secours, si le moteur n'est pas chargé.
- **« Réaliste (dégradés) » garde le tramage du Studio**, qu'AIME Stitch ne propose pas.
- **Fils DMC.** Les 489 fils de `DMC_RAW` sont identiques à `stitch/data/dmc.json` : mêmes codes, mêmes noms, mêmes couleurs, même ordre. `tests/stitch-studio.test.cjs` le garantit, et aucune référence n'a été modifiée.
  - `DMC_RAW` reste dans le Studio, parce que le Studio a besoin des fils sans attendre de chargement. La référence est désormais `dmc.json`.
- **Vérifié dans un navigateur.** Un disque en dégradé sur fond blanc donne 5 fils DMC ; le fond blanc est reconnu comme toile non brodée. Calcul en 93 ms, sans erreur. Un point d'accès de test, `window.AIMEStitchlab.parStitch`, permet de le rejouer.

### Ordre proposé (une PR par ligne, chacune vérifiable)
1. `themeVars` et les 36 ambiances dans le moteur. Le Studio lit `ambiances.json`.
2. Les packs d'univers et le catalogue de formats en JSON, lus par le Studio.
3. ~~Stitchlab utilise le moteur d'AIME Stitch~~ : la conversion est faite (voir plus haut). Restent le PDF de Stitch (`stitch/js/pdf.js`) et la suppression de `DMC_RAW`, une fois que le Studio pourra charger les fils avant d'en avoir besoin.
4. Le générateur de site. **On ne touche pas** au constructeur de mini-site de la landing. On construit à part un générateur complet, sur le même mécanisme que les autres (le moteur partagé : données, modèles, présentation, perspectives), en reprenant tout ce que `siteDoc` sait faire.
5. Les trois cartes : une page du Lab les montre côte à côte (`/lab/cartes/`). On décidera plus tard laquelle garder.
