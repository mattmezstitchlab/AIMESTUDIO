# Phase 2 — premier adaptateur Studio Timbre

## Vérification du code réel — correction de périmètre

La lecture de `studio/index.html` sur `main` révèle **une seule occurrence textuelle du mot « Timbre »**, dans une représentation visuelle de carte, et un gabarit `std` nommé « Carte postale ». Les objets Studio `echos:v2` utilisent notamment `projects[]`, `formats`, `versions`, `pack`; **aucune preuve qu'un projet Studio possède `type:'timbre'` n'a été trouvée**. L'adaptateur ci-joint est donc un **contrat d'essai isolé**, pas un adaptateur prouvé pour les timbres actuels.

En revanche, le Timbre d'identité réel provient de `compte/timbre.js`, `api/identite.mjs` et de la session utilisateur. Il est utilisé avec `porte/`, `cube/` et `/aime/`. Il **ne doit jamais être assimilé à un projet Studio**, copié dans `echos:v2`, ou rendu public depuis une projection générique. Vérification nécessaire des autorisations et consentements.

**Conséquence : ne pas raccorder cet adaptateur au site ou au compte.** Prochaine action : établir le contrat du Timbre d'identité depuis les API existantes, puis décider si des Timbres décoratifs éditables existent réellement dans le Studio. La Carte Postale n'est plus un chantier produit ; ses données historiques ne sont pas supprimées.

## Livré
- `adaptateurs/studio-timbre.js` : lecture de `echos:v2` depuis une interface `getItem`, sans écriture, sans navigation, sans migration.
- Contrat d'échange `aime-projet` v1 avec provenance du module Studio, identifiant original et marqueur `lectureSeule`.
- `tests/studio-timbre-adapter.test.cjs` : classification explicite, non-mutation, erreurs de données historiques.

## Limite volontaire
La forme réelle de tous les projets historiques Studio n'a pas encore été validée. **L'adaptateur ne considère comme Timbre que les projets avec `type` ou `format` égal à `timbre`, ou un support typé Timbre.** Il peut donc manquer d'anciens timbres dont le type est encodé différemment. Cela est préférable à la modification ou classification arbitraire de créations. Aucune image, palette, page, document, média ou relation n'est inventé ni copié dans le contrat.

## À valider avant raccordement d'interface
1. Obtenir un jeu de fixtures anonymisées de vrais projets Studio Timbre (anciens et actuels).
2. Rechercher les schémas historiques dans le code de sauvegarde et les exports.
3. Valider la conversion des métadonnées et références média sans recopier le binaire.
4. Ajouter un visualiseur d'inspection **en lecture seule** avant édition bidirectionnelle.
5. Vérifier la CI et les parcours iPhone, navigateur vierge et stockage corrompu.

## Invariants
Page Zéro → Monde AIME inchangé ; aucun retour au Bureau comme page centrale. Carte Postale exclue du développement, autres contenus historiques conservés. `main`, Neon, IndexedDB, régie, Canevas, Studio, Timbres et routes ne sont pas modifiés par cette phase.
