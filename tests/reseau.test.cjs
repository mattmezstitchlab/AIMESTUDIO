/* Réseau des facettes vivantes : une création = ses facettes (sections de sa page Métamorphose) ; un module = un bloc du
   moteur, dans un registre ; la bibliothèque garde des références ; l'intégration ajoute une instance, jamais l'original. */
const assert=require('assert'),fs=require('fs'),path=require('path');const S=require('../vitrine/rendu.js').site,B=require('../pointzero/broderie.js'),M=require('../pointzero/modes.js'),MS=require('../pointzero/minisite.js'),R=require('../reseau/registre.js');
const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');let n=0;const t=(nom,f)=>{f();n++};
const PNG='data:image/png;base64,iVBORw0KGgo=';
function projet(){const p={id:'abc123',type:'broderie',titre:'Renard',cree:'2026-10-22T08:00:00Z',choix:{largeurCm:15,usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{format:true},ratio:1.25,
 palette:[{dmc:'310',nom:'Noir',hex:'#000000',ecran:'#050505',points:400},{dmc:'06',nom:'Rose',hex:'#F0B0A0',ecran:'#EEB0A0',points:100}],apercu:PNG,cases:new Uint8Array([1,2]),dims:{l:2,h:1}};
 p.grille=B.grille(p.choix,p.ratio);M.decider(p,'largeurCm',15,'Largeur : 15 cm','utilisateur');return p}
const site=()=>MS.depuis(projet(),{S,B,M,photo:PNG});

t('une création montre au plus six facettes : les sections de sa page, dans l\'ordre de lecture, sans facette vide',()=>{const s=site(),F=R.facettesDe(s);
 assert.ok(F.length>=4&&F.length<=6,F.length+' facettes');assert.deepStrictEqual(F.slice(0,3).map(f=>f.id),['pz-hero','pz-motif','pz-fils']);F.forEach(f=>assert.ok(S.BLOCS[f.type],'vrai bloc : '+f.type));
 const vide=site();vide.listes.fils=[];assert.ok(!R.facettesDe(vide).some(f=>f.id==='pz-fils'),'une facette sans données n\'est pas montrée');
 const priv=site();priv.pages[0].sections.find(x=>x.id==='pz-fils').audience='organisation';assert.ok(!R.facettesDe(priv).some(f=>f.id==='pz-fils'),'une section non publique n\'est jamais une facette')});

t('une facette se rend seule par le moteur, sans toucher l\'original',()=>{const s=site(),avant=JSON.stringify(s),u=R.seule(s,'pz-fils');
 assert.equal(u.pages[0].sections.length,1);assert.equal(u.pages[0].sections[0].w,12);assert.equal(JSON.stringify(s),avant,'original intact');
 const h=S.document(u,{presentation:{ambiances:[],typographies:[]}}).html;assert.ok(h.includes('DMC 310')&&h.includes('DMC 06'),'le vrai bloc Fils, les vraies références');assert.equal(R.seule(s,'inconnue'),null)});

t('le registre : des blocs existants du moteur, une licence et une version ; aucun code',()=>{R.MODULES.forEach(m=>{assert.ok(S.BLOCS[m.bloc],m.id);assert.ok(S.BLOCS[m.bloc].variantes[m.variante],m.id+' variante');assert.ok(R.LICENCES[m.licence]);assert.ok(/^\d+\.\d+$/.test(m.version));
  assert.ok(!Object.values(m).some(v=>typeof v==='function'),'aucune fonction dans une entrée')});
 const r=lire('reseau/registre.js');assert.ok(!/eval\(|new Function|import\(|<script/.test(r),'jamais de code communautaire')});

t('tester : une démonstration avec des données fictives, jamais celles du compte',()=>{R.MODULES.forEach(m=>{const d=R.demo(m,S);assert.ok(d.listes[m.lit].length,m.id);assert.ok(!/abc123|Renard/.test(JSON.stringify(d)))});
 const ui=lire('reseau/reseau.js');assert.ok(/f\.setAttribute\('sandbox',''\)/.test(ui),'cadre isolé, sans script')});

t('vérifier avant d\'ajouter : sept points, chacun dit oui ou non, et pourquoi',()=>{const g=R.module('galerie'),s=site(),v=R.verifier(g,{site:s,proprietaire:true},S);
 assert.deepStrictEqual(v.points.map(p=>p.id),['compatibilite','version','dependances','donnees','droits','permissions','configuration']);assert.ok(v.ok,'galerie compatible avec un projet broderie (images confirmées)');
 assert.ok(!R.verifier(g,{site:s,proprietaire:false},S).ok,'pas son projet : refusé');assert.ok(!R.verifier(R.module('palette-dmc'),{site:s,proprietaire:true},S).ok,'déjà dans le projet : rien à faire');
 const sans=site();sans.listes.galerie=[];assert.equal(R.verifier(g,{site:sans,proprietaire:true},S).points.find(p=>p.id==='donnees').ok,false,'sans données, rien d\'inventé');
 const pirate=Object.assign({},g,{licence:'inconnue'});assert.ok(!R.verifier(pirate,{site:s,proprietaire:true},S).ok,'licence inconnue refusée')});

t('ajouter à mon cube : une instance dans SON projet, à la fin de la grille, sans chevauchement, avec son origine',()=>{const s=site(),g=R.module('galerie'),avant=s.pages[0].sections.length,x=R.integrer(g,s,S);
 assert.equal(s.pages[0].sections.length,avant+1);assert.equal(x.type,'galerie');assert.deepStrictEqual(x.origine,{module:'galerie',version:'1.0',auteur:'AIME Studio',licence:'aime-libre'});
 const P=s.pages[0].sections;P.forEach(a=>P.forEach(b=>{if(a===b)return;const ha=S.hauteur(a.type,a.w),hb=S.hauteur(b.type,b.w);assert.ok(!(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+hb&&b.y<a.y+ha),'aucun chevauchement')}));
 assert.ok(R.facettesDe(s).some(f=>f.type==='galerie'),'la nouvelle facette apparaît sur la carte (six faces au plus)');assert.ok(R.facettesDe(s).length<=6);assert.throws(()=>R.integrer(g,s,S),/déjà|Configuration/,'pas deux fois')});

t('la bibliothèque : des références, pas des copies ; relue avec prudence',()=>{let b=R.vide();const ref={projet:'abc123',facette:'pz-fils'};
 assert.ok(R.mettreDeCote(b,ref,{titre:'Renard · La palette',source:'Projet',auteur:'Vous',version:'1'}));assert.ok(!R.mettreDeCote(b,ref,{}),'pas de doublon');assert.ok(R.contient(b,ref));
 R.mettreDeCote(b,{module:'galerie'},{titre:'Galerie'});const t2=JSON.stringify(b);assert.ok(!/DMC|#000000|data:image/.test(t2),'aucun contenu recopié');
 const r=R.relire(t2);assert.equal(r.items.length,2);assert.equal(R.relire('{"v":1,"items":[{"cle":"javascript:x"}]}').items.length,0,'clé inconnue ignorée');assert.ok(R.retirer(b,'module:galerie'));assert.equal(b.items.length,1)});

t('page : six entrées, cartes accessibles (clavier, indicateurs, mouvement réduit), démonstrateur annoncé',()=>{const h=lire('reseau/index.html'),j=lire('reseau/reseau.js'),c=lire('reseau/reseau.css');
 ['profils','creations','medias','musique','modules','boutique'].forEach(o=>assert.ok(j.includes("['"+o+"'"),o));assert.ok(/démonstrateur/.test(h)&&/rien n'est publié/.test(h));
 assert.ok(j.includes("'ArrowRight'")&&j.includes("'ArrowLeft'")&&j.includes("aria-current"),'clavier et progression');assert.ok(/prefers-reduced-motion/.test(c)&&j.includes('RM'),'mouvement réduit');
 assert.ok(j.includes('IntersectionObserver'),'rendu à la demande');assert.ok(!/\/regie\//.test(h+j),'la Régie maîtresse n\'est pas touchée')});
console.log('reseau : '+n+' tests ok');
