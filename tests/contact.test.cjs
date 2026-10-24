const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const H = require('../api/contact.js');

const ENV = { RESEND_API_KEY: 're_test_fictif', CONTACT_TO: 'boite@exemple.test', CONTACT_FROM: 'AIME <contact@exemple.test>' };
function bon(extra) {
  return Object.assign({ prenom: 'Camille', nom: 'Fictif', email: 'camille@exemple.test', tel: '06 00 00 00 00', adresse: '1 rue Fictive, Nantes', projet: 'site', livraison: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), message: 'Un site vitrine pour un atelier de céramique, avec galerie.', consentement: true, site_web: '', duree: 8000 }, extra);
}
function appel(corps, opts) {
  opts = opts || {};
  const req = { method: opts.method || 'POST', headers: Object.assign({ origin: 'https://aime.exemple.test', host: 'aime.exemple.test', 'content-type': 'application/json', 'x-real-ip': opts.ip || '203.0.113.' + Math.floor(Math.random() * 250) }, opts.headers || {}), body: corps };
  const res = { code: 0, corps: null, h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(j) { this.corps = j; return this; } };
  return H(req, res).then(() => res);
}
let envois;
beforeEach(() => {
  H._reinitialiser(); envois = [];
  Object.assign(process.env, ENV);
  H.fetch = async (url, o) => { envois.push({ url, o, corps: JSON.parse(o.body) }); return { ok: true, status: 200 }; };
});

test('contact · une demande valide part en e-mail : expéditeur du domaine, visiteur en Reply-To, clé côté serveur', async () => {
  const r = await appel(bon());
  assert.equal(r.code, 200); assert.deepEqual(r.corps, { ok: true });
  assert.equal(envois.length, 1); const e = envois[0];
  assert.equal(e.url, 'https://api.resend.com/emails');
  assert.equal(e.o.headers.Authorization, 'Bearer re_test_fictif'); assert.ok(e.o.headers['Idempotency-Key'].length <= 256);
  assert.equal(e.corps.from, ENV.CONTACT_FROM); assert.deepEqual(e.corps.to, [ENV.CONTACT_TO]); assert.equal(e.corps.reply_to, 'camille@exemple.test');
  assert.match(e.corps.subject, /Création de site · Camille Fictif/); assert.match(e.corps.text, /céramique/);
  assert.ok(!JSON.stringify(r.corps).includes('re_test'), 'la clé ne revient jamais au navigateur');
});

test('contact · le HTML du message est échappé et le sujet reste sur une ligne', async () => {
  await appel(bon({ prenom: 'Ca<b>mille', message: '<script>alert(1)</script> un projet de site complet ici' }));
  assert.ok(!envois[0].corps.html.includes('<script>')); assert.match(envois[0].corps.html, /&lt;script&gt;/);
  const r = await appel(bon({ nom: 'Fictif\r\nBcc: x@y.z' })); assert.equal(r.code, 422, 'pas de retour à la ligne dans un champ d\'une ligne');
});

test('contact · validation des champs et limites de taille', async () => {
  let r = await appel(bon({ email: 'pas-un-mail', message: 'court', projet: 'pirate', consentement: false, tel: 'abc', livraison: '2001-01-01' }));
  assert.equal(r.code, 422); assert.deepEqual(Object.keys(r.corps.champs).sort(), ['consentement', 'email', 'livraison', 'message', 'projet', 'tel']);
  r = await appel(bon({ message: 'x'.repeat(4001) })); assert.equal(r.code, 422);
  r = await appel(bon({ message: 'x'.repeat(17000) })); assert.equal(r.code, 413);
  r = await appel(bon(), { headers: { 'content-length': '999999' } }); assert.equal(r.code, 413);
  r = await appel('[1,2]'); assert.equal(r.code, 400);
  assert.equal(envois.length, 0);
});

test('contact · méthode, origine et format sont vérifiés', async () => {
  assert.equal((await appel(bon(), { method: 'GET' })).code, 405);
  assert.equal((await appel(bon(), { headers: { origin: 'https://ailleurs.test' } })).code, 403);
  assert.equal((await appel(bon(), { headers: { origin: undefined } })).code, 403);
  assert.equal((await appel(bon(), { headers: { 'content-type': 'text/plain' } })).code, 415);
  assert.equal(envois.length, 0);
});

test('contact · les robots reçoivent « ok » mais rien ne part (piège et saisie trop rapide)', async () => {
  assert.deepEqual((await appel(bon({ site_web: 'http://spam.test' }))).corps, { ok: true });
  assert.deepEqual((await appel(bon({ duree: 400 }))).corps, { ok: true });
  assert.deepEqual((await appel(bon({ duree: undefined }))).corps, { ok: true });
  assert.equal(envois.length, 0);
});

test('contact · limitation des envois par adresse IP', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await appel(bon(), { ip: '198.51.100.7' })).code, 200);
  const r = await appel(bon(), { ip: '198.51.100.7' }); assert.equal(r.code, 429); assert.ok(Number(r.h['Retry-After']) > 0);
  assert.equal((await appel(bon(), { ip: '198.51.100.8' })).code, 200, 'une autre adresse n\'est pas bloquée');
  assert.equal(envois.length, 4);
});

test('contact · configuration absente ou envoi refusé : réponse claire, sans détail interne', async () => {
  delete process.env.RESEND_API_KEY;
  let r = await appel(bon()); assert.equal(r.code, 503); assert.equal(envois.length, 0);
  Object.assign(process.env, ENV); H.fetch = async () => ({ ok: false, status: 403 });
  r = await appel(bon()); assert.equal(r.code, 502); assert.deepEqual(r.corps, { ok: false, erreur: 'envoi' });
  H.fetch = async () => { throw new Error('réseau'); };
  r = await appel(bon()); assert.equal(r.code, 502);
});

test('contact · la page ne contient ni clé ni adresse destinataire, et le formulaire a son piège et son consentement', () => {
  const page = fs.readFileSync('contact/index.html', 'utf8'), z = page + fs.readFileSync('zero/contact.js', 'utf8');
  assert.match(page, /<script src="\/zero\/contact\.js"><\/script>/); assert.match(fs.readFileSync('index.html', 'utf8'), /href="\/contact\/"/, 'le pied de page de l\'accueil y mène');
  assert.ok(!/re_[A-Za-z0-9]{8,}|RESEND|CONTACT_TO/.test(z));
  assert.match(z, /name="site_web"/); assert.match(z, /id="c-accord"/); assert.match(z, /fetch\('\/api\/contact'/);
  for (const n of ['prenom', 'nom', 'email', 'tel', 'adresse', 'livraison', 'message']) assert.match(z, new RegExp('name="' + n + '"'));
  assert.ok(!/localStorage/.test(fs.readFileSync('zero/contact.js', 'utf8')), 'rien n\'est gardé dans le navigateur');
});
