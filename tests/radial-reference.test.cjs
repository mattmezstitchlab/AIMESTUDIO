/* Non-régression de l'extraction du noyau radial (PR A) : le cercle de Temps doit produire EXACTEMENT le même modèle qu'avant.
   La référence (tests/references/temps-cercle-modele.json) a été figée sur la tête de la PR #131 (079a00d), AVANT l'extraction :
   six participations, trois états du programme (importé, cocktail décalé, proposition et confirmation), deux tailles de cadran
   (ordinateur, iPhone), et une fenêtre de zoom. Régénérer : REFERENCE=ecrire node --test tests/radial-reference.test.cjs
   (seulement sur un commit dont le cadran a été validé). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const K = require('../modules/temps/cercle.js'), T = require('../modules/temps/moteur.js'), P = require('../synchroview/permissions.js');
const D = require('../modules/temps/demo-camille-gabriel.json');
const IDS = { camille: 'uCamille01', gabriel: 'uGabriel01', lea: 'uLea000001', alex: 'uAlex00001', sarah: 'uSarah0001', emma: 'uEmma00001' };
const FICHIER = path.join(__dirname, 'references', 'temps-cercle-modele.json');
function programme() { const membres = {}; D.personnes.forEach(p => { membres[IDS[p.cle]] = p.role; });
  return { rev: 1, revImport: 1, moments: T.importer(D, IDS).map(m => Object.assign(m, { majRev: 1 })), membres, confirmations: {} }; }
const S = (p, k) => ({ id: IDS[k], role: p.membres[IDS[k]] });
function appliquer(p, k, g) { const d = T.decider(p, S(p, k), g, P); assert.ok(d.ok !== false && d.effets, 'geste ' + g.action + ' refusé'); p.rev++;
  d.effets.forEach(f => { const m = p.moments.find(x => x.id === f.id); if (m && f.apres) Object.assign(m, f.apres, { majRev: p.rev }); }); }
const TAILLES = { ordinateur: { couloirs: 4 }, iphone: { couloirs: 3, epaisseur: 60, rayon: 366, ecart: 8 }, zoom: { couloirs: 4, fenetre: { debut: 900, fin: 1620 } } };
function calculer() { const p = programme(), sortie = {};
  const photo = etat => { for (const k of Object.keys(IDS)) { const v = T.vue(p, S(p, k), P); for (const [t, o] of Object.entries(TAILLES)) sortie[etat + '/' + k + '/' + t] = K.modele(v, o); } };
  photo('importe');
  appliquer(p, 'lea', { action: 'retarder', p: { moment: 'cocktail', minutes: 15 } }); photo('cocktail-decale');
  appliquer(p, 'lea', { action: 'retarder', p: { moment: 'bal', minutes: 5, cascade: true } }); photo('bal-decale');
  return JSON.parse(JSON.stringify(sortie)); }

test('le cercle de Temps : modèle identique à la référence figée avant l\'extraction du noyau', () => {
  const maintenant = calculer();
  if (process.env.REFERENCE === 'ecrire') { fs.writeFileSync(FICHIER, JSON.stringify(maintenant, null, 1) + '\n'); return; }
  const ref = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  assert.deepEqual(Object.keys(maintenant).sort(), Object.keys(ref).sort(), 'les mêmes cas');
  for (const k of Object.keys(ref)) assert.deepEqual(maintenant[k], ref[k], k);
  assert.equal(Object.keys(ref).length, 3 * 6 * 3, '54 cadrans comparés');
});

test('le cercle de Temps : la géométrie exposée par AIMECercle répond comme avant', () => {
  const g = geometrie(); if (process.env.REFERENCE === 'ecrire') return;
  assert.deepEqual(g, JSON.parse(fs.readFileSync(path.join(__dirname, 'references', 'temps-cercle-geometrie.json'), 'utf8')));
});
function geometrie() { const out = {};
  for (const a of [0, 1, 45, 90, 179.9, 180, 181, 270, 359, 360, 382.5, -30]) out['polar/' + a] = K.polarXY(500, 500, 370, a);
  for (const [a0, a1] of [[0, 0], [10, 10.2], [10, 250], [330, 382.5], [0, 360], [90, 449.995], [12, 191]]) out['arc/' + a0 + '-' + a1] = K.arcPathAt(500, 500, 300, a0, a1);
  for (const a of [-720, -1, 0, 359.5, 360, 721]) out['norm/' + a] = K.normDeg(a);
  const M = K.modele({ moments: [{ id: 'a', titre: 'a', dm: 600, fm: 720, debut: '10:00', fin: '12:00', prevu: '10:00', decalage: 0 }, { id: 'b', titre: 'b', dm: 640, fm: 645, debut: '10:40', fin: '10:45', prevu: '10:40', decalage: 0 }], propositions: [] });
  for (let r = 200; r <= 460; r += 20) for (let a = 140; a <= 190; a += 5) { const p = K.polarXY(500, 500, r, a); out['toucher/' + r + '/' + a] = K.toucher(M, p.x, p.y, 40); }
  out.toucherCentre = K.toucher(M, 500, 500, 40);
  if (process.env.REFERENCE === 'ecrire') fs.writeFileSync(path.join(__dirname, 'references', 'temps-cercle-geometrie.json'), JSON.stringify(out, null, 1) + '\n');
  return JSON.parse(JSON.stringify(out)); }
