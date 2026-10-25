
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
