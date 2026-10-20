/* AIME SynchroView · pont universel
   Une page qui charge ce script devient comparable dans SynchroView.
   Il ne fait rien tant qu'il n'est pas dans un cadre (iframe) qui lui parle.
   Protocole (postMessage, objets {sv:...}) :
     parent → page : hello · go {id,k} · by {dy}
     page → parent : anchors {list,max,w,h} · at {id,k,y}
   Repères : window.svAnchors() si la page en fournit, sinon [data-sv] puis section[id]. */
(function(){"use strict";
if(window.parent===window)return;
var PARENT=window.parent,ignoreUntil=0,list=[],raf=0;
function label(el){return el.getAttribute('data-sv-label')||el.getAttribute('aria-label')||((el.querySelector('h1,h2')||{}).textContent||el.id||'Section').trim().slice(0,40)}
function generic(){var els=[].slice.call(document.querySelectorAll('[data-sv]'));if(!els.length)els=[].slice.call(document.querySelectorAll('section[id],header[id],footer[id]'));
 return els.map(function(el){var r=el.getBoundingClientRect();return{id:el.getAttribute('data-sv')||el.id,label:label(el),top:r.top+scrollY}})}
/* les repères deviennent des segments contigus : chaque pixel de la page appartient à une section */
function build(){var max=Math.max(1,document.documentElement.scrollHeight-innerHeight),raw;
 try{raw=typeof window.svAnchors==='function'?window.svAnchors():generic()}catch(_){raw=generic()}
 raw=raw.filter(function(a){return a&&a.id!=null}).sort(function(a,b){return a.top-b.top});
 if(!raw.length||raw[0].top>4)raw.unshift({id:'debut',label:'Début',top:0});
 list=raw.map(function(a,i){var top=Math.max(0,Math.min(max,a.top)),next=i<raw.length-1?Math.max(0,Math.min(max,raw[i+1].top)):max;return{id:String(a.id),label:a.label,top:Math.round(top),h:Math.max(1,Math.round(next-top))}}).filter(function(a,i,arr){return i===arr.length-1||a.h>1});
 return{sv:'anchors',list:list,max:max,w:innerWidth,h:innerHeight}}
function send(m){try{PARENT.postMessage(m,'*')}catch(_){}}
function at(){var y=scrollY,a=list[0];for(var i=0;i<list.length;i++)if(y>=list[i].top-1)a=list[i];return a?{sv:'at',id:a.id,k:Math.max(0,Math.min(1,(y-a.top)/a.h)),y:y}:null}
addEventListener('message',function(e){if(e.source!==PARENT)return;var m=e.data||{};if(!m.sv)return;
 if(m.sv==='hello'){send(build());return}
 if(m.sv==='go'){var a=null;for(var i=0;i<list.length;i++)if(list[i].id===m.id){a=list[i];break}
  var y=a?a.top+m.k*a.h:(m.p||0)*(document.documentElement.scrollHeight-innerHeight);ignoreUntil=performance.now()+120;scrollTo(0,y);return}
 if(m.sv==='by'){scrollBy(0,m.dy);return}});
addEventListener('scroll',function(){if(performance.now()<ignoreUntil||raf)return;raf=requestAnimationFrame(function(){raf=0;var m=at();if(m)send(m)})},{passive:true});
var rz=0;addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){send(build())},250)});
addEventListener('load',function(){setTimeout(function(){send(build())},300)});

/* ---------- inspection : retrouver le même élément dans chaque vue ----------
   parent → page : pick {on} · find {key, reveal} · clear
   page → parent : picked {key, info} · found {key, info|null}
   Clé stable : [data-sv-id] (ex. « bloc:rsvp »), puis id, puis le n-ième bouton/lien/champ dans cet ensemble. */
var PICK=false,HL=null,HOV=null;
function unitOf(el){if(!el||!el.closest)return null;return el.closest('[data-sv-id] button,[data-sv-id] a,[data-sv-id] input,[data-sv-id] select,[data-sv-id],button,a[href],input,select,textarea,[id]')}
function baseOf(el){var b=el.closest('[data-sv-id]');if(b)return{el:b,key:b.getAttribute('data-sv-id')};var i=el.closest('[id]');if(i&&i.id)return{el:i,key:'#'+i.id};return{el:document.body,key:'page'}}
function keyOf(el){var b=baseOf(el);if(b.el===el)return b.key;var tag=el.tagName.toLowerCase(),list=[].slice.call(b.el.querySelectorAll(tag)),n=list.indexOf(el);return b.key+'>'+tag+':'+n}
function byKey(k){var m=k.split('>'),base=m[0]==='page'?document.body:m[0][0]==='#'?document.getElementById(m[0].slice(1)):document.querySelector('[data-sv-id="'+m[0].replace(/"/g,'')+'"]');if(!base||!m[1])return base;var t=m[1].split(':');return base.querySelectorAll(t[0])[+t[1]]||null}
function nm(el){return(el.getAttribute('aria-label')||el.innerText||el.value||el.getAttribute('title')||'').replace(/\s+/g,' ').trim().slice(0,80)}
function txt(el){var c=el.cloneNode(true);[].forEach.call(c.querySelectorAll('pre,script,style,[aria-hidden=true],.bk,[hidden]'),function(x){x.remove()});return(c.textContent||'').replace(/\s+/g,' ').trim().slice(0,240)}
function info(el){var cs=getComputedStyle(el),r=el.getBoundingClientRect(),hid=el.closest('[hidden],[aria-hidden=true]');
 var vis=r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.05&&!el.closest('[hidden]');
 var acts=[].slice.call(el.matches('button,a[href],input,select,textarea')?[el]:el.querySelectorAll('button,a[href],input,select,textarea')).filter(function(a){return!a.closest('[data-sv-skip]')}).slice(0,12).map(function(a){var c=getComputedStyle(a),ar=a.getBoundingClientRect();return{name:nm(a)||a.tagName.toLowerCase(),kind:a.tagName.toLowerCase()+(a.type?'/'+a.type:''),disabled:!!(a.disabled||a.getAttribute('aria-disabled')==='true'),visible:ar.width>0&&ar.height>0&&c.visibility!=='hidden'&&c.display!=='none',href:a.getAttribute('href')||''}});
 var perm=null;try{if(typeof window.svPerm==='function')perm=window.svPerm(keyOf(el),el)}catch(_){}
 return{label:nm(el),tag:el.tagName.toLowerCase(),role:el.getAttribute('role')||'',text:txt(el),visible:vis,inView:r.bottom>0&&r.top<innerHeight,ariaHidden:!!hid,
  box:[Math.round(r.width),Math.round(r.height)],style:{font:cs.fontFamily.split(',')[0].replace(/["']/g,''),size:cs.fontSize,weight:cs.fontWeight,color:cs.color,bg:cs.backgroundColor,radius:cs.borderRadius},actions:acts,perm:perm,mode:(window.AIMEM&&window.AIMEM.role)||''}}
function mark(el){if(!HL){HL=document.createElement('div');HL.setAttribute('aria-hidden','true');HL.style.cssText='position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #FBBF24;border-radius:8px;box-shadow:0 0 0 4px rgba(251,191,36,.25);transition:all .15s';document.body.appendChild(HL)}
 if(!el){HL.style.display='none';return}var r=el.getBoundingClientRect();HL.style.display='block';HL.style.left=(r.left-3)+'px';HL.style.top=(r.top-3)+'px';HL.style.width=(r.width+6)+'px';HL.style.height=(r.height+6)+'px'}
var LOCK=null;function track(){if(LOCK&&document.contains(LOCK))mark(LOCK);if(LOCK||PICK)requestAnimationFrame(track)}
document.addEventListener('pointermove',function(e){if(!PICK)return;var u=unitOf(e.target);if(u!==HOV){HOV=u;if(!LOCK)mark(u)}},true);
document.addEventListener('click',function(e){if(!PICK)return;var u=unitOf(e.target);if(!u)return;e.preventDefault();e.stopPropagation();LOCK=u;mark(u);var k=keyOf(u);send({sv:'picked',key:k,info:info(u)})},true);
addEventListener('message',function(e){if(e.source!==PARENT)return;var m=e.data||{};
 if(m.sv==='pick'){PICK=!!m.on;document.documentElement.style.cursor=PICK?'crosshair':'';if(!PICK){LOCK=null;mark(null)}else requestAnimationFrame(track);return}
 if(m.sv==='find'){var el=byKey(m.key);LOCK=el;if(el&&m.reveal){ignoreUntil=performance.now()+200;el.scrollIntoView({block:'center'})}mark(el);requestAnimationFrame(track);send({sv:'found',key:m.key,info:el?info(el):null});return}
 if(m.sv==='clear'){LOCK=null;mark(null);return}});
})();
