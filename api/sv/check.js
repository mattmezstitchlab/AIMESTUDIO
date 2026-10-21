// POST /api/sv/check { identity, checks:[{res, action}] } → décisions évaluées ici, côté serveur.
const { P, RES, start } = require('../_sv/core.js');
module.exports = function check(req, res) {
  const s = start(req, res); if (!s) return;
  const checks = Array.isArray(s.b.checks) ? s.b.checks.slice(0, 60) : [];
  const results = checks.map(c => {
    const r = RES[c.res]; if (!r) return { res: c.res, action: c.action, allow: false, rule: 'ressource', reason: 'ressource inconnue' };
    const d = P.canStart(s.who, String(c.action), r);
    return { res: c.res, action: c.action, allow: !!d.allow, needsTx: !!d.needsTx, rule: d.rule, reason: d.reason };
  });
  res.status(200).json({ identity: { id: s.who.id, name: s.who.name }, role: s.who.role, proof: 'serveur', results });
};
