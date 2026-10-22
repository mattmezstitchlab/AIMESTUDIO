// POST /api/sv/act { identity, res, action, tx? } → l'action est REVÉRIFIÉE ici.
// Refus : 403. Autorisé : l'effet est simulé (rien n'est enregistré), les données renvoyées sont celles que la règle permet.
const { P, RES, start, verify, visible } = require('../_sv/core.js');
module.exports = async function act(req, res) {
  const s = await start(req, res); if (!s) return;
  const r = RES[s.b.res]; const action = String(s.b.action || '');
  if (!r) return res.status(404).json({ allow: false, reason: 'ressource inconnue' });
  const tx = s.b.tx ? verify(s.b.tx) : null;
  const d = P.can(s.who, action, r, { tx });
  if (!d.allow) return res.status(403).json({ allow: false, needsTx: !!d.needsTx, rule: d.rule, reason: d.reason, proof: 'serveur' });
  const out = { allow: true, rule: d.rule, proof: 'serveur', effet: action === 'read' ? 'lecture' : 'simulé : rien n\'est enregistré' };
  if (action === 'read') out.resource = visible(s.who, s.b.res);
  return res.status(200).json(out);
};
