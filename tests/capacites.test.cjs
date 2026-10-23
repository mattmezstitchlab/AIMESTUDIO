/* L'Atlas des capacités : un modèle pur, des sources publiques, rien d'écrit, rien d'inventé. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const R=p=>path.join(__dirname,'..',p);const lire=p=>fs.readFileSync(R(p),'utf8');
const A=require('../capacites/modele.js');const N=require('../nav/registre.js');
const src={moteurs:JSON.parse(lire('moteurs.json')),univers:JSON.parse(lire('univers.json')),etat:JSON.parse(lire('capacites/etat-depots.json'))};
const D=A.construire(src);

test('capacités : tous les modules de l\'index, chacun avec un statut connu et un identifiant unique',()=>{
 const total=src.moteurs.repos.reduce((s,r)=>s+(r.modules||[]).length,0);
 assert.equal(D.modules.length,total);assert.equal(D.depots.length,src.moteurs.repos.length);
 const ids=new Set(D.modules.map(m=>m.id));assert.equal(ids.size,D.modules.length,'identifiants uniques');
 for(const m of D.modules)assert.ok(A.STATUTS[m.statut],m.id+' : statut '+m.statut);
 assert.equal(Object.values(D.chiffres.parStatut).reduce((a,b)=>a+b,0),D.modules.length);
});

test('capacités : « cité » vient d\'univers.json, jamais d\'une supposition',()=>{
 const cles=new Set();for(const u of src.univers.univers){for(const a of u.aspects||[])for(const k of a.k||[])cles.add(k);for(const p of u.processus||[])for(const e of p.etapes||[])if(e.k)cles.add(e.k)}
 for(const m of D.modules)assert.equal(m.cite>0,cles.has(m.id),m.id);
 assert.equal(D.chiffres.cites,D.modules.filter(m=>cles.has(m.id)).length);
});

test('capacités : chaque branchement vise un dépôt de l\'index et cite une preuve qui existe',()=>{
 const depots=new Set(src.moteurs.repos.map(r=>r.repo.toLowerCase()));
 for(const [k,b] of Object.entries(A.BRANCHEMENTS)){
  assert.ok(depots.has(k),k+' : dépôt inconnu de moteurs.json');assert.ok(A.STATUTS[b.statut],k);assert.ok(b.note&&b.preuve,k+' : note et preuve');
  for(const f of b.preuve.split('·').map(x=>x.trim()))assert.ok(fs.existsSync(R(f)),k+' : la preuve '+f+' existe');
 }
});

test('capacités : le classement s\'explique, écarte ce qui est déjà repris ou écarté, et ne laisse pas un dépôt tout prendre',()=>{
 const P=A.prioritaires(D.modules,24,3);assert.equal(P.length,24);
 for(const m of P){assert.ok(['brancher','evaluer','partiel'].includes(m.statut),m.id);assert.ok(m.raisons.length>0,m.id+' : des raisons')}
 const par={};for(const m of P)par[m.repo]=(par[m.repo]||0)+1;assert.ok(Object.values(par).every(n=>n<=3));
 for(let i=1;i<P.length;i++)assert.ok(P[i-1].points>=P[i].points,'trié');
 const vide=A.score({cite:0,autonome:false,etatDepot:'vide',famille:'Autre'});assert.ok(vide.points<0);assert.match(vide.raisons.join(),/vide/);
});

test('capacités : la recherche ignore les accents et combine les filtres',()=>{
 const a=A.filtrer(D.modules,{q:'evenement'}),b=A.filtrer(D.modules,{q:'événement'});assert.equal(a.length,b.length);assert.ok(a.length>0);
 const u=D.univers[0].id,f=A.filtrer(D.modules,{univers:u,statut:'brancher'});assert.ok(f.every(m=>m.univers.includes(u)&&m.statut==='brancher'));
 assert.equal(A.filtrer(D.modules,{q:'zzzz introuvable'}).length,0);
});

test('capacités : page découvrable, lecture seule, échappée, sans secret ni stockage',()=>{
 assert.equal(N.entree('capacites').href,'/capacites/');
 const h=lire('capacites/index.html'),j=lire('capacites/capacites.js'),m=lire('capacites/modele.js'),c=lire('capacites/capacites.css');
 assert.match(h,/lang="fr"/);assert.match(h,/Un index déclaré, pas une preuve/);assert.match(h,/<noscript>/);assert.match(h,/readonly/);
 assert.ok(!/localStorage|sessionStorage|indexedDB|setItem|fetch\([^)]*method/.test(j+m),'aucun stockage, aucune écriture');
 assert.match(j,/function esc\(/);assert.ok(!/innerHTML\s*=\s*[^;]*\+\s*m\.(nom|fait)\b(?!\))/.test(j.replace(/esc\(m\.(nom|fait)\)/g,'')),'les textes passent par esc()');
 assert.match(c,/prefers-reduced-motion/);
 const tout=h+j+m+lire('capacites/etat-depots.json');
 assert.ok(!/(sk|pk|rk)_(live|test)_|sb_secret_|sb_publishable_|DATABASE_URL=|BETTER_AUTH_SECRET=|@gmail\.com/.test(tout),'ni secret ni donnée personnelle');
});

test('capacités : l\'état des dépôts est daté, et un dépôt privé n\'est jamais décrit comme lu',()=>{
 assert.equal(src.etat.format,'aime-etat-depots');assert.match(src.etat.date,/^\d{4}-\d{2}-\d{2}$/);
 for(const d of D.depots)if(d.prive&&d.sante)assert.equal(d.sante.lu,false,d.repo);
});
