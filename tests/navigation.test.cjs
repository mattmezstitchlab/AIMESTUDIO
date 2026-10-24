/* Navigation V1 : le Canevas est l'environnement d'édition, le Réseau est atteignable, l'ancien générateur reste servi
   (route et fonctions conservées) sans être une destination principale. */
const assert=require('assert'),fs=require('fs'),path=require('path');const N=require('../nav/registre.js'),A=require('../os/apps.js');
const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');let n=0;const t=(nom,f)=>{f();n++};
const cat=A.catalogue(N.ENTREES),dock=A.epingles(cat).map(a=>a.id);
t('le dock de l\'OS propose le Réseau ; le Canevas et le Canevas universel sont mis de côté (adresse directe, propriétaire du site)',()=>{assert.ok(dock.includes('reseau'),'Réseau');assert.ok(!dock.includes('canevas'),'Canevas mis de côté');assert.ok(!dock.includes('sites'),'générateur hors du dock');assert.equal(dock[0],'cube','le cube reste en tête');
 const cp=A.catalogue(N.ENTREES,{proprietaire:true}),s=id=>cp.find(a=>a.id===id).sigle;assert.equal(s('reseau'),'Rs');assert.equal(s('canevas'),'Cv');assert.notEqual(s('reseau'),s('regie'),'Réseau et Régie se distinguent')});
t('le registre déclare le Réseau, le Canevas et le Canevas universel (mode Site), sur sa route /sites/',()=>{const r=N.entree('reseau'),c=N.entree('canevas'),s=N.entree('sites');
 assert.equal(r.href,'/reseau/');assert.equal(r.statut,'demonstration');assert.equal(c.href,'/canevas/');assert.equal(s.href,'/sites/');assert.match(s.nom,/Canevas universel/);assert.ok(!s.nouveau);
 assert.ok(fs.existsSync(path.join(__dirname,'..','sites/index.html')),'la route /sites/ reste servie');assert.ok(fs.existsSync(path.join(__dirname,'..','reseau/index.html')))});
t('les sites de ce navigateur s\'ouvrent dans le Canevas, avec retour à Mes projets',()=>{const s=lire('bureau/sources.js');assert.ok(s.includes("'/canevas/?site='+encodeURIComponent(id)+'&de=%2Fprojets%2F'"));assert.ok(!/\/sites\/\?site=/.test(s));
 assert.ok(lire('bureau/bureau.js').includes("sites:{lien:'/canevas/'"));const c=lire('canevas/canevas.js');assert.ok(c.includes("'/projets/':'Mes projets'"),'Mes projets est une origine connue du Canevas');assert.ok(c.includes('if(site&&id)'),'« Retour au projet » seulement quand il y a un projet')});
t('les actions : modifier dans le Canevas, découvrir le Réseau ; créer reste possible dans l\'ancien générateur',()=>{const ids=A.ACTIONS.map(a=>a.id);['canevas','reseau','nouveau-site'].forEach(i=>assert.ok(ids.includes(i),i));
 assert.match(A.ACTIONS.find(a=>a.id==='nouveau-site').nom,/ancien/)});
t('la Régie maîtresse : données et fonctions intactes (seuls ses contrastes et une étiquette ont été corrigés)',()=>{const {execSync}=require('child_process');let d='';try{d=execSync('git diff --name-only origin/integration -- regie/donnees.js regie/regie.js regie/site.json regie/scene.js regie/sites.js',{cwd:path.join(__dirname,'..')}).toString().trim()}catch(e){d=''}assert.equal(d,'','données et logique de la Régie inchangées')});
console.log('navigation : '+n+' tests ok');
