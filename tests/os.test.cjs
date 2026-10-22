const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const A = require('../os/apps.js');
const N = require('../nav/registre.js');

test('OS · le catalogue : apps système, puis le registre, sans le Bureau lui-même ni doublon', () => {
  const c = A.catalogue(N.ENTREES);
  assert.deepEqual(c.slice(0, 4).map(a => a.id), ['cube', 'pointzero', 'espace', 'regie']);
  assert.ok(!c.some(a => a.id === 'bureau'), 'l\'OS est le Bureau : pas d\'app « Mon Bureau » dedans');
  assert.equal(new Set(c.map(a => a.id)).size, c.length);
  for (const a of c) { assert.match(a.href, /^\/(?!\/)/, a.id); assert.ok(a.sigle && a.sigle.length <= 2, a.id); assert.ok(a.teinte, a.id); }
  assert.ok(A.epingles(c).length >= 6, 'un dock garni dès la première visite');
  assert.ok(A.catalogue([{ id: 'x', nom: 'X', href: 'https://ailleurs.fr' }]).every(a => a.id !== 'x'), 'aucune adresse extérieure');
});

test('OS · la recherche ignore accents et casse, et classe le nom avant la description', () => {
  const c = A.catalogue(N.ENTREES);
  assert.equal(A.chercher('regie', c)[0].id, 'regie');
  assert.equal(A.chercher('STITCH', c)[0].id, 'stitch');
  const act = A.chercher('facture', A.ACTIONS); assert.equal(act[0].id, 'nouveau-devis', 'les mots-clés trouvent l\'action');
  assert.equal(A.chercher('zzzz', c).length, 0);
});

test('OS · les fenêtres restent dans l\'écran, et l\'OS ne s\'ouvre jamais dans lui-même', () => {
  const z = { x: 12, y: 12, l: 1400, h: 760 };
  const f = A.contraindre({ x: -5000, y: -40, l: 50, h: 99999 }, z);
  assert.ok(f.l >= A.MIN.l && f.h <= z.h && f.y >= z.y && f.x + f.l > z.x, JSON.stringify(f));
  const a = A.cascade(0, z), b = A.cascade(1, z); assert.ok(b.x > a.x && b.y > a.y, 'en cascade');
  for (const u of ['/bureau/', '/bureau', '/bureau/index.html', '/bureau/?x=1']) assert.equal(A.adresseApp(u), '/bureau/espace/', u);
  assert.equal(A.adresseApp('//evil.com'), '/'); assert.equal(A.adresseApp('/studio/#open.1'), '/studio/#open.1');
  const e = A.etat({ fenetres: [{ app: '<script>', href: '/' }, { app: 'studio', href: 'javascript:1', x: 'a' }], epingles: ['ok', 3] });
  assert.equal(e.fenetres.length, 1); assert.equal(e.fenetres[0].href, '/'); assert.equal(e.fenetres[0].x, 40); assert.deepEqual(e.epingles, ['ok']);
});

test('OS · la coque : /bureau/ est l\'OS, Mon espace garde l\'ancien Bureau, la page n\'a pas d\'orbe en double', () => {
  const h = fs.readFileSync('bureau/index.html', 'utf8');
  for (const s of ['/nav/registre.js', '/regie/donnees.js', '/bureau/sources.js', '/os/apps.js', '/os/os.js']) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf('/os/apps.js') < h.indexOf('/os/os.js'));
  assert.match(h, /role="combobox"/); assert.match(h, /aria-label="Dock"/);
  assert.ok(fs.existsSync('bureau/espace/index.html'));
  assert.match(fs.readFileSync('regie/scene.js', 'utf8'), /DANS_OS/);
  const os = fs.readFileSync('os/os.js', 'utf8');
  assert.ok(!/innerHTML\s*=[^;]*\b(p\.titre|s\.libelle|r\.nom)\b(?![^;]*esc\()/.test(os), 'les textes venus des données passent par esc()');
});

test('OS · en tapant « devis », l\'action passe avant l\'app qui en parle', () => {
  const c = A.catalogue(N.ENTREES), q = 'devis';
  const app = A.chercher(q, c)[0], act = A.chercher(q, A.ACTIONS)[0];
  assert.ok(A.pertinence(q, act) > A.pertinence(q, app));
});

test('OS · autonomie de l\'orbe : le visiteur l\'emporte, à la demande par défaut', () => {
  assert.equal(A.autonomie('active', 'discrete'), 'discrete');
  assert.equal(A.autonomie('attentive', null), 'attentive');
  assert.equal(A.autonomie(undefined, undefined), 'discrete');
  assert.equal(A.etat({ orbe: 'active' }).orbe, 'active'); assert.equal(A.etat({ orbe: 'tout' }).orbe, null);
  const h = fs.readFileSync('bureau/index.html', 'utf8'); assert.match(h, /id="orbePref"/); assert.match(h, /id="orbeBulle"/);
});
