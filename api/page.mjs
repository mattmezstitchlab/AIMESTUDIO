// GET /api/page?espace=<uuid>&gabarit=<acces|journal|personnes|…> : une page composée par le serveur pour la personne connectée
// (docs/GABARITS.md). La personne vient de la session, le rôle de space_members ; rien de la requête n'élargit ce qui est lu.
// 401 sans session · 404 espace introuvable, rôle échu ou gabarit non servi · 400 gabarit inconnu.
import { auth, personne, _pool } from './_auth/auth.mjs';
import { Refus } from './_auth/espaces.mjs';
import { projeter } from './_auth/pages.mjs';
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
let db = null; export function _db(d) { db = d; }
export default async function page(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { ok: false }); }
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const q = new URL(req.url || '/', 'http://local').searchParams, espace = String(q.get('espace') || ''), gabarit = String(q.get('gabarit') || '');
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore installés sur cette base (migration à exécuter).' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous d\'abord.' });
  try { return json(res, 200, Object.assign({ ok: true }, await projeter(db || _pool(), u, { espace, gabarit }))); }
  catch (e) { if (e instanceof Refus) return json(res, e.code, { ok: false, raison: e.raison }); return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' }); }
}
