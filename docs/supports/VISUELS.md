# Bibliothèque visuelle — décisions et briefs à valider

## Règles

1. Conserver les visuels d’ambiance existants avec leur usage déclaré. Aucun remplacement sans accord humain.
2. La miniature fonctionnelle vient du rendu du support lui-même : ID source, métier, variante, empreinte du moteur et empreinte des données exemple. Jamais une photographie de pièce ou de paysage à sa place.
3. Une variante de métier est une application de contenu/marque au type (`studio:bcard`), pas un nouveau format. Une variante visuelle est un choix de marque distinct. Le contexte désigne son apparition, pas son stockage.
4. Clé d’asset : `<métier>/<format>/<variante>/<empreinte>`. Contrôler les SHA identiques, conserver les références historiques et n’afficher qu’une occurrence du même support dans une bande. Pas de multiplication de mockups génériques.
5. Si un aperçu manque : carte typographique « Aperçu à préparer », sans fausse image. Un rendu périmé doit être régénéré, pas réattribué à un autre métier. Les fichiers du pilote sont des captures du moteur Studio sur des exemples publics fictifs ; le détail utilise le moteur vivant.

## Attribution et générations nécessaires (validation humaine préalable)

| Métier | Palette / tonalité | Scène / famille iconographique | Conserver / préparer |
|---|---|---|---|
| Brodeuse | Bordeaux, lin, safran ; délicat, artisanal | Toile, fil, étiquette papier posée à plat ; lumière latérale, pas de faux points de broderie lisibles | Conserver photo broderie en ambiance, aperçus natifs carte/étiquette/flyer/site/devis/facture pour le pilote. À générer après accord : macro textile propre, packaging et carte de remerciement lorsque les formats seront validés. |
| Restaurant | Bordeaux chaud, crème ; gourmand | Menu propre, table réelle, chevalet ; pas de menu illisible produit par IA | Conserver palette pack resto ; préparer aperçus menu/tent/allerg/flyer/story. Brief ambiance : bistrot chaleureux, lumière de service, menu vierge à composer par le moteur. Réservation et QR : composants à inventorier/raccorder, pas promis par une photo. |
| Avocat | Encre, ivoire ; sobre et premium | Papier, embossage discret, bureau sans balance/cliché judiciaire | Aperçus natifs bcard/letterhead/convhono/devis ; brief ambiance : documents sans données personnelles, lumière neutre et matière papier. Convention = modèle à vérifier par un professionnel, pas acte validé. |
| Immobilier | Vert profond, sable ; clair et structuré | Architecture, plan, vitrine ; aucun faux bien commercialisé | Aperçus fichebien/panneau/vitrine3 ; brief : façade contemporaine fictive, espace libre pour annonce moteur, pas de prix/diagnostic dans l’image générée. |
| Artisan | Terre, ardoise ; concret | Matière et geste au travail, établi, support non décoratif | Préparer formats du pack artisan puis photo de matière propre à l’activité ; ne pas attribuer une même photo à tous les artisans. |
| Notaire | Encre, blanc cassé ; rassurant | Documents alignés, papier net, photographie calme | Aperçus pièces/guide/convsign ; brief photo sans sceau officiel ni signature simulée. |
| Détective privé | Anthracite, ivoire ; discret | Bureau, verre dépoli, lumière contrôlée ; pas d’arme ni personne identifiable | Aperçus des formats du pack ; brief ambiance premium sobre, pas de suggestion de surveillance réelle. |
| Boutique | Palette du produit ; commerce accueillant | Produit, emballage, carte et comptoir | Aperçus formats commerce ; générer une scène produit par famille, sans faux logo ni texte. |

Les 40 palettes source sont conservées dans l’inventaire et référencées par la matrice. Ces briefs ne sont pas 40 séries d’images déjà produites. Les créations privées des utilisateurs ne servent jamais à des captures de bibliothèque.
