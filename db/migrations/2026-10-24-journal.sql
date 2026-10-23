-- AIME · le journal (règle 11) : chaque décision sur un espace laisse une trace, en ajout seul.
-- Additive, rejouable. La table « audit » existe déjà dans db/schema.sql : on l'assure, on l'indexe, et on interdit
-- toute modification ou suppression d'une ligne (même par l'application). Aucun contenu sensible : des identifiants,
-- un rôle, une date ; jamais une adresse e-mail ni un jeton.
create table if not exists audit (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  user_id     text,
  space_id    uuid,
  action      text not null,
  detail      jsonb
);
create index if not exists audit_espace on audit (space_id, at);
create index if not exists audit_cible on audit ((detail->>'cible'));

create or replace function audit_ajout_seul() returns trigger language plpgsql as $$
begin
  raise exception 'journal en ajout seul : % refusé', tg_op;
end $$;
drop trigger if exists audit_ajout_seul on audit;
create trigger audit_ajout_seul before update or delete on audit for each row execute function audit_ajout_seul();
