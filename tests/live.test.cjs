const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const L = require('../live/modele.js'), P = require('../synchroview/permissions.js');
const D = require('../vitrine/donnees/mariage.json'), A = require('../vitrine/acces/mariage.json');
const S = require('../vitrine/donnees/seminaire.json'), AS = require('../vitrine/acces/seminaire.json');

test('live · l\'axe du jour passe minuit sans se perdre', () => {
  const b = L.base(D);
  assert.equal(b.moments[0].id, 'installation'); assert.equal(b.moments[b.moments.length - 1].id, 'demontage');
  assert.ok(b.moments.every((m, i, l) => !i || l[i - 1].debut <= m.debut), 'ordre du jour conservé');
  assert.equal(L.vue(L.base(D), A, 'u-lucie', L.hm('23:00'), P).maintenant[0].id, 'bal');
  assert.equal(L.vue(L.base(D), A, 'u-lucie', L.hm('01:10'), P).maintenant[0].id, 'bal', 'à 1 h 10, le bal (jusqu\'à 1 h 30) est encore en cours');
});

test('live · un retard en cascade décale la suite, et chaque perspective le voit', () => {
  const r = L.rejouer(L.base(D), A, [{ qui: 'u-camille', action: 'retarder', p: { moment: 'diner', minutes: 15, cascade: true } }], P);
  assert.ok(r.trace[0].ok); assert.deepEqual(r.trace[0].touches, ['diner', 'discours', 'bal', 'navettes', 'demontage']);
  for (const q of ['u-lea', 'u-lucie', 'u-paul', 'u-lumen']) {
    const v = L.vue(r.etat, A, q, L.hm('19:00'), P), d = v.moments.find(m => m.id === 'diner');
    assert.equal(d.debut, '19:45', q); assert.equal(d.prevu, '19:30');
  }
  const sans = L.rejouer(L.base(D), A, [{ qui: 'u-camille', action: 'retarder', p: { moment: 'diner', minutes: 15 } }], P);
  assert.deepEqual(sans.trace[0].touches, ['diner'], 'sans cascade, un seul moment');
});

test('live · une action refusée reste au journal, sans effet ; le rôle vient de l\'espace, jamais de l\'action', () => {
  const j = [
    { qui: 'u-lucie', action: 'retarder', p: { moment: 'bal', minutes: 60, cascade: true }, role: 'owner' },
    { qui: 'u-paul', action: 'annoncer', p: { texte: 'Fausse alerte' } },
    { qui: 'u-inconnu', action: 'fait', p: { moment: 'diner' } },
    { qui: 'u-lumen', action: 'retarder', p: { moment: 'shooting', minutes: 10, cascade: true } },
    { qui: 'u-lumen', action: 'retarder', p: { moment: 'shooting', minutes: 10 } }];
  const r = L.rejouer(L.base(D), A, j, P);
  assert.deepEqual(r.trace.map(t => t.ok), [false, false, false, false, true]);
  assert.match(r.trace[3].raison, /cascade refusée/, 'la cascade d\'un prestataire est atomique : rien ne bouge');
  assert.equal(r.etat.decalage.bal, undefined); assert.equal(r.etat.annonces.length, 0); assert.equal(r.etat.decalage.shooting, 10);
});

test('live · chacun ne voit que ce que les règles lui ouvrent', () => {
  const r = L.rejouer(L.base(D), A, [
    { qui: 'u-camille', action: 'annoncer', p: { texte: 'Pour tous', audience: 'tous' } },
    { qui: 'u-camille', action: 'annoncer', p: { texte: 'Pour l\'équipe', audience: 'equipe' } }], P);
  const inv = L.vue(r.etat, A, 'u-lucie', L.hm('16:00'), P), eq = L.vue(r.etat, A, 'u-lumen', L.hm('16:00'), P);
  assert.ok(inv.moments.every(m => m.public), 'un invité ne voit que les moments publics');
  assert.ok(inv.moments.every(m => !m.equipe), 'ni les consignes d\'équipe');
  assert.deepEqual(inv.annonces.map(a => a.texte), ['Pour tous']); assert.equal(eq.annonces.length, 2);
  assert.equal(inv.annoncer, false); assert.ok(inv.moments.every(m => !m.modifiable));
  assert.equal(L.vue(r.etat, A, 'personne', L.hm('16:00'), P).moments.length, 0, 'hors de l\'espace : rien');
});

test('live · actions mal formées et plan B', () => {
  for (const ko of [{ qui: 'u-camille', action: 'supprimer', p: {} }, { qui: 'U<x>', action: 'fait', p: { moment: 'diner' } },
    { qui: 'u-camille', action: 'retarder', p: { moment: 'diner', minutes: 500 } }, { qui: 'u-camille', action: 'annoncer', p: { texte: '   ' } }]) assert.equal(L.action(ko), null);
  assert.equal(L.action({ qui: 'u-camille', action: 'annoncer', p: { texte: 'x'.repeat(900) } }).p.texte.length, 280);
  const r = L.rejouer(L.base(D), A, [{ qui: 'u-camille', action: 'planB', p: { moment: 'ceremonie' } }, { qui: 'u-camille', action: 'planB', p: { moment: 'vin' } }], P);
  assert.equal(r.trace[1].ok, false, 'pas de plan B prévu'); assert.equal(L.vue(r.etat, A, 'u-lucie', L.hm('15:10'), P).maintenant[0].espace, 'Orangerie');
});

test('live · le séminaire fonctionne avec le même modèle (intervenant sur son propre moment)', () => {
  const k = S.moments.find(m => m.assigneeId === 'u-ines');
  const r = L.rejouer(L.base(S), AS, [{ qui: 'u-ines', action: 'retarder', p: { moment: k.id, minutes: 5 } }, { qui: 'u-hugo', action: 'retarder', p: { moment: k.id, minutes: 5 } }], P);
  assert.deepEqual(r.trace.map(t => t.ok), [true, false]);
});

test('live · page : registre, échappement, canal limité au navigateur et dit comme tel', () => {
  const j = fs.readFileSync('live/live.js', 'utf8'), c = fs.readFileSync('live/canal.js', 'utf8');
  assert.match(j, /function esc\(/); assert.equal((j.match(/n\.texte/g) || []).length, (j.match(/esc\(n\.texte\)/g) || []).length, 'le texte d\'une annonce est toujours échappé');
  assert.match(c, /BroadcastChannel/); assert.match(c, /il faut un serveur/);
  assert.ok(require('../nav/registre.js').ENTREES.some(e => e.id === 'live' && e.href === '/live/' && e.statut === 'demonstration'));
});
