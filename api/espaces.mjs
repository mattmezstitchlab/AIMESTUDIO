// POST /api/espaces { action, … } : créer un espace, inviter, rejoindre, membres, retirer, annuler, accès pour le direct.
// La personne vient de la session (cookie vérifié par Better Auth), jamais du corps de la requête.
import { auth, personne, adresse, _pool } from './_auth/auth.mjs';
import { ACTIONS, Refus } from './_auth/espaces.mjs';
import R from './_auth/requete.cjs';     /* même origine et corps JSON sur toute écriture (audit Vercel, PR 2) */
import Q from './_auth/quotas.cjs';      /* créer et inviter : par personne et par heure, partagé entre instances */
import { ACTIONS_ACTIVITES } from './_auth/activites.mjs';   /* « activite », « activites » : un métier, aucun droit dans aucun projet */
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 8192) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
let db = null; export function _db(d) { db = d; }
export default async function espaces(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false }); }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const b = await corps(req), f = Object.hasOwn(ACTIONS, b.action) ? ACTIONS[b.action] : Object.hasOwn(ACTIONS_ACTIVITES, b.action) ? ACTIONS_ACTIVITES[b.action] : null;
  if (!f) return json(res, 400, { ok: false, raison: 'Action inconnue.' });
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore installés sur cette base (migration à exécuter).' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous d\'abord.' });
  /* quotas partagés : 10 projets créés et 60 invitations par personne et par heure (le reste n'écrit qu'à la marge) */
  const nomQuota = b.action === 'creer' ? 'espaces:creer' : b.action === 'inviter' ? 'espaces:inviter' : null;
  if (nomQuota) { const q = await Q.quota(nomQuota, u.id, { db: db || _pool() }); if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: b.action === 'creer' ? 'Trop de projets créés en peu de temps : réessayez dans un moment.' : 'Trop d\'invitations en peu de temps : réessayez dans un moment.' }); } }
  try { return json(res, 200, Object.assign({ ok: true }, await f(db || _pool(), u, b, adresse()))); }
  catch (e) { if (e instanceof Refus) return json(res, e.code, { ok: false, raison: e.raison }); return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' }); }
}
