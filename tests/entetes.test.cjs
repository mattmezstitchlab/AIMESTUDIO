/* Audit Vercel, point 4 : les en-têtes de sécurité de tout le site (vercel.json, source « /(.*) »).
   Referrer-Policy, nosniff et Permissions-Policy s'appliquent ; la CSP complète est en « report-only » (elle signale, sans rien bloquer).
   La CSP appliquée reste celle d'avant : frame-ancestors seul. Le serveur de test envoie les mêmes en-têtes, pour que le
   parcours navigateur vérifie qu'aucune page ne sort de la CSP. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..'), lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const V = JSON.parse(lire('vercel.json'));
const globaux = () => Object.fromEntries(V.headers.filter(h => h.source === '/(.*)').flatMap(h => h.headers).map(h => [h.key, h.value]));
const directives = csp => Object.fromEntries(csp.split(';').map(s => s.trim().split(/\s+/)).filter(x => x[0]).map(([k, ...v]) => [k, v]));

test('les en-têtes de tout le site : Referrer-Policy, nosniff, Permissions-Policy, CSP en report-only ; la CSP appliquée ne change pas', () => {
  const h = globaux();
  assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.equal(h['Content-Security-Policy'], "frame-ancestors 'self' https://www.lemondeaime.com https://lemondeaime.com https://ai-x-me.com https://www.ai-x-me.com", 'la CSP appliquée : frame-ancestors seul, comme avant');
  assert.ok(h['Content-Security-Policy-Report-Only'], 'la CSP complète, en report-only');
  assert.equal(Object.keys(h).length, 5);
});

test('Permissions-Policy : la caméra pour le site seul (lecture de QR code du Studio), le reste fermé ; le plein écran n\'est pas touché', () => {
  const p = Object.fromEntries(globaux()['Permissions-Policy'].split(',').map(s => s.trim().split('=')));
  assert.equal(p.camera, '(self)');
  for (const f of ['microphone', 'geolocation', 'payment', 'usb', 'serial', 'browsing-topics']) assert.equal(p[f], '()', f);
  assert.ok(!('fullscreen' in p), 'les vidéos intégrées (Studio) gardent le plein écran');
  assert.ok(!('bluetooth' in p), 'Chrome ne connaît pas « bluetooth » et l\'écrit en console');
  assert.match(lire('studio/index.html'), /getUserMedia\(\{video:\{facingMode:'environment'\}\}\)/, 'la caméra sert bien au Studio');
});

test('la CSP report-only : le site seul par défaut, les trois sources externes connues, aucun eval, ni plugin ni <base> ni formulaire ailleurs', () => {
  const d = directives(globaux()['Content-Security-Policy-Report-Only']);
  assert.deepEqual(d['default-src'], ["'self'"]);
  assert.deepEqual(d['script-src'], ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://unpkg.com']);
  assert.deepEqual(d['style-src'], ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
  assert.ok(d['font-src'].includes('https://fonts.gstatic.com'));
  assert.deepEqual(d['connect-src'], ["'self'", 'data:', 'blob:'], 'aucun appel vers un autre site depuis le navigateur');
  assert.deepEqual(d['object-src'], ["'none'"]); assert.deepEqual(d['base-uri'], ["'self'"]); assert.deepEqual(d['form-action'], ["'self'"]);
  assert.ok(!Object.values(d).flat().includes("'unsafe-eval'"));
  assert.ok(!('frame-ancestors' in d), 'frame-ancestors reste dans la CSP appliquée');
  assert.ok(!('report-uri' in d) && !('report-to' in d), 'pas de point de collecte : les entorses s\'écrivent dans la console du navigateur');
  /* chaque script externe (une adresse https://…/….js dans une page ou un script) vient d'un hôte permis */
  const hotes = new Set();
  for (const f of ['index.html', 'studio/index.html', 'mariage.html', 'sites/editeur.js', 'regie/regie.js'])
    for (const m of lire(f).matchAll(/["'](https:\/\/[^/'"]+)\/[^'"\s]*\.js["']/g)) hotes.add(m[1]);
  assert.deepEqual([...hotes].sort(), ['https://cdnjs.cloudflare.com', 'https://unpkg.com']);
  for (const x of hotes) assert.ok(d['script-src'].includes(x), x);
});

test('les pages qui demandent moins de référent le gardent (Compte : no-referrer, dans la page)', () => {
  assert.match(lire('compte/index.html'), /<meta name="referrer" content="no-referrer">/);
});

test('le serveur de test envoie les mêmes en-têtes, sur une page comme sur un écran gardé', async () => {
  const port = 8900 + Math.floor(Math.random() * 90);
  const s = spawn(process.execPath, [path.join(RACINE, 'scripts/serveur-test.cjs')], { env: Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1' }), stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, ko) => { s.stdout.once('data', ok); s.once('exit', ko); });
    const tete = u => new Promise((ok, ko) => http.get({ host: '127.0.0.1', port, path: u }, r => { r.resume(); ok(r); }).on('error', ko));
    for (const u of ['/', '/regie/']) {
      const r = await tete(u), h = globaux();
      for (const [k, v] of Object.entries(h)) assert.equal(r.headers[k.toLowerCase()], v, u + ' : ' + k);
    }
  } finally { s.kill(); }
});
