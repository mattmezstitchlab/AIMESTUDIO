# Migration de la base de production pour la V1

**À exécuter seulement après l'autorisation explicite de Matt.** Rien ici n'a été lancé en production.

La V1 ajoute deux tables à la base Neon de production (branche `main`). Aujourd'hui, `main` n'en contient aucune.

| Migration | Table | Sert à | Sans elle |
|---|---|---|---|
| `db/migrations/2026-10-22-matiere.sql` | `matiere` (+ index, extension `pgcrypto`) | les notes du Point Zéro d'une personne connectée | le Point Zéro garde les notes dans le navigateur |
| `db/migrations/2026-10-22-identite.sql` | `identite` | dates du timbre confirmé et de la première visite du Monde | le timbre se déduit du nom du compte (repli annoncé) |

Les deux sont **additives et rejouables** : `create … if not exists`, aucune table existante modifiée.

## État vérifié le 22 octobre (lecture du schéma par l'API Neon, rien d'exécuté)

| Branche Neon | `matiere` | `identite` | `pgcrypto` | `"user".id` |
|---|---|---|---|---|
| `main` (production) | absente | absente | installée | `text` |
| `preview/integration` | présente, conforme au fichier (clé, contrôle 1–20 000, index `matiere_personne`) | présente, conforme (clé `user_id`) | installée | `text` |
| `preview/preprod-v1` (copie de `main` du 22/10, 05:14 UTC) | absente | absente | installée | `text` |

- **Dépendances :** aucune clé étrangère. `user_id` est un `text`, comme `"user".id`. `gen_random_uuid()` existe (PostgreSQL 18, `pgcrypto` déjà installée).
- **Compatibilité :** le code actuel de la production (`main`) ne lit aucune de ces tables, donc la migration peut précéder ou suivre la publication. Le code V1 accepte leur absence : repli sur le navigateur, annoncé à l'écran, et suppression de compte protégée par `to_regclass`.
- **Rejouable :** les deux fichiers, joués deux fois de suite sur une base vierge (PostgreSQL local), donnent le même résultat. Le retour simple (`drop table`) fonctionne.
- **Restauration à un instant donné :** l'historique du projet ne couvre que **6 heures**. Créer la branche de sauvegarde (étape 2) juste avant l'exécution est donc indispensable.
- **Attention, éditeur SQL de Neon :** il rouvre la dernière requête de l'historique, parfois un `create table`. Vérifier que l'éditeur ne contient que ce qu'on veut exécuter, et sur quelle branche, avant de cliquer sur Run.

## 1. Contrôles préalables (lecture seule)

Dans Neon, ouvrir SQL Editor sur la branche **main** :

```sql
select to_regclass('public.matiere') as matiere, to_regclass('public.identite') as identite,
       to_regclass('public."user"') as comptes, (select count(*) from "user") as nb_comptes;
select extname from pg_extension where extname = 'pgcrypto';
```

Résultat attendu : `matiere` et `identite` sont vides (null), `comptes` existe. Si une table existe déjà, s'arrêter et comparer avec le fichier de migration.

## 2. Sauvegarde

1. Dans Neon, ouvrir Branches, créer une branche depuis `main`, nommée `sauvegarde-avant-v1-AAAA-MM-JJ`. La copie est instantanée et ne touche pas `main`.
2. Noter l'heure exacte : la restauration à un instant donné de Neon pourra s'y référer.

## 3. Vérification sur les préversions (déjà faite pour `identite`)

- `identite` a été créée le 22 octobre sur `preview/integration` et `preview/cube-cartes`, et vérifiée par un `select`.
- `matiere` : relancer les contrôles de l'étape 1 sur `preview/integration`, puis exécuter le fichier s'il manque.
- **Sur l'aperçu d'integration :**
  - se connecter ;
  - `/api/identite` doit renvoyer `source: "identite"` ;
  - au Point Zéro, une note écrite connectée doit revenir après rechargement.

## 4. Exécution (production, sur autorisation)

Dans SQL Editor, sur `main`, coller **le contenu exact** des deux fichiers, dans cet ordre : `matiere`, puis `identite`. Exécuter.

## 5. Vérification après exécution

```sql
select to_regclass('public.matiere'), to_regclass('public.identite');
select count(*) from matiere; select count(*) from identite;
```

Après le déploiement de la V1 :
- `/api/identite` renvoie `source: "identite"` pour un compte connecté ;
- le timbre confirmé crée une ligne dans `identite` ;
- une fenêtre privée affiche `connecte: false`.

## 6. Retour arrière

- **Le code supporte l'absence des tables** : il se replie sur le navigateur et le dit. Retirer les tables ne casse donc rien.
- **Retour simple :**
  ```sql
  drop table if exists identite;
  drop table if exists matiere;
  ```
  On perd seulement ce qui a été écrit depuis la migration : dates de timbre, notes connectées.
- **Retour complet :** restaurer `main` depuis la branche `sauvegarde-avant-v1-…`, ou utiliser la restauration à un instant donné de Neon, à l'heure notée.
- `pgcrypto` peut rester : l'extension est inoffensive.
