const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../g44/js/dossier.js');
const M = require('../g44/js/moteur.js');
const A = require('../g44/js/acces.js');
const F = require('../g44/js/formation.js');

const ids = l => l.map(x => x.id).sort();

test('données fictives : aucun identifiant réel, aucune donnée sensible', () => {
  const s = JSON.stringify(D.dossier());
  assert.doesNotMatch(s, /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}/, 'pas de numéro de sécurité sociale');
  assert.match(D.dossier().id, /FICTIF/);
  for (const o of Object.values(D.dossier().objets)) assert.ok(D.NIVEAUX[o.niveau], 'chaque objet a un niveau de connaissance : ' + o.nom);
});

test('modèle : identifiants stables, relations typées, cinq dates distinctes', () => {
  const d = D.dossier();
  for (const l of d.liens) { assert.ok(d.objets[l.de] && d.objets[l.vers], l.id); assert.ok(D.RELATIONS[l.type], l.type); assert.ok(l.pourquoi); }
  assert.deepEqual(Object.keys(d.objets['ev-mariage'].dates).sort(), ['connaissance', 'effet', 'evenement', 'modification', 'saisie']);
  assert.notEqual(d.objets['ev-mariage'].dates.saisie, d.objets['ev-mariage'].dates.evenement);
  assert.deepEqual(D.dossier(), D.dossier(), 'le dossier est reconstruit à l\'identique');
});

test('simulation isolée : l\'état initial n\'est jamais modifié, abandonner ne laisse aucune trace', () => {
  const e = M.etatInitial(), ref = JSON.stringify(e);
  const r = M.simuler(e, { objet: 'ev-mariage', valeur: '2016-06-18' });
  assert.equal(JSON.stringify(e), ref);
  assert.equal(r.etat.objets['ev-mariage'].dates.evenement, '2016-06-18');
  assert.equal(e.objets['ev-mariage'].dates.evenement, '2015-06-18');
});

test('simulation déterministe et reproductible', () => {
  const a = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' }), b = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' });
  assert.equal(a.empreinte, b.empreinte);
  assert.deepEqual(a.plan, b.plan);
  assert.notEqual(a.empreinte, M.simuler(null, { objet: 'ev-mariage', valeur: '2018-06-18' }).empreinte);
});

test('scénario fondateur (2016, conforme à l\'acte) : blocage R3, aucune incohérence, rattachement recréé à l\'identique', () => {
  const r = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' });
  assert.deepEqual(ids(r.touches), ['op-ratt', 'per-foyer', 'r-couple', 'r-ratt']);
  assert.deepEqual(r.bloquants.map(b => b.regle), ['R3']);
  assert.deepEqual(r.incoherences, []);
  assert.ok(r.plan.some(p => /Recréer le rattachement à sa date d'effet d'origine/.test(p.texte)));
  assert.ok(r.plan.findIndex(p => /Suspendre/.test(p.texte)) < r.plan.findIndex(p => /Corriger la date/.test(p.texte)));
});

test('liens non concernés inchangés : filiations, naissance, adresse ; la proximité de dates ne crée aucune conséquence', () => {
  const r = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' });
  for (const id of ['r-fil-a', 'r-fil-b', 'ev-naissance', 'adr']) {
    assert.ok(r.independants.some(x => x.id === id), id + ' indépendant');
    assert.ok(!r.diff.some(x => x.id === id), id + ' inchangé');
  }
  assert.ok(r.chronologie.some(c => c.id === 'ev-naissance'), 'la proximité est signalée');
  assert.ok(!r.touches.some(t => t.id === 'ev-naissance'), 'mais jamais appliquée');
});

test('une hypothèse est signalée comme incertitude, jamais appliquée', () => {
  const r = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' });
  assert.deepEqual(r.incertitudes.map(i => i.id), ['droit-f']);
  assert.ok(!r.touches.some(t => t.id === 'droit-f'));
  assert.ok(!r.diff.some(d => d.id === 'droit-f'));
});

test('valeur non conforme (2018) : R4 (pièce) et R2 (rattachement avant la période) relevés ; aucune date proposée à la place d\'un humain', () => {
  const r = M.simuler(null, { objet: 'ev-mariage', valeur: '2018-06-18' });
  assert.deepEqual(r.incoherences.map(i => i.regle).sort(), ['R2', 'R4']);
  const p = r.plan.find(x => /date d'effet du rattachement/.test(x.texte));
  assert.equal(p.qui, 'Responsable');
  assert.doesNotMatch(p.detail, /\d{4}-\d{2}-\d{2}.*propos/);
});

test('comparaison : seules les valeurs atteintes par une relation qui propage changent', () => {
  const r = M.simuler(null, { objet: 'ev-mariage', valeur: '2016-06-18' });
  assert.deepEqual([...new Set(r.diff.map(d => d.id))].sort(), ['ev-mariage', 'per-foyer', 'r-couple']);
});

test('accès : la perspective n\'accorde aucun droit ; visible ≠ autorisé', () => {
  for (const qui of Object.keys(A.IDENTITES)) for (const act of Object.keys(A.ACTIONS)) {
    const r = A.autoriser(qui, act);
    assert.ok(['autorise', 'refuse', 'nonverifie'].includes(r.etat)); assert.ok(r.raison);
  }
  assert.equal(A.autoriser.length, 4, 'la perspective n\'est pas un paramètre de l\'autorisation');
  for (const qui of Object.keys(A.IDENTITES)) assert.equal(A.autoriser(qui, 'executer').etat, 'refuse');
  assert.equal(A.autoriser('agent', 'suspendre-rattachement').etat, 'nonverifie');
  assert.equal(A.autoriser('agent', 'valider-plan').etat, 'refuse');
  assert.equal(A.autoriser('responsable', 'valider-plan').etat, 'autorise');
  assert.equal(A.autoriser('controleur', 'lire-identites').etat, 'refuse');
  assert.equal(A.autoriser('controleur', 'lire-provenance').etat, 'autorise');
  assert.equal(A.autoriser('responsable', 'valider-plan', 'DOS-FICTIF-0001', '2026-12-15').etat, 'refuse', 'mission expirée');
  // le contrôleur ne voit pas les noms, même dans une perspective qui les afficherait
  assert.equal(A.afficherNom('controleur', 'agent', 'Camille Morel', 'Adulte A'), 'Adulte A');
  assert.equal(A.afficherNom('agent', 'agent', 'Camille Morel', 'Adulte A'), 'Camille Morel');
  assert.equal(A.afficherNom('agent', 'controleur', 'Camille Morel', 'Adulte A'), 'Adulte A');
});

test('formation : des explications, pas de note ; les pièges sont expliqués', () => {
  const r = F.expliquer(['direct', 'piece', 'corriger', 'supprimer']);
  assert.deepEqual(r.etapes.map(e => e.statut), ['a-eviter', 'pertinente', 'prematuree', 'a-eviter']);
  assert.match(r.etapes[2].texte, /Il manque d'abord : suspendre/);
  assert.match(r.etapes[2].texte, /habilitation H1/);
  assert.ok(r.oublis.some(o => o.id === 'suspendre'));
  assert.ok(!('note' in r) && !('score' in r));
  const ok = F.expliquer(F.ORDRE);
  assert.ok(ok.etapes.every(e => e.statut === 'pertinente'));
  assert.deepEqual(ok.oublis, []);
});

test('kit de pilote : codes jamais des noms, ordre alterné, mesures validées, écarts seulement à partir de 3 paires, CSV sûr', () => {
  const K = require('../g44/js/kit.js');
  const s = K.nouvelleSession(6, 'Caisse pilote');
  assert.deepEqual(s.participants.map(p => p.code), ['P01', 'P02', 'P03', 'P04', 'P05', 'P06']);
  assert.equal(s.participants.filter(p => p.ordre[0] === 'ref').length, 3, 'la moitié commence par la référence');
  assert.equal(K.saisir(s, 'P01', 'ref', 'difficulte', 9), null, 'une échelle 1 à 7 refuse 9');
  assert.equal(K.saisir(s, 'P01', 'ref', 'total', '12,5'), 12.5);
  assert.throws(() => K.saisir(s, 'Jean Dupont', 'ref', 'total', 3), /inconnu/);
  K.saisir(s, 'P01', 'aug', 'total', 8);
  let r = K.resultats(s).find(x => x.id === 'total');
  assert.equal(r.paires, 1); assert.match(r.lecture, /Pas assez/, 'aucune conclusion sur 1 paire');
  [['P02', 10, 7], ['P03', 14, 9]].forEach(([c, a, b]) => { K.saisir(s, c, 'ref', 'total', a); K.saisir(s, c, 'aug', 'total', b); });
  r = K.resultats(s).find(x => x.id === 'total');
  assert.equal(r.paires, 3); assert.equal(r.ecart.mediane, -4.5); assert.match(r.lecture, /−|-4,5/);
  ['P01', 'P02', 'P03'].forEach(c => { K.saisir(s, c, 'ref', 'complet', 'non'); K.saisir(s, c, 'aug', 'complet', 'oui'); });
  assert.match(K.resultats(s).find(x => x.id === 'complet').lecture, /0 % en référence, 100 % en augmenté/);
  const s2 = K.nouvelleSession(2, '=HYPERLINK("x")'); const c = K.csv(s2);
  assert.ok(!/;=HYPERLINK/.test(c) && c.includes("'=HYPERLINK"), 'une formule n\'est jamais exécutée par le tableur');
  const relu = K.lire(JSON.stringify(s)); assert.deepEqual(K.resultats(relu), K.resultats(s), 'une session exportée se relit à l\'identique');
  const nom = JSON.parse(JSON.stringify(s)); nom.participants[0].code = 'Marie Martin';
  assert.throws(() => K.lire(nom), /jamais un nom/);
  const html = require('fs').readFileSync('g44/index.html', 'utf8');
  assert.match(html, /id="kit"/); assert.match(html, /data-visite/); assert.match(html, /rien n'est envoyé/);
});

test('la page défile : le cadre arrondi (overflow:clip sur le corps) ne bloque jamais la fenêtre', () => {
  const css = require('fs').readFileSync('g44/lab.css', 'utf8');
  if (/body\{[^}]*overflow:\s*clip/.test(css)) assert.match(css, /html\{[^}]*overflow-y:\s*auto/, 'html doit porter son propre défilement');
});

test('Rewind du hero : refus R3 réel, puis défaire → corriger → rejouer, sans rien modifier ; 2018 est arrêté avant', () => {
  const W = require('../g44/js/rewind.js'), D = require('../g44/js/dossier.js');
  const avant = JSON.stringify(D.dossier());
  const s = W.sequence(2016);
  assert.equal(s.refus.regle, 'R3', 'le refus que tout agent connaît vient de la vraie règle');
  assert.deepEqual(s.etapes.map(e => e.sens), ['defaire', 'defaire', 'corriger', 'rejouer', 'rejouer', 'controler']);
  assert.deepEqual(s.etapes.map(e => e.regle).filter(Boolean), ['R3', 'R3', 'R4', 'R1', 'R2']);
  assert.equal(s.final.date, '2016-06-18'); assert.equal(s.final.periode, '2016-06-18'); assert.equal(s.final.ratt, 'ACTIF');
  assert.equal(JSON.stringify(D.dossier()), avant, 'le dossier n\'est jamais modifié');
  const t = W.sequence(2018);
  assert.equal(t.etapes.length, 0, 'aucune chaîne rejouée sur une valeur incohérente');
  assert.deepEqual(t.incoherences.map(i => i.regle).sort(), ['R2', 'R4']);
  assert.ok(W.sequence(2015).rien); assert.ok(W.sequence('20a6').erreur);
  const html = require('fs').readFileSync('g44/index.html', 'utf8');
  assert.match(html, /id="rewind"/); assert.ok(!/class="rewind"/.test(html), 'pas de collision avec la classe .rewind du LAB 02'); assert.ok(html.indexOf('id="rewind"') < html.indexOf('id="scenario"'), 'dans le hero');
  assert.match(require('fs').readFileSync('g44/js/rewind.js', 'utf8'), /RECONSTITUTION PÉDAGOGIQUE · CODES FICTIFS/);
  const css = require('fs').readFileSync('g44/lab.css', 'utf8');
  assert.match(css, /\.btn\.rw-go,\.btn\.rw-go:hover[^{]*\{[^}]*linear-gradient\(90deg,#22D3EE/, 'Rembobiner reste arc-en-ciel, même au survol (bat .btn:hover)');
  assert.match(css, /\.vue \.lig:has\(>\.etat\)\{grid-template-columns:minmax\(0,1fr\) auto\}/, 'LAB 05 : le badge a sa colonne, le libellé passe à la ligne au lieu de passer dessous');
});
