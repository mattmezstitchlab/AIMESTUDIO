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

Script : `monde/cartes.js`, styles : `monde/cartes.css`, chargés par `aime/index.html` (trois lignes). Le titre, le cube du héros et les animations de la page ne changent pas.

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

## Suite : Cube → Canevas → Personnalisation → Enregistrement → Régie personnelle

Des PR séparées, dans cet ordre, toutes sur ce même modèle :

1. **Bureau et dock.** Le cube du Bureau est l'objet central : on le fait tourner, on choisit une face, on ouvre les éléments autorisés. Le dock en montre une miniature. Ils lisent `aime-cube:<id>`.
2. **Adaptateur Canevas « cube-personne »** (`canevas/adaptateurs/cube.js`). Le cube s'y déplie en 2D, et chaque face devient une composition de blocs rendue par le moteur de pages existant (`vitrine/rendu.js`), comme le mini-site du lot B. On y règle les couleurs, les fonds, les médias, la disposition, l'aperçu et l'enregistrement. Il n'y a pas de second système de composition.
3. **Vue 3D** du même modèle : ouvrir le cube en grand, le faire pivoter, cliquer sur une face. Ce qui est enregistré en 2D se voit en 3D.
4. **Blocs Timbre et Orbe** dans la face Identité. Le bloc Orbe reprend les réglages de la Régie et les composants de l'orbe, avec des préférences séparées des permissions.
5. **Réseau** : seules les facettes publiées (`publiques()`).
6. **Persistance serveur** du cube et de ses médias.
