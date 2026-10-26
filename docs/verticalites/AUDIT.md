# Audit préalable — Verticalités et dossiers du Canevas

Audit du 26 octobre 2026, avant modification du code. Aucun merge effectué.

## Références réellement consultées

- `origin/main`: `678fa89`, accueil historique, Studio autonome, Canevas et adaptateurs existants.
- PR #153, ouverte, branche `arena/2d4424b5-aimestudio`, tête distante `849da08537cf2f54ffa13123af790f5e59d7c73a` : Fenêtre, lecteur douze univers, cinq supports pilotes, navigation unifiée. Le checkout initial est encore sur `678fa89` avec les modifications antérieures non commitées : **ne pas pousser cet état en remplacement de la tête distante**.
- PR #154 : **déjà fusionnée** dans #153 par une intervention antérieure ; store OpenAIME, capsules médias/contact, identité, galerie. Portage initial non attesté comme production-validé. Aucun nouveau merge ici.
- PR #155 : ouverte, base #153, feuille `fenetre/lisibilite.css` et chargement associé ; pas importée ici.
- Contrôles #153 observés : suites Node, socle/base, navigateur, accessibilité et Vercel réussis ; **Parcours Temps navigateur/base en échec**. Aucun résultat global vert revendiqué.

## Inventaire

| Élément | Code existant / stockage | État observé | Réutilisation / limite |
|---|---|---|---|
| Scène universelle | `canevas/scene.js` | Opérationnel, logique pure et tests | Réutiliser conversions, déplacement, zoom au pointeur, cadrage. Ne pas recopier ces calculs. |
| Plan interactif | `canevas/plan.js` | Opérationnel : calques, sélection d'éléments métier, notes, grilles | Son modèle ne représente pas un ensemble général de rectangles indépendants avec historique. Extension de dossier et rendu DOM nécessaires, sans remplacer ce plan. |
| Adaptateurs | `canevas/adaptateurs/{broderie,cube,maitre,site,publication}.js` | Code exécutable ; maître en lecture seule | Ouvrir leurs routes existantes ; pas de nouvel éditeur métier. |
| Publication | `publication/{coeur-magazine,planche,gabarits}.js`, `canevas/?publication=…` | Composition et export locaux existants | Les publications restent dans leur stockage d'origine `aime-sites`. Pas d'hébergement implicite. |
| Mini-sites | `sites/`, adaptateur `site` | Éditeur local existant | Lien fonctionnel ; pas de copie du projet dans le dossier. |
| Studio | `studio/index.html` | Éditeur autonome : supports, image, Stitchlab, Web, Docs, Buro, accessibilité | `echos:v2`, `echos:styles`, autres clés historiques ; conserve les ponts hash AIME. Les services dépendant de l'artifact ne fonctionnent pas en autonome. |
| Timbre | `adaptateurs/studio-timbre.js` | **Projection lecture seule** de projets explicitement typés timbre depuis `echos:v2` | Aucun mini-studio Timbre autonome identifié dans ce checkout : phase 2 bloquée par ce raccord, pas de bouton « modifier le timbre » mensonger. |
| Carte et identité | `carte/carte.js`, `api/{carte,carte-publique,identite}.mjs` | Modèles et API réels, tests ; backend nécessaire | Consentement explicite, projection publique distincte. Ne pas lire ni copier la Carte privée dans un dossier. |
| Temps / permissions | `modules/registre.js`, `modules/temps/`, `synchroview/permissions.js`, `api/_auth/` | Registre distingue opérationnel/composant/documenté ; contrôles serveur existants | Le catalogue visuel référence ce registre, ne déclare aucun nouveau droit. |
| Compte | Better Auth/passkey, Neon/PostgreSQL, membres/espaces/invitations | Serveur réel et tests conditionnels à la DB | Aucun nouvel utilisateur/session ni table ajoutée. Les API de compte ne fonctionnent pas sur le serveur statique sans configuration de test. |
| Fenêtre / récit | PR #153, `fenetre/`, `union/` | Interface et fixtures ; moteurs de compte intégrés | Le récit symbolique n'est pas une preuve d'événements réels ; accès d'origine conservés. |
| Store / contact / médias | PR #154 | Code existant dans la branche distante ; contact utilise `/api/contact` | Pas d'import partiel des fichiers ni de régression de ses parcours. |
| Supports / tickets | cinq pilotes #153, renderers source + catalogue | Aperçus et handoffs locaux | Pas d'émission officielle, certification ou serveur de billetterie. |
| Son, formation, budget | Packs/documents/registre et récits ; moteurs externes décrits dans `moteurs.json` | Couverture partielle / composants | Un catalogue descriptif n'est pas un studio audio, LMS ni comptabilité raccordée. |
| Atlas / mosaïque | `capacites/`, `atlas/` (gardé), catalogue | Exploration réelle ; certains écrans réservés | Aucun contournement des écrans gardés. |

## Manques et décision de phase

Phase 1 : catalogue configurable, dossiers, objets libres référencés, édition générale, sélection, déplacements, redimensionnement, navigation, historique, sauvegarde/réouverture, JSON. Stockage **local IndexedDB, sur cet appareil**, indépendant des anciens stockages. Ce n'est ni une sauvegarde de compte, ni une synchronisation, ni une publication. Pas de lecture automatique des ressources privées ; uniquement leurs références explicitement choisies.

Les relations, les groupes et les objets média complexes seront préparés par le schéma, mais la collaboration, la publication et les mini-studios intégrés ne sont pas déclarés livrés en phase 1. Un lien vers un outil réel est un lien, pas une intégration prouvée. Un fichier JSON peut contenir les textes/images du dossier : export privé explicite, sans téléchargement automatique.

## Points de contrôle avant livraison

1. Tester le parcours dix étapes avec fermeture et réouverture, données d'image comprises.
2. Tester pointeur, clavier, tactile, zoom au pointeur, undo/redo, import invalide et échec de stockage.
3. Préserver `index.html`, les routes historiques et tous les moteurs existants.
4. Documenter toute absence de preview Vercel ou d'accès à une DB réelle, sans transformer la preview locale en preuve de déploiement.
