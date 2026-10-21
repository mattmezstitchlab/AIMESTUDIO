# AIME · Un seul Bureau — phase 1 : audit

Branche `bureau` (depuis `integration`). Phase 1 : l'audit (§1 à §5). Phase 2 : le Bureau construit (§6). `main`, la production, `/v1/`, `/studio/` et Stitchlab ne sont pas touchés.

## 1. Ce que dit le code (et non la documentation)

- **L'ancien Bureau à fenêtres n'existe plus.**
  - `bureau/index.html` (4 092 lignes : Dock, fenêtres, dossiers) a été supprimé au commit `422d8b6`, le 20 octobre.
  - `vercel.json` renvoie `/bureau`, `/bureau/` et `/bureau/:path*` vers `/aime/`. C'est ce qui empêche aujourd'hui `/bureau/` de servir une page.
  - Le README le décrit encore comme présent : **le README ment** sur ce point.
- **Ses données sont toujours dans les navigateurs de ses utilisateurs.** Ce sont des clés `aime-wp`, `aime-wps`, `aime-tld`, `aime-tlh2`, `aime-tlp`, `aime-tlz`, `aime-m4`, `aime-uv`, `aime-tour`, `aime-orb-intro`, `aime-lang`, `aime-a11y`, qu'aucune page ne lit plus.
  - La base Neon leur réserve une place : `user_data.key = 'aime-os'`.
  - Elles ne doivent pas être effacées.
- **Le « moteur partagé » réel est `vitrine/rendu.js`.**
  - Ses cinq couches sont séparées : contenu, accès, perspective, modèle, présentation. Les règles d'accès sont appliquées avant la mise en page.
  - Il compte 19 composants, **tous liés à un événement** (`contenu.evenement`) : héro, programme, lieu, personnes, documents, menu, FAQ, paiements, missions…
  - Il n'a pas encore de modèle de page générique. Pour le Bureau, il faut **l'étendre** (un type de contenu « espace de travail » et quelques composants), et non écrire un second moteur.
  - Seules deux pages l'utilisent : `/vitrine/site/` et `/vitrine/world/`.
- **Six adresses servent le même Studio.** `studio/`, `web/`, `docs/`, `buro/`, `stitchlab/`, `accessibilite/`, `image/` sont le même fichier de 1 Mo, au réglage `window.AIME_ATELIER` près (diff : 2 lignes).
  - Ce sont des doublons de fichier, mais pas de fonction : chaque adresse ouvre un atelier différent.
- **Il existe un registre de navigation unique, mais partiel.** `menu/menu.js` contient 5 catégories et 15 liens, sans statut explicite : seulement une étiquette « Nouveau ». Le Bureau n'y figure pas.

## 2. Données locales à préserver (inventaire réel)

| Module | Clés | Peut-il lister ses projets ? |
|---|---|---|
| Carte (Page Zéro) | `aime-carte`, `aime-carte-versions`, `aime-carte-contacts` | Oui : une Carte |
| Studio et ateliers | `aime-app` (`events[]`, `cur`), `aime-app-ev-*`, `echos:boards`, `echos:photo*`, `echos:logo:*`, `aime:pd`, `aime:fg`, `aime:learn`, `aime:avis`, `aime:bdgctx`, `aime:pointage`, `aime-mode` | Oui : `aime-app.events` (id, nom, type) ; tableaux `echos:boards` |
| Timeline Jour J (`/v1/`) | `jourj-plan-v4` / `v5`, `jourj-persona`, `jourj-visitor`, `aime-ma-carte` (portefeuille, **autre objet que la Carte**), `h23` | Un plan par navigateur |
| Stitch | `aime-stitch`, `stitch-brouillons`, `stitch-mes-fils`, `stitch-acquisitions`, `stitch-progression:*` | Oui : brouillons et progressions |
| SynchroView | `sv-compositions` | Oui : compositions |
| INFINITY | `aime-infinity`, `aime-infinity-defi`, `aime-infinity-muet` | Une partie en cours |
| WORLD | `aime-sim-world`, `aime-sim-*` | Une simulation en cours |
| G44 LAB | (aucune persistance) | Non : simple lien |
| Landing `/aime/`, orbe | `aime-mem`, `aime-orbe`, `aime-landbg`, `aime-zero-calme` | Mémoire de parcours, pas des projets |
| Ancien Bureau | les douze clés `aime-*` citées au §1 | Non lues aujourd'hui : à conserver telles quelles |

## 3. Matrice

| Élément | Décision | Raison |
|---|---|---|
| **`/bureau/`** | **Créer**, sur le moteur partagé étendu | Une seule entrée pour travailler. On retire les trois redirections `/bureau*` → `/aime/`. |
| Page Zéro `/` | Conserver ; recaler la fin | « Ouvrir mon Bureau » en principal ; « Découvrir AIME / Rejoindre Le Monde AIME » en secondaire, avec le vol vers le cube. |
| `/aime/` (landing, cube, orbe) | Conserver : **présentation** | Découvrir, pas travailler. |
| `vitrine/rendu.js` | **Faire évoluer** | Ajouter un contenu « espace » et des composants « projets », « reprendre », « outils », « limites ». Aucun second moteur. |
| `/vitrine/site/`, `/vitrine/world/` | Conserver : déjà sur le moteur | — |
| `/studio/` et les 6 ateliers | **Garder comme application autonome** | Éditeur interactif de supports, avec son propre moteur. Le Bureau liste ses événements (`aime-app`) et ouvre l'atelier ; rien n'est migré de force. |
| `/stitch/` (+ atelier, patron, broder, importer) | Application autonome | Moteur métier de broderie. Le Bureau liste brouillons et progressions. |
| `/synchroview/` | Application autonome | Outil de comparaison ; le Bureau liste les compositions. |
| `/g44/` | Application autonome, **démonstration** | Aucune donnée personnelle : lien seulement. |
| `/infinity/` | Application autonome, **expérimental** | Jeu ; le Bureau propose « reprendre la partie » si elle existe. |
| `/lab/orb/`, `/infinity/lab/` | **Lab**, accès séparé | Expérimenter. |
| `/tout/` | Conserver | Consigne : ne pas modifier. |
| `/v1/` | Conserver, lien « ancienne Timeline » | Ses usages (plan Jour J, portefeuille) ne sont pas remplacés : on ne le retire pas. |
| `/web/`, `/docs/`, `/buro/`, `/image/`, `/accessibilite/`, `/stitchlab/` | Conserver les adresses | Doublons de fichier, pas de fonction. Remplacer les copies par une seule page plus un réglage demanderait de toucher au Studio : **reporté**, à décider avec la session Studio. |
| `menu/menu.js` | **Migrer** vers un registre unique, `nav/registre.js` | Statuts disponible / démonstration / expérimental, rôle (travailler, découvrir, réaliser, expérimenter). Le menu, le Bureau et la Page Zéro le lisent. |
| Clés de l'ancien Bureau | **Archiver sans effacer** | Le Bureau les signale (« données de l'ancien Bureau trouvées dans ce navigateur ») et les inclut dans la sauvegarde. |
| README | **Corriger** | Il décrit un Bureau supprimé et une base Supabase abandonnée pour Neon. |

## 4. Le Bureau proposé (phase 2, après validation)

- **Ma Carte.** Tuile lue depuis `aime-carte`, sans copie. Si elle n'existe pas : « Commencer ma Carte ».
- **Reprendre.** Ce qui a réellement bougé récemment, d'après les données trouvées (événement courant, brouillon Stitch, composition, partie). Rien d'inventé.
- **Mes projets.** Une liste par module, chacun déclarant sa façon de lister (`bureau/sources.js`). Un module qui ne sait pas lister reste un simple lien vers l'outil.
- **Créer ou ouvrir un outil.** Lu depuis le registre de navigation, avec les statuts.
- **Lab.** Une entrée séparée.
- **Ce navigateur.** Dit clairement : « Vos projets sont enregistrés dans ce navigateur, pas sur un compte. »
  - Sauvegarder : un fichier JSON avec toutes les clés AIME, ancien Bureau compris.
  - Restaurer : avec un aperçu et une confirmation, sans rien écraser sans accord.
  - Aucune fausse synchronisation.
- **État vide utile.** « Rien dans ce navigateur pour l'instant », suivi des trois façons de commencer.
- **Accès.** Le Bureau n'affiche aucun compte. Le jour où l'authentification arrive, le contrôle se fait côté serveur. Masquer un bouton n'est jamais une autorisation.

## 5. Vérifications prévues

- Accès direct à `/bureau/`.
- Page Zéro → Bureau.
- `vercel.json` : aucune boucle, tous les anciens liens résolus (test automatique).
- État vide.
- Reprise de chaque type de donnée, à partir d'un navigateur prérempli.
- Conservation des anciennes clés : sauvegarde puis restauration à l'identique.
- Clavier, iPhone, mouvement réduit.
- Tests existants verts : Studio, Stitch, SynchroView, vitrine, WORLD, INFINITY, G44, orbe, Carte.

## 6. Phase 2 : livré

### Ce qui a été remplacé
- **Les trois redirections `/bureau*` → `/aime/`** sont retirées : `/bureau/` sert le nouveau Bureau.
- **La liste du menu Explorer** devient le registre unique `nav/registre.js` : 20 entrées, chacune avec un rôle et un statut. Le menu garde sa propre liste en secours, si le registre n'est pas chargé.
- **La fin de la Page Zéro** : « Ouvrir mon Bureau → » en principal, « Rejoindre Le Monde AIME » en second. Le vol de la Carte vers le cube est conservé sur ce lien. L'en-tête de la Page Zéro gagne « MON BUREAU ».
- **Le README** décrit maintenant la réalité.

### Ce qui a été ajouté au moteur partagé (pas de second moteur)
- `vitrine/rendu.js` gagne `composer()` et six composants « espace » : entête, tuile, liste, groupes, outils, note. `rendre()` est inchangé.
- `vitrine/modeles/bureau.json` : la forme.
- `vitrine/perspectives/bureau.json` : l'angle « ce navigateur », c'est-à-dire l'ordre des blocs, sans aucune donnée ni aucun droit.
- `vitrine/presentation/ambiances.json` : l'ambiance `aime-nuit` et la police Cal Sans.

### Ce qui est propre au Bureau
- `bureau/sources.js` lit les données de neuf outils, n'écrit jamais, et refuse les liens qui sortent du site. Il fournit aussi la sauvegarde, l'aperçu et la restauration.
- `bureau/bureau.js` assemble le contenu et branche deux interactions : sauvegarder et restaurer.

### Ce qui reste autonome, et pourquoi

| Application | Raison |
|---|---|
| Studio et ses six ateliers | Éditeur interactif de supports, avec son propre moteur. Les dédoublonner demande de toucher `studio/` : à valider. |
| Stitch, SynchroView, G44, INFINITY | Moteurs métier : le Bureau les liste et les ouvre. |
| `/v1/` | Ses usages (plan Jour J, portefeuille) ne sont pas remplacés. |

### Vérifications
- **`tests/bureau.test.cjs` (5 tests)** couvre :
  - le registre : unique, statuts, une seule entrée « travailler », Lab séparé ;
  - les sources : tout retrouvé ; stockage en lecture seule ; données abîmées ; liens étrangers refusés ; ancien Bureau détecté ;
  - la sauvegarde : aller-retour identique ; une clé différente est gardée sauf demande ; rien n'est effacé ;
  - le moteur : composition, échappement, état vide, aucun moteur concurrent ;
  - les routes : `/bureau/` n'est plus redirigé, aucune boucle, chaque entrée du registre aboutit à un fichier, et la Page Zéro mène au Bureau.
- **`npm test`** : 275 tests passent. Seul `health.test` échoue, pour la raison d'environnement connue.
- **Parcours rejoué automatiquement :**
  - état vide ;
  - navigateur prérempli : Carte, 2 projets Studio, 1 événement, brouillon et broderie Stitch, comparaison, partie INFINITY, simulation fictive, 2 réglages de l'ancien Bureau ;
  - Page Zéro → « Ouvrir mon Bureau » ;
  - sauvegarde téléchargée (10 éléments) ;
  - restauration dans un navigateur modifié : 9 ajoutés, 1 différent gardé, une clé étrangère conservée ;
  - clavier : lien d'évitement, puis Explorer, puis la Carte ;
  - iPhone 13 avec mouvement réduit : aucun défilement horizontal, ni sur le Bureau ni sur la Page Zéro ;
  - menu Explorer de `/aime/`, lu depuis le registre.
  
  Aucune erreur.

### Limites
- **Les projets sont ceux de ce navigateur.** Pas de compte : rien n'est synchronisé, et le Bureau le dit.
- **Rouvrir un projet précis.**
  - Le Studio n'a pas d'adresse par projet : le Bureau ouvre le Studio, qui reprend le projet en cours.
  - Stitch rouvre un brouillon précis (`?brouillon=`), mais pour une broderie, il ouvre la liste « Reprendre une broderie ».
- **Les tableaux `echos:boards` du Studio** ne sont pas listés : leur forme n'est pas assez sûre pour en tirer des titres sans rien inventer.
