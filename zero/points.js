/* AIME · Page Zéro : les points des « i ».
   Chaque « i » des titres devient un « ı » sans point, plus un point posé exactement à la place du vrai : sa position
   est mesurée dans la police elle-même (dessin de « i » moins dessin de « ı »). Le point peut alors absorber l'orbe,
   gonfler, éclater en pixels, et ces pixels deviennent de petites orbes qui vont allumer les autres points.
   Lecteurs d'écran : le texte d'origine reste lu tel quel (copie masquée), la version dessinée est aria-hidden.

   AIMEPoints.preparer(selecteur, pret)       transforme les textes, puis appelle pret()
   AIMEPoints.centre(pt)                      {x, y, d} à l'écran
   AIMEPoints.gonfler(pt, {eclate})           le point gonfle puis éclate ; eclate() à l'instant de l'éclat
   AIMEPoints.allumer(pt)                     le point devient une petite orbe */
(function(root){'use strict';
var MESURES={},TOUS=[],couche=null;
var COUL=['#FB7185','#F59E0B','#7C5CFF','#22D3EE','#EDEDF0','#C4B5FD'];
var reduit=function(){return document.documentElement.classList.contains('calme')};

/* où est le point du « i » dans cette police ? en em, depuis le début du glyphe et le haut de la ligne de contenu */
function mesurer(st){var cle=st.fontStyle+'|'+st.fontWeight+'|'+st.fontFamily;if(MESURES[cle])return MESURES[cle];
 var T=200,W=200,Hh=360,base=280,cv=document.createElement('canvas');cv.width=W;cv.height=Hh;var c=cv.getContext('2d',{willReadFrequently:true});
 c.font=st.fontStyle+' '+st.fontWeight+' '+T+'px '+st.fontFamily;c.textBaseline='alphabetic';
 var m=c.measureText('ı'),asc=m.fontBoundingBoxAscent!=null?m.fontBoundingBoxAscent:T*.95;
 function px(ch){c.clearRect(0,0,W,Hh);c.fillText(ch,40,base);return c.getImageData(0,0,W,Hh).data}
 var a=px('i'),b=px('ı'),x0=W,y0=Hh,x1=-1,y1=-1;
 for(var y=0;y<Hh;y++)for(var x=0;x<W;x++){var k=(y*W+x)*4+3;if(a[k]>128&&b[k]<40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
 var r=x1<0?{l:.06,t:.2,d:.12,ok:false}:{l:(x0-40)/T,t:(y0-(base-asc))/T,d:Math.max(x1-x0+1,y1-y0+1)/T,ok:true};MESURES[cle]=r;return r}

function preparer(sel,pret){
 var els=[].slice.call(document.querySelectorAll(sel));
 var polices=els.map(function(e){var s=getComputedStyle(e);return s.fontStyle+' '+s.fontWeight+' 40px '+s.fontFamily});
 var charge=document.fonts&&document.fonts.load?Promise.all(polices.filter(function(p,i){return polices.indexOf(p)===i}).map(function(p){return document.fonts.load(p,'iı').catch(function(){})})):Promise.resolve();
 charge.then(function(){return document.fonts&&document.fonts.ready}).then(function(){
  els.forEach(function(e){if(e.querySelector('.ii'))return;var st=getComputedStyle(e),M=mesurer(st);if(!M.ok)return;
   var sr=document.createElement('span');sr.className='sr';sr.textContent=e.textContent.replace(/\s+/g,' ').trim();
   var vis=document.createElement('span');vis.setAttribute('aria-hidden','true');while(e.firstChild)vis.appendChild(e.firstChild);e.appendChild(sr);e.appendChild(vis);
   var w=document.createTreeWalker(vis,NodeFilter.SHOW_TEXT,null),txt=[],n;while((n=w.nextNode()))if(n.nodeValue.indexOf('i')>=0)txt.push(n);
   txt.forEach(function(t){var f=document.createDocumentFragment(),parts=t.nodeValue.split('i');parts.forEach(function(p,i){if(p)f.appendChild(document.createTextNode(p));if(i<parts.length-1){var s=document.createElement('span');s.className='ii';s.appendChild(document.createTextNode('ı'));var pt=document.createElement('span');pt.className='pt';
     pt.style.left=M.l.toFixed(4)+'em';pt.style.top=M.t.toFixed(4)+'em';pt.style.width=pt.style.height=M.d.toFixed(4)+'em';s.appendChild(pt);f.appendChild(s);TOUS.push(pt)}});t.parentNode.replaceChild(f,t)})});
  pret&&pret()})}

function centre(pt){var r=pt.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,d:r.width}}
function allumer(pt,pulse){if(!pt)return;pt.classList.add('vif');if(pulse&&!reduit()&&pt.animate)pt.animate([{transform:'scale(1)'},{transform:'scale(2.1)'},{transform:'scale(1)'}],{duration:620,easing:'cubic-bezier(.3,1.6,.5,1)'})}
function laCouche(){if(couche)return couche;couche=document.createElement('div');couche.className='eclats';couche.setAttribute('aria-hidden','true');document.body.appendChild(couche);return couche}

/* les cibles des petites orbes : d'abord les points éteints les plus proches de l'écran */
function cibles(sauf,n){var V=innerHeight,l=TOUS.filter(function(p){return p!==sauf}).map(function(p){var r=p.getBoundingClientRect();return{p:p,y:r.top,vis:r.top>-V*.6&&r.top<V*1.6,vif:p.classList.contains('vif')}});
 l.sort(function(a,b){return(a.vif-b.vif)||(b.vis-a.vis)||(Math.abs(a.y-V/2)-Math.abs(b.y-V/2))});return l.slice(0,n).map(function(o){return o.p})}

function eclater(pt){var c=centre(pt),L=laCouche(),N=22,vis=cibles(pt,14);
 for(var i=0;i<N;i++){(function(i){var e=document.createElement('i'),col=COUL[i%COUL.length],a=i/N*Math.PI*2+Math.random()*.5,dist=46+Math.random()*80,bx=c.x+Math.cos(a)*dist,by=c.y+Math.sin(a)*dist,sz=3+Math.random()*3;
  e.style.width=e.style.height=sz+'px';e.style.background=col;e.style.color=col;L.appendChild(e);
  var cible=vis[i],t=cible?centre(cible):{x:bx+Math.cos(a)*40,y:by+Math.sin(a)*40},mx=(bx+t.x)/2+(t.y-by)*.25,my=(by+t.y)/2-(t.x-bx)*.25,rot=(Math.random()*2-1)*220;
  var K=[{transform:'translate('+(c.x-sz/2)+'px,'+(c.y-sz/2)+'px) rotate(0deg) scale(1)',borderRadius:'1px',opacity:1,boxShadow:'0 0 0 rgba(0,0,0,0)'},
   {transform:'translate('+(bx-sz/2)+'px,'+(by-sz/2)+'px) rotate('+rot+'deg) scale(1)',borderRadius:'1px',opacity:1,offset:.26},
   {transform:'translate('+(bx-sz/2)+'px,'+(by+5-sz/2)+'px) rotate('+rot+'deg) scale(1.5)',borderRadius:'50%',opacity:1,boxShadow:'0 0 8px currentColor',offset:.44},
   {transform:'translate('+(mx-sz/2)+'px,'+(my-sz/2)+'px) rotate('+rot+'deg) scale(1.3)',borderRadius:'50%',opacity:1,boxShadow:'0 0 10px currentColor',offset:.72},
   {transform:'translate('+(t.x-sz/2)+'px,'+(t.y-sz/2)+'px) rotate('+rot+'deg) scale('+(cible?.7:0)+')',borderRadius:'50%',opacity:cible?1:0,boxShadow:'0 0 6px currentColor'}];
  var an=e.animate(K,{duration:1500+Math.random()*500,easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'});
  an.onfinish=function(){if(cible)allumer(cible,true);e.remove()}})(i)}}

function gonfler(pt,o){o=o||{};pt.classList.add('vif','plein');
 /* un ballon : il gonfle par à-coups, se déforme, puis éclate ; les petits points gonflent plus (taille finale ~32 px) */
 var F=Math.max(4.4,32/Math.max(1,pt.getBoundingClientRect().width)),q=function(a,b){return'scale('+(1+(F-1)*a).toFixed(2)+','+(1+(F-1)*(b==null?a:b)).toFixed(2)+')'};
 var an=pt.animate([{transform:'scale(1)'},{transform:q(.36,.28),offset:.25},{transform:q(.27,.38),offset:.42},{transform:q(.62,.55),offset:.7},{transform:q(.57,.66),offset:.82},{transform:q(.9),offset:.97},{transform:q(1.05),opacity:0}],{duration:1150,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'});
 an.onfinish=function(){eclater(pt);o.eclate&&o.eclate();pt.classList.remove('plein');an.cancel();
  /* le point renaît, petite orbe à sa place */
  pt.animate([{transform:'scale(0)',opacity:0},{transform:'scale(1.4)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}],{duration:700,delay:260,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'backwards'})}}

root.AIMEPoints={preparer:preparer,centre:centre,gonfler:gonfler,allumer:allumer,tous:function(){return TOUS.slice()}};
})(typeof self!=='undefined'?self:this);
