# AIME INFINITY

> 4 cases. Une action. Un monde plus grand.

Jeu isolé sur la branche `infinity`, créée depuis `main` (la base stable : production, tous les tests verts). Il ne touche ni AIME WORLD, ni SynchroView, ni les permissions, ni le Studio, ni les démonstrateurs (testé).

- Jeu : `/infinity/`
- Laboratoire des trois mécaniques : `/infinity/lab/`

## 1. Audit rapide

| Constat | Conséquence |
|---|---|
| `main` = production, stable ; `world`, `vitrine` et `synchroview` contiennent des travaux non validés | Branche `infinity` depuis `main`, rien d'autre. |
| La landing définit la langue visuelle : fond `#0A0A0C`, trame de points, halo violet, dégradé de l'orbe `#FB7185 → #F59E0B → #7C5CFF → #22D3EE`, Cal Sans, Inter, libellés en capitales espacées | Repris tel quel dans le jeu ; polices déjà hébergées dans `fonts/`. |
| L'orbe de la landing et le labo `lab/orb` ne sont pas des modules réutilisables | Rien n'est copié ; l'orbe du jeu est dessinée sur le canvas avec le même dégradé. |
| Aucune bibliothèque nécessaire | Canvas 2D et Web Audio natifs, aucun service externe. |

## 2. Trois mécaniques comparées, une retenue

Les trois prototypes du laboratoire partagent la même grille et la même règle de propagation ; seule change la façon de déclencher la première explosion.

| | A · Tir | **B · Toucher** | C · Fusion |
|---|---|---|---|
| Total sur 40 (8 critères du brief) | 25 | **37** | 27 |

**Retenue : B, Toucher.** Le geste et la conséquence sont liés sans intermédiaire : « j'ai provoqué ça ». Le tir ajoute une incertitude de geste qui brouille la causalité et pénalise le téléphone dès 16 × 16 ; la fusion demande deux règles avant le premier plaisir et rappelle les jeux de fusion. Du tir, on garde le geste : sur téléphone on **vise en glissant** (loupe sous le doigt, portée affichée) et on **tire au relâcher**.

Les notes sont des jugements de conception, faits en simulation iPhone et sur ordinateur : à confirmer avec de vrais joueurs.

## 3. La règle (une seule)

Chaque case porte sa portée, lisible par sa forme (jamais par la seule couleur) :

| Forme | Nature | Quand elle explose |
|---|---|---|
| point | poussière | n'atteint rien |
| 1, 2 ou 3 anneaux | onde | atteint toutes les cases à 1, 2 ou 3 cases autour (un carré) |
| trait | rayon (dès 16 × 16) | atteint toute sa ligne ou sa colonne |

Toucher une case la fait exploser ; toute case atteinte explose à son tour. Les ondes roulent (3 unités de temps par case), les rayons filent (1 unité) : l'ordre et les instants sont calculés, pas tirés au hasard. Même grille + même case = même cascade.

**Profondeur** : une grande onde atteint les petites, pas l'inverse. Le joueur apprend à chercher les cases d'où la cascade « descend » le plus loin. L'optimum d'une grille est le nombre de composantes sources du graphe « qui atteint qui » : il est calculé exactement pour chaque grille.

## 4. Progression, budget, échec

- 2 × 2, 4 × 4, 8 × 8… jusqu'à 128 × 128 dans ce prototype. Même graine pour tous : la progression est comparable entre joueurs.
- Budget = optimum + marge (0 à 2 × 2, puis 1, 1, 1, 2, 2, 3). Chaque grille est donc **résoluble par construction**, et les tests rejouent la solution optimale de chaque niveau.
- Le générateur refuse les grilles où toucher au hasard suffirait (part de « bons départs » plafonnée : 50 % à 4 × 4, 35 % à 8 × 8, puis 25 % et 20 %).
- Simulation de joueurs : le joueur glouton atteint l'optimum ; « toucher la case la plus forte » tient tout juste dans le budget ; toucher au hasard échoue dès 8 × 8.
- Échec : « Il reste N cases », un bouton pour rejouer la grille, aucune attente. Les niveaux validés ne sont jamais perdus.
- Records : la plus grande grille terminée, puis le moins d'actions cumulées (seules les grilles réussies comptent) ; ✦ pour chaque grille vidée à l'optimum.

## 5. La transformation infinie

Grille vidée → les dernières particules se rassemblent au centre, le cadre se contracte en un point lumineux (l'orbe), puis la caméra recule : la nouvelle grille, quatre fois plus grande, arrive grossie deux fois et prend sa place en se révélant depuis le centre, anneau carré après anneau carré. Pas d'écran de victoire, pas de bouton « suivant » ; un toucher accélère la transition. Réduction des animations : un simple fondu.

## 6. Son

Web Audio uniquement. Chaque vague d'une cascade joue une note d'une gamme pentatonique (ré majeur) : petite cascade = quelques notes, grande cascade = une phrase qui monte, accord à chaque grille vidée. Position horizontale = placement stéréo. Volume modéré, compresseur, démarrage après le premier geste, bouton muet (et touche M), le jeu reste complet sans son.

## 7. Défi du jour

Menu du niveau → « Défi du jour » : la même grille 16 × 16 pour tous à une date donnée, cinq actions, le plus grand nombre de cases. Résultat : cases éliminées, plus grande cascade, actions ; partage par la feuille de partage du téléphone ou copie. Pas de compte, pas de classement mondial (il faudrait un serveur qui vérifie les scores).

## 8. Architecture

| Fichier | Rôle |
|---|---|
| `infinity/js/regles.js` | Propagation, cascade (instants déterministes), optimum exact (composantes fortement connexes). Logique pure. |
| `infinity/js/niveaux.js` | Génération déterministe (graine), régions lisibles (bruit lissé), rayons, budget, défi du jour. |
| `infinity/js/partie.js` | Grille, actions, statut, rejeu, campagne, records, score du défi. |
| `infinity/js/rendu.js` | Canvas 2D : image des cases en mémoire effacée case par case, niveau de détail sous 9 px, effets plafonnés, transition, loupe. Ne décide de rien. |
| `infinity/js/son.js` | Musique générative. |
| `infinity/js/jeu.js` | Gestes (toucher, souris, clavier), interface, enchaînement. Les animations ne bloquent aucune commande. |
| `infinity/lab/index.html` | Les trois prototypes et la comparaison. |
| `tests/infinity.test.cjs` | 9 tests : 2 × 2 en une action, déterminisme, résolubilité et optimum exact de 2 × 2 à 128 × 128, géométrie des ondes et rayons, échec et reprise, défi du jour, performances, isolement. |

Commandes : toucher (téléphone), survol + clic (ordinateur), flèches + Entrée (clavier), R pour rejouer la grille, M pour le son.

## 9. Limites connues et suite

- **Au-delà de 32 × 32 sur téléphone**, les cases font moins de 6 px : la loupe permet de viser, mais les anneaux deviennent des taches d'intensité. Prochaine étape : un zoom par pincement et une caméra qui suit les régions encore vivantes (le moteur est prêt : rendu par image en mémoire, logique indépendante).
- 128 × 128 est la limite de ce prototype ; 256 × 256 demandera un rendu par régions (tuiles) et un calcul d'optimum incrémental.
- Les budgets et les seuils de difficulté sont réglés par simulation, pas encore par de vrais joueurs : il faut mesurer le taux d'abandon et de relance par niveau.
- Le partage est textuel ; l'image ou la courte animation de résultat restent à faire.
- Éditeur de niveaux, classement vérifié : non commencés, volontairement.
