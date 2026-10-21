/* AIME · Page Zéro, « Rien n'existe isolément » : la ronde.
   L'orbe au centre ; autour, quatre petites orbes (une personne, une idée, un document, un événement) tournent sur une
   ellipse, comme vue de biais. Une onde part du centre à intervalles réguliers ; quand elle touche une petite orbe, celle-ci
   s'illumine. Au fil du défilement, les orbes s'écartent du centre, puis les liens se tissent entre elles.
   AIMERonde.monter(conteneur) → {maj(t, progres, calme)} */
(function(root){'use strict';
var NS='http://www.w3.org/2000/svg';
function el(t,a,p){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
var lisse=function(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
var NOMS=['une personne','une idée','un document','un événement','un lieu','un moment'];
function monter(C){
 var W=600,Hh=420,cx=300,cy=210,RX=238,RY=128;
 var sv=el('svg',{viewBox:'0 0 '+W+' '+Hh,'aria-hidden':'true',class:'ronde-fond'},C),ondes=el('g',{},sv),liens=el('g',{},sv);
 var O=NOMS.map(function(n,i){var d=document.createElement('div');d.className='mo';d.innerHTML='<span class="mo-b"></span><span class="mo-n">'+n+'</span>';C.appendChild(d);return{d:d,b:d.firstChild,a0:i/NOMS.length*Math.PI*2,eclat:0}});
 var L=[];O.forEach(function(o,i){L.push({a:-1,b:i,e:el('line',{stroke:'#EDEDF0','stroke-width':1,'vector-effect':'non-scaling-stroke'},liens)});L.push({a:i,b:(i+1)%O.length,e:el('path',{fill:'none',stroke:'#9C9CA8','stroke-width':1,'vector-effect':'non-scaling-stroke'},liens)})});
 var W8=[0,1,2].map(function(){return el('ellipse',{cx:cx,cy:cy,rx:0,ry:0,fill:'none',stroke:'url(#rondeG)','stroke-width':1.4,'vector-effect':'non-scaling-stroke',opacity:0},ondes)});
 var df=el('defs',{},sv),g=el('linearGradient',{id:'rondeG',x1:0,y1:0,x2:1,y2:1},df);[['0','#FB7185'],['.35','#F59E0B'],['.68','#7C5CFF'],['1','#22D3EE']].forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1]},g)});
 var P=[];
 function maj(t,p,calme){var r=C.getBoundingClientRect(),k=r.width/W,ouv=calme?1:lisse(p*1.7),rot=calme?0:t*.00011+p*1.4,per=.62;
  /* les ondes : trois à la fois, décalées, du centre vers le bord de l'ellipse */
  W8.forEach(function(w,i){var u=calme?-1:((t/3600)+i/3)%1;if(u<0||p<.08){w.setAttribute('opacity',0);return}w.setAttribute('rx',(u*RX*1.25).toFixed(1));w.setAttribute('ry',(u*RY*1.25).toFixed(1));w.setAttribute('opacity',((1-u)*.55*lisse(p*4)).toFixed(3));w._u=u});
  O.forEach(function(o,i){var a=o.a0+rot,x=cx+Math.cos(a)*RX*ouv,y=cy+Math.sin(a)*RY*ouv,z=(Math.sin(a)+1)/2,s=.72+z*.5;
   /* une onde touche cette orbe ? elle s'illumine un instant */
   var dn=Math.hypot((x-cx)/RX,(y-cy)/RY);W8.forEach(function(w){if(w._u!=null&&Math.abs(w._u*1.25-dn)<.05&&!calme)o.eclat=1});o.eclat*=.93;
   var vis=calme?1:lisse((p-.04-i*.05)*6);P[i]=[x,y,z];
   o.d.style.transform='translate('+(x*k).toFixed(1)+'px,'+(y*k).toFixed(1)+'px) translate(-50%,-50%) scale('+(s*(1+o.eclat*.35)*(.4+.6*vis)).toFixed(3)+')';
   o.d.style.opacity=(vis*(.45+z*.55)).toFixed(3);o.d.style.zIndex=z>.5?3:1;o.b.style.boxShadow='0 0 '+(10+o.eclat*26).toFixed(0)+'px rgba(124,92,255,'+(.35+o.eclat*.5).toFixed(2)+')'});
  var tis=calme?1:lisse((p-.45)*3);
  L.forEach(function(l,i){var b=P[l.b];if(l.a<0){l.e.setAttribute('x1',cx);l.e.setAttribute('y1',cy);l.e.setAttribute('x2',b[0].toFixed(1));l.e.setAttribute('y2',b[1].toFixed(1));l.e.setAttribute('stroke-opacity',(.08+.22*tis*(.4+b[2]*.6)).toFixed(3));return}
   var a=P[l.a],mx=(a[0]+b[0])/2+(cx-(a[0]+b[0])/2)*.35,my=(a[1]+b[1])/2+(cy-(a[1]+b[1])/2)*.35;l.e.setAttribute('d','M'+a[0].toFixed(1)+','+a[1].toFixed(1)+' Q'+mx.toFixed(1)+','+my.toFixed(1)+' '+b[0].toFixed(1)+','+b[1].toFixed(1));l.e.setAttribute('stroke-opacity',(.4*tis*Math.min(a[2],b[2])+.04*tis).toFixed(3))})}
 return{maj:maj}}
root.AIMERonde={monter:monter};
})(typeof self!=='undefined'?self:this);
