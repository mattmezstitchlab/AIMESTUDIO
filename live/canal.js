/* AIME LIVE · le canal d'un espace partagé, dans CE navigateur.
   Le journal (liste d'actions brutes) est gardé dans localStorage « aime-live:<espace> » et chaque onglet ouvert
   est prévenu par BroadcastChannel (repli : l'événement « storage »). Aucun onglet ne fait confiance à un autre :
   chacun relit le journal et le REJOUE avec les règles (live/modele.js). Une action refusée reste inscrite, sans effet.
   Limite assumée : entre deux appareils, il faut un serveur (voir docs/LIVE.md) ; ce canal ne le simule pas.

   AIMELiveCanal.ouvrir(espace, {journal(liste), presence(liste), horloge(h)}) → {envoyer, journal, recommencer, presence, horloge, regler} */
(function(){'use strict';if(window.AIMELiveCanal)return;
var MAX=500,VIE=12000;
function lire(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function ouvrir(espace,O){O=O||{};var CJ='aime-live:'+espace,CH='aime-live-horloge:'+espace,moi=Math.random().toString(36).slice(2,10),qui=null,vue='moi',autres={};
 var bc=null;try{bc=new BroadcastChannel('aime-live:'+espace)}catch(e){}
 function poster(m){if(bc)try{bc.postMessage(m)}catch(e){}}
 function journal(){var j=lire(CJ,[]);return Array.isArray(j)?j.slice(-MAX):[]}
 function prevenir(){if(O.journal)O.journal(journal())}
 function liste(){var t=Date.now(),L=[{id:moi,qui:qui,vue:vue,moi:true}];Object.keys(autres).forEach(function(k){if(t-autres[k].t<VIE)L.push(autres[k]);else delete autres[k]});return L}
 function presence(q,v){qui=q;vue=v||vue;poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())}
 /* l'horloge de démonstration : une heure de départ, un instant réel, une vitesse ; tous les onglets lisent la même */
 function horloge(){var h=lire(CH,null);if(!h||typeof h.base!=='number')return null;return h}
 function regler(h){ecrire(CH,h);poster({type:'horloge'});if(O.horloge)O.horloge(h)}
 function envoyer(a){var j=journal();j.push(a);if(j.length>MAX)j=j.slice(-MAX);if(!ecrire(CJ,j))return false;poster({type:'journal'});prevenir();return true}
 function recommencer(){try{localStorage.removeItem(CJ)}catch(e){}poster({type:'journal'});prevenir()}
 function recu(m){m=m||{};if(m.type==='journal')prevenir();else if(m.type==='horloge'){if(O.horloge)O.horloge(horloge())}
  else if(m.type==='presence'&&typeof m.id==='string'&&m.id!==moi){var nouveau=!autres[m.id];autres[m.id]={id:m.id,qui:String(m.qui||'').slice(0,40),vue:String(m.vue||'').slice(0,20),t:Date.now()};if(nouveau)poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())}
  else if(m.type==='depart'&&autres[m.id]){delete autres[m.id];if(O.presence)O.presence(liste())}}
 if(bc)bc.onmessage=function(e){recu(e.data)};
 addEventListener('storage',function(e){if(e.key===CJ)prevenir();else if(e.key===CH&&O.horloge)O.horloge(horloge())});
 setInterval(function(){poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())},4000);
 addEventListener('pagehide',function(){poster({type:'depart',id:moi})});
 return{envoyer:envoyer,journal:journal,recommencer:recommencer,presence:presence,horloge:horloge,regler:regler,partage:!!bc}}
window.AIMELiveCanal={ouvrir:ouvrir};
})();
