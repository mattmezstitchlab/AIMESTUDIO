/* Le droit « propriétaire du site » : décidé côté serveur par identifiant de compte (AIME_PROPRIETAIRES), fermé par défaut.
   Il réserve la Régie (dock, actions) et le démonstrateur SynchroView en production ; l'interface ne fait que montrer ou masquer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const R=f=>path.join(__dirname,'..',f),lire=f=>fs.readFileSync(R(f),'utf8');
const A=require('../os/apps.js'),N=require('../nav/registre.js'),core=require('../api/_sv/core.js'),check=require('../api/sv/check.js');
function appel(h,body){return new Promise(done=>{const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(o){done({code:this.code,body:o})}};h({method:'POST',body},res)})}

test('identifiants : liste lue côté serveur, valeurs invalides ignorées, fermé par défaut',async()=>{const P=await import('../api/_auth/proprietaire.mjs');
 assert.deepEqual(P.identifiants({}),[]);assert.equal(P.estProprietaireId('abcdef123',{}),false,'sans variable, personne');
 const env={AIME_PROPRIETAIRES:' abcdef123 , <script>, x , Zz_-9876543 '};assert.deepEqual(P.identifiants(env),['abcdef123','Zz_-9876543']);
 assert.equal(P.estProprietaireId('abcdef123',env),true);assert.equal(P.estProprietaireId('abcdef12',env),false);assert.equal(P.estProprietaireId(undefined,env),false)});

test('/api/identite renvoie seulement oui / non, jamais la liste',()=>{const s=lire('api/identite.mjs');assert.match(s,/estProprietaireId\(u\.id\)/);assert.ok(!/env\.AIME_PROPRIETAIRES|identifiants\(/.test(s),'la liste reste dans proprietaire.mjs');
 assert.equal((s.match(/proprietaire \}\)/g)||[]).length,3,'chaque réponse connectée porte le oui / non')});

test('Régie : hors du dock et des actions publiques, présente pour le propriétaire',()=>{const pub=A.catalogue(N.ENTREES),pro=A.catalogue(N.ENTREES,{proprietaire:true});
 assert.ok(!A.epingles(pub).some(a=>a.id==='regie'));assert.ok(A.epingles(pro).some(a=>a.id==='regie'));
 assert.ok(!A.actions().some(a=>a.app==='regie'));assert.ok(A.actions({proprietaire:true}).some(a=>a.app==='regie'));
 const os=lire('os/os.js');assert.match(os,/fetch\('\/api\/identite'/);assert.match(os,/j\.proprietaire!==true/);assert.match(os,/if\(proprio&&a&&a\.id!=='regie'\)/,'la suggestion « Régler l\'orbe » mène à la Régie : seulement pour le propriétaire')});

test('SynchroView : interne dans le registre, retiré de la navigation publique, gardé pour la Régie',()=>{const e=N.entree('synchroview');assert.equal(e.interne,true);
 assert.ok(!N.publiques(false).some(x=>x.id==='synchroview'));assert.ok(N.publiques(true).some(x=>x.id==='synchroview'));
 assert.ok(N.categories().some(c=>c.l.some(x=>x.id==='synchroview')),'la Régie (categories) voit toujours la page');
 assert.ok(!A.catalogue(N.ENTREES).some(a=>a.id==='synchroview'));assert.ok(!lire('menu/menu.js').includes("'/synchroview/'"),'pas dans la liste de secours du menu');
 for(const p of ['synchroview/index.html','synchroview/demo/index.html'])assert.ok(lire(p).includes('/synchroview/reserve.js'),p)});

test('SynchroView en production : 404 sans propriétaire, ouvert au propriétaire ; aperçus inchangés',async()=>{
 process.env.VERCEL_ENV='production';
 core._proprietaire(async()=>null);assert.equal((await appel(check,{identity:'u-lea',checks:[]})).code,404);
 core._proprietaire(async()=>{throw new Error('base indisponible')});assert.equal((await appel(check,{identity:'u-lea',checks:[]})).code,404,'une erreur ferme');
 core._proprietaire(async()=>({id:'abcdef123'}));const r=await appel(check,{identity:'u-lea',checks:[{res:'space',action:'delete'}]});assert.equal(r.code,200);assert.equal(r.body.proof,'serveur');
 delete process.env.VERCEL_ENV;core._proprietaire(async()=>null);assert.equal((await appel(check,{identity:'u-lea',checks:[]})).code,200,'hors production : ouvert')});

test('le moteur SynchroView et les données et la logique de la Régie maîtresse restent intacts',()=>{let d='';try{d=execSync('git diff --name-only origin/integration -- regie/donnees.js regie/regie.js regie/site.json regie/scene.js regie/sites.js synchroview/permissions.js synchroview/flux.js synchroview/bridge.js',{cwd:R('.')}).toString().trim()}catch(e){d=''}assert.equal(d,'')});
