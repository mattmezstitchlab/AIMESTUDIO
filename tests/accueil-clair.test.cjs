// L'accueil clair (25/10/2026, prototype validé par Matt) : « Un projet. Chacun son écran. » compose la page de chaque place
// avec les VRAIES règles (synchroview/permissions.js) et la couleur de chaque place (coeur/roles.js) ; les sept téléphones
// n'allument que les écrans concernés. Données fictives, rien n'est écrit ni envoyé.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const V = require('../accueil/vitrine.js'), R = require('../coeur/roles.js');
const titres = (p, e) => V.composer(p, e).vus.map(m => m.titre);

test('chacun son écran : le couple et la coordination voient tout ; le DJ, sans l\'organisation ; l\'invitée, le public seulement', () => {
  assert.equal(titres('owner').length, V.MOMENTS.length);
  assert.deepEqual(titres('editor'), titres('owner'));
  assert.ok(!titres('contributor').includes('Brief traiteur') && titres('contributor').includes('Set cocktail du DJ'));
  assert.deepEqual(titres('guest'), ['Cérémonie', 'Cocktail', 'Dîner', 'Premier bal']);
  assert.equal(V.composer('guest').caches, 3, 'ce qui n\'est pas lu est compté, jamais envoyé');
});

test('le réel bouge : seule l\'organisation peut décaler ; le décalage et le plan B se voient sur chaque place concernée', () => {
  assert.equal(V.composer('owner').decaler, true); assert.equal(V.composer('editor').decaler, true);
  assert.equal(V.composer('contributor').decaler, false); assert.equal(V.composer('guest').decaler, false);
  const g = V.composer('guest', { decale: true, planB: true }).vus;
  assert.equal(g.find(m => m.titre === 'Cocktail').heure, '16:15'); assert.match(g.find(m => m.titre === 'Cérémonie').lieu, /Orangerie/);
  assert.equal(V.composer('guest').vus.find(m => m.titre === 'Cocktail').heure, '16:00');
});

test('une couleur par place, la même partout (coeur/roles.js)', () => {
  for (const p of V.PLACES) assert.equal(V.composer(p.id).couleur, R.couleur(p.id));
  assert.deepEqual(V.PLACES.map(p => p.place), ['J’organise', 'Je coordonne', 'Je contribue', 'Je participe']);
});

test('les sept téléphones : seuls les écrans concernés s\'allument', () => {
  for (const e of V.EVTS) { const t = V.telephones(e.id); assert.equal(t.length, 7); assert.deepEqual(t.filter(x => x.on).map(x => x.nom).length, Object.keys(e.m).length, e.id); }
  assert.equal(V.telephones('surprise').find(x => x.nom === 'La mariée').on, false, 'la surprise ne sonne pas chez la mariée');
});

test('l\'accueil : clair, le manifeste, la mosaïque gardée, l\'agent dit « En préparation », aucune page /aime/', () => {
  const z = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(z, /<body class="clair">/); assert.match(z, /id="vTels"/); assert.match(z, /href="\/exemples\/mosaique\/"/);
  assert.match(z, /Agent <span class="v-pil"[^>]*>En préparation<\/span>/, 'rien n\'est simulé comme existant');
  assert.ok(!/href="\/aime\/"/.test(z), 'Le Monde AIME (cartes postales, cube) reste à part');
});
