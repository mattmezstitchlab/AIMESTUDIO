// AIME Live · partie serveur commune (démonstration, données fictives).
// Le serveur ne fait confiance ni au rôle ni au journal envoyés par le navigateur :
// l'identité vient d'un laissez-passer qu'IL a signé, le rôle de vitrine/acces, et chaque action est rejouée avec les règles.
// Fermé par défaut : sans base (DATABASE_URL) ou sans table, 503 ; en production, 404.
const crypto = require('crypto');
const L = require('../../live/modele.js'), P = require('../../synchroview/permissions.js');
const ESPACES = {
  mariage: { donnees: require('../../vitrine/donnees/mariage.json'), acces: require('../../vitrine/acces/mariage.json') },
  seminaire: { donnees: require('../../vitrine/donnees/seminaire.json'), acces: require('../../vitrine/acces/seminaire.json') }
};
/* l'écran de salle est un invité de chaque espace : il ne lit que le public et n'agit sur rien */
const ECRAN = 'ecran-salle';
Object.keys(ESPACES).forEach(k => { const a = ESPACES[k].acces; ESPACES[k].acces = Object.assign({}, a, { membres: Object.assign({}, a.membres, { [ECRAN]: 'guest' }) }); });
const DUREE = 12 * 3600 * 1000, MAX_LIGNES = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* un espace : une des deux démonstrations, ou un espace réel (son modèle, et ses membres relus dans la base à chaque appel) */
async function espace(id, sql) {
  if (ESPACES[id]) return ESPACES[id];
  if (!UUID.test(String(id || '')) || !sql) return null;
  const s = await sql`select data->>'modele' as modele from spaces where id = ${id}`;
  if (!s[0] || !ESPACES[s[0].modele]) return null;
  const m = await sql`select user_id, role from space_members where space_id = ${id}`;
  const membres = {}; m.forEach(r => { membres[r.user_id] = r.role; });
  return { donnees: ESPACES[s[0].modele].donnees, acces: { membres }, reel: true };
}

function secret() { return process.env.LIVE_DEMO_SECRET || process.env.SV_DEMO_SECRET || ('live-demo:' + (process.env.VERCEL_GIT_COMMIT_SHA || 'local')); }
function signer(o) { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', secret()).update(b).digest('base64url'); }
function lirePasse(tok) {
  if (typeof tok !== 'string' || tok.length > 600 || tok.indexOf('.') < 0) return null;
  const [b, h] = tok.split('.'); const want = crypto.createHmac('sha256', secret()).update(b).digest('base64url');
  if (!h || h.length !== want.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(want))) return null;
  try { const o = JSON.parse(Buffer.from(b, 'base64url').toString()); return o && (ESPACES[o.espace] || UUID.test(o.espace)) && typeof o.qui === 'string' && o.exp > Date.now() ? o : null; } catch { return null; }
}
function corps(req) { const b = req.body; if (!b) return {}; if (typeof b === 'string') { if (b.length > 8192) return {}; try { return JSON.parse(b); } catch { return {}; } } return b; }

/* la base : injectable pour les tests ; jamais d'erreur de connexion renvoyée au navigateur */
let fabrique = null;
function base() { if (fabrique) return fabrique(); if (!process.env.DATABASE_URL) return null; const { neon } = require('@neondatabase/serverless'); return neon(process.env.DATABASE_URL); }

/* quelques envois par minute et par adresse, en mémoire de l'instance : un frein, pas un mur */
const vus = new Map();
function freiner(req, max) {
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'inconnue', t = Date.now();
  const l = (vus.get(ip) || []).filter(x => t - x < 60000); l.push(t); vus.set(ip, l); if (vus.size > 5000) vus.clear(); return l.length > max;
}

function debut(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV === 'production') { res.status(404).json({ ok: false }); return null; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false }); return null; }
  return corps(req);
}
const ferme = res => res.status(503).json({ ok: false, raison: 'Le direct entre appareils n\'est pas encore ouvert sur cet environnement.' });

/* ce que cette personne peut recevoir du journal : les annonces d'équipe restent à l'équipe */
function equipe(acces, qui) { const s = L.sujet(acces, qui); return !!(s.role && P.can(s, 'read', { type: 'item', audience: 'equipe' }).allow); }
function filtrer(lignes, acces, qui) { const eq = equipe(acces, qui); return lignes.filter(a => eq || !(a.action === 'annoncer' && a.p && a.p.audience === 'equipe')); }

module.exports = { L, P, ESPACES, UUID, espace, DUREE, MAX_LIGNES, signer, lirePasse, base, freiner, debut, ferme, filtrer, _base(f) { fabrique = f; }, _reinitialiser() { vus.clear(); } };
