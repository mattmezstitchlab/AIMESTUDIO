/* Design Systems 3.0 : une direction change la présentation d'une réalisation, jamais son contenu.
   Démonstration limitée : un mini-site du Point Zéro, les quatre directions du catalogue, dans le Canevas. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const R=f=>path.join(__dirname,'..',f),lire=f=>fs.readFileSync(R(f),'utf8');
const D=require('../design/systemes.js'),S=require('../vitrine/rendu.js').site,B=require('../pointzero/broderie.js'),M=require('../pointzero/modes.js'),MS=require('../pointzero/minisite.js');
let n=0;const t=(nom,f)=>{try{f()}catch(e){e.message=nom+' : '+e.message;throw e}n++};
const IDS=JSON.parse(lire('design/catalogue/index.json')).systemes,BRUT=IDS.map(i=>JSON.parse(lire('design/catalogue/'+i+'.json')));
const CAT=D.catalogue(BRUT),PRES=JSON.parse(lire('vitrine/presentation/studio.json')),P=Object.assign({},PRES,{systemes:CAT.compiles});
const copie=o=>JSON.parse(JSON.stringify(o));
function systeme(){return copie(BRUT.find(x=>x.id==='aime-editorial'))}
function miniSite(){const p={id:'abc123',type:'broderie',titre:'Renard',cree:'2026-10-22T08:00:00Z',choix:{largeurCm:15,usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{format:true},ratio:1.25,
 palette:[{dmc:'310',nom:'Noir',hex:'#000000',ecran:'#050505',points:400},{dmc:'06',nom:'Rose',hex:'#F0B0A0',ecran:'#EEB0A0',points:100}],cases:new Uint8Array([1,2]),dims:{l:2,h:1}};
 p.grille=B.grille(p.choix,p.ratio);M.decider(p,'largeurCm',15,'Largeur : 15 cm','utilisateur');return MS.depuis(p,{S,B,M})}

t('le catalogue livre les quatre directions, valides telles quelles, avec des identifiants stables',()=>{
 assert.deepEqual(CAT.ids,['aime-original','aime-minimal','aime-editorial','aime-pro']);
 IDS.forEach(i=>{const r=CAT.rapports[i];assert.deepEqual([r.erreurs,r.corrections,r.completees],[[],[],[]],i)});
 assert.deepEqual(BRUT.map(x=>x.nom),['Original Iris','Minimal Clair','Éditorial Magazine','Pro Atelier']);BRUT.forEach(x=>{assert.equal(x.format,'aime-design-system');assert.equal(x.version,'3.0.0')})});

t('une couleur ne peut jamais injecter du CSS : seul #RRGGBB passe',()=>{
 ['red;}body{display:none','#FFF','#12345G','url(https://x.test/a.png)','#FFFFFF;}','expression(alert(1))','#FFFFFF /*','var(--x)',' #FFFFFF','#FFFFFF\n}',123,null,{}].forEach(v=>{
  const s=systeme();s.jetons.couleurs.primaire=v;const r=D.valider(s,{bases:CAT.bases});assert.equal(r.ok,false,JSON.stringify(v));assert.ok(r.rapport.erreurs.some(e=>/couleur #RRGGBB/.test(e)))});
 const s=systeme();s.jetons.couleurs.primaire='#7a2e1d';assert.ok(D.valider(s,{bases:CAT.bases}).systeme.jetons.couleurs.primaire==='#7A2E1D','minuscules acceptées, normalisées')});

t('une police est un identifiant du registre ; la pile CSS vient du registre, jamais du fichier',()=>{
 ['Inter','inter;}body{x:1}','"Comic Sans"','../font','constructor','__proto__'].forEach(v=>{const s=systeme();s.jetons.typographie.titres=v;assert.equal(D.valider(s,{bases:CAT.bases}).ok,false,v)});
 Object.values(D.POLICES).forEach(p=>{assert.ok(/^[\w\s"',.-]+$/.test(p.pile),p.nom);if(p.google)assert.ok(/^[\w+:;@.,]+$/.test(p.google),p.nom)})});

t('les rayons ont des bornes selon leur contexte, ramenées et signalées',()=>{
 const s=systeme();s.jetons.structure.rayons={surface:900,controle:900,media:900,pastille:5000};const r=D.valider(s,{bases:CAT.bases});
 assert.ok(r.ok);assert.deepEqual(r.systeme.jetons.structure.rayons,{surface:32,controle:24,media:40,pastille:999});
 assert.ok(r.rapport.corrections.some(c=>/rayons.controle.*24px \(boutons et champs\)/.test(c)));assert.ok(r.rapport.corrections.some(c=>/rayons.media.*40px \(images/.test(c)));
 const s2=systeme();s2.jetons.structure.rayons.surface=-8;s2.jetons.typographie.graisseTitres=1234;s2.jetons.typographie.approche=0.5;const r2=D.valider(s2,{bases:CAT.bases}).systeme;
 assert.equal(r2.jetons.structure.rayons.surface,0);assert.equal(r2.jetons.typographie.graisseTitres,900);assert.equal(r2.jetons.typographie.approche,0.12);
 ['12px','NaN',Infinity,'1e3'].forEach(v=>{const x=systeme();x.jetons.structure.rayons.surface=v;assert.equal(D.valider(x,{bases:CAT.bases}).ok,false,String(v))})});

t('version : seule la majeure 3 est lue ; une version future ou ancienne est refusée',()=>{
 ['4.0.0','2.1.0','1.0','',undefined].forEach(v=>{const s=systeme();s.version=v;const r=D.valider(s,{bases:CAT.bases});assert.equal(r.ok,false,String(v));assert.ok(/non prise en charge/.test(r.rapport.erreurs[0]))});
 const s=systeme();s.format='aime-design-systeme';assert.equal(D.valider(s).ok,false)});

t('un système partiel est complété par la base de SON mode, jamais un thème sombre sous un thème clair',()=>{
 const clair={format:'aime-design-system',version:'3.0.1',id:'essai-clair',revision:'1.0.0',mode:'clair',nom:'Essai',jetons:{couleurs:{primaire:'#7A2E1D'}}};
 const r=D.valider(clair,{bases:CAT.bases});assert.ok(r.ok,r.rapport.erreurs.join(' | '));assert.equal(r.systeme.jetons.couleurs.fond,'#F6F4EF','fond de Minimal Clair');assert.ok(r.rapport.completees.includes('couleurs.fond'));
 const sombre=Object.assign({},clair,{id:'essai-sombre',mode:'sombre',jetons:{couleurs:{primaire:'#7866F2'}}});assert.equal(D.valider(sombre,{bases:CAT.bases}).systeme.jetons.couleurs.fond,'#08080A');
 assert.equal(D.valider(clair).ok,false,'sans base, un système incomplet est refusé');assert.equal(D.valider(Object.assign({},clair,{mode:'auto'}),{bases:CAT.bases}).ok,false)});

t('contraste : un texte sous l\'AA est refusé (le défaut « textFaint » ne peut pas revenir)',()=>{
 const s=systeme();s.jetons.couleurs.texteDoux='#B8AC9C';const r=D.valider(s,{bases:CAT.bases});assert.equal(r.ok,false);assert.ok(/texteDoux.*fond/.test(r.rapport.erreurs.join()));
 IDS.forEach(i=>D.contrastes(CAT.compiles[i]).forEach(k=>assert.ok(k.ok,i+' · '+k.paire+' '+k.ratio)))});

t('importer : JSON seulement, taille bornée, rien n\'est appliqué',()=>{
 assert.equal(D.importer('{"format":',CAT).ok,false);assert.equal(D.importer('x'.repeat(200001),CAT).ok,false);assert.equal(D.importer(42,CAT).ok,false);
 const ok=D.importer(JSON.stringify(systeme()),CAT);assert.ok(ok.ok);assert.ok(!('site' in ok))});

t('appliquer les quatre directions à un mini-site du Point Zéro : l\'empreinte du contenu ne change jamais',()=>{
 const site=miniSite(),e0=D.empreinte(site),c0=copie(site);let s=site;
 IDS.forEach(i=>{const r=D.appliquer(s,i,CAT);assert.ok(r.change,i);assert.equal(D.empreinte(r.site),e0,i);assert.deepEqual(r.site.presentation.design,{id:i,revision:'1.0.0'});s=r.site});
 assert.deepEqual(site,c0,'le site d\'origine n\'est jamais modifié en place');
 assert.deepEqual(s.listes.fils.map(f=>f.dmc),['310','06'],'références DMC intactes');assert.equal(s.presentation.ambiance,site.presentation.ambiance,'l\'ambiance d\'origine est gardée')});

t('annuler remonte l\'historique ; restaurer rend l\'apparence d\'origine ; historique borné',()=>{
 let s=miniSite();s=D.appliquer(s,'aime-pro',CAT).site;s=D.appliquer(s,'aime-editorial',CAT).site;
 s=D.annuler(s).site;assert.equal(s.presentation.design.id,'aime-pro');s=D.annuler(s).site;assert.equal(s.presentation.design,null);assert.equal(D.annuler(s).change,false);
 s=D.appliquer(s,'aime-minimal',CAT).site;s=D.restaurer(s).site;assert.equal(s.presentation.design,null);assert.equal(D.annuler(s).site.presentation.design.id,'aime-minimal','la restauration s\'annule aussi');
 for(let k=0;k<50;k++)s=D.appliquer(s,IDS[k%4],CAT).site;assert.equal(s.presentation.historique.length,D.HISTO);
 assert.equal(D.appliquer(s,'inconnu',CAT).change,false);assert.equal(D.appliquer(s,s.presentation.design.id,CAT).change,false)});

t('le moteur de pages : sans pointeur, rendu identique ; pointeur inconnu, retour à l\'ambiance ; chaque direction, ses jetons',()=>{
 const site=miniSite(),h0=S.document(site,{presentation:PRES}).html;assert.equal(S.document(site,{presentation:P}).html,h0,'sans Design System, rien ne change');
 const inc=copie(site);inc.presentation.design={id:'disparu',revision:'1.0.0'};assert.equal(S.document(inc,{presentation:P}).html,h0,'identifiant inconnu : ambiance d\'origine');
 const pro=D.appliquer(site,'aime-pro',CAT).site;assert.equal(S.document(pro,{presentation:PRES}).html,h0,'sans catalogue chargé : ambiance d\'origine');
 IDS.forEach(i=>{const c=CAT.compiles[i],h=S.document(D.appliquer(site,i,CAT).site,{presentation:P}).html;
  assert.ok(h.includes('--c1:'+c.a.c1+';')&&h.includes('--fond:'+c.a.fond+';')&&h.includes('--encre:'+c.a.encre+';'),i+' couleurs');
  assert.ok(h.includes('.btn{border-radius:'+c.rayons.controle+'px}'),i+' rayon des contrôles');assert.ok(h.includes(c.fonts.replace(/&/g,'&amp;'))||h.includes(c.fonts),i+' polices');
  assert.ok(h.includes('--esp:'+(c.densite==='compact'?0.7:1)+'}'),i+' densité');
  ['Renard','310','Noir'].forEach(m=>assert.ok(h.includes(m),i+' contenu « '+m+' »'))})});

t('garde du moteur : un système compilé altéré n\'entre jamais dans la feuille',()=>{
 const site=D.appliquer(miniSite(),'aime-pro',CAT).site,h0=S.document(miniSite(),{presentation:PRES}).html;
 [['a','c1','red;}body{x:1'],['t','titre','x;}body{x:1'],['t','approche','1em;}'],['t','casse','none;}x{'],[null,'fonts','https://evil.test/x.css']].forEach(([g,k,v])=>{const C=copie(CAT.compiles);if(g)C['aime-pro'][g][k]=v;else C['aime-pro'][k]=v;
  const h=S.document(site,{presentation:Object.assign({},PRES,{systemes:C})}).html;assert.equal(h,h0,k);assert.ok(!/body\{x:1|evil\.test/.test(h))})});

t('données manquantes : un mini-site vide se rend dans les quatre directions',()=>{
 const v=S.vide('vierge');S.ajouterSection(v,'index','hero');S.ajouterSection(v,'index','galerie');S.ajouterSection(v,'index','programme');
 IDS.forEach(i=>{const h=S.document(D.appliquer(v,i,CAT).site,{presentation:P}).html;assert.ok(h.length>1000&&/<main>/.test(h),i)})});

t('le Canevas : action « Design System », un clic par direction, comparaison, annulation, restauration, accessibles',()=>{
 const a=lire('canevas/adaptateurs/site.js');
 ["/design/charger.js","{id:'design',nom:'Design System'}","type='radio'","'Comparer avant / après'","'Annuler le changement'","'Revenir à l\\'apparence d\\'origine'","aria-live","'Escape'","aria-expanded","role','dialog'"].forEach(k=>assert.ok(a.includes(k),k));
 assert.ok(/E\.empreinte\(r\.site\)!==E\.empreinte\(D\.site\)/.test(a),'empreinte vérifiée avant d\'accepter');
 assert.equal((a.match(/ecrire\(/g)||[]).length,2,'toujours un seul enregistrement, sur confirmation');
 const css=lire('canevas/adaptateurs/site.css');assert.ok(/max-width:640px\)\{\.cvs-ds\{/.test(css),"panneau au-dessus de la barre sur téléphone");assert.ok(/\.cvs-ds-o input:focus-visible/.test(css))});

t('le Point Zéro rafraîchit le contenu du mini-site sans perdre son Design System',()=>{const s=D.appliquer(miniSite(),'aime-editorial',CAT).site;const p={id:'abc123',type:'broderie',titre:'Renard',cree:'2026-10-22T08:00:00Z',choix:{largeurCm:15,usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{},ratio:1.25,palette:[{dmc:'310',nom:'Noir',hex:'#000000',points:400}],cases:new Uint8Array([1]),dims:{l:1,h:1}};p.grille=B.grille(p.choix,p.ratio);
 const r=MS.depuis(p,{S,B,M,ancien:s});assert.deepEqual(r.presentation.design,{id:'aime-editorial',revision:'1.0.0'});assert.equal(r.presentation.historique.length,1)});
t('l\'aperçu du projet montre le même Design System',()=>{assert.ok(lire('projet/index.html').includes('/design/charger.js'));assert.ok(/AIMEDesignCharger\(\)\.then\(function\(c\)\{j\.systemes=c\.compiles/.test(lire('projet/projet.js')))});

t('la Régie n\'est pas concernée : elle ne charge aucun Design System, son rendu reste celui de l\'ambiance',()=>{
 fs.readdirSync(R('regie')).filter(f=>/\.(js|html|json)$/.test(f)).forEach(f=>assert.ok(!/design\/(systemes|charger|catalogue)/.test(lire('regie/'+f)),f));
 assert.ok(/var D=systemeDe\(site,P\);if\(D\)/.test(lire('vitrine/rendu.js')),'le moteur ne lit un Design System que si l\'appelant fournit P.systemes')});

console.log('design : '+n+' tests ok');
