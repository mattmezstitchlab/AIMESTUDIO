# TOUT VOIR → AIME SynchroView · audit et plan progressif

Réponse au brief « Inspection universelle des interfaces et des permissions ».
Branche : `synchroview`. **`main` n'est pas modifiée.** `/tout/` reste tel quel ; tout le neuf vit dans `/synchroview/`.

Niveaux de preuve utilisés dans ce document : **[code]** lu dans le dépôt · **[mesuré]** test exécuté (navigateur automatisé) · **[supposé]** à vérifier.

---

## 1. Le code actuel de TOUT VOIR (`main:tout/index.html`, 97 lignes, 10 Ko)

| Élément | Fonctionnement | Preuve |
|---|---|---|
| Vues | 4 `<iframe>` de la même page : `/?apercu&mode=moi|pro|proche|coord`. | [code] |
| Mise à l'échelle | Chaque cadre a la taille réelle de l'appareil (1440×900 ou 390×844) puis `transform: scale()` pour tenir dans sa case. | [code] |
| Grille | 2 × 2 en ordinateur, 4 colonnes en mobile ; index des sections à gauche. | [code] |
| Défiler / Toucher | « Défiler » : un calque transparent au-dessus de chaque vue capte la molette, c'est la page qui défile. « Toucher » : le calque disparaît, on agit dans la vue. | [code] |
| Copier la position | Copie un texte (« Tout voir · Ordinateur · Les mots · 27 % »), pas un lien. | [code] |
| Mobile | Depuis ce soir, les vues sont rechargées au passage en mobile : vraie mise en page (23 041 px au lieu de 25 489). | [mesuré] |

## 2. Le mécanisme du scroll synchronisé

1. Une page « fantôme » (`.spacer`) donne à TOUT VOIR une hauteur proportionnelle à celle de la 1re vue.
2. À chaque défilement (regroupé par `requestAnimationFrame`), on calcule `t = scrollY / défilement max` (0 → 1).
3. Chaque vue reçoit `contentWindow.scrollTo(0, t × sa propre hauteur)` — **accès direct au contenu du cadre**, possible seulement parce que tout est sur le même domaine.
4. Les repères (Accueil, 13 temps de la Naissance, cube, causalité, site) sont recalculés à partir de la 1re vue avec une liste de noms écrite dans `/tout/`.

Constats :
- Écart entre les 4 vues : 2 à 4 px **[mesuré]**, parce que les 4 modes ont aujourd'hui la même hauteur (vérifié : 25 489 px chacun, mini-site 1 453 px chacun).
- C'est une synchronisation **au pourcentage** : dès que deux vues n'ont pas la même longueur (appareils, versions), elle décroche.
- En « Toucher », une vue défilée à la main n'entraîne pas les autres (5 000 px contre 3 px) **[mesuré]**.

## 3. Comment les quatre profils sont obtenus : **simulés, pas authentifiés**

| Question | Réponse | Preuve |
|---|---|---|
| Y a-t-il une connexion par profil ? | Non. Aucune session, aucun serveur interrogé. | [code] |
| D'où vient le profil ? | Du paramètre `mode=` de l'adresse : `AIMEM.role` est forcé en mémoire. `apercu` force aussi « cube ouvert », « grille calibrée », et rend l'enregistrement inopérant. | [code] |
| Les vues écrivent-elles ? | Non : `save()` ne fait rien en aperçu ; `aime-mem` reste vide après une session. | [mesuré] |
| Quelles données affichent-elles ? | **Les vôtres** : les 4 vues lisent le même `localStorage` (même domaine). Un « Participant » voit donc vos données de propriétaire. Sans conséquence aujourd'hui (une seule personne), **contraire au §6 du brief dès qu'il y aura plusieurs identités**. | [code] |
| Le profil change-t-il des droits ? | Non : il change le contenu (textes, questions, version du mini-site). Rien n'est refusé à personne. | [code] |
| Règles d'accès existantes ? | `auth-better-auth` : rôle global `member`/`creator` (non modifiable depuis le navigateur) ; cinq rôles d'espace (`owner`, `editor`, `contributor`, `viewer`, `guest`) **décrits seulement en commentaires SQL**, sans route ni contrôle. | [code] |

Conséquence directe pour le §2 du brief : aujourd'hui, **aucune vue ne peut afficher « Autorisé » ou « Refusé »** avec une preuve. Seuls « Absent », « Masqué », « Désactivé » sont observables, et seulement au niveau « observation ».

## 4. Composants réutilisables

| Composant | Où | État |
|---|---|---|
| Grille + mise à l'échelle + calques Défiler/Toucher | `main:/tout/` | stable, à garder tel quel |
| Mode aperçu (`?apercu&mode=`, lecture seule) | `main:index.html` | stable |
| Pont `postMessage` (hello, go, by, anchors, at, pick, find, clear) | `synchroview:/synchroview/bridge.js` (7 Ko) | prototype |
| Repères de page `window.svAnchors()` | `synchroview:index.html` | prototype ; recopie la formule de la Naissance (fragile) |
| Identifiants stables `data-sv-id="bloc:<type>"` | blocs du mini-site | prototype |
| Synchronisation par sections, Liée/Libre, Toucher bidirectionnel, 4 formats, axe modes/formats, lien partageable | `/synchroview/` | prototype, mesuré (2–7 px entre iPhone et écran large) |
| Focus (1 grande vue + 3 miniatures, Échap) | `/synchroview/` | prototype |
| Inspecter (présence, visibilité, libellé, contenu, actions, style, taille) | `/synchroview/` | prototype, niveau « observation » uniquement |
| Versions du mini-site par mode, même gabarit | `main:index.html` (`PRE`, `modePre()`) | stable |
| Schéma des rôles d'espace, sessions Better Auth | `auth-better-auth` | non fusionné, non appliqué |

## 5. Modules proposés (tous additionnels, branchés sur `/synchroview/`)

### M1 · Composition des vues
Une vue = `{profil, appareil, version, environnement, site}`. Composition = liste de vues + options (liées, focus, section). Sauvegarde : dans l'adresse (déjà) + compositions nommées (navigateur, puis compte).
- Version = adresse d'un déploiement (ex. preview Vercel d'une branche) → comparer main et une branche côte à côte.
- Environnement = production en lecture seule, ou preview de test.

### M2 · Moteur de synchronisation
Déjà prototypé : sections à identifiant stable, vue Liée/Libre, navigation commune ou indépendante. À ajouter : verrou des vues secondaires pendant le focus, transition d'agrandissement animée, repères fournis par la page elle-même (la Naissance publie ses temps au lieu d'une formule recopiée).

### M3 · Inspecteur à statuts et niveaux de preuve
Chaque case affiche **un statut** et **sa preuve** :

| Statut | Signification | Preuve minimale |
|---|---|---|
| Absent | l'élément n'existe pas dans cette vue | observation |
| Masqué | il existe mais n'est pas visible (taille nulle, `hidden`, `display:none`, `aria-hidden`) | observation |
| Désactivé | visible mais `disabled` / `aria-disabled` | observation |
| Autorisé | la règle donne le droit | code **ou** serveur **ou** test |
| Refusé | la règle refuse | code **ou** serveur **ou** test |
| Non vérifié | aucune règle ni test ne permet de conclure | — |

Règle d'or : **« Masqué » n'implique jamais « Refusé »**. Le panneau affiche les deux colonnes séparément : *ce que l'interface montre* et *ce que les règles permettent*.

Niveaux : `observation` (rendu) < `code` (matrice lue) < `serveur` (réponse réelle de l'API pour l'identité de test) < `test` (parcours exécuté et vérifié).

### M4 · Règles d'accès (source unique)
`lib/permissions.mjs` : matrice explicite rôle × ressource × action, utilisée par le serveur (refuser), l'interface (montrer/masquer) et SynchroView (afficher). Un test par case. Matrice proposée dans `SYNCHROVIEW.md §7.3`, **à valider**.

### M5 · Identités de test
- Comptes de test par profil, dans un **espace de test** avec des données fictives, **uniquement en preview**.
- Les vues ne lisent plus votre mémoire personnelle mais le jeu de données de l'identité (`fixture`).
- Contrainte technique : quatre cadres du **même domaine partagent les mêmes cookies** → impossible d'avoir quatre sessions différentes dans une seule page de navigateur. Options : un sous-domaine de preview par identité, ou un jeton de test signé, limité à la preview et aux comptes de test, ou l'exécuteur de parcours (M6), qui ouvre un contexte navigateur séparé par identité.

### M6 · Parcours (préparés pour un agent)
Format :
```json
{ "id": "rsvp-invite", "profil": "guest", "depart": "/@lea-et-marc/invite",
  "etapes": [ {"faire": "cliquer", "cible": "bloc:rsvp>button:0"},
              {"attendre": "texte", "cible": "bloc:rsvp", "contient": "Merci"} ],
  "destination": "/@lea-et-marc/invite#merci",
  "reussite": [ {"serveur": "GET /api/spaces/:id/rsvp/me", "attendu": {"status": "oui"}} ],
  "autoriser": [], "resultats": [] }
```
- Exécuté par un navigateur automatisé, un contexte par identité, sur la preview de test.
- **Réussi seulement si les conditions sont vérifiées** (dont au moins une côté serveur quand une donnée est en jeu).
- Toute étape qui modifie, publie, paie ou supprime exige `autoriser` explicite, et n'est jamais jouée en production.
- Résultats (statut, captures, durées, preuves) relus dans SynchroView ; plus tard, AIME ORB montre le trajet de l'agent d'écran en écran.

### M7 · Adaptateurs
- **AIME** : pont + repères + `svPerm` + identités de test.
- **Générique** : le pont en une ligne de script pour toute application autorisée.
- **Sites externes** : pas de cadre (souvent interdit par le site, et on ne contourne pas) → exploration par navigateur automatisé, captures et instantanés, sur une liste de sites autorisés.

## 6. Risques

### Performance
- Chaque vue fait tourner toute la page (canvas, animations). 4 vues ≈ surcoût faible mesuré, mais 8 vues ou plus ne tiendront pas. Parade : le pont met en pause les animations des vues non visibles ou en miniature ; au-delà de 4, miniatures en capture fixe.
- Changer de format recharge les vues (choix volontaire pour un vrai rendu) : 2 à 3 s.

### Sécurité
- **Le site peut aujourd'hui être affiché dans un cadre par n'importe quel autre site** (aucun en-tête `X-Frame-Options` ni `frame-ancestors` en production) [mesuré].
- **Le pont du prototype répond à n'importe quel parent et envoie avec `'*'`.** Sur la branche seulement ; mais s'il était fusionné tel quel, un site tiers pourrait encadrer AIME et lire les textes d'une page via `find`. Corrections obligatoires avant toute fusion : pont actif seulement avec `?apercu` **et** parent dans une liste d'origines autorisées ; envois vers l'origine exacte ; en-tête `Content-Security-Policy: frame-ancestors 'self'` (et domaines SynchroView autorisés).
- Données privées : les vues lisent la mémoire du visiteur (voir §3) → identités de test et jeux fictifs (M5) avant toute comparaison multi-utilisateurs.
- Aucune action à effet (publier, payer, supprimer, envoyer) n'est déclenchée par SynchroView ; l'inspection est en lecture seule.

### Régression
- `/tout/` n'est pas touché ; SynchroView est une page séparée.
- Changements dans `index.html` sur la branche : 3 ajouts (repères, script du pont, `data-sv-id` sur les blocs, `data-sv-skip` sur les outils d'édition). Hors cadre, le pont ne fait rien.
- La formule des repères de la Naissance est recopiée : si les chapitres changent, la synchronisation se décale → la Naissance doit publier ses propres repères (M2).

## 7. Plan progressif (branche `synchroview`, une validation à chaque étape)

| Étape | Contenu | Critère d'acceptation |
|---|---|---|
| **0 · fait** | Pont, sections, Liée/Libre, Focus, Inspecter (observation) | Testé ; `/tout/` inchangé |
| **1 · Durcissement — fait** | Pont restreint (origines, `?apercu`), `frame-ancestors`, statuts + niveaux de preuve dans l'inspecteur, deux colonnes « interface » / « règles », compositions nommées, focus animé + verrou des secondaires, pause des animations des miniatures | Aucun échange accepté depuis une origine non listée (test) ; fluidité égale à `/tout/` à 4 vues |
| **2 · Règles** | `lib/permissions.mjs` + un test par case, après **validation de la matrice et de la correspondance profils → rôles** | 100 % des cases testées ; l'inspecteur affiche « Autorisé / Refusé · code » |
| **3 · Serveur et identités** | Comptes et espace de test en preview, `/api/can` (évalue une action pour la session, sans l'exécuter), jeux de données fictifs par profil | « Autorisé / Refusé · serveur » ; aucune donnée réelle dans les vues de test |
| **4 · Parcours** | Format JSON, exécuteur (un contexte par identité), résultats relus dans SynchroView, garde-fous sur les actions à effet | Un parcours n'est « réussi » que si ses conditions serveur passent |
| **5 · Universel** | Vues configurables (profils, appareils, versions, environnements, sites autorisés), adaptateur générique, exploration de sites externes sans cadre | Comparer `main` et une preview de branche ; un site tiers autorisé exploré sans contournement |
| **6 · AIME ORB** | L'orbe montre le trajet de l'agent et propose Comparer / Capturer / Corriger | — |

Rien n'ira sur `main` sans votre validation explicite de l'étape correspondante.

## 8. Décisions qui vous reviennent
1. Correspondance profils → rôles (proposition : Moi = owner, Coordinateur = editor, Pro = contributor, Participant = guest ; place de `viewer` ?).
2. Contenu de la matrice (`SYNCHROVIEW.md §7.3`).
3. Méthode d'identités de test : sous-domaines de preview, jeton de test signé, ou exécuteur seul.
4. Ordre : commencer par l'étape 1 (durcissement), recommandée avant tout le reste.

## 9. Étape 1 · réalisée (branche `synchroview`)

| Point | Fait | Vérification |
|---|---|---|
| Pont restreint | Actif seulement avec `?apercu` et si la page parente est le même site, `lemondeaime.com`, `ai-x-me.com` ou une preview de ce projet. Envois vers l'origine exacte, messages refusés d'une autre origine. | Page d'une autre origine qui encadre AIME et lui écrit : **0 réponse** [mesuré] |
| Encadrement interdit aux autres sites | `vercel.json` : `Content-Security-Policy: frame-ancestors 'self' https://www.lemondeaime.com https://lemondeaime.com https://ai-x-me.com https://www.ai-x-me.com` | À vérifier sur la preview (en-tête servi par Vercel) |
| Inspection en lecture seule | En mode Inspecter, la page encadrée ne reçoit plus aucun clic, appui ni touche : aucune sélection, aucune action déclenchée. | Clic sur « Oui » de la réponse : rien n'est envoyé ni sélectionné [mesuré] |
| Statuts et preuves | Colonne **Interface** (Absent · Masqué · Désactivé · Visible, preuve « observation ») et colonne **Règles** (Autorisé · Refusé · Non vérifié, avec la preuve code / serveur / test). Chaque action a les deux statuts. « Masqué » n'est jamais converti en « Refusé ». | Bouton de réponse : Moi et Participant « Visible · Non vérifié », Pro et Coordinateur « Absent » [mesuré] |
| Compositions | Toute la composition est dans l'adresse (axe, format, mode, section, vues libres `lk`, focus `fx`, miniatures figées `fz`, manipulation `act`) ; « Compositions » enregistre des noms dans ce navigateur. | Enregistrer puis rouvrir : focus et miniatures figées restaurés [mesuré] |
| Focus | Transition animée (View Transitions quand le navigateur la propose, sinon instantané ; rien si « réduire les animations »). « Miniatures suivent / figées » : figées = plus de défilement ni d'animation (pause de `requestAnimationFrame`, des animations CSS et des vidéos), reprise exacte à la sortie. | Miniature figée : 0 image calculée en 0,5 s [mesuré] ; Échap → grille, liens d'origine rétablis |
| Fluidité | `/tout/` et `/synchroview/` au même rythme dans le même navigateur de test. | 4 et 4 images/s (navigateur sans carte graphique : valeurs relatives) [mesuré] |
| Non-régression | `/tout/` : aucune ligne modifiée (`git diff main -- tout/` vide). | [mesuré] |

## 10. Étape 2 · règles d'accès vérifiées côté serveur (branche `synchroview`)

Validé par vous : Moi = owner, Coordinateur = editor, Pro = contributor, Participant = guest ; Lecture seule = viewer, cinquième profil disponible dans le sélecteur de chaque vue (aucune fenêtre ajoutée).

### Ce qui est en place
| Fichier | Rôle |
|---|---|
| `synchroview/permissions.js` | Les règles, une seule source, utilisée par le serveur et par l'interface. Refus par défaut (action inconnue, rôle inconnu, erreur). |
| `synchroview/profiles.js` | Les profils : un nom + une identité de test. **Aucun rôle** : profils et rôles sont configurables séparément. |
| `api/_sv/core.js` | Identités de test et ressources **fictives**, gardées côté serveur. Le rôle vient de l'appartenance à l'espace, jamais de la requête. Désactivé en production (404). |
| `api/sv/check` | Évalue, côté serveur, ce qu'une identité peut faire sur chaque élément. |
| `api/sv/act` | Revérifie l'action au moment du clic : 403 si refusée, sinon effet simulé (rien n'est enregistré) et seulement les données que la règle permet. |
| `api/sv/tx` | Autorisation propre à **une** transaction (paiement), signée, liée à la personne, au paiement et au montant, valable 60 s. |
| `synchroview/demo/` | La page de démonstration : un même document, un même événement, une même action, des données personnelles, les membres et l'espace. Les boutons suivent la réponse du serveur ; « Montrer aussi les boutons masqués » permet de vérifier que le serveur refuse quand même. |
| `tests/permissions.test.cjs` | 147 tests : chaque case de la matrice pour les 5 rôles, et les cas de paiement. |
| `tests/sv-api.test.cjs` | 17 tests côté serveur : rôle envoyé par le navigateur ignoré, identité inconnue, production fermée, document non autorisé sans contenu, données d'un autre participant, paiement sans autorisation, autorisation réutilisée par une autre personne, autorisation falsifiée, suppression de l'espace. |

### Les six corrections, et où elles sont appliquées
1. **Documents** : lecture seulement pour l'auteur et les personnes **explicitement** autorisées sur ce document — même le propriétaire et la coordination n'y accèdent pas sans autorisation. Partage : l'auteur, ou le propriétaire s'il est lui-même autorisé.
2. **Contributeurs** : modifient seulement les moments qui leur sont attribués ou qu'ils ont créés ; suppriment seulement les leurs ; documents : les leurs.
3. **Données personnelles** : chacun voit et modifie les siennes ; seule l'organisation (propriétaire, coordination) lit celles des autres ; prestataires et lecteurs n'ont qu'un résumé sans noms ; un invité ne voit que ses propres réponses.
4. **Paiements** : il faut le bon rôle **et** une autorisation propre à la transaction (demandée, confirmée, signée par le serveur, 60 s, liée à la personne, au paiement et au montant).
5. **Membres et invitations** : le propriétaire invite tout rôle sauf propriétaire et change les rôles ; la coordination n'invite que des lecteurs ou des invités ; les autres, rien.
6. **Supprimer l'espace** : propriétaire seul.

### Résultat de la démonstration (mesuré, navigateur automatisé, serveur local identique aux fonctions Vercel)
| | Moi (owner) | Pro (contributor) | Participant (guest) | Coordinateur (editor) | Lecture seule (viewer) |
|---|---|---|---|---|---|
| **Document** « Contrat » · ouvrir | Autorisé (autorisation explicite) | Autorisé (auteur) | Refusé | Refusé (pas d'autorisation explicite) | Refusé |
| **Événement** « Séance photo » · modifier | Autorisé | Autorisé (attribué) | Refusé | Autorisé | Refusé |
| **Action** « Payer 360 € » | Autorisé après confirmation de la transaction → 200, effet simulé | Refusé | Refusé (403 même bouton forcé) | Refusé | Refusé |
| Réponse de Nina | Autorisé | Refusé | Refusé (403) | Autorisé | Refusé |
| Supprimer l'espace | Autorisé (simulé) | Refusé | Refusé (403 même bouton forcé) | Refusé | Refusé |

Dans SynchroView (Inspecter), chaque cas affiche **Interface** (Visible / Masqué, preuve « observation ») et **Règles** (Autorisé / Refusé, preuve « serveur », ou « test » une fois le clic exécuté), et signale seulement les vraies incohérences : un bouton affiché alors que le serveur refuse, ou masqué alors qu'il autorise.

### Limites assumées de cette étape
- Les identités sont des **identités de test fictives** choisies par le profil de la vue ; il n'y a pas encore de connexion. Le serveur ne fait confiance qu'à son propre tableau d'appartenance, mais n'importe qui peut demander « en tant que » une identité de test : c'est acceptable pour des données fictives sur une preview, **pas pour de vraies données** → étape 3 (vrais comptes de test, sessions).
- Autorisation de transaction : signée avec `SV_DEMO_SECRET` s'il existe, sinon avec une valeur de démonstration ; pas de mémoire d'usage unique (fonctions sans état). L'étape 3 ajoutera un vrai secret et un usage unique en base.
- Les fonctions répondent 404 en production : rien de cela n'est exposé sur lemondeaime.com.

## 11. Vérifications avant l'étape 3 (20 octobre 2026)

### Tests réellement exécutés
`npm test` (= `node --test tests/*.test.cjs`) sur la branche `synchroview` : **165 tests, 165 réussis, 0 échec, 0 ignoré.**

| Fichier | Tests |
|---|---|
| `tests/permissions.test.cjs` | 147 (27 situations × 5 rôles = 135, + 12 cas de paiement et de rôle) |
| `tests/sv-api.test.cjs` | 17 (fonctions serveur) |
| `tests/health.test.cjs` | 1 (sonde existante, antérieure à SynchroView) |
| **Total** | **165** |

Correction : le message du commit de l'étape 2 disait « 164 tests » : c'est le total SynchroView (147 + 17) ; 165 inclut la sonde `health`.

### Preview Vercel (vérifiée dans le navigateur, session Vercel du propriétaire)
En-têtes : `Content-Security-Policy: frame-ancestors 'self' https://www.lemondeaime.com https://lemondeaime.com https://ai-x-me.com https://www.ai-x-me.com` présent sur `/`, `/tout/`, `/synchroview/`, `/synchroview/demo/`, `/synchroview/bridge.js`. Pas de `X-Frame-Options` (inutile avec `frame-ancestors`). Réponses des fonctions : `Cache-Control: no-store`.

| Vérification sur la preview | Attendu | Obtenu |
|---|---|---|
| Rôle envoyé par le navigateur (`role: owner` pour Lucie) | ignoré | 200, rôle `guest`, supprimer l'espace refusé |
| Identité de test inconnue | 403 | 403 |
| Méthode GET | 405 | 405 |
| Coordination ouvre le contrat | 403 sans contenu | 403, aucun contenu |
| Propriétaire ouvre le contrat | 200 avec contenu | 200, contenu |
| Lucie lit la réponse de Nina | 403 | 403 |
| Payer sans autorisation de transaction | 403 + autorisation requise | 403, `needsTx` |
| Autorisation de transaction demandée par le propriétaire | 200 | 200 |
| Même autorisation réutilisée par la coordination | 403 | 403 |
| Autorisation falsifiée | 403 | 403 |
| Paiement du propriétaire avec autorisation | 200 simulé | 200, « simulé : rien n'est enregistré » |
| Autorisation demandée par la coordination | 403 | 403 |
| Coordination supprime l'espace | 403 | 403 |
| Studio Lumen modifie la séance attribuée / Paul la modifie | 200 / 403 | 200 / 403 |
| SynchroView sur la démo : 4 vues, rôles reçus du serveur | owner, contributor, guest, editor | idem, 16 décisions par vue |

Non vérifié sur la preview : le refus d'encadrement par un site tiers (il faudrait un autre domaine) ; vérifié en local, et l'en-tête est bien servi.

### Cloisonnement
- Identités, ressources et permissions fictives : uniquement dans `api/_sv/`, `api/sv/`, `synchroview/demo/`, `synchroview/permissions.js`, `synchroview/profiles.js` et les tests. Aucune référence dans le site (`index.html`) ni dans `/tout/` (vérifié par recherche).
- Les fonctions `api/sv/*` répondent 404 en production.
- **Cartes d'usage** (Moi, Pro, Participant, Coordinateur, Lecture seule) ≠ **rôles techniques** (owner, editor, contributor, viewer, guest) : une carte ne désigne qu'une identité ; le rôle est attribué côté serveur. Dans le site, les cartes ne changent que le contenu ; aucun rôle technique n'y apparaît.
- Aucun paiement réel : le seul « paiement » est un effet simulé de la démonstration, sans prestataire de paiement ni donnée bancaire.

## 12. Bilan : ce qu'un utilisateur extérieur peut utiliser aujourd'hui, ce qui manque pour un produit autonome

### Utilisable aujourd'hui par quelqu'un d'extérieur
| Quoi | Où | Limites |
|---|---|---|
| **Tout voir** : la page AIME en 4 cartes côte à côte, défilement synchronisé, ordinateur / mobile, index des sections, « copier la position » | `lemondeaime.com/tout/` (public) | Une seule page (le site AIME), 4 cartes fixes, synchronisation au pourcentage, pas de lien partageable |

C'est tout : **SynchroView n'est pas encore accessible de l'extérieur**, la preview demande une connexion Vercel au compte du propriétaire.

### Disponible dans SynchroView (branche, accès propriétaire)
Synchronisation par sections · vues liées ou libres · 4 cartes ou 4 formats (iPhone, iPad, ordinateur, écran large) · focus et miniatures figées · compositions enregistrées et lien partageable · inspection (interface observée / règles vérifiées par le serveur) · démonstration des droits.

### Ce qui manque pour un produit autonome
| # | Manque | Pourquoi c'est bloquant |
|---|---|---|
| 1 | **Vues libres** : composer n'importe quelle grille (adresse × carte × format × version), pas seulement « 4 cartes » ou « 4 formats » | C'est la promesse de base : comparer librement |
| 2 | **Comparer des versions** : production contre preview d'une branche, avant contre après | Il faut autoriser l'hôte SynchroView dans le pont et dans `frame-ancestors` de chaque version |
| 3 | **Ouvrir à d'autres applications** : pont installable en une ligne, avec la liste d'origines choisie par l'application (aujourd'hui figée sur les domaines AIME) | Sans pont, aucune synchronisation par sections ni inspection |
| 4 | **Sites sans pont** (externes) : rendu par un navigateur automatisé (captures, sections détectées), jamais en contournant leurs protections | La plupart des sites interdisent l'encadrement |
| 5 | **Parcours** : rejouer une même suite d'actions dans toutes les vues, puis l'agent (plus tard) | Annoncé dans le brief, pas commencé |
| 6 | **Vraies identités de test** (étape 3) : comptes, sessions, une session par vue | Aujourd'hui, identités fictives choisies par la carte |
| 7 | **Accès et partage** : domaine propre, comptes, projets, liens partagés, compositions côté serveur | Aujourd'hui, compositions dans un seul navigateur, accès réservé au propriétaire |
| 8 | **Inspection robuste pour toute application** : retrouver un élément sans `data-sv-id` (rôle, nom, structure), comparaison visuelle en image | Aujourd'hui fiable surtout sur les pages AIME balisées |
| 9 | **Au-delà de 4 vues et sur téléphone** : miniatures en image, index des sections sur mobile | Fluidité et lisibilité |
| 10 | **Cadre produit** : accueil, aide, conditions d'utilisation, données personnelles | Pour un utilisateur qui ne connaît pas AIME |

### Ordre proposé pour revenir à la valeur principale (comparer librement)
1. Vues libres et grille mixte (n° 1), sur les pages AIME.
2. Comparer des versions d'AIME : production et preview (n° 2).
3. Parcours rejoués en même temps dans toutes les vues, sans agent (n° 5).
4. Ouverture à d'autres applications avec le pont configurable (n° 3), puis accès extérieur (n° 7).
L'étape 3 (vraies identités) peut avancer en parallèle, elle ne bloque pas 1 à 3.

## 13. Vues libres (branche `synchroview`)

### Le moteur supportait-il un nombre variable de vues ?
Oui pour l'essentiel : la grille (choix automatique du nombre de colonnes), la mise à l'échelle, la ligne de temps par sections, le focus, l'inspection et les vues liées/libres travaillaient déjà sur une liste de vues de longueur quelconque. Seuls trois points étaient figés et ont été adaptés : la fabrication des vues (deux axes fixes « 4 modes » / « 4 formats »), l'adresse (paramètres par axe) et l'origine des messages (une seule origine pour toutes les vues).

### Ce qui change
- Chaque vue choisit **indépendamment** : page (le site, la démo des droits), carte d'usage, format (iPhone, iPad, ordinateur, écran large) et version.
- **Dispositions 1, 2, 4, 6** (boutons), **+** pour ajouter une vue (jusqu'à 6), **×** pour en retirer une, **← →** pour réordonner. Le réordonnancement change l'ordre d'affichage sans déplacer les cadres : rien n'est rechargé (vérifié).
- **Modèles** « 4 cartes » et « 4 formats » : reconstruisent les deux configurations d'avant à partir de la première vue.
- Par défaut : les quatre cartes en ordinateur, comme avant.
- **Versions** : seule « Cette version » est active. « Production » apparaît désactivée avec sa raison : elle n'a pas encore le pont et n'autorise pas l'encadrement par SynchroView. Chaque vue a sa propre origine ; les messages ne sont acceptés que de l'origine de la vue qui les envoie, et envoyés vers elle seule.
- **Vues identiques** : chaque vue est reconnue par son propre cadre, pas par sa configuration ; les noms se distinguent automatiquement (« Moi · Ordinateur », « Moi · Ordinateur (2) »).
- **Adresse** : `v=page.carte.format.version,…`. Les anciennes adresses (`axis`, `format`, `mode`, `pf`, `src`, `lk`, `fx`, `fz`, `at`, `act`) restent lues et donnent les mêmes vues ; les compositions déjà enregistrées s'ouvrent comme avant.

### Tests (navigateur automatisé, serveur local identique aux fonctions Vercel)
| Test | Résultat |
|---|---|
| Défaut | 4 vues Moi, Pro, Participant, Coordinateur, 2 × 2, adresse sans `v` |
| Anciennes adresses : `axis=formats&mode=pro` · `pf=moi,pro&format=ipad` · `src=/synchroview/demo/&pf=moi,viewer` · `lk=1000&fx=0&fz=1` | 4 formats en Pro · 2 vues iPad · démo Moi + Lecture seule · focus sur Moi, 3 miniatures figées : identique à avant |
| Dispositions 1, 2, 4, 6 | 1 × 1, 2 × 1, 2 × 2, 3 × 2 ; aucun débordement horizontal |
| Réglages par vue (page, carte, format) | appliqués à la seule vue modifiée ; Lecture seule proposée seulement sur la démo |
| Trois vues identiques (Moi, Ordinateur) + une autre | noms distincts ; même section « Votre cube » : haut de section à −4 px dans les 4 vues ; l'inspecteur retrouve l'élément dans les 4 |
| Réordonner | ordre changé, cadre non rechargé, synchronisation intacte (−4 px partout) |
| Retirer / ajouter | 4 → 3 → 4 vues |
| Focus à 6 vues | 1 grande + 5 miniatures, figées ; Échap → grille 3 × 2, aucune vue restée figée ni libre |
| Composition « Six vues mixtes » enregistrée puis rouverte | identique |
| Fluidité (même défilement scripté) | `/tout/` 4 · SynchroView 1 vue 6 · 4 vues 4 · 6 vues 4 images/s (navigateur sans carte graphique : valeurs relatives ; 6 vues ne ralentissent pas plus que 4) |
| Responsive, 6 vues mixtes | 390 px : pas de débordement, vues de 173 px · 820 px : 388 px · 1280 px : 333 px |
| `/tout/` | inchangé (`git diff main -- tout/` vide) |

### Limites
- Une seule version comparable aujourd'hui (celle de la preview). Comparer la production ou une autre branche demandera le pont et une autorisation d'encadrement de ces versions (étape suivante possible, à valider).
- Sur téléphone, 6 vues sont minuscules et les réglages de chaque vue sont serrés : l'usage visé reste l'ordinateur ou la tablette.
- Les pages disponibles sont la landing AIME et la démo des droits ; d'autres pages s'ajoutent par la liste `PAGES` à condition d'avoir le pont.
- Les valeurs de fluidité viennent d'un navigateur sans carte graphique : elles servent à comparer, pas à mesurer.
