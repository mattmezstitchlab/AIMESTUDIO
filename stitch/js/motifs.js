/* AIME STITCH · illustrations ORIGINALES dessinées en code, pour la démonstration (aucune image tierce).
   Elles jouent le rôle de « photographie importée » : la conversion les traite comme n'importe quelle image.
   Provenance : création générative AIME, libre d'usage dans la démonstration. */
(function(root,factory){root.StitchMotifs=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
function toile(g,W,H,c){g.fillStyle=c||'#F4EEE2';g.fillRect(0,0,W,H)}
function grad(g,x0,y0,x1,y1,stops){var gr=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(function(s){gr.addColorStop(s[0],s[1])});return gr}
function rgrad(g,x,y,r,stops){var gr=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);stops.forEach(function(s){gr.addColorStop(s[0],s[1])});return gr}
function ell(g,x,y,rx,ry,rot,fill){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();g.ellipse(0,0,rx,ry,0,0,6.2832);g.fillStyle=fill;g.fill();g.restore()}
function feuille(g,x,y,len,ang,c1,c2){g.save();g.translate(x,y);g.rotate(ang);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.5,-len*.32,len,0);g.quadraticCurveTo(len*.5,len*.32,0,0);g.fillStyle=grad(g,0,-len*.3,0,len*.3,[[0,c1],[1,c2]]);g.fill();
 g.strokeStyle='rgba(30,60,30,.35)';g.lineWidth=len*.03;g.beginPath();g.moveTo(len*.05,0);g.lineTo(len*.9,0);g.stroke();g.restore()}
function eglantine(g,x,y,r,rot){g.save();g.translate(x,y);g.rotate(rot||0);for(var i=0;i<5;i++){g.save();g.rotate(i*2*Math.PI/5);g.beginPath();g.ellipse(0,-r*.55,r*.48,r*.55,0,0,6.2832);g.fillStyle=rgrad(g,0,-r*.5,r*.7,[[0,'#FFF1F3'],[.55,'#F6B3C2'],[1,'#E07A95']]);g.fill();g.restore()}
 g.beginPath();g.arc(0,0,r*.26,0,6.2832);g.fillStyle='#F3C24A';g.fill();for(var k=0;k<10;k++){var a=k*.628;g.beginPath();g.arc(Math.cos(a)*r*.2,Math.sin(a)*r*.2,r*.05,0,6.2832);g.fillStyle='#B8792A';g.fill()}g.restore()}
var MOTIFS={
 /* une mésange bleue posée sur une branche d'églantier */
 mesange:{titre:'Mésange et églantines',categorie:'oiseaux',ratio:1.2,dessiner:function(g,W,H){toile(g,W,H,'#E9DCC4');var s=W/600;g.save();g.scale(s,s);
  g.strokeStyle=grad(g,40,420,560,300,[[0,'#6B4A33'],[1,'#8C6646']]);g.lineCap='round';g.lineWidth=16;g.beginPath();g.moveTo(30,430);g.bezierCurveTo(200,380,360,360,575,300);g.stroke();g.lineWidth=8;g.beginPath();g.moveTo(420,338);g.quadraticCurveTo(470,250,520,215);g.stroke();
  [[90,410,70,-2.5],[150,395,62,.5],[250,380,68,-2.2],[330,365,60,.8],[480,320,64,-2.6],[500,240,55,-.6],[540,300,58,.4],[200,392,54,2.4]].forEach(function(f){feuille(g,f[0],f[1],f[2],f[3],'#7FA65A','#3F6B3A')});
  eglantine(g,120,360,46,.2);eglantine(g,505,205,40,.6);eglantine(g,560,300,34,1);eglantine(g,60,450,30,.4);
  /* l'oiseau */
  ell(g,300,265,104,82,-.25,rgrad(g,300,280,110,[[0,'#FBE77A'],[.7,'#E9C640'],[1,'#B99A2E']]));
  g.beginPath();g.moveTo(230,230);g.bezierCurveTo(300,170,390,190,420,250);g.bezierCurveTo(360,250,300,260,230,230);g.fillStyle=grad(g,230,200,420,260,[[0,'#7FA3B8'],[1,'#56809A']]);g.fill();
  g.beginPath();g.moveTo(330,240);g.bezierCurveTo(410,230,470,270,505,318);g.bezierCurveTo(440,318,380,300,330,276);g.fillStyle=grad(g,330,240,505,318,[[0,'#3E6F99'],[1,'#2B4F75']]);g.fill();
  g.beginPath();g.moveTo(470,300);g.lineTo(560,350);g.lineTo(548,368);g.lineTo(462,322);g.fillStyle='#355B82';g.fill();
  ell(g,215,200,62,56,0,'#F7F7F2');ell(g,212,165,58,30,0,'#3E79B8');
  g.fillStyle='#1E2B3A';g.beginPath();g.moveTo(160,200);g.quadraticCurveTo(210,186,262,204);g.quadraticCurveTo(210,196,160,212);g.fill();
  g.beginPath();g.moveTo(178,232);g.quadraticCurveTo(212,252,250,236);g.quadraticCurveTo(214,264,180,244);g.fill();
  g.beginPath();g.arc(200,200,7,0,6.2832);g.fillStyle='#0E1218';g.fill();g.beginPath();g.arc(202,197,2.2,0,6.2832);g.fillStyle='#fff';g.fill();
  g.beginPath();g.moveTo(156,206);g.lineTo(138,212);g.lineTo(156,216);g.fillStyle='#2A2A2A';g.fill();
  g.strokeStyle='#5C5048';g.lineWidth=6;[[280,338,270,372],[318,340,316,374]].forEach(function(p){g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(p[2],p[3]);g.stroke()});
  g.restore()}},
 lavande:{titre:'Rameau de lavande',categorie:'botanique',ratio:.7,dessiner:function(g,W,H){toile(g,W,H,'#F6F1E6');var s=W/400;g.save();g.scale(s,s);
  [[130,520,170,90,-.1],[200,540,205,70,0],[270,520,240,100,.1]].forEach(function(t,ti){g.strokeStyle='#6E8A4E';g.lineWidth=5;g.beginPath();g.moveTo(t[0],t[1]);g.quadraticCurveTo((t[0]+t[2])/2,(t[1]+t[3])/2+40,t[2],t[3]);g.stroke();
   for(var k=0;k<11;k++){var u=k/10,x=t[2]+(t[0]-t[2])*u*.42,y=t[3]+u*150;[-1,1].forEach(function(sd){ell(g,x+sd*9,y,9,13,sd*.5,['#9C7BC9','#7E5BB2','#B79AD8'][(k+ti)%3])})}});
  [[150,470,60,-2.2],[250,470,60,-1],[200,500,50,-1.6]].forEach(function(f){feuille(g,f[0],f[1],f[2],f[3],'#93AE73','#55733F')});
  g.fillStyle='#C9A86A';g.fillRect(150,500,110,18);g.restore()}},
 monogramme:{titre:'Monogramme « A » fleuri',categorie:'monogrammes',ratio:1,dessiner:function(g,W,H){toile(g,W,H,'#F7F2E8');var s=W/500;g.save();g.scale(s,s);
  for(var i=0;i<18;i++){var a=Math.PI*(.15+i/17*1.7),x=250+Math.cos(a)*190,y=260+Math.sin(a)*190;feuille(g,x,y,48,a+1.4,'#86A866','#466E3D')}
  [[250,452,32],[92,180,26],[408,180,26]].forEach(function(f,i){eglantine(g,f[0],f[1],f[2],i)});
  g.font='bold 300px Georgia, serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=grad(g,0,120,0,400,[[0,'#3D5A80'],[1,'#22324F']]);g.fillText('A',250,272);g.restore()}},
 colline:{titre:'Colline au couchant',categorie:'paysages',ratio:1.4,dessiner:function(g,W,H){var s=W/700;g.save();g.scale(s,s);g.fillStyle=grad(g,0,0,0,300,[[0,'#F2B880'],[.6,'#F6D9A8'],[1,'#FBEBD0']]);g.fillRect(0,0,700,500);
  g.beginPath();g.arc(470,230,62,0,6.2832);g.fillStyle='#F28C5B';g.fill();
  [['#B9A27E',300,.6],['#8D9A63',340,.9],['#5E7A4B',390,1.2],['#3F5A3A',440,1.6]].forEach(function(c,i){g.beginPath();g.moveTo(0,500);for(var x=0;x<=700;x+=10)g.lineTo(x,c[1]-Math.sin(x/700*Math.PI*c[2]+i)*40-i*6);g.lineTo(700,500);g.closePath();g.fillStyle=c[0];g.fill()});
  for(var k=0;k<7;k++){var x=80+k*85,y=400+(k%2)*20;g.fillStyle='#2F4730';g.beginPath();g.moveTo(x,y-70);g.lineTo(x+22,y);g.lineTo(x-22,y);g.fill()}g.restore()}},
 papillon:{titre:'Papillon d\'été',categorie:'animaux',ratio:1.25,dessiner:function(g,W,H){toile(g,W,H,'#F5F0E6');var s=W/500;g.save();g.scale(s,s);
  [[1,0],[-1,0]].forEach(function(sd){g.save();g.translate(250,200);g.scale(sd[0],1);ell(g,85,-40,95,70,-.5,rgrad(g,85,-40,100,[[0,'#FBD27A'],[.6,'#F08C3C'],[1,'#8A3B1C']]));ell(g,70,70,62,50,.5,rgrad(g,70,70,64,[[0,'#F7C66C'],[.7,'#E07B2E'],[1,'#7A3418']]));
   [[120,-60,12],[60,-70,9],[95,60,10]].forEach(function(d){g.beginPath();g.arc(d[0],d[1],d[2],0,6.2832);g.fillStyle='#FFF6E4';g.fill()});g.restore()});
  ell(g,250,210,12,95,0,'#2D2620');g.strokeStyle='#2D2620';g.lineWidth=4;g.beginPath();g.moveTo(246,120);g.quadraticCurveTo(225,80,205,70);g.moveTo(254,120);g.quadraticCurveTo(275,80,295,70);g.stroke();g.restore()}}
};
/* dessine un motif dans un canvas de largeur W et renvoie {l, h, data} (RGBA) */
function image(id,W){var M=MOTIFS[id],H=Math.round(W/M.ratio),cv=document.createElement('canvas');cv.width=W;cv.height=H;var g=cv.getContext('2d');M.dessiner(g,W,H);return{l:W,h:H,data:g.getImageData(0,0,W,H).data,canvas:cv}}
return{MOTIFS:MOTIFS,image:image,liste:Object.keys(MOTIFS)};
});
