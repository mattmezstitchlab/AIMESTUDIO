// AIME Live · partie serveur commune (démonstration, données fictives).
// Le serveur ne fait confiance ni au rôle ni au journal envoyés par le navigateur :
// l'identité vient d'un laissez-passer qu'IL a signé, le rôle de vitrine/acces, et chaque action est rejouée avec les règles.
// Fermé par défaut : sans base (DATABASE_URL) ou sans table, 503.
// En production, les deux démonstrations restent dans le navigateur (pas de journal public partagé que n'importe qui pourrait écrire) :
// seuls les espaces réels, réservés à leurs membres connectés, passent par le serveur. Et le secret de signature y est obligatoire.
const crypto = require('crypto');
const L = require('../../live/modele.js'), P = require('../../synchroview/permissions.js');
const Q = require('../_auth/quotas.cjs'), R = require('../_auth/requete.cjs');   /* quotas partagés ; même origine et corps JSON (audit Vercel, PR 2) */
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
  /* un projet passé au module Temps a UNE vérité, la table moments (api/temps.mjs) : l'ancien direct, qui rejoue le programme type,
     lui est fermé (même réponse qu'un non-membre), pour qu'aucun écran ne montre deux programmes différents */
  try { const t = await sql`select 1 as x from temps_espaces where space_id = ${id}`; if (t.length) return null; } catch { /* module non installé : rien ne change */ }
  /* les rôles actifs seulement : après sa date de fin (colonne jusqu_au, si la migration est appliquée), un membre n'est plus là */
  const c = await sql`select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'space_members' and column_name = 'jusqu_au'`;
  const m = c[0] && c[0].n ? await sql`select user_id, role from space_members where space_id = ${id} and (jusqu_au is null or jusqu_au > now())` : await sql`select user_id, role from space_members where space_id = ${id}`;
  const membres = {}; m.forEach(r => { membres[r.user_id] = r.role; });
  return { donnees: ESPACES[s[0].modele].donnees, acces: { membres }, reel: true };
}

const enProd = () => process.env.VERCEL_ENV === 'production';
/* jamais de secret devinable en production (le commit est public) : sans vrai secret, pas de laissez-passer */
/* le secret du direct lui est propre (LIVE_SECRET, 32 caractères au moins) : jamais celui des comptes ni d'une démonstration.
   En production il est obligatoire ; sans lui, rien n'est signé et le direct reste fermé (503). Hors production, une clé de travail. */
function secret() { const s = process.env.LIVE_SECRET || process.env.LIVE_DEMO_SECRET; if (s && s.length >= 32) return s; return enProd() ? null : ('live-demo:' + (process.env.VERCEL_GIT_COMMIT_SHA || 'local')); }
function demoServeur() { return !enProd(); }
function signer(o) { const k = secret(); if (!k) return null; const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', k).update(b).digest('base64url'); }
function lirePasse(tok) {
  if (typeof tok !== 'string' || tok.length > 600 || tok.indexOf('.') < 0) return null;
  const k = secret(); if (!k) return null;
  const [b, h] = tok.split('.'); const want = crypto.createHmac('sha256', k).update(b).digest('base64url');
  if (!h || h.length !== want.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(want))) return null;
  try { const o = JSON.parse(Buffer.from(b, 'base64url').toString()); return o && ((ESPACES[o.espace] && demoServeur()) || UUID.test(o.espace)) && typeof o.qui === 'string' && o.exp > Date.now() ? o : null; } catch { return null; }
}
function corps(req) { const b = req.body; if (!b) return {}; if (typeof b === 'string') { if (b.length > 8192) return {}; try { return JSON.parse(b); } catch { return {}; } } return b; }

/* la base : injectable pour les tests ; jamais d'erreur de connexion renvoyée au navigateur */
let fabrique = null;
function base() { if (fabrique) return fabrique(); if (!process.env.DATABASE_URL) return null; const { neon } = require('@neondatabase/serverless'); return neon(process.env.DATABASE_URL); }

/* quelques envois par minute et par adresse, en mémoire de l'instance : un frein, pas un mur */
const vus = new Map();
/* les écritures du direct (actions, laissez-passer) : un quota partagé entre instances ; la lecture du journal, interrogée toutes
   les quelques secondes, garde le frein en mémoire ci-dessous (un compteur en base doublerait ses requêtes) */
async function quota(req, nom) { return Q.quota(nom, Q.ipDe(req)); }
function freiner(req, max) {
  const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'inconnue', t = Date.now();
  const l = (vus.get(ip) || []).filter(x => t - x < 60000); l.push(t); vus.set(ip, l); if (vus.size > 5000) vus.clear(); return l.length > max;
}

function debut(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ ok: false }); return null; }
  const refus = R.ecriture(req); if (refus) { res.status(refus[0]).json(refus[1]); return null; }
  return corps(req);
}
const ferme = res => res.status(503).json({ ok: false, raison: 'Le direct entre appareils n\'est pas encore ouvert sur cet environnement.' });

/* ce que cette personne peut recevoir du journal : les annonces d'équipe restent à l'équipe */
function equipe(acces, qui) { const s = L.sujet(acces, qui); return !!(s.role && P.can(s, 'read', { type: 'item', audience: 'equipe' }).allow); }
function filtrer(lignes, acces, qui) { const eq = equipe(acces, qui); return lignes.filter(a => eq || !(a.action === 'annoncer' && a.p && a.p.audience === 'equipe')); }

module.exports = { demoServeur, L, P, ESPACES, UUID, espace, DUREE, MAX_LIGNES, signer, lirePasse, base, freiner, quota, debut, ferme, filtrer, _base(f) { fabrique = f; }, _reinitialiser() { vus.clear(); } };
