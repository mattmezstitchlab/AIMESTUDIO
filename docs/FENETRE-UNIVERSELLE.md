
# AIME — La Fenêtre universelle (phase 1, pilote privé)

## Objet

`/fenetre/` porte le moteur de la fenêtre OpenAime dans le dépôt AIMESTUDIO sans toucher `/`, `/compte/`, `/projets/` ni aux API. Source : `mattmezstitchlab/OpenAime` à l'état de la phase du 25/10/2026. Une seule scène plein écran : store, curseur temporel, météo et saisons simulées, scènes, musique, objets sur les lames. La page est `noindex` tant que la validation n'est pas faite.

## Contact en un écran

Post-it vide -> objet dans la capsule -> fiche compacte dans la **même fenêtre** : nature (événement, site, refonte, supports, partenariat, autre), type d'événement et prestation, date, lieu, message, coordonnées, accord. L'envoi POST JSON se fait depuis la même origine vers **l'API existante** `/api/contact`. Les valeurs de `projet` sont strictement celles que le serveur connaît ; les précisions sont placées dans le message enregistré.

Le code ne contient aucune clé Resend. Le serveur `api/contact.js` est inchangé ; droits, limites d'envoi, validation, conservation et envoi via Resend sont réutilisés. Réponse 200 = demande prise en charge par AIME, pas une garantie que l'e-mail a été livré. Aucun e-mail réel n'a été envoyé pendant la préparation de cette phase.

## Post-it

Le post-it n'est **plus** conditionné par une tâche temporelle du saxophone : le support visuel est toujours affiché, même vide. Le visiteur peut cliquer dessus pour ouvrir la capsule de contact. L'ancienne simulation de tâches du jour reste dans le moteur original, sans données de tâche configurées sur cette vitrine. La personnalisation publique n'est pas ouverte : elle dépend actuellement d'Artifacts (`window.claude`) et n'est pas une authentification serveur.

## Musique — dette de migration

Pour la preview seulement, les deux MP3 utilisent temporairement des URL publiques épinglées à un **commit immuable** d'OpenAime. Avant passage de `/fenetre/` à `/`, copier les médias dans le domaine AIME Studio (ou un stockage/CDN maîtrisé) afin d'éliminer cette dépendance inter-dépôts. Vérifier lecture, pause, changement de morceau et CSP sur une vraie preview. Aucun mp3 n'a été recopié dans la PR car les actions GitHub disponibles écrivent des fichiers UTF-8.

## Identité

AIME Studio utilise déjà Better Auth, **lien e-mail (Resend) et passkeys**, cf. `api/_auth/auth.mjs`. Google OAuth n'est pas configuré dans cette phase ; ne pas imiter un bouton de connexion opérationnel. Étape suivante : relier la même session AIME à une fenêtre propriétaire éditable (brouillon/version publiée, droits serveur, média durable), puis rendre l'entrée et l'éditeur accessibles depuis la capsule. Aucun compte, ni rôle fictif, ni édition publique ne sont ajoutés.

## Étapes de livraison

1. Tester `/fenetre/` en preview sur ordinateur/iPhone, interaction store, lecture musicale, animations pluie/neige/temps, boutons/étoiles/objets, clavier/mouvements réduits.
2. Appliquer/vérifier les migrations demandes et la configuration Resend/CONTACT_TO/CONTACT_FROM sur un environnement de test, puis faire un **envoi réel autorisé** avec une adresse contrôlée.
3. Définir une carte des modules de capsule (Temps, Climat, Musique, Contact, Compte, Projets) et des autorisations de chacun ; éviter un second dock visible.
4. Construire l'édition sécurisée des stickers, objets et fenêtres (session, serveur, brouillon/publication, permissions, journal) ; pas de dépendance Artifacts en public.
5. Après validation, seulement alors décider de remplacer l'accueil `/`. Les anciens écrans et API restent accessibles derrière la fenêtre ; aucune suppression implicite.

Tests statiques : `node --test tests/fenetre-integration.test.cjs`.


## Phase 2 — la capsule Média (25/10/2026)

La même URL `/fenetre/` contient désormais un aiguillage d'objets typés `fenetre/capsule-bus.js`, sans créer de nouveau Dock. Le bouton **▧ Médias** est placé directement dans la capsule normale et dans son menu `+`. Il transforme la capsule en navigation `Précédent / titre / numéro / Suivant / Défiler-Pause`, avec retour à la capsule précédente. Un clic sur le polaroid sélectionne sa photo et émet le même événement d'objet typé `aime:capsule`. La capsule revient à son état antérieur en quittant Médias. Le mode contact existant masque les Médias sans effacer son brouillon.

Les polaroids sont **montés dans les véritables nœuds DOM des lames du store** : ils suivent leurs inclinaisons et leurs déplacements ; un observateur les replace après un changement de taille/reconstruction des lames. Sur mobile, seule la photo sélectionnée reste visible pour ne pas saturer la fenêtre. La galerie lit `fenetre/galerie.json` ; chaque objet contient type, emplacement sur une lame, position et décalage de navigation. Six visuels déjà inclus dans `media/visuels` sont présentés comme **images de démonstration**, sans supposer qu'il s'agit de photographies de prestations réelles.

Le défilement automatique est **opt-in** ; l'animation s'arrête dès que le mode n'est plus actif ou si la page devient cachée. Pas de cycle automatique en mode mouvements réduits. Les deux MP3 de `oa-settings.music.tracks` sont conservés : aucun changement du moteur de lecture ou du choix de pistes, ni lecture forcée. L'ambiance audio et les météos animées restent indépendantes.

**Limites :** l'édition du manifeste est encore une opération de dépôt GitHub, pas une édition publiée depuis une session propriétaire. L'import de médias par les visiteurs, la galerie privée et les liaisons aux documents AIME ne sont pas ouverts.

## TicketAIME : contrat de raccordement, pas de copie visuelle approximative

Source examinée : `mattmezstitchlab/ticketaime`, notamment `src/data/functionWallet.ts`, `src/data/catalogue.tsx`, `src/lib/moduleActions.ts`, `src/components/Ticket.tsx` et `src/components/SimpleTickets.tsx`.

TicketAIME est une app React/TypeScript ; la fenêtre est actuellement statique/vanilla JS. **Ne pas copier ses 168 composants comme un bloc dans le gros HTML de la fenêtre.** Préférer un adaptateur commun qui connaît les types, modèles, champs et actions puis un rendu autonome en `ticket` accessible depuis la capsule.

La donnée source `WalletTicket` comporte `version:1`, `id`, `code`, `toolId`, `itemId`, `fields`, `details`, `stamped`. Des outils de TicketAIME existent déjà (réservation, invitation, carte postale, devis, facture, souvenir, etc.), mais **le portefeuille actuel est essentiellement local au navigateur** : la présence d'un ticket n'implique ni émission officielle ni lien sécurisé. Il faut valider schémas et autorisations avant toute importation dans la base d'AIME Studio.

Parcours cible progressif :
1. Sélection d'un objet `ticket` sur une lame ou dans la capsule ; activation `AIMECapsule.activer({type:'ticket',id})`.
2. Récupération du modèle et de son schéma réel, sans inventer de rôle ni d'autorisation.
3. **Champs manquants rendus dans la même capsule**, ou une surface accessible raccordée à elle quand la quantité dépasse sa largeur. Aucune émission à la seule sélection.
4. Validation explicite puis rattachement à un projet AIME et journal des actions **uniquement** lorsque les API et permissions sont en place.
5. Pas de billet d'accès, réservation, signature, facture fiscale, paiement ou titre officiel présenté comme réel avant activation d'un backend fiable et de ses vérifications.

Le premier vrai raccord TicketAIME doit porter **un seul modèle non réglementé** (par exemple une carte postale/brouillon), avec des tests de reprise, affichage sur mobile et accès clavier, avant de proposer un catalogue.
