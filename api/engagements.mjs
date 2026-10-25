// /api/engagements : les engagements d'un projet (V1, PR P6), pour la personne CONNECTÉE (session Better Auth).
//   GET  ?espace=<uuid>                     → { engagements, peutPrendre, peutDemander, personnes:[{ ref, nom }], aujourdhui }
//   GET                                     → MES engagements ouverts dans tous mes projets (AI : « ce qui me concerne »)
//   POST { action: 'creer', espace, titre, echeance: 'AAAA-MM-JJ', de?: ref, pour?: ref }  → { ref, etat }
//   POST { action: 'geste', espace, ref, geste: accepter | refuser | tenir | annuler, rev? } → { ref, etat, rev }
// Les droits : synchroview/permissions.js (type « engagement »), relus au serveur à chaque appel (api/_engagements/moteur.mjs).
// 401 sans session · 404 projet inconnu, rôle échu, engagement hors de portée · 403 règle refusée · 409 déjà changé · 503 non installé.
import { auth, personne, _pool } from './_auth/auth.mjs';
import { Refus } from './_auth/espaces.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';
import { lister, miens, creer, agir } from './_engagements/moteur.mjs';
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { if (req.body.length > 8192) return {}; try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 8192) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
let db = null; export function _db(d) { db = d; }
export default async function engagements(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore installés sur cette base.' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous d\'abord.' });
  const base = db || _pool();
  try {
    if (req.method === 'GET') {
      const espace = new URL(req.url || '/', 'http://local').searchParams.get('espace');
      return json(res, 200, Object.assign({ ok: true }, espace ? await lister(base, u, { espace }) : await miens(base, u)));
    }
    const b = await corps(req);
    if (b.action !== 'creer' && b.action !== 'geste') return json(res, 400, { ok: false, raison: 'Action inconnue.' });
    const q = await Q.quota('engagement:geste', u.id, { db: base });
    if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Trop de changements en peu de temps : patientez un instant.' }); }
    return json(res, 200, Object.assign({ ok: true }, b.action === 'creer' ? await creer(base, u, b) : await agir(base, u, b)));
  } catch (e) {
    if (e instanceof Refus) return json(res, e.code, { ok: false, raison: e.raison });
    return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' });
  }
}
