-- AIME · les activités d'un prestataire (brief unique du 24/10, PR C) : « Je suis fleuriste », « Je suis DJ »…
-- Une activité dit un métier, jamais un droit : elle ne donne accès à aucun projet. Les missions arrivent par invitation.
-- Elle n'est pas publiée (publiee = false) : rien n'apparaît dans un annuaire ou un registre.
-- Plusieurs activités par personne sont possibles, une seule fois chacune. Elles s'effacent avec le compte.
-- Additive, rejouable. À appliquer par l'agent Neon : branche de test, puis production.
create table if not exists activites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  metier text not null,
  publiee boolean not null default false,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'activites_metier_court') then
    alter table activites add constraint activites_metier_court check (metier ~ '^[a-z][a-z-]{1,39}$');
  end if;
end $$;
create unique index if not exists activites_user_metier on activites (user_id, metier);
