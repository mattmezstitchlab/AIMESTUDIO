/* L'unification (liste de contrôle « Le site, simplifié », 24/10/2026) : un seul champ, un seul +, un seul accès au compte, un seul Dock.
   Rien n'est supprimé : on remplace, on range au Lab ou on redirige. Chaque test est un test d'acceptation de cette liste. */
const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => fs.readFileSync(R(p), 'utf8');
const N = require('../nav/registre.js'), D = require('../dock/modele.js');

test('accueil : un seul +, un seul accès au compte, plus de « Mes essais sur cet appareil », aucun lien vers /#entrer', () => {
  const z = lire('index.html'), haut = z.match(/<header class="barre">[\s\S]*?<\/header>/)[0];
  assert.ok(!/porte|compte/.test(haut), 'en haut, seulement le logo');
  assert.deepEqual(D.composer({}).plus.map(a => a.nom), ['Créer un projet', 'J\'ai reçu une invitation'], 'deux gestes au + public, plus de « Commencer » seul');
  assert.equal(D.composer({}).lieux.filter(e => e.href === '/compte/').length, 1, 'un seul accès au compte, dans le Dock');
  assert.ok(!/Mes essais sur cet appareil|Déjà sur cet appareil/.test(z), 'retiré de l\'accueil (brief du 24/10)');
  assert.ok(!z.includes('/#entrer') && !z.includes('id="entrer"'));
  assert.ok(!/href="\/aime\/"/.test(z), 'le lien vers /aime/ part au Lab');
  assert.match(z, /href="\/contact\/"/, 'le formulaire a déménagé vers /contact/, lien en pied de page');
});

test('aucun autre écran ne reprend le titre de l\'accueil', () => {
  const T = /Tout commence par une intention/;
  for (const f of ['lab/grande-partition/index.html', 'exemples/index.html', 'contact/index.html', 'capacites/index.html']) assert.ok(!T.test(lire(f)), f);
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
  assert.match(lire('compte/index.html'), /<h2 class="k" id="t-esp">Mes projets et participations<\/h2>/, 'dans AI (25/10)');
  assert.ok(require('../dock/modele.js').composer({ famille: 'Public connecté' }).lieux.some(e => e.href === '/projets/'), 'connecté : Mes projets est un lieu du Dock');
});

test('le texte de l\'accueil dit ce qui existe : le serveur compose, l\'Orbe explique ; ce qui protège ; d\'autres domaines ; l\'invitée n\'est pas témoin', () => {
  const z = lire('index.html'), c = lire('coeur/coeur.js'), m = lire('vitrine/scenarios/mariage.json');
  for (const t of [z, c, m]) { assert.ok(!/L'orbe recueille|L\\?'orbe compose/.test(t.replace(/\/\*[\s\S]*?\*\//g, ''))); }
  assert.match(z, /le serveur compose la page de chacun selon son rôle/); assert.match(z, /L'Orbe, elle, explique les droits et propose les gestes/);
  const p = z.match(/<section class="v-sec" id="protection"[\s\S]*?<\/section>/)[0];
  for (const t of ['Composé par le serveur', 'Un journal en ajout seul', 'Des accès qui expirent', 'Je vois un accès inattendu', 'Un lien que vous coupez', 'Accessible']) assert.ok(p.includes(t), t);
  assert.equal((p.match(/<dt>/g) || []).length, 6, 'rien d\'autre que ce qui existe (le lien coupable : P2 ; l\'accessibilité : parcours axe)');
  assert.match(z, /id="domaines"[\s\S]*séminaire, une formation, une association[\s\S]*href="\/exemples\/"/);
  assert.ok(!/Témoin/.test(z) && !/"Témoin"/.test(m), 'Lucie est invitée, pas témoin');
  assert.match(z, /data-value="maries"[^>]*><span class="jl-pt" aria-hidden="true"><\/span><span class="jl-t">Futurs mariés<\/span>/, 'l\'accueil commence par « Je suis… » (PR C)');
});

test('l\'Orbe sans doublon (docs/ORBE-AUDIT.md § 4) : yeux.js n\'est plus chargé par l\'accueil ; le menu Explorer quitte /sites/ et /bureau/espace/', () => {
  assert.ok(!lire('index.html').includes('/zero/yeux.js'), 'plus rien à animer sur l\'accueil');
  for (const f of ['sites/index.html', 'bureau/espace/index.html']) assert.ok(!lire(f).includes('/menu/menu.js'), f + ' : le Dock suffit, pas de seconde navigation');
  assert.ok(fs.existsSync(R('zero/yeux.js')) && fs.existsSync(R('menu/menu.js')), 'rien n\'est supprimé : la Grande Partition et /aime/ (Lab) les gardent');
  assert.ok(fs.existsSync(R('docs/ORBE-AUDIT.md')));
});

test('affichage : le Dock ne cache rien, le menu du + se détache, l\'en-tête a un fond, le compte n\'a pas de seconde navigation, le Point Zéro reste en coulisses', () => {
  const css = lire('dock/dock.css');
  assert.match(css, /html:has\(>body\.avec-dock\)\{scroll-padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom,0px\)\)\}/, 'un champ focalisé s\'arrête au-dessus du Dock');
  const m = css.match(/\.dock-menu\{[^}]*\}/)[0]; assert.match(m, /background:#[0-9A-Fa-f]{6}/, 'menu du + : fond opaque'); assert.match(m, /border:1px solid #/, 'et un bord');
  assert.match(lire('coeur/charte.css'), /\.barre::before\{[^}]*background:rgba\(10,10,12,\.8\d\)/, 'coeur/charte.css : l\'en-tête a un fond léger');
  assert.match(lire('accueil/vitrine.css'), /\.clair \.barre::before\{[^}]*background:rgba\(255,255,255,\.8\d\)/, 'accueil clair : l\'en-tête a un fond léger');
  for (const f of ['contact/index.html', 'capacites/index.html']) assert.match(lire(f), /<body class="loin">/, f + ' : logo et fond dès l\'arrivée');
  const c = lire('compte/index.html'), haut = c.match(/<header class="tete">[\s\S]*?<\/header>/)[0];
  assert.ok(!/versAutre|sortir|Mes projets|Mon compte|<button/.test(haut), 'en-tête du compte : le logo seul');
  assert.match(c, /id="dock-site"/); assert.match(c, /AIMEPlus\.brancher\(el\)/);
  const e = require('../dock/modele.js').composer({ famille: 'Public connecté' });
  assert.deepEqual(e.lieux.map(x => x.nom), ['AI', 'ME'], 'connecté : AI (Mes projets) et ME (Mon compte) sont des lieux du Dock, pas des entrées du + (25/10)');
  assert.match(c, /id="seDeconnecter"/, 'Se déconnecter : dans Mon compte');
  assert.match(lire('point-zero/index.html'), /<meta name="robots" content="noindex">/);
  assert.match(c, /href="\/point-zero\/\?intention=identite">Mon timbre</, 'Compte → Mon timbre');
  for (const f of ['index.html', 'exemples/index.html', 'contact/index.html', 'capacites/index.html', 'nav/registre.js', 'dock/modele.js']) assert.ok(!lire(f).includes('/point-zero/'), f + ' : le Point Zéro n\'est pas une seconde accueil');
});
