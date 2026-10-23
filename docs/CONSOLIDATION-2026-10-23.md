# AIME STUDIO — consolidation transversale (23 octobre 2026)

Statut : **audit et plan d'exécution**, aucune migration de données ni changement produit appliqué.

## Périmètre et état constaté sur `main`
- `README.md` : Page Zéro, Bureau, Monde AIME, Studio et ateliers, applications autonomes et Lab ; navigation pilotée par `nav/registre.js`.
- `vitrine/rendu.js` : `rendre()` (événements) et `composer()` (espaces de travail), extension plutôt qu'un nouveau moteur.
- `studio/index.html` : les ateliers `/web/`, `/docs/`, `/buro/`, `/image/`, `/accessibilite/`, `/stitchlab/` partagent le Studio grâce aux rewrites Vercel. **Ne pas recréer les anciennes copies.**
- `bureau/sources.js` : inventaire en lecture seule, sauvegarde JSON et restauration non destructrice. Les clés historiques sont importantes.
- `tests/bureau.test.cjs` couvre les routes, le registre, les sources, la sauvegarde, le moteur et le Studio.
- `db/schema.sql` et `docs/CARTE.md` : Neon raccordé, mais comptes et écritures applicatives non considérés comme livrés.
- Le document `docs/BUREAU.md` retrace des étapes antérieures ; ses constats sur les redirections ne décrivent pas nécessairement l'état courant. Le code courant prévaut.

## P0 — Protéger ce qui existe
1. Geler les suppressions et renommages fonctionnels sans inventaire explicite des consommateurs.
2. Construire une matrice de données : chaque clé locale, son producteur, ses lecteurs, son schéma, sa version, sa restauration, ses migrations possibles.
3. Tester sauvegarde/restauration sur jeux : vides, historiques, données corrompues, conflits et navigateurs différents ; ne jamais écraser sans consentement.
4. Vérifier les liens et routes de toutes les entrées de `nav/registre.js` ainsi que les bookmarks historiques.
5. Vérifier les parcours critiques iPhone, clavier, mouvement réduit, affichage mobile et état sans connexion.

**Critère de sortie :** aucune perte de clé locale, aucun chemin critique cassé, tests existants verts.

## P1 — Rétablir la continuité des contenus
1. Documenter le contrat `Dossier/Projet/Fragment/Média/Support` en distinguant clairement les objets existants des objets proposés.
2. Créer une table de correspondance des IDs et versions entre Bureau, Studio, Canevas, Magazine, Carte et applications métier.
3. Reproduire le problème signalé : contenus historiques invisibles dans la grande verticale, composants Timbre et Enveloppe, puis comparer stockage réel / rendu / navigation / filtres avant de corriger.
4. Ajouter des tests de non-régression à partir de fixtures anonymisées représentant les anciens formats.
5. Permettre « reprendre exactement cet élément » uniquement si le contrat d'ouverture du module le garantit ; sinon indiquer la limite.

**Critère de sortie :** les éléments historiques attendus sont visibles ou explicitement signalés ; aucun contenu restauré n'est inventé.

## P2 — Un moteur de composition, plusieurs supports
1. Cartographier `vitrine/rendu.js`, Studio, Canevas et Magazine : données communes, présentation, outils métier et zones réellement duplicatives.
2. Fixer un modèle de document versionné pour les supports visuels, sans migration automatique.
3. Mettre en commun uniquement les primitives éprouvées (typographie, couleur, blocs, médias, historique, export), **sans fusionner les moteurs métiers spécialisés**.
4. Tester modifications aller-retour, undo/redo, export/import, tablette/téléphone.
5. Garder un chemin de retour pour chaque migration.

**Critère de sortie :** création et réouverture fidèles, pas de perte de réglages ou de médias.

## P3 — Persistance et comptes (uniquement après revue)
1. Vérifier l'état effectif des branches auth et des protections serveur.
2. Prototyper les migrations sur une base Neon de prévisualisation, sans modifier la production.
3. Définir isolation multi-utilisateur, autorisations côté serveur, consentements et restauration depuis le navigateur.
4. Déployer progressivement et avec rollback.

**Critère de sortie :** tests de sécurité entre comptes et de migration avant toute écriture réelle.

## Ordre de travail et garde-fous
- Une PR isolée par chantier ; jamais de fusion automatique vers `main`.
- Priorité à la réparation du contenu avant la refonte visuelle.
- Aucun effacement de stockage, de documents, de studios ni de projets ; préserver la Page Zéro, la Carte et l'orbe.
- Séparer les faits vérifiés dans le code, les constats d'usage à reproduire et les propositions futures.
- Exécuter `npm test` et tests de parcours navigateur en environnement de travail ; les résultats cités dans `docs/BUREAU.md` ne valent pas exécution à la date de cet audit.

## Première PR de correction proposée
**« Continuité des projets et récupération des contenus anciens »** :
- captures et fixtures du problème Timbre / Enveloppe / grande verticale ;
- diagnostic de lecture des contenus ;
- tests de non-régression ;
- correctif minimal sur le lecteur ou la navigation, sans réécrire les données ;
- validation des sauvegardes avant/après.
