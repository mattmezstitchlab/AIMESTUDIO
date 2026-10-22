# Le cube-personne

> Dans AIME, on crée son timbre, on construit son cube, on personnalise son orbe et on fait évoluer sa propre Régie.

## Un seul modèle : `cube/modele.js` (AIMECube)

Le cube est un **contenu AIME**, pas une animation. Un seul modèle, indépendant de ses affichages. Le Monde AIME, puis le Bureau, le dock, le Canevas et le Réseau lisent la même configuration. Aucun d'eux ne garde son propre cube.

| Facette | Champs du verso (bornés) | Face de `#cube2` | Blocs Métamorphose prévus |
|---|---|---|---|
| Identité | une phrase, ce que je viens créer | 0 | timbre, orbe, texte |
| Médias | le média qui me représente, sa nature | 5 | galerie, media, citation |
| Temps | un moment qui compte, mon rythme | 1 | agenda, programme |
| Relations | le cercle à relier, ce que nous partageons | 3 | contact, reseaux, livre |
| Documents | à garder en ordre, une note | 4 | documents, faq |
| Activités & projets | un projet en cours, où j'en suis | 2 | programme, lieu, bouton |

- **Trajet d'une carte** : la facette passe par `vide → écrite → timbrée → posée`. On ne saute aucune étape : pas de timbre sans au moins une ligne, pas de fente sans timbre. Une facette posée peut rester **partielle**, et aucune n'est obligatoire.
- **Privé par défaut.** Afficher une facette dans le cube ne la publie pas. `publier(id)` est un geste explicite, réservé à une facette posée. `publiques()` est la seule lecture que le Réseau aura.
- **Pas de duplication du profil.** Le nom, l'e-mail et la photo restent ceux du compte (Better Auth) ; le timbre reste `compte/timbre.js`.
- **L'orbe** : ses préférences (apparence, couleurs, comportement, animation, autonomie, interaction, explications) sont bornées et **ne donnent aucun droit**. `droitsOrbe` est séparé : vide par défaut, jamais modifié par une préférence, jamais relu depuis le stockage local.

## Première tranche : Carte postale → Timbre → Fente → Voyage vertical → Facette

Script : `cube/cartes.js`, styles : `cube/cartes.css`, chargés par `aime/index.html` (trois lignes). Le titre, le cube du héros et les animations de la page ne changent pas.

1. **La fente et les six cartes**, sous le héros. Le sommaire du héros gagne son chapitre « 0 · Vos cartes ».
2. **La carte se retourne en 3D.** Le verso est en papier crème, à l'encre bleue, avec une écriture manuscrite. Les champs sont structurés et éditables, et enregistrés à la frappe.
3. **Le timbre du compte** se glisse sur la case, à la souris ou au doigt. Pour la même action sans glisser, il y a le bouton « Apposer mon timbre », ou Entrée sur le timbre. Le cachet du jour apparaît.
4. **La fente** : la carte y descend et s'y enfonce.
5. **Le voyage vertical**. La carte descend le long de la règle millimétrée existante (`aimeRuler.wave`). Elle nomme les chapitres traversés grâce aux repères de la page (`svAnchors`). Elle avance en lecture automatique, avec Pause / Lecture / Passer. Faire défiler, toucher l'écran ou utiliser le clavier rend la main.
6. **La facette**. La carte devient la face correspondante du cube du chapitre « Votre cube » : son contenu, le timbre et le cachet. Une bulle propose « Une autre carte » et « Aller au Bureau ».

**Modes**

- **Personnel** : session Better Auth et timbre confirmé (`/api/identite`).
- **Découverte** : sans compte, ou avec `?demo=timbre`. Le timbre fictif de Camille est affiché et annoncé comme démonstration.

**Mouvement réduit** : la carte ne se retourne ni ne vole, et elle arrive directement sur la face, sans déplacement.

**Enregistrement — limite actuelle.** Le cube est gardé **sur cet appareil seulement** :

- localStorage `aime-cube:<id du compte>` ;
- sessionStorage en découverte, effacé à la fermeture de l'onglet.

Rien n'est envoyé au serveur. Un autre navigateur ou un autre appareil ne voit pas les cartes. Effacer les données du site les efface. Le lot de persistance serveur (Neon pour le cube, Vercel Blob pour les médias) remplacera `charger()` / `garder()` sans changer le modèle.

## Assemblage et orbe (priorité 1) — `cube/assemblage.js`, `cube/assemblage.css`

- Dès qu'une première carte est posée, le cube du chapitre « Votre cube » devient celui de la personne. Les faces validées sont pleines ; les autres sont en verre irisé, nommées, « à venir ». Le cube garde sa rotation, sa lumière, son glisser et son ouverture au défilement : `assemblage.js` ne touche ni aux faces ni à leurs transformations.
- Une jauge de six cases, sous le cube, dit où en est l'assemblage. Quand une carte arrive, sa face se pose sur le cube.
- Puis le cube s'ouvre : c'est l'ouverture existante, au défilement, jouée pour la personne jusqu'à mi-course. Défiler, toucher ou utiliser le clavier rend la main.
- Au cœur, l'orbe apparaît : le même rond irisé que l'orbe de la page (`--conic`, `hue`), avec « AI + ME · I ÂME ». La toucher la présente ; elle ne voit que l'écran et n'a aucun droit sur les facettes. « Réfléchir avec elle » ouvre le compagnon existant (`AIMECompagnon.converser`).
- Mouvement réduit : rien n'est joué. L'orbe, immobile, apparaît quand la personne ouvre le cube elle-même.
- Lecture seule du modèle (via `AIMECartes.cube()` et l'événement `aime:cube`) ; aucune seconde copie.

## État serveur, sans ambiguïté

- La table `identite` (timbre confirmé, « Monde déjà visité ») existe sur les branches Neon `preview/integration` et `preview/cube-cartes`. Elle **n'existe pas en production** (`main`). En production, le statut de visite n'est donc pas persisté côté serveur.
- Le cube lui-même n'est enregistré que localement. Sa sauvegarde serveur passera par le lot de persistance et les permissions des espaces.

## Suite : Cube → Canevas → Personnalisation → Enregistrement → Régie personnelle

Des PR séparées, dans cet ordre, toutes sur ce même modèle :

1. **Bureau et dock.** Le cube du Bureau est l'objet central : on le fait tourner, on choisit une face, on ouvre les éléments autorisés. Le dock en montre une miniature. Ils lisent `aime-cube:<id>`.
2. **Adaptateur Canevas « cube-personne »** (`canevas/adaptateurs/cube.js`). Le cube s'y déplie en 2D, et chaque face devient une composition de blocs rendue par le moteur de pages existant (`vitrine/rendu.js`), comme le mini-site du lot B. On y règle les couleurs, les fonds, les médias, la disposition, l'aperçu et l'enregistrement. Il n'y a pas de second système de composition.
3. **Vue 3D** du même modèle : ouvrir le cube en grand, le faire pivoter, cliquer sur une face. Ce qui est enregistré en 2D se voit en 3D.
4. **Blocs Timbre et Orbe** dans la face Identité. Le bloc Orbe reprend les réglages de la Régie et les composants de l'orbe, avec des préférences séparées des permissions.
5. **Réseau** : seules les facettes publiées (`publiques()`).
6. **Persistance serveur** du cube et de ses médias.

## Le cube, accès à la Régie personnelle (priorité 2)

- **Un seul stockage** : `cube/stock.js` (AIMECubeStock). Il sait qui est la personne (`qui()` : Better Auth + timbre confirmé), et il lit et écrit le cube de cette personne seulement. Le Monde AIME, le Bureau et le dock passent tous par lui.
- **Une seule vue 3D** : `cube/vue3d.js` (AIMECubeVue). Les faces posées portent la teinte, les mots et le timbre ; les autres sont en verre, « à venir ». On fait tourner le cube à la souris ou au doigt. Au clavier, les six faces se parcourent avec Tab et s'ouvrent avec Entrée ; les flèches tournent. La même vue servira au Canevas en 3D.
- **Mon cube** (`/cube/`) est la Régie personnelle :
  - le cube au centre ; la face choisie se tourne de trois quarts ;
  - le panneau de la face : état, partielle ou non, privée ou publiée, champs ;
  - « Écrire / Corriger la carte » rouvre la carte dans Le Monde AIME (`/aime/?carte=<facette>`) ;
  - les blocs prévus pour la face ;
  - face Activités : les projets de ce navigateur (mini-site, Canevas) ;
  - face Identité : le timbre, les préférences de l'orbe et ses droits (aucun).
- **AIME OS** : « Mon cube » est une app système, toujours en tête du dock, même avec des épingles choisies. Son icône est la miniature du cube de la personne (faces posées en couleur). Elle s'ouvre dans une fenêtre du Bureau.
- La Régie maîtresse (`/regie/`) n'est ni chargée ni modifiée.
