-- AIME · comptes, espaces partagés et invitations. AJOUTS SEULS, sauf une contrainte élargie sur live_journal (table de démonstration).
-- À exécuter dans la console SQL Neon, branche preview/integration d'abord. Rejouable sans risque (if not exists).

-- 1. Comptes (Better Auth 1.7.7 + clés d'accès). Généré par Better Auth, rendu rejouable.
create table if not exists "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
create table if not exists "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table if not exists "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);
create table if not exists "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);
create table if not exists "passkey" ("id" text not null primary key, "name" text, "publicKey" text not null, "userId" text not null references "user" ("id") on delete cascade, "credentialID" text not null, "counter" integer not null, "deviceType" text not null, "backedUp" boolean not null, "transports" text, "createdAt" timestamptz, "aaguid" text);
create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");
create index if not exists "passkey_userId_idx" on "passkey" ("userId");
create index if not exists "passkey_credentialID_idx" on "passkey" ("credentialID");

-- 2. Espaces partagés, membres, invitations (déjà décrits dans db/schema.sql).
create extension if not exists pgcrypto;
create table if not exists spaces (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('evenement','projet','atelier')),
  title       text not null,
  owner_id    text not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists space_members (
  space_id    uuid not null references spaces(id) on delete cascade,
  user_id     text not null,
  role        text not null check (role in ('owner','editor','contributor','viewer','guest')),
  added_at    timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists space_members_user on space_members(user_id);
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

-- 3. Le direct accepte aussi les espaces réels (identifiant uuid), en plus des deux démonstrations.
alter table live_journal drop constraint if exists live_journal_espace_check;
alter table live_journal add constraint live_journal_espace_check check (espace in ('mariage','seminaire') or espace ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
