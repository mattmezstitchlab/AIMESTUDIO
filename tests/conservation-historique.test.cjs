/* Régression : préserver des créations historiques, même non indexées dans le Bureau. */
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../bureau/sources.js');
function stockage(init){
 const m=new Map(Object.entries(init||{}));
 return {get length(){return m.size},key:i=>[...m.keys()][i]??null,
 getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),
 removeItem:k=>m.delete(k),entries:()=>Object.fromEntries(m)};
}
test('Timbre, Enveloppe et formats Studio anciens restent préservés octet pour octet',()=>{
 const origine=stockage({
  'echos:v2':JSON.stringify({projects:[{id:'p1',name:'Timbre / Enveloppe',pack:'print',supports:[{type:'timbre',recto:{zoom:1.2}},{type:'enveloppe',verso:{texte:'Bonjour'}}]}],cur:'p1'}),
  'echos:boards':JSON.stringify([{id:'ancien',type:'enveloppe',fragments:[{id:'f1',x:31,y:74}]}]),
  'echos:photo:ancienne':'data:image/png;base64,dGVzdA==',
  'aime:pd':JSON.stringify({formats:['timbre','enveloppe'],orientation:'portrait'}),
  'aime-wp':'"clair"',
  'aime-extension-inconnue':JSON.stringify({v:1,conserver:true})
 });
 const avant=origine.entries(),fichier=B.lireSauvegarde(JSON.stringify(B.sauvegarder(origine,'2026-10-23T00:00:00Z')));
 const cible=stockage({});
 const resultat=B.restaurer(cible,fichier);
 assert.deepEqual(resultat.erreurs,[]);
 assert.deepEqual(cible.entries(),avant);
 assert.equal(B.inventaire(cible).sources.find(s=>s.id==='studio').projets.length,1);
});
test('restaurer un ancien contenu n’écrase aucune création plus récente sans consentement',()=>{
 const ancien=stockage({'echos:boards':'{"ancien":true}','aime:pd':'{"format":"timbre"}'});
 const fichier=B.lireSauvegarde(B.sauvegarder(ancien));
 const actuel=stockage({'echos:boards':'{"nouveau":true}','projet-futur':'{"inconnu":true}'});
 assert.deepEqual(B.apercu(actuel,fichier).differentes,['echos:boards']);
 const r=B.restaurer(actuel,fichier);
 assert.deepEqual(r.gardees,['echos:boards']);
 assert.equal(actuel.getItem('echos:boards'),'{"nouveau":true}');
 assert.equal(actuel.getItem('aime:pd'),'{"format":"timbre"}');
 assert.equal(actuel.getItem('projet-futur'),'{"inconnu":true}');
});
