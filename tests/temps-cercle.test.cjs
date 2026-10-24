/* Le cercle du module Temps (modules/temps/cercle.js) : un calculateur pur, nourri par la vue serveur (modules/temps/moteur.js).
   Sens horaire, minuit en haut, passage de minuit, moments simultanés, débordement, arc nul et tour complet, fenêtre (le futur zoom),
   noms accessibles, aucun vocabulaire de domaine, et le cercle de chaque participation = exactement sa vue. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const K = require('../modules/temps/cercle.js'), T = require('../modules/temps/moteur.js'), P = require('../synchroview/permissions.js');
const D = require('../modules/temps/demo-camille-gabriel.json');
const IDS = { camille: 'uCamille01', gabriel: 'uGabriel01', lea: 'uLea000001', alex: 'uAlex00001', sarah: 'uSarah0001', emma: 'uEmma00001' };
function programme() { const membres = {}; D.personnes.forEach(p => { membres[IDS[p.cle]] = p.role; });
  return { rev: 1, revImport: 1, moments: T.importer(D, IDS).map(m => Object.assign(m, { majRev: 1 })), membres, confirmations: {} }; }
const S = (p, k) => ({ id: IDS[k], role: p.membres[IDS[k]] });
const mo = (id, dm, fm, x) => Object.assign({ id, titre: id, dm, fm, debut: K.hm(dm), fin: K.hm(fm), prevu: K.hm(dm), decalage: 0 }, x || {});

test('cercle : minuit en haut, sens horaire, 06:00 à droite, 12:00 en bas, 18:00 à gauche', () => {
  assert.deepEqual([0, 360, 720, 1080].map(m => K.angle(m)), [0, 90, 180, 270]);
  const p = m => K.polarXY(500, 500, 100, K.angle(m)), r = v => Math.round(v);
  assert.deepEqual([r(p(0).x), r(p(0).y)], [500, 400], 'minuit en haut');
  assert.deepEqual([r(p(360).x), r(p(360).y)], [600, 500], '06:00 à droite : le sens est horaire');
  assert.deepEqual([r(p(720).x), r(p(720).y)], [500, 600]); assert.deepEqual([r(p(1080).x), r(p(1080).y)], [400, 500]);
  assert.equal(K.angle(1500), K.angle(60), 'après minuit (minute 1500 du jour J) = 01:00 du cadran');
});

test('cercle : passage de minuit, arc nul, tour complet', () => {
  const e = K.etendue(1320, 1530); assert.equal(e.a0, 330); assert.equal(e.a1, 382.5, 'le bal passe le sommet sans se couper');
  assert.match(K.arcPathAt(500, 500, 100, e.a0, e.a1), / 0 1 /, 'arc court, sens horaire');
  assert.match(K.arcPathAt(500, 500, 100, 10, 250), / 1 1 /, 'grand arc au-delà de 180°');
  const nul = K.arcPathAt(500, 500, 100, 90, 90); assert.ok(/A100 100/.test(nul) && !/NaN/.test(nul), 'un moment sans durée reste visible');
  const tour = K.arcPathAt(500, 500, 100, 0, 360); assert.equal((tour.match(/A/g) || []).length, 2, 'un tour complet = deux demi-arcs');
  const m = K.modele({ moments: [mo('nuit', 1320, 1530)], propositions: [] });
  assert.equal(m.arcs[0].lendemain, true); assert.match(m.arcs[0].nom, /finit le lendemain/);
});

test('cercle : moments simultanés en couloirs ; au-delà du maximum, un débordement nommé', () => {
  const M = [mo('a', 600, 720), mo('b', 630, 700), mo('c', 640, 650), mo('d', 645, 655), mo('e', 720, 780)];
  const c = K.couloirs(M, 3);
  assert.deepEqual(c.place, { a: 0, b: 1, c: 2, e: 0 }); assert.deepEqual(c.deborde, ['d']); assert.equal(c.n, 3);
  const m = K.modele({ moments: M, propositions: [] }, { couloirs: 3 });
  assert.equal(m.arcs.length, 4); assert.equal(m.debordements.length, 1); assert.equal(m.debordements[0].id, 'd');
  assert.ok(m.arcs.find(x => x.id === 'b').rayon < m.arcs.find(x => x.id === 'a').rayon, 'le deuxième couloir est à l\'intérieur');
  assert.deepEqual(K.couloirs([mo('x', 600, 660), mo('y', 660, 700)], 3).place, { x: 0, y: 0 }, 'bout à bout : même couloir');
  assert.deepEqual(m.ordre, ['a', 'b', 'c', 'e'], 'le clavier parcourt les moments dans l\'ordre des heures');
});

test('cercle : une fenêtre de temps (le futur zoom) sans rien changer d\'autre', () => {
  const f = K.fenetre({ debut: 900, fin: 1620 });   /* 15:00 → 03:00 */
  assert.equal(K.angle(900, f), 0); assert.equal(K.angle(1260, f), 180); assert.equal(K.angle(1620, f), 360);
  assert.equal(K.angle(600, f), null, 'hors fenêtre : non dessiné');
  const m = K.modele({ moments: [mo('dans', 1000, 1100), mo('hors', 300, 400)], propositions: [] }, { fenetre: { debut: 900, fin: 1620 } });
  assert.deepEqual(m.arcs.map(a => a.id), ['dans']);
  assert.throws(() => K.fenetre({ debut: 0, fin: 2000 }), /24 h/); assert.throws(() => K.fenetre({ debut: 10, fin: 10 }), /vide/);
  assert.equal(K.modele({ moments: [], propositions: [] }).graduations.length, 24);
});

test('cercle : chaque participation voit exactement les moments de sa vue, et les mêmes états', () => {
  const p = programme();
  const d = T.decider(p, S(p, 'lea'), { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }, P);
  p.rev++; d.effets.forEach(f => Object.assign(p.moments.find(x => x.id === f.id), { decalage: f.apres.decalage, majRev: p.rev }));
  for (const k of Object.keys(IDS)) {
    const v = T.vue(p, S(p, k), P), m = K.modele(v, { couloirs: 4 });
    assert.deepEqual(m.arcs.map(a => a.id).concat(m.debordements.map(x => x.id)).sort(), v.moments.map(x => x.id).sort(), k + ' : le cercle = la vue, ni plus ni moins');
  }
  const lea = K.modele(T.vue(p, S(p, 'lea'), P)), c = lea.arcs.find(a => a.id === 'cocktail');
  assert.ok(c.etat.includes('decale') && c.dPrevu, 'décalé : l\'horaire prévu est dessiné à part');
  assert.match(c.nom, /Cocktail, 16:15 à 18:45 ; décalé de 15 min, prévu 16:00/);
  assert.equal(lea.zones.length, 1); assert.equal(lea.zones[0].moment, 'diner'); assert.ok(lea.arcs.find(a => a.id === 'diner').etat.includes('propose'));
  assert.match(lea.arcs.find(a => a.id === 'diner').nom, /proposition : « Dîner » commence/);
  const emma = K.modele(T.vue(p, S(p, 'emma'), P));
  assert.equal(emma.zones.length, 0, 'aucune proposition chez qui ne peut pas décider');
  assert.ok(!JSON.stringify(emma).includes('Point coordination') && !JSON.stringify(emma).includes('Installation'), 'rien d\'invisible dans le modèle');
  assert.ok(K.modele(T.vue(p, S(p, 'sarah'), P)).arcs.find(a => a.id === 'cocktail').etat.includes('a-confirmer'));
  const alex = K.modele(T.vue(p, S(p, 'alex'), P));
  assert.deepEqual(alex.arcs.filter(a => a.etat.includes('moi')).map(a => a.id).sort(), ['bal', 'set-cocktail'], 'un prestataire repère ses moments');
  assert.match(alex.arcs.find(a => a.id === 'bal').nom, /vous portez ce moment/);
  assert.equal(K.modele(T.vue(p, S(p, 'emma'), P)).arcs.some(a => a.dMoi), false);
});

test('cercle et présentation : aucun vocabulaire ni règle de domaine codés en dur', () => {
  for (const f of ['modules/temps/cercle.js', 'modules/temps/vue.js', 'modules/temps/moteur.js']) {
    const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');   /* le code, pas ses commentaires */
    assert.equal(t.match(/(^|[^\p{L}])(mariage|mari[ée]e?s?|cocktail|d[îi]ner|invit[ée]e?s?|témoins?|traiteur|séminaire|formation)(?![\p{L}])/giu), null, f);
  }
  const a = JSON.stringify(K.modele({ moments: [mo('x', 600, 660)], propositions: [] })), b = JSON.stringify(K.modele({ moments: [mo('x', 600, 660)], propositions: [] }));
  assert.equal(a, b, 'déterministe');
});
