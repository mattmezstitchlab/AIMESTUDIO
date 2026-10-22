// /api/identite : l'état de l'identité AIME de la personne connectée, qui décide de la forme du bouton universel.
// GET  → { connecte, nom, timbre:bool, timbreLe, mondeLe, source }
// POST { action:'timbre' }  confirme le timbre (il faut un nom d'affichage)    POST { action:'monde' } première visite du Monde AIME
// La personne vient de la session (cookie vérifié par Better Auth), jamais du corps. Table « identite » (migration
// db/migrations/2026-10-22-identite.sql) ; si elle manque, l'état se déduit du compte (un nom = un timbre) et le dit.
import { auth, personne, _pool } from './_auth/auth.mjs';
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 4000) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
let db = null; export function _db(d) { db = d; }
const iso = d => (d ? new Date(d).toISOString() : null);
async function table(base) { const r = await base.query("select to_regclass('public.identite') as t"); return !!(r.rows[0] && r.rows[0].t); }

export default async function identite(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false }); }
  if (!auth()) return json(res, 200, { ok: true, connecte: false, timbre: false, ouvert: false });
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Service indisponible : réessayez.' }); }
  if (!u) return json(res, req.method === 'GET' ? 200 : 401, { ok: req.method === 'GET', connecte: false, timbre: false, ouvert: true, raison: req.method === 'GET' ? undefined : 'Connectez-vous d\'abord.' });
  const base = db || _pool(), nom = (u.nom || '').trim();
  try {
    const t = await table(base);
    if (req.method === 'POST') {
      const b = await corps(req);
      if (b.action === 'timbre') {
        if (!nom) return json(res, 400, { ok: false, raison: 'Choisissez d\'abord un nom d\'affichage : il est écrit sur votre timbre.' });
        if (!t) return json(res, 200, { ok: true, connecte: true, nom, timbre: true, timbreLe: null, mondeLe: null, source: 'compte' });
        await base.query('insert into identite (user_id, timbre_le) values ($1, now()) on conflict (user_id) do update set timbre_le = coalesce(identite.timbre_le, now())', [u.id]);
      } else if (b.action === 'monde') {
        if (t) await base.query('update identite set monde_le = coalesce(monde_le, now()) where user_id = $1 and timbre_le is not null', [u.id]);
      } else return json(res, 400, { ok: false, raison: 'Action inconnue.' });
    }
    if (!t) return json(res, 200, { ok: true, connecte: true, nom, timbre: !!nom, timbreLe: null, mondeLe: null, source: 'compte' });
    const r = await base.query('select timbre_le, monde_le from identite where user_id = $1', [u.id]), l = r.rows[0] || {};
    return json(res, 200, { ok: true, connecte: true, nom, timbre: !!l.timbre_le, timbreLe: iso(l.timbre_le), mondeLe: iso(l.monde_le), source: 'identite' });
  } catch { return json(res, 503, { ok: false, raison: 'Service indisponible : réessayez.' }); }
}
