/* Le site ne sert que ses pages : la documentation, le schéma de la base, les tests et les scripts ne sont pas déployés
   (.vercelignore). Et aucune page ni aucune fonction ne dépend de ces dossiers, sinon elle casserait en production. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const R = p => path.join(__dirname, '..', p);
const EXCLUS = ['docs', 'db', 'tests', 'scripts'];
test('.vercelignore retire docs, db, tests et scripts du déploiement', () => {
  const l = fs.readFileSync(R('.vercelignore'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  for (const d of EXCLUS) assert.ok(l.includes('/' + d), d);
});
test('aucune page ni fonction ne charge un dossier non déployé', () => {
  const vus = [], parcourir = d => { for (const n of fs.readdirSync(R(d), { withFileTypes: true })) { const p = path.join(d, n.name);
    if (n.isDirectory()) { if (['node_modules', 'vendor', '.git', ...EXCLUS].includes(n.name) && d === '.') continue; if (n.name === 'node_modules' || n.name === '.git') continue; parcourir(p); }
    else if (/\.(html|js|mjs|cjs|css)$/.test(n.name)) vus.push(p); } };
  parcourir('.');
  const motif = new RegExp('(?:src|href)=["\']/(?:' + EXCLUS.join('|') + ')/|fetch\\(["\']/(?:' + EXCLUS.join('|') + ')/|require\\(["\'](?:\\.\\./)+(?:' + EXCLUS.join('|') + ')/');
  const fautifs = vus.filter(f => motif.test(fs.readFileSync(R(f), 'utf8')));
  assert.deepEqual(fautifs, []);
});
test('/v1/ et /mariage répondent par une redirection permanente (308), pas une page', () => {
  const r = JSON.parse(fs.readFileSync(R('vercel.json'), 'utf8')).redirects || [];
  for (const [src, dst] of [['/v1', '/'], ['/v1/', '/'], ['/v1/:chemin*', '/'], ['/mariage', '/exemples/'], ['/mariage.html', '/exemples/']])
    assert.ok(r.some(x => x.source === src && x.destination === dst && x.permanent === true), src + ' → ' + dst);
});

/* /v1/ et /mariage sont abandonnés (décision du 24/10/2026, ils gardent des allergies sans compte) : plus aucun lien n'y mène ;
   les fichiers sont retirés au lot 5. */
test('aucun lien vers /v1/ ni /mariage', () => {
  const vus = [], parcourir = d => { for (const n of fs.readdirSync(R(d), { withFileTypes: true })) { const p = path.join(d, n.name);
    if (n.isDirectory()) { if (['node_modules', '.git', 'tests', 'docs', 'v1', 'vendor'].includes(n.name)) continue; parcourir(p); }
    else if (/\.(html|js|mjs|json)$/.test(n.name) && n.name !== 'mariage.html' && p !== 'vercel.json') vus.push(p); } };
  parcourir('.');
  const fautifs = vus.filter(f => /["'(]\/v1\/?["'#?)]|["'(]\/mariage(\.html)?["'#?)]/.test(fs.readFileSync(R(f), 'utf8')));
  assert.deepEqual(fautifs, []);
});

/* Règle 12 : une démonstration ne promet pas une vérification serveur qu'un visiteur ne peut pas voir. */
test('accueil : aucun lien vers une page fermée au public', () => {
  const h = fs.readFileSync(R('index.html'), 'utf8');
  assert.ok(!/href="\/synchroview\//.test(h), 'le démonstrateur SynchroView est réservé au propriétaire du site');
});
