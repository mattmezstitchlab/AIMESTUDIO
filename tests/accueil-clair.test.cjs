// L'accueil clair et l'alignement visuel P1 (25/10/2026) :
// 1. « Un projet. Chacun son écran. » compose la page de chaque place avec les VRAIES règles (synchroview/permissions.js) et la couleur de chaque place (coeur/roles.js).
// 2. Les sept téléphones affichent un vrai écran par personne (notification, moments selon ses permissions, mission, mini-Dock) et n'allument que les écrans concernés.
// 3. /, AI (/projets/), ME (/compte/), le projet (Programme inclus) et /c/ partagent le même langage clair (dégradé franc sans photo, blocs blancs, texte noir, contraste WCAG 2.2 AA).
// 4. /aime/ et /cube/ redirigent vers /, et #meDecouvrir pointe vers /#ecrans.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const V = require('../accueil/vitrine.js'), R = require('../coeur/roles.js'), P = require('../synchroview/permissions.js');
const lire = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const titres = (p, e) => V.composer(p, e).vus.map(m => m.titre);

function lum(hex) {
  const m = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('chacun son écran : le couple et la coordination voient tout ; le DJ, sans l\'organisation ; l\'invitée, le public seulement', () => {
  assert.equal(titres('owner').length, V.MOMENTS.length);
  assert.deepEqual(titres('editor'), titres('owner'));
  assert.ok(!titres('contributor').includes('Brief traiteur') && titres('contributor').includes('Set cocktail du DJ'));
  assert.deepEqual(titres('guest'), ['Cérémonie', 'Cocktail', 'Dîner', 'Premier bal']);
  assert.equal(V.composer('guest').caches, 3, 'ce qui n\'est pas lu est compté, jamais envoyé');
});

test('le réel bouge : seule l\'organisation peut décaler ; le décalage et le plan B se voient sur chaque place concernée', () => {
  assert.equal(V.composer('owner').decaler, true); assert.equal(V.composer('editor').decaler, true);
  assert.equal(V.composer('contributor').decaler, false); assert.equal(V.composer('guest').decaler, false);
  const g = V.composer('guest', { decale: true, planB: true }).vus;
  assert.equal(g.find(m => m.titre === 'Cocktail').heure, '16:15'); assert.match(g.find(m => m.titre === 'Cérémonie').lieu, /Orangerie/);
  assert.equal(V.composer('guest').vus.find(m => m.titre === 'Cocktail').heure, '16:00');
});

test('une couleur par place, la même partout (coeur/roles.js)', () => {
  for (const p of V.PLACES) assert.equal(V.composer(p.id).couleur, R.couleur(p.id));
  assert.deepEqual(V.PLACES.map(p => p.place), ['J’organise', 'Je coordonne', 'Je contribue', 'Je participe']);
});

test('les sept téléphones : un vrai écran par personne (mission, moments filtrés par permissions.js, notification, mini-Dock), seuls les concernés s\'allument', () => {
  for (const e of V.EVTS) {
    const t = V.telephones(e.id);
    assert.equal(t.length, 7);
    assert.equal(t.filter(x => x.on).length, Object.keys(e.m).length, e.id);
    for (const x of t) {
      assert.ok(x.mission && x.mission.length > 6, x.nom + ' a une mission affichée');
      assert.ok(Array.isArray(x.moments) && x.moments.length === 2, x.nom + ' montre 2 moments à venir');
      assert.ok(Array.isArray(x.dock) && x.dock.length === 3, x.nom + ' a son mini-Dock');
      for (const m of x.moments) assert.ok(m.heure && m.titre, x.nom + ' (' + x.role + ') affiche heure et titre : ' + m.titre);
    }
  }
  const surprise = V.telephones('surprise');
  const mariee = surprise.find(x => x.nom === 'La mariée');
  assert.equal(mariee.on, false, 'la surprise ne sonne pas chez la mariée');
  const invite = surprise.find(x => x.id === 'invite');
  assert.deepEqual(invite.moments.map(m => m.titre), ['Cérémonie', 'Cocktail'], 'l\'invité ne voit que ses moments publics');
  const js = lire('accueil/vitrine.js'), css = lire('accueil/vitrine.css');
  assert.ok(!/\.aplat\b/.test(js), 'plus de carré de couleur vide dans les 7 téléphones');
  for (const cls of ['vt-haut', 'vt-notif', 'vt-bloc', 'vt-moments', 'vt-dock']) assert.ok(js.includes(cls) && css.includes('.' + cls), cls + ' rendu et stylé');
});

test('l\'accueil : clair, dégradés francs, le manifeste, la mosaïque gardée, l\'agent dit « En préparation », aucune page /aime/', () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css');
  assert.match(z, /<body class="clair">/); assert.match(z, /id="vTels"/); assert.match(z, /href="\/exemples\/mosaique\/"/);
  assert.match(z, /Agent <span class="v-pil"[^>]*>En préparation<\/span>/, 'rien n\'est simulé comme existant');
  assert.ok(!/href="\/aime\/"/.test(z), 'Le Monde AIME (cartes postales, cube) reste à part');
  for (const sec of ['.clair .zero', '#ecrans', '#mosaique', '#capacites', '#protection', '#domaines', '#entree']) {
    assert.ok(css.includes(sec), 'fond dégradé défini pour ' + sec);
  }
  assert.ok(!/\.v-tel\.eteint\{[^}]*opacity:/.test(css) && !/\.v-doms li\.venir\{[^}]*opacity:/.test(css), 'aucune baisse d\'opacité qui dégraderait le contraste AA');
});

test('AI, ME, l\'écran de projet (Programme compris) et /c/ partagent le même langage clair (dégradé sans photo, blocs blancs, texte noir, contraste AA)', () => {
  const cptHtml = lire('compte/index.html'), cptCss = lire('compte/compte.css'), tpCss = lire('modules/temps/temps.css');
  const dockCss = lire('dock/dock.css'), cHtml = lire('c/index.html'), carteSvg = lire('carte/rendu.js');
  assert.match(cptHtml, /<body class="clair">/, '/compte/ et /projets/ sont en thème clair');
  assert.ok(!/fleuriste-terrasse/.test(cptHtml) && !/fleuriste-terrasse/.test(cptCss), 'aucune photo de fond dans AI, ME ou le projet');
  assert.match(cptHtml, /href="\/#ecrans">Le cœur<\/a>/, 'lien ME « Le cœur » corrigé vers #ecrans');
  assert.ok(!cptHtml.includes('/#coeur'), 'plus d\'ancre cassée /#coeur');
  assert.ok(lire('index.html').includes('id="ecrans"'), '#ecrans existe bien sur l\'accueil');
  assert.match(cptCss, /\.carte-c\{[^}]*background:#FFFFFF/, 'blocs blancs dans ME / AI / projet');
  assert.match(tpCss, /\.tp-m\{[^}]*background:#FFFFFF/, 'moments blancs dans Programme');
  assert.match(tpCss, /\.tp-face\{fill:#FFFFFF\}/, 'cadran Circle 24 h clair (CSS seul, DOM SVG intact)');
  assert.ok(!/\.tp-m\.fait\{[^}]*opacity:/.test(tpCss), 'aucune baisse d\'opacité sur les moments passés');
  assert.match(dockCss, /\.clair \.dock-zone\{--dk-fond:rgba\(255,255,255/, 'Dock clair');
  assert.match(dockCss, /\.clair \.dock-zone \.dock-menu[^{]*\{background:#FFFFFF/, 'menu + blanc en thème clair');
  assert.match(cHtml, /<body class="clair">/, 'la Carte publique /c/ est en thème clair');
  assert.match(cHtml, /\.cp-rub section\{background:#FFFFFF/, 'rubriques blanches sur /c/');
  assert.ok(carteSvg.includes('fill="#F8F6FF"') && carteSvg.includes('fill="#FFFFFF"') && carteSvg.includes('fill="#111116"'), 'aperçu SVG de la Carte en thème clair');

  // Vérification mathématique WCAG 2.2 AA (≥ 4.5:1) sur tous les couples texte / fond clair (blanc et stops des dégradés)
  const fonds = ['#FFFFFF', '#F7F7FB', '#F4F4FA', '#EDE6FF', '#FFD6E4', '#E2DAFF', '#C9F0FF', '#FFC6D6', '#BDE9FF', '#FFE0AE', '#DDD2FF', '#C4EAFF', '#FDE2EC'];
  for (const bg of fonds) {
    assert.ok(contraste('#111116', bg) >= 10, '#111116 sur ' + bg + ' ≥ 10:1');
    assert.ok(contraste('#363644', bg) >= 6, '#363644 sur ' + bg + ' ≥ 6:1');
  }
  for (const [fg, bg] of [['#4C1D95', '#EDE9FE'], ['#065F46', '#D1FAE5'], ['#991B1B', '#FEF2F2'], ['#92400E', '#FEF3C7'], ['#155E75', '#ECFEFF'], ['#9A3412', '#FFFFFF'], ['#B91C1C', '#FFFFFF'], ['#0E7490', '#FFFFFF'], ['#4C28E8', '#FFFFFF']]) {
    assert.ok(contraste(fg, bg) >= 4.5, fg + ' sur ' + bg + ' respecte WCAG AA (' + contraste(fg, bg).toFixed(2) + ':1)');
  }
});
