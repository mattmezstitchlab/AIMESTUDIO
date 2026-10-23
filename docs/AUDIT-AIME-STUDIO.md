# Audit d'AIME STUDIO (aime-studio-mu.vercel.app) — 23 octobre 2026

Source : dépôt `mattmezstitchlab/Aime-Studio` @ `0d3f665` (22/10/2026), application Base44 (React 18, ~40 dépendances, ~34 000 lignes dans `src/components/bureau` + `src/lib`). Site parcouru dans un vrai navigateur (Chromium), sur ordinateur et téléphone, sans compte. Ce dépôt (AIMESTUDIO) n'a rien à voir techniquement avec `Aime-Studio` : ce document dit ce qu'on en reprend ici.

## Ce qui est intéressant (les idées à garder)

| Idée | Où dans le code | Pourquoi elle compte |
| --- | --- | --- |
| **Les étiquettes de sections** : 40 sections typées en 6 familles (Socle, Événementiel, Commerce, Contenu, Confiance, Action), chacune avec ses besoins et ses mots-clés | `src/lib/bureau/sectionEtiquettes.js` | Un vocabulaire universel de ce qu'un site contient. Fonctionne : glisser « À propos » sur le canevas pose bien la section. |
| **Des structures, pas des pavés** : tarifs en 3 colonnes, FAQ en questions/réponses, équipe en portraits, programme en étapes… | `STRUCTURE_PAR_SECTION`, `STRUCTURES` (même fichier) | Chaque section a une vraie forme et un schéma de données. C'est exactement ce qu'est un **bloc** de `vitrine/rendu.js`. |
| **La progression nourrie par les dépôts** : chaque matière déposée au Point Zéro fait monter les sections qu'elle « nourrit » (mot-clé +45, bon dossier +30) jusqu'à « prête » | `progressionEtiquette()` | Le lien concret entre Point Zéro (les matières) et le Canevas (les sections). |
| **Le pipeline de réglages dans l'ordre** : typographie, couleurs, mise en page, structure, visuels, composants, texte absorbé, arborescence, accessibilité, aperçu | `src/components/bureau/capsule/Panneau*.jsx`, `pipeline/` | Une progression lisible pour régler un site sans tout casser. |
| **L'audit EAA d'un site existant** + garde anti-SSRF côté serveur | `src/lib/gallery/eaaAudit.js`, `eaaReferentiel.js`, `base44/functions/scanA11yFaults`, `exploreSite`, `extractSiteContent` | Le référentiel (POUR → critères WCAG 2.1 AA / EN 301 549) et la récupération sûre d'URL sont réutilisables. |
| **« Garder absolument »** : l'utilisateur liste ce qui doit survivre à la refonte | onglet Audit EAA | Le respect de l'existant : « un texte d'origine peut être une preuve ». |
| **Cartes réutilisables** : une section réglée devient une carte, rangée, partageable | `capsule/cartes/` | Les « sections réutilisables » de notre Phase 2. |
| **Publication +nom** : adresse publique, versions, dépublier | `PanneauPublication.jsx`, entité `PublishedSite`, route `/:adresse` | Le bon modèle produit pour publier une réalisation. |
| **Le récit** de la page d'accueil : déposé → audité → régénéré → composé → accessible → publié → transmis | `src/pages/Landing.jsx`, `components/landing/` | Une promesse claire, forte, qui peut devenir la page d'entrée d'AIME. |

## Ce qui ne marche pas aujourd'hui (vérifié)

1. **Aucune fonction serveur ne répond sur la version Vercel.** Toutes les requêtes partent vers `/api/apps/null/...` et renvoient 404 : l'identifiant de l'application Base44 n'est pas configuré sur Vercel. Conséquences observées : Point Zéro reste bloqué sur « Préparation du plan de réponse », « Générer le site » ne génère rien, l'audit EAA répond « L'audit n'a pas abouti », les projets et la publication sont inaccessibles.
2. **Les adresses directes donnent une erreur 404** (`/bureau`, `/carte-unique`, et donc toute adresse `+nom`) : il manque la réécriture vers `index.html` dans la configuration Vercel. On n'y accède qu'en cliquant depuis l'accueil.
3. **Le travail est perdu en fermant l'onglet** : l'état du site en cours vit dans `sessionStorage` (`aime-capsule-site`).
4. **Contrastes défaillants** dans l'onglet Audit EAA : les textes des quatre cartes POUR sont quasi invisibles, le bouton « Identifier » est vide — ironique pour un outil d'accessibilité.
5. **La barre du haut recouvre l'en-tête du Studio** dans le canevas.
6. **Couplage total à Base44** (39 entités, `InvokeLLM`, fichiers) : rien ne fonctionne hors de la plateforme, et la dette du dépôt (mariage, artistes, marketplace, ~60 entités) dépasse de loin le Studio.
7. Pas de tests sur le Studio.

## Refonte proposée dans AIMESTUDIO

On ne copie pas l'application Base44 : on reprend ses **idées éprouvées** dans ce dépôt, sur ce qui existe déjà et fonctionne — le moteur de pages unique `vitrine/rendu.js`, l'éditeur `/sites/` (structure, contenu écrit une fois, style, source, audiences) et les ateliers du Studio. Aucun nouveau moteur.

### Ce qui existe déjà ici

`vitrine/rendu.js` déclare 46 blocs, dont beaucoup recouvrent les étiquettes d'AIME STUDIO : `texte`, `galerie`, `chiffres`, `citation` (témoignages), `faq`, `contact`, `programme`, `rsvp`, `compte`, `lieu`/`carte` (plan & accès), `cadeaux`, `hebergement`, `menu`, `livreor`, `tarifs`, `personnes`/`gens` (équipe), `etapes` (processus, frise), `partenaires`, `liens` (réseaux), `bouton` (appel à l'action)…

### Ce qui manque (les familles Commerce, Contenu et Confiance)

Services / offres, Produits, Réservation, Promotion / annonce, Avant / après, Valeurs / manifeste, Actualités / blog, Portfolio / réalisations, Presse & récompenses, Garanties & labels, Engagement responsable, Newsletter, Recrutement, Mentions légales.

### Les étapes

| Étape | Ce que l'utilisateur pourra faire | Reprise d'AIME STUDIO | Où, ici |
| --- | --- | --- | --- |
| **1. Compléter le catalogue de sections** ✅ livré le 23/10/2026 | Ajouter les 14 sections manquantes depuis `/sites/`, chacune avec sa vraie structure (colonnes, questions/réponses, portraits…), rangées par famille comme dans le Studio | `SECTIONS_SITE`, `STRUCTURES` (`src/lib/bureau/sectionEtiquettes.js`) | `bloc(...)` dans `vitrine/rendu.js` + modèles `vitrine/modeles/` ; test « un site existant rend à l'octet près » conservé |
| **2. Ranger les sections par famille** | Retrouver les 6 familles (Socle, Événementiel, Commerce, Contenu, Confiance, Action) dans la liste « Ajouter une section » | groupes de `SECTIONS_SITE` | `sites/editeur.js` |
| **3. Cartes réutilisables** | Enregistrer une section réglée comme carte et la reposer ailleurs | `capsule/cartes/` | `sites/` (bibliothèque) |
| **4. Réglages dans l'ordre** | Typographie, couleurs, espacements, avec le contraste vérifié en direct | `Panneau*` + pipeline | onglet Style de `/sites/`, `design/systemes.js` |
| **5. Point Zéro → sections « prêtes »** | Déposer textes, images, liens ; voir les sections qui deviennent prêtes et les poser d'un geste | `progressionEtiquette()` | `point-zero/` → `/sites/` |
| **6. Audit EAA d'une URL** | Coller l'adresse d'un site, obtenir son audit et reprendre textes et images, en gardant ce qui est marqué « à garder » | `eaaReferentiel`, `scanA11yFaults` (garde anti-SSRF), `extractSiteContent` | atelier `/accessibilite/` + fonction `api/` |
| **7. Publication +nom** | Publier à une adresse publique stable, versionnée, dépubliable | `PublishedSite`, route `/:adresse` | `/travaux/` + `docs/PUBLICATION.md` ; écritures Neon une fois les comptes livrés |
| **8. Génération par message** | Décrire son site, recevoir des sections déjà remplies, que l'on garde ou non | consignes de `STRUCTURES` (l'IA produit des données, jamais du code) | après les comptes |

Les étapes 1 à 4 ne demandent ni serveur ni compte : elles peuvent partir en production une par une, chacune avec ses tests (`npm test`, parcours navigateur, accessibilité).

Cohérent avec la décision du 23/10/2026 (`docs/CONSOLIDATION-2026-10-23.md`) : **mode site d'abord**, Studio et Canevas comme fonctionnalités accessibles depuis le site, aucun changement destructif.

## À corriger côté Aime-Studio s'il reste en ligne

Indépendamment de la refonte (dépôt `Aime-Studio` non modifié) : renseigner `VITE_BASE44_APP_ID` et `VITE_BASE44_APP_BASE_URL` dans le projet Vercel `aime-studio`, ajouter une réécriture `{"source": "/(.*)", "destination": "/index.html"}`, et corriger les contrastes de l'onglet Audit EAA.
