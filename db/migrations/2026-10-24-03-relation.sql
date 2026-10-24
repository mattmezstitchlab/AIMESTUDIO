-- AIME · la relation d'un membre dans un projet (docs/IDENTITE.md § 2.3, docs/GABARITS.md § 8) : le mot métier, distinct du rôle.
-- Le rôle (owner, editor, contributor, viewer, guest) décide des droits ; la relation (« témoin », « fleuriste »…) ne fait que nommer.
-- Elle est choisie à l'invitation, recopiée à l'acceptation, et ne donne aucun droit.
-- Et la création sans doublon : un projet créé depuis le même essai (spaces.data.origine) n'existe qu'une fois par propriétaire.
-- Additive, rejouable. À appliquer par l'agent Neon : branche de test, puis production.
alter table space_members add column if not exists relation text;
alter table invitations add column if not exists relation text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'space_members_relation_court') then
    alter table space_members add constraint space_members_relation_court check (relation is null or char_length(relation) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invitations_relation_court') then
    alter table invitations add constraint invitations_relation_court check (relation is null or char_length(relation) between 1 and 40);
  end if;
end $$;
create unique index if not exists spaces_origine_unique on spaces (owner_id, (data->>'origine')) where data ? 'origine';
