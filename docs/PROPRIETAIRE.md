# Le droit « propriétaire du site »

**Décidé côté serveur, par identifiant de compte, fermé par défaut.**

- **Source :** `AIME_PROPRIETAIRES`, variable d'environnement Vercel qui contient des identifiants de compte Better Auth séparés par des virgules. Sans cette variable, personne n'est propriétaire.
- **Code :** `api/_auth/proprietaire.mjs` contient `identifiants`, `estProprietaireId` et `proprietaire(req)`. La liste ne quitte jamais le serveur. `/api/identite` renvoie seulement `proprietaire: true/false` pour la personne connectée.
- **Ce que le droit protège aujourd'hui :** les routes `api/sv/*` (démonstrateur SynchroView, identités fictives). En production, elles répondent 404 à toute personne qui n'est pas propriétaire, ou en cas d'erreur. Elles restent ouvertes dans les aperçus et en local, pour la recherche.
- **Ce que l'interface ne fait que montrer ou masquer :**
  - la Régie et ses actions dans le dock et la palette ;
  - la suggestion « Régler l'orbe » ;
  - l'entrée SynchroView de la navigation ;
  - la page `/synchroview/` sur le domaine public.

  Le navigateur ne protège rien.
- **La Régie maîtresse** n'est pas modifiée. Elle reste servie à `/regie/`, et ses données restent dans le navigateur de chacun. Avant toute action d'administration côté serveur, dans le Cube Maître ou le Canevas, chaque route devra appeler `proprietaire(req)` et répondre 403 sinon.

## Activer le droit pour votre compte (production : votre accord)

1. Connectez-vous sur le site.
2. Ouvrez `/api/auth/get-session` dans le même navigateur et notez `user.id`.
3. Dans Vercel, ouvrez le projet `aimestudio`, puis Settings → Environment Variables. Ajoutez `AIME_PROPRIETAIRES` = cet identifiant, d'abord pour Preview pour essayer, puis pour Production.
4. Redéployez. Vérifiez ensuite que `/api/identite` renvoie `proprietaire: true` pour vous, et `false` dans une fenêtre privée.

**Production et aperçus n'ont pas forcément le même identifiant.** Chaque aperçu a sa propre base, `preview/<branche>`, copiée de `main` au moment de sa création (`preview/integration` : le 20 octobre). Un compte créé en production après cette date n'existe pas dans l'aperçu, et inversement. Relevez donc l'identifiant sur chaque site : celui de la production pour la cible Production, celui de l'aperçu pour la cible Preview. La variable accepte plusieurs identifiants séparés par des virgules.

## Vérification de la Régie (22 octobre)

Accès direct à `/regie/`, depuis un navigateur vierge, sur les 9 onglets (Pages, Réalisations, Sites, Édition, Orbe, Documents, Clients, Entreprise, Publier) :

- **Requêtes envoyées :** des `GET` seulement, vers des fichiers publics. Il s'agit de `regie/site.json`, la configuration déjà publiée du site, servie à tous, et des images. S'y ajoute `/api/identite`, appelé par l'aperçu de la Page Zéro. **Aucune** requête d'écriture et aucune autre route serveur.
- **Données privées :** les devis, factures, clients et coordonnées bancaires ne sont **pas** sur le serveur. Ils vivent dans le stockage du navigateur où ils ont été saisis : IndexedDB `aime-regie` et `localStorage`. Un inconnu qui ouvre `/regie/` voit une Régie vide, la sienne. Il ne voit jamais les données du propriétaire.
- **« Publier » :** télécharge un fichier `site.json` ou `.zip`. Rien n'est écrit sur le serveur, et le site ne change qu'après une PR fusionnée.
- **Conséquence :** il n'existe aujourd'hui **aucune opération d'administration côté serveur** à protéger. Le masquage du dock sert seulement de rangement. Toute future route qui écrirait côté serveur pour la Régie, le Cube Maître ou le Canevas devra appeler `proprietaire(req)` et répondre 403, avec un test qui le prouve.
- **Risque qui reste :** les données de la Régie restent lisibles par tout script exécuté sur le même domaine, comme pour tout stockage de navigateur. Le seul code tiers du domaine vient de cdnjs, en versions fixes : `jszip`, que la Régie charge seulement au clic sur « Télécharger le paquet », et quelques bibliothèques des pages `/studio/` et `/v1/`. Ces scripts n'ont pas encore de contrôle d'intégrité (`integrity`) : c'est un renforcement simple à ajouter. Exportez régulièrement la sauvegarde depuis Publier → « Exporter la sauvegarde ».
