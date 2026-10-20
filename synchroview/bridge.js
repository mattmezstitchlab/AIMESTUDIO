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
})();
