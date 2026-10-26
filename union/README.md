# AIME — L’UNION

Application éditoriale statique à la racine du site. `npm run dev` démarre le serveur sur `0.0.0.0:3000`. `npm run build` contrôle les fichiers, la syntaxe JavaScript et les cinq tests spécifiques ; aucune compilation ni service externe requis.

## Source
`data/story.json` est la copie intégrale, non modifiée, de la pièce jointe `AIME_UNION_VERTICALITE_DONNEES_ARENA.json`. Dix actes, 200 moments, 102 au jour J, 122 identités de spécialités, 19 dépendances. Les identifiants sont les ancres des moments. L’ordre est celui des `momentIds` canoniques, pas un tri recalculé.

**Anomalie conservée et signalée dans la verticale :** `day-couple-portraits` à 19:12 est suivi de `day-dinner-call` à 19:00 le 14 septembre. Le prototype n’altère pas ces horaires pour les rendre artificiellement monotones. Les descriptions, participants, tâches et risques génériques sont reproduits et signalés comme démonstration, pas comme données opérationnelles validées.

## Fonctionnement
- Parcours unique, table des actes, recherche, ancres stables.
- Scènes panoramiques pilotées par le scroll, sans interception du geste ; repli en défilement natif lorsque `prefers-reduced-motion` est actif.
- Filtres par spécialité et type de contenu : les moments non concernés s’estompent, sans changer d’ordre. « Potentiellement concerné » exclut les affectations pour la spécialité sélectionnée.
- Panneau de détail : personnes, lieu, affectations, éligibilité, tâches, notices documentaires, risques, replis, décisions et dépendances réellement présentes.
- Lecture par moments, pause, précédent/suivant, trois vitesses ; toute intervention de scroll tactile/molette ou navigation clavier interrompt la lecture. Aucun audio automatique.
- Horaires planifiés formatés en `Europe/Paris` avec changement de date après minuit. Les secondes sont celles du timestamp source, jamais extrapolées du scroll. Le curseur de lecture n’est pas une horloge réelle. Les heures constatées ne sont pas renseignées dans le modèle.
- Médias locaux : photos multiples, vidéo, son, lien HTTPS, remplacement, suppression, média principal et mouvement doux optionnel. IndexedDB séparé du JSON ; aucune transmission à un serveur. En cas de stockage refusé, conservation en mémoire pour la session. Les liens externes s’ouvrent sans intégration automatique et peuvent être inaccessibles dans l’environnement réseau restreint.
- Rendu CSS différé par chapitre (`content-visibility`), animation limitée aux scènes visibles et chargement des médias à la demande. Le JSON est chargé intégralement (pas de pagination serveur).

## Accès et confidentialité
Le fichier joint est exclusivement fictif. Les marqueurs `visibility` sont conservés et visibles dans les notices. Aucun contenu de fichier privé ni coordonnées réelles n’est fourni. Le prototype n’a **pas** d’authentification ni d’autorisation serveur : ne pas remplacer ce JSON public par de vraies données privées. Une version réelle doit produire une projection publique serveur et authentifier l’accès aux documents et aux champs équipe/privés.

## Contrôles effectués
- `npm run build` : réussi, cinq tests sur les cardinalités et l’ordre, les timestamps et minuit, les 19 relations, la distinction affecté/éligible et les filtres documents/médias.
- Routes HTTP `/` et `/union/data/story.json` : 200.
- Suite historique du dépôt : 589 tests réussis, 26 échoués, 143 ignorés au premier passage. Plusieurs tests imposent l’ancien accueil remplacé ; cette suite n’est pas annoncée comme validée.
- Script navigateur `scripts/test-union-browser.cjs` préparé pour desktop/mobile, navigation, panneau, filtres, lecture et débordement. **Non exécuté jusqu’au bout** : Chromium ne démarre pas, bibliothèque système `libnspr4.so` absente. Playwright et Chromium sont des outils optionnels installés temporairement, non des dépendances de l’application. La validation visuelle mobile et le parcours navigateur restent à réaliser dans un environnement équipé.

## Limites assumées
Pas de moteur d’orchestration, pas de réservation, pas de génération de documents, pas de recalage automatique des horaires, pas de synchronisation multiutilisateur ou sauvegarde cloud. Les mouvements de médias sont simples et optionnels, pas un outil de montage ou de recadrage avancé. Le téléchargement progressif du JSON par chapitre et une politique de contrôle des liens distants côté serveur restent à ajouter pour une exploitation réelle.

## Évolution immersive
La scène immersive, le sélecteur complet des métiers et les cinq perspectives de démonstration sont maintenant disponibles. Voir **[EXPERIMENTATION.md](EXPERIMENTATION.md)** pour l’architecture, les garanties de permissions, les limites de raccord aux comptes réels et les résultats actualisés des tests. Le blocage navigateur mentionné ci-dessus a été résolu pour cette session ; les tests desktop/mobile sont désormais passés.

## Grande verticale continue et atlas des douze univers
L’évolution suivante remplace la séparation visuelle entre accueil et récit par un shell immersif permanent. Le header **UNIVERS** ouvre les douze configurations issues de la nouvelle pièce jointe. Voir **[MONDE-AIME.md](MONDE-AIME.md)** pour les sources, la navigation, les tests actualisés et les limites explicites.
