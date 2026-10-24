/* /regie/ et /maitre/ : servis au seul propriétaire du site, 404 sinon, comme /api/maitre (audit Vercel, PR 1, point 3).
   middleware.js (Routing Middleware Vercel, avant les fichiers statiques) appelle garder() d'api/_auth/ecrans.mjs, qui demande
   « oui / non » à /api/identite avec le seul cookie. Les scripts et styles de regie/ et maitre/ restent publics.
   La dernière partie tourne contre une vraie base de test (TEST_DATABASE_URL) : la vraie session, le vrai /api/identite. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = f => path.join(__dirname, '..', f), lire = f => fs.readFileSync(R(f), 'utf8');
const E = () => import('../api/_auth/ecrans.mjs');
const req = (p, cookie) => new Request('https://www.lemondeaime.com' + p, { headers: cookie ? { cookie } : {} });
const json = (code, o) => new Response(JSON.stringify(o), { status: code, headers: { 'content-type': 'application/json' } });

test('middleware.js : le matcher littéral est exactement la liste ECRANS ; aucune base ni secret chargés', async () => {
  const { ECRANS } = await E(), s = lire('middleware.js');
  const m = s.match(/matcher:\s*(\[[^\]]*\])/); assert.ok(m, 'un matcher littéral');
  assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), ECRANS);
  assert.match(s, /runtime:\s*'nodejs'/);
  assert.deepEqual([...s.matchAll(/\bimport\b[^'"]*['"]([^'"]+)['"]/g)].map(x => x[1]), ['./api/_auth/ecrans.mjs'], 'un seul import');
  assert.ok(!/pg|better-auth|process\.env/.test(lire('api/_auth/ecrans.mjs').replace(/\/\/.*$/gm, '')), 'ecrans.mjs ne lit ni base ni variable');
  assert.ok(!/middleware/.test(lire('.vercelignore')), 'middleware.js part bien en production');
});

test('garder : 404 sans propriétaire, sur chaque forme d\'adresse des deux écrans', async () => {
  const { garder, ECRANS } = await E();
  for (const p of ECRANS) {
    for (const v of [async () => false, async () => null, async () => 'oui', async () => { throw new Error('panne'); }]) {
      const r = await garder(req(p), v); assert.ok(r, p); assert.equal(r.status, 404, p);
      assert.equal(r.headers.get('cache-control'), 'no-store'); assert.match(await r.text(), /Page introuvable/);
    }
    assert.equal(await garder(req(p, 'x=1'), async () => true), undefined, p + ' : le propriétaire passe');
  }
});

test('garder : les scripts, styles et autres pages ne passent jamais par la garde', async () => {
  const { garder } = await E(); let appels = 0; const v = async () => { appels++; return false; };
  for (const p of ['/', '/regie/regie.js', '/regie/scene.js', '/regie/donnees.js', '/regie/regie.css', '/maitre/maitre.js', '/maitre/modele.js', '/maitre/sources.js', '/maitre/maitre.css', '/regies/', '/maitre-x/', '/exemples/', '/api/maitre'])
    assert.equal(await garder(req(p), v), undefined, p);
  assert.equal(appels, 0);
  /* ce que les pages publiques chargent sous regie/ et maitre/ reste hors de la liste */
  const { ECRANS } = await E();
  for (const f of ['index.html', 'sites/index.html', 'vitrine/world/index.html', 'live/index.html', 'canevas/adaptateurs/maitre.js', 'api/travaux.js'])
    for (const x of lire(f).matchAll(/["'](\/(?:regie|maitre)\/[^"'?#]+)["']/g)) assert.ok(!ECRANS.includes(x[1]), f + ' : ' + x[1]);
});

test('estProprietaire : seul le cookie part vers /api/identite (même origine) ; seul « connecté et propriétaire » ouvre', async () => {
  const { estProprietaire } = await E(); const vus = [];
  const f = r => async (u, o) => { vus.push([String(u), o]); return r; };
  assert.equal(await estProprietaire(req('/regie/'), async () => { throw new Error('ne doit pas être appelé'); }), false, 'sans cookie, pas de question');
  assert.equal(await estProprietaire(req('/regie/', 'better-auth.session_token=abc'), f(json(200, { ok: true, connecte: true, proprietaire: true }))), true);
  assert.deepEqual([vus[0][0], Object.keys(vus[0][1].headers).sort(), vus[0][1].headers.cookie], ['https://www.lemondeaime.com/api/identite', ['accept', 'cookie'], 'better-auth.session_token=abc']);
  for (const r of [json(200, { ok: true, connecte: true, proprietaire: false }), json(200, { connecte: false }), json(200, { connecte: true, proprietaire: 'true' }), json(503, { connecte: true, proprietaire: true }), json(302, {}), new Response('pas du json', { status: 200 })])
    assert.equal(await estProprietaire(req('/maitre/', 'c=1'), f(r)), false);
  assert.equal(await estProprietaire(req('/maitre/', 'c=1'), async () => { throw new Error('réseau'); }), false);
});

test('vercel.json : les deux écrans ne sont jamais mis en cache ni indexés ; aucune réécriture ne les contourne', async () => {
  const { ECRANS } = await E(), v = JSON.parse(lire('vercel.json'));
  const h = v.headers.find(x => x.source === '/(regie|maitre)(/|/index|/index\\.html)?'); assert.ok(h);
  const re = new RegExp('^' + h.source + '$'); for (const p of ECRANS) assert.ok(re.test(p), p); assert.ok(!re.test('/regie/regie.js'));
  assert.deepEqual(h.headers, [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }]);
  for (const r of [...v.rewrites, ...v.redirects]) assert.ok(!/regie\/index|maitre\/index|^\/(regie|maitre)\/?$/.test(r.destination), 'aucune autre adresse ne mène aux pages : ' + r.source);
});

/* ---------- contre une vraie base : la vraie session, le vrai /api/identite ---------- */
const URLT = process.env.TEST_DATABASE_URL, BASE = 'http://localhost:8779';
const opts = { skip: !URLT && 'TEST_DATABASE_URL absent : base de test locale requise' };
let A, I, liens = [], ipn = 0;
async function connecter(email) {
  const a = A.auth(); liens = [];
  let r = await a.handler(new Request(BASE + '/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn) }, body: JSON.stringify({ email, callbackURL: '/' }) }));
  r = await a.handler(new Request(liens[0].text.match(/https?:\/\/\S+/)[0], { headers: { origin: BASE, 'x-forwarded-for': '198.51.100.' + (++ipn) } }));
  return r.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
}
/* fetch → le vrai gestionnaire /api/identite, comme Vercel le ferait */
const identite = async (u, o) => new Promise(d => {
  const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k] = v; }, end(t) { d(new Response(t, { status: this.statusCode })); } };
  I.default({ method: 'GET', url: new URL(u).pathname, headers: o.headers }, res);
});
test('vraie base : le propriétaire (AIME_PROPRIETAIRES) passe ; un autre compte et une session absente reçoivent 404', opts, async () => {
  Object.assign(process.env, { DATABASE_URL: URLT, BETTER_AUTH_SECRET: require('crypto').randomBytes(32).toString('hex'), BETTER_AUTH_URL: BASE }); delete process.env.VERCEL_ENV;
  A = await import('../api/_auth/auth.mjs'); I = await import('../api/identite.mjs'); A._envoyeur(m => { liens.push(m); }); A.auth();
  const pool = A._pool();
  try {
    const { garder, estProprietaire } = await E();
    const cO = await connecter('proprio-ecrans@exemple.test'), cX = await connecter('autre-ecrans@exemple.test');
    const id = (await pool.query('select id from "user" where email = $1', ['proprio-ecrans@exemple.test'])).rows[0].id;
    const v = r => estProprietaire(r, identite);
    process.env.AIME_PROPRIETAIRES = '';
    assert.equal((await garder(req('/regie/', cO), v)).status, 404, 'sans liste, personne (fermé par défaut)');
    process.env.AIME_PROPRIETAIRES = id;
    for (const p of ['/regie/', '/maitre/']) {
      assert.equal(await garder(req(p, cO), v), undefined, p + ' : le propriétaire');
      assert.equal((await garder(req(p, cX), v)).status, 404, p + ' : un autre compte');
      assert.equal((await garder(req(p), v)).status, 404, p + ' : sans session');
      assert.equal((await garder(req(p, 'better-auth.session_token=faux.jeton'), v)).status, 404, p + ' : un jeton inventé');
    }
  } finally { delete process.env.AIME_PROPRIETAIRES; await pool.end(); }
});
