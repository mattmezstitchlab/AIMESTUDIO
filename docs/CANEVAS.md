# Canevas 0

Un plan de travail neutre où ouvrir les projets AIME. Page : `/canevas/` (vide) ou `/canevas/?projet=<id>` (depuis une carte projet ou le mini-site).

## Ce qui est en place

- **Plan de travail neutre** (`canevas/plan.js`, `canevas/scene.js`) : aucun moteur métier chargé. Un canevas vide s'ouvre, se déplace, se zoome et reçoit des notes.
- **Palette centrée en bas** : Sélection (V), Main (H, ou Espace maintenu, ou glisser au doigt), Zoom − / pourcentage / + (Ctrl + / Ctrl −, 0 = 100 %, 1 ou double-clic sur le pourcentage = ajuster, Ctrl + molette ou pincement), Note (N).
- **Scène commune** (`aime-canevas`) : calques avec leur grille et leur transformation vers la scène ; unités abstraites, chaque adaptateur déclare les siennes.
- **Grille configurable** pour un calque sans contenu : universelle (colonnes, repères toutes les 12), broderie, points, fond libre ; pas réglable ; visible ou non.
- **Adaptateur broderie** (`canevas/adaptateurs/broderie.js`), seul à connaître Stitch, chargé à la demande : le projet confirmé au Point Zéro devient un patron `aime-stitch` (`StitchPatron.depuisConversion`) dessiné par `StitchRendu.grille`. Rien n'est redemandé ; les références DMC passent telles quelles. Unité native : la case.
- **Outils métier en contexte** : sélectionner une case fait apparaître l'orbe avec le fil (DMC, position, nombre de cases) et ses actions : mettre ce fil en évidence, tout afficher, symboles, couleurs, noter ici.
- **Notes** : posées sur le plan ou sur un élément (« DMC 922 · case 42,28 »), déplaçables (glisser, ou Alt + flèches), modifiables, avec réponses, résolues ou rouvertes, supprimées après confirmation. « Proposer comme décision » crée une proposition en attente : la note ne change jamais le projet.
- **Enregistrement** : la vue, la grille et les notes sur cet appareil (`localStorage « aime-canevas »`), jamais le contenu du projet.
- **Ouverture directe** : « Ouvrir dans le Canevas » sur les cartes projet du Point Zéro et du Bureau, et dans le mini-site.

## Pas encore

Superposition de plusieurs calques, autres adaptateurs (mini-site, relations, Metamorphose, PDF), notes sur le compte (lot de persistance), confirmation d'une proposition dans le projet.
