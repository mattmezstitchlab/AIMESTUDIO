/* Tests de la Grande Partition verticale unifiée (index.html + verticale/*).
   Vérifie le contrat canonique aime-projet v1, la propagation réactive, le XML Factur-X EN 16931,
   la présence et le câblage de tous les Actes, le Mode Site par défaut et la synchronisation /tout/. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Contrat = require('../contrats/projet.js');
const V = require('../verticale/noyau.js');

const ROOT = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('verticale · les 5 archétypes produisent chacun un contrat aime-projet v1 strictement valide', () => {
  const cles = Object.keys(V.CAS);
  assert.deepEqual(cles, ['mariage', 'seminaire', 'createur', 'institution', 'broderie']);
  for (const cle of cles) {
    const n = V.creer({ cas: cle });
    const s = n.lire();
    assert.equal(Contrat.valide(s.contrat).ok, true, 'contrat valide pour ' + cle + ' : ' + s.contratValide.erreurs.join(','));
    assert.equal(s.jalons.length, 5);
    assert.ok(s.villes.length >= 2);
    assert.ok(s.totalHT > 0);
  }
});

test('verticale · une modification unique met à jour contrat, jalons, initiales, Factur-X et brief sans effet de bord', () => {
  const n = V.creer({ cas: 'mariage', mode: 'moi' });
  const avant = n.lire();
  const notifications = [];
  n.abonner((snap, cle) => notifications.push([cle, snap.etat.revision]));

  const apres = n.modifier({
    titre: 'Claire & Hugo',
    date: '2028-06-24',
    intention: 'Un mariage solaire au bord de l’eau.',
    mode: 'pro'
  }, 'saisie');

  assert.equal(notifications.length, 1);
  assert.notEqual(avant.empreinte, apres.empreinte);
  assert.equal(apres.initiales, 'CH');
  assert.equal(apres.modeInfo.world, 'fleuriste');
  assert.equal(apres.jalons.find(j => j.id === 'j-0').date, '2028-06-24');
  assert.equal(Contrat.valide(apres.contrat).ok, true);

  /* Basculer le Design System ne doit pas altérer l'empreinte du contenu */
  const empContenu = apres.empreinte;
  const apresDS = n.modifier({ design: 'aime-editorial' }, 'design');
  assert.equal(apresDS.empreinte, empContenu, 'le changement de Design System laisse le contenu intact');

  /* Factur-X EN 16931 et brief de contact reflètent le nouveau titre */
  const xml = n.facturX();
  assert.match(xml, /urn:cen\.eu:en16931:2017/);
  assert.match(xml, /Claire &amp; Hugo/);
  assert.match(xml, /20280624/);
  assert.match(n.briefContact(), /Claire & Hugo/);
});

test('verticale · la Grande Partition complète vit au Lab ; l\'accueil présente le cœur : un projet, quatre écrans', () => {
  const lab = lire('lab/grande-partition/index.html');
  for (const id of [
    'rul', 'filBarre', 'repriseLocale',
    'haut', 'impulsion', 'geste', 'meta', 'naiss', 'lien',
    'story2', 'regards', 'story3', 'vitrine', 'build', 'atlas',
    'entrer', 'offres', 'contact', 'tiroirAtelier'
  ]) {
    assert.match(lab, new RegExp('id="' + id + '"'), 'Lab, section présente : #' + id);
  }
  const accueil = lire('index.html');
  for (const id of ['haut', 'monProjet', 'coeur', 'ecrans', 'droits', 'jourj', 'partout', 'contact']) {
    assert.match(accueil, new RegExp('id="' + id + '"'), 'accueil, section présente : #' + id);
  }
  for (const id of ['naiss', 'story2', 'atlas', 'lien', 'geste', 'pan-g44', 'regards', 'story3', 'build', 'vitrine', 'offres', 'tiroirAtelier']) {
    assert.doesNotMatch(accueil, new RegExp('id="' + id + '"'), 'accueil, gardé au Lab : #' + id);
  }
  assert.ok(!/href="\/lab\//.test(accueil), 'le Lab sort de la navigation publique (brief du 24/10) : la page reste servie à son adresse');
  const html = lab;
  for (const script of [
    '/contrats/projet.js', '/compte/timbre.js', '/cube/modele.js', '/cube/vue3d.js',
    '/synchroview/permissions.js', '/synchroview/flux.js', '/vitrine/rendu.js',
    '/design/systemes.js', '/publication/planche.js', '/live/modele.js',
    '/infinity/js/regles.js', '/stitch/js/conversion.js', '/g44/js/moteur.js',
    '/verticale/noyau.js', '/verticale/regle.js', '/verticale/globe.js',
    '/verticale/cube-regards.js', '/verticale/causalite.js', '/verticale/supports.js', '/verticale/atlas.js'
  ]) {
    assert.ok(html.includes('src="' + script + '"'), 'moteur chargé : ' + script);
  }
  assert.ok(!html.includes('/cube/cartes.js'), 'la Carte Postale historique reste retirée du parcours principal');
  assert.match(lire('os/coque.js'), /coque=1/, 'Mode Site par défaut sans surcouche fenêtre imposée');
  assert.match(lire('tout/index.html'), /La Grande Partition/, '/tout/ suit les chapitres de la page unifiée');
});
