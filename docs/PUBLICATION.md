# Publier la V1 sur www.lemondeaime.com

Ordre retenu. Chaque étape attend la validation de Matt.

## 1. Rendre les tests obligatoires avant fusion

Le fichier `.github/rulesets/tests-obligatoires.json` décrit la règle. Elle s'applique à `integration` et à `main` et contient trois protections :
- les contrôles « Suites (node) », « Parcours navigateur » et « Accessibilité » doivent réussir avant toute fusion ;
- la branche ne peut pas être supprimée ;
- son historique ne peut pas être réécrit (pas de `push --force`).

Pour l'installer, il faut des droits d'administration du dépôt, que Claude n'a pas :

1. GitHub → dépôt `AIMESTUDIO` → **Settings** → **Rules** → **Rulesets**.
2. **New ruleset** ▾ → **Import a ruleset**, puis choisir `tests-obligatoires.json`. Le fichier se télécharge depuis la page du dépôt, bouton « Download raw file ».
3. Vérifier que **Enforcement status** vaut *Active*, puis cliquer sur **Create**.

Sans import, la même règle se crée à la main : *New branch ruleset*, cibles `integration` et `main`, cases *Restrict deletions*, *Block force pushes* et *Require status checks to pass*, puis ajout des trois contrôles par leur nom.

Pour vérifier : une PR dont un contrôle échoue affiche « Merging is blocked ».

## 2. Compte propriétaire

Voir `docs/PROPRIETAIRE.md` : la variable `AIME_PROPRIETAIRES`, d'abord pour Preview, puis pour Production avec votre accord.

## 3. Migrations

Voir `docs/MIGRATION-V1.md`. Elles s'exécutent seulement sur votre autorisation, après la création de la branche de sauvegarde.

## 4. PR `integration` → `main`

Elle est ouverte, **pas fusionnée**. Sa fusion publie la V1 sur www.lemondeaime.com. Avant de fusionner :
- les trois contrôles doivent être au vert ;
- la revue de l'aperçu de préproduction doit être faite ;
- la variable `AIME_PROPRIETAIRES` doit exister en production, sinon la Régie disparaît du dock, même pour vous ;
- les migrations doivent être faites, ou leur report accepté (le site se replie sur le navigateur et l'annonce).

Pour revenir en arrière après publication, faire un revert de la fusion sur `main` (bouton « Revert » sur GitHub). Vercel redéploie alors la version précédente. On peut aussi utiliser **Instant Rollback** dans Vercel, sur le déploiement de production précédent.
