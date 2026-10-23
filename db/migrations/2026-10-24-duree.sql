-- AIME · la durée des rôles : un rôle d'espace peut avoir une date de fin ; après elle, il est refusé partout.
-- Additive, rejouable. null = sans fin (le propriétaire n'en a jamais).
alter table space_members add column if not exists jusqu_au timestamptz;
alter table invitations add column if not exists role_jusqu_au timestamptz;
create index if not exists space_members_fin on space_members (jusqu_au) where jusqu_au is not null;
