# Qui voit quoi : la règle appliquée à tout AIMESTUDIO

Décision de Matt (23/10/2026) : le principe de l'accueil (« un seul projet, chacun son écran ») s'applique à **tout** ce qui est dans AIMESTUDIO, avec 2, 4, 5, 6 rôles ou plus selon le cas. World et Maison Orée sont des **exemples** ; Studio, Stitch, G44, Régie et Magazine le deviennent aussi. Une seule charte : noir, structure, contraste, architecture ; l'orbe seule en couleur.

## Le composant commun

- `coeur/coeur.js` : `AIMECoeur.html(scenario)` pose les chapitres (arrivées, écrans, droits, jour J s'il y en a un) ; `AIMECoeur.monter(scenario)` les anime (chorégraphie de l'orbe, écrans composés par `AIMEVitrine.rendre`, tableau par `AIMEVitrine.politique` + `synchroview/permissions.js`, journal `live/modele.js`).
- `vitrine/scenarios/<u>.json` : les rôles d'un exemple, leur arrivée et ce que l'orbe recueille. **Aucune donnée métier ni aucun droit** : chaque rôle pointe une perspective (`vitrine/perspectives`) et un membre de la couche d'accès (`vitrine/acces`). Vérifié par `tests/coeur.test.cjs`.
- `coeur/coeur.css` (le cœur, `--n` = nombre de rôles) et `coeur/charte.css` (barre, orbe, points des « i »).
- `/exemples/` : la liste ; `/exemples/?u=world`, `/exemples/?u=seminaire` : un exemple de haut en bas. L'accueil reste le mariage (4 rôles).

## Relevé (23/10/2026)

| Moteur | Rôles déjà là | Rôles à modéliser | Règles communes | Charte actuelle |
|---|---|---|---|---|
| Mariage (accueil) | couple, prestataire, invitée, coordination | — | oui | noire |
| World Paris / New York | 6 : couple, agence, prestataire, invitée, contributrice, coordination locale | — | oui | sombre chaude |
| Séminaire Maison Orée | 6 (dont traiteur et observateur ajoutés le 23/10) | direction financeur | oui | claire « pierre » |
| Live (jour J) | 5 rôles + écran de salle | régisseur | oui | sombre iris |
| Sites (Canevas universel) | 6 vues « voir comme » | client commanditaire | oui | claire bleue |
| G44 | agent, formateur, responsable, contrôleur (+ H1–H3) | usager | module propre (`g44/js/acces.js`) | claire saumon |
| Stitch | créatrice, brodeuse, boutiques (non reliées à des règles) | acheteuse, visiteur | non | claire « Apple » |
| Magazine / Publication | « public » seulement | rédaction, rédacteur en chef, lecteur, abonné | non | claire chaude |
| Studio | aucun (des formats) | auteur, client, équipe, public | non | claire |
| Régie | propriétaire, visiteur, clients, 6 vues | délégué, comptable | partiel | sombre iris |

## Les lots

1. ✅ Composant commun + scénarios ; accueil branché dessus.
2. ✅ World (6 rôles) et Séminaire (6 rôles) sur `/exemples/`.
3. ✅ (en partie) Live, Sites, Compte : la couleur du rôle (`coeur/roles.js`) sur « Rôle dans l'espace » (Live), « Voir comme » (Sites), les espaces et les membres (Compte). Reste : la charte noire de Sites (interface claire aujourd'hui).
4. ✅ G44 : ses 4 identités (agent, formateur, responsable, contrôleur) branchées sur le composant par un adaptateur (`g44/js/coeur-g44.js`) ; ses règles (`G44Acces.autoriser`) et sa simulation restent les siennes. `/exemples/?u=g44`. Un moteur qui n'est pas une vitrine apporte son adaptateur : `charger`, `page(rôle)`, `droits(rôles)`.
5. ✅ Stitch : la créatrice, la boutique, la brodeuse (qui a acquis le patron) et la visiteuse, par un adaptateur (`stitch/js/coeur-stitch.js`). Un seul patron canonique ; la grille et les fils ne sortent que pour la créatrice et la brodeuse, la boîte à fils pour la brodeuse seule ; le prix écrit une fois par la boutique est vu par toutes. Règles explicites du prototype, à vérifier côté serveur en production. `/exemples/?u=stitch`.
6. Magazine / Publication, Studio, Régie : idem avec leurs rôles.
7. Navigation : Accueil · Mon projet · Exemples · Lab.

Une couleur par rôle technique (`coeur/roles.js`, prise dans l'orbe : propriétaire rose, contribution ambre, invité cyan, coordination violet, lecture seule vert, public gris) : le héros de chaque écran, la pastille du rôle dans les arrivées, les écrans, le tableau et le jour J. La marque reste noire ; la couleur désigne la personne.

Honnêteté : dans les exemples, les règles tournent dans le navigateur ; les droits réels sont vérifiés par le serveur dans les espaces partagés (`/api/sv`, `/compte/`).
