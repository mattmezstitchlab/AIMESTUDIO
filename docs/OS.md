# AIME OS (`/bureau/`)

Le Bureau devient un système : un bureau, des fenêtres, un dock, une recherche, une orbe.

- **Apps** : chaque site AIME (le registre `nav/registre.js`) + deux apps système, **Mon espace** (l'ancien Bureau, désormais `/bureau/espace/`) et **AIME Régie**. Catalogue et logique pure : `os/apps.js` (testé), coque : `os/os.js`, `os/os.css`.
- **Fenêtres** : déplacer par la barre, redimensionner par le coin, double-clic pour agrandir, réduire dans le dock, ouvrir dans un onglet. Sur téléphone : une app à la fois, plein écran. Un lien vers `/bureau/` ouvert dans une fenêtre mène à Mon espace (jamais l'OS dans l'OS).
- **Recherche** (Ctrl K / ⌘ K, ou le champ « Que voulez-vous faire ? ») : fenêtres ouvertes, apps, actions (nouveau devis, composer un site, placer des appareils, régler l'orbe, publier…), projets retrouvés dans ce navigateur. Sans accents ni casse ; les groupes se classent selon la pertinence. Le raccourci marche aussi depuis l'intérieur d'une fenêtre.
- **L'orbe système** (bouton à gauche du dock) : pour l'app au premier plan, les suggestions réglées dans la Régie (`regie/site.json`, ou le brouillon si « Aperçu de mes réglages » est actif), plus « Reprendre », « Régler l'orbe de… » et la recherche. Dans l'OS, les pages ne posent pas leur propre bouton d'orbe (`regie/scene.js`, `DANS_OS`).
- **Mémoire** : `localStorage` « aime-os » = disposition des fenêtres et apps épinglées, assainies (adresses internes, nombres). Rien d'autre.
- **Adresse directe** : `/bureau/#app=studio` ouvre une app.
