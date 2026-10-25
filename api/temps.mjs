// /api/temps : le module Temps (le Programme d'un projet), pour la personne CONNECTÉE (session Better Auth), jamais par laissez-passer.
//   GET  ?espace=<uuid>[&depuis=<rev>]   → { actif, rev, vue } (ou { inchange: true } si rien n'a bougé depuis cette révision)
//   GET  ?espace=<uuid>&journal=1        → l'historique, filtré pour cette personne
//   GET  ?espace=<uuid>&comparer=[<id>]  → (propriétaire) la liste des personnes, ou la vue de l'une, coupée à la sienne
//   GET  ?resume=1                       → les programmes actifs de AI, chaque moment filtré pour la personne connectée
//   POST { action: 'geste', espace, geste: { action, p }, rev }  → { rev, touches } ; 409 si le programme a changé entre-temps
//   POST { action: 'activer', espace }   → le propriétaire importe le programme type de son domaine
// 401 sans session · 404 projet inconnu, rôle échu, moment invisible · 403 règle refusée · 503 module non installé.
// Les anciennes routes du direct (/api/live/*) ne changent pas.
import { auth, personne, _pool } from './_auth/auth.mjs';
import { Refus } from './_auth/espaces.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';
import { lire, resumer, historique, comparer, geste, activer } from './_temps/moteur.mjs';
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { if (req.body.length > 8192) return {}; try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 8192) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
let db = null; export function _db(d) { db = d; }
export default async function temps(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore installés sur cette base.' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous d\'abord.' });
  const base = db || _pool();
  let b = {};
  try {
    if (req.method === 'GET') {
      const q = new URL(req.url || '/', 'http://local').searchParams, espace = String(q.get('espace') || '');
      if (q.has('resume') && !q.has('espace')) return json(res, 200, Object.assign({ ok: true }, await resumer(base, u)));
      if (q.has('journal')) return json(res, 200, Object.assign({ ok: true }, await historique(base, u, { espace })));
      if (q.has('comparer')) return json(res, 200, Object.assign({ ok: true }, await comparer(base, u, { espace, cible: q.get('comparer') || null })));
      return json(res, 200, Object.assign({ ok: true }, await lire(base, u, { espace, depuis: q.has('depuis') ? q.get('depuis') : null })));
    }
    b = await corps(req);
    if (b.action !== 'geste' && b.action !== 'activer') return json(res, 400, { ok: false, raison: 'Action inconnue.' });
    const qt = await Q.quota('temps:geste', u.id, { db: base });
    if (!qt.ok) { res.setHeader('Retry-After', String(qt.attente)); return json(res, 429, { ok: false, raison: 'Trop de changements en peu de temps : patientez un instant.' }); }
    if (b.action === 'activer') return json(res, 200, Object.assign({ ok: true }, await activer(base, u, { espace: b.espace })));
    return json(res, 200, Object.assign({ ok: true }, await geste(base, u, { espace: b.espace, geste: b.geste, rev: b.rev })));
  } catch (e) {
    if (e instanceof Refus) {
      const o = { ok: false, raison: e.raison }; if (e.regle) o.regle = e.regle;
      /* un conflit repart avec la version à jour : le navigateur n'a pas à deviner ce qui a changé */
      if (e.code === 409 && e.conflit) { o.conflit = e.conflit; try { Object.assign(o, await lire(base, u, { espace: b.espace })); } catch { /* la vue suivra au prochain relevé */ } }
      return json(res, e.code, o);
    }
    return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' });
  }
}
