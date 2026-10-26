# Expérimentation immersive — bilan du 26 octobre 2026

## Ce qui fonctionne

- Deux présentations du même JSON canonique : scène immersive par défaut et grande verticale existante. Les mêmes identifiants sont utilisés ; aucun calendrier métier séparé. Le métier, le moment actif et la projection de droits sont conservés à la bascule.
- Décor d’illustration généré à partir de l’atmosphère fournie, sans texte ni interface incrustée (334 Ko). Cal Sans pour les titres immersifs, Inter pour l’interface. La verticale conserve son langage éditorial.
- Menu de 27 familles, 122 identités uniques, 126 associations : recherche insensible aux accents, familles, suggestions, indications multi-familles et compteurs affectés/éligibles.
- Les **huit** entrées effectivement présentes dans `vitrine/metiers.json` restent inchangées. Raccord d’identifiants dans `immersive.js` : fleuriste→florist, traiteur→caterer, musicien et musicien-intermittent→musician, videaste→videographer, photographe→photographer, dj→dj, lieu→venue-manager. Leur description fonctionnelle est affichée, sans réutiliser leurs horaires/effectifs d’un autre scénario comme données de ce mariage. Le brief en annonçait neuf : aucune neuvième entrée n’a été inventée.
- Cartes flottantes construites à partir de vrais moments canoniques concernés, avec date, heure et statut affecté/éligible. Ouverture de la fiche existante. Aucun effectif ou service imaginaire.
- Notices documentaires limitées aux autorisations explicites de la fixture ; contrôle d’accès serveur déclenchable. Aucun téléchargement fictif proposé.
- Dock : précédent/suivant dans les moments concernés, lecture via le lecteur existant, ambiances matin/midi/dorée/crépuscule/nuit. La lecture automatique utilise les horaires prévus pour choisir l’ambiance ; une ambiance manuelle ne modifie jamais les timestamps. Aucun son automatique ni heure constatée inventée.
- Simulation de « marquer fait » : vraie décision du moteur Temps côté serveur, mais pas d’écriture ni changement du récit.

## Une seule logique de permission

`union/server/demo.cjs` est un **adaptateur de fixture**, pas un moteur de règles. Il appelle :
- `synchroview/permissions.js` pour événements, audiences, documents et dépôts ;
- `modules/temps/moteur.js` pour la vue temporelle et les décisions d’action.

`POST /api/sv/union` ne lit que les données fictives. Il renvoie des identifiants autorisés, des capacités et une vue Temps filtrée. Une profession ou un rôle transmis par le navigateur ne change pas la décision. Les identités de simulation sont définies côté serveur, avec publications, attributions et grants explicites séparés de Manus. Une demande de mode authentifié est refusée.

Le JSON canonique statique reste entièrement fictif et publiquement accessible : les perspectives sont une démonstration des règles, **pas un dispositif pour protéger ce JSON déjà public**. Il ne faut jamais y placer des informations réelles privées.

## Les cinq perspectives

| Perspective fictive | Moments accessibles | Documents (sans filtre métier) | Modification simulée |
|---|---:|---:|---|
| Couple propriétaire | 200 | 15 | Tous les moments |
| Coordination | 200 | 10 | Tous les moments |
| Saxophoniste invité | 200 lisibles par le rôle équipe ; métier mis en évidence | 1 | 7 moments explicitement attribués dans la fixture |
| Traiteur invité | 200 lisibles par le rôle équipe ; métier mis en évidence | 3 | 21 moments explicitement attribués dans la fixture |
| Invité simple | 9 explicitement publiés dans la fixture | 0 | Refusée |

Le droit existant autorise un contributeur à lire les moments d’équipe : la démo ne le remplace pas par une nouvelle règle métier. Les documents privés restent interdits sans grant, même pour une coordination ou un propriétaire non autorisé. L’identité saxophoniste reçoit des attributions liées aux moments `musician` dans la fixture : cela ne transforme pas l’éligibilité canonique `saxophoniste` en mission réservée.

## Comptes et projets réels : limites précises

Les sessions Better Auth, les invitations, la durée des adhésions, les demandes, le contact et les API existantes ne sont pas modifiés. Les liens « Mon compte » et « Mon espace » y conduisent.

La scène nouvelle **n’importe pas encore un programme authentifié**. Les vrais programmes continuent d’utiliser `/api/temps`, son identité de session, `space_members`, ses durées et sa projection serveur. Le format persistant Temps n’a pas les mêmes identifiants que les 200 moments Manus : ce raccord doit être explicite, pas déduit par le nom ou un rôle métier. Il reste à réaliser l’adaptateur de projet réel, la projection des documents autorisés réels et les écritures avec révision/conflits via les API existantes. Aucun second compte, moteur de permission ou stockage serveur n’a été créé pour contourner ce travail.

Les médias du panneau sont personnels et locaux au navigateur. Ils ne sont pas un dépôt autorisé dans le projet. Leur libellé distingue cette action locale d’une action d’équipe authentifiée.

## Validation réellement exécutée

- `npm run build` : réussi ; syntaxe des modules et **12 tests** de données, permissions, projections et décisions.
- Régression ciblée Permissions / Temps / comptes statiques : **192 réussis, 13 ignorés, aucun échec** sur 205 tests.
- Playwright / Chromium : réussi à 1440 × 1000 et 390 × 844, zéro erreur JavaScript.
- Vérifications navigateur : 122 spécialités, recherche saxophoniste, ouverture de fiche, métier conservé entre modes, cinq perspectives desktop et cinq perspectives mobile, notices invité absentes, dock lumineux, lecture, changement de perspective, absence de débordement horizontal dans les deux modes.
- Vérifications HTTP : tentative de mode authentifié sur la démo → 403 ; invité demandant le budget → 403 sans contenu ; route réelle Temps sans accès → réponse fermée (404 dans le serveur local non configuré).
- Test du moteur réel : non-membre sans vue, invité sans champs/notes d’équipe ni moment privé. Tests existants Temps exécutés également.
- Pas de validation contre une base de comptes réelle dans cet environnement. Les essais d’invitations/sessions multi-comptes avec base restent à exécuter sur l’environnement équipé.
- Source Manus comparée octet par octet à la pièce jointe : identique. Les huit métiers historiques, moteurs et API comptes/contact/demandes n’ont pas été modifiés.

### Rejouer les tests navigateur
Les outils de test ne sont pas des dépendances d’exécution :
`npm install --no-save --package-lock=false playwright @sparticuz/chromium`
puis `node scripts/test-union-browser.cjs` avec les bibliothèques système Chromium disponibles.
Dans ce sandbox minimal, les trois bibliothèques NSS/NSPR manquantes ont été extraites du bundle AL2023 fourni par `@sparticuz/chromium`, hors dépôt ; lancement avec `LD_LIBRARY_PATH=/tmp/aime-browser-libs/lib:$LD_LIBRARY_PATH`.

Les résultats navigateur ci-dessus remplacent le blocage signalé lors de la première version dans `README.md`. Les tests historiques portant sur l’ancienne page d’accueil restent distincts de cette régression ciblée.
