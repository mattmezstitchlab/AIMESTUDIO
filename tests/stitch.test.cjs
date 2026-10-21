// AIME STITCH (phase 0-1) : patron canonique, conversion déterministe, références DMC intactes, versions séparées.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require('../stitch/js/couleur.js');
const K = require('../stitch/js/conversion.js');
const P = require('../stitch/js/patron.js');
const M = require('../stitch/js/mesures.js');
const S = require('../stitch/js/symboles.js');
const DMC = require('../stitch/data/dmc.json');
const CAT = require('../stitch/data/catalogue.json');
const patron = id => P.charger(JSON.parse(fs.readFileSync(path.join(ROOT, 'stitch/data/patrons', id + '.json'), 'utf8')));

function image(W, H) { const d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, dx = x - W / 2, dy = y - H / 2; let c = [238, 228, 210]; if (dx * dx + dy * dy < (W / 3) ** 2) c = [190 - dy, 70 + dx / 4, 90]; if (Math.abs(dx + 20) < 6 && Math.abs(dy) < 20) c = [40, 110, 60]; if ((x * 7 + y * 13) % 89 === 0) c = [20, 20, 200]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return { l: W, h: H, data: d }; }

test('CIEDE2000 conforme aux paires de référence (Sharma, Wu, Dalal)', () => {
  assert.equal(C.de2000([50, 2.6772, -79.7751], [50, 0, -82.7485]).toFixed(4), '2.0425');
  assert.equal(C.de2000([50, -1.3802, -84.2814], [50, 0, -82.7485]).toFixed(4), '1.0000');
  assert.equal(C.de2000([2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514]).toFixed(4), '0.9082');
});

test('table DMC : 489 références uniques, attribution présente, jamais modifiée par la conversion', () => {
  assert.equal(DMC.fils.length, 489); assert.equal(new Set(DMC.fils.map(f => f.code)).size, 489);
  assert.match(DMC.source.attribution, /CC BY 4\.0/);
  const avant = JSON.stringify(DMC.fils), codes = new Set(DMC.fils.map(f => f.code));
  const r = K.convertir(image(160, 120), { mode: 'precis', largeur: 60, dmc: DMC.fils });
  assert.equal(JSON.stringify(DMC.fils), avant);
  for (const p of r.palette) assert.ok(codes.has(p.dmc), 'référence inventée : ' + p.dmc);
});

test('conversion déterministe, trois modes aux paramètres explicites, pixels ≠ points', () => {
  const img = image(200, 150);
  const a = K.convertir(img, { mode: 'equilibre', largeur: 50, dmc: DMC.fils }), b = K.convertir(img, { mode: 'equilibre', largeur: 50, dmc: DMC.fils });
  assert.deepEqual([...a.points], [...b.points]); assert.deepEqual(a.palette, b.palette);
  assert.equal(a.l, 50); assert.equal(a.h, 38, 'les dimensions sont en points, pas en pixels');
  const s = K.convertir(img, { mode: 'simple', largeur: 50, dmc: DMC.fils }), pr = K.convertir(img, { mode: 'precis', largeur: 50, dmc: DMC.fils });
  assert.ok(s.palette.length <= K.MODES.simple.couleurs && pr.palette.length <= K.MODES.precis.couleurs);
  assert.ok(s.palette.length <= a.palette.length && a.palette.length <= pr.palette.length);
  assert.equal(s.rapport.confettisRestants, 0, 'Simple ne laisse aucun confetti');
  for (const m of Object.values(K.MODES)) for (const k of ['couleurs', 'region', 'detail', 'lissage', 'usageMin']) assert.ok(k in m);
});

test('patron canonique : sérialisation fidèle, validation, migration', () => {
  for (const pr of CAT.produits) {
    const p = patron(pr.patron); assert.deepEqual(P.valider(p, DMC.fils), [], pr.patron);
    const q = P.charger(P.serialiser(p)); assert.deepEqual([...P.matrice(q)], [...P.matrice(p)]); assert.equal(P.empreinte(q), P.empreinte(p));
  }
  const p = patron('pat-papillon'); const faux = P.charger(P.serialiser(p)); faux.palette[1].dmc = '99999'; faux.palette[2].symbole = faux.palette[3].symbole;
  const e = P.valider(faux, DMC.fils); assert.ok(e.some(x => /DMC inconnue/.test(x))); assert.ok(e.some(x => /symbole en double/.test(x)));
  const ancien = JSON.parse(P.serialiser(p)); delete ancien.schema; delete ancien.demi; assert.equal(P.charger(ancien).schema, 1);
});

test('publier fige une version : corriger le brouillon ne touche pas la version achetée', () => {
  const brouillon = patron('pat-lavande'), publiee = P.publier(brouillon, 'Première publication', '2026-10-20'), empreinte = P.empreinte(publiee);
  assert.equal(publiee.statut, 'publie'); assert.equal(brouillon.version, publiee.version + 1);
  const m = P.matrice(brouillon); for (let i = 0; i < m.length; i++) if (m[i]) m[i] = 1;
  assert.equal(P.empreinte(publiee), empreinte, 'la version publiée est indépendante');
  assert.notDeepEqual([...P.matrice(publiee)], [...m]);
});

test('représentations calculées : quantités, dimensions physiques, fournitures, effort réel expliqué', () => {
  const p = patron('pat-mesange'), q = P.quantites(p), N = q.reduce((a, b) => a + b.points, 0);
  assert.equal(N, [...P.matrice(p)].filter(Boolean).length);
  const d14 = P.dimensions(p, 14), d18 = P.dimensions(p, 18); assert.ok(d18.cm.l < d14.cm.l);
  assert.equal(d14.cm.l, +(d14.points.l / 14 * 2.54).toFixed(1));
  for (const f of P.fournitures(p, 14)) assert.ok(f.echeveaux >= 1);
  const me = M.mesurer(p); assert.equal(me.points, N);
  assert.equal(Math.round(Object.values(me.parts).reduce((a, b) => a + b, 0)), me.effort, 'l\'indice se décompose exactement');
  assert.ok(me.heures.min <= me.heures.max);
  const lav = M.mesurer(patron('pat-lavande')), mono = M.mesurer(patron('pat-monogramme')); assert.ok(lav.indice < mono.indice, 'confettis et changements de fil pèsent');
});

test('symboles : 48 formes distinctes ; chaque patron a des symboles uniques', () => {
  const l = S.liste(); assert.equal(l.length, 48); assert.equal(new Set(l.map(s => s.nom + ':' + s.plein)).size, 48);
  for (const pr of CAT.produits) { const p = patron(pr.patron); assert.equal(new Set(p.palette.map(c => c.symbole)).size, p.palette.length); }
});

test('catalogue : chaque produit pointe vers un patron et ne recopie aucune donnée technique', () => {
  for (const pr of CAT.produits) {
    assert.ok(fs.existsSync(path.join(ROOT, 'stitch/data/patrons', pr.patron + '.json')));
    for (const k of ['l', 'h', 'palette', 'points', 'couleurs', 'dimensions', 'niveau', 'temps', 'fils']) assert.equal(pr[k], undefined, pr.id + ' recopie ' + k);
  }
  for (const b of CAT.boutiques) assert.equal(b.fictif, true);
});

test('la progression de la brodeuse n\'est jamais écrite dans le patron', () => {
  for (const pr of CAT.produits) { const brut = fs.readFileSync(path.join(ROOT, 'stitch/data/patrons', pr.patron + '.json'), 'utf8'); assert.ok(!/fait|progression|done/.test(brut)); }
  const lecteur = fs.readFileSync(path.join(ROOT, 'stitch/broder/index.html'), 'utf8');
  assert.match(lecteur, /stitch-progression:'\+p\.id\+'@'\+pr\.version/);
});

test('STITCH est isolé : aucun fichier des autres studios n\'est chargé', () => {
  const all = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(f => { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(html|js)$/.test(f.name)) all.push(fs.readFileSync(p, 'utf8')); });
  walk(path.join(ROOT, 'stitch')); const src = all.join('\n');
  assert.ok(!/src="\/(studio|stitchlab|synchroview|vitrine|infinity)\//.test(src));
});

test('PDF : export fidèle d\'une version (légende, symboles, dimensions, pages, attribution)', () => {
  const { jsPDF } = require('../stitch/vendor/jspdf-4.2.1.umd.min.js');
  const X = require('../stitch/js/pdf.js');
  for (const id of ['pat-mesange', 'pat-colline']) {
    const p = patron(id), r = X.exporter(jsPDF, p, DMC.fils, { count: 14, attribution: DMC.source.attribution, compresser: false });
    const dec = X.decoupage(p), out = r.doc.output();
    assert.equal(r.doc.getNumberOfPages(), 3 + 2 * dec.blocs.length, 'couverture, légende, plan, grilles couleur et noir et blanc');
    const sujet = JSON.parse((out.match(/\/Subject \((.*?)\)\n/) || [])[1].replace(/\\([()\\])/g, '$1'));
    assert.equal(sujet.id, p.id); assert.equal(sujet.version, p.version); assert.equal(sujet.empreinte, P.empreinte(p));
    assert.deepEqual(sujet.palette, p.palette.map(c => c.dmc + ':' + c.symbole), 'symboles du PDF = symboles du patron');
    for (const c of p.palette) assert.ok(out.includes('(' + c.dmc + ')'), 'DMC ' + c.dmc + ' dans la légende');
    const d = P.dimensions(p, 14); assert.ok(new RegExp('\\(' + d.points.l + ' (\\\\327|×) ' + d.points.h + ' points\\)').test(out), 'dimensions en points');
    assert.ok(out.includes('CC BY 4.0'), 'attribution des couleurs');
    assert.ok(out.includes('version ' + p.version));
  }
});

test('empreinte : toute correction de la grille change l\'empreinte (l\'export suit la version exacte)', () => {
  const p = patron('pat-papillon'), a = P.empreinte(p), m = P.matrice(p); const i = m.findIndex(v => v > 0); m[i] = m[i] === 1 ? 2 : 1;
  assert.notEqual(P.empreinte(p), a);
});

test('outils : région, fusion de zone, contours du motif, demi-points exclusifs', () => {
  const O = require('../stitch/js/outils.js');
  const p = patron('pat-lavande'), m = P.matrice(p), i = m.findIndex(v => v > 0), reg = O.region(p, i);
  assert.ok(reg.length >= 1 && reg.every(j => m[j] === m[i]));
  const avant = m[i], v = O.fondre(p, reg); assert.ok(v !== avant); assert.ok(reg.every(j => P.matrice(p)[j] === v));
  // contour d'un carré 3 × 3 : une seule polyligne fermée de 4 côtés
  const q = P.charger(JSON.parse(P.serialiser(patron('pat-lavande')))); const mm = P.matrice(q); mm.fill(0); for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) mm[y * q.l + x] = 1;
  const L = O.contourMotif(q); assert.equal(L.length, 1); assert.equal(L[0].length, 5); assert.deepEqual(L[0][0], L[0][4]);
  // demi-point : remplace la croix de la case, tourne, puis se retire ; la validation refuse une croix sous un demi-point
  assert.equal(O.demi(q, 3, 3, q.palette[0].id), '/'); assert.equal(mm[3 * q.l + 3], 0); assert.equal(O.demi(q, 3, 3, q.palette[0].id), '\\'); assert.deepEqual(P.valider(q, DMC.fils), []);
  mm[3 * q.l + 3] = 1; assert.ok(P.valider(q, DMC.fils).some(e => /même case/.test(e))); mm[3 * q.l + 3] = 0;
  assert.equal(O.demi(q, 3, 3, q.palette[0].id), null); assert.equal(q.demi.length, 0);
  // les fournitures comptent demi-points et backstitch
  O.demi(q, 3, 3, q.palette[0].id); q.contours = [{ c: q.palette[0].id, pts: [[0, 0], [10, 0]] }];
  const f = P.fournitures(q, 14)[0]; assert.equal(f.demi, 1); assert.equal(f.backstitch, 10);
});

test('lecture d\'une grille existante : pas détecté, cases regroupées sans erreur, reconstruction fidèle après validation', () => {
  const Lc = require('../stitch/js/lecture.js');
  const p = patron('pat-papillon'), m = P.matrice(p), s = P.surface(p), cs = 14, marge = 20;
  const W = s.l * cs + 2 * marge, H = s.h * cs + 2 * marge, d = new Uint8ClampedArray(W * H * 4).fill(255);
  const px = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const hex = code => C.hex(DMC.fils.find(f => f.code === code).hex);
  // une grille « imprimée » : fond coloré, symbole sombre propre à chaque fil (motif de 3 × 3 blocs), lignes de grille
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.l; x++) {
    const v = m[(s.y + y) * p.l + s.x + x], X0 = marge + x * cs, Y0 = marge + y * cs; if (!v) continue;
    const col = hex(p.palette[v - 1].dmc), bits = (v * 37) % 511 || 1;
    for (let yy = 0; yy < cs; yy++) for (let xx = 0; xx < cs; xx++) { const bx = Math.floor((xx - 3) / 3), by = Math.floor((yy - 3) / 3), dans = xx >= 3 && yy >= 3 && bx < 3 && by < 3; px(X0 + xx, Y0 + yy, dans && (bits >> (by * 3 + bx)) & 1 ? [20, 20, 20] : col); }
  }
  for (let x = 0; x <= s.l; x++) for (let y = marge; y <= marge + s.h * cs; y++) px(marge + x * cs, y, [150, 150, 150]);
  for (let y = 0; y <= s.h; y++) for (let x = marge; x <= marge + s.l * cs; x++) px(x, marge + y * cs, [150, 150, 150]);
  const img = { l: W, h: H, data: d }, z = { x: marge, y: marge, l: s.l * cs, h: s.h * cs };
  const g = Lc.detecterGrille(img, z); assert.equal(g.colonnes, s.l); assert.equal(g.lignes, s.h);
  const a = Lc.analyser(img, z, s.l, s.h); assert.equal(a.groupes.length, p.palette.length, 'un groupe par fil');
  // validation humaine simulée : chaque groupe reçoit la référence que la personne reconnaît
  const choix = a.groupes.map(G => { const k = a.cases.indexOf(G.id), v = m[(s.y + Math.floor(k / s.l)) * p.l + s.x + k % s.l]; return p.palette[v - 1].dmc; });
  const r = Lc.construire(a, choix); let justes = 0;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.l; x++) { const v = m[(s.y + y) * p.l + s.x + x], w = r.points[y * s.l + x]; if ((v ? p.palette[v - 1].dmc : null) === (w ? r.palette[w - 1].dmc : null)) justes++; }
  assert.equal(justes, s.l * s.h, 'reconstruction case pour case');
  for (const G of a.groupes) { const sg = Lc.suggerer(G, DMC.fils); assert.ok(sg && DMC.fils.some(f => f.code === sg.code)); }
});

test('assemblage de pages (porté de POINTZERO) : puzzle sans chevauchement, deux pages relues comme un seul patron', () => {
  const Lc = require('../stitch/js/lecture.js');
  const bl = (id, cols, rows) => ({ id, cols, rows });
  const pos = Lc.positionsPuzzle([bl('a', 50, 40), bl('b', 35, 80), bl('c', 25, 20), bl('d', 20, 20)], 2, false, { cols: 40, rows: 50 });
  assert.deepEqual(pos, { a: { x: 0, y: 0 }, b: { x: 50, y: 0 }, c: { x: 0, y: 80 }, d: { x: 25, y: 80 } });
  assert.equal(Lc.positionsPuzzle([bl('b', 25, 25), bl('a', 50, 40)], 2, false, { cols: 30, rows: 30 }).a.x, 25, 'réordonnable');
  assert.deepEqual(Lc.lirePosition('Colonnes 56 à 80 · lignes 1 à 75 · suite à gauche'), { x: 55, y: 0, cols: 25, lignes: 75 });
  assert.equal(Lc.lirePosition('Page 3'), null, 'rien n\'est deviné sans indication');

  const p = patron('pat-papillon'), m = P.matrice(p), s = P.surface(p), cs = 14, marge = 20, coupe = Math.floor(s.l / 2);
  const hex = code => C.hex(DMC.fils.find(f => f.code === code).hex);
  const page = (x0, nc) => {
    const W = nc * cs + 2 * marge, H = s.h * cs + 2 * marge, d = new Uint8ClampedArray(W * H * 4).fill(255);
    const px = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
    for (let y = 0; y < s.h; y++) for (let x = 0; x < nc; x++) {
      const v = m[(s.y + y) * p.l + s.x + x0 + x]; if (!v) continue;
      const col = hex(p.palette[v - 1].dmc), bits = (v * 37) % 511 || 1, X0 = marge + x * cs, Y0 = marge + y * cs;
      for (let yy = 0; yy < cs; yy++) for (let xx = 0; xx < cs; xx++) { const bx = Math.floor((xx - 3) / 3), by = Math.floor((yy - 3) / 3), dans = xx >= 3 && yy >= 3 && bx < 3 && by < 3; px(X0 + xx, Y0 + yy, dans && (bits >> (by * 3 + bx)) & 1 ? [20, 20, 20] : col); }
    }
    for (let x = 0; x <= nc; x++) for (let y = marge; y <= marge + s.h * cs; y++) px(marge + x * cs, y, [150, 150, 150]);
    for (let y = 0; y <= s.h; y++) for (let x = marge; x <= marge + nc * cs; x++) px(x, marge + y * cs, [150, 150, 150]);
    return { img: { l: W, h: H, data: d }, z: { x: marge, y: marge, l: nc * cs, h: s.h * cs }, cols: nc, lignes: s.h };
  };
  const A = Object.assign(page(0, coupe), { x: 0, y: 0 }), B = Object.assign(page(coupe, s.l - coupe), { x: coupe, y: 0 });
  const a = Lc.analyserPages([B, A]);
  assert.equal(a.cols, s.l); assert.equal(a.lignes, s.h); assert.equal(a.pages, 2);
  assert.equal(a.groupes.length, p.palette.length, 'un fil = un groupe, sur les deux pages');
  const choix = a.groupes.map(G => { const k = G.exemple, v = m[(s.y + Math.floor(k / s.l)) * p.l + s.x + k % s.l]; return p.palette[v - 1].dmc; });
  const r = Lc.construire(a, choix); let justes = 0;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.l; x++) { const v = m[(s.y + y) * p.l + s.x + x], w = r.points[y * s.l + x]; if ((v ? p.palette[v - 1].dmc : null) === (w ? r.palette[w - 1].dmc : null)) justes++; }
  assert.equal(justes, s.l * s.h, 'assemblage case pour case');
});
