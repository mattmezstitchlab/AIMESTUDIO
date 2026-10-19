-- AIME · schéma Neon (PostgreSQL) — point de départ, à relire avant migration.
-- Accès uniquement par les fonctions serveur /api/* ; contrôle d'accès dans chaque fonction.

create extension if not exists pgcrypto;

create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique,
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists passkeys (
  id            text primary key,              -- credential id (base64url)
  user_id       uuid not null references users(id) on delete cascade,
  public_key    bytea not null,
  counter       bigint not null default 0,
  transports    text[],
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  id          text primary key,                -- jeton aléatoire, stocké haché côté serveur conseillé
  user_id     uuid not null references users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  tpl         text not null,                   -- maries, invite, presta, artiste, brodeuse, entreprise, organisme, aime
  name        text not null,
  colors      text[] not null default '{}',
  apps        text[] not null default '{}',
  connectors  text[] not null default '{}',
  is_public   boolean not null default false,  -- publiée dans la bibliothèque
  updated_at  timestamptz not null default now()
);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  kind        text not null default 'mariage',
  title       text not null,
  starts_on   date,
  city        text,
  data        jsonb not null default '{}',     -- objet S (voir docs/aime-handoff.md)
  updated_at  timestamptz not null default now()
);

create table if not exists event_members (
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        text not null,                   -- couple, invite, presta, coordination…
  primary key (event_id, user_id)
);

create table if not exists timeline_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  event_id    uuid references events(id) on delete cascade,
  kind        text not null,                   -- rdv, rappel, mission, reservation, paiement, tache, jourj
  title       text not null,
  starts_at   timestamptz not null,
  minutes     int not null default 60,
  done        boolean not null default false
);
create index if not exists timeline_user_time on timeline_items(user_id, starts_at);

create table if not exists projects (
  id          text primary key,                -- identifiant du Studio (P.id)
  user_id     uuid not null references users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Le Noyau : uniquement le bloc chiffré côté client (AES-256-GCM, clé PBKDF2). Jamais de clair.
create table if not exists vault (
  user_id     uuid primary key references users(id) on delete cascade,
  alg         text not null,
  iterations  int not null,
  salt        text not null,
  iv          text not null,
  ct          text not null,
  updated_at  timestamptz not null default now()
);

-- Présence sur le globe : opt-in, ville seulement.
create table if not exists map_presence (
  user_id     uuid primary key references users(id) on delete cascade,
  city        text not null,
  layer       text not null,                   -- reseau, demandes, events, prestas
  label       text not null,
  visible     boolean not null default false,
  updated_at  timestamptz not null default now()
);
