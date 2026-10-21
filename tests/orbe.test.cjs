const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('../orbe/systeme.js');

test('système : chaque type déclare des actions et une forme qui existent', () => {
  for (const T of S.TYPES) {
    assert.ok(T.actions.length, T.id);
    for (const a of T.actions) assert.ok(S.ACTIONS[a], T.id + ' → ' + a);
    assert.ok(S.FORMES[T.forme], T.id + ' forme');
    assert.ok(T.actions.includes('remarque'), T.id + ' : toute chose peut recevoir une remarque');
  }
  for (const k in S.ACTIONS) assert.ok(['operationnelle', 'prevue'].includes(S.ACTIONS[k].etat));
});

test('raisonner : des règles, toujours dites ; la nouveauté après l\'habitude ; un refus répété fait taire', () => {
  const T = S.parType('titre'); let m = S.memoireVide();
  const s0 = S.suggerer(m, T); assert.ok(s0 && s0.regle);
  S.noter(m, 'titre', 'copier'); S.noter(m, 'titre', 'copier');
  const s1 = S.suggerer(m, T); assert.notEqual(s1.action, 'copier'); assert.match(s1.regle, /jamais essayé/);
  m = S.memoireVide(); S.noter(m, 'texte', 'modifier');
  assert.equal(S.suggerer(m, T).action, 'relier', 'après une modification, relier');
  m = S.memoireVide(); m.refus['titre:modifier'] = 2;
  assert.notEqual(S.suggerer(m, T).action, 'modifier');
  for (const T2 of S.TYPES) { const s = S.suggerer(S.memoireVide(), T2); if (s) assert.equal(S.ACTIONS[s.action].etat, 'operationnelle', 'jamais une action prévue'); }
});

test('envie : le type le moins exploré, puis le plus proche', () => {
  const m = S.memoireVide(); m.vus.titre = 5; m.vus.image = 0;
  const c = [{ type: 'titre', distance: 100 }, { type: 'image', distance: 600 }, { type: 'image', distance: 300 }];
  assert.deepEqual(S.envie(m, c), { type: 'image', distance: 300 });
  assert.equal(S.envie(m, []), null);
});

test('hésitation : trois secondes de va-et-vient sans clic ; pas pendant un clic, une saisie ou un arrêt', () => {
  const zig = []; for (let i = 0; i <= 40; i++) zig.push({ t: i * 80, x: (i % 2 ? 400 : 100) + i, y: 300 + (i % 3) * 40 });
  assert.equal(S.hesite(zig, {}), true);
  assert.equal(S.hesite(zig, { clics: 1 }), false);
  assert.equal(S.hesite(zig, { saisie: true }), false);
  assert.equal(S.hesite(zig, { arret: 1200 }), false);
  const droit = []; for (let i = 0; i <= 40; i++) droit.push({ t: i * 80, x: i * 25, y: 300 });
  assert.equal(S.hesite(droit, {}), false, 'un trajet droit n\'est pas une hésitation');
  const court = zig.filter(p => p.t < 1500); assert.equal(S.hesite(court, {}), false, 'moins de trois secondes');
});

test('concept : composé des choix, déterministe, honnête', () => {
  const r = { pour: 'Un couple', intention: 'Relier', matiere: 'Un lieu', forme: 'Une carte' };
  assert.deepEqual(S.concept(r, 0), S.concept(r, 0));
  assert.notEqual(S.concept(r, 0).nom, S.concept(r, 1).nom);
  const c = S.concept(r, 0);
  assert.match(c.pitch, /un lieu/); assert.match(c.orbe.join(' '), /une carte/);
  assert.match(c.honnete, /pas une IA/);
  assert.equal(S.QUESTIONS.length, 4);
});

test('accessibilité : le contraste est calculé (WCAG)', () => {
  assert.equal(S.contraste({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }).toFixed(1), '21.0');
  assert.ok(S.contraste(S.rgb('rgb(85, 85, 95)'), S.rgb('rgb(23, 23, 28)')) < 4.5, 'le texte gris du terrain échoue, comme prévu');
});
