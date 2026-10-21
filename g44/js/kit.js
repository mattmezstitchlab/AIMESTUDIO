/* AIME G44 LAB · kit de pilote. De quoi MESURER, chez un organisme, ce que la lecture augmentée change vraiment.
   Même dossier fictif, même consigne, des volontaires désignés par un code (jamais par leur nom), deux parcours
   (référence : les outils habituels ; augmenté : le laboratoire), dans un ordre alterné pour neutraliser l'apprentissage.
   Rien n'est envoyé : la session vit dans ce navigateur et s'exporte en CSV ou JSON. Aucun résultat n'est inventé :
   tant qu'une mesure n'est pas saisie, elle n'existe pas. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.G44Kit=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var PARCOURS={ref:'Référence (outils habituels)',aug:'Augmenté (G44 LAB)'};
/* les indicateurs, alignés sur le protocole de la page (section « Mesurer ») */
var INDICATEURS=[
 {id:'comprendre',nom:'Temps de compréhension',unite:'min',type:'temps',aide:'Du début de lecture à la reformulation correcte du problème.'},
 {id:'procedure',nom:'Temps de recherche de procédure',unite:'min',type:'temps',aide:'Jusqu\'à l\'identification de la procédure applicable.'},
 {id:'total',nom:'Temps total',unite:'min',type:'temps',aide:'Du début à la fin du plan de correction.'},
 {id:'ecrans',nom:'Changements d\'écran',unite:'nombre',type:'compte',aide:'Chaque passage d\'un écran ou d\'une application à une autre.'},
 {id:'ressaisies',nom:'Informations ressaisies',unite:'nombre',type:'compte',aide:'Une même information saisie une seconde fois.'},
 {id:'retours',nom:'Retours arrière',unite:'nombre',type:'compte',aide:'Revenir sur une étape déjà faite.'},
 {id:'erreurs',nom:'Erreurs de séquence',unite:'nombre',type:'compte',aide:'Écart à l\'ordre validé par les experts de l\'organisme.'},
 {id:'aide',nom:'Appels à une assistance',unite:'nombre',type:'compte',aide:'Demandes d\'aide pendant la tâche.'},
 {id:'complet',nom:'Plan complet et cohérent',unite:'oui / non',type:'binaire',aide:'Jugé par un expert qui ne sait pas quel parcours a été suivi.'},
 {id:'difficulte',nom:'Difficulté perçue',unite:'1 à 7',type:'echelle',aide:'Demandée au participant juste après le parcours.'}];
var CODE=/^P\d{2,3}$/;
function code(i){return'P'+('0'+(i+1)).slice(-2)}
/* ordre alterné : un participant sur deux commence par la référence */
function ordre(i){return i%2===0?['ref','aug']:['aug','ref']}
function nouvelleSession(n,organisme){n=Math.max(2,Math.min(40,Math.floor(+n||0)));var p=[];for(var i=0;i<n;i++)p.push({code:code(i),ordre:ordre(i),mesures:{ref:{},aug:{}}});
 return{format:'g44-kit',version:1,organisme:String(organisme||'').slice(0,80),creeLe:null,consigne:'Une année de mariage est erronée (2015 au lieu de 2016). Un enfant est déjà rattaché au dossier. Préparez la correction.',participants:p}}
function valide(ind,v){if(v===''||v==null)return null;if(ind.type==='binaire')return v===true||v==='oui'||v===1?1:v===false||v==='non'||v===0?0:null;
 var x=typeof v==='number'?v:parseFloat(String(v).replace(',','.'));if(!isFinite(x)||x<0)return null;if(ind.type==='echelle')return x>=1&&x<=7?Math.round(x):null;if(ind.type==='compte')return Math.round(x);return Math.round(x*100)/100}
function saisir(s,codeP,parcours,id,v){var p=s.participants.filter(function(x){return x.code===codeP})[0],ind=INDICATEURS.filter(function(x){return x.id===id})[0];
 if(!p||!PARCOURS[parcours]||!ind)throw new Error('Saisie impossible : participant, parcours ou indicateur inconnu.');var x=valide(ind,v);
 if(x==null)delete p.mesures[parcours][id];else p.mesures[parcours][id]=x;return x}
function stats(l){if(!l.length)return null;var t=l.slice().sort(function(a,b){return a-b}),n=t.length,m=t.reduce(function(a,b){return a+b},0)/n,med=n%2?t[(n-1)/2]:(t[n/2-1]+t[n/2])/2;return{n:n,moyenne:Math.round(m*100)/100,mediane:Math.round(med*100)/100,min:t[0],max:t[n-1]}}
/* comparaison appariée : seuls les participants mesurés dans les deux parcours comptent pour l'écart */
function resultats(s){return INDICATEURS.map(function(ind){var r=[],a=[],paires=[];s.participants.forEach(function(p){var x=p.mesures.ref[ind.id],y=p.mesures.aug[ind.id];if(x!=null)r.push(x);if(y!=null)a.push(y);if(x!=null&&y!=null)paires.push(y-x)});
 var sr=stats(r),sa=stats(a),d=stats(paires);
 return{id:ind.id,nom:ind.nom,unite:ind.unite,ref:sr,aug:sa,ecart:d,paires:paires.length,
  lecture:paires.length<3?'Pas assez de participants mesurés dans les deux parcours pour lire un écart (au moins 3 paires).':ind.type==='binaire'?'Part des plans complets : '+Math.round(sr.moyenne*100)+' % en référence, '+Math.round(sa.moyenne*100)+' % en augmenté, sur '+paires.length+' paires.':'Écart médian par participant : '+(d.mediane>0?'+':'')+String(d.mediane).replace('.',',')+' '+ind.unite+' (augmenté − référence), sur '+paires.length+' paires.'}})}
function csvCase(v){v=v==null?'':String(v);return/[;"\n\r]/.test(v)||/^[=+\-@\t]/.test(v)?'"'+v.replace(/"/g,'""').replace(/^([=+\-@\t])/,"'$1")+'"':v}
function csv(s){var t=[['organisme','participant','ordre','parcours'].concat(INDICATEURS.map(function(i){return i.id+' ('+i.unite+')'}))];
 s.participants.forEach(function(p){p.ordre.forEach(function(k,j){t.push([s.organisme,p.code,j+1,k].concat(INDICATEURS.map(function(i){var v=p.mesures[k][i.id];return v==null?'':String(v).replace('.',',')})))})});
 return'﻿'+t.map(function(l){return l.map(csvCase).join(';')}).join('\r\n')}
/* relire une session exportée : rien d'autre que des codes et des nombres n'est accepté */
function lire(texte){var o=typeof texte==='string'?JSON.parse(texte):texte;if(!o||o.format!=='g44-kit'||!Array.isArray(o.participants))throw new Error('Ce fichier n\'est pas une session du kit G44.');
 var s=nouvelleSession(o.participants.length,o.organisme);s.creeLe=typeof o.creeLe==='string'?o.creeLe.slice(0,30):null;
 o.participants.forEach(function(p,i){if(!p||!CODE.test(p.code))throw new Error('Participant ' + (i+1) + ' : un code de la forme P01 est attendu, jamais un nom.');s.participants[i].code=p.code;
  ['ref','aug'].forEach(function(k){var m=p.mesures&&p.mesures[k]||{};INDICATEURS.forEach(function(ind){var x=valide(ind,m[ind.id]);if(x!=null)s.participants[i].mesures[k][ind.id]=x})})});return s}
function complet(s){var tot=s.participants.length*2*INDICATEURS.length,f=0;s.participants.forEach(function(p){['ref','aug'].forEach(function(k){f+=Object.keys(p.mesures[k]).length})});return{remplies:f,total:tot}}
return{PARCOURS:PARCOURS,INDICATEURS:INDICATEURS,ordre:ordre,nouvelleSession:nouvelleSession,saisir:saisir,resultats:resultats,stats:stats,csv:csv,lire:lire,complet:complet};
});
