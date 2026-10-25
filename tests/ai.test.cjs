// AI, mon environnement (compte/ai.js) : les garanties lisibles sans navigateur. Le parcours complet, avec de vraies sessions et une
// base de test, est dans tests/navigateur/ai.cjs.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const lire = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), code = f => lire(f).replace(/\/\*[\s\S]*?\*\//g, '');

test('le Dock connecté : AI · + · ME, aux adresses d\'avant ; le Dock public ne change pas', () => {
  const D = require('../dock/modele.js'), con = D.composer({ famille: 'Public connecté' }), pub = D.composer({});
  assert.deepEqual(con.lieux.map(x => [x.nom, x.href, x.dit]), [['AI', '/projets/', 'AI, mon environnement'], ['ME', '/compte/', 'ME, ma Carte']]);
  assert.deepEqual(pub.lieux.map(x => x.nom), ['Le cœur', 'Exemples', 'J\'ai un compte'], 'sans compte : les exemples restent dans le Dock');
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
