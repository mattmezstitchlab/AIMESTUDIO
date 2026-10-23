/* Le cœur : un seul projet, N personnes, chacune son écran. Les scénarios (vitrine/scenarios) décrivent les rôles
   d'un exemple ; ils ne portent ni donnée métier ni droit : chaque rôle pointe une perspective existante et un membre réel. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const C = require('../coeur/coeur.js'), V = require('../vitrine/rendu.js'), P = require('../synchroview/permissions.js'), F = require('../synchroview/flux.js');
const SC = fs.readdirSync(R('vitrine/scenarios')).filter(f => f.endsWith('.json')).map(f => lire('vitrine/scenarios/' + f));

test('huit exemples, de quatre à neuf rôles', () => {
  assert.deepEqual(SC.map(s => s.univers).sort(), ['g44', 'magazine', 'mariage', 'regie', 'seminaire', 'stitch', 'studio', 'world']);
  assert.deepEqual(Object.fromEntries(SC.map(s => [s.univers, s.roles.length])), { g44: 4, magazine: 4, mariage: 4, regie: 6, seminaire: 6, stitch: 4, studio: 9, world: 6 });
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
  for (const u of ['world', 'seminaire', 'g44', 'stitch', 'magazine', 'regie', 'studio']) assert.ok(h.includes("u:'" + u + "'"), u);
});

test('une couleur par rôle technique, la même partout ; l\'encre posée dessus reste lisible (AA)', () => {
  const Ro = require('../coeur/roles.js'), lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
  assert.equal(new Set(Object.values(Ro.ROLES).map(r => r.c)).size, Object.keys(Ro.ROLES).length, 'couleurs distinctes');
  for (const [k, r] of Object.entries(Ro.ROLES)) assert.ok(cr(r.c, r.e) >= 4.5, k + ' : contraste ' + cr(r.c, r.e).toFixed(2));
  for (const k of C.couleurs) assert.ok(cr(k.c, k.e) >= 4.5, k.c);
  for (const sc of SC) { const cs = sc.roles.filter(r => r.couleur); assert.equal(new Set(cs.map(r => r.couleur)).size, cs.length, sc.univers + ' : une couleur par rôle');
    for (const r of cs) assert.ok(cr(r.couleur, r.encre || '#141416') >= 4.5, sc.univers + ' · ' + r.angle) }
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

test('Stitch · la grille et la boîte à fils ne sortent que pour qui y a droit ; le patron n\'est jamais recopié', () => {
  const s = fs.readFileSync(R('stitch/js/coeur-stitch.js'), 'utf8'), sc = lire('vitrine/scenarios/stitch.json');
  assert.deepEqual(sc.roles.map(r => r.angle), ['creatrice', 'boutique', 'brodeuse', 'visiteuse']);
  assert.match(s, /'voir-grille':\{[^}]*qui:\{creatrice:1,brodeuse:1\}/); assert.match(s, /'voir-boite':\{[^}]*qui:\{brodeuse:1\}/);
  assert.match(s, /P\.fournitures\(/); assert.match(s, /P\.dimensions\(/); assert.ok(!/"palette"|"points"/.test(JSON.stringify(sc)), 'aucune donnée du patron dans le scénario');
});

test('Magazine · la lectrice voit la vraie page publiée ; seule la rédaction en chef publie', () => {
  global.self = global; const Ro = require('../vitrine/rendu.js'); global.AIMESite = Ro.site; global.AIMECoeur = C; require('../publication/coeur-magazine.js');
  const Ad = C.adaptateurs.magazine, sc = lire('vitrine/scenarios/magazine.json'), k = { c: '#22D3EE', e: '#141416' };
  global.fetch = u => Promise.resolve({ ok: true, json: () => Promise.resolve(lire(u.replace(/^\//, ''))) });
  return Ad.charger(sc).then(() => {
    const pages = sc.roles.map(r => Ad.page(r, { titre: 'Ce qui nous lie' }, k));
    assert.equal(new Set(pages).size, 4); assert.ok(pages.every(h => !/<script/i.test(h)));
    assert.ok(pages.every(h => h.includes('Ce qui nous lie')) || pages.filter(h => h.includes('Ce qui nous lie')).length >= 2, 'le titre écrit une fois paraît');
    const pub = Ad.droits(sc.roles).find(l => /Publier/.test(l.titre)); assert.deepEqual(pub.valeurs.map(v => /Autorisé/.test(v)), sc.roles.map(r => r.angle === 'chef'));
    delete global.fetch;
  });
});

/* La Régie et le Studio n'ont pas encore de moteur de partage : leurs règles sont écrites dans le scénario,
   avec les six dimensions de docs/ROLES.md. On vérifie que l'écran suit la portée, et que le silence est réel. */
for (const u of ['regie', 'studio']) test(u + ' · règles écrites : six dimensions, une portée par écran, aucun compte de ce qui manque', () => {
  global.self = global; global.AIMECoeur = C; require('../coeur/coeur-regles.js');
  const Ad = C.adaptateurs.regles, sc = lire('vitrine/scenarios/' + u + '.json'), k = { c: '#22D3EE', e: '#141416' }, G = sc.regles;
  return Ad.charger(sc).then(() => {
    for (const r of sc.roles) {
      for (const d of ['famille', 'portee', 'duree', 'preuve']) assert.ok(r[d], r.angle + ' : ' + d);
      const h = Ad.page(r, {}, k); assert.ok(!/<script/i.test(h)); assert.ok(!/\{\w+\}/.test(h), r.angle + ' : gabarit rempli');
      assert.ok(/fictif|fictive|démonstration/i.test(h), r.angle + ' : la démonstration est dite');
      for (const b of G.blocs) { const p = (b.voient || {})[r.angle]; if (!p) assert.ok(!h.includes('<h2>' + b.titre.replace(/'/g, '&#39;') + '</h2>'), r.angle + ' ne voit pas « ' + b.titre + ' »'); if (p === 'sien') assert.ok(b.sien && b.sien[r.angle], r.angle + ' : variante de « ' + b.titre + ' »') }
      assert.ok(!/sur \d+|jamais montrés|non montrés/.test(h), r.angle + ' : silence du décompte');
    }
    const L = Ad.droits(sc.roles, {}); assert.equal(L.length, 2 + G.blocs.length + G.gestes.length);
    for (const g of G.gestes) for (const a of Object.keys(g.qui)) assert.ok(sc.roles.some(r => r.angle === a), g.id + ' : rôle ' + a + ' inconnu');
    const ia = sc.roles.find(r => r.famille === 'Agent IA'); assert.ok(ia, 'un agent IA');
    for (const g of G.gestes) assert.notEqual(g.qui[ia.angle], 'oui', 'un agent IA propose, ne décide pas : ' + g.id);
  });
});

test('Régie · le montant écrit une fois paraît chez le propriétaire et le client, jamais chez le collaborateur', () => {
  const Ad = C.adaptateurs.regles, sc = lire('vitrine/scenarios/regie.json'), k = { c: '#FB7185', e: '#141416' };
  return Ad.charger(sc).then(() => {
    const page = a => Ad.page(sc.roles.find(r => r.angle === a), { montant: 3100 }, k);
    assert.match(page('proprietaire'), /3\s?100\s€ HT/); assert.match(page('client'), /3\s?720\s€ TTC/);
    for (const a of ['collaborateur', 'visiteur', 'orbe']) assert.ok(!/3\s?100/.test(page(a)), a);
  });
});
