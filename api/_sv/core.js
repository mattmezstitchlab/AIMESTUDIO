// SynchroView · démonstration des droits — partie serveur commune.
// Données ENTIÈREMENT FICTIVES, gardées ici côté serveur : le navigateur ne reçoit que ce que la règle autorise.
// Jamais en production : l'étape 3 remplacera ces identités de test par de vrais comptes de test (sessions).
const crypto = require('crypto');
const P = require('../../synchroview/permissions.js');

const IDENTITIES = {
  'u-lea':    { id: 'u-lea',    name: 'Léa',          role: 'owner' },
  'u-camille':{ id: 'u-camille',name: 'Camille',      role: 'editor' },
  'u-lumen':  { id: 'u-lumen',  name: 'Studio Lumen', role: 'contributor' },
  'u-lucie':  { id: 'u-lucie',  name: 'Lucie',        role: 'guest' },
  'u-paul':   { id: 'u-paul',   name: 'Paul',         role: 'viewer' },
  'u-nina':   { id: 'u-nina',   name: 'Nina',         role: 'guest' }
};
// Le rôle vient de l'appartenance à l'espace, ici, jamais de la requête.
const RES = {
  'space':           { type: 'space', id: 'mariage-lea-marc', title: 'Mariage de Léa & Marc (démonstration)' },
  'invite:guest':    { type: 'space', id: 'mariage-lea-marc', role: 'guest' },
  'invite:editor':   { type: 'space', id: 'mariage-lea-marc', role: 'editor' },
  'doc:contrat':     { type: 'document', id: 'contrat', title: 'Contrat · Studio Lumen', authorId: 'u-lumen', grants: ['u-lea'],
                       data: { objet: 'Reportage photo du mariage', montant: '1 200 €', acompte: '360 €', signe: 'en attente' } },
  'event:shooting':  { type: 'event', id: 'shooting', title: 'Séance photo du couple', assigneeId: 'u-lumen', authorId: 'u-camille', public: false,
                       data: { heure: '17:30', lieu: 'Jardin du château', duree: '45 min' } },
  'pay:acompte':     { type: 'payment', id: 'acompte', title: 'Acompte Studio Lumen', amount: 360, payer: 'space', payeeId: 'u-lumen',
                       data: { montant: '360 €', echeance: '15 mars 2027', statut: 'à régler' } },
  'personal:lucie':  { type: 'personal', id: 'rsvp-lucie', subjectId: 'u-lucie', data: { nom: 'Lucie', reponse: 'Oui', regime: 'Végétarien', telephone: '06 12 •• •• 34' } },
  'personal:nina':   { type: 'personal', id: 'rsvp-nina',  subjectId: 'u-nina',  data: { nom: 'Nina',  reponse: 'Non', regime: '—', telephone: '07 45 •• •• 81' } },
  'summary:reponses':{ type: 'summary', id: 'reponses', data: { oui: 1, non: 1, regimes: 'Végétarien × 1' } }
};

function blocked() { return process.env.VERCEL_ENV === 'production'; }
function secret() { return process.env.SV_DEMO_SECRET || ('sv-demo:' + (process.env.VERCEL_GIT_COMMIT_SHA || 'local')); }
function sign(obj) { const b = Buffer.from(JSON.stringify(obj)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', secret()).update(b).digest('base64url'); }
function verify(tok) {
  if (typeof tok !== 'string' || tok.indexOf('.') < 0) return null;
  const [b, h] = tok.split('.'); const want = crypto.createHmac('sha256', secret()).update(b).digest('base64url');
  if (h.length !== want.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(b, 'base64url').toString()); } catch { return null; }
}
function body(req) { const b = req.body; if (!b) return {}; if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } } return b; }
function start(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (blocked()) { res.status(404).json({ error: 'indisponible' }); return null; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'POST seulement' }); return null; }
  const b = body(req); const who = IDENTITIES[b.identity];
  if (!who || who.id === 'u-nina') { res.status(403).json({ error: 'identité de test inconnue' }); return null; }
  return { b, who };
}
// Ce que la personne a le droit de voir de la ressource, rien de plus.
function visible(who, key) { const r = RES[key]; return { title: r.title, data: r.data || null }; }
module.exports = { P, IDENTITIES, RES, start, sign, verify, visible };
