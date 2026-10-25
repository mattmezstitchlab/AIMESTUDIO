/* L'accueil, section Temps : l'aperçu se choisit et se zoome.
   Ce que ces tests protègent : la fenêtre de zoom ne dépasse jamais 24 h et garde la fin après minuit ; le cadran zoomé
   ne dessine que la vue filtrée reçue du moteur (jamais un moment qu'une place ne reçoit pas) ; le détail annoncé et le
   nom accessible des boutons disent la même chose que la vue ; le cadran reste une image (role="img"), la légende est le
   chemin clavier ; aucune règle de visibilité n'est recopiée dans le navigateur. */
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

test('l’accueil : légende de boutons, détail annoncé, retour à la journée ; le cadran reste une image', () => {
  const z = lire('index.html'), js = lire('accueil/temps.js'), css = lire('accueil/vitrine.css');
  for (const id of ['tempsDemoDetail', 'tempsDemoJour', 'tempsDemoLegende', 'tempsDemoMoments', 'tempsDemoMomentsCercle'])
    assert.ok(z.includes('id="' + id + '"'), id);
  assert.match(z, /<(p)[^>]*id="tempsDemoDetail"[^>]*aria-live="polite"/, 'le détail est annoncé');
  assert.match(z, /<button[^>]*id="tempsDemoJour"[^>]*hidden/, 'le retour est caché au départ');
  assert.match(z, /<svg[^>]*id="tempsDemoSvg"[^>]*role="img"/, 'le cadran reste une image pour les technologies d’assistance');
  assert.ok(!/setAttribute\('tabindex'/.test(js), 'aucun arc focusable : le clavier passe par les boutons de la légende');
  assert.match(js, /createElement\('button'|el\('button'/, 'la légende est faite de vrais boutons');
  assert.match(js, /'aria-current','true'/, 'le moment choisi est marqué');
  /* le rendu reconstruit la liste : sans ce rappel, le clavier perdrait sa ligne à chaque choix */
  assert.match(js, /setAttribute\('data-moment',m\.id\)/, 'chaque bouton porte son moment');
  assert.match(js, /focus\(\{preventScroll:true\}\)/, 'le focus est rendu sans faire sauter la page');
  assert.match(js, /garde[^\n]*data-moment/, 'le moment qui avait le focus est retrouvé après le rendu');
  for (const r of ['.v-temps-item:focus-visible', '.v-temps-item[aria-current="true"]', '.v-td-choix', '.v-td-arc.est-choisi'])
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
