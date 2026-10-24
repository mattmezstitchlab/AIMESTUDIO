// L'inscription selon le rôle choisi sur l'accueil (brief unique du 24/10, PR C), contre une vraie base PostgreSQL de test.
// Seule la personne qui crée un projet reçoit un rôle : propriétaire, parce que le serveur crée le projet (creer()), pas à cause de « Je suis… ».
// Un prestataire enregistre une activité (non publiée) : un compte, une activité, aucun projet, aucun droit. Un invité n'enregistre rien.
// Lancé seulement si TEST_DATABASE_URL est défini (jamais la preview ni la production).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8776';
let A, E, PG, AC, liens = [], pool, ipn = 0;

function appel(fn, req) { return new Promise(d => { const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; fn(Object.assign({ headers: {} }, req), res); }); }
const post = (body, cookie) => appel(E.default, { method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' }, cookie ? { cookie } : {}) });
const page = (espace, gabarit, cookie) => appel(PG.default, { method: 'GET', url: '/api/page?espace=' + encodeURIComponent(espace) + '&gabarit=' + gabarit, headers: cookie ? { cookie } : {} });
async function connecter(email, cb) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn) }, body: JSON.stringify({ email, callbackURL: cb || '/projets/', newUserCallbackURL: cb || '/projets/' }) }));
  assert.equal(r.status, 200);
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
const idDe = async email => (await pool.query('select id from "user" where email = $1', [email])).rows[0].id;

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); PG = await import('../api/page.mjs'); AC = await import('../api/_auth/activites.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool(); AC._oublier();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade').catch(async () => { await pool.query('truncate "user", spaces, invitations, live_journal cascade'); });
  await pool.query('truncate quotas').catch(() => {});   /* les quotas partagés (migration 06) : chaque passe repart de zéro */
});
after(async () => { if (pool) await pool.end(); });

test('inscription prestataire : un compte et une activité, aucun projet, aucun rôle', opts, async () => {
  const c = await connecter('flora@exemple.test', '/projets/?activite=fleuriste');
  const r = await post({ action: 'activite', metier: 'fleuriste' }, c);
  assert.equal(r.code, 200); assert.deepEqual([r.body.metier, r.body.nom, r.body.publiee, r.body.existante], ['fleuriste', 'fleuriste', false, false]);
  assert.equal((await post({ action: 'activite', metier: 'fleuriste' }, c)).body.existante, true, 'la même activité, sans doublon');
  const id = await idDe('flora@exemple.test');
  assert.equal((await pool.query('select count(*)::int as n from "user" where email = $1', ['flora@exemple.test'])).rows[0].n, 1, 'un compte');
  assert.equal((await pool.query('select count(*)::int as n from activites where user_id = $1', [id])).rows[0].n, 1, 'une activité');
  assert.equal((await pool.query('select count(*)::int as n from spaces where owner_id = $1', [id])).rows[0].n, 0, 'aucun projet');
  assert.equal((await pool.query('select count(*)::int as n from space_members where user_id = $1', [id])).rows[0].n, 0, 'aucun rôle dans aucun projet');
  assert.equal((await post({ action: 'mes' }, c)).body.espaces.length, 0);
  assert.deepEqual((await post({ action: 'activites' }, c)).body.activites, [{ metier: 'fleuriste', nom: 'fleuriste', publiee: false }]);
});

test('une activité n\'est jamais publiée ni lisible par un autre compte ; un métier inconnu est refusé ; sans session, rien', opts, async () => {
  const c = await connecter('dj@exemple.test');
  assert.equal((await post({ action: 'activite', metier: 'astronaute' }, c)).code, 400);
  assert.equal((await post({ action: 'activite', metier: '__proto__' }, c)).code, 400);
  assert.equal((await post({ action: 'activite', metier: 'dj' }, null)).code, 401);
  assert.equal((await post({ action: 'activite', metier: 'dj', publiee: true }, c)).body.publiee, false, 'publiée : jamais depuis le navigateur');
  assert.deepEqual((await post({ action: 'activites' }, c)).body.activites.map(a => a.metier), ['dj'], 'seulement les siennes');
  assert.equal((await post({ action: 'activite', metier: 'musicien-intermittent' }, c)).code, 200, 'plusieurs activités par personne');
  assert.equal((await post({ action: 'toString' }, c)).code, 400, 'une action héritée d\'Object n\'est pas une action');
});

test('inscription mariés : un projet créé par le serveur (propriétaire), retrouvé après reconnexion, sans doublon', opts, async () => {
  const c1 = await connecter('lea@exemple.test', '/projets/?creer=mariage&origine=accueil-0001-lea');
  const r = await post({ action: 'creer', titre: 'Notre mariage', modele: 'mariage', origine: 'accueil-0001-lea' }, c1);
  assert.equal(r.code, 200); assert.equal(r.body.role, 'owner');
  assert.equal((await post({ action: 'creer', titre: 'Notre mariage', modele: 'mariage', origine: 'accueil-0001-lea' }, c1)).body.id, r.body.id, 'le lien rouvert ne recrée rien');
  const c2 = await connecter('lea@exemple.test');
  const mes = await post({ action: 'mes' }, c2);
  assert.deepEqual(mes.body.espaces.map(e => [e.id, e.role, e.modele]), [[r.body.id, 'owner', 'mariage']]);
  assert.equal((await page(r.body.id, 'acces', c2)).code, 200);
  const id = await idDe('lea@exemple.test');
  assert.equal((await pool.query('select count(*)::int as n from activites where user_id = $1', [id])).rows[0].n, 0, 'aucune activité pour les mariés');
});

test('supprimer son compte efface ses activités', opts, async () => {
  const id = await idDe('flora@exemple.test');
  await pool.query('delete from "user" where id = $1', [id]);
  assert.equal((await pool.query('select count(*)::int as n from activites where user_id = $1', [id])).rows[0].n, 0);
});
