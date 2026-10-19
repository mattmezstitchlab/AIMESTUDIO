-- AIME · schéma Neon (PostgreSQL) — base dédiée à AIMESTUDIO, région UE.
-- Les tables de comptes (user, session, account, verification, passkey) sont créées
-- par les migrations de Better Auth : ne pas les écrire à la main ici.
-- Accès uniquement par /api/* ; l'identité vient toujours de la session vérifiée.

create extension if not exists pgcrypto;

-- Rôle global : 'member' par défaut, 'creator' pour le créateur d'AIME OS (design system, cartes système).
-- Stocké comme champ additionnel de la table user de Better Auth (additionalFields: role).

-- Espaces partagés : un événement, un projet, un atelier.
create table if not exists spaces (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('evenement','projet','atelier')),
  title       text not null,
  owner_id    text not null,                         -- user.id (Better Auth)
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Qui fait partie d'un espace, et avec quel rôle.
-- owner   : tout, y compris membres, invitations, suppression
-- editor  : modifier le contenu (futurs mariés, organisatrice)
-- contributor : modifier ce qui lui est assigné (prestataire)
-- viewer  : lire
-- guest   : lire la partie publique et répondre pour soi (invité : RSVP, régime)
create table if not exists space_members (
  space_id    uuid not null references spaces(id) on delete cascade,
  user_id     text not null,
  role        text not null check (role in ('owner','editor','contributor','viewer','guest')),
  added_at    timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists space_members_user on space_members(user_id);

-- Invitations : jeton haché, rôle fixé à la création, usage unique, expiration.
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  role        text not null check (role in ('editor','contributor','viewer','guest')),
  token_hash  text not null unique,
  email       text,
  created_by  text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     text
);

-- Éléments datés d'un espace (timeline partagée). assignee_id : le contributeur concerné.
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  kind        text not null,
  title       text not null,
  starts_at   timestamptz,
  minutes     int not null default 60,
  assignee_id text,
  done        boolean not null default false,
  updated_by  text not null,
  updated_at  timestamptz not null default now()
);
create index if not exists items_space_time on items(space_id, starts_at);

-- Données privées d'un utilisateur (synchronisation du Bureau : aime-os, echos:v2). Propriétaire seul.
create table if not exists user_data (
  user_id     text not null,
  key         text not null check (key in ('aime-os','echos:v2')),
  data        jsonb not null,
  rev         bigint not null default 1,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- Le Noyau : uniquement le bloc chiffré côté client. Propriétaire seul. Jamais de clair.
create table if not exists vault (
  user_id     text primary key,
  alg         text not null,
  iterations  int not null,
  salt        text not null,
  iv          text not null,
  ct          text not null,
  updated_at  timestamptz not null default now()
);

-- Journal : qui a fait quoi (y compris les actions de l'orbe), sans contenu sensible.
create table if not exists audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  user_id     text,
  space_id    uuid,
  action      text not null,
  detail      jsonb
);
