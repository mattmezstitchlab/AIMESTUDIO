/* Le cœur : un seul projet, N personnes, chacune son écran. Les scénarios (vitrine/scenarios) décrivent les rôles
   d'un exemple ; ils ne portent ni donnée métier ni droit : chaque rôle pointe une perspective existante et un membre réel. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const C = require('../coeur/coeur.js'), V = require('../vitrine/rendu.js'), P = require('../synchroview/permissions.js'), F = require('../synchroview/flux.js');
const SC = fs.readdirSync(R('vitrine/scenarios')).filter(f => f.endsWith('.json')).map(f => lire('vitrine/scenarios/' + f));

test('quatre exemples, de quatre à six rôles', () => {
  assert.deepEqual(SC.map(s => s.univers).sort(), ['g44', 'mariage', 'seminaire', 'world']);
  assert.deepEqual(Object.fromEntries(SC.map(s => [s.univers, s.roles.length])), { g44: 4, mariage: 4, seminaire: 6, world: 6 });
});

for (const sc of SC.filter(s => !s.moteur)) test(sc.univers + ' · chaque rôle pointe une perspective et un membre réels, sans rôle technique recopié', () => {
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

for (const sc of SC.filter(s => !s.moteur)) test(sc.univers + ' · les écrans sont réellement différents, composés par le moteur avec les règles', () => {
  const c = lire('vitrine/donnees/' + sc.univers + '.json'), ac = lire('vitrine/acces/' + sc.univers + '.json'), ps = lire('vitrine/perspectives/' + sc.univers + '.json'), m = lire('vitrine/modeles/editorial.json');
  const pages = sc.roles.map(r => V.rendre({ contenu: c, acces: ac, perspective: ps.angles.find(a => a.id === r.angle), libelles: ps.libelles || {}, modele: m, regles: P, flux: c.missions ? F : null }).html);
  assert.equal(new Set(pages.map(h => [...h.matchAll(/data-sv="sec-([a-z-]+)"/g)].map(x => x[1]).join(','))).size, sc.roles.length);
});

test('la page des exemples charge le cœur et ne propose que des exemples qui existent', () => {
  const h = fs.readFileSync(R('exemples/index.html'), 'utf8');
  for (const s of ['/coeur/coeur.js', '/coeur/coeur.css', '/coeur/charte.css', '/synchroview/permissions.js', '/vitrine/rendu.js']) assert.ok(h.includes(s), s);
  for (const u of ['world', 'seminaire']) { assert.ok(h.includes("u:'" + u + "'"), u); assert.ok(fs.existsSync(R('vitrine/scenarios/' + u + '.json'))) }
  assert.ok(h.indexOf("$('exCorps').innerHTML=AIMECoeur.html(sc)") < h.indexOf('.concat(ORBE),function(){AIMECoeur.monter(sc)'), 'le balisage est posé avant que l\'orbe ne charge');
  for (const u of ['world', 'seminaire', 'g44']) assert.ok(h.includes("u:'" + u + "'"), u);
});

test('une couleur par rôle technique, la même partout ; l\'encre posée dessus reste lisible (AA)', () => {
  const Ro = require('../coeur/roles.js'), lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
  assert.equal(new Set(Object.values(Ro.ROLES).map(r => r.c)).size, Object.keys(Ro.ROLES).length, 'couleurs distinctes');
  for (const [k, r] of Object.entries(Ro.ROLES)) assert.ok(cr(r.c, r.e) >= 4.5, k + ' : contraste ' + cr(r.c, r.e).toFixed(2));
  for (const k of C.couleurs) assert.ok(cr(k.c, k.e) >= 4.5, k.c);
  for (const f of ['index.html', 'exemples/index.html', 'live/index.html', 'compte/index.html', 'sites/index.html']) {
    const h = fs.readFileSync(R(f), 'utf8'), i = h.indexOf('/coeur/roles.js'); assert.ok(i > 0, f + ' charge les couleurs des rôles');
  }
});

test('G44 · quatre identités du laboratoire, quatre écrans différents ; les noms ne sortent que si la règle et la perspective le permettent', () => {
  global.self = global; ['dossier', 'moteur', 'acces', 'formation'].forEach(f => { const m = require('../g44/js/' + f + '.js'); global['G44' + { dossier: 'Dossier', moteur: 'Moteur', acces: 'Acces', formation: 'Formation' }[f]] = m });
  global.AIMECoeur = C; require('../g44/js/coeur-g44.js');
  const sc = lire('vitrine/scenarios/g44.json'), Ad = C.adaptateurs.g44, A = global.G44Acces;
  for (const r of sc.roles) assert.ok(A.IDENTITES[r.angle] && A.PERSPECTIVES[r.angle], r.angle);
  return Ad.charger(sc).then(() => {
    const k = { c: '#FB7185', e: '#141416' }, pages = sc.roles.map(r => Ad.page(r, {}, k));
    assert.equal(new Set(pages).size, 4); assert.ok(pages.every(h => !/<script/i.test(h)));
    const nom = 'Camille Morel';
    assert.deepEqual(sc.roles.map((r, i) => pages[i].includes(nom)), [true, false, true, false], 'agent et responsable seulement');
    assert.match(Ad.page(sc.roles[0], { annee: '2014' }, k), /14\/06\/2014|18\/06\/2014/, 'l\'année écrite une fois passe dans la simulation');
    const d = Ad.droits(sc.roles, {}); assert.ok(d.length >= 5 && d.every(l => l.valeurs.length === 4));
  });
});
