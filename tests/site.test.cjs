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
test('les perspectives choisissent les sections ; elles ne sont pas un droit',()=>{
 assert.deepEqual(PE.map(p=>p.id),['public','invite','organisation']);
 const s=S.vide();const a=S.ajouterSection(s,'index','texte');a.texte='Pour tous';const b=S.ajouterSection(s,'index','texte');b.texte='Note d\'équipe';b.pour=['organisation'];
 const pub=S.document(s,{presentation:P,perspective:'public'}).html,org=S.document(s,{presentation:P,perspective:'organisation'}).html;
 assert.ok(pub.includes('Pour tous')&&!pub.includes('Note d'));assert.ok(org.includes('Note d'));assert.match(require('../vitrine/perspectives/sites.json')._,/ne protège rien/)});
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
