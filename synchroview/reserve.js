/* SynchroView · démonstrateur de recherche (identités fictives).
   Sur le site public (www.lemondeaime.com), il n'est proposé qu'au propriétaire du site, reconnu par le serveur (/api/identite).
   Ce script ne fait que masquer la page aux autres : la vraie protection est côté serveur (les routes api/sv répondent 404
   en production à toute personne qui n'est pas propriétaire). Les aperçus et le local restent ouverts pour la recherche. */
(function(){'use strict';
var PUBLICS=['www.lemondeaime.com','lemondeaime.com','www.ai-x-me.com','ai-x-me.com'];
if(PUBLICS.indexOf(location.hostname)<0)return;
var d=document.documentElement;d.setAttribute('data-sv-reserve','attente');
var st=document.createElement('style');st.textContent='html[data-sv-reserve] body>*:not(.sv-reserve){display:none!important}.sv-reserve{max-width:560px;margin:18vh auto;padding:0 20px;font:16px/1.5 system-ui,sans-serif;color:#EDEDF0}.sv-reserve h1{font-size:24px;margin:0 0 8px}.sv-reserve a{color:#C4B5FD}';
document.head.appendChild(st);
function refuser(){if(document.querySelector('.sv-reserve'))return;var m=document.createElement('main');m.className='sv-reserve';m.innerHTML='<h1>Démonstrateur réservé</h1><p>SynchroView compare des perspectives à partir d\'identités fictives. Ce démonstrateur de recherche n\'est pas ouvert au public pour le moment.</p><p><a href="/bureau/">Retour au Bureau</a></p>';document.body.appendChild(m)}
function ouvrir(){d.removeAttribute('data-sv-reserve')}
fetch('/api/identite',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.proprietaire===true)ouvrir();else d.setAttribute('data-sv-reserve','refus')}).catch(function(){d.setAttribute('data-sv-reserve','refus')});
document.addEventListener('DOMContentLoaded',function(){if(d.hasAttribute('data-sv-reserve'))refuser()});
var o=new MutationObserver(function(){if(d.getAttribute('data-sv-reserve')==='refus'&&document.body)refuser()});o.observe(d,{attributes:true});
})();
