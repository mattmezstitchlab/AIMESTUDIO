# Le noyau radial

Le noyau radial est la partie commune à toutes les présentations circulaires d'AIME. Ce n'est pas un module : il ne lit aucune donnée, n'applique aucun droit et ne garde aucune copie. Il reçoit des segments déjà calculés et renvoie un identifiant (« ce segment-là ») ou une intention (« ouvrir », « fermer »).

| Fichier | Rôle |
| --- | --- |
| `modules/radial/noyau.js` (`AIMERadial`) | Calculs seuls, sans affichage : géométrie polaire, tracé d'arc, toucher au doigt, parcours au clavier, position « 3 sur 12 », déclaration des géométries |
| `modules/radial/interactions.js` (`AIMERadial.interactions`) | Dans le navigateur : un seul écouteur pour le toucher, un seul écouteur clavier en focus itinérant (flèches, Début, Fin, Entrée, Échap) |
| `modules/temps/cercle.js` (`AIMECercle`) | La géométrie **temporelle** pour Temps : fenêtre de temps (le futur zoom), angle d'une minute, passage de minuit, couloirs, noms accessibles |

## Deux géométries, à ne pas confondre

| | Temporelle (`cercle`) | Collection (`anneau`, prévue) |
| --- | --- | --- |
| Ce que porte l'angle | une heure | un rang |
| Longueur d'un segment | une durée | identique pour tous les segments |
| Éléments en même temps | des couloirs concentriques, puis « +N » | sans objet |
| Grands volumes | une fenêtre de temps (zoom) | des groupes, puis des pages fournies par le serveur |

Une présentation déclare sa géométrie avec `AIMERadial.geometrie('temporelle' | 'collection')` ; elle n'est jamais devinée d'après les données.

## Règles

- **Les données affichées sont exactement celles de la vue envoyée par le serveur**, ni plus ni moins. Les droits restent dans `synchroview/permissions.js` et le serveur les revérifie à chaque geste.
- La Liste reste disponible comme alternative : on y retrouve la même sélection, et c'est le mode par défaut.
- Le noyau ne contient aucun vocabulaire de métier ou de ressource, aucune notion de droit, et n'utilise ni le réseau ni le stockage : `tests/radial-noyau.test.cjs` le vérifie.

## Non-régression de l'extraction (PR A)

Avant l'extraction, deux références ont été figées sur la tête de la PR #131 (commit `9c9a7c7`) :

- `tests/references/temps-cercle-modele.json` : 54 cadrans calculés (6 participations × 3 états du programme × 3 tailles) ;
- `tests/references/temps-cadran-dom.json` : le SVG du cadran affiché dans le navigateur, sur iPhone et sur ordinateur.

Les tests `tests/radial-reference.test.cjs` et `tests/navigateur/temps.cjs` exigent que Temps reproduise ces deux références à l'identique. On ne régénère une référence (`REFERENCE=ecrire`) qu'après avoir validé un nouveau cadran.
