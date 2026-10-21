/* AIME · Page Zéro. Une seule colonne, un seul défilement vertical, aucun blocage.
   Tout ce qui bouge dépend de la position verticale ; en mouvement réduit, chaque section se lit d'un coup. */
(function(){'use strict';
var $=function(s){return document.getElementById(s)},H=document.documentElement,NS='http://www.w3.org/2000/svg';
var calme=function(){return H.classList.contains('calme')};
function el(t,a,p){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
var lisse=function(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
var vh=function(){return window.innerHeight||document.documentElement.clientHeight};
function progres(sec){var r=sec.getBoundingClientRect(),course=r.height-vh();return course>0?Math.max(0,Math.min(1,-r.top/course)):(r.top<vh()/2?1:0)}

/* ---------- l'orbe et ses ancres ---------- */
var flot=$('flot'),orbe=AIMEOrbe.monter(flot,{amplitude:.007}),ancres=[].slice.call(document.querySelectorAll('[data-orbe]')),cur={x:0,y:0,s:100,o:0},pret=false;
function cible(){var V=vh(),best=null;ancres.forEach(function(a){var sec=a.closest('section'),r=sec.getBoundingClientRect();if(r.top<V*.55&&r.bottom>V*.45){var ra=a.getBoundingClientRect();best={x:ra.left,y:ra.top,s:ra.width}}});return best}
var dernier=null;
function orbeSuivre(t){var c=cible(),k=calme()||!pret?1:.16;if(c){dernier=c;cur.x+=(c.x-cur.x)*k;cur.y+=(c.y-cur.y)*k;cur.s+=(c.s-cur.s)*k;cur.o+=(1-cur.o)*(calme()?1:.12)}else cur.o+=(0-cur.o)*(calme()?1:.14);
 var f=calme()?0:Math.sin(t/2400)*cur.s*.012;flot.style.transform='translate('+cur.x.toFixed(1)+'px,'+(cur.y+f).toFixed(1)+'px) scale('+(cur.s/100).toFixed(4)+')';flot.style.opacity=cur.o<.01?0:cur.o.toFixed(3);pret=true}

/* ---------- 2 · les phrases : nettes au centre, effacées près de l'orbe ---------- */
var phrases=[].slice.call(document.querySelectorAll('.phrase p'));
function phrasesMaj(){if(calme())return;var V=vh();phrases.forEach(function(p){var r=p.getBoundingClientRect(),c=(r.top+r.height/2)/V,d=Math.abs(c-.62),o=lisse(1-(d-.12)/.24);p.style.opacity=o.toFixed(3);p.style.transform='translateY('+((c-.6)*-24).toFixed(1)+'px)'})}

/* ---------- 3 · la métamorphose : seize points, six formes ---------- */
var NOMS=['Point','Ligne','Relation','Grille','Composition','Projet'],N=16;
var RECTS=[[60,70,170,150],[250,70,90,60],[250,150,90,70],[60,240,280,90]];
function etats(){var E=[],i,P;
 E.push(Array.apply(null,{length:N}).map(function(){return[200,200]}));
 E.push(Array.apply(null,{length:N}).map(function(_,i){return[50+i*20,200]}));
 P=[[200,200]];for(i=1;i<N;i++){var a=(i-1)/(N-1)*Math.PI*2-Math.PI/2;P.push([200+132*Math.cos(a),200+132*Math.sin(a)])}E.push(P);
 E.push(Array.apply(null,{length:N}).map(function(_,i){return[80+(i%4)*80,80+Math.floor(i/4)*80]}));
 P=[];RECTS.forEach(function(r){P.push([r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]])});E.push(P);
 E.push(P.map(function(p){return[200+(p[0]-200)*.78,212+(p[1]-200)*.78]}));return E}
var E=etats(),forme=$('forme'),pts=[],grp=[];
function meta(){var defs=el('defs',{},forme),lg=el('linearGradient',{id:'irisZ',x1:0,y1:0,x2:1,y2:1},defs);[['0','#FB7185'],['.35','#F59E0B'],['.68','#7C5CFF'],['1','#22D3EE']].forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1]},lg)});
 var st={fill:'none',stroke:'#EDEDF0','stroke-width':1.2,'stroke-opacity':.55,'vector-effect':'non-scaling-stroke'};
 grp=E.map(function(){return el('g',{opacity:0},forme)});
 el('circle',Object.assign({cx:200,cy:200,r:42},st,{stroke:'url(#irisZ)','stroke-opacity':.7}),grp[0]);
 el('line',Object.assign({x1:50,y1:200,x2:350,y2:200},st),grp[1]);
 for(var i=1;i<N;i++){var p=E[2][i];el('line',Object.assign({x1:200,y1:200,x2:p[0],y2:p[1]},st,{'stroke-opacity':.35}),grp[2])}
 for(var j=1;j<N;j+=3){var a=E[2][j],b=E[2][(j+4-1)%(N-1)+1];el('line',Object.assign({x1:a[0],y1:a[1],x2:b[0],y2:b[1]},st,{'stroke-opacity':.25}),grp[2])}
 for(var g=0;g<4;g++){el('line',Object.assign({x1:80+g*80,y1:80,x2:80+g*80,y2:320},st),grp[3]);el('line',Object.assign({x1:80,y1:80+g*80,x2:320,y2:80+g*80},st),grp[3])}
 RECTS.forEach(function(r){el('rect',Object.assign({x:r[0],y:r[1],width:r[2],height:r[3],rx:6},st),grp[4])});
 el('rect',Object.assign({x:28,y:28,width:344,height:344,rx:18},st,{'stroke-opacity':.8}),grp[5]);el('line',Object.assign({x1:28,y1:66,x2:372,y2:66},st),grp[5]);el('circle',{cx:348,cy:47,r:7,fill:'url(#irisZ)'},grp[5]);
 RECTS.forEach(function(r){var s=.78,x=200+(r[0]-200)*s,y=212+(r[1]-200)*s;el('rect',Object.assign({x:x,y:y,width:r[2]*s,height:r[3]*s,rx:5},st),grp[5])});
 for(var k=0;k<N;k++)pts.push(el('circle',{r:3.6,fill:'#EDEDF0'},forme));
 /* version immobile : les six formes, l'une sous l'autre */
 var S=$('statique');E.forEach(function(P,e){var f=document.createElement('figure'),sv=document.createElementNS(NS,'svg');sv.setAttribute('viewBox','0 0 400 400');sv.setAttribute('aria-hidden','true');var c=grp[e].cloneNode(true);c.setAttribute('opacity',1);sv.appendChild(c);
  P.forEach(function(p){el('circle',{cx:p[0],cy:p[1],r:e?5:12,fill:e?'#EDEDF0':'url(#irisS)'},sv)});if(!e){var d2=el('defs',{},sv),l2=el('linearGradient',{id:'irisS',x1:0,y1:0,x2:1,y2:1},d2);[['0','#FB7185'],['1','#22D3EE']].forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1]},l2)})}
  f.appendChild(sv);var fc=document.createElement('figcaption');fc.textContent=(e+1)+' · '+NOMS[e];f.appendChild(fc);S.appendChild(f)})}
var etapes=[].slice.call(document.querySelectorAll('#etapes li'));
function metaMaj(){if(calme())return;var p=progres($('meta'))*1.12-.06,q=Math.max(0,Math.min(5,p*5)),k=Math.min(4,Math.floor(q)),f=lisse((q-k-.15)/.7);
 for(var i=0;i<N;i++){var a=E[k][i],b=E[k+1][i],x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;pts[i].setAttribute('cx',x.toFixed(1));pts[i].setAttribute('cy',y.toFixed(1));pts[i].setAttribute('r',q<.5?(3.6+8*(1-q*2)).toFixed(2):3.6);pts[i].setAttribute('fill',q<.5?'url(#irisZ)':'#EDEDF0')}
 grp.forEach(function(g,e){g.setAttribute('opacity',Math.max(0,1-Math.abs(q-e)*1.5).toFixed(3))});var on=Math.round(q);etapes.forEach(function(li,e){li.classList.toggle('on',e===on)})}

/* ---------- 4 · le lien : un centre, des points, des relations qui se tracent ---------- */
var R=$('reseau'),liens=[],noeuds=[],pulse=null,C=[300,210];
var PTS=[[110,92,'une personne'],[214,48,''],[392,52,'une idée'],[520,120,''],[548,262,'un document'],[440,360,''],[300,384,'un événement'],[160,350,''],[58,250,''],[96,170,'']];
var CHAINE=[[0,1],[2,3],[3,4],[6,5],[7,8],[9,0],[4,5]];
function lien(){var d=el('defs',{},R),g=el('radialGradient',{id:'cz'},d);[['0','#FFFFFF','.9'],['.35','#7C5CFF','.9'],['1','#22D3EE','0']].forEach(function(s){el('stop',{offset:s[0],'stop-color':s[1],'stop-opacity':s[2]},g)});
 var gl=el('g',{},R),gn=el('g',{},R);
 PTS.forEach(function(p,i){var a=el('path',{d:'M'+C[0]+','+C[1]+' L'+p[0]+','+p[1],pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1,stroke:'#EDEDF0','stroke-opacity':.5,'stroke-width':1.2,fill:'none','vector-effect':'non-scaling-stroke'},gl);liens.push({e:a,de:-1,vers:i})});
 CHAINE.forEach(function(c){var a=PTS[c[0]],b=PTS[c[1]],mx=(a[0]+b[0])/2+(C[0]-(a[0]+b[0])/2)*.18,my=(a[1]+b[1])/2+(C[1]-(a[1]+b[1])/2)*.18,e=el('path',{d:'M'+a[0]+','+a[1]+' Q'+mx+','+my+' '+b[0]+','+b[1],pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1,stroke:'#9C9CA8','stroke-opacity':.45,'stroke-width':1,fill:'none','vector-effect':'non-scaling-stroke'},gl);liens.push({e:e,de:c[0],vers:c[1]})});
 el('circle',{cx:C[0],cy:C[1],r:58,fill:'url(#cz)',opacity:.55},gn);el('circle',{cx:C[0],cy:C[1],r:13,fill:'#EDEDF0'},gn);
 PTS.forEach(function(p){var g2=el('g',{opacity:0},gn);el('circle',{cx:p[0],cy:p[1],r:p[2]?6:4,fill:'#EDEDF0'},g2);if(p[2]){var t=el('text',{x:p[0],y:p[1]+(p[1]>C[1]?26:-16),'text-anchor':'middle',fill:'#9C9CA8','font-size':13,'font-family':'Inter Variable, Inter, sans-serif','letter-spacing':'.04em'},g2);t.textContent=p[2]}noeuds.push(g2)});
 pulse=el('circle',{r:3.2,fill:'#EDEDF0',opacity:0},gn)}
function lienMaj(t){var p=calme()?1:progres($('lien'))*1.25,n=liens.length,vus=[];
 liens.forEach(function(l,i){var a=Math.max(0,Math.min(1,(p*(n+2)-i)/2.2));l.e.setAttribute('stroke-dashoffset',(1-lisse(a)).toFixed(3));if(a>.95)vus[l.vers]=1});
 noeuds.forEach(function(g,i){var a=Math.max(0,Math.min(1,(p*(n+2)-i-1.4)/1.2));g.setAttribute('opacity',lisse(a).toFixed(3))});
 $('lienSous').classList.toggle('vu',p>.62);
 /* une impulsion parcourt les relations une fois tout relié : la logique causale, sans interface scientifique */
 if(!calme()&&p>=1){var L=liens[Math.floor(t/1400)%liens.length],u=(t%1400)/1400,pt=L.e.getPointAtLength(u*L.e.getTotalLength());pulse.setAttribute('cx',pt.x);pulse.setAttribute('cy',pt.y);pulse.setAttribute('opacity',(Math.sin(u*Math.PI)*.9).toFixed(3))}else pulse.setAttribute('opacity',0)}

/* ---------- 5 · apparitions au fil du défilement ---------- */
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target)}})},{rootMargin:'0px 0px -18% 0px'});[].forEach.call(document.querySelectorAll('.apparait'),function(x){io.observe(x)})}
else[].forEach.call(document.querySelectorAll('.apparait'),function(x){x.classList.add('vu')});

/* ---------- boucle : une seule, légère ---------- */
var occupe=false;
function image(t){orbeSuivre(t);phrasesMaj();metaMaj();lienMaj(t);document.body.classList.toggle('loin',window.scrollY>vh()*.6);requestAnimationFrame(image)}
meta();lien();requestAnimationFrame(image);

/* ---------- réduire les animations : le choix du visiteur s'ajoute à la préférence du système ---------- */
var b=$('calme');function etiquette(){b.setAttribute('aria-pressed',String(calme()));b.textContent=calme()?'Rétablir les animations':'Réduire les animations'}
b.addEventListener('click',function(){var on=!calme();H.classList.toggle('calme',on);try{localStorage.setItem('aime-zero-calme',on?'1':'0')}catch(e){}orbe.animer(!on);if(on){phrases.forEach(function(p){p.style.opacity='';p.style.transform=''})}etiquette()});
if(calme())orbe.animer(false);etiquette();
})();
