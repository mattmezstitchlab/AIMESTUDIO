# AIME WORLD · Paris / New York

Troisième démonstrateur AIME : une agence internationale organise à New York le mariage d'un couple parisien (50 invités), avec un réseau de prestataires, de contributeurs et d'invités, coordonnés par des missions.

Branche `world`, créée depuis `vitrine`. Aucune modification de `main`, `/tout/`, `studio/`, `/v1/`, ni des démonstrateurs Mariage (Léa & Marc) et Maison Orée. Toutes les données sont inventées : aucun paiement, aucune réservation, aucun document d'identité, aucun envoi réel.

## 1. Audit : ce qui existe et ce qui est réutilisé

| Brique | Où | Réutilisation pour WORLD |
|---|---|---|
| Moteur de rendu | `vitrine/rendu.js` (`AIMEVitrine.rendre`, `politique`, `visuel`, composants) | Réutilisé tel quel. Seuls ajouts : deux natures visuelles génériques, `toits` et `gratte-ciel` (aucun mot d'univers, testé). |
| Cinq couches | `vitrine/donnees`, `acces`, `perspectives`, `modeles`, `presentation` | Un fichier par couche pour `world`, sur le même schéma que Mariage et Maison Orée. |
| Permissions | `synchroview/permissions.js` (`can`, `canStart`) | Seul système de règles. Les règles nouvelles (missions, délégation, activités) y seront **ajoutées**, jamais dupliquées ailleurs. |
| Vérification serveur | `api/sv/check`, `act`, `tx` (identités fictives, 404 en production) | Réutilisée pour les actions simulées des missions et des invitations. |
| Cartes d'usage | `synchroview/profiles.js` | Inchangées. Perspectives ≠ cartes d'usage ≠ rôles techniques. |
| SynchroView | `synchroview/index.html`, `bridge.js` | Ajout de pages `world` dans `PAGES` et de compositions enregistrées. Aucun changement au protocole. |
| Ambiances | `vitrine/presentation/ambiances.json` | Ajout de `crepuscule` (Paris, chaud) et `heure-bleue` (New York, froid) ; `parUnivers.world = crepuscule`. |
| Polices | `fonts/` (Fraunces, Playfair Display, Inter, OFL vérifiées) | Réutilisées, auto-hébergées. |
| AIME ORB | `lab/orb/index.html` (démo GSAP sans module exporté) et l'orbe de la landing (IIFE intégrées) | **Pas de composant réutilisable proprement.** On ne copie rien : on prévoit seulement des points d'intégration (ci-dessous). |

## 2. Modèle de données (couche Contenu)

`vitrine/donnees/world.json`, `revision: 1`. Chaque entité a un identifiant stable ; toute mention d'une autre entité passe par sa référence, jamais par une copie de son nom.

- `evenement` : Inès & Théo, Paris / New York, du 16 au 20 septembre 2027, jour J le 18.
- `personnes` (16) : couple, agence, coordination locale, 8 prestataires, invités-contributeurs, un voyageur d'activité. Une personne peut porter plusieurs `responsabilites` (ex. invité + délégué d'invitations + contributeur) sans être dupliquée.
- `invites` (50) : référence de personne quand elle existe, statut, vol.
- `lieux`, `trajets` (2 vols fictifs, 4 navettes), `moments` (8). Les dépendances temporelles s'écrivent `apres: { ref, delai }`.
- `missions` (12) : id, titre, description, catégorie, lieu, date, durée, postes, compétences, responsable, affectés, conditions, rémunération indicative, statut, dépendances, documents ; `nature` prestation / contribution ; `reglementee` + `qualification` pour le transport, l'alimentaire, l'alcool, l'opérateur de voyage.
- `documents`, `delegations` (quota, propositions), `activites` (capacité, inscrits, liste d'attente, accès `activite` distinct de la cérémonie), `formalites` (informations à vérifier auprès des autorités), `echeances`, `budget`, `imprevus` (vol retardé de 90 minutes).

## 3. Adaptations strictement nécessaires (phases 3 à 5)

1. **Accès** : `vitrine/acces/world.json`, sur le modèle existant (subjects, grants, audiences).
2. **Règles** dans `synchroview/permissions.js`, même matrice explicite :
   - `mission` : voir (selon audience), candidater (contributeur, prestataire qualifié si `reglementee`), valider (agence, couple), clôturer (responsable) ;
   - `delegation` : proposer dans la limite du quota, confirmer réservé au couple ;
   - `activite` : s'inscrire dans la limite de capacité, sinon liste d'attente ; **l'inscription ne donne jamais accès à la cérémonie ni aux documents privés** (test dédié).
3. **Composant `missions`** dans le moteur (générique : cartes à statut, filtres) et réutilisation de `liste` pour le reste.
4. **Moteur de dépendances déterministe** (phase 5) : parcours du graphe `apres` + `dependances`, calcul des nouveaux horaires, propositions d'alternatives, **aucune écriture avant validation**. Pas d'IA.
5. **Obsolescence des exports** : tout export statique porte la `revision` de la donnée ; si la révision courante est plus récente, l'export s'affiche « obsolète ».
6. **SynchroView** (phase 4) : 6 pages `world` et compositions enregistrées : 4 perspectives, 6 perspectives, Agence / Coordinateur, Invité / Prestataire, avant / après l'incident.
7. **Points d'intégration ORB** : un événement `aime:orb` (ouvrir une mission, signaler un incident, afficher une alternative) que la future orbe écoutera. Rien n'est câblé tant que l'orbe n'est pas modulaire.

## 4. Ce que la démonstration ne fera pas

Aucune marketplace transactionnelle, aucune agence de voyage, aucun paiement, aucune réservation de vol, aucune délivrance d'ESTA, de visa ou d'autorisation de travail, aucune collecte de numéro ou de copie de passeport, aucun courriel réel (les courriels d'invitation sont des aperçus).

## 5. Phases

| Phase | Contenu | État |
|---|---|---|
| 1 | Audit et plan non destructif (ce document) | fait |
| 2 | Landing cinématique `vitrine/world/` (sections 01 à 09), données et perspectives | fait, en attente de validation |
| 3 | Accès, règles, 6 perspectives opérationnelles, composant missions, parcours Découvrir → Clôturer simulé | à valider |
| 4 | SynchroView WORLD et compositions | à faire |
| 5 | Simulation du retard de 90 minutes et propagation | à faire |
| 6 | Validation : tests, aperçu Vercel, mobile | à faire |

## 6. Landing (phase 2)

`/vitrine/world/` lit `donnees/world.json`, `perspectives/world.json` et les ambiances : la page ne contient aucun nom ni aucun chiffre de l'événement (testé). Les visuels sont génératifs (`AIMEVitrine.visuel`), originaux, remplaçables par des photos sous licence (voir `vitrine/PROVENANCE.md`).

Tests : `tests/world.test.cjs` (unicité des identifiants, références, absence de cycles, identité multiple, absence de données sensibles, landing sans copie de données, moteur sans mot d'univers).
