/* AIME · Page Zéro. Une seule colonne, un seul défilement vertical, aucun blocage.
   Tout ce qui bouge dépend de la position verticale ; en mouvement réduit, chaque section se lit d'un coup. */
(function(){'use strict';
var $=function(s){return document.getElementById(s)},H=document.documentElement,NS='http://www.w3.org/2000/svg';
var calme=function(){return H.classList.contains('calme')};
function el(t,a,p){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
var lisse=function(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
var vh=function(){return window.innerHeight||document.documentElement.clientHeight};
function progres(sec){var r=sec.getBoundingClientRect(),course=r.height-vh();return course>0?Math.max(0,Math.min(1,-r.top/course)):(r.top<vh()/2?1:0)}

/* ---------- l'orbe : un seul objet, liquide ----------
   Elle suit des ancres (le point zéro, le premier geste, le centre de la ronde) ; entre elles, elle descend avec la page
   et se pose au-dessus du prochain titre. Quand ce titre arrive au milieu de l'écran, le point de son « i » l'attire comme
   un aimant, l'absorbe, gonfle et éclate : ses éclats deviennent de petites orbes qui vont allumer les autres points.
   Puis l'orbe renaît du point et continue. Ressort amorti + étirement selon la vitesse = une goutte, pas un objet rigide. */
var flot=$('flot'),orbe=AIMEOrbe.monter(flot,{amplitude:.007}),ancres=[].slice.call(document.querySelectorAll('[data-orbe]'));
var O={x:innerWidth/2,y:-80,s:60,vx:0,vy:0,vs:0,o:0},pret=false,etat='libre',cap=null,TITRES=[],yeux=null,tPrec=0;
function cible(){var V=vh(),best=null;ancres.forEach(function(a){var sec=a.closest('section'),r=sec.getBoundingClientRect();if(r.top<V*.55&&r.bottom>V*.45){var ra=a.getBoundingClientRect();best={x:ra.left+ra.width/2,y:ra.top+ra.height/2,s:ra.width,o:1}}});return best}
function titre(sel,cond,fin){var e=document.querySelector(sel);if(!e)return;var pt=e.querySelector('.pt');if(pt)TITRES.push({el:e,pt:pt,cond:cond||function(){return true},fin:!!fin,fait:false})}
function prochain(){var V=vh(),best=null,by=1e9;TITRES.forEach(function(T){if(T.fait)return;var c=AIMEPoints.centre(T.pt);if(c.y>V*.12&&c.y<by){by=c.y;best=T;best._c=c}});return best}
function libre(){var a=cible();if(a)return a;var V=vh(),n=prochain();
 if(n&&n.cond()&&n._c.y<V*1.02)return{x:n._c.x,y:Math.max(V*.13,n._c.y-Math.max(64,n._c.d*16)),s:44,o:1};
 return{x:O.x,y:-90,s:44,o:0}}
function ressort(tg,k,am,dt){O.vx=(O.vx+(tg.x-O.x)*k*dt)*Math.pow(am,dt);O.vy=(O.vy+(tg.y-O.y)*k*dt)*Math.pow(am,dt);O.vs=(O.vs+(tg.s-O.s)*k*dt)*Math.pow(am,dt);O.x+=O.vx*dt;O.y+=O.vy*dt;O.s=Math.max(.5,O.s+O.vs*dt)}
function capturer(T,now){var c=T._c||AIMEPoints.centre(T.pt);if(O.o<.15){O.x=c.x;O.y=-O.s;O.vx=O.vy=0}cap={T:T,t0:now};etat='capture'}
function absorber(){var T=cap.T;etat='absorbe';O.o=0;T.fait=true;
 AIMEPoints.gonfler(T.pt,{eclate:function(){cap=null;var c=AIMEPoints.centre(T.pt);
  if(T.fin){etat='libre';O.y=-90;O.vy=0;if(yeux)yeux.reveiller();return}
  /* l'orbe renaît du point éclaté */
  O.x=c.x;O.y=c.y;O.s=Math.max(2,c.d);O.vx=0;O.vy=-7;O.vs=4;O.o=1;etat='libre'}})}
function orbeSuivre(now){var dt=Math.min(3,Math.max(.25,(now-(tPrec||now-16.7))/16.7));tPrec=now;var V=vh();
 if(calme()){var a=cible()||{x:O.x,y:-90,s:O.s,o:0};O.x=a.x;O.y=a.y;O.s=a.s;O.o=a.o;O.vx=O.vy=0}
 else if(!pret){var a0=cible();if(a0){O.x=a0.x;O.y=a0.y;O.s=a0.s;O.o=1}}
 else if(etat==='capture'){var c=AIMEPoints.centre(cap.T.pt),u=Math.min(1,(now-cap.t0)/900);
  if(c.y<-V*.1||c.y>V*1.1){etat='libre';cap=null}
  else{ressort({x:c.x,y:c.y,s:c.d*1.1},.03+.16*lisse(u),.72,dt);O.o+=(1-O.o)*.2*dt;
   if((Math.hypot(c.x-O.x,c.y-O.y)<Math.max(2.5,c.d*.6)&&O.s<c.d*2.2)||now-cap.t0>2600)absorber()}}
 else if(etat==='libre'){var tg=libre();ressort(tg,.034,.74,dt);O.o+=(tg.o-O.o)*.1*dt;
  var n=prochain();if(n&&n.cond()&&n._c.y<V*.7&&n._c.y>V*.16)capturer(n,now)}
 /* la goutte : étirée dans le sens de sa course, volume conservé */
 var v=Math.hypot(O.vx,O.vy),st=calme()?0:Math.min(.5,v/40)+(etat==='capture'?.12:0),ang=Math.atan2(O.vy,O.vx)*57.2958,sx=1+st,sy=1/sx,fl=calme()?0:Math.sin(now/2400)*O.s*.012;
 flot.style.transform='translate('+O.x.toFixed(1)+'px,'+(O.y+fl).toFixed(1)+'px) rotate('+ang.toFixed(1)+'deg) scale('+sx.toFixed(3)+','+sy.toFixed(3)+') rotate('+(-ang).toFixed(1)+'deg) scale('+(O.s/100).toFixed(4)+') translate(-50px,-50px)';
 flot.style.opacity=O.o<.01?0:Math.min(1,O.o).toFixed(3);pret=true}

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

/* ---------- 4 · le lien : la ronde des orbes (zero/ronde.js) ---------- */
var ronde=window.AIMERonde?AIMERonde.monter($('ronde')):null;
function lienMaj(t){var p=calme()?1:progres($('lien'))*1.2;if(ronde)ronde.maj(t,p,calme());$('lienSous').classList.toggle('vu',p>.62)}

/* ---------- 5 · apparitions au fil du défilement ---------- */
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vu');io.unobserve(e.target)}})},{rootMargin:'0px 0px -18% 0px'});[].forEach.call(document.querySelectorAll('.apparait'),function(x){io.observe(x)})}
else[].forEach.call(document.querySelectorAll('.apparait'),function(x){x.classList.add('vu')});

/* ---------- boucle : une seule, légère ---------- */
var occupe=false;
function image(t){orbeSuivre(t);phrasesMaj();metaMaj();lienMaj(t);document.body.classList.toggle('loin',window.scrollY>vh()*.6);requestAnimationFrame(image)}
meta();requestAnimationFrame(image);
/* les points des « i » ; puis les titres qui attirent l'orbe, dans l'ordre de la page */
if(window.AIMEYeux&&$('duo'))yeux=AIMEYeux.monter($('duo'));
if(window.AIMEPoints)AIMEPoints.preparer('.zero .intention,.phrase p,.meta h2,.meta .sous,.lien h2,.lien .sous,.promesse .grand:not(.grand+.grand),.exemples li,.autorisations,.entrer h2,.entrer p',function(){
 titre('.zero .intention',function(){return window.scrollY>40});
 [].forEach.call(document.querySelectorAll('.phrase:not(.comprendre) p'),function(p,i){titre('.phrase:not(.comprendre):nth-child('+(i+1)+') p')});
 titre('.meta h2',function(){return progres($('meta'))>.86});
 titre('.lien h2',function(){return progres($('lien'))>.88});
 titre('.promesse .grand');
 titre('.entrer h2',null,true);
 if(calme()){AIMEPoints.tous().forEach(function(p){AIMEPoints.allumer(p)});if(yeux)yeux.reveiller()}});
else if(yeux)yeux.reveiller();

/* ---------- réduire les animations : le choix du visiteur s'ajoute à la préférence du système ---------- */
var b=$('calme');function etiquette(){b.setAttribute('aria-pressed',String(calme()));b.textContent=calme()?'Rétablir les animations':'Réduire les animations'}
b.addEventListener('click',function(){var on=!calme();H.classList.toggle('calme',on);try{localStorage.setItem('aime-zero-calme',on?'1':'0')}catch(e){}orbe.animer(!on);if(on){phrases.forEach(function(p){p.style.opacity='';p.style.transform=''})}etiquette()});
if(calme())orbe.animer(false);etiquette();
})();
