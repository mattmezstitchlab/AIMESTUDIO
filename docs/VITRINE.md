# AIME · Vitrine d'expériences et bibliothèque de modèles — audit et plan

Statut : **proposition, rien n'est construit.** `main` et `/tout/` non touchés. Branche proposée : `vitrine`, créée depuis `synchroview` (elle a besoin des vues libres) pour isoler le travail commercial.

## 1. Audit : composants de mini-site existants

### A. Le constructeur de mini-site de la landing (`index.html`, section « Votre site »)
| Composant | Où | Constat |
|---|---|---|
| 42 types de blocs (héro, média, texte, galerie, citation, bouton, agenda, programme, lieu, compte à rebours, réponse, FAQ, contact, paiement, documents, cadeaux, réseaux, livre d'or, faire-part, personnes, date, lieu…) | `var M` l.1449 | Catalogue riche, déjà connu des utilisateurs |
| Grille 12 colonnes, blocs `{type, x, y, largeur}`, hauteur selon le type | `add`, `hOf`, `layout` | Le format de mise en page est simple et sérialisable |
| Contenu `P` : `title, sub, date, iso, place, who, text, quote, cta, url, prog[], people[], photos[], banner, video` | `PRE` l.1455 | **Un seul objet par site**, mais copié dans chaque version de mode (moi, pro, proche, coord, perso) : contenu dupliqué |
| Propagation d'une donnée vers tous les blocs qui l'utilisent | `DEPS` l.1637 | Bonne idée à garder (une donnée, plusieurs affichages) |
| Formes qui changent selon la largeur (date, lieu, personnes) | `FORMS` l.1451 | Réutilisable |
| Export HTML et JSON | `#exh5`, `#imp5` | Export brut, sans thème |
| Rendu `front(k)` | l.1468 | **Couplé** : lit l'objet global `P`, styles fixés dans la feuille de la landing (fond sombre AIME), pas de jetons de thème. Fait pour l'éditeur, pas pour une page publique soignée. |

### B. AIME Studio (`studio/index.html`, 5 522 l., maintenu par la session Studio ; `web/`, `accessibilite/`, `buro/`, `stitchlab/`, `image/` sont la même application)
| Composant | Où | Constat |
|---|---|---|
| **Séparation contenu / marque** : `v.d` (contenu) et `v.b` (couleurs, papier, encre, police, motif, rayon) | l.1438-1448 | Exactement la séparation demandée |
| `themeVars` : marque → variables CSS avec correction de contraste | l.1465-1467 | ~3 lignes, à reprendre |
| 36 ambiances (`AMBS`), dont mariage (sauge, champagne, terracotta, nuit, bohème, luxe) et entreprise (navy, tech, encre) ; 10 polices dont Bodoni, Fraunces, Playfair, Italiana | l.1115-1162 | Base de « paramètres de présentation » |
| 40 packs par univers (`mariage`, `conf`, `entreprise`…) : libellés, microcopie, phases (annonce, J-n, jour J, merci), exemples | l.1169-1431 | Pas de pack « séminaire » : partir de `conf` |
| Générateur de site multipage `siteDoc` + blocs `webBlocks0` + plan `sitePlan` + feuille `WEB_CSS` | l.1567-1714 | Le cœur réutilisable, rendu possible depuis un simple JSON (avec un DOM) |
| ~150 formats imprimés et numériques (menu, programme, badge, carte de table, signalétique…) | `FL`, `TPL` | Utiles pour les « supports intégrés » plus tard |
| Rôles fictifs détaillés mariage et « séminaire 250 participants » (`orga` / `par` / `pub`) | `OS_D` l.5222-5328 | **Seules données de perspectives existantes**, sans rendu ; pas de coordinateur |
| Couplages | `P`, `LOGO`, `QR`, polices chargées depuis Google Fonts | Extraire par copie de portions, pas en appelant le Studio |

### C. SynchroView (branche `synchroview`)
Vues libres (page × carte × format × version), pont, repères par sections (`data-sv`), inspection, compositions, démo des droits avec `permissions.js` (actions `read`, `edit`, `pay`… par ressource). Prêt à accueillir de nouvelles pages : il suffit qu'elles chargent le pont et déclarent leurs sections.

### D. Catalogues `univers.json` et `moteurs.json`
Inventaire de modules de plusieurs dépôts (ex. mariage : « liste d'invités → invitation → RSVP → régimes → plan de table → brief traiteur »). Utile pour **le contenu et les parcours** des démonstrateurs, pas pour le rendu.

## 2. Ce qui manque
1. **La notion de perspective n'existe nulle part dans le rendu** (ni landing, ni Studio). Il faut la créer.
2. **Coordinateur** (mariage) et **coordinateur logistique / intervenant** (séminaire) : absents des données, à écrire.
3. **Un rendu public éditorial** : le mini-site de la landing est un éditeur sombre ; le Studio a le bon modèle mais une direction graphique « supports ».
4. **Visuels pleine largeur** : aucune photographie sous licence dans le dépôt.
5. **Polices premium hébergées sur le site** : le Studio les charge depuis Google Fonts ; la landing n'héberge que Cal Sans et Inter.

## 3. Architecture minimale : cinq couches séparées

```
vitrine/
  donnees/mariage.json        ← contenu métier, UNE fois (événement, programme, personnes, documents, menu, galerie, FAQ)
  donnees/seminaire.json
  perspectives/mariage.json   ← 4 angles : sections, filtres, actions, microcopie
  perspectives/seminaire.json
  modeles/<id>/modele.json    ← template graphique : sections et variantes de mise en page, jetons de design, gratuit/premium, univers, packs
  rendu.js                    ← une fonction pure : rendre(contenu, perspective, modèle, présentation) → page
  site/index.html             ← le mini-site public : ?u=mariage&p=invite&m=editorial&amb=sauge
  mariage/ · seminaire/       ← landings éditoriales
  modeles/index.html          ← la bibliothèque
synchroview/permissions.js    ← inchangé : les actions des perspectives y renvoient par identifiant
```

| Couche | Contient | Ne contient pas |
|---|---|---|
| **Contenu métier** | les faits : date, lieu, moments (avec leur public : tous, invités, équipe, intervenants), personnes, documents (avec qui y a droit), menu, galerie | aucune mise en forme, aucun texte propre à un angle |
| **Perspective** (angle d'un événement) | quelles sections, dans quel ordre ; quels moments et documents montrer ; quelles actions proposer ; les titres et boutons (« Répondre » pour un invité, « Mon planning d'intervention » pour un intervenant) | aucune donnée dupliquée ; aucun droit |
| **Carte d'usage** (Moi, Pro, Participant, Coordinateur) | le mode de la personne dans le produit AIME, indépendant de l'événement | — |
| **Permissions** | ce qu'une identité a le droit de faire (`permissions.js`) | rien d'affichage |
| **Modèle graphique** | sections disponibles et leurs variantes, grille, jetons (échelle typographique, espacements, traitement d'image) | aucun contenu |
| **Présentation** | les réglages d'une instance : ambiance, polices, densité, visuel du héro | — |

Carte ≠ perspective ≠ rôle : une personne en carte **Pro** peut être *prestataire* d'un mariage et *intervenante* d'un séminaire ; une perspective publique ne demande ni compte ni rôle technique. Quand une identité existe, une action de perspective (`payer`, `voir le document`) est soumise à `permissions.js` ; sans identité (vitrine publique), elle reste une démonstration.

### Les perspectives prévues
| Mariage (Léa & Marc, fictif) | Séminaire (entreprise fictive, ex. « Maison Orée ») |
|---|---|
| **Couple organisateur** : tout le programme, budget, prestataires, réponses, documents signés | **Organisateur** : programme complet, inscriptions, budget, intervenants |
| **Prestataire** : ses créneaux, accès, contacts, son contrat, la fiche technique | **Intervenant** : son créneau, sa salle, le matériel, son contrat, la consigne de support |
| **Invité / Participant** : programme public, lieu, hébergement, réponse, menu, cadeaux, galerie | **Participant** : programme, ateliers, inscription, plan d'accès, badge, documents publics |
| **Coordinateur** : déroulé minute par minute, équipe, plan B, contacts d'urgence | **Coordinateur logistique** : salles, transports, restauration, signalétique, plan B |

### Composants de section (communs aux deux univers)
héro · programme (filtré par public) · personnes / intervenants · lieu et accès · documents autorisés · galerie · menu · réponse / inscription · FAQ · contact · compte à rebours · barre d'actions. Environ 12 composants, chacun avec 2 ou 3 variantes de mise en page. Repris des blocs de la landing pour la liste et des principes du Studio pour le thème, réécrits pour un rendu public.

### Intégration à SynchroView
Chaque page déclare ses **angles** : le site AIME (cartes d'usage), la démo des droits (cartes), Mariage et Séminaire (leurs 4 perspectives). Le sélecteur « Carte » d'une vue devient « Angle ». Une adresse comme `v=mariage.invite.iphone.ici,…&m=editorial` ouvre la comparaison. Rien d'autre ne change dans SynchroView.

### Bibliothèque de modèles
Catalogue `modeles/*/modele.json` : univers, gratuit / premium (simple étiquette), description, sections, variantes, packs (ex. « Mariage champêtre » = modèle + ambiance + polices + sections). Aperçus = vrai rendu dans une vue réduite (pas d'images à maintenir). Fiche par modèle. Bouton « Prévisualiser dans SynchroView » → les 4 perspectives avec ce modèle. **Aucun paiement.**

## 4. Plan d'implémentation (branche `vitrine`)
| Étape | Contenu | Critère d'acceptation |
|---|---|---|
| 1 | Données `mariage.json` + perspectives + `rendu.js` + 1 modèle éditorial + `site/` ; branchement SynchroView (angles) | Les 4 perspectives du mariage côte à côte : sections, contenus et actions différents ; données écrites une seule fois (vérifié par test) |
| 2 | Séminaire avec le **même** moteur et le même modèle | Aucun code propre au séminaire hors données et perspectives |
| 3 | Deuxième et troisième modèles (variantes de mise en page, ambiances) ; paramètres de présentation dans l'adresse | Changer de modèle ne touche ni données ni perspectives (test) |
| 4 | Landings éditoriales Mariage et Séminaire, bouton « Voir les 4 expériences » | Compréhensible sans explication technique ; responsive ; accessible |
| 5 | Bibliothèque : catégories, gratuit/premium, aperçus, fiches, variantes, packs, prévisualisation SynchroView | Tout aperçu est un vrai rendu ; aucun paiement |

## 5. Décisions à prendre
1. **Visuels** : photographies sous licence (à fournir ou acheter) ou visuels génératifs AIME (dégradés, motifs) en attendant.
2. **Polices premium** : en héberger 1 ou 2 sur le site (ex. Fraunces, Playfair, déjà utilisées par le Studio, licence libre).
3. **Studio** : il est maintenu par une autre session. Proposition : **ne pas le modifier**, reprendre par copie ses principes (séparation contenu/marque, `themeVars`, ambiances) et ses données d'exemple, en le signalant à la session Studio pour une convergence plus tard.
4. **Données fictives** : garder « Léa & Marc » pour le mariage (déjà dans la démo et la landing) ; nom de l'entreprise fictive du séminaire.
5. **Modèles de départ** : 3 proposés (Éditorial gratuit, deux premium), à valider.
6. **Branche** : créer `vitrine` depuis `synchroview`.

## 5. Avancement (branche `vitrine`)

### Étape 1 · Mariage — fait
Léa & Marc, quatre perspectives, une seule source, modèle Éditorial, intégré à SynchroView.

### Étape 2 · Maison Orée (séminaire) — fait
- **Même moteur** `vitrine/rendu.js`, aucun code propre à l'entreprise. Ajouts **uniquement** : `donnees/seminaire.json`, `acces/seminaire.json`, `perspectives/seminaire.json`, l'ambiance « Pierre » et le choix d'ambiance par univers (présentation).
- Pour que le moteur reste universel, il a été **généralisé** (et le mariage passe toujours ses tests) :
  - toute la microcopie propre à un univers est sortie du moteur vers les perspectives (`libelles`) ;
  - un composant générique `liste` affiche n'importe quelle collection du contenu (salles, matériel, incidents, décisions, ateliers) ;
  - une règle d'accès générique `item` (audience : public, membres, équipe, organisation) filtre ces collections ;
  - les documents, paiements, urgences et listes **pointent** une personne au lieu de recopier son nom ;
  - le visuel génératif a deux natures : organique (mariage) et architecture (entreprise).
- Perspectives : Organisateur (Claire Morel), Intervenant (Inès Garnier), Participant (Hugo Lambert), Coordinateur logistique (Julien Petit).
- **SynchroView** : Maison Orée dans le choix des pages ; les perspectives sont lues dans leurs fichiers (plus de liste recopiée dans SynchroView) ; synchronisation améliorée quand une vue n'a pas la section : elle va à la frontière de la section commune la plus proche (fin de la précédente ou début de la suivante) au lieu d'un pourcentage. Les pages dont toutes les sections sont communes (le site AIME) ne changent pas de comportement.
