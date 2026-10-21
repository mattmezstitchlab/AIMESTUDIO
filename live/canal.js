/* AIME LIVE · le canal d'un espace partagé.
   Deux transports, la même règle : aucun écran ne fait confiance à un autre, chacun REJOUE le journal (live/modele.js).
   1. Entre appareils (si le serveur l'ouvre) : /api/live/* — laissez-passer signé, action revérifiée côté serveur avant
      d'être écrite (une action refusée n'est pas écrite), journal relu toutes les 2 s, annonces d'équipe filtrées.
   2. Dans ce navigateur (repli) : localStorage « aime-live:<espace> » + BroadcastChannel ; une action refusée y reste, sans effet.
   L'horloge de démonstration et la présence restent propres à ce navigateur.

   AIMELiveCanal.ouvrir(espace, {journal(), presence(liste), horloge(h), mode(m)}) →
     {envoyer(a) → Promise<{serveur, ok, raison}>, journal, recommencer, presence, horloge, regler, identite(qui), mode()} */
(function(){'use strict';if(window.AIMELiveCanal)return;
var MAX=500,VIE=12000,SONDE=2000;
function lire(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function post(u,b){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),cache:'no-store'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j.statut=r.status;return j})})}
function ouvrir(espace,O){O=O||{};var CJ='aime-live:'+espace,CH='aime-live-horloge:'+espace,moi=Math.random().toString(36).slice(2,10),qui=null,vue='moi',autres={};
 var bc=null;try{bc=new BroadcastChannel('aime-live:'+espace)}catch(e){}
 var srv={actif:false,passe:null,lignes:[],dernier:0,minuterie:null,essai:0};
 function poster(m){if(bc)try{bc.postMessage(m)}catch(e){}}
 function journal(){if(srv.actif)return srv.lignes.slice(-MAX);var j=lire(CJ,[]);return Array.isArray(j)?j.slice(-MAX):[]}
 function prevenir(){if(O.journal)O.journal(journal())}
 function liste(){var t=Date.now(),L=[{id:moi,qui:qui,vue:vue,moi:true}];Object.keys(autres).forEach(function(k){if(t-autres[k].t<VIE)L.push(autres[k]);else delete autres[k]});return L}
 function presence(q,v){qui=q;vue=v||vue;poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())}
 function horloge(){var h=lire(CH,null);if(!h||typeof h.base!=='number')return null;return h}
 function regler(h){ecrire(CH,h);poster({type:'horloge'});if(O.horloge)O.horloge(h)}
 /* ---- entre appareils ---- */
 function sonder(){if(!srv.passe)return Promise.resolve();return post('/api/live/journal',{passe:srv.passe,depuis:srv.dernier}).then(function(r){
   if(r.statut===200&&r.ok){var n=r.lignes||[];srv.dernier=r.dernier||srv.dernier;if(!srv.actif){srv.actif=true;if(O.mode)O.mode('appareils')}if(n.length){srv.lignes=srv.lignes.concat(n).slice(-MAX);prevenir()}return}
   if(r.statut===401)return identite(qui);
   if(srv.actif){srv.actif=false;if(O.mode)O.mode('navigateur');prevenir()}}).catch(function(){})}
 function identite(q){qui=q;var essai=++srv.essai;srv.passe=null;srv.lignes=[];srv.dernier=0;clearInterval(srv.minuterie);
  return post('/api/live/passe',{espace:espace,qui:q}).then(function(r){if(essai!==srv.essai)return;
   if(r.statut===200&&r.passe){srv.passe=r.passe;return sonder().then(function(){if(srv.actif)srv.minuterie=setInterval(sonder,SONDE);else{if(O.mode)O.mode('navigateur')}prevenir()})}
   if(srv.actif){srv.actif=false;prevenir()}if(O.mode)O.mode('navigateur')}).catch(function(){if(O.mode)O.mode('navigateur')})}
 /* ---- envoyer : au serveur s'il est ouvert, sinon dans ce navigateur ---- */
 function envoyer(a){if(srv.actif&&srv.passe)return post('/api/live/act',{passe:srv.passe,action:a.action,p:a.p,t:a.t}).then(function(r){
    if(r.statut===200&&r.ok)return sonder().then(function(){return{serveur:true,ok:true,touches:r.touches||[]}});
    return{serveur:true,ok:false,raison:r.raison||(r.statut===429?'trop d\'actions, patientez une minute':'refusé')}}).catch(function(){return{serveur:true,ok:false,raison:'serveur injoignable'}});
  var j=lire(CJ,[]);if(!Array.isArray(j))j=[];j.push(a);if(j.length>MAX)j=j.slice(-MAX);if(!ecrire(CJ,j))return Promise.resolve({ok:false,raison:'stockage du navigateur indisponible'});poster({type:'journal'});prevenir();return Promise.resolve({serveur:false})}
 function recommencer(){if(srv.actif)return false;try{localStorage.removeItem(CJ)}catch(e){}poster({type:'journal'});prevenir();return true}
 function recu(m){m=m||{};if(m.type==='journal'){if(!srv.actif)prevenir()}else if(m.type==='horloge'){if(O.horloge)O.horloge(horloge())}
  else if(m.type==='presence'&&typeof m.id==='string'&&m.id!==moi){var nouveau=!autres[m.id];autres[m.id]={id:m.id,qui:String(m.qui||'').slice(0,40),vue:String(m.vue||'').slice(0,20),t:Date.now()};if(nouveau)poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())}
  else if(m.type==='depart'&&autres[m.id]){delete autres[m.id];if(O.presence)O.presence(liste())}}
 if(bc)bc.onmessage=function(e){recu(e.data)};
 addEventListener('storage',function(e){if(e.key===CJ&&!srv.actif)prevenir();else if(e.key===CH&&O.horloge)O.horloge(horloge())});
 setInterval(function(){poster({type:'presence',id:moi,qui:qui,vue:vue});if(O.presence)O.presence(liste())},4000);
 addEventListener('pagehide',function(){poster({type:'depart',id:moi})});
 return{envoyer:envoyer,journal:journal,recommencer:recommencer,presence:presence,horloge:horloge,regler:regler,identite:identite,mode:function(){return srv.actif?'appareils':'navigateur'}}}
window.AIMELiveCanal={ouvrir:ouvrir};
})();
