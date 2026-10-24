/* L'unification (liste de contrôle « Le site, simplifié », 24/10/2026) : un seul champ, un seul +, un seul accès au compte, un seul Dock.
   Rien n'est supprimé : on remplace, on range au Lab ou on redirige. Chaque test est un test d'acceptation de cette liste. */
const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => fs.readFileSync(R(p), 'utf8');
const N = require('../nav/registre.js'), D = require('../dock/modele.js');

test('accueil : un seul +, un seul accès au compte, « Mes essais sur cet appareil », aucun lien vers /#entrer', () => {
  const z = lire('index.html'), haut = z.match(/<header class="barre">[\s\S]*?<\/header>/)[0];
  assert.ok(!/porte|compte/.test(haut), 'en haut, seulement le logo');
  assert.equal(D.composer({}).plus.length, 1, 'un seul geste au + public : Commencer');
  assert.equal(D.composer({}).lieux.filter(e => e.href === '/compte/').length, 1, 'un seul accès au compte, dans le Dock');
  assert.match(z, /Mes essais sur cet appareil/); assert.ok(!/Déjà sur cet appareil/.test(z));
  assert.ok(!z.includes('/#entrer') && !z.includes('id="entrer"'));
  assert.ok(!/href="\/aime\/"/.test(z), 'le lien vers /aime/ part au Lab');
  assert.match(z, /href="\/contact\/"/, 'le formulaire a déménagé vers /contact/, lien en pied de page');
});

test('aucun autre écran ne reprend le titre de l\'accueil', () => {
  const T = /Tout commence par une intention/;
  for (const f of ['lab/grande-partition/index.html', 'bureau/index.html', 'exemples/index.html', 'contact/index.html', 'capacites/index.html']) assert.ok(!T.test(lire(f)), f);
  assert.match(lire('lab/grande-partition/index.html'), /<h1 id="t-zero">La Grande Partition<\/h1>/);
});

test('Le Monde AIME, le Réseau et les cartes vivent au Lab ; /tout/ est réservé à la Régie', () => {
  const pub = N.publiques(false), e = id => N.ENTREES.find(x => x.id === id);
  assert.equal(e('aime').cat, 'jeux'); assert.equal(e('aime').href, '/aime/');
  for (const id of ['reseau', 'cartes']) { assert.equal(e(id).cat, 'jeux', id); assert.equal(e(id).statut, 'demonstration', id + ' : marqué Démonstration'); }
  assert.ok(e('tout').interne && !pub.some(x => x.href === '/tout/'), 'le registre de navigation publique ne liste plus /tout/');
  assert.ok(N.publiques(true).some(x => x.href === '/tout/'), 'l\'outil reste au propriétaire du site');
  assert.ok(fs.existsSync(R('tout/index.html')) && fs.existsSync(R('aime/index.html')) && fs.existsSync(R('reseau/index.html')), 'rien n\'est supprimé');
});

test('le formulaire de contact a déménagé sans rien perdre', () => {
  const c = lire('contact/index.html');
  for (const n of ['projet', 'prenom', 'nom', 'email', 'tel', 'adresse', 'livraison', 'message', 'site_web', 'consentement']) assert.match(c, new RegExp('name="' + n + '"'), n);
  assert.match(c, /\/zero\/contact\.js/); assert.match(c, /id="dock-site"/); assert.match(lire('index.html'), /id="contact"/, 'l\'ancre #contact de l\'accueil reste (Régie)');
});
