# Socle Neon — validation et suite

Cette PR ajoute uniquement un endpoint Node `/api/health`. Aucun build, framework,
rewrite ou fichier statique n'est changé ; `/v1/` est intact.

## Activer et vérifier

1. Dans le projet Vercel, connecter Neon via Storage/Marketplace. Laisser
   l'intégration injecter `DATABASE_URL` côté serveur ; ne jamais la copier dans
   le dépôt ou un script navigateur. Séparer Preview et Production.
2. Redéployer après la connexion. `GET /api/health` doit répondre 200 avec
   `{"ok":true}`. Sans configuration ou en cas d'échec SQL : 503 et `{"ok":false}`.
   Les autres méthodes répondent 405. Aucun détail d'erreur n'est exposé.
3. Comparer `/`, `/bureau/`, `/studio/`, `/v1/`, les polices et les images sur
   la preview et la production avant fusion. Les tests locaux simulent Neon :
   ils ne prouvent pas une connexion réelle ni le rendu en navigateur.
4. Le probe est public et chaque GET exécute `select 1` ; éviter une surveillance
   à haute fréquence. Aucun schéma n'est appliqué et aucune donnée utilisateur
   n'est lue ou écrite.

## Proposition de PR suivante : authentification (pas encore implémentée)

Privilégier une bibliothèque éprouvée plutôt qu'une implémentation WebAuthn maison.
Candidat : Better Auth côté serveur avec passkeys et lien magique, sous réserve de
vérifier ses versions, son adaptateur PostgreSQL et sa compatibilité avec les
fonctions Node du projet. Évaluer Neon Auth sur les mêmes critères avant décision,
notamment passkeys, secours e-mail et intégration sans migration du site statique.

Livrable court à isoler avant toute synchronisation :
- routes `/api/auth/*`, bouton de connexion du Bureau et endpoint de session ;
- cookies HttpOnly, Secure, SameSite=Lax, expiration et révocation côté serveur ;
- jetons e-mail courts, à usage unique, protection anti-abus et absence
  d'énumération des comptes ; fournisseur e-mail à configurer séparément ;
- validation d'origine/CSRF et challenge WebAuthn à usage unique ; RP ID de
  production `ai-x-me.com`, previews isolées (pas de partage implicite de passkeys) ;
- identité dérivée exclusivement de la session vérifiée et contrôle d'accès
  à chaque endpoint, jamais d'un `user_id` fourni par le client ;
- migrations propres à la bibliothèque choisie : ne pas appliquer aveuglément
  les tables `users`, `sessions` et `passkeys` du schéma de départ ;
- tests session expirée/révoquée, accès anonyme refusé, isolation de deux comptes,
  lien réutilisé refusé et origine invalide refusée.

Hors périmètre : synchronisation, migration localStorage, `/v1/`, Noyau et domaine.
La récupération du compte ne doit jamais permettre au serveur de déchiffrer le
Noyau ; prévoir séparément une stratégie de récupération de sa phrase secrète.
