/* AIME INFINITY · rendu (Canvas 2D). Ne décide de rien : il montre ce que la logique a déjà calculé.
   - un seul canvas, jamais un élément par case ;
   - les cases fixes sont dessinées une fois dans une image en mémoire, puis effacées une à une quand elles explosent ;
   - niveau de détail : sous 9 px, une case devient une tache dont l'intensité dit sa puissance ;
   - effets plafonnés (éclats, particules) pour rester fluide sur téléphone ;
   - réduction des animations : pas d'ondes qui grandissent, pas de zoom, de simples fondus. */
(function(root,factory){root.AIMEInfinityRendu=factory(root.AIMEInfinityRegles)})(typeof self!=='undefined'?self:this,function(R){'use strict';
var PAL=[[251,113,133],[245,158,11],[124,92,255],[34,211,238]];
function teinte(u){u=Math.max(0,Math.min(.9999,u))*(PAL.length-1);var i=Math.floor(u),f=u-i,a=PAL[i],b=PAL[i+1];return[a[0]+(b[0]-a[0])*f|0,a[1]+(b[1]-a[1])*f|0,a[2]+(b[2]-a[2])*f|0]}
function rgba(c,a){return'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

function creer(cv,opts){opts=opts||{};var g=cv.getContext('2d'),DPR=Math.min(2,window.devicePixelRatio||1),W=0,H=0,zone={x:0,y:0,s:100};
 var G=null,n=2,c=50,cache=document.createElement('canvas'),cg=cache.getContext('2d'),couleurs=[],evts=[],eclats=[],parts=[],vise=null,loupe=null,curseur=null,actif=false,trans=null,fondu=0;
 var reduit=matchMedia('(prefers-reduced-motion: reduce)').matches;matchMedia('(prefers-reduced-motion: reduce)').addEventListener&&matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',function(e){reduit=e.matches});
 function taille(z){W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';zone=z;if(G)construire();boucle()}
 function pos(i){return{x:zone.x+(i%n)*c,y:zone.y+((i/n)|0)*c}}
 function construire(){c=zone.s/n;cache.width=Math.round(zone.s*DPR);cache.height=Math.round(zone.s*DPR);cg.setTransform(DPR,0,0,DPR,0,0);cg.clearRect(0,0,zone.s,zone.s);
  couleurs=new Array(n*n);for(var i=0;i<n*n;i++){var x=i%n,y=(i/n)|0;couleurs[i]=teinte(n===1?0:(x+y)/(2*(n-1))*.85+((x*7+y*13)%5)*.006)}
  for(var j=0;j<n*n;j++)if(G.vivant[j])dessiner(cg,j,(j%n)*c,((j/n)|0)*c,c)}
 /* une case : la forme dit la nature (anneaux = portée de l'onde, trait = rayon, point = poussière) ; la couleur n'est qu'un plus */
 function dessiner(q,i,x,y,s){var t=G.g.cases[i],col=couleurs[i],gap=s>=9?s*.1:s>=4?.5:0,w=s-gap*2,X=x+gap,Y=y+gap;
  if(s<9){q.fillStyle=rgba(col,t===0?.16:t>=4?.75:[0,.38,.62,.92][t]);q.fillRect(X,Y,w,w);if(t>=4&&s>=4){q.fillStyle='rgba(255,255,255,.85)';if(t===R.RAYON_H)q.fillRect(X,Y+w/2-.5,w,1);else q.fillRect(X+w/2-.5,Y,1,w)}return}
  rr(q,X,Y,w,w,w*.22);q.fillStyle=rgba(col,t===0?.07:t>=4?.16:[0,.14,.2,.28][t]);q.fill();
  var lw=Math.max(1,s*.045);q.lineWidth=lw;
  if(t===0){q.beginPath();q.arc(X+w/2,Y+w/2,Math.max(1.2,w*.08),0,6.283);q.fillStyle=rgba(col,.6);q.fill();return}
  if(t>=4){q.strokeStyle='rgba(255,255,255,.92)';q.lineCap='round';q.lineWidth=Math.max(1.5,s*.075);q.beginPath();if(t===R.RAYON_H){q.moveTo(X+w*.14,Y+w/2);q.lineTo(X+w*.86,Y+w/2)}else{q.moveTo(X+w/2,Y+w*.14);q.lineTo(X+w/2,Y+w*.86)}q.stroke();
   q.fillStyle=rgba(col,1);[[.14,.5],[.86,.5]].forEach(function(p){var a=t===R.RAYON_H?p:[p[1],p[0]];q.beginPath();q.arc(X+w*a[0],Y+w*a[1],Math.max(1.5,w*.07),0,6.283);q.fill()});return}
  q.strokeStyle=rgba(col,.95);for(var r=0;r<t;r++){var ins=w*(.36-r*.12);rr(q,X+ins,Y+ins,w-ins*2,w-ins*2,(w-ins*2)*.3);q.stroke()}}
 function effacer(i){var x=(i%n)*c,y=((i/n)|0)*c;cg.clearRect(x-.5,y-.5,c+1,c+1)}

 /* ---- la boucle : elle ne tourne que lorsqu'il y a quelque chose à montrer ---- */
 function boucle(){if(!actif){actif=true;requestAnimationFrame(image)}}
 function image(now){actif=false;g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,W,H);var occupe=false;
  if(trans){occupe=dessinerTransition(now)||occupe}
  else if(G){/* explosions dues à cet instant */
   for(var k=0;k<evts.length;k++){var e=evts[k];if(e.fait||now<e.t)continue;e.fait=true;effacer(e.i);naitre(e,now)}
   evts=evts.filter(function(e){return!e.fait});
   g.globalAlpha=fondu?Math.min(1,(now-fondu)/260):1;if(g.globalAlpha>=1)fondu=0;g.drawImage(cache,zone.x,zone.y,zone.s,zone.s);g.globalAlpha=1;
   occupe=evts.length>0||fondu>0}
  occupe=effets(now)||occupe;
  if(!trans&&G)occupe=apercu(now)||occupe;
  if(occupe)boucle()}
 function naitre(e,now){var p=pos(e.i),t=G.g.cases[e.i],col=couleurs[e.i];if(eclats.length<700)eclats.push({x:p.x,y:p.y,t:now,type:t,col:col,i:e.i});
  if(!reduit&&parts.length<260&&c>=4){var k=c>=16?3:1;for(var q=0;q<k;q++){var a=Math.random()*6.283,v=.02+Math.random()*.05;parts.push({x:p.x+c/2,y:p.y+c/2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:now,col:col,s:Math.max(1.2,c*.08)})}}}
 function effets(now){var u=unite;
  eclats=eclats.filter(function(e){var age=now-e.t,dureeOnde=e.type>=1&&e.type<=3?Math.max(220,e.type*R.COUT_ONDE*u):e.type>=4?n*R.COUT_RAYON*u:0,vie=Math.max(300,dureeOnde+120);if(age>vie)return false;
   var x=e.x,y=e.y,k=Math.min(1,age/280);
   /* l'éclat de la case elle-même : doux, jamais un flash plein écran */
   if(k<1){var sc=reduit?1:1+k*.35,w=c*sc;g.globalAlpha=(1-k)*.85;rr(g,x+c/2-w/2,y+c/2-w/2,w,w,w*.24);g.fillStyle=rgba(e.col,1);g.fill();g.globalAlpha=1}
   /* l'onde : un carré qui grandit exactement jusqu'à sa portée, au rythme de la propagation */
   if(!reduit&&dureeOnde&&c>=3){var f=Math.min(1,age/dureeOnde);g.globalAlpha=(1-f)*.55;g.strokeStyle=rgba(e.col,1);g.lineWidth=Math.max(1,c*.06);
    if(e.type<=3){var r=(.5+f*e.type)*c;rr(g,x+c/2-r,y+c/2-r,r*2,r*2,Math.min(r*.4,c*.6));g.stroke()}
    else{var L=f*n*c;g.beginPath();if(e.type===R.RAYON_H){g.moveTo(Math.max(zone.x,x+c/2-L),y+c/2);g.lineTo(Math.min(zone.x+zone.s,x+c/2+L),y+c/2)}else{g.moveTo(x+c/2,Math.max(zone.y,y+c/2-L));g.lineTo(x+c/2,Math.min(zone.y+zone.s,y+c/2+L))}g.lineWidth=Math.max(1.5,c*.12);g.stroke()}
    g.globalAlpha=1}
   return true});
  parts=parts.filter(function(p){var age=now-p.t;if(age>700)return false;var cx=zone.x+zone.s/2,cy=zone.y+zone.s/2;
   if(trans&&trans.phase===0){p.x+=(cx-p.x)*.12;p.y+=(cy-p.y)*.12}else{p.x+=p.vx*16;p.y+=p.vy*16}
   g.globalAlpha=(1-age/700)*.9;g.fillStyle=rgba(p.col,1);g.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);g.globalAlpha=1;return true});
  return eclats.length>0||parts.length>0}

 /* viser : la case visée, sa portée exacte (la première onde, pas toute la cascade), et une loupe sous le doigt */
 function apercu(now){var i=vise!=null?vise:curseur;if(i==null||!G||!G.vivant[i])return false;var p=pos(i),t=G.g.cases[i],col=couleurs[i];
  g.save();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2;rr(g,p.x+.5,p.y+.5,c-1,c-1,c*.22);g.stroke();
  g.setLineDash([4,4]);g.strokeStyle=rgba(col,.9);g.lineWidth=1.5;
  if(t>=1&&t<=3){var x0=Math.max(zone.x,p.x-t*c),y0=Math.max(zone.y,p.y-t*c),x1=Math.min(zone.x+zone.s,p.x+(t+1)*c),y1=Math.min(zone.y+zone.s,p.y+(t+1)*c);rr(g,x0,y0,x1-x0,y1-y0,c*.3);g.stroke()}
  else if(t===R.RAYON_H){g.strokeRect(zone.x,p.y,zone.s,c)}else if(t===R.RAYON_V){g.strokeRect(p.x,zone.y,c,zone.s)}
  g.restore();
  if(loupe&&c<30){var R0=58,lx=Math.max(R0+6,Math.min(W-R0-6,loupe.x)),ly=Math.max(R0+6,loupe.y-R0-46),z=Math.max(2.4,34/c),sw=R0*2/z;
   g.save();g.beginPath();g.arc(lx,ly,R0,0,6.283);g.fillStyle='#0A0A0C';g.fill();g.clip();
   var sx=(p.x+c/2-zone.x)-sw/2,sy=(p.y+c/2-zone.y)-sw/2;g.imageSmoothingEnabled=false;g.drawImage(cache,sx*DPR,sy*DPR,sw*DPR,sw*DPR,lx-R0,ly-R0,R0*2,R0*2);
   g.strokeStyle='#fff';g.lineWidth=2;rr(g,lx-c*z/2,ly-c*z/2,c*z,c*z,c*z*.22);g.stroke();g.restore();
   g.beginPath();g.arc(lx,ly,R0,0,6.283);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.stroke()}
  return false}

 /* ---- la transformation infinie : le monde terminé se rassemble en un point, la caméra recule, un monde quatre fois plus grand éclot ---- */
 function dessinerTransition(now){var T=trans,age=now-T.t,cx=zone.x+zone.s/2,cy=zone.y+zone.s/2;
  if(reduit){if(age<220){g.globalAlpha=1-age/220;g.drawImage(T.ancien,zone.x,zone.y,zone.s,zone.s)}else{if(!T.bascule){T.bascule=true;T.suite()}g.globalAlpha=Math.min(1,(age-220)/260);g.drawImage(cache,zone.x,zone.y,zone.s,zone.s)}g.globalAlpha=1;if(age>500){trans=null;T.fin&&T.fin();return false}return true}
  var A=520,B=1050;
  if(age<A){T.phase=0;var k=age/A,e=1-Math.pow(1-k,3),core=zone.s*(.04+.06*Math.sin(k*3.14));
   /* le cadre de l'ancien monde se contracte vers son centre */
   var s=zone.s*(1-e*.94);g.strokeStyle='rgba(255,255,255,'+(.35*(1-k))+')';g.lineWidth=1;rr(g,cx-s/2,cy-s/2,s,s,Math.min(24,s*.1));g.stroke();
   orbe(cx,cy,core,1);return true}
  if(!T.bascule){T.bascule=true;T.suite()}
  var k2=Math.min(1,(age-A)/B),e2=1-Math.pow(1-k2,3),z=2-e2;
  /* caméra qui recule : le nouveau monde arrive grossi deux fois, puis prend sa place, révélé depuis le centre par anneaux carrés */
  var rev=e2*1.05*zone.s/2;g.save();g.translate(cx,cy);g.scale(z,z);g.translate(-cx,-cy);g.beginPath();g.rect(cx-rev,cy-rev,rev*2,rev*2);g.clip();g.drawImage(cache,zone.x,zone.y,zone.s,zone.s);g.restore();
  orbe(cx,cy,zone.s*.1*(1-e2)+c*.2*(1-e2),1-e2);
  if(k2>=1){trans=null;T.fin&&T.fin();return false}return true}
 function orbe(x,y,r,a){if(r<.5||a<=0)return;var gr=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);gr.addColorStop(0,'rgba(255,255,255,'+a+')');gr.addColorStop(.35,'rgba(251,113,133,'+a+')');gr.addColorStop(.7,'rgba(124,92,255,'+a+')');gr.addColorStop(1,'rgba(34,211,238,0)');
  g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.283);g.fill();var h=g.createRadialGradient(x,y,r*.5,x,y,r*3);h.addColorStop(0,'rgba(124,92,255,'+(.35*a)+')');h.addColorStop(1,'rgba(124,92,255,0)');g.fillStyle=h;g.beginPath();g.arc(x,y,r*3,0,6.283);g.fill()}

 var unite=26;
 return{
  taille:taille,reduit:function(){return reduit},
  grille:function(nouvelle,o){G=nouvelle;n=G.n;evts=[];eclats=[];vise=null;curseur=null;construire();if(o&&o.fondu)fondu=performance.now();boucle()},
  /* programme les explosions d'une cascade ; renvoie la durée en ms et les vagues (pour la musique) */
  cascade:function(r){var d=r.duree,total=Math.max(420,Math.min(2600,d*30));unite=d?total/d:26;if(reduit)unite=Math.min(unite,8);var t0=performance.now();
   r.ordre.forEach(function(i){evts.push({i:i,t:t0+r.t[i]*unite})});boucle();
   var vagues=[],seau={};r.ordre.forEach(function(i){var b=Math.round(r.t[i]*unite/70);(seau[b]=seau[b]||[]).push(i)});
   Object.keys(seau).map(Number).sort(function(a,b){return a-b}).forEach(function(b){var L=seau[b],mx=0;L.forEach(function(i){mx+=i%n});vagues.push({t:b*.07,n:L.length,x:(mx/L.length/(n-1||1))*2-1})});
   return{ms:r.ordre.length?r.t[r.ordre[r.ordre.length-1]]*unite+300:0,vagues:vagues}},
  /* une case sous le point (x, y), ou −1 */
  caseA:function(x,y){var u=Math.floor((x-zone.x)/c),v=Math.floor((y-zone.y)/c);return u>=0&&v>=0&&u<n&&v<n?v*n+u:-1},
  viser:function(i,l){vise=i;loupe=l||null;boucle()},
  curseur:function(i){curseur=i;boucle()},
  transition:function(suite,fin){var anc=document.createElement('canvas');anc.width=cache.width;anc.height=cache.height;anc.getContext('2d').drawImage(cache,0,0);trans={t:performance.now(),ancien:anc,suite:suite,fin:fin,phase:0};boucle()},
  passer:function(){if(trans){var T=trans;if(!T.bascule){T.bascule=true;T.suite()}trans=null;T.fin&&T.fin();boucle()}},
  enTransition:function(){return!!trans},
  taillCase:function(){return c},
  boucle:boucle};
}
return{creer:creer,teinte:teinte};
});
