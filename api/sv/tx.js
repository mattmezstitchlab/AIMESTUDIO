// POST /api/sv/tx { identity, res } → autorisation propre à UNE transaction (60 s), seulement si le rôle peut payer ce paiement.
const { P, RES, start, sign } = require('../_sv/core.js');
module.exports = async function tx(req, res) {
  const s = await start(req, res); if (!s) return;
  const r = RES[s.b.res];
  if (!r || r.type !== 'payment') return res.status(404).json({ allow: false, reason: 'paiement inconnu' });
  const d = P.canStart(s.who, 'pay', r);
  if (!d.allow) return res.status(403).json({ allow: false, rule: d.rule, reason: d.reason, proof: 'serveur' });
  const t = { subjectId: s.who.id, paymentId: r.id, amount: r.amount, expires: Date.now() + 60000 };
  return res.status(200).json({ tx: sign(t), montant: r.amount, expire: 60 });
};
