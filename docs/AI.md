# AI, mon environnement (PR 1 de l'architecture de convergence AI + ME)

Décision de Matt du 25/10/2026. Référence : le document « AIME — AI + ME : architecture de convergence ».

## Ce qui change

- **Dock connecté, hors projet : AI · + · ME.** AI mène à `/projets/`, ME à `/compte/` : les adresses d'avant.
  « Le cœur » et « Exemples » quittent le Dock connecté. Ils restent dans le Dock public. Les exemples restent à un clic
  depuis AI (« les exemples », « toutes les capacités »), depuis l'accueil et depuis l'Atlas. Le Dock d'un projet ne change pas.
- **AI** (`/projets/`) :
  - « À traiter » : les demandes reçues. Seulement pour qui en reçoit (propriétaire du site, `/api/demandes`) ; la section
    n'existe pas pour les autres.
  - **Mes programmes** : synthèse des programmes Temps actifs, regroupés par projet. `GET /api/temps?resume=1` les recalcule
    pour la personne connectée avec les mêmes règles serveur que chaque programme ; aucun champ caché n'est ajouté et aucune
    date n'est inventée. Quand une date de Jour J a été fixée (migration 08, propriétaire du projet), la carte l'affiche en
    toutes lettres ; sans date, elle dit « Jour J ». Chaque projet ouvre directement Programme ou Circle.
  - Mes projets et participations, « Sur cet appareil » (les activités sont dans ME, PR 3).
- **Le détail d'une demande** (`/projets/?demande=<clé>`) : le message, les deux statuts (la demande, l'e-mail), la note privée,
  « Renvoyer l'e-mail » après un échec, l'historique. Ouvrir une demande nouvelle la marque « lue » au serveur.
- **Sans rechargement.** Ouvrir un projet, une demande, revenir à AI, changer de projet : un seul écran. Chaque passage est une
  entrée d'historique : Retour et Suivant marchent.
- **Barre de contexte** dans un projet : « ← AI » et « Changer de projet ».

## Aucune fuite entre contextes

Chaque contexte (un projet, une demande, la liste) a sa génération. Toute réponse d'une génération passée est ignorée. L'écran quitté
est vidé avant que le suivant ne réponde. Le module Temps s'arrête (`arreter`). Les annonces (`aria-live`) ne s'affichent que dans le
contexte qui les a produites. Le parcours `tests/navigateur/ai.cjs` le prouve en retardant volontairement la réponse d'un projet A
pendant qu'on ouvre B, puis pendant qu'on revient à AI.

## Demande → projet (PR 2)

- Une demande ouverte, pas encore transformée : le + du Dock ajoute **« En faire un projet »**, et rien d'un autre contexte.
- Le geste ouvre une **confirmation** dans la demande. Le nom (« Mariage · Léa Fictive ») et le domaine sont préremplis par le lecteur
  d'intention (`projets/intention.js`) ; tout reste modifiable. Rien n'est créé avant « Créer le projet ».
- Le serveur (`POST /api/demandes { action: 'convertir' }`, propriétaire du site seulement, 404 sinon) crée le projet avec la
  fonction de création existante (`espaces.creer`) au nom de la personne connectée, qui en est propriétaire.
- **Un seul projet par demande** : `spaces.data.origine = demande-<clé>` et son index unique (migration 03). Rejouer le geste rouvre
  le même projet. **Aucune migration nouvelle.**
- **Rien de personnel n'est copié** dans le projet : seulement le nom et le domaine. Les coordonnées et le message restent dans la
  demande.
- La demande passe à « Transformée en projet ». Son historique garde l'identifiant du projet, et son détail mène au projet
  (« Ouvrir le projet »).
- Le projet s'ouvre aussitôt, sans rechargement, avec le Dock que le serveur compose pour son propriétaire.

## ME v0 (PR 3)

- **ME** (`/compte/`, l'adresse d'avant) réunit ce qui existait sur deux écrans : le Timbre (photo, nom), **mes activités** (déplacées
  d'AI vers ME : elles disent ce que je suis), les clés d'accès, la déconnexion, la suppression du compte. Rien n'est retiré de
  « Mon compte ».
- « Découvrir AIME » : Le cœur, les exemples et toutes les capacités, qui ont quitté le Dock connecté, restent à un clic depuis ME.
- **Ma Carte** : sur cet appareil (`aime-carte`) **et sur le compte**, avec un accord explicite et daté (docs/CARTE.md § 5, PR P1).
  Les rubriques et leurs visibilités sont enregistrées ; la photo et les relations restent sur l'appareil. Un conflit entre deux
  appareils ne s'écrase pas : on choisit la version à garder (409). ME porte aussi le lien public révocable et son compteur
  d'ouvertures (P2), « Recevoir des demandes par ce lien » (P3) et jusqu'à six questions personnelles (P5).
- Corrigé au passage : sur iPhone, le bloc du Timbre débordait de 43 px (une colonne réduite à 158 px pour un champ de 200 px).
- **Aucune donnée nouvelle au serveur, aucune migration.**

## Avant la connexion (25/10)

- **AI et ME ont un contenu dès l'arrivée**, même sans compte : `compte/decouverte.js` écrit ce que l'écran réunit, avec
  un état par carte et des liens réels. Le contenu est posé **avant** l'appel de session et reste quand la réponse est
  401, quand les comptes ne sont pas ouverts (503) ou quand le serveur ne répond pas ; la seule issue qui le retire est
  une session ouverte, qui cède la place à l'écran de la personne.
- **Rien n'est présenté comme disponible à tort** : « L'agent AIME » est « En préparation » et le dit (« l'agent qui les
  exécute n'est pas branché ») ; aucun registre public n'est annoncé, puisque aucun n'existe ; la Carte dit « sans la photo
  ni les relations » ; la durée des demandes (24 mois) est celle du code.
- **ME a son nom dès l'arrivée** (titre « ME »), au lieu de « Mon compte » jusqu'à la connexion.
- **Le menu de ME, en clair** : six boutons sous le Timbre — Modifier ma Carte · Ajouter une activité · Partager ma Carte ·
  Exporter ma Carte · Mes clés d'accès · Mes questions — qui passent tous par la même fonction que le + du Dock et mettent
  le focus à leur place. « Exporter ma Carte » fabrique un fichier JSON dans le navigateur, sans aucun appel serveur.
- Tests : `tests/decouverte.test.cjs` (les deux écrans, les états, les liens réels, l'ordre « contenu avant session »,
  les quatre issues, le menu de ME) et la vérification jsdom hors dépôt (401, 503, serveur injoignable, connecté, export).

## Ce qui n'est pas fait ici

- Les invitations reçues ne sont pas listées dans AI : elles arrivent par un lien (« J'ai reçu une invitation » dans le +).
  Les lister demanderait de les rattacher à une adresse au serveur : une évolution à part.

## Tests

- `tests/navigateur/ai.cjs` (CI, contrôle « Parcours Temps (navigateur et base) ») : visiteur → Contact → demande en base ; propriétaire
  → AI → détail → Retour ; projet créé et ouvert sans rechargement ; changement de projet ; réponses dans le désordre ignorées ;
  persistance après rechargement ; une invitée : sa perspective, ni « À traiter » ni accès aux demandes (404) ; iPhone et ordinateur ;
  axe-core WCAG 2.2 AA.
- `tests/ai.test.cjs` : le Dock AI · + · ME, les gardes de génération, aucun HTML venu du serveur.
