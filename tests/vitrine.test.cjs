// Vitrine : trois règles fondamentales, vérifiées sur le rendu réel.
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../vitrine/rendu.js');
const P = require('../synchroview/permissions.js');
const contenu = require('../vitrine/donnees/mariage.json');
const acces = require('../vitrine/acces/mariage.json');
const persp = require('../vitrine/perspectives/mariage.json');
const editorial = require('../vitrine/modeles/editorial.json');
const cartes = require('../synchroview/profiles.js');
const angle = id => persp.angles.find(a => a.id === id);
const rendu = (id, modele) => V.rendre({ contenu, acces, perspective: angle(id), modele: modele || editorial, regles: P });
// Un modèle volontairement différent : autre héro, pas de numéros, autres variantes — pour prouver que les droits ne dépendent pas du modèle.
const autre = { id: 'test', nom: 'Test', polices: {}, composition: { hero: 'pleine-page', numeros: false, variantes: {} } };
const visibles = html => ({
  docs: [...html.matchAll(/<b>([^<]*)<\/b>/g)].map(m => m[1]).filter(t => contenu.documents.some(d => d.titre.replace(/'/g, '&#39;') === t)).sort(),
  actions: [...html.matchAll(/<button[^>]*data-demo[^>]*>([^<]*)<\/button>/g)].map(m => m[1]).sort(),
  moments: contenu.moments.filter(m => html.includes('>' + m.titre.replace(/'/g, '&#39;') + '<')).map(m => m.id).sort()
});

test('règle 1 · une carte d\'usage n\'est pas une perspective', () => {
  const idsCartes = cartes.map(c => c.id), idsAngles = persp.angles.map(a => a.id);
  assert.deepEqual(idsCartes.filter(i => idsAngles.includes(i)), []);
});
test('règle 1 · une perspective n\'est pas un rôle technique : elle ne déclare aucun rôle, le rôle vient de la couche d\'accès', () => {
  for (const a of persp.angles) {
    assert.ok(!('role' in a) && !('roles' in a), a.id);
    assert.ok(acces.membres[a.regard], 'le regard pointe un membre de l\'espace');
  }
});
test('règle 2 · les perspectives ne recopient aucune donnée métier', () => {
  const metier = new Set(), angles = new Set();
  const walk = (o, set, skip) => { if (typeof o === 'string') set.add(o); else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { if (!skip.includes(k)) walk(v, set, skip); }); };
  walk(contenu, metier, ['_', 'id', 'subjectId', 'assigneeId', 'payeeId', 'payer', 'univers', 'source', 'groupe']);
  walk(persp.angles, angles, ['id', 'regard', 'type', 'filtre', 'groupes', 'action', 'ref', 'role']);
  assert.deepEqual([...angles].filter(v => metier.has(v)), []);
});
test('règle 2 · un seul fichier de contenu pour les quatre perspectives', () => {
  for (const a of persp.angles) assert.match(rendu(a.id).html, /Léa &amp; Marc/);
});
test('les quatre perspectives sont réellement différentes', () => {
  const sections = persp.angles.map(a => [...rendu(a.id).html.matchAll(/data-sv="sec-([a-z]+)"/g)].map(m => m[1]).join(','));
  assert.equal(new Set(sections).size, 4);
});
test('règle 3 · les droits ne dépendent pas du modèle graphique', () => {
  for (const a of persp.angles) assert.deepEqual(visibles(rendu(a.id).html), visibles(rendu(a.id, autre).html), a.id);
});
test('règle 3 · un invité ne voit ni les moments réservés, ni les documents des autres, ni les données d\'un autre invité', () => {
  const h = rendu('invite').html;
  for (const m of contenu.moments.filter(m => !m.public)) assert.ok(!h.includes(m.titre), m.titre);
  assert.ok(!h.includes('Contrat · Studio Lumen'));
  assert.ok(!h.includes('07 45'), 'téléphone de Nina');
  assert.ok(!h.includes('Livraisons par l'), 'notes d\'équipe');
});
test('règle 3 · le prestataire ne voit pas le plan de table, le coordinateur ne peut pas payer', () => {
  assert.ok(!rendu('prestataire').html.includes('Plan de table'));
  assert.ok(!visibles(rendu('coordinateur').html).actions.some(t => /acompte/i.test(t)));
});
test('règle 3 · les réponses nominatives ne sortent que pour l\'organisation', () => {
  assert.match(rendu('couple').html, /Sans gluten/);
  assert.match(rendu('coordinateur').html, /Sans gluten/);
  assert.ok(!rendu('prestataire').html.includes('Sans gluten'));
});
test('visuels : création générative créditée, remplaçable par une photographie', () => {
  assert.equal(contenu.evenement.visuels.hero.source, 'generatif');
  assert.ok(contenu.evenement.visuels.hero.credit);
  const c2 = JSON.parse(JSON.stringify(contenu)); c2.evenement.visuels.hero.photo = '/photos/domaine.jpg';
  const h = V.rendre({ contenu: c2, acces, perspective: angle('invite'), modele: editorial, regles: P }).html;
  assert.match(h, /<img src="\/photos\/domaine\.jpg"/);
});
test('polices hébergées avec leur licence', () => {
  const fs = require('fs');
  for (const f of ['Fraunces-latin-wght.woff2', 'PlayfairDisplay-latin-wght.woff2', 'OFL-Fraunces.txt', 'OFL-PlayfairDisplay.txt']) assert.ok(fs.existsSync(__dirname + '/../fonts/' + f), f);
  assert.match(fs.readFileSync(__dirname + '/../fonts/OFL-Fraunces.txt', 'utf8'), /SIL Open Font License, Version 1\.1/);
});
