/* AIME — Contrat d'échange de projet v1. Aucune persistence, aucune migration automatique.
   Les adaptateurs métiers restent propriétaires de leurs données. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEProjetContrat=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var FORMAT='aime-projet',VERSION=1;
function objet(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function texte(v){return typeof v==='string'&&v.length>0}
function valide(p){
 var erreurs=[];
 if(!objet(p))return{ok:false,erreurs:['Le projet doit être un objet.']};
 if(p.format!==FORMAT)erreurs.push('format');
 if(p.schema!==VERSION)erreurs.push('schema');
 if(!texte(p.id))erreurs.push('id');
 if(!texte(p.titre))erreurs.push('titre');
 if(!objet(p.provenance)||!texte(p.provenance.module)||!texte(p.provenance.identifiant))erreurs.push('provenance');
 if(!Array.isArray(p.contenus))erreurs.push('contenus');
 if(!Array.isArray(p.medias))erreurs.push('medias');
 if(!Array.isArray(p.relations))erreurs.push('relations');
 if(!objet(p.extensions))erreurs.push('extensions');
 ['contenus','medias','relations'].forEach(function(k){if(Array.isArray(p[k]))p[k].forEach(function(x,i){if(!objet(x)||!texte(x.id)||!texte(x.type))erreurs.push(k+'['+i+']')})});
 return{ok:erreurs.length===0,erreurs:erreurs};
}
/* Cette construction retourne un objet neuf : aucune écriture dans les projets historiques. */
function creer(o){
 o=o||{};
 return{format:FORMAT,schema:VERSION,id:o.id,titre:o.titre,provenance:{module:o.module,identifiant:o.identifiant},
 contenus:[],medias:[],relations:[],extensions:{}};
}
/* La lecture refuse les versions inconnues : ne jamais deviner ni rabattre v2 sur v1. */
function lire(p){var v=valide(p);if(!v.ok)throw new Error('Contrat AIME incompatible : '+v.erreurs.join(', '));return p}
return{FORMAT:FORMAT,VERSION:VERSION,creer:creer,valide:valide,lire:lire};
});
