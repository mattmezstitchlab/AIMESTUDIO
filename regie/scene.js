/* AIME · RÉGIE · la scène. Chargée par les pages du site, elle applique la configuration de la régie :
   - les appareils (iPhone, iPad, MacBook) posés sur la page, avec dans leur écran une image, une vidéo, une page du
     site ou une adresse https ;
   - les textes remplacés (texte seul, jamais de HTML) ;
   - l'orbe du site : absente, bouton d'orbe avec ses suggestions, compagnon, ou les deux.
   Ce que voit un visiteur : regie/site.json, la version publiée. Ce que voit l'auteur dans SON navigateur quand il a
   activé « Aperçu de mes réglages » dans la régie : son brouillon (localStorage), médias importés compris.
   Dans la régie, la page est ouverte dans un cadre avec ?regie=edition : les appareils se déplacent et se
   redimensionnent à la main, un clic sur un texte le choisit. Les échanges passent par postMessage, même origine
   seulement. ?regie=aucune désactive tout (utilisé pour une page affichée DANS un appareil). */
(function(){'use strict';
if(window.AIMERegieScene)return;
var Q=location.search,AUCUNE=/[?&]regie=aucune\b/.test(Q);
var EDITION=!AUCUNE&&/[?&]regie=edition\b/.test(Q)&&window.parent!==window&&(function(){try{return parent.location.origin===location.origin}catch(e){return false}})();
var APERCU=EDITION||(function(){try{return localStorage.getItem('aime-regie-apercu')==='1'}catch(e){return false}})();
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var finTextes,API={actif:!AUCUNE,edition:EDITION,apercu:APERCU,textes:new Promise(function(ok){finTextes=ok})};
window.AIMERegieScene=API;
if(AUCUNE){finTextes();return}
/* les textes ne retiennent jamais la page plus d'une seconde et demie */
setTimeout(function(){finTextes()},1500);

function charger(src,present){return new Promise(function(ok){if(present())return ok();var s=document.createElement('script');s.src=src;s.onload=function(){ok()};s.onerror=function(){ok()};(document.head||document.documentElement).appendChild(s)})}
function q(sel){try{return document.querySelector(sel)}catch(e){return null}}
function attendre(sel,cb){var el=q(sel);if(el)return cb(el);var t0=Date.now(),mo=new MutationObserver(function(){var e=q(sel);if(e){mo.disconnect();cb(e)}else if(Date.now()-t0>15000)mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}
function quand(f){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f()}

var R=null,cfg=null,cle=null,siteId=null,montes=[],touches=new Map(),blobs={};

/* ---------- les appareils : dessinés en CSS, une seule feuille pour tout le site ---------- */
function feuille(){if(document.getElementById('rg-css'))return;var s=document.createElement('style');s.id='rg-css';s.textContent=
'.rg-app{position:absolute;left:calc(var(--rg-x)*1%);top:calc(var(--rg-y)*1%);width:calc(var(--rg-l)*1%);display:block;transform:rotate(var(--rg-rot));transform-origin:50% 50%;text-decoration:none;color:inherit;transition:transform .45s cubic-bezier(.2,.7,.2,1)}'+
'a.rg-app:hover{transform:rotate(var(--rg-rot)) translateY(-5px)}'+
'.rg-app *{box-sizing:border-box}.rg-cadre,.rg-ecran,.rg-socle{display:block}'+
'.rg-ecran{position:relative;overflow:hidden;background:#0B0B0E;aspect-ratio:var(--rg-ratio)}'+
'.rg-ecran img,.rg-ecran video{display:block;width:100%;height:100%;object-fit:var(--rg-fit,cover)}'+
'.rg-ecran iframe{position:absolute;left:0;top:0;border:0;transform-origin:0 0;background:#fff;pointer-events:none}'+
'.rg-ecran .rg-vide{position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 20%,rgba(124,92,255,.35),transparent 60%),radial-gradient(90% 70% at 80% 90%,rgba(34,211,238,.22),transparent 60%),#0E0E13}'+
'.rg-ecran .rg-repli{position:absolute;inset:0;display:grid;place-items:center;padding:12%;text-align:center;font:500 12px/1.4 Inter,system-ui,sans-serif;color:#9C9CA8;background:#111116}'+
/* iPhone */
'.rg-iphone .rg-cadre{border-radius:14%/6.6%;padding:3.2%;background:linear-gradient(145deg,#4A4A52,#1E1E23 40%,#2C2C33);box-shadow:0 0 0 1px #0A0A0C,0 30px 60px -22px rgba(0,0,0,.75),inset 0 0 0 1px rgba(255,255,255,.07)}'+
'.rg-iphone .rg-ecran{border-radius:11.5%/5.4%}'+
'.rg-iphone .rg-ecran::after{content:"";position:absolute;left:50%;top:2.1%;width:31%;height:3.4%;transform:translateX(-50%);border-radius:999px;background:#000;z-index:2}'+
'.rg-iphone.rg-paysage .rg-cadre{border-radius:6.6%/14%}.rg-iphone.rg-paysage .rg-ecran{border-radius:5.4%/11.5%}.rg-iphone.rg-paysage .rg-ecran::after{left:2.1%;top:50%;width:3.4%;height:31%;transform:translateY(-50%)}'+
/* iPad */
'.rg-ipad .rg-cadre{border-radius:6%/4.2%;padding:3.4%;background:linear-gradient(150deg,#3E3E46,#1B1B20 45%,#2A2A31);box-shadow:0 0 0 1px #0A0A0C,0 34px 70px -26px rgba(0,0,0,.75),inset 0 0 0 1px rgba(255,255,255,.07)}'+
'.rg-ipad .rg-ecran{border-radius:2.6%/1.8%}.rg-ipad .rg-cadre{position:relative}.rg-ipad .rg-cadre::before{content:"";position:absolute;left:50%;top:1.4%;width:1.2%;aspect-ratio:1;border-radius:50%;background:#0D0D10;transform:translateX(-50%)}'+
'.rg-ipad.rg-paysage .rg-cadre{border-radius:4.2%/6%}.rg-ipad.rg-paysage .rg-ecran{border-radius:1.8%/2.6%}.rg-ipad.rg-paysage .rg-cadre::before{left:1.4%;top:50%;width:auto;height:1.2%;transform:translateY(-50%)}'+
/* MacBook */
'.rg-macbook .rg-cadre{position:relative;border-radius:2.4% 2.4% 0 0/3.8% 3.8% 0 0;background:#0C0C0E;padding:1.6% 1.6% 2.4%;box-shadow:0 0 0 1px #2B2B33,inset 0 0 0 1px #1A1A1F,0 40px 80px -30px rgba(0,0,0,.8)}'+
'.rg-macbook .rg-cadre::before{content:"";position:absolute;left:50%;top:.55%;width:.5%;aspect-ratio:1;border-radius:50%;background:#26262C;transform:translateX(-50%)}'+
'.rg-macbook .rg-ecran{border-radius:.4%}'+
'.rg-macbook .rg-socle{position:relative;height:0;padding-bottom:2.2%;margin:0 -7%;border-radius:0 0 1.6% 1.6%/0 0 60% 60%;background:linear-gradient(#3A3A42,#1C1C21 55%,#0E0E11);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 22px 40px -18px rgba(0,0,0,.9)}'+
'.rg-macbook .rg-socle::before{content:"";position:absolute;left:42%;right:42%;top:0;height:40%;border-radius:0 0 8px 8px;background:#121216}'+
'@media (max-width:900px){.rg-m-masque{display:none!important}}@media (max-width:640px){.rg-app{width:min(92%,calc(var(--rg-l)*1.6%))}.rg-m-pile{position:relative;left:auto;top:auto;width:min(72%,340px);margin:28px auto;transform:none}}'+
'@media (prefers-reduced-motion:reduce){.rg-app{transition:none}a.rg-app:hover{transform:rotate(var(--rg-rot))}}'+
'@media (forced-colors:active){.rg-cadre{border:1px solid CanvasText}}'+
/* le bouton d'orbe et ses suggestions */
'.rg-orbe{position:fixed;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147482000;font:14px/1.45 "Inter Variable",Inter,-apple-system,"Segoe UI",sans-serif}'+
'.rg-orbe.droite{right:calc(18px + env(safe-area-inset-right,0px))}.rg-orbe.gauche{left:calc(18px + env(safe-area-inset-left,0px))}'+
'.rg-orbe>button{display:block;width:var(--rg-t);height:var(--rg-t);border-radius:50%;border:0;padding:0;cursor:pointer;background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.55),rgba(255,255,255,.08) 28%,transparent 46%),conic-gradient(from 200deg,#22D3EE,#7C5CFF,#FB7185,#F59E0B,#22D3EE);box-shadow:0 10px 30px -8px rgba(124,92,255,.7),0 0 0 1px rgba(255,255,255,.15) inset;transition:transform .2s}'+
'.rg-orbe>button:hover{transform:scale(1.06)}.rg-orbe>button:focus-visible{outline:2px solid #7C5CFF;outline-offset:4px}'+
'.rg-orbe .rg-pan{position:absolute;bottom:calc(var(--rg-t) + 12px);width:min(300px,calc(100vw - 36px));padding:1.5px;border-radius:18px;background:linear-gradient(135deg,#FB7185,#F59E0B,#7C5CFF,#22D3EE)}'+
'.rg-orbe.droite .rg-pan{right:0}.rg-orbe.gauche .rg-pan{left:0}'+
'.rg-orbe .rg-pan>div{background:rgba(14,13,20,.97);color:#EDEDF0;border-radius:16.5px;padding:14px;display:grid;gap:10px}'+
'.rg-orbe .rg-pan p{margin:0;color:#C9C9D2}.rg-orbe .rg-pan nav{display:grid;gap:6px}'+
'.rg-orbe .rg-s{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px;align-items:center}.rg-orbe .rg-q{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:none;color:#C9C9D2;cursor:pointer;font:600 12px Inter,system-ui,sans-serif}.rg-orbe .rg-q[aria-expanded=true]{background:#EDEDF0;color:#0E0D14}.rg-orbe .rg-pq{grid-column:1/-1;margin:0 4px 4px;font-size:12.5px;color:#A1A1AC}'+
'.rg-orbe .rg-pz{font-size:12.5px;color:#A1A1AC}.rg-orbe .rg-pz summary{cursor:pointer}.rg-orbe .rg-pz p{margin:6px 0}.rg-orbe .rg-taire{border:0;background:none;color:#C4B5FD;text-decoration:underline;cursor:pointer;padding:0;font:inherit}'+
'.rg-orbe [hidden]{display:none!important}.rg-orbe .rg-bulle{position:absolute;bottom:calc(var(--rg-t) + 10px);display:flex;align-items:center;gap:8px;white-space:nowrap;padding:8px 10px 8px 14px;border-radius:999px;background:rgba(14,13,20,.97);color:#EDEDF0;box-shadow:0 10px 30px -8px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.12);font:500 13px Inter,system-ui,sans-serif}.rg-orbe.droite .rg-bulle{right:0}.rg-orbe.gauche .rg-bulle{left:0}.rg-orbe .rg-bulle button{border:0;border-radius:999px;padding:5px 10px;cursor:pointer;font:600 12px Inter,system-ui,sans-serif;background:rgba(255,255,255,.1);color:#EDEDF0}.rg-orbe .rg-bulle button:first-of-type{background:#EDEDF0;color:#0E0D14}'+
'.rg-orbe .rg-pan a{display:block;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);color:#EDEDF0;text-decoration:none;font-weight:500}.rg-orbe .rg-pan a:hover,.rg-orbe .rg-pan a:focus-visible{background:rgba(255,255,255,.12)}'+
/* l'édition, dans la régie seulement */
'html.rg-edition .rg-app{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}html.rg-edition .rg-app.rg-tient{cursor:grabbing;transition:none}'+
'html.rg-edition .rg-app.rg-choisi{outline:2px dashed #7C5CFF;outline-offset:6px}'+
'html.rg-edition .rg-poignee{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:#7C5CFF;box-shadow:0 0 0 3px #fff;cursor:nwse-resize;display:none}html.rg-edition .rg-app.rg-choisi .rg-poignee{display:block}'+
'html.rg-texte [data-rg-cible]{outline:2px solid #22D3EE!important;outline-offset:3px;cursor:text!important}';
(document.head||document.documentElement).appendChild(s)}

/* ---------- les médias importés : depuis IndexedDB dans l'aperçu de l'auteur, sinon depuis regie/medias/ ---------- */
function mediaLocal(id){if(blobs[id])return Promise.resolve(blobs[id]);return new Promise(function(ok){try{var rq=indexedDB.open('aime-regie',1);rq.onupgradeneeded=function(){rq.result.createObjectStore('medias')};
 rq.onsuccess=function(){try{var g=rq.result.transaction('medias').objectStore('medias').get(id);g.onsuccess=function(){var v=g.result;if(v&&v.blob){blobs[id]=URL.createObjectURL(v.blob);ok(blobs[id])}else ok(null)};g.onerror=function(){ok(null)}}catch(e){ok(null)}};rq.onerror=function(){ok(null)}}catch(e){ok(null)}})}
function source(src){var m=/^media:([a-z0-9-]+)$/.exec(src||'');if(m&&APERCU)return mediaLocal(m[1]).then(function(u){return u||R.resoudre(src,cfg)});return Promise.resolve(R.resoudre(src,cfg))}

function creer(a){var D=R.APPAREILS[a.type],w=a.paysage?D.ecran[1]:D.ecran[0],h=a.paysage?D.ecran[0]:D.ecran[1],lien=a.lien&&!EDITION;
 var el=document.createElement(lien?'a':'div');if(lien){el.href=a.lien;if(/^https:/.test(a.lien)){el.target='_blank';el.rel='noopener'}el.setAttribute('aria-label',a.alt||D.nom)}
 el.className='rg-app rg-'+a.type+(a.paysage?' rg-paysage':'')+' rg-m-'+a.mobile;el.setAttribute('data-rg-id',a.id);
 el.style.cssText='--rg-x:'+a.x+';--rg-y:'+a.y+';--rg-l:'+a.l+';--rg-rot:'+a.rot+'deg;--rg-ratio:'+w+'/'+h+';--rg-fit:'+a.contenu.ajustement+';z-index:'+a.z;
 var cadre=document.createElement('span'),ecran=document.createElement('span');cadre.className='rg-cadre';ecran.className='rg-ecran';cadre.appendChild(ecran);el.appendChild(cadre);
 if(a.type==='macbook'){var so=document.createElement('span');so.className='rg-socle';so.setAttribute('aria-hidden','true');el.appendChild(so)}
 if(EDITION){var p=document.createElement('span');p.className='rg-poignee';p.setAttribute('aria-hidden','true');el.appendChild(p)}
 var c=a.contenu;
 if(c.type==='vide'||!c.src){var v=document.createElement('span');v.className='rg-vide';ecran.appendChild(v);if(!lien)el.setAttribute('aria-hidden','true')}
 else if(c.type==='image'){var img=document.createElement('img');img.alt=a.alt||'';img.loading='lazy';img.decoding='async';source(c.src).then(function(u){if(u)img.src=u});ecran.appendChild(img)}
 else if(c.type==='video'){var vi=document.createElement('video');vi.muted=true;vi.loop=true;vi.playsInline=true;vi.setAttribute('playsinline','');vi.preload='metadata';if(a.alt)vi.setAttribute('aria-label',a.alt);
  if(RM)vi.controls=true;else vi.autoplay=true;source(c.src).then(function(u){if(u){vi.src=u;if(!RM){var pr=vi.play();pr&&pr.catch&&pr.catch(function(){})}}});ecran.appendChild(vi)}
 else{/* une page du site ou une adresse https, à la taille réelle de l'écran puis réduite */
  var re=document.createElement('span');re.className='rg-repli';re.textContent=c.type==='url'?'Si ce site refuse d\'être affiché dans un cadre, utilisez une capture.':'Chargement…';ecran.appendChild(re);
  var f=document.createElement('iframe');f.width=w;f.height=h;f.style.width=w+'px';f.style.height=h+'px';f.loading='lazy';f.tabIndex=-1;f.title=a.alt||'Aperçu dans un '+D.nom;f.setAttribute('aria-hidden','true');
  if(c.type==='url'){f.setAttribute('sandbox','allow-scripts allow-same-origin');f.referrerPolicy='no-referrer';f.src=c.src}else{f.src=c.src+(c.src.indexOf('?')<0?'?':'&')+'regie=aucune'}
  ecran.appendChild(f);var ech=function(){var k=ecran.clientWidth/w;if(k>0)f.style.transform='scale('+k+')'};ech();if(window.ResizeObserver)new ResizeObserver(ech).observe(ecran);else addEventListener('resize',ech)}
 return el}

function monterAppareils(liste){montes.forEach(function(e){e.remove()});montes=[];
 liste.forEach(function(a){attendre(a.ancre,function(anc){if(getComputedStyle(anc).position==='static')anc.style.position='relative';var el=creer(a);anc.appendChild(el);montes.push(el);if(EDITION)brancher(el,anc)})})}

/* ---------- les textes : on garde l'original, on remplace par du texte seul (les retours à la ligne deviennent <br>) ---------- */
function restaurer(){touches.forEach(function(avant,el){el.replaceChildren.apply(el,avant.map(function(n){return n.cloneNode(true)}))});touches.clear()}
function simple(el){return!el.querySelector('*:not(br)')}
function appliquerTextes(regles){restaurer();var n=regles.length,fait=0;if(!n)return finTextes();
 regles.forEach(function(r){attendre(r.sel,function(el){if(r.texte&&simple(el)){if(!touches.has(el))touches.set(el,[].map.call(el.childNodes,function(x){return x.cloneNode(true)}));
  el.replaceChildren();r.texte.split('\n').forEach(function(l,i){if(i)el.appendChild(document.createElement('br'));el.appendChild(document.createTextNode(l))})}
  if(++fait===n)finTextes()})})}

/* ---------- l'orbe du site ---------- */
var orbeEl=null,compagnonLance=false;
/* une pause = le visiteur a agi, puis plus rien pendant 8 s (pas pendant qu'il agit : Iqbal et Bailey, 2008) */
function pause(cb){var actif=false,t=0,fait=false;function bouge(){actif=true;clearTimeout(t);if(!fait)t=setTimeout(function(){if(actif&&!fait&&!document.hidden){fait=true;cb()}},8000)}['pointermove','keydown','scroll','touchstart'].forEach(function(ev){addEventListener(ev,bouge,{passive:true})})}
/* dans AIME OS, l'orbe est celle du système : la page ne pose pas la sienne */
var DANS_OS=window.parent!==window&&(function(){try{return!!parent.AIMEOS}catch(e){return false}})();
function monterOrbe(o){if(orbeEl){orbeEl.remove();orbeEl=null}if(DANS_OS)return;
 if(o.presence==='bouton'||o.presence==='les-deux'){var b=document.createElement('div');b.className='rg-orbe '+o.cote;b.style.setProperty('--rg-t',o.taille+'px');
  var pan=document.createElement('div'),inner=document.createElement('div'),idp='rg-pan-'+Math.random().toString(36).slice(2,7);pan.className='rg-pan';pan.id=idp;pan.hidden=true;pan.setAttribute('role','dialog');pan.setAttribute('aria-label','Suggestions');
  if(o.accueil){var p=document.createElement('p');p.textContent=o.accueil;inner.appendChild(p)}
  var nav=document.createElement('nav');nav.setAttribute('aria-label','Suggestions');o.suggestions.forEach(function(s,k){var li=document.createElement('div');li.className='rg-s';var a=document.createElement('a');a.href=s.cible;a.textContent=s.libelle;if(/^https:/.test(s.cible)){a.target='_blank';a.rel='noopener'}
   var q=document.createElement('button');q.type='button';q.className='rg-q';q.textContent='?';q.setAttribute('aria-label','Pourquoi : '+s.libelle);q.setAttribute('aria-expanded','false');var pq=document.createElement('p');pq.className='rg-pq';pq.hidden=true;pq.id=idp+'-q'+k;q.setAttribute('aria-controls',pq.id);
   pq.textContent=s.pourquoi||'Suggestion choisie par le propriétaire de ce site.';q.addEventListener('click',function(e){e.stopPropagation();pq.hidden=!pq.hidden;q.setAttribute('aria-expanded',String(!pq.hidden))});li.appendChild(a);li.appendChild(q);li.appendChild(pq);nav.appendChild(li)});inner.appendChild(nav);
  /* « Pourquoi ces suggestions ? » : la règle, dite simplement ; et le moyen de faire taire l'orbe ici */
  var pz=document.createElement('details'),pzs=document.createElement('summary'),pzp=document.createElement('p');pz.className='rg-pz';pzs.textContent='Pourquoi ces suggestions ?';pz.appendChild(pzs);pz.appendChild(pzp);pzp.textContent='Elles sont choisies par le propriétaire de ce site, dans sa Régie. Ce sont des règles écrites : aucune IA, et rien de ce que vous faites ici n\'est envoyé.';
  var taire=null,cleS='aime-orbe-silence:'+(siteId||cle);if(o.autonomie!=='discrete'){taire=document.createElement('button');taire.type='button';taire.className='rg-taire';taire.textContent='Ne plus me proposer d\'elle-même ici';taire.addEventListener('click',function(){try{localStorage.setItem(cleS,'1')}catch(e){}taire.textContent='C\'est noté : elle attendra que vous l\'appeliez.';taire.disabled=true});pz.appendChild(taire)}
  inner.appendChild(pz);pan.appendChild(inner);
  var bt=document.createElement('button');bt.type='button';bt.setAttribute('aria-label','Suggestions de l\'orbe');bt.setAttribute('aria-expanded','false');bt.setAttribute('aria-controls',idp);
  function ouvrir(on,doux){pan.hidden=!on;bt.setAttribute('aria-expanded',String(on));if(bulle)bulle.hidden=true;if(on&&!doux){var f=pan.querySelector('a');f&&f.focus()}}
  /* autonomie : à la demande, ou proposer (bulle) / s'ouvrir (panneau) à la première vraie pause, une fois par page, jamais si le visiteur l'a fait taire */
  var bulle=null;if(o.autonomie!=='discrete'&&o.suggestions.length&&!EDITION&&(function(){try{return localStorage.getItem('aime-orbe-silence:'+(siteId||cle))!=='1'}catch(e){return true}})())pause(function(){if(!pan.hidden)return;if(o.autonomie==='active')return ouvrir(true,true);
   bulle=document.createElement('div');bulle.className='rg-bulle';bulle.setAttribute('role','status');var t=document.createElement('span');t.textContent=o.suggestions.length>1?o.suggestions.length+' suggestions pour vous':'Une suggestion pour vous';var v=document.createElement('button');v.type='button';v.textContent='Voir';v.onclick=function(){ouvrir(true)};var l=document.createElement('button');l.type='button';l.textContent='Plus tard';l.onclick=function(){bulle.hidden=true};bulle.appendChild(t);bulle.appendChild(v);bulle.appendChild(l);b.appendChild(bulle)});
  bt.addEventListener('click',function(){ouvrir(pan.hidden)});b.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pan.hidden){ouvrir(false);bt.focus()}});
  document.addEventListener('click',function(e){if(!b.contains(e.target)&&!pan.hidden)ouvrir(false)});
  pan.addEventListener('click',function(e){if(e.target.closest('a'))ouvrir(false)});
  b.appendChild(pan);b.appendChild(bt);document.body.appendChild(b);orbeEl=b}
 if((o.presence==='compagnon'||o.presence==='les-deux')&&!compagnonLance&&!EDITION){compagnonLance=true;
  charger('/orbe/systeme.js',function(){return!!window.AIMEOrbeSysteme}).then(function(){return charger('/orbe/compagnon.js',function(){return!!window.AIMECompagnon})}).then(function(){
   if(window.AIMECompagnon)AIMECompagnon.demarrer({pointeur:o.compagnon.pointeur&&matchMedia('(pointer:fine)').matches,envie:o.compagnon.envie,hesitation:o.compagnon.hesitation,clic:o.compagnon.clic,commentaires:o.compagnon.commentaires})})}}

/* ---------- appliquer une configuration ---------- */
function appliquer(brut){try{cfg=R.config(brut||{})}catch(e){cfg=R.vide()}var p=cfg.pages[cle]||{appareils:[],textes:[]};
 quand(function(){feuille();appliquerTextes(p.textes);monterAppareils(p.appareils);monterOrbe(R.orbeDe(cfg,siteId))})}

function brouillon(){try{var t=localStorage.getItem('aime-regie-brouillon');return t?JSON.parse(t):null}catch(e){return null}}
function publie(){return fetch('/regie/site.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}

/* ---------- l'édition (dans le cadre de la régie) ---------- */
var choisi=null,modeTexte=false;
function dire(m){try{parent.postMessage(m,location.origin)}catch(e){}}
function selectionner(id){choisi=id;montes.forEach(function(e){e.classList.toggle('rg-choisi',e.getAttribute('data-rg-id')===id)})}
function brancher(el,anc){var id=el.getAttribute('data-rg-id');
 el.addEventListener('pointerdown',function(e){if(modeTexte)return;e.preventDefault();selectionner(id);dire({type:'regie:selection',id:id});
  var r=anc.getBoundingClientRect(),x0=e.clientX,y0=e.clientY,s=getComputedStyle(el),gx=parseFloat(s.getPropertyValue('--rg-x')),gy=parseFloat(s.getPropertyValue('--rg-y')),gl=parseFloat(s.getPropertyValue('--rg-l')),taille=e.target.classList.contains('rg-poignee'),fin=false;
  el.classList.add('rg-tient');try{el.setPointerCapture(e.pointerId)}catch(_){}
  function bouge(ev){var dx=(ev.clientX-x0)/r.width*100,dy=(ev.clientY-y0)/r.height*100;
   if(taille)el.style.setProperty('--rg-l',Math.max(3,Math.min(100,Math.round((gl+dx)*10)/10)));else{el.style.setProperty('--rg-x',Math.round((gx+dx)*10)/10);el.style.setProperty('--rg-y',Math.round((gy+dy)*10)/10)}}
  function lache(){if(fin)return;fin=true;el.classList.remove('rg-tient');el.removeEventListener('pointermove',bouge);el.removeEventListener('pointerup',lache);el.removeEventListener('pointercancel',lache);var s2=getComputedStyle(el);
   dire({type:'regie:deplace',id:id,x:parseFloat(s2.getPropertyValue('--rg-x')),y:parseFloat(s2.getPropertyValue('--rg-y')),l:parseFloat(s2.getPropertyValue('--rg-l'))})}
  el.addEventListener('pointermove',bouge);el.addEventListener('pointerup',lache);el.addEventListener('pointercancel',lache)});
 if(id===choisi)el.classList.add('rg-choisi')}
/* un sélecteur stable : un id, un data-regie, sinon un chemin depuis l'ancêtre le plus proche qui en a un */
function selecteur(el){var parts=[];while(el&&el!==document.body&&el.nodeType===1){if(el.id&&/^[A-Za-z][\w-]*$/.test(el.id)){parts.unshift('#'+el.id);return parts.join(' > ')}
 var dr=el.getAttribute('data-regie');if(dr&&/^[\w-]+$/.test(dr)){parts.unshift('[data-regie="'+dr+'"]');return parts.join(' > ')}
 var t=el.tagName.toLowerCase(),i=1,s=el;while((s=s.previousElementSibling))if(s.tagName===el.tagName)i++;parts.unshift(t+':nth-of-type('+i+')');el=el.parentElement}
 parts.unshift('body');return parts.join(' > ')}
var TEXTES='h1,h2,h3,h4,h5,h6,p,li,a,button,span,small,b,strong,em,label,figcaption,blockquote,dt,dd,td,th';
function cibleTexte(t){var el=t&&t.closest&&t.closest(TEXTES);while(el&&!simple(el))el=null;return el&&!el.closest('.rg-app,.rg-orbe')?el:null}
var survole=null;
function edition(){document.documentElement.classList.add('rg-edition');
 addEventListener('message',function(e){if(e.origin!==location.origin||e.source!==parent)return;var m=e.data||{};
  if(m.type==='regie:config')appliquer(m.config);
  else if(m.type==='regie:choisir')selectionner(m.id);
  else if(m.type==='regie:mode'){modeTexte=!!m.texte;document.documentElement.classList.toggle('rg-texte',modeTexte);if(!modeTexte&&survole){survole.removeAttribute('data-rg-cible');survole=null}}
  else if(m.type==='regie:ajoute'){/* poser le nouvel appareil dans la section la plus visible de la page */
   var best=null,vis=0;[].forEach.call(document.querySelectorAll('[id]'),function(s){if(s.closest('.rg-app,.rg-orbe'))return;var r=s.getBoundingClientRect();if(r.width<innerWidth*.5||r.height<160)return;var v=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));if(v>vis){vis=v;best=s}});
   var a=m.appareil;a.ancre=best?'#'+best.id:'body';if(best){var r=best.getBoundingClientRect();a.x=Math.round(40-a.l/2);a.y=Math.max(0,Math.round((Math.max(0,-r.top)+40)/r.height*100))}else{a.x=40;a.y=Math.round((scrollY+80)/document.body.scrollHeight*100)}
   dire({type:'regie:ajoute-ok',appareil:a})}
  else if(m.type==='regie:aller'){var x=q(m.sel);x&&x.scrollIntoView({block:'center'})}});
 document.addEventListener('pointerover',function(e){if(!modeTexte)return;var el=cibleTexte(e.target);if(survole&&survole!==el)survole.removeAttribute('data-rg-cible');survole=el;if(el)el.setAttribute('data-rg-cible','')},true);
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button,[role=button]');
  if(modeTexte){var el=cibleTexte(e.target);e.preventDefault();e.stopPropagation();if(el)dire({type:'regie:texte',sel:selecteur(el),texte:(touches.has(el)?touches.get(el).map(function(n){return n.nodeName==='BR'?'\n':n.textContent}).join(''):el.innerText||el.textContent).trim(),actuel:(el.innerText||el.textContent).trim()});return}
  if(a&&a.closest('a[href]')&&!a.closest('.rg-orbe')){e.preventDefault()}
  if(!e.target.closest('.rg-app')){selectionner(null);dire({type:'regie:selection',id:null})}},true);
 var ids=[].filter.call(document.querySelectorAll('[id]'),function(s){if(/^(INPUT|TEXTAREA|SELECT|BUTTON|OPTION|SCRIPT|STYLE|LABEL|SVG|PATH|IFRAME)$/i.test(s.tagName)||s.closest('.rg-app,.rg-orbe')||!/^[A-Za-z][\w-]*$/.test(s.id))return false;var r=s.getBoundingClientRect();return r.width>=innerWidth*.4&&r.height>=120}).map(function(s){return'#'+s.id}).slice(0,60);
 dire({type:'regie:pret',page:cle,site:siteId,titre:document.title,ancres:ids})}

/* ---------- départ ---------- */
Promise.all([charger('/regie/donnees.js',function(){return!!window.AIMERegie}),charger('/nav/registre.js',function(){return!!window.AIMENav})]).then(function(){
 R=window.AIMERegie;if(!R){finTextes();return}cle=R.cleDePage(location.pathname);
 var entrees=window.AIMENav&&AIMENav.ENTREES||[];siteId=R.siteDe(location.pathname,entrees);
 if(EDITION){appliquer(brouillon());quand(edition);return}
 var b=APERCU?brouillon():null;if(b){appliquer(b);return}
 publie().then(appliquer)});
API.recharger=function(){var b=APERCU?brouillon():null;if(b)appliquer(b);else publie().then(appliquer)};
})();
