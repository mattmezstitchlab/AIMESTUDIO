# AIMESTUDIO · Identité, Timbre, Carte universelle et Registre (contrat)

Demande de Matt du 24/10/2026. Complète `docs/GABARITS.md` (§ 2 les quatre couches, § 11 bis la publication) et `docs/ROLES.md`.
**Statut : contrat d'architecture validé par Matt le 24/10/2026 ; aucun code, aucune table, aucune interface.** Priorité de réalisation inchangée : unification du Dock et de l'accueil, puis lot 1 du mariage de preuve. Ce document fixe seulement la direction, pour que le Timbre, la Carte et le Réseau cessent d'évoluer séparément.

## En bref

Une seule identité AIME, une seule Carte universelle, plusieurs relations, un Registre volontaire.

- **Identité** : qui est cette personne. Un compte, indépendant des projets.
- **Carte** : ce qu'elle choisit de présenter. Stable d'un projet à l'autre, enrichie peu à peu.
- **Relation** : ce qu'elle peut faire dans un projet précis. Change selon le projet : prestataire ici, invitée là, organisatrice ailleurs.

Le Timbre représente l'identité, jamais un rôle. L'inscription ne publie rien. Une candidature n'ouvre aucun accès. Rien n'est obligatoire pour répondre à une invitation.

## 1. État des lieux (code de `main` au 24/10/2026)

| Système | Fichiers | Stockage | État réel | Décision |
|---|---|---|---|---|
| Compte | `compte/`, `api/_auth/auth.mjs` (Better Auth, lien e-mail, clés d'accès) | Neon : `user` (name, email, image) | **En production** | Socle de l'identité, conservé tel quel |
| Timbre | `compte/timbre.js`, `api/identite.mjs` | Neon : `user.image` (photo ≤ 160 Ko, data URL), `identite` (timbre_le, monde_le) | **En production** | Conservé ; affiche aujourd'hui le rôle technique (« Contributeur », « Lecture seule ») : à remplacer par la relation du projet, ou rien |
| Carte A · « Carte universelle » | `carte/carte.js`, `rendu.js`, `guide.js`, `facette.js` | navigateur : `localStorage « aime-carte »` | Locale, sans compte | **Modèle retenu** : 14 rubriques facultatives, visibilité par rubrique (privée, contacts, publique), naissance et relations jamais publiques, publication explicite avec consentement et révocation, historique des versions |
| Carte B · « Cartes universelles du Studio » | `studio/index.html` | navigateur : clés `aime:*`, `aime-app` | Locale | Ancienne ; ses données utiles sont importées dans la Carte A, puis elle cesse d'écrire |
| Carte C · « Votre carte » de la landing | `aime/index.html` | navigateur : `aime-mem` | Locale, ancien concept | Idem ; `/aime/` part au Lab |
| Registre | `carte/registre-demo.js` | aucun (personnes fictives) | Démonstration, déclarée comme telle | Reste démonstration jusqu'au Registre réel (§ 5) |
| Réseau des facettes | `reseau/` (timbre → cube → facette → bloc) | navigateur (bibliothèque locale) | Démonstration | Son idée « partager une facette » devient la publication de blocs (`GABARITS.md` § 11 bis) ; pas de troisième mécanisme de publication |
| Point Zéro | `point-zero/` | navigateur + `matiere` (Neon, intention déposée) | Mixte | Garde la création d'identité (adresse, nom, timbre) ; plus une porte d'entrée concurrente |
| Porte + | `porte/porte.js`, `porte/arrivee.js` | lit `/api/identite` | **En production** | Sa logique d'état rejoint le + du Dock (un seul composant) ; ne dépend plus du Timbre (§ 6) |
| Comparatif | `/lab/cartes/` | — | Lab | Reste au Lab comme trace de la décision |

Conclusion : l'identité et le Timbre sont réels ; la Carte n'existe que dans le navigateur, en trois versions ; le Registre et le Réseau sont des démonstrations. On ne crée pas de quatrième système : la Carte A devient la Carte universelle, rattachée au compte.

## 2. Identité et Timbre

1. **Une identité = un compte** (`user`), indépendant de tout projet. Connexion par lien e-mail ou clé d'accès, déjà en place.
2. **Le Timbre est créé automatiquement**, sous une forme neutre (initiales, teinte dérivée de l'identifiant), dès la première connexion. La personne l'enrichit quand elle le souhaite : photo, nom, couleurs.
3. **Le Timbre ne porte jamais de rôle technique.** Dans un projet, il peut porter la relation de ce projet, dans les mots du domaine (« Prestataire · Mariage de Léa & Marc ») ; hors projet, rien.
4. **Le même Timbre partout** : Mes projets, Personnes, Journal, Registre, publication.
5. **Une organisation n'est pas une personne.** Une association, une agence ou une entreprise est une identité distincte, avec ses propres propriétaires (les personnes qui la gèrent), son propre Timbre et sa propre Carte. Une personne peut être rattachée à plusieurs organisations sans que leurs identités se mélangent. **Décision de Matt** : le modèle de données le prévoit dès maintenant ; les écrans de gestion des organisations viennent après la première version du Registre.
6. **Le Timbre est stable**, comme l'identité ; les relations sont des informations propres à chaque projet, qui ne modifient jamais le Timbre ni la Carte.

## 3. La Carte universelle

**Une Carte par identité**, au schéma de `carte/carte.js` (rubriques facultatives, visibilité par rubrique, publication explicite et révocable, historique).

**Trois niveaux de visibilité, par rubrique :**

| Niveau | Qui voit | Ancien nom dans `carte.js` |
|---|---|---|
| Privée | la personne seule | `privee` |
| Partagée avec un projet | les membres de ce projet que leur rôle autorise | `contacts`, remplacé par un partage **rubrique par rubrique et projet par projet** (décision de Matt) |
| Publiée | le Registre et le public | `publique` |

Règles :
- Tout est privé par défaut. Rien n'est obligatoire.
- `naissance` et `relations` ne sont jamais publiables, ni partageables avec un projet sans geste explicite.
- **Plusieurs activités** sur une même Carte (ex. saxophoniste et graphiste), chacune avec ses compétences, sa zone et ses disponibilités. **Chaque activité se publie indépendamment** : une personne peut apparaître dans le Registre pour une activité et rester invisible pour les autres. Dépublier une activité ne touche pas aux autres.
- **Préréglages, plus tard** (« ce que je montre à mes projets professionnels ») : ils pré-cochent des rubriques, la personne valide ; jamais de publication automatique.
- La Carte n'accorde **aucun rôle** et n'est jamais lue pour décider d'un droit.
- Passage du navigateur au compte : à la connexion, AIME propose d'importer la Carte locale (`aime-carte`, puis B et C), **avec l'accord explicite de la personne** ; rien n'est envoyé sans ce geste ; la copie locale peut ensuite être effacée par la personne.

## 4. Réutiliser sans ressaisir

Une personne réutilise sa Carte pour créer un projet, rejoindre un espace, publier un mini-site ou activer une extension (`GABARITS.md` § 11).

- Un projet reçoit **uniquement les rubriques que la personne partage avec ce projet**, puis la projection par rôle s'applique comme pour toute donnée.
- Une extension reçoit au plus ce que reçoit la personne qui l'utilise, réduit à son manifeste.
- Un mini-site publié n'affiche que les rubriques **publiées**.
- Aucune donnée privée ne devient partagée ou publique par effet de bord : chaque passage de niveau est un geste de la personne, inscrit à l'historique de sa Carte.

## 5. Le Registre

**Un index volontaire de Cartes publiées** (personnes et organisations). Ce n'est pas la liste des inscrits.

- L'inscription à AIME ne publie jamais une Carte. Être membre ou invité d'un projet non plus.
- On y apparaît par un geste explicite (« Publier ma carte » ou « Publier cette activité »), avec consentement daté ; on en sort immédiatement par la dépublication, y compris des résultats et des copies en cache.
- **Disponibilité** : déclarée à la main d'abord. Une synchronisation avec les projets pourra être proposée plus tard, avec accord explicite, en ne publiant que « disponible / indisponible » à une date, jamais le projet privé qui occupe la personne.
- **Filtres** : domaine, activité et métier, compétences, zone d'intervention, disponibilité déclarée, type (personne ou organisation), et les catégories de relations (prestataire, bénévole, intervenant, association…). Les familles de rôles orientent ; elles ne suffisent pas à elles seules (« prestataire » regroupe des métiers trop différents).
- **Contact par AIME**, jamais par l'affichage brut d'une adresse : le Registre ne publie ni e-mail ni téléphone, sauf si la personne publie explicitement un moyen de contact.
- Pas de comptage révélateur (« 12 profils masqués ») ; limites de fréquence contre l'aspiration des profils.

## 6. L'accueil, le + et l'arrivée par invitation

- **Une seule entrée, un seul +, un seul accès au compte, un seul Dock.** L'accueil commence par « Je suis… » (PR C, #113) ; le reste apparaît après que la personne est reconnue.
- **Le Dock garde les lieux, le + garde les actions** (décision du 24/10, #115). Sans compte : Le cœur · Exemples · + · J'ai un compte, et le + propose « Créer un projet » · « J'ai reçu une invitation ». Connecté, hors projet : AI · + · ME (depuis le 25/10 ; avant : Le cœur · Exemples · + · Mes projets · Mon compte), et le + propose « Nouveau projet » · « J'ai reçu une invitation ». Dans un projet : le Dock du serveur et les seuls gestes du rôle. Plus de « Commencer » seul, ni de liste de projets dans le + (Mes projets est un lieu du Dock). Détail : `docs/DOCK.md`, « Le Dock public et le + ».
- **Le + ne dépend pas du Timbre.** Le Timbre n'est jamais une étape bloquante.
- **Arriver par une invitation** : la personne ouvre le lien (ou le colle dans « J'ai reçu une invitation »), se connecte (inscription légère : adresse e-mail), accepte, et arrive directement dans sa perspective du projet, avec son Dock. Ni Carte ni Timbre à remplir ; son nom lui est demandé avec discrétion, sans jamais bloquer l'entrée.

## 7. Missions et candidatures

Le moteur existe déjà dans `permissions.js` (`mission.*`, `candidature.read`) : missions « ouvertes au réseau », éligibilité professionnel ou proche, qualification pour les missions réglementées, présélection par le responsable, validation par le propriétaire.

Le parcours visé :
1. Un projet **publie une mission** : geste réservé au propriétaire par défaut, **délégable explicitement à la coordination** (décision de Matt ; la délégation est un geste accordé, inscrit au journal). Seuls les champs de la mission sont publiés, jamais le projet.
2. La mission est **découvrable depuis le Registre**, filtrée par activité, zone, date.
3. Une personne **candidate** depuis sa Carte publiée. La candidature est une donnée personnelle : visible du candidat et de l'organisation du projet, jamais des autres candidats.
4. **Une candidature n'accorde aucun accès.** Seules une invitation nominative, son acceptation, puis la vérification serveur ouvrent l'espace, avec le rôle choisi par le projet.
5. Exemple : un saxophoniste publie sa Carte professionnelle ; un couple publie la mission « musicien pour le vin d'honneur » ; le saxophoniste candidate ; le couple l'invite comme prestataire ; après acceptation, il retrouve sa mission, son Dock et ses informations dans son espace AIME.

## 8. Personnalisation

Le Timbre (photo, couleurs), la présentation de la Carte et plus tard le Canevas sont personnalisables (couche 3 de `GABARITS.md` § 2). Les éléments essentiels et les règles de sécurité n'en dépendent jamais : Mon accès, le signalement d'un accès inattendu, l'Orbe, la visibilité réelle des rubriques.

## 9. Migration, sans rien détruire

1. Rien n'est effacé côté navigateur sans geste de la personne.
2. La Carte A devient le format unique ; B et C deviennent des importeurs en lecture seule, puis cessent d'écrire.
3. `/lab/cartes/` et `carte/registre-demo.js` restent, marqués « Démonstration ».
4. Le Réseau des facettes reste en démonstration jusqu'à la publication de blocs ; ses données locales ne sont pas migrées automatiquement.
5. Les tables futures (Carte au serveur, publications, Registre, missions publiées, candidatures) feront chacune l'objet d'une migration numérotée, appliquée par l'agent qui a accès à Neon (branche de test, puis production), **après** validation de ce contrat et du lot 1.

## 10. Tests attendus (quand ce sera construit)

- **Confidentialité** : une rubrique privée n'apparaît dans aucune réponse destinée à un autre ; une rubrique partagée avec le projet A n'apparaît pas dans le projet B.
- **Publication** : le Registre ne contient que des Cartes publiées ; une inscription seule n'y crée aucune entrée ; `naissance` et `relations` sont refusées à la publication.
- **Dépublication et révocation** : après dépublication, la Carte disparaît du Registre et de ses résultats à la requête suivante ; une révocation de partage retire la rubrique du projet.
- **Séparation entre projets** : aucune donnée de Carte d'un projet n'est lisible depuis un autre.
- **Candidature** : candidater ne crée aucune ligne dans `space_members` ; un candidat ne voit pas les autres candidatures.
- **Invitation sans profil** : un invité accepte et voit sa perspective sans Timbre ni Carte remplis.
- **Timbre** : aucune réponse n'affiche un rôle technique sur un Timbre.
- **Organisation** : un membre d'une organisation n'hérite d'aucun droit personnel des autres membres.

## 11. Ordre

1. Unification du Dock et de l'accueil (déjà engagée) : un seul +, détaché du Timbre.
2. Lot 1 du mariage de preuve (`GABARITS.md`).
3. Ce contrat validé par Matt, puis, chacun dans sa PR : Timbre neutre automatique et sans rôle technique ; Carte au serveur avec import consenti ; publication de Carte ; Registre ; missions publiées et candidatures.

## Décisions de Matt (24/10)

| Question | Décision | Test à prévoir |
|---|---|---|
| Réglage du partage | Rubrique par rubrique et projet par projet ; préréglages plus tard, sans publication automatique | une rubrique partagée avec le projet A est absente du projet B ; un préréglage ne publie rien |
| Organisations | Identité distincte dès le modèle ; écrans de gestion après la première version du Registre | un membre d'une organisation n'hérite d'aucune donnée personnelle des autres |
| Publication des missions | Propriétaire par défaut, délégable explicitement à la coordination | la coordination sans délégation ne peut pas publier (403) ; la délégation est au journal |
| Disponibilités | Déclaration manuelle ; synchronisation future avec accord, sans divulguer les projets privés | la disponibilité publiée ne contient ni titre, ni lieu, ni membre d'un projet |
| Activités | Plusieurs activités par Carte, chacune publiable indépendamment | une activité non publiée n'apparaît dans aucun résultat du Registre, même si une autre activité de la même personne est publiée |

**Priorité** : rien de ce contrat n'est construit avant que l'unification de l'accueil et du Dock, puis le mariage de preuve, fonctionnent de bout en bout.
