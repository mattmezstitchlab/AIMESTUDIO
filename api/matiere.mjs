// POST /api/matiere { action, … } : la matière du Point Zéro de la personne connectée.
// liste · ajouter {texte} · importer {textes[]} (les notes de cet appareil, au plus 50) · supprimer {id}
// La personne vient de la session (cookie vérifié par Better Auth), jamais du corps. L'analyse est refaite ici, jamais reprise du navigateur.
import { createRequire } from 'node:module';
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';     /* même origine et corps JSON sur toute écriture (audit Vercel, PR 2) */
const require = createRequire(import.meta.url);
const A = require('../pointzero/analyse.js');
const MAX_TEXTE = 20000, MAX_PAR_PERSONNE = 500, MAX_IMPORT = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let t = ''; for await (const c of req) { t += c; if (t.length > 1200000) return {}; } try { return JSON.parse(t || '{}'); } catch { return {}; }
}
const propre = t => (typeof t === 'string' ? t.replace(/\u0000/g, '').trim() : '');
const sortie = r => ({ id: r.id, texte: r.texte, a: r.lecture, cree: new Date(r.cree_le).toISOString(), origine: 'compte' });
let db = null; export function _db(d) { db = d; }

export default async function matiere(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false }); }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  let u = null; try { u = await personne(req); } catch { return json(res, 503, { ok: false, raison: 'Service indisponible : réessayez.' }); }
  if (!u) return json(res, 401, { ok: false, raison: 'Connectez-vous pour garder votre matière sur votre compte.' });
  const b = await corps(req), base = db || _pool();
  try {
    if (b.action === 'liste') {
      const r = await base.query('select id, texte, lecture, cree_le from matiere where user_id = $1 order by cree_le desc limit $2', [u.id, MAX_PAR_PERSONNE]);
      return json(res, 200, { ok: true, elements: r.rows.map(sortie) });
    }
    if (b.action === 'ajouter' || b.action === 'importer') {
      const textes = (b.action === 'ajouter' ? [b.texte] : (Array.isArray(b.textes) ? b.textes.slice(0, MAX_IMPORT) : [])).map(propre).filter(Boolean);
      if (!textes.length) return json(res, 400, { ok: false, raison: 'Rien à déposer.' });
      if (textes.some(t => t.length > MAX_TEXTE)) return json(res, 413, { ok: false, raison: 'Texte trop long (20 000 caractères au plus) : déposez-le en plusieurs fois.' });
      const n = (await base.query('select count(*)::int as n from matiere where user_id = $1', [u.id])).rows[0].n;
      if (n + textes.length > MAX_PAR_PERSONNE) return json(res, 409, { ok: false, raison: 'Votre Point Zéro est plein (500 éléments) : rangez ou supprimez-en quelques-uns.' });
      const ajout = [];
      for (const t of textes) {
        const r = await base.query('insert into matiere (user_id, texte, lecture) values ($1, $2, $3) returning id, texte, lecture, cree_le', [u.id, t, JSON.stringify(A.analyser(t))]);
        ajout.push(sortie(r.rows[0]));
      }
      return json(res, 200, { ok: true, elements: ajout });
    }
    if (b.action === 'supprimer') {
      if (!UUID.test(String(b.id || ''))) return json(res, 400, { ok: false, raison: 'Élément inconnu.' });
      const r = await base.query('delete from matiere where id = $1 and user_id = $2', [b.id, u.id]);
      return json(res, r.rowCount ? 200 : 404, { ok: !!r.rowCount });
    }
    return json(res, 400, { ok: false, raison: 'Action inconnue.' });
  } catch (e) {
    if (/relation "matiere" does not exist/.test(String(e && e.message))) return json(res, 503, { ok: false, raison: 'Le Point Zéro n\'est pas encore installé sur cette base (migration à exécuter).', manque: 'migration' });
    return json(res, 500, { ok: false, raison: 'Erreur du serveur : réessayez.' });
  }
}
