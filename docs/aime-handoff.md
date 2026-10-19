# AIME : passation du module Planning

*État au commit de ce document : racine `index.html` = AIME v72 (artifact v72). La racine est gelée à partir d'ici, sauf correctif urgent.*
*Source unique : `index.html` est généré à partir de l'artifact (`jourj.html`) en ajoutant l'en-tête HTML (doctype, charset, viewport). Le code est identique dans les deux.*

---

## 1. Les données

### 1.1 Stockage dans le navigateur (localStorage)

| Clé | Contenu | Remarques |
|---|---|---|
| `jourj-plan-v5` | L'événement **démo** (objet `S`, voir 1.2), en JSON | Clé `LS` en mode démo. Repli en lecture sur l'ancienne `jourj-plan-v4` (migrée par `migrate4`). |
| `jourj-plan-v4` | Ancien format v4 | Lecture seule, convertie au chargement. Peut être abandonnée. |
| `aime-app` | Index des vrais événements : `{cur, events:[{id, names, date, city, type, role, guests, budget, created, src?, sk?, venue?, time?, contact?}]}` | `role` = rôle **fixé à la création** (`couple` le plus souvent). `sk` = identifiant du projet Studio (dédoublonnage du pont). |
| `aime-app-ev-<id>` | Un vrai événement (même forme que `S`) | Clé `LS` quand `APP=true`. Jamais envoyée à la base partagée. |
| `aime-mode` | `'app'` ou `'demo'` | Mode de la dernière visite. |
| `jourj-persona` | Clé de la persona affichée en démo (`couple`, `music`, `invite`…) | Démo uniquement. En app, le rôle vient de `aime-app.events[].role`. |
| `jourj-visitor` | `{k:'invite'|'pro', id}` : identité d'un visiteur arrivé par `#invite=<id>` ou `#pro=<dom>` | Sert à ne pas redemander « Qui êtes-vous ? ». |
| `aime-ma-carte` | La carte de l'utilisateur (`WALLET`), voir 1.3 | Copiée aussi dans `S.prefs.myCard`. |
| `aime-land-vu` | Drapeau « landing déjà vue » | |
| `aime-landbg` | Ancien cache des fonds de la landing | Remplacé par le document partagé `site/landing`. |

### 1.2 L'objet événement `S` (version 5)

```
S = {
  v:5, v6:true, type:'mariage'|'seminaire',
  base:{ names, date:'AAAA-MM-JJ', city, lat, lon, cer:'civile'|'laique'|'religieuse'|…, target (budget €), perTable, venueEnd (minutes), venue?, time?, contact? },
  prefs:{ cascade, rain, bgs:{}, myCard, cards, pendCards:{[code]:{id,code,n,roles,status,minor,ev,at}}, shift (retard total en min), landBg },
  groups:[{ id, n, est (prévus), kids, yes, no }],                       // estimations par groupe
  people:[{ id, n, g (id groupe), rsvp:'oui'|'non'|'attente', kid, regime, addr, table (nom), lodge (id hébergement), here? (horodatage d'arrivée) }],
  vendors:[{ id, n, role (voir KNOWN_ROLES), st (0..4, voir STATUS), price:{k,r}, dues:[{l,a,o,paid,req?}], docs, contact, note }],
  costs:[{ id, l, price:{k,r}, dues }],
  steps:[{ id, t, o (jours, négatif = avant), c (catégorie), vr (rôle prestataire lié), cer (cérémonie concernée), ax (tâche automatique), done, note }],
  entries:[{ id:'m<i>', m (minutes depuis T0), g, title, desc, prep:[{t,done}], who:[rôles], stats:[{l,k,r}], pres:{k,r}, on, pub (visible des invités),
             out (extérieur), planB, planBPrep, tag, after:[ids], media, cer:[…]|null }],
  tables:[{ n, cap, blocks:[{g,c}], note }] | null,                      // null = recalculé par autoSeat()
  rules:[{ a, b, type:'apart'|'together' }],
  lodging:[{ id, n, dist, rooms, onsite }], shuttles:[{ id, t, from, to, seats }],
  gifts:[{ id, pid, de, quoi, merci }],
  afterTasks:[{ id, t, o (jours après), ax, done, note }],
  spaces:{ [domaine]:{ items:[…] } }, music:{ tracks:[{ id, t, a, mo (id moment), st:'prop'|'ok'|'ban', by, votes }] },
  locks:{}, capsule:{ msgs:[{ n, t, at }] }
}
```

- **Prix** `price.k` : `v` = montant fixe, `g` = par invité, `k` = par enfant, `t` = par table. `r` est le tarif.
- **Échéances** `dues[].o` : décalage en **jours** par rapport à la date (négatif = avant). Si `a` vaut `null`, c'est le solde (total moins les acomptes).
- **Statuts prestataire** (`STATUS`) : 0 À contacter · 1 Devis reçu · 2 Réservé · 3 Acompte versé · 4 Soldé. Réservé veut dire `st >= 2`.
- **Rôles prestataires** (`KNOWN_ROLES`) : Intervenant, Technique, Lieu, Traiteur, Photographe, Vidéaste, DJ, Musiciens, Fleuriste, Pâtissier, Bar, Loueur, Coiffure, Maquillage, Tenues, Papeterie, Animation, Chauffeur, Officiant, Coordination. Les autres valeurs de `who` (Couple, Invités, Témoins, Cortège…) désignent des personnes, pas des prestataires.
- **Minutes du jour** : `m` est compté depuis `T0`. On l'affiche avec `hhmm(m)`. Les moments après minuit restent à la suite (`toM('03:00',1)`).

### 1.3 La carte universelle

```
card = { id, code:'AIME-XXXXXXX' (cardCode(id) = fnv), n, roles:[{dom,label}], city, line, bio, tags, contact, media, pro, guest, used,
         vis:{ level:'private'|'event'|'public', mods }, status:'pending'|'claimed', minor, docs:[{k,fmt,l,d}], checkins:[…≤200],
         avis:[{ at, rating, note, verified, by }], aliases:[codes], accord? ('Nom, date' pour la page en mémoire) }
```

### 1.4 Documents partagés (base de l'artifact Claude, mode démo uniquement)

- `plan/journee-v5` : `{json, updated}`, l'événement démo partagé entre visiteurs. Repli en lecture sur `plan/journee-v4`.
- `site/landing` : les fonds photo et vidéo de la landing (`{bg:{clé:{id,…}}}`, médias en `/_blob/<id>`).
- **En mode app, rien n'est écrit dans la base partagée** (`save()` ne fait que du localStorage). C'est ce que Supabase doit remplacer.

---

## 2. Les écrans et ce qu'ils doivent continuer à faire

### 2.1 Entrée (`#land`)
- **Mosaïque des domaines (`#ld-atlas`)** : MARIAGE ouvre la timeline Mariage. Les autres cases ouvrent `/studio/#atlas-<id>`. *Remplacée par la coque commune.*
- **Timeline MARIAGE (`#atlM`)** : Avant (étapes de `allSteps()` avec `o<0`, grand « J-xx »), Le jour J (moments `ACT`, grand « hh:mm »), Après (`afterTasks`, « J+xx », puis « 1 an » pour la capsule). Un clic ouvre l'app sur le bon onglet ; pour le jour J, la frise se place sur le moment. *C'est la vue « Planning » du futur projet.*
- **Sections de présentation** (carte, inédits, accessibilité, pros, moments de vie, confiance) : contenu marketing, à reprendre ou à abandonner selon la coque.
- **Fenêtres** (`#ldMk`) : création de carte (3 étapes), création d'événement (3 étapes : type et prénoms, date et ville, invités et budget), **carte à réclamer**, **capsule**, retour Studio.

### 2.2 L'app (onglets `SECS`, une persona = une liste d'onglets)
| Onglet | Rôle |
|---|---|
| Maintenant (`now`) | % prêt (étapes, prestataires, réponses, placés), fil « à faire maintenant » (retards, réponses, prestataires manquants), carte « Poste de pilotage » de J-2 à J+1. |
| Invités (`guests`) | Groupes (prévus / oui / non / enfants), noms, lien d'invitation `#invite=<id>`, import de liste, hébergement et navettes. |
| Prestataires (`vendors`) | Liste et statut, contact, échéances, espace du prestataire, lien `#pro=<dom>`. Rôles manquants signalés. |
| Budget (`budget`) | Total calculé (prix × invités, enfants ou tables), versé et restant, objectif. |
| Avant (`before`) | Rétroplanning par période, tâches automatiques (`AX`), paiements intégrés. |
| Tables (`seating`) | Plan auto (`autoSeat`) avec règles ensemble / séparés, glisser-déposer. |
| Musique (`music`) | Titres par moment, propositions des invités, vue DJ. |
| Jour J (`day`) | Frise minute par minute, panneau du moment, conflits (sommeil, heure dorée…), plan pluie, mode direct (décalage). |
| Merci (`after`) | Cadeaux et remerciements, capsule temporelle, tâches d'après. |
| Vues persona | `space` (Mon espace prestataire), `act` (Mon activité, dates et acomptes), `pay`, `rsvp` (Ma réponse), `prog` (Programme). |

### 2.3 Transverses
- **Fiches** (`openSheet(tab,id)`) : base, group, person, import, lodging, vendor, cost, step, atask, gift, table, music, moment, set, exp, echos. Sur ordinateur (≥ 1100 px), elles s'ouvrent en **volet de droite** ; en dessous, elles montent du bas.
- **Poste de pilotage** (`#cockpit`) : frise en direct, moment choisi (qui, musique, table, à prévoir), accueil des invités (pointage `here`), prestataires du jour, alertes, supports, « Décaler la suite ». Vue « Ma journée » filtrée pour un prestataire (sans statuts ni devis des autres).
- **Registre et carte** (`#reg`, `#book`, `#join`) : annuaire des cartes, vue carte (visibilité, avis vérifiés, portefeuille, accord des proches).
- **Assistant** (`#aiB`) : fonctionne sans IA externe, par règles (`aiRoute`).

### 2.4 Adresses (ancres) gérées
`#accueil`, `#carte`, `#AIME-XXXXXXX` (ouvre la carte, ou la page « carte à réclamer »), `#rsvp` ou `#rsvp-<slug>-<date>` (écran invité, avec l'encadré « Infos à jour »), `#capsule-<slug>-<date>` (et l'ancienne forme fondée sur la clé d'événement), `#aimenew.<b64url>` ou `#aime-new=` (création depuis le Studio), `#echos=` (retour du Studio), `#invite=<id>`, `#pro=<dom>`. Toutes sont relues sur `hashchange`.

---

## 3. Les règles métier

1. **Rôles.** Le rôle est fixé à la création de l'événement : `couple` (les mariés) ou `organisateur` pour un séminaire. En app, on ne change pas de rôle. Les autres rôles passent par des liens : `#pro=<dom>` pour un prestataire, `#invite=<id>` pour un invité. Une carte de mineur est toujours privée.
2. **Propagation.** Tout se dérive de `S` (une seule source). Un invité ajouté met à jour les couverts, le traiteur (`price.k='g'`), les tables, les navettes et le % prêt. Après chaque modification, `commit()` enregistre puis recalcule tout.
3. **Tâches.**
   - Les étapes ont un décalage `o` en jours. À la création, une étape déjà dépassée est **reportée** et non marquée faite, sauf « Fixer la date », qui est faite d'office.
   - Les tâches `ax` se cochent seules selon une règle (`AX[ax].ok()`). Exemples : réponses toutes reçues, plan de table sans conflit, navettes suffisantes, merci envoyés.
   - Une étape qui porte un `vr` (rôle) se coche quand un prestataire de ce rôle passe en Réservé.
   - Les paiements (`dues`) sont intégrés au rétroplanning par `allSteps()`.
4. **Jour J.**
   - `ACT` = les moments actifs (`on`) compatibles avec la cérémonie choisie (`cerOk`).
   - Les conflits sont calculés (`CONF`). « Décaler la suite » décale tous les moments à partir de maintenant et ajoute la valeur à `prefs.shift`. Hors du jour J, une confirmation est demandée.
   - Libellés reconnus par le Studio : Accueil, Cérémonie (prioritaire sur Mairie), Vin d'honneur, Dîner, Premier bal, La soirée.
5. **Invités et réponses.**
   - `gStats(g)` combine les noms saisis et les estimations du groupe : attendus = max(nommés, prévus) − non.
   - Une réponse arrive par le lien `#invite=<id>`.
   - Les régimes viennent de `people[].regime` (texte libre, « Allergie : … »).
6. **Capsule.** Les messages sont scellés jusqu'à **date + 1 an** (`capOpenDate`). Personne ne les lit avant, pas même les mariés. Après cette date, la liste s'affiche.
7. **Confidentialité.**
   - Ce qui part vers le Studio : noms des invités et tables (marque-places), équipe, planning, la carte (sous-ensemble, sans contacts d'invités).
   - Une carte de mineur est toujours privée.
   - La vue d'un prestataire ne montre ni la liste des invités ni les statuts et devis des autres.

---

## 4. Les pièges connus

1. **Pointeurs.** `body.app #phoneWrap *{pointer-events:auto}` rendait le voile `#scrim` actif et bloquait le défilement. La règle est corrigée en `body.app #phone{pointer-events:auto}`. Ne jamais forcer `pointer-events` sur tous les descendants.
2. **Gestionnaire d'actions.** Un gestionnaire en phase de capture sur `#screen` intercepte les `data-act`. Toute nouvelle action doit être déclarée dans `ACTS`, ou utiliser un autre attribut (`data-new`, `data-ck`, `data-cl`…).
3. **Ancres dans Claude.** Dans l'artifact, seules les ancres « simples » (lettres, chiffres, `. _ ~ -`) parviennent à la page. `#cle=valeur` ne passe pas. D'où `#aimenew.<b64url>` et les codes à copier-coller. Hors de Claude, `=` fonctionne. **Avec un seul site, ces ponts disparaissent.**
4. **Ordre d'initialisation.** Un bloc qui s'exécutait avant `const myCard` échouait sans bruit. Toujours appeler les fusions après l'initialisation (voir `mergeEchos` dans un `setTimeout`).
5. **Collisions de classes CSS.** Les classes de la landing étaient préfixées `ld-` parce que `.st`, `.qr` ou `.nm` existent déjà dans l'app. Même vigilance pour la coque : `atl-` est utilisé des deux côtés.
6. **Mode autonome.** `STANDALONE` = http(s), hors claude.ai, claudeusercontent.com, claude.site, claude.com et anthropic.com, et sans `window.claude`. Dans ce cas, `ART_URL` = racine et `ECHOS_URL` = `/studio/`. Le fichier autonome **doit** déclarer `<meta charset="utf-8">`, sinon les accents cassent une expression régulière et le script s'arrête.
7. **Données locales.** En app, tout reste sur l'appareil des mariés. Capsule, cartes à réclamer, pointages et avis ne circulent entre appareils que dans la démo (base partagée).
8. **Simulation.** Le jour J se simule (`liveSim`) hors date réelle. Ne pas décaler la frise sans confirmation.
9. **Migrations.** `adopt()` complète les champs manquants à partir de `defaults()`. `upgrade6()` ajoute les prestataires et étapes de la v6. Garder ces fonctions tant que d'anciens `jourj-plan-v5` existent chez des utilisateurs.
10. **Rendus du Studio sur la landing.** Ce sont des images figées (`sup/aime-studio-*.webp`). Dans la coque, les remplacer par les rendus vivants du Studio.

---

## 5. Ce que je relirai à chaque étape de la fusion (côté Planning)

- **Migration** : `jourj-plan-v5`, `aime-app` et `aime-app-ev-*` sont repris sans perte. Les champs de 1.2 sont tous présents, le rôle est conservé et la carte n'est pas dupliquée.
- **Propagation** : un invité ajouté met à jour couverts, tables, traiteur, budget, % prêt et les supports.
- **Rétroplanning** : décalages, tâches automatiques, paiements, report à la création.
- **Jour J** : frise, conflits, décalage et `shift`, poste de pilotage, vue prestataire.
- **Confidentialité** : visibilité de la carte, mineurs, vue prestataire.
- **Adresses** : les liens déjà diffusés (QR des marque-places `#AIME-…`, `#rsvp-…`, `#capsule-…`, `#invite=…`) doivent continuer à ouvrir le bon écran depuis `/v1/` ou la nouvelle racine.
