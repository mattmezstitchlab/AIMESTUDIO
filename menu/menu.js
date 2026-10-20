/* AIME · menu « Explorer » de la grande landing.
   Un seul fichier, branché par une ligne dans index.html : il ajoute un bouton dans l'en-tête existant (header.top nav)
   et un panneau classé par catégorie. Il ne modifie rien d'autre de la page. La liste vit ici, une seule fois. */
(function(){'use strict';
var CATS=[
 {t:'Le monde AIME',d:'La causalité, l\'orbe, tout ce qui relie.',l:[
  ['Page Zéro','/','Tout commence par une intention','Nouveau'],
  ['AIME Studio','/aime/','La grande landing'],
  ['Tout voir','/tout/','Toutes les vues d\'un coup'],
  ['AIME ORB','/lab/orb/','L\'orbe, en laboratoire']]},
 {t:'Événements',d:'Une information écrite une fois, vue par chacun.',l:[
  ['AIME WORLD','/vitrine/world/','Paris · New York, six perspectives'],
  ['SynchroView','/synchroview/','Comparer les perspectives côte à côte'],
  ['Mariage Léa & Marc','/vitrine/site/?u=mariage','Démonstrateur, données fictives'],
  ['Séminaire Maison Orée','/vitrine/site/?u=seminaire','Démonstrateur, entreprise fictive']]},
 {t:'Institutions',d:'Comprendre avant d\'agir.',l:[
  ['G44 LAB','/g44/','Le laboratoire des dépendances administratives','Nouveau']]},
 {t:'Création',d:'Un contenu, tous vos supports.',l:[
  ['Le Studio','/studio/','Le studio complet'],
  ['AIME Stitch','/stitch/','Patrons de point de croix vivants','Nouveau'],
  ['Atelier Broderie','/stitchlab/','Le studio, côté broderie'],
  ['Atelier Web','/web/','Le studio, côté web'],
  ['Atelier Bureau','/buro/','Le studio, côté documents'],
  ['Atelier Accessibilité','/accessibilite/','Le studio, côté accessibilité']]},
 {t:'Jeux',d:'Des règles simples, une grille sans fin.',l:[
  ['AIME INFINITY','/infinity/','Le jeu de l\'onde','Nouveau']]}];
var nav=document.querySelector('header.top nav');if(!nav)return;
var css=document.createElement('style');css.textContent=
'.amx-b{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line,#2B2B33);border-radius:10px;padding:8px 12px;background:rgba(10,10,12,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:var(--ink,#EDEDF0);font:600 14px var(--ui,Inter,-apple-system,sans-serif);cursor:pointer}'+
'.amx-b i{width:8px;height:8px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .25s}'+
'.amx-b[aria-expanded=true] i{transform:translateY(2px) rotate(-135deg)}'+
'.amx-b:focus-visible,.amx a:focus-visible,.amx-x:focus-visible{outline:2px solid #7C5CFF;outline-offset:2px}'+
'.amx{position:fixed;z-index:96;top:calc(64px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));width:min(1080px,calc(100vw - 32px));max-height:calc(100dvh - 88px - env(safe-area-inset-top,0px));overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:22px;background:rgba(14,13,22,.94);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);box-shadow:0 30px 80px rgba(0,0,0,.5);color:var(--ink,#EDEDF0);font-family:var(--ui,Inter,-apple-system,sans-serif);padding:26px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:26px;opacity:0;transform:translateY(-8px);transition:opacity .2s,transform .2s}'+
'.amx.on{opacity:1;transform:none}'+
'.amx section{min-width:0}.amx h2{margin:0 0 4px;font:600 12px var(--ui,Inter,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--soft,#9C9CA8)}'+
'.amx section>p{margin:0 0 14px;font-size:13px;line-height:1.4;color:var(--soft,#9C9CA8)}'+
'.amx ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}'+
'.amx a{display:block;border-radius:12px;padding:10px 12px;margin:0 -12px;color:var(--ink,#EDEDF0);text-decoration:none;transition:background .15s}'+
'.amx a:hover{background:rgba(255,255,255,.06)}.amx a b{display:flex;align-items:center;gap:8px;font:600 15px var(--ui,Inter,sans-serif)}'+
'.amx a span{display:block;margin-top:2px;font-size:12.5px;line-height:1.35;color:var(--soft,#9C9CA8)}'+
'.amx a em{font-style:normal;font:600 10px var(--ui,Inter,sans-serif);letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:var(--conic,linear-gradient(90deg,#FB7185,#7C5CFF));color:#0A0A0C}'+
'.amx a[aria-current=page]{background:rgba(255,255,255,.05)}'+
'.amx-x{display:none}'+
'@media (max-width:980px){.amx{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
'@media (max-width:560px){.amx{left:0;right:0;top:0;width:auto;max-height:none;height:100dvh;border-radius:0;grid-template-columns:1fr;gap:22px;padding:calc(64px + env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) calc(28px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px))}'+
' .amx-x{display:block;position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));border:1px solid rgba(255,255,255,.12);border-radius:10px;background:transparent;color:inherit;font:600 14px var(--ui,Inter,sans-serif);padding:8px 12px;cursor:pointer}}'+
'@media (prefers-reduced-motion:reduce){.amx,.amx-b i{transition:none}}';
document.head.appendChild(css);
var b=document.createElement('button');b.type='button';b.className='amx-b';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','amx');b.innerHTML='Explorer<i aria-hidden="true"></i>';nav.insertBefore(b,nav.firstChild);
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var ici=location.pathname.replace(/index\.html$/,'');
var p=document.createElement('div');p.id='amx';p.className='amx';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-label','Explorer AIME');
p.innerHTML='<button type="button" class="amx-x">Fermer</button>'+CATS.map(function(c){return'<section><h2>'+esc(c.t)+'</h2><p>'+esc(c.d)+'</p><ul>'+c.l.map(function(x){var cur=x[1].split('?')[0]===ici&&x[1].indexOf('?')<0;return'<li><a href="'+esc(x[1])+'"'+(cur?' aria-current="page"':'')+'><b>'+esc(x[0])+(x[3]?' <em>'+esc(x[3])+'</em>':'')+'</b><span>'+esc(x[2])+'</span></a></li>'}).join('')+'</ul></section>'}).join('');
document.body.appendChild(p);
function ouvrir(){p.hidden=false;b.setAttribute('aria-expanded','true');requestAnimationFrame(function(){p.classList.add('on')});var a=p.querySelector('a');a&&a.focus({preventScroll:true})}
function fermer(rendre){if(p.hidden)return;p.classList.remove('on');b.setAttribute('aria-expanded','false');setTimeout(function(){if(b.getAttribute('aria-expanded')==='false')p.hidden=true},200);if(rendre)b.focus()}
b.addEventListener('click',function(e){e.stopPropagation();if(p.hidden)ouvrir();else fermer()});
p.querySelector('.amx-x').addEventListener('click',function(){fermer(true)});
document.addEventListener('click',function(e){if(!p.hidden&&!p.contains(e.target)&&e.target!==b)fermer()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden){fermer(true)}
 if(e.key==='Tab'&&!p.hidden){var f=p.querySelectorAll('a,button'),vis=[].filter.call(f,function(x){return x.offsetParent!==null});if(!vis.length)return;var a=vis[0],z=vis[vis.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
window.AIMEMenu={categories:CATS,ouvrir:ouvrir,fermer:fermer};
})();
