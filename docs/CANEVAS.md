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
- **Ouverture directe** : « Modifier dans le Canevas » sur les cartes projet du Point Zéro et du Bureau, et dans le mini-site ; « Le patron dans le Canevas » pour le patron seul.
- **Adaptateur aime-site** (`canevas/adaptateurs/site.js`) : un mini-site (toute page du moteur) s'édite ici, un seul environnement d'édition.
  - Rendu : `AIMESite.document`, le même que l'aperçu du projet, posé à taille réelle sur le plan ; il suit le zoom et le déplacement.
  - Sélection d'un bloc : un cadre ; le glisser le déplace sur la grille de 12 colonnes, la poignée le dimensionne (la hauteur suit, règle du moteur). Clavier : flèches, Maj + flèches, Entrée pour « Régler le bloc » (forme, titre, texte : le catalogue du moteur).
  - Opérations du moteur : `tasser` (aucun chevauchement), `hauteur`. Aucun bloc réécrit, aucun générateur.
  - Droits : on compose son propre mini-site sur cet appareil ; le contenu issu du projet validé (motif, fils, mesures, avancement, décisions) reste protégé.
  - « Enregistrer » range la page dans « aime-sites », là où l'aperçu la relit ; « Annuler » revient à la dernière version enregistrée.
  - L'inspecteur se place à côté de la sélection (`element.eviter`, générique pour tous les adaptateurs).
- **Ensuite (SynchroView)** : le même mini-site en deux blocs, ordinateur et téléphone, défilement synchronisé, mêmes données ; puis les perspectives par rôle, filtrées côté serveur.

## Pas encore

Superposition de plusieurs calques, autres adaptateurs (mini-site, relations, Metamorphose, PDF), notes sur le compte (lot de persistance), confirmation d'une proposition dans le projet.

## Fiabilité de l'enregistrement local (22 octobre 2026)

Pour l'adaptateur site, la barre existante indique dès l'ouverture que le site est sur cet appareil uniquement, sans synchronisation avec le compte, et la date du dernier enregistrement si elle existe. Aucun style ni disposition n'est modifié.

Enregistrer sélectionne le site courant dans `aime-sites.cur`, conserve les autres projets et ne confirme le succès qu'après écriture. Un stockage illisible, un refus d'écriture ou un quota conserve les modifications ouvertes. Si la version stockée a changé depuis l'ouverture (autre éditeur/onglet) ou a été supprimée, l'écriture est refusée sans écrasement. Il faut garder l'onglet ouvert et comparer avec le Bureau ; aucune fusion automatique n'est proposée. Ce contrôle est optimiste, pas un verrou transactionnel entre onglets.

Tests comportementaux : `tests/canevas-persistance.test.cjs` (reprise, conservation d'autres sites, écritures successives, quota, corruption, suppression et conflit). Ces tests ne remplacent pas une validation visuelle ni un test du parcours compte sur PostgreSQL.
