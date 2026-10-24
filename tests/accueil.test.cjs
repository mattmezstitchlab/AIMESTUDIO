/* Le premier écran : une phrase → ce qui est compris → un projet « aime-projet » v1 enregistré → sa page (moteur de pages).
   Rien n'est écrasé : les sites déjà présents dans le navigateur restent. */
const assert=require('assert'),fs=require('fs'),path=require('path');const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const t=(nom,f)=>{try{f()}catch(e){e.message=nom+' : '+e.message;throw e}n++};
const I=require('../projets/intention.js'),P=require('../projets/projets.js'),C=require('../contrats/projet.js'),S=require('../vitrine/rendu.js').site,M=require('../vitrine/modeles/sites.json').modeles,PR=require('../vitrine/presentation/studio.json');
const J='2026-10-23';
t('une phrase de mariage : type, titre, date, lieu, nombre, personnes',()=>{const l=I.lire('Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly, 120 invités',J);
 assert.deepEqual([l.type,l.modele,l.titre,l.date,l.lieu,l.invites],['mariage','mariage','Léa & Marc','2027-06-14','Chantilly',120]);assert.deepEqual(l.personnes,['Léa','Marc']);assert.equal(l.passee,false)});
t('séminaire, fête, atelier : le bon modèle et un lieu entier',()=>{
 const s=I.lire('Un séminaire de 80 personnes à Lyon le 3 mars 2027',J);assert.deepEqual([s.modele,s.titre,s.lieu,s.invites,s.date],['seminaire','Un séminaire de 80 personnes','Lyon',80,'2027-03-03']);
 const f=I.lire('Les 40 ans de Julie, samedi 12 décembre 2026 au Café des Arts',J);assert.deepEqual([f.modele,f.lieu,f.date],['anniversaire','Café des Arts','2026-12-12']);
 const a=I.lire('Un site pour mon atelier de céramique à Lille',J);assert.deepEqual([a.modele,a.lieu,a.date],['artisan','Lille',''])});
t('un lieu n\'est jamais pris pour une personne ; une date passée est signalée ; rien d\'écrit = rien',()=>{
 const l=I.lire('Mariage le 5 septembre 2026 au Château de Vaux, 200 invités',J);assert.equal(l.lieu,'Château de Vaux');assert.deepEqual(l.personnes,[]);assert.equal(l.passee,true);assert.equal(I.lire('   ',J),null)});
t('le projet est un aime-projet v1 valide, avec l\'événement et les personnes reliées',()=>{const p=P.versProjet(I.lire('Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly',J));
 assert.ok(C.valide(p).ok);assert.equal(P.evenement(p).date,'2027-06-14');assert.equal(p.contenus.filter(c=>c.type==='personne').length,2);assert.equal(p.relations.length,2);assert.equal(p.provenance.module,'accueil')});
t('sa page : le modèle du type, avec le titre, la date et le lieu du projet, rendue par le moteur',()=>{const l=I.lire('Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly',J),p=P.versProjet(l),s=P.versSite(p,S,M.find(m=>m.id===l.modele));
 assert.equal(s.projet,p.id);assert.equal(s.infos.titre,'Léa & Marc');assert.equal(s.infos.date,'2027-06-14');assert.equal(s.infos.lieu,'Chantilly');const h=S.document(s,{presentation:PR}).html;assert.ok(h.includes('Chantilly'))});
t('enregistrer : le projet et sa page s\'ajoutent, les sites existants restent, le projet courant se relit',()=>{const m=new Map([['aime-sites',JSON.stringify({sites:{ancien:{id:'ancien',nom:'Ancien'}},cur:'ancien'})]]),st={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},D=P.Depot(st);
 const l=I.lire('Un séminaire de 80 personnes à Lyon le 3 mars 2027',J),p=P.versProjet(l),s=P.versSite(p,S,M.find(x=>x.id===l.modele));assert.ok(D.enregistrer(p,s).ok);
 const sites=JSON.parse(m.get('aime-sites')).sites;assert.ok(sites.ancien&&sites[s.id],'ancien site intact, nouveau ajouté');assert.equal(D.courant().id,p.id);assert.equal(D.site(D.courant()).id,s.id);assert.equal(D.lister().length,1)});
t('un stockage illisible ne casse rien, et un stockage plein est dit',()=>{const D=P.Depot({getItem:()=>'{pas du json',setItem:()=>{throw new Error('plein')}});assert.equal(D.courant(),null);assert.deepEqual(D.lister(),[]);
 const l=I.lire('Notre association de quartier',J),p=P.versProjet(l),r=D.enregistrer(p,P.versSite(p,S,M.find(x=>x.id===l.modele)));assert.equal(r.ok,false);assert.ok(r.raison)});
t('le premier écran (PR C) : « Je suis… », plus de champ de texte ni de formulaire d\'intention ; les anciens essais restent lisibles dans Mes projets',()=>{const h=lire('index.html');
 assert.ok(!/id="acForm"|id="acTexte"|data-ac-ex|id="monProjet"|Que préparez-vous/.test(h),'plus de champ, d\'exemples ni de « Voici ce que j\'ai compris »');
 assert.ok(h.includes('<label class="js-l" for="jsChoix">Je suis…</label>'));assert.ok(!h.includes('src="/accueil/accueil.js"'),'l\'ancien formulaire n\'est plus chargé');
 ['/compte/creer.js','/accueil/demo.js','/accueil/je-suis.js'].forEach(f=>assert.ok(h.includes('src="'+f+'"'),f));
 const c=lire('compte/index.html');['/contrats/projet.js','/projets/projets.js'].forEach(f=>assert.ok(c.includes('src="'+f+'"'),'Mes projets lit les essais de ce navigateur : '+f));assert.ok(c.includes('id="local"')&&c.includes('Sur cet appareil'))});
t('taxonomie d\'AIMEEVENT : catégorie, type Schema.org, mode et accès lus dans la phrase',()=>{const X=require('../projets/taxonomie.js');
 const c=I.lire('Un concert de jazz le 21 juin 2027 à Lille',J);assert.deepEqual([c.categorie,c.schemaType,c.modele,c.acces],['musique','MusicEvent','libre','Ouvert au public']);
 const w=I.lire('Un webinaire sur la broderie le 5 mars 2027',J);assert.deepEqual([w.categorie,w.mode,w.modele],['formation','En ligne','seminaire']);
 const m=I.lire('Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly',J);assert.deepEqual([m.categorie,m.schemaType,m.acces,m.modele],['celebrations','SocialEvent','Sur invitation','mariage']);
 assert.equal(I.lire('Une idée sans rien de reconnaissable',J).categorie,'autre');assert.equal(X.CATEGORIES.length,18);assert.ok(X.CATEGORIES.every(c=>c.schemaType&&c.modele));
 const p=P.versProjet(Object.assign(c,{titre:'Jazz'}));const e=P.evenement(p);assert.deepEqual([e.categorie,e.schemaType,e.mode,e.acces],['musique','MusicEvent','Sur place','Ouvert au public']);assert.ok(C.valide(p).ok)});
t('les scripts du premier écran se lisent sans erreur de syntaxe',()=>{const {execFileSync}=require('child_process');for(const f of ['accueil/accueil.js','accueil/demo.js','accueil/je-suis.js','projets/intention.js','projets/projets.js','projets/taxonomie.js'])execFileSync(process.execPath,['--check',path.join(__dirname,'..',f)])});
console.log('accueil : '+n+' vérifications');
