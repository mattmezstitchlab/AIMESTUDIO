/* PR A · le rangement public (brief unique du 24/10, après #108) : sans supprimer de code.
   Le Lab sort de la navigation publique ; le Bureau n'est plus une destination ; le Studio, le Canevas, le Magazine et les pages du Lab
   sont mis de côté (servis à leur adresse, en noindex), en attendant /modules/. */
const { test } = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path');
const R = p => path.join(__dirname, '..', p), lire = p => fs.readFileSync(R(p), 'utf8');
const MIS_DE_COTE = /\/(bureau|sites|studio|canevas|aime|cube|infinity|g44|lab)\//;

test('depuis l\'accueil, Exemples, Contact, Compte et Mes projets, aucun lien ne mène au Bureau, au Studio, au Canevas, au Monde AIME, au Cube, à Infinity, à G44 ou au Lab', () => {
  for (const f of ['index.html', 'exemples/index.html', 'exemples/mosaique/index.html', 'contact/index.html', 'compte/index.html', 'sante/index.html']) {
    const liens = []; lire(f).replace(/href="([^"]+)"/g, (m, u) => liens.push(u));
    assert.deepEqual(liens.filter(u => MIS_DE_COTE.test(u)), [], f);
  }
  for (const f of ['compte/compte.js', 'compte/projet.js', 'dock/plus.js', 'accueil/accueil.js', 'coeur/coeur.js']) assert.ok(!/href\s*=\s*['"]\/(bureau|sites|studio|canevas|aime|cube|infinity|g44|lab)\//.test(lire(f)) && !/\.href\s*=\s*'\/(bureau|sites|studio|canevas|aime|cube|infinity|g44|lab)\//.test(lire(f)), f);
  const D = require('../dock/modele.js'), pub = D.composer({}), P = require('../dock/plus.js');
  assert.deepEqual(pub.lieux.map(e => e.nom), ['Le cœur', 'Exemples', 'J\'ai un compte'], 'le Dock public : Le cœur · Exemples · + · J\'ai un compte');
  for (const e of [P.etat(null), P.etat({ connecte: true }, [{ id: 'a', titre: 'P', role: 'owner' }])]) for (const x of e.items.concat(e.fin || [])) assert.ok(!MIS_DE_COTE.test(x.href), x.href);
  assert.ok(!/Le Lab<\/a>/.test(lire('index.html')), 'le pied de l\'accueil ne mène plus au Lab');
});

test('l\'accueil : plus de « Modifier ma page », de choix d\'apparence, d\'aperçu de mini-site ni de « Mes essais sur cet appareil »', () => {
  const z = lire('index.html');
  for (const k of ['acModifier', 'acDS', 'acApercu', 'repriseLocale', 'Mes essais sur cet appareil', 'Modifier ma page']) assert.ok(!z.includes(k), k);
});

test('le Bureau n\'est plus une destination : /bureau/ → /projets/ ; ses retours mènent à Mes projets', () => {
  const r = JSON.parse(lire('vercel.json')).redirects;
  for (const s of ['/bureau', '/bureau/', '/bureau/index.html']) assert.ok(r.some(x => x.source === s && x.destination === '/projets/' && x.permanent === true), s);
  assert.ok(!fs.existsSync(R('bureau/index.html')) && !fs.existsSync(R('os/os.css')), 'supprimés en PR B, avec l\'accord de Matt (ils ne servaient plus)');
  assert.ok(!require('../nav/registre.js').ENTREES.some(e => e.href === '/bureau/'), 'le registre ne propose plus le Bureau');
  assert.match(lire('canevas/canevas.js'), /'\/projets\/':'Mes projets'/); assert.match(lire('canevas/index.html'), /id="retour" href="\/projets\/"/);
  assert.match(lire('projet/projet.js'), /'\/projets\/':'Retour à Mes projets'/);
  for (const f of ['sites/index.html', 'maitre/index.html', 'cube/index.html', 'reseau/index.html', 'sante/index.html', 'lab/cartes/index.html', 'synchroview/reserve.js', 'pointzero/pz.js', 'maitre/modele.js'])
    assert.ok(!/["'(=]\/bureau\/(?!espace\/)["'#?)]?/.test(lire(f).replace(/\/bureau\/(sources\.js|bureau\.js|bureau\.css)/g, '')), f + ' : plus de lien vers /bureau/');
});

test('les pages mises de côté portent noindex, leur logo mène à Mes projets quand elles en ont un', () => {
  for (const f of ['studio/index.html', 'canevas/index.html', 'sites/index.html', 'magazine/index.html', 'magazine/edito.html', 'magazine/metiers.html', 'magazine/point-zero.html',
    'aime/index.html', 'cube/index.html', 'infinity/index.html', 'g44/index.html', 'lab/grande-partition/index.html', 'lab/cartes/index.html', 'lab/orb/index.html', 'sante/index.html', 'reseau/index.html', 'maitre/index.html', 'bureau/espace/index.html'])
    assert.match(lire(f), /<meta name="robots" content="noindex/, f);
  assert.match(lire('canevas/index.html'), /<a class="mk" href="\/projets\/"/); assert.match(lire('sites/index.html'), /<a class="mk st-mk" href="\/projets\/"/);
  const N = require('../nav/registre.js');
  for (const id of ['studio', 'canevas', 'sites', 'stitchlab', 'web', 'buro']) assert.ok(N.entree(id).interne && !N.publiques(false).some(e => e.id === id), id + ' : hors de la navigation publique');
});

test('la règle d\'apparition des téléphones ne touche que les téléphones du cœur (figure.tel)', () => {
  const c = lire('coeur/coeur.css'); assert.match(c, /figure\.tel iframe\{opacity:0;/); assert.ok(!/(^|[\n,}])\.tel iframe\{/.test(c));
});

test('/sante/ garde son texte sur l\'état et les garanties, sans renvoyer vers les outils mis de côté ; la sauvegarde mène à Mes projets', () => {
  const h = lire('sante/index.html'), j = lire('sante/sante.js');
  assert.ok(!/Le Monde AIME|href="\/(aime|stitch|sites|bureau)\//.test(h), 'ni Le Monde AIME ni outil');
  assert.ok(!/Ouvrir l’outil/.test(j) && !/<a href="'\+s\.href/.test(j), 'les étapes et les sorties ne sont plus des liens');
  assert.match(h, /href="\/projets\/">← Mes projets/); assert.match(h, /Cette page est publique/);
});
