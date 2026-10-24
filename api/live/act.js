// POST /api/live/act { passe, action, p, t } → l'action est rejouée ici, après tout le journal, avec les règles de l'espace.
// Refusée : 403 et rien n'est écrit. Acceptée : une ligne ajoutée (jamais modifiée ni effacée).
const C = require('../_live/core.js');
module.exports = async function act(req, res) {
  const b = C.debut(req, res); if (!b) return;
  const ps = C.lirePasse(b.passe); if (!ps) return res.status(401).json({ ok: false, raison: 'laissez-passer invalide ou expiré' });
  if (!(await C.quota(req, 'live:act')).ok) return res.status(429).json({ ok: false, raison: 'trop d\'actions, patientez une minute' });
  const a = C.L.action({ qui: ps.qui, action: b.action, p: b.p, t: b.t });   /* qui = le laissez-passer, jamais le corps */
  if (!a) return res.status(400).json({ ok: false, raison: 'action mal formée' });
  const sql = C.base(); if (!sql) return C.ferme(res);
  try {
    const lignes = await sql`select qui, action, p, t from live_journal where espace = ${ps.espace} order by n desc limit ${C.MAX_LIGNES}`;
    const E = await C.espace(ps.espace, sql); if (!E) return res.status(403).json({ ok: false, raison: 'pas membre de cet espace' });
    const r = C.L.rejouer(C.L.base(E.donnees), E.acces, lignes.reverse().concat([a]), C.P), d = r.trace[r.trace.length - 1];
    if (!d.ok) return res.status(403).json({ ok: false, regle: d.regle, raison: d.raison });
    const [l] = await sql`insert into live_journal (espace, qui, action, p, t) values (${ps.espace}, ${a.qui}, ${a.action}, ${JSON.stringify(a.p)}::jsonb, ${a.t}) returning n`;
    return res.status(200).json({ ok: true, n: Number(l.n), regle: d.regle, touches: d.touches });
  } catch { return C.ferme(res); }
};
