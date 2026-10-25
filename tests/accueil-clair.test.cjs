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

test("l'accueil : une seule page, cinq temps, un seul iPhone — ni vidéo, ni couleur d'accent en plus de l'orbe", () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), js = lire('accueil/vitrine.js');
  /* 25/10 (soir) : plus aucune vidéo de présentation — la page s'allège */
  assert.ok(!/<video|data-video|id="lecteur"/.test(z), 'aucune vidéo de présentation sur l’accueil');
  assert.ok(!/\.v-film|\.vg-b|\.lecteur/.test(css), 'ni leurs styles');
  /* 25/10 (nuit) : cinq temps, un seul iPhone, un seul titre de niveau 1 */
  assert.equal((z.match(/<article class="etape"/g) || []).length, 5, 'cinq temps exactement');
  assert.equal((z.match(/class="v-p-scene"/g) || []).length, 1, 'un seul iPhone');
  assert.equal((z.match(/<h1\b/g) || []).length, 1, 'un seul titre de niveau 1');
  assert.ok(!/id="vTels"|id="mosaique"|id="v-rangs"/.test(z), 'les sept téléphones, le carrousel et les anciennes sections ont quitté la page');
  /* chaque section dit ce que le téléphone doit montrer : le temps lu choisit l'écran */
  for (const a of ['data-etape', 'data-place', 'data-niveau', 'data-onglet'])
    assert.ok(z.includes(a), a + ' : la section déclare son écran');
  assert.match(js, /getAttribute\('data-place'\)/, 'la place vient de la section');
  assert.match(js, /getAttribute\('data-onglet'\)/, 'l’onglet aussi');
  /* une seule couleur d'accent : celle de l'orbe */
  assert.match(css, /--accent:#111114/, 'l’accent est défini une fois : le noir (25/10, le bleu-violet ne va pas)');
  assert.match(css, /\.clair \.bouton,\.v-btn\{[^}]*background:#111114/, 'les boutons principaux sont noirs (25/10 : le bleu-violet ne va pas)');
  /* les données des sept places restent la source de la démonstration (telephones() est pur) */
  const surprise = V.telephones('surprise');
  assert.equal(surprise.filter(t => t.on).length, 3, 'la surprise ne réveille que trois écrans');
  assert.equal(surprise.length - surprise.filter(t => t.on).length, 4, 'quatre restent silencieux');
});

test("l'iPhone de « Chacun son écran » : un fond par place, et le vrai cadran Circle (modules/temps/cercle.js)", () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), C = require('../modules/temps/cercle.js');
  assert.match(z, /<div class="v-cinq-tele">[\s\S]*<div class="v-p-scene">/, 'un seul iPhone, et il reste en place pendant que le texte défile');
  assert.ok(!/v-fonds|data-fond/.test(z), 'plus de fond en couleur derrière l’écran (25/10, soir)');
  assert.match(z, /<svg class="v-p-cadran" id="vCercle"[^>]*role="group"/, 'le cadran de l iPhone est un groupe nommé (ses arcs sont les boutons)');
  /* 25/10 : le cadran est seul dans l'iPhone, plus de liste de moments en dessous */
  assert.ok(!z.includes('id="vMoments"'), 'aucune liste de moments sous le cadran');
  assert.match(z, /<p class="v-p-dit" id="vCercleDit"><\/p>/, 'une ligne dit le moment choisi (la page est déjà une zone vivante)');
  assert.match(lire('accueil/vitrine.js'), /noms\[m\.id\]=m\.titre/, 'chaque arc porte son nom accessible');
  for (const r of ['.v-p-cadran', '.v-p-ecran']) assert.ok(css.includes(r), r + ' stylé');
  for (const pl of V.PLACES) {
    const k = V.cadran(pl.id), M = C.modele(k, { rayon: 352, epaisseur: 40, ecart: 9 });
    assert.deepEqual(k.moments.map(m => m.id), V.composer(pl.id).vus.map(m => m.id), pl.id + ' : le cadran reçoit exactement la vue de la place');
    assert.equal(M.arcs.length, k.moments.length, pl.id + ' : un arc par moment reçu');
    for (const m of k.moments) assert.ok(m.debut && m.fin && m.dm >= 0 && m.fm > m.dm, pl.id + ' · ' + m.id);
  }
  const bal = V.cadran('owner').moments.find(m => m.id === 'bal');
  assert.deepEqual([bal.debut, bal.fin, bal.dm, bal.fm], ['22:00', '01:00', 1320, 1500], 'le bal finit après minuit');
  assert.equal(V.cadran('guest').moments.length, 4, 'une place ne dessine que ce qu elle reçoit');
  assert.match(lire('accueil/vitrine.js'), /etat\.decale=a\.getAttribute\('data-decale'\)==='true'/, 'le changement se lit dans la section, pas dans un bouton');
  const js = lire('accueil/temps.js'), v = lire('accueil/vitrine.js');
  assert.match(v, /AIMETempsAccueil\.dessiner|root\.AIMETempsAccueil\.dessiner/, 'le même dessin que l aperçu public');
  /* le cadran n'est jamais recopié : il vient de AIMETempsAccueil.dessiner. Seules les icônes du Dock sont dessinées ici. */
  assert.ok(!/arcPathAt|polarXY|svgEl\(/.test(v), 'aucun cadran recopié dans la vitrine');
  assert.match(js, /return\{[^}]*dessiner:dessiner/, 'le dessin est partagé');
});

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
      assert.ok(x.voit && x.role, x.nom + ' dit ce qu\'elle voit et son rôle (le Dock est le même pour tous)');
      for (const m of x.moments) assert.ok(m.heure && m.titre, x.nom + ' (' + x.role + ') affiche heure et titre : ' + m.titre);
    }
  }
  const surprise = V.telephones('surprise');
  const mariee = surprise.find(x => x.nom === 'La mariée');
  assert.equal(mariee.on, false, 'la surprise ne sonne pas chez la mariée');
  const invite = surprise.find(x => x.id === 'invite');
  assert.deepEqual(invite.moments.map(m => m.titre), ['Cérémonie', 'Cocktail'], 'l\'invité ne voit que ses moments publics');
  const js = lire('accueil/vitrine.js'), css = lire('accueil/vitrine.css'), z = lire('index.html');
  /* 25/10 (nuit) : la page ne dessine plus sept téléphones — un seul iPhone. Ce qui reste testé ici, c'est la donnée
     des sept places (mission, moments filtrés, ce que chacune voit), pas leur mise en page. */
  assert.ok(!/id="vTels"/.test(z), 'plus de grille de sept téléphones');
  for (const cls of ['v-p-haut', 'v-p-page', 'v-p-liste']) assert.ok(z.includes(cls) || css.includes('.' + cls), cls + ' rendu et stylé');
  /* le Dock est UN composant : AI | + | ME, dans l'iPhone comme partout ailleurs */
  assert.match(js, /function poserDocks\(\)/, 'un seul dessin de Dock');
  assert.match(js, /\['ai','AI'\],null,\['me','ME'\]/, 'AI, +, ME');
  assert.equal((z.match(/class="v-p-dock"/g) || []).length, 1, 'un seul Dock : celui de l’iPhone');
  /* le 25/10 : AI est le tableau de bord (le mois, puis la date ouverte en profondeur), le + choisit la place */
  const cal = V.calendrier(V.JOUR.annee, V.JOUR.mois);
  assert.equal(cal.cases.filter(Boolean).length, new Date(V.JOUR.annee, V.JOUR.mois + 1, 0).getDate(), 'le mois compte tous ses jours');
  assert.equal(cal.cases.filter(c => c && c.jourJ).length, 1, 'une seule date pleine : le jour J');
  assert.equal(cal.cases[0], null, 'la grille commence un lundi (cases vides avant le 1er)');
  for (const k of ['v-cal-jour', 'v-onglet', 'data-vue="programme"', 'data-vue="cercle"', 'data-vue="personnes"', 'id="vRetour"', 'id="vPersonnes"', 'id="vListe"'])
    assert.ok(z.includes(k) || css.includes('.' + k), 'le jour ouvert : ' + k);
  assert.equal((z.match(/class="v-onglet"/g) || []).length, 3, 'trois onglets : Programme, Circle, Personnes');
  assert.match(js, /etat\.onglet/, 'l\'onglet actif commande le corps');
  assert.match(js, /data-ai="basculer"|ai==='basculer'/, 'AI ramène au calendrier');
  assert.match(js, /v-plus-i/, 'le + ouvre la liste des places');
  assert.match(js, /menuitemradio/, 'le choix de la place est un menu de rôles, pas un bouton muet');
  assert.match(js, /choisirPlus/, 'choisir une place recompose AI');
  assert.ok(!/fetch\(/.test(js) && !/localStorage\.setItem/.test(js), 'la vitrine n\'écrit rien et n\'envoie rien');
});

test('l\'accueil : clair, lisible, aucune page /aime/ — les cinq temps et l\'inscription dans la page', () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), js = lire('accueil/vitrine.js');
  assert.match(z, /<body class="clair">/); assert.match(z, /<main id="haut">/);
  assert.match(z, /id="ecrans"/); assert.match(z, /id="entree"/);
  assert.ok(!/href="\/aime\/"/.test(z), 'Le Monde AIME (cartes postales, cube) reste à part');
  for (const sec of ['#ecrans', '.v-cinq', '.etape', '#entree', '.v-inscrire']) assert.ok(css.includes(sec), 'mise en page définie pour ' + sec);
  /* 25/10 : sur mobile, l'iPhone est collé en haut ; l'écran est réduit d'un bloc (échelle), jamais écrasé */
  assert.match(css, /@media \(max-width:900px\)\{[\s\S]*\.v-cinq-tele\{--s:[\d.]+;position:sticky;top:0/, 'sur mobile, le téléphone colle en haut');
  assert.match(css, /\.v-cinq-tele \.v-p-scene\{width:340px;flex:none;transform:scale\(var\(--s\)\)/, 'l’écran garde ses proportions : il est mis à l’échelle');
  /* l'inscription est dans la page, et rien n'est envoyé sans le bouton */
  assert.match(z, /<form id="vInscription"[^>]*novalidate/, 'le formulaire du cinquième temps');
  assert.match(js, /AIMEAttente\.bloc\(f\)/, 'le même service que la capsule, pas un second serveur');
  assert.ok(!/localStorage\.setItem/.test(js) && !/fetch\(/.test(js), 'la vitrine n\'écrit rien et n\'envoie rien elle-même');
});

test('l\'accueil montre le Temps dans l\'iPhone : le cadran du module, une seule fois, et la bonne vue', () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), A = require('../accueil/temps.js'), D = require('../modules/temps/demo-camille-gabriel.json');
  const s = z.slice(z.indexOf('id="ecrans"'), z.indexOf('</section>'));
  for (const t of ['v-p-scene', 'v-p-cadran', 'Circle', 'Programme', 'Jour J']) assert.ok(s.includes(t), t);
  assert.ok(!/tempsDemoSvg|tempsDemoQui/.test(z), 'l’ancien aperçu du Temps a quitté la page : le cadran vit dans l’iPhone');
  assert.ok(!s.includes('v-rangs') && !css.includes('.v-rangs'), 'plus de cartes colorées horizontales');
  assert.ok(z.indexOf('/live/modele.js') < z.indexOf('/modules/temps/moteur.js') && z.indexOf('/modules/temps/moteur.js') < z.indexOf('/accueil/temps.js'), 'les moteurs existants chargent avant l’aperçu');
  const invitee = A.preparer(D, 'emma'), proprietaire = A.preparer(D, 'camille');
  assert.equal(proprietaire.vue.moments.length, 9); assert.deepEqual(invitee.vue.moments.map(m => m.id), ['ceremonie', 'cocktail', 'diner', 'discours', 'bal']);
  assert.deepEqual(A.modeleCercle(invitee.vue).arcs.map(a => a.id), invitee.vue.moments.map(m => m.id), 'Circle dessine exactement la même vue autorisée');
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
