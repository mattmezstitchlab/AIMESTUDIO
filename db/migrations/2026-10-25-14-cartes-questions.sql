-- AIME · le formulaire personnel de ma Carte (V1, PR P5, 25/10/2026). Rejouable : « if not exists » et contraintes gardées.
-- La personne choisit jusqu'à 6 questions (texte, date, nombre, choix) posées à qui lui écrit par le lien de sa Carte (P3).
-- Les questions vivent avec la Carte (table cartes) : couper puis recréer un lien ne les efface pas ; retirer la Carte, si.
-- Les réponses sont gardées sur la demande, avec le libellé de la question tel qu'il était à l'envoi : modifier ou retirer
-- une question plus tard ne change pas le sens d'une demande déjà reçue. Aucune donnée en plus sur le visiteur.
-- Additive. À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production, AVANT le code qui l'utilise
-- (sans elle : ME dit « pas encore disponible », la page du lien garde le formulaire de P3, rien ne casse).
alter table cartes add column if not exists questions jsonb not null default '[]'::jsonb;
alter table demandes add column if not exists reponses jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cartes_questions_forme') then
    alter table cartes add constraint cartes_questions_forme check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 6 and octet_length(questions::text) <= 8192);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'demandes_reponses_forme') then
    alter table demandes add constraint demandes_reponses_forme check (reponses is null or (jsonb_typeof(reponses) = 'array' and jsonb_array_length(reponses) <= 6 and octet_length(reponses::text) <= 8192));
  end if;
end $$;
