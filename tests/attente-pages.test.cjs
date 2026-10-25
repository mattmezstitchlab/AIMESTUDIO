/* La liste d'attente de la bêta, côté pages (brief « Liste d'attente ») : /beta/, le bloc court de l'accueil,
   la grille au style du Dock, la page des compteurs du propriétaire (gardée comme #123) et la section de /confidentialite/. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const texte = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const options = s => [...s.matchAll(/<li id="([^"]+)" class="jl-o[^"]*" role="option"[^>]*data-value="([^"]+)"[^>]*>.*?<span class="jl-t">([^<]+)<\/span>/g)].map(x => [x[1], x[2], x[3]]);

test('/beta/ : la même liste « Je suis… » que l\'accueil (valeurs, mots, ordre)', () => {
  const a = options(lire('index.html')), b = options(lire('beta/index.html'));
  assert.equal(a.length, 11); assert.deepEqual(b, a);
});

test('/beta/ : adresse, « Je suis… », grille facultative, « Autre chose ? » (140), consentement non coché, champ piège', () => {
  const s = lire('beta/index.html'), t = texte(s);
  assert.match(t, /La bêta ouvre bientôt\. Soyez prévenu en premier\./);
  assert.match(s, /<input id="atEmail" type="email"[^>]*required/);
  assert.match(s, /<input id="atLibre" type="text" name="souhait_libre" maxlength="140"/);
  const c = s.match(/<label class="at-ok"><input type="checkbox" name="consentement"> <span>([^<]+)<\/span><\/label>/);
  assert.ok(c, 'une vraie case, sans « checked »'); assert.equal(c[1], 'J\'accepte de recevoir un e-mail à l\'ouverture de la bêta.');
  assert.match(s, /name="site_web" tabindex="-1"/);
  assert.match(t, /Qu'attendez-vous d'AIME \?/);
  assert.match(s, /<meta name="robots" content="noindex">/);
  assert.ok(s.includes('<script defer src="/_vercel/speed-insights/script.js"></script>'));
  assert.deepEqual([...s.match(/<nav class="pied-legal"[^>]*>([\s\S]*?)<\/nav>/)[1].matchAll(/href="([^"]+)"/g)].map(x => x[1]), ['/tarifs/', '/mentions-legales/', '/confidentialite/', '/contact/']);
});

test('la grille : une seule liste (attente/souhaits.json), des icônes du Dock, le mot affiché contenu dans le nom accessible', () => {
  const S = require('../attente/souhaits.json').souhaits, dock = lire('dock/dock.js');
  assert.equal(S.length, 15); assert.equal(new Set(S.map(s => s.id)).size, 15);
  for (const s of S) {
    assert.ok(new RegExp('\\b' + s.icone + ':').test(dock) || dock.includes("'" + s.icone + "'") || dock.includes(s.icone + ':\''), s.icone);
    assert.ok(s.nom.toLowerCase().includes(s.mot.toLowerCase()), s.id + ' : « ' + s.mot + ' » est dans « ' + s.nom + ' » (WCAG 2.5.3)');
  }
  const js = lire('attente/attente.js');
  assert.match(js, /fetch\('\/attente\/souhaits\.json'/); assert.match(js, /aria-label="' \+ esc\(s\.nom\)/);
  assert.ok(!/https?:\/\//.test(js.replace(/\/\*[\s\S]*?\*\//g, '')), 'aucun appel hors du site');
  assert.match(lire('dock/dock.js'), /icone:icone/);
});

test('accueil : la capsule du haut porte « Je suis… » et le seul champ de la bêta, et un lien vers /beta/', () => {
  const s = lire('index.html'), haut = s.match(/<header class="barre">[\s\S]*?<\/header>/)[0];
  assert.ok(haut.includes('id="jsChoix"'), '« Je suis… » est dans la capsule, plus dans le corps de page');
  const i = haut.indexOf('class="at-bloc"');
  assert.ok(i > 0 && i > haut.indexOf('id="jsChoix"'), 'le champ de la bêta suit « Je suis… », dans la même capsule');
  const b = haut.slice(i, haut.indexOf('</aside>', i));
  assert.match(texte(b), /La bêta ouvre bientôt\. Soyez prévenu en premier\./);
  assert.match(b, /<input id="atBlocEmail" type="email"[^>]*required/);
  assert.match(b, /<input type="checkbox" name="consentement"> <span>J'accepte de recevoir un e-mail à l'ouverture de la bêta\.<\/span>/);
  assert.match(b, /name="site_web"/); assert.match(b, /href="\/beta\/"/);
  assert.match(s, /AIMEAttente\.bloc\(f\)/);
  assert.match(lire('attente/attente.js'), /place: choix\.value/);
  /* rien n'est répété dans le corps de page : une seule liste, un seul bloc, et le logo les ouvre */
  assert.equal(s.split('id="jsOptions"').length - 1, 1, 'une seule liste « Je suis… »');
  assert.equal(s.split('class="at-bloc"').length - 1, 1, 'un seul bloc de bêta');
  assert.match(haut, /<button type="button" class="mk" id="mk" aria-expanded="false" aria-controls="jsListe"/, 'le logo ouvre la liste');
  assert.match(lire('accueil/capsule.js'), /champ\._ouvrir\(\)/, 'le logo passe par la liste déjà écrite (accueil/liste.js)');
  assert.ok(!/localStorage|fetch\(/.test(lire('accueil/capsule.js')), 'la capsule n envoie et n enregistre rien');
});

test('les compteurs du propriétaire : page gardée comme #123, données du serveur sans adresse', () => {
  const E = require('../api/_auth/ecrans.cjs');
  for (const p of ['/maitre/attente/', '/maitre/attente', '/maitre/attente/index.html', '/maitre/%61ttente/', '//maitre//attente/']) assert.ok(E.estGarde(p), p);
  assert.ok(!E.estGarde('/maitre/attente/compteurs.js'));
  const s = lire('maitre/attente/index.html'), js = lire('maitre/attente/compteurs.js');
  assert.match(s, /noindex/); assert.match(js, /\/api\/attente\?stats=1/); assert.ok(!/email/i.test(js), 'aucun champ d\'adresse lu');
  const v = JSON.parse(lire('vercel.json')); assert.ok(v.headers.some(h => h.source.includes('maitre/attente') && h.headers.some(x => /no-store/.test(x.value))));
});

test('confidentialité : finalité, données, durée (6 mois après l\'ouverture, ou dès la désinscription), aucun partage ni usage publicitaire', () => {
  const s = lire('confidentialite/index.html'), i = s.indexOf('id="attente"'), t = texte(s.slice(i, s.indexOf('</ul>', i)));
  assert.ok(i > 0);
  assert.match(t, /vous prévenir de l'ouverture de la bêta/);
  assert.match(t, /adresse e-mail, votre place .*la source de votre visite/);
  assert.match(t, /six mois après l'ouverture de la bêta.*désinscrivez.*effacée aussitôt/);
  assert.match(t, /Aucun partage, aucun usage publicitaire/);
  assert.match(lire('beta/index.html'), /href="\/confidentialite\/#attente"/);
});

test('migration : numérotée, rejouable, telle que le brief', () => {
  const f = fs.readdirSync(path.join(__dirname, '..', 'db/migrations')).filter(x => /liste-attente/.test(x));
  assert.deepEqual(f, ['2026-10-24-05-liste-attente.sql']);
  const s = lire('db/migrations/' + f[0]);
  assert.match(s, /create table if not exists liste_attente/); assert.match(s, /create unique index if not exists liste_attente_email on liste_attente \(lower\(email\)\)/);
  for (const c of ['attente_email_court', 'attente_place_court', 'attente_source_court', 'attente_campagne_court', 'attente_souhaits_nombre', 'attente_libre_court']) assert.ok(s.includes(c), c);
  assert.ok(!/drop |delete |truncate /i.test(s.replace(/--.*$/gm, '')), 'rien n\'est effacé');
});
