/* AIME · Canevas · adaptateur broderie. Seul ce fichier connaît Stitch ; le plan de travail n'en dépend pas.
   Il lit le projet confirmé au Point Zéro (cases, dimensions, fils DMC, toile), en fait un patron « aime-stitch » avec
   StitchPatron.depuisConversion, et le dessine avec StitchRendu.grille. Aucune question, aucune ressaisie ;
   les références DMC passent telles quelles. Unités natives : la case (un point de fil) ; une case = PAS unités de scène. */
(function(root){'use strict';
var PAS=12,CT={aida11:11,aida14:14,aida16:16,aida18:18,lin28:14};
var SCRIPTS=['/stitch/js/couleur.js','/stitch/js/patron.js','/stitch/js/symboles.js','/stitch/js/rendu.js'];
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Le moteur Stitch n\'a pas pu être chargé.'))};document.head.appendChild(s)})}
var moteur=null;
function chargerMoteur(){if(moteur)return moteur;moteur=SCRIPTS.reduce(function(p,u){return p.then(function(){return root.StitchRendu&&u.indexOf('rendu')>0?null:script(u)})},Promise.resolve())
 .then(function(){return fetch('/stitch/data/dmc.json').then(function(r){if(!r.ok)throw new Error('Le nuancier DMC est indisponible.');return r.json()})}).then(function(j){root.StitchRendu.tableDMC(j.fils||[])});moteur.catch(function(){moteur=null});return moteur}
function projet(id){return new Promise(function(ok,ko){if(!root.indexedDB)return ko(new Error('Ce navigateur ne garde pas les projets.'));var r=indexedDB.open('aime-point-zero',2);
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('fichiers'))db.createObjectStore('fichiers',{keyPath:'id'});if(!db.objectStoreNames.contains('projets'))db.createObjectStore('projets',{keyPath:'id'})};
 r.onsuccess=function(){var t=r.result.transaction('projets','readonly'),g=t.objectStore('projets').get(id);g.onsuccess=function(){ok(g.result||null)};g.onerror=function(){ko(g.error)}};r.onerror=function(){ko(r.error)}})}

/* le patron, depuis les données confirmées du projet ; null si la conversion n'a pas encore eu lieu */
function patronDe(p){if(!p||!p.cases||!p.dims||!p.palette||!p.palette.length)return null;var P=root.StitchPatron;
 return P.depuisConversion({l:p.dims.l,h:p.dims.h,points:Array.prototype.slice.call(p.cases),palette:p.palette.map(function(f){return{dmc:String(f.dmc)}}),mode:p.choix&&p.choix.couleurs,reglages:p.choix||{}},
  {id:'pz-'+p.id,titre:p.titre,toile:{type:'aida',count:CT[p.choix&&p.choix.toile]||14},provenance:{source:'point-zero',projet:p.id}})}

var A={type:'broderie',nom:'Broderie',
 charger:function(source){return Promise.all([chargerMoteur(),projet(source.id)]).then(function(r){var p=r[1];if(!p)throw new Error('Ce projet n\'est pas sur cet appareil.');
   var pt=patronDe(p);if(!pt)throw new Error('Ce projet n\'a pas encore de patron : terminez la conversion des couleurs au Point Zéro.');
   var g=p.grille||{};return{titre:p.titre||'Projet broderie',sous:'Broderie · '+pt.l+' × '+pt.h+' points · '+pt.palette.length+' fils DMC'+(g.cm?' · '+g.cm[0]+' × '+g.cm[1]+' cm':''),
    calque:{nom:'Patron',grille:{type:'broderie',pas:PAS},taille:{l:pt.l*PAS,h:pt.h*PAS}},donnees:{projet:p,patron:pt}}})},
 dessiner:function(g,c,vue,W,H,d,etat){var s=vue.z*PAS;root.StitchRendu.grille(g,d.patron,{x:(vue.x-c.t.dx)/PAS,y:(vue.y-c.t.dy)/PAS,s:s},W,H,{mode:etat.mode||(s>=14?'mixte':'couleurs'),surbrillance:etat.hl||0,fond:'#EFEEEA'})},
 element:function(d,c,x,y){if(!d)return null;var pt=d.patron,u=Math.floor((x-c.t.dx)/PAS),v=Math.floor((y-c.t.dy)/PAS);if(u<0||v<0||u>=pt.l||v>=pt.h)return null;
  var m=root.StitchPatron.matrice(pt),k=m[v*pt.l+u];if(!k)return{titre:'Case vide',dit:'Colonne '+(u+1)+', ligne '+(v+1)+' : rien à broder ici.',ref:'case '+(u+1)+','+(v+1),actions:[]};
  var f=d.projet.palette[k-1]||{dmc:pt.palette[k-1].dmc},n=0;for(var i=0;i<m.length;i++)if(m[i]===k)n++;
  return{titre:'DMC '+f.dmc+(f.nom?' · '+f.nom:''),dit:'Colonne '+(u+1)+', ligne '+(v+1)+'. Ce fil couvre '+n.toLocaleString('fr-FR')+' cases du patron.',ref:'DMC '+f.dmc+' · case '+(u+1)+','+(v+1),indice:k,
   actions:[{id:'evidence',nom:'Mettre ce fil en évidence'},{id:'tout',nom:'Tout afficher'},{id:'symboles',nom:'Symboles'},{id:'couleurs',nom:'Couleurs'}]}},
 agir:function(d,id,e,etat){if(id==='evidence'){etat.hl=e.indice;return'DMC '+(d.projet.palette[e.indice-1]||{}).dmc+' mis en évidence.'}if(id==='tout'){etat.hl=0;return'Tous les fils sont affichés.'}
  if(id==='symboles'||id==='couleurs'){etat.mode=etat.mode===id?null:id;return etat.mode?'Affichage : '+id+'.':'Affichage automatique selon le zoom.'}return''}};
A.patronDe=patronDe;A.PAS=PAS;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('broderie',A);else root.AIMECanevasBroderie=A;
})(typeof self!=='undefined'?self:this);
