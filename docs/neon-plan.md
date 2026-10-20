# AIME × Neon : décisions et chemin

*Pour la personne ou l'agent qui fait l'intégration. Aucun secret dans ce document.*

## Décisions

### 1. Une ressource Neon dédiée, pas celle de BYAIME

- **Ne pas cliquer « Connect » sur `neon-fulvous-crystal`.** Ce bouton donnerait à AIMESTUDIO la même `DATABASE_URL`, donc le même rôle propriétaire, que BYAIME. Un bug d'AIMESTUDIO pourrait alors lire ou effacer les données BYAIME.
- **Créer une ressource dédiée** dans AIMESTUDIO → Storage → Create → Neon :
  - nom `aimestudio` ;
  - région UE (Francfort) ;
  - raccordée à AIMESTUDIO seulement ;
  - les fonctions Vercel dans une région proche (`fra1` ou `cdg1`).
- **Si l'offre ne permet pas un second projet Neon :** une base séparée dans le même projet, avec un rôle dédié qui n'a aucun droit sur la base de BYAIME, et sa propre chaîne de connexion. Ce n'est qu'un repli.
- **Previews :** une branche Neon par déploiement de preview (option de l'intégration). Les tests ne touchent jamais la production.

### 2. Authentification : Better Auth

**Pourquoi Better Auth :**
- les comptes sont dans notre propre base Neon, dans l'UE, à côté des rôles et des données ;
- aucun coût par utilisateur ;
- les passkeys et le lien magique sont des extensions officielles ;
- les sessions sont des cookies `HttpOnly` côté serveur.

**Les alternatives écartées :**
- Clerk : plus rapide à brancher, mais les comptes sont hébergés chez un tiers et le prix dépend du nombre d'utilisateurs ;
- Neon Auth : géré par Neon, mais moins de contrôle sur les rôles.

**Ordre de mise en place :**
1. **Lien magique par e-mail d'abord.** Il ne dépend pas du domaine. L'e-mail passe par un fournisseur, par exemple Resend ; sa clé est un secret serveur.
2. **Passkeys ensuite, une fois le domaine définitif actif.** Une passkey est liée pour toujours à son domaine : ne pas en créer sur `aimestudio.vercel.app` si l'adresse finale sera `lemondeaime.com`.

**Les tables de comptes** (user, session, account, verification, passkey) viennent des migrations Better Auth. On ne les écrit pas à la main.

### 3. Rôles minimaux

**Rôle global (champ `role` de l'utilisateur) :**
- `member`, par défaut ;
- `creator` : le créateur d'AIME OS, seul à modifier le design system et les cartes système.

**Rôle par espace** (`space_members`, voir `db/schema.sql`) :

| Action | guest | viewer | contributor | editor | owner |
|---|:-:|:-:|:-:|:-:|:-:|
| Lire la partie publique de l'espace | ✓ | ✓ | ✓ | ✓ | ✓ |
| Répondre pour soi (RSVP, régime) | ✓ | | ✓ | ✓ | ✓ |
| Lire tout l'espace | | ✓ | ✓ | ✓ | ✓ |
| Modifier ce qui m'est assigné | | | ✓ | ✓ | ✓ |
| Modifier le contenu | | | | ✓ | ✓ |
| Inviter, changer les rôles, supprimer | | | | | ✓ |

**Correspondance avec les cartes :**

| Carte | Rôle dans l'espace |
|---|---|
| Futurs mariés | owner (ou editor si une organisatrice crée l'espace) |
| Organisatrice | editor |
| Prestataire | contributor |
| Invité | guest |

**Données privées, propriétaire seul :** `user_data` (synchronisation du Bureau) et `vault` (le Noyau, chiffré côté client).

**Garde-fous (validés) :**
- **`creator` n'est jamais attribuable par le navigateur.** Aucune route ne modifie `role`. Il est fixé côté serveur seulement : par une variable d'environnement `CREATOR_EMAILS` lue à la création du compte, ou par une requête SQL d'administration. Le champ est `input: false` dans Better Auth.
- **Une matrice explicite, pas une hiérarchie.** Les droits sont lus dans une table `PERMS[role][action]`, et non comparés par rang (`minRole`). Par exemple, `guest` peut « répondre pour soi », ce que `viewer` ne peut pas, et `contributor` modifie seulement ce qui lui est assigné. Chaque fonction appelle `can(session, spaceId, action, objet)`.

**Dans chaque fonction `/api` :**
- `requireSession()`, puis `can(session, spaceId, action, objet)` d'après la matrice ;
- `user_id` toujours lu dans la session, jamais dans la requête ;
- refus par défaut ;
- une ligne `audit` par écriture.

**Invitations :**
- jeton aléatoire, stocké haché ;
- usage unique, expiration ;
- rôle fixé à la création ; une invitation ne peut jamais donner `owner`.

## Chemin le plus court

1. **Créer la ressource Neon dédiée.** Vérifier que `DATABASE_URL` n'existe que côté serveur, en Production et en Preview.
2. **PR #2.** `/api/health` doit répondre `{"ok":true}` sur la preview. Fusionner.
3. **PR « auth » :**
   - Better Auth avec le lien magique ;
   - `api/auth/[...all]`, `api/me` ;
   - les migrations ;
   - un bouton « Se connecter » dans la barre du Bureau (picto profil) ;
   - les tests : session absente refusée, lien réutilisé refusé, origine invalide refusée, deux comptes isolés.
4. **PR « espaces » :**
   - `spaces`, `space_members`, `invitations`, `items`, `audit` ;
   - les fonctions `requireRole` ;
   - `api/spaces` (créer, lister les miens) et `api/invite` (créer, accepter) ;
   - les tests de la matrice des rôles.
5. **PR « synchronisation » :**
   - `api/sync` (`user_data`) et `api/vault` ;
   - le `localStorage` reste le cache hors ligne.
6. **Plus tard :** les passkeys sur le domaine définitif ; la RLS PostgreSQL en seconde barrière ; les connecteurs (Gmail, Microsoft, WhatsApp).

## Ce qu'il ne faut pas faire

- Raccorder la base de BYAIME à AIMESTUDIO.
- Exposer `DATABASE_URL`, `BETTER_AUTH_SECRET` ou la clé du fournisseur d'e-mail dans du code client.
- Accepter un `user_id` venant du navigateur.
- Stocker la phrase secrète du Noyau, ou un numéro de carte bancaire.
- Modifier `/v1/` (Timeline Jour J).
