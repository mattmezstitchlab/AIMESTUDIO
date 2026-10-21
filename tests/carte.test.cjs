const { test } = require('node:test');
const assert = require('node:assert/strict');
const K = require('../carte/carte.js');
const G = require('../carte/guide.js');
const R = require('../carte/rendu.js');
const REG = require('../carte/registre-demo.js');

test('la Carte : rien d\'obligatoire, tout privé par défaut, la naissance jamais publique', () => {
  const c = K.vide('2026-10-21');
  for (const r in K.RUBRIQUES) assert.equal(c.visibilite[r], 'privee', r);
  assert.equal(K.vuePublique(c), null, 'non publiée : aucune vue publique');
  assert.throws(() => K.rendreVisible(c, 'naissance', 'publique'), /ne peut pas être publique/);
  assert.throws(() => K.rendreVisible(c, 'relations', 'publique'), /ne peut pas être publique/);
});

test('versions : chaque modification crée une version, l\'original reste intact', () => {
  const c = K.vide('d0'), c2 = K.modifier(c, { nom: 'Matt', id: 'pirate', visibilite: {} }, 'nom', 'd1');
  assert.equal(c.nom, ''); assert.equal(c2.nom, 'Matt'); assert.equal(c2.version, 2);
  assert.equal(c2.id, c.id, 'on ne change pas l\'identité par modifier'); assert.deepEqual(c2.visibilite, c.visibilite, 'ni la visibilité');
  assert.equal(c2.historique.length, 2); assert.equal(c2.historique[1].avant.nom, '');
});

test('publication : consentement explicite, seulement les rubriques publiques, révocable', () => {
  let c = K.modifier(K.vide(), { nom: 'Matt', naissance: '1985-01-01', competences: ['Musique'], relations: [{ nom: 'Léa' }] });
  assert.throws(() => K.publier(c, true), /aucune rubrique publique/);
  c = K.rendreVisible(c, 'competences', 'publique');
  assert.throws(() => K.publier(c, 'oui'), /consentement explicite/);
  const p = K.publier(c, true, 'd');
  const v = K.vuePublique(p);
  assert.deepEqual(Object.keys(v).sort(), ['competences', 'id', 'version']);
  assert.ok(!('naissance' in v) && !('relations' in v) && !('historique' in v) && !('nom' in v));
  assert.equal(K.vuePublique(K.retirer(p, 'd2')), null);
});

test('mise en relation expliquée par ce qui est déclaré, et registre filtrable', () => {
  const theo = REG.find(x => x.id === 'demo-theo'), ines = REG.find(x => x.id === 'demo-ines');
  const m = K.correspondances(ines, theo);
  assert.ok(m.some(x => /proposez « Photographie »/.test(x.texte)));
  assert.ok(m.every(x => x.texte));
  assert.equal(K.filtrer(REG, 'territoires', 'lille').length, 2);
  assert.equal(K.filtrer(REG, 'parcours').length, 2);
  for (const v of REG) assert.ok(!('naissance' in v) && !('relations' in v) && !('historique' in v), v.id);
  const d = K.demander('moi', 'demo-theo', 'Bonjour'); assert.equal(d.etat, 'en-attente');
  assert.equal(K.repondre(d, true).etat, 'acceptee');
});

test('guide : une question à la fois, adaptatif, jamais ce qui est déjà rempli ; moteurs locaux', () => {
  let c = K.vide(); const faites = {};
  assert.equal(G.prochaine(c, faites).id, 'intention');
  c = G.repondre(c, G.QUESTIONS[0], 'Garder un souvenir'); faites.intention = 1;
  assert.equal(G.prochaine(c, faites).id, 'nom');
  faites.nom = 1; // ignorée : on passe
  assert.equal(G.prochaine(c, faites).id, 'couleurs');
  c = G.repondre(c, G.QUESTIONS[2], 'violet');
  assert.deepEqual(c.couleurs.slice(0, 1), ['#7C5CFF']);
  faites.couleurs = 1; c = G.repondre(c, G.QUESTIONS[3], 'Notre mariage, juin 2016'); faites.moment = 1;
  assert.equal(c.moments[0].date, '2016-06');
  const ids = []; let q; const f2 = { ...faites }; while ((q = G.prochaine(c, f2))) { ids.push(q.id); f2[q.id] = 1; }
  assert.ok(!ids.includes('competences') && !ids.includes('contribution'), 'un souvenir ne déclenche pas les questions de rencontre');
  assert.equal(G.MOTEURS.parcours.faire('Mes années à Saint-Luc'), 'formations');
  assert.equal(G.MOTEURS.parcours.faire('Erasmus à Lisbonne'), 'voyages');
  assert.equal(G.MOTEURS.date.faire('le 14/06/2016'), '2016-06-14');
  assert.equal(G.AGENT.disponible, false, 'l\'agent connecté n\'est pas annoncé');
  assert.equal(G.repondre(c, G.QUESTIONS[1], ''), c, 'ignorer ne change rien');
});

test('suite dans Le Monde AIME : ne redemande rien de connu', () => {
  let c = G.repondre(K.vide(), G.QUESTIONS.find(x => x.id === 'reve'), 'Un festival dans un jardin');
  assert.equal(G.suite(c).id, 'envie');
  c = G.repondreSuite(c, 'envie', 'Créer');
  const s = G.suite(c); assert.equal(s.id, 'projetDepuisReve'); assert.match(s.q, /festival/);
  c = G.repondreSuite(c, 'projetDepuisReve', 'Oui'); c = G.repondreSuite(c, 'partage', 'Garder privée');
  assert.equal(G.suite(c), null);
});

test('rendu : un carré 1:1, issu des données, sans fuite de la naissance', () => {
  const c = K.modifier(K.vide(), { nom: 'Matt', naissance: '1985-01-01', couleurs: ['#7C5CFF'], intention: 'Créer quelque chose', reves: ['Un monde relié'] });
  const s = R.svg(c, { id: 't' });
  assert.match(s, /viewBox="0 0 400 400"/); assert.match(s, /Matt/); assert.match(s, /#7C5CFF/); assert.match(s, /Un monde relié/);
  assert.doesNotMatch(s, /1985/);
  assert.match(R.svg(c, { id: 'e', exemple: true }), /EXEMPLE/);
  assert.match(R.svg(c, { id: 'm', mode: 'mini' }), />M</);
  assert.doesNotMatch(R.svg({ nom: '<script>' }, { id: 'x' }), /<script>/);
});
