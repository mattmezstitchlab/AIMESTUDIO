// AIME WORLD · phase 3 : la mission « Installation florale » de bout en bout, les droits par étape, la propagation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require('../synchroview/permissions.js');
const F = require('../synchroview/flux.js');
const V = require('../vitrine/rendu.js');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'vitrine/donnees/world.json'), 'utf8'));
const ACCES = require('../vitrine/acces/world.json');
const PS = require('../vitrine/perspectives/world.json');
const editorial = require('../vitrine/modeles/editorial.json');
const world = require('../api/sv/world.js');

const PARCOURS = [
  ['p-petal', 'apply', {}], ['p-clara', 'shortlist', { candidature: 'c-03' }], ['p-ines', 'validate', {}],
  ['p-petal', 'confirm', {}], ['p-maya', 'start', {}],
  ['p-petal', 'task', { tache: 't-01' }], ['p-petal', 'task', { tache: 't-02' }], ['p-maya', 'task', { tache: 't-03' }],
  ['p-petal', 'finish', {}], ['p-clara', 'close', {}]
].map(([qui, action, p]) => ({ qui, action, p: Object.assign({ mission: 'm-03' }, p) }));
const etat = (j) => F.rejouer(BASE, ACCES, P, j);
const m03 = (c) => c.missions.find(m => m.id === 'm-03');
const rendu = (angle, contenu) => V.rendre({ contenu, acces: ACCES, perspective: PS.angles.find(a => a.id === angle), libelles: PS.libelles, modele: editorial, regles: P, flux: F }).html;
const ANGLES = PS.angles.map(a => a.id);

test('la mission traverse Découvrir → Candidater → Valider → Organiser → Réaliser → Clôturer', () => {
  const vus = [];
  for (let i = 0; i <= PARCOURS.length; i++) { const r = etat(PARCOURS.slice(0, i)); assert.deepEqual(r.refus, [], 'étape ' + i); vus.push(m03(r.contenu).etape); }
  assert.deepEqual([...new Set(vus)], ['candidater', 'valider', 'organiser', 'realiser', 'cloturer', 'close']);
  const fin = etat(PARCOURS).contenu;
  assert.deepEqual(m03(fin).affectes, ['p-petal']);
  assert.equal(fin.candidatures.find(c => c.personne === 'p-bloom').statut, 'non-retenue');
  assert.equal(F.statut(m03(fin)), 'terminee');
  assert.equal(fin.revision, BASE.revision + PARCOURS.length);
});

test('découvrir : une mission ouverte n\'apparaît qu\'aux profils compatibles', () => {
  const r = F.ressource(BASE, m03(BASE));
  const voit = id => P.can(F.sujet(BASE, ACCES, id), 'read', r).allow;
  assert.ok(voit('p-petal') && voit('p-bloom') && voit('p-clara') && voit('p-ines'));
  assert.ok(!voit('p-sophie'), 'une prestation ne s\'adresse pas aux proches');
  assert.ok(!voit('p-alice'), 'une invitée ne voit pas les missions');
  assert.ok(!voit('p-lucas'), 'un voyageur d\'activité n\'est pas membre');
  const m01 = BASE.missions.find(m => m.id === 'm-01'), r1 = Object.assign(F.ressource(BASE, m01), { etape: 'decouvrir', assigneeIds: [] });
  assert.equal(P.can(F.sujet(BASE, ACCES, 'p-petal'), 'apply', r1).reason, 'mission réglementée : qualification « licence-transport » requise');
  assert.ok(P.can(F.sujet(BASE, ACCES, 'p-shuttle'), 'apply', r1).allow);
});

test('chaque étape n\'est visible que par les personnes concernées, avec leurs seules actions', () => {
  const c = etat(PARCOURS.slice(0, 3)).contenu, m = m03(c);
  const step = (id, s) => P.can(F.sujet(c, ACCES, id), 'step', F.ressource(c, m, s)).allow;
  for (const s of ['organiser', 'realiser', 'cloturer']) {
    for (const id of ['p-petal', 'p-clara', 'p-maya', 'p-ines']) assert.ok(step(id, s), id + ' ' + s);
    for (const id of ['p-bloom', 'p-sophie', 'p-alice', 'p-lucas']) assert.ok(!step(id, s), id + ' ' + s);
  }
  const acts = id => Object.entries(F.possibles(c, ACCES, P, id, m)).filter(([, d]) => d.allow).map(([a]) => a).sort();
  assert.deepEqual(acts('p-petal'), ['confirm']);
  assert.deepEqual(acts('p-maya'), ['edit', 'reassign']);
  assert.deepEqual(acts('p-clara'), ['edit', 'reassign']);
  assert.deepEqual(acts('p-ines'), ['edit', 'reassign']);
  assert.deepEqual(acts('p-bloom'), []);
  // le concurrent non retenu ne voit plus la mission ; le prestataire retenu voit la logistique
  const vue = id => V.rendre({ contenu: c, acces: ACCES, perspective: { id: 't', regard: id, label: 't', kicker: '', intro: '', sections: [{ type: 'mission', ref: 'm-03' }] }, modele: editorial, regles: P, flux: F }).html;
  assert.ok(!vue('p-bloom').includes('data-sv-id="mission:m-03"'));
  assert.ok(vue('p-petal').includes('mission:m-03:etape:organiser') && vue('p-petal').includes('quai 2'));
  assert.ok(!vue('p-petal').includes('data-act="validate" data-p'), 'aucun bouton actif de validation chez le prestataire');
});

test('une candidature est privée : un autre candidat ne la voit jamais', () => {
  const c = etat(PARCOURS.slice(0, 1)).contenu;
  const lit = (id, cid) => P.can(F.sujet(c, ACCES, id), 'read', F.resCandidature(c.candidatures.find(x => x.id === cid))).allow;
  assert.ok(lit('p-petal', 'c-03') && !lit('p-petal', 'c-01'));
  assert.ok(lit('p-bloom', 'c-01') && !lit('p-bloom', 'c-03'));
  assert.ok(lit('p-clara', 'c-01') && lit('p-clara', 'c-03'));
  const angle = { id: 'test', regard: 'p-bloom', label: 't', kicker: '', intro: '', sections: [{ type: 'mission', ref: 'm-03' }] };
  const h = V.rendre({ contenu: c, acces: ACCES, perspective: angle, modele: editorial, regles: P, flux: F }).html;
  assert.ok(h.includes('candidature:c-01') && !h.includes('candidature:c-03'));
});

test('les actions refusées sont refusées par les règles, pas seulement masquées', () => {
  const c = etat(PARCOURS.slice(0, 2)).contenu;
  assert.equal(F.transition(c, ACCES, P, 'p-clara', 'validate', { mission: 'm-03' }).allow, false, 'l\'agence propose, le couple valide');
  assert.equal(F.transition(c, ACCES, P, 'p-petal', 'validate', { mission: 'm-03' }).allow, false);
  assert.equal(F.transition(c, ACCES, P, 'p-ines', 'shortlist', { mission: 'm-03', candidature: 'c-01' }).allow, false);
  assert.equal(F.transition(c, ACCES, P, 'p-petal', 'reschedule', { mission: 'm-03', debut: '07:00' }).allow, false);
  assert.equal(F.transition(c, ACCES, P, 'p-maya', 'reassign', { mission: 'm-03', responsable: 'p-petal' }).allow, false, 'le responsable reste dans l\'organisation');
  // un journal forgé est rejoué et ses actions illégitimes n'ont aucun effet
  const forge = etat([{ qui: 'p-bloom', action: 'validate', p: { mission: 'm-03' } }, { qui: 'p-alice', action: 'apply', p: { mission: 'm-03' } }]);
  assert.equal(forge.refus.length, 2); assert.equal(m03(forge.contenu).etape, 'candidater'); assert.equal(forge.contenu.revision, BASE.revision);
});

test('propagation : lieu, horaire et responsable modifiés une fois se retrouvent dans toutes les vues concernées', () => {
  const j = PARCOURS.slice(0, 4).concat([
    { qui: 'p-maya', action: 'move', p: { mission: 'm-03', lieu: 'l-pier' } },
    { qui: 'p-clara', action: 'reschedule', p: { mission: 'm-03', debut: '10:00' } },
    { qui: 'p-ines', action: 'reassign', p: { mission: 'm-03', responsable: 'p-maya' } }]);
  const r = etat(j); assert.deepEqual(r.refus, []);
  const m = m03(r.contenu); assert.equal(m.confirme, false, 'un changement de logistique demande une nouvelle confirmation');
  const lieu = r.contenu.lieux.find(l => l.id === 'l-pier').nom;
  const vues = { couple: 1, agence: 1, prestataire: 1, coordinateur: 1 };
  for (const a of ANGLES) {
    const h = rendu(a, r.contenu), bloc = (h.match(/data-sv-id="mission:m-03"[\s\S]*?data-sv-id="mission:m-03:etape:decouvrir"/) || [''])[0];
    if (!vues[a]) { assert.ok(!h.includes('data-sv-id="mission:m-03"'), a + ' ne voit pas la mission'); continue; }
    assert.ok(bloc.includes(lieu), a + ' : nouveau lieu');
    assert.ok(bloc.includes('10 h'), a + ' : nouvel horaire');
    assert.ok(/data-sv-id="mission:m-03:responsable">Maya Johnson</.test(h), a + ' : nouveau responsable');
    assert.ok(!bloc.includes('Jardin des Quais'), a + ' : ancien lieu absent de la mission');
  }
  assert.ok(rendu('prestataire', r.contenu).includes('9 h 30 · ' + lieu.replace(/&/g, '&amp;')), 'heure d\'arrivée recalculée');
  // la donnée de base n'a jamais été recopiée ni modifiée
  assert.equal(m03(BASE).lieu, 'l-jardin');
});

test('le serveur de démonstration rejoue le journal et décide lui-même', async () => {
  const appel = b => new Promise(ok => { const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { ok({ code: this.code, o }); } }; world({ method: 'POST', body: b }, res); });
  let r = await appel({ journal: [], qui: 'p-petal', action: 'apply', p: { mission: 'm-03' } });
  assert.equal(r.code, 200); assert.equal(r.o.proof, 'serveur');
  r = await appel({ journal: PARCOURS.slice(0, 2), qui: 'p-clara', action: 'validate', p: { mission: 'm-03' } });
  assert.equal(r.code, 403); assert.match(r.o.reason, /propriétaire/);
  r = await appel({ journal: [], qui: 'p-lucas', action: 'apply', p: { mission: 'm-03' } });
  assert.equal(r.code, 403);
  r = await appel({ journal: [{ qui: 'p-bloom', action: 'validate', p: { mission: 'm-03' } }], qui: 'p-ines', action: 'validate', p: { mission: 'm-03' } });
  assert.equal(r.code, 403); assert.equal(r.o.ignorees, 1);
});

test('six perspectives distinctes, aucune donnée métier recopiée, moteur toujours sans mot d\'univers', () => {
  const sec = ANGLES.map(a => [...rendu(a, BASE).matchAll(/data-sv="sec-([a-z-]+)"/g)].map(m => m[1]).join(','));
  assert.equal(new Set(sec).size, 6);
  const brut = JSON.stringify(PS);
  for (const m of BASE.missions) assert.ok(!brut.includes(m.titre), m.titre);
  for (const l of BASE.lieux) assert.ok(!brut.includes(l.nom), l.nom);
  const moteur = fs.readFileSync(path.join(ROOT, 'vitrine/rendu.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'synchroview/flux.js'), 'utf8');
  assert.equal(moteur.match(/Paris|New York|Inès|Théo|mariage|Atlas|cérémonie|invité|couple|florale|Petal/g), null);
});

test('le voyageur d\'activité n\'accède ni à la cérémonie ni aux documents', () => {
  const s = F.sujet(BASE, ACCES, 'p-lucas');
  assert.equal(s.role, null);
  const cer = BASE.moments.find(m => m.id === 'mo-ceremonie');
  assert.equal(P.can(s, 'read', { type: 'event', id: cer.id, public: true }).allow, false);
  for (const d of BASE.documents) assert.equal(P.can(s, 'read', { type: 'document', id: d.id, grants: (ACCES.documents[d.id] || {}).grants || [] }).allow, false, d.id);
});

test('le budget est réservé à l\'organisation, même si une perspective le demandait', () => {
  const angle = id => ({ id: 't', regard: id, label: 't', kicker: '', intro: '', sections: [{ type: 'liste', titre: 'Budget', source: 'budget', champTitre: 'titre', champs: [['montant', 'Montant']] }] });
  const h = id => V.rendre({ contenu: BASE, acces: ACCES, perspective: angle(id), modele: editorial, regles: P, flux: F }).html;
  assert.ok(h('p-ines').includes('11400') && h('p-clara').includes('11400'));
  for (const id of ['p-petal', 'p-sophie', 'p-alice']) assert.ok(!h(id).includes('11400'), id);
});
