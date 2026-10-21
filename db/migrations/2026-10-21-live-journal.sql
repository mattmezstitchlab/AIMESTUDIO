-- AIME Live · journal partagé entre appareils. AJOUT SEUL : aucune table existante n'est modifiée.
-- À appliquer à la main, sur la base de preview d'abord, après validation. Jamais en production sans accord.
create table if not exists live_journal (
  n        bigserial primary key,
  espace   text not null check (espace in ('mariage','seminaire')),
  qui      text not null,
  action   text not null check (action in ('retarder','fait','planB','annoncer')),
  p        jsonb not null,
  t        int not null default 0,
  cree_le  timestamptz not null default now()
);
create index if not exists live_journal_espace on live_journal (espace, n);
