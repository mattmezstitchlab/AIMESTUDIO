# AIME · Générateur de site (`/sites/`)

Un site complet, page par page, construit avec le **moteur partagé** (`vitrine/rendu.js`), sur le même mécanisme que les pages d'événements et le Bureau. Le constructeur de mini-site de la landing n'est **pas touché**.

## Les couches

| Couche | Où | Ce qu'elle contient |
|---|---|---|
| **Données** | le site, format `aime-site`, gardé dans `localStorage` sous `aime-sites` | Les infos sont écrites une fois : titre, accroche, date, heure, lieu, adresse, ville, accès, e-mail, téléphone, lien et texte du bouton. S'y ajoutent 13 listes (programme, questions, personnes, galerie, documents, cadeaux, hébergements, menu, tarifs, chiffres, chronologie, liens, partenaires) et les pages avec leurs sections. |
| **Modèles** | `vitrine/modeles/sites.json` | Sept points de départ : mariage, fête, artisan, séminaire, portfolio, association, page blanche. Ils ne contiennent que des consignes, aucun contenu réel. |
| **Présentation** | `vitrine/presentation/studio.json` | Les 36 ambiances et les 10 typographies d'AIME Studio, reprises telles quelles. Le contraste du texte posé sur la couleur principale est calculé (WCAG). |
| **Vues et accès** | `vitrine/perspectives/sites.json` et `synchroview/permissions.js` | Six vues, qui reprennent les cartes de SynchroView : Public (sans compte), Participant (`guest`), Lecture seule (`viewer`), Pro (`contributor`), Coordinateur (`editor`) et Moi (`owner`). Chaque section et chaque ligne de liste a une audience : tout le monde, membres, équipe ou organisation. Ce que chaque vue voit, ce sont les **règles partagées** qui le décident (`item.read`), les mêmes que pour les espaces. Dans le navigateur, c'est un aperçu ; en ligne, c'est le serveur qui filtrera. **Un export en fichiers ne contient que la vue publique.** |
| **Moteur** | `vitrine/rendu.js`, `AIMEVitrine.site` (alias `AIMESite`) | 24 blocs en 6 familles, l'assemblage des pages et l'export. Il n'y a qu'un fichier moteur, et le test « moteur non dupliqué » le garantit. |
| **Éditeur** | `sites/` | Il gère la structure (pages, sections), le contenu, le style, l'historique et l'export. Il ne dessine rien lui-même : l'aperçu et l'export passent par le moteur. |

## Une information, écrite une fois
- **La date** des infos nourrit l'en-tête, le compte à rebours (qui fonctionne dans le site exporté) et le pied de page.
- **Le lieu** nourrit l'en-tête, le bloc Lieu (avec un lien vers le plan OpenStreetMap) et le Contact.
- **L'e-mail** reçoit les réponses (RSVP).
- **Le bouton principal** de l'en-tête mène à la section Réponse ou Contact quand aucun lien n'est donné.

## Les blocs
- **Structure** : en-tête (image pleine page, image à côté, affiche, typographique).
- **Texte** : paragraphe (simple, deux colonnes, lettrine), citation, bouton, séparateur.
- **Images et vidéo** : galerie (grille, mosaïque, bande défilante), image, vidéo (sous forme de lien : aucune intégration tierce).
- **Événement** : compte à rebours, programme (liste ou frise), lieu, réponse (RSVP), hébergement, menu, cadeaux, questions.
- **Personnes et contact** : personnes, contact, réseaux et liens.
- **Activité** : tarifs, chiffres, chronologie, partenaires, documents.

## Honnêteté et sécurité
- **Le formulaire de réponse** ouvre la messagerie de la personne qui répond, avec la réponse prête : rien n'est envoyé sans elle, et le site le dit.
- **Aucun paiement**, aucune collecte de données, aucun compte. Le livre d'or, la newsletter et l'inscription demandent un serveur ; ils viendront avec l'authentification.
- **Les liens** n'acceptent que `https`, `mailto`, `tel`, les ancres et les pages du site. `javascript:` et `data:` sont refusés.
- **Les images** acceptent une adresse `https` ou une image importée, réduite à 1 600 px en JPEG.
- **Tout ce qui est écrit est échappé**, et un test le vérifie avec du code injecté dans chaque champ.
- **Les chiffres** sont ceux que la personne saisit : l'éditeur n'en invente pas.

## Export
Deux actions séparées, depuis le 21/10/2026 (avant, le `.zip` public embarquait `site.aime.json`, c'est-à-dire tout le projet, réservé compris).

**Exporter pour publier** : la vue publique seulement (`AIMESite.exporterPublic`).
- **Le site** en `.zip` (`…publication.zip`) : une page HTML autonome par page visible du public, et un `LISEZ-MOI.txt` qui dit quoi publier. Aucun fichier de projet.
- **Une seule page** (`.html`), avec des ancres.
- Les sections et les lignes réservées (membres, équipe, organisation) ne sont pas dans les fichiers ; une page dont tout est réservé n'est pas exportée et disparaît de la navigation ; le nom interne du projet (« Nom du site, pour vous ») n'apparaît pas.
- Testé : des marqueurs privés dans des sections, des lignes de programme, de galerie (image comprise), de FAQ et dans une page entière sont absents de **tous** les fichiers exportés, noms de fichiers compris (`tests/site.test.cjs`), et d'un vrai `.zip` téléchargé dans Chromium.

**Sauvegarder mon projet** : tout, réimportable (`AIMESite.sauvegarde`).
- Un `.sauvegarde-privee.aime-site.json`, avec un champ `_avertissement` : il contient le réservé, il ne doit pas être publié.
- Il se réimporte par « Importer » ; testé : aller-retour identique, et la vue Organisation retrouve tout.
- Les polices viennent de Google Fonts, comme dans le Studio.

## Bureau
Le Bureau a un dossier « Sites ». Chaque site s'y rouvre (`/sites/?site=…`).

## Vérifié
- **`tests/site.test.cjs`, 8 tests** :
  - les modèles sont valides ;
  - les 36 ambiances sont présentes ;
  - une information se propage partout ;
  - le texte est échappé et les liens dangereux sont refusés ;
  - les perspectives filtrent les sections ;
  - tous les blocs se rendent, vides ou remplis ;
  - l'export produit une page par fichier ou une page unique ;
  - le Bureau voit les sites.
- **Parcours rejoué automatiquement** :
  - modèle Mariage ;
  - saisie des infos, puis le titre et le compte à rebours se mettent à jour (234 jours) ;
  - un clic dans l'aperçu sélectionne la section ;
  - ajouter une section, puis annuler ;
  - ambiance « Bleu nuit » ;
  - perspective Organisation (une note d'équipe apparaît) ;
  - export en une page et en `.zip` de 4 pages ;
  - dossier « Sites » dans le Bureau.
  
  Résultat : aucune erreur.
- **iPhone** : pas de défilement horizontal.

## Limites
- **Stockage local.** Les sites restent dans ce navigateur, et les photos importées prennent de la place : le stockage est limité à environ 5 Mo. L'éditeur prévient s'il est plein ; il faut alors exporter.
- **Pas de publication en ligne** : elle viendra avec les comptes.
- **Pas de glisser-déposer** : les sections se déplacent avec ↑ ↓.

## Rôles et SynchroView (21/10/2026)
- **« Voir comme »** dans l'aperçu : on passe d'une vue à l'autre parmi les six. La ligne du bas indique ce que la vue courante masque, et pourquoi (raison donnée par la règle).
- **Une audience par section** (« Qui voit cette section ») **et par ligne** : par exemple, un moment du programme réservé à l'équipe.
- **« Comparer les rôles »** ouvre SynchroView avec le site en quatre vues (Public, Participant, Pro, Coordinateur), défilement synchronisé.
  - Chaque vue est `/sites/vue/?site=…&mode=…`, avec le pont SynchroView.
  - Elle suit en direct les modifications faites dans le générateur.
- **SynchroView liste tous les sites générés** de ce navigateur, à côté des démonstrateurs.
- **Partir d'un démonstrateur** : Mariage, Séminaire ou AIME WORLD deviennent un site à modifier (`AIMESite.depuisVitrine`).
  - Les mêmes faits sont repris, et rien n'est inventé.
  - Les moments non publics deviennent des lignes « équipe ».
  - On y trouve une page Organisation réservée à l'organisation.
- **Vérifié** : sur AIME WORLD, la vue Public masque 2 sections et 20 lignes, la vue Participant 1 section et 1 ligne, la vue Pro 1 section, et la vue Coordinateur rien. Une modification du titre apparaît dans les quatre vues de SynchroView sans recharger. Aucune erreur.

## Grille libre, reprise du mini-site de la landing (21/10/2026)
Les idées du constructeur de la landing sont reprises ici. Le constructeur lui-même n'est pas touché ; il reste dans `aime/index.html`, et son audit est résumé plus bas.

- **Une page « Grille ».** On pose les blocs sur 12 colonnes.
  - On les glisse pour les déplacer et on les agrandit avec la poignée violette ; la hauteur suit la largeur (`RATIO`).
  - Un bloc déplacé garde sa place ; ceux qu'il recouvre descendent (`tasser`), donc aucun chevauchement.
  - On repasse en sections à tout moment, sans rien perdre.
- **Trois informations qui changent de forme avec leur largeur** (`FORMES`) :
  - **La date** : pastille J-x (moins de 4 colonnes), compte à rebours (4 à 5), calendrier du mois (6 à 8), frise du jour (9 et plus).
  - **Le lieu** : nom, puis carte (dès 5 colonnes), puis itinéraire avec un lien OpenStreetMap (dès 8).
  - **Les personnes** : avatars, puis équipe (dès 5 colonnes), puis réseau (dès 9).
- **Le plan B pluie.** Le bouton Soleil / Pluie bascule `infos.pluie`. Alors :
  - chaque moment du programme affiche sa variante « pluie » ;
  - le lieu et l'en-tête affichent le plan B.
- **L'onde.** Changer une information allume les blocs qui l'affichent (`DEPS`) et propose « N blocs mis à jour · Annuler ».
- **Un nouveau modèle, « Mini-site libre ».**
- **Les rôles s'appliquent aussi en grille.** Chaque bloc et chaque ligne a son public.

### Ce qui n'est pas repris du mini-site de la landing, et pourquoi
- **Les blocs « Lab »** (menu radial, document vivant, réglage de couleur, anticipation, cubes, globe) : ce sont des démonstrations de la landing, pas des blocs de site.
- **La face « code »** des blocs : elle montre des balises fictives.
- **« Publier »** : simulé dans la landing. Ici, il viendra avec les comptes.

Points relevés dans la landing, sans y toucher : les boutons Mariage / Pro / Fête du constructeur n'ont pas d'écouteur, et le bloc i-noms n'a pas de rendu.

## Régénérer un site, et les gestes de la landing (21/10/2026)
### Importer, sur l'accueil du générateur ou avec « Importer »
- **Le mini-site de la landing** (`.aime.json` exporté depuis « Votre site ») : fidèle, avec `AIMESite.depuisMiniSite`.
  - Sont repris les blocs, leur position sur la grille, leur style (teinte, arrondi, empattement, taille), le programme avec ses variantes pluie, les personnes et les photos.
  - Les blocs de démonstration (menu radial, cubes, globe…) sont signalés comme non repris.
- **Un projet d'AIME Studio** gardé dans ce navigateur : fidèle, avec `AIMESite.depuisStudio`.
  - Sont repris les textes, l'ambiance (la marque du projet), le programme (pour un événement) ou les tarifs (pour une offre), les personnes et le contact.
- **Un dossier ou un .zip de site HTML**, avec `sites/importer.js`. Il faut d'abord confirmer : « Ce site m'appartient, ou j'ai l'autorisation de le reprendre ».
  - La lecture se fait par règles fixes, sans IA :
    - chaque `.html` devient une page (12 au plus) ;
    - chaque `h2` devient une section, classée par son titre et son contenu ;
    - les dates, adresses, e-mails, téléphones, horaires, prix et questions sont reconnus ;
    - les images du dossier vont dans la galerie, réduites ;
    - les couleurs et polices donnent l'ambiance et la typographie les plus proches.
  - Les scripts, iframes, formulaires et vidéos du site d'origine sont ignorés, pour la sécurité, et le compte rendu le dit. Rien n'est jamais exécuté : le HTML est lu par `DOMParser`, et le site est recomposé avec les blocs AIME.
  - Les images hébergées ailleurs ne sont pas reprises.
  - **Ce n'est pas une copie fidèle** : la mise en page d'origine n'est pas reproduite, et le compte rendu le rappelle.
- **Limites** (`AIMEImport.LIMITES`, vérifiées avant toute lecture) :

  | Limite | Valeur | Si elle est dépassée |
  |---|---|---|
  | Taille de l'archive `.zip` | 25 Mo | refus, avant même de charger JSZip |
  | Nombre de fichiers | 400 | refus |
  | Volume décompressé (fichiers retenus) | 60 Mo | refus, d'après les tailles déclarées, puis revérifié fichier par fichier |
  | Une page HTML | 2 Mo | page ignorée |
  | Une feuille CSS | 1 Mo | ignorée |
  | Une image | 8 Mo | ignorée |
  | Pages / images reprises | 12 / 24 | le surplus est ignoré |

  - Une archive n'est décompressée qu'après ce tri, un fichier à la fois, avec contrôle CRC ; un fichier plus gros que déclaré est écarté.
  - Sont écartés sans être ouverts : les chemins suspects (`..`, absolus, `C:`, barre inverse, caractère nul, plus de 240 caractères ; c'est le nom d'origine qui est jugé, pas celui que JSZip assainit), les fichiers actifs (`.js`, `.php`, `.sh`, `.exe`, `.wasm`…), les SVG (ils peuvent contenir du code), les fichiers cachés.
  - Dans les pages, les attributs actifs (`onclick`, `javascript:`), les redirections `meta` et `base` sont comptés et ignorés.
  - En cas d'erreur : un message clair (« Rien n'a été importé », « Votre site en cours n'a pas été modifié »). L'import crée toujours un **nouveau** site : le site en cours n'est jamais touché. Un seul import à la fois.
- **Chaque import affiche un compte rendu en quatre catégories** : reconnu, transformé (images recompressées, couleurs et polices rapprochées), ignoré (avec la raison), à vérifier (date retenue, titres sans contenu, mise en page non reproduite).
- **Vérifié dans Chromium (21/10/2026)** : archive de 26 Mo refusée ; archive de 70 Ko qui ferait 71 Mo décompressée refusée sans décompression ; archive piégée (`../../evil.html`, `.js`, `.svg`, `onclick`, `javascript:`, script, iframe) : tout est écarté et listé ; dans les deux refus, le stockage est resté identique octet pour octet.
- **Vérifié sur un site d'exemple** (2 pages, programme, tarifs, accès, FAQ, contact, 2 images, CSS) :
  - date, adresse, e-mail, téléphone, 3 horaires, 2 tarifs, 2 questions et 2 images sont retrouvés ;
  - la police Playfair est reconnue ;
  - 1 script et 1 iframe sont ignorés.

### Les gestes de la landing, dans la grille libre
- **Glisser un module** du catalogue jusque sur la grille, avec un cadre qui montre où il va se poser. Un simple clic le pose à la première place libre.
- **Quatre poignées** pour agrandir par n'importe quel coin, le coin opposé restant fixe.
- **Repères verts** quand un bord s'aligne sur celui d'un autre bloc.
- **Une petite barre sur le bloc choisi** : Teinte (+45°), Arrondi (0, 12 ou 26), Serif ou Sans, A− / A+, Dupliquer, Neutre, Retirer.

## Le « + », comme sur la landing (21/10/2026)
- Un bouton rond « + » en bas à gauche de l'aperçu ouvre le même panneau que le mini-site de la landing :
  - **Vos informations** : titre, accroche, date, heure, lieu, adresse, ville, accès, plan B, e-mail, téléphone, bouton, en tuiles à remplir directement. L'aperçu suit à la frappe.
  - **Les blocs**, en familles de six au plus, avec une icône chacun :
    - Présenter, Organiser et Relier reprennent les familles de la landing ;
    - Compléter et Activité rangent les blocs que la landing n'a pas.
- Toucher une tuile pose le bloc, et le panneau reste ouvert pour enchaîner. En grille libre, on peut aussi glisser la tuile à sa place : le panneau s'efface pendant le geste.
- « Échap » ou × referme le panneau, et le focus revient au « + ». Le bouton « + Ajouter un bloc » de la colonne ouvre le même panneau, directement sur les blocs.
- Testé : chaque bloc du moteur est dans une famille, une seule fois, avec son icône (`tests/site.test.cjs`). Vérifié dans Chromium (serveur local), à 1440 px et à 390 px : saisie, ajout au toucher, glisser en grille, clavier, aucun débordement.

## Les supports du Studio, en blocs web (21/10/2026)
- Parmi les 96 supports du Studio, beaucoup sont faits pour l'impression. Ceux qui ont un sens sur une page web sont devenus 15 vrais blocs du moteur (`vitrine/rendu.js`). Ils lisent les informations écrites une fois (titre, date, lieu, contact) et sept nouvelles listes : `tables`, `messages`, `credits`, `allergenes`, `setlist`, `orientation`, `consignes`.
  - **Annoncer** : Faire-part (Arche, Classique, Réservez la date, Hommage), Monogramme (initiales du titre), Remerciements (carte, ou récap avec les photos de la galerie), Livre d'or, « Ils ont fait ce jour » (crédits), Carte de visite.
  - **Accueillir** : Bienvenue, Plan de table, Orientation (flèches), Sans téléphone, Partagez vos photos, Billet.
  - **Informer** (avec Tarifs, Chiffres et Chronologie) : Allergènes (un vrai tableau), Setlist, Facile à lire.
- Ils sont tous dans le « + », en familles de six. Ils suivent l'ambiance du site et se placent dans la grille libre, et ils sont échappés et testés comme les autres blocs.
- Écartés pour l'instant, faute de sens sur le web : enveloppe, bracelet, étiquette de tireuse, DPE, set de table, marque-place, papier à en-tête, etc.

## Design system « LE MONDE AIME » (21/10/2026)
- L'interface du générateur porte maintenant le design system du dépôt `lemondeaimedesignsystem` (révision 3634a31). La preview Vercel de ce dépôt est protégée par une connexion, donc la source utilisée est le dépôt lui-même.
- Ce qui est repris :
  - le fond blanc et `#F7F8F8`, l'encre `#161616`, le texte secondaire `#62666B` ;
  - les accents pétrole, turquoise et vert d'eau, et le focus `#127E83` ;
  - DM Sans pour le texte et Manrope pour les titres ;
  - les boutons principaux noirs en pilule, les puces grises, la sélection turquoise ;
  - le gradient signature, réservé à l'orbe du « + ».
- Le fichier est `sites/theme-monde-aime.css`, limité à `body.gen`, comme sa documentation le demande (« ne pas importer la feuille entière »). Les sites générés gardent leurs ambiances, et le panneau Explorer reste celui de tout le site.
