// Maison Orée : le même moteur, sans code propre à l'entreprise.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const V = require('../vitrine/rendu.js');
const P = require('../synchroview/permissions.js');
const editorial = require('../vitrine/modeles/editorial.json');
const charge = u => ({ contenu: JSON.parse(fs.readFileSync(path.join(ROOT, 'vitrine/donnees', u + '.json'))), acces: require('../vitrine/acces/' + u + '.json'), persp: require('../vitrine/perspectives/' + u + '.json') });
const S = charge('seminaire');
const rendu = (id, contenu, modele) => V.rendre({ contenu: contenu || S.contenu, acces: S.acces, perspective: S.persp.angles.find(a => a.id === id), libelles: S.persp.libelles, modele: modele || editorial, regles: P }).html;
const ANGLES = S.persp.angles.map(a => a.id);

test('six perspectives distinctes depuis une seule donnée', () => {
  assert.deepEqual(ANGLES, ['organisateur', 'intervenant', 'participant', 'logistique', 'prestataire', 'observateur']);
  const sec = ANGLES.map(a => [...rendu(a).matchAll(/data-sv="sec-([a-z-]+)"/g)].map(m => m[1]).join(','));
  assert.equal(new Set(sec).size, 6);
});

test('propagation : un horaire, un lieu et un intervenant modifiés une fois se retrouvent partout où ils doivent apparaître', () => {
  const c = JSON.parse(JSON.stringify(S.contenu));
  c.moments.find(m => m.id === 'keynote').debut = '10:05';
  c.evenement.lieu.nom = 'Halle Lumière';
  c.personnes.find(p => p.id === 'u-ines').nom = 'Inès Garnier-Roy';
  for (const a of ANGLES) {
    const h = rendu(a, c);
    assert.match(h, /Halle Lumière/, a + ' : lieu');
    assert.ok(!h.includes('Les Docks Verrière'), a + ' : ancien lieu');
    assert.ok(!h.includes('>Inès Garnier<') && !h.includes('· Inès Garnier<'), a + ' : ancien nom');
  }
  // l'horaire de la keynote : là où la session est affichée (tous ses publics)
  for (const a of ['organisateur', 'intervenant', 'participant', 'logistique']) {
    const h = rendu(a, c);
    assert.match(h, /10 h 05/, a + ' : nouvel horaire');
    assert.ok(!h.includes('9 h 45'), a + ' : ancien horaire');
  }
  // le nom de l'intervenante : dans le programme et les listes de personnes, côté organisation et logistique
  for (const a of ['organisateur', 'participant', 'logistique']) assert.match(rendu(a, c), /Inès Garnier-Roy/, a);
});

test('un intervenant ne consulte pas les documents privés de l\'organisation', () => {
  const h = rendu('intervenant');
  for (const t of ['Budget prévisionnel', 'Relevé de décisions du comité']) assert.ok(!h.includes(t), t);
  for (const d of S.contenu.decisions) assert.ok(!h.includes(d.nom), d.nom);
  assert.match(h, /Brief des intervenants/);
  assert.match(h, /Gabarit de présentation/);
  const ines = { id: 'u-ines', role: S.acces.membres['u-ines'] };
  for (const id of ['budget', 'releve-decisions']) {
    const a = S.acces.documents[id];
    assert.equal(P.can(ines, 'read', { type: 'document', id, authorId: a.authorId, grants: a.grants }).allow, false, id);
  }
});

test('le participant ne voit ni le montage, ni les incidents, ni le matériel, ni les inscriptions des autres', () => {
  const h = rendu('participant');
  assert.ok(!h.includes('Montage et essais son'));
  for (const i of S.contenu.incidents) assert.ok(!h.includes(i.nom));
  assert.ok(!h.includes('Micros serre-tête'));
  assert.ok(!h.includes('Mina Diallo'));
});

test('les droits ne dépendent pas du modèle graphique (séminaire)', () => {
  const autre = { id: 'test', nom: 'Test', polices: {}, composition: { hero: 'pleine-page', numeros: false, variantes: {} } };
  const vis = h => [...h.matchAll(/<b>([^<]*)<\/b>/g)].map(m => m[1]).sort().join('|');
  for (const a of ANGLES) assert.equal(vis(rendu(a)), vis(rendu(a, null, autre)), a);
});

test('les perspectives du séminaire ne recopient aucune donnée métier', () => {
  const metier = new Set(), angles = new Set();
  const walk = (o, set, skip) => { if (typeof o === 'string') set.add(o); else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => { if (!skip.includes(k)) walk(v, set, skip); }); };
  walk(S.contenu, metier, ['_', 'id', 'subjectId', 'assigneeId', 'payeeId', 'payer', 'univers', 'source', 'groupe', 'audience', 'personne', 'animateurId', 'style']);
  walk(S.persp.angles, angles, ['id', 'regard', 'type', 'filtre', 'groupes', 'action', 'ref', 'role', 'source', 'etat']);
  assert.deepEqual([...angles].filter(v => metier.has(v)), []);
});

test('moteur non dupliqué : une seule définition de rendre(), aucun mot d\'univers dans le moteur', () => {
  const trouve = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', '.git', 'tests'].includes(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|html|cjs|mjs)$/.test(f.name) && fs.readFileSync(p, 'utf8').includes('function rendre(')) trouve.push(path.relative(ROOT, p)); } };
  walk(ROOT);
  assert.deepEqual(trouve, ['vitrine/rendu.js']);
  const moteur = fs.readFileSync(path.join(ROOT, 'vitrine/rendu.js'), 'utf8');
  assert.equal(moteur.match(/mariage|séminaire|seminaire|Léa|Orée|cérémonie|témoin|invité|intervenant/gi), null);
  const page = fs.readFileSync(path.join(ROOT, 'vitrine/site/index.html'), 'utf8');
  assert.equal((page.match(/<script src="[^"]*rendu[^"]*"/g) || []).join(), '<script src="/vitrine/rendu.js"');
  assert.equal(fs.readdirSync(path.join(ROOT, 'vitrine')).filter(f => f.endsWith('.js')).join(), 'rendu.js');
});

test('le même modèle Éditorial prend l\'identité de chaque univers (présentation, pas code)', () => {
  const amb = require('../vitrine/presentation/ambiances.json');
  assert.equal(amb.parUnivers.mariage, 'botanique');
  assert.equal(amb.parUnivers.seminaire, 'pierre');
  assert.equal(S.contenu.evenement.visuels.hero.style, 'architecture');
  assert.match(rendu('participant'), /data-modele="editorial"/);
});
