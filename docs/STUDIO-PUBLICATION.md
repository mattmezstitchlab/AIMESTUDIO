# Studio Publication (lot M1)

**Une matière. Un Canevas. Plusieurs formes.** Le Studio Publication est le Canevas ouvert sur une publication : magazine, catalogue, portfolio, dossier, rapport, livret ou support de formation. Ce n'est ni une application ni un moteur de plus.

## Pièces

| Fichier | Rôle |
|---|---|
| `vitrine/rendu.js` | Le moteur de pages, qui reste le seul. Il gagne :<br>• un registre de modes de page (`declarerMode`) ;<br>• une liste par section (`liste`) ;<br>• l'image avec cadrage, repères, `alt`, `legende` et `ratio` ;<br>• l'accent `*mot*`, seulement dans une planche ;<br>• les étapes numérotées ;<br>• des variables de surface et de police mono tirées du Design System.<br>Un site existant rend **à l'octet près** comme avant, et un test le vérifie. |
| `publication/planche.js` | Le mode « planche » (`AIMEPlanche`) : doubles pages, grille, fonds, folios, sommaire et ordre de lecture. Il ajoute aussi les blocs Titraille, Encadré, Folio, Sommaire et Comparaison, déclarés dans le catalogue commun. |
| `publication/gabarits.js` | Les 8 gabarits et les opérations sur les pages (`AIMEPublication`) : appliquer un gabarit, créer, ajouter, dupliquer, réordonner, retirer, déplacer un bloc, vérifier. |
| `canevas/adaptateurs/publication.js`, `.css` | Le Studio dans le Canevas, organisé en quatre espaces (ci-dessous). |
| `publication/index.html`, `lecture.js` | La lecture : la vue publique, sur ordinateur ou sur téléphone. |
| `publication/exemples/aime-magazine-temoins.aime-site.json` | Les trois doubles pages témoins, construites avec l'outil. |
| `sites/bibliotheque/ecran-*.webp` | Quatre écrans d'AIME, capturés avec des données fictives (catégorie « Écrans d'AIME »). |

## Modèle

- **Publication.** `site.publication = {format:{l:3,h:4}, numero, date}`.
- **Page.** `page = {mode:'planche', pages:1|2, gabarit, fonds:[jeton, jeton], rubrique, sommaire}`.
- **Bloc dans une page.** `section` reçoit `place:{p,x,y,w,h,z}`, `lecture`, `verrou`, `role`, `ton`, `aligne`, `taille`, et pour une image `cadrage`, `reperes`, `ratio`, `voile`.
- **Grille.** C'est la Grille universelle d'AIMEPROJET : 12 colonnes × 16 rangées par page. Sur une page 3:4, chaque case est carrée.
- **Ordre de lecture.** `lecture` donne l'ordre du DOM : celui du lecteur d'écran, et celui de la lecture en colonne sur téléphone ou tablette (moins de 1024 px). Rien n'est réduit.
- **Réserve.** Un bloc sans `place` est en réserve : il est gardé et listé dans la structure, mais jamais publié.
- **Hiérarchie des styles :**
  1. **Design System** (jetons, pour toute la publication) ;
  2. **page** (fond par page, parmi des jetons) ;
  3. **bloc** (style, ton, alignement, taille de 0,7 à 1,5).

  Une surcharge ne porte jamais de valeur libre.

## Repris et adapté

- **AIMEPROJET**
  - La grille de 12 × 16, ses emplacements typés et ses familles (Axe, Cadre, Flux, Partition, Rupture, Trame).
  - L'affectation par rôle et le principe « rien n'est perdu » : ce qui n'est pas placé passe en réserve, au lieu d'être empilé.
- **METAMORPHOSE**
  - Le recadrage par point d'intérêt (x et y de 0 à 100 %) et zoom (100 à 230 %).
  - Le verrou : un bloc verrouillé garde sa place quand on change de gabarit.
- **Canevas et #55**
  - Le cadre de sélection et les gestes au clavier de l'adaptateur mini-site.
  - Les Design Systems : pointeur, annulation et empreinte du contenu.

Le code d'origine n'a été recopié nulle part.

## Le Studio

On l'ouvre à `/canevas/?publication=nouvelle`, à `?publication=<id>` ou à `?publication=exemple-aime-magazine`. Un Canevas vide propose les deux premiers liens.

- **Structure** (à gauche), en cinq onglets :
  - **Pages** : les pages, avec les blocs de la page courante dans l'ordre de lecture, réserve comprise.
  - **Gabarits** et **Blocs**.
  - **Médias** : la bibliothèque d'AIME, sans adresse libre.
  - **Styles**.
- **Composition** (au centre) : le vrai rendu du moteur.
  - La grille et les marges s'affichent ou se masquent ; « Ajuster » ou « 100 % » règle le zoom.
  - On sélectionne au clic ou depuis la structure.
  - On déplace et dimensionne à la souris, au doigt ou au clavier : flèches, Maj + flèches, Page haut et Page bas pour passer devant ou derrière, Entrée, Échap.
  - Un bloc dont le contenu dépasse de son emplacement est signalé.
- **Propriétés** (à droite) :
  - **Bloc** : textes, style, ton, alignement, taille, place, verrou, ordre de lecture ; pour une image, texte alternatif, légende, cadrage, voile et repères ; actions dupliquer, mettre en réserve, supprimer.
  - **Page** : titre, rubrique, fonds, présence au sommaire.
  - **Publication** : titre ; Design System avec annulation et retour à l'origine, l'empreinte du contenu étant vérifiée.
- **Chemin de fer** (en bas) : sélectionner, ajouter selon un gabarit, dupliquer, avancer, reculer, retirer (avec confirmation). La couverture reste en tête.
- **Barre :**
  - « Enregistrer » range la publication dans `aime-sites`, après vérification.
  - « Annuler » revient à la dernière version enregistrée.
  - « Défaire » (ou Ctrl Z) remonte les 40 derniers gestes.
  - « Aperçu » montre la publication sur ordinateur ou sur téléphone, sans enregistrer.
  - « Lire » ouvre `/publication/?id=…`.

## Sécurité, droits, publication

- **Textes.** Ils sont échappés. Le seul balisage accepté est `*mot*`, transformé après échappement.
- **Adresses.** Les images viennent de la bibliothèque (`biblio:<id>`) et les liens passent par le filtre `lien()` du moteur. Aucune adresse libre et aucun script.
- **Comparaison des Design Systems.** Elle est rendue en direct depuis le catalogue validé. Un système altéré est écarté.
- **Export.** `AIMESite.exporter` produit un seul `index.html` avec la vue publique : ni sections réservées, ni réserve, ni marques d'édition.
- **Régie.** Elle n'est pas modifiée et ne charge rien de tout cela.

## Licences des médias : à régler avant toute publication publique

- **Les photos de `sites/bibliotheque/`** viennent du dépôt MINISITEWEDDING.
  - Leur licence n'est pas enregistrée.
  - La revue juridique de ce dépôt (`docs/revue-juridique.md`, §5) dit qu'elles proviennent « d'un dossier local, sans crédit affiché », et qu'il faut les créditer ou les remplacer avant une mise en ligne publique.
  - `vitrine/PROVENANCE.md` demande auteur, licence et date pour toute photographie.
  - **Les témoins en utilisent trois.** Ils peuvent servir en aperçu privé, mais pas en publication publique tant que ce point n'est pas réglé.
- **Les écrans `ecran-*.webp`** sont des captures d'AIME avec des données inventées, sans droit de tiers.

## Hors de M1

Les douze rubriques du n° 001, l'Orbe, les parcours, les quiz, Infinity et Academy ne sont pas construits.

Le modèle est prêt à les recevoir :
- des rôles explicites ;
- un ordre de lecture ;
- des blocs déclarés dans le catalogue commun.

Il manque aussi :
- un bloc qui s'étende sur les deux pages d'une double page (aujourd'hui, un emplacement reste dans sa page) ;
- les notes de relecture du Canevas sur une planche ;
- les pages de catalogue répétées à partir de données.
