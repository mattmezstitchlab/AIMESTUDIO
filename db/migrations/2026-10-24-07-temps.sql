-- AIME · module Temps (phase fondatrice, étape 2). Rejouable, en ajout seul : aucune donnée existante n'est modifiée ni effacée,
-- aucun projet n'est touché tant que son propriétaire n'a pas importé un programme (une ligne dans temps_espaces).
-- À appliquer par l'agent Neon après fusion : d'abord une branche de test, puis la production.
--
-- Source de vérité (docs/TEMPS.md § 2) :
--   * moments     : l'ÉTAT COURANT du programme d'un projet, la seule table que les vues lisent ;
--   * live_journal : l'HISTORIQUE, en ajout seul. Chaque geste y inscrit sa révision (rev) et ses effets (avant / après pour
--     chaque moment touché) ; la première ligne d'un projet (« importer ») porte le programme de départ. Rejouer le journal
--     redonne exactement la table moments (vérifié par les tests et par verifier() dans api/_temps/moteur.mjs).
--   * temps_espaces.rev : le compteur du projet, incrémenté dans la MÊME transaction que moments et live_journal.
--     L'index unique (espace, rev) interdit deux écritures de la même révision, même depuis deux instances du serveur.

-- 1. Les projets où le module Temps est activé (sans ligne ici, le projet garde exactement son fonctionnement d'avant)
create table if not exists temps_espaces (
  space_id    uuid primary key references spaces(id) on delete cascade,
  rev         bigint not null default 0,
  origine     text not null,
  active_par  text not null,
  active_le   timestamptz not null default now(),
  constraint temps_espaces_rev check (rev >= 0),
  constraint temps_espaces_origine check (origine in ('import', 'demo'))
);

-- 2. Les moments : l'état courant. Les heures sont des minutes depuis minuit le jour de l'événement (0 à 2879 : après minuit,
--    la nuit continue), sans fuseau ni conversion. L'horaire prévu ne bouge jamais ; le décalage cumule les gestes.
create table if not exists moments (
  space_id      uuid not null references temps_espaces(space_id) on delete cascade,
  id            text not null,
  titre         text not null,
  lieu          text not null default '',
  debut_min     integer not null,
  fin_min       integer not null,
  decalage_min  integer not null default 0,
  audience      text not null default 'membres',
  responsable   text,
  plan_b        text not null default '',
  plan_b_actif  boolean not null default false,
  fait          boolean not null default false,
  note_equipe   text not null default '',
  position      integer not null default 0,
  maj_rev       bigint not null default 0,
  primary key (space_id, id),
  constraint moments_id check (id ~ '^[a-z0-9-]{1,60}$'),
  constraint moments_titre check (char_length(titre) between 1 and 120),
  constraint moments_textes check (char_length(lieu) <= 120 and char_length(plan_b) <= 120 and char_length(note_equipe) <= 500),
  constraint moments_heures check (debut_min between 0 and 2879 and fin_min between 0 and 2879 and fin_min >= debut_min),
  constraint moments_decalage check (decalage_min between -720 and 720),
  constraint moments_effectif check (debut_min + decalage_min >= 0 and fin_min + decalage_min <= 2879),
  constraint moments_audience check (audience in ('public', 'membres', 'equipe', 'organisation')),
  constraint moments_plan_b check (plan_b <> '' or not plan_b_actif),
  constraint moments_rev check (maj_rev >= 0)
);
create index if not exists moments_espace on moments (space_id, position);

-- 3. Le journal du direct devient l'historique de Temps : deux colonnes facultatives (les lignes des démonstrations n'en ont pas),
--    deux actions de plus, une révision unique par projet, et plus aucune modification de ligne.
-- Les projets réels (identifiant uuid) dans le journal : 2026-10-21-comptes.sql l'élargit, mais sur une base neuve il passe AVANT la
-- création de live_journal (ordre des noms) et ne fait rien. On le réaffirme ici, à l'identique (sans effet là où c'est déjà fait).
alter table live_journal drop constraint if exists live_journal_espace_check;
alter table live_journal add constraint live_journal_espace_check check (espace in ('mariage','seminaire') or espace ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
alter table live_journal add column if not exists rev bigint;
alter table live_journal add column if not exists effets jsonb;
alter table live_journal drop constraint if exists live_journal_action_check;
alter table live_journal add constraint live_journal_action_check check (action in ('retarder', 'fait', 'planB', 'annoncer', 'importer', 'confirmer'));
create unique index if not exists live_journal_rev on live_journal (espace, rev) where rev is not null;

-- Une ligne écrite ne change plus. La suppression reste possible : l'effacement d'un compte (api/_auth/auth.mjs effacerTraces)
-- retire le journal des projets qu'il possède seul, comme il retire ces projets.
create or replace function live_journal_sans_modification() returns trigger language plpgsql as $$
begin
  raise exception 'live_journal : une ligne écrite ne se modifie pas';
end $$;
drop trigger if exists live_journal_sans_modification on live_journal;
create trigger live_journal_sans_modification before update on live_journal for each row execute function live_journal_sans_modification();
