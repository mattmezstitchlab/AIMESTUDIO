/* Le cœur : un seul projet, N personnes, chacune son écran. Les scénarios (vitrine/scenarios) décrivent les rôles
   d'un exemple ; ils ne portent ni donnée métier ni droit : chaque rôle pointe une perspective existante et un membre réel. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const C = require('../coeur/coeur.js'), V = require('../vitrine/rendu.js'), P = require('../synchroview/permissions.js'), F = require('../synchroview/flux.js');
const SC = fs.readdirSync(R('vitrine/scenarios')).filter(f => f.endsWith('.json')).map(f => lire('vitrine/scenarios/' + f));

test('trois exemples, de quatre à six rôles', () => {
  assert.deepEqual(SC.map(s => s.univers).sort(), ['mariage', 'seminaire', 'world']);
  assert.deepEqual(Object.fromEntries(SC.map(s => [s.univers, s.roles.length])), { mariage: 4, seminaire: 6, world: 6 });
});

for (const sc of SC) test(sc.univers + ' · chaque rôle pointe une perspective et un membre réels, sans rôle technique recopié', () => {
  const ps = lire('vitrine/perspectives/' + sc.univers + '.json'), ac = lire('vitrine/acces/' + sc.univers + '.json');
  for (const r of sc.roles) {
    const a = ps.angles.find(x => x.id === r.angle); assert.ok(a, r.angle + ' : perspective');
    assert.equal(a.regard, r.qui, r.angle + ' : même personne'); assert.ok(ac.membres[r.qui], r.qui + ' : membre de l\'espace');
    assert.ok(!('role' in r) && !('roles' in r), 'le rôle technique vient de la couche d\'accès');
    assert.ok(r.nom && r.de && r.arrivee && r.arrivee.titre && r.arrivee.texte, r.angle + ' : arrivée décrite');
  }
});

for (const sc of SC) test(sc.univers + ' · le balisage suit le nombre de rôles : une scène, une ancre et un écran par personne', () => {
  const h = C.html(sc), N = sc.roles.length;
  assert.equal((h.match(/<section class="sc"/g) || []).length, N);
  assert.equal((h.match(/class="ancre ancre-sc" data-orbe="1"/g) || []).length, N);
  assert.equal((h.match(/<figure class="tel"/g) || []).length, N);
  assert.equal((h.match(/sandbox="allow-same-origin"/g) || []).length, N); assert.ok(!/allow-scripts|<script/.test(h));
  assert.match(h, new RegExp(C.nombre(N) + ' écrans, une seule source'));
  assert.equal(/id="jourj"/.test(h), !!sc.jourJ);
});

for (const sc of SC) test(sc.univers + ' · les écrans sont réellement différents, composés par le moteur avec les règles', () => {
  const c = lire('vitrine/donnees/' + sc.univers + '.json'), ac = lire('vitrine/acces/' + sc.univers + '.json'), ps = lire('vitrine/perspectives/' + sc.univers + '.json'), m = lire('vitrine/modeles/editorial.json');
  const pages = sc.roles.map(r => V.rendre({ contenu: c, acces: ac, perspective: ps.angles.find(a => a.id === r.angle), libelles: ps.libelles || {}, modele: m, regles: P, flux: c.missions ? F : null }).html);
  assert.equal(new Set(pages.map(h => [...h.matchAll(/data-sv="sec-([a-z-]+)"/g)].map(x => x[1]).join(','))).size, sc.roles.length);
});

test('la page des exemples charge le cœur et ne propose que des exemples qui existent', () => {
  const h = fs.readFileSync(R('exemples/index.html'), 'utf8');
  for (const s of ['/coeur/coeur.js', '/coeur/coeur.css', '/coeur/charte.css', '/synchroview/permissions.js', '/vitrine/rendu.js']) assert.ok(h.includes(s), s);
  for (const u of ['world', 'seminaire']) { assert.ok(h.includes("u:'" + u + "'"), u); assert.ok(fs.existsSync(R('vitrine/scenarios/' + u + '.json'))) }
  assert.ok(h.indexOf('AIMECoeur.html(sc)') < h.indexOf("'/zero/zero.js'") || /charger\(ORBE,function\(\)\{AIMECoeur\.monter/.test(h), 'le balisage est posé avant l\'orbe');
});
