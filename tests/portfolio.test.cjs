// Portfolio : pages projet rendues côté serveur, et l'OS posé sur la Page Zéro.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const h = require('../api/travaux.js');
const R = require('../regie/donnees.js');
function get(url, host) { return new Promise(d => { const res = { statusCode: 0, h: {}, setHeader(k, v) { this.h[k] = v; }, end(t) { d({ code: this.statusCode, h: this.h, t: t || '' }); } }; h({ method: 'GET', url, headers: { host: host || 'aimestudio.example' } }, res); }); }

test('travaux · index et page projet : titre, description et aperçu de partage propres au projet', async () => {
  const cfg = R.config(require('../regie/site.json')), pub = cfg.realisations.filter(r => r.publie);
  let r = await get('/api/travaux'); assert.equal(r.code, 200); assert.equal((r.t.match(/class="carte"/g) || []).length, pub.length);
  const p = pub[0]; r = await get('/api/travaux?p=' + p.slug);
  assert.equal(r.code, 200); assert.match(r.t, new RegExp('<title>' + p.titre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' · Réalisation · AIME</title>'));
  assert.match(r.t, /<meta property="og:image" content="https:\/\/aimestudio\.example\//); assert.match(r.t, /<link rel="canonical" href="https:\/\/aimestudio\.example\/travaux\//);
  assert.match(r.t, /id="oeuvre" data-id="/); assert.match(r.h['Content-Type'], /text\/html/);
});

test('travaux · seul le publié existe ; adresses piégées et hôte forgé neutralisés', async () => {
  assert.equal((await get('/api/travaux?p=inconnu')).code, 404);
  assert.equal((await get('/api/travaux?p=%3Cscript%3E')).code, 404);
  const r = await get('/api/travaux', 'evil.com"><script>alert(1)</script>'); assert.doesNotMatch(r.t, /<script>alert/); assert.doesNotMatch(r.t, /evil\.com"/);
  const res = await new Promise(d => h({ method: 'POST', url: '/api/travaux', headers: {} }, { statusCode: 0, setHeader() {}, end() { d(this.statusCode); } })); assert.equal(res, 405);
  const v = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const s of ['/travaux', '/travaux/', '/travaux/:p', '/travaux/:p/']) assert.ok(v.rewrites.some(x => x.source === s), s);
});

test('travaux · un brouillon n\'a pas de page publique', async () => {
  const brouillon = R.config({ realisations: [{ id: 'r-b', titre: 'Secret', publie: false }] }).realisations[0];
  assert.equal(brouillon.publie, false);
  assert.equal((await get('/api/travaux?p=' + brouillon.slug)).code, 404);
});

test('OS sur la Page Zéro : coque chargée, scopée, pas d\'OS dans l\'OS', () => {
  const page = fs.readFileSync('index.html', 'utf8');
  const ordre = ['/regie/scene.js', '/os/apps.js', '/os/coque.js', '/os/os.js'].map(s => page.indexOf('src="' + s + '"'));
  assert.ok(ordre.every((x, i) => x > 0 && (i === 0 || x > ordre[i - 1])), 'ordre de chargement');
  const css = fs.readFileSync('os/coque.css', 'utf8').split('\n').filter(l => /^[^@/\s].*\{/.test(l));
  assert.ok(css.every(l => /^(\.os-coque|body\.os-geste \.os-coque|body\.os-page|@)/.test(l)), 'toutes les règles sont enfermées sous .os-coque');
  assert.match(fs.readFileSync('os/coque.js', 'utf8'), /pas d'OS dans l'OS/);
  assert.match(fs.readFileSync('os/os.js', 'utf8'), /var PAGE=document\.body\.classList\.contains\('os-page'\)/);
  assert.match(fs.readFileSync('regie/scene.js', 'utf8'), /avecCoque\(\)/, 'l\'orbe du dock remplace le bouton d\'orbe');
});
