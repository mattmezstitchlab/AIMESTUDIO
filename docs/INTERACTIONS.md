# Interactions : le contrat commun d'une demande (V1, contrat 1)

Une **demande** est un message qu'une personne sans compte adresse à quelqu'un sur AIME. Une seule forme, quel que soit le point d'entrée ; une seule table (`demandes`, migration 2026-10-25-09) ; un seul écran pour la traiter (AI, « À traiter »).

## Points d'entrée

| Entrée | Route | Boîte | Destinataire de l'e-mail | Qui la lit |
|---|---|---|---|---|
| Formulaire Contact du site | `POST /api/contact` | `site` | `CONTACT_TO` | les propriétaires du site (`AIME_PROPRIETAIRES`) |
| Une Carte, par son lien (P3) | `POST /api/carte-publique?l=<jeton>` | `compte:<id>` | l'adresse du compte de la personne | cette personne seulement |

## Corps (JSON)

`prenom` (1–80, une ligne), `nom` (1–80), `email` (adresse valide, ≤ 160), `tel` (facultatif, 6–30), `message` (20–4 000), `consentement: true`, `site_web` (piège : vide), `duree` (ms depuis l'ouverture du formulaire, ≥ 3 000).
Contact ajoute `projet` (site, refonte, supports, projet, autre), `adresse`, `livraison`. Une Carte n'en a pas (`type = 'projet'`).

## Réponses

- `200 { ok: true }` : reçue (aussi pour un robot détecté, et pour un double envoi : une seule demande, empreinte sur 10 minutes).
- `422 { erreur: 'champs', champs: { champ: message } }`.
- `429 { erreur: 'limite', attente }` + `Retry-After`.
- `403` autre origine, `415` pas du JSON, `413` trop gros.
- Carte seulement : `404` lien inconnu, coupé ou contact éteint (sans dire lequel) ; `503` base indisponible (rien n'est envoyé à moitié).

## Garanties

1. La demande est **enregistrée avant** l'e-mail ; une panne d'e-mail ne perd rien (statut `echec`, « Renvoyer »).
2. L'adresse du destinataire n'est **jamais** renvoyée au visiteur ; celle du visiteur ne sert qu'en Reply-To.
3. Aucune adresse IP enregistrée (les quotas n'en gardent qu'une empreinte, 48 h).
4. Chaque lecture ou action passe par `sienne(cle)` : une demande hors de ses boîtes répond 404.
5. Chaque demande dit d'où elle vient : `via: 'site' | 'carte'`.
