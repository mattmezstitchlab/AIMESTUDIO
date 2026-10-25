// AI, mon environnement (compte/ai.js) : les garanties lisibles sans navigateur. Le parcours complet, avec de vraies sessions et une
// base de test, est dans tests/navigateur/ai.cjs.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), code = f => lire(f).replace(/\/\*[\s\S]*?\*\//g, '');

test('le Dock connecté : AI · + · ME, aux adresses d\'avant ; le Dock public ne change pas', () => {
  const D = require('../dock/modele.js'), con = D.composer({ famille: 'Public connecté' }), pub = D.composer({});
  assert.deepEqual(con.lieux.map(x => [x.nom, x.href, x.dit]), [['AI', '/projets/', 'AI, mon environnement'], ['ME', '/compte/', 'ME, ma Carte']]);
  assert.deepEqual(pub.lieux.map(x => x.nom), ['AI', 'ME'], 'sans compte : AI · + · ME aussi (les exemples restent sur la landing et dans ME)');
  assert.match(lire('compte/index.html'), /href="\/exemples\/">les exemples<\/a>/, 'connecté : les exemples restent à un clic depuis AI');
});

test('aucune fuite entre contextes : une génération par contexte, toute réponse passée ignorée', () => {
  const p = code('compte/projet.js'), a = code('compte/ai.js');
  assert.match(p, /var autre=id!==espace,n=\+\+gen/); assert.match(p, /if\(n!==gen\)return;/); assert.match(p, /function fermer\(\)\{gen\+\+/);
  assert.match(p, /if\(autre\)\{rep=null;dock\(\)/, 'un autre projet : l\'écran est vidé avant la réponse');
  assert.match(a, /function ouvrirDemande\(cle\)\{var n=\+\+gen/); assert.match(a, /if\(n!==genListe\)return;/);
  assert.match(a, /if\(z!=='projet'&&window\.AIMEProjet\)AIMEProjet\.fermer\(\)/, 'quitter un projet l\'arrête');
});

test('AI n\'écrit jamais de HTML venu du serveur, et ne décide d\'aucun droit', () => {
  const a = code('compte/ai.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(a), 'textContent seulement');
  assert.ok(!/AIME_PROPRIETAIRES|proprietaire/.test(a), 'le droit de lire les demandes est décidé au serveur (404 sinon)');
  assert.match(a, /r\.statut===404\|\|r\.statut===405\)\{z\.hidden=true;return\}/, 'sans boîte de demandes : la section n\'existe pas');
});

test('AI rassemble les programmes Temps filtrés par le serveur et ouvre Programme ou Circle dans le bon projet', () => {
  const a = code('compte/ai.js'), h = lire('compte/index.html'), api = lire('api/temps.mjs'), moteur = lire('api/_temps/moteur.mjs');
  assert.match(h, /id="aTemps"[\s\S]*id="tempsProgrammes"/);
  assert.match(a, /requete\('\/api\/temps\?resume=1'\)/);
  assert.match(a, /data-ouvrir-temps/); assert.match(a, /page=deroule[\s\S]*vue=cercle/);
  assert.match(api, /q\.has\('resume'\).*resumer\(base, u\)/);
  assert.match(moteur, /export async function resumer[\s\S]*await lire\(db, u,[\s\S]*r\.vue\.moments/);
  assert.match(a, /genTemps\+\+|genTemps/,'une réponse d’AI ne survit pas au changement de contexte');
});

test('AI · la date du Jour J : affichée quand le serveur la donne, jamais fabriquée', () => {
  const a = code('compte/ai.js'), moteur = lire('api/_temps/moteur.mjs'), T = lire('modules/temps/vue.js');
  /* la carte : « Jour J » seul sans date ; « Jour J · samedi 12 juin 2027 » quand elle est fixée */
  assert.match(a, /p\.jour\?'Jour J · '\+dateTemps\(p\.jour\):'Jour J'/);
  assert.match(a, /toLocaleDateString\('fr-FR',\{[^}]*timeZone:'UTC'\}/, 'midi UTC : le fuseau ne décale pas le jour affiché');
  /* le serveur n’ajoute le champ que s’il existe en base (migration 08), et le geste est réservé au propriétaire */
  assert.match(moteur, /if \(r\.vue\.jour\) programmes\[i\]\.jour = r\.vue\.jour/);
  assert.match(moteur, /manage_members[\s\S]*Fixer la date du Jour J est réservé au propriétaire/);
  assert.match(moteur, /dateValide\(j\)[\s\S]*AAAA-MM-JJ/);
  /* l’écran de projet : la date en toutes lettres, sa distance, et le geste seulement pour qui peut */
  assert.match(T, /function relatifDe\(v\)[\s\S]*'J-'/);
  assert.match(T, /if\(!v\.peutDater\)return/);
  assert.match(T, /action:'dater'/);
});
