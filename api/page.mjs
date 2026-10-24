// GET /api/page?espace=<uuid>&gabarit=<acces|journal|personnes|…> : une page composée par le serveur pour la personne connectée
// (docs/GABARITS.md). La personne vient de la session, le rôle de space_members ; rien de la requête n'élargit ce qui est lu.
// 401 sans session · 404 espace introuvable, rôle échu ou gabarit non servi · 400 gabarit inconnu.
// Le Dock de la réponse est composé ici par dock/modele.js composerReel, à partir des gestes que permissions.js accorde
// au rôle lu dans space_members (gestes() de ./_auth/pages.mjs), jamais d'une table par défaut ni de la requête.
import { auth, personne, _pool } from './_auth/auth.mjs';
import { createRequire } from 'module';
import { Refus, role } from './_auth/espaces.mjs';
import { projeter, gestes, pagesDe, actifsDe } from './_auth/pages.mjs';
/* deux lignes, pas une : @vercel/nft (le traçage des fichiers de la fonction) ne voit que require('…') appelé par son nom.
   En une seule expression, dock/modele.js n'était pas emporté et /api/page tombait en production (FUNCTION_INVOCATION_FAILED). */
const require = createRequire(import.meta.url);
const D = require('../dock/modele.js');
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
let db = null; export function _db(d) { db = d; }
export default async function page(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { ok: false }); }
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const q = new URL(req.url || '/', 'http://local').searchParams, espace = String(q.get('espace') || ''), gabarit = String(q.get('gabarit') || '');
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore installés sur cette base (migration à exécuter).' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous d\'abord.' });
  try {
    const base = db || _pool(), p = await projeter(base, u, { espace, gabarit });   /* projeter vérifie le rôle (404 sinon) avant tout */
    const r = await role(base, espace, u.id);
    p.dock = r ? D.composerReel({ roleServeur: r, gestes: gestes({ id: u.id, role: r }), servis: pagesDe({ id: u.id, role: r }, await actifsDe(base, espace)) }) : null;   /* les pages du Dock = les pages servies */
    return json(res, 200, Object.assign({ ok: true }, p));
  }
  catch (e) { if (e instanceof Refus) return json(res, e.code, { ok: false, raison: e.raison }); return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' }); }
}
