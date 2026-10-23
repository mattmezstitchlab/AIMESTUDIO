/* Modèle de page du constructeur AIME, indépendant du DOM et du stockage.
   Conversion explicite d'un relevé de grille ; jamais de migration implicite. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEBlocs=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var FORMAT='aime-page-blocs',SCHEMA=1;
function objet(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function entier(n){return Number.isSafeInteger(n)}
function valider(page){
 var erreurs=[];
 if(!objet(page))return{ok:false,erreurs:['page non objet']};
 if(page.format!==FORMAT)erreurs.push('format');
 if(page.schema!==SCHEMA)erreurs.push('schema');
 if(typeof page.id!=='string'||!page.id)erreurs.push('id');
 if(!Array.isArray(page.blocs))erreurs.push('blocs');
 if(Array.isArray(page.blocs)){
  var ids=new Set();
  page.blocs.forEach(function(b,i){
   if(!objet(b)){erreurs.push('bloc '+i);return}
   if(typeof b.id!=='string'||!b.id||ids.has(b.id))erreurs.push('bloc '+i+' id');
   ids.add(b.id);
   if(typeof b.type!=='string'||!b.type)erreurs.push('bloc '+i+' type');
   if(!['x','y','w','h'].every(function(k){return entier(b[k])&&b[k]>=0&&(k==='w'||k==='h'?b[k]>0:true)}))erreurs.push('bloc '+i+' grille');
   if(!objet(b.donnees))erreurs.push('bloc '+i+' donnees');
  });
 }
 return{ok:erreurs.length===0,erreurs:erreurs};
}
function creer(id,blocs){var p={format:FORMAT,schema:SCHEMA,id:id,blocs:blocs||[]};var v=valider(p);if(!v.ok)throw Error('Page invalide : '+v.erreurs.join(', '));return p}
function serializer(page){var v=valider(page);if(!v.ok)throw Error('Page invalide : '+v.erreurs.join(', '));return JSON.stringify(page)}
function lire(s){var o=JSON.parse(s);var v=valider(o);if(!v.ok)throw Error('Page incompatible : '+v.erreurs.join(', '));return o}
/* Projection volontairement limitée aux champs géométriques présents dans #build ;
   les données natives du constructeur restent dans leur source, jamais copiées implicitement. */
function depuisGrille(id,blocs){return creer(id,blocs.map(function(b,i){return{id:'bloc-'+(i+1),type:b.k,x:b.x,y:b.y,w:b.w,h:b.h,donnees:{}}}))}
return{FORMAT:FORMAT,SCHEMA:SCHEMA,valider:valider,creer:creer,serializer:serializer,lire:lire,depuisGrille:depuisGrille};
});
