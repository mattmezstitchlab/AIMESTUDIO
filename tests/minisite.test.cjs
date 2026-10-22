/* Lot B : un projet du Point Zéro devient un mini-site du moteur de pages existant, sans second générateur. */
const assert=require('assert');const S=require('../vitrine/rendu.js').site;const B=require('../pointzero/broderie.js');const M=require('../pointzero/modes.js');const MS=require('../pointzero/minisite.js');
let n=0;const t=(nom,f)=>{f();n++};
const PNG='data:image/png;base64,iVBORw0KGgo=';
function projet(){const p={id:'abc123',type:'broderie',titre:'Renard <b>',cree:'2026-10-22T08:00:00Z',choix:{largeurCm:15,usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{format:true},ratio:1.25,
 palette:[{dmc:'310',nom:'Noir',hex:'#000000',ecran:'#050505',points:400},{dmc:'06',nom:'Rose',hex:'#F0B0A0',ecran:'#EEB0A0',points:100}],apercu:PNG,cases:new Uint8Array([1,2]),dims:{l:2,h:1}};
 p.grille=B.grille(p.choix,p.ratio);M.decider(p,'largeurCm',15,'Largeur : 15 cm','utilisateur');return p}
t('le site suit le format aime-site, en grille, avec les vrais blocs du moteur',()=>{const s=MS.depuis(projet(),{S,B,M});assert.equal(s.format,'aime-site');assert.equal(s.pages[0].mode,'grille');
 const types=s.pages[0].sections.map(x=>x.type);assert.deepEqual(types,['hero','image','fils','chiffres','avancement','texte','etapes']);types.forEach(k=>assert.ok(S.BLOCS[k],k+' existe dans le moteur'));
 s.pages[0].sections.forEach(x=>{assert.ok(x.w>=1&&x.w<=12&&x.x>=0&&x.x+x.w<=12&&x.y>=0,x.id+' dans la grille')})});
t('le contenu vient du projet : motif, palette DMC intacte, dimensions, décisions, avancement, actions',()=>{const p=projet();const s=MS.depuis(p,{S,B,M,photo:PNG});
 assert.deepEqual(s.listes.fils.map(f=>f.dmc),['310','06'],'références DMC telles quelles');assert.equal(s.listes.galerie.length,2);
 assert.ok(s.listes.chiffres.some(c=>/×/.test(c.valeur)&&/points/.test(c.libelle)));assert.ok(s.listes.chiffres.some(c=>/cm/.test(c.valeur)));
 assert.equal(s.listes.etapes[0].titre,'Largeur : 15 cm');assert.match(s.listes.etapes[0].detail,/Vous/);
 const av=s.listes.avancement;assert.deepEqual(av.map(a=>a.nom),['Analyse','Confirmations','Réalisation','Livrables']);assert.equal(av[2].valeur,0,'réalisation jamais à 100 % par l\'analyse');
 const act=s.pages[0].sections.find(x=>x.id==='pz-actions');assert.match(act.texte,/À confirmer/);
 const h=S.document(s,{}).html;assert.ok(h.includes('DMC 06')&&h.includes('DMC 310'));assert.ok(!h.includes('<b>')||!h.includes('Renard <b>'),'titre échappé');assert.ok(h.includes('Renard &lt;b&gt;'))});
t('la disposition modifiée dans le générateur est gardée, le contenu du projet est rafraîchi',()=>{const p=projet();const s1=MS.depuis(p,{S,B,M});
 const sec=s1.pages[0].sections;sec.find(x=>x.id==='pz-fils').x=0;sec.find(x=>x.id==='pz-fils').w=12;s1.pages[0].sections=sec.filter(x=>x.id!=='pz-decisions');s1.presentation.ambiance='pastel';
 S.ajouterSection(s1,'index','citation');p.palette.push({dmc:'321',nom:'Rouge',hex:'#C72B3B',points:10});p.confirme.toile=true;
 const s2=MS.depuis(p,{S,B,M,ancien:s1});assert.equal(s2.id,s1.id);assert.equal(s2.presentation.ambiance,'pastel');
 assert.equal(s2.pages[0].sections.find(x=>x.id==='pz-fils').w,12,'taille gardée');assert.ok(!s2.pages[0].sections.some(x=>x.id==='pz-decisions'),'un bloc retiré ne revient pas');
 assert.ok(s2.pages[0].sections.some(x=>x.type==='citation'),'un bloc ajouté reste');assert.equal(s2.listes.fils.length,3,'palette à jour')});
t('nouveaux blocs du moteur : couleurs refusées si invalides, avancement borné',()=>{const s=S.vide('vierge');s.listes.fils=[{dmc:'1',hex:'red;background:url(x)'}];s.listes.avancement=[{nom:'A',valeur:250}];
 s.pages[0].sections=[{id:'a',type:'fils'},{id:'b',type:'avancement'}];const h=S.document(s,{}).html;assert.ok(!h.includes('url(x)'));assert.ok(h.includes('100 %'))});
t('page /projet/ : charge le moteur ; « Modifier dans le Canevas » remplace le générateur',()=>{const h=require('fs').readFileSync(require('path').join(__dirname,'..','projet/index.html'),'utf8');
 ['/vitrine/rendu.js','/pointzero/minisite.js','/pointzero/broderie.js','/pointzero/modes.js'].forEach(x=>assert.ok(h.includes(x),x));
 const js=require('fs').readFileSync(require('path').join(__dirname,'..','projet/projet.js'),'utf8');assert.ok(!/\/sites\/\?site=/.test(js),'le générateur de sites n\'est plus la destination');assert.match(js,/\/canevas\/\?site='\+encodeURIComponent\(sid\)\+'&projet='/,'le même mini-site s\'édite dans le Canevas');assert.match(js,/\/canevas\/\?projet=/,'le patron reste ouvrable');
 assert.match(h,/Voir mon mini-site/);assert.match(h,/Modifier dans le Canevas/);assert.ok(!/Modifier la disposition|générateur/.test(h))});
console.log('minisite : '+n+' tests ok');
