/* AIME · Page Zéro, « Et maintenant ? » : deux orbes qui regardent.
   Leurs yeux suivent la souris (ou le doigt). Une seconde sans bouger : elles louchent, regardent en l'air, puis en bas,
   puis attendent. Un clignement de temps en temps. En mouvement réduit : yeux ouverts, immobiles, au centre.
   AIMEYeux.monter(conteneur) → {reveiller()} */
(function(root){'use strict';
function monter(C){
 var calme=function(){return document.documentElement.classList.contains('calme')};
 var duo=[0,1].map(function(i){var o=document.createElement('div');o.className='duo-o duo-'+i;var c=document.createElement('span');c.className='duo-c';o.appendChild(c);
  var y=document.createElement('span');y.className='yeux';y.innerHTML='<span class="oeil"><i></i></span><span class="oeil"><i></i></span>';o.appendChild(y);C.appendChild(o);
  if(root.AIMEOrbe)root.AIMEOrbe.monter(c,{amplitude:.018});return{o:o,yeux:[].slice.call(y.querySelectorAll('.oeil')),pup:[].slice.call(y.querySelectorAll('.oeil i'))}});
 var souris=null,derniere=0,seq=null,seqPour=-1,raf=0,vu=false;
 /* où regarde chaque pupille : un vecteur dans [-1,1]² */
 function regard(now){if(seq){var u=(now-seq)/1000;if(u<1.1)return'louche';if(u<2.2)return{x:.15,y:-1};if(u<3.3)return{x:-.1,y:1};if(u<4)return{x:0,y:.2};seq=null}
  if(souris&&now-derniere>1000&&!seq&&seqPour!==derniere&&!calme()){seq=now;seqPour=derniere;return'louche'}return null}
 function dessiner(now){var g=calme()?{x:0,y:0}:regard(now);
  duo.forEach(function(d,j){d.yeux.forEach(function(e,k){var v;if(g==='louche')v={x:(k===0?1:-1)*.85,y:.15};else if(g&&g.x!=null)v=g;else if(souris){var r=e.getBoundingClientRect(),dx=souris.x-(r.left+r.width/2),dy=souris.y-(r.top+r.height/2),n=Math.hypot(dx,dy)||1,f=Math.min(1,n/180);v={x:dx/n*f,y:dy/n*f}}else v={x:0,y:0};
   var cur=d.pup[k]._v||{x:0,y:0};cur.x+=(v.x-cur.x)*(calme()?1:.22);cur.y+=(v.y-cur.y)*(calme()?1:.22);d.pup[k]._v=cur;d.pup[k].style.transform='translate('+(cur.x*62).toFixed(1)+'%,'+(cur.y*52).toFixed(1)+'%)'})});
  if(vu&&!calme())raf=requestAnimationFrame(dessiner)}
 function bouge(x,y){souris={x:x,y:y};derniere=performance.now();if(seq&&performance.now()-seq>300)seq=null}
 addEventListener('pointermove',function(e){bouge(e.clientX,e.clientY)},{passive:true});
 addEventListener('touchmove',function(e){var t=e.touches[0];if(t)bouge(t.clientX,t.clientY)},{passive:true});
 /* clignements */
 (function cligne(){setTimeout(function(){if(vu&&!calme())duo.forEach(function(d,j){setTimeout(function(){d.o.classList.add('cligne');setTimeout(function(){d.o.classList.remove('cligne')},150)},j*70)});cligne()},2600+Math.random()*3200)})();
 if('IntersectionObserver' in window)new IntersectionObserver(function(en){var v=en[0].isIntersecting;if(v&&!vu){vu=true;raf=requestAnimationFrame(dessiner)}else if(!v){vu=false;cancelAnimationFrame(raf)}}).observe(C);else{vu=true;raf=requestAnimationFrame(dessiner)}
 return{reveiller:function(){C.classList.add('eveil');if(!souris){var r=C.getBoundingClientRect();souris={x:r.left+r.width/2,y:r.top+r.height/2}}derniere=performance.now()}}}
root.AIMEYeux={monter:monter};
})(typeof self!=='undefined'?self:this);
