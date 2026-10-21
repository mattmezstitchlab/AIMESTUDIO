# La régie (`/regie/`)

L'espace d'administration du site : une page, sept vues. Elle n'est pas indexée et ne publie rien toute seule.

| Vue | Ce qu'on y fait |
|---|---|
| Pages et arborescence | Toutes les pages, rangées comme le menu Explorer (`nav/registre.js`), avec leurs réglages. |
| Édition sur la page | La page s'ouvre dans un cadre (`?regie=edition`) : on pose un iPhone, un iPad ou un MacBook, on le glisse, on le redimensionne (rond violet), on choisit ce qu'il affiche (bibliothèque de visuels, image ou vidéo importée, page du site, adresse https). « Mode texte » : un clic sur un texte de la page permet de le remplacer (texte seul). Trois largeurs d'aperçu. |
| L'orbe, site par site | Réglage par défaut + réglage propre à un site : absente, bouton d'orbe (phrase d'accueil, jusqu'à 6 suggestions), compagnon (options du laboratoire `/lab/orb/`), ou les deux. |
| Devis et factures | Devis → facture → avoir, numérotation `D-AAAA-NNN`, `F-AAAA-NNN`, `A-AAAA-NNN` continue et chronologique, document figé à l'émission (client et émetteur copiés), impression ou PDF par le navigateur. |
| Clients | Coordonnées reprises sur les documents. |
| Mon entreprise | Nom, EI, adresse, SIREN/SIRET, IBAN/BIC, mentions (TVA art. 293 B, pénalités, indemnité de 40 €…). À faire valider par l'expert-comptable. |
| Publier et sauvegarder | Télécharger `site.json` (ou le paquet .zip avec les médias), importer, revenir à la version publiée ; exporter/restaurer la sauvegarde de la comptabilité. |

## Où vivent les données

- **Configuration du site** : brouillon dans `localStorage` (`aime-regie-brouillon`), médias importés dans IndexedDB (`aime-regie`). La version publique est `regie/site.json` (+ `regie/medias/`). Publier = déposer ces fichiers dans le dépôt et fusionner.
- **Comptabilité** : `localStorage` (`aime-regie-compta`) seulement, jamais envoyée sur le réseau, jamais dans `site.json`. Sauvegarde = fichier `.json` exporté par l'utilisateur. Une sauvegarde illisible est mise de côté, jamais effacée.
- **Aperçu de mes réglages** : la case en haut de la régie fait voir le brouillon sur le vrai site, dans ce navigateur seulement.

## Sur les pages

`regie/scene.js` est chargé par la Page Zéro, AIME Studio, le G44 LAB, Stitch, le générateur, AIME WORLD et Le Monde AIME. Il applique `regie/site.json` : appareils (CSS pur), textes, orbe. Tout est assaini par `regie/donnees.js` (types connus, nombres bornés, adresses limitées aux chemins du site, à la bibliothèque, aux médias importés et au https ; texte seul, jamais de HTML). Sur la Page Zéro, les textes sont appliqués avant l'effet des points des « i ».

## Limites connues

- Pas de connexion : la régie est utilisable par quiconque ouvre `/regie/`, mais elle n'agit que sur **son propre navigateur** ; rien ne devient public sans fusion dans le dépôt.
- Un site extérieur peut refuser d'être affiché dans un écran (en-têtes anti-cadre) : utiliser une capture.
- La facturation électronique obligatoire (réception 2026, émission 2027 pour les micro-entreprises, calendrier à confirmer) passera par une plateforme agréée ; la régie produit des documents conformes à imprimer ou envoyer en PDF en attendant.

## Phase 1 (réforme 2027, orbe explicable)

- **Factures** : nature de l'opération (services, biens, mixte) et adresse de livraison si différente, imprimées ; SIREN du client professionnel exigé pour toute facture datée du 1er septembre 2027 ou après (avant : un avertissement). Source : [economie.gouv.fr, mentions obligatoires](https://economie.gouv.fr/entreprises/factures-mentions-obligatoires).
- **Factur-X (XML)** : pour une facture ou un avoir émis, le fichier XML CII (norme EN 16931, profil BASIC), TVA catégorie E avec le motif de franchise, IBAN, échéance, facture d'origine pour un avoir. C'est la partie « données » de la facture électronique : la **plateforme agréée** produit et transmet le document final. À faire valider par elle et par votre expert-comptable.
- **Orbe** : trois niveaux d'autonomie par site (« à la demande », « propose aux pauses », « s'ouvre d'elle-même aux pauses ») ; une pause = une action puis 8 s sans rien, une seule fois par page. Chaque suggestion a son « ? » (le pourquoi écrit dans la Régie), et « Pourquoi ces suggestions ? » dit la règle. Le visiteur peut faire taire l'orbe sur un site ; dans l'OS, son propre choix l'emporte sur celui du site.

## Phase 2 (le builder)

- **Sites clients** (nouvelle vue) : les sites du générateur (`aime-sites`, ce navigateur), rendus par le moteur partagé (`vitrine/rendu.js`) via `regie/sites.js`. Deux aperçus : *Trois écrans* (1440, 820, 390 px) et *Par rôle* (les six perspectives SynchroView). Mise à jour en direct quand le générateur écrit (événement `storage`). Les aperçus sont des `srcdoc` sans scripts (`sandbox="allow-same-origin"`). Changer de perspective n'accorde aucun droit : ce sont les règles de partage qui filtrent.
- **Appareils vivants** : nouveau contenu d'écran `site:<id>` (+ page, + perspective, par défaut *public*). Dans l'aperçu de l'auteur, l'écran affiche le site en direct ; pour les visiteurs, il charge `/regie/medias/site-<id>.html`, la version publique exportée dans le paquet .zip.
- **Blocs métamorphose** : en édition, « Métamorphose » puis un clic sur un bloc pour le nommer. Un même nom sur deux pages = le bloc se transforme d'une page à l'autre (View Transitions inter-documents, `@view-transition{navigation:auto}`). Désactivé par défaut (`transitions:false`), coupé si le visiteur réduit les animations ; navigateurs sans prise en charge : navigation normale.
- « Poser dans un appareil » met le site dans le MacBook de la Page Zéro (brouillon, réversible par « Revenir à la version publiée »).

## Portfolio (réalisations et carrousels)

- **Réalisations** (onglet de la Régie) : titre, client, année, catégorie, phrase, présentation (iPhone, iPad, MacBook ou visuel seul), ce qu'on voit (image de la bibliothèque ou importée, vidéo, page du site en direct, adresse https, site du générateur), lien, publié / brouillon. Stockées dans `regie/site.json` → `realisations`.
- **Carrousels** : un titre, une place (après un grand titre de la Page Zéro), le défilement (automatique lent ou manuel), les réalisations dans l'ordre. `regie/site.json` → `carrousels`.
- Sur la page, `regie/scene.js` insère chaque carrousel après sa place : défilement au doigt, au trackpad, aux flèches du clavier ; automatique seulement si la section est visible, jamais au survol, au toucher, ni si le visiteur réduit les animations. Les brouillons n'apparaissent que dans « Aperçu de mes réglages ».
- Un brouillon de Régie antérieur au portfolio reprend les réalisations publiées au lieu de les effacer.
- La Page Zéro gagne la section « Ce que je fais » (`#offres`), modifiable en mode texte.
