# AIME Réseau — Direction artistique illustrée et consignes d'intégration
> Document de référence non exécutable · 22 octobre 2026 · aucun changement de la Régie maîtresse ni de la PR #36.

## Pourquoi ce document
Les trois images présentées dans la proposition « Le réseau vivant » étaient des **illustrations recherchées dynamiquement dans ChatGPT**, et **non des fichiers déjà présents dans AIMESTUDIO**. Pour les retrouver de façon reproductible dans le projet, voici les **directions, références visuelles et requêtes de recherche à conserver**. Ne pas prétendre qu'il s'agit de médias sous licence AIME ; **ne pas copier les photos d'autres sites sans licence ni attribution appropriée**. Reconstituer la sélection à partir de Pexels, dont l'intégration existe déjà dans WORLDWEDDING.

## Trois visuels majeurs du héros tournant

### Slide 01 — « Bienvenue dans le Monde AIME »
**Direction :** galerie minimaliste blanche, installations de sphères de verre transparentes et colorées, lumière douce, couleur cyan / violet / corail, sensation haut de gamme et contemplative. Ce visuel communique le lien entre les individus (orbes) sans représenter une interface fictive.

**Requête source de la maquette précédente :**
`modern minimal luminous art installation colorful translucent glass spheres exhibition white gallery`

**Inspiration externe (pour référence uniquement, droits non vérifiés) :**
https://newatlas.com/architecture/floating-glass-museum-environment-sustainability/

**Texte du slide :** « Bienvenue dans le Monde AIME » / « Découvrez ce qui se crée, se partage et se construit. »

### Slide 02 — « Le Point Zéro »
**Direction :** espace/studio de création moderne, écrans avec compositions graphiques et grilles colorées, bureau sobre ; ne pas suggérer qu'une interface générique est la vraie UI AIME. À terme, privilégier **une vraie capture ou un rendu du canevas AIME**, plutôt que du stock.

**Requête source :**
`beautiful modern digital creative studio desk large screen design grid colorful abstract artwork`

**Inspiration externe (pour référence uniquement) :**
https://innoupdates.com/innovation/ai-digital-art-creation/

**Texte :** « Le Point Zéro » / « Une intention devient un projet. »

### Slide 03 — « Bientôt dans AIME »
**Direction :** installation immersive sombre, constellation lumineuse de points reliés, réseau spatial, lumière cyan et bleue ; évoquer les relations entre orbes et les cubes-personnes, **sans annoncer une fonctionnalité future comme déjà disponible**.

**Requête source :**
`modern interactive digital exhibition technology connecting people luminous dots network immersive`

**Inspiration externe (pour référence uniquement) :**
https://www.instituteforpublicart.org/case-studies/whiteout/

**Texte :** « Bientôt dans AIME » / « Le cube-personne, les Régies personnelles et les futurs studios. »

## Composition de page souhaitée
1. **Grand héros de 3 à 5 slides**, ratio 16:9 ou largeur immersive, avec typographie lisible, voile de contraste subtil seulement si nécessaire, navigation au clavier et pause en mouvement réduit.
2. **Composer une publication** : timbre de l'auteur, saisie courte, choix du type.
3. **Filtres du réseau** : Tout · Actualités · Entraide · Idées · Créations · Recherches · Prestataires · Problèmes.
4. **Flux** : cartes peu chargées, grande image pour les réalisations, statuts précis pour les bugs et idées, actions contextuelles (commenter, soutenir, relier).
5. **Palette AIME** : cyan, violet, corail, doux dégradés lumineux, fonds qui n'écrasent pas les médias. Réemployer tokens et composants existants, ne pas inventer une nouvelle charte.

## Données et médias : comportement attendu
- Réutiliser le carrousel et les blocs d'AIME Studio / Régie : **pas de nouveau builder**.
- Chercher les visuels autorisés avec **l'API Pexels côté serveur**, via `PEXELS_API_KEY` ; clés uniquement en environnement Vercel.
- Stocker pour chaque visuel : source, URL, photographe, URL photographe, licence/contexte d'utilisation, rôle « illustration », texte alternatif.
- Sélection manuelle par la Régie maîtresse pour les visuels éditoriaux du héros ; ne pas faire tourner automatiquement des images de résultats aléatoires en production.
- Ne pas attribuer à Pexels les images exemples ci-dessus sans vérification. Elles sont des **références**. Ne pas publier des médias protégés copiés de ces sites.
- En l'absence de Pexels configuré, conserver de **vraies compositions AIME** et des aplats/dégradés soignés, sans image cassée.
- Actualités « disponibles » et « à venir » séparées ; aucune promesse de disponibilité non vérifiée.
- Publication de projets / photos personnelles uniquement après autorisation explicite et validation du rendu public.

## Articulation avec la suite du développement
**Ne pas toucher à la PR #36, au lot B ou à la Régie maîtresse.** Ce document est une référence pour un futur lot « Réseau AIME ». Demander d'abord un audit des carrousels/rendus existants et un schéma de données (posts, catégories, signalements, modération, permissions) puis une petite PR indépendante.

## Instruction courte à l'agent
> « Réfère-toi à `docs/RESEAU-REFERENCES-VISUELLES.md` : je souhaite cette direction éditoriale précise, inspirée des trois visuels que nous avons appréciés (sphères de verre, studio créatif coloré, réseau de points lumineux). Utilise des médias dont l'usage est autorisé, idéalement via notre proxy Pexels existant et une sélection éditoriale, et réutilise notre carrousel AIME. Ne touche pas à la Régie maîtresse ni à la PR #36. »
