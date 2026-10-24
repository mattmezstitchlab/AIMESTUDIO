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

test('le Bureau devient « Mes projets » : connecté, on arrive sur /projets/ ; le compte garde l\'identité', () => {
  const v = JSON.parse(lire('vercel.json')), c = lire('compte/compte.js');
  for (const s of ['/projets', '/projets/']) assert.ok(v.rewrites.some(r => r.source === s && r.destination === '/compte/'), s + ' : même moteur que le compte, pas de second écran');
  assert.match(c, /var cb='\/projets\/'/, 'le lien e-mail ramène sur Mes projets');
  assert.match(c, /location\.replace\('\/projets\/'\+location\.search\)/, 'une invitation, un projet à ouvrir ou venu du Point Zéro mènent à Mes projets');
  assert.match(c, /\$\('profil'\)\.hidden=PROJETS;\$\('espaces'\)\.hidden=!PROJETS/, 'le compte : identité ; Mes projets : espaces et invitations');
  assert.match(lire('compte/index.html'), /<h2 class="k" id="t-esp">Mes projets<\/h2>/);
  assert.ok(!/AIMEPorte\.monter/.test(lire('bureau/index.html')), 'le Bureau n\'a plus de seconde porte');
  assert.equal(require('../dock/plus.js').etat({ connecte: true }, [{ id: 'a', titre: 'P', role: 'owner' }]).items[0].href, '/projets/?espace=a');
});

test('le texte de l\'accueil dit ce qui existe : le serveur compose, l\'Orbe explique ; ce qui protège ; d\'autres domaines ; l\'invitée n\'est pas témoin', () => {
  const z = lire('index.html'), c = lire('coeur/coeur.js'), m = lire('vitrine/scenarios/mariage.json');
  for (const t of [z, c, m]) { assert.ok(!/L'orbe recueille|L\\?'orbe compose/.test(t.replace(/\/\*[\s\S]*?\*\//g, ''))); }
  assert.match(z, /le serveur compose la page de chacun selon son rôle/); assert.match(z, /L'Orbe, elle, explique les droits et propose les gestes/);
  const p = z.match(/<section class="cx" id="protection"[\s\S]*?<\/section>/)[0];
  for (const t of ['Composé par le serveur', 'Un journal en ajout seul', 'Des accès qui expirent', 'Je vois un accès inattendu']) assert.ok(p.includes(t), t);
  assert.equal((p.match(/<dt>/g) || []).length, 4, 'rien d\'autre que ce qui existe');
  assert.match(z, /id="domaines"[\s\S]*séminaire, une formation, une association[\s\S]*href="\/exemples\/"/);
  assert.ok(!/Témoin/.test(z) && !/"Témoin"/.test(m), 'Lucie est invitée, pas témoin');
  assert.match(z, /placeholder="Le mariage de Léa et Marc, le 14 juin 2027 au Domaine des Aulnes"/);
});

test('l\'Orbe sans doublon (docs/ORBE-AUDIT.md § 4) : yeux.js n\'est plus chargé par l\'accueil ; le menu Explorer quitte /sites/ et /bureau/espace/', () => {
  assert.ok(!lire('index.html').includes('/zero/yeux.js'), 'plus rien à animer sur l\'accueil');
  for (const f of ['sites/index.html', 'bureau/espace/index.html']) assert.ok(!lire(f).includes('/menu/menu.js'), f + ' : le Dock suffit, pas de seconde navigation');
  assert.ok(fs.existsSync(R('zero/yeux.js')) && fs.existsSync(R('menu/menu.js')), 'rien n\'est supprimé : la Grande Partition et /aime/ (Lab) les gardent');
  assert.ok(fs.existsSync(R('docs/ORBE-AUDIT.md')));
});
