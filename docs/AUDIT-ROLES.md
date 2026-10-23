# AIMESTUDIO · Audit des rôles : état du site

Commencé le 23/10/2026, sur `main` (après les PR #82 et #83) et sur www.lemondeaime.com.
Mesuré contre, dans cet ordre : l'audit des rôles (`docs/ROLES.md`), `docs/ORBE.md`, la page « L'Orbe, la matière des permissions ».

**Cet audit ne corrige rien.** Les corrections viennent ensuite, une PR chacune, après validation de Matt.

Statuts des éléments : **en production**, **démonstration**, **abandonné**, **inconnu**.
Statuts des règles : **conforme**, **partiel**, **non conforme**, **non vérifié**.
Niveaux des constats : **urgent à vérifier**, **priorité élevée**, **à vérifier**, **contexte**.
Un motif dans le code est un indice, pas un verdict. Aucun test n'a utilisé le compte d'une vraie personne : les essais en production ont été faits **sans session**.

| Lot | Contenu | État |
|---|---|---|
| 1 | Inventaire, et la vérification de la Régie | **validé le 24/10/2026** |
| 2 | Grille des douze règles, les huit failles, avec preuves | à faire après validation |
| 3 | Chaque rôle décrit avec les six dimensions | à faire |
| 4 | Rapport complet (sections 1, 2, 9, 10) et `docs/ORBE-EXTENSION.md` | à faire |

---

## 0. Avant tout : la Régie

> Question du rapport : « publier » ou « restaurer » écrivent-ils sur le serveur sans contrôle ?

**Réponse : non. Aucune écriture serveur.** Niveau : **contexte** (aucune faille), avec deux points **à vérifier**.

| Geste | Ce qu'il fait réellement | Preuve |
|---|---|---|
| Publier | Télécharge `site.json` (et un zip des médias) ; Matt le dépose dans le dépôt, Vercel déploie. Aucun envoi réseau | `regie/regie.js:3-6`, `:414`, `:425` |
| Restaurer une sauvegarde | Lit un fichier choisi sur l'appareil et l'écrit dans le navigateur (localStorage) | `regie/regie.js:411`, `:420` |
| Effacer le brouillon | Remet la version publiée dans le navigateur | `regie/regie.js:416` |
| Comptabilité | localStorage `aime-regie-compta`, jamais envoyée ; sort seulement par une sauvegarde téléchargée | `regie/regie.js:5`, `:417` |
| Lectures réseau | `/regie/site.json` (public, la version publiée), `/sites/bibliotheque/…` | `regie/regie.js:51`, `:432` ; `regie/scene.js:215` |

Essais en production, sans session (23/10/2026) :

| Requête | Réponse |
|---|---|
| `GET /regie/` | 200 : la page est servie à tous ; un visiteur n'y voit que son propre navigateur, vide |
| `POST /regie/site.json` | 405 |
| `PUT /regie/site.json` | 405 |

Ce qui reste à noter :
- **À vérifier · priorité élevée.** La Régie garde dans le navigateur le SIREN, le SIRET, l'IBAN, le BIC et les fiches clients (`regie/donnees.js:115`, `:118` ; `regie/regie.js:307-310`). C'est le seul endroit où ces données existent. Sur un appareil partagé, tout utilisateur du navigateur les lit. Le bandeau « pas protégée par un compte » est en ligne depuis la PR #82.
- **Contexte.** Le menu ne montre la Régie qu'au propriétaire (`os/apps.js:12`, `reserve:true`, décidé par `/api/identite`). C'est un rangement, pas une protection, et le commentaire le dit (`os/apps.js:14`).

---

## 3. Inventaire

### 3.1 Pages publiques et espaces

44 pages HTML, plus 6 alias du Studio et les pages `/travaux/` rendues par une fonction serveur. « Compte » : *aucun*, *optionnel*, *requis (serveur)* ou *masqué côté client seulement*.

| Adresse | Rôle de la page | Données | Compte | Dit « démonstration » | Statut |
|---|---|---|---|---|---|
| `/` | Accueil, le cœur (4 rôles), contact | Scénario fictif `vitrine/scenarios/mariage.json` ; contact → `/api/contact` | optionnel | oui (`index.html:314`) | en production |
| `/exemples/` (`?u=world`, `seminaire`, `g44`, `stitch`, `magazine`, `regie`, `studio`) | Le cœur avec 4 à 9 rôles | Scénarios fictifs | aucun | oui, dans chaque tableau des droits | démonstration |
| `/aime/` | Grande vitrine, cube, orbe | localStorage `aime-mem`, `aime-carte`, `aime-cube:<id>` | optionnel | non trouvé | en production |
| `/bureau/` | Le Bureau (coque OS) | Lit les clés du navigateur ; `aime-os` | optionnel ; la Régie y est **masquée côté client seulement** | non | en production |
| `/bureau/espace/` | Sauvegarder et restaurer ce navigateur | Toutes les clés locales, export JSON | aucun | non | en production |
| `/compte/` | Compte, espaces, invitations, clés d'accès | `/api/auth/*`, `/api/espaces` | **requis (serveur)** | non | en production (expérimental) |
| `/confidentialite/` | Politique de confidentialité | aucune | aucun | — | en production |
| `/live/` | Jour J en direct | Démo : fichiers fictifs + `aime-live:<espace>`. Espace réel : `/api/live/*` | démo : aucun ; espace réel : **requis (serveur)** | oui | démonstration (+ espaces réels) |
| `/synchroview/`, `/synchroview/demo/` | Comparateur de perspectives, démo des droits serveur | `/api/sv/*` | page **masquée côté client** ; API fermée au serveur (404) sauf propriétaire | oui (`demo:48`) | démonstration réservée |
| `/vitrine/world/`, `/vitrine/site/?u=…` | Démonstrateurs d'événement | Fictives ; `aime-sim-*` ; `/api/sv/world` (404 en production) | aucun | oui | démonstration |
| `/canevas/`, `/sites/`, `/sites/vue/` | Édition de sites | localStorage `aime-canevas`, `aime-sites`, `echos:v2` | aucun | modèles marqués fictifs | en production (expérimental) |
| `/studio/` (+ `/web`, `/docs`, `/buro`, `/image`, `/accessibilite`, `/stitchlab`) | Studio de supports, badgeuse, avis | localStorage `aime-app`, `echos:*`, `aime:pointage`, `aime:avis`, `aime-avis` | aucun (bandeau, PR #83) | non | en production |
| `/stitch/` et ses pages | Boutique et atelier de patrons | `stitch/data/*.json` ; `stitch-*` | aucun | oui (`stitch:64`) | en production |
| `/g44/` | Laboratoire G44 | Fictives ; `g44-kit` | aucun (règles dans le navigateur, et dit) | oui | démonstration |
| `/regie/` | Site et gestion de l'entreprise | localStorage `aime-regie-brouillon`, `aime-regie-compta` ; IndexedDB `aime-regie` | **aucun** ; masquée du menu côté client | non, mais bandeau « pas protégée par un compte » | en production (propriétaire de fait) |
| `/maitre/` | Cube Maître | `/api/health`, `/api/identite`, `/api/maitre` | facette Comptes **requise (serveur)** : 404 sinon | non | en production (expérimental) |
| `/cube/` | Cube personnel | `aime-cube:<id>` | optionnel | non | en production |
| `/point-zero/`, `/projet/` | Dépôt de matière, mini-site | Avec compte : `/api/matiere`, `/api/remontee` ; sinon `aime-point-zero` | optionnel | non | en production (expérimental) |
| `/reseau/` | Facettes et modules | `aime-point-zero`, `aime-sites` | optionnel | oui | démonstration |
| `/publication/`, `/magazine/*` | Lecteur et magazine statique | Exemple livré | aucun | partiel | `/magazine/` : inconnu (aucun lien de navigation) |
| `/infinity/`, `/lab/orb/`, `/lab/cartes/`, `/lab/grande-partition/`, `/sante/`, `/tout/` | Jeux et laboratoires | Locales ou fictives | aucun | oui pour les labs | en production (expérimental) |
| `/v1/` | Ancienne app de planning | Invités, allergies (« privé »), paiements, pointages, avis : localStorage `jourj-plan-v5`, `aime-app-ev-*` | aucun | non | **abandonné** (décision du 24/10) |
| `/mariage` | AIME Wedding en une page | Invités, tables, budget : `aime-wedding-ligne:v1` | aucun | non | **abandonné** (décision du 24/10) |
| `/stitch/outils/generer` | Génère le catalogue | `dmc.json` | aucun | — | abandonné (outil interne non lié) |
| `/travaux/`, `/travaux/<projet>/` | Portfolio rendu au serveur depuis `regie/site.json` | La version publiée seulement | aucun | — | en production |
| `/zero`, `/monde/*`, `/lab/site/*`, `/lab/socle/*`, `/lab/orb/naissance/*` | Redirections (`vercel.json`) | — | — | — | abandonné |

**Contexte.** Le dépôt est public sur GitHub, et le site sert aussi `docs/`, `db/schema.sql`, `tests/` et `scripts/` (200 en production). Rien de neuf n'est donc exposé, et ce fichier d'audit est public : il ne donne que des statuts pour les constats ouverts.

### 3.2 Routes serveur (fonctions Vercel)

Toutes les routes répondent `Cache-Control: no-store`, sauf `/travaux/` (public, contenu publié).

| Route | Méthode | Entrée | Qui est l'appelant | Contrôle du rôle | Filtre par projet | Essai en production sans session |
|---|---|---|---|---|---|---|
| `/api/auth/*` (`api/comptes.mjs`) | toutes | Better Auth | cookie de session | — | — | `get-session` : `null` |
| `/api/espaces` (`api/espaces.mjs`, `api/_auth/espaces.mjs`) | POST | `{action, espace, …}` | session vérifiée, jamais le corps (`auth.mjs:100-105`) | rôle relu dans `space_members` à chaque appel, puis `AIMEPerms.can` (`_auth/espaces.mjs:21-32`) | oui : `where space_id = $1` partout | 401 |
| `/api/identite` | GET, POST | `{action}` | session | propriétaire : liste serveur `AIME_PROPRIETAIRES` | — (ses propres données) | 200 `connecte:false` |
| `/api/matiere` | POST | `{action, texte…}` | session | ses propres lignes (`user_id = $1`) | — | 401 |
| `/api/remontee` | POST | `{projet}` | session | — (envoie un e-mail à AIME) | — | 401 |
| `/api/maitre` | GET | — | session + propriétaire | `AIME_PROPRIETAIRES` | — (des totaux seulement) | 404 |
| `/api/live/passe`, `/journal`, `/act` | POST | `{espace}`, `{passe, depuis}`, `{passe, action, p}` | espace réel : session, puis laissez-passer signé 12 h | membres relus dans la base à chaque appel (`_live/core.js:20-28`) ; action rejouée avec les règles | oui | 503, 401 |
| `/api/sv/check`, `/act`, `/tx` | POST | `{identity, …}` identités fictives | identité de test | règles serveur ; **en production : propriétaire seulement** | une ressource fictive | 404 |
| `/api/sv/world` | POST | `{journal, qui, action}` | identité de test | règles serveur ; **fermée en production** | fictif | 404 |
| `/api/contact` | POST | formulaire | anonyme | — ; même origine, taille bornée, limite par IP | — | non testé (enverrait un e-mail) |
| `/api/travaux` | GET | `?p=` | anonyme | — ; seulement le publié | — | 200 |
| `/api/health` | GET | — | anonyme | — ; aucune donnée | — | 200 |

**Import d'adresse (SSRF) :** aucune route serveur ne va chercher une adresse fournie par l'utilisateur. Les seuls appels sortants sont vers Resend (e-mails), avec une adresse fixe (`api/_auth/auth.mjs`, fonction `envoyer`).

### 3.3 Moteurs

| Moteur | Ce qu'il décide | Où il tourne |
|---|---|---|
| `synchroview/permissions.js` (AIMEPerms) | Les droits des espaces : `space`, `event`, `document`, `personal`, `summary`, `item`, `mission`, `candidature`, `payment` ; refus par défaut (`can()`) | **serveur** (`api/_auth/espaces.mjs`, `api/_live/core.js`, `api/_sv/core.js`, `api/sv/world.js`) **et** navigateur (affichage) |
| `synchroview/flux.js` | Rejouer un journal et décider de l'action suivante | serveur (`/api/sv/world`, fermé en production) et navigateur |
| `live/modele.js` | Le jour J : actions, rejouer, qui est touché | serveur (`/api/live/*`, espaces réels) et navigateur (démos) |
| `vitrine/rendu.js` (AIMEVitrine), `vitrine/perspectives` | Composer la page de chaque personne | **navigateur seulement** |
| `coeur/coeur.js` + adaptateurs (`g44`, `stitch`, `magazine`, `regles`) | Les écrans du cœur | navigateur seulement (démonstrations) |
| `g44/js/acces.js` | Habilitations G44 | navigateur seulement (dit dans le code et sur la page) |
| Orbe (`zero/zero.js`, `orbe/*`, `lab/orb/`) | Une forme qui accompagne la lecture ; **ne décide d'aucun droit** | navigateur |
| Moteur de pages et de blocs (`sites/`, `canevas/`, `constructeur/`) | Mise en page | navigateur |

### 3.4 Données

**Base Neon** (`db/schema.sql`, `db/migrations/`) : l'audit n'a lu que le code ; la base elle-même n'a pas été ouverte (**non vérifié**).

| Table | Porte un projet ? | Champs sensibles | Écrite par |
|---|---|---|---|
| `user`, `session`, `account`, `verification`, `passkey` | non | e-mail, nom, photo, IP de session | Better Auth |
| `spaces` | c'est le projet | titre, `data` | `/api/espaces` |
| `space_members` | oui | rôle | `/api/espaces` |
| `invitations` | oui | e-mail invité, **empreinte** du jeton (jamais le jeton) | `/api/espaces` |
| `items` | oui | — | **aucune route trouvée** |
| `user_data` | non (par personne) | données du Bureau | **aucune route trouvée** |
| `vault` | non | bloc chiffré côté client | **aucune route trouvée** |
| `audit` (le journal) | oui (`space_id`) | — | **jamais écrite** : aucun `insert into audit` dans le code |
| `live_journal` | oui (`espace`) | `qui` = identifiant de compte | `/api/live/act`, en ajout seul |
| `matiere`, `identite` | non (par personne) | textes libres | `/api/matiere`, `/api/identite` |

**Fichiers servis** : tout le dépôt sauf `api/` (voir 3.1). Aucun fichier `.env`, `.pem` ou `.key` dans le dépôt.
**Stockage navigateur** : la Régie, le Studio, `/v1/`, `/mariage`, les éditeurs de sites, Stitch, le Point Zéro sans compte. Données personnelles en local repérées : Régie (identité bancaire, clients), Studio (pointages, avis), `/v1/` (invités, allergies, paiements), `/mariage` (invités, budget).
**Hébergement tiers du Studio** : quand le Studio tourne comme artefact avec base partagée (`window.claude`), la badgeuse et les avis passent par cette base, et un compte « responsable » lit les pointages et les avis de tous. Sur lemondeaime.com, ce chemin est inactif. Niveau : **à vérifier**.

### 3.5 Rôles présents dans le code

| Où | Rôles | Décidés où |
|---|---|---|
| `synchroview/permissions.js`, `db/schema.sql`, `api/_auth/espaces.mjs` | owner, editor, contributor, viewer, guest | **serveur** (espaces réels) |
| `api/_auth/proprietaire.mjs` | « propriétaire du site » | **serveur** (`AIME_PROPRIETAIRES`, fermé par défaut) |
| `vitrine/acces/*.json`, `vitrine/perspectives/*.json` | les personnes des démos (couple, prestataire, invitée, coordination…) mappées sur les 5 rôles | navigateur (démos) ; serveur pour `/api/sv/world` hors production |
| `api/_sv/core.js` | 6 identités fictives (Léa, Camille, Studio Lumen, Lucie, Paul, Nina) | serveur, propriétaire seulement en production |
| `g44/js/acces.js` | agent, formateur, responsable, contrôleur (+ habilitations H1-H3) | navigateur |
| `stitch/js/coeur-stitch.js`, `publication/coeur-magazine.js`, `vitrine/scenarios/regie.json`, `studio.json` | rôles des exemples | navigateur (démos, dit) |
| Studio (`OS_D`, badgeuse « Qui badge ? ») | équipe d'un projet ; n'importe qui sur l'appareil badge pour n'importe qui | navigateur |
| Régie | aucun rôle : quiconque ouvre la page est propriétaire de fait | — |

La description de chaque rôle avec les six dimensions est le **lot 3**. Constat préalable, à confirmer : **la durée et la preuve n'existent dans aucun rôle serveur** (pas de date de fin dans `space_members`, journal `audit` jamais écrit).

### 3.6 Démonstrations

| Démo | Dit « démonstration » ? | Données manifestement fictives ? | Phrase à revoir |
|---|---|---|---|
| Les quatre écrans (accueil) | oui | oui (Léa & Marc) ; numéros masqués `06 12 •• •• 34` | `index.html:330` « Voir les décisions rendues par le serveur » mène à une page fermée au public en production (**à vérifier**) |
| World, Maison Orée, Stitch, G44, Magazine, Régie, Studio (`/exemples/`) | oui | oui | — |
| `/synchroview/demo/` | oui | oui | « chaque clic est revérifié par le serveur » : vrai, mais seulement pour le propriétaire en production |
| `/vitrine/site/` | oui | oui | `:22` « le serveur de démonstration revérifie aussi quand il est joignable » : il ne l'est jamais en production |
| `/live/` (démo) | oui | oui | `live/canal.js:3` : les démos restent dans le navigateur en production |
| Page « L'Orbe » (Arena) | hors dépôt | à revoir (voir section 8 au lot 4) | — |

### 3.7 Projets liés

Le code d'AIMESTUDIO ne contient vers les autres projets que des **liens** (catalogues `univers.json`, `moteurs.json`) : `pointzero-zeta`, `relia-aime`, `aimelemondeaime`, `ripplecircle`, `aime-composer`, `modul-wine`, `lemondeaimedesignsystem`, `aimeprojet`, `aimeevent` (`*.vercel.app`). Aucun appel réseau, aucun jeton, aucun compte partagé trouvé. `aime-passport`, `minisitewedding`, `ticketaime` : aucune référence. L'en-tête `frame-ancestors` autorise `ai-x-me.com` à afficher le site dans un cadre (`vercel.json`). Statut : **non vérifié** au-delà du code d'AIMESTUDIO.

---

## Constats ouverts (statuts seulement)

Le détail technique des constats ouverts (fichiers, lignes, chemins) n'est pas publié ici : il est dans un avis de sécurité GitHub privé, et rejoindra ce fichier une fois corrigé. Décision de Matt, 24/10/2026.

| # | Niveau | Constat | Correction | État |
|---|---|---|---|---|
| A | priorité élevée | Règle 2 : la liste des membres d'un espace en dit plus que la portée de certains rôles | bloquant pour le dock | ouvert |
| B | priorité élevée | Règle 11 : le journal des invitations, retraits et changements de rôle n'est pas tenu | bloquant pour le dock | ouvert |
| C | priorité élevée | Durée : aucun rôle serveur n'a de date de fin | bloquant pour le dock | ouvert |
| D | priorité élevée | Règle 5 : supprimer le compte du propriétaire efface l'espace et ce qu'y ont mis ses membres | PR dédiée | ouvert |
| E | priorité élevée | Le site sert des dossiers du dépôt qui ne sont pas des pages (documentation, schéma, tests, scripts) | PR dédiée | ouvert |
| F | priorité élevée | Les tests du socle ne tournent pas en intégration continue | PR dédiée | ouvert |
| G | à vérifier | Règle 8 : une invitation sans adresse n'est liée à aucune personne | PR dédiée | ouvert |
| H | à vérifier | Le direct partage un secret avec un autre usage | PR dédiée | ouvert |
| I | à vérifier | Règle 7 : retrait d'un rôle et laissez-passer du direct | lot 2 | à instruire |
| J | à vérifier | Studio hébergé avec base partagée : portée du rôle « responsable » sur les pointages et les avis | lot 2 | à instruire |
| K | contexte | « Je vois un accès inattendu » et « Demander une ouverture » n'existent pas encore | bloquant pour le dock (le premier) | ouvert |
| L | contexte | Aucune transmission de propriété (pas d'équivalent au défaut d'aime-passport) | — | constat |
| M | contexte | Coquilles HTML publiques sans donnée ; données par des API `no-store` | — | conforme |

## Ce qui n'a pas pu être vérifié

- La base Neon (contenu, droits du rôle de connexion, migrations réellement appliquées) : seul le code est lu.
- Les variables d'environnement de production : jamais lues.
- Les parcours avec session en production : aucun compte n'y a été utilisé. Les tests avec session tournent sur une base de test éphémère, jamais sur la production.
- Les projets liés au-delà des références dans ce dépôt.

## Décisions de Matt (24/10/2026)

1. Rien de sensible dans le dépôt public avant correction : statuts et niveaux ici, détail dans un avis de sécurité privé, publié une fois corrigé.
2. Base de test : une base dédiée et des comptes fictifs, jamais un compte réel ni la base de production.
3. `/v1/` et `/mariage` : **abandonnés**. Liens coupés maintenant, retrait au lot 5.
4. Mariage de preuve fictif d'abord, dans un espace de démonstration ; Neon par la branche de test seulement ; aime-passport hors de cet audit ; empreinte de l'Orbe **par rôle**, et c'est écrit ; **vouvoiement**.
5. `docs/AUDIT-ROLES.md` reste le seul fichier d'état.
6. Reclassements : la règle 2 et la règle 5 passent en priorité élevée ; les dossiers servis deviennent un constat de priorité élevée.
7. Suite : les corrections d'abord (une PR chacune, quatre bloquantes avant le dock), puis le Dock par rôle (`docs/DOCK.md`, à venir).
