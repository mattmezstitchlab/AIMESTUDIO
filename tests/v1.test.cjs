/* V1 : transparence des données (mention bêta, sauvegarde qui emporte les projets du Point Zéro), contrastes corrigés
   sans changer l'identité, contrôle automatique des PR. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');const B=require('../bureau/sources.js');
const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('sauvegarde : les projets du Point Zéro passent dans le fichier sans perte (tableaux typés, images)',async()=>{
 const projet={id:'p1',titre:'Renard',cases:new Uint8Array([0,1,255]),grille:{l:2},dims:new Int16Array([-2,300]),image:new Blob([Uint8Array.from([137,80,78,71])],{type:'image/png'})};
 const lireBlob=b=>b.arrayBuffer().then(a=>'data:'+b.type+';base64,'+Buffer.from(a).toString('base64'));
 const e=JSON.parse(JSON.stringify(await B.encoder(projet,lireBlob)));assert.equal(e.image.__aime,'blob');assert.equal(e.cases.__aime,'ta');
 const d=B.decoder(e);assert.deepEqual([...d.cases],[0,1,255]);assert.deepEqual([...d.dims],[-2,300]);assert.equal(d.image.type,'image/png');assert.deepEqual([...new Uint8Array(await d.image.arrayBuffer())],[137,80,78,71]);assert.equal(d.grille.l,2)});
test('sauvegarde : seules les bases connues sont relues ; un fichier ancien (schéma 1) reste lisible',()=>{
 const s=B.lireSauvegarde({format:'aime-sauvegarde',schema:2,cles:{a:'1'},bases:{'aime-point-zero':{projets:[{id:'p1'},{pas:'d\'id'}],espion:[{id:1}]},inconnue:{x:[{id:1}]}}});
 assert.deepEqual(Object.keys(s.bases),['aime-point-zero']);assert.deepEqual(Object.keys(s.bases['aime-point-zero']),['projets']);assert.equal(B.compterBases(s.bases),1);
 assert.deepEqual(B.lireSauvegarde({format:'aime-sauvegarde',schema:1,cles:{}}).bases,{});
 assert.throws(()=>B.lireSauvegarde({format:'aime-sauvegarde',cles:{},bases:{'aime-point-zero':{projets:'x'}}}),/abîmée/)});
test('la mention « où sont mes données » : visible au Point Zéro et sur la page projet, avec le chemin vers la sauvegarde',()=>{
 const m=lire('compte/donnees.js');assert.match(m,/restent dans ce navigateur/);assert.match(m,/href="\/bureau\/espace\/"/);assert.match(m,/role','note'/);
 for(const p of ['point-zero/index.html','projet/index.html']){const h=lire(p);assert.ok(h.includes('data-donnees'),p);assert.ok(h.includes('/compte/donnees.js'),p)}
 assert.ok(!/Comptes : pas encore/.test(lire('bureau/bureau.js')),'le Bureau ne dit plus que les comptes n\'existent pas');assert.match(lire('bureau/bureau.js'),/ecrireBases\(/)});
test('contrastes : seuls les gris trop pâles changent ; l\'identité (fonds, encre, accents) reste',()=>{
 assert.match(lire('index.html'),/--desk:#FFFFFF;--ink:#111114;--soft:#4B4B55;--faint:#5B5B66;/,'l\'accueil clair (25/10) : encre noire, gris lisibles sur blanc');assert.match(lire('regie/regie.css'),/--pale:#8E8E9A;/);
 assert.match(lire('aime/index.html'),/\.blk:not\(\.code\) \.bk\{visibility:hidden/);assert.match(lire('aime/index.html'),/class="bk" tabindex="0" role="region"/);
 assert.match(lire('regie/index.html'),/id="apercu" aria-label=/)});
test('contrôle automatique : suites, parcours navigateur et accessibilité à chaque PR',()=>{const w=lire('.github/workflows/tests.yml');
 for(const s of ['npm test','tests/navigateur/parcours.cjs','tests/navigateur/accessibilite.cjs','pull_request','scripts/serveur-test.cjs'])assert.ok(w.includes(s),s);
 assert.ok(fs.existsSync(path.join(__dirname,'..','docs/MIGRATION-V1.md')))});
