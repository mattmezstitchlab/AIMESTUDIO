-- AIME · Point Zéro : la matière déposée par chaque personne connectée (notes, intentions, demandes).
-- AJOUT SEUL : aucune table existante n'est modifiée. Les fichiers, eux, restent sur l'appareil (jamais ici).
create extension if not exists pgcrypto;
create table if not exists matiere (
  id       uuid primary key default gen_random_uuid(),
  user_id  text not null,
  texte    text not null check (char_length(texte) between 1 and 20000),
  lecture  jsonb not null default '{}',
  cree_le  timestamptz not null default now()
);
create index if not exists matiere_personne on matiere (user_id, cree_le desc);
