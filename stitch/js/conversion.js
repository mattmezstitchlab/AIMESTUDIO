/* AIME STITCH · moteur de conversion image → patron. Déterministe, sans IA : chaque étape est un calcul explicite,
   paramétré par le mode choisi. Les pixels de l'image ne sont jamais confondus avec les points : l'image est d'abord
   ramenée à la taille du patron (un point = une moyenne de pixels), puis tout se joue sur les points.

   Étapes : 1 redimensionnement (moyenne par surface, en lumière linéaire) · 2 segmentation (force des contours)
   3 regroupement des couleurs (k-moyennes en CIELAB, départ déterministe) · 4 correspondance DMC (CIEDE2000)
   5 fond = toile non brodée (option) · 6 points isolés · 7 petites régions · 8 préservation des détails
   9 symboles · 10 vérification (fidélité, confettis restants). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./couleur.js'));else root.StitchConversion=factory(root.StitchCouleur)})(typeof self!=='undefined'?self:this,function(C){'use strict';

/* les quatre modes : des paramètres explicites, rien de caché */
var MODES={
 simple:{nom:'Simple',couleurs:8,isoles:true,region:6,detail:0,lissage:1,usageMin:.012,description:'Peu de couleurs, de grandes régions faciles à broder.'},
 equilibre:{nom:'Équilibré',couleurs:16,isoles:true,region:3,detail:.55,lissage:.5,usageMin:.004,description:'Compromis entre fidélité et faisabilité.'},
 precis:{nom:'Précis',couleurs:28,isoles:true,region:1,detail:.35,lissage:0,usageMin:.0015,description:'Davantage de détails et de nuances.'},
 expert:{nom:'Expert',couleurs:20,isoles:true,region:2,detail:.45,lissage:.25,usageMin:.002,description:'Tous les réglages accessibles, contours renforcés.'}
};

function lin(c){c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}
function gam(v){v=v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055;return Math.round(Math.max(0,Math.min(1,v))*255)}
function alea(s){var a=s>>>0||1;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}

/* 1 · redimensionnement : chaque point reçoit la moyenne (linéaire) des pixels qu'il recouvre ; la transparence devient toile */
function reduire(img,l,h){var W=img.l,H=img.h,d=img.data,out=new Float32Array(l*h*4);
 for(var y=0;y<h;y++){var y0=y*H/h,y1=(y+1)*H/h;for(var x=0;x<l;x++){var x0=x*W/l,x1=(x+1)*W/l,r=0,g=0,b=0,a=0,s=0;
  for(var py=Math.floor(y0);py<Math.ceil(y1);py++)for(var px=Math.floor(x0);px<Math.ceil(x1);px++){var wy=Math.min(y1,py+1)-Math.max(y0,py),wx=Math.min(x1,px+1)-Math.max(x0,px),w=wx*wy;if(w<=0)continue;var i=(py*W+px)*4,al=d[i+3]/255;r+=lin(d[i])*w*al;g+=lin(d[i+1])*w*al;b+=lin(d[i+2])*w*al;a+=al*w;s+=w}
  var o=(y*l+x)*4;out[o]=a?r/a:0;out[o+1]=a?g/a:0;out[o+2]=a?b/a:0;out[o+3]=s?a/s:0}}
 return out}
/* lissage léger qui préserve les bords (moyenne des voisins proches en couleur) */
function lisser(lab,l,h,force){if(!force)return lab;var out=lab.map(function(v){return v.slice()});
 for(var y=0;y<h;y++)for(var x=0;x<l;x++){var i=y*l+x,c=lab[i];if(!c)continue;var s=[c[0],c[1],c[2]],n=1;
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=l||yy>=h)continue;var v=lab[yy*l+xx];if(!v||C.de76(v,c)>12)continue;s[0]+=v[0]*force;s[1]+=v[1]*force;s[2]+=v[2]*force;n+=force}
  out[i]=[s[0]/n,s[1]/n,s[2]/n]}return out}
/* 2 · segmentation : force des contours (Sobel sur la clarté), pour protéger les détails */
function contours(lab,l,h){var e=new Float32Array(l*h),L=function(x,y){x=Math.max(0,Math.min(l-1,x));y=Math.max(0,Math.min(h-1,y));var v=lab[y*l+x];return v?v[0]:100};
 for(var y=0;y<h;y++)for(var x=0;x<l;x++){var gx=L(x+1,y-1)+2*L(x+1,y)+L(x+1,y+1)-L(x-1,y-1)-2*L(x-1,y)-L(x-1,y+1),gy=L(x-1,y+1)+2*L(x,y+1)+L(x+1,y+1)-L(x-1,y-1)-2*L(x,y-1)-L(x+1,y-1);e[y*l+x]=Math.min(1,Math.hypot(gx,gy)/160)}return e}
/* 3 · k-moyennes en CIELAB sur l'histogramme des couleurs, départ k-means++ à graine fixe */
function kmoyennes(lab,k,graine){var h={},keys=[];lab.forEach(function(c){if(!c)return;var key=Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2]);if(!h[key]){h[key]={c:c,n:0};keys.push(key)}h[key].n++});
 var pts=keys.map(function(q){return h[q]});k=Math.min(k,pts.length);if(!k)return[];var r=alea(graine||1),centres=[pts.reduce(function(a,b){return b.n>a.n?b:a}).c.slice()];
 while(centres.length<k){var dist=pts.map(function(p){var m=Infinity;centres.forEach(function(c){var d=C.de76(p.c,c);if(d<m)m=d});return m*m*p.n}),tot=dist.reduce(function(a,b){return a+b},0),t=r()*tot,j=0;while(j<pts.length-1&&(t-=dist[j])>0)j++;centres.push(pts[j].c.slice())}
 for(var it=0;it<14;it++){var acc=centres.map(function(){return[0,0,0,0]});pts.forEach(function(p){var b=0,bd=Infinity;centres.forEach(function(c,i){var d=C.de76(p.c,c);if(d<bd){bd=d;b=i}});var a=acc[b];a[0]+=p.c[0]*p.n;a[1]+=p.c[1]*p.n;a[2]+=p.c[2]*p.n;a[3]+=p.n});
  var bouge=0;centres=centres.map(function(c,i){var a=acc[i];if(!a[3])return c;var n=[a[0]/a[3],a[1]/a[3],a[2]/a[3]];bouge=Math.max(bouge,C.de76(n,c));return n});if(bouge<.3)break}
 return centres}
/* 4 · correspondance DMC : le fil existant le plus proche (CIEDE2000). Les références ne sont jamais inventées. */
function prochesDMC(centres,dmc){var out=[],vu={};centres.forEach(function(c){var b=null,bd=Infinity;for(var i=0;i<dmc.length;i++){var d=C.de2000(c,dmc[i].lab);if(d<bd){bd=d;b=dmc[i]}}if(b&&!vu[b.code]){vu[b.code]=1;out.push({dmc:b,ecart:bd})}});return out}

function voisins8(x,y,l,h,f){for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<l&&yy<h)f(yy*l+xx)}}
function majorite(P,i,l,h,exclure){var x=i%l,y=(i/l)|0,cpt={},best=-1,bn=0;voisins8(x,y,l,h,function(j){var v=P[j];if(v===exclure)return;cpt[v]=(cpt[v]||0)+1;if(cpt[v]>bn){bn=cpt[v];best=v}});return best}

/* la conversion complète. img = {l, h, data (RGBA)} ; o = {mode, largeur, fond:'auto'|'aucun', dmc:[{code, nom, hex}], graine} */
function convertir(img,o){var t0=Date.now(),m=Object.assign({},MODES[o.mode||'equilibre'],o.reglages||{}),l=o.largeur||80,h=Math.max(1,Math.round(l*img.h/img.l)),N=l*h;
 var dmc=o.dmc.map(function(d){var rgb=C.hex(d.hex);return{code:d.code,nom:d.nom,hex:d.hex,lab:C.lab(rgb[0],rgb[1],rgb[2])}});
 var red=reduire(img,l,h),lab=new Array(N);for(var i=0;i<N;i++){var q=i*4;lab[i]=red[q+3]<.5?null:C.lab(gam(red[q]),gam(red[q+1]),gam(red[q+2]))}
 var source=lab;lab=lisser(lab,l,h,m.lissage);var bord=contours(source,l,h);
 var centres=kmoyennes(lab,m.couleurs,o.graine||7),pal=prochesDMC(centres,dmc);
 /* 5 · la toile : la couleur dominante du pourtour, si elle l'occupe largement, n'est pas brodée */
 var P=new Int16Array(N),plabs=pal.map(function(p){return p.dmc.lab});
 for(var a=0;a<N;a++){if(!lab[a]){P[a]=-1;continue}var b=0,bd=Infinity;for(var k=0;k<plabs.length;k++){var d=C.de2000(lab[a],plabs[k]);if(d<bd){bd=d;b=k}}P[a]=b}
 var fond=-1;if(o.fond!=='aucun'){var cpt={},tour=0;for(var x=0;x<l;x++)[x,(h-1)*l+x].forEach(function(j){if(P[j]>=0){cpt[P[j]]=(cpt[P[j]]||0)+1;tour++}});for(var y=0;y<h;y++)[y*l,y*l+l-1].forEach(function(j){if(P[j]>=0){cpt[P[j]]=(cpt[P[j]]||0)+1;tour++}});
  Object.keys(cpt).forEach(function(c){if(cpt[c]/Math.max(1,tour)>.55)fond=+c});if(fond>=0&&pal[fond].dmc.lab[0]<70)fond=-1}
 if(fond>=0)for(var f=0;f<N;f++)if(P[f]===fond)P[f]=-1;
 /* 6 · points isolés (aucun voisin de la même couleur), sauf détail fort à protéger (8) */
 var isoles=0,proteges=0;if(m.isoles){var Q=Int16Array.from(P);for(var s=0;s<N;s++){if(P[s]<0)continue;var x2=s%l,y2=(s/l)|0,meme=0;voisins8(x2,y2,l,h,function(j){if(P[j]===P[s])meme++});if(meme)continue;
   if(m.detail&&bord[s]>m.detail){proteges++;continue}Q[s]=majorite(P,s,l,h,P[s]);isoles++}P=Q}
 /* 7 · petites régions (4-connexes) fondues dans la couleur voisine dominante */
 var fondues=0;if(m.region>1){var vu=new Uint8Array(N);for(var r0=0;r0<N;r0++){if(vu[r0]||P[r0]<0)continue;var c0=P[r0],pile=[r0],reg=[];vu[r0]=1;
   while(pile.length){var u=pile.pop();reg.push(u);var ux=u%l,uy=(u/l)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dd){var vx=ux+dd[0],vy=uy+dd[1];if(vx<0||vy<0||vx>=l||vy>=h)return;var v=vy*l+vx;if(!vu[v]&&P[v]===c0){vu[v]=1;pile.push(v)}})}
   if(reg.length<m.region){var detail=reg.some(function(z){return m.detail&&bord[z]>m.detail+.15});if(detail)continue;var cc={},bb=-2,bn=0;reg.forEach(function(z){voisins8(z%l,(z/l)|0,l,h,function(j){if(P[j]!==c0){cc[P[j]]=(cc[P[j]]||0)+1;if(cc[P[j]]>bn){bn=cc[P[j]];bb=P[j]}}})});if(bb>-2){reg.forEach(function(z){P[z]=bb});fondues+=reg.length}}}}
 /* couleurs trop rares : fusionnées dans la plus proche (« Simple » en supprime davantage) */
 var usage=new Array(pal.length).fill(0),brodes=0;for(var z=0;z<N;z++)if(P[z]>=0){usage[P[z]]++;brodes++}
 var garde=pal.map(function(p,i){return usage[i]>0&&(usage[i]/Math.max(1,brodes)>=m.usageMin||usage[i]>=12)});
 var remap=pal.map(function(p,i){if(garde[i])return i;var b=-1,bd=Infinity;pal.forEach(function(q,j){if(!garde[j]||j===i)return;var d=C.de2000(p.dmc.lab,q.dmc.lab);if(d<bd){bd=d;b=j}});return b});
 for(var w=0;w<N;w++)if(P[w]>=0)P[w]=remap[P[w]];
 /* palette finale, ordonnée par usage ; 0 = toile non brodée, 1..n = couleurs */
 var usage2=new Array(pal.length).fill(0);for(var z2=0;z2<N;z2++)if(P[z2]>=0)usage2[P[z2]]++;
 var ordre=pal.map(function(p,i){return i}).filter(function(i){return usage2[i]>0}).sort(function(a,b){return usage2[b]-usage2[a]});
 var idx={};ordre.forEach(function(i,k){idx[i]=k+1});var points=new Uint16Array(N);for(var v2=0;v2<N;v2++)points[v2]=P[v2]<0?0:idx[P[v2]];
 var palette=ordre.map(function(i,k){return{dmc:pal[i].dmc.code,points:usage2[i]}});
 /* 10 · vérification : fidélité moyenne (CIEDE2000 entre l'image réduite et le fil posé), confettis restants */
 var ecart=0,ne=0;for(var e=0;e<N;e++){if(!source[e]||!points[e])continue;ecart+=C.de2000(source[e],pal[ordre[points[e]-1]].dmc.lab);ne++}
 var restants=0;for(var g=0;g<N;g++){if(!points[g])continue;var mm=0;voisins8(g%l,(g/l)|0,l,h,function(j){if(points[j]===points[g])mm++});if(!mm)restants++}
 return{l:l,h:h,points:points,palette:palette,mode:o.mode||'equilibre',reglages:m,
  rapport:{ms:Date.now()-t0,couleurs:palette.length,points:ne,toile:fond>=0,isolesSupprimes:isoles,detailsProteges:proteges,regionsFondues:fondues,confettisRestants:restants,fidelite:ne?ecart/ne:0}}}

return{MODES:MODES,convertir:convertir,reduire:reduire,kmoyennes:kmoyennes};
});
