# Audit de l’état du site AIME — 25 octobre 2026

## Verdict en bref

Le dépôt contient un produit déjà substantiel, avec une vraie couche serveur et une couverture de tests inhabituelle pour un site de cette taille. **Le code de `main` passe les contrôles disponibles**, mais je ne peux pas conclure que la production est prête : l’état actuel de Neon et les variables Vercel ne sont pas vérifiables depuis ce dépôt. J’ai aussi relevé un ordre de migration contradictoire dans la documentation, une notice de confidentialité à compléter et des contrôles de base de données qui ne sont pas obligatoires pour fusionner.

En pratique : **avant d’ouvrir largement la bêta, sécuriser le déploiement des migrations, les textes de confidentialité et les portes CI ; ensuite faire un parcours de validation sur la vraie preview avec des comptes de test.**

## Périmètre et vérifications

- Code examiné : `main`, commit `db2dd8e999cf09d08ca85ea8a7795d746c64c5c6`.
- `npm ci`, puis `npm test` : **607 réussis, 0 échec, 143 ignorés**. Les tests ignorés indiquent `TEST_DATABASE_URL` absent : ce sont les tests nécessitant PostgreSQL, non des échecs fonctionnels.
- Le dernier workflow GitHub de `main` (fusion #150, exécution [40215842189](https://github.com/mattmezstitchlab/AIMESTUDIO/actions/runs/40215842189)) est **vert sur ses cinq jobs**, dont base PostgreSQL, parcours navigateur et accessibilité.
- La règle GitHub de protection existe et est active sur `main` et `integration`.
- **Non vérifié :** le site en production dans un navigateur, les variables Vercel, l’état réel des migrations Neon, la réception des e-mails en production et les parcours avec de vrais services. La CI utilise une base jetable et n’atteste pas de ces réglages.

## Ce qui est déjà bien en place

- L’accueil actuel présente le projet autour de « Un projet. Chacun son écran. », avec des démonstrations clairement signalées comme fictives. L’agent est annoncé « En préparation », pas présenté comme fonctionnel. Depuis le 25/10, la section des capacités en cartes horizontales est remplacée par un aperçu du Temps (Programme et Circle) construit sur les moteurs du module, et AI rassemble les programmes actifs de chaque personne (`GET /api/temps?resume=1`). Voir `docs/TEMPS.md` et `docs/AI.md`.
- Les comptes, espaces, invitations, demandes, Carte enregistrée, lien public révocable et engagements disposent d’APIs et de règles côté serveur. Les tests vérifient notamment l’isolation entre comptes, les conflits d’écriture et les refus d’accès. Les soumissions publiques (Contact ou lien de Carte) sont, elles aussi, contrôlées et enregistrées côté serveur.
- Les nouvelles fonctionnalités ont des replis explicites lorsque la base ou une migration manque : plusieurs routes répondent alors `503` avec un message plutôt que de prétendre que l’opération a réussi.
- Le parcours navigateur et les contrôles axe couvrent ordinateur et téléphone ; certains parcours ciblés vérifient WCAG 2.2 AA. Le dernier workflow GitHub les a validés.
- `npm ci` a signalé **0 vulnérabilité** pour les dépendances du lockfile au moment de l’audit.

## Priorité 0 — à régler avant un lancement réel

### 1. Corriger et unifier l’ordre des deux migrations du 21 octobre

**Risque concret dans le runbook.** `docs/COMPTES.md` indique d’appliquer `2026-10-21-live-journal.sql`, puis `2026-10-21-comptes.sql`. Or le contenu des fichiers ne correspond pas à leur nom :

- `2026-10-21-comptes.sql` crée `live_journal` avec les seules valeurs de démonstration `mariage` et `seminaire` ;
- `2026-10-21-live-journal.sql` crée les tables de comptes et n’élargit la contrainte de `live_journal` aux UUID que si cette table existe déjà.

La CI applique les fichiers par ordre alphabétique — `comptes.sql`, puis `live-journal.sql` — ce qui n’est **pas** l’ordre actuellement écrit dans `docs/COMPTES.md`. Sur une base neuve, suivre le runbook à la lettre peut donc laisser la contrainte sans les UUID nécessaires aux espaces réels.

**À faire :** vérifier le schéma réellement présent sur Neon ; fixer un ordre canonique dans les noms ou dans un runbook unique ; faire appliquer exactement cet ordre par la CI et la procédure de production ; ajouter un test qui vérifie qu’un UUID d’espace peut être écrit dans `live_journal` après migration. Ne pas rejouer aveuglément en production.

### 2. Confirmer les migrations et variables de production

Le dépôt contient des migrations jusqu’à `2026-10-25-15-engagements.sql` (les `09` à `15` ajoutent demandes, Carte, liens, formulaire et engagements ; `08` est réservé au Calendrier). Les fonctions concernées annoncent une indisponibilité si les tables/colonnes ne sont pas présentes. La présence des fichiers dans Git ne prouve pas qu’ils ont été appliqués sur la base de production.

**À faire :**

1. Lire l’état des tables sur la branche Neon de production et comparer avec les migrations réellement requises par les fonctions activées.
2. Faire une branche de sauvegarde, valider le plan sur une branche Neon de test, puis appliquer en production avec autorisation.
3. Vérifier dans Vercel, sans exposer les valeurs dans le dépôt ou le chat, les variables nécessaires selon les parcours activés : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `CONTACT_TO`, `CONTACT_FROM` et `AIME_PROPRIETAIRES` (ainsi que les variables optionnelles documentées pour les quotas, le direct et la conservation).
4. Tester les endpoints et les e-mails sur la preview après redéploiement.

### 3. Aligner la confidentialité avec les données réellement traitées

La Carte personnelle peut maintenant être enregistrée dans Neon avec consentement ; un lien public révocable peut montrer les rubriques choisies ; les activités et questions du formulaire sont configurables ; les demandes et leurs réponses sont conservées dans `demandes`. La page `/confidentialite/` ne décrit pas explicitement ce parcours de Carte, et sa formulation sur les cartes qui « restent sur votre appareil » peut prêter à confusion avec la Carte universelle synchronisée.

Par ailleurs, `docs/DEMANDES.md` indique que la conservation par défaut de **24 mois est une proposition à valider juridiquement**, alors que les textes publics l’annoncent déjà comme une durée établie.

**À faire :** compléter la notice (stockage sur le compte, visibilité du lien, révocation, données reçues, destinataires, durées et suppression), faire valider la durée et les formulations avant l’ouverture à de vraies demandes, puis ajouter des tests automatiques qui couvrent aussi le parcours Carte. Les tests légaux actuels vérifient surtout le formulaire Contact et la cohérence de sa durée.

### 4. Rendre les tests de base obligatoires pour fusionner

La règle GitHub active exige seulement `Suites (node)`, `Parcours navigateur` et `Accessibilité`. Le workflow exécute aussi `Socle (base de test)` et `Parcours Temps (navigateur et base)`, qui couvrent les migrations, les sessions, les écritures et l’isolation en PostgreSQL ; ces deux contrôles ne figurent pas dans la liste des statuts obligatoires.

**À faire :** ajouter ces deux contrôles à la règle, ou créer un job agrégateur obligatoire qui échoue dès qu’un des cinq jobs échoue. Les cinq jobs sont verts sur la dernière exécution de `main`, mais la règle actuelle ne garantit pas que les deux contrôles base bloquent une future fusion.

### 5. Faire une recette réelle avant activation publique

La CI prouve les scénarios avec une base et des identités fictives ; elle ne confirme ni la configuration de production ni le parcours utilisateur sur la preview.

**À faire sur une preview, avec des comptes et coordonnées de test uniquement :** connexion par lien e-mail et clé d’accès ; création/invitation à un projet ; sauvegarde de Carte et conflit entre appareils ; publication puis coupure du lien ; demande reçue et réponses aux questions ; visibilité dans AI ; programme partagé ; suppression du compte. Vérifier aussi les e-mails réellement reçus, les erreurs visibles et le repli lorsque le réseau est coupé.

## Priorité 1 — cohérence et préparation de la bêta

### Mettre à jour la documentation d’entrée

`README.md` ne décrit plus fidèlement le site actuel : il présente encore le Bureau et `/aime/` comme destinations principales et affirme que Neon ne reçoit aucune écriture. Or la page d’accueil et le Dock sont désormais centrés sur AI/ME, `/aime/` et `/cube/` redirigent vers `/`, et les APIs de Carte, demandes et engagements effectuent des écritures authentifiées.

`docs/MIGRATION-V1.md` porte un état du 22 octobre et ne couvre que `matiere` et `identite`; il ne constitue plus un plan complet pour les fonctions livrées ensuite. Il faut aussi réconcilier l’ordre des migrations du 21 octobre décrit ci-dessus. `docs/CARTE.md` conserve des propositions historiques au début du document puis décrit les versions livrées plus loin : clarifier les statuts éviterait de prendre une proposition passée pour l’état courant.

### Vérifier le lancement de la bêta

L’accueil dit toujours « La bêta ouvre bientôt ». Avant de communiquer une date, confirmer que la liste d’attente, l’envoi des e-mails et le chemin d’assistance sont activés et testés sur l’environnement choisi. Les variables de production et les livraisons d’e-mails ne sont pas vérifiées ici.

### PR externe en attente

La PR [#151 — recevoir les post-its privés OpenAime via le formulaire AIME](https://github.com/mattmezstitchlab/AIMESTUDIO/pull/151) est ouverte, avec ses contrôles et son statut Vercel Preview verts à la date de l’audit. Elle ne fait donc pas partie de `main`. À fusionner seulement si l’intégration OpenAime est souhaitée ; vérifier le destinataire côté serveur avant de l’activer.

## Priorité 2 — choix produit, pas des bogues bloquants

- **Agent AIME :** le parcours n’est pas branché. L’accueil le signale honnêtement ; il reste à décider si c’est un objectif de bêta ou une étape ultérieure.
- **Registre public :** les liens de Carte existent, mais la publication/découvrabilité réelle des activités dans un Registre avec filtres et consentement reste à construire. « Montrer sur ma Carte » n’équivaut pas à publier au Registre.
- **Module Temps :** pas encore de création, suppression ou renommage de moments ; la mise à jour se fait par relecture toutes les deux secondes ; les responsabilités multiples et les restrictions de visibilité par personne restent à concevoir ; le direct du jour J n’a pas encore été réécrit sur cette ressource. État détaillé dans `docs/TEMPS.md`.
- **AI :** les invitations reçues ne sont pas encore listées dans AI ; il faut ouvrir le lien reçu ou le coller via le + (`docs/AI.md`).
- **Durcissement CSP :** dans `vercel.json`, `frame-ancestors` est appliqué, mais la politique `default-src`/`script-src` complète est en `Content-Security-Policy-Report-Only`. Étape utile après collecte et correction des violations, pas à activer sans test : le site utilise encore des scripts et styles inline.
- **Stockage local :** la Régie et certains outils gardent des informations sensibles dans le navigateur. Le modèle est documenté comme local et la Régie n’est pas protégée par un compte ; conserver un avertissement clair et encourager l’export régulier des sauvegardes.

## Ordre recommandé

1. **Ne pas appliquer la procédure actuelle des migrations du 21 octobre sans la corriger** ; vérifier l’état réel de Neon.
2. Confirmer les migrations et variables Vercel de l’environnement de preview puis de production.
3. Mettre à jour la confidentialité et faire valider la durée de conservation.
4. Rendre obligatoires les cinq jobs CI, dont ceux avec PostgreSQL.
5. Jouer la recette sur la preview, puis mettre à jour `README.md` et le runbook de publication.
6. Décider séparément du calendrier de l’agent, du Registre et des évolutions du module Temps.
