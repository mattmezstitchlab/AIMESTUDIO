/* Les fonctions Vercel emportent bien leurs fichiers. Vercel choisit les fichiers de chaque fonction avec @vercel/nft (nodeFileTrace) :
   un fichier local chargé d'une façon que nft ne voit pas n'est pas emporté, et la fonction tombe en production
   (FUNCTION_INVOCATION_FAILED). C'est arrivé à /api/page : createRequire(import.meta.url)('../dock/modele.js') en une seule expression.
   Ici : pour chaque fonction de api/ (hors dossiers et fichiers « _* »), on suit nous-mêmes les import / require / import() locaux,
   de fichier en fichier, puis on vérifie que chacun figure dans la liste de nodeFileTrace.
   @vercel/nft n'est pas une dépendance du site : la CI l'installe sans l'enregistrer (npm install --no-save @vercel/nft@1.11.0). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let nft = null; try { nft = require('@vercel/nft'); } catch (e) { /* absent en local : le test le dit */ }
const opts = { skip: !nft && '@vercel/nft absent : npm install --no-save @vercel/nft@1.11.0' };

/* les fonctions : api/*.{js,mjs,cjs} et leurs sous-dossiers, sauf ce qui commence par « _ » (modules partagés) */
function fonctions(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('_') || e.name.startsWith('.')) return [];
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return fonctions(p);
    return /\.(m?js|cjs)$/.test(e.name) ? [p] : [];
  });
}
/* le code sans ses commentaires (les chemins cités en commentaire ne sont pas chargés) */
const sansCommentaires = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
/* toutes les chaînes relatives passées à import … from, import(), require() ou à l'appel d'un createRequire */
function chargements(texte) {
  const s = sansCommentaires(texte), r = new Set(), motifs = [
    /\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g, /\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g, /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g, /\)\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g];
  for (const m of motifs) for (const x of s.matchAll(m)) r.add(x[1]);
  return [...r];
}
function resoudre(depuis, rel) {
  const base = path.resolve(path.dirname(depuis), rel);
  for (const c of [base, base + '.js', base + '.mjs', base + '.cjs', base + '.json', path.join(base, 'index.js')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
/* le graphe des fichiers locaux réellement chargés, à partir d'une fonction */
function graphe(entree) {
  const vus = new Set([entree]), file = [entree], manquants = [];
  while (file.length) {
    const f = file.shift(); if (!/\.(m?js|cjs)$/.test(f)) continue;
    for (const rel of chargements(fs.readFileSync(f, 'utf8'))) {
      const c = resoudre(f, rel); if (!c) { manquants.push(path.relative(RACINE, f) + ' → ' + rel); continue; }
      if (!vus.has(c)) { vus.add(c); file.push(c); }
    }
  }
  return { fichiers: [...vus].map(f => path.relative(RACINE, f)), manquants };
}

test('le motif fautif est bien reconnu comme un chargement (sinon ce test ne protégerait de rien)', () => {
  assert.deepEqual(chargements("const D = createRequire(import.meta.url)('../dock/modele.js');"), ['../dock/modele.js']);
  assert.deepEqual(chargements("const require = createRequire(import.meta.url);\nconst D = require('../dock/modele.js');"), ['../dock/modele.js']);
  assert.deepEqual(chargements("// require('../rien.js')\n/* import x from './rien.mjs' */"), []);
});

test('chaque fonction de api/ emporte tous les fichiers locaux qu\'elle charge (@vercel/nft)', opts, async () => {
  const liste = fonctions(path.join(RACINE, 'api'));
  assert.ok(liste.some(f => f.endsWith(path.join('api', 'page.mjs'))), 'api/page.mjs fait partie des fonctions vérifiées');
  const fautes = [], cache = {};
  for (const f of liste) {
    const { fileList } = await nft.nodeFileTrace([f], { base: RACINE, cache, ignore: p => p.startsWith('node_modules/') });   /* les dépendances ne nous concernent pas ici : seuls nos fichiers */
    const g = graphe(f);
    for (const m of g.manquants) fautes.push(m + ' : fichier introuvable');
    for (const x of g.fichiers) if (!fileList.has(x)) fautes.push(path.relative(RACINE, f) + ' charge ' + x + ', que @vercel/nft n\'emporte pas');
  }
  assert.deepEqual(fautes, [], 'des fichiers manqueraient en production :\n' + fautes.join('\n'));
});
