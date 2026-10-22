# Point Zéro (`/point-zero/`, et l'accueil de `/bureau/`)

Le bureau ne commence pas par une app à choisir, mais par une matière à déposer, que l'orbe aide à transformer en projet.

## Le parcours
1. **Au repos**, un seul point : l'anneau iris et le point iris, le premier état de la métamorphose de la Page Zéro (`zero/formes.js`).
2. **Un clic sur le point** ouvre un petit menu : **Importer** (une photo, une image), **Écrire** (une intention, une demande, une note), **Compléter** (un projet en attente). On peut aussi glisser un fichier sur le point.
3. **La matière se transforme sous les yeux**, avec les six formes de la Page Zéro, pilotées dans le temps et non par le défilement. La phase en cours est surlignée (POINT → … → PROJET) et une phrase dit ce que le système fait :
   - **Image** : la ligne de points prend les couleurs dominantes de l'image ; au cercle, chaque fil DMC retenu est relié au centre, l'un après l'autre (la propagation) ; la grille montre un premier aperçu du patron.
   - **Texte** : la ligne pour les dates ; au cercle, les personnes, adresses et dates citées ; puis le classement, la composition et le projet.
4. **L'orbe guide les confirmations** dans un panneau, avec une barre d'avancement. Pour la broderie, six étapes : le format final (taille, usage), la toile, le nombre de points (la finesse), le nombre de couleurs (les modes d'AIME Stitch), la différence écran RVB / impression CMJN / fil DMC, puis la validation des références DMC. La toile passe avant le nombre de points, puisque c'est elle qui le détermine.
5. **La carte projet naît** à la première confirmation (la forme passe par la composition, puis par le projet). Elle s'affiche dans le Bureau avec l'image, l'aperçu de la grille, le statut (en préparation, puis prêt pour l'atelier), le pourcentage d'avancement, le résumé (format, support, points, couleurs, conversion DMC) et l'action suivante proposée par l'orbe. Les boutons « Reprendre » et « Revoir » rouvrent les confirmations.
6. **Rien n'ouvre l'atelier trop tôt** : « Ouvrir dans AIME Stitch » est annoncé, mais désactivé. Le PDF du patron viendra ensuite.

## Ce qui est réutilisé
- `zero/formes.js` : les six formes, partagées avec la Page Zéro.
- `stitch/js/conversion.js` et `stitch/data/dmc.json` : la conversion photo → points → fils DMC (CIELAB, CIEDE2000) et le nuancier, **tels quels**. Les références DMC ne sont jamais modifiées.
- `pointzero/analyse.js` : la lecture des textes (genre, dates, personnes, adresses, liens, montants, thèmes).
- `pointzero/broderie.js` : reconnaître, mesurer (format × toile → points), les trois langages de la couleur (RVB, CMJN indicatif, DMC), l'avancement et le résumé. Logique pure, testée.

## L'orbe remonte à AIME
« Transmettre à AIME » (personne connectée seulement) envoie à `CONTACT_TO` un résumé structuré, via `POST /api/remontee` : le format, la grille, les fils DMC et ce qui a été confirmé, ou le message. Le résumé est revalidé côté serveur et le nombre d'envois est limité. **L'image n'est jamais envoyée.**

## Où vit la matière
- **Textes** : sur le compte si l'on est connecté (table `matiere`, `POST /api/matiere`), sinon dans le navigateur, avec un bouton pour les ranger sur le compte plus tard.
- **Images et cartes projet** : sur l'appareil (IndexedDB « aime-point-zero »), jamais envoyées.
- **Supprimer son compte** efface sa matière.

## Mise en place
- `db/migrations/2026-10-22-matiere.sql`, sur la base de preview puis sur la production.
- `CONTACT_TO` (et l'envoi Resend déjà configuré) pour « Transmettre à AIME ».

## Lot A · les six formes deviennent des outils (l'orbe, pointeur intelligent)

Une fois le projet né (première confirmation), les six noms sous la forme deviennent des boutons : chacun ouvre un **mode** sur le même canevas.

| Mode | Ce qu'on manipule | Ce que l'orbe propose |
|---|---|---|
| Point | le cercle central | importer, écrire, compléter un projet en attente |
| Ligne | 5 points = 5 paramètres (largeur, usage, toile, densité, couleurs) | le réglage (curseur ou choix), sa conséquence en points et en cm, puis la confirmation ; un point confirmé reste vert |
| Relation | les fils DMC autour du point, et des liens pointillés entre fils très proches | ce que le fil représente, pourquoi il est relié, ses voisins **réels** dans le nuancier ; regrouper deux fils proches |
| Grille | une case par fil, dans l'ordre de broderie | sélectionner, regrouper, déplacer (glisser, ou Alt + flèches) ; le patron est redessiné |
| Composition | 5 blocs (image, grille, fils, couleurs, mesures) dans une grille responsive de 4 colonnes | largeur, hauteur, ordre, puis validation enregistrée dans le projet |
| Projet | la carte vivante | quatre avancements séparés (analyse, confirmations, réalisation, livrables), manques, décisions et leur source, prochaine étape |

**Principe.** Chaque élément interactif déclare son identifiant, son type, ses propriétés, ses actions et ses droits (`orbe/contexte.js`). Le pilote (`orbe/pilote.js`) n'affiche que ce qui est déclaré, et suit toujours : observer → proposer → régler → confirmer → enregistrer. Une action qui a des conséquences demande une seconde confirmation (« Confirmer : … »).

**Gestes.** Clic, toucher ou clavier : sélectionner suffit à ouvrir les commandes. Entrée ouvre la bulle et y place le focus, Échap la referme et rend le focus. Flèches pour passer d'un élément à l'autre, Alt + flèches pour déplacer. La couche de l'orbe est transparente aux gestes (`pointer-events: none`).

**L'orbe.** La même pastille conique que le compagnon. Elle suit doucement la souris (réglable, coupée sur écran tactile et si le système demande moins de mouvement), se pose près de l'élément choisi. Trois niveaux d'autonomie, mémorisés sur l'appareil : *À la demande* (rien sans clic), *Propose aux pauses* (une ligne discrète), *S'ouvre d'elle-même aux pauses*.

**Ce qui n'est pas de l'IA.** Tout est calcul déterministe (grille, écarts de couleur, nuancier DMC) ou choix de l'utilisateur. Les références DMC ne sont jamais inventées : un fil ne peut être remplacé que par une entrée réelle du nuancier ; regrouper ou remplacer remet la validation DMC à faire.

**Trace.** `p.decisions` (la dernière valeur par clé) et `p.historique` (200 entrées) gardent la source : *Vous*, *Calcul*, *Import*, *Hypothèse IA* (réservée au lot C). Les cases du patron (`p.cases`) restent sur l'appareil, comme l'image ; la remontée n'envoie ni l'une ni les autres.

**Limites connues.** Un projet créé avant ce lot n'a pas ses cases : regrouper ou changer de fil demande de réimporter l'image (l'orbe le dit). Le mariage (lot D) et l'agent IA (lot C) ne sont pas dans ce lot.

## Lot B · la carte projet devient un mini-site privé

« Voir mon mini-site », sur une carte projet ou à la fin des confirmations, ouvre l'aperçu réel `/projet/?id=…`. « Modifier dans le Canevas » ouvre le même mini-site dans le Canevas (adaptateur `aime-site`).

- **Aucun second générateur.** `pointzero/minisite.js` traduit le projet en site `aime-site` ; le moteur de pages (`vitrine/rendu.js`) le rend avec ses blocs : en-tête (photo), image (le motif redessiné net depuis les cases), Fils DMC, Chiffres (dimensions en points et en cm, nombre de fils, points à broder), Avancement (quatre mesures séparées), Paragraphe (prochaines actions et ce qui reste à confirmer), Chronologie (décisions et leur source).
- **Deux blocs ajoutés au moteur commun** : `fils` (nuancier DMC, couleurs validées) et `avancement` (barres bornées). Ils rejoignent le catalogue du générateur, famille « Projet ».
- **Composition.** « Modifier dans le Canevas » ouvre le même mini-site, rendu par le moteur de pages, dans le Canevas (`/canevas/?site=…&projet=…&de=…`) : sélectionner, glisser sur la grille, dimensionner, régler la forme et le titre d'un bloc ; rien n'est écrit sans « Enregistrer ». Le contenu issu du projet validé reste protégé. « ← Retour au projet » ramène à la carte, au Point Zéro ou dans le Bureau selon l'origine. Le générateur de sites n'est plus une destination du parcours.
- **Retour.** « Retour au Point Zéro » (ou au Bureau) reprend le projet là où il était ; le projet n'est jamais modifié par le mini-site.
- **Canevas.** Le patron de broderie reste ouvrable seul (« Le patron dans le Canevas », adaptateur broderie).
- **Privé.** Projet et mini-site restent dans ce navigateur (IndexedDB et `aime-sites`), comme avant ; le compte et le partage viendront avec le lot de persistance.
