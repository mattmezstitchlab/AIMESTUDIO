/* Le Cube Maître : le site AIME en six facettes, en lecture seule (maitre/, canevas/adaptateurs/maitre.js, api/maitre.mjs).
   Non-régression : le cube-personne, la Régie maîtresse et les permissions restent ce qu'ils étaient. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const R=f=>path.join(__dirname,'..',f),lire=f=>fs.readFileSync(R(f),'utf8');
const M=require('../maitre/modele.js'),N=require('../nav/registre.js'),RG=require('../regie/donnees.js'),A=require('../os/apps.js');
const V0=require('../vitrine/rendu.js'),SITE=V0.site||V0;
const sources=o=>Object.assign({nav:N,regie:RG,site:JSON.parse(lire('regie/site.json')),moteurs:JSON.parse(lire('moteurs.json')),univers:JSON.parse(lire('univers.json')),
 sante:require('../sante/modele.js'),reseau:require('../reseau/registre.js'),blocs:Object.keys(SITE.BLOCS).length,health:true},o||{});
/* le code sans ses commentaires : on vérifie ce qui s'exécute, pas ce qui est expliqué */
const code=f=>lire(f).replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"])\/\/.*$/gm,'$1');

test('les chiffres des facettes sont recalculés depuis les fichiers réels, jamais recopiés',()=>{const c=M.resumer(sources({proprietaire:true,comptes:{comptes:3}})),F=c.facettes;
 const repos=JSON.parse(lire('moteurs.json')).repos,cfg=RG.config(JSON.parse(lire('regie/site.json')));
 assert.equal(F.pages.champs.cle,String(N.publiques(true).length),'propriétaire : toutes les destinations, internes comprises');
 assert.equal(M.resumer(sources()).facettes.pages.champs.cle,String(N.publiques(false).length),'visiteur : sans les pages internes');
 assert.equal(F.moteurs.champs.cle,String(repos.length));assert.equal(F.contenu.champs.cle,String(cfg.realisations.filter(r=>r.publie!==false).length));
 assert.equal(F.orbe.champs.cle,String(Object.keys(cfg.orbe).length));assert.equal(F.sante.champs.cle,String(require('../sante/modele.js').composants.length));
 assert.ok(F.contenu.chiffres.some(x=>x[0]===String(Object.keys(SITE.BLOCS).length)),'les blocs du moteur, comptés');
 assert.deepEqual(M.IDS,['pages','sante','moteurs','comptes','orbe','contenu']);assert.deepEqual(M.FACETTES.map(f=>f.face).sort(),[0,1,2,3,4,5],'une facette par face')});

test('une source absente laisse sa facette « à venir », sans chiffre inventé',()=>{const c=M.resumer({});
 M.IDS.forEach(id=>{assert.equal(c.facettes[id].etat,'vide',id);assert.equal(c.facettes[id].chiffres.length,0,id)});
 const s=M.resumer(sources({health:null}));assert.ok(s.facettes.sante.chiffres.some(x=>x[0]==='—'),'santé du serveur inconnue : un tiret, pas « ok »')});

test('vue visiteur : Comptes réservée, aucun lien vers la Régie',()=>{const c=M.resumer(sources({comptes:{comptes:99}}));
 assert.equal(c.proprietaire,false);assert.equal(c.facettes.comptes.etat,'vide','même avec des compteurs fournis, rien sans le droit');
 M.IDS.forEach(id=>assert.ok(!c.facettes[id].actions.some(a=>a.type==='regie'||/^\/regie/.test(a.href)),id));
 assert.match(M.raison(c,'comptes'),/propriétaire/)});

test('vue propriétaire : compteurs du serveur filtrés, liens de la Régie limités aux onglets autorisés',()=>{const c=M.resumer(sources({proprietaire:true,comptes:{comptes:2,espaces:'1',membres:-4,email:'a@b.c',id:'u1',matiere:null}}));
 const f=c.facettes.comptes;assert.equal(f.etat,'posee');assert.equal(f.champs.cle,'2');const t=JSON.stringify(f);assert.ok(!t.includes('a@b.c')&&!t.includes('u1'),'ni e-mail ni identifiant');
 assert.deepEqual(M.comptesPropres({comptes:2,espaces:'1',membres:-4,email:'x',id:'y'}),{comptes:2,espaces:1},'des entiers positifs, des clés connues');
 const regie=[];M.IDS.forEach(id=>c.facettes[id].actions.forEach(a=>{if(a.type==='regie')regie.push(a.href)}));
 assert.ok(regie.length>=3);regie.forEach(h=>assert.ok(M.REGIE_OK.includes(h),h))});

test('liens : chemins internes ou onglets autorisés de la Régie ; jamais la comptabilité ni la création d\'un devis',()=>{
 ['/','/bureau/','/travaux/','/regie/#orbe','/regie/#pages'].forEach(h=>assert.ok(M.lienOk(h),h));
 ['/regie/#nouveau-devis','/regie/#docs','/regie/#clients','/regie/#entreprise','/regie/#publier','/regie/','https://exemple.fr','//exemple.fr','javascript:alert(1)','/api/maitre?x=1'].forEach(h=>assert.ok(!M.lienOk(h),h));
 assert.ok(!M.REGIE_OK.some(h=>/nouveau-devis|docs|clients|entreprise/.test(h)))});

test('lecture seule : aucun stockage, aucune donnée de la Régie hors version publiée, aucune comptabilité',()=>{
 for(const f of ['maitre/modele.js','maitre/sources.js','maitre/maitre.js','canevas/adaptateurs/maitre.js','api/maitre.mjs']){const s=code(f);
  assert.ok(!/localStorage|sessionStorage|indexedDB|setItem/.test(s),f+' : aucun stockage du navigateur');
  assert.ok(!/aime-regie|compta|nouveau-devis|#docs|#clients|#entreprise/.test(s),f+' : ni brouillon ni comptabilité de la Régie')}
 assert.match(code('maitre/sources.js'),/json\('\/regie\/site\.json'\)/,'la configuration lue est la version publiée');
 assert.match(code('maitre/sources.js'),/proprio\?json\('\/api\/maitre'/,'les compteurs ne sont demandés qu\'avec le droit propriétaire');
 assert.ok(!/regie\/regie\.js|regie\/scene\.js/.test(lire('maitre/index.html')+code('maitre/sources.js')+code('canevas/adaptateurs/maitre.js')),'la Régie maîtresse n\'est pas chargée')});

/* le garde : la Régie maîtresse, le cube-personne, la source unique des droits (synchroview/permissions.js) et le socle des comptes
   (auth, propriétaire du site) ne changent pas. Le stockage et le filtrage SQL du journal restent intacts ;
   sa projection protège désormais les signalements (PR confidentialité). espaces.mjs et pages.mjs évoluent (décision de Matt, PR B),
   mais role() et exiger() restent identiques, mot pour mot, à la branche visée. */
test('la Régie maîtresse, le cube-personne, la source des droits et le socle des comptes restent intacts (fichiers inchangés)',()=>{let d='';
 try{d=execSync('git diff --name-only --diff-filter=MDR '+require('./_base.cjs')()+' -- regie/ cube/modele.js cube/stock.js cube/regie.js cube/composition.js cube/cartes.js cube/assemblage.js canevas/adaptateurs/cube.js canevas/plan.js canevas/scene.js synchroview/permissions.js api/_auth/proprietaire.mjs',{cwd:R('.'),encoding:'utf8'}).trim()}catch(e){return}
 assert.equal(d,'','aucun de ces fichiers n\'est modifié')});

/* La correction de confidentialité ne change ni l'écriture en ajout seul, ni la portée SQL du journal. */
test('journal : stockage et sélection des lignes inchangés, seule la projection évolue',()=>{
 let avant;try{avant=execSync('git show '+require('./_base.cjs')()+':api/_auth/journal.mjs',{cwd:R('.'),encoding:'utf8'})}catch(e){return}
 const marque='  return rows.map(';
 assert.ok(avant.includes(marque));
 assert.equal(lire('api/_auth/journal.mjs').split(marque)[0],avant.split(marque)[0]);
});

/* auth.mjs : le socle des comptes reste intact, sauf UNE ligne autorisée par Matt (24/10) : l'adresse passée à pg.Pool sans « sslmode »
   (l'avertissement de pg comptait comme une erreur dans les journaux de Vercel). Toute autre ligne modifiée fait échouer ce test. */
test('auth.mjs : seule la ligne du pool (adresse sans sslmode) peut changer',()=>{let d='';
 try{d=execSync('git diff -U0 '+require('./_base.cjs')()+' -- api/_auth/auth.mjs',{cwd:R('.'),encoding:'utf8'})}catch(e){return}
 const lignes=d.split('\n').filter(l=>/^[+-]/.test(l)&&!/^(\+\+\+|---) /.test(l));
 const POOL=/^[+-]  pool = new pg\.Pool\(\{ connectionString: /;
 for(const l of lignes)assert.ok(POOL.test(l),'ligne modifiée hors de la ligne du pool : '+l.slice(0,120));
 const plus=lignes.filter(l=>l[0]==='+');assert.ok(plus.length<=1,'une seule ligne');
 if(plus[0]){assert.match(plus[0],/u\.searchParams\.delete\('sslmode'\)/);assert.match(plus[0],/ssl: \/sslmode=disable\|localhost\|127\\\.0\\\.0\\\.1\/\.test\(env\.DATABASE_URL\) \? false : \{ rejectUnauthorized: true \}/,'la règle TLS ne change pas')}
});

test('espaces.mjs : role() et exiger() sont identiques à la branche visée',()=>{let avant='';
 try{avant=execSync('git show '+require('./_base.cjs')()+':api/_auth/espaces.mjs',{cwd:R('.'),encoding:'utf8'})}catch(e){return}
 const maintenant=lire('api/_auth/espaces.mjs'),f=(t,n)=>{const m=t.match(new RegExp('\\n(export )?async function '+n+'\\([\\s\\S]*?\\n}\\n'));return m&&m[0]};
 for(const n of ['role','exiger']){assert.ok(f(avant,n),n+' introuvable dans la branche visée');assert.equal(f(maintenant,n),f(avant,n),n+'() a changé')}});

test('la vue 3D partagée : modèle facultatif, cube-personne inchangé par défaut, miniature du dock réservée au cube-personne',()=>{const v=lire('cube/vue3d.js');
 assert.match(v,/var M=o\.modele\|\|C/);assert.match(v,/if\(!o\.modele\)dernier=\{cube:cube,moi:moi\}/,'le Cube Maître ne remplace jamais la miniature du dock');
 assert.match(v,/M===C\?C\.couleurs\(cube,d\.id\)/,'le cube-personne lit toujours le style de sa face');assert.match(v,/d\.attente\|\|'à venir'/);
 assert.match(lire('maitre/maitre.js'),/V\.monter\(\$\('mc-cube'\),\{cube:cube,modele:M,interactif:true/);assert.match(lire('canevas/adaptateurs/maitre.js'),/AIMECubeVue\.monter\(z,\{cube:D\.cube,modele:root\.AIMEMaitre/)});

test('Canevas : ?maitre ouvre l\'adaptateur, chargé à la demande, sans écriture',()=>{const c=lire('canevas/canevas.js');
 assert.match(c,/maitre:'\/canevas\/adaptateurs\/maitre\.js'/);assert.match(c,/\{type:'maitre',facette:maitre\}/);assert.match(c,/'\/maitre\/':'Cube Maître'/);
 const a=lire('canevas/adaptateurs/maitre.js');assert.match(a,/adaptateur\('maitre',A\)/);assert.match(a,/M\.lienOk\(a\.href\)/,'un lien n\'est suivi qu\'après vérification')});

test('AIME OS : app « Cube Maître » au catalogue, pas épinglée ; la Régie reste réservée',()=>{const pub=A.catalogue(N.ENTREES),pro=A.catalogue(N.ENTREES,{proprietaire:true});
 assert.ok(pub.some(a=>a.id==='maitre')&&pro.some(a=>a.id==='maitre'),'vue visiteur et vue propriétaire');assert.ok(!A.EPINGLES.includes('maitre'),'le dock publié ne change pas');
 assert.ok(!pub.some(a=>a.id==='regie'));assert.ok(A.actions().some(a=>a.app==='maitre'))});

test('api/maitre : 404 sans propriétaire ou en cas d\'erreur, 405 hors GET, des compteurs seulement pour le propriétaire',async()=>{const X=await import('../api/maitre.mjs');
 const appel=(m)=>new Promise(done=>{const res={statusCode:0,h:{},setHeader(k,v){this.h[k]=v},end(b){done({code:this.statusCode,body:JSON.parse(b),h:this.h})}};X.default({method:m||'GET',headers:{}},res)});
 X._proprietaire(async()=>null);let r=await appel();assert.equal(r.code,404);assert.equal(r.h['Cache-Control'],'no-store');
 X._proprietaire(async()=>{throw new Error('base indisponible')});assert.equal((await appel()).code,404,'une erreur ferme');
 r=await appel('POST');assert.equal(r.code,405);
 const vues=[];X._db({query:async(sql,p)=>{vues.push(sql);if(/to_regclass/.test(sql))return{rows:[{t:p[0]==='public.matiere'?'matiere':null}]};return{rows:[{n:/from "user"/.test(sql)?3:/spaces$/.test(sql)?2:1}]}}});
 X._proprietaire(async()=>({id:'abcdef123',email:'proprio@exemple.fr'}));r=await appel();assert.equal(r.code,200);
 assert.deepEqual(Object.keys(r.body).sort(),['comptes','le','ok']);assert.equal(r.body.comptes.comptes,3);assert.equal(r.body.comptes.identites,null,'table absente : null, sans erreur');
 assert.ok(Object.values(r.body.comptes).every(v=>v===null||Number.isInteger(v)));assert.ok(!JSON.stringify(r.body).includes('@'),'jamais un e-mail');
 assert.ok(vues.every(s=>/^select (count\(\*\)::int as n from|to_regclass)/.test(s)),'seulement des comptes agrégés');
 X._db({query:async()=>{throw new Error('panne')}});assert.equal((await appel()).code,503);X._db(null);X._proprietaire(null)});
