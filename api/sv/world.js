// POST /api/sv/world { journal: [{qui, action, p}], qui, action, p }
// Démonstration AIME WORLD : le serveur part de la donnée d'origine (fictive, côté serveur), rejoue le journal
// en revérifiant chaque action, puis décide de la nouvelle action. Rien n'est enregistré : l'état reste celui de la démonstration.
// L'identité (qui) est une identité de test : son rôle vient de vitrine/acces/world.json, jamais de la requête.
const P = require('../../synchroview/permissions.js');
const F = require('../../synchroview/flux.js');
const BASE = require('../../vitrine/donnees/world.json');
const ACCES = require('../../vitrine/acces/world.json');
module.exports = function world(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV === 'production') return res.status(404).json({ error: 'indisponible' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST seulement' }); }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  const journal = Array.isArray(b.journal) ? b.journal.slice(0, 200) : [];
  if (!ACCES.membres[b.qui]) return res.status(403).json({ allow: false, reason: 'identité de test inconnue', proof: 'serveur' });
  const etat = F.rejouer(BASE, ACCES, P, journal);
  const t = F.transition(etat.contenu, ACCES, P, b.qui, String(b.action || ''), b.p || {});
  if (!t.allow) return res.status(403).json({ allow: false, rule: t.rule, reason: t.reason, proof: 'serveur', ignorees: etat.refus.length });
  return res.status(200).json({ allow: true, rule: t.rule, message: t.message, courriel: t.courriel, proof: 'serveur', effet: 'simulé : rien n\'est enregistré', revision: etat.contenu.revision + 1, ignorees: etat.refus.length });
};
