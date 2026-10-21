# AIME · Générateur de site (`/sites/`)

Un site complet, page par page, construit avec le **moteur partagé** (`vitrine/rendu.js`), sur le même mécanisme que les pages d'événements et le Bureau. Le constructeur de mini-site de la landing n'est **pas touché**.

## Les couches

| Couche | Où | Ce qu'elle contient |
|---|---|---|
| **Données** | le site, format `aime-site`, gardé dans `localStorage` sous `aime-sites` | Les infos sont écrites une fois : titre, accroche, date, heure, lieu, adresse, ville, accès, e-mail, téléphone, lien et texte du bouton. S'y ajoutent 13 listes (programme, questions, personnes, galerie, documents, cadeaux, hébergements, menu, tarifs, chiffres, chronologie, liens, partenaires) et les pages avec leurs sections. |
| **Modèles** | `vitrine/modeles/sites.json` | Sept points de départ : mariage, fête, artisan, séminaire, portfolio, association, page blanche. Ils ne contiennent que des consignes, aucun contenu réel. |
| **Présentation** | `vitrine/presentation/studio.json` | Les 36 ambiances et les 10 typographies d'AIME Studio, reprises telles quelles. Le contraste du texte posé sur la couleur principale est calculé (WCAG). |
| **Perspectives** | `vitrine/perspectives/sites.json` | Public, invité, organisation. Une perspective **choisit** les sections à afficher ; **elle ne protège rien**. Tout ce qui est exporté peut être lu. |
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
