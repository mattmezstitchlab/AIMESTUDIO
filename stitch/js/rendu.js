/* AIME STITCH · représentations visuelles d'un patron canonique (Canvas 2D).
   - apercu : la broderie terminée, point par point, sur une toile Aida tissée ;
   - grille : la grille de travail (symboles, couleurs ou les deux), repères 10 × 10, mise en évidence d'une couleur,
     points faits, grande lisibilité. Les deux lisent la même matrice ; aucune ne la copie. */
(function(root,factory){root.StitchRendu=factory(root.StitchPatron,root.StitchSymboles,root.StitchCouleur)})(typeof self!=='undefined'?self:this,function(P,S,C){'use strict';
var DMC={};function tableDMC(t){t.forEach(function(d){DMC[d.code]=d})}
function couleur(code){return(DMC[code]||{}).hex||'#999'}
function clair(hex){var c=C.hex(hex);return(c[0]*299+c[1]*587+c[2]*114)/1000>150}
/* l'aperçu brodé : chaque point = deux brins croisés, avec un léger reflet ; la toile est tissée */
function apercu(cv,p,o){o=o||{};var l=p.l,h=p.h,s=o.case||Math.max(2,Math.floor(Math.min((o.l||cv.clientWidth||600)/l,(o.h||cv.clientHeight||600)/h))),dpr=Math.min(2,window.devicePixelRatio||1);
 cv.width=l*s*dpr;cv.height=h*s*dpr;cv.style.width=l*s+'px';cv.style.height=h*s+'px';var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle=o.toile||'#F4EEE2';g.fillRect(0,0,l*s,h*s);
 if(s>=5){g.fillStyle='rgba(120,100,70,.10)';for(var y=0;y<h;y++)for(var x=0;x<l;x++){g.fillRect(x*s+s*.42,y*s+s*.42,s*.16,s*.16)}g.strokeStyle='rgba(120,100,70,.06)';g.lineWidth=1;for(var k=0;k<=l;k++){g.beginPath();g.moveTo(k*s+.5,0);g.lineTo(k*s+.5,h*s);g.stroke()}for(var q=0;q<=h;q++){g.beginPath();g.moveTo(0,q*s+.5);g.lineTo(l*s,q*s+.5);g.stroke()}}
 var m=P.matrice(p),cols=p.palette.map(function(c){return couleur(c.dmc)});
 for(var i=0;i<m.length;i++){var v=m[i];if(!v)continue;var x0=(i%l)*s,y0=((i/l)|0)*s,col=cols[v-1];
  if(s<5){g.fillStyle=col;g.fillRect(x0,y0,s,s);continue}
  var a=s*.12,lw=s*.34;g.lineCap='round';g.lineWidth=lw;g.strokeStyle=col;g.beginPath();g.moveTo(x0+a,y0+s-a);g.lineTo(x0+s-a,y0+a);g.stroke();g.beginPath();g.moveTo(x0+a,y0+a);g.lineTo(x0+s-a,y0+s-a);g.stroke();
  g.lineWidth=lw*.28;g.strokeStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(x0+a*1.4,y0+a*1.6);g.lineTo(x0+s-a*1.8,y0+s-a*2.2);g.stroke();
  g.strokeStyle='rgba(0,0,0,.12)';g.beginPath();g.moveTo(x0+a*1.6,y0+s-a*1.2);g.lineTo(x0+s-a*1.2,y0+a*1.6);g.stroke()}
 (p.contours||[]).forEach(function(c){var pal=p.palette.filter(function(z){return z.id===c.c})[0];g.strokeStyle=pal?couleur(pal.dmc):'#222';g.lineWidth=Math.max(1,s*.18);g.beginPath();c.pts.forEach(function(pt,j){j?g.lineTo(pt[0]*s,pt[1]*s):g.moveTo(pt[0]*s,pt[1]*s)});g.stroke()});
 return s}
/* la grille de travail. vue = {x, y (premier point visible), s (taille d'une case en px)} ; o = {mode, surbrillance (index palette), fait (Uint8Array), grand, limite} */
function grille(g,p,vue,W,H,o){o=o||{};var l=p.l,h=p.h,s=vue.s,m=P.matrice(p),x0=Math.max(0,Math.floor(vue.x)),y0=Math.max(0,Math.floor(vue.y)),x1=Math.min(l,Math.ceil(vue.x+W/s)),y1=Math.min(h,Math.ceil(vue.y+H/s));
 var ox=-vue.x*s,oy=-vue.y*s,mode=o.mode||'mixte',hl=o.surbrillance||0,cols=p.palette.map(function(c){return couleur(c.dmc)});
 g.fillStyle=o.fond||'#F5F5F7';g.fillRect(0,0,W,H);g.fillStyle='#FFFFFF';g.fillRect(ox,oy,l*s,h*s);
 for(var y=y0;y<y1;y++)for(var x=x0;x<x1;x++){var v=m[y*l+x];if(!v)continue;if(o.limite&&!o.limite(x,y))continue;var X=ox+x*s,Y=oy+y*s,col=cols[v-1],fait=o.fait&&o.fait[y*l+x],eteint=hl&&v!==hl;
  if(mode!=='symboles'){g.globalAlpha=eteint?.12:fait?.35:mode==='couleurs'?1:.55;g.fillStyle=col;g.fillRect(X,Y,s,s);g.globalAlpha=1}
  if(mode!=='couleurs'&&s>=8&&!eteint){var ink=mode==='symboles'?'#1F1B16':clair(col)?'#1F1B16':'#FFFFFF';S.dessiner(g,p.palette[v-1].symbole,X+s*.08,Y+s*.08,s*.84,fait?'rgba(31,27,22,.35)':ink)}
  if(fait&&s>=6){g.strokeStyle=o.grand?'#1F1B16':'rgba(31,27,22,.55)';g.lineWidth=Math.max(1,s*.06);g.beginPath();g.moveTo(X+s*.15,Y+s*.85);g.lineTo(X+s*.85,Y+s*.15);g.stroke()}}
 /* lignes : fines à chaque point, fortes tous les 10, numérotées */
 if(s>=5){g.strokeStyle=o.grand?'rgba(31,27,22,.28)':'rgba(31,27,22,.12)';g.lineWidth=1;g.beginPath();for(var a=x0;a<=x1;a++){g.moveTo(Math.round(ox+a*s)+.5,oy+y0*s);g.lineTo(Math.round(ox+a*s)+.5,oy+y1*s)}for(var b=y0;b<=y1;b++){g.moveTo(ox+x0*s,Math.round(oy+b*s)+.5);g.lineTo(ox+x1*s,Math.round(oy+b*s)+.5)}g.stroke()}
 g.strokeStyle=o.grand?'#1F1B16':'rgba(31,27,22,.55)';g.lineWidth=o.grand?2:1.4;g.beginPath();for(var c=Math.ceil(x0/10)*10;c<=x1;c+=10){g.moveTo(Math.round(ox+c*s)+.5,oy+y0*s);g.lineTo(Math.round(ox+c*s)+.5,oy+y1*s)}for(var d=Math.ceil(y0/10)*10;d<=y1;d+=10){g.moveTo(ox+x0*s,Math.round(oy+d*s)+.5);g.lineTo(ox+x1*s,Math.round(oy+d*s)+.5)}g.stroke();
 (p.contours||[]).forEach(function(cc){var pal=p.palette.filter(function(z){return z.id===cc.c})[0];g.strokeStyle=pal?couleur(pal.dmc):'#222';g.lineWidth=Math.max(1.5,s*.14);g.beginPath();cc.pts.forEach(function(pt,j){var X=ox+pt[0]*s,Y=oy+pt[1]*s;j?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke()})}
/* une pastille de légende : la couleur, le symbole par-dessus */
function pastille(cv,code,sym,s){var dpr=Math.min(2,window.devicePixelRatio||1);cv.width=s*dpr;cv.height=s*dpr;cv.style.width=s+'px';cv.style.height=s+'px';var g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);var col=couleur(code);g.fillStyle=col;g.fillRect(0,0,s,s);S.dessiner(g,sym,s*.12,s*.12,s*.76,clair(col)?'#1F1B16':'#fff')}
return{tableDMC:tableDMC,couleur:couleur,clair:clair,apercu:apercu,grille:grille,pastille:pastille,DMC:DMC};
});
