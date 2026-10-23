/* AIME · Cube Maître · charger les sources réelles du site, dans le navigateur. Partagé par l'app (/maitre/) et le Canevas.
   Lecture seule : des scripts purs déjà publiés, des fichiers publics et trois routes serveur. Aucun stockage du navigateur
   n'est lu ni écrit (ni brouillon ni comptabilité de la Régie) : la configuration lue est la version PUBLIÉE (regie/site.json).
     AIMEMaitreSources.charger() → Promise<cube du Cube Maître> (AIMEMaitre.resumer)
   Une source qui échoue laisse sa facette « à venir » : on n'invente aucun chiffre. */
(function(root){'use strict';if(root.AIMEMaitreSources)return;
var SCRIPTS=[['/nav/registre.js','AIMENav'],['/regie/donnees.js','AIMERegie'],['/sante/modele.js','AIMESante'],['/reseau/registre.js','AIMEReseau'],['/vitrine/rendu.js','AIMESite'],['/cube/modele.js','AIMECube'],['/maitre/modele.js','AIMEMaitre']];
function script(u,g){return new Promise(function(ok){if(root[g])return ok();var s=document.createElement('script');s.src=u;s.onload=function(){ok()};s.onerror=function(){ok()};document.head.appendChild(s)})}
function json(u,o){return fetch(u,Object.assign({cache:'no-cache',credentials:'same-origin'},o||{})).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
var attente=null;
function charger(){if(attente)return attente;
 attente=SCRIPTS.reduce(function(p,x){return p.then(function(){return script(x[0],x[1])})},Promise.resolve()).then(function(){
  return Promise.all([json('/regie/site.json'),json('/moteurs.json'),json('/univers.json'),json('/api/identite'),json('/api/health',{cache:'no-store'})])}).then(function(r){
  var proprio=!!(r[3]&&r[3].proprietaire===true);
  /* les compteurs des comptes : seulement si le serveur dit « propriétaire » ; le serveur revérifie de toute façon (404 sinon) */
  return(proprio?json('/api/maitre',{cache:'no-store'}):Promise.resolve(null)).then(function(m){var M=root.AIMEMaitre;if(!M)throw new Error('Le Cube Maître n\'a pas pu être chargé.');
   return M.resumer({nav:root.AIMENav,regie:root.AIMERegie,site:r[0],moteurs:r[1],univers:r[2],sante:root.AIMESante,reseau:root.AIMEReseau,
    blocs:root.AIMESite&&root.AIMESite.BLOCS?Object.keys(root.AIMESite.BLOCS).length:null,health:r[4]?r[4].ok===true:false,
    proprietaire:proprio,comptes:m&&m.ok?m.comptes:null})})});
 attente.catch(function(){attente=null});return attente}
root.AIMEMaitreSources={charger:charger};
})(typeof self!=='undefined'?self:this);
