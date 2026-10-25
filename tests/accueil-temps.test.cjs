/* L'accueil, section Temps : l'aperçu se choisit et se zoome.
   Ce que ces tests protègent : la fenêtre de zoom ne dépasse jamais 24 h et garde la fin après minuit ; le cadran zoomé
   ne dessine que la vue filtrée reçue du moteur (jamais un moment qu'une place ne reçoit pas) ; le détail annoncé et le
   nom accessible des boutons disent la même chose que la vue ; en Circle le cadran est seul (25/10), ses arcs sont les
   boutons et le chemin clavier ; aucune règle de visibilité n'est recopiée dans le navigateur. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const A = require('../accueil/temps.js'), D = require('../modules/temps/demo-camille-gabriel.json'), C = require('../modules/temps/cercle.js');

test('la fenêtre de zoom : 30 min de marge, la fin après minuit gardée, jamais plus de 24 h', () => {
  const camille = A.preparer(D, 'camille').vue, bal = camille.moments.find(m => m.id === 'bal');
  assert.equal(bal.debut, '22:00'); assert.equal(bal.fin, '01:30');
  const f = A.fenetreMoment(bal);
  assert.deepEqual(f, { debut: 21 * 60 + 30, fin: 26 * 60, duree: 270, jour: false }, '21:30 → 02:00 : la fin après minuit n’est pas rabattue sur 1440');
  for (const m of camille.moments) {
    const x = A.fenetreMoment(m);
    assert.ok(x.fin > x.debut && x.duree >= 60 && x.duree <= C.JOUR, m.id + ' : une fenêtre lisible, bornée à 24 h');
    assert.ok(x.debut >= 0 && x.debut % 30 === 0 && x.fin % 30 === 0, m.id + ' : des bornes rondes, sur la demi-heure');
  }
  assert.deepEqual(A.fenetreMoment({ dm: 1425, fm: 1440, debut: '23:45', fin: '00:00' }), { debut: 1380, fin: 1440, duree: 60, jour: false }, 'un moment de moins d’une heure est élargi à une heure, sans déborder');
});

test('le cadran zoomé se resserre sur le moment choisi', () => {
  const vue = A.preparer(D, 'camille').vue, bal = vue.moments.find(m => m.id === 'bal');
  assert.equal(A.modeleCercle(vue).arcs.length, vue.moments.length, 'sans choix : la journée entière, tous les moments');
  const M = A.modeleCercle(vue, A.fenetreMoment(bal));
  assert.ok(M.arcs.some(a => a.id === 'bal'), 'le moment choisi reste dessiné');
  assert.ok(M.arcs.length < vue.moments.length, 'la fenêtre écarte les moments du matin');
  for (const a of M.arcs) assert.ok(a.a0 >= 0 && a.a1 <= 360, a.id + ' : tout arc zoomé tient dans le tour');
  assert.deepEqual(M.graduations.map(g => C.hm(g.minute)), ['22:00', '23:00', '00:00', '01:00', '02:00'], 'une heure lisible par graduation, même après minuit');
});

test('le détail d’un moment dit exactement ce que la vue contient', () => {
  const vue = A.preparer(D, 'camille').vue, bal = vue.moments.find(m => m.id === 'bal');
  const t = A.resumeMoment(bal);
  assert.equal(t, 'Ouverture du bal · 22:00 – 01:30 (lendemain) · Grange');
  const cocktail = vue.moments.find(m => m.id === 'cocktail');
  assert.match(A.resumeMoment(cocktail), /^Cocktail · 16:00 – 18:30 · Terrasse/);
  /* un invariant : rien de ce que les rôles cachent ne peut apparaître dans le texte */
  assert.ok(!/note|responsable|audience|gestes/.test(A.resumeMoment(cocktail)), 'aucun champ interne dans le détail');
});

test('l’accueil : le cadran seul dans l’iPhone, chaque arc est un bouton, le détail annoncé, le retour à la journée', () => {
  const z = lire('index.html'), js = lire('accueil/temps.js'), css = lire('accueil/vitrine.css');
  /* 25/10 (nuit) : l'aperçu séparé du Temps a quitté la page ; le cadran vit dans l'iPhone des cinq temps. */
  assert.ok(!z.includes('id="tempsDemoQui"'), 'plus de second aperçu du Temps sur l’accueil');
  for (const id of ['vCercle', 'vCercleDit', 'vCercleT', 'vCercleD', 'vRetour'])
    assert.ok(z.includes('id="' + id + '"'), 'l’iPhone : #' + id);
  assert.ok(!z.includes('id="tempsDemoMomentsCercle"'), 'aucune liste de moments sous le cadran Circle');
  assert.match(z, /<svg[^>]*id="vCercle"[^>]*role="group"/, 'le cadran est un groupe de boutons nommé');
  assert.match(z, /<p class="v-p-dit" id="vCercleDit"><\/p>/, 'une ligne dit le moment choisi');
  assert.match(js, /setAttribute\('role','button'\)/, 'chaque arc est un bouton');
  assert.match(js, /setAttribute\('tabindex','0'\)/, 'chaque arc reçoit le clavier');
  assert.match(js, /e\.key==='Enter'/, 'Entrée choisit l’arc');
  assert.match(js, /setAttribute\('aria-pressed',a\.id===choix/, 'le moment choisi est marqué');
  /* le rendu reconstruit les arcs : sans ce rappel, le clavier perdrait son arc à chaque choix */
  assert.match(js, /setAttribute\('data-moment',a\.id\)/, 'chaque arc porte son moment');
  assert.match(js, /focus\(\{preventScroll:true\}\)/, 'le focus est rendu sans faire sauter la page');
  for (const r of ['.v-temps-item:focus-visible', '.v-temps-item[aria-current="true"]', '.v-td-choix', '.v-td-arc.est-choisi', '.v-td-arc:focus-visible'])
    assert.ok(css.includes(r), r);
  assert.match(css, /\.v-td-arc\{[^}]*pointer-events:stroke/, 'l’arc se clique, sans bloquer le survol du cadran');
});

test('le zoom ne dessine que la vue reçue : une invitée ne voit pas un moment qu’elle ne reçoit pas', () => {
  const emma = A.preparer(D, 'emma').vue, camille = A.preparer(D, 'camille').vue;
  const siens = emma.moments.map(m => m.id);
  assert.deepEqual(siens, ['ceremonie', 'cocktail', 'diner', 'discours', 'bal']);
  const bal = camille.moments.find(m => m.id === 'bal'), f = A.fenetreMoment(bal);
  /* même en fabriquant la fenêtre d'un moment d'une autre place, le modèle ne peut placer que la vue d'Emma */
  const M = A.modeleCercle(emma, f);
  assert.deepEqual([...new Set(M.arcs.map(a => a.id))].filter(id => !siens.includes(id)), [], 'aucun moment ajouté par la fenêtre');
  assert.ok(M.arcs.length <= siens.length);
  /* et le cadran de l'accueil ne recalcule aucune règle : il délègue au moteur et au cercle déjà testés */
  const js = lire('accueil/temps.js');
  assert.match(js, /T:require\('\.\.\/modules\/temps\/moteur\.js'\)/);
  assert.match(js, /C:require\('\.\.\/modules\/temps\/cercle\.js'\)/);
  assert.match(js, /P:require\('\.\.\/synchroview\/permissions\.js'\)/);
  assert.ok(!/(visibilite|audience|permissions\.)/.test(js.replace(/P:require\([^)]*\)/, '')), 'aucune règle recopiée à la main');
});
