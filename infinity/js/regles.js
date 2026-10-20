/* AIME INFINITY · règles de propagation (logique pure, sans rendu ni son).
   Une grille n × n. Chaque case a une nature :
     0        poussière : elle explose quand une onde l'atteint, n'en émet aucune
     1, 2, 3  onde : en explosant, elle atteint toutes les cases à distance ≤ p (carré autour d'elle)
     4        rayon horizontal : atteint toute sa ligne
     5        rayon vertical : atteint toute sa colonne
   Une action = toucher une case. Elle explose ; toute case atteinte explose à son tour. C'est tout.
   La cascade est déterministe : même grille + même case = mêmes explosions, dans le même ordre, aux mêmes instants. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEInfinityRegles=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var RAYON_H=4,RAYON_V=5;
/* coût d'une onde par case parcourue (unités de temps) : les ondes roulent, les rayons filent */
var COUT_ONDE=3,COUT_RAYON=1;

/* cases atteintes par l'explosion de i (géométrie seule, vivantes ou non) ; appelle f(j, distance) */
function portee(n,k,i,f){var x=i%n,y=(i/n)|0,t=k[i];
 if(t>=1&&t<=3){var x0=Math.max(0,x-t),x1=Math.min(n-1,x+t),y0=Math.max(0,y-t),y1=Math.min(n-1,y+t);
  for(var yy=y0;yy<=y1;yy++)for(var xx=x0;xx<=x1;xx++){if(xx===x&&yy===y)continue;f(yy*n+xx,Math.max(Math.abs(xx-x),Math.abs(yy-y)))}}
 else if(t===RAYON_H){for(var a=0;a<n;a++)if(a!==x)f(y*n+a,Math.abs(a-x))}
 else if(t===RAYON_V){for(var b=0;b<n;b++)if(b!==y)f(b*n+x,Math.abs(b-y))}}
function cout(t){return t===RAYON_H||t===RAYON_V?COUT_RAYON:COUT_ONDE}

/* la cascade depuis une case touchée : instants d'explosion (le plus tôt l'emporte), sans modifier la grille.
   → { ordre:[i…] (par instant croissant), t:{i:instant}, de:{i:source}, duree } */
function cascade(n,k,vivant,depart){if(!vivant[depart])return{ordre:[],t:{},de:{},duree:0};
 var T=new Map(),DE=new Map(),fait=new Set(),seaux=[[depart]];T.set(depart,0);DE.set(depart,-1);var ordre=[];
 for(var temps=0;temps<seaux.length;temps++){var s=seaux[temps];if(!s)continue;
  for(var q=0;q<s.length;q++){var i=s[q];if(fait.has(i)||T.get(i)!==temps)continue;fait.add(i);ordre.push(i);var c=cout(k[i]);
   portee(n,k,i,function(j,d){if(!vivant[j]||fait.has(j))return;var tj=temps+d*c;var a=T.get(j);
    if(a===undefined||tj<a||(tj===a&&i<DE.get(j))){T.set(j,tj);DE.set(j,i);(seaux[tj]||(seaux[tj]=[])).push(j)}})}}
 var t={},de={};ordre.forEach(function(i){t[i]=T.get(i);de[i]=DE.get(i)});
 return{ordre:ordre,t:t,de:de,duree:ordre.length?t[ordre[ordre.length-1]]:0}}

/* le nombre minimal d'actions pour tout faire exploser = le nombre de composantes « sources »
   (fortement connexes, qu'aucune autre ne peut atteindre). Exact, calculé une fois par grille. */
function optimum(n,k){var N=n*n,index=new Int32Array(N).fill(-1),bas=new Int32Array(N),comp=new Int32Array(N).fill(-1),surPile=new Uint8Array(N);
 var pile=[],idx=0,nc=0,voisins=function(i){var v=[];portee(n,k,i,function(j){v.push(j)});return v};
 for(var s=0;s<N;s++){if(index[s]>=0)continue;var appels=[[s,voisins(s),0]];index[s]=bas[s]=idx++;pile.push(s);surPile[s]=1;
  while(appels.length){var f=appels[appels.length-1],v=f[0],L=f[1];
   if(f[2]<L.length){var w=L[f[2]++];if(index[w]<0){index[w]=bas[w]=idx++;pile.push(w);surPile[w]=1;appels.push([w,voisins(w),0])}else if(surPile[w]&&index[w]<bas[v])bas[v]=index[w]}
   else{appels.pop();if(appels.length){var p=appels[appels.length-1][0];if(bas[v]<bas[p])bas[p]=bas[v]}
    if(bas[v]===index[v]){var x;do{x=pile.pop();surPile[x]=0;comp[x]=nc}while(x!==v);nc++}}}}
 var atteinte=new Uint8Array(nc);for(var i=0;i<N;i++)portee(n,k,i,function(j){if(comp[j]!==comp[i])atteinte[comp[j]]=1});
 /* un représentant par source : la case la plus puissante (utile aux tests et à l'indice) */
 var rep=new Int32Array(nc).fill(-1),force=function(t){return t>=4?2.5:t};
 for(var c=0;c<N;c++){var q=comp[c];if(atteinte[q])continue;if(rep[q]<0||force(k[c])>force(k[rep[q]]))rep[q]=c}
 var sources=[],dansSource=0;for(var z=0;z<nc;z++)if(!atteinte[z])sources.push(rep[z]);for(var y=0;y<N;y++)if(!atteinte[comp[y]])dansSource++;
 /* part des cases qui sont de « bons départs » : plus elle est faible, plus il faut lire la grille */
 return{optimum:sources.length,sources:sources,composantes:nc,partSources:dansSource/N}}

return{RAYON_H:RAYON_H,RAYON_V:RAYON_V,COUT_ONDE:COUT_ONDE,COUT_RAYON:COUT_RAYON,portee:portee,cascade:cascade,optimum:optimum};
});
