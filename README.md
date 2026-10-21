# AIME®

« Une info saisie une fois, propagée partout. »

Quatre usages, quatre places :
- **Travailler** : le Bureau.
- **Découvrir** : la Page Zéro et Le Monde AIME.
- **Réaliser une tâche** : les applications.
- **Expérimenter** : le Lab.

La liste des adresses, avec leur statut (disponible, démonstration, expérimental), vit à un seul endroit : `nav/registre.js`. Le menu Explorer et le Bureau la lisent.

## Les pages

| Adresse | Rôle | Ce que c'est |
|---|---|---|
| `/` | Découvrir | **La Page Zéro.** Une intention, puis la Carte. À la fin : « Ouvrir mon Bureau », puis « Rejoindre Le Monde AIME ». |
| `/bureau/` | Travailler | **Le Bureau.** Il affiche ma Carte et propose de reprendre là où on en était. Il range les projets par outil, puis donne les outils, le Lab, et ce que ce navigateur garde, avec sauvegarde et restauration. Voir `docs/BUREAU.md`. |
| `/aime/` | Découvrir | **Le Monde AIME.** La grande landing : le cube, l'orbe, le menu Explorer. |
| `/studio/` | Réaliser | **Le Studio.** Tous les supports. |
| `/web/`, `/docs/`, `/buro/`, `/image/`, `/accessibilite/`, `/stitchlab/` | Réaliser | Chaque atelier ouvert seul. C'est le même fichier que le Studio, réglé par `window.AIME_ATELIER`. |
| `/stitch/` | Réaliser | **AIME Stitch** : les patrons de point de croix. |
| `/synchroview/` | Réaliser | Comparer des perspectives (démonstration). |
| `/g44/` | Réaliser | **G44 LAB**, un démonstrateur sans affiliation, avec des données fictives. |
| `/infinity/` | Réaliser | **AIME INFINITY**, le jeu (expérimental). |
| `/vitrine/site/`, `/vitrine/world/` | Découvrir | Les démonstrateurs d'événements, avec des données fictives. |
| `/v1/` | Réaliser | **La Timeline Jour J**, l'ancienne application de planning. Elle est conservée parce qu'elle n'est pas remplacée. |
| `/lab/orb/`, `/infinity/lab/` | Expérimenter | **Le Lab.** |
| `/tout/` | Découvrir | Toutes les vues d'un coup. |

L'ancien Bureau à fenêtres a été retiré le 20 octobre 2026. Ses réglages restent dans les navigateurs. Le nouveau Bureau les signale et les inclut dans la sauvegarde ; il ne les efface jamais.

## Les moteurs

| Moteur | Rôle |
|---|---|
| `vitrine/rendu.js` | **Le moteur de pages commun.** `rendre()` met en page les événements ; `composer()` met en page les espaces de travail, dont le Bureau. Les couches restent séparées : données, accès, perspectives, modèles (`vitrine/modeles/`), présentation (`vitrine/presentation/`). |
| Studio, Stitch (`stitch/js/`), SynchroView, G44, INFINITY | Chaque application garde son propre moteur métier. |
| `carte/` | La Carte : une seule source de données, que lisent la Page Zéro, le cube et le Bureau. |
| `bureau/sources.js` | Lit, pour chaque outil, ce que ce navigateur contient. Il n'écrit jamais rien. |

## Données

**Sans compte, tout reste dans le navigateur.**
- Rien n'est stocké en `localStorage` en dehors de ce navigateur, et il n'y a aucune synchronisation.
- Le Bureau peut sauvegarder toutes les clés dans un fichier JSON.
- La restauration ajoute ce qui manque. Elle ne remplace une clé différente que sur demande, et n'efface jamais rien.

**Neon est branché mais ne reçoit encore aucune écriture.**
- `/api/health` vérifie la connexion.
- Le schéma est dans `db/schema.sql`.
- Les écritures attendent l'authentification. La proposition est dans `docs/CARTE.md`, section 4.

## Déploiement et tests

- Site statique, sans étape de build : Vercel, preset *Other*. Les redirections sont dans `vercel.json`.
- `npm test` lance `node --test tests/*.test.cjs`. `tests/bureau.test.cjs` vérifie que les redirections ne bouclent pas et que chaque entrée du registre aboutit.
- `health.test` demande `@neondatabase/serverless`.
