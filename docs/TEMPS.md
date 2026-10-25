# Module Temps — phase fondatrice (24/10/2026)

Le premier module universel réellement fonctionnel d'AIME : le **Programme** d'un projet. Une seule ressource réelle (la table `moments`), consultée et modifiée par plusieurs personnes à travers une seule interface, avec des droits différents et une synchronisation fiable.

Références conservées telles quelles : l'Atlas d'audit (`/atlas/`) et l'étude de convergence (`/etude/`).

## 1. Architecture

```
Dock (dock/modele.js composerReel)   Atlas (/capacites/, capacites/modules.js)   Écran de projet (compte/projet.js)
                 \                              |                                 /
                  └────────── modules/registre.js : UN catalogue (contrat universel) ─┘
                                               |
            /api/page (gabarit « deroule »)   /api/temps  ← session Better Auth seulement
                                               |
                       api/_temps/moteur.mjs : contexte, transaction, vue, Comparaison
                                               |
     modules/temps/moteur.js (pur) ── live/modele.js (grammaire, cascade) ── synchroview/permissions.js (règles)
                                               |
                 Neon : temps_espaces (rev) · moments (état) · live_journal (historique)
```

- **Le registre** (`modules/registre.js`) décrit chaque module : identifiant, fonction, ressources, actions et la règle de `permissions.js` qui décide chacune, présentations, contextes, destination, états, accessibilité, journal, intentions, preuves. Statuts : `operationnel` (Temps, Mon accès, Journal, Personnes), `composant` (Documents, Finances), `documente` (Messages). Le serveur en tire les pages servies (`pagesDe`), donc le Dock ; l'Atlas l'affiche ; l'écran de projet en tire ses pages.
- **Pas de quatrième Dock** : le Dock unifié existant sait déjà poser un lieu pour toute page servie. Le Programme apparaît dans le Dock quand le serveur sert la page `deroule`, c'est-à-dire quand le projet a un programme.
- **Découverte** : l'accueil présente une démonstration du Programme et de Circle à partir de la fixture fictive et des moteurs purs existants (`accueil/temps.js`). En Circle, le cadran est **seul** (décision du 25/10 : « juste le cadran, pas la liste en dessous ») : chaque arc est un bouton (nom accessible en toutes lettres, clic, Entrée ou Espace), une ligne annonce le moment choisi (`aria-live`), le cadran se resserre sur sa fenêtre (`fenetre()`, 30 min de marge, arrondie à la demi-heure) et « Revenir à la journée entière » rend les 24 heures ; la légende ne nomme que les états présents. Le Programme garde sa liste de boutons. Le même dessin sert l'iPhone de « Chacun son écran » (`accueil/vitrine.js` → `AIMETempsAccueil.dessiner`), où une ligne dit le moment touché. AI (`/projets/`) agrège les programmes actifs via `GET /api/temps?resume=1`, recalculés avec les droits de chaque personne ; les liens ouvrent directement Programme ou Circle dans le projet.
- **Pas de calendrier inventé** : la synthèse AI affiche le « Jour J » et les heures stockées ; elle ne crée aucune date. Depuis la migration 08 (§ 10), une **date de Jour J facultative** peut exister par projet : elle n'est alors affichée que parce qu'une personne l'a fixée, et le champ disparaît de la synthèse quand elle est retirée.
- **Intentions sans IA** : `AIMEModules.intention("Léa décale le cocktail")` → `{ module: 'temps', action: 'retarder' }`, par motifs déterministes et testés.

### Navigation (correction du 24/10, revue de Matt)

- **Une seule navigation générale : le Dock**, sur ordinateur, tablette et mobile. La rangée d'onglets sous le nom du projet n'est plus affichée quand le Dock est posé ; elle ne revient qu'en repli, si le Dock universel manque (script absent), pour qu'aucune page ne perde son accès.
- **En haut** : le nom du projet et la participation active, dans un bandeau d'identité ; puis le titre du module ouvert et ses modes d'affichage (Liste, Chronologie, Comparer les vues), qui sont des commandes locales.
- **Le Dock garde le même ordre pour tous les rôles** (celui du registre) ; seul son contenu varie.
- **Retour et avance du navigateur** : chaque passage d'une page à l'autre est une entrée d'historique. Les liens directs (`/projets/?espace=…&page=deroule`) ouvrent la bonne page. Le focus va au titre de la page ouverte, et le Dock marque la page en cours (`aria-current`).
- **La photo** n'est plus derrière la zone de travail : elle est cadrée et voilée dans le bandeau d'identité. La zone de travail est sur fond plein.

### Circle (PR temps-circle, 24/10)

- **Modes du module Programme** : Liste et Circle, plus Comparer les vues pour le propriétaire. Circle remplace la Chronologie à l'écran (décision D1). Le code de la Chronologie reste, joignable par `vue=chrono`, pour éviter toute régression.
- **Un calculateur pur**, `modules/temps/cercle.js`, transforme la vue serveur en cadran. Il ne lit ni la base ni les règles : il place ce que la vue contient. Géométrie reprise de RIPPLECIRCLE (`polarXY`, `arcPathAt`), complétée pour l'arc nul et le tour complet.
- **Le cadran** fait 24 heures, minuit en haut, sens horaire. Un moment qui passe minuit reste un arc continu. Les moments simultanés vont dans des couloirs concentriques : 4 au plus sur ordinateur, 3 sur téléphone. Au-delà, une pastille « +1 » ouvre la Liste sur le moment.
- **Le zoom** : le cadran est une fenêtre de temps (`fenetre({ debut, fin })`). **Exposé sur l'accueil** depuis le 25/10 (choisir un moment resserre le cadran, `accueil/temps.js`) ; il ne l'est **pas encore** dans l'écran de projet, qui garde la journée entière.
- **Un arc est un bouton.** Il ouvre le même panneau que la carte de la Liste, donc les mêmes gestes autorisés. Au clavier : les flèches passent d'un moment à l'autre, Entrée ouvre, Échap ferme. Chaque arc porte un nom accessible complet : heures, décalage, à confirmer, proposition, « vous portez ce moment ».
- **États** :
  - horaire en vigueur : arc plein ;
  - horaire prévu : trait fin pointillé ;
  - conséquence à décider : zone ambre ;
  - à confirmer : point ;
  - vos moments : liseré.
  La couleur n'est jamais seule à porter un état.
- **Le contexte dans l'adresse** : `vue` et `moment`. Changer de mode garde le moment, et recharger la page rouvre la même vue.
- **Idées reprises des branches v8 et v9 de RIPPLECIRCLE** : le centre qui résume le moment choisi, une large zone de toucher invisible, des arcs focusables au clavier, et aucune animation sous `prefers-reduced-motion`.
- **Non repris** : la musique, les anneaux par phase, le vocabulaire métier.
- **Passe iPhone (revue de Matt)** :
  - Le cadran occupe toute la largeur utile, libellés horaires compris.
  - Un toucher choisit le moment le plus proche, à 24 px près (`AIMECercle.toucher`), même étroit ou serré.
  - Le panneau du moment, commun à la Liste, s'ouvre au-dessus du Dock.
  - La légende ne nomme que les états présents.
  - En paysage, le cadran et le panneau se placent côte à côte.
  - Sur téléphone, l'en-tête du site défile au lieu de rester collé : le Dock est la seule zone fixe.
  - La date du programme est affichée : « Jour J » tant qu'aucune date n'est fixée, sinon en toutes lettres et avec sa distance (« samedi 12 juin 2027 · J-36 »). Le propriétaire la fixe depuis l'en-tête (migration 08, § 10).
  - La barre « AIME » qui traversait le cadran sur une capture était l'en-tête collant figé par la capture « page entière », pas un défaut à l'écran.

## 2. Source de vérité

| | Rôle | Écrit par |
|---|---|---|
| `moments` | **État courant**. Seule table lue par les vues. | `geste()` et `activer()`, dans la transaction |
| `live_journal` (lignes avec `rev`) | **Historique**, en ajout seul (UPDATE interdit par déclencheur). Chaque geste inscrit sa révision et ses effets `{id, avant, apres}` ; la ligne `importer` (rev 1) porte le programme de départ. | même transaction |
| `temps_espaces.rev` | Compteur du projet, verrouillé `for update` à chaque geste | même transaction |

**Reconstruction** : `reconstruire(journal)` rejoue l'import puis les effets dans l'ordre des révisions et vérifie à chaque pas que l'état « avant » correspond. `verifier(db, espace)` compare le résultat à la table ; les tests l'exécutent à la fin de chaque passe.

**Synchronisation** : chaque écran relit `/api/temps?depuis=<rev>` toutes les 2 s ; si rien n'a changé, seule la révision repart.

## 3. Écritures et concurrence

Un geste = une transaction PostgreSQL :

1. `select rev from temps_espaces … for update` : le verrou du projet. Plusieurs instances du serveur se rangent derrière.
2. Le rôle est relu sous ce verrou (un retrait ou une fin d'accès concurrents comptent).
3. Le programme est chargé, la décision prise par le moteur pur (règles, cascade atomique).
4. **Conflit** : si un moment touché a une révision postérieure à celle que le navigateur a vue, la réponse est 409, avec la version à jour. Rien n'est écrit. Un geste sur un autre moment n'est pas bloqué.
5. Ligne de journal (`rev` unique : index `live_journal_rev`), mises à jour conditionnelles des moments (sur leur état « avant »), nouvelle révision. Tout ou rien.

## 4. Visibilité (au serveur, toujours)

- Un moment est lisible si `event.read` **et** `item.read` (son audience : `public`, `membres`, `equipe`, `organisation`) l'autorisent.
- Champ par champ : les consignes d'équipe pour l'équipe, l'identité d'un responsable pour l'organisation (ou « moi »).
- Un moment invisible répond comme un moment inconnu (404). Le refus d'une cascade ne nomme jamais un moment invisible.
- **Historique** : une ligne apparaît seulement si elle touche un moment lisible, et seulement ces moments. Les noms suivent `member.read`.
- **Comparaison** : la règle existante du propriétaire (`space.manage_members`). La vue de la cible est calculée avec ses droits, **puis coupée à ce que le demandeur lit lui-même** (intersection, champ par champ). Elle ne peut donc créer aucun privilège indirect (testé avec des règles où la cible voit plus que le demandeur).
- **Propositions** : un moment qui empiète maintenant sur le suivant, alors que ce n'était pas le cas au départ, est proposé à qui peut lire les deux et modifier le second. Rien n'est appliqué sans son geste.
- **Confirmer** (`event.read` + être la personne responsable, sans règle nouvelle) : la personne responsable d'un moment accuse réception de son nouvel horaire. C'est un accusé de lecture, pas un droit de modifier.

## 5. Isolation de la démonstration

- Le projet « Mariage Camille & Gabriel » (`modules/temps/demo-camille-gabriel.json`) a `temps_espaces.origine = 'demo'`.
- Les comptes fictifs sont sur `@demo.aime.test` (domaine réservé : aucun courrier possible).
- Un vrai compte n'ouvre pas un projet de démonstration, même s'il en est membre. Un compte de démonstration n'ouvre aucun vrai projet et n'active rien.
- `semerDemo()` et `scripts/temps-demo.mjs` refusent la production.

## 6. Compatibilité

- **Sans migration 07** : `/api/temps` répond 503 et les projets, pages et Dock restent exactement ceux d'avant (test « base ancienne »).
- **Avec la migration, sans import** : rien ne change. Le propriétaire voit dans « Mon accès » un bloc « Ajouter le programme à ce projet », qui importe le programme type de son domaine.
- **L'ancien direct** (`/api/live/*`, laissez-passer) n'est pas modifié. Il est seulement fermé aux projets passés à Temps (une seule vérité). Ses démonstrations restent ce qu'elles étaient, et la production les garde dans le navigateur.
- **Effacement d'un compte** : la suppression des lignes de `live_journal` reste permise (seul l'UPDATE est interdit). Supprimer un projet efface son programme (cascade).

## 7. Fichiers gardés intacts

`synchroview/permissions.js` (la source des droits) et le stockage du journal d'audit (`api/_auth/journal.mjs`) ne sont pas modifiés : des tests de garde le vérifient. Temps n'ajoute aucune règle ; il compose les règles existantes. Son historique est dans `live_journal`, pas dans `audit`.

## 8. Migration à appliquer

`db/migrations/2026-10-24-07-temps.sql` : rejouable, en ajout seul. À appliquer par l'agent Neon après fusion, d'abord sur une branche de test, puis en production. Aucune action manuelle dans la console.

`db/migrations/2026-10-25-08-temps-jour.sql` (calendrier, § 10) : une colonne `temps_espaces.jour_j date` et sa plage, en ajout seul et rejouable. Sans elle, tout fonctionne comme avant et la date est dite « pas encore installée ».

## 9. Tests

| Fichier | Ce qu'il prouve |
|---|---|
| `tests/temps-moteur.test.cjs` | registre (contrat, règles existantes, noms du Dock, intentions), vues par rôle, cascade, refus, conflit, confirmation, Comparaison par intersection, historique, reconstruction, date du Jour J (date réelle, qui la fixe, ce qu'elle raconte) |
| `tests/temps.test.cjs` (base) | six vrais comptes, propagation, persistance (autre connexion), refus serveur, conflit entre deux instances, révisions uniques, atomicité (pannes simulées), Comparaison, historique, isolation, import concurrent, ancien direct fermé, contraintes SQL, cohérence, date du Jour J (403/400/409, journal, synthèse) |
| `tests/socle-ancien.test.cjs` | base sans la migration : 503, rien d'autre ne change |
| `tests/navigateur/temps.cjs` (base + navigateur) | le parcours de bout en bout : six navigateurs (ordinateur, iPhone, iPad), propagation sans rechargement, proposition, confirmation, refus forcé, rechargement, chronologie, Comparaison, historique, date du Jour J fixée puis retirée, axe-core WCAG 2.1 AA |

## 10. Calendrier daté (migration 08, 25/10/2026)

- **Une date par projet, facultative** : `temps_espaces.jour_j date` (`db/migrations/2026-10-25-08-temps-jour.sql`, en ajout seul, plage 2000–2100). Les heures restent des minutes depuis minuit de ce jour-là (0 à 2879) : un moment qui commence à 01:00 le lendemain s'écrit déjà 1500, sans seconde date à tenir.
- **Rien n'est inventé** : sans date, l'écran et la synthèse disent « Jour J », comme avant. La date n'apparaît que si une personne l'a fixée ; la démonstration (`modules/temps/demo-camille-gabriel.json`) reste sans date.
- **Qui** : le propriétaire du projet (`space.manage_members`, la règle déjà utilisée pour importer le programme et comparer les vues). Une coordination, un prestataire, une invitée ne la fixent pas (403) ; tous les membres la lisent.
- **Comment** : `POST /api/temps { action: 'dater', espace, jour: 'AAAA-MM-JJ', rev }`, ou `jour: null` pour la retirer. Date réelle exigée (le 30 février est refusé) et plage fermée ; `rev` périmée → 409, rien n'est écrit. La révision avance de 1 et la ligne `dater` entre au journal avec `{ jour }` et **aucun effet sur les moments** : `reconstruire()` et `verifier()` restent exacts.
- **Où ça se voit** : l'en-tête du Programme (`samedi 12 juin 2027 · J-36`), le centre et le titre du cadran Circle, la carte « Mes programmes » d'AI (`Jour J · samedi 12 juin 2027`), et l'historique pour le propriétaire (« « Jour J » fixé au samedi 12 juin 2027. »).
- **Sans la migration 08** : lecture et gestes fonctionnent comme avant ; la date est dite « pas encore installée » (503) et aucun champ `jour` n'est ajouté.
- **Ce n'est pas encore** : une grille mensuelle, des dates par moment au-delà de J+1, les échéances des engagements (`docs/ENGAGEMENTS.md`) et un rappel avant le jour J.

## 11. Ce qui manque (honnêtement)

- **Démonstration sur la preview** : les comptes fictifs ne reçoivent pas de lien de connexion. La démonstration complète tourne en test (base de test + navigateurs). Sur la preview, on peut l'essayer avec de vrais comptes de test sur un vrai projet (« Ajouter le programme à ce projet »).
- **Surprises cachées au couple** : l'audience « organisation » inclut le propriétaire. Une restriction par personne (masquer à quelqu'un) demandera une table de restrictions (prochaine phase, avec les responsabilités multiples).
- **Responsabilités multiples** : un membre a toujours un seul rôle ; un moment a au plus un responsable (`moments.responsable`). La table `responsabilites` du plan n'est pas encore créée : elle sera utile quand un deuxième module en aura besoin.
- **Créer, supprimer ou renommer un moment** : pas encore. Seuls l'import, le décalage, le plan B, « fait » et la confirmation existent.
- **Calendrier complet** : une date de Jour J par projet (§ 10), mais pas de grille mensuelle, pas de date par moment au-delà de J+1, pas d'échéance d'engagement dans le programme.
- **Temps réel** : relecture toutes les 2 s, pas de connexion poussée.
- **Le direct (jour J)** : pas encore réécrit sur cette ressource. La chronologie du Programme en est la première présentation.
