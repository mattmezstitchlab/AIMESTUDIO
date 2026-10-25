// La Carte enregistrée sur le compte (V1, PR P1) : /api/carte contre une base PostgreSQL de TEST, avec de vraies sessions.
// Prouve : sans session, rien ; chacun ne lit et n'écrit que SA Carte ; rien sans accord ; ce qui ne quitte jamais l'appareil
// (photo, relations, historique) ; une rubrique jamais publique refusée ; jamais publiée par cette voie ; deux appareils sans
// écrasement silencieux (409) ; retrait ; suppression du compte ; même origine et JSON ; base sans la migration : 503, dit.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('crypto');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8783';
if (URLT) Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE });
delete process.env.VERCEL_ENV;
const M = require('../carte/carte.js');
let A, H, pool, liens = [], ip = 0;

function appel(o = {}) {
  return new Promise(d => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null, h: this.h }); } };
    const req = { method: o.method || 'GET', url: '/api/carte', body: o.body,
      headers: Object.assign({ origin: BASE, host: 'localhost:8783', 'content-type': 'application/json' }, o.cookie ? { cookie: o.cookie } : {}, o.headers || {}) };
    H.default(req, res);
  });
}
const lire = cookie => appel({ cookie });
const ecrire = (cookie, body, headers) => appel({ method: 'POST', cookie, body, headers });
async function connecter(email) {
  const a = A.auth(); liens = [];
  await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) }, body: JSON.stringify({ email, callbackURL: '/compte/' }) }));
  const r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ip % 250) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
function maCarte(champs) {
  let c = M.vide('2026-10-25'); c = M.modifier(c, Object.assign({ nom: 'Camille Fictive', intention: 'Jouer au mariage de mes amis', competences: ['saxophone'] }, champs || {}), 'essai', '2026-10-25');
  return c;
}

test.before(async () => {
  H = await import('../api/carte.mjs');
  if (!URLT) return;
  A = await import('../api/_auth/auth.mjs'); A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate cartes').catch(() => {}); await pool.query('truncate quotas').catch(() => {});
});
test.after(async () => { if (pool) await pool.end(); });

test('sans session : 401, rien n\'est lu ni écrit', opts, async () => {
  assert.equal((await lire()).code, 401);
  assert.equal((await ecrire(undefined, { action: 'enregistrer', carte: maCarte(), consentement: true })).code, 401);
});

test('enregistrer exige l\'accord ; ensuite la Carte est sur le compte, privée, sans photo, relations ni historique', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  assert.deepEqual((await lire(c)).body.carte, null, 'au départ : aucune Carte sur le compte');
  const carte = maCarte(); carte.photo = 'data:image/png;base64,AAAA'; carte.relations = ['Anne, ma sœur']; carte.visibilite.nom = 'publique';
  carte.publication = { publiee: true, consentement: { date: '2026-10-25' }, revoqueeLe: null };
  assert.equal((await ecrire(c, { action: 'enregistrer', carte, consentement: false })).code, 400, 'sans accord : refusé');
  const r = await ecrire(c, { action: 'enregistrer', carte, consentement: true, rev: null });
  assert.equal(r.code, 200); assert.equal(r.body.rev, 1);
  assert.deepEqual(r.body.retenus.sort(), ['historique', 'photo', 'relations'], 'la réponse dit ce qui est resté sur l\'appareil');
  const g = (await lire(c)).body.carte;
  assert.equal(g.nom, 'Camille Fictive'); assert.deepEqual(g.competences, ['saxophone']);
  assert.equal(g.photo, null, 'jamais la photo'); assert.deepEqual(g.relations, [], 'jamais les relations (des tiers)'); assert.deepEqual(g.historique, [], 'jamais l\'historique');
  assert.equal(g.publication.publiee, false, 'jamais publiée par cette voie, même si l\'appareil le demandait');
  assert.equal(g.visibilite.nom, 'publique', 'la visibilité choisie est gardée (elle ne sert qu\'au futur lien public)');
  const ligne = (await pool.query('select consentement_le, consentement_texte from cartes c join "user" u on u.id = c.user_id where u.email = $1', ['carte.une@exemple.test'])).rows[0];
  assert.ok(ligne.consentement_le && /privée/.test(ligne.consentement_texte), 'l\'accord est daté, avec son texte');
});

test('chacun ne lit que SA Carte : une autre personne ne voit rien de la première', opts, async () => {
  const deux = await connecter('carte.deux@exemple.test');
  assert.deepEqual((await lire(deux)).body.carte, null, 'la seconde personne n\'a pas de Carte, et ne voit pas celle de la première');
  await ecrire(deux, { action: 'enregistrer', carte: maCarte({ nom: 'Dominique Autre' }), consentement: true, rev: null });
  const une = await connecter('carte.une@exemple.test');
  assert.equal((await lire(une)).body.carte.nom, 'Camille Fictive', 'chacune retrouve la sienne');
  assert.equal((await lire(deux)).body.carte.nom, 'Dominique Autre');
});

test('une rubrique jamais publique, une visibilité inconnue, un objet qui n\'est pas une Carte : refusés, rien n\'est changé', opts, async () => {
  const c = await connecter('carte.une@exemple.test'), avant = (await lire(c)).body;
  const x = maCarte(); x.visibilite.naissance = 'publique';
  let r = await ecrire(c, { action: 'enregistrer', carte: x, consentement: true, rev: avant.rev });
  assert.equal(r.code, 400); assert.match(r.body.raison, /naissance/i);
  const y = maCarte(); y.visibilite.nom = 'tout le monde';
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: y, consentement: true, rev: avant.rev })).code, 400);
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: { format: 'autre' }, consentement: true, rev: avant.rev })).code, 400);
  assert.equal((await ecrire(c, { action: 'enregistrer', carte: maCarte(), consentement: true, rev: 'abc' })).code, 400, 'révision invalide');
  assert.equal((await lire(c)).body.rev, avant.rev, 'aucun de ces envois n\'a modifié la Carte du compte');
});

test('deux appareils : celui qui écrit sur une version périmée reçoit 409 et la version du compte, jamais d\'écrasement silencieux', opts, async () => {
  const ordi = await connecter('carte.une@exemple.test'), tel = await connecter('carte.une@exemple.test');
  const rev = (await lire(ordi)).body.rev;
  const a = await ecrire(ordi, { action: 'enregistrer', carte: maCarte({ intention: 'Version de l\'ordinateur' }), consentement: true, rev });
  assert.equal(a.code, 200); assert.equal(a.body.rev, rev + 1);
  const b = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev });
  assert.equal(b.code, 409); assert.equal(b.body.carte.intention, 'Version de l\'ordinateur', '409 rend la version du compte'); assert.equal(b.body.rev, rev + 1);
  const n = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev: null });
  assert.equal(n.code, 409, 'prétendre qu\'il n\'y a rien sur le compte ne permet pas d\'écraser');
  const c = await ecrire(tel, { action: 'enregistrer', carte: maCarte({ intention: 'Version du téléphone' }), consentement: true, rev: b.body.rev });
  assert.equal(c.code, 200, 'après avoir choisi en connaissance de cause, le téléphone enregistre'); assert.equal((await lire(ordi)).body.carte.intention, 'Version du téléphone');
});

test('deux enregistrements simultanés sur la même révision : un seul passe, l\'autre reçoit 409', opts, async () => {
  const c = await connecter('carte.une@exemple.test'), rev = (await lire(c)).body.rev;
  const rs = await Promise.all([1, 2, 3].map(i => ecrire(c, { action: 'enregistrer', carte: maCarte({ intention: 'Simultané ' + i }), consentement: true, rev })));
  assert.equal(rs.filter(r => r.code === 200).length, 1); assert.equal(rs.filter(r => r.code === 409).length, 2);
  assert.equal((await lire(c)).body.rev, rev + 1);
});

test('écritures : même origine et JSON, sinon refusées', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  assert.equal((await ecrire(c, { action: 'retirer', confirmation: true }, { origin: 'https://ailleurs.exemple' })).code, 403);
  assert.equal((await ecrire(c, { action: 'retirer', confirmation: true }, { 'content-type': 'text/plain' })).code, 415);
  assert.ok((await lire(c)).body.carte, 'rien n\'a été retiré');
});

test('retirer ma Carte du compte : confirmation exigée, puis plus rien sur le compte', opts, async () => {
  const c = await connecter('carte.deux@exemple.test');
  assert.equal((await ecrire(c, { action: 'retirer' })).code, 400);
  const r = await ecrire(c, { action: 'retirer', confirmation: true }); assert.equal(r.code, 200); assert.equal(r.body.carte, null);
  assert.equal((await lire(c)).body.carte, null);
  assert.equal((await pool.query("select count(*)::int as n from cartes c join \"user\" u on u.id = c.user_id where u.email = 'carte.deux@exemple.test'")).rows[0].n, 0);
});

test('supprimer son compte efface sa Carte', opts, async () => {
  const c = await connecter('carte.trois@exemple.test');
  await ecrire(c, { action: 'enregistrer', carte: maCarte({ nom: 'Trois' }), consentement: true, rev: null });
  const id = (await pool.query("select id from \"user\" where email = 'carte.trois@exemple.test'")).rows[0].id;
  await A.auth().handler(new Request(BASE + '/api/auth/delete-user', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, cookie: c, 'x-forwarded-for': '192.0.2.200' }, body: JSON.stringify({}) }));
  assert.equal((await pool.query('select count(*)::int as n from cartes where user_id = $1', [id])).rows[0].n, 0);
});

test('base sans la migration 2026-10-25-10 : 503, dit, pour la lecture comme pour l\'écriture', opts, async () => {
  const c = await connecter('carte.une@exemple.test');
  H._db({ query: async () => { const e = new Error('relation "cartes" does not exist'); e.code = '42P01'; throw e; } });
  try {
    const g = await lire(c); assert.equal(g.code, 503); assert.match(g.body.raison, /reste sur cet appareil/);
    assert.equal((await ecrire(c, { action: 'enregistrer', carte: maCarte(), consentement: true, rev: null })).code, 503);
  } finally { H._db(undefined); }
});
