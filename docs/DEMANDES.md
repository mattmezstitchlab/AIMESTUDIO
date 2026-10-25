# Demandes (formulaire Contact → demande enregistrée → e-mail)

Première PR du plan « La Carte universelle et le premier parcours réel ». Une demande envoyée par le formulaire Contact
devient une ressource persistante d'AIME. L'e-mail continue de partir comme avant.

## Deux événements, deux statuts

| Événement | Où | Statuts |
|---|---|---|
| La demande est enregistrée | table `demandes` (`api/_demandes/depot.cjs`) | `statut` : `nouvelle`, `lue`, `en_cours`, `convertie`, `classee` |
| L'e-mail est envoyé | Resend (`api/_demandes/courriel.cjs`) | `email_statut` : `en_attente`, `envoye`, `echec`, `non_configure` |

Ordre dans `api/contact.js` : validation, quotas, **enregistrement**, puis **e-mail**, puis le résultat de l'envoi est noté sur la
demande et dans son historique (`demandes_journal`).

| Base | E-mail | Le visiteur voit | Ce qui reste |
|---|---|---|---|
| ✓ | ✓ | « Merci, votre demande est bien partie » | demande `envoye` |
| ✓ | ✗ (refus, réseau) | le même message | demande `echec` avec son code, à renvoyer |
| ✓ | non configuré | le même message | demande `non_configure`, à renvoyer |
| ✗ (absente, injoignable 4 s, migration non appliquée) | ✓ | le même message | l'e-mail, comme avant cette PR |
| ✗ | ✗ | « L'envoi n'a pas abouti… votre texte est toujours là » (502) | le texte, dans la page du visiteur |

Aucune demande n'est perdue en silence : soit elle est en base, soit elle est dans l'e-mail, soit le visiteur sait que rien
n'est parti et garde son texte.

## Doublons

L'empreinte est un sha256 de l'adresse, du message et d'une fenêtre de 10 minutes : la même valeur que l'`Idempotency-Key`
de Resend, déjà en place. Elle est unique en base, donc un double clic donne une seule demande. Une demande déjà transmise
ne repart pas. Un renvoi fait moins de 23 heures après la réception réutilise la même clé, et Resend n'envoie pas deux fois.

## Droits

`/api/demandes` est réservé aux **propriétaires du site** (`AIME_PROPRIETAIRES`, `api/_auth/proprietaire.mjs`), vérifiés côté
serveur à chaque appel. Les autres reçoivent 404 : sans session, membre ou invitée d'un projet, autre compte. Les écritures
passent par la garde même origine et JSON (`api/_auth/requete.cjs`).

Le navigateur ne voit jamais l'identifiant interne ni l'empreinte, seulement une clé opaque et aléatoire (`cle`).

La colonne `boite` vaut `site` pour le formulaire du site. Elle permettra plus tard de recevoir les demandes d'autres
boîtes, par exemple celles du mini-site d'un utilisateur (`compte:<id>`), sans changer de modèle.

## Données personnelles

- Enregistré : prénom, nom, e-mail, téléphone, adresse et date souhaitée s'ils sont donnés, message, date du consentement.
- **Aucune adresse IP** : les quotas n'en gardent qu'une empreinte HMAC, effacée sous 48 heures.
- Historique : des statuts et des codes uniquement. Il dit qu'une note a changé, jamais ce qu'elle contient.
- Effacement sur demande de la personne : `POST { action: 'effacer', cle, confirmation: true }` efface la demande et son historique.
- Textes publics mis à jour : la case de consentement (`contact/index.html`, `lab/grande-partition/index.html`) et `confidentialite/index.html`.

## Conservation : 24 mois, à valider juridiquement

- `DEMANDES_CONSERVATION_MOIS` (variable Vercel) : un entier entre 1 et 120. Toute autre valeur donne 24.
- Le délai court depuis la **dernière activité** (réception, changement de statut, note, renvoi).
- Effacement automatique au plus une fois par heure et par instance, lors d'une lecture ou d'une écriture. L'historique part avec la demande.
- **Si la durée change** : modifier aussi la case de consentement et la page Confidentialité. `tests/pages-legales.test.cjs` vérifie que ces deux textes disent la même durée que le code.
- **Statut : proposition.** La durée de 24 mois et les textes publics doivent être validés juridiquement avant la mise en production.

## API

| Appel | Effet |
|---|---|
| `GET /api/demandes` | liste paginée (`n` ≤ 50, curseur `avant` = `suivant`), la plus récente d'abord |
| `GET /api/demandes?cle=…` | détail et historique, avec la date d'effacement prévue (`conserver_jusqu_au`) |
| `POST { action: 'statut', cle, statut }` | qualifier ou suivre la demande |
| `POST { action: 'note', cle, note }` | note privée, 2 000 caractères au plus |
| `POST { action: 'renvoyer', cle }` | renvoyer l'e-mail après un échec (409 s'il est déjà parti) |
| `POST { action: 'effacer', cle, confirmation: true }` | droit à l'effacement |
| `POST { action: 'convertir', cle, titre, modele? }` | créer un projet depuis la demande (un seul, rejouable) ; seuls le nom et le domaine passent dans le projet |

L'écran qui affiche les demandes est **Ma Carte** (PR 2), avec le gabarit « Un Dock, un centre ». Cette PR n'ajoute aucun
tableau de bord.

## AIME fonctionne avec AIME

Les demandes réelles ne servent **jamais** une page publique. Une future vitrine de l'usage d'AIME par son créateur
utilisera les mêmes composants et les mêmes moteurs, avec des données fictives ou explicitement autorisées, servies à part.
Un test vérifie qu'aucune page publique, démonstration ou vitrine n'appelle `/api/demandes`.

## Migration

`db/migrations/2026-10-25-09-demandes.sql`. Le numéro 08 est pris par la date du Jour J (`docs/TEMPS.md` § 10). Elle est rejouable :
la CI la joue deux fois.

Pour l'agent Neon :

1. L'appliquer sur une **branche de test** Neon, puis vérifier : `select to_regclass('public.demandes'), to_regclass('public.demandes_journal');`.
2. L'appliquer deux fois de suite pour vérifier qu'elle est rejouable (aucune erreur, seulement des NOTICE).
3. Après validation de Matt : l'appliquer en **production**, **avant** le déploiement du code. Sans la table, le code garde
   le comportement d'avant (l'e-mail seul). Les textes publics annonceraient alors un enregistrement qui n'a pas lieu.

Aucune donnée n'est copiée ni transformée : deux tables neuves, vides.

## Tests

- `tests/demandes.test.cjs` : l'ordre (la demande avant l'e-mail), les pannes (e-mail, base, les deux), les doublons, les
  droits avec de vraies sessions (propriétaire ; membre, invitée et autre compte refusés), l'historique sans donnée
  personnelle, l'effacement, la conservation, la pagination, et aucune lecture depuis une page publique.
- `tests/socle-ancien.test.cjs` : sur une base sans la migration 09, l'e-mail part comme avant.
- `tests/contact.test.cjs` : inchangé, il passe tel quel.
- `tests/pages-legales.test.cjs` : les textes publics disent ce que fait le code.
