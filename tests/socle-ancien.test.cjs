// Le code tient sur une base où les migrations du 24/10/2026 (journal, durée) ne sont pas encore appliquées : c'est l'état
// de la production tant que l'agent Neon ne les a pas passées. Lancé seulement si TEST_DATABASE_URL_ANCIEN est défini
// (une base de test éphémère où seules les migrations antérieures au 24/10/2026 ont été jouées).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL_ANCIEN;
const opts = { skip: !URLT && 'TEST_DATABASE_URL_ANCIEN absent' };
const BASE = 'http://localhost:8773';
let A, E, liens = [], pool, ipn = 0;
async function appel(h, body, cookie) { let res; const p = new Promise(d => { res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { d({ code: this.statusCode, body: o }); }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; });
  await h({ method: 'POST', body, headers: Object.assign({ 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost', 'x-forwarded-for': '198.51.100.' + (++ipn % 250) }, cookie ? { cookie } : {}) }, res); return p; }
async function connecter(email) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn % 250) }, body: JSON.stringify({ email, callbackURL: '/compte/' }) }));
  const url = liens[0].text.match(/https?:\/\/\S+/)[0];
  r = await a.handler(new Request(url, { headers: { origin: BASE, 'x-forwarded-for': '192.0.2.' + (++ipn % 250) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
});
after(async () => { if (pool) await pool.end(); });

test('base sans les migrations du 24/10 : les espaces marchent, le journal le dit, aucune durée n\'est inventée', opts, async () => {
  const { rows } = await pool.query("select to_regclass('public.audit') as a, (select count(*)::int from information_schema.columns where table_name = 'space_members' and column_name = 'jusqu_au') as d");
  assert.equal(rows[0].a, null, 'pas de table audit, comme en production'); assert.equal(rows[0].d, 0, 'pas de colonne de durée');
  const o = await connecter('o-ancien@exemple.test'), g = await connecter('g-ancien@exemple.test');
  let r = await appel(E.default, { action: 'creer', titre: 'Ancien' }, o); assert.equal(r.code, 200); assert.equal(r.body.journal, false); const id = r.body.id;
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'guest', jusquau: new Date(Date.now() + 5 * 864e5).toISOString() }, o); assert.equal(r.code, 503, 'une date de fin n\'est jamais ignorée en silence');
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'guest' }, o); assert.equal(r.code, 200); assert.equal(r.body.journal, false);
  r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, g); assert.equal(r.code, 200);
  r = await appel(E.default, { action: 'membres', espace: id }, g); assert.equal(r.code, 200); assert.equal(r.body.membres.length, 1, 'règle 2 : l\'invitée ne reçoit qu\'elle-même');
  r = await appel(E.default, { action: 'journal', espace: id }, o); assert.equal(r.code, 200); assert.equal(r.body.journal, null, 'journal pas encore installé : dit, pas inventé');
  liens = []; r = await appel(E.default, { action: 'signaler', espace: id }, g); assert.equal(r.code, 200); assert.equal(r.body.journal, false); assert.equal(r.body.prevenu, true, 'le propriétaire est prévenu même sans journal');
  r = await appel(E.default, { action: 'mes' }, g); assert.ok(r.body.espaces.some(e => e.id === id));
});

test('base sans la migration relation : la relation est ignorée sans erreur, la création sans doublon tient quand même', opts, async () => {
  const o = await connecter('o2-ancien@exemple.test'), g = await connecter('g2-ancien@exemple.test');
  let r = await appel(E.default, { action: 'creer', titre: 'Origine', origine: 'essai-ancien-0001' }, o); assert.equal(r.code, 200); const id = r.body.id;
  r = await appel(E.default, { action: 'creer', titre: 'Origine', origine: 'essai-ancien-0001' }, o); assert.equal(r.body.id, id, 'même origine, même projet');
  r = await appel(E.default, { action: 'inviter', espace: id, role: 'contributor', relation: 'témoin' }, o); assert.equal(r.code, 200); assert.equal(r.body.relation, null, 'pas de colonne : pas de relation, dit');
  r = await appel(E.default, { action: 'rejoindre', jeton: new URL(r.body.lien).searchParams.get('invitation') }, g); assert.equal(r.code, 200);
});

test('base sans la migration activites : l\'activité est refusée (503, dit), la liste est vide, rien n\'est écrit', opts, async () => {
  const o = await connecter('p-ancien@exemple.test');
  let r = await appel(E.default, { action: 'activite', metier: 'fleuriste' }, o); assert.equal(r.code, 503); assert.match(r.body.raison, /migration/);
  r = await appel(E.default, { action: 'activites' }, o); assert.equal(r.code, 200); assert.deepEqual(r.body.activites, []);
});

test('base sans la migration Temps : /api/temps répond 503 (dit), le projet et son Dock restent exactement ceux d\'avant', opts, async () => {
  const T = await import('../api/temps.mjs'), PG = await import('../api/page.mjs');
  const o = await connecter('t-ancien@exemple.test');
  const r = await appel(E.default, { action: 'creer', titre: 'Sans programme', modele: 'mariage' }, o); assert.equal(r.code, 200);
  const get = (h, url) => new Promise(d => { const res = { statusCode: 200, setHeader() {}, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; h({ method: 'GET', url, headers: { cookie: o } }, res); });
  const t = await get(T.default, '/api/temps?espace=' + r.body.id); assert.equal(t.code, 503); assert.match(t.body.raison, /pas encore installé/);
  const p = await get(PG.default, '/api/page?espace=' + r.body.id + '&gabarit=acces'); assert.equal(p.code, 200);
  assert.deepEqual(p.body.dock.lieux.map(l => l.gabarit).sort(), ['acces', 'journal', 'personnes']);
  assert.equal((await get(PG.default, '/api/page?espace=' + r.body.id + '&gabarit=deroule')).code, 404, 'pas de page Programme sans le module');
});

test('base sans la migration des demandes : le formulaire Contact envoie l\'e-mail comme avant, sans erreur', opts, async () => {
  const { rows } = await pool.query("select to_regclass('public.demandes') as d"); assert.equal(rows[0].d, null, 'pas de table demandes, comme en production avant la migration 09');
  const H = require('../api/contact.js'), envois = [];
  Object.assign(process.env, { RESEND_API_KEY: 're_test_fictif', CONTACT_TO: 'boite@exemple.test', CONTACT_FROM: 'AIME <contact@exemple.test>' });
  H._reinitialiser(); H.fetch = async (u, o) => { envois.push(o); return { ok: true, status: 200 }; };
  const corps = { prenom: 'Camille', nom: 'Fictif', email: 'ancien.contact@exemple.test', projet: 'site', message: 'Un site vitrine pour un atelier fictif, avec une galerie.', consentement: true, site_web: '', duree: 8000 };
  const r = await appel(H, corps); assert.equal(r.code, 200); assert.deepEqual(r.body, { ok: true }); assert.equal(envois.length, 1);
  H.fetch = async () => ({ ok: false, status: 500 });
  const r2 = await appel(H, Object.assign({}, corps, { message: corps.message + ' Deuxième essai.' })); assert.equal(r2.code, 502, 'sans table ni e-mail : erreur visible, le texte reste dans la page');
  const p = require('../api/_demandes/depot.cjs').base(); if (p) await p.end();
});
