# Formulaire de contact (Page Zéro → e-mail)

Le formulaire en bas de la Page Zéro (`/#contact`) envoie une demande de devis ou de projet à une fonction serveur
Vercel (`api/contact.js`). La demande est **enregistrée** (table `demandes`), puis transmise **par e-mail via Resend**.
Rien n'est gardé dans le navigateur. Enregistrement, statuts, droits et conservation : voir `docs/DEMANDES.md`.

## Variables d'environnement (Vercel → Settings → Environment Variables)

À créer d'abord pour l'environnement **Preview** seulement. Aucune valeur n'est dans le dépôt.

| Variable | Rôle | Exemple de forme |
|---|---|---|
| `RESEND_API_KEY` | Clé d'API Resend (permission « Sending access » suffit) | `re_…` |
| `CONTACT_TO` | Adresse qui reçoit les demandes (plusieurs : séparées par des virgules) | `vous@votre-domaine.fr` |
| `CONTACT_FROM` | Expéditeur **sur le domaine vérifié dans Resend** | `AIME <contact@votre-domaine.fr>` |
| `CONTACT_ORIGINS` | Facultatif : autres origines autorisées, séparées par des virgules | `https://www.votre-domaine.fr` |

Sans ces trois premières variables, la fonction répond 503 et le formulaire affiche « Le formulaire n'est pas encore
ouvert sur cette version du site. Rien n'a été envoyé. »

## Ce que fait la fonction

- `POST` en JSON seulement, depuis la même origine (en-tête `Origin`), corps limité à 16 Ko.
- Champs validés côté serveur : prénom, nom, e-mail obligatoires ; téléphone, adresse, date de livraison facultatifs ;
  type de demande dans une liste fermée ; message de 20 à 4 000 caractères ; consentement obligatoire.
  Les champs d'une ligne refusent les retours à la ligne ; le HTML de l'e-mail est échappé.
- Anti-robots : champ piège invisible et délai minimal de saisie (3 s). Un robot reçoit « ok » mais rien ne part.
- Limitation : 3 envois par adresse IP toutes les 10 minutes, 30 par heure et par instance (réponse 429 avec
  `Retry-After`). Cette limite vit dans la mémoire de l'instance : elle freine les rafales. Une limite stricte sur
  toutes les instances demanderait un stockage partagé (non activé).
- E-mail : expéditeur = `CONTACT_FROM`, destinataire = `CONTACT_TO`, **adresse du visiteur en Reply-To uniquement**.
  En-tête `Idempotency-Key` : un double clic n'envoie qu'un e-mail.
- Journaux : statuts seulement, jamais de donnée personnelle ni la clé.

## Tester une preview

1. Dans Resend : vérifier le domaine d'envoi, créer une clé.
2. Dans Vercel : ajouter les variables pour **Preview**, puis redéployer la preview de la branche.
3. Ouvrir `/#contact` sur la preview, envoyer une demande avec votre propre adresse : l'e-mail arrive sur `CONTACT_TO`,
   « Répondre » écrit au visiteur.

Tests automatiques : `node --test tests/contact.test.cjs` (envoi simulé, aucune requête réelle).
