/* AIME · lire une publication. ?exemple=aime-magazine (l'exemple livré, public) ou ?id=<publication de cet appareil>.
   Le rendu est celui du moteur de pages (mode planche), la vue publique seulement : rien de réservé n'y figure. */
(function(){'use strict';
var q=new URLSearchParams(location.search),ex=String(q.get('exemple')||'').replace(/[^a-z0-9-]/g,'').slice(0,40),id=String(q.get('id')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
var EXEMPLES={'aime-magazine':'/publication/exemples/aime-magazine-temoins.aime-site.json'};
function $(i){return document.getElementById(i)}
function dire(t){$('etat').textContent=t;$('etat').hidden=false}
function local(){try{var o=JSON.parse(localStorage.getItem('aime-sites')||'null');return o&&o.sites&&o.sites[id]||null}catch(e){return null}}
function source(){if(ex&&EXEMPLES[ex])return fetch(EXEMPLES[ex],{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('L\'exemple est indisponible.');return r.json()});
 if(id){var s=local();return s?Promise.resolve(s):Promise.reject(new Error('Cette publication n\'est pas sur cet appareil.'))}return Promise.reject(new Error('Aucune publication indiquée.'))}
Promise.all([source(),fetch('/vitrine/presentation/studio.json',{cache:'no-cache'}).then(function(r){return r.json()}),window.AIMEDesignCharger?window.AIMEDesignCharger():Promise.resolve({compiles:{}})]).then(function(r){
 var site=AIMESite.migrer?AIMESite.migrer(r[0]):r[0];if(!site||!site.publication)throw new Error('Ce document n\'est pas une publication.');
 var P=r[1];P.systemes=r[2].compiles;var doc=AIMESite.document(site,{unePage:true,presentation:P,medias:'/sites/bibliotheque/'});
 document.title=(site.infos.titre||site.nom||'Publication')+' · AIME';$('titre').textContent=site.infos.titre||site.nom||'Publication';
 $('modifier').href='/canevas/?publication='+encodeURIComponent(ex?'exemple-'+ex:site.id);
 var f=$('doc');f.srcdoc=doc.html;$('cadre').hidden=false;$('etat').hidden=true;
 function mode(t){$('cadre').classList.toggle('tel',t);$('ordi').setAttribute('aria-pressed',String(!t));$('tel').setAttribute('aria-pressed',String(t))}
 $('ordi').onclick=function(){mode(false)};$('tel').onclick=function(){mode(true)};if(q.get('vue')==='tel')mode(true);
}).catch(function(e){dire((e&&e.message)||'Impossible d\'ouvrir la publication.')});
})();
