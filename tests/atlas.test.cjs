/* L'Atlas d'audit UX (/atlas/, réservé au propriétaire du site, comme /regie/) et l'étude publique (/etude/), 24/10/2026.
   Le dépôt est public : aucune des deux pages ne détaille un constat de sécurité serveur ; l'étude se lit sans JavaScript. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = f => path.join(__dirname, '..', f), lire = f => fs.readFileSync(R(f), 'utf8');

test('/atlas/ est gardé comme la Régie : 404 sans propriétaire, sous toutes ses formes', async () => {
  const { garder, estGarde } = require('../api/_auth/ecrans.cjs');
  const req = p => new Request('https://www.lemondeaime.com' + p);
  for (const p of ['/atlas', '/atlas/', '/atlas/index.html', '/ATLAS/', '/%61tlas/', '//atlas//', '/x/../atlas/']) {
    assert.ok(estGarde(p), p);
    const r = await garder(req(p), async () => false); assert.equal(r && r.status, 404, p);
    assert.equal(await garder(req(p), async () => true), undefined, p + ' : le propriétaire passe');
  }
  for (const p of ['/atlas/data.json', '/atlas/img/x.webp', '/etude/', '/etude/dossier.md', '/atlasx/']) assert.equal(estGarde(p), false, p);
});

test('/atlas/ : noindex, et chaque capture citée existe', () => {
  const h = lire('atlas/index.html'), d = JSON.parse(lire('atlas/data.json'));
  assert.match(h, /<meta name="robots" content="noindex, nofollow">/);
  assert.ok(d.ecrans.length > 400, 'les captures de l\'audit');
  for (const e of d.ecrans) assert.ok(fs.existsSync(R('atlas/' + e.img)), e.img);
  const v = JSON.parse(lire('vercel.json'));
  assert.ok(v.headers.some(x => /atlas/.test(x.source) && x.headers.some(k => k.key === 'Cache-Control' && /no-store/.test(k.value))), 'pas de cache pour la page gardée');
});

test('/etude/ : HTML statique lisible sans script, noindex, Dock du site, captures existantes', () => {
  const h = lire('etude/index.html');
  assert.match(h, /<meta name="robots" content="noindex">/);
  for (const t of ['Synthèse', 'Matrice de convergence', 'Le Dock unique', 'Plan de migration', 'Annexe A']) assert.ok(h.includes(t), t);
  assert.ok(h.includes('id="dock-site"') && h.includes('/dock/dock.js'), 'le Dock unifié');
  for (const m of h.matchAll(/src="\/atlas\/(img\/[^"]+)"/g)) assert.ok(fs.existsSync(R('atlas/' + m[1])), m[1]);
  assert.ok(fs.existsSync(R('etude/dossier.md')), 'le texte brut');
});

test('dépôt public : aucun détail de sécurité serveur dans l\'Atlas ni dans l\'étude', () => {
  const d = JSON.parse(lire('atlas/data.json'));
  assert.ok(!d.anomalies.some(a => ['A11', 'A12', 'A13'].includes(a.id)), 'constats de sécurité retirés');
  for (const f of ['atlas/data.json', 'etude/index.html', 'etude/dossier.md'])
    assert.ok(!/espaces\.mjs:2(28|39)|api\/live\/act|laissez-passer valable/.test(lire(f)), f);
});
