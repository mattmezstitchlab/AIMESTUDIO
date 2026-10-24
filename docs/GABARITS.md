# AIMESTUDIO · Les gabarits de pages (contrat)

Brief de Matt du 24/10/2026 : « Les pages du Dock, par rôle et par domaine ». Complète `docs/DOCK.md`, `docs/ROLES.md` et `docs/AUDIT-ROLES.md`.
**Statut : contrat validé par Matt le 24/10/2026 ; aucun code.** Étape suivante autorisée : la composition serveur `/api/page` et le Dock correspondant, avec les tests du § 12, en petites PR indépendantes, sans toucher aux autres domaines ni à RIPPLECIRCLE. Rien de ce fichier ne modifie `synchroview/permissions.js` ni la base. Les deux évolutions de droits (§ 9 et § 10) sont décrites ici pour être testées et validées par Matt avant toute implémentation.

## En bref

Chaque bouton du Dock ouvre l'un des **sept gabarits** : Mon accès, Journal, Personnes, Projet, Déroulé, Documents, Messages. Un gabarit est une structure de page unique, remplie **par le serveur** selon le projet, le rôle et le domaine. Le domaine apporte les mots, le grand visuel et une composition de départ ; il n'apporte jamais de droit.

Ordre : le **lot 1** (Mon accès, Journal, Personnes) repose sur des données déjà en production et porte les trois gestes prioritaires (consulter son accès, inviter, signaler un accès inattendu). Les autres gabarits attendent que le lot 1 fonctionne de bout en bout dans le mariage de preuve.

Philosophie : un environnement, une identité, plusieurs relations, sept gabarits universels, un Dock et une Orbe. La personne ne voit jamais la complexité qui rend cette simplicité possible.

## 1. Quatre notions à ne jamais confondre

| Notion | Où elle vit | Existe aujourd'hui | Qui la voit |
|---|---|---|---|
| **Rôle serveur** : `owner`, `editor`, `contributor`, `viewer`, `guest` | `space_members.role` (+ `jusqu_au`), évalué par `synchroview/permissions.js` | Oui, en production | Personne : c'est la mécanique |
| **Relation métier** : « Couple », « Témoin », « Prestataire », « Invité »… | Mots du domaine (§ 8), rattachés à une famille de `docs/ROLES.md` puis à un rôle serveur | En démonstration (`dock/modele.js`) | La personne, dans ses mots |
| **Co-propriétaire** | Évolution A (§ 9) | **Non** : un espace a un seul propriétaire, on ne peut pas inviter `owner` (`ROLES_INVITES`) | — |
| **Sous-espace confidentiel** (la surprise) | Évolution B (§ 10) | **Non** : le propriétaire lit tout l'espace et tout le journal | — |

Règle : une relation métier se traduit toujours en un rôle serveur existant. Elle ne crée jamais un droit. Tant que les évolutions A et B ne sont pas validées, le mariage de preuve fonctionne avec un seul propriétaire et sans contenu caché.

Rattachement provisoire pour le mariage :

| Relation métier | Famille (`ROLES.md`) | Rôle serveur |
|---|---|---|
| Couple (la personne qui crée) | Propriétaire | `owner` |
| Second membre du couple | Co-propriétaire | `owner` après l'évolution A ; d'ici là `editor` |
| Coordination, agence | Délégué | `editor` |
| Témoin | Équipe | `contributor` |
| Prestataire (photographe, traiteur, DJ…) | Contributeur, prestataire | `contributor` |
| Parent qui consulte | Contrôleur, observateur | `viewer` |
| Invité | Destinataire | `guest` |

## 2. Quatre couches, chacune avec un seul maître

Ce que la personne voit résulte de quatre couches empilées. Une couche ne peut jamais élargir celle du dessous.

| Couche | Ce qu'elle décide | Qui la décide | Où elle vit |
|---|---|---|---|
| **1. Permissions** | ce que la personne a le droit de lire et de faire | le serveur seul (`permissions.js`, `space_members`) | base + serveur |
| **2. Composition** | les gabarits, blocs et données disponibles dans ce projet, pour ce rôle | le serveur, à partir des permissions et du modèle de domaine | réponse de `/api/page` |
| **3. Personnalisation** | l'ordre des blocs, le grand visuel, les raccourcis du Dock, la disposition du Canevas | la personne, pour elle-même | préférences de la personne (plus tard en base, par personne et par projet) |
| **4. Extensions** | des capacités ajoutées à un projet (ex. RIPPLECIRCLE) | une personne autorisée active ; le serveur borne | § 11 |

Règles :
- La personnalisation **réordonne et masque**, elle n'ajoute jamais une entrée ni une donnée que la composition n'a pas fournies.
- **Ce qui ne se masque jamais** : Mon accès, le geste « Je vois un accès inattendu », l'Orbe et son +. Une personnalisation qui les retirerait est ignorée par le serveur.
- Masquer un bloc ne change rien aux droits ni à ce que les autres voient.
- Le lot 1 n'implémente pas la personnalisation ; il ne doit simplement rien figer qui l'empêche (blocs identifiés par un `id` stable, ordre fourni par le serveur et surchargeable).

## 3. Principes de projection (tous les gabarits)

1. **Composé au serveur.** Le navigateur reçoit la page déjà filtrée ; il n'a jamais une donnée « à masquer ».
2. **Le rôle vient de `space_members`**, jamais de la requête. Un rôle dont `jusqu_au` est dépassé est refusé, et la fermeture est inscrite au journal (déjà fait par `role()` dans `api/_auth/espaces.mjs`).
3. **Projet obligatoire** dans chaque requête ; un espace inconnu ou interdit répond la même chose (404 « Espace introuvable »), sans rien révéler.
4. **Silence par défaut** pour les destinataires : ni contenu, ni nombre de choses cachées.
5. **Une seule composition** : la page, le Dock et les gestes de l'Orbe viennent de la même réponse.
6. **Chaque geste est revérifié au moment où il est fait.** Un bouton visible n'autorise rien.
7. `Cache-Control: no-store` sur toute réponse privée (déjà le cas pour `/api/espaces`).
8. Aucun champ superflu : adresses e-mail seulement pour soi-même et pour qui gère les membres (déjà le cas dans `membres()`).

## 4. La route

`GET /api/page?espace=<uuid>&gabarit=<acces|journal|personnes|projet|deroule|documents|messages>`

Réponse :

```json
{
  "gabarit": "acces",
  "domaine": "mariage",
  "mots": { "titre": "Mon accès", "role": "Prestataire" },
  "visuel": { "src": "...", "alt": "..." },
  "blocs": [ { "type": "...", "...": "..." } ],
  "dock": { "lieux": [], "plus": [], "pastille": 0 },
  "vide": null
}
```

- `blocs` ne contient que ce que le rôle peut lire, champ par champ.
- `dock` est composé par `dock/modele.js` **avec les gestes calculés par `permissions.js`** (paramètre `gestes`), jamais avec la table par défaut.
- Un gabarit dont les données n'existent pas encore n'est pas servi dans un vrai espace : son bouton n'apparaît pas dans le Dock.
- Erreurs : 401 sans session, 404 espace introuvable ou rôle expiré, 403 geste refusé (avec la raison de `permissions.js`).

Elle réutilise les fonctions existantes (`acces`, `membres`, `journal`, `signaler`, `inviter`) ; elle ne réécrit aucune règle.

## 5. Lot 1 : les trois gabarits réels

### 5.1 Mon accès

**Ce qu'il montre** (en phrases, sans jargon) :
1. Ce que je suis ici, dans les mots du domaine (« Vous êtes prestataire du mariage de Léa & Marc »).
2. Ce que je peux faire : les gestes accordés, en verbes (« lire le déroulé, déposer vos documents »).
3. Qui me l'a accordé, et quand (ligne `acceptation` du journal, et l'`invitation` qui la précède).
4. Jusqu'à quand (`jusqu_au`, ou « sans date de fin »).
5. Le geste « Je vois un accès inattendu », toujours présent.

**Données** : `space_members` (role, jusqu_au, added_at), `spaces` (title, data.modele), `audit` (lignes `invitation`/`acceptation` où je suis la cible). Fonction de départ : `acces()`.

| Rôle serveur | Reçoit | Ne reçoit jamais |
|---|---|---|
| owner | son rôle (sans fin), le nombre de membres, ses gestes | — |
| editor | son rôle, sa fin, qui l'a invité et quand, ses gestes | les rôles et fins des autres |
| contributor | idem | idem |
| viewer | idem | idem |
| guest | sa place, sa fin, qui l'a invité | le nombre d'invités, les autres rôles |

**Gestes** : consulter (lecture), signaler un accès inattendu (`signaler`, 5 par jour), inviter si `space.invite` l'accorde (lien vers Personnes).
**Bloc vide** : n'existe pas (on a toujours un rôle, sinon 404).

### 5.2 Journal

**Ce qu'il montre** : les lignes qui me concernent, de la plus récente à la plus ancienne ; en tête, ce qui attend un geste de ma part (une invitation à accepter, une date de fin proche). Chaque ligne est une phrase : « Le 24/10, Léa vous a invité comme prestataire, jusqu'au 30 juin. »

**Données** : `audit` (`at`, `user_id`, `action`, `detail`), via `journal()` / `lire()`. Actions connues : `creation`, `invitation`, `acceptation`, `retrait`, `annulation`, `changement_role`, `ouverture`, `fermeture`, `signalement`.

| Rôle serveur | Reçoit | Ne reçoit jamais |
|---|---|---|
| owner | tout le journal de l'espace | — (jusqu'à l'évolution B) |
| editor, contributor, viewer, guest | les lignes où il agit ou est la cible | les autres lignes, ni leur nombre |

**Noms** : le journal stocke des identifiants. La page traduit `user_id` en nom **seulement** si le rôle peut voir ce membre (`member.read`) ; sinon « une personne de l'organisation ».
**Bloc vide** : « Rien ne vous concerne pour l'instant. »
**Signalements (décision de Matt)** : l'auteur d'un signalement est protégé par défaut. Aujourd'hui le propriétaire voit `user_id` sur la ligne `signalement` ; la projection du Journal doit le retirer pour tout autre que l'auteur. Changement de projection, pas de la base : le journal reste en ajout seul et complet.

### 5.3 Personnes

**Ce qu'il montre** : les membres que mon rôle peut voir, avec leur relation métier ; sinon des effectifs sans noms ; pour qui peut inviter, les invitations en cours et le geste « Inviter ».

**Données** : `space_members` joint à `user` (name, image, email), `invitations` ; fonctions `membres()`, `inviter()`, `retirer()`, `annuler()`.

| Rôle serveur | Reçoit | Ne reçoit jamais |
|---|---|---|
| owner | tous les membres, leurs adresses, rôles et fins ; les invitations | — |
| editor | tous les membres (`member.read` : organisation) ; sans adresses sauf la sienne ; **les invitations en cours aux rôles qu'il peut émettre** (`viewer`, `guest`) | les invitations aux autres rôles (décision de Matt ; aujourd'hui il n'en voit aucune) |
| contributor, viewer | lui-même, l'organisation (owner, editor), des effectifs sans noms (`summary.read`) | les noms des autres prestataires et invités |
| guest | lui-même seulement | tout effectif, tout nom |

**Gestes** : inviter (owner : tout rôle sauf owner ; editor : `viewer` et `guest` seulement), retirer et annuler (owner). Inviter et retirer sont sensibles : confirmation, puis ligne au journal.
**Bloc vide** (owner seul dans l'espace) : « Invitez les personnes de votre projet. » avec le geste.

## 6. Les gabarits suivants (à ne pas construire avant la validation du lot 1)

| Gabarit | Données nécessaires | Règles déjà dans `permissions.js` | Ce qui manque |
|---|---|---|---|
| Projet | `spaces`, `matiere` | `space.read`, `item.read` (audience) | le choix des blocs par rôle ; le visuel personnalisable |
| Déroulé | `items` (prévue dans `db/schema.sql`, absente en production) | `event.read/create/edit/delete`, `item.read` | la migration `items`, numérotée, appliquée par l'agent Neon |
| Documents | une table de documents et un stockage de fichiers à adresses signées | `document.read/edit/share/upload/delete` (autorisation explicite, même pour le propriétaire) | la table, le stockage, les adresses courtes liées au rôle |
| Messages | fils et messages | aucune | tout ; temps réel et modération |

## 7. Les noms de boutons rattachés aux gabarits

Un domaine renomme un lieu ; il n'en invente pas. Les 45 noms de lieux des docks de la #101 se rattachent ainsi :

| Gabarit | Noms de lieux |
|---|---|
| Mon accès | mareponse, acces, monavis, consentements, reglages, compte |
| Journal | notifications, journal, signalements, controle |
| Personnes | personnes, equipe, effectif, designation |
| Projet | projet, mapart, mission, surprise, realisations, pages, textes, medias, contenus, supports, monsupport, entreprise, orbe |
| Déroulé | calendrier, programme, deroule, horaires, planb, taches, quantites, pointages, pointagesgroupe, lieu |
| Documents | documents, justificatifs, devis, facture, bat, arelire, fichiers, exports, comptabilite, budget, budgetfinance |
| Messages | messages |
| Hors gabarit (navigation publique) | coeur, exemples, lab |

À vérifier par l'agent : `orbe` (lieu de la Régie) n'est pas un lieu mais l'Orbe elle-même ; `lieu` peut devenir un bloc de Déroulé plutôt qu'un bouton ; `monavis` et `pointages` (Studio) restent en démonstration tant que le Studio n'est pas derrière un vrai contrôle d'accès.

## 8. Les modèles de domaine (compositions de départ)

À la création d'un projet, le domaine propose un modèle ; le propriétaire le modifie ensuite. **Un modèle n'accorde aucun droit** : il pré-remplit, c'est tout. Aujourd'hui `MODELES = ['mariage', 'seminaire']` dans `api/_auth/espaces.mjs`.

Chaque modèle déclare :

| Champ | Mariage | Séminaire |
|---|---|---|
| Mots des relations → rôle serveur | Couple → owner ; Coordination → editor ; Témoin, Prestataire → contributor ; Parent → viewer ; Invité → guest | Organisateur → owner ; Agence → editor ; Intervenant, Équipe → contributor ; Direction → viewer ; Participant → guest |
| Rôles proposés à inviter | coordination, témoins, prestataires, invités | équipe, intervenants, participants |
| Étapes de départ (Déroulé, lot 2) | cérémonie, vin d'honneur, dîner, soirée | accueil, plénière, ateliers, clôture |
| Grand visuel | proposé par le domaine, personnalisable par le propriétaire (décision de Matt) | idem |
| Mots des boutons | Programme (guest), Déroulé (editor), Ma part (contributor) | Programme, Déroulé, Mon intervention |

Formation, association, création et transmission suivent le même gabarit de modèle, en démonstration seulement jusqu'à la validation du mariage.

## 8 bis. Les quatre places (décision de Matt, 24/10)

Ce qui est universel, ce n'est pas le type de projet, mais **la manière dont les personnes y participent**. Quatre places, que tout le monde comprend, posées sur les cinq rôles serveur **sans changer les autorisations** :

| Place | En une phrase | Rôle serveur | Mot par défaut (hors domaine, `MOTS._`) | Mariage | Séminaire |
|---|---|---|---|---|---|
| **Organisateur** | J'organise : je porte le projet | owner | l'organisation | le couple | l'organisation |
| **Coordinateur** | Je coordonne : je relie et j'organise | editor | la coordination | la coordination | l'agence |
| **Contributeur** | Je contribue : j'apporte quelque chose | contributor | contributeur | prestataire (témoin, fleuriste…) | intervenant |
| **Participant** | Je participe : je prends part | guest | participant | invité | participant |
| Participant, **consultation seule** | une variante de Participant | viewer | un proche | parent | direction |

- **Cinq rôles techniques, quatre places compréhensibles.** `viewer` reste un rôle technique distinct (lecture seule, sa page Personnes réduite, § 5.3), présenté comme une variante de Participant. Aucun droit ne change : les droits viennent toujours de `synchroview/permissions.js` et du rôle lu dans `space_members`.
- **Une place n'est ni un rôle technique rigide, ni une identité.** Elle se joue projet par projet : la même personne peut être contributrice (photographe) dans un mariage et organisatrice d'un concert, sans que son identité AIME change.
- **La relation nomme, elle n'accorde rien.** Le mot métier (« photographe », « témoin ») est la relation (`space_members.relation`, choisie à l'invitation) ; la place et le rôle restent ceux du serveur. Aujourd'hui, une seule relation par personne et par projet ; plusieurs relations dans un même projet (festivalier et bénévole) demanderaient une table à part et une migration : **pas maintenant** (décision du 24/10).
- **Dans le code** : `MOTS` de `api/_auth/pages.mjs` porte les mots par domaine ; hors mariage et séminaire, `MOTS._` parle déjà la langue commune (#114). Un nom qu'on ne peut pas voir s'écrit « une personne » dans les domaines mariage et séminaire, « une personne de l'organisation » ailleurs.
- **Transpositions possibles** (illustration, rien à construire) : festival (association · régisseur · artiste · festivalier), concert (producteur · régisseur · musicien · spectateur), formation (organisme · responsable pédagogique · formateur · apprenant).
- **L'accueil n'en est pas changé.** Les deux questions de l'accueil (le domaine, puis la place : J'organise · Je coordonne · Je contribue · Je participe) viendront après le mariage de preuve. Aujourd'hui, « Je suis… » ne propose que le mariage.

## 9. Évolution A · Le co-propriétaire (non implémentée)

**Décision de Matt** : le second membre du couple devient co-propriétaire après avoir accepté explicitement son invitation, avec des protections pour les deux.

**Aujourd'hui** : un seul propriétaire par espace ; `ROLES_INVITES` exclut `owner` ; `space.delete` et `space.manage_members` reviennent au seul `owner` ; la règle 5 refuse la suppression du compte d'un propriétaire dont l'espace a d'autres membres.

**Proposition à valider** :
1. Une invitation « co-propriétaire », que seul un propriétaire peut émettre, nominative (adresse obligatoire), à usage unique, 7 jours ; journal `invitation` puis `acceptation`.
2. Deux propriétaires au plus par espace.
3. Aucun propriétaire ne peut retirer l'autre, changer son rôle, ni supprimer l'espace seul : ces gestes demandent la confirmation des deux (ligne au journal pour chaque confirmation).
4. Règle 5 : si l'un supprime son compte, l'autre reste seul propriétaire ; l'espace n'est jamais sans propriétaire.
5. **Double validation retenue (décision de Matt)** pour les gestes graves. Base : deux lignes `owner` dans `space_members`, et une table de confirmations en attente (geste, demandeur, date, expiration). Migration numérotée, appliquée par l'agent Neon.

**Tests à écrire avant le code** : un editor ne peut pas inviter un co-propriétaire ; une troisième invitation owner est refusée ; un propriétaire seul ne peut ni retirer l'autre ni supprimer l'espace ; la suppression d'un compte laisse l'autre propriétaire ; aucune régression sur les 475 tests existants.

## 10. Évolution B · Les sous-espaces confidentiels (non implémentée)

**Décision de Matt** : la surprise des témoins reste invisible au couple, propriétaire compris.

**Aujourd'hui** : le propriétaire lit tout l'espace et tout le journal. Deux mécanismes existants vont déjà dans ce sens : `document.read` exige une autorisation explicite, même pour le propriétaire ; `item.read` filtre par audience (`public`, `membres`, `equipe`, `organisation`).

**Proposition à valider** : un **cercle** = un sous-espace nommé (« La surprise ») avec ses propres membres, créé par un membre qui en a le geste, dont le contenu porte `cercle: <id>`.
1. **Créer un cercle demande une permission explicite (décision de Matt)** : le geste `cercle.create`, accordé à personne par défaut, donné par un propriétaire à un membre précis, inscrit au journal.
2. Un contenu d'un cercle n'est lu que par les membres du cercle. Le propriétaire de l'espace n'y entre pas s'il n'en est pas membre.
3. Le journal du cercle n'est lu que par ses membres : la règle « le propriétaire lit tout le journal » devient « tout, sauf les cercles dont il n'est pas membre ».
4. **Aucune fuite par les à-côtés** : ni nombre, ni titre, ni notification, ni pastille, ni ligne « une surprise existe » chez le couple.
5. Un cercle a une date de fin (le jour du mariage) ; après elle, il peut être révélé par ses membres, avec une ligne au journal.
6. Garde-fou : un cercle ne peut pas contenir de paiement ni de document engageant l'espace (pas d'achat caché au nom du couple).

**Tests à écrire avant le code** : la réponse brute du couple (page, Dock, journal, effectifs) ne contient ni « surprise », ni l'identifiant du cercle, ni ses lignes ; un témoin hors cercle ne la voit pas ; la révélation est inscrite au journal ; un paiement dans un cercle est refusé.

## 11. Les extensions (perspective, rien à construire maintenant)

Une extension est une capacité ajoutée à un projet AIME : RIPPLECIRCLE (les conséquences d'un changement) en est le premier exemple. RIPPLECIRCLE reste une application autonome pendant son développement ; **elle n'est pas intégrée maintenant**. Ce paragraphe garantit seulement que rien dans le lot 1 n'empêche ce branchement plus tard.

**Contrat d'une extension :**
1. **Un manifeste** déclare ce dont elle a besoin : les gabarits et les types de données lus (par exemple « déroulé : heures et lieux », « personnes : rôles, sans adresses »), les gestes qu'elle peut proposer, et les rôles à qui elle s'affiche.
2. **Activation** par une personne qui en a le geste explicite sur ce projet (par défaut le ou les propriétaires) ; l'activation est inscrite au journal, avec le manifeste accepté.
3. **Elle ne lit jamais la base.** Elle reçoit, pour chaque personne qui l'utilise, la même projection que `/api/page` pour cette personne, réduite à ce que le manifeste déclare. Pas de nouvelle saisie : elle réutilise les données déjà présentes, sans en voir davantage.
4. **Elle agit au nom de la personne qui l'utilise, jamais au nom du propriétaire** qui l'a activée. Chaque geste qu'elle propose passe par la même vérification serveur que le reste.
5. **Elle propose, la personne valide** : un changement sensible (simulation de conséquences, notification à d'autres) demande une confirmation humaine, puis une ligne au journal.
6. **Désactivable** à tout moment par qui l'a activée ; ses accès cessent immédiatement.

Ce que le lot 1 doit respecter pour ne pas fermer cette porte : la projection de `/api/page` est une fonction réutilisable (personne, projet, gabarit → blocs), et non une page HTML ; les blocs ont un type et un `id` stables.

## 11 bis. Sites et espaces publiés (perspective, rien à construire maintenant)

La génération de sites et d'espaces personnalisés repose sur le même système : les mêmes blocs, le même projet, les mêmes permissions. Une personne crée son projet, personnalise son Canevas, choisit ce qui est publié, et son site retrouve automatiquement les informations autorisées, sans ressaisie.

**Quatre choses distinctes, jamais confondues :**

| Notion | Ce que c'est | Qui la décide | Portée |
|---|---|---|---|
| **Préférences personnelles** | ma disposition, mes raccourcis, mon visuel à moi | la personne | elle seule |
| **Apparence partagée du projet** | le grand visuel, la palette, la mise en page du Canevas du projet | le ou les propriétaires (geste « modifier l'apparence ») | tous les membres et le public |
| **Contenus publiables** | les blocs explicitement marqués « publié », avec leur version publiée | une personne qui a le geste `publier` sur ce bloc | le public |
| **Accès privés** | ce que chaque relation lit dans le projet | `permissions.js` | chaque rôle |

**Règle absolue : la publication ne découle jamais d'une permission de lecture.** Qu'un invité puisse lire le programme ne le rend pas public. Un bloc n'apparaît sur un site que s'il porte une publication explicite : qui a publié, quand, quelle version ; ligne `publication` au journal ; dépubliable à tout moment.

**Ce que le lot 1 doit respecter pour ne pas fermer cette porte :**
- Le public est traité comme un rôle de plus dans la composition (`public`, famille Public de `ROLES.md`) : la même fonction de projection, qui ne reçoit que les blocs publiés.
- Chaque bloc a un `id` stable et un type, pour pouvoir porter plus tard un état de publication et une version publiée distincte du brouillon.
- Les préférences personnelles et l'apparence du projet ne sont jamais stockées au même endroit ni avec les mêmes droits.
- Aucune donnée personnelle (réponses, régimes, adresses) n'est publiable, quel que soit le geste accordé.

## 12. Tests attendus (lot 1)

Ils lisent la **réponse brute** du serveur, rôle par rôle, contre la base de test éphémère (migrations jouées deux fois) :

- Mon accès : chaque rôle reçoit son propre rôle et sa fin, jamais ceux des autres ; un rôle expiré reçoit 404 et une ligne `fermeture` est écrite une seule fois.
- Journal : un non-propriétaire ne reçoit que ses lignes ; aucun nom d'un membre qu'il ne peut pas voir.
- Personnes : la réponse de l'invité ne contient aucun autre nom, aucun effectif ; celle du prestataire ne contient aucun nom d'invité ; aucune adresse e-mail hors de soi et du propriétaire.
- Gestes : un geste appelé directement sans être accordé est refusé (403) ; inviter au-delà de son rang est refusé ; `signaler` est limité à 5 par jour.
- Deux projets : aucune donnée d'un autre espace dans aucune réponse.
- Dock : la composition renvoyée ne contient aucun lieu dont le gabarit n'est pas servi, et aucun geste non accordé.
- Signalement : la réponse Journal du propriétaire ne contient pas l'identifiant de l'auteur d'un signalement ; celle de l'auteur, si.
- Invitations : la réponse Personnes d'un editor ne contient que les invitations `viewer` et `guest`.
- Public : la projection pour un visiteur sans compte ne contient aucun bloc du lot 1 (rien n'est publié par défaut), même si tous les membres peuvent le lire.
- Personnalisation (dès qu'elle existe) : une préférence qui masquerait Mon accès ou le signalement est ignorée ; aucune préférence n'ajoute une donnée.

## 13. Ordre

1. Ce contrat, validé par Matt.
2. La route `/api/page` et le Dock composé au serveur.
3. Lot 1 dans le mariage de preuve, avec les tests du § 12.
4. L'en-tête : « Domaines » sans compte, « Mes projets » connecté (le Bureau devient la surface de travail du projet ouvert).
5. Évolutions A puis B : documentées ici, testées, validées par Matt, chacune dans sa PR, sans régression.
   Personnalisation, extensions et sites publiés : plus tard ; le lot 1 ne fait que ne pas les empêcher (§ 2, § 11 et § 11 bis).
6. Lot 2 (Projet, Déroulé), puis Documents, puis Messages.

## Décisions de Matt (24/10), à couvrir par des tests

| Décision | Conséquence dans ce contrat | Test |
|---|---|---|
| L'auteur d'un signalement est protégé par défaut | Dans le journal du propriétaire, une ligne `signalement` ne contient pas `user_id` ni rien qui l'identifie (ni rôle unique, ni heure à la seconde) ; seule la personne qui signale voit sa propre ligne complète | la réponse journal du propriétaire ne contient pas l'identifiant de l'auteur ; celle de l'auteur le contient |
| L'éditeur ne voit que les invitations qu'il peut gérer | `editor` reçoit les invitations en cours aux rôles `viewer` et `guest` (ceux qu'il peut émettre), jamais les autres ; il peut annuler les siennes | la réponse Personnes d'un editor ne contient aucune invitation `contributor` ni `editor` ; annuler l'invitation d'un autre rôle est refusé |
| Double validation entre co-propriétaires | Évolution A : retirer l'autre propriétaire, changer son rôle, supprimer l'espace, transmettre demandent la confirmation des deux | un geste grave confirmé par un seul reste en attente ; il aboutit après la seconde confirmation ; chaque confirmation est au journal |
| Créer un cercle demande une permission explicite | Évolution B : un geste `cercle.create`, accordé explicitement (par défaut à personne, donné par un propriétaire à un membre, par exemple au témoin) | un membre sans le geste ne peut pas créer de cercle (403) ; l'octroi du geste est au journal |
