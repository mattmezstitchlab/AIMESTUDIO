# AIME OS (`/bureau/`)

Le Bureau devient un système : un bureau, des fenêtres, un dock, une recherche, une orbe.

- **Apps** : chaque site AIME (le registre `nav/registre.js`) + deux apps système, **Mon espace** (l'ancien Bureau, désormais `/bureau/espace/`) et **AIME Régie**. Catalogue et logique pure : `os/apps.js` (testé), coque : `os/os.js`, `os/os.css`.
- **Fenêtres** : déplacer par la barre, redimensionner par le coin, double-clic pour agrandir, réduire dans le dock, ouvrir dans un onglet. Sur téléphone : une app à la fois, plein écran. Un lien vers `/bureau/` ouvert dans une fenêtre mène à Mon espace (jamais l'OS dans l'OS).
- **Recherche** (Ctrl K / ⌘ K, ou le champ « Que voulez-vous faire ? ») : fenêtres ouvertes, apps, actions (nouveau devis, composer un site, placer des appareils, régler l'orbe, publier…), projets retrouvés dans ce navigateur. Sans accents ni casse ; les groupes se classent selon la pertinence. Le raccourci marche aussi depuis l'intérieur d'une fenêtre.
- **L'orbe système** (bouton à gauche du dock) : pour l'app au premier plan, les suggestions réglées dans la Régie (`regie/site.json`, ou le brouillon si « Aperçu de mes réglages » est actif), plus « Reprendre », « Régler l'orbe de… » et la recherche. Dans l'OS, les pages ne posent pas leur propre bouton d'orbe (`regie/scene.js`, `DANS_OS`).
- **Mémoire** : `localStorage` « aime-os » = disposition des fenêtres et apps épinglées, assainies (adresses internes, nombres). Rien d'autre.
- **Adresse directe** : `/bureau/#app=studio` ouvre une app.

## Le site entier est l'OS (Page Zéro)

- La Page Zéro (`/`) charge `os/coque.js` : le dock, les fenêtres, la recherche (Ctrl K), « Toutes les apps » et l'orbe système se posent par-dessus la page, qui devient le bureau. `os/os.js` tourne en mode « page » (`body.os-page`) : pas d'écran d'accueil, le bouton « 0 » réduit les fenêtres et remonte en haut de la page, et les fenêtres ne sont pas restaurées d'une visite à l'autre.
- Sur grand écran, un lien de la page vers une app (Mon Bureau, AIME Studio…) s'ouvre dans une fenêtre ; les pages projet `/travaux/…` et les ancres restent des liens normaux. Sur téléphone, les liens naviguent normalement et les fenêtres s'ouvrent en plein écran.
- L'orbe du dock remplace le bouton d'orbe de la Page Zéro ; sans fenêtre au premier plan, elle propose les suggestions réglées pour la Page Zéro dans la Régie.
- `os/coque.css` est **généré** depuis `os/os.css` par `scripts/coque-css.py` (règles enfermées sous `.os-coque`) : le relancer après toute modification de `os.css`.
- Dans un cadre (fenêtre de l'OS, édition de la Régie, écran d'appareil), la coque ne se pose pas.
- `/bureau/` reste l'OS avec son écran d'accueil.

## Pages projet

- `/travaux/` et `/travaux/<projet>/` sont rendues côté serveur par `api/travaux.js` depuis `regie/site.json` (réalisations **publiées** seulement) : titre, description, adresse canonique et aperçu de partage propres à chaque projet. L'appareil est monté ensuite par `regie/scene.js` (`AIMERegieScene.realisation`).
- Un clic sur une réalisation d'un carrousel mène à sa page projet.
- Champ « Image de couverture » (Régie) : la vignette du portfolio et l'image de partage quand le projet n'est pas une simple image.
