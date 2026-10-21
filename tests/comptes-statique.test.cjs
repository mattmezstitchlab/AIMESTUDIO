// Comptes : ce qui se vérifie sans base de données.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
function res() { let d; const p = new Promise(r => { d = r; }); return { p, statusCode: 200, h: {}, setHeader(k, v) { this.h[k] = v; }, end(t) { d({ code: this.statusCode, body: JSON.parse(t) }); } }; }

test('comptes · fermés par défaut : sans base ou sans secret, 503 ; en production, 404', async () => {
  const sauv = { ...process.env }; delete process.env.DATABASE_URL; delete process.env.BETTER_AUTH_SECRET; delete process.env.VERCEL_ENV;
  const A = await import('../api/_auth/auth.mjs');
  assert.equal(A.pret({ DATABASE_URL: 'x', BETTER_AUTH_SECRET: 'court' }), false, 'un secret trop court ne suffit pas');
  const h = (await import('../api/auth/[...all].mjs')).default, E = (await import('../api/espaces.mjs')).default;
  let r = res(); await h({ method: 'GET', url: '/api/auth/get-session', headers: {} }, r); r = await r.p; assert.equal(r.code, 503); assert.doesNotMatch(JSON.stringify(r.body), /DATABASE|SECRET|postgres/i);
  r = res(); await E({ method: 'POST', body: { action: 'mes' }, headers: {} }, r); assert.equal((await r.p).code, 503);
  process.env.VERCEL_ENV = 'production'; r = res(); await h({ method: 'GET', url: '/api/auth/get-session', headers: {} }, r); assert.equal((await r.p).code, 404);
  Object.keys(process.env).forEach(k => { if (!(k in sauv)) delete process.env[k]; }); Object.assign(process.env, sauv);
});

test('comptes · une photo de profil n\'est qu\'une petite image encodée', async () => {
  const A = await import('../api/_auth/auth.mjs');
  assert.ok(A.imageOk('data:image/webp;base64,UklGRg=='));
  for (const ko of ['https://ailleurs.fr/x.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,AA==', 'data:image/png;base64,' + 'A'.repeat(170000)]) assert.equal(A.imageOk(ko), false, ko.slice(0, 30));
});

test('comptes · aucun secret dans le code, aucun innerHTML dans les timbres et la page compte', () => {
  const src = ['api/_auth/auth.mjs', 'api/_auth/espaces.mjs', 'api/espaces.mjs', 'api/auth/[...all].mjs', 'compte/compte.js', 'compte/timbre.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(src, /re_[A-Za-z0-9]{10,}|sk_live|postgres(ql)?:\/\/[^'"\s]+@/);
  assert.doesNotMatch(fs.readFileSync('compte/timbre.js', 'utf8') + fs.readFileSync('compte/compte.js', 'utf8'), /innerHTML/);
  assert.match(fs.readFileSync('compte/index.html', 'utf8'), /<meta name="referrer" content="no-referrer">/, 'le jeton d\'invitation ne fuit pas par le référent');
  assert.match(fs.readFileSync('api/_auth/espaces.mjs', 'utf8'), /hacher\(jeton\)/, 'seule l\'empreinte du jeton est gardée');
  assert.ok(require('../nav/registre.js').ENTREES.some(e => e.id === 'compte' && e.href === '/compte/'));
});
