/* Le noyau radial commun (modules/radial/noyau.js, modules/radial/interactions.js) : géométrie, toucher, clavier, position ;
   deux géométries déclarées et distinctes ; et l'INDÉPENDANCE : ni métier, ni ressource, ni permission, ni réseau, ni stockage. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const N = require('../modules/radial/noyau.js'), K = require('../modules/temps/cercle.js');
const code = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('noyau : deux géométries déclarées, distinctes, jamais devinées', () => {
  assert.deepEqual(Object.keys(N.GEOMETRIES).sort(), ['collection', 'temporelle']);
  assert.equal(N.GEOMETRIES.temporelle.angle, 'heure'); assert.equal(N.GEOMETRIES.collection.angle, 'rang');
  assert.notEqual(N.GEOMETRIES.temporelle.segments, N.GEOMETRIES.collection.segments, 'durée d\'un côté, segments égaux de l\'autre');
  assert.equal(N.geometrie('temporelle'), 'temporelle'); assert.throws(() => N.geometrie('spirale'), /inconnue/); assert.throws(() => N.geometrie('toString'), /inconnue/);
  assert.equal(K.GEOMETRIE, 'temporelle', 'le cercle de Temps déclare la géométrie temporelle');
});

test('noyau : le cercle de Temps reprend la géométrie commune, sans copie', () => {
  for (const f of ['polarXY', 'arcPathAt', 'normDeg']) assert.equal(K[f], N[f], f + ' : la même fonction');
  const t = code('modules/temps/cercle.js'); assert.equal(/Math\.atan2|Math\.cos|Math\.sin/.test(t), false, 'aucune trigonométrie recopiée dans le cercle de Temps');
});

test('noyau : polaire, arcs, tour complet, arc nul (0° en haut, sens horaire)', () => {
  const r = v => Math.round(v), p = a => { const q = N.polarXY(500, 500, 100, a); return [r(q.x), r(q.y)]; };
  assert.deepEqual([p(0), p(90), p(180), p(270)], [[500, 400], [600, 500], [500, 600], [400, 500]]);
  assert.equal((N.arcPathAt(500, 500, 100, 0, 360).match(/A/g) || []).length, 2);
  assert.ok(!/NaN/.test(N.arcPathAt(500, 500, 100, 90, 90)));
  assert.equal(N.normDeg(-30), 330); assert.equal(N.normDeg(725), 5);
});

test('noyau : toucher un segment quelconque (pas seulement un moment), au plus près, dans la tolérance', () => {
  /* cinq segments égaux d'une collection : 72° chacun, avec un petit écart */
  const M = { centre: 500, epaisseur: 40, arcs: [0, 1, 2, 3, 4].map(i => ({ id: 's' + i, a0: i * 72 + 2, a1: (i + 1) * 72 - 2, rayon: 300 })) };
  for (let i = 0; i < 5; i++) { const q = N.polarXY(500, 500, 300, i * 72 + 36); assert.equal(N.toucher(M, q.x, q.y, 30), 's' + i); }
  const ecart = N.polarXY(500, 500, 300, 72); assert.ok(['s0', 's1'].includes(N.toucher(M, ecart.x, ecart.y, 30)), 'dans l\'écart entre deux segments : le plus proche');
  assert.equal(N.toucher(M, 500, 500, 30), null, 'le centre ne choisit rien');
  const loin = N.polarXY(500, 500, 420, 100); assert.equal(N.toucher(M, loin.x, loin.y, 30), null, 'loin de tout : rien');
  const court = { centre: 500, epaisseur: 40, arcs: [{ id: 'x', a0: 10, a1: 10.1, rayon: 300 }] }, q = N.polarXY(500, 500, 300, 11.5);
  assert.equal(N.toucher(court, q.x, q.y, 1), 'x', 'un segment très court compte pour 2° par défaut'); assert.equal(N.toucher(court, q.x, q.y, 1, { minSpan: 0 }), null);
});

test('noyau : clavier en focus itinérant et position dite', () => {
  const o = ['a', 'b', 'c'];
  assert.equal(N.suivant(o, 'a', 'ArrowRight'), 'b'); assert.equal(N.suivant(o, 'a', 'ArrowDown'), 'b');
  assert.equal(N.suivant(o, 'c', 'ArrowRight'), 'a', 'boucle'); assert.equal(N.suivant(o, 'a', 'ArrowLeft'), 'c'); assert.equal(N.suivant(o, 'b', 'ArrowUp'), 'a');
  assert.equal(N.suivant(o, 'b', 'Home'), 'a'); assert.equal(N.suivant(o, 'a', 'End'), 'c'); assert.equal(N.suivant(o, 'a', 'Tab'), null); assert.equal(N.suivant([], 'a', 'ArrowRight'), null);
  assert.equal(N.intention('Enter'), 'ouvrir'); assert.equal(N.intention(' '), 'ouvrir'); assert.equal(N.intention('Escape'), 'fermer'); assert.equal(N.intention('a'), null);
  assert.equal(N.position(2, 12), '3 sur 12');
});

test('noyau : indépendant des métiers, des ressources, des permissions, du réseau et du stockage', () => {
  for (const f of ['modules/radial/noyau.js', 'modules/radial/interactions.js']) {
    const t = code(f);
    assert.equal(t.match(/(^|[^\p{L}])(mariage|mari[ée]e?s?|cocktail|d[îi]ner|invit[ée]e?s?|témoins?|traiteur|séminaire|formation|moments?|programme|temps|personnes?|membres?|documents?|projets?|espaces?)(?![\p{L}])/giu), null, f + ' : aucun vocabulaire de métier ni de ressource');
    assert.equal(/permission|\.can\(|peut[A-Z]|role|owner|editor|guest|manage_members|grants?/i.test(t), false, f + ' : aucune notion de droit');
    assert.equal(/fetch\(|XMLHttpRequest|\/api\/|localStorage|sessionStorage|indexedDB|document\.cookie/.test(t), false, f + ' : ni réseau ni stockage');
  }
  assert.equal(/document\.|window\./.test(code('modules/radial/noyau.js')), false, 'le noyau est un calculateur pur, sans DOM');
  assert.equal(/createElement|innerHTML|textContent/.test(code('modules/radial/interactions.js')), false, 'les interactions ne dessinent rien');
});
