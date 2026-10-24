// Le module Temps contre une vraie base PostgreSQL de test (comme en intégration continue) : six comptes de démonstration
// connectés par lien magique, le projet « Mariage Camille & Gabriel », la propagation, la persistance, les refus, les conflits
// entre deux instances du serveur, l'atomicité, la Comparaison sans privilège, l'isolation de la démonstration, l'ancien direct,
// les contraintes de la migration et la cohérence journal ↔ table. Lancé seulement si TEST_DATABASE_URL est défini.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const URLT = process.env.TEST_DATABASE_URL;
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
const BASE = 'http://localhost:8779';
const DEMO = require('../modules/temps/demo-camille-gabriel.json');
let A, E, TP, M, PG, liens = [], pool, ipn = 0, espace;
const C = {}, U = {};

function appel(fn, req) { return new Promise(d => { const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { d({ code: this.statusCode, body: o }); }, end(t) { d({ code: this.statusCode, body: t ? JSON.parse(t) : null }); } }; fn(Object.assign({ headers: {} }, req), res); }); }
const H = cookie => Object.assign({ 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost', 'x-forwarded-for': '198.51.100.' + (++ipn % 250) }, cookie ? { cookie } : {});
const lire = (k, q = '') => appel(TP.default, { method: 'GET', url: '/api/temps?espace=' + espace + q, headers: H(C[k]) });
const poster = (k, body) => appel(TP.default, { method: 'POST', body, headers: H(C[k]) });
const geste = (k, action, p, rev) => poster(k, { action: 'geste', espace, geste: { action, p }, rev });
async function connecter(email, nom) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn % 250) }, body: JSON.stringify({ email, name: nom, callbackURL: '/projets/' }) }));
  assert.equal(r.status, 200, email);
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '203.0.113.' + (++ipn % 250) } }));
  if (nom) await pool.query('update "user" set name = $1 where email = $2', [nom, email]);
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
const n = async (q, v) => (await pool.query(q, v)).rows[0].n;
const ids = v => v.moments.map(m => m.id);
const moment = (v, id) => v.moments.find(m => m.id === id);

before(async () => { if (!URLT) return;
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); E = await import('../api/espaces.mjs'); TP = await import('../api/temps.mjs'); M = await import('../api/_temps/moteur.mjs'); PG = await import('../api/page.mjs');
  A._envoyeur(m => { liens.push(m); }); A.auth(); pool = A._pool();
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  await pool.query('truncate quotas').catch(() => {});
  for (const p of DEMO.personnes) { C[p.cle] = await connecter(p.email, p.nom); U[p.cle] = (await pool.query('select id, email from "user" where email = $1', [p.email])).rows[0]; }
  C.reel = await connecter('reelle@exemple.test', 'Une vraie personne'); U.reel = (await pool.query('select id, email from "user" where email = $1', ['reelle@exemple.test'])).rows[0];
  espace = (await M.semerDemo(pool, DEMO, U)).espace;
});
after(async () => { if (pool) await pool.end(); });

test('temps · chacun lit le même programme, réduit à ses droits, depuis la base', opts, async () => {
  const v = {}; for (const k of Object.keys(DEMO.personnes.reduce((o, p) => (o[p.cle] = 1, o), {}))) { const r = await lire(k); assert.equal(r.code, 200, k); assert.equal(r.body.rev, 1); v[k] = r.body.vue; }
  assert.equal(ids(v.camille).length, 9); assert.deepEqual(ids(v.lea), ids(v.camille)); assert.deepEqual(ids(v.gabriel), ids(v.camille));
  assert.ok(!ids(v.alex).includes('brief-traiteur') && !ids(v.sarah).includes('brief-traiteur'), 'réservé à l\'organisation');
  assert.deepEqual(ids(v.emma), ['ceremonie', 'cocktail', 'diner', 'discours', 'bal']);
  assert.ok(!/Bars ouverts|prise 16 A|Livraisons/.test(JSON.stringify(v.emma)), 'aucune consigne d\'équipe ne part vers l\'invitée');
  assert.ok(!JSON.stringify(v.emma).includes(U.sarah.id) && !JSON.stringify(v.alex).includes(U.sarah.id), 'aucun identifiant d\'un autre prestataire');
  assert.equal(moment(v.alex, 'set-cocktail').responsable, 'moi'); assert.equal(moment(v.lea, 'cocktail').responsable, U.sarah.id);
  assert.equal(moment(v.camille, 'cocktail').debut, '16:00');
});

test('temps · Léa décale le cocktail de 15 min : écrit, journalisé, propagé, persistant, et le dîner reste une proposition', opts, async () => {
  const r = await geste('lea', 'retarder', { moment: 'cocktail', minutes: 15 }, 1);
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.rev, 2); assert.deepEqual(r.body.touches, ['cocktail']);
  for (const k of ['camille', 'gabriel', 'lea', 'alex', 'sarah', 'emma']) { const v = (await lire(k)).body.vue; assert.equal(moment(v, 'cocktail').debut, '16:15', k); assert.equal(moment(v, 'cocktail').prevu, '16:00'); assert.equal(moment(v, 'diner').debut, '18:30', k + ' : le dîner n\'a pas bougé'); }
  /* une autre instance du serveur (une autre connexion) relit la même chose : rien n'était en mémoire */
  const pg = require('pg'), p2 = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', ''), max: 2 });
  try { const v = await M.lire(p2, U.emma, { espace }); assert.equal(moment(v.vue, 'cocktail').debut, '16:15'); } finally { await p2.end(); }
  assert.equal((await lire('emma', '&depuis=2')).body.inchange, true, 'rien de nouveau depuis la révision 2 : rien ne repart');
  const lea = (await lire('lea')).body.vue; assert.equal(lea.propositions.length, 1); assert.equal(lea.propositions[0].moment, 'diner');
  assert.deepEqual((await lire('sarah')).body.vue.aConfirmer, ['cocktail']);
  assert.equal(await n("select count(*)::int as n from live_journal where espace = $1 and rev = 2 and action = 'retarder' and qui = $2", [espace, U.lea.id]), 1);
  assert.deepEqual(await M.verifier(pool, espace), { ok: true, ecarts: [], rev: 2 });
});

test('temps · refus serveur : invitée, prestataire hors de ses moments, moment invisible, sans session, hors projet', opts, async () => {
  let r = await geste('emma', 'retarder', { moment: 'cocktail', minutes: 5 }, 2); assert.equal(r.code, 403);
  r = await geste('alex', 'retarder', { moment: 'cocktail', minutes: 5 }, 2); assert.equal(r.code, 403); assert.equal(r.body.regle, 'event.edit');
  r = await geste('emma', 'fait', { moment: 'installation' }, 2); assert.equal(r.code, 404, 'un moment invisible n\'existe pas pour elle');
  r = await geste('alex', 'retarder', { moment: 'brief-traiteur', minutes: 5 }, 2); assert.equal(r.code, 404);
  r = await appel(TP.default, { method: 'GET', url: '/api/temps?espace=' + espace, headers: H(null) }); assert.equal(r.code, 401);
  r = await appel(TP.default, { method: 'POST', body: { action: 'geste', espace, geste: { action: 'retarder', p: { moment: 'cocktail', minutes: 5 } }, rev: 2 }, headers: Object.assign(H(C.lea), { origin: 'https://ailleurs.example' }) }); assert.equal(r.code, 403, 'une autre origine est refusée');
  r = await appel(TP.default, { method: 'POST', body: { action: 'geste', espace, passe: 'x.y', geste: { action: 'retarder', p: { moment: 'cocktail', minutes: 5 } }, rev: 2 }, headers: H(null) }); assert.equal(r.code, 401, 'un laissez-passer ne remplace jamais la session');
  r = await geste('lea', 'retarder', { moment: 'cocktail', minutes: 5 }); assert.equal(r.code, 400, 'sans révision vue : refusé');
  assert.equal((await geste('alex', 'retarder', { moment: 'set-cocktail', minutes: 5 }, 2)).code, 200, 'son propre moment : accepté');
  assert.equal(await n('select rev::int as n from temps_espaces where space_id = $1', [espace]), 3);
});

test('temps · conflit : deux gestes simultanés sur le même moment, depuis la même révision, sur deux instances : un seul passe', opts, async () => {
  const pg = require('pg'), i1 = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', ''), max: 3 }), i2 = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', ''), max: 3 });
  try {
    const rev = await n('select rev::int as n from temps_espaces where space_id = $1', [espace]);
    const essais = await Promise.allSettled([M.geste(i1, U.lea, { espace, geste: { action: 'retarder', p: { moment: 'bal', minutes: 10 } }, rev }), M.geste(i2, U.camille, { espace, geste: { action: 'retarder', p: { moment: 'bal', minutes: -10 } }, rev })]);
    const ok = essais.filter(x => x.status === 'fulfilled'), ko = essais.filter(x => x.status === 'rejected');
    assert.equal(ok.length, 1); assert.equal(ko.length, 1); assert.equal(ko[0].reason.code, 409, String(ko[0].reason && ko[0].reason.message));
    assert.equal(ok[0].value.rev, rev + 1);
    /* des gestes concurrents sur des moments différents : aucun conflit, des révisions uniques et consécutives */
    const r2 = rev + 1, moments = ['ceremonie', 'discours', 'demontage', 'installation'];
    const tous = await Promise.all(moments.map((m, i) => M.geste(i % 2 ? i1 : i2, U.lea, { espace, geste: { action: 'retarder', p: { moment: m, minutes: 5 } }, rev: r2 })));
    assert.deepEqual(tous.map(x => x.rev).sort((a, b) => a - b), [r2 + 1, r2 + 2, r2 + 3, r2 + 4]);
  } finally { await i1.end(); await i2.end(); }
  const h = await poster('camille', { action: 'geste', espace, geste: { action: 'retarder', p: { moment: 'bal', minutes: 5 } }, rev: 1 });
  assert.equal(h.code, 409); assert.equal(h.body.conflit.moment, 'bal'); assert.ok(h.body.vue && h.body.rev > 1, 'le conflit repart avec la version à jour');
  assert.equal((await M.verifier(pool, espace)).ok, true);
  await assert.rejects(pool.query("insert into live_journal (espace, qui, action, p, rev) values ($1, 'x', 'fait', '{}', 2)", [espace]), /live_journal_rev|duplicate/, 'une révision ne s\'écrit qu\'une fois');
});

test('temps · tout ou rien : une panne au milieu du geste ne laisse ni moment changé, ni ligne de journal, ni révision', opts, async () => {
  const avant = { rev: await n('select rev::int as n from temps_espaces where space_id = $1', [espace]), j: await n('select count(*)::int as n from live_journal where espace = $1', [espace]), d: await n("select decalage_min as n from moments where space_id = $1 and id = 'diner'", [espace]) };
  for (const motif of [/insert into live_journal/, /update moments/, /update temps_espaces/]) {
    let faite = false;
    const panne = { query: (t, v) => pool.query(t, v), connect: async () => { const c = await pool.connect(); return { query(t, v) { if (!faite && motif.test(t)) { faite = true; return Promise.reject(new Error('panne simulée')); } return c.query(t, v); }, release: x => c.release(x) }; } };
    await assert.rejects(M.geste(panne, U.lea, { espace, geste: { action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } }, rev: avant.rev }), /panne simulée/, String(motif));
    assert.deepEqual({ rev: await n('select rev::int as n from temps_espaces where space_id = $1', [espace]), j: await n('select count(*)::int as n from live_journal where espace = $1', [espace]), d: await n("select decalage_min as n from moments where space_id = $1 and id = 'diner'", [espace]) }, avant, String(motif));
  }
  assert.equal(pool.totalCount, pool.idleCount, 'aucune connexion perdue');
  const r = await geste('lea', 'retarder', { moment: 'diner', minutes: 15, cascade: true }, avant.rev);
  assert.equal(r.code, 200); assert.deepEqual(r.body.touches, ['diner', 'discours', 'bal', 'demontage']);
});

test('temps · confirmer, plan B, fait : propagés selon les droits ; la confirmation n\'appartient qu\'à la responsable', opts, async () => {
  let rev = (await lire('sarah')).body.rev;
  assert.equal((await geste('lea', 'confirmer', { moment: 'cocktail' }, rev)).code, 403);
  let r = await geste('sarah', 'confirmer', { moment: 'cocktail' }, rev); assert.equal(r.code, 200); rev = r.body.rev;
  assert.ok(!(await lire('sarah')).body.vue.aConfirmer.includes('cocktail'));
  assert.equal((await geste('sarah', 'confirmer', { moment: 'cocktail' }, rev)).code, 409, 'une seule fois par changement');
  r = await geste('lea', 'planB', { moment: 'ceremonie', actif: true }, rev); assert.equal(r.code, 200); rev = r.body.rev;
  assert.equal(moment((await lire('emma')).body.vue, 'ceremonie').lieu, 'Orangerie');
  r = await geste('lea', 'fait', { moment: 'installation' }, rev); assert.equal(r.code, 200);
  assert.equal(moment((await lire('alex')).body.vue, 'installation').fait, true);
});

test('temps · Comparaison : le propriétaire seulement, sur ses membres, jamais au-delà de sa propre vue', opts, async () => {
  assert.equal((await lire('lea', '&comparer=')).code, 403);
  assert.equal((await lire('emma', '&comparer=' + U.camille.id)).code, 403);
  const liste = await lire('camille', '&comparer='); assert.equal(liste.code, 200);
  assert.deepEqual(liste.body.personnes.map(p => p.id).sort(), ['gabriel', 'lea', 'alex', 'sarah', 'emma'].map(k => U[k].id).sort());
  const e = await lire('camille', '&comparer=' + U.emma.id); assert.equal(e.code, 200);
  assert.deepEqual(ids(e.body.vue), ids((await lire('emma')).body.vue), 'exactement la vue d\'Emma');
  assert.equal(e.body.cible.relation, 'invitée');
  assert.equal((await lire('camille', '&comparer=' + U.reel.id)).code, 404, 'pas un membre : rien');
});

test('temps · historique : chacun ne lit que les changements de ses moments ; le propriétaire lit tout', opts, async () => {
  const h = async k => (await lire(k, '&journal=1')).body.lignes;
  const cam = await h('camille'), emma = await h('emma'), alex = await h('alex');
  assert.ok(cam.some(l => l.action === 'importer')); assert.ok(!emma.some(l => l.action === 'importer'));
  assert.ok(!emma.some(l => l.moments.some(m => ['installation', 'set-cocktail', 'demontage', 'brief-traiteur'].includes(m.id))), 'aucun moment d\'équipe');
  assert.ok(!JSON.stringify(alex).includes('Point coordination'));
  assert.ok(emma.some(l => /Cocktail/.test(l.texte)));
  assert.ok(cam.find(l => l.rev === 2).qui === 'Léa');
});

test('temps · isolation de la démonstration : un vrai compte n\'y entre pas, un compte de démonstration ne sort pas', opts, async () => {
  await pool.query("insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')", [espace, U.reel.id]);
  try { assert.equal((await lire('reel')).code, 404, 'même membre, un vrai compte ne voit pas la démonstration'); }
  finally { await pool.query('delete from space_members where space_id = $1 and user_id = $2', [espace, U.reel.id]); }
  const r = await appel(E.default, { method: 'POST', body: { action: 'creer', titre: 'Mon vrai mariage', modele: 'mariage' }, headers: H(C.reel) }); assert.equal(r.code, 200);
  const vrai = r.body.id;
  await pool.query("insert into space_members (space_id, user_id, role) values ($1, $2, 'editor')", [vrai, U.lea.id]);
  const g = await appel(TP.default, { method: 'GET', url: '/api/temps?espace=' + vrai, headers: H(C.lea) }); assert.equal(g.code, 404, 'un compte de démonstration n\'ouvre pas un vrai projet');
  await assert.rejects(M.semerDemo(pool, DEMO, Object.assign({}, U, { camille: U.reel })), /démonstration attendu/);
  const ve = process.env.VERCEL_ENV; process.env.VERCEL_ENV = 'production';
  try { await assert.rejects(M.semerDemo(pool, DEMO, U), /production/); } finally { if (ve === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = ve; }
});

test('temps · un vrai projet : rien ne change avant l\'import ; le propriétaire importe une fois ; le Dock gagne « Déroulé »', opts, async () => {
  const r = await appel(E.default, { method: 'POST', body: { action: 'creer', titre: 'Séminaire réel', modele: 'seminaire' }, headers: H(C.reel) }); const id = r.body.id;
  const avant = await appel(PG.default, { method: 'GET', url: '/api/page?espace=' + id + '&gabarit=acces', headers: H(C.reel) });
  assert.deepEqual(avant.body.dock.lieux.map(l => l.gabarit).filter(g => g === 'deroule'), [], 'avant l\'import : pas de Déroulé');
  let t = await appel(TP.default, { method: 'GET', url: '/api/temps?espace=' + id, headers: H(C.reel) }); assert.deepEqual([t.code, t.body.actif, t.body.peutActiver], [200, false, true]);
  const [a, b] = await Promise.all([1, 2].map(() => appel(TP.default, { method: 'POST', body: { action: 'activer', espace: id }, headers: H(C.reel) })));
  assert.deepEqual([a.code, b.code].sort(), [200, 409], 'deux imports simultanés : un seul programme');
  t = await appel(TP.default, { method: 'GET', url: '/api/temps?espace=' + id, headers: H(C.reel) }); assert.equal(t.body.rev, 1); assert.ok(t.body.vue.moments.length > 3);
  const apres = await appel(PG.default, { method: 'GET', url: '/api/page?espace=' + id + '&gabarit=deroule', headers: H(C.reel) });
  assert.equal(apres.code, 200); assert.ok(apres.body.dock.lieux.some(l => l.gabarit === 'deroule'), 'le même Dock, une page de plus'); assert.equal(apres.body.blocs[0].type, 'module');
  assert.deepEqual(await M.verifier(pool, id), { ok: true, ecarts: [], rev: 1 });
});

test('temps · l\'ancien direct est fermé aux projets passés à Temps (une seule vérité) ; ses démonstrations ne changent pas', opts, async () => {
  const L = require('../api/_live/core.js'), passe = require('../api/live/passe.js');
  L._base(() => (s, ...v) => pool.query(s.reduce((a, x, i) => a + '$' + i + x), v).then(r => r.rows));
  try {
    const r = await new Promise(d => { const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { d({ code: this.code, body: o }); } }; passe({ method: 'POST', body: { espace }, headers: H(C.camille) }, res); });
    assert.equal(r.code, 403, 'le laissez-passer n\'ouvre plus ce projet');
    const d = await new Promise(dn => { const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { dn({ code: this.code, body: o }); } }; passe({ method: 'POST', body: { espace: 'mariage', qui: 'u-lea' }, headers: H(null) }, res); });
    assert.equal(d.code, 200, 'la démonstration du direct (hors production) reste ce qu\'elle était');
  } finally { L._base(null); }
});

test('temps · contraintes de la migration : la base refuse ce que le code refuse', opts, async () => {
  const bad = (q, v) => assert.rejects(pool.query(q, v));
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min, audience) values ($1, 'x1', 'X', 600, 660, 'tous')", [espace]);
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min) values ($1, 'x2', 'X', 700, 650)", [espace]);
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min) values ($1, 'X Majuscule', 'X', 600, 650)", [espace]);
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min, plan_b_actif) values ($1, 'x3', 'X', 600, 650, true)", [espace]);
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min, decalage_min) values ($1, 'x4', 'X', 2800, 2850, 60)", [espace]);
  await bad("insert into moments (space_id, id, titre, debut_min, fin_min) values (gen_random_uuid(), 'x5', 'X', 600, 650)");
  await bad("insert into temps_espaces (space_id, origine, active_par) values ($1, 'autre', 'x')", [espace]);
  await bad("insert into live_journal (espace, qui, action, p) values ($1, 'x', 'effacer', '{}')", [espace]);
  await bad('update live_journal set qui = $2 where espace = $1', [espace, 'falsifie']);
  /* l'effacement d'un compte reste possible : supprimer un projet efface son programme ; le journal, l'effacement le retire */
  const r = await appel(E.default, { method: 'POST', body: { action: 'creer', titre: 'À effacer', modele: 'mariage' }, headers: H(C.reel) });
  await appel(TP.default, { method: 'POST', body: { action: 'activer', espace: r.body.id }, headers: H(C.reel) });
  await pool.query('delete from live_journal where espace = $1', [r.body.id]);
  await pool.query('delete from spaces where id = $1', [r.body.id]);
  assert.equal(await n('select count(*)::int as n from moments where space_id = $1', [r.body.id]), 0);
  assert.equal(await n('select count(*)::int as n from temps_espaces where space_id = $1', [r.body.id]), 0);
});

test('temps · à la fin, le journal rejoué redonne exactement la table', opts, async () => {
  const v = await M.verifier(pool, espace); assert.equal(v.ok, true, JSON.stringify(v.ecarts));
  assert.equal(v.rev, await n('select rev::int as n from temps_espaces where space_id = $1', [espace]));
});
