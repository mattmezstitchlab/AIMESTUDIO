/* AIME INFINITY · génération des grilles (déterministe, toujours résoluble).
   Niveau L : grille 2^L × 2^L. Même graine → même grille, pour tout le monde.
   Chaque grille est mesurée par l'optimum exact (regles.optimum) : le budget d'actions vaut optimum + marge.
   Une grille est donc résoluble par construction ; la marge se resserre avec la taille. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./regles.js'));else root.AIMEInfinityNiveaux=factory(root.AIMEInfinityRegles)})(typeof self!=='undefined'?self:this,function(R){'use strict';

function hache(s){var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h}
function alea(g){var a=g>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}

/* objectif d'optimum par niveau (bornes), marge d'actions, part de rayons */
var CIBLE=[null,[1,1],[1,2],[2,3],[3,5],[5,8],[8,12],[12,18],[18,26]];
var MARGE=[0,0,1,1,1,2,2,3,4];
var RAYONS=[0,0,0,0,.012,.01,.008,.006,.005];
var MAX=7;
/* au-delà de 2 × 2, toucher au hasard ne doit pas suffire : part maximale de « bons départs » */
var FACILE=[1,1,.5,.35,.25,.2,.2,.2,.2];

/* un champ continu (bruit de valeur lissé) : les puissances forment des régions lisibles, pas du sel et poivre */
function champ(n,g,r){var m=Math.max(2,Math.round(n/g))+1,P=[];for(var i=0;i<m*m;i++)P.push(r());var s=function(t){return t*t*(3-2*t)};
 return function(x,y){var fx=x/(n)*(m-1),fy=y/(n)*(m-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(m-1,x0+1),y1=Math.min(m-1,y0+1),tx=s(fx-x0),ty=s(fy-y0);
  var a=P[y0*m+x0]+(P[y0*m+x1]-P[y0*m+x0])*tx,b=P[y1*m+x0]+(P[y1*m+x1]-P[y1*m+x0])*tx;return a+(b-a)*ty}}

function essai(L,graine,dens){var n=1<<L,N=n*n,k=new Int8Array(N),r=alea(graine);
 if(L===1){k.fill(1);return k}
 var f=champ(n,L<=3?2:4,r);
 for(var i=0;i<N;i++){var v=f(i%n,(i/n)|0)*.7+r()*.3;k[i]=v>1-dens*.28?3:v>1-dens*.62?2:v>1-dens?1:0}
 /* une poussière que rien n'atteint coûterait une action à elle seule : un voisin reçoit une onde */
 var atteint=new Uint8Array(N);for(var a=0;a<N;a++)R.portee(n,k,a,function(j){atteint[j]=1});
 for(var b=0;b<N;b++){if(k[b]!==0||atteint[b])continue;var x=b%n,y=(b/n)|0,cand=[];
  for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<n&&yy<n)cand.push(yy*n+xx)}
  var c=cand[Math.floor(r()*cand.length)];if(k[c]<1)k[c]=1;R.portee(n,k,c,function(j){atteint[j]=1})}
 /* des rayons relient des régions éloignées : la causalité à longue distance arrive à partir de 16 × 16 */
 var nr=Math.round(N*RAYONS[L]);for(var q=0;q<nr;q++){var z=Math.floor(r()*N);if(k[z]<=1)k[z]=r()<.5?R.RAYON_H:R.RAYON_V}
 return k}

function niveau(L,graine){graine=graine||'aime';var n=1<<L,c=CIBLE[Math.min(L,CIBLE.length-1)],dens=L<=2?.85:.62,best=null;
 for(var a=0;a<48;a++){var k=essai(L,hache(graine+':'+L+':'+a),dens),o=R.optimum(n,k),ecart=(o.optimum<c[0]?c[0]-o.optimum:o.optimum>c[1]?o.optimum-c[1]:0)+(o.partSources>FACILE[Math.min(L,8)]?1:0);
  if(!best||ecart<best.ecart)best={k:k,o:o,ecart:ecart,essai:a};if(!ecart)break;
  dens=Math.max(.2,Math.min(.98,dens+(o.optimum>c[1]?.05:o.optimum<c[0]?-.05:-.03)))}
 var b=best;return{L:L,n:n,cases:b.k,optimum:b.o.optimum,partSources:b.o.partSources,solution:b.o.sources,budget:b.o.optimum+MARGE[Math.min(L,MARGE.length-1)],graine:graine,essai:b.essai}}

/* défi du jour : la même grille 16 × 16 pour tous, cinq actions, le plus grand nombre de cases */
function defi(date){var g='defi:'+date,n=16,best=null;for(var a=0;a<24;a++){var k=essai(4,hache(g+':'+a),.5),o=R.optimum(n,k);if(o.optimum>=9&&o.optimum<=14){best={k:k,o:o};break}if(!best||Math.abs(o.optimum-11)<Math.abs(best.o.optimum-11))best={k:k,o:o}}
 return{L:4,n:n,cases:best.k,optimum:best.o.optimum,solution:best.o.sources,budget:5,graine:g,defi:true}}

return{MAX:MAX,niveau:niveau,defi:defi,hache:hache,alea:alea};
});
