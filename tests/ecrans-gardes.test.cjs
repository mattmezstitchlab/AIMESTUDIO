/* /regie/ et /maitre/ : servis au seul propriétaire du site, 404 sinon, comme /api/maitre (audit Vercel, PR 1, point 3).
   middleware.js (Routing Middleware Vercel, avant les fichiers statiques) appelle garder() d'api/_auth/ecrans.cjs, qui demande
   « oui / non » à /api/identite avec le seul cookie. Les scripts et styles de regie/ et maitre/ restent publics.
   La dernière partie tourne contre une vraie base de test (TEST_DATABASE_URL) : la vraie session, le vrai /api/identite. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = f => path.join(__dirname, '..', f), lire = f => fs.readFileSync(R(f), 'utf8');
const E = async () => require('../api/_auth/ecrans.cjs');
const req = (p, cookie) => new Request('https://www.lemondeaime.com' + p, { headers: cookie ? { cookie } : {} });
const json = (code, o) => new Response(JSON.stringify(o), { status: code, headers: { 'content-type': 'application/json' } });

/* les adresses détournées (revue de Matt sur #123 : /%72egie/ servait la Régie en production) */
const DETOURS = ['/maitre/%61ttente/', '//maitre//attente/', '/MAITRE/Attente/index.html', '/%72egie/', '/%6daitre/', '//regie/', '/REGIE/', '/%72egie', '/%6Daitre/', '///maitre/', '/Maitre/Index.HTML', '/regie%2f', '/regie%2F',
  '/%2572egie/', '/r%65gie/index.html', '/regie/%2e%2e/regie/', '/x/../regie/', '/regie/./', '/regie/index.html%3F.js', '/regie%3Bx/', '/regie%00/'];
/* le matcher tel que Vercel le compile (vercel build : « ^(?:<matcher>)[\/#\?]?$ ») */
const matcher = () => { const m = lire('middleware.js').match(/matcher:\s*\['((?:[^'\\]|\\.)*)'\]/); assert.ok(m, 'un matcher littéral, une seule entrée'); return new RegExp('^(?:' + eval("'" + m[1] + "'") + ')[/#?]?$'); };

test('middleware.js : le matcher prend toute adresse qui peut mener aux écrans, même encodée ; aucune base ni secret chargés', async () => {
  const { ECRANS, estGarde } = await E(), s = lire('middleware.js'), re = matcher();
  for (const p of [...ECRANS, ...DETOURS]) { assert.ok(re.test(p), 'le middleware est appelé : ' + p); assert.ok(estGarde(p), 'et la garde reconnaît : ' + p); }
  for (const p of ['/regie/regie.js', '/maitre/maitre.css', '/fonts/InterVariable-latin.woff2', '/media/visuels/traiteur.webp', '/api/identite', '/_vercel/speed-insights/script.js'])
    assert.ok(!re.test(p), 'ressource ou API, sans middleware : ' + p);
  assert.ok(re.test('/%72egie/regie.js'), 'un « % » dans le chemin : le middleware décide, toujours');
  assert.match(s, /runtime:\s*'nodejs'/);
  assert.deepEqual([...s.matchAll(/\bimport\b[^'"]*['"]([^'"]+)['"]/g)].map(x => x[1]), ['./api/_auth/ecrans.cjs'], 'un seul import');
  assert.ok(!/\.mjs['"]/.test(s), 'pas de .mjs : Vercel compile le middleware en CommonJS (Node 20 : ERR_REQUIRE_ESM)');
  assert.ok(!/pg|better-auth|process\.env/.test(lire('api/_auth/ecrans.cjs').replace(/\/\/.*$/gm, '')), 'ecrans.cjs ne lit ni base ni variable');
  assert.ok(!/middleware/.test(lire('.vercelignore')), 'middleware.js part bien en production');
});

test('normaliser : décodé (même deux fois), minuscules, « // » réduits, « . » et « .. » résolus ; encodage invalide = gardé', async () => {
  const { normaliser, estGarde } = await E();
  assert.deepEqual(['/%72egie/', '/%6daitre/', '//regie/', '/REGIE/', '/%2572egie/', '/regie%2F', '/x/../regie/', '/regie/%2e/', '\\regie\\'].map(normaliser), ['/regie/', '/maitre/', '/regie/', '/regie/', '/regie/', '/regie/', '/regie/', '/regie/', '/regie/']);
  assert.equal(normaliser('/regie/index.html%3F.js'), '/regie/index.html', '« ? » encodé : la suite n\'est plus le chemin');
  assert.equal(normaliser('/%E0%A4%A'), null); assert.equal(estGarde('/%E0%A4%A'), true, 'invalide : fermé par défaut');
  for (const p of ['/regies/', '/maitre-x/', '/regie/regie.js', '/%72egie/regie.js', '/', '/exemples/']) assert.equal(estGarde(p), false, p);
});

test('garder : /%72egie/, /%6daitre/, //regie/, /REGIE/ et les autres détours répondent 404 sans propriétaire', async () => {
  const { garder } = await E();
  for (const p of DETOURS) {
    const r = await garder(req(p), async () => false); assert.ok(r, p); assert.equal(r.status, 404, p); assert.equal(r.headers.get('cache-control'), 'no-store', p);
    assert.equal(await garder(req(p, 'x=1'), async () => true), undefined, p + ' : le propriétaire passe');
  }
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
  const { estGarde } = await E();
  for (const f of ['index.html', 'sites/index.html', 'vitrine/world/index.html', 'live/index.html', 'canevas/adaptateurs/maitre.js', 'api/travaux.js'])
    for (const x of lire(f).matchAll(/["'](\/(?:regie|maitre)\/[^"'?#]+)["']/g)) assert.ok(!estGarde(x[1]), f + ' : ' + x[1]);
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

test('vercel.json : les écrans gardés ne sont jamais mis en cache ni indexés ; aucune réécriture ne les contourne', async () => {
  const { ECRANS } = await E(), v = JSON.parse(lire('vercel.json'));   /* les en-têtes visent les adresses directes ; les détours reçoivent 404 (no-store) */
  const h = v.headers.find(x => x.source === '/(regie|maitre|maitre/attente|atlas)(/|/index|/index\\.html)?'); assert.ok(h);
  const re = new RegExp('^' + h.source + '$'); for (const p of ECRANS) assert.ok(re.test(p), p); assert.ok(!re.test('/regie/regie.js'));
  assert.deepEqual(h.headers, [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }]);
  for (const r of [...v.rewrites, ...v.redirects]) assert.ok(!/regie\/index|maitre\/index|atlas\/index|^\/(regie|maitre|atlas)\/?$/.test(r.destination), 'aucune autre adresse ne mène aux pages : ' + r.source);
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
