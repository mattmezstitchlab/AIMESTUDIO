-- AIME · les quotas partagés entre instances (audit Vercel, PR 2). Rejouable : rien n'est recréé ni effacé.
-- Une ligne par compteur et par fenêtre fixe : cle = « nom:empreinte » (empreinte HMAC d'une IP ou d'un identifiant,
-- jamais la valeur en clair), fenetre = début de la fenêtre, n = nombre d'appels. api/_auth/quotas.cjs incrémente en une
-- requête atomique et efface au passage les lignes de plus de 48 heures. Sans cette table, les quotas restent en mémoire.
-- À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production.
create table if not exists quotas (
  cle text not null,
  fenetre timestamptz not null,
  n integer not null default 0,
  primary key (cle, fenetre),
  constraint quotas_cle_courte check (char_length(cle) <= 120),
  constraint quotas_n_positif check (n >= 0)
);
create index if not exists quotas_fenetre on quotas (fenetre);
