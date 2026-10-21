# AIME · Un seul Bureau — phase 1 : audit

Branche `bureau` (depuis `integration`). Rien n'est modifié dans le code : ce document est l'audit demandé avant toute suppression. `main`, la production, `/v1/`, `/studio/` et Stitchlab ne sont pas touchés.

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
