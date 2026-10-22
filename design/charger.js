/* AIME · Design Systems : charge le catalogue livré (design/catalogue/*.json) et le valide avec design/systemes.js.
   Utilisé par le Canevas (adaptateur aime-site) et l'aperçu du projet. En cas d'échec, un catalogue vide : la réalisation
   garde son ambiance, rien ne casse.   AIMEDesignCharger() → Promise<catalogue> (mémorisé) */
(function(root){'use strict';
var p=null,VIDE={ids:[],sources:{},compiles:{},rapports:{},bases:{}};
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=ko;document.head.appendChild(s)})}
function json(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
root.AIMEDesignCharger=function(){if(p)return p;
 p=(root.AIMEDesign?Promise.resolve():script('/design/systemes.js')).then(function(){return json('/design/catalogue/index.json')})
  .then(function(ix){return Promise.all((ix.systemes||[]).filter(function(i){return/^[a-z0-9-]{1,40}$/.test(i)}).map(function(i){return json('/design/catalogue/'+i+'.json').catch(function(){return null})}))})
  .then(function(L){return root.AIMEDesign.catalogue(L.filter(Boolean))}).catch(function(){p=null;return VIDE});return p}})(typeof self!=='undefined'?self:this);
