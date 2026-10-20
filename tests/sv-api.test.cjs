// Vérification côté serveur : les handlers sont appelés comme par Vercel.
const test = require('node:test');
const assert = require('node:assert/strict');
const check = require('../api/sv/check.js'), act = require('../api/sv/act.js'), tx = require('../api/sv/tx.js');
function call(h, body, method) {
  return new Promise(done => { const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { done({ code: this.code, body: o }); } };
    h({ method: method || 'POST', body }, res); });
}
test('le rôle envoyé par le navigateur est ignoré', async () => {
  const r = await call(check, { identity: 'u-lucie', role: 'owner', checks: [{ res: 'space', action: 'delete' }] });
  assert.equal(r.body.role, 'guest'); assert.equal(r.body.results[0].allow, false);
});
test('identité de test inconnue : 403', async () => assert.equal((await call(check, { identity: 'u-pirate', checks: [] })).code, 403));
test('une identité qui n\'est pas un profil de démonstration : 403', async () => assert.equal((await call(act, { identity: 'u-nina', res: 'personal:nina', action: 'read' })).code, 403));
test('GET refusé', async () => assert.equal((await call(check, {}, 'GET')).code, 405));
test('production : indisponible', async () => { process.env.VERCEL_ENV = 'production'; const r = await call(check, { identity: 'u-lea', checks: [] }); delete process.env.VERCEL_ENV; assert.equal(r.code, 404); });
test('document : propriétaire autorisé explicitement → contenu', async () => { const r = await call(act, { identity: 'u-lea', res: 'doc:contrat', action: 'read' }); assert.equal(r.code, 200); assert.equal(r.body.resource.data.montant, '1 200 €'); });
test('document : coordination non autorisée → 403 sans contenu', async () => { const r = await call(act, { identity: 'u-camille', res: 'doc:contrat', action: 'read' }); assert.equal(r.code, 403); assert.equal(r.body.resource, undefined); });
test('données personnelles : Lucie lit les siennes', async () => assert.equal((await call(act, { identity: 'u-lucie', res: 'personal:lucie', action: 'read' })).code, 200));
test('données personnelles : Lucie ne lit pas celles de Nina', async () => assert.equal((await call(act, { identity: 'u-lucie', res: 'personal:nina', action: 'read' })).code, 403));
test('données personnelles : le prestataire ne les lit pas', async () => assert.equal((await call(act, { identity: 'u-lumen', res: 'personal:lucie', action: 'read' })).code, 403));
test('paiement sans autorisation de transaction : 403 + needsTx', async () => { const r = await call(act, { identity: 'u-lea', res: 'pay:acompte', action: 'pay' }); assert.equal(r.code, 403); assert.equal(r.body.needsTx, true); });
test('paiement : autorisation de transaction puis paiement simulé', async () => {
  const t = await call(tx, { identity: 'u-lea', res: 'pay:acompte' }); assert.equal(t.code, 200);
  const r = await call(act, { identity: 'u-lea', res: 'pay:acompte', action: 'pay', tx: t.body.tx }); assert.equal(r.code, 200); assert.match(r.body.effet, /simulé/);
});
test('paiement : la coordination n\'obtient pas d\'autorisation de transaction', async () => assert.equal((await call(tx, { identity: 'u-camille', res: 'pay:acompte' })).code, 403));
test('paiement : autorisation d\'une autre personne réutilisée → 403', async () => {
  const t = await call(tx, { identity: 'u-lea', res: 'pay:acompte' });
  assert.equal((await call(act, { identity: 'u-camille', res: 'pay:acompte', action: 'pay', tx: t.body.tx })).code, 403);
});
test('paiement : autorisation falsifiée → 403', async () => {
  const fake = Buffer.from(JSON.stringify({ subjectId: 'u-lea', paymentId: 'acompte', amount: 360, expires: Date.now() + 60000 })).toString('base64url') + '.AAAA';
  assert.equal((await call(act, { identity: 'u-lea', res: 'pay:acompte', action: 'pay', tx: fake })).code, 403);
});
test('supprimer l\'espace : seul le propriétaire (effet simulé)', async () => {
  assert.equal((await call(act, { identity: 'u-camille', res: 'space', action: 'delete' })).code, 403);
  assert.equal((await call(act, { identity: 'u-lea', res: 'space', action: 'delete' })).code, 200);
});
test('moment attribué : Studio Lumen modifie, Paul non', async () => {
  assert.equal((await call(act, { identity: 'u-lumen', res: 'event:shooting', action: 'edit' })).code, 200);
  assert.equal((await call(act, { identity: 'u-paul', res: 'event:shooting', action: 'edit' })).code, 403);
});
