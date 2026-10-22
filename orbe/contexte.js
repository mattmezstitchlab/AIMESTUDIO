/* AIME · ORBE · le contexte déclaré. L'orbe ne devine pas les pixels : chaque composant DÉCLARE ce qu'il est.
   Un descripteur : { id, type, titre, dit (ce que c'est), pourquoi (pourquoi c'est relié / ce que ça change),
     valeur (lisible), props: [{id, nom, type: 'nombre'|'curseur'|'choix'|'date'|'texte', min, max, pas, unite, options:[{id, nom, dit}], valeur}],
     actions: [{id, nom, dit, principale, consequence}], permis: {modifier: bool, raison}, valide: bool }
   AIMEOrbeContexte.declarer(el, d) · lire(el) (le descripteur le plus proche en remontant) · retirer(el)
   AIMEOrbeContexte.verifier(prop, valeur) → {ok, valeur, raison} : la règle est la même partout, testée sous node.
   AIMEOrbeContexte.TYPES : les types connus et ce que l'orbe en dit. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEOrbeContexte=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var TYPES={
 reglage:{nom:'Réglage',geste:'Choisissez une valeur, puis confirmez.'},
 noeud:{nom:'Élément relié',geste:'Voyez ce qu\'il représente et à quoi il est relié.'},
 lien:{nom:'Relation',geste:'Voyez pourquoi ces deux éléments sont reliés.'},
 cellule:{nom:'Case de la grille',geste:'Sélectionnez, regroupez ou déplacez.'},
 bloc:{nom:'Bloc de composition',geste:'Déplacez, redimensionnez, puis validez.'},
 projet:{nom:'Projet',geste:'Voyez l\'avancement, les décisions et ce qui manque.'}};
var REG=typeof WeakMap!=='undefined'?new WeakMap():null;
function declarer(el,d){if(!el||!REG)return el;REG.set(el,d);el.setAttribute('data-orbe-contexte',d.type||'');if(d.id)el.setAttribute('data-orbe-id',d.id);return el}
function retirer(el){if(REG&&el)REG.delete(el)}
function lire(el){for(var i=0;el&&i<10;i++,el=el.parentNode){if(REG&&REG.has(el))return{el:el,d:REG.get(el)};if(el.getAttribute&&el.hasAttribute&&el.hasAttribute('data-orbe-ignorer'))return null}return null}
/* une valeur proposée pour une propriété : bornée, arrondie au pas, ou refusée avec une raison lisible */
function verifier(p,v){if(!p)return{ok:false,raison:'Propriété inconnue.'};
 if(p.type==='nombre'||p.type==='curseur'){var n=Number(v);if(!isFinite(n))return{ok:false,raison:'Il faut un nombre.'};
  if(p.pas){n=Math.round(n/p.pas)*p.pas;n=+n.toFixed(6)}if(p.min!=null&&n<p.min)return{ok:false,raison:'Au moins '+p.min+(p.unite?' '+p.unite:'')+'.'};if(p.max!=null&&n>p.max)return{ok:false,raison:'Au plus '+p.max+(p.unite?' '+p.unite:'')+'.'};return{ok:true,valeur:n}}
 if(p.type==='choix'){var o=(p.options||[]).filter(function(x){return x.id===v})[0];return o?{ok:true,valeur:o.id}:{ok:false,raison:'Choisissez parmi les propositions.'}}
 if(p.type==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return{ok:false,raison:'Date attendue (jour/mois/année).'};var d=new Date(v+'T12:00:00Z');return isNaN(d)||d.toISOString().slice(0,10)!==v?{ok:false,raison:'Cette date n\'existe pas.'}:{ok:true,valeur:v}}
 if(p.type==='texte'){var t=String(v==null?'':v).replace(/[\u0000-\u001F\u007F]/g,' ').trim();if(p.min&&t.length<p.min)return{ok:false,raison:'Un peu plus de texte.'};return{ok:true,valeur:t.slice(0,p.max||200)}}
 return{ok:false,raison:'Type non géré.'}}
/* le principe de chaque modification : observer → proposer → régler → confirmer → enregistrer */
var CYCLE=['observer','proposer','regler','confirmer','enregistrer'];
return{TYPES:TYPES,CYCLE:CYCLE,declarer:declarer,retirer:retirer,lire:lire,verifier:verifier};
});
