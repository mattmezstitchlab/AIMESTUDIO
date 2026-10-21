/* AIME · Le Monde AIME : la Carte rejoint une facette du cube existant (celui du titre « Le m◻nde »).
   Le cube n'est pas reconstruit : la première face (« vous ») reçoit la Carte, dessinée par le même rendu, depuis la même
   source (localStorage « aime-carte »). Rien n'est recopié dans la mémoire de la landing.
   Facette personnelle : vue par la personne dans son navigateur. Un cube vu par d'autres n'afficherait que la vue publique.
   À l'arrivée depuis la Page Zéro : la Carte descend dans la facette, le cube la présente, puis l'orbe reprend la
   conversation sans rien redemander (AIMEGuide.suite). */
(function(){'use strict';
var K=window.AIMECarte,G=window.AIMEGuide,R=window.AIMECarteRendu;if(!K||!G||!R)return;
var CLE='aime-carte',RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
var carte=(function(){try{return K.migrer(JSON.parse(localStorage.getItem(CLE)||'null'))}catch(e){return null}})();if(!carte)return;
var cube=document.getElementById('hcube'),hc3=document.getElementById('hc3');if(!cube||!hc3)return;
var X={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return X[c]})};
function sauver(c){carte=c;try{localStorage.setItem(CLE,JSON.stringify(c))}catch(e){}poser()}
/* la vue de la facette : complète pour la personne elle-même, publique pour tout autre regard */
function vueFacette(c,proprietaire){return proprietaire?c:(K.vuePublique(c)||{})}
var css=document.createElement('style');css.textContent=
 '.hf-carte{position:absolute;inset:0;border-radius:inherit;overflow:hidden;opacity:0;transition:opacity .8s;pointer-events:none}.hf-carte svg{display:block;width:100%;height:100%}'+
 '.hf.carte-on .hf-carte{opacity:1}.hf.carte-on>svg{opacity:0}'+
 '.hc3.presente{animation:none!important;transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}'+
 '.mc-vol{position:fixed;z-index:120;left:0;top:0;border-radius:24px;overflow:hidden;pointer-events:none;box-shadow:0 20px 70px rgba(124,92,255,.45)}.mc-vol svg{display:block;width:100%;height:100%}'+
 '.mc-orbe{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:94;width:min(380px,calc(100vw - 32px));padding:1.5px;border-radius:22px;background:linear-gradient(135deg,#FB7185,#F59E0B,#7C5CFF,#22D3EE);box-shadow:0 24px 80px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .5s,transform .5s;font:15px/1.45 "Inter Variable",Inter,-apple-system,sans-serif;color:#EDEDF0}.mc-orbe.on{opacity:1;transform:none}'+
 '.mc-orbe>div{background:rgba(12,12,16,.97);border-radius:20.5px;padding:16px 18px}.mc-orbe small{display:flex;align-items:center;gap:8px;font:600 10.5px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#9C9CA8}.mc-orbe small i{width:12px;height:12px;border-radius:50%;background:conic-gradient(#FB7185,#F59E0B,#7C5CFF,#22D3EE,#FB7185)}'+
 '.mc-orbe h3{margin:8px 0 6px;font:400 22px/1.15 "Cal Sans","Inter Variable",sans-serif}.mc-orbe p{margin:0 0 10px;color:#C9C9D2}.mc-orbe .ch{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}'+
 '.mc-orbe button{font:600 13px "Inter Variable",Inter,sans-serif;border:1px solid #2B2B33;background:#1B1B22;color:#EDEDF0;border-radius:999px;padding:8px 13px;cursor:pointer}.mc-orbe button.p{background:#EDEDF0;color:#0A0A0C;border-color:#EDEDF0}'+
 '.mc-orbe input{width:100%;border:1px solid #2B2B33;background:#0F0F14;color:#EDEDF0;border-radius:10px;padding:9px 11px;font:14px "Inter Variable",Inter,sans-serif;margin:4px 0 8px}.mc-orbe .bas{display:flex;justify-content:space-between;gap:8px;margin-top:8px}.mc-orbe .bas button{border:0;background:none;color:#9C9CA8;padding:6px 2px}.mc-orbe a{color:#C4B5FD}';
document.head.appendChild(css);
var face=hc3.querySelector('.hf');
function poser(){if(!face)return;var k=face.querySelector('.hf-carte');if(!k){k=document.createElement('span');k.className='hf-carte';face.appendChild(k)}k.innerHTML=R.svg(vueFacette(carte,true),{id:'fc',mode:'mini'});face.classList.add('carte-on');face.setAttribute('data-carte',carte.id)}
/* le cube présente la facette : depuis son angle actuel, sans saut */
function presenter(ms){var m=getComputedStyle(hc3).transform;hc3.style.transform=m==='none'?'':m;hc3.classList.add('presente');void hc3.offsetWidth;hc3.style.transform='rotateX(-14deg) rotateY(-12deg)';
 setTimeout(function(){hc3.classList.remove('presente');hc3.style.transform=''},ms||4200)}
function arrivee(){var a=null;try{a=JSON.parse(sessionStorage.getItem('aime-carte-arrivee')||'null');sessionStorage.removeItem('aime-carte-arrivee')}catch(e){}return a&&a.id===carte.id&&Date.now()-a.t<120000}
var arrive=arrivee();
if(!arrive){poser();return}
/* l'arrivée : la Carte, petite, en haut de l'écran (là où la Page Zéro l'a laissée), descend dans la facette */
function voler(){var r=cube.getBoundingClientRect(),w=Math.min(innerWidth*.7,360)*.22,v=document.createElement('div');v.className='mc-vol';v.innerHTML=R.svg(carte,{id:'mv'});document.body.appendChild(v);
 var x0=innerWidth/2-w/2,y0=innerHeight/2-innerHeight*.3-w/2,s=r.width||60;v.style.width=v.style.height=w+'px';
 v.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(1)',opacity:1},{transform:'translate('+x0+'px,'+y0+'px) scale(1.15)',opacity:1,offset:.25},{transform:'translate('+(r.left+r.width/2-w/2)+'px,'+(r.top+r.height/2-w/2)+'px) scale('+(s/w)+')',opacity:.2}],{duration:1500,easing:'cubic-bezier(.6,0,.2,1)',fill:'forwards'}).onfinish=function(){v.remove();poser();presenter();bienvenue(900)}}
if(RM){poser();presenter(2500);bienvenue(300)}else setTimeout(voler,450);

/* l'orbe reprend la conversation : seulement ce qui n'est pas encore su */
var B=null;
function panneau(){if(B)return B;B=document.createElement('div');B.className='mc-orbe';B.setAttribute('role','dialog');B.setAttribute('aria-label','L\'orbe AIME');document.body.appendChild(B);requestAnimationFrame(function(){B.classList.add('on')});return B}
function fermer(){if(!B)return;B.classList.remove('on');var b=B;B=null;setTimeout(function(){b.remove()},500)}
function bienvenue(d){setTimeout(function(){var p=panneau();p.innerHTML='<div><small><i></i>L\'orbe</small><h3>Bienvenue dans Le Monde AIME.</h3><p>Ta Carte'+(carte.nom?', '+esc(carte.nom)+',':'')+' est sur la première face du cube. Souhaites-tu continuer à construire ton parcours ?</p><div class="ch"><button type="button" class="p" data-oui>Continuer</button><button type="button" data-non>Explorer librement</button></div></div>';
 p.onclick=function(e){var b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-oui'))question();else fermer()}},d)}
function question(){var q=G.suite(carte),p=panneau();
 if(!q){p.innerHTML='<div><small><i></i>L\'orbe</small><h3>C\'est noté.</h3><p>Ta Carte s\'enrichira à chaque pas, et la facette du cube avec elle. Tout reste dans ce navigateur tant que tu n\'as pas de compte.</p><div class="ch"><button type="button" class="p" data-fin>Explorer</button></div></div>';p.onclick=function(e){if(e.target.closest('[data-fin]'))fermer()};return}
 p.innerHTML='<div><small><i></i>L\'orbe</small><h3>'+esc(q.q)+'</h3>'+(q.choix?'<div class="ch">'+q.choix.map(function(c){return'<button type="button" data-c="'+esc(c)+'">'+esc(c)+'</button>'}).join('')+'</div>':'')+(q.libre?'<input type="text" aria-label="Réponse" placeholder="'+esc(q.libre)+'">':'')+
  (q.id==='partage'?'<p style="font-size:13px">Pour choisir rubrique par rubrique : <a href="/#carte">ma Carte, sur la Page Zéro</a>.</p>':'')+'<div class="bas"><button type="button" data-passer>Passer</button><button type="button" data-quitter>Quitter</button>'+(q.libre?'<button type="button" class="p" data-ok>Valider</button>':'')+'</div></div>';
 var inp=p.querySelector('input');if(inp){inp.focus({preventScroll:true});inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&inp.value.trim()){sauver(G.repondreSuite(carte,q.id,inp.value.trim(),new Date().toISOString().slice(0,10)));question()}})}
 p.onclick=function(e){var b=e.target.closest('button');if(!b)return;var d=new Date().toISOString().slice(0,10);
  if(b.dataset.c!=null){sauver(G.repondreSuite(carte,q.id,b.dataset.c,d));question()}
  else if(b.hasAttribute('data-ok')&&inp&&inp.value.trim()){sauver(G.repondreSuite(carte,q.id,inp.value.trim(),d));question()}
  else if(b.hasAttribute('data-passer')){sauver(G.repondreSuite(carte,q.id,'',d));question()}
  else if(b.hasAttribute('data-quitter'))fermer()}}
window.AIMEFacette={carte:function(){return carte},presenter:presenter,vueFacette:vueFacette};
})();
