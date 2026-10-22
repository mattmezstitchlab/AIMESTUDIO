/* AIME Magazine : génère les pages statiques de /magazine/ à partir de sa source, avec le moteur de pages existant.
   Aucun moteur magazine : magazine/n001.aime-site.json est un site « aime-site » ordinaire, rendu par AIMESite.exporter
   (la vue publique seulement), avec le Design System qu'il désigne (design/catalogue). Les photos de la bibliothèque
   d'images utilisées sont copiées dans magazine/medias/, à côté des écrans capturés (scripts/magazine-captures.cjs).
     node scripts/magazine.cjs           écrit magazine/*.html
     node scripts/magazine.cjs --verifier  échoue si les pages ne correspondent pas à la source (utilisé par les tests) */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), MAG = path.join(R, 'magazine'), MEDIAS = '/magazine/medias/';
const S = require(R + '/vitrine/rendu.js').site, D = require(R + '/design/systemes.js');

function catalogue() { const ids = JSON.parse(fs.readFileSync(R + '/design/catalogue/index.json', 'utf8')).systemes; return D.catalogue(ids.map(i => JSON.parse(fs.readFileSync(R + '/design/catalogue/' + i + '.json', 'utf8')))); }
function source() { return JSON.parse(fs.readFileSync(MAG + '/n001.aime-site.json', 'utf8')); }
/* les images citées (biblio:<id>) : un écran du magazine, ou une photo de la bibliothèque d'AIME à copier */
function medias(site) { const ids = new Set(); JSON.stringify(site).replace(/"biblio:([a-z0-9-]{1,80})"/g, (m, i) => ids.add(i)); return [...ids]; }
function generer() {
  const site = source(), P = Object.assign({}, JSON.parse(fs.readFileSync(R + '/vitrine/presentation/studio.json', 'utf8')), { systemes: catalogue().compiles });
  return S.exporter(site, { presentation: P, medias: MEDIAS }).map(f => ({ chemin: f.chemin, contenu: f.contenu.replace("<head>", "<head><base href=\"/magazine/\"><meta name=\"generator\" content=\"AIME · moteur de pages (scripts/magazine.cjs)\">") }));
}
module.exports = { generer, source, medias, MAG };
if (require.main === module) {
  const verifier = process.argv.includes('--verifier'), pages = generer(); let ecarts = 0;
  for (const f of pages) { const c = path.join(MAG, f.chemin), avant = fs.existsSync(c) ? fs.readFileSync(c, 'utf8') : null;
    if (avant !== f.contenu) { ecarts++; if (!verifier) fs.writeFileSync(c, f.contenu); } }
  for (const id of medias(source())) { const ici = path.join(MAG, 'medias', id + '.webp'), biblio = path.join(R, 'sites', 'bibliotheque', id + '.webp');
    if (!fs.existsSync(ici)) { if (!fs.existsSync(biblio)) { console.error('image introuvable : ' + id); process.exit(1); } ecarts++; if (!verifier) fs.copyFileSync(biblio, ici); } }
  if (verifier && ecarts) { console.error('magazine : ' + ecarts + ' fichier(s) à régénérer (node scripts/magazine.cjs)'); process.exit(1); }
  console.log('magazine : ' + pages.map(p => p.chemin).join(', ') + (verifier ? ' à jour' : ' écrits'));
}
