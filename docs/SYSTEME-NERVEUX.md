# Système nerveux AIME

`/sante/`, accessible depuis le registre partagé (Lab du Bureau et Explorer).

Première version publique, informative et sans écriture. Ne contient aucune donnée personnelle, valeur d'environnement, métrique interne ni résultat de diagnostic privé. Le bouton « connexions techniques » est une préférence de présentation, jamais une protection d'accès.

Le modèle `sante/modele.js` est la référence éditoriale du premier parcours image → patron → PDF / broderie. Il sépare étapes, composants, liens typés, limites et constats sourcés. Chaque relation est déclarée, non observée. La révision affichée identifie le code inspecté, pas un déploiement contrôlé. Aucun voyant de santé synthétique n'est calculé.

Le rendu spécifique du graphe est dans `sante/sante.js` ; il ne remplace ni le moteur de pages ni les moteurs métier. Il utilise le registre existant pour rendre la page découvrable et n'ajoute pas de second catalogue d'applications. Les liens de source sont figés sur la révision inspectée. Les ouvertures d'outils ne transfèrent aucune donnée entre applications.

Les cartes se déplient au clavier via details/summary. Le mouvement décoratif n'indique pas un appel réel et respecte prefers-reduced-motion. Une étape prépare un contexte à relire et copier, sans envoi ni exécution automatique.

Suite : vérifier le parcours dans un navigateur réel, puis ajouter des adaptateurs de preuves générées (tests, routes, déploiements), datés et séparés des recommandations. Ne jamais exposer un diagnostic privé sans authentification serveur.
