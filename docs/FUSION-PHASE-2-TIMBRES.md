# Phase 2 — premier adaptateur Studio Timbre

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
