# AIMESTUDIO · Audit de l'Orbe (24/10/2026)

Lecture seule de `main` au commit `8fa570d` (après la fusion de #106). Aucun fichier modifié. Chaque constat cite le fichier qui le prouve ; les nombres de lignes et de fichiers de tests sont ceux du dépôt.

## En bref

L'Orbe existe aujourd'hui sous **neuf mécanismes**, chargés par des pages différentes, avec cinq clés de stockage local. Deux sont utiles et cohérents avec l'architecture : **l'orbe visuelle** (`zero/orbe.js`) et **le + unique** (`dock/plus.js`). Un troisième est le meilleur point de départ pour plus tard : **le contexte déclaré** (`orbe/contexte.js`), parce que l'élément dit lui-même ce qu'il est au lieu que l'Orbe le devine. Le reste est soit concurrent (l'ancienne porte, le menu Explorer), soit intrusif (le pointeur remplacé, le clic droit intercepté, la détection d'hésitation), soit décoratif et à garder au Lab.

**Rôle minimal de l'Orbe aujourd'hui** : une présence visuelle calme, et le + du Dock qui propose les gestes permis. L'explication des droits passe par le gabarit Mon accès, composé au serveur ; elle ne demande aucun code d'Orbe en plus. L'audit conclut que l'Orbe doit rester **essentiellement visuelle** jusqu'à ce que le parcours réel fonctionne.

## 1. Inventaire : ce qui existe, où, et dans quel état

| Mécanisme | Fichiers (lignes) | Pages qui le chargent | Actif par défaut | Stockage local | Tests | Effet |
|---|---|---|---|---|---|---|
| Orbe visuelle légère | `zero/orbe.js` (21) | accueil, Grande Partition, Bureau | oui, respiration lente ; immobile en mouvement réduit | — | 13 fichiers | affichage seul |
| Orbe qui voyage dans le récit, points des « i » | `zero/zero.js` (107), `zero/points.js` (68) | accueil, Grande Partition | oui, piloté par le défilement | `aime-zero-calme` | 21 et 10 | affichage ; remplace les glyphes « i » (copie lisible conservée pour les lecteurs d'écran) |
| Deux orbes qui regardent | `zero/yeux.js` (27) | **accueil** (chargé), Grande Partition | suit la souris et le doigt | — | 0 | **chargé pour rien sur l'accueil** : l'élément `#duo` a disparu avec « Et maintenant ? » (#106) |
| La ronde | `zero/ronde.js` (33) | Grande Partition | oui | — | 1 | affichage |
| Les six formes | `zero/formes.js` (27) | accueil, Grande Partition, Point Zéro, Bureau | sur interaction | — | 4 | moteur de dessin (Point, Ligne, Relation…) |
| L'ancienne porte | `porte/porte.js` (35), `revelation.js` (11), `arrivee.js` (32) | Grande Partition, Point Zéro, Canevas, Bureau ; `arrivee` sur `/aime/` | oui | — | 21, 1, 4 | **un second +**, dont l'état dépend du Timbre et de la découverte du Monde AIME |
| Le + unique | `dock/plus.js` (34), `dock/dock.js` (121) | accueil, Contact, Exemples, Capacités | sur toucher | — | 23 et 11 | navigation : intention ou projets ; ne donne aucun droit |
| Le compagnon | `orbe/compagnon.js` (204), `orbe/systeme.js` (123), `orbe/terrain.js` (60) | `/aime/` (pointeur et « envie » coupés, **hésitation et clic actifs**), `/lab/orb/` (tout actif) | oui sur ces pages | `aime-orbe`, `aime-orbe-reglages` | 1, 5, 1 | commente au survol après 0,5 s ; **intercepte le clic droit** (Maj + clic droit rend le menu du navigateur) ; ouvre une conversation après « hésitation » mesurée ; modifie la page pour la durée de la visite |
| Le pointeur-flèche | `orbe/fleche.js` (20) + `#ocur` dans `/aime/` | `/aime/` | oui sur pointeur fin | — | 1 | **remplace le curseur** (`cursor:none`) |
| Le menu radial | inline dans `/aime/` (`menuAt`, `.rad`) | `/aime/` | bouton orbe, appui long | — | — | outils de dessin |
| Le pilote | `orbe/pilote.js` (80), `orbe/contexte.js` (31), `orbe/pilote.css` | Point Zéro (via `pointzero/pz.js`), Bureau | oui, **autonomie « attentive », mouvement actif** | `aime-orbe-pilote` | 1 et 5 | suit le pointeur, propose sur l'élément sélectionné ; transparent aux clics et au clavier ; observer → proposer → confirmer → enregistrer |
| Les suggestions du Bureau | `os/os.js` (`orbePan`, `pauseOrbe`), réglages dans la Régie (`#orbe`) | Bureau | **proposition spontanée après une pause** | `aime-regie-apercu` | bureau | suggère des destinations ; réglages de présence et d'autonomie par application |
| Le menu « Explorer » | `menu/menu.js` (64) | `/sites/`, `/aime/`, `/bureau/espace/` | bouton dans l'en-tête | — | 6 | **une seconde navigation**, concurrente du Dock |

Hors code : le récit de l'accueil (`coeur/coeur.js`, scénario mariage) dit « L'orbe recueille » et « L'orbe compose une page pour chacun ». C'est le serveur qui compose ; c'est ce texte qui a fait croire à une lecture extérieure que l'Orbe « fait tout ».

## 2. Comportements indésirables trouvés

1. **Deux + qui ne font pas la même chose** : `porte/porte.js` (identité, Monde AIME) sur Point Zéro, Grande Partition, Canevas et Bureau ; `dock/plus.js` ailleurs. Déjà demandé dans la correction de #106.
2. **Le curseur remplacé** sur `/aime/` (`cursor:none`, pointe de flèche) : imprécision, gêne pour les personnes qui agrandissent le curseur, contraire aux réglages du système.
3. **Le clic droit intercepté** par le compagnon sur `/aime/` : un geste du navigateur détourné ; l'échappatoire (Maj) n'est pas connue.
4. **La détection d'hésitation** active sur `/aime/` : interpréter les mouvements de la souris d'une personne n'a pas d'utilité démontrée et peut surprendre.
5. **Les suggestions spontanées** : survol commenté après 0,5 s (compagnon), proposition après une pause (Bureau), autonomie « attentive » par défaut (pilote).
6. **Des modifications de page non enregistrées** (compagnon) : elles durent la visite, avec annulation ; sur une vraie page de projet, elles feraient croire qu'un changement est sauvegardé.
7. **Un droit déclaré côté navigateur** : dans `orbe/contexte.js`, chaque élément déclare `permis: {modifier, raison}`. Dans une démonstration, c'est acceptable ; dans un projet réel, ce serait un second système de droits.
8. **Cinq clés de stockage local** (`aime-orbe`, `aime-orbe-reglages`, `aime-orbe-pilote`, `aime-zero-calme`, `aime-regie-apercu`), sans endroit unique pour les voir et les effacer.
9. **Un script chargé pour rien** (`zero/yeux.js` sur l'accueil) et **une seconde navigation** (`menu/menu.js`) sur trois pages.
10. **Les 82 couples élément-action** du compagnon : les actions sont réelles dans la page (copier, masquer, mesurer, contraste…), mais aucune n'agit sur des données de projet ; seuls 5 fichiers de tests couvrent `systeme.js`. Leur utilité dans AIME n'est pas démontrée.

## 3. Tableau de décision

| Mécanisme | Décision | Pourquoi | Tests nécessaires |
|---|---|---|---|
| Orbe visuelle (`zero/orbe.js`) | **CONSERVER** | L'identité d'AIME, légère, sans dépendance, respecte le mouvement réduit | existants |
| Orbe qui voyage dans le récit (`zero/zero.js`) | **SIMPLIFIER** | Elle porte le récit de l'accueil ; garder le voyage, rendre le mode calme facile à trouver | performance mobile, mouvement réduit |
| Points des « i » qui éclatent (`zero/points.js`) | **À VÉRIFIER** | Effet fort, mais il réécrit le texte des titres ; vérifier lecteurs d'écran, sélection et copie du texte, coût sur mobile | lecteur d'écran, copier-coller |
| Deux orbes qui regardent (`zero/yeux.js`) | **ABANDONNER sur l'accueil**, **LAB** ailleurs | Plus rien à animer sur l'accueil ; décoratif | le script n'est plus chargé par l'accueil |
| La ronde, les dix formes, le terrain (`zero/ronde.js`, `/lab/orb/`) | **LAB UNIQUEMENT** | Recherches de forme, sans rôle dans le parcours | — |
| Les six formes (`zero/formes.js`) | **CONSERVER** | Moteur partagé par Point Zéro (identité) | existants |
| L'ancienne porte (`porte/porte.js`, `revelation.js`) | **ABANDONNER dans les parcours actifs** | Doublon du + unique ; dépend du Timbre, contraire à `IDENTITE.md` § 6 ; garder le fichier tant qu'une page Lab le charge | aucune page active ne charge `porte.js` |
| L'arrivée dans le Monde AIME (`porte/arrivee.js`) | **LAB UNIQUEMENT** | Liée à `/aime/`, rangé au Lab | — |
| Le + unique (`dock/plus.js`) | **CONSERVER** | C'est l'Orbe dans le Dock ; il recevra les gestes de `composerReel` | gestes = ceux du serveur |
| Le compagnon (`orbe/compagnon.js`) | **LAB UNIQUEMENT** | Riche, mais intrusif hors d'un laboratoire | — |
| — son clic droit intercepté | **DÉSACTIVER** (même sur `/aime/`) | Détourne un geste du navigateur | le clic droit ouvre le menu du navigateur |
| — la détection d'hésitation | **DÉSACTIVER** (même sur `/aime/`) | Interprète les mouvements sans utilité démontrée | `hesitation:false` partout hors `/lab/orb/` |
| — sa table de 21 types (`orbe/systeme.js`) | **CONSERVER comme connaissance** | Base utile pour une future « Assistance » : ce qui est pertinent selon le type d'élément | — |
| Le pointeur-flèche et `cursor:none` (`orbe/fleche.js`) | **DÉSACTIVER** | Accessibilité et précision ; LAB seulement | le curseur du système est visible partout hors Lab |
| Le menu radial de `/aime/` | **LAB UNIQUEMENT** | Outils de dessin ; doublon des gestes du + | — |
| Le pilote et le contexte déclaré (`orbe/pilote.js`, `orbe/contexte.js`) | **SIMPLIFIER** | Le meilleur modèle : l'élément déclare, l'Orbe ne devine pas, rien ne prend le clic. À régler : autonomie « discrète » et mouvement coupé par défaut ; dans un projet réel, `permis` vient de la réponse du serveur, jamais de la page | un `permis` déclaré par la page est ignoré dans un vrai espace |
| Les suggestions spontanées du Bureau (`os/os.js`) | **DÉSACTIVER** la proposition après une pause ; le reste suit le remplacement du Bureau | Le Bureau devient « Mes projets » ; une proposition non demandée n'a pas sa place dans un outil de travail | aucune ouverture sans geste |
| Les réglages de l'Orbe dans la Régie | **À VÉRIFIER** | Utile si la personne garde la main (présence, autonomie) ; à relier au choix de chacun, pas seulement du propriétaire du site | — |
| Le menu « Explorer » (`menu/menu.js`) | **ABANDONNER** sur `/sites/` et `/bureau/espace/` ; Lab sur `/aime/` | Seconde navigation ; le Dock suffit | aucune page active ne charge `menu.js` |
| Les cinq clés de stockage | **SIMPLIFIER** | Une seule ligne « Ce que l'Orbe retient sur cet appareil », avec « Tout oublier », dans le Compte | les cinq clés sont effacées d'un geste |
| Le texte « L'orbe recueille / compose » | **SIMPLIFIER** | Dire que le serveur compose chaque page selon le rôle | — |

## 4. Ce qu'il faut retenir

1. **Rôle minimal aujourd'hui** : présence visuelle calme (`zero/orbe.js`) et le + du Dock (`dock/plus.js`) qui propose seulement les gestes permis.
2. **À conserver** : l'orbe visuelle, les six formes, le + unique, le modèle du contexte déclaré, la table des types d'éléments comme connaissance.
3. **À neutraliser en priorité** : le second + (porte), le clic droit intercepté, la détection d'hésitation, le curseur remplacé, les suggestions spontanées, le menu Explorer sur les pages actives, le script `yeux.js` chargé pour rien.
4. **Au Lab** : le compagnon complet, le pointeur-flèche, le menu radial, la ronde, les dix formes, l'arrivée dans le Monde AIME.
5. **Plus petit plan de nettoyage**, sans casser l'accueil, le Dock ni le parcours :
   - **dans la PR de fin d'unification déjà demandée** : le + unique sur Bureau, Point Zéro et Grande Partition (la porte ne sert plus) ; retirer `zero/yeux.js` de l'accueil ; retirer `menu/menu.js` de `/sites/` et `/bureau/espace/` ;
   - **une petite PR « Orbe calme »** : `hesitation:false` et clic droit rendu au navigateur sur `/aime/` ; pilote en autonomie « discrète », mouvement coupé par défaut ; plus de proposition après une pause dans le Bureau ; « Tout oublier » pour les cinq clés dans le Compte ;
   - **plus tard, avec le mariage de preuve** : `permis` du contexte déclaré lu dans la réponse de `/api/page`.

## 5. Ce qui demanderait vraiment du code nouveau

- **Rien pour le rôle minimal** : tout existe.
- **Plus tard, l'« Assistance »** : relier `orbe/contexte.js` et `orbe/systeme.js` aux gestes calculés par le serveur. Le type d'élément suggère ce qui est pertinent ; le serveur décide ce qui est permis ; rien ne s'exécute sans confirmation.
- **Plus tard, la personnalité** : une Orbe qui se tait par défaut, que chacun peut rendre plus présente dans ses réglages, et qui ne change jamais d'apparence selon le rôle (aucune hiérarchie visuelle des personnes).

Aucune suppression ni refonte n'est proposée avant la décision de Matt.
