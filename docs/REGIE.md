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
