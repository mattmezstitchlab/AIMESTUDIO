/* AIME Phase 2 — projection LECTURE SEULE de projets Studio vers le contrat V1.
   Ne lit que echos:v2 ; ne cherche pas à deviner des médias ni la structure interne des supports.
   La classification timbre repose sur la présence d'un type explicite. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../contrats/projet.js'));else root.AIMEStudioProjetAdapter=factory(root.AIMEProjetContrat)})(typeof self!=='undefined'?self:this,function(P){'use strict';
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function timbre(p){
 if(!obj(p))return false;
 if(p.type==='timbre'||p.format==='timbre')return true;
 return Array.isArray(p.supports)&&p.supports.some(function(s){return obj(s)&&(s.type==='timbre'||s.format==='timbre')});
}
function depuisStockage(S){var raw;try{raw=S.getItem('echos:v2')}catch(e){return {projets:[],erreurs:['Stockage inaccessible']}}
 if(raw==null)return {projets:[],erreurs:[]};
 var db;try{db=JSON.parse(raw)}catch(e){return {projets:[],erreurs:['echos:v2 invalide']}}
 if(!obj(db)||!Array.isArray(db.projects))return {projets:[],erreurs:['echos:v2 sans liste de projets']};
 var result=[],erreurs=[],ids=new Set();
 db.projects.forEach(function(p,i){
  if(!timbre(p))return;
  if(typeof p.id!=='string'||!p.id){erreurs.push('Projet timbre '+i+' sans identifiant');return}
  if(ids.has(p.id)){erreurs.push('Identifiant timbre duplique : '+p.id);return}
  ids.add(p.id);
  var x=P.creer({id:'studio:'+p.id,titre:(typeof p.name==='string'&&p.name)||'Timbre sans titre',module:'studio',identifiant:p.id});
  x.extensions.studio={source:'echos:v2',type:'timbre',lectureSeule:true};
  if(!P.valide(x).ok){erreurs.push('Contrat incorrect : '+p.id);return}
  result.push(x);
 });
 return{projets:result,erreurs:erreurs};
}
return{timbre:timbre,depuisStockage:depuisStockage};
});
