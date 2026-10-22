/* AIME · une seule vue 3D du cube-personne, pour toutes les interfaces (Bureau, dock, Canevas).
   Elle LIT le modèle AIMECube ; elle n'en garde aucune copie. Faces posées : la teinte de la facette, ses mots, le timbre.
   Faces en attente : du verre irisé, « à venir ». Même grammaire que le cube de la grande page (rayon, lumière, iris).
     AIMECubeVue.monter(conteneur, {cube, moi, interactif, surFace(id)}) → {maj(cube), montrer(id), face()}
       interactif : glisser pour tourner (souris, doigt), six faces focalisables au clavier (Tab, Entrée), flèches pour tourner.
     AIMECubeVue.miniHTML() : la miniature du dock (CSS seul), d'après le dernier cube affiché (memo).
   Mouvement réduit : pas d'inertie ni de rotation continue, les rotations sont immédiates. */
(function(racine){'use strict';var C=racine.AIMECube;if(!C||racine.AIMECubeVue)return;
var RM=racine.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
/* orientation de chaque face (indice de la facette sur le cube de la grande page) et rotation qui la montre */
var POSE=[[0,0],[90,0],[180,0],[-90,0],[0,90],[0,-90]],VOIR=[[0,0],[0,-90],[0,180],[0,90],[-90,0],[90,0]];
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function teinte(e,d){e.style.setProperty('--a',d.teinte[0]);e.style.setProperty('--b',d.teinte[1]);e.style.setProperty('--c',d.teinte[2])}
function texte(f,d){return d.champs.map(function(c){return f.champs[c.k]}).filter(Boolean).join(' · ')}
var dernier=null;
/* les couleurs d'une face : son style (choisi dans le Canevas) sinon la teinte de sa facette */
function remplir(face,d,f,moi,cube){face.textContent='';teinte(face,{teinte:C.couleurs(cube,d.id)});var pose=f.etat==='posee';face.classList.toggle('pose',pose);face.dataset.etat=f.etat;
 face.appendChild(el('small',null,d.nom));face.appendChild(el('b',null,pose?(texte(f,d)||d.nom):'à venir'));
 if(pose&&racine.AIMETimbre&&moi){var t=AIMETimbre.creer({id:moi.id,nom:moi.name||'Vous',image:moi.image,mini:true,legende:false});face.appendChild(t)}
 if(pose&&f.visibilite==='publie')face.appendChild(el('i','cv3-pub','Publiée'))}
function monter(box,o){o=o||{};var cube=o.cube,moi=o.moi,rx=-18,ry=-28,cur=null,surFace=o.surFace||function(){};
 box.classList.add('cv3');if(o.interactif)box.classList.add('cv3-i');
 var scene=el('div','cv3-scene'),corps=el('div','cv3-corps');scene.appendChild(corps);box.appendChild(scene);
 var faces=C.FACETTES.map(function(d){var b=el(o.interactif?'button':'div','cv3-f');if(o.interactif){b.type='button'}b.dataset.f=d.id;
  b.style.transform='rotateY('+POSE[d.face][0]+'deg) rotateX('+POSE[d.face][1]+'deg) translateZ(calc(var(--cv3) / 2))';corps.appendChild(b);return b});
 function poser(){corps.style.transform='rotateX('+rx+'deg) rotateY('+ry+'deg)'}
 function maj(c){if(c)cube=c;dernier={cube:cube,moi:moi};C.FACETTES.forEach(function(d,i){var f=cube.facettes[d.id];remplir(faces[i],d,f,moi,cube);
  if(o.interactif)faces[i].setAttribute('aria-label',d.nom+(f.etat==='posee'?', posée'+(C.completude(cube,d.id)<1?', partielle':'')+(f.visibilite==='publie'?', publiée':', privée'):', à venir'))})}
 function montrer(id){var d=C.facette(id);if(!d)return;var v=VOIR[d.face];/* de trois quarts : la face choisie devant, le cube reste un cube */rx=v[0]===0?-14:v[0]>0?v[0]-16:v[0]+16;ry=v[1]-24;cur=id;faces.forEach(function(f){f.classList.toggle('choisie',f.dataset.f===id);if(o.interactif)f.setAttribute('aria-pressed',f.dataset.f===id?'true':'false')});poser()}
 if(o.interactif){var g=null,bouge=0;
  scene.addEventListener('pointerdown',function(e){g={x:e.clientX,y:e.clientY};bouge=0;box.classList.add('tire');try{scene.setPointerCapture(e.pointerId)}catch(_){}});
  scene.addEventListener('pointermove',function(e){if(!g)return;var dx=e.clientX-g.x,dy=e.clientY-g.y;bouge+=Math.abs(dx)+Math.abs(dy);ry+=dx*.5;rx=Math.max(-80,Math.min(80,rx-dy*.4));g={x:e.clientX,y:e.clientY};poser()});
  function fin(e){if(!g)return;g=null;box.classList.remove('tire');if(bouge<6){var t=document.elementFromPoint(e.clientX,e.clientY),f=t&&t.closest&&t.closest('.cv3-f');if(f&&box.contains(f)){montrer(f.dataset.f);surFace(f.dataset.f)}}}
  scene.addEventListener('pointerup',fin);scene.addEventListener('pointercancel',function(){g=null;box.classList.remove('tire')});
  faces.forEach(function(f){f.addEventListener('focus',function(){montrer(f.dataset.f)});f.addEventListener('click',function(e){if(e.detail===0){montrer(f.dataset.f);surFace(f.dataset.f)}})});
  box.addEventListener('keydown',function(e){var k={ArrowLeft:[0,-90],ArrowRight:[0,90],ArrowUp:[90,0],ArrowDown:[-90,0]}[e.key];if(!k)return;e.preventDefault();rx=Math.max(-90,Math.min(90,rx+k[0]));ry+=k[1];poser()})}
 else if(!RM)box.classList.add('cv3-tourne');
 maj(cube);poser();return{maj:maj,montrer:montrer,face:function(){return cur},element:box}}
/* la miniature du dock : six faces en CSS, teintes des facettes posées, verre pour les autres */
function miniHTML(){var c=dernier&&dernier.cube;return'<span class="cv3-mini'+(RM?'':' cv3-tourne')+'"><span class="cv3-corps">'+C.FACETTES.map(function(d){var p=c&&c.facettes[d.id].etat==='posee';
  var t=c?C.couleurs(c,d.id):d.teinte;return'<span class="cv3-f'+(p?' pose':'')+'" style="--a:'+t[0]+';--b:'+t[1]+';--c:'+t[2]+';transform:rotateY('+POSE[d.face][0]+'deg) rotateX('+POSE[d.face][1]+'deg) translateZ(calc(var(--cv3) / 2))"></span>'}).join('')+'</span></span>'}
racine.AIMECubeVue={monter:monter,miniHTML:miniHTML,memo:function(cube,moi){dernier={cube:cube,moi:moi}},POSE:POSE,VOIR:VOIR};
})(typeof self!=='undefined'?self:this);
