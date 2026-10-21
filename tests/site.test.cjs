/* Le générateur de site : moteur partagé, une info écrite une fois, perspectives, liens sûrs, export. */
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const S=require('../vitrine/rendu.js').site,P=require('../vitrine/presentation/studio.json'),M=require('../vitrine/modeles/sites.json').modeles,PE=require('../vitrine/perspectives/sites.json').angles;
const B=require('../bureau/sources.js');
function complet(){const s=S.vide('mariage');Object.keys(S.BLOCS).forEach(t=>S.ajouterSection(s,'index',t));return s}
test('chaque modèle est valable : blocs connus, ambiance existante, une page d\'accueil',()=>{
 assert.ok(M.length>=6);for(const m of M){assert.ok(P.ambiances.some(a=>a.id===m.ambiance),m.id+' : ambiance');assert.equal(m.pages[0].id,'index',m.id);
  for(const p of m.pages)for(const t of p.sections){const ty=typeof t==='string'?t:t.type;assert.ok(S.BLOCS[ty],m.id+' : bloc '+ty)}
  const s=S.appliquerModele(S.vide(),m);assert.equal(S.exporter(s,{presentation:P}).length,m.pages.length)}});
test('la présentation vient d\'AIME Studio : 36 ambiances, 10 typographies, toutes résolues',()=>{
 assert.equal(P.ambiances.length,36);assert.equal(Object.keys(P.typographies).length,10);for(const a of P.ambiances)assert.ok(P.typographies[a.typo],a.id)});
test('une information écrite une fois se retrouve partout où elle sert',()=>{
 const s=complet();s.infos.titre='Alice & Noé';s.infos.date='2027-06-12';s.infos.lieu='Domaine des Tilleuls';s.infos.email='a@exemple.fr';
 const h=S.document(s,{presentation:P}).html;assert.ok((h.match(/12 juin 2027/g)||[]).length>=3,'en-tête, compte à rebours, pied');assert.ok(h.includes('data-compte="2027-06-12T12:00"'));
 assert.ok(h.includes('data-rsvp="a@exemple.fr"'));assert.ok(h.includes('Domaine des Tilleuls'));assert.ok(h.includes('openstreetmap.org/search?query=Domaine%20des%20Tilleuls'))});
test('rien d\'écrit par la personne ne devient du code ; les liens dangereux sont refusés',()=>{
 const s=complet(),X='<img src=x onerror=alert(1)>';s.infos.titre=X;s.infos.url='javascript:alert(1)';s.infos.bouton='Go';s.listes.programme.push({heure:X,titre:X,detail:X});s.listes.liens.push({nom:'x',url:'javascript:alert(1)'});s.listes.galerie.push({src:'javascript:alert(1)',legende:X});
 s.pages[0].sections.forEach(x=>{x.titre=X;x.texte=X;x.url='data:text/html,<script>1</script>'});const h=S.document(s,{presentation:P}).html;
 assert.ok(!h.includes('<img src=x'),'échappé');assert.ok(!/href="javascript:/i.test(h));assert.ok(!/href="data:/i.test(h));assert.ok(!/src="javascript:/i.test(h));
 assert.equal(S.lien('javascript:x'),'');assert.equal(S.lien('exemple.fr'),'https://exemple.fr');assert.equal(S.img('http://x.fr/a.jpg'),'');assert.ok(S.img('data:image/jpeg;base64,AAAA'))});
test('qui voit quoi : les règles partagées (permissions.js, item.read) décident, section par section et ligne par ligne',()=>{
 const R=require('../synchroview/permissions.js'),V=require('../vitrine/perspectives/sites.json').vues;assert.deepEqual(V.map(v=>v.id),['public','proche','viewer','pro','coord','moi']);assert.match(require('../vitrine/perspectives/sites.json')._,/exporté en fichiers est public/);
 const s=S.vide();const a=S.ajouterSection(s,'index','texte');a.texte='Pour tous';const b=S.ajouterSection(s,'index','texte');b.texte='Note d\'équipe';b.audience='equipe';const o=S.ajouterSection(s,'index','texte');o.texte='Budget';o.audience='organisation';
 S.ajouterSection(s,'index','programme');s.listes.programme=[{heure:'14:00',titre:'Cérémonie'},{heure:'12:30',titre:'Installation',audience:'equipe'}];
 const vue=role=>S.document(s,{presentation:P,vue:role?{role}:null,regles:R});
 const pub=vue(null),inv=vue('guest'),pro=vue('contributor'),coord=vue('editor');
 assert.ok(pub.html.includes('Pour tous')&&!pub.html.includes('Note d')&&!pub.html.includes('Budget')&&!pub.html.includes('Installation'));
 assert.ok(!inv.html.includes('Note d')&&!inv.html.includes('Installation'));assert.equal(inv.bilan.masquees[0].raison,'réservé à l\'équipe');
 assert.ok(pro.html.includes('Note d')&&pro.html.includes('Installation')&&!pro.html.includes('Budget'));
 assert.ok(coord.html.includes('Budget'));assert.equal(coord.bilan.masquees.length,0);
 assert.ok(!S.exporter(s,{presentation:P})[0].contenu.includes('Note d'),'un export ne contient que la vue publique');
 const m=S.migrer(JSON.parse(JSON.stringify(Object.assign(S.vide(),{pages:[{id:'index',titre:'A',sections:[{id:'x1',type:'texte',pour:['organisation']},{id:'x2',type:'texte',pour:['public','invite']}]}]}))));
 assert.deepEqual(m.pages[0].sections.map(x=>x.audience),['organisation','public'],'les anciens sites passent aux audiences')});
test('partir d\'un démonstrateur : les mêmes faits, rien d\'inventé, les moments d\'équipe restent à l\'équipe',()=>{
 const R=require('../synchroview/permissions.js');for(const u of ['mariage','seminaire','world']){const d=require('../vitrine/donnees/'+u+'.json'),s=S.depuisVitrine(d);
  assert.equal(s.infos.titre,d.evenement.nom);assert.equal(s.listes.programme.length,d.moments.length);assert.match(s.infos.sous,/données fictives/);
  const nonPublics=d.moments.filter(m=>m.public===false).length;assert.equal(s.listes.programme.filter(l=>l.audience==='equipe').length,nonPublics);
  const p=S.document(s,{presentation:P,page:'programme',vue:null,regles:R}),c=S.document(s,{presentation:P,page:'programme',vue:{role:'editor'},regles:R});assert.ok(p.bilan.lignesMasquees>=nonPublics);assert.equal(c.bilan.lignesMasquees,0)}});
test('tous les blocs se dessinent, vides ou remplis, et l\'édition montre quoi remplir',()=>{
 const s=complet(),vide=S.document(s,{presentation:P,edition:true}).html;assert.ok((vide.match(/class="s-vide"/g)||[]).length>=10);
 const pub=S.document(s,{presentation:P}).html;assert.ok(!pub.includes('class="s-vide"'),'rien à remplir dans l\'export');
 Object.keys(S.LISTES).forEach(k=>{const o={};S.LISTES[k].forEach(c=>o[c]=c==='src'?'https://exemple.fr/a.jpg':c==='url'||c==='lien'?'https://exemple.fr':'valeur '+c);s.listes[k].push(o)});Object.assign(s.infos,{titre:'T',date:'2027-01-01',lieu:'L',email:'a@b.fr',tel:'01 02',url:'https://x.fr',bouton:'Go'});
 const plein=S.document(s,{presentation:P,edition:true}).html;assert.ok((plein.match(/class="s-vide"/g)||[]).length<=5,'presque tout est rempli (restent : texte, citation, bouton, vidéo, photos partagées, qui ont leurs propres champs)');assert.ok(S.contraste('#000000','#FFFFFF')>20)});
test('export : une page HTML autonome par page, ou une seule page avec ancres',()=>{
 const s=S.appliquerModele(S.vide(),M.find(m=>m.id==='mariage'));const f=S.exporter(s,{presentation:P});assert.deepEqual(f.map(x=>x.chemin),['index.html','jour-j.html','pratique.html','reponse.html']);
 assert.ok(f[0].contenu.startsWith('<!doctype html>')&&f[0].contenu.includes('href="jour-j.html"'));const u=S.exporter(s,{presentation:P,unePage:true});assert.equal(u.length,1);assert.ok(u[0].contenu.includes('href="#jour-j"'))});
test('le Bureau retrouve les sites de ce navigateur',()=>{const m=new Map([['aime-sites',JSON.stringify({cur:'s1',sites:{s1:{nom:'Mariage',pages:[{},{}],infos:{titre:'A & N'},majLe:'2026-10-21T01:00:00Z'}}})]]);
 const st={get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null};const inv=B.inventaire(st),s=inv.sources.find(x=>x.id==='sites').projets[0];assert.equal(s.lien,'/sites/?site=s1');assert.match(s.detail,/2 pages · A & N/);assert.ok(s.enCours)});

test('grille libre (reprise du mini-site de la landing) : formes selon la largeur, pas de chevauchement, plan B, onde',()=>{
 assert.deepEqual([2,4,6,9].map(w=>S.formeDe('date',w)),['pastille','compte','mois','frise']);assert.deepEqual([2,5,8].map(w=>S.formeDe('endroit',w)),['nom','carte','itineraire']);assert.deepEqual([2,5,9].map(w=>S.formeDe('gens',w)),['avatars','equipe','reseau']);
 const m=M.find(x=>x.id==='libre');const s=S.appliquerModele(S.vide(),m);assert.equal(s.pages[0].mode,'grille');Object.assign(s.infos,{date:'2027-06-12',lieu:'Domaine',planB:'La halle',pluie:true});
 let h=S.document(s,{presentation:P}).html;assert.ok(h.includes('class="grille"'));assert.match(h,/grid-column:1 \/ span 12/);assert.ok(h.includes('Plan B pluie : La halle'));assert.ok(h.includes('Plan B : Sous la halle'));
 const d=s.pages[0].sections.find(x=>x.type==='date');d.w=6;h=S.document(s,{presentation:P}).html;assert.ok(h.includes('inf-mois'),'à 6 colonnes, la date devient un calendrier');
 const l=s.pages[0].sections,g=l.find(x=>x.type==='gens'),e=l.find(x=>x.type==='endroit');g.x=e.x;g.y=e.y;S.tasser(l,g.id);
 const occ={};for(const x of l){for(let a=x.y;a<x.y+S.hauteur(x.type,x.w);a++)for(let b=x.x;b<x.x+x.w;b++){assert.ok(!occ[a+':'+b],'chevauchement en '+a+':'+b);occ[a+':'+b]=1}}
 assert.deepEqual(S.DEPS.date.slice().sort(),['bienvenue','billet','compte','date','fairepart','hero','monogramme','support']);const t=S.vide();S.ajouterSection(t,'index','texte');S.ajouterSection(t,'index','compte');S.versGrille(t.pages[0]);assert.ok(t.pages[0].sections.every(x=>x.x!=null&&x.w));S.versSections(t.pages[0]);assert.equal(t.pages[0].mode,'sections')});
test('régénérer : le mini-site de la landing et un projet du Studio, sans perte, et ce qui manque est dit',()=>{
 const j={preset:'maries',P:{title:'A & B',sub:'S',date:'14 juin 2027',iso:'',place:'Domaine',text:'Histoire',quote:'Q',cta:'Répondre',url:'',prog:[['15:00','Moment','abri']],people:[['A','rôle']],photos:['data:image/jpeg;base64,AAAA','javascript:alert(1)'],rain:true},
  blocks:[{k:'hero',x:0,y:0,w:12},{k:'i-date',x:0,y:4,w:4,hue:90},{k:'texte',x:4,y:4,w:8,serif:true,br:0},{k:'radial',x:0,y:8,w:4},{k:'i-gens',x:0,y:4,w:4}]};
 const r=S.depuisMiniSite(j),s=r.site,l=s.pages[0].sections;assert.equal(s.pages[0].mode,'grille');assert.deepEqual(r.rapport.omis,['radial']);assert.equal(s.infos.date,'2027-06-14','date française relue');assert.equal(s.infos.pluie,true);
 assert.equal(s.listes.galerie.length,1,'image dangereuse refusée');assert.equal(l.find(x=>x.type==='texte').texte,'Histoire');assert.deepEqual(l.find(x=>x.type==='date').style,{teinte:90});
 const occ={};for(const x of l)for(let a=x.y;a<x.y+S.hauteur(x.type,x.w);a++)for(let b=x.x;b<x.x+x.w;b++){assert.ok(!occ[a+':'+b],'chevauchement');occ[a+':'+b]=1}
 assert.ok(S.document(s,{presentation:P}).html.includes('hsl(90'));assert.throws(()=>S.depuisMiniSite({}),/mini-site/);
 const q=S.depuisStudio({id:'p',name:'Lin',pack:'artisan',versions:[{d:{title:'Lin',blurb:'B',items:[{n:'Ourlet',p:'15 €'}],series:'Ana ; couturière',contact:'a@b.fr 06 12 34 56 78',city:'Nantes'},b:{amb:'h_lin'}}]}).site;
 assert.equal(q.infos.email,'a@b.fr');assert.equal(q.listes.tarifs[0].prix,'15 €');assert.equal(q.listes.personnes[0].role,'couturière');assert.equal(q.presentation.ambiance,'h_lin');assert.ok(q.pages[0].sections.some(x=>x.type==='contact'))});
test('exporter pour publier : aucun contenu réservé dans AUCUN fichier ; la sauvegarde privée garde tout et se réimporte',()=>{
 const R=require('../synchroview/permissions.js');const s=S.vide('vierge');s.nom='NOM-INTERNE-PRIVE';s.infos.titre='Fête publique';s.infos.date='2027-06-12';
 const pub=S.ajouterSection(s,'index','texte');pub.texte='Texte public';
 const m=S.ajouterSection(s,'index','texte');m.titre='SECRET-MEMBRES-TITRE';m.texte='SECRET-MEMBRES';m.audience='membres';
 const e=S.ajouterSection(s,'index','citation');e.texte='SECRET-EQUIPE';e.auteur='SECRET-AUTEUR';e.audience='equipe';
 S.ajouterSection(s,'index','programme');s.listes.programme=[{heure:'14:00',titre:'Accueil'},{heure:'12:00',titre:'SECRET-LIGNE-EQUIPE',detail:'SECRET-DETAIL',audience:'equipe'},{heure:'23:00',titre:'SECRET-LIGNE-ORGA',audience:'organisation'}];
 S.ajouterSection(s,'index','galerie');s.listes.galerie=[{src:'data:image/png;base64,UFVCTElD',legende:'Photo publique'},{src:'data:image/png;base64,U0VDUkVU',legende:'SECRET-PHOTO',audience:'organisation'}];
 S.ajouterSection(s,'index','faq');s.listes.faq=[{q:'Public ?',r:'Oui'},{q:'SECRET-QUESTION',r:'SECRET-REPONSE',audience:'membres'}];
 s.pages.push({id:'coulisses',titre:'SECRET-PAGE-ORGA',mode:'sections',sections:[{id:'xo',type:'texte',texte:'SECRET-PAGE-TEXTE',audience:'organisation',variante:'simple'}]});
 const MARQUES=['SECRET','U0VDUkVU','NOM-INTERNE-PRIVE','coulisses'];
 for(const opts of [{},{unePage:true}]){const F=opts.unePage?S.exporter(s,Object.assign({presentation:P},opts)):S.exporterPublic(s,{presentation:P});
  assert.ok(F.length>=1);for(const f of F){for(const k of MARQUES)assert.ok(!f.contenu.includes(k),f.chemin+' contient '+k);assert.ok(!/aime-site|site\.aime\.json|_avertissement/.test(f.chemin+f.contenu.slice(0,0)),f.chemin)}
  assert.ok(!F.some(f=>/\.json$/.test(f.chemin)),'aucun fichier de projet dans l\'export public');assert.ok(F.some(f=>f.contenu.includes('Texte public')))}
 assert.deepEqual(S.exporterPublic(s,{presentation:P}).map(f=>f.chemin),['index.html','LISEZ-MOI.txt'],'la page entièrement réservée n\'est pas exportée');
 const sv=S.sauvegarde(s);assert.match(sv.chemin,/sauvegarde-privee\.aime-site\.json$/);for(const k of ['SECRET-MEMBRES','SECRET-LIGNE-ORGA','SECRET-PHOTO','SECRET-PAGE-ORGA'])assert.ok(sv.contenu.includes(k),'la sauvegarde garde '+k);
 const j=JSON.parse(sv.contenu);assert.match(j._avertissement,/Ne le publiez pas/);delete j._avertissement;const r=S.migrer(j);
 assert.deepEqual(r.listes,s.listes);assert.deepEqual(r.pages.map(p=>p.sections.map(x=>[x.type,x.audience,x.texte||''])),s.pages.map(p=>p.sections.map(x=>[x.type,x.audience,x.texte||''])));
 const vueOrga=S.document(r,{presentation:P,vue:{role:'owner'},regles:R}).html;assert.ok(vueOrga.includes('SECRET-LIGNE-ORGA'),'après réimport, l\'organisation retrouve tout')});
test('import HTML/ZIP : limites explicites, chemins suspects, contenus actifs, refus propre',async()=>{
 const I=require('../sites/importer.js').AIMEImport,L=I.LIMITES;
 assert.ok(L.archive&&L.entrees&&L.decompresse&&L.html&&L.image&&L.css,'limites déclarées');
 const t=I.trier([{chemin:'index.html',taille:1000},{chemin:'../../etc/passwd.html',taille:10},{chemin:'/abs/x.html',taille:10},{chemin:'C:/x.html',taille:1},{chemin:'a\\b.html',taille:1},{chemin:'app.js',taille:10},{chemin:'shell.php',taille:5},{chemin:'logo.svg',taille:5},{chemin:'enorme.jpg',taille:L.image+1},{chemin:'__MACOSX/x',taille:1},{chemin:'.DS_Store',taille:1},{chemin:'photo.jpg',taille:2000},{chemin:'notes.txt',taille:3}]);
 assert.equal(t.erreur,'');assert.deepEqual(t.garder.map(e=>e.chemin),['index.html','photo.jpg']);
 const raison=c=>(t.ignores.find(x=>x.chemin===c)||{}).raison||'';
 assert.match(raison('../../etc/passwd.html'),/remonte/);assert.match(raison('/abs/x.html'),/absolu/);assert.match(raison('C:/x.html'),/absolu/);assert.match(raison('a\\b.html'),/inverse/);
 assert.match(raison('app.js'),/actif/);assert.match(raison('shell.php'),/actif/);assert.match(raison('logo.svg'),/SVG/);assert.match(raison('enorme.jpg'),/trop lourd/);assert.equal(t.caches,2);
 assert.match(I.trier(Array.from({length:L.entrees+1},(_,i)=>({chemin:i+'.html',taille:1}))).erreur,/limite est de 400/);
 assert.match(I.trier(Array.from({length:40},(_,i)=>({chemin:i+'.jpg',taille:L.image-1})).concat([{chemin:'index.html',taille:1}])).erreur,/décompressé.*limite/);
 assert.match(I.trier([{chemin:'a.js',taille:1}]).erreur,/Aucune page HTML/);
 // une archive : rien n'est décompressé si le tri échoue ; la taille réelle est revérifiée
 let ouverts=0;const zip=E=>({forEach:f=>E.forEach(([c,taille,u])=>f(c,{dir:false,_data:{uncompressedSize:taille},async:()=>{ouverts++;return Promise.resolve(u)}}))});
 await assert.rejects(I.depuisArchive(zip([['index.html',100,new Uint8Array(1)]].concat(Array.from({length:9},(_,i)=>[i+'.jpg',L.image-1,new Uint8Array(1)])))),/Rien n'a été importé/);assert.equal(ouverts,0,'aucune entrée décompressée avant validation');
 const menteur=zip([['site/index.html',10,new Uint8Array(L.html+5)],['site/b.html',10,new TextEncoder().encode('<h1>B</h1>')],['site/x.js',10,new Uint8Array(1)]]);
 const assaini=zip([['index.html',5,new TextEncoder().encode('<h1>A</h1>')]]);const f0=assaini.forEach;assaini.forEach=f=>f0((c,e)=>{e.unsafeOriginalName='../../index.html';f(c,e)});await assert.rejects(I.depuisArchive(assaini),/Aucune page HTML/,'le nom d\'origine en ../ est jugé, pas le nom assaini');
 const r=await I.depuisArchive(menteur);assert.deepEqual(r.fichiers.map(f=>f.chemin),['b.html'],'racine commune retirée, fichier menteur écarté');assert.ok(r.tri.ignores.some(x=>/décompressé/.test(x.raison)));assert.ok(r.tri.ignores.some(x=>x.chemin==='site/x.js'));
 const c=I.classer({sections:{texte:2},infos:['e-mail'],images:1,ignores:['1 script (index.html) : contenu actif, jamais exécuté'],nonReconnu:[],transformes:[]});
 assert.deepEqual(Object.keys(c),['reconnu','transforme','ignore','aVerifier']);assert.equal(c.reconnu.length,2);assert.match(c.transforme[0],/recompress/);assert.match(c.aVerifier.join(' '),/n'est pas reproduite/,'aucune promesse de fidélité');
 const ed=require('fs').readFileSync(path.join(__dirname,'..','sites/editeur.js'),'utf8');assert.ok(/blob\.size>L\.archive/.test(ed),'taille de l\'archive vérifiée avant de charger JSZip');assert.ok(!/f\.async\('blob'\)/.test(ed),'plus de décompression en bloc dans l\'éditeur')});
test('le « + » du générateur (comme sur la landing) : chaque bloc du moteur dans une famille, une seule fois, avec son icône',()=>{
 const ed=require('fs').readFileSync(path.join(__dirname,'..','sites/editeur.js'),'utf8');
 const PAL=JSON.parse(ed.match(/var PALETTE=(\[.*?\]\]\]);/)[1]);const tous=PAL.flatMap(f=>f[1]).concat(['support']);
 assert.deepEqual([...tous].sort(),Object.keys(S.BLOCS).sort(),'aucun bloc oublié, aucun bloc inventé');assert.equal(new Set(tous).size,tous.length,'aucun doublon');
 for(const k of tous.filter(k=>k!=='support'))assert.ok(new RegExp('[{,]'+k+':\'<').test(ed),'icône pour '+k);
 const html=require('fs').readFileSync(path.join(__dirname,'..','sites/index.html'),'utf8');assert.match(html,/id="plus"[^>]*aria-controls="catalogue"/);assert.match(html,/id="catalogue"[^>]*role="dialog"/)});
test('supports du Studio devenus blocs web : ils lisent les infos écrites une fois, échappent tout, n\'inventent rien',()=>{
 const s=S.vide('vierge');Object.assign(s.infos,{titre:'Alice & Bruno',date:'2027-06-12',heure:'15:00',lieu:'Le Moulin',ville:'Nantes',email:'a@b.fr'});
 ['fairepart','monogramme','bienvenue','billet','plantable','livreor','allergenes','setlist','facile','signaletique','credits','carte','merci','sanstel'].forEach(t=>S.ajouterSection(s,'index',t));
 s.listes.tables=[{table:'Table 1',noms:'Ana, Ben ; Cléo'}];s.listes.messages=[{nom:'Zoé',message:'<script>x</script>Bravo'}];s.listes.allergenes=[{plat:'Tarte',allergenes:'gluten, œuf'},{plat:'Sorbet',allergenes:''}];
 s.listes.setlist=[{titre:'Ouverture',detail:'4 min'}];s.listes.consignes=[{texte:'Venez à 15 h.'}];s.listes.orientation=[{libelle:'Vestiaire',direction:'Gauche'}];s.listes.credits=[{role:'Photo',nom:'Studio Lin',url:'javascript:alert(1)'}];
 const h=S.document(s,{presentation:P}).html;
 assert.ok(h.includes('A &amp; B'),'le monogramme reprend les initiales du titre');assert.ok((h.match(/Alice &amp; Bruno/g)||[]).length>=3,'le titre écrit une fois sert au faire-part, à la bienvenue, au billet');
 assert.ok(h.includes('<li>Cléo</li>'),'plan de table : les noms séparés deviennent une liste');assert.ok(!h.includes('<script>x'),'tout est échappé');assert.ok(h.includes('Aucun déclaré'),'un plat sans allergène déclaré le dit, sans rien inventer');
 assert.ok(h.includes('scope="row"'),'tableau des allergènes accessible');assert.ok(h.includes('aria-label="Gauche">←'),'orientation : la flèche suit la direction écrite');assert.ok(!/href="javascript/i.test(h),'lien dangereux refusé');
 for(const t of ['fairepart','plantable','livreor','allergenes','setlist','facile'])assert.ok(S.BLOCS[t]&&S.LARGEUR[t]&&S.hauteur(t,S.LARGEUR[t])>0,t+' placé dans la grille')});
test('bibliothèque : chaque image existe, a un texte alternatif, une source et une famille ; « biblio:<id> » se résout sans jamais sortir du dossier',()=>{
 const fs=require('fs'),B=JSON.parse(fs.readFileSync(path.join(__dirname,'..','sites/bibliotheque/bibliotheque.json'),'utf8'));
 assert.ok(B.images.length>=100);const ids=new Set();
 for(const x of B.images){assert.ok(!ids.has(x.id),x.id);ids.add(x.id);assert.match(x.id,/^[a-z0-9-]{1,80}$/);assert.ok(B.categories[x.cat],x.id);assert.ok(x.alt&&x.alt.length>5,x.id+' alt');assert.ok(x.source&&x.source.depot&&x.source.chemin,x.id+' source');
  for(const f of [x.fichier,x.vignette])assert.ok(fs.existsSync(path.join(__dirname,'..','sites/bibliotheque',f)),f)}
 assert.ok(!/\bIA\b|g[ée]n[ée]r[ée]e? par|intelligence artificielle/i.test(JSON.stringify(B.images.map(x=>x.alt))),'aucune mention visible');
 assert.ok(!B.images.some(x=>/MONDEMARIAGE|wedding-world-grid|sup\/people|matt-mez|\/matt\.|teammember/i.test(x.source.depot+'/'+x.source.chemin)),'aucune source écartée (prestataires réels, portraits nommés, photos personnelles)');
 const s=S.vide();S.ajouterSection(s,'index','image').src='biblio:'+B.images[0].id;s.listes.galerie=[{src:'biblio:../../etc'},{src:'biblio:'+B.images[1].id}];S.ajouterSection(s,'index','galerie');
 const h=S.document(s,{presentation:P}).html;assert.ok(h.includes('/sites/bibliotheque/'+B.images[0].id+'.webp'));assert.ok(!h.includes('../../etc')&&!h.includes('biblio:'),'identifiant douteux ignoré');
 const z=S.exporterPublic(s,{presentation:P,medias:'medias/'});assert.deepEqual(S.mediasDe(z[0].contenu).sort(),[B.images[0].id,B.images[1].id].sort(),'l\'export sait quels médias embarquer');
 assert.ok(!S.document(s,{presentation:P,medias:'javascript:x/'}).html.includes('javascript:'),'base de médias douteuse refusée')});
test('tous les supports du Studio sont dans le générateur : un bloc dédié, ou le bloc Support avec ses proportions et un gabarit web',()=>{
 const fs=require('fs'),st=fs.readFileSync(path.join(__dirname,'..','studio/index.html'),'utf8');const i=st.indexOf('const FL={');let d=0,j=i+9;for(;j<st.length;j++){if(st[j]=='{')d++;else if(st[j]=='}'){d--;if(!d)break}}
 const ids=[...st.slice(i+9,j+1).matchAll(/^\s*([a-zA-Z0-9]+):\{/gm)].map(m=>m[1]).filter(k=>!/^(site|webd|webt|webm)$/.test(k));
 assert.deepEqual(S.SUPPORTS.map(f=>f[0]).sort(),ids.sort(),'chaque support du Studio (hors le site lui-même) a sa place');
 for(const f of S.SUPPORTS){if(f[6])assert.ok(S.BLOCS[f[6]],f[0]+' → '+f[6]);else assert.ok(S.BLOCS.support.variantes[f[0]],f[0]);assert.ok(f[3]>0&&f[4]>0)}
 const s=S.vide();Object.assign(s.infos,{titre:'Atelier <Lin>',date:'2027-03-02',ville:'Nantes',email:'a@b.fr'});s.listes.tarifs=[{nom:'Ourlet',prix:'15 €'}];s.listes.personnes=[{nom:'Ana'}];
 for(const v of Object.keys(S.BLOCS.support.variantes))S.ajouterSection(s,'index','support').variante=v;const h=S.document(s,{presentation:P}).html;
 assert.ok(!h.includes('<Lin>')&&h.includes('Atelier &lt;Lin&gt;'),'échappé');assert.ok(h.includes('<td>Ourlet')&&h.includes('15 €'),'devis et facture lisent les tarifs');assert.ok(h.includes('class="sp sp-rond sp-vitro"'),'la vitrophanie est ronde');
 assert.ok(/--r:0\.707/.test(h)||/--r:0\.70/.test(h),'une affiche A3 garde ses proportions')});
test('visuels associés : chaque univers a ses images, accordées à l\'emplacement ; la photo de la personne passe avant ; on peut les couper',()=>{
 const B=JSON.parse(require('fs').readFileSync(path.join(__dirname,'..','sites/bibliotheque/bibliotheque.json'),'utf8')),A=B.associations,ids=new Set(B.images.map(x=>x.id));
 for(const u of Object.keys(A))for(const k of Object.keys(A[u]))for(const id of A[u][k])assert.ok(ids.has(id),u+'/'+k+' '+id);
 for(const m of M)assert.ok(A[m.univers]||A['*'],m.id);for(const u of ['mariage','anniv','conf','artisan','portfolio','asso','*'])for(const k of ['hero','image','video','lieu','support-affiche','support-ecran'])assert.ok(A[u][k]&&A[u][k].length,u+'/'+k);
 const cat=id=>B.images.find(x=>x.id===id).cat;assert.ok(A.mariage.hero.every(i=>cat(i)==='ceremonie'),'un en-tête de mariage montre une cérémonie');assert.ok(A.conf.hero.every(i=>cat(i)==='lieux'),'un séminaire montre des salles');
 const s=S.appliquerModele(S.vide(),M.find(m=>m.id==='mariage'));S.ajouterSection(s,'index','support').variante='poster';s.listes.galerie=[];
 const h=S.document(s,{presentation:P,visuels:A}).html;const vus=S.mediasDe(h);assert.ok(vus.length>=2&&vus.every(i=>ids.has(i)));
 s.listes.galerie=[{src:'https://exemple.fr/ma-photo.jpg'}];assert.ok(S.document(s,{presentation:P,visuels:A}).html.includes('ma-photo.jpg'),'la photo posée passe avant');
 s.presentation.visuels=false;s.listes.galerie=[];assert.equal(S.mediasDe(S.document(s,{presentation:P,visuels:A}).html).length,0,'désactivable')});
test('l\'export public embarque aussi les visuels associés qu\'il affiche',()=>{
 const A=JSON.parse(require('fs').readFileSync(path.join(__dirname,'..','sites/bibliotheque/bibliotheque.json'),'utf8')).associations;
 const s=S.appliquerModele(S.vide(),M.find(m=>m.id==='mariage'));s.listes.galerie=[];const F=S.exporterPublic(s,{presentation:P,visuels:A,medias:'medias/'});
 assert.ok(F.some(f=>S.mediasDe(f.contenu).length>0),'les pages exportées référencent leurs visuels dans medias/')});
