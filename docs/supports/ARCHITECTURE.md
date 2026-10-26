# Scanner contextuel — contrat et intégration du pilote

## Référentiels, pas nouveau catalogue

```text
studio/index.html : FL + PACKS + marque + moteur + stockage historique
    ↓ extraction auditable (script read-only)
union/integrations/catalogue.json : catalogue public existant (runtime)
fenetre/supports/matrice.json : métier → IDs de formats → sections
    ↓ resolve(catalogue, matrice, contexte)
projection publique dédupliquée → bande, ruban, Orbe et fiche
```

Le générateur refuse implicitement les références manquantes via les tests et joint les 40 packs au catalogue. Les métadonnées d’audit détaillées restent sous `docs/` (exclu du déploiement) ; le front ne charge pas le relevé de tous les fichiers image. Les métadonnées de modules viennent de `studio/verticalites/catalogue.json` ; leur statut ne change pas celui du registre `modules/registre.js`.

### Entités

- **Type** : `studio:<format>` ou `ticketaime:<id>`, espace de noms obligatoire.
- **Variante métier** : source `PACKS`, `packId` et noms/marque source. Ne pas confondre avec un rôle ou le référentiel métier du serveur.
- **Variante visuelle** : palette/ambiance de marque, variante `source` du pilote ; pas un nouveau format.
- **Contexte** : `{profession, verticality, section, scope}`. La section est le moment éditorial courant, pas un horaire ni un événement métier inventé.
- **Instance** : créée seulement après consentement, avec nouvel ID, références format/pack/section. Stockée par Studio sous `echos:v2`, via le handoff existant non écrasant.
- **Aperçu** : rendu natif isolé en mémoire, ou capture native publique accompagnée de sa provenance. Jamais de lecture des créations privées pour alimenter la bibliothèque.
- **Référence Canevas** : objet lien dans un nouveau dossier `aime-studio-dossiers-v1`, source URL vers le format sélectionné ; aucune copie des données Studio. Le modèle et le store de dossiers sont réutilisés sans migration.

## Scroll et état partagé

Trois sections balisées `data-support-section`. IntersectionObserver déclenche une mesure ; un écouteur scroll passif avec requestAnimationFrame assure aussi le scroll inverse et sert de fallback. Une ligne d’activation stable (125 px desktop, 105 px mobile) décide de la section, plutôt que le plus grand ratio d’intersection qui favorise les sections courtes. Trois rectangles mesurés au plus par frame ; aucun fetch ni iframe créé au scroll.

Le store pur expose `get/set/subscribe/lock/unlock`. Les raisons de verrouillage s’additionnent : survol fin, focus clavier, sélection de texte, aperçu, Orbe, dialogue d’ajout. Les nouveaux contextes restent en attente ; seul le dernier est publié après libération de toutes les raisons. Les miniatures ne sont donc pas remplacées sous le doigt ou le focus. Le toucher ne laisse pas un verrou de survol permanent. Les contrôles du navigateur (scroll, clic droit, zoom) ne sont pas interceptés.

La même projection alimente bande, rubans optionnels et commandes de l’Orbe. La réglette affiche l’état publié. Le panneau est un dialogue latéral ouvert sur demande, pas un rail permanent. L’URL conserve métier/section et, pendant l’aperçu, le support sélectionné. Ouvrir l’atelier dans un nouvel onglet garde la position exacte et la sélection du récit d’origine.

## Autorisations

**Le pilote n’expose que des modèles source publics.** `resolve` renvoie une liste vide pour un scope projet, un métier non validé ou une verticalité incompatible. Ce garde-fou de présentation ne remplace en aucun cas une permission serveur. Il n’y a aucune API privée ni prétendue session pilote.

Les instances et relations privées futures devront venir des projections autorisées des API existantes : membership, invitations, grants, durée, portée. Ne pas injecter un rôle métier dans `/api/sv/supports` : cette API existante est une démonstration, pas une porte authentifiée. La future extension projet devra recharger ses projections à chaque changement de droits et revalider chaque action au serveur ; elle n’est pas implémentée ici.

## Moteurs préservés

`renderStudio` accepte désormais une option explicite `{publicTemplate:true}` pour charger le bridge séparé du pilote. Sans cette option, le bridge historique et ses trois formats restent inchangés. Origine/source/request sont vérifiés dans le listener existant. Le projet d’aperçu a un stockage en mémoire isolé ; la copie persistante passe par `handoffStudio`, seulement après consentement. Le Studio source n’est pas réécrit.

`orbe/contexte.js` déclare la nature et les actions publiques des cartes. Les interactions sont des boutons natifs : clic, clavier, appui long pour les mêmes possibilités, sans commande fictive ni clic droit détourné. Les liens Stitchlab/Documents viennent du catalogue de modules existant ; ils ouvrent les véritables outils, sans les présenter comme mini-studios intégrés.

## États et limites

- Capsule fermée : 56 px ; Orbe, contexte, nombre, précédent/suivant/lecture et commande Supports.
- Capsule ouverte : même zone fonctionnelle, bande horizontale ; pas une deuxième barre superposée.
- Sélection : fiche latérale, contexte suspendu, aperçu réel, copie explicitement consentie, référence au Canevas.
- Orbe : supports et outil source du contexte ; sélection de texte → post-it dans un nouveau dossier local après confirmation.
- La lecture automatique avance toutes les huit secondes ; ce rythme visuel n’est pas une durée narrative réelle. Roue/toucher l’arrêtent ; aucune animation nécessaire à la lecture.
- Modes édition/création embarqués avancés : **non raccordés**. Aucun lien/annotation privé, publication ou collaboration déclaré disponible.
- Capsule historique et Fenêtre principale conservées. Réglette uniquement sur le pilote, pas de réintroduction globale.
- Les rubans reprennent intentionnellement les mêmes références que la bande ; on peut les désactiver. Une reprise entre deux surfaces n’est pas un nouveau support ni une variante inventée. Aucun doublon d’ID dans une même projection.

## Visuels et performance

Six PNG de rendu natif, environ 175 Ko au total, aucun doublon SHA entre eux ; provenance et empreintes du moteur/bridge contrôlées au build et en tests. Le détail monte un seul iframe à la demande, détruit son document et son écouteur à la fermeture. Images lazy hors ouverture ; un seul catalogue, matrice de 48 Ko et modules publics chargés à l’initialisation. Aucun nouveau framework, aucune boucle de sondage au scroll. Les performances chronométrées en production et les technologies d’assistance réelles restent à vérifier.

## Validation reproductible

```sh
node scripts/inventaire-supports.cjs
node --test tests/supports-contextuels.test.cjs tests/supports.test.cjs tests/orbe.test.cjs
# Playwright, axe-core et Chromium requis, installés sans modifier le manifeste :
npm install --no-save --package-lock=false playwright @sparticuz/chromium axe-core fake-indexeddb
AIME_PREVIEW_ENTRY=/fenetre/supports/ PORT=3002 HOST=0.0.0.0 node scripts/serveur-test.cjs
# Dans le sandbox : LD_LIBRARY_PATH=/tmp/aime-browser-libs/lib:$LD_LIBRARY_PATH
node scripts/test-supports-contextuels-browser.cjs
node scripts/test-supports-contextuels-a11y.cjs
node scripts/generer-apercus-supports.cjs  # régénération volontaire, pas au scroll
```

Les scripts prennent `AIME_PREVIEW_URL` si le port diffère. Les bibliothèques AL2023 embarquées dans `@sparticuz/chromium` doivent être extraites dans le sandbox comme pour les autres tests navigateur du dépôt. Les captures desktop/mobile/compact/sélection/Orbe sont produites dans `/home/user/`, pas ajoutées en masse au dépôt. Ce sont les états de la véritable interface, pas une maquette qui prétend être fonctionnelle.
