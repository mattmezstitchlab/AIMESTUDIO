// Audit Vercel, PR 2 : les quotas partagés entre instances (api/_auth/quotas.cjs, table « quotas », migration 2026-10-24-06)
// et la garde des écritures (api/_auth/requete.cjs : même origine et corps JSON) sur toutes les fonctions qui modifient des données.
// La partie « base » tourne seulement si TEST_DATABASE_URL est défini ; le reste partout.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const Q = require('../api/_auth/quotas.cjs'), R = require('../api/_auth/requete.cjs');
let pg, a, b;

before(async () => { if (!URLT) return; pg = require('pg'); a = new pg.Pool({ connectionString: URLT, max: 1 }); b = new pg.Pool({ connectionString: URLT, max: 1 }); await a.query('truncate quotas'); });
after(async () => { if (a) await a.end(); if (b) await b.end(); });

test('deux instances (deux connexions distinctes) partagent le même compteur ; la limite tombe pour les deux', opts, async () => {
  Q._oublier(); const t = Date.UTC(2026, 9, 24, 10, 0, 5);
  const r = [];
  for (let i = 0; i < 4; i++) r.push(await Q.compter('essai:ip', '203.0.113.9', { max: 3, fenetre: 600 }, { db: i % 2 ? b : a, maintenant: t + i }));
  assert.deepEqual(r.map(x => [x.n, x.ok, x.partage]), [[1, true, true], [2, true, true], [3, true, true], [4, false, true]]);
  assert.ok(r[3].attente > 0 && r[3].attente <= 600, 'le temps à attendre, jusqu\'à la fin de la fenêtre');
  assert.equal((await Q.compter('essai:ip', '203.0.113.9', { max: 3, fenetre: 600 }, { db: a, maintenant: t + 600000 })).n, 1, 'fenêtre suivante : on repart de 1');
  assert.equal((await Q.compter('essai:ip', '203.0.113.10', { max: 3, fenetre: 600 }, { db: b, maintenant: t })).n, 1, 'une autre adresse a son propre compteur');
});

test('vie privée : la table ne garde ni adresse IP ni identifiant en clair ; les lignes de plus de 48 h sont effacées', opts, async () => {
  const { rows } = await a.query('select cle from quotas');
  assert.ok(rows.length >= 2); for (const r of rows) { assert.ok(!/203\.0\.113/.test(r.cle), r.cle); assert.match(r.cle, /^essai:ip:[A-Za-z0-9_-]{24}$/); }
  assert.equal(Q.DUREE_GARDE_H, 48);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'api/_auth/quotas.cjs'), 'utf8'), /delete from quotas where fenetre < now\(\) - interval/);
});

test('sans table (migration pas encore appliquée) ou sans base : le compteur reste en mémoire, et le site ne tombe pas', async () => {
  Q._oublier();
  const absente = { query: async () => { const e = new Error('relation "quotas" does not exist'); e.code = '42P01'; throw e; } };
  const r = []; for (let i = 0; i < 4; i++) r.push(await Q.compter('essai:repli', 'x', { max: 3, fenetre: 60 }, { db: absente }));
  assert.deepEqual(r.map(x => [x.ok, x.partage]), [[true, false], [true, false], [true, false], [false, false]]);
  const panne = { query: async () => { throw new Error('connexion perdue'); } };
  assert.equal((await Q.compter('essai:panne', 'x', { max: 1, fenetre: 60 }, { db: panne })).ok, true, 'une panne de base ne bloque personne');
  await assert.rejects(Q.quota('inconnu', 'x'), /quota inconnu/);
});

test('les quotas du site sont en un seul endroit, et chaque fonction concernée passe par lui (plus de compteur en mémoire)', () => {
  assert.deepEqual(Object.keys(Q.QUOTAS).sort(), ['attente:adresse', 'attente:envois', 'attente:ip', 'carte:demande:boite', 'carte:demande:ip', 'carte:enregistrer', 'carte:lecture', 'contact:ip', 'contact:tous', 'engagement:geste', 'espaces:creer', 'espaces:inviter', 'lien:ip', 'live:act', 'live:passe', 'remontee:personne', 'temps:geste']);
  const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  for (const [f, q] of [['api/attente.mjs', 'attente:ip'], ['api/attente.mjs', 'attente:adresse'], ['api/attente.mjs', 'attente:envois'], ['api/contact.js', 'contact:ip'], ['api/remontee.mjs', 'remontee:personne'], ['api/comptes.mjs', 'lien:ip'], ['api/espaces.mjs', 'espaces:inviter'], ['api/live/act.js', 'live:act'], ['api/live/passe.js', 'live:passe'], ['api/temps.mjs', 'temps:geste'], ['api/engagements.mjs', 'engagement:geste'], ['api/carte.mjs', 'carte:enregistrer'], ['api/carte-publique.mjs', 'carte:lecture'], ['api/carte-publique.mjs', 'carte:demande:ip'], ['api/carte-publique.mjs', 'carte:demande:boite']])
    assert.ok(lire(f).includes("'" + q + "'"), f + ' : ' + q);
  assert.ok(!/parIp|globaux|new Map\(\)/.test(lire('api/contact.js')), 'contact : plus de compteur en mémoire');
  assert.ok(!/const vus = new Map/.test(lire('api/remontee.mjs')), 'remontee : plus de compteur en mémoire');
  const m = fs.readdirSync(path.join(__dirname, '..', 'db/migrations')).filter(x => /quotas/.test(x));
  assert.deepEqual(m, ['2026-10-24-06-quotas.sql']);
  const sql = lire('db/migrations/' + m[0]);
  assert.match(sql, /create table if not exists quotas/); assert.match(sql, /primary key \(cle, fenetre\)/); assert.ok(!/drop |truncate |delete /i.test(sql.replace(/--.*$/gm, '')));
});

/* ---------- la garde des écritures ---------- */
const req = (m, h) => ({ method: m, headers: Object.assign({ host: 'www.lemondeaime.com' }, h || {}) });
const BON = { origin: 'https://www.lemondeaime.com', 'content-type': 'application/json' };

test('ecriture() : même origine et JSON pour tout POST, PUT, PATCH, DELETE ; les lectures ne sont pas concernées', () => {
  assert.equal(R.ecriture(req('POST', BON)), null);
  assert.equal(R.ecriture(req('POST', Object.assign({}, BON, { 'content-type': 'application/json; charset=utf-8' }))), null);
  for (const m of ['GET', 'HEAD', 'OPTIONS']) assert.equal(R.ecriture(req(m, {})), null, m);
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(R.ecriture(req(m, { 'content-type': 'application/json' }))[0], 403, m + ' sans Origin');
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { origin: 'https://evil.example' })))[0], 403, m + ' autre site');
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { origin: 'http://www.lemondeaime.com' })))[0], 403, m + ' http en production');
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { 'content-type': 'text/plain' })))[0], 415, m + ' text/plain (formulaire forgé)');
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { 'content-type': 'application/x-www-form-urlencoded' })))[0], 415);
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { 'content-type': 'application/jsonp' })))[0], 415);
    assert.equal(R.ecriture(req(m, Object.assign({}, BON, { 'sec-fetch-site': 'cross-site' })))[0], 403, 'Sec-Fetch-Site: cross-site');
  }
  process.env.ORIGINES_AUTORISEES = 'https://lemondeaime.com';
  try { assert.equal(R.ecriture(req('POST', Object.assign({}, BON, { origin: 'https://lemondeaime.com' }))), null, 'la liste ORIGINES_AUTORISEES'); }
  finally { delete process.env.ORIGINES_AUTORISEES; }
});

/* chaque fonction qui modifie des données refuse une requête d'un autre site, avant tout (session, base, envoi) */
function appel(h, r) {
  return new Promise(done => {
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { done(this.statusCode); }, end() { done(this.statusCode); } };
    Promise.resolve(h(r, res)).catch(() => done(500));
  });
}
test('chaque écriture du site refuse un autre site (403) et un corps non JSON (415)', async () => {
  const H = [['api/espaces.mjs', '/api/espaces'], ['api/identite.mjs', '/api/identite'], ['api/matiere.mjs', '/api/matiere'], ['api/remontee.mjs', '/api/remontee'], ['api/comptes.mjs', '/api/auth/sign-in/magic-link'], ['api/contact.js', '/api/contact'], ['api/live/act.js', '/api/live/act'], ['api/live/passe.js', '/api/live/passe'], ['api/live/journal.js', '/api/live/journal'], ['api/attente.mjs', '/api/attente']];
  for (const [f, url] of H) {
    const m = f.endsWith('.mjs') ? (await import('../' + f)).default : require('../' + f);
    assert.equal(await appel(m, Object.assign(req('POST', Object.assign({}, BON, { origin: 'https://evil.example' })), { url, body: {} })), 403, f + ' : autre site');
    assert.equal(await appel(m, Object.assign(req('POST', Object.assign({}, BON, { 'content-type': 'text/plain' })), { url, body: '{}' })), 415, f + ' : text/plain');
  }
});
