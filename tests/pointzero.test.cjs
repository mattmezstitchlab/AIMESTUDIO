// Point Zéro : la lecture d'une matière brute, sa distribution dans les six formes, et les garde-fous du stockage.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const A = require('../pointzero/analyse.js');
const F = require('../zero/formes.js');
const REF = '2026-10-22';

test('point zéro · une intention datée, nommée, chiffrée touche toutes les formes utiles', () => {
  const a = A.analyser('Je veux un site pour le mariage de Léa & Marc le 14 juin 2027. Budget 3 500 €.', { ref: REF });
  assert.equal(a.genre, 'intention');
  assert.deepEqual(a.dates, ['2027-06-14']);
  assert.deepEqual(a.personnes, ['Léa', 'Marc']);
  assert.deepEqual(a.montants, ['3 500 €']);
  assert.deepEqual(a.themes, ['evenement', 'site', 'budget']);
  assert.deepEqual(a.etapes, ['point', 'ligne', 'relation', 'grille', 'projet']);
});

test('point zéro · demandes, listes, dates sans année, adresses et liens', () => {
  const d = A.analyser('Peux-tu préparer le devis pour Paul Durand (paul.durand@exemple.fr) avant le 05/11 ?', { ref: REF });
  assert.equal(d.genre, 'demande'); assert.deepEqual(d.dates, ['2026-11-05'], 'la prochaine occurrence');
  assert.deepEqual(d.emails, ['paul.durand@exemple.fr']); assert.ok(d.personnes.includes('Paul Durand'));
  const passee = A.analyser('Point le 3 mars', { ref: REF }); assert.deepEqual(passee.dates, ['2027-03-03'], 'une date déjà passée cette année va à l\'année suivante');
  const l = A.analyser('- logo\n- couleurs\n- typographie', { ref: REF });
  assert.equal(l.genre, 'liste'); assert.equal(l.titre, 'logo, couleurs, typographie'); assert.ok(l.etapes.includes('composition'));
  const u = A.analyser('voir https://exemple.fr/menu et 06 12 34 56 78', { ref: REF });
  assert.deepEqual(u.liens, ['https://exemple.fr/menu']); assert.deepEqual(u.telephones, ['0612345678']);
  assert.deepEqual(A.analyser('31/02/2027', { ref: REF }).dates, [], 'une date impossible est ignorée');
  assert.deepEqual(A.analyser('note rapide', { ref: REF }).etapes, ['point']);
  const f = A.analyser('devis.pdf', { fichier: true, nom: 'devis.pdf', ref: REF }); assert.equal(f.genre, 'fichier');
});

test('point zéro · la distribution : une ligne ordonnée, un réseau, une grille, un brouillon, des dossiers', () => {
  const T = ['Je veux un site pour le mariage de Léa & Marc le 14 juin 2027.', 'Rendez-vous avec Camille chez le traiteur le 3 novembre pour le mariage', 'Peux-tu envoyer le devis à Léa ?', 'note sans rien'];
  const L = T.map((t, i) => ({ id: 'e' + i, texte: t, cree: '2026-10-2' + i, origine: 'appareil', a: A.analyser(t, { ref: REF }) }));
  const D = A.distribuer(L, REF);
  assert.deepEqual(D.ligne.jalons.map(j => j.date), ['2026-11-03', '2027-06-14'], 'dans l\'ordre du temps');
  assert.equal(D.ligne.sansDate.length, 2);
  const lea = D.relation.entites.find(e => e.nom === 'Léa'); assert.equal(lea.els.length, 2, 'Léa est citée deux fois');
  assert.ok(D.relation.liens.length >= 1, 'Léa et Marc sont reliés par un même élément');
  assert.ok(D.grille.lignes.includes('evenement') && D.grille.lignes.includes('divers'));
  assert.equal(D.composition.intention.id, 'e0', 'l\'intention ouvre le brouillon');
  const ev = D.projet.find(p => p.theme === 'evenement'); assert.ok(ev); assert.equal(ev.els.length, 2); assert.equal(ev.prochaine, '2026-11-03');
  assert.deepEqual(A.compter(D), { point: 4, ligne: 2, relation: D.relation.entites.length, grille: Object.keys(D.grille.cases).length, composition: D.composition.parties.length, projet: D.projet.length });
  assert.deepEqual(A.compter(A.distribuer([], REF)), { point: 0, ligne: 0, relation: 0, grille: 0, composition: 0, projet: 0 });
});

test('point zéro · les six formes viennent d\'un seul module, partagé avec la Page Zéro', () => {
  assert.deepEqual(F.NOMS, ['Point', 'Ligne', 'Relation', 'Grille', 'Composition', 'Projet']);
  const E = F.etats(); assert.equal(E.length, 6); E.forEach(P => assert.equal(P.length, F.N));
  const z = fs.readFileSync('zero/zero.js', 'utf8'); assert.match(z, /window\.AIMEFormes/); assert.doesNotMatch(z, /var RECTS=/, 'pas de copie des formes dans la Page Zéro');
  const idx = fs.readFileSync('index.html', 'utf8'); assert.ok(idx.indexOf('/zero/formes.js') < idx.indexOf('/zero/zero.js'));
});

test('point zéro · stockage : session obligatoire, analyse refaite côté serveur, fichiers jamais envoyés, tout effacé avec le compte', () => {
  const api = fs.readFileSync('api/matiere.mjs', 'utf8');
  assert.match(api, /await personne\(req\)/); assert.match(api, /401/);
  assert.match(api, /A\.analyser\(t\)/, 'le serveur ne reprend pas l\'analyse du navigateur');
  assert.match(api, /where id = \$1 and user_id = \$2/, 'on ne supprime que sa propre matière');
  const pz = fs.readFileSync('pointzero/pz.js', 'utf8');
  assert.doesNotMatch(pz, /\/api\/matiere'[^)]*fichier/, 'aucun fichier envoyé au serveur');
  assert.match(pz, /indexedDB/);
  assert.match(fs.readFileSync('api/_auth/auth.mjs', 'utf8'), /delete from matiere where user_id = \$1/);
  assert.match(fs.readFileSync('db/migrations/2026-10-22-matiere.sql', 'utf8'), /create table if not exists matiere/);
  assert.doesNotMatch(pz, /innerHTML\s*=\s*[^'"]/, 'le contenu déposé ne passe jamais par innerHTML');
});
