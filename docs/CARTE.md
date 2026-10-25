# AIME — la Carte universelle (Page Zéro → cube → Le Monde AIME)

> **21 octobre 2026 : la création de la Carte est retirée de la Page Zéro.**
> - Raison : elle faisait doublon avec « Votre carte » dans la verticale de `/aime/`, et compliquait la Page Zéro.
> - La Page Zéro revient à sa version d'origine. Seuls changent l'orbe réduite et les deux sorties : Ouvrir mon Bureau, puis Rejoindre Le Monde AIME.
> - Restent `carte/carte.js` (le modèle), `carte/rendu.js`, `carte/guide.js` et la facette du cube. Une Carte déjà créée dans un navigateur n'est jamais effacée : le cube et le Bureau la montrent encore.
> - `carte/zero-carte.js` est supprimé.
> - Le texte ci-dessous décrit la version retirée.

Branche `carte` (depuis `integration`). Visible sur la preview d'intégration. `main` et la production ne sont pas modifiées. Les données sont fictives ou locales.

## 1. Le parcours livré

1. **Page Zéro (`/`).** L'orbe du hero est réduite de 30 % : de min(44vmin, 340 px) à min(31vmin, 240 px). Son rapport est de 1:1, mesuré à 240 × 240 sur ordinateur et 121 × 121 sur iPhone. La déformation de l'enveloppe passe de 2,2 % à 0,7 %.
2. **« Commencer ma Carte ».** L'orbe pose une question à la fois. Toutes sont facultatives. On peut passer, revenir en arrière ou quitter. Les questions s'adaptent à l'intention : un souvenir ne déclenche pas les questions de rencontre. Les rubriques déjà remplies ne sont jamais redemandées.
3. **La métamorphose existante se nourrit des réponses.**
   - POINT : la première intention.
   - LIGNE : les moments et le parcours, avec leurs dates.
   - RELATION : les liens renseignés.
   - GRILLE : les rubriques, remplies ou non.
   - COMPOSITION : les couleurs de la personne.
   - PROJET : son nom et son rêve.
   Sans réponse, les valeurs d'exemple sont marquées « EXEMPLE ».
4. **La Carte.** C'est le carré arrondi de la forme « Projet ». Elle est vivante, éditable rubrique par rubrique, versionnée (chaque changement crée une version, avec « Annuler la dernière ») et exportable en JSON et en PNG.
5. **Confidentialité.**
   - Tout est privé par défaut. Chaque rubrique se règle : moi seul, mes contacts acceptés, ou le registre public.
   - La date de naissance et les relations ne peuvent jamais être publiques.
   - La publication demande un consentement explicite, daté, avec son texte, et se retire à tout moment.
6. **Le registre.** Huit Cartes fictives, réduites à leur vue publique. Six filtres : projets, centres d'intérêt, compétences, contributions, territoires, parcours partagés. Les mises en relation sont expliquées (« Vous proposez « musique » : cette personne le recherche »). La demande de contact attend l'acceptation des deux personnes ; pour les personnes fictives, la réponse est simulée et dite comme telle.
7. **« Votre Carte est née. » → « Rejoindre Le Monde AIME ».** La Carte apparaît au centre, se réduit, et la page passe sur `/aime/`.
8. **Le Monde AIME (`/aime/`).** La Carte descend dans le **cube existant** : le O de « Le monde », sans reconstruction. Elle s'installe sur sa première face (« vous ») avec l'initiale et les couleurs, et le cube pivote pour la présenter. L'orbe dit alors « Bienvenue dans Le Monde AIME » et continue sans rien redemander : ce que tu veux faire, ton rêve comme premier projet (ou un projet si tu n'en as pas déclaré), garder la Carte privée ou en partager une partie.
9. **Mouvement réduit.** Pas de vol : la face s'allume, et l'orbe parle.

## 2. Une seule source

`carte/carte.js` définit l'objet canonique `aime-carte` (schéma 1). Tous les autres le lisent, sans copie :
- la Page Zéro (dialogue, métamorphose, Carte, registre) ;
- la facette du cube ;
- la suite dans Le Monde AIME.

Les composants graphiques (`carte/rendu.js`) reçoivent la Carte ou sa vue publique. La mémoire de la landing (`aime-mem`) ne reçoit aucune donnée de la Carte.

La facette est une vue « propriétaire » : la personne voit sa Carte dans son navigateur. Un cube vu par quelqu'un d'autre n'afficherait que `vuePublique()`.

Sans compte, la Carte vit dans ce navigateur, sous la clé `localStorage` « aime-carte ». Les versions et les contacts sont dans des clés voisines. « Effacer ma Carte de ce navigateur » efface le tout.

## 3. Le guide et l'agent

`carte/guide.js` est un guide **déterministe** : des questions écrites, choisies selon les réponses. De petits moteurs locaux (dates, palette, parcours, listes) transforment une réponse en élément de Carte. Le dialogue nomme le moteur utilisé.

L'« agent AIME connecté » est réservé (`AGENT.disponible = false`), et le dialogue affiche qu'il n'est pas branché. Aucune IA n'est simulée.

## 4. Audit Neon et des modèles existants

| Source | Contenu | Constat pour la Carte |
|---|---|---|
| `GET /api/health` (preview d'intégration) | Sonde `select 1` | **Vérifié le 21/10/2026 : 200 `{"ok":true}`.** La base répond depuis la preview. La sonde ne dit rien des tables. |
| `db/schema.sql` | `spaces`, `space_members`, `invitations`, `items`, `user_data` (clés `aime-os` et `echos:v2`), `vault`, `audit` | Pas de table « personne » ni « carte ». `user_data` est la place naturelle, mais sa contrainte n'accepte que deux clés. |
| Authentification | Proposée (Better Auth), sur une branche non fusionnée qui a des conflits | **Absente ici** : aucune écriture n'est donc possible, ni souhaitable. |
| `aime-mem` (landing) | Rôle, projet, épingles, frise, visuels : la mémoire du parcours de la landing | Un autre objet. La Carte ne s'y recopie pas. |
| Vitrine / WORLD (`vitrine/donnees`) | Données métier d'événements fictifs | Aucun modèle de personne réutilisable. |

### Proposition (rien n'est appliqué)

- **Stockage de la Carte.** `user_data` avec `key = 'carte'`. La contrainte `check` s'étend avec une migration non destructive (`alter table … drop constraint … add constraint … check (key in ('aime-os','echos:v2','carte'))`), à appliquer d'abord sur une branche Neon de preview.
- **`cartes_publiees`** : `user_id`, `vue jsonb` (la vue publique calculée côté serveur), `consentement_at`, `rubriques text[]`, `revoquee_at`. Le registre ne lit que cette table.
- **`contacts`** : `de`, `vers`, `etat` (en attente, acceptée ou refusée), `created_at`, `repondu_at`. On ne voit rien de plus qu'une Carte publique tant que les deux n'ont pas accepté.
- **Routes :**
  - `GET` et `PUT /api/carte` : session obligatoire ; l'identité vient de la session, jamais du client ;
  - `POST` et `DELETE /api/carte/publication` : consentement exigé côté serveur ;
  - `GET /api/registre` : vues publiques seulement ;
  - `POST /api/contacts`.
- **Passage du navigateur au compte.** À la première connexion, proposer d'importer la Carte locale (`AIMECarte.importer`), avec confirmation, sans publication automatique.

Prochaine étape, après votre validation : choisir et brancher l'authentification. Viendront ensuite la migration `user_data`, les deux tables et les routes, avec des tests d'isolation entre deux comptes. Pas de migration destructive, pas de production.

## 5. Tests

- `tests/carte.test.cjs` : 7 tests (confidentialité, versions, consentement, vue publique, registre, guide adaptatif, moteurs, suite sans redemande, rendu sans fuite).
- Parcours complet joué automatiquement :
  - Page Zéro, dialogue (9 réponses, un retour arrière), métamorphose, Carte v9 ;
  - édition, publication, filtre, contact ;
  - « Rejoindre », vol vers le cube, facette, orbe et suite.
  - Résultat : aucune erreur.
- iPhone 13 (émulé) : pas de défilement horizontal ; le dialogue, la Carte et le registre sont lisibles.

## 6. Limites

- La Carte est locale à un navigateur tant qu'il n'y a ni compte ni Neon. Avec un compte, elle peut être enregistrée sur le compte, avec accord (§ 5).
- Le registre réel est vide : il ne contient que des personnes fictives et, au besoin, votre propre Carte publiée localement.
- La facette du cube est petite (le O du titre). Elle montre l'initiale, les couleurs et l'orbe, pas le détail de la Carte.
- Sur la landing, la question « Qui êtes-vous ? » (Moi, Pro…) existait déjà. Elle reste posée : la Carte ne se substitue pas au parcours de la landing.


## 5. La Carte enregistrée sur le compte (V1, PR P1, 25/10/2026)

Ce qui existe désormais, en plus de la Carte locale :

- **Table `cartes`** (migration `2026-10-25-10-cartes.sql`) : une Carte par compte, une révision côté serveur (`rev`), la date et le texte de l'accord. Elle est effacée avec le compte (`on delete cascade`). Choix fait plutôt que `user_data` (§ 4) : cette table n'existe ni en production ni dans aucune migration ; une table dédiée garde la Carte lisible et ses contraintes explicites.
- **`/api/carte`** (`api/carte.mjs`) : chacun ne lit et n'écrit que **sa** Carte. L'identité vient de la session, jamais du corps. Sans session : 401. Écritures : même origine et JSON, accord obligatoire, quota `carte:enregistrer`. Si l'appareil enregistre sur une révision périmée : 409 avec la version du compte, jamais d'écrasement silencieux. Base ou migration absente : 503, dit.
- **Le nettoyage serveur** (`api/_carte/carte.cjs`) applique les règles de `carte/carte.js`, sans second modèle :
    - la photo, les relations (des données sur d'autres personnes), l'historique et « suite » ne sont jamais envoyés ;
    - une rubrique jamais publique marquée « publique » est refusée (400) ;
    - la publication est toujours « non publiée » : le lien public révocable viendra avec la PR P2.
- **ME** (`compte/carte-compte.js`) présente chaque état avec ses gestes :
    - aucune Carte : on peut la commencer dans ME ;
    - Carte sur l'appareil seulement : on voit ce qui sera enregistré et ce qui reste sur l'appareil, puis on donne son accord ;
    - Carte sur le compte seulement : « Utiliser ma Carte sur cet appareil » ;
    - identiques : réglage des visibilités ;
    - différentes : on choisit, sans fusion. La copie locale est sauvegardée dans `aime-carte-sauvegarde` avant d'être remplacée.

  On peut aussi retirer sa Carte du compte : la copie de l'appareil reste. Les erreurs (réseau, 503) le disent ; rien n'est perdu.
- **Tests** : `tests/carte-compte.test.cjs` (base, vraies sessions) et `tests/navigateur/carte.cjs` (ordinateur, iPhone, iPad, deux comptes, axe).

Toujours hors de cette PR : les liens publics (P2), les demandes adressées à une Carte (P3), la modification des rubriques dans ME (P4) et la photo.
