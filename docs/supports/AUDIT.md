# Supports — audit avant implémentation du pilote

## Résultats reproductibles

`node scripts/inventaire-supports.cjs` produit `inventaire.json` (audit, pas catalogue parallèle) et `fenetre/supports/matrice.json` (jointure d’identifiants, utilisable par le front). Premier relevé : **154 formats Studio, 168 modèles TICKETAIME, 40 packs, 5 objets contextuels de démonstration, 982 fichiers image**. Aucun doublon d’ID dans chaque espace de noms, aucune affectation pack/format répétée ; **16 groupes de fichiers identiques au SHA-256**, **31 chemins visuels cités dans plusieurs sources**. Ce dernier chiffre compte des références de code, pas des occurrences visibles simultanément. Les images visuellement proches mais non identiques demandent encore un examen humain.

Le relevé nomme pour chaque support : source/ID, titre, catégorie, dimensions, moteur, métier(s) quand connus, contextes proposés, aperçu/visuel/mockup connus ou `null`, état et éventuelles liaisons objet/moment/univers. `null` signifie inconnu, pas absent. Les familles de métiers canoniques, packs Studio, univers narratifs et verticalités sont des référentiels distincts : aucun rapprochement inventé ni changement de leurs comptes.

## Structures et composants concernés

| Source | Fonction réelle | Limite / décision |
|---|---|---|
| `studio/index.html` : FL, CAT0, PACKS, KIT, PACK_ADD | Source des 154 formats, 40 packs et variantes de marque ; rendu `miniOf`, création `newProject`, édition et exports natifs | Pas de déplacement de ces tables ; extraction contrôlée et matrice par ID. Un format éditable dans sa source n’est pas un export juridiquement certifié. |
| `union/integrations/catalogue.json` | Inventaire public existant : 154 + 168 | Source runtime unique des titres/formats, aucune recopie du catalogue dans le composant. |
| `union/integrations/objects.json`, `union/server/supports.cjs`, `/api/sv/supports` | Cinq objets pilotes liés à de vrais moments du récit de démonstration ; droits par `synchroview/permissions.js` | API de **démonstration**, pas backend authentifié universel. Ne pas détourner ses rôles pour un métier. |
| `union/supports.js`, `support-renderers.js`, `studio-preview-bridge.js` | Catalogue recherché/paginé, aperçus du vrai moteur, copie locale explicite vers Studio ou Publication | Bridge Studio historique limité à card/badge/progfo ; aucun atelier TICKETAIME embarqué. Réutiliser le renderer, ajouter un bridge local séparé pour le pilote. |
| `verticale/supports.js` | Cinq matérialisations : Web, magazine, imprimés, point de croix, documents | Ne pas réimplémenter les moteurs. |
| `fenetre/fenetre.js`, `racine.js`, `index.html` | Fenêtre, contexte/panneaux, Orbe, lecteur embarqué et capsule historique | Checkout local différent du HEAD sur des fichiers antérieurs ; ne pas écraser. Ajouter une entrée explicite depuis la version HEAD en livraison. |
| `fenetre/capsule-bus.js` | Événements temps/musique/media/contact/ticket | Pas un moteur de classement des supports, ni une permission ; garder ses contrats. |
| `orbe/contexte.js`, `pilote.js`, `systeme.js`, `dock/plus.js` | Descripteurs déclarés, géométrie/interaction et actions existantes | Réutiliser les descripteurs ; ne pas réactiver compagnon, hésitation, curseur remplacé ou clic droit intercepté. |
| `union/data/worlds.json`, `studio/verticalites/catalogue.json`, `fenetre/galerie.json` | Univers, verticalités, médias d’ambiance | Photos d’ambiance ≠ aperçu d’un support. Spectacle/festival et séminaire/budget utilisent une même image par héritage déclaré. |
| `vitrine/metiers.json`, registre modules, auth/permissions existants | Vocabulaire métier et décisions serveur | Choisir un métier ne donne aucun accès privé. Aucun nouveau rôle ni moteur d’autorisations. |

## Doublons et nettoyage

Exemples exacts : captures Atlas photographe/vidéaste identiques sur trois appareils ; copies de captures publiques et coordonnées ; captures 404 identiques. Conserver leurs URLs tant que l’Atlas les référence. Ce ne sont pas 16 supports à supprimer.

`terrace.jpg`, `studio.jpg`, `archive.jpg` circulent entre galerie/Fenêtre/récit/catalogue ; conserver leur rôle d’ambiance, mais **ne pas les utiliser comme miniatures de supports**. Dédupliquer l’affichage par clé `studio:<format> + métier + variante`, et sélectionner un seul résultat par contexte. Dimensions communes ne prouvent pas un doublon fonctionnel. Aucun fichier source, création ou clé de stockage supprimé automatiquement.

## Plan progressif retenu

1. Audit JSON et matrice par référence, détection des doublons (ce document et génération exécutés avant UI).
2. Contrat pur contexte/métier/section/sélection et suspension des changements ; seuls modèles publics exposés. Les objets privés resteront des projections d’API existantes.
3. **Un pilote Brodeuse**, route Fenêtre opt-in : trois sections, six formats réellement rendus, bande liée au scroll, aperçu puis copie consentie vers Studio dans un autre onglet. Pas une nouvelle application, pas un remplacement de la Fenêtre.
4. Même resolver pour rubans optionnels, capsule unique 56 px compacte, Orbe visible, réglette locale au pilote et inspecteur fermé initialement. Capsule historique conservée hors pilote.
5. Aperçus issus du moteur, provenance enregistrée ; briefs iconographiques métier et validation humaine avant remplacement des ambiances. Généralisation et génération AI non engagées.

Restaurant, avocat et immobilier ont leurs associations source dans la matrice ; le classement par contexte est une proposition éditoriale, pas un classement métier canonique validé. Brodeuse : les devis/factures sont de vrais formats Studio proposés au pilote, mais ne figuraient pas dans son pack original ; cette extension n’altère pas PACKS.
