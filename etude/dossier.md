# AIME · Dossier de convergence : moteur universel et Dock unique

Version publique du 24 octobre 2026 · Matthieu Lecointre (Le Monde AIME) · étude préparée avec Claude.
Cette version retire les détails de sécurité serveur ; ils restent dans l'Atlas de référence, réservé au propriétaire du site.

Statuts utilisés : **vérifié** (observé en ligne ou lu dans le code), **inaccessible** (existe, non visible sans compte), **non implémenté** (déclaré, non construit), **à tester**. Pour les recommandations : existant vérifié, réutilisable, à modifier, à créer, hypothèse à valider.

## Synthèse

L'hypothèse résiste aux tests, avec une réserve : le Dock universel est la bonne réponse pour la navigation, pas pour les outils de production métier. Un seul Dock à quatre lieux et un + suffit aux 11 rôles audités ; cinq cas gardent un composant spécialisé, ouvert depuis ce Dock commun.

**Pourquoi l'hypothèse tient**

- Le moteur de droits est déjà universel : `synchroview/permissions.js` juge dix types de ressources sans jamais nommer un métier.
- Les 44 entrées de Dock montrées pour les 11 rôles se ramènent à sept moteurs communs. Les huit Docks métier ne diffèrent que d'un mot (Accès, Effectif, Horaires), qui désigne trois filtres d'une même vue des moments.
- AIME Live sert déjà un seul écran à cinq rôles, avec un cloisonnement correct : vérifié pendant l'audit (annonce d'équipe invisible pour l'invitée, décalage répercuté partout).
- Le vrai serveur sert déjà les mêmes pages aux cinq rôles ; c'est le contenu qui manque, pas la structure.

**Où elle cède**

- Payer, cacher une information au propriétaire, l'écran de salle, les outils de production métier (playlist, répertoire, cachets) et le jour J sous pression demandent des composants dédiés (section 3).
- L'invité doit garder un Dock réduit à deux lieux : même logique, moins d'entrées.

**Décisions à valider avant tout développement**

- [ ] Dock unique : Accueil · Programme · + · Personnes · Ressources, mots identiques pour tous (section 6).
- [ ] Le métier ne donne aucun droit ; une participation peut porter plusieurs responsabilités (section 7).
- [ ] Rôle « coordination » de l'accueil : invitation par les mariés (editor) plutôt que création du projet.
- [ ] Premier module prouvé de bout en bout : Programme, à partir d'AIME Live (section 12).
- [ ] Atlas public et Comparaison construits seulement à partir de modules réellement servis.
- [ ] Données fictives de la Comparaison : réutiliser Léa & Marc, ou créer Camille & Gabriel.

L'Atlas d'audit (482 captures, 25 anomalies) reste la référence privée.

## 1. État réel de l'architecture

Le socle universel existe déjà à moitié : le moteur de droits est indépendant du métier, mais les données, les écrans et les Docks ne le sont pas. Constats lus dans le dépôt aimestudio (commit 622eb57) et vérifiés sur l'Atlas d'audit du 24 octobre 2026 (482 captures).

### Ce qui est réellement en production

| Entité | Où | Ce qu'elle contient | Statut |
| --- | --- | --- | --- |
| Personne (identité) | table `user` (Better Auth), `identite`, `passkey` | nom, e-mail, photo, Timbre | Existant vérifié |
| Métier déclaré | table `activites` (`user_id`, `metier`, `publiee=false`) | un métier libre, sans projet ni droit | Existant vérifié |
| Projet | table `spaces` (`kind` ∈ evenement / projet / atelier, `title`, `owner_id`, `data jsonb`) | tout le contenu métier dans un seul champ JSON | Existant vérifié |
| Participation | table `space_members` (`role`, `relation`, `jusqu_au`), clé primaire `(space_id, user_id)` | un seul rôle par personne et par projet | Existant vérifié |
| Invitation | table `invitations` (jeton haché, rôle, e-mail, expiration 7 j ou 48 h) | rôle owner jamais invitable | Existant vérifié |
| Historique | table `audit`, en ajout seul, et `live_journal` | gestes, invitations, retraits, signalements | Existant vérifié |
| Moments, documents, messages | aucune table | — | Non implémenté |

### Les droits : déjà universels

`synchroview/permissions.js` est la meilleure pièce du système. Il raisonne par type de ressource, jamais par métier : `space`, `event`, `document`, `personal`, `member`, `summary`, `item` (audience public / membres / équipe / organisation), `mission`, `candidature`, `payment`. Le même fichier sert le serveur et l'affichage (AIME Live, vitrines). Les cinq rôles serveur (owner, editor, contributor, viewer, guest) sont des niveaux de portée, pas des métiers.

Limite : ce moteur n'est appelé côté serveur que pour l'espace, les membres et les invitations. Moments, documents, missions et paiements ne sont jugés que dans des démonstrations.

### Les écrans : trois mondes qui ne se parlent pas

| Monde | Exemples | Données | Dock |
| --- | --- | --- | --- |
| Projet réel | `/projets/?espace=` : Mon accès, Journal, Personnes | serveur (Neon) | `composerReel` : Mon accès · Journal · Personnes, pour les 5 rôles |
| Démonstrations moteur | AIME Live, vitrine de perspective, exemple World | `vitrine/donnees/*.json` (moments, documents, missions, paiements) + règles réelles | composant AIMEDockVue (exemples) ou aucun (Live) |
| Démonstrations scénarisées | téléphones de l'accueil, mosaïque | écrits à la main dans `accueil/demo.js`, `exemples/mosaique` | Dock dessiné à la main (« Alertes ») |

### Propagation de l'information

Trois mécanismes coexistent, aucun n'est serveur pour le contenu : état JS d'une page (le cœur, la mosaïque), BroadcastChannel entre onglets (`live/canal.js`, vitrine World), et `postMessage` entre iframes (SynchroView, réservé). Le test de l'audit confirme qu'ils appliquent bien les règles : une annonce « équipe » de la coordination atteint mariés et prestataires, pas l'invitée ni la lecture seule ; un décalage de 15 min se répercute partout où le moment est visible.

### Incompatibilités à lever avant tout moteur universel

1. **Une seule participation par projet** : la clé `(space_id, user_id)` interdit d'être à la fois témoin et photographe d'un même mariage.
2. **Le métier ne touche jamais les droits** : `relation` est un mot libre, `activites` n'est relié à aucun projet. C'est sain, mais aucune capacité métier ne peut s'y accrocher.
3. **Le contenu vit dans `spaces.data` (JSON)** : pas de moment, de document ni de message adressable, donc rien à autoriser finement côté serveur.
4. **Deux modèles de données** : le modèle riche des démonstrations (`vitrine/donnees`) n'a pas d'équivalent en base.
5. **Trois implémentations du Dock** et un vocabulaire qui change d'une page à l'autre.
6. **Le propriétaire voit tout** : aucune information ne peut lui être cachée (la « Surprise » du témoin n'est possible qu'en démo).
7. **Rôle « coordination » mal raccordé** : l'accueil la rend propriétaire.

## 2. Matrice de convergence des écrans

Les 44 entrées de Dock montrées pour les 11 rôles (4 chacun) se ramènent toutes à sept moteurs communs ; les différences sont de vocabulaire et de portée, pas de nature. Relevé fait sur les Docks de démonstration de l'accueil, de la mosaïque, de l'exemple World et du modèle `dock/modele.js`, croisé avec AIME Live.

### Ce que les 11 Docks contiennent réellement

| Entrée affichée | Rôles qui l'ont | Ce qu'elle montre | Moteur commun |
| --- | --- | --- | --- |
| Alertes / Notifications | 10 sur 11 (tous sauf l'invité) | ce qui a changé pour moi | Journal filtré par portée |
| Mission / Projet / Ma part | 10 sur 11 | ma part du projet | Vue d'ensemble contextuelle |
| Documents | 8 sur 11 (les métiers) | contrats, devis, plans, playlist | Ressources |
| Horaires / Agenda / Déroulé / Programme | 6 sur 11 | les moments qui me concernent | Moments |
| Accès / Lieu | 4 sur 11 | où entrer, où aller | Moments (lieu d'un moment) |
| Effectif / Équipe | 3 sur 11 | combien, qui | Personnes (agrégé ou nominatif) |
| Messages | 2 sur 11 sur l'accueil, 4 sur 6 dans World | conversations | Échanges |
| Réponse | 1 (invité) | ma confirmation | Confirmations |
| Plan B | 1 (coordination) | variante d'un moment | Moments (attribut) |
| Surprise | 1 (témoin, mosaïque) | ce qui est caché aux mariés | Aucun : demande un espace confidentiel |

Le cas des métiers est parlant : les Docks du fleuriste, du traiteur, du musicien, de l'intermittent, du vidéaste, du photographe, du DJ et du lieu sont identiques à une entrée près (Accès, Effectif ou Horaires), et ces trois mots sont trois filtres d'une même vue des moments.

### Matrice par fonction (A universalisable, B avec adaptation, C spécifique justifié)

| Fonction | Emplacement actuel | Rôles | Équivalents | Similarité | Données communes | Différences de droits | Différences d'interaction | Composant universel | Classe |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ce qui a changé | Alertes (démo), Journal (réel) | tous | Notifications, Journal, Signalements | Forte : même flux d'événements, filtré | événements datés, auteur, cible | portée de lecture (owner tout, autres leurs lignes) | pastille, silence pour l'invité | Journal | A |
| Mon accès | réel seulement | tous | « Ce qu'il contrôle », Ma désignation | Totale | rôle, origine, fin, capacités | aucune | aucune | Mon accès | A |
| Programme du jour | Live, vitrine, mosaïque | tous | Déroulé, Horaires, Agenda, Programme, Accès, Lieu | Forte : mêmes moments | titre, début, fin, espace, public / équipe | event.read (invité : public seulement), event.edit (organisation ; contributeur : ses moments) | décaler, plan B, « c'est fait » selon le droit | Moments | B |
| Personnes | réel, World | tous sauf invité | Invités, Effectif, Équipe, Contacts, Intervenants | Forte : mêmes membres, portée différente | membres, relation, réponse | member.read (organisation tout ; contributeur : l'organisation ; invité : lui-même), summary.read pour les totaux sans noms | vue nominative ou agrégée | Personnes | B |
| Documents | démo seulement | métiers, organisation | Justificatifs, Devis, Contrat, Playlist, Répertoire, Plan, Bon à tirer | Forte pour stocker et partager ; faible pour certains formats | fichier, auteur, autorisations explicites | document.read : auteur ou autorisation explicite | déposer, valider, signer selon le type | Ressources | B |
| Messages | démo seulement | tous | Écrire aux mariés / à la coordination / aux témoins | Totale : seuls les destinataires changent | fil, participants | qui peut écrire à qui (portée member.read) | aucune | Échanges | A (à créer) |
| Confirmer | démo | invité, métiers, Studio | Réponse, Confirmer ma présence, Confirmer l'impression, mission.confirm | Forte : un oui / non daté sur un objet | objet, personne, état | personal.edit sur soi ; organisation pour tous | formulaire très court | Confirmations | B |
| Signaler un retard / imprévu | démo, Live | métiers, coordination | Signaler un incident, Retard, Imprévus | Forte : un événement sur un moment | moment, écart, auteur | contributeur sur ses moments | cascade réservée à l'organisation | Moments (geste) | B |
| Tâches | World, modèle | organisation, équipe | Ajouter une tâche, Ma part | Totale | intitulé, assigné, état | assigné ou organisation | aucune | Tâches | A |
| Missions et candidatures | World | organisation, prestataires | Candidater, Proposer au couple, Valider | Forte : moteur déjà écrit (mission.*) | étapes, affectés, candidats | 14 règles par étape | parcours en 6 étapes | Missions | B |
| Paiements | démo | organisation, financeurs, prestataires payés | Budget, Budget financé, Ma facture | Moyenne en lecture, faible pour payer | montant, payeur, bénéficiaire | payment.read ; payment.pay exige une autorisation de transaction | confirmation lisible obligatoire | Finances (lecture) + parcours de paiement | B / C |
| Médias | galerie (démo) | tous | Galerie, Réalisations, Médias | Forte | image, auteur, audience | item.read par audience | aucune | Ressources (vue galerie) | B |
| Surprise | mosaïque | témoin, coordination | — | — | — | doit être cachée au propriétaire | — | Espace confidentiel | C |
| Écran de salle | Live `?mode=salle` | appareil public | — | — | moments publics | guest | aucune interaction, lisible à 5 m | Moments, mode affichage | C |
| Outils de production métier | aucun (annoncés) | DJ, musicien, intermittent, lieu | Playlist, Répertoire, Cachets, Plan | Faible | — | — | formats propres | Capacités métier branchées sur Ressources | C |

## 3. Différences réellement justifiées

Cinq cas résistent à l'unification ; aucun ne justifie un Dock propre à un métier, tous justifient un composant spécialisé ouvert depuis le Dock commun.

| Cas | Pourquoi la configuration du composant universel ne suffit pas | Ce qu'on garde commun | Statut |
| --- | --- | --- | --- |
| Payer | Un paiement exige une autorisation propre à la transaction (`payment.pay`, `needsTx`), une confirmation lisible, un prestataire de paiement et des obligations légales. Un simple bouton dans une liste créerait le risque d'un paiement à un toucher. | La lecture des montants (Finances) suit le moteur commun ; seul le parcours de paiement est dédié. | À créer |
| Information cachée au propriétaire (Surprise) | Le moteur actuel donne tout au propriétaire. Cacher une donnée à l'organisateur demande un sous-espace confidentiel avec ses propres membres, pas un filtre d'affichage, sinon le serveur la renverrait quand même. | Le sous-espace réutilise moments, ressources et échanges. | Non implémenté |
| Écran de salle | Un appareil public n'est pas une personne : pas de compte, aucune interaction, lisibilité à distance. Live le traite déjà comme un invité fictif. | Les moments publics et leur mise à jour. | Existant vérifié (démo) |
| Outils de production métier | Une playlist, un répertoire, un plan de salle ou une déclaration d'intermittent ont des formats, des contrôles et parfois des règles légales propres. Les forcer dans « Documents » dégraderait le travail du professionnel. | Le partage, l'autorisation, la version et la notification passent par Ressources. | À créer, branché comme capacité métier |
| Jour J en direct | Sous pression, un prestataire veut « maintenant / ensuite » et un seul geste (signaler un retard), pas une navigation. | Les mêmes moments ; c'est un mode d'affichage du moteur Moments, pas un module à part. | Existant vérifié (Live, démo) |

### Ce qui deviendrait plus difficile si l'on unifiait trop

- **L'invité** : il n'a besoin que du programme, du lieu et de sa réponse. Lui montrer le même Dock que la coordination, même grisé, contredirait la règle « absent plutôt que grisé » et alourdirait un parcours qui doit rester d'une minute.
- **La coordination le jour J** : elle enchaîne décaler, prévenir, activer le plan B. Si chaque geste demande d'ouvrir un module puis un menu, elle perd du temps. Les gestes fréquents doivent rester dans le +, au contact des moments.
- **Le vocabulaire métier** : « Effectif » parle au traiteur, « Invités » aux mariés. Un mot unique imposé partout (« Personnes ») est juste pour la navigation, mais le titre et les colonnes de l'écran doivent garder le mot du métier.

## 4. Composants mutualisables

La moitié du moteur universel existe dans le dépôt ; il manque surtout les tables de contenu et un Dock unique branché sur le serveur.

| Composant | Fichier | Rôle dans le moteur cible | Verdict |
| --- | --- | --- | --- |
| Règles d'accès par type de ressource | `synchroview/permissions.js` | Source unique des droits, serveur et affichage | Réutilisable tel quel ; à appeler côté serveur pour chaque nouvelle ressource |
| Composition du Dock | `dock/modele.js` (`composer`, `composerReel`) | Calcul des lieux et des gestes à partir des droits | Réutilisable ; à simplifier (une seule grammaire, plus d'instances métier) |
| Rendu du Dock | `dock/dock.js` (AIMEDockVue, WCAG 2.2 AA) | Composant unique pour toutes les pages | Réutilisable ; à imposer à la mosaïque et à l'accueil |
| + public | `dock/plus.js` | Gestes hors projet | Réutilisable |
| Gabarits servis | `api/_auth/pages.mjs` (`pagesDe`, 3 servis sur 7) | Pages calculées au serveur par participation | Réutilisable ; à étendre (Moments, Ressources, Échanges) |
| Membres et invitations | tables `space_members`, `invitations` | Participations, expiration, relation | Réutilisable ; à modifier (plusieurs responsabilités par projet) |
| Historique en ajout seul | table `audit` | Journal et preuves | Réutilisable tel quel |
| Rejeu du jour J | `live/modele.js`, `live/canal.js` | Vue par rôle d'un journal de gestes, synchronisation | Réutilisable pour le moteur Moments ; à brancher sur le serveur |
| Politique de vitrine | `vitrine/rendu.js` (`politique`) | Ce que chaque perspective voit et ne voit pas | Réutilisable pour Comparaison et Atlas public |
| Rendu multi-écrans | `coeur/coeur.js` | N écrans d'un même projet, recomposés depuis une saisie | Réutilisable comme base du mode Comparaison |
| Comparateur synchronisé | `synchroview/` | Vues côte à côte, défilement lié | Réutilisable ; aujourd'hui réservé au propriétaire |
| Vocabulaire métier en données | `vitrine/metiers.json` | Mots et gestes d'un métier sans écran codé à la main | Réutilisable ; à transformer en capacités métier |
| Registre des modules | `/capacites/` (1 191 modules déclarés) | Matière première de l'Atlas comme module | Réutilisable |
| Docks écrits à la main | `accueil/demo.js`, `exemples/mosaique` | — | À remplacer par AIMEDockVue |

## 5. Architecture cible du moteur universel

La chaîne PROJET → PARTICIPATION → PERMISSIONS → CONTEXTE → DOCK → ACTIONS tient sur l'existant : seul l'étage Permissions est déjà complet ; les autres sont à étendre ou à créer. Le métier ne donne aucun droit : tout passe par la participation.

| Étage | Rôle | Statut |
| --- | --- | --- |
| 1. Projet | `spaces` : type, titre, données ; le contenu vit encore dans un champ JSON | Existant, à structurer |
| 2. Participation | niveau, relation, fin, responsabilités ; plusieurs par personne et par projet | À modifier |
| 3. Permissions | `permissions.js` au serveur, à chaque requête ; jamais décidées par l'écran | Existant |
| 4. Contexte | pages servies et données filtrées pour cette participation (`pagesDe`) | À étendre |
| 5. Dock | `composerReel` : Accueil, Programme, +, Personnes, Ressources ; mêmes mots pour tous | À modifier |
| 6. Actions | gestes du + et boutons au contact du contenu ; revérifiés et journalisés | À brancher |

Le Contexte puise dans huit moteurs communs : Journal (existe), Accueil (à modifier), Moments (à créer, depuis Live), Personnes (existe, à étendre), Ressources (à créer), Échanges (à créer), Confirmations (à créer), Capacités métier (à créer, en option). Un type de projet (mariage, formation, création) n'ajoute ni étage ni lieu de Dock, seulement des vues et des capacités métier.

## 6. Le Dock unique

Recommandation : quatre lieux fixes et le + au centre, les mêmes mots pour tout le monde, et des entrées absentes (jamais grisées) quand la participation ne les ouvre pas. Les dix familles proposées se ramènent à quatre lieux : les autres sont des vues internes ou des gestes.

| Position | Lieu | Ce qu'il réunit (entrées actuelles) | Qui l'a | Statut |
| --- | --- | --- | --- | --- |
| 1 | **Accueil** | Alertes, Notifications, Mission, Projet, Ma part, Mon accès (en tête d'écran) | tous | À modifier (le Journal et Mon accès existent) |
| 2 | **Programme** | Agenda, Déroulé, Horaires, Accès, Lieu, Plan B, jour J | tous | À créer (moteur Moments) |
| 3 | **+** | les gestes du rôle dans ce projet | tous ceux qui ont au moins un geste | Existant à brancher |
| 4 | **Personnes** | Invités, Effectif, Équipe, Contacts, Messages | tous sauf l'invité | À modifier (Personnes existe) |
| 5 | **Ressources** | Documents, Contrats, Devis, Playlist, Médias, Budget en lecture | qui a au moins une ressource autorisée | À créer |

Ce que deviennent les autres familles :

- **Échanges** : dans Personnes (écrire à une personne ou à un groupe) et dans le + (« Écrire »). Les conversations récentes remontent dans Accueil. Pas de lieu propre : 2 rôles sur 11 l'avaient sur l'accueil.
- **Actions / Décisions** : le +, et les boutons au contact du contenu (décaler un moment, confirmer sur la carte du moment). Une action ponctuelle ne mérite jamais une entrée du Dock.
- **Finances** : une vue de Ressources pour la lecture ; le paiement est un parcours dédié lancé depuis le + (section 3).
- **Médias** : une vue galerie de Ressources.
- **Atlas** : un mode de lecture d'Accueil et de Ressources (section 11), pas une entrée.
- **AIME / Assistance** : l'Orbe vit dans le +, comme le prévoit déjà `docs/DOCK.md` (« l'Orbe n'est pas un lieu »).

### Le Dock selon la participation (projet Mariage)

| Participation | Accueil | Programme | + | Personnes | Ressources |
| --- | --- | --- | --- | --- | --- |
| J'organise (mariés) | ✓ | ✓ (modifier) | Inviter, Écrire, Ajouter une tâche, Payer | ✓ tous | ✓ |
| Je coordonne | ✓ | ✓ (modifier, plan B) | Décaler, Plan B, Prévenir, Inviter | ✓ tous | ✓ |
| Je contribue (8 métiers) | ✓ « Ma mission » | ✓ mes moments | Signaler un retard, Déposer, Confirmer | ✓ l'organisation + effectifs | ✓ mes ressources |
| Je participe (invité) | ✓ | ✓ public | Confirmer ma présence, Écrire | — | — si aucune |

L'invité garde la même place pour chaque chose, avec deux lieux au lieu de quatre. La logique reste identique ; seule la quantité change.

### Exigences

- Texte sous chaque icône, cibles de 44 px, menu du + au clavier (flèches, Échap) : déjà dans `dock/dock.js`.
- Sur téléphone : 4 lieux + le + tiennent sur 393 px (vérifié sur les captures iPhone du Dock public, 3 lieux + le +).
- Extension sans encombrement : un nouveau type de projet n'ajoute pas de lieu ; il ajoute des vues dans les lieux existants et des gestes dans le +.
- Le Dock ne décide d'aucun droit : il affiche la composition calculée au serveur par `composerReel`.

## 7. Modèle des projets, participations et permissions

Recommandation : un noyau de six objets communs à tous les types de projet, et une participation qui peut porter plusieurs responsabilités. Le métier décrit la personne ; il ne donne jamais un droit.

### Les six notions à séparer

| Notion | Question | Où aujourd'hui | Cible | Statut |
| --- | --- | --- | --- | --- |
| Identité | Qui est-ce ? | `user`, `identite` (Timbre) | inchangé | Existant vérifié |
| Métier, compétences | Que sait-elle faire ? | `activites.metier` (libre, non publié) | `competences` (métier, qualifications vérifiées) : sert à proposer des missions, jamais à autoriser | À modifier |
| Relation au projet | Qui est-elle pour ce projet ? | `space_members.relation` (40 caractères) | inchangé : « témoin », « photographe », « mère de la mariée » | Existant vérifié |
| Responsabilités | Que doit-elle faire ici ? | — | `responsabilites` (participation × moment, mission ou ressource) | À créer |
| Autorisations effectives | Que peut-elle faire ici ? | `space_members.role` (5 niveaux) + `permissions.js` | inchangé, calculé au serveur à chaque requête | Existant vérifié |
| Préférences d'affichage | Comment veut-elle voir ? | — | par personne et par projet (ordre, silence, langue) | À créer |

### Le noyau universel

| Objet | Champs essentiels | Règle d'accès existante | Statut |
| --- | --- | --- | --- |
| Projet | type (mariage, formation, événement…), titre, dates, identité visuelle | `space.*` | Existant (`spaces`) |
| Participation | personne, niveau (owner…guest), relation, fin, état (invitée, active, retirée) | `member.*`, `space.invite` | À modifier : clé `(space_id, user_id)` → identifiant propre, plusieurs responsabilités |
| Moment | titre, début, fin, lieu, audience (public, membres, équipe, organisation), attribué à | `event.*`, `item.read` | À créer (table) |
| Ressource | nature (document, média, contrat, playlist), auteur, autorisations explicites, version | `document.*` | À créer (table + stockage) |
| Échange | fil, participants, message | portée `member.read` | À créer (règles à écrire) |
| Événement | qui, quoi, sur quoi, quand ; en ajout seul | `audit` | Existant vérifié |

Les capacités métier (missions, paiements, plan de salle, cachets d'intermittent) s'ajoutent comme des types de ressource supplémentaires dans `permissions.js`, jamais comme des tables par métier. Le moteur `mission.*` montre que c'est faisable : 14 règles, aucune ne nomme un métier.

### Règles de cycle de vie

- **Retrait** : la participation passe à « retirée » ; le Dock disparaît à la requête suivante. L'historique reste.
- **Expiration** : `jusqu_au` existe déjà et est refusé après échéance ; à afficher dans le Dock réel, qui ne le montre pas encore.
- **Partage limité** : une ressource n'est visible que par son auteur et les personnes autorisées explicitement (`document.read`) ; c'est déjà la règle.
- **Journalisation** : chaque ouverture, retrait, changement de rôle et geste sensible écrit une ligne `audit` ; `changement_role` est prévu mais n'a aucun point d'accès.
- **Jamais par le composant** : un écran ne reçoit que les champs que la règle autorise. L'audit a relevé quelques réponses serveur qui transmettent plus de champs que nécessaire ; elles sont à corriger avant toute extension (détail dans l'Atlas de référence).

## 8. Un même module, plusieurs usages

AIME Live le prouve déjà sur le module Temps : un seul écran, un seul journal de gestes, cinq rôles, et chacun ne voit et ne fait que ce que la règle lui accorde. Les cellules « Live » sont vérifiées, les autres sont la cible.

### Temps (moteur Moments)

| Participation | Voit | Peut faire | Vérifié |
| --- | --- | --- | --- |
| Mariés (owner) | les 9 moments, équipe comprise | décaler, cascade, plan B, annoncer | oui (Live) |
| Coordination (editor) | les 9 moments | décaler, cascade, plan B, annoncer à l'équipe ou à tous | oui (Live) |
| DJ (contributor) | les 9 moments | gestes sur ses propres moments (3 boutons) | oui (Live) |
| Fleuriste (contributor) | les 9 moments | aucun geste (0 bouton relevé) | oui (Live) |
| Invitée (guest) | 6 moments publics | aucun geste ; reçoit les changements | oui (Live) |

### Personnes

| Participation | Voit | Peut faire |
| --- | --- | --- |
| Mariés | tous les membres, réponses, régimes | inviter (tous niveaux sauf owner), retirer |
| Coordination | tous les membres, e-mails masqués | inviter lecteurs et invités |
| Traiteur | l'organisation, et « 87 couverts » sans noms | écrire à l'organisation |
| Invitée | elle-même | modifier sa réponse |

### Ressources

| Participation | Voit | Peut faire |
| --- | --- | --- |
| Mariés | les ressources où ils sont autorisés | déposer, partager, signer |
| Photographe | son contrat, les accès du domaine | déposer, voir le contrat |
| DJ | ses horaires, sa playlist | déposer la playlist (capacité métier) |
| Invitée | le livret et le plan d'accès publics | télécharger |

### Confirmations

| Participation | Objet confirmé | Effet |
| --- | --- | --- |
| Invitée | sa présence | l'effectif change chez le traiteur, sans nom ni sonnerie |
| Musicien | sa disponibilité sur un moment | la coordination voit le moment couvert |
| Imprimeur (Studio) | l'impression d'un bon à tirer | l'auteur est prévenu |
| Prestataire (World) | sa mission (`mission.confirm`) | le démarrage devient possible |

### Échanges

| Participation | Peut écrire à | Ne peut pas écrire à |
| --- | --- | --- |
| Mariés | tout le monde | — |
| Prestataire | l'organisation | les invités |
| Invitée | les mariés | les autres invités, les prestataires |

Dans chaque famille, les données sont les mêmes ; seules la portée et la liste des gestes changent. C'est exactement ce que `permissions.js` calcule aujourd'hui.

## 9 et 10. Atlas public et mode Comparaison

Recommandation : deux Atlas qui partagent le même moteur mais jamais les mêmes données. L'Atlas de référence reste privé ; l'Atlas vivant est public et ne montre que des projets fictifs, rendus en direct par les vrais composants.

| | Atlas de référence (privé) | Atlas vivant (public) |
| --- | --- | --- |
| Contenu | captures d'audit, chemins, anomalies, permissions techniques, tests, preuves de non-régression | projets fictifs rendus en direct, explications des droits, modules universels |
| Source | l'audit (482 captures, 24/10/2026) | les moteurs opérationnels + des données de démonstration |
| Accès | propriétaire du site (comme `/regie/`, protégé par le middleware) | tout le monde, sans compte |
| Ne contient jamais | — | donnée personnelle, faille, jeton, capture d'administration, anomalie de sécurité |
| Statut affiché | vérifié · inaccessible · non implémenté · à tester | opérationnel · prototype · concept |
| Existant | `/atlas/` (réservé) | à créer ; s'appuie sur `coeur/coeur.js` et `vitrine/rendu.js` |

### Ce que l'Atlas vivant permet

- Choisir un **type de projet** (mariage, séminaire, formation) et une **participation** (j'organise, je coordonne, je contribue, je participe).
- Filtrer par **fonction** (Programme, Personnes, Ressources), par **format** (téléphone, tablette, ordinateur) et par **parcours**.
- Ouvrir un écran et voir, à côté, **pourquoi** chaque information est visible ou masquée : la règle (`event.read : invité, moment public`) traduite en une phrase.
- Passer en **Comparaison**.

### Le mode Comparaison

Le visiteur choisit un projet, puis un moment ; les colonnes montrent la même réalité vue par plusieurs personnes. Exemple avec les données fictives existantes (Léa & Marc, 14 juin 2027) :

| Ce qu'on compare | Mariés | Coordination | Traiteur | Musicien | Invitée |
| --- | --- | --- | --- | --- | --- |
| Moment « Vin d'honneur », 16 h, Orangerie | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consigne « ouverture des bars à 15 h 50 » | ✓ | ✓ | ✓ | ✓ | masquée (équipe) |
| Effectif | 87 / 120, noms | 87 / 120, noms | 87 couverts, sans noms | — | — |
| Gestes | décaler, plan B | décaler, plan B, prévenir | signaler un retard | confirmer sa disponibilité | — |
| Après « décaler de 30 min » | prévenu | auteur | prévenu, sonnerie | prévenu | prévenue (moment public) |

Ce tableau est la cible, pas l'existant : la vue prestataire actuelle ne montre pas le vin d'honneur et l'espace de démonstration ne contient aucun musicien.

Le décalage est simulé dans le navigateur : il rejoue le même journal pour chaque colonne avec `live/modele.js` et `permissions.js`, sans toucher aucun projet réel. Les cases « masquée » affichent la règle, jamais la donnée.

Point à valider : le brief cite « Camille & Gabriel » et « Cocktail ». Les données publiables existantes sont Léa & Marc et « Vin d'honneur » ; créer un nouveau jeu fictif coûte peu, mais ajoute un troisième mariage de démonstration au site.

## 11. L'Atlas comme module universel

C'est faisable, à condition de le définir comme une façon de parcourir une collection reliée, et non comme une mosaïque. L'Atlas d'audit en est déjà un premier exemplaire : 482 éléments, des relations (rôle, Dock, écran, anomalie), des filtres et des fiches.

| Usage | Éléments | Relations | Représentation la plus utile |
| --- | --- | --- | --- |
| Mariage | moments, ressources, intervenants | qui intervient à quel moment, quel document sert où | frise du jour, et fiche par moment |
| Formation | séquences, contenus, ressources | prérequis, ordre | parcours ordonné, et carte des séquences |
| Projet créatif | fragments, versions | « dérive de », « remplace » | galerie, et arbre des versions |
| Audit UX | écrans, anomalies, rôles | « vu par », « concerne » | mosaïque filtrable, comparaison côte à côte |

### Ce qu'il faut pour le généraliser

- **Un contrat d'élément commun** : identifiant, type, titre, aperçu, audience, relations. Les moments, ressources et événements du noyau (section 7) le remplissent déjà presque.
- **Les droits du moteur, pas de l'Atlas** : un élément n'apparaît dans un Atlas que si `permissions.js` autorise sa lecture pour cette participation. L'Atlas n'ajoute aucune règle.
- **Plusieurs représentations** : mosaïque, frise, liste, graphe de relations, comparaison. Le choix dépend du type d'élément, pas d'un réglage de l'utilisateur.
- **Une base existante** : le registre de `/capacites/` (1 191 modules) et la recherche par fragments prévue pour l'Atlas AIME dans SynchroView.

Risque : un Atlas générique peut devenir un deuxième Canevas. La frontière proposée : le Canevas crée et modifie, l'Atlas lit, relie et compare.

## 12 et 14. Plan de migration et premier parcours

Recommandation : prouver d'abord le module Programme, le seul dont un moteur complet existe déjà (AIME Live), puis étendre écran par écran sans retirer l'ancien tant que le nouveau n'est pas vérifié.

| Phase | Contenu | Porte de sortie |
| --- | --- | --- |
| 1. Comprendre | Atlas d'audit (fait), matrice de convergence (faite), décisions de ce dossier | décisions validées |
| 2. Définir | lexique et Dock unique, plusieurs responsabilités, contrats de composants | migrations relues |
| 3. Prouver | module Programme complet, repris d'AIME Live, au serveur ; 5 comptes de test, 1 projet | tests de refus verts |
| 4. Vérifier | droits, retrait, expiration ; accessibilité WCAG 2.2 AA ; iPhone, iPad, ordinateur | zéro régression |
| 5. Étendre | Personnes, Ressources, Échanges, Confirmations ; ancien écran gardé en parallèle | remplacement vérifié |
| 6. Démontrer | Atlas vivant et Comparaison, à partir des modules servis, données fictives seulement | revue de confidentialité |

Chaque phase se teste de bout en bout et se désactive : le nouvel écran est servi à côté de l'ancien, derrière un réglage par projet, et le retour arrière consiste à couper ce réglage.

### Pourquoi Programme en premier

| Critère | Programme | Personnes | Ressources | Échanges |
| --- | --- | --- | --- | --- |
| Valeur pour l'utilisateur | haute (tous les rôles, jour J) | moyenne | haute | haute |
| Moteur existant | complet en démo (`live/modele.js`, `event.*`) | serveur, partiel | règles seules | aucun |
| Ce qui manque | une table des moments, un point d'accès, la page servie | portée nominative / agrégée | table, stockage | tout |
| Risque de régression | faible (page nouvelle) | moyen (page existante) | faible | faible |

### Le premier parcours de bout en bout

1. Les mariés (compte de test owner) créent un projet Mariage de test et y ajoutent trois moments, dont un réservé à l'équipe.
2. Ils invitent la coordination (editor), le DJ (contributor, attribué au moment « Ouverture du bal ») et une invitée (guest).
3. Chacun ouvre le projet : le Dock affiche Accueil et Programme pour tous, Personnes pour tous sauf l'invitée.
4. La coordination décale le vin d'honneur de 30 minutes avec cascade.
5. Le DJ voit le nouvel horaire et signale un retard sur son propre moment ; il ne peut pas décaler celui des autres (refus serveur journalisé).
6. L'invitée voit le nouvel horaire du moment public, ne voit jamais le moment d'équipe, et n'a aucun geste de modification.
7. Les mariés retirent le DJ : son Dock disparaît à la requête suivante et la ligne de retrait apparaît au Journal.

Critère de réussite : chaque étape est un test automatisé sur une base PostgreSQL de test, avec une migration numérotée appliquée d'abord sur une branche Neon de test, comme le prévoit la règle du dépôt.

## 13. Risques, contraintes, inconnues

Le risque principal n'est pas technique : c'est de construire l'Atlas public et la Comparaison avant que les moteurs soient réels, et de refaire une couche de démonstration de plus.

| Risque | Effet | Parade | Gravité |
| --- | --- | --- | --- |
| Démonstrations sans équivalent opérationnel | Le site promet ce que le produit ne fait pas (déjà vrai pour 4 pages sur 7 et pour les Docks de démo) | Aucune nouvelle démo tant que le moteur correspondant n'est pas servi par le serveur | Haute |
| Fuite de données à la généralisation | Un composant commun expose ce qu'une vue spécialisée cachait | Corriger d'abord les écarts relevés par l'audit ; un test refus rôle × geste par nouvelle ressource | Haute |
| Migration de `space_members` | Changer la clé casse invitations, journal et Dock | Nouvelle table de responsabilités à côté, sans toucher la clé, puis bascule | Moyenne |
| Sur-unification | Invité et jour J deviennent plus lents | Dock à lieux absents, mode « maintenant », gestes dans le + | Moyenne |
| Plusieurs chantiers concurrents | AIMESTUDIO, AIME FINAL, AIME-NEXT, AIMENEW, plusieurs agents | Un seul dépôt cible pour ce moteur : AIMESTUDIO, seul connecté à Neon | Moyenne |
| Vocabulaire | Changer « Alertes » en « Accueil » dérange ceux qui ont vu les démos | Un lexique unique publié, appliqué à toutes les démos en une fois | Basse |

### Inconnues à lever

- Écrans connectés jamais vus : aucun compte de test n'existe en production. Il faut 5 comptes de test (un par niveau) invités dans un même projet de test, sur une branche Neon de test.
- Charge du jour J réel : Live n'a jamais tourné « entre appareils » en production.
- Stockage des ressources : aucun stockage de fichiers n'est choisi (Neon Object Storage ou autre).
- Messages : aucune règle de portée n'est écrite ; c'est le seul moteur à concevoir de zéro.
- Confidentialité vis-à-vis du propriétaire : décision produit avant toute implémentation.
