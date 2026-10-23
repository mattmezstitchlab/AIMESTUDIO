# L'Atlas des capacités (`/capacites/`)

Une seule page pour savoir ce qui pourrait servir au site : les 1 191 modules déclarés dans les 130 dépôts du compte, ce qui vit déjà dans AIME, ce qui mérite d'y venir, et l'état réel de chaque source. **Lecture seule.**

## Sources

| Source | Ce qu'elle apporte | Nature |
|---|---|---|
| `moteurs.json` | 130 dépôts, 1 191 modules : ce qu'ils font, entrée, sortie, exemple, fichiers | Index déclaré, pas une preuve |
| `univers.json` | Les modules que les 10 univers citent dans leurs parcours et leurs regards (475) | Choix éditoriaux d'AIME |
| `capacites/etat-depots.json` | Audit du 24/10/2026 : commits, dernier envoi, branches non fusionnées, code caché dans une branche ou un zip, failles de dépendances, statut HTTP Vercel | Relevé daté ; dépôts privés non lus |
| `BRANCHEMENTS` dans `capacites/modele.js` | Ce qui vit déjà dans AIME, d'où ça vient, ce qui a été écarté | Écrit à la main, une preuve par ligne (testée : le fichier cité existe) |

## Statuts

- **Dans AIME** : la capacité vit dans ce site, à l'adresse indiquée.
- **En partie** : une part du dépôt a été reprise.
- **À côté** : elle tourne dans son propre dépôt ; AIME y renvoie.
- **À brancher** : citée par un univers d'AIME, pas encore reprise.
- **À évaluer** : personne ne l'a encore examinée pour AIME.
- **Écarté** : examinée et laissée de côté, avec la raison.

## « Vaut le coup » : le classement expliqué

`AIMECapacites.score(module)` rend des points **et leurs raisons**. Gagne : cité par les univers (3 par citation, 3 au plus), autonome (+2), dépôt fonctionnel (+2) ou prototype (+1), famille proche du cœur d'AIME (+1). Perd : dépôt vide (−3), doublon (−2), code dans une archive (−1), faille critique sans correctif prêt (−1). « Par où commencer » garde trois modules au plus par dépôt.

## Passer à l'action

Chaque fiche propose « Préparer la demande » : un texte à copier pour un agent, avec la source, les fichiers, ce qui est déjà repris, les mises en garde de l'audit et les règles d'AIME (charte, « qui voit quoi », Régie intacte, tests). Une fois un module branché, mettre à jour `BRANCHEMENTS`.

## Mettre à jour l'état des dépôts

`capacites/etat-depots.json` est un relevé daté. Pour le rafraîchir, relancer l'audit transversal et remplacer le fichier (même format `aime-etat-depots` v1). Rien d'autre ne change.

Tests : `tests/capacites.test.cjs`.
