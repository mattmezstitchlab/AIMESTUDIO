/* Studio Publication (M1) : le mode « planche » du moteur de pages, les gabarits, le Studio dans le Canevas, et les trois
   doubles pages témoins produites par l'outil. Une seule source, une seule chaîne de publication. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const R=f=>path.join(__dirname,'..',f),lire=f=>fs.readFileSync(R(f),'utf8');
const S=require('../vitrine/rendu.js').site;
let n=0;const t=(nom,f)=>{try{f()}catch(e){e.message=nom+' : '+e.message;throw e}n++};
const copie=o=>JSON.parse(JSON.stringify(o));
/* un ancien site, rendu AVANT que le mode planche soit chargé : il doit rester identique octet pour octet après */
const ancien=(()=>{const s=S.vide('mariage');s.infos.titre='Léa & Sam';s.infos.date='2027-06-12';['hero','texte','programme','galerie','lieu','rsvp','citation','image'].forEach(k=>S.ajouterSection(s,'index',k));s.pages[0].sections.find(x=>x.type==='citation').texte='Un *jour* à nous';return s})();
const avantPlanche=S.document(ancien,{}).html,exportAvant=JSON.stringify(S.exporter(ancien,{}));
const PL=require('../publication/planche.js'),Pub=require('../publication/gabarits.js'),D=require('../design/systemes.js');
const IDS=JSON.parse(lire('design/catalogue/index.json')).systemes,CAT=D.catalogue(IDS.map(i=>JSON.parse(lire('design/catalogue/'+i+'.json'))));
const PRES=Object.assign(JSON.parse(lire('vitrine/presentation/studio.json')),{systemes:CAT.compiles});
const EX=JSON.parse(lire('publication/exemples/aime-magazine-temoins.aime-site.json'));
const contenu=s=>JSON.stringify(s.pages.map(p=>p.sections.map(x=>{const o=Object.assign({},x);delete o.place;delete o.lecture;delete o.variante;delete o.ton;delete o.voile;delete o.role;return o}).sort((a,b)=>a.id<b.id?-1:1)));

t('compatibilité : un ancien site rend exactement comme avant, et ses citations restent littérales',()=>{
 assert.equal(S.document(ancien,{}).html,avantPlanche);assert.equal(JSON.stringify(S.exporter(ancien,{})),exportAvant);
 assert.ok(avantPlanche.includes('Un *jour* à nous'),'pas d\'accent hors des planches');assert.ok(!/planche/.test(avantPlanche))});

t('emplacements : toujours dans leur page, au moins 1 × 1, bornés',()=>{
 assert.deepEqual(PL.placer({p:5,x:-3,y:40,w:99,h:0,z:42},2),{p:1,x:0,y:15,w:12,h:1,z:9});assert.deepEqual(PL.placer({p:1,x:11,y:0,w:4,h:2},1),{p:0,x:8,y:0,w:4,h:2,z:0});assert.equal(PL.placer(null,2),null)});

t('gabarits : huit, portés des archétypes, emplacements valides et rôles uniques',()=>{
 assert.equal(Pub.GABARITS.length,8);Pub.GABARITS.forEach(g=>{const ids=new Set();g.emplacements.forEach(e=>{assert.ok(!ids.has(e.id),g.id+' '+e.id);ids.add(e.id);assert.ok(S.BLOCS[e.type],e.type);
  assert.deepEqual(PL.placer(e.place,g.pages),Object.assign({z:0},e.place),g.id+' '+e.id+' dans sa page')});assert.ok(['Axe','Cadre','Flux','Partition','Rupture','Trame'].includes(g.famille))})});

t('appliquer un gabarit ne perd rien : rôles, verrous, réserve, identifiants stables',()=>{
 const p=copie(EX.pages[1]),avant=copie(p);const r=Pub.appliquer(p,'article-colonnes');
 assert.deepEqual(r.page.sections.filter(s=>avant.sections.some(a=>a.id===s.id)).map(s=>s.id).sort(),avant.sections.map(s=>s.id).sort(),'tous les blocs sont gardés, mêmes identifiants');
 avant.sections.forEach(a=>{const b=r.page.sections.find(s=>s.id===a.id);['titre','texte','src','alt','auteur','surtitre'].forEach(k=>assert.equal(b[k],a[k],a.id+'.'+k))});
 const v=copie(EX.pages[2]);v.sections[0].verrou=true;const pl0=copie(v.sections[0].place);const r2=Pub.appliquer(v,'page-texte');assert.deepEqual(r2.page.sections[0].place,pl0,'un bloc verrouillé garde sa place');
 assert.ok(r2.reserve.length>0&&r2.reserve.every(id=>r2.page.sections.find(s=>s.id===id).place===null),'le reste passe en réserve');
 assert.deepEqual(p,avant,'la page d\'origine n\'est jamais modifiée en place')});

t('créer, ajouter, dupliquer, réordonner, retirer des pages ; la couverture reste en tête',()=>{
 let s=Pub.nouvelle({titre:'Catalogue <test>'});assert.ok(s.publication&&s.pages.length===2&&s.pages.every(p=>p.mode==='planche'));
 let r=Pub.ajouterPage(s,'essai-photo','index');s=r.site;assert.equal(s.pages[1].id,r.page);
 assert.equal(Pub.deplacerPage(s,r.page,-1).ok,false,'rien ne passe devant la couverture');s=Pub.deplacerPage(s,r.page,1).site;assert.equal(s.pages[2].id,r.page);
 const d=Pub.dupliquerPage(s,r.page);assert.equal(d.site.pages.length,4);const ids=d.site.pages.flatMap(p=>p.sections.map(x=>x.id));assert.equal(new Set(ids).size,ids.length,'identifiants uniques');
 assert.equal(Pub.retirerPage(d.site,'index').ok,false);assert.equal(Pub.retirerPage(d.site,r.page).site.pages.length,3)});

t('pagination et sommaire automatiques',()=>{
 assert.deepEqual(PL.folios(EX.pages),{index:1,edito:3,'design-systems':5});assert.deepEqual(PL.entreesSommaire(EX.pages,true).map(e=>[e.rubrique,e.page,e.lien]),[['00',3,'#edito'],['04',5,'#design-systems']])});

t('rendu ordinateur : doubles pages, grille 2 × 12, fond perdu, ordre de lecture du DOM',()=>{
 const h=S.document(EX,{unePage:true,presentation:PRES}).html;assert.equal((h.match(/class="planche planche-2"/g)||[]).length,3);
 assert.ok(/grid-template-columns:repeat\(24,minmax\(0,1fr\)\);grid-template-rows:repeat\(16/.test(h));assert.ok(!/<nav class="nav"|<footer/.test(h),'ni menu de site ni pied');
 EX.pages.forEach(p=>{const ordre=[...h.slice(h.indexOf('id="'+p.id+'"')).split('</section>')[0].matchAll(/<div id="([^"]+)" class="pl /g)].map(m=>m[1]);
  const attendu=p.sections.filter(s=>s.place).slice().sort((a,b)=>(a.lecture-b.lecture)).map(s=>s.id);assert.deepEqual(ordre,attendu,p.id+' : DOM = ordre de lecture')});
 assert.ok(h.includes('<h1 class="tt-t">AIME</h1>'),'titre de couverture en h1');assert.ok(/<em>relie<\/em>/.test(h));assert.ok(/class="sceau"/.test(h),'sceau iridescent');
 assert.ok(/@media \(max-width:1023px\)\{body\.publication main/.test(h),'téléphone : lecture en colonne')});

t('les trois doubles pages témoins sont des documents de l\'outil, complets',()=>{
 assert.deepEqual(Pub.verifier(EX),[]);assert.deepEqual(EX.pages.map(p=>p.gabarit),['couverture','ouverture-image','demonstration']);
 const d=EX.pages.find(p=>p.id==='design-systems'),types=d.sections.map(s=>s.type+':'+(s.variante||''));
 ['image:encadree','comparaison:design-systems','comparaison:avant-apres','etapes:numerotee','encadre:simple','bouton:centre'].forEach(k=>assert.ok(types.includes(k),k));
 const ecran=d.sections.find(s=>s.role==='ecran');assert.equal(ecran.reperes.length,4);assert.equal(d.sections.find(s=>s.type==='etapes').liste.length,4,'quatre étapes pour quatre repères');
 const h=S.document(EX,{page:'design-systems',presentation:PRES}).html;assert.equal((h.match(/class="rep"/g)||[]).length,4);assert.ok(/<ol class="rep-l vh">/.test(h),'repères lus par un lecteur d\'écran');
 ['Original Iris','Minimal Clair','Éditorial Magazine','Pro Atelier'].forEach(k=>assert.ok(h.includes(k),k+' rendu en direct'));assert.ok(/aria-current="true"/.test(h),'direction courante signalée');
 assert.ok(/href="\/canevas\/"/.test(h),'lien vers le Canevas')});

t('changer de Design System ne touche ni textes, ni médias, ni annotations, ni ordre de lecture',()=>{
 let s=copie(EX);const c0=contenu(s),e0=D.empreinte(s);IDS.concat([null]).forEach(id=>{const r=id?D.appliquer(s,id,CAT):D.restaurer(s);if(r.change)s=r.site;assert.equal(contenu(s),c0);assert.equal(D.empreinte(s),e0);
  const h=S.document(s,{unePage:true,presentation:PRES}).html;if(id)assert.ok(h.includes('--c1:'+CAT.compiles[id].a.c1+';'),id)});
 const a=D.annuler(s);assert.ok(a.change,'annulable')});

t('aucun script, aucune adresse libre : textes échappés, accent seul balisage, liens filtrés',()=>{
 const s=copie(EX),p=s.pages[1];p.sections.find(x=>x.role==='titre').titre='<script>alert(1)</script> *ok* <img src=x onerror=1>';p.sections.find(x=>x.type==='citation').auteur='"><svg onload=1>';
 const b=p.sections.find(x=>x.type==='image');s.pages[2].sections.find(x=>x.variante==='avant-apres').src='javascript:alert(1)';b.cadrage={x:'50;}body{x:1',y:900,zoom:-5};s.pages[2].sections.find(x=>x.type==='bouton').url='javascript:alert(1)';
 const h=S.document(s,{unePage:true,presentation:PRES}).html;assert.ok(!/<script>alert|<img src=x|<svg onload|javascript:|body\{x:1/.test(h));assert.ok(/&lt;script&gt;alert\(1\)&lt;\/script&gt; <em>ok<\/em>/.test(h));
 assert.ok(/object-position:50% 100%;transform:scale\(1\)/.test(h),'cadrage borné');
 const C=copie(CAT.compiles);C['aime-pro'].a.c1='red;}body{x:1';const h2=S.document(EX,{page:'design-systems',presentation:Object.assign({},PRES,{systemes:C})}).html;assert.ok(!/body\{x:1/.test(h2)&&h2.includes('Minimal Clair')&&!/Pro Atelier<\/b>/.test(h2),'un système altéré est écarté de la comparaison')});

t('images manquantes et contenus vides : rien ne casse, l\'édition le dit',()=>{
 const s=copie(EX);s.pages.forEach(p=>p.sections.forEach(x=>{if(x.src)delete x.src;if(x.src2)delete x.src2}));const h=S.document(s,{unePage:true,presentation:PRES}).html;assert.ok((h.match(/class="img-vide" role="img"/g)||[]).length>=3);
 const v=Pub.nouvelle({});const e=S.document(v,{page:'index',edition:true}).html,pub=S.document(v,{page:'index'}).html;assert.ok(/class="s-vide"/.test(e));assert.ok(!/class="s-vide"/.test(pub),'rien d\'indicatif dans la vue publique')});

t('public et privé : l\'export ne contient que la vue publique, sans marques d\'édition ni réserve',()=>{
 const s=copie(EX);s.pages[1].sections.push({id:'note-equipe',type:'texte',variante:'simple',titre:'',texte:'Note réservée à l\'équipe',audience:'equipe',place:{p:1,x:1,y:14,w:4,h:1},lecture:9});s.pages[1].sections.push({id:'garde',type:'texte',texte:'En réserve',audience:'public',place:null});
 const f=S.exporter(s,{presentation:PRES});assert.deepEqual(f.map(x=>x.chemin),['index.html']);assert.ok(!/Note réservée|data-sec=|class="pl-reserve"|En réserve/.test(f[0].contenu));
 assert.ok(/class="pl-reserve"/.test(S.document(s,{page:"edito",edition:true}).html),'l\'édition signale la réserve')});

t('le Studio dans le Canevas : adaptateur, routes, une seule écriture, aucune adresse d\'image libre',()=>{
 const a=lire('canevas/adaptateurs/publication.js'),cv=lire('canevas/canevas.js');
 assert.ok(cv.includes("publication:'/canevas/adaptateurs/publication.js'")&&cv.includes("{type:'publication',site:pub}")&&cv.includes('?publication=nouvelle'));
 assert.equal((a.match(/ecrire\(/g)||[]).length,2,'une seule écriture, dans enregistrer');assert.ok(/function enregistrer\(D\)\{[^]*?P\(\)\.verifier/.test(a),'vérifié avant d\'enregistrer');
 ['pub-g','pub-d','pub-cf','pub-scene','Gabarits','Médias','Styles','Défaire','Aperçu','Verrouiller la place','Ordre de lecture','Texte alternatif','Repères','Cadrage','role\',\'tablist','aria-live','ArrowLeft','shiftKey','PageUp','Escape'].forEach(k=>assert.ok(a.includes(k),k));
 assert.ok(!/[sn]\.src2?=(?!'biblio:|u;)/.test(a),'une image ne vient que de la bibliothèque');assert.ok(/E\.empreinte\(r\.site\)===E\.empreinte\(D\.site\)/.test(a),'Design System : empreinte vérifiée')});

t('lecture publique et exemple : /publication/ rend la vue publique, l\'exemple est servi',()=>{
 const l=lire('publication/lecture.js');assert.ok(/AIMESite\.document\(site,\{unePage:true/.test(l)&&!/edition:true/.test(l));assert.ok(lire('publication/index.html').includes('/publication/planche.js'))});

t('la Régie n\'est pas concernée',()=>{fs.readdirSync(R('regie')).filter(f=>/\.(js|html)$/.test(f)).forEach(f=>assert.ok(!/planche|publication\.js|Studio Publication/.test(lire('regie/'+f)),f))});

console.log('publication : '+n+' tests ok');
