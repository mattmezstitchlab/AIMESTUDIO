-- AIME · Calendrier du module Temps (migration 08, le numéro réservé dans docs/TEMPS.md et docs/DEMANDES.md).
-- La date du Jour J d'un programme : UNE date par projet, facultative. Les heures des moments restent des minutes depuis
-- minuit de ce jour-là (0 à 2879, docs/TEMPS.md § 2) : un moment qui commence à 01:00 le lendemain s'écrit 1500, sans
-- seconde date à gérer. Aucune date n'est inventée : tant que la colonne est nulle, l'écran dit « Jour J » comme avant.
-- Additive, rejouable. À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production, AVANT le code
-- qui l'utilise (sans elle, l'écran fonctionne comme avant et la date est dite « pas encore installée »).
alter table temps_espaces add column if not exists jour_j date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'temps_espaces_jour_j_plage') then
    -- une plage large mais fermée : une saisie aberrante (an 0001, an 9999) est refusée par la base comme par le serveur
    alter table temps_espaces add constraint temps_espaces_jour_j_plage
      check (jour_j is null or (jour_j >= date '2000-01-01' and jour_j <= date '2100-12-31'));
  end if;
end $$;
