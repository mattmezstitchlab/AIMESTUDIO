# Système nerveux AIME

`/sante/`, accessible depuis le registre partagé (Lab du Bureau et Explorer).

Première version publique, informative et sans écriture. Ne contient aucune donnée personnelle, valeur d'environnement, métrique interne ni résultat de diagnostic privé. Le bouton « connexions techniques » est une préférence de présentation, jamais une protection d'accès.

Le modèle `sante/modele.js` est la référence éditoriale de deux parcours : image → patron → PDF / broderie, et (depuis le 21/10/2026) source → site structuré → publication ou sauvegarde (modèle / projet Studio / mini-site / dossier HTML → import → contenu structuré → édition → comparaison des perspectives → export public ou sauvegarde privée). Il sépare étapes, composants, liens typés, limites et constats sourcés. Chaque relation est déclarée, non observée. La révision affichée identifie le code inspecté, pas un déploiement contrôlé. Aucun voyant de santé synthétique n'est calculé.

Le rendu spécifique du graphe est dans `sante/sante.js` ; il ne remplace ni le moteur de pages ni les moteurs métier. Il utilise le registre existant pour rendre la page découvrable et n'ajoute pas de second catalogue d'applications. Les liens de source sont figés sur la révision inspectée. Les ouvertures d'outils ne transfèrent aucune donnée entre applications.

Chaque étape précise : sa nature (navigation, transformation, stockage, rendu, export), son entrée et sa sortie, les moteurs responsables, les données lues et écrites (clés du navigateur), la validation attendue, les limites et ses preuves. Les preuves ont trois niveaux, affichés en texte et jamais fusionnés : déclaré dans le modèle ; couvert par un test (le fichier de test est nommé) ; vérifié dans un navigateur (avec le lieu et la date : un serveur local n'est pas le site déployé). Le test `tests/sante.test.cjs` l'impose.

Les cartes se déplient au clavier via details/summary. Il n'y a plus d'animation : le trait vertical qui « circulait » pouvait passer pour un flux observé ; il est désormais immobile (vérifié : aucune animation calculée, à 1280 px comme à 390 px).

L'import photo → patron n'est pas implémenté ici : c'est une évolution séparée. Une étape prépare un contexte à relire et copier, sans envoi ni exécution automatique.

Suite : vérifier le parcours Stitch dans un navigateur réel (le parcours Sites l'a été en local), puis ajouter des adaptateurs de preuves générées (tests, routes, déploiements), datés et séparés des recommandations. Ne jamais exposer un diagnostic privé sans authentification serveur.
