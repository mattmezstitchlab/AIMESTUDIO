-- AIME · les demandes reçues (PR Demandes, plan « La Carte universelle », 25/10/2026). Rejouable : rien n'est recréé ni effacé.
-- Numéro 09 : le 08 est réservé au Calendrier (dates des moments, docs/TEMPS.md).
-- Une demande du formulaire Contact est d'abord écrite ici, puis l'e-mail part (api/contact.js) : deux événements distincts,
-- chacun avec son statut. Une panne d'e-mail laisse la demande enregistrée, avec email_statut = 'echec', visible et renvoyable.
-- Aucune adresse IP n'est stockée. Pas de lien vers un compte : la boîte « site » est lue par les propriétaires du site
-- (AIME_PROPRIETAIRES), décidés côté serveur à chaque appel (api/demandes.mjs).
-- Doublons : empreinte unique (sha256 de l'adresse, du message et d'une fenêtre de 10 minutes : la même que l'Idempotency-Key de Resend).
-- Conservation : effacement des demandes sans activité depuis DEMANDES_CONSERVATION_MOIS mois (24 par défaut, docs/DEMANDES.md),
-- historique compris (on delete cascade).
-- À appliquer par l'agent Neon : d'abord sur une branche de test, puis en production, AVANT de déployer le code qui l'utilise
-- (sans la table, le code garde le comportement d'avant : l'e-mail seul).
create table if not exists demandes (
  id bigserial primary key,
  cle text not null,                        -- identifiant opaque, aléatoire, montré au navigateur à la place de id
  boite text not null default 'site',       -- à qui elle est adressée : 'site' (le formulaire Contact du site) ; d'autres boîtes plus tard
  empreinte text not null,
  type text not null,                       -- clé de PROJETS dans api/contact.js : site, refonte, supports, projet, autre
  prenom text not null,
  nom text not null,
  email text not null,
  tel text,
  adresse text,
  livraison date,
  message text not null,
  consentement_le timestamptz not null,
  statut text not null default 'nouvelle',
  note text,                                -- note privée du destinataire
  email_statut text not null default 'en_attente',
  email_tentatives integer not null default 0,
  email_dernier_essai timestamptz,
  email_envoye_le timestamptz,
  email_code text,                          -- code d'échec court (statut HTTP ou « reseau »), jamais un message du service
  recue_le timestamptz not null default now(),
  derniere_activite timestamptz not null default now(),
  constraint demandes_cle_forme check (cle ~ '^[A-Za-z0-9_-]{16,32}$'),
  constraint demandes_boite_forme check (boite ~ '^(site|compte:[A-Za-z0-9_-]{6,128})$'),
  constraint demandes_empreinte_forme check (char_length(empreinte) between 16 and 128),
  constraint demandes_type_liste check (type in ('site', 'refonte', 'supports', 'projet', 'autre')),
  constraint demandes_prenom_court check (char_length(prenom) between 1 and 80),
  constraint demandes_nom_court check (char_length(nom) between 1 and 80),
  constraint demandes_email_court check (char_length(email) between 3 and 160),
  constraint demandes_tel_court check (tel is null or char_length(tel) <= 30),
  constraint demandes_adresse_court check (adresse is null or char_length(adresse) <= 300),
  constraint demandes_message_court check (char_length(message) between 1 and 4000),
  constraint demandes_note_court check (note is null or char_length(note) <= 2000),
  constraint demandes_statut_liste check (statut in ('nouvelle', 'lue', 'en_cours', 'convertie', 'classee')),
  constraint demandes_email_statut_liste check (email_statut in ('en_attente', 'envoye', 'echec', 'non_configure')),
  constraint demandes_email_code_court check (email_code is null or char_length(email_code) <= 16),
  constraint demandes_tentatives_bornees check (email_tentatives between 0 and 100)
);
create unique index if not exists demandes_cle on demandes (cle);
create unique index if not exists demandes_empreinte on demandes (empreinte);
create index if not exists demandes_boite_recue on demandes (boite, recue_le desc, id desc);
create index if not exists demandes_activite on demandes (derniere_activite);

-- L'historique d'une demande : ce qui s'est passé, quand, par qui (identifiant de compte, ou null pour le serveur).
-- Jamais de donnée personnelle dans « detail » : des statuts et des codes seulement.
create table if not exists demandes_journal (
  id bigserial primary key,
  demande_id bigint not null references demandes (id) on delete cascade,
  quand timestamptz not null default now(),
  quoi text not null,
  par text,
  detail jsonb not null default '{}'::jsonb,
  constraint demandes_journal_quoi_liste check (quoi in ('recue', 'email_envoye', 'email_echec', 'email_non_configure', 'renvoi', 'statut', 'note')),
  constraint demandes_journal_par_court check (par is null or char_length(par) <= 128),
  constraint demandes_journal_detail_court check (octet_length(detail::text) <= 512)
);
create index if not exists demandes_journal_demande on demandes_journal (demande_id, quand);
