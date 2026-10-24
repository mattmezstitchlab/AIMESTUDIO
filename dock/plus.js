/* AIME · le Dock public et son + (docs/IDENTITE.md § 6 ; décision de Matt du 24/10).
   Le Dock garde les lieux, le + garde les actions : aucune destination du Dock dans le +.
     pas connecté : Le cœur · Exemples · + · J'ai un compte          ; le + : « Créer un projet » · « J'ai reçu une invitation »
     connecté     : Le cœur · Exemples · + · Mes projets · Mon compte ; le + : « Nouveau projet » · « J'ai reçu une invitation »
     dans un projet : le Dock que le serveur compose (compte/projet.js), avec les seuls gestes du rôle ; ce fichier n'y est pas branché.
   « Créer un projet » fait défiler jusqu'à « Je suis… » et l'ouvre (ailleurs, y conduit) ; « Nouveau projet » ouvre la création de Mes projets
   (compte/creer.js) ; « J'ai reçu une invitation » ouvre un champ pour coller le lien, qui mène à /projets/?invitation=… : sans session,
   on se connecte et le parcours reprend sur l'invitation. Le + ne donne aucun droit : le serveur revérifie tout.
   AIMEPlus.etat(info)   → { mode, famille, gestes:[ids] }   (pur, testé sous node)
   AIMEPlus.jeton(texte) → le jeton d'un lien d'invitation collé, ou null (pur, testé sous node)
   AIMEPlus.brancher(el) → lit /api/identite ; connecté, repose le Dock avec Mes projets et Mon compte, et rend le + vivant */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEPlus=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var COMMENCER='/?commencer=1',JETON=/^[A-Za-z0-9_-]{20,100}$/;
function etat(info){var c=!!(info&&info.connecte);
 return c?{mode:'connecte',famille:'Public connecté',gestes:['nouveauProjet','invitationRecue']}:{mode:'public',famille:'Public',gestes:['creerProjet','invitationRecue']}}
/* un lien collé : https://…/projets/?invitation=XXXX (ou /compte/?invitation=…), ou le jeton seul ; rien d'autre n'est suivi */
function jeton(texte){var t=String(texte==null?'':texte).trim();if(!t)return null;if(JETON.test(t))return t;
 var u;try{u=new URL(t,'https://x.invalid')}catch(_){return null}
 if(!/^\/(projets|compte)\/?$/.test(u.pathname))return null;var j=u.searchParams.get('invitation');return j&&JETON.test(j)?j:null}
function champ(){return typeof document!=='undefined'?document.getElementById('jsChoix'):null}   /* « Je suis… » (accueil, PR C) */
function reduit(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches}
/* « Créer un projet » : jusqu'à « Je suis… », et la liste s'ouvre (quand le navigateur le permet ; sinon le focus y est) */
function commencer(){var c=champ();if(!c){location.href=COMMENCER;return}
 c.scrollIntoView({block:'center',behavior:reduit()?'auto':'smooth'});
 setTimeout(function(){if(c._ouvrir){c._ouvrir();return}try{c.focus({preventScroll:true})}catch(_){c.focus()}try{if(c.showPicker)c.showPicker()}catch(_){}},reduit()?0:350)}   /* la liste dessinée (accueil/liste.js) s'ouvre ; un <select> natif, à défaut */
function fermerMenu(el){var b=el.querySelector('.dock-plus'),m=el.querySelector('.dock-menu');if(m)m.hidden=true;if(b)b.setAttribute('aria-expanded','false')}
function brancher(el){if(!el||typeof fetch!=='function')return Promise.resolve(null);
 if(!el._plus){el._plus=true;
  el.addEventListener('click',function(ev){
   /* l'ancien « Se déconnecter » (pages restées sur l'ancien menu) */
   var s=ev.target.closest('[data-sortir]');if(s){ev.preventDefault();ev.stopPropagation();fetch('/api/auth/sign-out',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'}).catch(function(){}).then(function(){location.href='/'});return}
   var g=ev.target.closest('[data-geste]');if(!g)return;var id=g.getAttribute('data-geste');
   if(id==='creerProjet'&&champ()){ev.preventDefault();ev.stopPropagation();fermerMenu(el);commencer();return}
   if(id==='invitationRecue'){ev.preventDefault();ev.stopPropagation();var f=el.querySelector('[data-invitation]');if(!f)return;f.hidden=!f.hidden;g.setAttribute('aria-expanded',f.hidden?'false':'true');if(!f.hidden){var i=f.querySelector('input');if(i)i.focus()}return}
  },true);
  el.addEventListener('submit',function(ev){var f=ev.target.closest('[data-invitation]');if(!f)return;ev.preventDefault();
   var i=f.querySelector('input'),e=f.querySelector('.dock-inv-e'),j=jeton(i.value);
   if(!j){e.textContent='Ce lien ne ressemble pas à une invitation AIME. Copiez-le en entier depuis l\'e-mail ou le message reçu.';i.focus();return}
   e.textContent='';location.href='/projets/?invitation='+encodeURIComponent(j)});
 }
 return fetch('/api/identite',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():{connecte:false}}).catch(function(){return{connecte:false}}).then(function(info){
  var e=etat(info);
  /* connecté : le Dock devient symétrique, avec une vraie destination de chaque côté du + */
  if(e.mode==='connecte'&&root.AIMEDock&&root.AIMEDockVue){var o=el._dockOpts||{mode:'page',id:'dock-site'},actif=/^\/projets/.test(location.pathname)?'mesprojets':/^\/compte/.test(location.pathname)?'moncompte':o.actif;
   root.AIMEDockVue.poser(el,root.AIMEDock.composer({famille:e.famille}),Object.assign({},o,{actif:actif}))}
  var b=el.querySelector('.dock-plus');if(b)b.setAttribute('aria-label',e.mode==='connecte'?'Nouveau projet ou invitation reçue':'Créer un projet ou ouvrir une invitation');
  return e})}
var root=typeof self!=='undefined'?self:{};
/* arrivée par « ?commencer=1 » : « Je suis… » */
if(typeof window!=='undefined'&&typeof location!=='undefined'&&/[?&]commencer=1\b/.test(location.search))window.addEventListener('load',function(){commencer()});
return{etat:etat,jeton:jeton,brancher:brancher,commencer:commencer,COMMENCER:COMMENCER};
});
