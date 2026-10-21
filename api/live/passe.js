// POST /api/live/passe { espace, qui } → laissez-passer signé (démonstration : remplace la connexion tant qu'elle n'existe pas).
// La personne doit être membre de l'espace ; le rôle n'est PAS dans le laissez-passer : il est relu à chaque action.
const C = require('../_live/core.js');
module.exports = function passe(req, res) {
  const b = C.debut(req, res); if (!b) return;
  if (C.freiner(req, 20)) return res.status(429).json({ ok: false });
  const E = C.ESPACES[b.espace];
  if (!E || typeof b.qui !== 'string' || !E.acces.membres[b.qui]) return res.status(403).json({ ok: false, raison: 'pas membre de cet espace' });
  return res.status(200).json({ ok: true, passe: C.signer({ espace: b.espace, qui: b.qui, exp: Date.now() + C.DUREE }) });
};
