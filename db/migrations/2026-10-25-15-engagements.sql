-- AIME · les engagements d'un projet (V1, PR P6, 25/10/2026) : une promesse datée entre personnes d'un même projet,
-- « qui doit quoi à qui, pour quand ». Décision de Matt : une promesse entre personnes, qui naît dans un projet.
-- Rejouable, en ajout seul : « if not exists » et contraintes gardées ; aucune donnée existante n'est touchée.
-- Les droits ne sont PAS ici : synchroview/permissions.js (type « engagement ») les tranche au serveur, à chaque lecture et geste.
--   de_qui    : la personne qui s'engage (membre du projet au moment de la création)
--   pour_qui  : la personne envers qui elle s'engage ; null = l'organisation du projet
--   etat      : propose (demandé par l'organisation, en attente de réponse) · accepte · refuse · tenu · annule
--   « en retard » n'est pas un état : il se calcule (accepté, échéance passée).
-- Effacés avec le projet (on delete cascade) et avec le compte de la personne qui s'engage.
-- À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production, AVANT le code qui l'utilise
-- (sans elle : l'écran le dit « pas encore installé », rien d'autre ne change).
create table if not exists engagements (
  id         text primary key,
  space_id   uuid not null references spaces (id) on delete cascade,
  titre      text not null,
  de_qui     text not null references "user" (id) on delete cascade,
  pour_qui   text references "user" (id) on delete set null,
  echeance   date not null,
  etat       text not null default 'accepte',
  cree_par   text not null,
  cree_le    timestamptz not null default now(),
  maj_le     timestamptz not null default now(),
  rev        integer not null default 1
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'engagements_id_forme') then
    alter table engagements add constraint engagements_id_forme check (id ~ '^[A-Za-z0-9_-]{16,32}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_titre_court') then
    alter table engagements add constraint engagements_titre_court check (char_length(titre) between 2 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_etat_liste') then
    alter table engagements add constraint engagements_etat_liste check (etat in ('propose', 'accepte', 'refuse', 'tenu', 'annule'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_rev') then
    alter table engagements add constraint engagements_rev check (rev >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_echeance_bornee') then
    alter table engagements add constraint engagements_echeance_bornee check (echeance between date '2000-01-01' and date '2200-12-31');
  end if;
end $$;
create index if not exists engagements_espace on engagements (space_id, echeance);
create index if not exists engagements_de_qui on engagements (de_qui, etat);
create index if not exists engagements_pour_qui on engagements (pour_qui, etat);
