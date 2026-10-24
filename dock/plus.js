/* AIME · le + unique (docs/IDENTITE.md § 6). Sa logique d'état est celle de porte/porte.js, sans dépendre du Timbre :
     sans compte  → « Commencer » : le champ d'intention de l'accueil, curseur dedans ;
     connecté     → ses projets, puis « Nouveau projet ».
   Le Timbre n'est jamais une étape. Le + ne donne aucun droit : il mène à des pages qui revérifient tout au serveur.
   AIMEPlus.etat(info, espaces) → { mode, items:[{ id, nom, sous?, href }] }   (pur, testé sous node)
   AIMEPlus.brancher(zone)       → lit /api/identite puis, connecté, /api/espaces « mes », et remplit le menu du + du dock
   AIMEPlus.commencer()          → sur l'accueil, met le curseur dans le champ d'intention ; ailleurs, y conduit. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEPlus=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var COMMENCER='/?commencer=1',MAX=5;
var RELATION={owner:'votre projet',editor:'coordination',contributor:'contribution',viewer:'lecture seule',guest:'invité'};
function etat(info,espaces){
 if(!info||!info.connecte)return{mode:'commencer',items:[{id:'commencer',nom:'Commencer',href:COMMENCER}]};
 var L=(espaces||[]).slice(0,MAX).map(function(e){return{id:'projet-'+e.id,nom:String(e.titre||'Projet'),sous:RELATION[e.role]||'',href:'/projets/?espace='+encodeURIComponent(e.id)}});
 L.push({id:'nouveau',nom:'Nouveau projet',href:COMMENCER});
 return{mode:'projets',items:L};
}
function champ(){return typeof document!=='undefined'?document.getElementById('acTexte'):null}
function commencer(){var c=champ();if(!c){location.href=COMMENCER;return}
 c.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});setTimeout(function(){try{c.focus({preventScroll:true})}catch(_){c.focus()}},250)}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function remplir(zone,e){var m=zone.querySelector('.dock-menu');if(!m)return;var sep=m.querySelector('.dock-sep'),fin=sep?[sep].concat([].slice.call(m.querySelectorAll('.dock-sep~*'))):[];
 m.innerHTML=e.items.map(function(x){var cmd=x.href===COMMENCER;return'<a class="dock-g" role="menuitem" tabindex="-1" href="'+esc(x.href)+'" data-geste="'+esc(x.id)+'" data-type="public"'+(cmd?' data-commencer="1"':'')+'>'+esc(x.nom)+(x.sous?'<small>'+esc(x.sous)+'</small>':'')+'</a>'}).join('');
 fin.forEach(function(n){m.appendChild(n)});var b=zone.querySelector('.dock-plus');if(b)b.setAttribute('aria-label',e.mode==='projets'?'Mes projets et nouveau projet':'Commencer un projet')}
function brancher(zone){if(!zone||typeof fetch!=='function')return Promise.resolve(null);
 remplir(zone,etat(null));
 zone.addEventListener('click',function(ev){var a=ev.target.closest('[data-commencer]');if(!a||!champ())return;ev.preventDefault();ev.stopPropagation();var b=zone.querySelector('.dock-plus'),m=zone.querySelector('.dock-menu');if(m)m.hidden=true;if(b)b.setAttribute('aria-expanded','false');commencer()},true);
 return fetch('/api/identite',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():{connecte:false}}).catch(function(){return{connecte:false}}).then(function(info){
  if(!info||!info.connecte){remplir(zone,etat(info));return etat(info)}
  return fetch('/api/espaces',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'mes'})}).then(function(r){return r.ok?r.json():{espaces:[]}}).catch(function(){return{espaces:[]}})
   .then(function(j){var e=etat(info,j.espaces||[]);remplir(zone,e);return e})})}
/* arrivée par « ?commencer=1 » : le curseur va dans le champ d'intention */
if(typeof window!=='undefined'&&typeof location!=='undefined'&&/[?&]commencer=1\b/.test(location.search))window.addEventListener('load',function(){commencer()});
return{etat:etat,brancher:brancher,commencer:commencer,COMMENCER:COMMENCER};
});
