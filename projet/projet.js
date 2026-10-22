/* AIME · /projet/?id=… : la carte projet ouverte en mini-site privé.
   Le projet est lu sur cet appareil (IndexedDB « aime-point-zero », là où le Point Zéro l'enregistre), traduit en site par
   pointzero/minisite.js, rendu par le moteur de pages (vitrine/rendu.js), enregistré dans « aime-sites » pour que le
   générateur existant (/sites/) en modifie la disposition. Revenir au Point Zéro ne touche jamais au projet. */
(function(){'use strict';
var S=window.AIMESite,B=window.AIMEBroderie,M=window.AIMEModes,MS=window.AIMEMiniSite,CLE='aime-sites';
var $=function(i){return document.getElementById(i)};
var q=new URLSearchParams(location.search),id=String(q.get('id')||'').replace(/[^a-z0-9-]/gi,'').slice(0,60),de=q.get('de');
var ORIGINES={'/point-zero/':'Retour au Point Zéro','/bureau/':'Retour au Bureau'};if(!ORIGINES[de])de='/point-zero/';
$('retour').href=de+(id?'?projet='+encodeURIComponent(id):'');$('retour').textContent='← '+ORIGINES[de];
function dire(t,ko){var e=$('etat');e.textContent=t;e.hidden=!t;e.classList.toggle('ko',!!ko)}

/* le patron de broderie (adaptateur broderie du Canevas) : patron, grille, couleurs, sans ressaisie */
$('canevas').href='/canevas/?projet='+encodeURIComponent(id)+'&de=/projet/';

function base(){return new Promise(function(ok,ko){if(!window.indexedDB)return ko(new Error('Ce navigateur ne garde pas les projets.'));var r=indexedDB.open('aime-point-zero',2);
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('fichiers'))db.createObjectStore('fichiers',{keyPath:'id'});if(!db.objectStoreNames.contains('projets'))db.createObjectStore('projets',{keyPath:'id'})};
 r.onsuccess=function(){ok(r.result)};r.onerror=function(){ko(r.error)}})}
function projet(){return base().then(function(db){return new Promise(function(ok,ko){var t=db.transaction('projets','readonly'),g=t.objectStore('projets').get(id);g.onsuccess=function(){ok(g.result||null)};g.onerror=function(){ko(g.error)}})})}
function lireSites(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.sites)return o}catch(e){}return{sites:{},cur:null}}
function ecrireSites(o){try{localStorage.setItem(CLE,JSON.stringify(o));return true}catch(e){return false}}
function enDataURL(blob){return new Promise(function(ok){if(!blob)return ok(null);var f=new FileReader();f.onload=function(){ok(/^data:image\/(png|jpe?g|webp);base64,/.test(f.result)?f.result:null)};f.onerror=function(){ok(null)};f.readAsDataURL(blob)})}
/* le motif redessiné net à partir des cases du patron (une case = un point de fil) ; sinon l'aperçu du Point Zéro */
function motif(p){if(!p.cases||!p.dims||!p.palette)return p.apercu||null;var l=p.dims.l,h=p.dims.h,k=Math.max(1,Math.floor(960/Math.max(l,h))),c=document.createElement('canvas');c.width=l*k;c.height=h*k;
 var g=c.getContext('2d');g.fillStyle='#F5F3EE';g.fillRect(0,0,c.width,c.height);for(var i=0;i<p.cases.length;i++){var v=p.cases[i];if(!v||!p.palette[v-1])continue;g.fillStyle=p.palette[v-1].hex;g.fillRect((i%l)*k,Math.floor(i/l)*k,k,k)}
 try{return c.toDataURL('image/png')}catch(e){return p.apercu||null}}

var PRES=null;
function presentation(){if(PRES)return Promise.resolve(PRES);return fetch('/vitrine/presentation/studio.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(j){PRES=j;return j})}

function ouvrir(){if(!id){dire('Aucun projet indiqué. Ouvrez un projet depuis ses cartes, dans le Point Zéro ou le Bureau.',true);return}
 Promise.all([projet(),presentation()]).then(function(r){var p=r[0];if(!p){dire('Ce projet n\'est pas sur cet appareil. Il a peut-être été retiré, ou créé dans un autre navigateur.',true);return}
  document.title=(p.titre||'Projet')+' · AIME';$('titre').textContent=p.titre||'Projet';$('statut').textContent='Broderie · '+B.statut(p)+' · mini-site privé';
  return enDataURL(p.image).then(function(photo){var etat=lireSites(),sid=MS.siteId(p),site=MS.depuis(p,{S:S,B:B,M:M,ancien:etat.sites[sid],photo:photo,motif:motif(p)});
   etat.sites[sid]=site;if(!etat.cur)etat.cur=sid;var garde=ecrireSites(etat);
   /* le même mini-site, ses vrais blocs et ses données, s'édite dans le Canevas (adaptateur aime-site) ; le retour ramène au projet */
   var d=$('disposer'),cv='/canevas/?site='+encodeURIComponent(sid)+'&projet='+encodeURIComponent(id)+'&de='+encodeURIComponent(de);d.href=cv;d.hidden=!garde;
   if(garde&&q.get('canevas')==='1'){location.replace(cv);return}
   if(!garde)dire('Ce navigateur est plein : le mini-site s\'affiche, mais sa disposition ne pourra pas être modifiée.',true);else dire('');
   afficher(site)})}).catch(function(e){dire((e&&e.message)||'Impossible d\'ouvrir le projet.',true)})}

function afficher(site){var f=$('site'),doc=S.document(site,{presentation:PRES,medias:'/sites/bibliotheque/'});
 /* le cadre garde la hauteur de l'écran et défile à l'intérieur : la page rendue utilise des unités d'écran (vh), qu'on ne doit pas faire grandir */
 f.onload=function(){try{var d=f.contentDocument;d.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a&&!/^#/.test(a.getAttribute('href'))){e.preventDefault()}})}catch(e){}};
 f.srcdoc=doc.html;$('cadre').hidden=false;$('note').hidden=false}

ouvrir();
/* au retour du générateur (bouton Précédent), on relit la disposition et le projet */
addEventListener('pageshow',function(e){if(e.persisted)ouvrir()});
})();
