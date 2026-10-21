# Point Zéro (`/point-zero/`, et l'accueil de `/bureau/`)

Le bureau ne commence pas par une app à choisir, mais par une matière à déposer.

## Ce qu'on voit
- **Au centre, le point zéro** (l'orbe AIME). Un clic ouvre le dépôt : texte libre (intention, demande, notes, description, éléments en vrac), fichiers glissés, choisis ou collés.
- **Autour, six formes** (`zero/formes.js`, le même module que la métamorphose de la Page Zéro) : **Point** (tout ce qui est entré), **Ligne** (les dates en jalons), **Relation** (personnes, adresses, liens, et ce qui les relie), **Grille** (thèmes × natures), **Composition** (un premier brouillon à copier ou télécharger en .md), **Projet** (des dossiers par thème, avec prochaine date, personnes, montants, et « Créer un espace pour ce projet » qui ouvre `/compte/?nouvel=…`).
- Au dépôt, un point part du centre vers chaque forme touchée. En mouvement réduit, il n'y a pas de trajet : la forme s'allume.
- Sur téléphone, le point est en haut et les six formes en grille dessous. La lecture d'une forme s'ouvre en panneau à droite, ou par le bas sur téléphone.

## La lecture (`pointzero/analyse.js`, testée)
Ce sont des règles lisibles, sans IA et sans appel extérieur. Le navigateur et le serveur appliquent les mêmes.
- **Genre** : intention (« je veux », « objectif »…), demande (« peux-tu », « ? »…), liste (3 puces ou plus), description (texte long), note, fichier.
- **Dates** : `2027-06-14`, `14/06/2027`, `05/11` (la prochaine occurrence), `14 juin 2027`, `3 novembre`. Les dates impossibles sont ignorées.
- **Personnes** : « Léa & Marc », « Prénom Nom » ailleurs qu'en tête de phrase, « avec Camille ». C'est heuristique : un nom en tout début de texte peut échapper.
- **Adresses e-mail, liens, téléphones, montants.**
- **Thèmes** : événement, site, identité, documents, contenus, produit, budget.

## Où vit la matière
- **Connecté** : les textes sont sur le compte, table `matiere` (`db/migrations/2026-10-22-matiere.sql`), via `POST /api/matiere` (`liste`, `ajouter`, `importer`, `supprimer`). L'API exige la session, refait l'analyse côté serveur, plafonne à 20 000 caractères par texte et 500 éléments par personne, et chacun ne supprime que sa propre matière.
- **Non connecté** : les textes restent dans ce navigateur (`localStorage` « aime-point-zero »). Une fois connecté, un bouton les range sur le compte.
- **Fichiers** : toujours sur l'appareil (IndexedDB « aime-point-zero »), jamais envoyés. Les fichiers texte (.txt, .md, .csv…) sont lus localement pour l'analyse.
- **Supprimer son compte** efface aussi sa matière (`effacerTraces`).

## Mise en place
Lancer `db/migrations/2026-10-22-matiere.sql` sur chaque base : preview, puis production. Sans la table, l'API répond 503 et la matière reste dans le navigateur.
