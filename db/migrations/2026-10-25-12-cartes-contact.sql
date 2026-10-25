-- AIME · recevoir des demandes par le lien de ma Carte (V1, PR P3). Rejouable : uniquement des « if not exists ».
-- Le contact s'active sur le lien public : couper le lien coupe aussi le contact. Les demandes reçues vont dans la boîte
-- 'compte:<identifiant>' de la table demandes (déjà autorisée par la migration 09) : un seul système de demandes.
alter table cartes_liens add column if not exists contact boolean not null default false;
