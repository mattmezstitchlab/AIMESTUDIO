-- AIME · les activités montrées sur ma Carte (V1, PR P4, critère 3.4 ; décision de Matt du 25/10/2026 : une case à part).
-- « sur_carte » : l'activité apparaît sur le lien public de MA Carte (api/carte-publique.mjs), seulement si ce lien existe.
-- Ce n'est PAS « publiee » : la publication au Registre (docs/IDENTITE.md) gardera son propre geste et son propre accord.
-- Fausse par défaut : rien n'est montré sans un geste. Additive, rejouable. Branche de test d'abord, production sur accord.
alter table activites add column if not exists sur_carte boolean not null default false;
