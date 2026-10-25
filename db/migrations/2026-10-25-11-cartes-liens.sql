-- AIME · le lien public et révocable de ma Carte (V1, PR P2). Rejouable : uniquement des « if not exists ».
-- Un lien = un jeton aléatoire ; un seul lien actif par personne ; couper un lien le rend inutilisable tout de suite (coupe_le).
-- Le lien ne montre que les rubriques marquées « publique » (jamais la naissance ni les relations), calculées au serveur à
-- chaque ouverture : changer une visibilité ou couper le lien prend effet immédiatement. Aucune adresse IP n'est gardée ;
-- seul un compteur d'ouvertures, visible du seul propriétaire.
create table if not exists cartes_liens (
  jeton              text primary key,
  user_id            text not null references "user" ("id") on delete cascade,
  cree_le            timestamptz not null default now(),
  coupe_le           timestamptz,
  consentement_texte text not null,
  ouvertures         integer not null default 0,
  constraint cartes_liens_jeton check (jeton ~ '^[A-Za-z0-9_-]{32,64}$'),
  constraint cartes_liens_texte check (char_length(consentement_texte) between 1 and 1000),
  constraint cartes_liens_ouvertures check (ouvertures >= 0)
);
create unique index if not exists cartes_liens_actif on cartes_liens (user_id) where coupe_le is null;
