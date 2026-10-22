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
