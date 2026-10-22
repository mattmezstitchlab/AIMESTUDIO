/* AIME · le Point Zéro. Un seul point au repos. On clique : un petit menu pour démarrer (importer, écrire, compléter
   un projet en attente). Puis la matière se transforme sous les yeux, comme la métamorphose de la Page Zéro :
   Point → Ligne → Relation → Grille → Composition → Projet, nourrie par ce qui a été déposé (les couleurs d'une photo,
   les références DMC rangées autour du centre, les personnes citées…). L'orbe guide ensuite les confirmations,
   et une carte projet naît dans le Bureau, avec sa barre d'avancement. Rien n'ouvre l'atelier trop tôt.

   AIMEPointZero.monter(conteneur, {salut(nom)})
   Où vit la matière : textes sur le compte quand on est connecté (/api/matiere), sinon dans ce navigateur ;
   images et cartes projet sur cet appareil (IndexedDB), jamais envoyées. L'orbe ne remonte à AIME qu'un résumé,
   à la demande de la personne connectée (/api/remontee). Tout le texte affiché passe par textContent. */
(function(root){'use strict';if(root.AIMEPointZero)return;
var A=root.AIMEAnalyse,F=root.AIMEFormes,B=root.AIMEBroderie,M=root.AIMEModes,C=root.AIMEOrbeContexte,NS='http://www.w3.org/2000/svg';
var RM=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var NOMS=F.NOMS,E=F.etats(),N=F.N,IRIS=[['0','#FB7185'],['.35','#F59E0B'],['.68','#7C5CFF'],['1','#22D3EE']];
var CLE_LOCAL='aime-point-zero',BASE_IDB='aime-point-zero';

function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function sv(t,a,p){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
function bouton(t,c,f){var b=el('button',c||'pz-b',t);b.type='button';if(f)b.onclick=f;return b}
function lire(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function lisse(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function attendre(ms){return new Promise(function(ok){setTimeout(ok,RM?0:ms)})}
function post(url,corps){return fetch(url,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(corps||{})}).then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return{statut:r.status,j:j}})})}

/* ---------- l'appareil : les cartes projet et leurs images (IndexedDB) ---------- */
var idb=null;
function base(){if(idb)return idb;idb=new Promise(function(ok,ko){if(!root.indexedDB)return ko(new Error('indisponible'));var r=indexedDB.open(BASE_IDB,2);
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('fichiers'))db.createObjectStore('fichiers',{keyPath:'id'});if(!db.objectStoreNames.contains('projets'))db.createObjectStore('projets',{keyPath:'id'})};
 r.onsuccess=function(){ok(r.result)};r.onerror=function(){ko(r.error)}});idb.catch(function(){idb=null});return idb}
function faire(store,mode,f){return base().then(function(db){return new Promise(function(ok,ko){var t=db.transaction(store,mode),s=t.objectStore(store),r=f(s);t.oncomplete=function(){ok(r&&r.result)};t.onerror=function(){ko(t.error)}})})}
var projets={tous:function(){return faire('projets','readonly',function(s){return s.getAll()}).catch(function(){return[]})},garder:function(p){return faire('projets','readwrite',function(s){return s.put(p)})},retirer:function(id){return faire('projets','readwrite',function(s){return s.delete(id)})}};

/* ---------- les couleurs d'une image ---------- */
var dmc=null;function nuancier(){if(!dmc){dmc=fetch('/stitch/data/dmc.json').then(function(r){if(!r.ok)throw new Error('nuancier');return r.json()}).then(function(j){return j.fils});dmc.catch(function(){dmc=null})}return dmc}
function chargerImage(f){return new Promise(function(ok,ko){var u=URL.createObjectURL(f),g=new Image();g.onload=function(){ok({g:g,u:u})};g.onerror=function(){URL.revokeObjectURL(u);ko(new Error('Je n\'ai pas pu lire cette image.'))};g.src=u})}
function pixels(g,max){var k=Math.min(1,max/Math.max(g.naturalWidth,g.naturalHeight)),l=Math.max(1,Math.round(g.naturalWidth*k)),h=Math.max(1,Math.round(g.naturalHeight*k)),c=document.createElement('canvas');c.width=l;c.height=h;var x=c.getContext('2d',{willReadFrequently:true});x.drawImage(g,0,0,l,h);return{l:l,h:h,data:x.getImageData(0,0,l,h).data,canvas:c}}
/* les couleurs d'écran dominantes, distinctes entre elles : de quoi colorer la ligne de points */
function dominantes(img,n){var cpt={},d=img.data;for(var i=0;i<d.length;i+=4){if(d[i+3]<128)continue;var k=(d[i]>>4)+'-'+(d[i+1]>>4)+'-'+(d[i+2]>>4);var c=cpt[k]||(cpt[k]={n:0,r:0,g:0,b:0});c.n++;c.r+=d[i];c.g+=d[i+1];c.b+=d[i+2]}
 var L=Object.keys(cpt).map(function(k){var c=cpt[k];return{n:c.n,rgb:[c.r/c.n,c.g/c.n,c.b/c.n]}}).sort(function(a,b){return b.n-a.n}),o=[];
 L.forEach(function(c){if(o.length>=n)return;if(o.every(function(x){return Math.hypot(x[0]-c.rgb[0],x[1]-c.rgb[1],x[2]-c.rgb[2])>38}))o.push(c.rgb)});return o.map(B.hex)}
/* la conversion d'AIME Stitch, telle quelle (points, palette DMC), puis la couleur d'écran moyenne de chaque fil */
function convertir(img,choix,ratio){var g=B.grille(choix,ratio),mode=(B.COULEURS.filter(function(c){return c.id===choix.couleurs})[0]||B.COULEURS[1]).id;
 return nuancier().then(function(fils){return attendre(20).then(function(){var r=root.StitchConversion.convertir(img,{dmc:fils,largeur:g.l,mode:mode}),par={};fils.forEach(function(f){par[f.code]=f});
  var c=document.createElement('canvas');c.width=r.l;c.height=r.h;var x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.drawImage(img.canvas,0,0,r.l,r.h);var px=x.getImageData(0,0,r.l,r.h).data,som=r.palette.map(function(){return[0,0,0,0]});
  for(var i=0;i<r.points.length;i++){var k=r.points[i];if(!k)continue;var s=som[k-1];s[0]+=px[i*4];s[1]+=px[i*4+1];s[2]+=px[i*4+2];s[3]++}
  var palette=r.palette.map(function(p,i){var f=par[p.dmc]||{},s=som[i];return{dmc:p.dmc,nom:f.nom||'',hex:f.hex,ecran:s[3]?B.hex([s[0]/s[3],s[1]/s[3],s[2]/s[3]]):f.hex,points:p.points}});
  return{l:r.l,h:r.h,points:r.points,palette:palette,rapport:r.rapport,grille:Object.assign({},g,{l:r.l,h:r.h,points:r.l*r.h,cm:[+(r.l*2.54/B.toile(choix.toile).ct).toFixed(1),+(r.h*2.54/B.toile(choix.toile).ct).toFixed(1)]})}})})}
function apercu(conv){var c=document.createElement('canvas'),k=Math.max(1,Math.floor(320/Math.max(conv.l,conv.h)));c.width=conv.l*k;c.height=conv.h*k;var x=c.getContext('2d');x.fillStyle='#F5F3EE';x.fillRect(0,0,c.width,c.height);
 for(var i=0;i<conv.points.length;i++){var p=conv.points[i];if(!p)continue;x.fillStyle=conv.palette[p-1].hex;x.fillRect((i%conv.l)*k,Math.floor(i/conv.l)*k,k,k)}return c.toDataURL('image/png')}
function miniature(g){var c=pixels(g,480).canvas;return new Promise(function(ok){c.toBlob(function(b){ok(b)},'image/jpeg',.82)})}

/* ---------- le composant ---------- */
function monter(conteneur,o){o=o||{};
 var S={connecte:false,nom:'',compteOk:false,notes:[],local:[],projets:[],img:null,occupe:false};
 var racine=el('section','pz');racine.setAttribute('aria-label','Point Zéro');conteneur.textContent='';conteneur.appendChild(racine);

 /* la scène : un carré 400 × 400, exactement les formes de la Page Zéro */
 var scene=el('div','pz-scene');racine.appendChild(scene);
 var svg=sv('svg',{class:'pz-forme',viewBox:'0 0 400 400',role:'img','aria-label':'La matière prend forme : point, ligne, relation, grille, composition, projet'},scene);
 var defs=sv('defs',{},svg),gid='pzI'+uid(),lg=sv('linearGradient',{id:gid,x1:0,y1:0,x2:1,y2:1},defs);IRIS.forEach(function(s){sv('stop',{offset:s[0],'stop-color':s[1]},lg)});
 var clip=sv('clipPath',{id:gid+'g'},defs);sv('rect',{x:80,y:80,width:240,height:240},clip);
 var st={fill:'none',stroke:'#EDEDF0','stroke-width':1.2,'stroke-opacity':.55,'vector-effect':'non-scaling-stroke'};
 var calqueImage=sv('g',{opacity:0},svg),imgGrille=sv('image',{x:80,y:80,width:240,height:240,preserveAspectRatio:'xMidYMid meet','clip-path':'url(#'+gid+'g)',style:'image-rendering:pixelated'},calqueImage);
 var calqueCompo=sv('g',{opacity:0},svg);
 /* la composition se pose dans les cadres du projet final (les rectangles de la Page Zéro, réduits à 78 %) */
 var R=F.RECTS.map(function(r){var s=.78;return[200+(r[0]-200)*s,212+(r[1]-200)*s,r[2]*s,r[3]*s]});
 var compoImg=sv('image',{x:R[0][0],y:R[0][1],width:R[0][2],height:R[0][3],preserveAspectRatio:'xMidYMid slice'},calqueCompo),compoGrille=sv('image',{x:R[3][0],y:R[3][1],width:R[3][2],height:R[3][3],preserveAspectRatio:'xMidYMid slice',style:'image-rendering:pixelated'},calqueCompo);
 var compoFils=sv('g',{},calqueCompo);
 var grp=E.map(function(_,e){var g=sv('g',{class:'pz-tr pz-tr-'+e,opacity:e?0:1},svg);F.traits(e,sv,g,st,gid);return g});
 var rayons=sv('g',{},svg),etiquettes=sv('g',{class:'pz-etiq'},svg);
 var pts=[];for(var k=0;k<N;k++)pts.push(sv('circle',{class:'pz-pt',cx:200,cy:200,r:11.6,fill:'url(#'+gid+')'},svg));
 var liens=sv('g',{class:'pz-liens'},svg);
 var centre=bouton('','pz-centre');centre.setAttribute('aria-haspopup','menu');centre.setAttribute('aria-expanded','false');centre.setAttribute('aria-label','Point zéro : démarrer');scene.appendChild(centre);
 var legende=el('p','pz-legende');legende.appendChild(el('b',null,'Point zéro'));legende.appendChild(el('span',null,'Cliquez pour commencer'));racine.appendChild(legende);
 /* les six formes sont aussi six modes : une fois le projet né, chacune s'ouvre d'un clic */
 var phases=el('ol','pz-phases');phases.setAttribute('aria-label','Les six formes du projet');NOMS.forEach(function(n,e){var li=el('li'),b=bouton(n,'pz-ph',function(){if(S.p&&!S.occupe)mode(e)});b.disabled=true;b.setAttribute('aria-pressed','false');li.appendChild(b);phases.appendChild(li)});racine.appendChild(phases);
 var atel=el('div','pz-atel');scene.appendChild(atel);
 var barreMode=el('div','pz-mode');barreMode.hidden=true;racine.appendChild(barreMode);
 var dit=el('p','pz-dit');dit.setAttribute('role','status');dit.setAttribute('aria-live','polite');racine.appendChild(dit);

 /* l'état de la scène : la forme (0 à 5, fractionnaire pendant un passage), la couleur des points */
 var V={q:0,couleurs:null,etiq:false,image:false,compo:false},raf=0;
 function dessiner(){var q=Math.max(0,Math.min(5,V.q)),i0=Math.min(4,Math.floor(q)),f=lisse((q-i0-.1)/.8),colore=V.couleurs&&q>=.6&&q<4.6;
  for(var i=0;i<N;i++){var a=E[i0][i],b=E[i0+1][i],x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;pts[i].setAttribute('cx',x.toFixed(1));pts[i].setAttribute('cy',y.toFixed(1));
   var r=q<.5?3.6+8*(1-q*2):3.6;if(colore)r=q<1.5?5.4:4.8;pts[i].setAttribute('r',r.toFixed(2));
   pts[i].setAttribute('fill',q<.5?'url(#'+gid+')':(colore?V.couleurs[i%V.couleurs.length]:'#EDEDF0'));pts[i].setAttribute('stroke',colore?'rgba(255,255,255,.6)':'none');pts[i].setAttribute('stroke-width',1)}
  grp.forEach(function(g,e){g.setAttribute('opacity',Math.max(0,1-Math.abs(q-e)*1.5).toFixed(3))});
  calqueImage.setAttribute('opacity',V.image?Math.max(0,1-Math.abs(q-3)*1.4).toFixed(3):0);calqueCompo.setAttribute('opacity',V.compo?Math.max(0,Math.min(1,1.6-Math.abs(q-4.6)*1.3)).toFixed(3):0);
  var rel=Math.max(0,1-Math.abs(q-2)*1.6).toFixed(3);etiquettes.setAttribute('opacity',V.etiq?rel:0);rayons.setAttribute('opacity',rel);
  var on=Math.round(q);[].forEach.call(phases.children,function(li,e){li.classList.toggle('on',racine.classList.contains('actif')&&e===on)})}
 function aller(q,ms){cancelAnimationFrame(raf);if(RM||!ms){V.q=q;dessiner();return Promise.resolve()}var q0=V.q,t0=performance.now();
  return new Promise(function(ok){function pas(t){var p=Math.min(1,(t-t0)/ms);V.q=q0+(q-q0)*p;dessiner();if(p<1)raf=requestAnimationFrame(pas);else ok()}raf=requestAnimationFrame(pas)})}
 /* la propagation : du centre, un trait part vers chaque point du cercle, l'un après l'autre, et son étiquette s'allume */
 function propager(noms,instant){rayons.textContent='';etiquettes.textContent='';V.etiq=!!(noms&&noms.length);var P=E[2],L=[];
  for(var i=1;i<N;i++)L.push(sv('line',{x1:200,y1:200,x2:200,y2:200,stroke:'#EDEDF0','stroke-opacity':.5,'stroke-width':1,'vector-effect':'non-scaling-stroke'},rayons));
  (noms||[]).slice(0,N-1).forEach(function(n,j){var p=P[j+1],dx=p[0]-200,dy=p[1]-200,d=Math.hypot(dx,dy)||1,t=sv('text',{x:(200+dx/d*(d+20)).toFixed(1),y:(200+dy/d*(d+20)+4).toFixed(1),'text-anchor':Math.abs(dx)<20?'middle':dx>0?'start':'end','font-size':11.5,fill:'#C9C9D2',opacity:0},etiquettes);t.textContent=n});
  var et=[].slice.call(etiquettes.children);dessiner();
  return L.reduce(function(pr,l,j){return pr.then(function(){var p=P[j+1];if(RM||instant){l.setAttribute('x2',p[0]);l.setAttribute('y2',p[1]);if(et[j])et[j].setAttribute('opacity',1);return}
   return new Promise(function(ok){var t0=performance.now();function pas(t){var k=Math.min(1,(t-t0)/130);l.setAttribute('x2',(200+(p[0]-200)*k).toFixed(1));l.setAttribute('y2',(200+(p[1]-200)*k).toFixed(1));if(et[j])et[j].setAttribute('opacity',k.toFixed(2));if(k<1)requestAnimationFrame(pas);else ok()}requestAnimationFrame(pas)})})},Promise.resolve())}
 /* les fils DMC dans le petit cadre du haut, les couleurs d'écran dans celui du dessous */
 function filsCompo(pal){compoFils.textContent='';[[1,'hex'],[2,'ecran']].forEach(function(z){var r=R[z[0]];(pal||[]).slice(0,8).forEach(function(x,i){var c=i%4,l=Math.floor(i/4);sv('rect',{x:r[0]+5+c*16,y:r[1]+6+l*16,width:11,height:11,rx:z[1]==='hex'?5.5:2,fill:x[z[1]]||x.hex},compoFils)})})}
 function repos(){racine.classList.remove('actif');V={q:0,couleurs:null,etiq:false,image:false,compo:false};rayons.textContent='';etiquettes.textContent='';dessiner();legende.hidden=false}
 dessiner();

 /* ---------- le petit menu pour démarrer ---------- */
 var menu=el('div','pz-menu');menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Démarrer');scene.appendChild(menu);
 var choixFichier=el('input');choixFichier.type='file';choixFichier.accept='image/*,.txt,.md,.csv';choixFichier.hidden=true;racine.appendChild(choixFichier);
 function enAttente(){return S.projets.filter(function(p){return B.suivante(p)})}
 function ouvrirMenu(){menu.textContent='';var en=enAttente();
  [['Importer','Une photo, une image','i-importer',function(){choixFichier.click()}],['Écrire','Une intention, une demande, une note','i-ecrire',ouvrirEcrire],
   ['Compléter','Un projet en attente'+(en.length?' ('+en.length+')':' : aucun pour l\'instant'),'i-completer',en.length?function(){choisirEnAttente(en)}:null]].forEach(function(x){
   var b=bouton('','pz-menu-b');b.setAttribute('role','menuitem');b.appendChild(el('i',x[2]));var t=el('span');t.appendChild(el('b',null,x[0]));t.appendChild(el('small',null,x[1]));b.appendChild(t);
   if(x[3])b.onclick=function(){fermerMenu();x[3]()};else b.disabled=true;menu.appendChild(b)});
  menu.hidden=false;centre.setAttribute('aria-expanded','true');racine.classList.add('menu');menu.querySelector('button:not([disabled])').focus()}
 function fermerMenu(){menu.hidden=true;centre.setAttribute('aria-expanded','false');racine.classList.remove('menu')}
 centre.onclick=function(e){e.stopPropagation();if(S.occupe)return;menu.hidden?ouvrirMenu():fermerMenu()};
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){fermerMenu();centre.focus()}});
 document.addEventListener('click',function(e){if(!menu.hidden&&!menu.contains(e.target))fermerMenu()});
 choixFichier.onchange=function(){var f=choixFichier.files&&choixFichier.files[0];choixFichier.value='';if(f)recevoirFichier(f)};
 scene.addEventListener('dragover',function(e){e.preventDefault();scene.classList.add('sur')});scene.addEventListener('dragleave',function(){scene.classList.remove('sur')});
 scene.addEventListener('drop',function(e){e.preventDefault();scene.classList.remove('sur');var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&!S.occupe)recevoirFichier(f)});

 /* écrire : une petite fenêtre, rien de plus */
 var dlg=el('dialog','pz-depot');dlg.setAttribute('aria-labelledby','pzEcrT');
 dlg.innerHTML='<form method="dialog" class="pz-depot-f"><h2 id="pzEcrT">Écrire au point zéro</h2><p class="pz-leg">Une intention, une demande, une description de projet, des éléments en vrac : je lis, je trie, et je vous montre ce que je comprends.</p><label class="pz-sr" for="pzTexte">Votre message</label><textarea id="pzTexte" rows="7" maxlength="20000" placeholder="Je voudrais broder la photo de notre chien… / Pouvez-vous préparer… / Le 14 juin, avec Léa…"></textarea><div class="pz-depot-a"><button class="pz-b" value="annuler" type="submit" formnovalidate>Annuler</button><button class="pz-b pz-b-p" value="ok" type="submit">Déposer</button></div></form>';
 racine.appendChild(dlg);var zt=dlg.querySelector('textarea');
 function ouvrirEcrire(){if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');setTimeout(function(){zt.focus()},30)}
 dlg.addEventListener('close',function(){var t=zt.value.trim();zt.value='';var ok=dlg.returnValue==='ok';dlg.returnValue='';if(ok&&t)recevoirTexte(t);else centre.focus()});

 /* ---------- l'orbe : le panneau de dialogue ---------- */
 var orbe=el('aside','pz-orbe');orbe.hidden=true;orbe.setAttribute('aria-labelledby','pzOrbeT');racine.appendChild(orbe);
 function fermerOrbe(){orbe.hidden=true;racine.classList.remove('dialogue')}
 /* refermer l'orbe ramène la forme au point : on peut déposer une autre matière */
 function retour(){fermerOrbe();if(S.occupe)return;S.p=null;quitterMode();V.etiq=false;V.image=false;V.compo=false;V.couleurs=null;return aller(0,900).then(function(){repos();dire('Le point zéro attend une nouvelle matière.');centre.focus()})}
 function panneau(sous){orbe.textContent='';var h=el('header','pz-o-tete');h.appendChild(el('i','pz-o-pastille'));var ht=el('div');var t=el('h2',null,'L\'orbe');t.id='pzOrbeT';ht.appendChild(t);if(sous)ht.appendChild(el('p','pz-leg',sous));h.appendChild(ht);
  var x=bouton('×','pz-fermer',retour);x.setAttribute('aria-label','Fermer');h.appendChild(x);orbe.appendChild(h);var c=el('div','pz-o-corps');orbe.appendChild(c);orbe.hidden=false;racine.classList.add('dialogue');return c}
 function barre(p){var w=el('div','pz-barre'),v=B.progression(p);w.setAttribute('role','progressbar');w.setAttribute('aria-valuemin',0);w.setAttribute('aria-valuemax',100);w.setAttribute('aria-valuenow',v);w.setAttribute('aria-label','Avancement du projet');
  var i=el('i');i.style.width=v+'%';w.appendChild(i);w.appendChild(el('span',null,v+' %'));return w}

 /* ---------- recevoir une matière ---------- */
 function recevoirFichier(f){if(/^image\//.test(f.type))return recevoirImage(f);
  if(/^text\/|markdown|csv/.test(f.type)||/\.(txt|md|csv)$/i.test(f.name))return f.text().then(function(t){recevoirTexte(t.slice(0,20000),f.name)});
  dire('Pour l\'instant, je sais lire les images et les textes. Dites-m\'en plus en écrivant au point zéro.')}

 /* une image : la métamorphose montre l'analyse (le point, la ligne des couleurs, les fils DMC autour du centre, la grille) */
 function recevoirImage(f){S.occupe=true;S.p=null;quitterMode();fermerOrbe();racine.classList.add('actif');legende.hidden=true;dire('Je regarde votre image…');var charge;
  return chargerImage(f).then(function(r){charge=r;var rec=B.reconnaitre({type:'image',l:r.g.naturalWidth,h:r.g.naturalHeight,nom:f.name,couleurs:dominantes(pixels(r.g,64),60).length});
   S.img=pixels(r.g,600);compoImg.setAttribute('href',r.u);
   var p={id:uid(),type:'broderie',titre:f.name.replace(/\.[a-z0-9]+$/i,'').replace(/[-_]+/g,' ').trim().slice(0,80)||'Projet broderie',cree:new Date().toISOString(),source:{nom:f.name,l:r.g.naturalWidth,h:r.g.naturalHeight},
    reconnaissance:rec,choix:{largeurCm:B.FORMATS[1],usage:'patron',toile:'aida14',finesse:'fidele',couleurs:'equilibre'},confirme:{},palette:null,grille:null,ratio:r.g.naturalWidth/r.g.naturalHeight,image:null,apercu:null};
   var couleurs=dominantes(pixels(r.g,96),N);if(!couleurs.length)couleurs=null;
   return aller(0,0).then(function(){return attendre(500)}).then(function(){V.couleurs=couleurs;dire('Je relève les couleurs dominantes de votre image.');return aller(1,1100)})
    .then(function(){return attendre(700)}).then(function(){dire('Pour chacune, je cherche le fil DMC le plus proche.');return Promise.all([convertir(S.img,p.choix,p.ratio),aller(2,1100)])})
    .then(function(r2){var c=r2[0];p.palette=c.palette;p.grille=c.grille;garderCases(p,c);p.apercu=apercu(c);V.couleurs=c.palette.map(function(x){return x.hex});return propager(c.palette.map(function(x){return x.dmc}))})
    .then(function(){return attendre(1000)}).then(function(){imgGrille.setAttribute('href',p.apercu);V.image=true;dire('Je pose une première grille : un point de fil par case.');return aller(3,1100)})
    .then(function(){return attendre(500)}).then(function(){return miniature(charge.g)}).then(function(b){p.image=b;S.occupe=false;
     dire(rec.broderie?'J\'ai reconnu un projet broderie : '+rec.raisons.join(', ')+'.':'Je ne suis pas certaine qu\'il s\'agisse de broderie, mais on peut préparer cette image ainsi.');guider(p)})})
  .catch(function(e){S.occupe=false;repos();dire((e&&e.message)||'Je n\'ai pas pu lire cette image.')})}

 /* ---------- les confirmations, une par une ---------- */
 function guider(p,etape){S.p=p;quitterMode();var e=etape?B.ETAPES.filter(function(x){return x.id===etape})[0]:B.suivante(p);if(!e)return termine(p);
  var c=panneau(p.reconnaissance&&p.reconnaissance.broderie?'J\'ai reconnu un projet broderie. Voici les choix à confirmer avant de produire.':'Voici les choix à confirmer avant de produire.');
  c.appendChild(barre(p));var et=el('ol','pz-o-etapes');B.ETAPES.forEach(function(x,i){var li=el('li',(p.confirme[x.id]?'fait':'')+(x.id===e.id?' ici':''));li.appendChild(el('span',null,(i+1)+'. '+x.nom));
   if(p.confirme[x.id]&&x.id!==e.id){var r=bouton('revoir','pz-mini',function(){guider(p,x.id)});r.setAttribute('aria-label','Revoir : '+x.nom);li.appendChild(r)}et.appendChild(li)});c.appendChild(et);
  var q=el('section','pz-o-q');q.appendChild(el('h3',null,e.question));c.appendChild(q);
  VUES[e.id](q,p,function(){var prem=!Object.keys(p.confirme).length;p.confirme[e.id]=true;p.maj=new Date().toISOString();enregistrer(p).then(function(){afficherProjets();if(prem)return naissance(p)}).then(function(){guider(p)})});
  var f=q.querySelector('.pz-choix button,input,.pz-o-act button');if(f)f.focus()}
 function choix(q,L,actif,f){var g=el('div','pz-choix');L.forEach(function(x){var b=bouton('','pz-carte-c'+(x.id===actif?' on':''));b.setAttribute('aria-pressed',String(x.id===actif));b.appendChild(el('b',null,x.nom));if(x.dit)b.appendChild(el('small',null,x.dit));
  b.onclick=function(){f(x.id);[].forEach.call(g.children,function(y){y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',String(y===b))})};g.appendChild(b)});q.appendChild(g);return g}
 function confirmer(q,texte,f){var a=el('div','pz-o-act');a.appendChild(bouton(texte||'Confirmer','pz-b pz-b-p',f));q.appendChild(a);return a}
 function fil(x){var s=el('span','pz-fil');var i=el('i');i.style.background=x.hex;s.appendChild(i);s.appendChild(el('b',null,'DMC '+x.dmc));if(x.nom)s.appendChild(el('small',null,x.nom));return s}
 var VUES={
  format:function(q,p,ok){var g=el('div','pz-choix pz-choix-l');B.FORMATS.forEach(function(cm){g.appendChild(bouton(cm+' cm','pz-puce-c',function(){p.choix.largeurCm=cm;inp.value=cm;maj()}))});q.appendChild(g);
   var lab=el('label','pz-champ');lab.appendChild(el('span',null,'Largeur de l\'ouvrage fini, en centimètres'));var inp=el('input');inp.type='number';inp.min=4;inp.max=120;inp.step=1;inp.value=p.choix.largeurCm;inp.oninput=function(){p.choix.largeurCm=Math.max(4,Math.min(120,+inp.value||15));maj()};lab.appendChild(inp);q.appendChild(lab);
   var info=el('p','pz-leg');q.appendChild(info);function maj(){info.textContent='Soit environ '+p.choix.largeurCm+' × '+(p.choix.largeurCm/(p.ratio||1)).toFixed(1)+' cm, aux proportions de votre image.';[].forEach.call(g.children,function(b){var on=parseInt(b.textContent,10)===+p.choix.largeurCm;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))})}maj();
   q.appendChild(el('h4',null,'Pour quoi faire ?'));choix(q,B.USAGES,p.choix.usage,function(id){p.choix.usage=id});confirmer(q,'Confirmer le format',ok)},
  toile:function(q,p,ok){var info=el('p','pz-leg');choix(q,B.TOILES,p.choix.toile,function(id){p.choix.toile=id;maj()});q.appendChild(info);
   function maj(){var g=B.grille(Object.assign({},p.choix,{finesse:'fidele'}),p.ratio);info.textContent='Sur '+B.toile(p.choix.toile).nom+', '+p.choix.largeurCm+' cm de large donnent jusqu\'à '+g.l+' points par ligne. Plus la toile est fine, plus il y a de points, et plus l\'ouvrage est long.'}maj();confirmer(q,'Confirmer la toile',ok)},
  points:function(q,p,ok){var L=B.FINESSES.map(function(f){var g=B.grille(Object.assign({},p.choix,{finesse:f.id}),p.ratio);return{id:f.id,nom:f.nom+' · '+g.l+' × '+g.h+' points',dit:f.dit+' '+g.points.toLocaleString('fr-FR')+' points au total.'+(g.plafonne?' Limité ici à '+B.MAX_POINTS+' de large : l\'atelier pourra aller plus loin.':'')}});
   choix(q,L,p.choix.finesse,function(id){p.choix.finesse=id});confirmer(q,'Confirmer la grille',function(){p.grille=B.grille(p.choix,p.ratio);ok()})},
  couleurs:function(q,p,ok){choix(q,B.COULEURS.map(function(c){return{id:c.id,nom:c.nom+' · jusqu\'à '+c.n+' fils',dit:c.dit}}),p.choix.couleurs,function(id){p.choix.couleurs=id});
   var a=confirmer(q,'Confirmer et convertir en fils',function(){var b=a.firstChild;b.disabled=true;b.textContent='Conversion en fils DMC…';
    (S.img?convertir(S.img,p.choix,p.ratio):Promise.reject(new Error('image')))
     .then(function(c){p.palette=c.palette;p.grille=c.grille;garderCases(p,c);p.apercu=apercu(c);imgGrille.setAttribute('href',p.apercu);compoGrille.setAttribute('href',p.apercu);filsCompo(p.palette);V.couleurs=c.palette.map(function(x){return x.hex});racine.classList.add('actif');
      return aller(2,700).then(function(){return propager(c.palette.map(function(x){return x.dmc}))}).then(function(){dire(c.palette.length+' fils DMC retenus, pour une grille de '+c.grille.l+' × '+c.grille.h+' points.');return attendre(700)}).then(function(){return aller(V.compo?5:3,900)}).then(ok)})
     .catch(function(){b.disabled=false;b.textContent='Confirmer et convertir en fils';dire('Pour reconvertir, j\'ai besoin de l\'image sur cet appareil : réimportez-la depuis « Importer ».')})})},
  conversion:function(q,p,ok){var ex=el('div','pz-trois');[['Écran','RVB','Ce que vous voyez ici : de la lumière, rouge, vert, bleu. Chaque écran l\'affiche un peu différemment.'],['Impression','CMJN','Sur papier, de l\'encre : cyan, magenta, jaune, noir. Les couleurs vives de l\'écran y sont souvent plus ternes.'],['Fil','DMC','Pour broder, des fils réels, chacun repéré par un numéro DMC. C\'est ce numéro qui compte, pas la couleur affichée.']].forEach(function(x){var d=el('div');d.appendChild(el('b',null,x[0]));d.appendChild(el('span','pz-code',x[1]));d.appendChild(el('p',null,x[2]));ex.appendChild(d)});q.appendChild(ex);
   var t=el('div','pz-table'),tb=el('table'),th=el('tr');['Écran (RVB)','Impression (CMJN)','Fil (DMC)'].forEach(function(h){th.appendChild(el('th',null,h))});var tt=el('thead');tt.appendChild(th);tb.appendChild(tt);var bd=el('tbody');
   (p.palette||[]).slice(0,8).forEach(function(x){var tr=el('tr'),k=B.cmjn(B.rgbDe(x.ecran)),a=el('td'),b=el('td'),c=el('td');var i1=el('i','pz-pastille');i1.style.background=x.ecran;a.appendChild(i1);a.appendChild(el('span',null,x.ecran));
    var i2=el('i','pz-pastille pz-papier');i2.style.background=x.ecran;b.appendChild(i2);b.appendChild(el('span',null,'C'+k[0]+' M'+k[1]+' J'+k[2]+' N'+k[3]));c.appendChild(fil(x));tr.appendChild(a);tr.appendChild(b);tr.appendChild(c);bd.appendChild(tr)});
   tb.appendChild(bd);t.appendChild(tb);q.appendChild(t);if((p.palette||[]).length>8)q.appendChild(el('p','pz-leg','… et '+(p.palette.length-8)+' autres fils.'));
   q.appendChild(el('p','pz-note','Les valeurs CMJN sont indicatives : elles dépendent de l\'imprimeur. Et un fil réel diffère toujours un peu de sa pastille à l\'écran : la référence DMC fait foi.'));confirmer(q,'J\'ai compris la différence',ok)},
  dmc:function(q,p,ok){q.appendChild(el('p','pz-leg','Chaque couleur de votre image a reçu le fil DMC le plus proche. Le numéro DMC est la référence à acheter et à broder ; la pastille n\'en donne qu\'une idée à l\'écran.'));
   var u=el('ul','pz-fils');(p.palette||[]).forEach(function(x){var li=el('li'),e=el('i','pz-pastille');e.style.background=x.ecran;e.title='La couleur dans votre image';li.appendChild(e);li.appendChild(el('span','pz-fleche','→'));li.appendChild(fil(x));
    var a=B.rgbDe(x.ecran),b=B.rgbDe(x.hex),d=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);li.appendChild(el('small','pz-ecart'+(d>=60?' loin':''),d<25?'très proche':d<60?'proche':'écart visible'));li.appendChild(el('small','pz-n-pts',x.points.toLocaleString('fr-FR')+' points'));u.appendChild(li)});q.appendChild(u);
   var a=confirmer(q,'Je confirme ces références DMC',ok);a.appendChild(bouton('Changer le nombre de couleurs','pz-b',function(){guider(p,'couleurs')}))}};

 /* ---------- l'atelier : les six formes deviennent des outils, l'orbe devient le pointeur ----------
    Chaque élément interactif DÉCLARE ce qu'il est (orbe/contexte.js) ; le pilote (orbe/pilote.js) n'affiche que ce qui est déclaré.
    observer → proposer → régler → confirmer → enregistrer. Sans IA : tout ici est calcul déterministe ou choix de l'utilisateur. */
 var PREF_PILOTE='aime-orbe-pilote',pref=lire(PREF_PILOTE,{})||{};
 var AUTONOMIES=[['discrete','À la demande'],['attentive','Propose aux pauses'],['active','S\'ouvre d\'elle-même aux pauses']];
 var PIL=root.AIMEOrbePilote&&C?root.AIMEOrbePilote.monter(scene,{mouvement:pref.mouvement!==false,autonomie:pref.autonomie||'attentive',annoncer:dire}):null;
 S.mode=-1;var minuteur=0;
 function garderCases(p,c){try{p.cases=Uint8Array.from(c.points);p.dims={l:c.l,h:c.h}}catch(e){p.cases=null}}
 function placer(n,x,y){n.style.left=(x/4)+'%';n.style.top=(y/4)+'%';return n}
 function declarer(n,d){if(C)C.declarer(n,d);return n}
 /* après une modification : le patron est redessiné à partir des cases, puis tout est enregistré */
 function redessiner(p){if(p.cases&&p.dims){p.apercu=apercu({l:p.dims.l,h:p.dims.h,points:p.cases,palette:p.palette});imgGrille.setAttribute('href',p.apercu);compoGrille.setAttribute('href',p.apercu)}
  filsCompo(p.palette);V.couleurs=p.palette.map(function(x){return x.hex})}
 function garder(p,texte){return enregistrer(p).then(function(){afficherProjets();return texte})}
 function etatPhases(){[].forEach.call(phases.children,function(li,e){var b=li.firstChild;b.disabled=!S.p||S.occupe;b.setAttribute('aria-pressed',String(S.mode===e))});phases.classList.toggle('outils',!!S.p)}
 function quitterMode(){clearTimeout(minuteur);if(PIL)PIL.fermer();atel.textContent='';liens.textContent='';barreMode.hidden=true;racine.classList.remove('m-0','m-1','m-2','m-3','m-4','m-5','outil');S.mode=-1;
  if(S.p){V.image=!!S.p.apercu;V.compo=!!S.p.apercu}dessiner();etatPhases()}
 /* la barre du mode : le geste attendu, le retour aux confirmations guidées, et les réglages de l'orbe (mouvement, autonomie) */
 function barreDe(e,texte){barreMode.textContent='';barreMode.hidden=false;var t=el('p','pz-mode-t');t.appendChild(el('b',null,NOMS[e]));t.appendChild(el('span',null,texte));barreMode.appendChild(t);
  var a=el('div','pz-mode-a');a.appendChild(bouton('Confirmations guidées','pz-b pz-b-s',function(){guider(S.p)}));
  if(PIL&&root.matchMedia&&matchMedia('(pointer:fine)').matches){var mv=bouton('','pz-b pz-b-s');function majMv(){var on=PIL.mouvement();mv.textContent='Orbe qui suit : '+(on?'oui':'non');mv.setAttribute('aria-pressed',String(on))}
   mv.onclick=function(){PIL.reglerMouvement(!PIL.mouvement());pref.mouvement=PIL.mouvement();ecrire(PREF_PILOTE,pref);majMv()};majMv();if(RM){mv.disabled=true;mv.title='Mouvements réduits par votre système'}a.appendChild(mv);
  }if(PIL){var lab=el('label','pz-mode-sel');lab.appendChild(el('span',null,'Orbe'));var sel=el('select');AUTONOMIES.forEach(function(x){var o2=el('option',null,x[1]);o2.value=x[0];sel.appendChild(o2)});sel.value=PIL.autonomie();
   sel.onchange=function(){PIL.reglerAutonomie(sel.value);pref.autonomie=sel.value;ecrire(PREF_PILOTE,pref)};lab.appendChild(sel);a.appendChild(lab)}
  barreMode.appendChild(a)}
 /* niveau « attentif » ou « actif » : après une pause, l'orbe signale le prochain réglage utile (jamais pendant un geste) */
 function aLaPause(n,texte){clearTimeout(minuteur);if(!PIL||!n)return;var m=S.mode;minuteur=setTimeout(function(){if(S.mode===m&&!PIL.actuel()&&document.contains(n))PIL.suggerer(n,texte)},RM?1200:2600)}
 /* glisser-déposer à la souris, au doigt ou au stylet ; le clavier a ses propres raccourcis */
 function glisser(n,deposer){var x0,y0,bouge=false,id=null;n.style.touchAction='none';
  n.addEventListener('pointerdown',function(e){if(e.button)return;x0=e.clientX;y0=e.clientY;bouge=false;id=e.pointerId;try{n.setPointerCapture(id)}catch(_){}});
  n.addEventListener('pointermove',function(e){if(id!==e.pointerId)return;var dx=e.clientX-x0,dy=e.clientY-y0;if(!bouge&&Math.hypot(dx,dy)<7)return;bouge=true;n.classList.add('glisse');n.style.translate=dx+'px '+dy+'px'});
  function fin(e){if(id!==e.pointerId)return;id=null;n.classList.remove('glisse');n.style.translate='';if(!bouge)return;n._glisse=true;n.style.pointerEvents='none';var c=document.elementFromPoint(e.clientX,e.clientY);n.style.pointerEvents='';
   c=c&&c.closest&&c.closest('[data-glisse]');if(c&&c!==n&&atel.contains(c))deposer(c)}
  n.addEventListener('pointerup',fin);n.addEventListener('pointercancel',function(e){if(id===e.pointerId){id=null;n.classList.remove('glisse');n.style.translate=''}});
  n.addEventListener('click',function(e){if(n._glisse){n._glisse=false;e.stopPropagation();e.preventDefault()}},true)}
 /* les flèches déplacent le focus entre les éléments d'un mode */
 function roving(L,f){L.forEach(function(n,i){n.addEventListener('keydown',function(e){var d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(!d)return;e.preventDefault();if(e.altKey&&f)return f(i,d);var j=(i+d+L.length)%L.length;L[j].focus()})})}

 function mode(e,doux){var p=S.p;if(!p)return;fermerOrbe();if(PIL)PIL.fermer();clearTimeout(minuteur);S.mode=e;atel.textContent='';liens.textContent='';
  racine.classList.remove('m-0','m-1','m-2','m-3','m-4','m-5');racine.classList.add('actif','outil','m-'+e);legende.hidden=true;etatPhases();var rs=scene.getBoundingClientRect();if(rs.top<0||rs.bottom>innerHeight)scene.scrollIntoView({block:'center',behavior:RM?'auto':'smooth'});
  V.etiq=e===2;V.image=e===3?false:!!p.apercu;V.compo=false;if(p.palette)V.couleurs=p.palette.map(function(x){return x.hex});
  var monte=doux?Promise.resolve(aller(e,0)):aller(e,RM?0:700);monte.then(function(){if(S.mode!==e)return;MODES[e](p)})}
 function refaire(){if(S.mode>=0)mode(S.mode,true)}

 var MODES={
  /* POINT : le cercle central reçoit une nouvelle matière ou reprend un projet */
  0:function(){barreDe(0,'Le point reçoit : cliquez dessus pour importer, écrire ou compléter un projet.');aLaPause(centre,'Déposez une autre matière ici, ou complétez un projet en attente.')},
  /* LIGNE : un point par paramètre ; un point confirmé le reste visuellement */
  1:function(p){var L=M.parametres(p),X=[90,150,210,270,330],els=[];
   L.forEach(function(prm,i){var b=placer(bouton('','pz-par'+(prm.valide?' valide':'')),X[i],200);b.setAttribute('aria-label',prm.nom+' : '+prm.lu+(prm.valide?', confirmé':', à confirmer'));
    var t=el('span','pz-par-t');t.appendChild(el('b',null,prm.nom));t.appendChild(el('small',null,prm.lu));b.appendChild(t);
    declarer(b,{id:'param-'+prm.id,type:'reglage',titre:prm.nom,valeur:prm.lu+(prm.valide?' · confirmé':' · à confirmer'),valide:prm.valide,
     dit:{largeurCm:'La largeur de l\'ouvrage fini. La hauteur suit les proportions de votre image.',usage:'Ce que vous comptez faire du projet : cela ne change pas la grille.',toile:'Le support décide de la taille des points : plus il est fin, plus il y a de points.',finesse:'La part de points gardée : moins de points, c\'est plus rapide à broder, avec moins de détails.',couleurs:'Le nombre de fils DMC : moins de couleurs, de plus grands aplats.'}[prm.id],
     props:[prm],consequence:function(v){return M.consequence(p,prm.id,v[prm.id])},
     appliquer:function(v){var val=v[prm.id];if(prm.id!=='couleurs'){M.regler(p,prm.id,val);return garder(p,prm.nom+' confirmé : '+M.parametres(p)[i].lu+'.').then(function(t2){refaire();return t2})}
      if(!S.img)return Promise.reject(new Error('Pour reconvertir les couleurs, j\'ai besoin de l\'image sur cet appareil : réimportez-la depuis le point.'));
      M.regler(p,'couleurs',val);return convertir(S.img,p.choix,p.ratio).then(function(c){p.palette=c.palette;p.grille=c.grille;garderCases(p,c);p.confirme.couleurs=true;p.confirme.dmc=false;
       M.decider(p,'palette',c.palette.length,c.palette.length+' fils DMC proposés par la conversion','calcul');redessiner(p);return garder(p,c.palette.length+' fils DMC retenus. La validation DMC est à refaire.')}).then(function(t2){refaire();return t2})}});
    atel.appendChild(b);els.push(b)});roving(els);var att=els.filter(function(b,i){return!L[i].valide})[0];
   barreDe(1,'Chaque point est un paramètre. Sélectionnez-en un : l\'orbe propose le réglage et sa conséquence avant de l\'appliquer.');aLaPause(att,'Ce paramètre n\'est pas encore confirmé.')},
  /* RELATION : les fils DMC autour du point, et les liens entre fils proches */
  2:function(p){if(!p.palette)return;nuancier().then(function(fils){if(S.mode!==2)return;var P=E[2],tot=M.total(p),n=Math.min(N-1,p.palette.length),els=[];
    propager(p.palette.slice(0,n).map(function(x){return x.dmc}),true);
    M.paires(p,3).filter(function(r){return r.a<n&&r.b<n}).forEach(function(r){var a=P[r.a+1],b=P[r.b+1],x=p.palette[r.a],y=p.palette[r.b],garde=x.points>=y.points?r.a:r.b,part=garde===r.a?r.b:r.a;
     sv('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'pz-lien-v','vector-effect':'non-scaling-stroke'},liens);
     var h=sv('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'pz-lien-h',tabindex:0,role:'button','aria-label':'Relation entre DMC '+x.dmc+' et DMC '+y.dmc},liens);
     h.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();if(PIL)PIL.montrer(h,{clavier:true})}});
     declarer(h,{id:'lien-'+x.dmc+'-'+y.dmc,type:'lien',titre:'DMC '+x.dmc+' ↔ DMC '+y.dmc,dit:'Ces deux fils sont proches : écart de '+r.ecart+' (sur 441) entre leurs couleurs.',
      pourquoi:'Les regrouper simplifie l\'ouvrage : un fil de moins à acheter et à changer.'+(p.cases?'':' Il faut l\'image sur cet appareil pour redessiner la grille.'),permis:{modifier:!!p.cases,raison:'Réimportez l\'image pour pouvoir regrouper des fils.'},
      actions:p.cases?[{id:'regrouper',nom:'Regrouper',principale:true,consequence:'DMC '+p.palette[part].dmc+' rejoint DMC '+p.palette[garde].dmc+' : '+p.palette[part].points.toLocaleString('fr-FR')+' cases changent de fil. Il restera '+(p.palette.length-1)+' fils, et la validation DMC sera à refaire.',
       faire:function(){var t2='DMC '+p.palette[part].dmc+' regroupé avec DMC '+p.palette[garde].dmc+'.';M.regrouper(p,garde,[part]);redessiner(p);return garder(p,t2).then(function(t3){refaire();return t3})}}]:[]})});
    p.palette.slice(0,n).forEach(function(x,i){var q=P[i+1],b=placer(bouton('','pz-noeud'),q[0],q[1]);b.style.setProperty('--fil',x.hex);b.setAttribute('aria-label','DMC '+x.dmc+(x.nom?', '+x.nom:''));
     var pct=Math.round(x.points/tot*1000)/10,vs=p.cases?M.voisins(p,i,fils,3):[];
     declarer(b,{id:'fil-'+x.dmc,type:'noeud',titre:'DMC '+x.dmc+(x.nom?' · '+x.nom:''),valeur:x.points.toLocaleString('fr-FR')+' points · '+pct+' % de l\'ouvrage',
      dit:'Un fil réel du nuancier DMC, le plus proche de la couleur '+x.ecran+' de votre image (écart '+M.ecart(x.ecran||x.hex,x.hex)+').',
      pourquoi:'Relié au point zéro : c\'est l\'un des '+p.palette.length+' fils du projet. Le remplacer change '+x.points.toLocaleString('fr-FR')+' cases du patron.',
      permis:{modifier:!!p.cases,raison:'Réimportez l\'image pour pouvoir changer de fil.'},
      contenu:function(){var w=el('div','pz-voisins');if(vs.length)w.appendChild(el('small',null,'Fils voisins dans le nuancier :'));vs.forEach(function(v){var s2=el('span','pz-fil');var ii=el('i');ii.style.background=v.hex;s2.appendChild(ii);s2.appendChild(el('b',null,'DMC '+v.code));s2.appendChild(el('small',null,'écart '+v.ecart));w.appendChild(s2)});return w},
      actions:vs.map(function(v){return{id:'essayer-'+v.code,nom:'Prendre DMC '+v.code,dit:v.nom,consequence:'DMC '+v.code+(v.nom?' ('+v.nom+')':'')+' remplacera DMC '+x.dmc+' sur '+x.points.toLocaleString('fr-FR')+' cases. La validation DMC sera à refaire.',
       faire:function(){M.remplacer(p,i,v.code,fils);redessiner(p);return garder(p,'DMC '+v.code+' remplace DMC '+x.dmc+'.').then(function(t3){refaire();return t3})}}})});
     atel.appendChild(b);els.push(b)});roving(els);
    barreDe(2,'Chaque nœud est un fil DMC réel. Les traits pointillés relient des fils très proches : sélectionnez-les pour comprendre et décider.');
    var l1=liens.querySelector('.pz-lien-h');aLaPause(l1||els[0],l1?'Deux fils se ressemblent beaucoup : voulez-vous voir ?':'Sélectionnez un fil pour voir ses voisins.')}).catch(function(){dire('Le nuancier DMC est indisponible pour le moment.')})},
  /* GRILLE : une case par fil, dans l'ordre de broderie ; sélectionner, regrouper, déplacer */
  3:function(p){if(!p.palette)return;var n=p.palette.length,col=n<=16?4:n<=25?5:6,t=240/col,els=[];S.sel=S.sel||[];S.sel=S.sel.filter(function(i){return i<n});
   p.palette.forEach(function(x,i){var b=placer(bouton('','pz-case'+(S.sel.indexOf(i)>=0?' sel':'')),80+(i%col+.5)*t,80+(Math.floor(i/col)+.5)*t);b.style.width=b.style.height=(t/4*.86)+'%';b.style.setProperty('--fil',x.hex);b.dataset.glisse=i;
    b.appendChild(el('span',null,x.dmc));b.setAttribute('aria-label','DMC '+x.dmc+', position '+(i+1)+' sur '+n+(S.sel.indexOf(i)>=0?', sélectionné':''));
    var autres=S.sel.filter(function(j){return j!==i});
    declarer(b,{id:'case-'+x.dmc,type:'cellule',titre:'DMC '+x.dmc+(x.nom?' · '+x.nom:''),valeur:'Position '+(i+1)+' sur '+n+' · '+x.points.toLocaleString('fr-FR')+' points',
     dit:'L\'ordre des cases est l\'ordre de broderie proposé. Glissez une case sur une autre, ou Alt + flèches, pour le changer.',
     pourquoi:autres.length?autres.length+' autre'+(autres.length>1?'s':'')+' fil'+(autres.length>1?'s':'')+' sélectionné'+(autres.length>1?'s':'')+'.':'Sélectionnez plusieurs fils pour les regrouper en un seul.',
     permis:{modifier:!!p.cases,raison:'Réimportez l\'image pour pouvoir modifier la grille.'},
     actions:!p.cases?[]:[{id:'sel',nom:S.sel.indexOf(i)>=0?'Retirer de la sélection':'Sélectionner',faire:function(){var k=S.sel.indexOf(i);if(k>=0)S.sel.splice(k,1);else S.sel.push(i);refaire();return S.sel.length+' fil'+(S.sel.length>1?'s':'')+' sélectionné'+(S.sel.length>1?'s':'')+'.'}}]
      .concat(autres.length?[{id:'regrouper',nom:'Regrouper dans DMC '+x.dmc,principale:true,consequence:autres.map(function(j){return'DMC '+p.palette[j].dmc}).join(', ')+' rejoindront DMC '+x.dmc+' : '+autres.reduce(function(s2,j){return s2+p.palette[j].points},0).toLocaleString('fr-FR')+' cases changent de fil. Il restera '+(n-autres.length)+' fils, et la validation DMC sera à refaire.',
       faire:function(){M.regrouper(p,i,autres);S.sel=[];redessiner(p);return garder(p,'Fils regroupés dans DMC '+x.dmc+'.').then(function(t3){refaire();return t3})}}]:[])
      .concat(i>0?[{id:'avant',nom:'← Avant',faire:function(){M.deplacer(p,i,i-1);redessiner(p);return garder(p,'DMC '+x.dmc+' avancé.').then(function(t3){refaire();return t3})}}]:[])
      .concat(i<n-1?[{id:'apres',nom:'Après →',faire:function(){M.deplacer(p,i,i+1);redessiner(p);return garder(p,'DMC '+x.dmc+' reculé.').then(function(t3){refaire();return t3})}}]:[])});
    if(p.cases)glisser(b,function(c){var j=+c.dataset.glisse;M.deplacer(p,i,j);S.sel=[];redessiner(p);garder(p).then(function(){dire('DMC '+x.dmc+' déplacé en position '+(j+1)+'.');refaire()})});
    atel.appendChild(b);els.push(b)});
   roving(els,function(i,d){if(!p.cases)return;var j=Math.max(0,Math.min(n-1,i+d));if(j===i)return;M.deplacer(p,i,j);redessiner(p);garder(p).then(function(){dire('DMC '+p.palette[j].dmc+' en position '+(j+1)+'.');refaire();setTimeout(function(){var c=atel.querySelectorAll('.pz-case')[j];if(c)c.focus()},RM?0:60)})});
   barreDe(3,'Chaque case est un fil, dans l\'ordre de broderie. Sélectionnez, regroupez, ou glissez pour réordonner (au clavier : flèches, et Alt + flèches pour déplacer).');aLaPause(els[0],'Sélectionnez un fil : je vous propose de le déplacer ou de le regrouper.')},
  /* COMPOSITION : des blocs ordonnés, dimensionnés, validés ; c'est une vraie grille responsive */
  4:function(p){var c=M.composition(p),w=el('div','pz-compo'+(c.valide?' valide':'')),els=[];
   c.blocs.forEach(function(bl,i){var b=bouton('','pz-bloc');b.dataset.glisse=bl.id;b.style.gridColumn='span '+bl.l;b.style.gridRow='span '+bl.h;b.setAttribute('aria-label',M.BLOCS[bl.id]+', bloc '+(i+1)+' sur '+c.blocs.length+', '+bl.l+' colonne'+(bl.l>1?'s':'')+' sur 4');
    b.appendChild(contenuBloc(p,bl.id));b.appendChild(el('span','pz-bloc-n',M.BLOCS[bl.id]));
    declarer(b,{id:'bloc-'+bl.id,type:'bloc',titre:M.BLOCS[bl.id],valeur:'Bloc '+(i+1)+' sur '+c.blocs.length+' · '+bl.l+' × '+bl.h+(c.valide?' · composition validée':''),
     dit:'La composition prépare la page de votre projet : 4 colonnes sur grand écran, une seule sur téléphone.',
     props:[{id:'l',nom:'Largeur',type:'curseur',min:1,max:4,pas:1,unite:'colonne(s)',valeur:bl.l},{id:'h',nom:'Hauteur',type:'curseur',min:1,max:3,pas:1,unite:'rang(s)',valeur:bl.h}],
     consequence:function(v){var l=v.l!=null?v.l:bl.l,h=v.h!=null?v.h:bl.h;return'Le bloc occupera '+l+' colonne'+(l>1?'s':'')+' sur 4 et '+h+' rang'+(h>1?'s':'')+'. La composition sera à valider de nouveau.'},
     appliquer:function(v){M.dimensionner(c,bl.id,v.l,v.h);p.composition=c;M.decider(p,'bloc-'+bl.id,null,'Bloc « '+M.BLOCS[bl.id]+' » : '+v.l+' colonne'+(v.l>1?'s':'')+' × '+v.h+' rang'+(v.h>1?'s':''),'utilisateur');return garder(p,'Bloc redimensionné.').then(function(t3){refaire();return t3})},
     actions:(i>0?[{id:'avant',nom:'← Avant',faire:function(){M.bouger(c,bl.id,-1);p.composition=c;return garder(p,'Bloc avancé.').then(function(t3){refaire();return t3})}}]:[])
      .concat(i<c.blocs.length-1?[{id:'apres',nom:'Après →',faire:function(){M.bouger(c,bl.id,1);p.composition=c;return garder(p,'Bloc reculé.').then(function(t3){refaire();return t3})}}]:[])
      .concat([{id:'valider',nom:c.valide?'Composition validée':'Valider la composition',principale:!c.valide,consequence:c.valide?null:'L\'ordre et la taille des '+c.blocs.length+' blocs seront enregistrés dans le projet.',faire:function(){M.valider(p,c);return garder(p,'Composition validée et enregistrée.').then(function(t3){refaire();return t3})}}])});
    glisser(b,function(cible){var j=c.blocs.indexOf(M.composition(p).blocs.filter(function(x){return x.id===cible.dataset.glisse})[0]);var k=c.blocs.indexOf(bl);if(j<0||k<0)return;c.blocs.splice(k,1);c.blocs.splice(j,0,bl);c.valide=false;p.composition=c;garder(p).then(function(){dire(M.BLOCS[bl.id]+' déplacé.');refaire()})});
    w.appendChild(b);els.push(b)});
   roving(els,function(i,d){M.bouger(c,c.blocs[i].id,d);p.composition=c;garder(p).then(function(){refaire();setTimeout(function(){var q=atel.querySelectorAll('.pz-bloc')[Math.max(0,Math.min(els.length-1,i+d))];if(q)q.focus()},RM?0:60)})});
   atel.appendChild(w);barreDe(4,'Chaque bloc est une partie de la future page du projet. Sélectionnez pour régler, glissez pour réordonner (Alt + flèches au clavier), puis validez.');
   aLaPause(els[0],c.valide?'La composition est validée.':'La composition n\'est pas encore validée.')},
  /* PROJET : la carte vivante ; les avancements sont séparés */
  5:function(p){var f=el('div','pz-fiche'),h=el('div','pz-fiche-t');h.appendChild(el('span','pz-tag','Broderie'));h.appendChild(el('span','pz-statut'+(B.suivante(p)?'':' pret'),B.statut(p)));f.appendChild(h);f.appendChild(el('b','pz-fiche-n',p.titre));
   var av=el('div','pz-av');M.avancements(p).forEach(function(a){var r=el('div','pz-av-l');r.appendChild(el('span',null,a.nom));var j=el('i');var k=el('em');k.style.width=a.v+'%';j.appendChild(k);r.appendChild(j);r.appendChild(el('small',null,a.v+' %'));av.appendChild(r)});f.appendChild(av);
   var man=M.manques(p);f.appendChild(el('p','pz-fiche-s',man.length?'À confirmer : '+man.join(', ')+'.':'Tout est confirmé.'));
   var o=placer(bouton('','pz-fiche-b'),200,212);o.appendChild(f);o.setAttribute('aria-label','Carte projet : '+p.titre);
   declarer(o,{id:'projet-'+p.id,type:'projet',titre:p.titre,valeur:B.statut(p)+' · '+B.ETAPES.filter(function(x){return p.confirme&&p.confirme[x.id]}).length+' choix confirmés sur '+B.ETAPES.length,dit:'Prochaine étape : '+B.action(p),
    contenu:function(){var w=el('div','pz-decis');var H=(p.historique||[]).slice(0,5);w.appendChild(el('small',null,H.length?'Dernières décisions :':'Aucune décision enregistrée pour l\'instant.'));
     H.forEach(function(x){var r=el('p');r.appendChild(el('span','pz-src',M.SOURCES[x.source]||x.source));r.appendChild(el('span',null,x.texte));w.appendChild(r)});
     w.appendChild(el('small',null,'Dernière modification : '+new Date(p.maj||p.cree).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'})));return w},
    actions:[{id:'suite',nom:B.suivante(p)?'Continuer les confirmations':'Revoir les confirmations',principale:true,faire:function(){setTimeout(function(){guider(p)},0);return'Je reprends les confirmations.'}}]});
   atel.appendChild(o);barreDe(5,'La carte du projet : avancements séparés (analyse, confirmations, réalisation, livrables), décisions et manques.');aLaPause(o,'Voici où en est le projet.')}};
 /* le contenu réel d'un bloc de composition */
 function contenuBloc(p,id){var d=el('span','pz-bloc-c');
  if(id==='image'&&p.image){var im=el('img');im.alt='';var u=URL.createObjectURL(p.image);im.onload=function(){URL.revokeObjectURL(u)};im.src=u;d.appendChild(im)}
  else if(id==='grille'&&p.apercu){var g=el('img','pix');g.alt='';g.src=p.apercu;d.appendChild(g)}
  else if(id==='fils'||id==='ecran'){(p.palette||[]).slice(0,12).forEach(function(x){var i=el('i',id==='fils'?'rond':'');i.style.background=id==='fils'?x.hex:x.ecran;d.appendChild(i)})}
  else if(id==='infos'){var g2=p.grille||{};d.appendChild(el('small',null,(g2.l?g2.l+' × '+g2.h+' points · ':'')+(g2.cm?g2.cm[0]+' × '+g2.cm[1]+' cm · ':'')+((p.palette||[]).length)+' fils'))}
  return d}
 etatPhases();

 /* la carte projet naît après la première confirmation : la forme passe par la composition, puis le projet */
 function naissance(p){V.compo=true;compoGrille.setAttribute('href',p.apercu||'');filsCompo(p.palette);racine.classList.add('actif');dire('Je compose : votre image, la grille, les fils.');
  return aller(4,1100).then(function(){return attendre(700)}).then(function(){dire('Voici votre carte projet : elle est rangée dans le Bureau, en préparation.');return aller(5,1100)}).then(function(){var c=projetsZone.querySelector('[data-id="'+p.id+'"]');if(c)c.classList.add('neuve')})}
 function termine(p){S.p=p;quitterMode();var c=panneau('Tout est confirmé.');c.appendChild(barre(p));c.appendChild(el('p','pz-o-fin','Votre projet est prêt pour l\'atelier. Je ne l\'ouvre pas tout de suite : vous déciderez quand passer à la grille détaillée, puis au PDF du patron.'));
  var a=el('div','pz-o-act');a.appendChild(transmettre(p));var s=bouton('Ouvrir dans AIME Stitch · bientôt','pz-b');s.disabled=true;a.appendChild(s);a.appendChild(bouton('Nouvelle matière','pz-b',retour));c.appendChild(a);V.compo=true;aller(5,600)}
 function transmettre(p){var b=bouton(S.connecte?'Transmettre à AIME':'Se connecter pour transmettre','pz-b pz-b-p',function(){if(!S.connecte){location.href='/compte/';return}b.disabled=true;b.textContent='Transmission…';
   post('/api/remontee',{projet:p.type==='broderie'?B.remontee(p):p}).then(function(r){if(r.statut===200){b.textContent='Transmis à AIME';if(p.type==='broderie'){p.transmis=new Date().toISOString();enregistrer(p)}dire('C\'est transmis : AIME a reçu le résumé de votre projet (sans l\'image, qui reste chez vous).')}
    else{b.disabled=false;b.textContent='Transmettre à AIME';dire((r.j&&r.j.raison)||'Transmission impossible pour le moment.')}}).catch(function(){b.disabled=false;b.textContent='Transmettre à AIME';dire('Serveur injoignable : réessayez.')})});return b}

 /* ---------- un texte : la même métamorphose, avec ce qu'il dit ---------- */
 function recevoirTexte(t,nom){S.p=null;quitterMode();var a=A.analyser(t,{ref:new Date()}),rec=B.reconnaitre({type:'texte',texte:t});S.occupe=true;fermerOrbe();racine.classList.add('actif');legende.hidden=true;V.couleurs=null;V.image=false;V.compo=false;
  garderNote(t);var noms=[].concat(a.personnes,a.emails,a.dates.map(function(d){return d.split('-').reverse().join('/')})).slice(0,N-1);
  dire('Je lis votre message…');return aller(0,0).then(function(){return attendre(400)}).then(function(){dire(a.dates.length?a.dates.length+' date'+(a.dates.length>1?'s':'')+' : je les mets en ligne.':'Je le découpe et je le mets en ligne.');return aller(1,1000)})
   .then(function(){return attendre(500)}).then(function(){dire(noms.length?'Je relie ce qu\'il cite : '+noms.slice(0,4).join(', ')+(noms.length>4?'…':'')+'.':'Je cherche ce qu\'il relie.');return aller(2,1000)}).then(function(){return propager(noms)})
   .then(function(){return attendre(700)}).then(function(){dire(a.themes.length?'Je classe : '+a.themes.map(function(k){return A.THEMES[k].nom}).join(', ')+'.':'Je le range.');return aller(3,1000)})
   .then(function(){return attendre(500)}).then(function(){return aller(4,1000)}).then(function(){return attendre(400)}).then(function(){return aller(5,1000)}).then(function(){S.occupe=false;
    var c=panneau(A.GENRES[a.genre]+' · '+a.titre),u=el('dl','pz-lu'),l=function(k,v){if(!v)return;u.appendChild(el('dt',null,k));u.appendChild(el('dd',null,v))};
    l('Nature',A.GENRES[a.genre]);l('Dates',a.dates.map(function(d){return d.split('-').reverse().join('/')}).join(', '));l('Personnes',a.personnes.join(', '));l('Adresses',a.emails.join(', '));l('Thèmes',a.themes.map(function(k){return A.THEMES[k].nom}).join(', '));l('Montants',a.montants.join(', '));c.appendChild(u);
    var act=el('div','pz-o-act');if(rec.broderie){c.appendChild(el('p','pz-o-fin','J\'ai reconnu un projet broderie. Il me manque la photo à broder : importez-la, et je prépare le projet avec vous.'));act.appendChild(bouton('Importer la photo','pz-b pz-b-p',function(){choixFichier.click()}))}
    else c.appendChild(el('p','pz-o-fin','J\'ai gardé votre message'+(S.connecte&&S.compteOk?' sur votre compte':' dans ce navigateur')+'. Voulez-vous que je le transmette à AIME pour qu\'on vous réponde ?'));
    act.appendChild(transmettre({type:'demande',titre:a.titre,statut:'reçu',message:t.slice(0,4000),source:{nom:nom||''}}));act.appendChild(bouton('Nouvelle matière','pz-b',retour));c.appendChild(act)})}

 /* ---------- les messages : sur le compte, sinon dans ce navigateur ---------- */
 function enLocal(n){return{id:n.id,texte:n.texte,cree:n.cree,origine:'appareil',a:A.analyser(n.texte,{ref:new Date()})}}
 function local(t){var n={id:'l-'+uid(),texte:t.slice(0,20000),cree:new Date().toISOString()},L=lire(CLE_LOCAL,[])||[];L.unshift(n);ecrire(CLE_LOCAL,L.slice(0,500));S.local.unshift(enLocal(n));afficherNotes()}
 function garderNote(t){if(!(S.connecte&&S.compteOk))return local(t);post('/api/matiere',{action:'ajouter',texte:t}).then(function(r){if(r.statut===200&&r.j&&r.j.ok){S.notes=r.j.elements.concat(S.notes);afficherNotes()}else local(t)}).catch(function(){local(t)})}

 /* ---------- le Bureau : les cartes projet, puis les messages ---------- */
 var projetsZone=el('section','pz-projets');projetsZone.setAttribute('aria-label','Mes projets');racine.appendChild(projetsZone);
 var notesZone=el('details','pz-notes');notesZone.hidden=true;racine.appendChild(notesZone);
 function enregistrer(p){S.projets=[p].concat(S.projets.filter(function(x){return x.id!==p.id}));return projets.garder(p).catch(function(){dire('Ce navigateur refuse d\'enregistrer : le projet disparaîtra en fermant la page.')})}
 function afficherProjets(){projetsZone.textContent='';if(!S.projets.length)return;projetsZone.appendChild(el('h2','pz-k','Mes projets'));var g=el('div','pz-cartes');
  S.projets.slice().sort(function(a,b){return String(b.maj||b.cree).localeCompare(String(a.maj||a.cree))}).forEach(function(p){var c=el('article','pz-projet');c.dataset.id=p.id;
   var fig=el('div','pz-p-img');if(p.image){var im=el('img');im.alt='';var u=URL.createObjectURL(p.image);im.onload=function(){URL.revokeObjectURL(u)};im.src=u;fig.appendChild(im)}if(p.apercu){var ap=el('img','pz-p-grille');ap.alt='';ap.src=p.apercu;fig.appendChild(ap)}c.appendChild(fig);
   var t=el('div','pz-p-t'),h=el('div','pz-p-tete');h.appendChild(el('span','pz-tag','Broderie'));h.appendChild(el('span','pz-statut'+(B.suivante(p)?'':' pret'),B.statut(p)));t.appendChild(h);t.appendChild(el('h3',null,p.titre));t.appendChild(barre(p));
   var dl=el('dl');B.resume(p).forEach(function(r){dl.appendChild(el('dt',null,r[0]));dl.appendChild(el('dd',r[1]==='à confirmer'?'att':'',r[1]))});t.appendChild(dl);
   var ac=el('p','pz-p-action');ac.appendChild(el('i','pz-o-pastille'));ac.appendChild(el('span',null,B.action(p)));t.appendChild(ac);
   var a=el('div','pz-o-act');a.appendChild(bouton(B.suivante(p)?'Reprendre':'Revoir','pz-b pz-b-p',function(){reprendre(p)}));a.appendChild(transmettre(p));
   var r=bouton('Retirer','pz-b'),arme=0;r.onclick=function(){if(Date.now()-arme<4000){projets.retirer(p.id).then(function(){S.projets=S.projets.filter(function(x){return x.id!==p.id});afficherProjets()})}else{arme=Date.now();r.textContent='Confirmer le retrait';setTimeout(function(){r.textContent='Retirer'},4000)}};a.appendChild(r);t.appendChild(a);
   if(p.transmis)t.appendChild(el('p','pz-leg','Transmis à AIME le '+new Date(p.transmis).toLocaleDateString('fr-FR')));c.appendChild(t);g.appendChild(c)});projetsZone.appendChild(g)}
 function reprendre(p){S.img=null;racine.classList.add('actif');legende.hidden=true;V={q:V.q,couleurs:p.palette?p.palette.map(function(x){return x.hex}):null,etiq:false,image:!!p.apercu,compo:!!p.apercu};
  if(p.apercu){imgGrille.setAttribute('href',p.apercu);compoGrille.setAttribute('href',p.apercu);filsCompo(p.palette)}
  if(p.image){compoImg.setAttribute('href',URL.createObjectURL(p.image));chargerImage(p.image).then(function(r){S.img=pixels(r.g,600)}).catch(function(){})}
  aller(5,900);if(!RM&&scene.scrollIntoView)scene.scrollIntoView({block:'center',behavior:'smooth'});guider(p)}
 function choisirEnAttente(L){if(L.length===1)return reprendre(L[0]);var c=panneau('Quel projet compléter ?');L.forEach(function(p){var b=bouton('','pz-carte-c',function(){reprendre(p)});b.appendChild(el('b',null,p.titre));b.appendChild(el('small',null,B.progression(p)+' % · '+B.action(p)));c.appendChild(b)})}
 function afficherNotes(){var L=S.notes.concat(S.local);notesZone.textContent='';notesZone.hidden=!L.length;if(!L.length)return;notesZone.appendChild(el('summary',null,'Mes messages · '+L.length));
  if(S.connecte&&S.compteOk&&S.local.length)notesZone.appendChild(bouton('Ranger sur mon compte les '+S.local.length+' message'+(S.local.length>1?'s':'')+' de ce navigateur','pz-b pz-b-s',ranger));
  var u=el('ul','pz-l-notes');L.forEach(function(x){var li=el('li');li.appendChild(el('span','pz-tag',A.GENRES[x.a.genre]||'Note'));li.appendChild(el('b',null,x.a.titre));li.appendChild(el('small',null,(x.origine==='compte'?'Compte':'Cet appareil')+' · '+new Date(x.cree).toLocaleDateString('fr-FR')));
   li.appendChild(bouton('Retirer','pz-mini',function(){retirerNote(x)}));u.appendChild(li)});notesZone.appendChild(u)}
 function retirerNote(x){(x.origine==='compte'?post('/api/matiere',{action:'supprimer',id:x.id}).then(function(){S.notes=S.notes.filter(function(y){return y.id!==x.id})}):Promise.resolve().then(function(){ecrire(CLE_LOCAL,(lire(CLE_LOCAL,[])||[]).filter(function(n){return n.id!==x.id}));S.local=S.local.filter(function(y){return y.id!==x.id})})).then(afficherNotes)}
 function ranger(){var L=lire(CLE_LOCAL,[])||[];post('/api/matiere',{action:'importer',textes:L.slice(0,50).map(function(n){return n.texte})}).then(function(r){if(r.statut===200&&r.j&&r.j.ok){var reste=L.slice(50);ecrire(CLE_LOCAL,reste);S.local=reste.map(enLocal);S.notes=r.j.elements.concat(S.notes);afficherNotes();dire('Rangé sur votre compte.')}else dire((r.j&&r.j.raison)||'Rangement impossible pour le moment.')})}

 function dire(t){dit.textContent=t}
 function charger(){S.local=(lire(CLE_LOCAL,[])||[]).filter(function(n){return n&&typeof n.texte==='string'&&n.id}).slice(0,500).map(enLocal);
  return Promise.all([fetch('/api/auth/get-session',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(j){
    S.connecte=!!(j&&j.user);S.nom=S.connecte?(j.user.name||String(j.user.email||'').split('@')[0]):'';if(o.salut)o.salut(S.nom);
    if(S.connecte)return post('/api/matiere',{action:'liste'}).then(function(r){if(r.statut===200&&r.j&&r.j.ok){S.compteOk=true;S.notes=r.j.elements||[]}}).catch(function(){})}),
   projets.tous().then(function(L){S.projets=(L||[]).filter(function(p){return p&&p.type==='broderie'})})]).then(function(){afficherProjets();afficherNotes();
    var en=enAttente();dire(en.length?en.length+' projet'+(en.length>1?'s attendent':' attend')+' vos confirmations : reprenez-le plus bas, ou cliquez sur le point zéro.':'Cliquez sur le point zéro pour commencer.')})}
 charger();
 return{recharger:charger}}

root.AIMEPointZero={monter:monter};
})(typeof self!=='undefined'?self:this);
