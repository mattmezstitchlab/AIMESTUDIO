# Tickets et supports — cinq objets, moteurs existants

Expérimentation sur `arena/2d4424b5-aimestudio`, sans bascule de branche, modification de production ou migration massive. La branche Arena est fixe. Les douze verticalités et leurs jeux de données sont conservés.

## Audit effectué avant raccord

| Source | Constat vérifié | Portée |
|---|---|---|
| `studio/index.html`, FL + extensions + CAT0 | **154 formats**, dont **147 hors Web**, **10 familles**, aucun identifiant dupliqué | Le repère historique 96 / 92 n’est plus le compte du code actuel. Aucun format supprimé pour revenir à ce chiffre. |
| TICKETAIME, commit `43ebb52d13572fa76cb149217c083882cc971e55` | **168 modèles**, **19 catégories**, aucun identifiant dupliqué | Catalogue TSX rapproché de `public/atlas-modules.json`. Métadonnées conservées : source, composant, champs éditables, actions et dimensions de dessin. |

Les dimensions identiques sont regroupées dans `catalogue.json`, **pas dédupliquées** : une carte de remerciement et un faire-part peuvent avoir la même taille sans être le même objet. Les catégories Studio restent Web, Impression, Événement, Papeterie, Réseaux, Documents, Série, Badges, Signalétique, Immobilier. Les modèles administratifs, billets de banque, sceaux, etc. restent des références graphiques : aucune valeur officielle.

Reproduire : `node scripts/audit-supports.cjs /chemin/du/checkout/ticketaime` (racine contenant `public/atlas-modules.json`). L’archive de référence n’est pas incorporée au dépôt. Aucune création locale historique n’est importée.

### Parcours et moteurs audités

- TICKETAIME : `src/data/catalogue.tsx`, `components/tickets/Show.tsx`, primitives/lib, `Catalogue`, `Landing`, `Atelier`, `StudioCanvas`, `EditionOverlay`, `Inspector`, `WalletView`, `WalletSheet`, `ModuleView` et atlas. Le parcours public, la composition, les collections et le wallet originaux ne sont pas réécrits. `?module=opera` est un aperçu isolé, **pas** une interface de transfert vérifiée. Aucune URL publique d’atelier ni persistance inter-application garantie.
- Studio : `docs/STUDIO.md`, `docs/SITES.md`, FL et ses extensions, `verticale/supports.js`. L’intégration utilise réellement `newProject('vierge')`, `miniOf`, `htmlFor`, la dérivation et les styles d’origine. Aucun second éditeur de supports.
- Publication : `vitrine/rendu.js`, `publication/planche.js`, `publication/gabarits.js`, `canevas/adaptateurs/publication.js`. Le carnet est composé par `AIMEPublication` et rendu par `AIMESite.document`, puis ouvert dans l’adaptateur Publication du Canevas existant.

## Cinq raccords seulement

| Projet → moment canonique | Objet | Moteur / atelier | Dimensions originales |
|---|---|---|---|
| mariage → `day-ceremony-welcome` | invitation | Studio `card` → Studio existant | 127 × 178 mm |
| spectacle → `spectacle-p07-1` | billet spécimen | composant **OperaTicket original** → atelier non raccordé | dessin 640 × 250 px, pas une taille papier certifiée |
| séminaire → `seminaire-p03-1` | badge | Studio `badge` → Studio existant | 90 × 120 mm |
| formation → `formation-p05-1` | programme | Studio `progfo` → Studio existant | 210 × 297 mm |
| création → `creation-p08-1` | publication | Publication `page-texte` → Canevas | grille 12 × 16, aucune taille papier garantie |

Le bouton **+** du dock et l’entrée **Créations & supports liés** dans les fiches donnent accès au catalogue. On recherche nom/usage, famille, dimensions, bibliothèque et périmètre de domaine ; douze cartes maximum par page. Par défaut, seuls les pilotes autorisés du projet courant sont présentés. « Transversal » montre le référentiel de métadonnées, sans prétendre que 322 modèles sont déjà raccordés. Les options moment/personne/document/action non implémentées sont explicitement désactivées. Le média personnel renvoie au panneau existant, séparé des droits projet.

## Références, versions et changements

`objects.json` contient les liens, pas une copie définitive de la date, du lieu ou du titre. `/api/sv/supports` résout les champs **après autorisation** : projet et moment, titre, date réellement renseignée, lieu et phase. Aucune date n’est inventée pour les gabarits symboliques. Aucune personne réelle n’est ajoutée à un billet ou badge.

Chaque réponse porte les références de champs et une empreinte `sourceRevision`. Association et historique sont locaux, dans `aime-union-supports-v1` : ce n’est pas un nouveau stockage serveur. **Figer** ajoute une version de données, conserve les précédentes et permet leur consultation dans l’aperçu. Si la source change, son empreinte diffère et le support indique « source à actualiser ». Les propositions de date listent les objets autorisés concernés, sans mutation du calendrier ni republication. Les versions figées ne sont jamais réécrites par ces propositions.

Une version figée est un instantané de données/composition, **pas une archive graphique indépendante du moteur, un BAT validé, un PDF signé ou une preuve légale**. Aucun service de synchronisation automatique entre des onglets d’ateliers n’est annoncé.

### Préservation des créations

- L’aperçu Studio charge une **copie éphémère** du document original dans une iframe. Le pont est inséré à une frontière explicite de portée, vérifiée ; si cette frontière change, il échoue clairement. Son `localStorage` est un stockage mémoire propre à l’iframe : le démarrage/migration du Studio original ne touche pas aux projets du navigateur. Tous les champs fictifs par défaut sont vidés avant la précomposition. Les scripts CDN ne sont pas nécessaires à cet aperçu.
- **Ouvrir dans Studio** est un geste explicite : ajout d’un nouveau projet unique à `echos:v2`, sans remplacer le projet courant historique ni ses créations, puis ouverture `#open.<id>.<format>`. Le projet emporte `unionReferences` et la révision. Des droits d’édition sont revérifiés avant le geste. Un stockage de schéma inconnu ou JSON invalide bloque le transfert au lieu de l’écraser.
- **Ouvrir dans Canevas** ajoute un nouvel identifiant dans `aime-sites.sites`, conserve les autres propriétés et sites, puis utilise `?publication=<id>`. Aucune publication en ligne automatique.
- Les clés et données locales du dépôt TICKETAIME original ne sont jamais lues ni écrites. Le seul composant graphique nécessaire est copié sans modification ; provenance, runtime React et limites de licence sont documentés dans `ticketaime/PROVENANCE.md`.

## Permissions : simulation clairement séparée du privé

La route réutilise **`synchroview/permissions.js`**, les perspectives et projections de `union/server/demo.cjs` : il faut à la fois lire le moment lié et disposer du droit document explicite. Les droits métier ne remplacent jamais une adhésion/grant. Les opérations de composition exigent l’édition ; un invité peut lire le pilote explicitement partagé mais pas le figer ni l’envoyer à l’atelier. Un objet d’un autre projet est refusé. La réouverture et chaque opération sont revérifiées côté serveur ; la bascule de perspective ferme les aperçus.

**Toutes les données de ce pilote sont fictives et publiques.** Le mode authentifié est refusé. Les accès réels (invité à son billet, musicien à son conducteur, imprimeur aux seuls fichiers transmis, propriétaire aux supports gérés) doivent être raccordés aux sessions/membres/grants/durées et fichiers existants avant toute donnée privée. Aucun faux rôle imprimeur n’est ajouté pour annoncer ce raccord comme terminé. Aucun QR décoratif ne contrôle l’accès.

Le Studio existant peut proposer ses exports habituels, mais ceux-ci n’ont pas été recertifiés ici. L’inventaire décrit les dimensions et les 3 mm de fond perdu prévus par le code Studio ; **aucune conformité imprimeur/PDF, émission de billet, signature, certification ou validité juridique n’est garantie**.

## Vérifications exécutées

- `node --test tests/supports.test.cjs` : **10 réussis**, comptes/IDs, cinq références de moments, séparation projets, refus mode authentifié, droit document + droit moment, lecture invitée sans écriture, proposition sans mutation.
- `scripts/test-supports-browser.cjs` : **cinq aperçus réels**, trois transferts Studio et un Canevas avec références conservées, sentinelles de créations historiques intactes, stockage isolé durant les aperçus, gel local avec conservation de plusieurs versions et consultation historique, proposition de date sans republication, recherche/pagination mobile et lecture invitée sans gestes d’écriture. **Zéro erreur JavaScript** sur ce parcours.
- Régression `scripts/test-worlds-browser.cjs` : **12 univers desktop et 5 mobiles** passent après raccord. `scripts/test-journey-browser.cjs` : dix actes, ordre, dock/header, panorama, graduation et réduction de mouvement passent.
- `npm run build` : **37 tests réussis** (27 Union + 10 Supports). Régression élargie permissions / Temps / comptes / Publication / conservation / contact : **240 réussis, 13 ignorés, 0 échec**. Les tests contre une base authentifiée et l’édition externe TICKETAIME restent non effectués.
