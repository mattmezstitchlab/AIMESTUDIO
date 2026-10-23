const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../adaptateurs/studio-timbre.js');
const P=require('../contrats/projet.js');
function store(x){const m=new Map(Object.entries(x));return{getItem(k){return m.get(k)??null},setItem(){throw Error('INTERDICTION ECRITURE')},snapshot(){return Object.fromEntries(m)}}}
test('projection timbres explicites; autres supports inchangés et exclus',()=>{
 const db={projects:[{id:'t1',name:'Timbre floral',supports:[{type:'timbre',recto:{pixels:[1,2]}}]},{id:'p1',name:'Carte Postale',type:'carte-postale'},{id:'e1',name:'Enveloppe',supports:[{type:'enveloppe'}]}],cur:'t1'};
 const S=store({'echos:v2':JSON.stringify(db)}),before=S.snapshot(),r=A.depuisStockage(S);
 assert.deepEqual(r.erreurs,[]);assert.equal(r.projets.length,1);
 assert.equal(r.projets[0].id,'studio:t1');assert.equal(r.projets[0].provenance.identifiant,'t1');
 assert.equal(P.valide(r.projets[0]).ok,true);assert.deepEqual(S.snapshot(),before);
 assert.equal(r.projets[0].medias.length,0,'aucun média inventé');
});
test('données historiques non classables : ne pas présumer un timbre',()=>{
 const S=store({'echos:v2':JSON.stringify({projects:[{id:'x',name:'Ancien sans type'},{id:'a',type:'timbre'}]})});
 const r=A.depuisStockage(S);assert.equal(r.projets.length,1);assert.equal(r.projets[0].provenance.identifiant,'a');
});
test('erreurs et identifiants dupliqués signalés; aucune mutation',()=>{
 assert.equal(A.depuisStockage(store({'echos:v2':'{'})).projets.length,0);
 const S=store({'echos:v2':JSON.stringify({projects:[{id:'x',type:'timbre'},{id:'x',type:'timbre'},{type:'timbre'}]})});
 const before=S.snapshot(),r=A.depuisStockage(S);
 assert.equal(r.projets.length,1);assert.equal(r.erreurs.length,2);assert.deepEqual(S.snapshot(),before);
});
