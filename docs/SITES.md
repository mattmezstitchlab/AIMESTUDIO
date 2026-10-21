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
- **Le site** en `.zip` : une page HTML autonome par page, `site.aime.json` (qui se réimporte) et un LISEZ-MOI.
- **Une seule page** (`.html`), avec des ancres.
- **Les données** (`.json`).
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
  - Les scripts, iframes, formulaires et vidéos du site d'origine sont ignorés, pour la sécurité, et le compte rendu le dit.
  - Les images hébergées ailleurs ne sont pas reprises.
- **Chaque import affiche un compte rendu** : ce qui a été reconnu, et ce qui ne l'a pas été.
- **Vérifié sur un site d'exemple** (2 pages, programme, tarifs, accès, FAQ, contact, 2 images, CSS) :
  - date, adresse, e-mail, téléphone, 3 horaires, 2 tarifs, 2 questions et 2 images sont retrouvés ;
  - la police Playfair est reconnue ;
  - 1 script et 1 iframe sont ignorés.

### Les gestes de la landing, dans la grille libre
- **Glisser un module** du catalogue jusque sur la grille, avec un cadre qui montre où il va se poser. Un simple clic le pose à la première place libre.
- **Quatre poignées** pour agrandir par n'importe quel coin, le coin opposé restant fixe.
- **Repères verts** quand un bord s'aligne sur celui d'un autre bloc.
- **Une petite barre sur le bloc choisi** : Teinte (+45°), Arrondi (0, 12 ou 26), Serif ou Sans, A− / A+, Dupliquer, Neutre, Retirer.
