/* AIME STITCH · le coût réel de broderie (indicateur expérimental, explicable et réglable).
   Deux patrons de même taille peuvent demander des efforts très différents : confettis, changements de fil,
   régions dispersées. L'indicateur additionne des « équivalents points » avec des poids visibles, à régler
   après tests auprès de vraies brodeuses. Il ne promet aucune durée exacte. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./patron.js'));else root.StitchMesures=factory(root.StitchPatron)})(typeof self!=='undefined'?self:this,function(P){'use strict';
var POIDS={point:1,isole:3,changement:6,region:2,contour:.6,demi:.8};
var CADENCE={lente:100,moyenne:140,rapide:200};/* points par heure, hypothèses affichées */
function mesurer(p,poids){poids=Object.assign({},POIDS,poids||{});var l=p.l,h=p.h,m=P.matrice(p),N=0,isoles=0;
 for(var i=0;i<m.length;i++){if(!m[i])continue;N++;var x=i%l,y=(i/l)|0,seul=true;for(var dy=-1;dy<=1&&seul;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<l&&yy<h&&m[yy*l+xx]===m[i]){seul=false;break}}if(seul)isoles++}
 /* changements de fil : on brode bloc de 10 × 10 par bloc ; chaque couleur présente dans un bloc = un fil à enfiler */
 var changements=0;for(var by=0;by<h;by+=10)for(var bx=0;bx<l;bx+=10){var vu={};for(var y2=by;y2<Math.min(h,by+10);y2++)for(var x2=bx;x2<Math.min(l,bx+10);x2++){var v=m[y2*l+x2];if(v)vu[v]=1}changements+=Object.keys(vu).length}
 /* dispersion : nombre de régions (4-connexes) par couleur */
 var vus=new Uint8Array(l*h),regions=0;for(var s=0;s<m.length;s++){if(vus[s]||!m[s])continue;regions++;var pile=[s],c=m[s];vus[s]=1;while(pile.length){var u=pile.pop(),ux=u%l,uy=(u/l)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var vx=ux+d[0],vy=uy+d[1];if(vx<0||vy<0||vx>=l||vy>=h)return;var w=vy*l+vx;if(!vus[w]&&m[w]===c){vus[w]=1;pile.push(w)}})}}
 var contour=(p.contours||[]).reduce(function(a,c){for(var k=1;k<c.pts.length;k++)a+=Math.hypot(c.pts[k][0]-c.pts[k-1][0],c.pts[k][1]-c.pts[k-1][1]);return a},0),demi=(p.demi||[]).length;
 var parts={points:N*poids.point,isoles:isoles*poids.isole,changements:changements*poids.changement,regions:regions*poids.region,contours:contour*poids.contour,demi:demi*poids.demi};
 var effort=Object.keys(parts).reduce(function(a,k){return a+parts[k]},0),indice=N?effort/N:0,K=p.palette.length;
 var niveau=K<=8&&indice<2?"Débutant":K<=16&&indice<2.6?"Intermédiaire":K<=28&&indice<3.5?"Confirmé":"Expert";
 return{points:N,couleurs:K,isoles:isoles,changements:changements,regions:regions,contours:+contour.toFixed(1),demi:demi,parts:parts,poids:poids,effort:Math.round(effort),indice:+indice.toFixed(2),niveau:niveau,
  heures:{min:Math.round(effort/CADENCE.rapide),max:Math.round(effort/CADENCE.lente)},cadence:CADENCE,
  conseils:conseils(N,isoles,regions,K,changements)}}
/* des simplifications pertinentes, jamais appliquées sans accord */
function conseils(N,isoles,regions,K,ch){var c=[];if(N&&isoles/N>.02)c.push({id:'isoles',texte:isoles+' points isolés : les supprimer allégerait le travail sans changer l\'allure générale.'});
 if(K>20)c.push({id:'couleurs',texte:K+' couleurs : regrouper les nuances voisines réduirait les changements de fil.'});
 if(N&&regions/N>.08)c.push({id:'regions',texte:'Beaucoup de petites régions : fusionner les plus petites rendrait le motif plus reposant.'});return c}
return{POIDS:POIDS,CADENCE:CADENCE,mesurer:mesurer};
});
