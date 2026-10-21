// POST /api/live/passe { espace, qui } → laissez-passer signé.
// Démonstration (mariage, seminaire) : une personne fictive membre de l'espace.
// Espace réel (uuid) : la personne CONNECTÉE (session vérifiée), membre de l'espace ; « qui » est ignoré.
// Le rôle n'est jamais dans le laissez-passer : il est relu à chaque action.
const C = require('../_live/core.js');
module.exports = async function passe(req, res) {
  const b = C.debut(req, res); if (!b) return;
  if (C.freiner(req, 20)) return res.status(429).json({ ok: false });
  if (C.UUID.test(String(b.espace || ''))) {
    const sql = C.base(); if (!sql) return C.ferme(res);
    let u = null; try { u = await (await import('../_auth/auth.mjs')).personne(req); } catch { u = null; }
    if (!u) return res.status(401).json({ ok: false, raison: 'Connectez-vous pour rejoindre ce direct.' });
    let E = null; try { E = await C.espace(b.espace, sql); } catch { return C.ferme(res); }
    if (!E || !E.acces.membres[u.id]) return res.status(403).json({ ok: false, raison: 'pas membre de cet espace' });
    return res.status(200).json({ ok: true, passe: C.signer({ espace: b.espace, qui: u.id, exp: Date.now() + C.DUREE }), qui: u.id });
  }
  const E = C.ESPACES[b.espace];
  if (!E || typeof b.qui !== 'string' || !E.acces.membres[b.qui]) return res.status(403).json({ ok: false, raison: 'pas membre de cet espace' });
  return res.status(200).json({ ok: true, passe: C.signer({ espace: b.espace, qui: b.qui, exp: Date.now() + C.DUREE }) });
};
