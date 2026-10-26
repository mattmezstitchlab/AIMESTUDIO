# LE MONDE AIME — verticale continue et douze configurations

## Entrée et navigation
L’application de cette branche s’ouvre toujours sur le mariage à `/`. Le header permanent contient **UNIVERS**, **MÉTIERS / ACTIVITÉS**, **LE RÉCIT**, **PERSPECTIVES**, recherche et compte. L’atlas ouvre les douze types à `/?univers=<id>`. Ce sont des configurations du même lecteur, pas douze applications ni douze jeux de permissions.

**Explorer le récit** conduit à l’ouverture de l’acte actif dans la même page. Le défilement natif fonctionne directement depuis le paysage jusqu’au dernier moment. Aucun second header ou dock n’est affiché en chemin. **RÉCIT** dans le dock ouvre la table des phases et la précision temporelle. Le retour **OUVERTURE** conserve le moment actif. Une **LECTURE SIMPLIFIÉE** explicite désactive les décors dans le récit tout en conservant la même source et les mêmes contrôles.

## Continuité visuelle
- Header et dock uniques, fixés au viewport, icônes SVG cohérentes, libellés en capitales et taille augmentée. Le dock mobile présente les cinq lumières, les actions et le lecteur sur deux rangées.
- Graduation contrastée permanente ; mise à jour à l’entrée d’un acte par son premier moment autorisé, puis par les moments réellement croisés. Aucun timestamp dérivé des pixels.
- Dix actes mariage scénographiés : ouvertures mixtes ou panoramiques, papier, encre, compte à rebours artistique, matière d’archive. Les 102 moments du jour J sont répartis en séquences de huit, avec une progression de lumière artistique.
- Titres Cal Sans, interfaces Inter, ponctuations et panoramas en Playfair. Panneaux papier et flou de fond conservés.
- Scènes horizontales existantes conservées, contrôlées par le scroll natif. En réduction des animations, elles deviennent des régions horizontales natives focalisables au clavier.
- Quatre visuels d’illustration réutilisables (terrasse, scène, atelier/galerie, archive), **environ 892 Ko au total**, sans personne réelle prétendument représentée. Aucun média fictif n’est présenté comme une preuve du projet.
- Le chargement des fonds est déclenché à proximité du viewport. Un seul visuel a été observé dans les requêtes d’image à l’ouverture du test desktop. La caméra douce est limitée aux ouvertures visibles et supprimée avec `prefers-reduced-motion`.

## Sources et composants
- `data/story.json` : **copie canonique Manus inchangée**, 200 moments / 10 actes / 122 spécialités / 19 dépendances.
- `data/templates.json` : copie inchangée de la nouvelle pièce jointe `AIME_VERTICALITES_12_GABARITS.json`.
- `data/worlds.json` : direction artistique, activités locales au domaine, texte d’ouverture et **deux exemples fictifs par phase** des onze autres types.
- `world-config.js` : adaptateur partagé navigateur/serveur. Pour le mariage, réutilise les tableaux de moments, chapitres et spécialités, sans les recopier. Pour les autres univers, construit la forme commune attendue par le lecteur à partir des exemples configurés.
- `projects.js` : sélection du projet. Ne télécharge Manus que pour le mariage.
- `render-story.js` : composition commune, moments et séquences. Les identifiants et l’ordre restent ceux de la source.
- `scenography.js`, `journey.css` : décor et shell, sans règle d’accès ni mutation du temps.
- `atlas.js`, `icons.js` : navigation et pictogrammes communs.
- `immersive.js`, `app.js` : interactions existantes raccordées au lecteur et aux perspectives.

### Les douze types
| ID | Type | Phases | Moments |
|---|---|---:|---:|
| mariage | Mariage | 10 | 200 canoniques |
| spectacle | Spectacle et concert | 9 | 18 exemples |
| seminaire | Séminaire et conférence | 8 | 16 exemples |
| formation | Formation et atelier | 8 | 16 exemples |
| exposition | Exposition et installation | 9 | 18 exemples |
| site | Création de site et expérience numérique | 8 | 16 exemples |
| broderie | Création textile et broderie | 8 | 16 exemples |
| association | Projet associatif et solidaire | 8 | 16 exemples |
| memoire | Histoire de vie et transmission | 8 | 16 exemples |
| institution | Dossier institutionnel et parcours administratif | 8 | 16 exemples |
| festival | Festival et événement public | 8 | 16 exemples |
| creation | Projet créatif et commande | 8 | 16 exemples |

Les propositions de phases conservent les IDs fournis. Les exemples ont des IDs préfixés par le type et la phase, ne se mélangent jamais avec les 200 moments du mariage. Les onze gabarits ont des activités propres, **pas les 122 métiers Manus présentés comme un catalogue professionnel mondial**. Leurs métiers restent des étiquettes de démonstration, sans privilège. Les capacités AIME associées sont affichées comme **proposées**, distinctes des types et non annoncées comme modules opérationnels.

## Temps honnête
- Mariage : timestamps d’origine, fuseau Europe/Paris, passage à minuit, secondes de la source. Le chevauchement canonique portraits 19:12 / appel dîner 19:00 demeure signalé.
- Autres univers : `start_at`, `end_at` et `duration` sont **null**. La graduation montre des étapes symboliques, la fiche indique l’absence de date. L’échelle du gabarit est affichée dans l’atlas mais ne fabrique pas un calendrier fictivement précis. Par exemple, la régie à la seconde du Spectacle sera possible lorsque de vrais timestamps seront renseignés ; les exemples actuels n’en inventent pas.
- Lumière artistique, instant planifié, moment exploré et progression de lecture sont distincts. L’heure réellement constatée reste non renseignée.

## Permissions et frontière d’authentification
Les moteurs `synchroview/permissions.js`, `modules/temps/moteur.js` et les routes réelles comptes/Temps n’ont pas été modifiés.

`union/server/demo.cjs` adapte les configurations **exclusivement fictives** aux règles existantes. Le serveur choisit les rôles et grants de la fixture ; une profession, un type ou un rôle transmis par le navigateur ne donne pas de droits. La route `/api/sv/union` refuse le mode authentifié et toute référence à un univers inconnu.

Pour le mariage, les cinq perspectives et les décisions Temps sont conservées. Pour les gabarits symboliques : propriétaire, coordination, contribution, consultation et invité, tous explicitement fictifs. La fixture publie un exemple sur deux aux invités ; les notices privées ne sont pas partagées. Les contributeurs et lecteurs n’obtiennent des notices qu’avec des grants explicites. Les gestes testés dans ces gabarits sont des **vérifications d’édition**, sans réécriture temporelle ni persistence d’un état accompli.

L’API de démo ne sert aucune donnée réelle privée. Les JSON de démonstration restent publics, ce qui est assumé : les filtres d’interface ne sont pas une protection de ces fichiers fictifs. **Ne jamais les remplacer par des données privées.** Le raccord aux programmes authentifiés et aux fichiers réels demeure à implémenter via les API existantes et leurs projections serveur. Les essais réels multi-comptes contre une base configurée ne sont pas annoncés comme réalisés.

## Contrôles exécutés
- `npm run build` : **27 tests réussis**, contrôles syntaxiques des modules, intégrité des sources, phases et ordre, IDs, nullité des dates symboliques, documents/grants, tentatives d’escalade et séparation des univers.
- Régression Permissions / Temps / comptes statiques : **192 réussis, 13 ignorés, 0 échec**.
- `scripts/test-worlds-browser.cjs` : les **12 univers** parcourus sur desktop, cardinalités et phases, sélection d’activité, fiche et lecteur ; les **5 parcours prioritaires** également testés en mobile 390 × 844, sans débordement, avec perspective invitée et notices documentaires interdites absentes. Zéro erreur JavaScript observée.
- `scripts/test-journey-browser.cjs` : dix actes mariage, header/dock fixes du début à la fin, ordre des 200 IDs, mouvement effectif du panorama au scroll, graduation et précision secondes, lecture simplifiée, cinq perspectives, repli sans animation, chargement initial différé des visuels.
- Source Manus et fichier des gabarits comparés octet par octet aux pièces jointes.

Tests navigateur exécutés avec Playwright/Chromium et les bibliothèques décrites dans `EXPERIMENTATION.md`. Les outils sont temporaires, pas des dépendances d’exécution. Il ne s’agit pas d’un audit Lighthouse, de tests sur appareils physiques ou d’un benchmark FPS.

## Ce qui reste prototype
- Inscription, billetterie, publication de site, validation de diplôme, dépôt d’archives : **étapes d’exemple consultables**, pas des services transactionnels implémentés.
- Catalogue d’activités hors mariage limité à chaque gabarit, sans prétention de référentiel professionnel complet.
- Pas d’éditeur de configurations dans l’interface ; les JSON sont modifiables et testables dans le dépôt.
- Quatre décors partagés avec cadrages, textures et compositions spécifiques, pas douze productions photographiques indépendantes.
- Les univers sont sélectionnés par URL et rechargent la même application. La bascule ouverture/récit/lecture simplifiée reste dans la page et conserve son contexte ; il n’y a pas de synchronisation de plusieurs projets privés.

## Complément : Tickets et Supports
Le bouton contextuel **+** et les fiches relient cinq objets aux moteurs d’origine, sans remplacer les douze verticalités. Audit réel : **154 supports Studio / 147 hors Web**, **168 modèles TICKETAIME / 19 catégories**. Aperçu avant insertion, références canoniques, versions locales et propositions sans republication. Les ateliers Studio et Publication/Canevas sont raccordés ; le transfert vers l’atelier TICKETAIME n’est pas vérifié et reste désactivé. [Audit, architecture, permissions et limites](integrations/README.md).

## Fenêtre personnelle / cinq tableaux Renaissance
La nouvelle coque personnelle réutilise les vues Compte, AI et les ateliers dans des panneaux même origine. La nouvelle scénographie est opt-in à `/?scene=renaissance`, sans changement des données ni déploiement aux douze univers. L’ancien lecteur demeure à `/?univers=mariage`. Voir [les contrats, tests et limites de cette étape](../fenetre/ARCHITECTURE.md). Le build courant couvre 42 tests ; aucune preuve de connexion réelle sur Neon n’est annoncée.
