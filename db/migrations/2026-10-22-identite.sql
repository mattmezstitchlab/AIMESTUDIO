-- AIME · l'identité : quand le timbre a été confirmé, quand le Monde AIME a été découvert.
-- Additive, rejouable. Une ligne par compte ; effacée avec le compte (effacerTraces).
create table if not exists identite (
  user_id text primary key,
  timbre_le timestamptz,
  monde_le timestamptz,
  cree_le timestamptz not null default now()
);
