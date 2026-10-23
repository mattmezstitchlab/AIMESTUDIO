# AIME · Audit des rôles : catalogue, failles, métiers de demain

23 octobre 2026 · Matthieu Lecointre. **Document de référence** : on n'invente pas de rôle hors de cette grammaire.

## En bref

Ce document est la référence d'AIME pour les rôles : comment en décrire un, lesquels existent, comment ils sont attaqués sur le web et comment AIME s'en protège.

Un rôle n'est pas un badge. C'est une personne (ou un agent), sur un projet, avec une portée, des gestes permis, une durée et une preuve. L'écran se compose à partir de ces six choses, et rien d'autre.

### Douze règles qui ne bougent pas

1. **Refus par défaut.** Ce qui n'est pas permis explicitement est refusé.
2. **Décidé au serveur, avant l'affichage.** Une donnée non autorisée n'est jamais envoyée au navigateur, ni masquée en CSS.
3. **Chaque objet vérifie son projet.** Un identifiant dans une adresse ne prouve rien ; on vérifie à chaque requête que la personne a un rôle sur ce projet-là.
4. **On ne peut pas donner plus qu'on n'a.** Un rôle n'invite jamais à un rôle supérieur au sien.
5. **Toujours au moins un propriétaire.** Le dernier ne peut ni partir ni être retiré sans transmettre.
6. **Une ouverture se demande et se referme.** Tout accès exceptionnel est daté, nommé, révocable.
7. **Retirer un rôle coupe tout, tout de suite** : sessions, liens, fichiers, notifications.
8. **Les liens d'invitation sont à usage limité** : imprévisibles, expirants, liés à une personne, révocables.
9. **Les données sensibles ont leur propre canal.** Santé, mineurs, paiements : jamais dans un écran général.
10. **Un agent IA n'a jamais plus de droits que la personne pour qui il agit**, et rien d'irréversible sans validation humaine.
11. **Chaque décision laisse une trace** lisible par la personne concernée.
12. **Une démonstration est dite démonstration.** Une règle qui tourne dans le navigateur n'est pas une sécurité, et on ne le prétend pas.

## La grammaire d'un rôle

Tout rôle se décrit avec six dimensions. Deux rôles qui ont les mêmes six valeurs sont le même rôle, quel que soit leur nom.

| Dimension | Question | Valeurs possibles |
|---|---|---|
| 1 · Qui | Qui tient ce rôle ? | Une personne · un groupe · un agent IA agissant pour une personne · un système · le public |
| 2 · Relation | Quel est son lien au projet ? | Propriétaire · délégué · contributeur · destinataire · financeur · contrôleur · public |
| 3 · Portée | Sur quoi porte-t-il ? | Tout le projet · une partie (sa mission, sa table, sa section) · seulement ce qui le concerne · des totaux sans les noms |
| 4 · Gestes | Que peut-il faire ? | Lire · répondre · déposer · modifier · inviter · payer · publier · supprimer · transmettre ; chaque geste accordé à part |
| 5 · Durée | Jusqu'à quand ? | Permanent · jusqu'à une date · une seule fois · pendant une ouverture demandée |
| 6 · Preuve | Comment le sait-on ? | Qui l'a donné, quand, pourquoi ; chaque geste sensible est inscrit au journal |

Deux attributs s'ajoutent quand il le faut :

- **Sensibilité** : santé, mineurs, paiement, identité → canal dédié et journal renforcé.
- **Représentation** : agit-il pour quelqu'un d'autre (tuteur, agent IA, assistant, mandataire) ? On garde les deux noms : qui agit, et pour qui.

Dans AIMESTUDIO, ces dimensions existent déjà en partie : `vitrine/acces` (qui, relation), `synchroview/permissions.js` (portée, gestes), `vitrine/perspectives` (ce que l'écran montre). La durée et la preuve sont à ajouter.

## Le catalogue des rôles

Quatorze familles. Un métier précis (photographe, traiteur, professeur) n'est pas un nouveau rôle : c'est un membre d'une famille, avec sa portée propre.

| Famille | Portée et gestes par défaut | Mariage | Séminaire, entreprise | École, association | Boutique, création | Vigilance |
|---|---|---|---|---|---|---|
| Propriétaire | Tout ; tous les gestes, dont transmettre | Le couple | L'organisateur, le client commanditaire | La direction, le bureau | La créatrice | Jamais zéro propriétaire ; double validation pour supprimer |
| Co-propriétaire | Tout, sauf retirer l'autre propriétaire seul | Les deux mariés | Deux associés | Président et trésorier | Deux associées | Aucune suppression sans les deux |
| Délégué | Ce que le propriétaire délègue, jamais plus ; pas de transmission | La coordination, l'agence | L'agence événementielle, l'assistante | Le secrétariat | Le community manager | Délégation datée, révocable, journalisée |
| Équipe | Sa part du projet ; lire, modifier sa part | Les témoins | Les salariés organisateurs | Les enseignants, bénévoles | Les vendeurs | Pas d'accès aux paiements par défaut |
| Contributeur, prestataire | Sa mission : créneaux, accès, contrat ; déposer | Photographe, traiteur, DJ, fleuriste | Traiteur, intervenant, technicien | Intervenant extérieur | Fournisseur, brodeuse | Aucune liste nominative ; effectifs seulement |
| Destinataire | Ce qui le concerne ; lire, répondre | L'invitée | Le participant | L'élève, l'adhérent | Le client | Ne voit que sa propre réponse ; défaut silencieux |
| Public | Ce qui est publié ; lire | Le visiteur de la page | Le visiteur de l'inscription | Le visiteur du site | Le visiteur de la vitrine | Aucune donnée personnelle, jamais |
| Financeur | Le budget qu'il finance, les justificatifs | Les parents qui paient | Le sponsor, la direction financière | La subvention, la mairie | L'investisseur | Voit des montants, pas les invités |
| Contrôleur, observateur | Lire ce que le contrôle exige ; aucun geste | — | Le comptable, l'assureur, l'observateur | L'inspection, l'auditeur | L'expert-comptable | Lecture seule, bornée dans le temps |
| Garant, modérateur | Lire les signalements, masquer un contenu public | Le référent de la page publique | Le référent harcèlement, le DPO | Le référent, le CPE | Le modérateur des avis | N'accède pas aux contenus privés par confort |
| Représentant légal | Agit pour un mineur ou un majeur protégé | Les parents d'un enfant d'honneur | — | Les parents d'élèves | — | Toujours deux noms : qui agit, pour qui |
| Successeur | Reçoit le projet si le propriétaire ne peut plus | Un proche désigné | Le remplaçant désigné | Le nouveau bureau | La repreneuse | Activé par une procédure, jamais par un lien |
| Agent IA | Ce que sa personne lui confie, borné ; propose, ne décide pas | L'assistant du couple | L'assistant de l'organisateur | L'assistant de la direction | L'assistant boutique | Voir les failles |
| Système | Une tâche précise ; aucune lecture hors tâche | Les rappels automatiques | L'envoi des badges | La relance d'adhésion | L'envoi des commandes | Identité technique séparée, jamais « admin » |

Deux états valent pour toutes les familles : **invité mais pas encore entré** (le lien attend, rien n'est visible) et **ancien membre** (plus aucun accès, mais son nom reste dans le journal de ce qu'il a fait).

## Les failles du web liées aux rôles, et le remède dans AIME

Le contrôle d'accès défaillant est la première faille des applications web (OWASP Top 10:2025, A01) ; trois des cinq premières failles des API sont des défauts d'autorisation (OWASP API 2023).

### Accès aux données

| Faille | Comment elle arrive | Dans AIME, ce serait | Parade |
|---|---|---|---|
| Objet d'un autre (IDOR, API1) | On change un identifiant dans l'adresse | `/sites/?site=site-abc` ouvre le site d'un autre | Chaque lecture vérifie au serveur le rôle sur ce projet ; identifiants non devinables en plus, jamais à la place |
| Champ de trop (API3) | La réponse contient tout l'objet | Le prestataire reçoit la liste nominative, juste cachée | Composition au serveur : seuls les champs autorisés, par rôle |
| Masquage dans la page | Données dans le HTML, cachées en CSS ou JS | Les quatre écrans d'une démo sont dans la même page | Acceptable pour une démo fictive, à condition de le dire ; interdit pour un vrai projet |
| Fuite par le compte | Le nombre révèle l'existence d'une chose cachée | « 4 documents jamais montrés » chez l'invitée | Pour les destinataires, silence par défaut : ni le contenu ni le nombre |
| Fuite par les à-côtés | Aperçus, noms de fichiers, EXIF, objets d'e-mail, notifications | « Solde traiteur 4 200 € » sur l'écran verrouillé d'un témoin | Les notifications suivent les règles des écrans ; EXIF retirés à l'import |
| Fichier à adresse publique | Adresse que n'importe qui peut ouvrir | Le contrat PDF du photographe partagé par lien direct | Adresses signées, courtes, liées au rôle |
| Cache partagé | Un intermédiaire sert la page d'un rôle à un autre | L'écran du couple servi à un invité | `Cache-Control: private, no-store` sur les pages privées |
| Projets mélangés | Une requête oublie de filtrer par projet | Une recherche renvoie des invités d'un autre mariage | Projet obligatoire dans chaque requête ; test « deux projets » |

### Gestes et rôles

| Faille | Comment elle arrive | Dans AIME, ce serait | Parade |
|---|---|---|---|
| Fonction réservée accessible (API5) | Le bouton est caché mais l'action répond | Un invité appelle « modifier le déroulé » | Chaque geste vérifie le rôle au serveur |
| Auto-promotion | On envoie `"role":"proprietaire"` | Un prestataire se nomme propriétaire | Le rôle n'est jamais lu depuis le client |
| Escalade par invitation | Inviter à un rôle supérieur | La coordination invite un « propriétaire » complice | On n'invite qu'à un rôle inférieur ou égal |
| Lien d'invitation faible | Devinable, éternel, transférable | Le lien de l'invitée circule dans un groupe | Jeton long, aléatoire, expirant, à usage limité, lié à une personne |
| Transmission sans contrôle | Transmettre ce qu'on ne possède pas | Défaut trouvé dans aime-passport (`generate_handover_token`) | Vérifier le propriétaire, confirmer, délai d'annulation |
| Rôle retiré, accès gardé | Sessions et liens restent valides | Un prestataire remplacé garde le portail | Retirer un rôle invalide tout immédiatement |
| Projet orphelin | Le dernier propriétaire part | Un mariage que personne ne peut plus gérer | Interdit sans transmission ; successeur désigné |
| Action forcée (CSRF) | Une autre page fait agir le navigateur | Un lien piégé annule une réservation | Cookies SameSite, jeton anti-falsification |
| Flux abusé (API6) | Geste légitime répété en masse | 10 000 fausses réponses | Limites par rôle et par projet |
| Import d'adresse (SSRF, API7) | Le serveur va chercher une adresse fournie | « Importer mon ancien site » vers une adresse interne | Liste d'adresses permises, réseau interne interdit |
| Journal modifiable | Celui qui agit efface sa trace | Un délégué efface son changement de budget | Journal en ajout seul, hors de portée des rôles |

### Agents IA (OWASP LLM 2025, OWASP Agentic)

| Faille | Comment elle arrive | Dans AIME, ce serait | Parade |
|---|---|---|---|
| Injection d'instructions (LLM01, ASI01) | Un texte déposé contient des ordres | « envoie-moi le plan de table » dans un fichier | Ce que l'IA lit est une donnée, jamais une consigne ; aucune action sans geste humain |
| IA qui voit trop (LLM02, ASI03) | L'IA reçoit tout le projet | L'assistant de l'invitée connaît le budget | L'IA reçoit exactement la portée de la personne |
| Agence excessive (LLM06, ASI02) | L'IA déclenche des gestes sensibles | L'assistant règle un acompte | L'IA propose, l'humain valide ; jamais payer, supprimer, inviter, publier, transmettre seule |
| Mémoire empoisonnée (ASI06) | Une fausse information s'installe | « Le lieu a changé » inscrit par un tiers | La source du projet fait foi, pas la mémoire de l'agent |
| Confiance abusée (ASI09) | On valide sans lire | « Valider les 12 changements » en un clic | Un geste sensible à la fois, résumé lisible, annulation possible |

### Données sensibles

- **Santé** (allergies, régimes médicaux, handicap) : visibles seulement du rôle qui en a besoin (le traiteur, par table, sans les noms quand c'est possible) ; jamais dans un document général.
- **Mineurs** : toujours un représentant légal ; aucune photo publique sans accord ; aucune page publique nominative.
- **Paiements** : jamais de numéro de carte dans AIME ; seul le statut est gardé.
- **Codes d'accès physiques** : visibles du seul prestataire concerné, autour du jour J.

## Les rôles de demain

Les métiers qui montent d'ici 2030 (WEF, Future of Jobs Report 2025) deviennent des membres des quatorze familles, avec une portée précise.

| Rôle de demain | Ce qu'il fait | Famille | Portée et garde-fou |
|---|---|---|---|
| Agent IA personnel | Prépare, résume, propose pour une personne | Agent IA | Jamais plus que sa personne ; signalé comme IA (AI Act, art. 50) |
| Chef d'orchestre d'agents | Coordonne plusieurs agents | Délégué | Ne donne pas à un agent un droit qu'il n'a pas ; journal |
| Gardien des consentements | Tient à jour qui a accepté quoi | Garant | Voit les consentements, pas les contenus |
| Responsable sécurité du projet | Vérifie les accès, révoque, répond aux incidents | Garant | Journal et liste des rôles ; pas les contenus |
| Auditeur d'IA | Vérifie ce que les agents ont proposé et fait | Contrôleur | Journal des agents ; borné dans le temps |
| Analyste des données | Mesure participation et fréquentation | Contrôleur | Totaux et tendances, jamais les noms |
| Vérificateur d'authenticité | Atteste qu'un contenu est authentique ou généré | Contrôleur | Marque, ne modifie rien |
| Médiateur numérique | Aide une personne peu à l'aise | Représentant | Avec son accord, session bornée |
| Régisseur hybride | Fait vivre un événement sur place et en ligne | Délégué | Le déroulé et les flux, pas les paiements |
| Animateur de communauté | Fait vivre l'espace public | Garant | Modère le public, n'accède pas au privé |
| Responsable impact | Mesure transport, déchets, énergie | Contrôleur | Données agrégées, sans noms |
| Coordinateur de soins | Organise l'accueil des besoins de santé | Contributeur | Seul à voir le canal santé, journal renforcé |
| Passeur de mémoire | Garde les traces après le jour J | Successeur | Lecture après une date ; consentements repris |

**Règle pour ajouter un rôle** : lui donner les six dimensions, le rattacher à une famille, et écrire son garde-fou avant de l'afficher dans un exemple.

## La Régie et le Studio

AIMESTUDIO a déjà un vrai socle de rôles côté serveur pour les espaces partagés. La Régie et le Studio n'ont aucun rôle : tout se passe dans le navigateur de la personne. Définir leurs rôles, c'est les brancher sur ce socle, pas en inventer un second.

### Ce qui existe (main, commit 52945d2)

- **Espaces partagés** (`api/_auth/espaces.mjs`, `synchroview/permissions.js`) : owner, editor, contributor, viewer, guest ; rôle lu en base, jamais dans la requête ; invitations à jeton aléatoire (empreinte seule gardée), usage unique, 7 jours, plafond ; la coordination n'invite que des lecteurs ou des invités ; documents lisibles par l'auteur ou sur autorisation ; refus par défaut ; profils distingués des rôles.
- **Propriétaire du site** (`api/_auth/proprietaire.mjs`) : liste d'identifiants dans une variable d'environnement, fermée par défaut ; protège le Cube Maître.
- **Régie** : aucune connexion ; publier = déposer `regie/site.json` ; comptabilité dans le navigateur seulement.
- **Studio** : aucune connexion ; 9 univers, ~17 packs métiers, badgeuse avec émargement, avis clients.

### Correspondance

| Rôle serveur | Famille | Ce qui manque |
|---|---|---|
| owner | Propriétaire | Co-propriétaire, successeur, transmission |
| editor | Délégué | Durée de la délégation |
| contributor | Contributeur | Portée par mission (partielle) |
| viewer | Contrôleur, observateur | Durée bornée |
| guest | Destinataire | Déjà bien borné |
| — | Public, financeur, représentant légal, successeur, agent IA, système | À ajouter quand un exemple en a besoin |

### Les rôles de la Régie

| Rôle | Famille | Portée | Gestes | Durée | Aujourd'hui |
|---|---|---|---|---|---|
| Propriétaire du site (Matt) | Propriétaire | Pages, réalisations, carrousels, orbe par site | Modifier, publier, restaurer | Permanente | Implicite : quiconque ouvre /regie/ |
| Gestion de l'entreprise | Propriétaire, sous-espace sensible | Devis, factures, avoirs, clients | Émettre, exporter | Permanente | Navigateur seul ; hors de tout partage |
| Collaborateur (graphiste, rédacteur) | Délégué | Réalisations, textes, médias ; jamais la comptabilité | Modifier, proposer une publication | Jusqu'à une date | N'existe pas |
| Expert-comptable | Contrôleur | Comptabilité, en lecture | Exporter | Jusqu'à la clôture | Un fichier exporté |
| Client | Destinataire | Son devis, sa facture | Lire, accepter | Jusqu'au paiement | Un PDF envoyé |
| Visiteur | Public | Le site publié | Lire, faire taire l'orbe | — | Existe (`site.json`) |
| L'orbe | Agent IA | Suggestions, site par site | Proposer | — | Trois niveaux d'autonomie, un « ? » par suggestion |

Règle : tant que la Régie n'a pas de connexion, elle reste mono-utilisateur et le dit (« cette page n'est pas protégée par un compte… »). Le jour où elle devient partageable, elle passe derrière le contrôle « propriétaire du site », et la comptabilité reste un espace séparé.

### Les rôles du Studio

| Rôle | Famille | Portée | Gestes | Vigilance |
|---|---|---|---|---|
| Auteur | Propriétaire | Le projet Studio et tous ses supports | Tous | — |
| Client commanditaire | Destinataire et valideur | Les épreuves de ses supports, pas l'atelier | Lire, commenter, valider | Bon à tirer daté et journalisé |
| Relecteur | Contrôleur | Les épreuves | Commenter | Borné dans le temps |
| Imprimeur, fabricant | Contributeur | Fichiers d'impression, quantités | Télécharger | Seulement ce qui est imprimé |
| Destinataire d'un support | Destinataire | Sa carte, son badge, son attestation | Lire | Lien à usage limité, par personne |
| Personne badgée | Destinataire | Ses propres pointages | Lire | Donnée personnelle ; information préalable |
| Responsable des pointages | Délégué | Les pointages de son groupe | Lire, exporter | Durée de conservation définie |
| Auteur d'un avis | Destinataire | Son avis | Écrire, retirer | Jamais d'avis inventé présenté comme réel |
| Écriture assistée | Agent IA | Le support en cours | Proposer | Signalée comme IA ; l'auteur valide |

### Ordre proposé

1. Ne rien partager tant que ce n'est pas branché sur le serveur : la Régie et le Studio restent locaux, et l'écran le dit.
2. Un projet Studio devient un espace (`spaces.kind = 'studio'`) avec les cinq rôles existants ; un support se partage par destinataire, jamais le projet entier.
3. La badgeuse passe sur la règle `personal` (soi-même ou l'organisation), export réservé au responsable, durée de conservation.
4. La Régie passe derrière le contrôle « propriétaire du site » ; la comptabilité reste à part.
5. Ajouter la durée et la preuve aux cinq rôles serveur ; puis les familles manquantes, une par exemple.

## Retour sur la réforme de l'Orbe

La page « L'Orbe, la matière des permissions » (Arena, lue le 23/10/2026) est la bonne direction : l'orbe devient la forme visible du rôle.

**À garder comme règle** : la profondeur, pas le badge ; ce qui n'est pas là n'est pas caché (le décompte peut être une fuite) ; l'ouverture se demande et se referme ; la santé jamais dans l'Orbe ; l'Orbe propose, l'humain valide ; le filtre de pertinence ; le jumeau textuel, le mouvement statique, le contraste renforcé.

| Ce que la page affirme | Ce que la page montre | Correction |
|---|---|---|
| Le silence est le défaut des invités | « 1 sur 5 · 4 jamais montrés » pour l'invitée | Pour l'invitée : « 1 document », sans total |
| Santé réservée au canal dédié | « Plan de table & allergies nominatives » chez le couple et la coordination | Plan de table d'un côté ; allergies par table, sans noms, pour le traiteur seul |
| « Deux personnes ne partagent pas la même empreinte » | Empreinte dérivée du projet et du rôle | Empreinte par rôle (et on le dit), ou la personne dans la graine |
| Français partout | Rôles en anglais (OWNER, EDITOR…) | Propriétaire, coordination, contribution, invité |

Ce qui est affirmé sans être encore vrai (« journal signé », « composition serveur avant DOM »…) se range sous deux colonnes : « ce que fait cette démo » et « l'architecture visée ». Données de démo : jamais de numéro de portable plausible ; les capacités techniques de la plateforme vont au Lab.

**Le lien avec cet audit** : l'Orbe est la forme visible des six dimensions — la portée donne la densité du noyau, les gestes les facettes ouvertes, la durée l'ouverture qui se referme, la preuve le registre. La couleur reste celle de la personne ; l'irisé reste l'orbe.

## Sources

- OWASP Top 10:2025 — A01 Broken Access Control
- OWASP API Security Top 10 2023 — API1, API3, API5, API6, API7
- OWASP Top 10 for LLM Applications 2025 — LLM01, LLM02, LLM06
- OWASP Top 10 for Agentic Applications — ASI01 à ASI10
- WEF, Future of Jobs Report 2025
- AI Act, article 50, applicable depuis le 2 août 2026
- Page « L'Orbe, la matière des permissions », Arena, 23/10/2026
- AIMESTUDIO : `vitrine/acces`, `synchroview/permissions.js`, `docs/QUI-VOIT-QUOI.md`, audit d'aime-passport
