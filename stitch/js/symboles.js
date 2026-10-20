/* AIME STITCH · symboles. Des formes géométriques dessinées (pas des caractères de police), identiques à l'écran,
   à l'impression et en noir et blanc. Chaque symbole se distingue par sa forme seule ; l'ordre place d'abord
   les formes les plus contrastées entre elles. 48 symboles distincts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.StitchSymboles=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
/* chaque symbole = liste de primitives dans une case unité [0,1] : [type, …paramètres, plein?] */
var BASES=[
 ['rond',1],['carre',1],['triangle',1],['losange',1],['croix'],['plus'],['rond',0],['carre',0],['triangle',0],['losange',0],
 ['etoile'],['demiRond'],['barreV'],['barreH'],['diagD'],['diagG'],['triangleBas',1],['triangleBas',0],['point'],['anneauPoint'],
 ['coeur'],['eclair'],['vague'],['grille'],['carrePoint'],['triangleDemi'],['demiCarre'],['fleche'],['chevron'],['sablier'],
 ['doubleBarre'],['carreCroix'],['rondCroix'],['rondBarre'],['quartRond'],['tiret3'],['pentagone',1],['pentagone',0],['hexagone',1],['hexagone',0],
 ['lune'],['goutte'],['damier'],['cible'],['T'],['L'],['Y'],['Z']];
function dessiner(g,nom,plein,x,y,s,couleur){var u=function(v){return v*s},X=function(v){return x+v*s},Y=function(v){return y+v*s};
 g.save();g.fillStyle=couleur;g.strokeStyle=couleur;g.lineWidth=Math.max(1,s*.1);g.lineCap='round';g.lineJoin='round';
 var poly=function(pts,f){g.beginPath();pts.forEach(function(p,i){i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1]))});g.closePath();f?g.fill():g.stroke()};
 var reg=function(n,r,rot,f){var p=[];for(var i=0;i<n;i++){var a=rot+i*2*Math.PI/n;p.push([.5+Math.cos(a)*r,.5+Math.sin(a)*r])}poly(p,f)};
 var ligne=function(a,b,c,d){g.beginPath();g.moveTo(X(a),Y(b));g.lineTo(X(c),Y(d));g.stroke()};
 var rond=function(r,f){g.beginPath();g.arc(X(.5),Y(.5),u(r),0,6.2832);f?g.fill():g.stroke()};
 switch(nom){
  case'rond':rond(.3,plein);break;case'carre':plein?g.fillRect(X(.22),Y(.22),u(.56),u(.56)):g.strokeRect(X(.24),Y(.24),u(.52),u(.52));break;
  case'triangle':poly([[.5,.18],[.84,.8],[.16,.8]],plein);break;case'triangleBas':poly([[.16,.2],[.84,.2],[.5,.82]],plein);break;
  case'losange':poly([[.5,.14],[.86,.5],[.5,.86],[.14,.5]],plein);break;
  case'croix':ligne(.22,.22,.78,.78);ligne(.78,.22,.22,.78);break;case'plus':ligne(.5,.18,.5,.82);ligne(.18,.5,.82,.5);break;
  case'etoile':var p=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,r=i%2?.16:.36;p.push([.5+Math.cos(a)*r,.52+Math.sin(a)*r])}poly(p,1);break;
  case'demiRond':g.beginPath();g.arc(X(.5),Y(.5),u(.3),Math.PI/2,Math.PI*1.5);g.closePath();g.fill();rond(.3,0);break;
  case'barreV':g.fillRect(X(.4),Y(.16),u(.2),u(.68));break;case'barreH':g.fillRect(X(.16),Y(.4),u(.68),u(.2));break;
  case'diagD':ligne(.2,.8,.8,.2);break;case'diagG':ligne(.2,.2,.8,.8);break;
  case'point':rond(.13,1);break;case'anneauPoint':rond(.3,0);rond(.08,1);break;
  case'coeur':g.beginPath();g.moveTo(X(.5),Y(.82));g.bezierCurveTo(X(.05),Y(.5),X(.25),Y(.12),X(.5),Y(.36));g.bezierCurveTo(X(.75),Y(.12),X(.95),Y(.5),X(.5),Y(.82));g.fill();break;
  case'eclair':poly([[.58,.12],[.26,.56],[.48,.56],[.4,.88],[.76,.42],[.54,.42]],1);break;
  case'vague':g.beginPath();g.moveTo(X(.14),Y(.5));g.bezierCurveTo(X(.3),Y(.22),X(.4),Y(.78),X(.5),Y(.5));g.bezierCurveTo(X(.6),Y(.22),X(.7),Y(.78),X(.86),Y(.5));g.stroke();break;
  case'grille':[.36,.64].forEach(function(v){ligne(v,.18,v,.82);ligne(.18,v,.82,v)});break;
  case'carrePoint':g.strokeRect(X(.24),Y(.24),u(.52),u(.52));rond(.08,1);break;
  case'triangleDemi':poly([[.5,.18],[.84,.8],[.16,.8]],0);poly([[.5,.18],[.5,.8],[.16,.8]],1);break;
  case'demiCarre':g.strokeRect(X(.24),Y(.24),u(.52),u(.52));g.fillRect(X(.24),Y(.5),u(.52),u(.26));break;
  case'fleche':ligne(.5,.84,.5,.2);ligne(.28,.42,.5,.2);ligne(.72,.42,.5,.2);break;
  case'chevron':g.beginPath();g.moveTo(X(.2),Y(.66));g.lineTo(X(.5),Y(.32));g.lineTo(X(.8),Y(.66));g.stroke();break;
  case'sablier':poly([[.22,.18],[.78,.18],[.22,.82],[.78,.82]],1);break;
  case'doubleBarre':g.fillRect(X(.26),Y(.18),u(.14),u(.64));g.fillRect(X(.6),Y(.18),u(.14),u(.64));break;
  case'carreCroix':g.strokeRect(X(.22),Y(.22),u(.56),u(.56));ligne(.22,.22,.78,.78);ligne(.78,.22,.22,.78);break;
  case'rondCroix':rond(.3,0);ligne(.29,.29,.71,.71);ligne(.71,.29,.29,.71);break;
  case'rondBarre':rond(.3,0);ligne(.2,.5,.8,.5);break;
  case'quartRond':g.beginPath();g.moveTo(X(.22),Y(.22));g.arc(X(.22),Y(.22),u(.56),0,Math.PI/2);g.closePath();g.fill();break;
  case'tiret3':[.3,.5,.7].forEach(function(v){ligne(.24,v,.76,v)});break;
  case'pentagone':reg(5,.32,-Math.PI/2,plein);break;case'hexagone':reg(6,.32,0,plein);break;
  case'lune':g.beginPath();g.arc(X(.5),Y(.5),u(.3),0,6.2832);g.arc(X(.62),Y(.42),u(.24),0,6.2832,true);g.fill('evenodd');break;
  case'goutte':g.beginPath();g.moveTo(X(.5),Y(.14));g.bezierCurveTo(X(.86),Y(.56),X(.72),Y(.84),X(.5),Y(.84));g.bezierCurveTo(X(.28),Y(.84),X(.14),Y(.56),X(.5),Y(.14));g.fill();break;
  case'damier':g.fillRect(X(.22),Y(.22),u(.28),u(.28));g.fillRect(X(.5),Y(.5),u(.28),u(.28));g.strokeRect(X(.22),Y(.22),u(.56),u(.56));break;
  case'cible':rond(.32,0);rond(.18,0);rond(.05,1);break;
  case'T':ligne(.2,.24,.8,.24);ligne(.5,.24,.5,.82);break;case'L':ligne(.3,.18,.3,.8);ligne(.3,.8,.78,.8);break;
  case'Y':ligne(.22,.2,.5,.52);ligne(.78,.2,.5,.52);ligne(.5,.52,.5,.84);break;case'Z':ligne(.22,.22,.78,.22);ligne(.78,.22,.22,.78);ligne(.22,.78,.78,.78);break}
 g.restore()}
function liste(){return BASES.map(function(b,i){return{id:'s'+i,nom:b[0],plein:b[1]}})}
return{liste:liste,dessiner:function(g,id,x,y,s,couleur){var i=+String(id).slice(1),b=BASES[i];if(b)dessiner(g,b[0],b[1],x,y,s,couleur)},total:BASES.length};
});
