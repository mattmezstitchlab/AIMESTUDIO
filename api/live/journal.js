// POST /api/live/journal { passe, depuis } → les lignes après « depuis », filtrées pour cette personne.
// Chaque appareil rejoue lui-même ; les annonces d'équipe ne sortent pas vers les invités.
const C = require('../_live/core.js');
module.exports = async function journal(req, res) {
  const b = C.debut(req, res); if (!b) return;
  const ps = C.lirePasse(b.passe); if (!ps) return res.status(401).json({ ok: false, raison: 'laissez-passer invalide ou expiré' });
  if (C.freiner(req, 120)) return res.status(429).json({ ok: false });
  const depuis = Math.max(0, Math.floor(Number(b.depuis) || 0));
  const sql = C.base(); if (!sql) return C.ferme(res);
  try {
    const E = await C.espace(ps.espace, sql); if (!E || !E.acces.membres[ps.qui]) return res.status(403).json({ ok: false, raison: 'pas membre de cet espace' });
    const lignes = await sql`select n, qui, action, p, t from live_journal where espace = ${ps.espace} and n > ${depuis} order by n asc limit ${C.MAX_LIGNES}`;
    const dernier = lignes.length ? Number(lignes[lignes.length - 1].n) : depuis;
    return res.status(200).json({ ok: true, dernier, lignes: C.filtrer(lignes.map(l => ({ n: Number(l.n), qui: l.qui, action: l.action, p: l.p, t: l.t })), E.acces, ps.qui) });
  } catch { return C.ferme(res); }
};
