/* AIME · RÉGIE · les sites du générateur, vus depuis la Régie et dans les écrans des appareils.
   Lecture seule du stockage du générateur (« aime-sites ») ; rendu par le moteur partagé (vitrine/rendu.js), avec les
   mêmes présentation, perspectives (SynchroView) et visuels que l'éditeur. Navigateur seulement.
   AIMERegieSites.pret() → Promise ; .liste() ; .html(id, {page, vue}) ; .public(id) ; .ecouter(fn) */
(function(){'use strict';if(window.AIMERegieSites)return;
var CLE='aime-sites',env=null,attente=null;
function script(src,present){return new Promise(function(ok){if(present())return ok();var s=document.createElement('script');s.src=src;s.onload=function(){ok()};s.onerror=function(){ok()};(document.head||document.documentElement).appendChild(s)})}
function json(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
function pret(){if(env)return Promise.resolve(env);if(attente)return attente;
 attente=Promise.all([script('/synchroview/permissions.js',function(){return!!window.AIMEPerms}),script('/vitrine/rendu.js',function(){return!!window.AIMESite})]).then(function(){
  return Promise.all([json('/vitrine/presentation/studio.json'),json('/vitrine/perspectives/sites.json'),json('/sites/bibliotheque/bibliotheque.json').catch(function(){return null})])}).then(function(r){
  env={S:window.AIMESite,PRES:r[0],VUES:r[1].vues||[],VIS:r[2]&&r[2].associations||null};return env});return attente}
function etat(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');return o&&o.sites?o:{sites:{},cur:null}}catch(e){return{sites:{},cur:null}}}
function liste(){var e=etat();return Object.keys(e.sites).map(function(id){var s=e.sites[id]||{};return{id:id,nom:(s.infos&&s.infos.titre)||s.nom||'Site sans titre',pages:(s.pages||[]).map(function(p){return{id:p.id,nom:p.nom||p.titre||p.id}}),univers:s.univers||'',maj:s.majLe||s.creeLe||null}}).sort(function(a,b){return String(b.maj||'').localeCompare(String(a.maj||''))})}
function site(id){return etat().sites[id]||null}
function vue(id){if(!env||!id||id==='public')return null;var v=env.VUES.filter(function(x){return x.id===id})[0];return v&&v.role?{id:'apercu-'+v.id,role:v.role}:null}
/* le document d'une page, pour une perspective : ce que voit ce rôle-là, rien de plus */
function html(id,o){o=o||{};var s=site(id);if(!s||!env)return null;try{return env.S.document(s,{page:o.page||'index',vue:vue(o.vue),regles:window.AIMEPerms,presentation:env.PRES,visuels:env.VIS,medias:'/sites/bibliotheque/'}).html}catch(e){return null}}
/* la version publique, en une seule page : c'est elle qui part avec la publication de la Régie */
function publique(id){var s=site(id);if(!s||!env)return null;try{return env.S.exporterPublic(s,{presentation:env.PRES,visuels:env.VIS,unePage:true,medias:'/sites/bibliotheque/'})[0].contenu}catch(e){return null}}
/* le générateur écrit dans un autre onglet ou une autre fenêtre : on est prévenu */
function ecouter(fn){addEventListener('storage',function(e){if(e.key===CLE)fn()})}
window.AIMERegieSites={pret:pret,liste:liste,site:site,html:html,publique:publique,ecouter:ecouter,vues:function(){return env?env.VUES:[]},CLE:CLE};
})();
