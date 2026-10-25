// AIME · /api/carte-publique?l=<jeton> : ce qu'une Carte montre à qui a son lien (V1, PR P2). Sans compte, sans session.
// Ne sert QUE les rubriques marquées « publique », calculées au serveur à chaque ouverture (api/_carte/carte.cjs vuePublique) :
// jamais la naissance ni les relations, jamais la photo, jamais l'identifiant du compte ni son adresse e-mail.
// Lien inconnu, coupé, ou Carte retirée du compte : 404, sans dire lequel. Aucune adresse IP gardée (le quota n'en garde qu'une
// empreinte, 48 h au plus) ; un compteur d'ouvertures, que seul le propriétaire voit. Jamais indexé, jamais mis en cache.
import { _pool } from './_auth/auth.mjs';
import Q from './_auth/quotas.cjs';
import K from './_carte/carte.cjs';

let db; export function _db(d) { db = d; }
const JETON = /^[A-Za-z0-9_-]{32,64}$/;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
const INTROUVABLE = { ok: false, raison: 'Ce lien ne mène à aucune Carte : il a peut-être été coupé par la personne qui l\'avait partagé.' };

export default async function cartePublique(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { ok: false }); }
  const jeton = new URL(req.url || '/', 'http://local').searchParams.get('l') || '';
  if (!JETON.test(jeton)) return json(res, 404, INTROUVABLE);
  const base = db !== undefined ? db : _pool();
  if (!base) return json(res, 503, { ok: false, raison: 'Cette Carte ne peut pas être affichée pour l\'instant.' });
  try {
    const q = await Q.quota('carte:lecture', Q.ipDe(req), { db: base });
    if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Trop d\'ouvertures en peu de temps : réessayez dans un moment.' }); }
    const r = await base.query(`update cartes_liens l set ouvertures = least(l.ouvertures + 1, 2000000000) from cartes c
        where l.jeton = $1 and l.coupe_le is null and c.user_id = l.user_id returning c.donnees`, [jeton]);
    if (!r.rows[0]) return json(res, 404, INTROUVABLE);
    return json(res, 200, Object.assign({ ok: true }, K.vuePublique(r.rows[0].donnees)));
  } catch (e) {
    if (e && e.code === '42P01') return json(res, 404, INTROUVABLE);
    return json(res, 503, { ok: false, raison: 'Cette Carte ne peut pas être affichée pour l\'instant.' });
  }
}
