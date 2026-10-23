const test=require('node:test'),assert=require('node:assert/strict'),B=require('../constructeur/blocs.js');
test('modèle de grille : aller-retour sans altération',()=>{
 const p=B.creer('page-1',[{id:'a',type:'hero',x:0,y:0,w:12,h:4,donnees:{texte:'Bonjour'}},{id:'b',type:'photo',x:0,y:4,w:6,h:3,donnees:{}}]);
 const original=JSON.stringify(p);assert.deepEqual(B.lire(B.serializer(p)),p);assert.equal(JSON.stringify(p),original);
});
test('schémas inconnus et collisions refusés',()=>{
 const p=B.creer('page-1',[]);assert.equal(B.valider({...p,schema:2}).ok,false);
 assert.equal(B.valider({...p,blocs:[{id:'x',type:'texte',x:0,y:0,w:1,h:1,donnees:{}},{id:'x',type:'texte',x:1,y:0,w:1,h:1,donnees:{}}]}).ok,false);
});
test('projection grille existante pure : aucune lecture ni écriture dans le navigateur',()=>{
 const grid=[{k:'hero',x:0,y:0,w:12,h:4,texte:'source propriétaire'}],avant=JSON.stringify(grid);
 const p=B.depuisGrille('demo',grid);assert.deepEqual(p.blocs,[{id:'bloc-1',type:'hero',x:0,y:0,w:12,h:4,donnees:{}}]);
 assert.equal(JSON.stringify(grid),avant);assert.ok(!B.serializer(p).includes('source propriétaire'));
});
