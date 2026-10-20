# AIME ORB — audit du menu radial, nouveau mécanisme, terrain de jeu

Branche `integration`. `main` et la production ne sont pas modifiées.

## 1. Ce qui existait sur la grande landing (`/aime/`)

| Élément | Rôle | Constat |
|---|---|---|
| `#orb` (bouton, z 23) | Un clic ouvre le **menu radial** `.rad` : voile plein écran, l'orbe au centre, 7 outils en couronne (crayon, gomme, texte, formes, couleurs, aimanter, membre). | Le radial **coupe du contexte** : il recouvre la page, et ses outils sont les mêmes partout, quel que soit l'élément regardé. |
| Clic droit et appui long (450 ms) | Ouvrent aussi le radial (`menuAt`), à l'endroit du geste. | Le geste désigne un élément, mais la réponse l'ignore : on ne peut agir ni sur ce titre ni sur cette image. |
| `#ocur` (z 99) | L'orbe remplace le pointeur. C'est un point de 20 px, ou une loupe de 58 px. | Le point cliqué est le centre d'un disque, donc imprécis. |
| `#gps` (z 98) | La boussole : un anneau pointillé et une flèche qui tourne vers la prochaine étape du parcours. | La flèche est fine et précise, mais elle ne servait pas à pointer. |
| `#gorb` (z 93) | L'orbe guide, sur mobile. | Inchangée. |
| Panneau « Explorer » (z 1000 auparavant) | Menu par catégorie. | Il passait **au-dessus de l'orbe-curseur** : on perdait le pointeur dans le menu. |

## 2. Ce qui change

1. **La flèche devient le pointeur** (`orbe/fleche.js`) :
   - le clic a lieu à la pointe ; l'orbe suit derrière la queue de la flèche ;
   - la flèche garde son rôle de boussole et se tourne vers la prochaine étape ;
   - sans destination, elle pointe en haut à gauche, comme un pointeur ordinaire.
2. **Le panneau Explorer passe sous l'orbe** : z-index 96, sous la boussole (98) et l'orbe-curseur (99).
3. **Le geste vise l'élément, et l'orbe répond sur cet élément** (`orbe/compagnon.js`, priorité donnée sur le radial) :
   - **Survol.** Après une demi-seconde, l'orbe commente l'élément pointé. Elle propose une action et peut dire pourquoi.
   - **Clic sur un contenu** (titre, texte, image, carte, tableau, liste, date, lieu, personne, code). Le menu d'actions de cet élément s'ouvre, mais seulement si la page n'a pas déjà réagi à ce clic : un compagnon ne vole jamais un clic.
   - **Clic droit sur n'importe quel élément.** Le menu de l'orbe passe avant le radial. Maj + clic droit rend le menu du navigateur.
   - **Le radial reste** au bouton orbe et à l'appui long, comme boîte à outils de dessin. Il n'est plus la réponse au geste qui désigne.
4. **Les actions sont réelles ou dites « prévues ».**
   - Réelles : modifier, copier, dupliquer, relier, masquer, mesurer, agrandir, remplir un exemple, vider, copier le lien, décaler une date, vérifier l'accès (contraste WCAG calculé, nom accessible, taille de cible), remarque.
   - Prévues, visibles mais inactives : traduire, recadrer, ce qui en dépend, partager.
   - Les modifications durent le temps de la visite et ont toujours une annulation.

## 3. Le système : tout le design system, assigné

`orbe/systeme.js` est la seule table : **21 types d'éléments**. Pour chacun : comment le reconnaître, ce que l'orbe en dit, les actions qu'il accepte, et la forme de l'orbe qui lui correspond (les dix formes du laboratoire). Au total, 82 couples élément-action opérationnels et 6 prévus. Le laboratoire affiche cette table ; il ne la recopie pas.

Une page peut préciser le type d'un de ses éléments avec `data-orbe-type="date"`, ou exclure une zone avec `data-orbe-ignorer`.

## 4. Apprendre, raisonner, suggérer : des règles, et elles sont dites

La mémoire est locale (`localStorage`, clé « aime-orbe ») : les survols, les actions faites, les suggestions refusées, les concepts gardés, les remarques. Aucune IA n'est branchée. Les règles :
1. Si vous faites souvent la même action sur un type d'élément, l'orbe propose celle que vous n'avez jamais essayée (« toujours mieux »).
2. Sinon, elle propose votre habitude.
3. Après une modification, elle propose de relier, pour voir ce que le contenu influence.
4. Une suggestion refusée deux fois n'est plus proposée.
5. Elle ne suggère jamais une action qui n'est que prévue.
6. **L'envie** : sa flèche vise le type d'élément visible que vous avez le moins exploré. Quand vous êtes immobile, elle le dit : « J'aimerais essayer : un tableau ».

## 5. L'hésitation : trois secondes, puis deux minutes de réflexion

Le déclenchement est **mesuré**, et non deviné. Il faut, sur les trois dernières secondes :
- plus de 700 px parcourus ;
- au moins trois demi-tours ;
- aucun clic, aucune saisie, aucun arrêt sur un élément actionnable.

Alors l'orbe quitte le pointeur, se pose et ouvre une conversation guidée de deux minutes, avec un compte à rebours. Elle pose quatre questions : pour qui, quelle intention, quelle matière, quelle forme. Elle compose ensuite un concept pour le Monde AIME : un nom, une promesse, ce que l'orbe ferait, un premier prototype, comment le mesurer.

On peut garder le concept, en demander un autre, le copier ou fermer. Elle ne le propose qu'une fois toutes les dix minutes, et on peut le désactiver. La conversation suit des règles : elle le dit.

## 6. Le terrain de jeu (`/lab/orb/`)

Les dix formes de l'orbe sont conservées en haut de la page. En dessous :
- un spécimen réel de chacun des 21 types, avec ses actions et leur état, et un lien vers la forme de l'orbe correspondante ;
- la table complète du système ;
- ce que l'orbe a appris de vous : les comptes, et la suggestion du moment avec sa règle ;
- les réglages : commentaires, clic, envie, hésitation, oubli de la mémoire ;
- le **journal des remarques** : à réparer, à optimiser, à améliorer, concepts. Il reçoit ce que vous versez depuis n'importe quelle page du site, et s'exporte en Markdown ou en JSON. Rien ne part sur un serveur.

## 7. Limites

- Mémoire et journal locaux à un navigateur. Pour les partager, il faudra un stockage côté serveur, avec des autorisations.
- Les actions « prévues » attendent leurs services : traduction, recadrage, graphe de causalité du projet, autorisations de partage.
- Sur la landing, l'hésitation s'appuie sur l'orbe-curseur existante. L'envie y est coupée, car la boussole y guide déjà le parcours.
- Mobile : pas de survol ni d'hésitation. L'appui long ouvre le menu de l'orbe.
