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
 const plein=S.document(s,{presentation:P,edition:true}).html;assert.ok((plein.match(/class="s-vide"/g)||[]).length<=4,'presque tout est rempli');assert.ok(S.contraste('#000000','#FFFFFF')>20)});
test('export : une page HTML autonome par page, ou une seule page avec ancres',()=>{
 const s=S.appliquerModele(S.vide(),M.find(m=>m.id==='mariage'));const f=S.exporter(s,{presentation:P});assert.deepEqual(f.map(x=>x.chemin),['index.html','jour-j.html','pratique.html','reponse.html']);
 assert.ok(f[0].contenu.startsWith('<!doctype html>')&&f[0].contenu.includes('href="jour-j.html"'));const u=S.exporter(s,{presentation:P,unePage:true});assert.equal(u.length,1);assert.ok(u[0].contenu.includes('href="#jour-j"'))});
test('le Bureau retrouve les sites de ce navigateur',()=>{const m=new Map([['aime-sites',JSON.stringify({cur:'s1',sites:{s1:{nom:'Mariage',pages:[{},{}],infos:{titre:'A & N'},majLe:'2026-10-21T01:00:00Z'}}})]]);
 const st={get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null};const inv=B.inventaire(st),s=inv.sources.find(x=>x.id==='sites').projets[0];assert.equal(s.lien,'/sites/?site=s1');assert.match(s.detail,/2 pages · A & N/);assert.ok(s.enCours)});
