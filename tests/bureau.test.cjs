/* Le Bureau unique : registre de navigation, sources du navigateur, sauvegarde, moteur partagé, routes. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const R=p=>path.join(__dirname,'..',p);
const N=require('../nav/registre.js'),B=require('../bureau/sources.js'),V=require('../vitrine/rendu.js');
function stock(init,lectureSeule){const m=new Map(Object.entries(init||{}));return{get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.has(k)?m.get(k):null,
 setItem:(k,v)=>{if(lectureSeule)throw new Error('écriture interdite');m.set(k,String(v))},removeItem:k=>{if(lectureSeule)throw new Error('écriture interdite');m.delete(k)},_m:m}}
const plein={
 'aime-carte':JSON.stringify(Object.assign(require('../carte/carte.js').vide('2026-10-20'),{nom:'Camille',couleurs:['#7C5CFF']})),
 'echos:v2':JSON.stringify({projects:[{id:'p1',name:'Faire-part Léa',pack:'mariage',updated:Date.parse('2026-10-19')},{id:'p2',name:'Badge Orée',pack:'conf',updated:Date.parse('2026-10-10')}],cur:'p2'}),
 'aime-app':JSON.stringify({events:[{id:'e1',title:'Mariage Léa & Marc',type:'mariage',date:'2027-06-12'}],cur:'e1'}),
 'stitch-brouillons':JSON.stringify({'pat-lavande':{titre:'Rameau de lavande',version:2,palette:[1,2,3]}}),
 'stitch-progression:pat-mesange@1':JSON.stringify({n:120}),
 'sv-compositions':JSON.stringify([{name:'Couple / invité',url:'https://x.vercel.app/synchroview/?v=a#s'},{name:'piège',url:'javascript:alert(1)'}]),
 'aime-infinity':JSON.stringify({L:7,record:{L:9}}),
 'aime-sim-world':JSON.stringify([{a:1},{a:2}]),
 'jourj-plan-v5':'{}',
 'aime-wp':'"nuit"','aime-tlz':'2','aime-lang':'"fr"'};

test('registre : une seule liste, des statuts et des rôles explicites, des adresses internes',()=>{
 const ids=new Set();for(const e of N.ENTREES){assert.ok(!ids.has(e.id),'doublon '+e.id);ids.add(e.id);assert.ok(N.STATUTS[e.statut],e.id);assert.ok(N.ROLES[e.role],e.id);assert.match(e.href,/^\/(?!\/)/,e.id)}
 assert.ok(!N.entree('bureau'),'le Bureau est supprimé : Mes projets le remplace');assert.equal(N.entree('projets').href,'/projets/');assert.deepEqual(N.par('role','travailler').map(e=>e.id),['projets'],'une seule entrée pour travailler : Mes projets');
 assert.ok(N.par('role','experimenter').length>=1,'un Lab séparé');
 const menu=fs.readFileSync(R('menu/menu.js'),'utf8');assert.match(menu,/window\.AIMENav/);
 for(const f of ['aime/index.html']){const h=fs.readFileSync(R(f),'utf8');assert.ok(h.indexOf('/nav/registre.js')>=0&&h.indexOf('/nav/registre.js')<h.indexOf('/menu/menu.js'),f+' charge le registre avant le menu')}});

test('sources : tout est retrouvé, rien n\'est écrit, rien n\'est inventé',()=>{
 const S=stock(plein,true),inv=B.inventaire(S),par=id=>inv.sources.find(s=>s.id===id).projets;
 assert.equal(par('carte')[0].titre,'Camille');assert.equal(par('studio').length,2);assert.equal(par('evenements')[0].titre,'Mariage Léa & Marc');
 assert.equal(par('stitch')[0].lien,'/stitch/atelier/?brouillon=pat-lavande');assert.match(par('broderies')[0].detail,/120 points faits/);
 assert.equal(par('compositions')[0].lien,'/synchroview/?v=a#s');assert.equal(par('compositions')[1].lien,'/synchroview/','un lien étranger est refusé');
 assert.match(par('infinity')[0].detail,/Niveau 7/);assert.ok(par('simulations')[0].demo,'une simulation est dite fictive');assert.ok(!inv.sources.some(s=>s.id==='timeline'),'/v1/ abandonné : plus listé');
 assert.deepEqual(inv.ancienBureau,['aime-lang','aime-tlz','aime-wp']);
 {const o=B.inventaire(stock({'aime-os':JSON.stringify({folders:[],memos:['x']})}));assert.deepEqual(o.ancienBureau,['aime-os'],'l\'ancien Bureau sous « aime-os » est inventorié');
  const n=B.inventaire(stock({'aime-os':JSON.stringify({version:1,fenetres:[]})}));assert.deepEqual(n.ancienBureau,[],'un état de fenêtres n\'est pas l\'ancien Bureau')}
 const rep=B.reprendre(inv,3);assert.equal(rep[0].enCours,true,'ce qui est en cours passe d\'abord');assert.ok(!rep.some(p=>p.source==='carte'));
 const v=B.inventaire(stock({}));assert.equal(v.projets.length,0);assert.equal(v.total,0);
 const abime=B.inventaire(stock({'echos:v2':'{pas du json','aime-carte':'"autre"','sv-compositions':'{}'}));assert.equal(abime.projets.length,0,'des données abîmées ne cassent rien');
 assert.equal(par('studio').find(p=>p.id==='p1').lien,'/studio/#open.p1','le Bureau ouvre CE projet, même si un autre était actif');
 assert.equal(par('evenements')[0].lien,'/studio/#ev.e1');assert.equal(par('broderies')[0].action,'Ouvrir la bibliothèque','pas de promesse de reprise exacte');
 const hist=B.inventaire(stock({'aime-app':JSON.stringify({events:[{id:'e2',names:'Léa & Marc',type:'mariage'},{id:'x y',type:'seminaire'}]}),'echos:v2':JSON.stringify({projects:[{id:'a/b',name:'Ancien'}]})}));
 assert.equal(hist.sources.find(s=>s.id==='evenements').projets[0].titre,'Léa & Marc','titre historique dans names');
 assert.equal(hist.sources.find(s=>s.id==='evenements').projets[1].lien,'/studio/','identifiant hors contrat : lien générique, honnête');
 assert.equal(hist.sources.find(s=>s.id==='studio').projets[0].lien,'/studio/');
 assert.equal(B.interne('//ailleurs.com/x','/b/'),'/b/');assert.equal(B.interne('/\\\\ailleurs','/b/'),'/b/')});

test('sauvegarde : tout part, tout revient, rien n\'est effacé, rien n\'est remplacé sans accord',()=>{
 const S=stock(plein),s=B.sauvegarder(S,'2026-10-21T00:00:00Z');assert.equal(s.nombre,Object.keys(plein).length);
 const lu=B.lireSauvegarde(JSON.stringify(s));const vide=stock({});const r=B.restaurer(vide,lu);assert.equal(r.ecrites.length,s.nombre);
 for(const k of Object.keys(plein))assert.equal(vide.getItem(k),plein[k],'identique : '+k);
 const autre=stock({'aime-wp':'"jour"','a-moi':'1'});const ap=B.apercu(autre,lu);assert.deepEqual(ap.differentes,['aime-wp']);
 const r2=B.restaurer(autre,lu);assert.equal(autre.getItem('aime-wp'),'"jour"','différente : gardée');assert.equal(autre.getItem('a-moi'),'1','absente du fichier : gardée');assert.deepEqual(r2.gardees,['aime-wp']);
 B.restaurer(autre,lu,true);assert.equal(autre.getItem('aime-wp'),'"nuit"','remplacée seulement sur demande');assert.equal(autre.getItem('a-moi'),'1');
 assert.throws(()=>B.lireSauvegarde('{"format":"autre"}'),/sauvegarde AIME/);assert.throws(()=>B.lireSauvegarde({format:'aime-sauvegarde',cles:{a:3}}),/abîmée/)});

test('moteur partagé : le Bureau est composé par vitrine/rendu.js, sans second moteur',()=>{
 const modele=JSON.parse(fs.readFileSync(R('vitrine/modeles/bureau.json'))),persp=JSON.parse(fs.readFileSync(R('vitrine/perspectives/bureau.json'))).angles[0];
 const c={espace:{nom:'Reprendre <b>',accent:'là',kicker:'Mon Bureau'},illustrations:{},blocs:{
  reprendre:{elements:[],vide:'Rien à reprendre.'},
  dossiers:{statuts:N.STATUTS,dossiers:[{id:'carte',nom:'Ma carte',elements:[],vide:'Vide.',ouvrir:{lien:'/aime/#story2',libelle:'Composer ma carte'}},{id:'studio',nom:'Supports',elements:[{titre:'<img src=x onerror=1>',lien:'/studio/'}]},{id:'lab',nom:'Lab',elements:N.par('role','experimenter')}]},
  navigateur:{paragraphes:['Dans ce navigateur.'],actions:[{action:'sauvegarder',libelle:'Sauvegarder'}]}}};
 const r=V.composer({contenu:c,perspective:persp,modele});
 assert.ok(!r.html.includes('<img'),'tout est échappé');assert.ok(r.html.includes('Rien à reprendre.'),'état vide utile');assert.ok(r.html.includes('data-action="sauvegarder"'));
 assert.ok(r.html.includes('Expérimental'),'statut affiché');assert.equal((r.html.match(/data-dossier=/g)||[]).length,3,'un dossier par entrée');
 assert.ok(/aria-controls="dos-studio"/.test(r.html)&&/id="dos-studio"[^>]*hidden/.test(r.html),'chaque dossier ouvre sa fenêtre, fermée au départ');
 assert.deepEqual(r.bilan.blocs,['reprendre','dossiers','navigateur']);
 const html=fs.readFileSync(R('bureau/espace/index.html'),'utf8');assert.ok(html.includes('/vitrine/rendu.js'),'Mon espace (la sauvegarde de ce navigateur) reste composé par le moteur partagé');assert.ok(!/function (rendre|composer)\(/.test(fs.readFileSync(R('bureau/bureau.js'),'utf8')),'pas de moteur concurrent')});

test('routes : /bureau/ mène à Mes projets (Mon espace et sa sauvegarde restent servis), aucune boucle, chaque entrée du registre aboutit',()=>{
 const v=JSON.parse(fs.readFileSync(R('vercel.json'))),reds=v.redirects||[];
 const re=s=>new RegExp('^'+s.replace(/[.+?^${}|[\]\\]/g,'\\$&').replace(/\/:path\\\*/g,'(?:/.*)?').replace(/:path\*/g,'.*').replace(/\\\(\.\*\)/g,'.*').replace(/\(\.\*\)/g,'.*')+'$');
 const suivre=u=>{const vu=[];for(let i=0;i<12;i++){const r=reds.find(r=>re(r.source).test(u));if(!r)return{fin:u,sauts:vu.length};assert.ok(!vu.includes(u),'boucle sur '+u);vu.push(u);u=r.destination}assert.fail('trop de redirections')};
 assert.equal(suivre('/zero').fin,'/','le contrôle des redirections fonctionne');assert.equal(suivre('/monde/a/b').fin,'/');
 for(const u of ['/aime','/aime/','/aime/index.html','/cube','/cube/','/cube/index.html'])assert.equal(suivre(u).fin,'/',u+' → Accueil (fermeture P1)');
 assert.ok(fs.existsSync(R('aime/index.html'))&&fs.existsSync(R('cube/index.html')),'les fichiers restent dans le dépôt, seules les adresses publiques redirigent vers /');
 assert.equal(suivre('/cube/modele.js').sauts,0,'les scripts /cube/*.js restent servis pour /maitre/');
 for(const u of ['/bureau','/bureau/','/bureau/index.html'])assert.equal(suivre(u).fin,'/projets/',u+' → Mes projets');
 for(const u of ['/bureau/espace/'])assert.equal(suivre(u).sauts,0,u+' : la sauvegarde reste servie');
 assert.ok(!fs.existsSync(R('bureau/index.html')),'le Bureau est supprimé (accord de Matt) ; l\'adresse redirige vers Mes projets');
 for(const r of reds)suivre(r.source.replace(/:path\*/,'x').replace('(.*)','x'));
 const rw=(v.rewrites||[]);const fichier=p=>{const f=p.endsWith('/')?p+'index.html':p;return fs.existsSync(R(f.slice(1)))||fs.existsSync(R(p.slice(1)+'/index.html'))};
 const sert=u=>{const p=u.split(/[?#]/)[0];if(fichier(p))return true;const r=rw.find(r=>r.source===p);return !!r&&fichier(r.destination)};
 for(const e of N.ENTREES){const f=suivre(e.href.split('?')[0]).fin;assert.ok(sert(f),e.id+' → '+f+' : aucun fichier')}
 const z=fs.readFileSync(R('index.html'),'utf8');
 assert.ok(!z.includes('id="entrer"')&&!/Et maintenant \?/.test(z),'« Et maintenant ? » a disparu : une seule entrée, par intention');assert.ok(!z.includes('/#entrer'),'plus de destination /#entrer');
 assert.ok(N.ENTREES.some(e=>e.id==='aime'&&e.href==='/aime/'&&e.cat==='jeux'),'Le Monde AIME passe au Lab, toujours servi');assert.ok(!z.includes('id="bureau" href="/bureau/"'),'aucun bouton Bureau dans le parcours principal');assert.ok(!/data-carte-ouvrir|zero-carte/.test(z),'la Page Zéro ne crée plus de Carte');assert.ok(!/MON BUREAU|AIME STUDIO<\/a>/.test(z),'en haut, seulement le logo');assert.doesNotMatch(z,/id="porte"/);assert.match(z,/AIMEPlus\.brancher/)});

test('Studio : un seul fichier, chaque atelier garde son adresse',()=>{
 const v=JSON.parse(fs.readFileSync(R('vercel.json'))),rw=v.rewrites||[],A=['accessibilite','buro','docs','image','stitchlab','web'];
 const st=fs.readFileSync(R('studio/index.html'),'utf8');assert.match(st,/location\.pathname\.match\(\/\^\\\/\(accessibilite\|buro\|docs\|image\|stitchlab\|web\)/,'l\'atelier se lit dans l\'adresse');
 const ATS=st.match(/const ATELIERS=\{([^\n]*?)\};/);for(const a of A){assert.ok(ATS&&new RegExp('\\b'+a+':\\{').test(ATS[1]),a+' est un atelier connu du Studio');
  assert.ok(!fs.existsSync(R(a+'/index.html')),a+'/index.html : copie revenue');for(const s of ['/'+a,'/'+a+'/'])assert.ok(rw.some(r=>r.source===s&&r.destination==='/studio/'),s+' réécrit vers le Studio')}
 assert.ok(fs.existsSync(R('docs/BUREAU.md')),'les documents de /docs/ restent servis')});
test('Accueil clair (25/10, validé par Matt) : de haut en bas, le titre, « Chacun son écran » sur les vraies règles, les sept téléphones, les capacités, la confiance, les domaines, l\'entrée',()=>{const z=fs.readFileSync(R('index.html'),'utf8'),v=fs.readFileSync(R('accueil/vitrine.js'),'utf8');
 const ordre=['id="haut"','id="demo"','id="ecrans"','id="mosaique"','id="capacites"','id="protection"','id="domaines"','id="entree"','id="contact"'].map(s=>z.indexOf(s));
 assert.ok(ordre.every((x,i)=>x>0&&(i===0||x>ordre[i-1])),'les chapitres se suivent de haut en bas');
 assert.match(z,/On ne peut pas tout être au même moment\.<\/span> Mais on peut être bien plus qu'une seule chose\./,'le manifeste sous AIME®');
 assert.match(z,/Démonstration · données fictives/);assert.ok(!/href="\/synchroview\//.test(z),'SynchroView est réservé au propriétaire du site : l\'accueil n\'y renvoie pas');
 assert.ok(/P\.can\(s,'read',\{type:'event'/.test(v)&&/P\.can\(s,'edit',\{type:'event'\}\)/.test(v),'« Chacun son écran » : les vraies règles (synchroview/permissions.js)');assert.ok(!/localStorage\.setItem|fetch\(/.test(v),'rien n\'est écrit ni envoyé');
 assert.ok(z.indexOf('/synchroview/permissions.js')<z.indexOf('/accueil/vitrine.js')&&z.indexOf('/coeur/roles.js')<z.indexOf('/accueil/vitrine.js'),'les règles et les couleurs avant la vitrine');
 assert.match(z,/<body class="clair">/,'clair : texte noir sur blanc');assert.ok(z.indexOf('/regie/scene.js')>0,'la régie garde la main sur ses textes')});
