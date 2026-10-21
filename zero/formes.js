/* AIME · les six formes de la matière : Point, Ligne, Relation, Grille, Composition, Projet.
   Une seule source pour la métamorphose de la Page Zéro (zero/zero.js) et pour le Point Zéro du Bureau (pointzero/).
   AIMEFormes.NOMS, .N (seize points), .RECTS, .etats() → six listes de seize positions dans un carré 400 × 400,
   AIMEFormes.traits(e, el, parent, style) → dessine les traits blancs de la forme e (0 à 5) avec el(nom, attributs, parent). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEFormes=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var NOMS=['Point','Ligne','Relation','Grille','Composition','Projet'],N=16;
var RECTS=[[60,70,170,150],[250,70,90,60],[250,150,90,70],[60,240,280,90]];
function etats(){var E=[],i,P;
 E.push(Array.apply(null,{length:N}).map(function(){return[200,200]}));
 E.push(Array.apply(null,{length:N}).map(function(_,i){return[50+i*20,200]}));
 P=[[200,200]];for(i=1;i<N;i++){var a=(i-1)/(N-1)*Math.PI*2-Math.PI/2;P.push([200+132*Math.cos(a),200+132*Math.sin(a)])}E.push(P);
 E.push(Array.apply(null,{length:N}).map(function(_,i){return[80+(i%4)*80,80+Math.floor(i/4)*80]}));
 P=[];RECTS.forEach(function(r){P.push([r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]])});E.push(P);
 E.push(P.map(function(p){return[200+(p[0]-200)*.78,212+(p[1]-200)*.78]}));return E}
/* les traits d'une forme ; « iris » : l'identifiant d'un dégradé déjà défini, pour le cercle du point et le bouton du projet */
function traits(e,el,g,st,iris){var E=etats(),i,j,a,b,o=function(x){return Object.assign({},st,x||{})};
 if(e===0)el('circle',o({cx:200,cy:200,r:42,stroke:iris?'url(#'+iris+')':st.stroke,'stroke-opacity':.7}),g);
 if(e===1)el('line',o({x1:50,y1:200,x2:350,y2:200}),g);
 if(e===2){for(i=1;i<N;i++){a=E[2][i];el('line',o({x1:200,y1:200,x2:a[0],y2:a[1],'stroke-opacity':.35}),g)}
  for(j=1;j<N;j+=3){a=E[2][j];b=E[2][(j+4-1)%(N-1)+1];el('line',o({x1:a[0],y1:a[1],x2:b[0],y2:b[1],'stroke-opacity':.25}),g)}}
 if(e===3)for(i=0;i<4;i++){el('line',o({x1:80+i*80,y1:80,x2:80+i*80,y2:320}),g);el('line',o({x1:80,y1:80+i*80,x2:320,y2:80+i*80}),g)}
 if(e===4)RECTS.forEach(function(r){el('rect',o({x:r[0],y:r[1],width:r[2],height:r[3],rx:6}),g)});
 if(e===5){el('rect',o({x:28,y:28,width:344,height:344,rx:18,'stroke-opacity':.8}),g);el('line',o({x1:28,y1:66,x2:372,y2:66}),g);el('circle',{cx:348,cy:47,r:7,fill:iris?'url(#'+iris+')':'#EDEDF0'},g);
  RECTS.forEach(function(r){var s=.78;el('rect',o({x:200+(r[0]-200)*s,y:212+(r[1]-200)*s,width:r[2]*s,height:r[3]*s,rx:5}),g)})}
 return g}
return{NOMS:NOMS,N:N,RECTS:RECTS,etats:etats,traits:traits};
});
