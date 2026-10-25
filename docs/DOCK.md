# AIMESTUDIO · Le Dock par rôle

Brief de Matt du 23/10/2026. Complète l'audit des rôles (`docs/AUDIT-ROLES.md`, `docs/ROLES.md`). **Référence** pour toute la suite du dock.

## En bref

Un dock en bas d'écran remplace le menu burger, la cloche de notifications et les rangées de boutons. Il change selon le rôle : il ne contient que ce que la personne a le droit d'ouvrir. **Une entrée interdite n'est pas grisée, elle n'existe pas.**

Au centre, le **+** au contour irisé, le même que celui en haut à droite de lemondeaime.com : c'est l'orbe posée dans le dock. Un toucher ouvre, en menu radial autour d'elle, les actions que ce rôle peut faire. **Les entrées du dock sont des lieux (où aller) ; le + porte les gestes (quoi faire).**

Le dock est composé au serveur, comme les écrans : il applique la grammaire des rôles et les douze règles, sans second système de droits.

## Prérequis : les corrections (fait le 24/10/2026)

| Correction | Bloquant | PR |
|---|---|---|
| Règle 2 : les membres selon la portée (un invité ne reçoit que lui-même) | oui | #88 |
| Durée des rôles : date de fin, refus après échéance | oui | #90 (migration 2026-10-24-02) |
| Règle 11 : journal en ajout seul, lisible par la personne concernée | oui | #89 (migration 2026-10-24-01) |
| « Je vois un accès inattendu » | oui | #91 |
| Tests du socle en intégration continue, refus rôle × geste, deux projets | — | #87 |
| Dossiers servis (docs, db, tests, scripts) | — | #86 |
| Règle 5 : supprimer son compte ne détruit plus un espace partagé | — | #94 |
| Règle 8 : invitation sans adresse courte | — | #96 |
| Secret propre au direct | — | #95 (attend `LIVE_SECRET`) |
| `/v1/` et `/mariage` : liens coupés | — | #92 |
| Règle 12 : l'accueil ne renvoie plus vers des pages fermées | — | #93 |

## Les règles du dock

1. **Composé au serveur.** Le serveur envoie la liste des entrées et des actions pour la session, le projet et le rôle. Le navigateur affiche ce qu'il reçoit ; il ne décide jamais d'une entrée.
2. **Absent plutôt que grisé.** Une entrée ou une action non permise n'est ni envoyée, ni cachée, ni désactivée. Son nom ne figure nulle part dans la réponse.
3. **Quatre lieux au plus, plus le +.** Au-delà, le dock redevient un menu. Les autres lieux du rôle se rejoignent par « Projet » ou « Ma part », qui les liste.
4. **Lieux dans le dock, gestes dans le +.** Les actions du + sont exactement les gestes accordés au rôle (lire, répondre, déposer, modifier, inviter, payer, publier, supprimer, transmettre).
5. **Un seul élément irisé par écran : le +.** Le reste est noir et blanc. La couleur du rôle n'apparaît que dans la pastille de notifications.
6. **La pastille ne compte que ce qui est à soi.** Jamais un total qui révélerait ce qu'on ne voit pas. Pour un destinataire, silence par défaut.
7. **Toujours un texte sous l'icône.** Ni l'icône ni la couleur ne portent seules le sens.
8. **Jamais d'action au survol.** L'action part d'un geste volontaire (toucher, clic, Entrée).
9. **Les gestes sensibles ne sont jamais à un toucher.** Payer, supprimer, inviter, publier, transmettre ouvrent une confirmation lisible, une action à la fois, avec annulation.
10. **L'orbe propose, l'humain valide.** Une suggestion est marquée « proposé par l'orbe » et ne s'exécute jamais seule.
11. **Les données sensibles ont leur propre lieu.** Santé, mineurs, paiements, codes d'accès : jamais dans une entrée générale ni dans le texte d'une notification.
12. **Chaque ouverture et chaque retrait se voient.** Une entrée temporaire affiche sa date de fin ; un rôle retiré perd son dock à la requête suivante.

## Le vocabulaire des entrées

Un seul vocabulaire pour tout AIMESTUDIO. Un domaine peut renommer une entrée, pas en inventer une qui ne s'appuie sur aucun droit.

| Entrée | Ce qu'elle ouvre | Droit exigé |
|---|---|---|
| Notifications | Les messages et alertes de la personne, avec la pastille | Lire, sur sa propre portée |
| Messages | Les conversations où la personne est partie prenante | Répondre |
| Projet | La vue d'ensemble, qui liste les autres lieux du rôle | Lire, sur tout le projet |
| Ma part | La vue d'ensemble limitée à sa partie | Lire, sur une partie |
| Calendrier | Les dates et horaires qui la concernent | Lire |
| Tâches | Ce qu'elle doit faire, et ce qu'elle a assigné | Lire, modifier sa part |
| Documents | Les fichiers de sa portée, par adresses signées et courtes | Lire, déposer |
| Personnes | Invités, participants, équipe, selon la portée | Lire ; noms seulement si la portée les inclut |
| Effectif | Des totaux sans noms | Lire des totaux |
| Budget | Montants et statuts de paiement (jamais un numéro de carte) | Lire ; payer est un geste à part |
| Déroulé | Le programme minute par minute, le plan B | Lire, modifier si délégué |
| Mission | Créneaux, accès, contrat d'un contributeur | Lire, déposer |
| Programme | Le programme public | Lire |
| Ma réponse | Sa propre réponse, et seulement la sienne | Lire, répondre |
| Lieu | Adresse, accès, plan | Lire |
| Journal | Les décisions et gestes qui la concernent | Lire, jamais modifier |
| Signalements | Les signalements à traiter | Rôle de garant |
| Consentements | Qui a accepté quoi | Garant ou représentant |
| Réglages | Rôles, invitations, transmission | Propriétaire, ou délégué sur ce qui lui est délégué |

## Le dock des 14 familles

Un métier précis n'a pas son propre dock : il prend celui de sa famille, avec sa portée. Lecture de gauche à droite, le + au centre.

| Famille | Dock | Actions du + | Garde-fou |
|---|---|---|---|
| Propriétaire | Notifications · Messages · + · Projet · Calendrier | Inviter · Écrire · Ajouter une tâche · Publier | Transmettre et supprimer vivent dans Réglages, avec double validation |
| Co-propriétaire | Comme le propriétaire | Comme le propriétaire | Ne retire pas l'autre propriétaire seul ; aucune suppression sans les deux |
| Délégué | Notifications · Déroulé · + · Équipe · Plan B | Écrire à l'équipe · Modifier le déroulé · Activer le plan B · Inviter | Affiche « délégué jusqu'au … » ; n'invite qu'à un rôle inférieur ou égal ; jamais transmettre |
| Équipe | Notifications · Ma part · + · Messages · Calendrier | Ajouter une tâche · Écrire · Déposer | Aucun accès aux paiements par défaut |
| Contributeur, prestataire | Notifications · Mission · + · Documents · Messages | Déposer un document · Signaler un retard · Écrire à la coordination | Effectifs seulement, jamais la liste nominative |
| Destinataire | Programme · Ma réponse · + · Lieu · Messages | Confirmer ma présence · Écrire aux organisateurs · Signaler un accès inattendu | Ne voit que sa propre réponse ; aucun compteur de ce qui existe ailleurs |
| Public (sans compte) | Le cœur · Exemples · + · J'ai un compte | Créer un projet · J'ai reçu une invitation | Aucune donnée personnelle ; asymétrique, sans bouton fictif, en attendant la page Modules |
| Public connecté (hors projet) | AI · + · ME (25/10 ; avant : Le cœur · Exemples · + · Mes projets · Mon compte) | Nouveau projet · J'ai reçu une invitation | Aucune donnée d'un projet hors du projet ; symétrique |
| Financeur | Notifications · Budget financé · + · Justificatifs | Déposer un justificatif · Écrire au propriétaire | Voit des montants, pas les invités ; AIME ne garde que le statut des paiements |
| Contrôleur, observateur | Ce qu'il contrôle · + · Exports · Journal | Exporter · Demander une pièce | Lecture seule ; affiche « accès jusqu'au … » |
| Garant, modérateur | Signalements · + · Contenus publics · Journal | Masquer un contenu public · Répondre à un signalement | N'accède pas aux contenus privés par confort |
| Représentant légal | Le dock de la personne représentée + Consentements | Répondre pour … · Donner ou retirer un consentement | Toujours deux noms : qui agit, pour qui |
| Successeur | Avant activation : Ma désignation (lecture). Après : le dock du propriétaire | — avant activation | Activé par une procédure, jamais par un lien |
| Agent IA | Pas de dock | Vit dans le + de sa personne : « proposé par l'orbe » | Jamais plus de droits que sa personne ; aucun geste sensible seul |
| Système | Pas de dock | — | Apparaît seulement au Journal, sous son nom technique, jamais « admin » |

Deux rôles de demain : le **gardien des consentements** (famille Garant) a Signalements · + · Consentements · Journal, sans les contenus ; le **coordinateur de soins** (famille Contributeur) est le seul à voir une entrée « Accueil et besoins », dédiée, avec journal renforcé.

## Les cinq rôles serveur

Le dock se branche sur les rôles lus dans `space_members` (`api/_auth/espaces.mjs`, `synchroview/permissions.js`). La famille choisit le dock ; le rôle serveur reste la source.

| Rôle serveur | Famille | Dock | Point ouvert |
|---|---|---|---|
| owner | Propriétaire | Notifications · Messages · + · Projet · Calendrier | Co-propriétaire, successeur et transmission n'existent pas encore |
| editor | Délégué | Notifications · Déroulé · + · Équipe · Plan B | Durée : faite (#90) |
| contributor | Contributeur | Notifications · Mission · + · Documents · Messages | Portée par mission partielle |
| viewer | Contrôleur | Ce qu'il contrôle · + · Exports · Journal | Ne pas en faire une lecture générique ; durée : faite (#90) |
| guest | Destinataire | Programme · Ma réponse · + · Lieu · Messages | — |
| (sans session) | Public | Le cœur · Exemples · + · J'ai un compte | Navigation du site |
| (connecté, hors projet) | Public connecté | AI · + · ME | Dans un projet, le Dock que le serveur compose (`/api/page`) remplace celui-ci |

« Propriétaire du site » (`api/_auth/proprietaire.mjs`) est distinct d'un owner d'espace : il reçoit le dock de la Régie, jamais celui d'un projet client.

## Les instances

### Le mariage de la démo (Léa & Marc)

| Rôle | Famille | Dock | Actions du + |
|---|---|---|---|
| La mariée | Propriétaire | Notifications · Messages · + · Projet · Calendrier | Inviter · Écrire · Ajouter une tâche |
| Le marié | Co-propriétaire | Comme la mariée | Comme la mariée |
| Le témoin | Équipe | Notifications · Ma part · + · Messages · Surprise | Ajouter une tâche · Écrire aux témoins |
| L'invité | Destinataire | Programme · Ma réponse · + · Lieu · Messages | Confirmer ma présence · Écrire aux mariés |
| La coordination | Délégué | Notifications · Déroulé · + · Équipe · Plan B | Modifier le déroulé · Activer le plan B · Valider un remplaçant |
| Le traiteur | Contributeur | Notifications · Mission · + · Effectif · Documents | Signaler un retard · Déposer un document |
| Le DJ | Contributeur | Notifications · Mission · + · Horaires · Documents | Signaler un retard · Déposer la playlist |
| Le photographe | Contributeur | Notifications · Mission · + · Accès · Documents | Signaler un retard · Annuler (avec confirmation) |
| Les parents qui participent | Financeur | Notifications · Budget financé · + · Justificatifs | Déposer un justificatif |

L'entrée « Surprise » du témoin est le cas d'école : elle n'existe ni dans le dock de la mariée, ni dans la réponse du serveur qui lui est envoyée.

### La Régie (propriétaire du site)

| Rôle | Famille | Dock | Actions du + |
|---|---|---|---|
| Propriétaire du site | Propriétaire | Pages · Réalisations · + · Orbe · Entreprise | Publier · Restaurer · Ajouter une réalisation |
| Gestion de l'entreprise | Propriétaire, sous-espace sensible | Devis · Factures · + · Clients · Avoirs | Émettre un devis · Émettre une facture · Exporter |
| Collaborateur | Délégué | Réalisations · Textes · + · Médias | Proposer une modification · Déposer un média ; jamais la compta |
| Expert-comptable | Contrôleur | Comptabilité · + · Exports | Exporter |
| Client | Destinataire | Mon devis · Ma facture · + | Accepter le devis · Écrire |
| Visiteur | Public | Navigation du site publié | Faire taire l'orbe |

Tant que la Régie n'a pas de connexion, ces docks restent **décrits, pas branchés** : afficher le dock du propriétaire à quiconque ouvre /regie/ serait précisément la faille relevée par l'audit.

### Le Studio

| Rôle | Famille | Dock | Actions du + |
|---|---|---|---|
| Auteur | Propriétaire | Supports · Messages · + · Projet · Calendrier | Créer un support · Envoyer en relecture · Envoyer le bon à tirer |
| Client commanditaire | Propriétaire (validation) | Bon à tirer · Messages · + | Valider le bon à tirer (daté, journalisé) · Demander une correction |
| Relecteur | Contrôleur | À relire · + · Journal | Annoter |
| Imprimeur | Contributeur | Fichiers · Quantités · + | Confirmer l'impression · Signaler un problème |
| Destinataire d'un support | Destinataire | Mon support · + | — (lecture), par lien personnel à usage limité |
| Personne badgée | Destinataire | Mes pointages · + | Pointer |
| Responsable des pointages | Délégué | Pointages du groupe · + · Exports | Exporter (avec durée de conservation affichée) |
| Auteur d'un avis | Destinataire | Mon avis · + | Déposer un avis ; aucun avis inventé présenté comme réel |
| Écriture assistée | Agent IA | Dans le + de l'auteur | Proposer un texte, signalé ; l'auteur valide |

## États et cas particuliers

| Situation | Ce que montre le dock |
|---|---|
| Invité mais pas encore entré | Un seul + : « Rejoindre ». Rien d'autre tant que le lien n'est pas accepté |
| Ancien membre | Aucun dock. « Votre accès a pris fin » ; son nom reste au journal de ce qu'il a fait |
| Ouverture temporaire | L'entrée apparaît avec sa date ou son heure de fin, puis disparaît seule ; ouverture et fermeture au journal |
| Plusieurs rôles, plusieurs projets | Un dock par projet ; jamais de fusion des droits |
| Représentant légal | Le dock de la personne représentée, « Pour [prénom] » en tête, et Consentements |
| Agent IA | Pas de dock ; ses suggestions dans le + de sa personne, une à la fois |
| Accès inattendu | Dans tous les docks avec session, « Je vois un accès inattendu » est dans le + (route : #91) |
| Démonstration | Le dock porte « Démonstration » tant que les rôles ne sont pas vérifiés au serveur |

## Comportement, accessibilité, apparence

**Comportement**
- Un toucher sur une entrée ouvre son lieu ; l'entrée active est marquée.
- Un toucher sur le + ouvre le radial, quatre actions au plus ; le + tourne en × ; Échap ou un toucher à côté ferme.
- La pastille monte à chaque notification et redescend à l'ouverture ; son et vibration suivent la sonnerie du rôle.
- Téléphone : fixé en bas, au-dessus de `env(safe-area-inset-bottom)`. Ordinateur : flottant en bas au centre ; le + en haut à droite est le même composant.

**Accessibilité (EAA, WCAG 2.2 AA)**
- Une `nav` nommée (« Navigation de [rôle] ») ; l'entrée courante porte `aria-current="page"`.
- Le + : bouton `aria-haspopup="menu"` et `aria-expanded` ; le radial est un vrai `role="menu"`, parcourable aux flèches, fermé par Échap, focus rendu au +.
- Cibles de 44 px au moins ; focus visible ; texte sous chaque icône ; pastille annoncée (« 3 notifications »).
- Mouvement réduit : radial sans animation, aimantation coupée.

**Apparence**
- Fond `#0F0F12`, bordure 1 px `#2B2B33`, grands rayons ; icônes au trait 1,5 px `#EDEDF0` ; libellés Inter 500, 11 px, `#9C9CA8`, l'actif `#EDEDF0`.
- Le + : anneau `conic-gradient(#FB7185, #F59E0B, #7C5CFF, #22D3EE, #FB7185)`, centre sombre, signe clair ; seul élément irisé de l'écran.
- La pastille prend la couleur du rôle (`coeur/roles.js`), chiffre en `#141416`.
- Le radial : pastilles sombres, libellé Inter, en arc au-dessus du + ; une suggestion de l'orbe porte un point irisé et « proposé par l'orbe ».

## Fait le 24/10/2026 : le modèle et le composant (étape 3)

Décisions de Matt : **sur ordinateur, le dock flotte en bas au centre** ; **le dock remplace la navigation des pages publiques, partout** (dock de la famille Public).

- `dock/modele.js` (`AIMEDock`) : le modèle **pur**, le même au navigateur et, demain, au serveur. Les tables de ce document y sont écrites telles quelles : vocabulaire des entrées (chacune avec son droit), actions du + (chacune avec son geste), dock des 14 familles, rôle serveur → famille, instances (mariage, Régie, Studio). `composer(demande)` rend la composition ; une entrée ou une action non permise n'y figure pas, même en texte. `pourScenario(univers, rôle, accès)` choisit l'instance écrite, sinon la famille du scénario, sinon le rôle serveur.
- `dock/dock.js` (`AIMEDockVue`) et `dock/dock.css` : le composant. Il affiche la composition, ne décide de rien. Accessibilité : `nav` nommée, `aria-current`, + en `aria-haspopup="menu"`, menu aux flèches, Échap, focus rendu, cibles de 44 px, texte sous chaque icône, pastille annoncée. Gestes sensibles : confirmation lisible, annulation. Un seul élément irisé : le +.
- Posé sur **l'accueil** et **les exemples** (dock Public ; voir « Le Dock public et le + » plus bas, qui remplace la première version : Lab et « Commencer » sont retirés) et **dans chaque écran du cœur** (`coeur/coeur.js`) : chaque rôle de chaque exemple a son dock, dessiné à la taille d'un téléphone puis réduit avec l'écran, marqué « Démonstration ». L'orbe de la Régie et l'écriture assistée du Studio n'ont pas de dock (famille Agent IA).
- **Familles proposées, à confirmer** (aucun dock écrit pour ces rôles) : G44 agent et formateur → Équipe, responsable → Délégué, contrôleur → Contrôleur ; Stitch créatrice → Propriétaire, boutique → Délégué, brodeuse → Destinataire, visiteuse → Public ; Magazine autrice → Équipe, rédactrice en chef → Propriétaire, maquettiste → Contributeur, lectrice → Public. Le dock l'affiche (« Famille proposée »).
- Tests : `tests/dock.test.cjs` (instantané par rôle serveur, invitée sans Budget ni Personnes, Surprise du témoin, pastille, limites, gestes sensibles, rôle retiré, date de fin, chaque rôle de chaque scénario).

Reste : l'étape 2 (le contrat serveur, `GET /api/dock` composé depuis `space_members` avec ce même modèle), puis l'étape 4 (le mariage de preuve dans un vrai espace), et le dock Public sur les autres pages publiques.

## Le Dock public et le + (décision de Matt du 24/10/2026, #115)

**Le Dock garde les lieux, le + garde les actions.** Aucune destination du Dock dans le + (ni compte, ni exemples, ni Mes projets), aucune entrée en double.

| Situation | Dock | Le + |
|---|---|---|
| Sans compte | Le cœur · Exemples · + · J'ai un compte | Créer un projet · J'ai reçu une invitation |
| Connecté, hors projet | AI · + · ME (décision du 25/10, docs/AI.md) | Nouveau projet · J'ai reçu une invitation |
| Dans un projet | Le Dock composé par le serveur pour le rôle (`/api/page`, `composerReel`) : Mon accès · Journal · Personnes | Les seuls gestes accordés au rôle (Inviter, s'il est permis) |
| Plus tard, avec la page Modules (pas maintenant) | Le cœur · Exemples · + · Modules · Compte | La place de Mes projets sera décidée à ce moment-là |

- **Plus de « Commencer » seul** : il faisait doublon et paraissait posé là. Le + public est une petite carte au-dessus du Dock : fond sombre, coins arrondis, léger contour, deux gestes côte à côte. C'est un groupe de boutons et un champ (`role="group"`), pas un menu ; dans un projet, le menu des gestes reste un `role="menu"` parcourable aux flèches.
- **Créer un projet** fait défiler jusqu'à « Je suis… » et ouvre la liste quand le navigateur le permet ; ailleurs, mène à `/?commencer=1`.
- **Nouveau projet** ouvre la création de Mes projets (`/projets/?nouveau=1`), avec la seule fonction de création (`compte/creer.js`, `AIMECreer`).
- **J'ai reçu une invitation** ouvre un champ : « Ouvrez le lien reçu par e-mail ou par message. » Seul un lien `/projets/` ou `/compte/` portant un jeton valide (ou le jeton seul) est suivi, vers `/projets/?invitation=…` ; sans session, la personne se connecte et le parcours reprend sur l'invitation. Le serveur vérifie tout.
- **Fermeture** : Échap (le focus revient au +), retoucher le +, toucher ailleurs, ou quitter la carte au clavier. Ouverture douce, sans animation en mouvement réduit. Rien ne passe sous le Dock en 393×659.
- **Se déconnecter** vit dans Mon compte, plus dans le +.
- Fichiers : `dock/modele.js` (familles « Public » et « Public connecté », actions `creerProjet`, `nouveauProjet`, `invitationRecue`), `dock/dock.js` (la carte et son champ), `dock/plus.js` (lit `/api/identite`, repose le Dock une fois connecté, rend les deux gestes vivants). Tests : `tests/dock.test.cjs`, `tests/navigateur/parcours.cjs`.

## Ce qui se construit, dans l'ordre (une petite PR par étape)

1. **Documenter** : ce fichier, et la table famille → dock dans `docs/AUDIT-ROLES.md`. Aucun code.
2. **Le contrat serveur** : une réponse dock composée pour la session, le projet et le rôle (entrées, actions du +, pastille), à partir de `permissions.js`. Le rôle n'est jamais lu depuis la requête.
3. **Le composant** : un seul composant Dock, le + partagé avec celui du haut à droite. D'abord le parcours public, puis un espace de démonstration.
4. **Le mariage de preuve** : les docks des rôles du mariage, branchés sur `space_members`.
5. **Régie et Studio** : seulement après leur passage derrière un vrai contrôle d'accès.

## Tests qui font la preuve

- [ ] Pour chaque rôle serveur, un instantané de la réponse dock ; toute entrée ajoutée ou retirée fait échouer le test.
- [ ] La réponse d'un guest ne contient ni « Budget », ni « Personnes », ni aucun nom d'entrée interdite, même en texte.
- [ ] La réponse de la mariée ne contient pas « Surprise » ; celle du témoin, si.
- [ ] La pastille d'un destinataire ne compte que ses propres notifications.
- [ ] Une action du + interdite appelée directement à l'API est refusée.
- [ ] Après retrait d'un rôle, la requête suivante ne renvoie plus de dock.
- [ ] Une entrée temporaire disparaît après sa date de fin, et les deux événements sont au journal.
- [ ] Le dock se parcourt au clavier et au lecteur d'écran, radial compris.

## Questions ouvertes

- [x] Le dock remplace-t-il aussi la navigation des pages publiques ? **Oui, partout** (Matt, 24/10).
- [ ] Le témoin : famille Équipe, ou Délégué borné à la surprise ?
- [ ] Le marié : co-propriétaire dès la création, ou invité par la mariée ?
- [ ] Les parents qui financent : rôle Financeur dès la première version, ou plus tard ?
- [x] Sur ordinateur : **dock flottant en bas** (Matt, 24/10).
