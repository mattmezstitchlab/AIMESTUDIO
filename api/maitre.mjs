// GET /api/maitre : les compteurs de la facette « Comptes et espaces » du Cube Maître. Propriétaire du site seulement.
// Le droit est décidé ici, côté serveur (proprietaire(req), AIME_PROPRIETAIRES) ; toute autre personne, une erreur ou une
// base absente reçoivent 404, comme si la route n'existait pas.
// Lecture seule : des count(*) agrégés, jamais une ligne, un nom, un e-mail ni un identifiant. Les tables de la V1
// (matiere, identite) peuvent manquer : leur compteur vaut alors null, sans erreur.
import { _pool } from './_auth/auth.mjs';
import { proprietaire } from './_auth/proprietaire.mjs';
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
let verifier = proprietaire, db = null;
export function _proprietaire(f) { verifier = f || proprietaire; }
export function _db(d) { db = d; }

const REQUETES = {
  comptes: 'select count(*)::int as n from "user"',
  espaces: 'select count(*)::int as n from spaces',
  membres: 'select count(*)::int as n from space_members',
  invitations: 'select count(*)::int as n from invitations where used_at is null',
  matiere: 'select count(*)::int as n from matiere',
  identites: 'select count(*)::int as n from identite where timbre_le is not null',
};
const FACULTATIVES = { matiere: 'matiere', identites: 'identite' };

export default async function maitre(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { ok: false }); }
  let u = null;
  try { u = await verifier(req); } catch { u = null; }
  if (!u) return json(res, 404, { ok: false });
  let base;
  try { base = db || _pool(); } catch { base = null; }
  if (!base) return json(res, 404, { ok: false });
  const comptes = {};
  try {
    for (const [cle, sql] of Object.entries(REQUETES)) {
      const t = FACULTATIVES[cle];
      if (t) { const r = await base.query('select to_regclass($1) as t', ['public.' + t]); if (!(r.rows[0] && r.rows[0].t)) { comptes[cle] = null; continue; } }
      const r = await base.query(sql); const n = Number(r.rows[0] && r.rows[0].n);
      comptes[cle] = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
  } catch { return json(res, 503, { ok: false }); }
  return json(res, 200, { ok: true, comptes, le: new Date().toISOString() });
}
