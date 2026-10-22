// Le droit « propriétaire du site », décidé ici, côté serveur.
// Source : AIME_PROPRIETAIRES, des identifiants de compte Better Auth séparés par des virgules (variable d'environnement
// Vercel). La liste n'est jamais envoyée au navigateur : seule la réponse oui / non pour la personne connectée l'est.
// Sans variable, personne n'est propriétaire (fermé par défaut).
import { personne } from './auth.mjs';
export function identifiants(env = process.env) {
  return String(env.AIME_PROPRIETAIRES || '').split(',').map(s => s.trim()).filter(s => /^[A-Za-z0-9_-]{6,128}$/.test(s));
}
export function estProprietaireId(id, env = process.env) { return typeof id === 'string' && id.length > 0 && identifiants(env).includes(id); }
/* la personne de la session si elle est propriétaire, sinon null (aucune session, autre compte, service indisponible) */
export async function proprietaire(req, env = process.env) {
  let u = null; try { u = await personne(req); } catch { return null; }
  return u && estProprietaireId(u.id, env) ? u : null;
}
