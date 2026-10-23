/* AIME · Canevas · adaptateur « Cube Maître ». Seul ce fichier relie le Canevas au Cube Maître ; le plan de travail n'en dépend pas.
   Le cube du site s'ouvre DÉPLIÉ, en croix comme le cube-personne : six faces, chacune avec ses chiffres réels.
   Sélectionner une face fait apparaître, dans l'inspecteur : ses sources, « Voir en 3D » (la même vue, cube/vue3d.js),
   « Ouvrir dans l'app » et ses liens (une page publique, ou la Régie au bon onglet pour le propriétaire).
   LECTURE SEULE : aucune donnée du site n'est écrite ; le Canevas garde seulement sa vue et ses notes (« aime-canevas »).
   Ni le brouillon ni la comptabilité de la Régie ne sont lus. Unités natives : une face = F unités de scène. */
(function(root){'use strict';
var F=240,G=16,PAD=16,CROIX=[[1,1],[2,1],[3,1],[0,1],[1,0],[1,2]];
var SCRIPTS=['/cube/modele.js','/cube/vue3d.js','/maitre/modele.js','/maitre/sources.js'],STYLES=['/cube/vue3d.css'];
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Le Cube Maître n\'a pas pu être chargé.'))};document.head.appendChild(s)})}
function feuille(u){if(document.querySelector('link[href="'+u+'"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}
var GLOBAL={'/cube/modele.js':'AIMECube','/cube/vue3d.js':'AIMECubeVue','/maitre/modele.js':'AIMEMaitre','/maitre/sources.js':'AIMEMaitreSources'};
function chargerMoteur(){STYLES.forEach(feuille);return SCRIPTS.reduce(function(p,u){return p.then(function(){return root[GLOBAL[u]]?null:script(u)})},Promise.resolve())}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function origine(d){var p=CROIX[d.face];return[p[0]*(F+G),p[1]*(F+G)]}
function sous(c,x,y){var lx=x-c.t.dx,ly=y-c.t.dy,r=null;root.AIMEMaitre.FACETTES.forEach(function(d){var o=origine(d);if(lx>=o[0]&&lx<=o[0]+F&&ly>=o[1]&&ly<=o[1]+F)r=d});return r}
function fenetre(titre,corps){var v=el('div','cvc-voile'),f=el('div','cvc-fen');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label',titre);
 var h=el('div','cvc-t');h.appendChild(el('b',null,titre));var x=el('button','cv-b','Fermer');x.type='button';h.appendChild(x);f.appendChild(h);f.appendChild(corps);v.appendChild(f);document.body.appendChild(v);
 var avant=document.activeElement;function fermer(){v.remove();if(avant&&avant.focus)avant.focus({preventScroll:true})}
 x.onclick=fermer;v.addEventListener('click',function(e){if(e.target===v)fermer()});v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});x.focus();return{fermer:fermer}}
function vue3d(D,id){var b=el('div','cvc-3d'),z=el('div');b.appendChild(z);b.appendChild(el('p','cv-aide','Le même Cube Maître que dans son app : glissez pour tourner, Tab et Entrée pour choisir une face.'));
 fenetre('Cube Maître en 3D',b);var v=root.AIMECubeVue.monter(z,{cube:D.cube,modele:root.AIMEMaitre,interactif:true,surFace:function(){}});v.montrer(id||'pages')}
function lignes(g,texte,x,y,w,lh,max){var mots=String(texte).split(' '),l='',n=0;for(var i=0;i<mots.length&&n<max;i++){var t=l?l+' '+mots[i]:mots[i];if(g.measureText(t).width>w&&l){g.fillText(l,x,y+n*lh);n++;l=mots[i]}else l=t}if(l&&n<max){g.fillText(l,x,y+n*lh);n++}return n}

var A={type:'maitre',nom:'Cube Maître',
 charger:function(source){return chargerMoteur().then(function(){return root.AIMEMaitreSources.charger()}).then(function(cube){var M=root.AIMEMaitre,n=M.IDS.filter(function(id){return cube.facettes[id].etat==='posee'}).length;
   return{titre:'Cube Maître',sous:'Déplié · '+n+' / 6 facettes · données réelles · lecture seule'+(cube.proprietaire?' · propriétaire':''),calque:{nom:'Cube Maître déplié',grille:{type:'universelle',pas:20},taille:{l:4*F+3*G,h:3*F+2*G}},
    donnees:{cube:cube,focus:M.facette(source&&source.facette)?source.facette:null}}})},
 dessiner:function(g,c,vue,W,H,D,etat){var M=root.AIMEMaitre,z=vue.z;function E(x,y){return[(x+c.t.dx-vue.x)*z,(y+c.t.dy-vue.y)*z]}
  g.fillStyle='#ECEBE6';g.fillRect(0,0,W,H);if(!etat.sel&&D.focus)etat.sel=D.focus;
  M.FACETTES.forEach(function(d){var f=D.cube.facettes[d.id],o=origine(d),p=E(o[0],o[1]),s=F*z,col=d.teinte,pose=f.etat==='posee',r=Math.min(18,s*.07);
   g.save();g.beginPath();if(g.roundRect)g.roundRect(p[0],p[1],s,s,r);else g.rect(p[0],p[1],s,s);
   if(pose){var gr=g.createLinearGradient(p[0],p[1],p[0]+s,p[1]+s);gr.addColorStop(0,col[0]);gr.addColorStop(.55,col[1]);gr.addColorStop(1,col[2]);g.fillStyle=gr}else g.fillStyle='#17151F';g.fill();
   g.lineWidth=etat.sel===d.id?3:1.2;g.strokeStyle=etat.sel===d.id?'#22D3EE':'rgba(255,255,255,.35)';if(!pose)g.setLineDash([6,5]);g.stroke();g.setLineDash([]);g.clip();
   var x=p[0]+PAD*z,w=s-2*PAD*z;g.textBaseline='top';g.fillStyle=pose?'#fff':'#C4B5FD';g.font='600 '+Math.max(8,12*z)+'px "Inter Variable",sans-serif';g.fillText(d.nom.toUpperCase(),x,p[1]+PAD*z,w);
   if(pose){g.font='600 '+Math.max(10,40*z)+'px "Inter Variable",sans-serif';g.fillText(f.champs.cle,x,p[1]+38*z,w);g.font='500 '+Math.max(8,13*z)+'px "Inter Variable",sans-serif';g.fillText(f.champs.dit,x,p[1]+86*z,w);
    g.fillStyle='rgba(255,255,255,.88)';g.font='500 '+Math.max(7,11*z)+'px "Inter Variable",sans-serif';var y=p[1]+118*z;
    f.chiffres.slice(1,4).forEach(function(k){if(y>p[1]+s-20*z)return;var nl=lignes(g,k[0]+' · '+k[1],x,y,w,14*z,2);y+=nl*14*z+6*z})}
   else{g.font='600 '+Math.max(9,22*z)+'px "Inter Variable",sans-serif';g.fillText(d.attente||'à venir',x,p[1]+40*z,w);g.fillStyle='rgba(255,255,255,.7)';g.font='500 '+Math.max(7,11*z)+'px "Inter Variable",sans-serif';lignes(g,M.raison(D.cube,d.id),x,p[1]+80*z,w,14*z,5)}
   g.restore()})},
 element:function(D,c,x,y){var d=sous(c,x,y);if(!d)return null;var f=D.cube.facettes[d.id];D._sel=d.id;
  var act=[{id:'3d',nom:'Voir en 3D'},{id:'app',nom:'Ouvrir dans l\'app Cube Maître'}];
  f.actions.forEach(function(a,i){act.push({id:'lien:'+i,nom:a.nom+(a.type==='regie'?' (Régie)':'')})});
  var dit=f.etat==='posee'?d.dit+' Sources : '+f.sources.map(function(s){return s[0]}).join(', ')+'.':root.AIMEMaitre.raison(D.cube,d.id);
  return{titre:'Facette '+d.nom,dit:dit,ref:'Cube Maître · '+d.nom,actions:act}},
 agir:function(D,id,e,etat){var M=root.AIMEMaitre,fid=D._sel;if(!fid)return'';etat.sel=fid;var f=D.cube.facettes[fid];
  if(id==='3d'){vue3d(D,fid);return'Le Cube Maître en 3D : les mêmes données.'}
  if(id==='app'){location.href='/maitre/#'+fid;return''}
  var m=/^lien:(\d+)$/.exec(id);if(m){var a=f.actions[+m[1]];if(a&&M.lienOk(a.href)){location.href=a.href;return''}return'Ce lien n\'est pas autorisé.'}
  return''}};
A.F=F;A.CROIX=CROIX;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('maitre',A);else root.AIMECanevasMaitre=A;
})(typeof self!=='undefined'?self:this);
