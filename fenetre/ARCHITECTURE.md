# LE MONDE AIME® — Fenêtre personnelle + Renaissance

Prototype de convergence, branche fixe `arena/2d4424b5-aimestudio`. Aucun déploiement, changement de schéma Neon ou nouveau mécanisme d’authentification. Ce document distingue les fonctions réutilisées des limites du prototype.

## Entrées et navigation

- `/` sans paramètre/fragment → `/fenetre/`, nouvelle ouverture de démonstration.
- `/fenetre/` : paysage original, store scénographique, identité de session si disponible, accès à tous les contextes.
- `/compte/` → état **Mon identité**, avec ses paramètres et fragment conservés.
- `/projets/` → état **Mon activité**, y compris `?demande=…`, `?espace=…&page=…`, invitations et intentions de création.
- `/?univers=mariage` : lecteur précédent intact. Les onze autres paramètres `univers` conservent leur parcours.
- `/?scene=renaissance` : cinq tableaux continus dans le mariage, puis les dix actes précédents.
- Les liens publics `/c/#…` et les endpoints d’invitation ne sont pas modifiés. `?historique=1` permet d’ouvrir la vue compte/projets d’origine hors coque, utile au diagnostic.

Les changements de contexte utilisent l’historique navigateur. Le paysage reste le même nœud DOM. Les éditeurs ne naviguent pas la page principale vers une autre application. Ils restent des **vues d’origine embarquées dans des panneaux même origine**, adaptées visuellement ; ce n’est **pas encore une fusion complète de leurs DOM ni une réécriture des formulaires**. Le paramètre interne des iframes ne donne aucun droit.

Le routeur de présentation n’accepte que des destinations locales explicitement autorisées. Il ne connaît ni rôles ni données de projet. À chaque réouverture privée, la session est relue et la vue d’origine recharge ses projections serveur. Un changement de compte vide les panneaux privés en mémoire. Aucun jeton d’invitation ou de session n’est sauvegardé dans les préférences locales de la Fenêtre.

## Réutilisation, pas duplication

| Contexte | Sources conservées | Responsabilité du prototype |
|---|---|---|
| Session / sécurité | Better Auth, `/api/auth/*`, `/api/identite` | Afficher l’état réel ou l’indisponibilité, jamais une fausse session. |
| Mon activité | `compte/ai.js`, `compte/projet.js`, demandes/engagements/espaces existants | Accueillir les vues et leurs gestes serveur dans le même écran. |
| Mon identité | `compte/compte.js`, `carte/carte.js`, `compte/carte-compte.js`, timbre, métiers, formulaire personnel, passkeys | Supprimer la rupture de chrome et le fond pastel de la vue embarquée. |
| Création de projet | Formulaire `#fEspace`, **`AIMECreer.creer`** et `/api/espaces` | L’orbe ouvre ce formulaire ; elle ne crée pas un second pipeline. |
| Studio | Canevas, adaptateur Publication, moteurs Studio et rendus existants | Une peau papier/champagne, ouverture dans un panneau, aperçu enregistré et export public explicite. |
| Supports / tickets | Pilote des cinq objets déjà livré | Catalogue autorisé et vrai aperçu du moteur d’origine. Atelier TICKETAIME toujours non raccordé. |
| Orbe | Registre `dock/modele.js`, gestes présents dans la vue d’origine, noyau radial et interactions existants | Présenter les mêmes commandes, pas une seconde table de permissions. |
| Récit | `union/*`, Temps et permissions existants | Couche artistique opt-in ; données et ordre inchangés. |

Le code Fenêtre n’enregistre aucune copie de la Carte ou des projets serveur. L’ajout explicite d’une composition crée seulement un nouvel identifiant Publication dans `aime-sites`, en conservant tous les autres sites et propriétés. Les modifications, l’enregistrement, l’annulation et « Défaire » restent ceux de l’adaptateur Canevas.

## Audit Carte du compte / Carte Studio

Ces objets portent un nom voisin mais **ne sont pas interchangeables** :

| Stockage | Contenu / moteur | Décision |
|---|---|---|
| `aime-carte` | Carte personnelle, `carte/carte.js` ; visibilités, photo et relations locales | Ne pas recopier dans le Studio. |
| `aime-carte-sauvegarde` | Sauvegarde avant remplacement explicite de Carte locale | Conservée. |
| `/api/carte`, tables Carte et liens | Version compte avec révision, consentement, conflits et lien révocable | Autorité compte, règles existantes. Photo/relations/historique ne sont pas envoyés par ce modèle. |
| `echos:v2` | Projets graphiques Studio, versions, listes, formats | Créations originales, pas un profil de compte. Aucun rapprochement automatique. |
| `aime:cards`, `aime:uni`, `aime:unilinks`, `aime:uniat` | Registre de personnes/cartes et liens du Studio ; états et visibilités propres à ce moteur | Ne pas confondre une personne de liste, une carte graphique et un compte authentifié. |
| `aime-sites` | Sites et Publications du Canevas | Ajout explicite uniquement ; pas de conversion massive. |
| IndexedDB du Point Zéro / médias | Fichiers et créations locales distincts | Non migrés ; non couverts par la sauvegarde JSON simplifiée. |

**Inventaire & sauvegarde** dans l’Atelier lit uniquement les clés connues. Il indique taille et lisibilité, ne modifie rien, ne corrige pas les anciens formats et n’exporte jamais les clés d’authentification. Une case de consentement est nécessaire pour télécharger la sauvegarde privée. Elle conserve les valeurs brutes, y compris un ancien format opaque. Elle n’est pas une sauvegarde complète du compte ou des fichiers IndexedDB. Aucun import/fusion de Carte n’est ajouté.

## Orbe et capsule

Une seule orbe visible dans la coque : clic court pour la commande principale du contexte, maintien 550 ms pour le radial. Bouton **Actions**, Majuscule-F10 et touches fléchées/Entrée/Échap restent disponibles. Dans le récit et les supports, le radial reprend les boutons autorisés du dialogue courant ; dans AI/ME, il reprend les gestes existants. Le noyau géométrique et la navigation clavier sont ceux de `modules/radial/`.

Les décisions sensibles restent dans leurs composants et endpoints d’origine ; le menu ne confère aucun droit. Dans le récit fictif, un contrôle autorisé reste une **simulation**, pas une écriture sur un projet réel.

La capsule possède trois états : réduit, normal, déployé. Elle se réduit dans les contextes administratifs/créatifs pour ne pas recouvrir l’atelier. Son curseur pilote le lecteur du récit, en indices de la **projection autorisée** (9 moments pour la perspective invitée du mariage, pas 200). Elle suit le défilement par l’état du lecteur partagé. Elle peut piloter un média actif, avec un temps en secondes distinct de l’horloge réelle affichée séparément. Les phases de lumière sont des intentions artistiques ; elles ne changent jamais une date. La timeline multipiste complète n’est pas implémentée.

## Partager : deux contrats différents

1. **Carte publique** : le système serveur existant reste la référence. Consentement, rubriques publiques, coupure du lien et questions personnelles sont gérés dans Mon identité. Le lien ne donne aucun accès aux projets.
2. **Composition Publication** : l’atelier est local. L’utilisateur enregistre dans le Canevas, ouvre l’aperçu public puis confirme **Diffuser · export public**. Le moteur `AIMESite.exporter` fabrique la projection publique. Le prototype télécharge uniquement l’HTML public, pas le projet source.

**Ce deuxième geste n’héberge rien sur Internet.** Un visiteur peut ouvrir le fichier public exporté ; il ne reçoit ni la Carte privée, ni les projets, ni les sections réservées. Aucun lien public serveur de composition n’est inventé. Le réseau social Fenêtres, les abonnements, les Instants publiés et les fenêtres publiques de lieux/collectifs restent à raccorder. Aucun abonnement n’accorde de permission, puisqu’aucun mécanisme de permission sociale supplémentaire n’est ajouté.

## Cinq tableaux — première expérimentation uniquement

`union/renaissance.js` et `renaissance.css` constituent une couche séparée de la donnée :

1. **Manifeste** : titre monumental, photographie découpée en arche, date graphique, parallaxe réversible.
2. **Cinématographique** : plein cadre, profondeur, zoom doux piloté par le scroll, vrai lien vers une fiche canonique.
3. **Éditorial** : papier, asymétrie, grands blancs, photographie isolée, accès aux dix actes.
4. **Collage** : photographie, invitation graphique, empreinte typographique, moment référencé ; l’invitation ouvre l’aperçu Studio existant.
5. **Chronologique interactif** : horaires canoniques, fiches autorisées, perspectives et poursuite du récit complet.

Les 200 IDs et les cardinalités 8/12/14/18/12/12/102/8/8/6 restent inchangés. L’anomalie chronologique 19:12 / 19:00 n’est pas corrigée. Les gabarits symboliques des autres univers ne reçoivent aucune fausse date. Les douze lecteurs précédents restent disponibles : le nouveau vocabulaire artistique n’est **pas encore déployé aux douze univers**, conformément à l’étape de validation demandée.

Les effets utilisent un scroll natif et des calculs regroupés en `requestAnimationFrame`, sans interception ni ralentissement forcé. IntersectionObserver limite le travail aux tableaux visibles. Mouvement réduit : transformations et animations désactivées, contenu et actions conservés. Les médias des douze univers ne sont pas préchargés.

Le paysage Provence est une illustration originale générée pour ce prototype, pas une découpe de la maquette jointe. Les autres décors sont les illustrations déjà présentes. Aucun actif Shopify n’est utilisé. La direction reprend les principes explicités dans le brief ; la page Shopify elle-même n’a pas pu être consultée dans cet environnement réseau restreint.

## Ce que prouvent les parcours

| Étape demandée | Vérification effectuée | Limite |
|---|---|---|
| Connexion → Fenêtre | Formulaire original, corps et callback Better Auth, état réel fermé quand indisponible | E-mail/passkey réels et base de test non configurés ici. Test navigateur avec réponses API de fixture, pas une authentification cryptographique prouvée. |
| Retrouver demandes et Carte | Vues originales ouvertes et alimentées par leurs contrats API ; aucune copie de Carte | Identités/demandes du test UI explicitement fictives. |
| Orbe → projet → retour | Formulaire original → `AIMECreer` → API existante ; retour au même nœud paysage | Création serveur exercée par contrat simulé ; pas de nouveau projet Neon réellement créé. |
| Studio → composer → enregistrer | Vrai Canevas, modification native d’une propriété et sauvegarde locale | Pas de nouvelle persistance serveur de création. |
| Aperçu → choix de diffusion | Vrai moteur public et consentement explicite avant téléchargement | Export public, pas hébergement en ligne. |
| Vue visiteur | HTML téléchargé ouvert dans un contexte navigateur isolé ; marqueur de section réservée absent | Pas de réseau social/Fenêtre publique de création publié en production. |

## Tests et mesures

- `npm run build` : **42 tests réussis**, syntaxe des modules et présence des ressources.
- Régression ciblée permissions, Temps, comptes statiques, Carte, demandes, engagements, Publication, conservation, contact, orbe et nouveaux pilotes : **344 tests, 270 réussis, 74 ignorés, 0 échec**. Les cas ignorés demandent notamment une base de test configurée. Cela ne signifie pas que toute la suite historique du dépôt est verte.
- `scripts/test-fenetre-browser.cjs` : navigation historique, formulaire de connexion et contrats API avec fixtures, demandes et Carte, orbe courte/longue/clavier, création via le moteur existant, retour Fenêtre, modification et sauvegarde Canevas, inventaire sans mutation, sauvegarde privée consentie, aperçu public, export consenti, canari privé exclu, visiteur isolé, persistance locale, retour arrière, anonymat et mobile. **Zéro erreur JavaScript observée**.
- `scripts/test-renaissance-browser.cjs` : cinq tableaux desktop **et** mobile, 200 IDs / dix actes, véritable aperçu invitation, perspective invitée, curseur borné à la projection autorisée, mouvement réduit et absence de débordement. **Zéro erreur JavaScript observée**.
- Régressions navigateur : douze univers desktop / cinq mobiles, parcours des dix actes et panoramas ; cinq aperçus supports, trois transferts Studio et un Canevas avec créations historiques préservées.
- Sources canoniques mariage et gabarits comparées **octet par octet** aux JSON fournis.

Dernier échantillon local Chromium headless 1536 × 1024, sans bridage : montage DOM des cinq tableaux marqué à **317 ms** ; environ **1,89 Mo de corps de réponses initiales** observés, dont configuration, HTML, polices et illustrations. Ce sont des mesures de laboratoire locales, **pas un LCP, un score Lighthouse ou une garantie sur mobile réel**. ResourceTiming renvoie des tailles nulles dans ce navigateur : elles ne sont pas interprétées comme un transfert nul. Rapport brut généré hors Git dans `/home/user/renaissance-performance.json` par le script de test. Les captures et outils navigateur temporaires ne sont pas des dépendances d’exécution.

## Prochaines validations nécessaires

- Base de test dédiée et plusieurs comptes pour valider les vrais e-mails, passkeys, invitations, rôles expirés/révoqués, et les tests navigateur historiques adaptés à la coque.
- Hébergement/publication des compositions via un contrat serveur autorisé, révocable et audité ; aucun ajout destructif de table proposé ici.
- Raccord du véritable module Fenêtre/Instants/social si sa source est fournie : aucun moteur social équivalent n’a été identifié dans ce checkout. Le store et le paysage livrés ici restent de la scénographie locale.
- Validation artistique des cinq tableaux avant extraction en configurations pour les onze autres univers.
- Mesures sur appareils physiques et réseau mobile ; audit d’accessibilité complet et sélection/multimedia avancée.

## Correction visuelle — références des douze univers (26 octobre 2026)

La Fenêtre par défaut et les douze ouvertures utilisent désormais une direction commune : photographie architecturale plein écran, titres Playfair monumentaux, marque sur deux lignes, navigation en surimpression et capsule champagne. Les panneaux, séquences sombres et anciennes nuances de vert des feuilles de style de cette expérience sont noirs/neutres. Les pigments verts des nouveaux décors sont également neutralisés vers l’encre. Cette correction ne modifie ni le mariage canonique ni les gabarits, les dates ou les contrôles d’accès.

- Présentation : `union/editorial.{js,css}`, `fenetre/editorial.css`, métadonnées de `union/data/worlds.json`.
- Dix illustrations originales générées dans `union/media/worlds/`, entre 100 et 250 Ko environ. La limite de génération ayant été atteinte, Festival partage le décor de Scène et Création celui de Site. Il ne s’agit pas de douze illustrations distinctes ni d’un découpage des planches de référence en faux contrôles.
- Le choix d’un univers dans la Fenêtre ouvre réellement cet univers dans le lecteur intégré. Le récit par défaut utilise l’ouverture illustrée ; le parcours Renaissance reste disponible explicitement via `/?scene=renaissance`.
- La nouvelle progression utilise exclusivement `AIMEWindowNarrative` et son ensemble filtré. Le changement de position conserve l’ordre des moments ; un invité reste limité à ses neuf moments. La graduation de gauche est désormais masquée partout, sans marge réservée. Les horaires prévus restent disponibles dans les contrôles et fiches existants.
- Vérifications : build 42 tests ; 37 tests ciblés ; navigateur douze univers desktop/mobile, Fenêtre avec contrats API simulés, progression invitée, parcours dix actes, cinq tableaux Renaissance et cinq supports d’origine. Les exécutions lourdes avec captures sont sérialisées et les animations désactivées pendant les captures pour éviter un blocage du compositeur Chromium en exécution parallèle. Aucun test d’authentification réelle, d’envoi d’email ou de déploiement n’est ajouté à ces résultats.

### Correction de proportions et noir intégral — 26 octobre 2026

`union/compact.css` est chargé après les styles éditoriaux dans les deux entrées. Les surfaces du récit (panoramas compris), les transitions, les panneaux et la capsule sont noirs `#000`. Les illustrations restent des images. La graduation de gauche est masquée à toutes les étapes, y compris Renaissance, et son ancienne marge est supprimée. Ses nœuds internes restent uniquement pour ne pas casser les mises à jour du moteur. Capsule du lecteur révisée : 56 px sur ordinateur et mobile, largeur maximale 780 px. Lecture centrée, progression, raccourcis à icônes ; lumière et vitesse regroupées dans un menu Ambiance explicite, compatible clavier. Capsule personnelle normale : 76/72 px, largeur maximale 900 px ; son déploiement reste explicite.

Vérification reproductible : `scripts/test-compact-browser.cjs`, douze univers, panoramas et sections noirs, aucune graduation visible ni marge à gauche, dimensions effectives des capsules, contrôles mobiles dans le viewport, variante Renaissance et entrée personnelle, zéro erreur JavaScript observée.

### Aperçu actualisé

Le serveur statique ne recharge pas un onglet déjà ouvert. Un nouvel aperçu est donc ouvert sur le port 3001. Les réponses du serveur de développement portent désormais `Cache-Control: no-store` ; les entrées CSS et modules modifiés sont versionnées. Cela ne modifie pas le cache en production. La graduation est aussi masquée dans les styles de base et le HTML initial, pas seulement par la présentation montée après chargement.

### Ajustement validé : noir limité aux anciennes bandes vertes

Correction de la correction : les séquences papier, les transitions, la barre de filtres et les panneaux retrouvent des fonds ivoire et un texte encre. L’en-tête redevient clair au-dessus des séquences papier. Les panoramas et bandes anciennement verts restent noirs. Les couleurs des tableaux Renaissance sont rétablies. La bande graduée reste retirée. La capsule approuvée n’est pas retouchée : la portion CSS qui la définit a été vérifiée identique par SHA-256 avant/après cet ajustement. Le test navigateur vérifie désormais le contraste entre bandes noires et séquences claires, plutôt qu’un noir généralisé.

## Header unique — audit de navigation

Voir `union/NAVIGATION-AUDIT.md` : suppression de la seconde barre sticky et intégration du formulaire original dans le menu Filtres du header, avec les offsets de lecture corrigés. Navigation et filtres ne sont plus deux surfaces concurrentes. La capsule approuvée est inchangée. Vérifications navigateur sur les douze univers, mobile, Renaissance et Fenêtre intégrée.
