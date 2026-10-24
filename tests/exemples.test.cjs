/* La page Exemples (demande de Matt, 24/10) : la mosaïque d'abord, des surtitres sans noms de produits, les mêmes pages d'exemple. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const EX = () => { const s = lire('exemples/index.html'), b = s.slice(s.indexOf('var EX=['), s.indexOf('];', s.indexOf('var EX=[')) + 2); return Function(b.replace('var EX=', 'return '))(); };
const PRODUITS = /AIME (Stitch|Magazine|Régie|Studio)|G44 LAB/;
test('exemples : « Mariage · Chacun son écran » (la mosaïque) en première carte ; neuf exemples, les mêmes adresses', () => {
  const L = EX(); assert.equal(L.length, 9); assert.deepEqual([L[0].u, L[0].genre, L[0].titre, L[0].href], ['mosaique', 'Mariage', 'Chacun son écran', '/exemples/mosaique/']);
  assert.deepEqual(L.map(e => e.href).sort(), ['/', '/exemples/?u=g44', '/exemples/?u=magazine', '/exemples/?u=regie', '/exemples/?u=seminaire', '/exemples/?u=stitch', '/exemples/?u=studio', '/exemples/?u=world', '/exemples/mosaique/'].sort());
});
test('exemples : les surtitres ne portent plus de noms de produits (cartes et scénarios)', () => {
  const L = EX(); for (const e of L) assert.ok(!PRODUITS.test(e.genre), e.genre);
  assert.deepEqual(Object.fromEntries(L.filter(e => ['stitch', 'magazine', 'regie', 'studio', 'g44'].includes(e.u)).map(e => [e.u, e.genre])), { stitch: 'Création · broderie', magazine: 'Édition', regie: 'Site et gestion', studio: 'Supports imprimés', g44: 'Administration' });
  for (const u of ['stitch', 'magazine', 'regie', 'studio', 'g44']) assert.ok(!PRODUITS.test(JSON.parse(lire('vitrine/scenarios/' + u + '.json')).genre), u);
});
test('exemples : plus de liste « Les exemples » sous les cartes ; une grille sans case vide', () => {
  const s = lire('exemples/index.html');
  assert.match(s, /if\(!ex\)\{var pied=\$\('exAutres'\)\.closest\('\.col'\);pied\.remove\(\)\}/);
  assert.match(s, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/); assert.match(s, /li:last-child:nth-child\(odd\)\{grid-column:1\/-1\}/);
});
