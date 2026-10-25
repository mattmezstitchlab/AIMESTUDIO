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

test("l'accueil allégé : trois téléphones d'abord (les concernés), les autres sur demande, et le film à part", () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), js = lire('accueil/vitrine.js');
  assert.match(z, /<button type="button" class="v-btn2" id="vTelsTous" aria-pressed="false" aria-controls="vTels">/, 'un seul bouton pour ouvrir les autres écrans');
  assert.match(css, /\.v-tels:not\(\.tous\) \.v-tel\.cache\{display:none\}/, 'les écrans non concernés sont masqués, pas grisés');
  assert.match(js, /el\('li','v-tel'\+\(t\.on\?' allume':' eteint'\)\+\(t\.on\?'':' cache'\)\)/, 'la classe est posée sur ceux qui ne réagissent pas');
  const surprise = V.telephones('surprise');
  assert.equal(surprise.filter(t => t.on).length, 3, 'la surprise ne réveille que trois écrans');
  assert.equal(surprise.length - surprise.filter(t => t.on).length, 4, 'quatre restent silencieux : c’est ce que dit le bouton');
  /* le film quitte le haut de page : il devient une section discrète, après les domaines */
  assert.ok(!z.slice(z.indexOf('id="haut"'), z.indexOf('id="ecrans"')).includes('class="vg"'), 'plus de vidéos dans le premier écran');
  assert.match(z, /<section class="v-sec v-film"[\s\S]*class="vg"/, 'le film a sa section');
  assert.ok(z.indexOf('id="domaines"') < z.indexOf('v-film'), 'le film passe après les domaines');
  /* un chapeau, plus un slogan, au-dessus des trois cartes */
  assert.match(z, /<h2 class="v-kick" id="tCap">Ce que le produit sait faire<\/h2>/);
  assert.ok(!z.includes('Une architecture.'), 'le troisième slogan a disparu');
  assert.ok(!z.includes('Créer. Relier. Transformer.'), 'les trois mots sous le manifeste aussi');
  /* une seule couleur d'accent : celle de l'orbe */
  assert.match(css, /--accent:#4C28E8/, 'l’accent est défini une fois');
  assert.match(css, /\.clair \.bouton,\.v-btn\{[^}]*background:var\(--accent\)/, 'les boutons prennent l’accent');
});

test("l'iPhone de « Chacun son écran » : un fond par place, et le vrai cadran Circle (modules/temps/cercle.js)", () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), C = require('../modules/temps/cercle.js');
  assert.match(z, /<div class="v-hero" id="vHero">/, 'un seul écran, plus le grand bloc vertical');
  assert.deepEqual([...z.matchAll(/data-fond="([a-z]+)"/g)].map(m => m[1]), V.PLACES.map(p => p.id), 'un fond par place, dans l ordre des places');
  assert.match(z, /<svg class="v-p-cadran" id="vCercle"[^>]*role="group"/, 'le cadran de l iPhone est un groupe nommé (ses arcs sont les boutons)');
  /* 25/10 : le cadran est seul dans l'iPhone, plus de liste de moments en dessous */
  assert.ok(!z.includes('id="vMoments"'), 'aucune liste de moments sous le cadran');
  assert.match(z, /<p class="v-p-dit" id="vCercleDit"><\/p>/, 'une ligne dit le moment choisi (la page est déjà une zone vivante)');
  assert.match(lire('accueil/vitrine.js'), /noms\[m\.id\]=m\.titre/, 'chaque arc porte son nom accessible');
  for (const r of ['.v-fond.on', '.v-p-cadran', '.v-p-ecran']) assert.ok(css.includes(r), r + ' stylé');
  for (const pl of V.PLACES) {
    const k = V.cadran(pl.id), M = C.modele(k, { rayon: 352, epaisseur: 40, ecart: 9 });
    assert.deepEqual(k.moments.map(m => m.id), V.composer(pl.id).vus.map(m => m.id), pl.id + ' : le cadran reçoit exactement la vue de la place');
    assert.equal(M.arcs.length, k.moments.length, pl.id + ' : un arc par moment reçu');
    for (const m of k.moments) assert.ok(m.debut && m.fin && m.dm >= 0 && m.fm > m.dm, pl.id + ' · ' + m.id);
  }
  const bal = V.cadran('owner').moments.find(m => m.id === 'bal');
  assert.deepEqual([bal.debut, bal.fin, bal.dm, bal.fm], ['22:00', '01:00', 1320, 1500], 'le bal finit après minuit');
  assert.equal(V.cadran('guest').moments.length, 4, 'une place ne dessine que ce qu elle reçoit');
  assert.match(lire('accueil/vitrine.js'), /r\.decaler&&etat\.planB\?'Revenir au jardin':'Il pleut : basculer en plan B'/, 'une place qui ne peut pas basculer ne lit pas « Revenir au jardin »');
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
  assert.ok(!/\.aplat\b/.test(js), 'plus de carré de couleur vide dans les 7 téléphones');
  for (const cls of ['vt-haut', 'vt-notif', 'vt-bloc', 'vt-moments']) assert.ok(js.includes(cls) && css.includes('.' + cls), cls + ' rendu et stylé');
  /* le Dock est UN composant : AI | + | ME dans les sept téléphones comme dans l'iPhone du héros */
  assert.match(js, /function poserDocks\(\)/, 'un seul dessin de Dock');
  assert.match(js, /\['ai','AI'\],null,\['me','ME'\]/, 'AI, +, ME');
  assert.ok((z.match(/class="v-p-dock"/g) || []).length >= 2, 'le Dock est dans les deux grands écrans');
  /* le 25/10 : AI est le tableau de bord (le mois, puis la date ouverte en profondeur), le + choisit la place */
  const cal = V.calendrier(V.JOUR.annee, V.JOUR.mois);
  assert.equal(cal.cases.filter(Boolean).length, new Date(V.JOUR.annee, V.JOUR.mois + 1, 0).getDate(), 'le mois compte tous ses jours');
  assert.equal(cal.cases.filter(c => c && c.jourJ).length, 1, 'une seule date pleine : le jour J');
  assert.equal(cal.cases[0], null, 'la grille commence un lundi (cases vides avant le 1er)');
  for (const k of ['v-cal-jour', 'v-onglet', 'data-vue="programme"', 'data-vue="cercle"', 'data-vue="personnes"', 'id="vRetour"', 'id="vPersonnes"', 'id="vListe"'])
    assert.ok(z.includes(k) || css.includes('.' + k), 'le jour ouvert : ' + k);
  assert.ok((z.match(/class="v-onglet"/g) || []).length >= 5, 'les onglets sont dans AI et dans le Temps');
  assert.match(js, /etat\.onglet/, 'l\'onglet actif commande le corps');
  assert.match(js, /data-ai="basculer"|ai==='basculer'/, 'AI ramène au calendrier');
  assert.match(js, /v-plus-i/, 'le + ouvre la liste des places');
  assert.match(js, /menuitemradio/, 'le choix de la place est un menu de rôles, pas un bouton muet');
  assert.match(js, /choisirPlus/, 'choisir une place recompose AI');
  assert.ok(!/fetch\(/.test(js) && !/localStorage\.setItem/.test(js), 'la vitrine n\'écrit rien et n\'envoie rien');
});

test('l\'accueil : clair, dégradés francs, le manifeste, la mosaïque gardée, l\'agent dit « En préparation », aucune page /aime/', () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css');
  assert.match(z, /<body class="clair">/); assert.match(z, /id="vTels"/); assert.match(z, /href="\/exemples\/mosaique\/"/);
  assert.match(z, /Agent <span class="v-pil"[^>]*>En préparation<\/span>/, 'rien n\'est simulé comme existant');
  assert.ok(!/href="\/aime\/"/.test(z), 'Le Monde AIME (cartes postales, cube) reste à part');
  for (const sec of ['.clair .zero', '#ecrans', '#mosaique', '#capacites', '#temps', '#domaines', '#entree']) {
    assert.ok(css.includes(sec), 'fond dégradé défini pour ' + sec);
  }
  assert.ok(!/\.v-tel\.eteint\{[^}]*opacity:/.test(css) && !/\.v-doms li\.venir\{[^}]*opacity:/.test(css), 'aucune baisse d\'opacité qui dégraderait le contraste AA');
});

test('l\'accueil remplace le carrousel coloré par le vrai aperçu du Temps : programme filtré et Circle', () => {
  const z = lire('index.html'), css = lire('accueil/vitrine.css'), A = require('../accueil/temps.js'), D = require('../modules/temps/demo-camille-gabriel.json');
  const s = z.slice(z.indexOf('<!-- 5'), z.indexOf('<!-- 6'));
  for (const t of ['Le Temps', 'Programme', 'Circle', 'Jour J', 'Retrouver le Temps dans AI', 'tempsDemoQui', 'tempsDemoSvg']) assert.ok(s.includes(t), t);
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
