const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../contrats/projet.js');
const B=require('../bureau/sources.js');
function stockage(init){const m=new Map(Object.entries(init));return{get length(){return m.size},key:i=>[...m.keys()][i]||null,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),all:()=>Object.fromEntries(m)}}
test('contrat canonique v1 : strict, lisible, sans migration',()=>{
 const p=P.creer({id:'prj-1',titre:'Timbres',module:'studio',identifiant:'original'});
 assert.equal(P.valide(p).ok,true);
 assert.equal(P.lire(p),p);
 assert.equal(P.valide({...p,schema:2}).ok,false);
 assert.equal(P.valide({...p,medias:[{type:'image'}]}).ok,false);
});
test('contrat canonique : données d’origine non mutées ni interprétées',()=>{
 const old={projects:[{id:'p1',name:'Timbre',supports:[{type:'timbre',pixels:[1,2,3]}]}]};
 const snapshot=JSON.stringify(old);
 const p=P.creer({id:'prj-1',titre:'Timbre',module:'studio',identifiant:'p1'});
 assert.equal(P.valide(p).ok,true);
 assert.equal(JSON.stringify(old),snapshot);
 assert.equal(p.extensions.studio,undefined);
});
test('inventaire et restauration des clés inconnues restent réversibles',()=>{
 const s=stockage({'echos:v2':'{"projects":[]}','echos:boards':'[{"id":"ancien"}]','aime-regie':'{"version":1}','autre-studio':'opaque'});
 const avant=s.all();
 const copie=B.lireSauvegarde(JSON.stringify(B.sauvegarder(s)));
 const cible=stockage({});
 const bilan=B.restaurer(cible,copie);
 assert.equal(bilan.erreurs.length,0);
 assert.deepEqual(cible.all(),avant);
});
