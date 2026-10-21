// AIME Live · partie serveur, appelée comme par Vercel, avec une base simulée en mémoire (aucune vraie base touchée).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../api/_live/core.js'), passe = require('../api/live/passe.js'), act = require('../api/live/act.js'), journal = require('../api/live/journal.js');
let lignes = [];
function fausseBase() {
  return async (s, ...v) => { const q = s.join('?').replace(/\s+/g, ' ').trim();
    if (q.startsWith('select qui, action')) return lignes.filter(l => l.espace === v[0]).slice().reverse().slice(0, v[1]).map(l => ({ ...l }));
    if (q.startsWith('select n,')) return lignes.filter(l => l.espace === v[0] && l.n > v[1]).slice(0, v[2]).map(l => ({ ...l }));
    if (q.startsWith('insert into live_journal')) { const l = { n: lignes.length + 1, espace: v[0], qui: v[1], action: v[2], p: JSON.parse(v[3]), t: v[4] }; lignes.push(l); return [{ n: l.n }]; }
    throw new Error('requête inattendue : ' + q); };
}
function appel(h, body, method) {
  return new Promise(done => { const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(o) { done({ code: this.code, body: o, headers: this.headers }); } };
    Promise.resolve(h({ method: method || 'POST', body, headers: { 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 250) } }, res)); });
}
const pp = async (espace, qui) => (await appel(passe, { espace, qui })).body.passe;
beforeEach(() => { lignes = []; C._base(fausseBase); C._reinitialiser(); delete process.env.VERCEL_ENV; });

test('live serveur · fermé sans base : 503 sans détail, et 404 en production', async () => {
  C._base(null); const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  const p = await pp('mariage', 'u-camille'); const r = await appel(act, { passe: p, action: 'fait', p: { moment: 'diner' } });
  assert.equal(r.code, 503); assert.doesNotMatch(JSON.stringify(r.body), /DATABASE|neon|postgres/i);
  if (old) process.env.DATABASE_URL = old;
  process.env.VERCEL_ENV = 'production'; assert.equal((await appel(passe, { espace: 'mariage', qui: 'u-camille' })).code, 404);
  assert.equal((await appel(journal, {}, 'GET')).code, 404); delete process.env.VERCEL_ENV;
  assert.equal((await appel(journal, {}, 'GET')).code, 405);
});

test('live serveur · laissez-passer : membres seulement, signature vérifiée, rôle jamais dans le passe', async () => {
  assert.equal((await appel(passe, { espace: 'mariage', qui: 'u-pirate' })).code, 403);
  assert.equal((await appel(passe, { espace: 'banque', qui: 'u-camille' })).code, 403);
  const p = await pp('mariage', 'u-lucie'); assert.doesNotMatch(Buffer.from(p.split('.')[0], 'base64url').toString(), /role|guest/);
  const faux = Buffer.from(JSON.stringify({ espace: 'mariage', qui: 'u-lea', exp: Date.now() + 1e6 })).toString('base64url') + '.' + p.split('.')[1];
  assert.equal((await appel(act, { passe: faux, action: 'fait', p: { moment: 'diner' } })).code, 401);
});

test('live serveur · l\'action est revérifiée : l\'identité vient du passe, une action refusée n\'est jamais écrite', async () => {
  const lucie = await pp('mariage', 'u-lucie'), camille = await pp('mariage', 'u-camille');
  let r = await appel(act, { passe: lucie, qui: 'u-camille', role: 'owner', action: 'retarder', p: { moment: 'bal', minutes: 30, cascade: true } });
  assert.equal(r.code, 403); assert.equal(lignes.length, 0);
  r = await appel(act, { passe: camille, action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } });
  assert.equal(r.code, 200); assert.deepEqual(r.body.touches, ['diner', 'discours', 'bal', 'navettes', 'demontage']); assert.equal(lignes[0].qui, 'u-camille');
  r = await appel(act, { passe: camille, action: 'fait', p: { moment: 'diner' } }); assert.equal(r.code, 200);
  r = await appel(act, { passe: camille, action: 'retarder', p: { moment: 'diner', minutes: 5 } });
  assert.equal(r.code, 403, 'rejoué après le journal : un moment fait ne se décale plus'); assert.equal(lignes.length, 2);
  assert.equal((await appel(act, { passe: camille, action: 'supprimer', p: {} })).code, 400);
});

test('live serveur · le journal : incrémental, et les annonces d\'équipe ne sortent pas vers les invités', async () => {
  const camille = await pp('mariage', 'u-camille');
  await appel(act, { passe: camille, action: 'annoncer', p: { texte: 'Pour tous', audience: 'tous' } });
  await appel(act, { passe: camille, action: 'annoncer', p: { texte: 'Pour l\'équipe', audience: 'equipe' } });
  const inv = await appel(journal, { passe: await pp('mariage', 'u-lucie'), depuis: 0 });
  assert.deepEqual(inv.body.lignes.map(l => l.p.texte), ['Pour tous']); assert.equal(inv.body.dernier, 2);
  const eq = await appel(journal, { passe: await pp('mariage', 'u-lumen'), depuis: 0 }); assert.equal(eq.body.lignes.length, 2);
  assert.equal((await appel(journal, { passe: camille, depuis: 2 })).body.lignes.length, 0);
  const salle = await appel(journal, { passe: await pp('mariage', 'ecran-salle'), depuis: 0 }); assert.equal(salle.body.lignes.length, 1, 'l\'écran de salle est un invité');
  assert.equal((await appel(act, { passe: await pp('mariage', 'ecran-salle'), action: 'fait', p: { moment: 'diner' } })).code, 403);
  assert.equal(inv.headers['Cache-Control'], 'no-store');
});

test('live serveur · les espaces sont étanches et la base n\'est modifiée qu\'en ajout', async () => {
  await appel(act, { passe: await pp('mariage', 'u-camille'), action: 'annoncer', p: { texte: 'Mariage' } });
  assert.equal((await appel(journal, { passe: await pp('seminaire', 'u-samir'), depuis: 0 })).body.lignes.length, 0);
  const fs = require('fs'), src = ['api/live/act.js', 'api/live/journal.js', 'api/live/passe.js', 'api/_live/core.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(src, /\b(update|delete|drop|truncate|alter)\s/i); assert.doesNotMatch(src, /process\.env\.DATABASE_URL[^)]*json/);
  assert.match(fs.readFileSync('db/migrations/2026-10-21-live-journal.sql', 'utf8'), /create table if not exists live_journal/);
});
