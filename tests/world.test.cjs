// AIME WORLD (phase 1-2) : donnée commune cohérente, références uniques, aucune donnée sensible, moteur inchangé dans son principe.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const W = JSON.parse(fs.readFileSync(path.join(ROOT, 'vitrine/donnees/world.json'), 'utf8'));
const PS = require('../vitrine/perspectives/world.json');
const V = require('../vitrine/rendu.js');

const ids = [].concat(...['personnes', 'invites', 'lieux', 'trajets', 'moments', 'missions', 'documents', 'delegations', 'activites', 'imprevus'].map(k => (W[k] || []).map(x => x.id)));
const existe = id => ids.includes(id);

test('chaque entité a un identifiant stable et unique', () => {
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids).size, ids.length);
});

test('50 invités, 12 missions, 6 perspectives', () => {
  assert.equal(W.invites.length, 50);
  assert.equal(W.missions.length, 12);
  assert.deepEqual(PS.angles.map(a => a.id), ['couple', 'agence', 'prestataire', 'invite', 'contributeur', 'coordinateur']);
});

test('toutes les références pointent vers une entité existante (aucune copie de nom)', () => {
  for (const i of W.invites) { if (i.personne) assert.ok(existe(i.personne), i.id); if (i.vol) assert.ok(existe(i.vol), i.id); }
  for (const t of W.trajets) { assert.ok(existe(t.de) && existe(t.vers), t.id); if (t.apres) assert.ok(existe(t.apres.ref), t.id); }
  for (const m of W.moments) { assert.ok(existe(m.espace), m.id); if (m.apres) assert.ok(existe(m.apres.ref), m.id); }
  for (const m of W.missions) {
    assert.ok(existe(m.lieu) && existe(m.responsable), m.id);
    m.affectes.concat(m.dependances || []).forEach(r => assert.ok(existe(r), m.id + ' → ' + r));
    for (const k of ['id', 'titre', 'description', 'categorie', 'date', 'duree', 'postes', 'competences', 'conditions', 'remuneration', 'statut']) assert.ok(m[k] !== undefined, m.id + ' : ' + k);
    assert.ok(['ouverte', 'attribuee', 'en-cours', 'terminee'].includes(m.statut));
    if (m.reglementee) assert.ok(m.qualification, m.id + ' réglementée sans qualification');
  }
  for (const a of PS.angles) assert.ok(existe(a.regard), a.id);
});

test('les dépendances temporelles ne forment aucun cycle', () => {
  const dep = {}; [...W.trajets, ...W.moments].forEach(x => { dep[x.id] = x.apres ? [x.apres.ref] : []; });
  const vu = {}; const visite = (id, pile) => { assert.ok(!pile.includes(id), 'cycle ' + pile.concat(id).join(' → ')); if (vu[id]) return; vu[id] = 1; (dep[id] || []).forEach(d => visite(d, pile.concat(id))); };
  Object.keys(dep).forEach(id => visite(id, []));
});

test('une même personne porte plusieurs responsabilités sans être dupliquée', () => {
  const multi = W.personnes.filter(p => (p.responsabilites || []).length > 2);
  assert.ok(multi.length >= 1);
  const noms = W.personnes.map(p => p.nom); assert.equal(new Set(noms).size, noms.length);
});

test('aucune donnée d\'identité ni de paiement réel dans la démonstration', () => {
  const brut = JSON.stringify(W);
  assert.equal(brut.match(/passeport\s*n|numéro de passeport"|"passport|\biban\b|\bcvv\b|\b\d{13,19}\b/gi), null);
  for (const t of W.trajets.filter(t => t.type === 'vol')) assert.match(t.code, /fictif/);
  for (const f of W.formalites) assert.ok(!/AIME (délivre|obtient|émet) (votre|un|une)/.test(f.texte), f.titre);
});

test('la landing ne contient ni nom ni chiffre de l\'événement : tout vient de la donnée', () => {
  const page = fs.readFileSync(path.join(ROOT, 'vitrine/world/index.html'), 'utf8');
  for (const p of W.personnes) assert.ok(!page.includes(p.nom), p.nom);
  for (const m of W.missions) assert.ok(!page.includes(m.titre), m.titre);
  assert.ok(!/\b50 invités|\b12 missions/.test(page));
  assert.equal((page.match(/<script src="[^"]*rendu[^"]*"/g) || []).join(), '<script src="/vitrine/rendu.js"');
});

test('le moteur reste sans mot d\'univers, et les nouvelles natures visuelles sont déterministes', () => {
  const moteur = fs.readFileSync(path.join(ROOT, 'vitrine/rendu.js'), 'utf8');
  assert.equal(moteur.match(/Paris|New York|Manhattan|Inès|Théo|mariage|Atlas/g), null);
  const amb = require('../vitrine/presentation/ambiances.json').ambiances.crepuscule;
  for (const s of ['toits', 'gratte-ciel']) { const a = V.visuel(7, amb, 1.6, s); assert.equal(a, V.visuel(7, amb, 1.6, s)); assert.match(a, /^<svg/); }
});

test('les perspectives ne recopient aucun nom de la donnée', () => {
  const prenoms = W.personnes.map(p => p.nom.split(' ')[0]);
  for (const a of PS.angles) for (const t of [a.label, a.kicker, a.intro, ...a.exemples]) for (const n of prenoms) assert.ok(!t.includes(n), a.id + ' : ' + t);
});
