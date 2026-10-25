-- AIME · la Carte enregistrée sur le compte (V1, PR P1) : une Carte par personne, retrouvée sur tous ses appareils.
-- Privée par défaut : rien de cette table n'est servi publiquement (la publication par lien viendra avec une autre migration).
-- Rejouable : uniquement des « if not exists ». Appliquée d'abord sur une branche de test Neon, puis en production, sur accord.
--
--   donnees          : la Carte nettoyée par le serveur (api/_carte/carte.cjs) : rubriques connues seulement, jamais la photo,
--                      jamais les relations (des tiers), jamais l'historique ; publication toujours « non publiée » ici
--   rev              : la révision côté serveur, pour qu'un appareil n'écrase jamais en silence ce qu'un autre a enregistré (409)
--   consentement_le  : la date du dernier enregistrement consenti, et le texte accepté
create table if not exists cartes (
  user_id            text primary key references "user" ("id") on delete cascade,
  donnees            jsonb not null,
  rev                integer not null default 1,
  consentement_le    timestamptz not null,
  consentement_texte text not null,
  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now(),
  constraint cartes_taille check (octet_length(donnees::text) <= 32768),
  constraint cartes_rev check (rev >= 1),
  constraint cartes_texte_court check (char_length(consentement_texte) between 1 and 1000)
);
