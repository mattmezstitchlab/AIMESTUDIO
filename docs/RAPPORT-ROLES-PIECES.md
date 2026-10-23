# Rapport pour l'agent du cœur : les pièces des autres projets, rangées par rôle

23/10/2026 · écrit par la session « accueil / audit des projets » à la demande de Matt, pour avis.
Documentation seule : aucun code modifié. **Merci de répondre point par point (section « Questions »), dans ce fichier ou dans la PR.**

## 1. Ce qu'on a compris de ta direction (validée par Matt)

- Un seul projet, un seul canevas source de vérité ; chaque studio et chaque app ne sont plus des outils séparés mais **ce qu'un rôle voit** de ce projet, montré en démonstration.
- Une couleur par rôle (prise dans l'orbe) : on peut montrer beaucoup, l'œil se repère et va à ce qui le concerne. La marque reste noire.
- La confiance devient le produit : chacun comprend ce que l'autre voit et ne voit pas. Cela règle le « j'étais perdu ».
- On avance par exemples (`vitrine/scenarios/`), un rôle à la fois, selon ce qui se dessine — `docs/QUI-VOIT-QUOI.md` (PR #75) est la référence.

## 2. Retour sur l'accueil en ligne (www.lemondeaime.com, vérifié le 23/10 à 20 h 50, Chromium, 1440 px et 390 px)

Ce qui marche : aucune erreur console, aucun débordement à 390 px, tous les liens répondent. Le premier écran (une phrase → un projet → sa page) est conservé et **relié** : avec « Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly », les quatre écrans affichent bien Chantilly.

À corriger, du plus important au moins important :

1. **« Voir les décisions rendues par le serveur »** (`/synchroview/demo/`) ouvre « Démonstrateur réservé… pas ouvert au public ». Pour un visiteur, c'est un lien qui ne mène à rien, et la phrase au-dessus (« les mêmes règles sont vérifiées par le serveur ») n'est pas vérifiable. Règle de Matt : jamais un bouton qui ne fait rien, pas de faux mécanisme de sécurité. Ouvrir une version publique en identités fictives, ou retirer le lien et dire « dans les exemples, les règles tournent dans votre navigateur ».
2. **La scène des écrans fait ~4 000 px de défilement** ; en y arrivant, quatre téléphones vides. Page totale > 13 000 px. Premier écran déjà composé, ou scène plus courte.
3. **Les fiches d'arrivée restent sur l'exemple** (« Domaine des Aulnes, 120 invités ») alors que les écrans suivent le projet du visiteur (Chantilly). Les faire suivre, ou les marquer « exemple ».
4. **Tout est mariage** : un visiteur qui écrit « séminaire » voit le cœur d'un mariage. Voir §4, la taxonomie peut choisir le scénario.
5. Les « cinq capacités » (PR #70) ont disparu de l'accueil : le cœur porte mieux le message, mais il n'y a plus de chemin vers les outils. Ta « Navigation : Accueil · Mon projet · Exemples · Lab » (lot 7) le résout sans doute.

## 3. Les pièces des autres projets, chacune devenue un rôle dans un exemple

Audit complet des 10 projets : document « AIME · Audit final des projets avant intégration ». Ici, seulement ce qui vaut la peine d'être repris, et **où ça se range dans ton modèle de rôles**.

| Pièce (projet d'origine) | Rôle qui agit | Ce que les autres rôles voient — ou pas | Exemple qui la montre |
| --- | --- | --- | --- |
| Consentement photo, jetons hachés, `domainRules` (Lumière Commune) | L'invitée décide si son visage peut paraître | Le photographe ne reçoit que les photos consenties ; le couple voit qui a refusé, sans les photos | Mariage — **la démonstration de confiance la plus forte** |
| Solveur de plan de table, testé (RELIA) | Le couple compose, la coordination ajuste | L'invitée voit **sa** table ; le traiteur voit couverts et régimes par table, sans les noms | Mariage, Séminaire |
| Billets, cartons, timbres : `composeFromBrief`, variantes, encres (ticketaime) + RSVP par jeton (byaime) | L'invitée reçoit son carton, qui est aussi sa clé d'arrivée | Couple : réponses nominatives ; prestataire : un total | Mariage, World |
| Jeton de transmission (aime-passport), **avec vérification du propriétaire** (absente à l'origine) | La coordination passe la main le jour J | Le rôle change de personne, le journal garde l'historique | Live / jour J |
| Liste de cadeaux, calendrier, `manifeste.json` (MINISITEWEDDING) | L'invitée participe | Le couple voit le total et les mots, pas le montant de chacun | Mariage |
| Moteur de broderie : OXS/SVG, import PDF, 504 symboles, tables CC BY (POINTZERO) | La brodeuse (prestataire) reçoit une commande de cadeau brodé | Elle voit motif et date de livraison, rien du mariage | Stitch (ton lot 5) |
| Sections typées et leur famille (Aime-Studio, déjà PR #71) | Le couple ou l'organisateur compose | Chaque section déclare ses rôles : qui la voit | Sites |
| Moteur du regard `eyeGestureEngine` (ColorCard) | Un enfant | Un écran à part, sans texte | Lab seulement, plus tard |
| Taxonomie AIMEEVENT (PR #72, ouverte, verte, sans conflit avec main) | Personne : elle **choisit le scénario** | celebrations → mariage, pro/formation → séminaire, festivals → world | Accueil |

À ne **jamais** reprendre : le « certificat infalsifiable » de ticketaime (faux mécanisme), ses reproductions de billets de la Banque de France, l'audio `.wav` de MINISITEWEDDING (titres commerciaux), le second système de comptes d'aime-passport, le faux témoignage de byaime.

À traiter hors code : les photos du magazine viennent de MINISITEWEDDING, sans licence ni EXIF, probablement générées — à déclarer comme telles ou remplacer (décision de Matt).

## 4. Garde-fous proposés

- Chaque studio montré par rôle porte « démonstration » tant que le serveur ne vérifie pas réellement les droits **pour ce cas**.
- La couleur ne porte jamais seule le sens : nom du rôle à côté de sa pastille (déjà le cas), contraste vérifié sur chaque couleur de héros.
- Une pièce n'entre que dans un exemple qui en a besoin, avec ses tests d'origine repassés ici (RELIA et POINTZERO en ont).
- Les rôles et droits restent dans `vitrine/acces` + `synchroview/permissions.js`, jamais dans une pièce importée.

## 5. Questions (merci d'y répondre)

1. Le consentement photo et le plan de table : d'accord pour qu'ils soient les deux premières pièces, dans l'exemple mariage ? Quel lot de `QUI-VOIT-QUOI.md` les accueille ?
2. Un nouveau rôle « traiteur » ou « photographe » distinct du « prestataire » générique : une perspective de plus, ou un même rôle avec des membres différents dans `vitrine/acces` ?
3. Le lien « décisions rendues par le serveur » : tu préfères une démo publique en identités fictives, ou le retirer de l'accueil pour l'instant ?
4. Brancher la taxonomie (PR #72) pour choisir le scénario d'après la phrase du visiteur : je le fais une fois #75 fusionnée, ou tu préfères t'en charger dans `coeur/` ?
5. Pour éviter de se marcher dessus : je ne touche ni `coeur/`, ni `vitrine/scenarios/`, ni la scène de l'accueil. Mes fichiers : `accueil/accueil.js` (premier écran), `projets/`. D'accord ?
