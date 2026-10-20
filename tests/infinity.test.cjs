// AIME INFINITY : cascades déterministes, grilles résolubles, budget et progression justes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const R = require('../infinity/js/regles.js');
const NV = require('../infinity/js/niveaux.js');
const P = require('../infinity/js/partie.js');

test('2 × 2 : une action, les quatre cases explosent', () => {
  const g = NV.niveau(1); assert.equal(g.n, 2); assert.equal(g.budget, 1);
  for (let i = 0; i < 4; i++) { const G = new P.Grille(g); const r = G.toucher(i); assert.equal(r.ordre.length, 4); assert.equal(G.statut(), 'gagne'); }
});

test('même graine, même grille ; même suite de cases, même partie', () => {
  for (let L = 1; L <= 6; L++) { const a = NV.niveau(L), b = NV.niveau(L); assert.deepEqual([...a.cases], [...b.cases]); assert.equal(a.optimum, b.optimum); }
  const g = NV.niveau(4), coups = [5, 77, 140, 201];
  const A = P.rejouer(g, coups), B = P.rejouer(g, coups);
  assert.deepEqual([...A.vivant], [...B.vivant]); assert.equal(A.eliminees, B.eliminees);
  const v = new Uint8Array(g.n * g.n).fill(1), c1 = R.cascade(g.n, g.cases, v, 37), c2 = R.cascade(g.n, g.cases, v, 37);
  assert.deepEqual(c1.ordre, c2.ordre); assert.deepEqual(c1.t, c2.t);
  assert.notDeepEqual([...NV.niveau(5, 'aime').cases], [...NV.niveau(5, 'autre').cases]);
});

test('chaque grille de 2 × 2 à 128 × 128 est résoluble dans son budget, et l\'optimum est exact', () => {
  for (let L = 1; L <= NV.MAX; L++) {
    const g = NV.niveau(L), G = P.rejouer(g, g.solution);
    assert.equal(G.restant, 0, 'niveau ' + L + ' : la solution optimale vide la grille');
    assert.equal(G.actions, g.optimum); assert.ok(g.budget >= g.optimum, 'budget ≥ optimum');
    // minimalité : sans l'une des sources, une case au moins ne peut plus exploser
    if (L <= 5) for (let s = 0; s < g.solution.length; s++) { const H = P.rejouer(g, g.solution.filter((_, i) => i !== s)); assert.ok(H.restant > 0, 'niveau ' + L + ' : source ' + s + ' nécessaire'); }
  }
});

test('la difficulté grandit avec la grille, sans hasard ni vitesse', () => {
  const o = []; for (let L = 1; L <= 6; L++) o.push(NV.niveau(L).optimum);
  for (let i = 1; i < o.length; i++) assert.ok(o[i] >= o[i - 1], o.join(','));
  const g = NV.niveau(5); assert.ok(g.budget - g.optimum <= 2, 'marge serrée à 32 × 32');
});

test('la cascade suit la géométrie : une onde de portée p atteint exactement le carré autour d\'elle', () => {
  const n = 7, k = new Int8Array(n * n).fill(0); k[3 * n + 3] = 2;
  const r = R.cascade(n, k, new Uint8Array(n * n).fill(1), 3 * n + 3);
  assert.equal(r.ordre.length, 25);
  for (const i of r.ordre) assert.ok(Math.max(Math.abs(i % n - 3), Math.abs(((i / n) | 0) - 3)) <= 2);
  const kb = new Int8Array(n * n).fill(0); kb[2 * n + 4] = R.RAYON_H;
  assert.equal(R.cascade(n, kb, new Uint8Array(n * n).fill(1), 2 * n + 4).ordre.length, n);
  // une case déjà partie n'est ni rejouable ni comptée
  const g = NV.niveau(3), G = new P.Grille(g); const a = G.toucher(g.solution[0]); assert.ok(a); assert.equal(G.toucher(g.solution[0]), null); assert.equal(G.actions, 1);
});

test('échec, reprise et progression : on ne perd jamais un niveau validé', () => {
  const C = new P.Campagne({});
  C.grille.toucher(0); assert.equal(C.valider().n, 2); assert.equal(C.L, 2);
  // échouer au niveau 2 : épuiser le budget sans vider la grille
  const g = C.g; let G = C.grille, i = 0; while (G.statut() === 'en-cours') { const viv = [...G.vivant].map((v, j) => v ? j : -1).filter(j => j >= 0); const pire = viv.sort((a, b) => R.cascade(g.n, g.cases, G.vivant, a).ordre.length - R.cascade(g.n, g.cases, G.vivant, b).ordre.length)[0]; G.toucher(pire); if (++i > 20) break; }
  if (G.statut() === 'perdu') { assert.equal(C.valider(), null); C.reprendre(); assert.equal(C.L, 2); assert.equal(C.grille.actions, 0); }
  const G2 = C.grille; C.g.solution.forEach(j => G2.toucher(j)); const b = C.valider();
  assert.equal(b.parfait, true); assert.equal(C.L, 3); assert.equal(C.actions, 1 + b.actions, 'seules les grilles réussies comptent'); assert.deepEqual(C.record, { L: 2, actions: C.actions });
});

test('défi du jour : la même grille pour tous à la même date, cinq actions', () => {
  const a = NV.defi('2026-10-21'), b = NV.defi('2026-10-21'), c = NV.defi('2026-10-22');
  assert.deepEqual([...a.cases], [...b.cases]); assert.notDeepEqual([...a.cases], [...c.cases]);
  assert.equal(a.budget, 5); assert.ok(a.optimum > 5, 'impossible à vider en cinq : le défi est de faire le plus grand nombre');
  const G = P.rejouer(a, a.solution.slice(0, 5)), s = P.scoreDefi(G);
  assert.equal(s.actions, 5); assert.ok(s.eliminees > 0 && s.eliminees < 256); assert.equal(s.score, s.eliminees * 10 + s.plusGrande);
});

test('performances : générer et mesurer 128 × 128 reste rapide ; jamais un élément par case', () => {
  const t = Date.now(); const g = NV.niveau(7); assert.ok(Date.now() - t < 4000, 'génération 128 × 128 en ' + (Date.now() - t) + ' ms');
  const v = new Uint8Array(g.n * g.n).fill(1); const t2 = Date.now(); R.cascade(g.n, g.cases, v, g.solution[0]); assert.ok(Date.now() - t2 < 1500);
  const html = fs.readFileSync(path.join(__dirname, '../infinity/index.html'), 'utf8'), js = fs.readFileSync(path.join(__dirname, '../infinity/js/rendu.js'), 'utf8');
  assert.equal((html.match(/<canvas/g) || []).length, 1); assert.ok(!/createElement\(['"](div|button|span)/.test(js));
});

test('le jeu est isolé : il ne charge ni SynchroView, ni les permissions, ni le Studio', () => {
  const dir = path.join(__dirname, '../infinity'); const all = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(f => { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else all.push(fs.readFileSync(p, 'utf8')); });
  walk(dir); const src = all.join('\n');
  assert.ok(!/synchroview|permissions\.js|\/studio\/|vitrine/.test(src));
});
