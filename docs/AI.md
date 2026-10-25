# AI, mon environnement (PR 1 de l'architecture de convergence AI + ME)

Décision de Matt du 25/10/2026. Référence : le document « AIME — AI + ME : architecture de convergence ».

## Ce qui change

- **Dock connecté, hors projet : AI · + · ME.** AI mène à `/projets/`, ME à `/compte/` : les adresses d'avant.
  « Le cœur » et « Exemples » quittent le Dock connecté. Ils restent dans le Dock public. Les exemples restent à un clic
  depuis AI (« les exemples », « toutes les capacités »), depuis l'accueil et depuis l'Atlas. Le Dock d'un projet ne change pas.
- **AI** (`/projets/`) :
  - « À traiter » : les demandes reçues. Seulement pour qui en reçoit (propriétaire du site, `/api/demandes`) ; la section
    n'existe pas pour les autres.
  - Mes projets et participations, mes activités, « Sur cet appareil ».
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

## Ce qui n'est pas fait ici

- « Créer un projet depuis cette demande » : PR 2.
- ME v0 (Timbre, activités, sécurité du compte réunis) : PR 3. ME ouvre aujourd'hui « Mon compte ».
- Les invitations reçues ne sont pas listées dans AI : elles arrivent par un lien (« J'ai reçu une invitation » dans le +).
  Les lister demanderait de les rattacher à une adresse au serveur : une évolution à part.

## Tests

- `tests/navigateur/ai.cjs` (CI, contrôle « Parcours Temps (navigateur et base) ») : visiteur → Contact → demande en base ; propriétaire
  → AI → détail → Retour ; projet créé et ouvert sans rechargement ; changement de projet ; réponses dans le désordre ignorées ;
  persistance après rechargement ; une invitée : sa perspective, ni « À traiter » ni accès aux demandes (404) ; iPhone et ordinateur ;
  axe-core WCAG 2.2 AA.
- `tests/ai.test.cjs` : le Dock AI · + · ME, les gardes de génération, aucun HTML venu du serveur.
