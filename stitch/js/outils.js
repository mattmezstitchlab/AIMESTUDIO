/* AIME STITCH · opérations d'édition pures (testables, sans interface) sur le patron canonique.
   - region : les points connectés de même couleur (baguette) ;
   - fondre : une région rejoint la couleur voisine dominante (fusion de zones) ;
   - contourMotif : le backstitch qui suit le bord du motif (ou d'une couleur), en polylignes ;
   - demi : poser, tourner ou retirer un demi-point. Un demi-point et une croix ne partagent jamais une case. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./patron.js'),require('./couleur.js'));else root.StitchOutils=factory(root.StitchPatron,root.StitchCouleur)})(typeof self!=='undefined'?self:this,function(P,C){'use strict';
var V4=[[1,0],[-1,0],[0,1],[0,-1]];
function region(p,i){var m=P.matrice(p),l=p.l,h=p.h,c=m[i],vu=new Uint8Array(m.length),out=[],pile=[i];vu[i]=1;
 while(pile.length){var u=pile.pop();out.push(u);var x=u%l,y=(u/l)|0;V4.forEach(function(d){var X=x+d[0],Y=y+d[1];if(X<0||Y<0||X>=l||Y>=h)return;var w=Y*l+X;if(!vu[w]&&m[w]===c){vu[w]=1;pile.push(w)}})}return out}
/* la couleur la plus présente autour d'une région (hors la sienne) ; 0 = toile */
function voisineDominante(p,cases){var m=P.matrice(p),l=p.l,h=p.h,set={},cpt={},best=-1,bn=0,c=m[cases[0]];cases.forEach(function(i){set[i]=1});
 cases.forEach(function(u){var x=u%l,y=(u/l)|0;V4.forEach(function(d){var X=x+d[0],Y=y+d[1];if(X<0||Y<0||X>=l||Y>=h)return;var w=Y*l+X;if(set[w]||m[w]===c)return;cpt[m[w]]=(cpt[m[w]]||0)+1})});
 /* une couleur brodée voisine l'emporte sur la toile ; la toile seulement s'il n'y a rien d'autre */
 Object.keys(cpt).forEach(function(k){var v=+k;if(v&&cpt[k]>bn){bn=cpt[k];best=v}});if(best<0&&cpt[0])best=0;return best}
function fondre(p,cases){var v=voisineDominante(p,cases);if(v<0)return false;var m=P.matrice(p);cases.forEach(function(i){m[i]=v});return v}
/* les arêtes entre une case « dedans » et une case « dehors », chaînées en polylignes sur les intersections */
function contourMotif(p,dedans){var m=P.matrice(p),l=p.l,h=p.h,est=dedans||function(v){return v>0},seg=[];
 var D=function(x,y){return x>=0&&y>=0&&x<l&&y<h&&est(m[y*l+x])};
 for(var y=0;y<h;y++)for(var x=0;x<l;x++){if(!D(x,y))continue;if(!D(x,y-1))seg.push([x,y,x+1,y]);if(!D(x,y+1))seg.push([x,y+1,x+1,y+1]);if(!D(x-1,y))seg.push([x,y,x,y+1]);if(!D(x+1,y))seg.push([x+1,y,x+1,y+1])}
 /* chaînage : on suit les segments de point en point ; les alignements sont fusionnés */
 var cle=function(x,y){return x+','+y},adj={},pris=new Uint8Array(seg.length);seg.forEach(function(s,i){[cle(s[0],s[1]),cle(s[2],s[3])].forEach(function(k){(adj[k]=adj[k]||[]).push(i)})});
 var lignes=[];for(var i=0;i<seg.length;i++){if(pris[i])continue;pris[i]=1;var s=seg[i],pts=[[s[0],s[1]],[s[2],s[3]]];
  [true,false].forEach(function(avant){for(;;){var bout=avant?pts[pts.length-1]:pts[0],k=cle(bout[0],bout[1]),suiv=(adj[k]||[]).filter(function(j){return!pris[j]})[0];if(suiv==null)break;pris[suiv]=1;var t=seg[suiv],autre=(t[0]===bout[0]&&t[1]===bout[1])?[t[2],t[3]]:[t[0],t[1]];if(avant)pts.push(autre);else pts.unshift(autre)}});
  lignes.push(simplifier(pts))}
 return lignes}
function simplifier(pts){var out=[pts[0]];for(var i=1;i<pts.length-1;i++){var a=out[out.length-1],b=pts[i],c=pts[i+1];if((b[0]-a[0])*(c[1]-b[1])===(b[1]-a[1])*(c[0]-b[0]))continue;out.push(b)}out.push(pts[pts.length-1]);return out}
/* la couleur la plus sombre de la palette : le choix habituel pour un contour */
function plusSombre(p,dmc){var best=null,bl=101;p.palette.forEach(function(c){var d=dmc[c.dmc];if(!d)return;var x=C.hex(d.hex),L=C.lab(x[0],x[1],x[2])[0];if(L<bl){bl=L;best=c}});return best}
/* demi-points : {x, y, s:'/'|'\\', c:id de palette} */
function demi(p,x,y,c){p.demi=p.demi||[];var m=P.matrice(p),i=y*p.l+x,k=-1;p.demi.forEach(function(d,j){if(d.x===x&&d.y===y)k=j});
 if(k<0){m[i]=0;p.demi.push({x:x,y:y,s:'/',c:c});return'/'}
 var d=p.demi[k];if(d.s==='/'&&d.c===c){d.s='\\';return'\\'}p.demi.splice(k,1);return null}
return{region:region,voisineDominante:voisineDominante,fondre:fondre,contourMotif:contourMotif,plusSombre:plusSombre,demi:demi};
});
