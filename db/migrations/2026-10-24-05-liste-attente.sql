-- AIME · la liste d'attente de la bêta (brief « Liste d'attente », 24/10/2026). Rejouable : rien n'est recréé ni effacé.
-- Aucune inscription n'ouvre de compte. Une adresse n'y figure qu'une fois (index sur lower(email)).
-- Jetons de confirmation : seulement leur empreinte sha256 (jeton_hash), valables 7 jours (jeton_expire).
-- La désinscription efface la ligne (api/attente.js) ; les lignes restantes sont supprimées 6 mois après l'ouverture de la bêta.
-- À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production.
create table if not exists liste_attente (
  id bigserial primary key,
  email text not null,
  place text,                    -- valeur de « Je suis… » : maries, coordination, metier:fleuriste, invite…
  source text,                   -- utm_source
  campagne text,                 -- utm_campaign
  souhaits text[] not null default '{}',   -- identifiants de attente/souhaits.json
  souhait_libre text,
  jeton_hash text,
  jeton_expire timestamptz,
  confirme_le timestamptz,
  retire_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint attente_email_court check (char_length(email) <= 254),
  constraint attente_place_court check (place is null or char_length(place) <= 60),
  constraint attente_source_court check (source is null or char_length(source) <= 40),
  constraint attente_campagne_court check (campagne is null or char_length(campagne) <= 40),
  constraint attente_souhaits_nombre check (cardinality(souhaits) <= 20),
  constraint attente_libre_court check (souhait_libre is null or char_length(souhait_libre) <= 140)
);
create unique index if not exists liste_attente_email on liste_attente (lower(email));
