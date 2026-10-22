/* AIME · Canevas · adaptateur « cube-personne ». Seul ce fichier relie le Canevas au cube ; le plan de travail n'en dépend pas.
   Le cube s'ouvre DÉPLIÉ en 2D : six faces en croix, chacune composée de vrais blocs Métamorphose (AIMESite), dessinés
   à leur place dans la grille de la face. Sélectionner une face ou un bloc fait apparaître, dans l'inspecteur du Canevas :
     face  : aperçu (le rendu Métamorphose réel, avec le timbre et l'orbe), couleurs (ambiances du moteur), disposition
             complète (le générateur de sites existant), carte postale, cube en 3D (même modèle, cube/vue3d.js)
     bloc  : avancer, reculer, pleine largeur ↔ moitié ; « Régler mon orbe » sur le bloc Orbe ; le timbre renvoie au Point Zéro
   Chaque changement est enregistré tout de suite : le style dans le cube (cube/stock.js), la page dans « aime-sites »
   (le rangement des sites Métamorphose, partagé avec le générateur). Le Bureau et la 3D relisent les mêmes données.
   Unités natives : une face = F unités de scène. */
(function(root){'use strict';
var F=240,G=16,PAD=14,ENTETE=34,CROIX=[[1,1],[2,1],[3,1],[0,1],[1,0],[1,2]];
var SCRIPTS=['/cube/modele.js','/cube/stock.js','/vitrine/rendu.js','/cube/composition.js','/compte/timbre.js','/cube/vue3d.js','/regie/donnees.js'],STYLES=['/compte/timbre.css','/cube/vue3d.css'];
var NUANCIER=['editorial','neon','pastel','botanique','m_nuit','luxe','suisse','a_ciel','m_terra','h_doux','f_affiche','artdeco'];
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Le cube n\'a pas pu être chargé.'))};document.head.appendChild(s)})}
function feuille(u){if(document.querySelector('link[href="'+u+'"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}
var moteur=null;
function chargerMoteur(){if(moteur)return moteur;STYLES.forEach(feuille);
 var deja={'/cube/modele.js':'AIMECube','/cube/stock.js':'AIMECubeStock','/vitrine/rendu.js':'AIMESite','/cube/composition.js':'AIMECubeCompo','/compte/timbre.js':'AIMETimbre','/cube/vue3d.js':'AIMECubeVue','/regie/donnees.js':'AIMERegie'};
 moteur=SCRIPTS.reduce(function(p,u){return p.then(function(){return root[deja[u]]?null:script(u)})},Promise.resolve())
  .then(function(){return fetch('/vitrine/presentation/studio.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Les ambiances Métamorphose sont indisponibles.');return r.json()})});
 moteur.catch(function(){moteur=null});return moteur}
var CLE_SITES='aime-sites';
function lireSites(){try{var o=JSON.parse(localStorage.getItem(CLE_SITES)||'null');if(o&&o.sites)return o}catch(e){}return{sites:{},cur:null}}
function ecrireSites(o){try{localStorage.setItem(CLE_SITES,JSON.stringify(o));return true}catch(e){return false}}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

/* ---------- la géométrie du dépli ---------- */
function origine(d){var p=CROIX[d.face];return[p[0]*(F+G),p[1]*(F+G)]}
function blocs(D,id){var s=D.sites[id],L=(s&&s.pages[0].sections)||[],S=root.AIMESite,rows=0;L.forEach(function(x){rows=Math.max(rows,x.y+S.hauteur(x.type,x.w))});
 var cw=(F-2*PAD)/12,rh=Math.min(cw*1.1,(F-2*PAD-ENTETE)/Math.max(1,rows));
 return L.map(function(x){return{s:x,x:PAD+x.x*cw,y:PAD+ENTETE+x.y*rh,w:x.w*cw,h:S.hauteur(x.type,x.w)*rh}})}
function sous(D,c,x,y){var lx=x-c.t.dx,ly=y-c.t.dy,C=root.AIMECube,res=null;C.FACETTES.forEach(function(d){var o=origine(d);if(lx>=o[0]&&lx<=o[0]+F&&ly>=o[1]&&ly<=o[1]+F){res={d:d,b:null};
  blocs(D,d.id).forEach(function(b){if(lx-o[0]>=b.x&&lx-o[0]<=b.x+b.w&&ly-o[1]>=b.y&&ly-o[1]<=b.y+b.h)res.b=b.s})}});return res}

/* ---------- les fenêtres de l'adaptateur (aperçu, 3D, orbe) ---------- */
function fenetre(titre,corps,large){var v=el('div','cvc-voile'),f=el('div','cvc-fen'+(large?' large':''));f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label',titre);
 var h=el('div','cvc-t');h.appendChild(el('b',null,titre));var x=el('button','cv-b','Fermer');x.type='button';h.appendChild(x);f.appendChild(h);f.appendChild(corps);v.appendChild(f);document.body.appendChild(v);
 var avant=document.activeElement;function fermer(){v.remove();if(avant&&avant.focus)avant.focus({preventScroll:true})}
 x.onclick=fermer;v.addEventListener('click',function(e){if(e.target===v)fermer()});v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});x.focus();return{fermer:fermer,el:f}}
function apercu(D,id){var C=root.AIMECube,s=D.sites[id],fr=el('iframe','cvc-if');fr.title='Aperçu de la face '+C.facette(id).nom;
 fr.srcdoc=root.AIMESite.document(s,{presentation:D.pres,medias:'/sites/bibliotheque/',personne:{nom:D.moi.name,image:D.moi.image},orbe:D.cube.orbe}).html;
 fenetre('Face '+C.facette(id).nom+' · rendu Métamorphose',fr,true)}
function vue3d(D,id){var b=el('div','cvc-3d'),z=el('div');b.appendChild(z);b.appendChild(el('p','cv-aide','Le même cube que dans le Bureau : glissez pour tourner, Tab et Entrée pour choisir une face.'));
 var w=fenetre('Mon cube en 3D',b);var v=root.AIMECubeVue.monter(z,{cube:D.cube,moi:D.moi,interactif:true,surFace:function(){}});v.montrer(id||'identite')}
function reglerOrbe(D,dire){var R=root.AIMERegie,C=root.AIMECube,o=D.cube.orbe,f=el('form','cvc-orbe');
 var LIB={apparence:['Apparence',{irisee:'Irisée',calme:'Calme',lumineuse:'Lumineuse'}],couleurs:['Couleurs',{aime:'Celles d\'AIME',froides:'Froides',chaudes:'Chaudes'}],
  presence:['Présence',R.PRESENCES],animation:['Animation',{vivante:'Vivante',sobre:'Sobre',immobile:'Immobile'}],autonomie:['Autonomie',R.AUTONOMIES],
  interaction:['Interaction',{toucher:'Au toucher',ecrit:'Par écrit',voix:'À la voix (prévu)'}],explications:['Explications',{'toujours':'Toujours expliquer','sur-demande':'Sur demande'}]};
 Object.keys(C.ORBE).forEach(function(k){var l=el('label','cv-champ');l.appendChild(el('span',null,LIB[k][0]));var s=el('select');s.name=k;C.ORBE[k].forEach(function(v){var op=el('option',null,LIB[k][1][v]||v);op.value=v;if(o[k]===v)op.selected=true;s.appendChild(op)});l.appendChild(s);f.appendChild(l)});
 var fs=el('fieldset','cvc-co');fs.appendChild(el('legend',null,'Le compagnon'));C.COMPAGNON.forEach(function(k){var l=el('label','cv-coche'),c=el('input');c.type='checkbox';c.name='co-'+k;c.checked=!!o.compagnon[k];l.appendChild(c);l.appendChild(el('span',null,R.OPTIONS_COMPAGNON[k]));fs.appendChild(l)});f.appendChild(fs);
 f.appendChild(el('p','cv-aide','Des préférences, pas des droits : une orbe plus autonome n\'obtient aucun accès de plus. Jamais d\'action irréversible sans votre confirmation. Droits actuels : '+(D.cube.droitsOrbe.length?D.cube.droitsOrbe.join(', '):'aucun')+'.'));
 var ok=el('button','cv-b cv-b-p','Enregistrer');ok.type='submit';f.appendChild(ok);var w=fenetre('Mon orbe',f);
 f.addEventListener('submit',function(e){e.preventDefault();var p={compagnon:{}};Object.keys(C.ORBE).forEach(function(k){p[k]=f.elements[k].value});C.COMPAGNON.forEach(function(k){p.compagnon[k]=f.elements['co-'+k].checked});
  C.reglerOrbe(D.cube,p);root.AIMECubeStock.garder(D.moi,D.cube);
  /* le compagnon existant lit ses réglages ici (orbe/compagnon.js) : on lui transmet les mêmes choix, sur cet appareil */
  try{var k='aime-orbe-reglages',r=JSON.parse(localStorage.getItem(k)||'{}')||{};['commentaires','clic','envie','hesitation'].forEach(function(x){r[x]=D.cube.orbe.compagnon[x]});localStorage.setItem(k,JSON.stringify(r))}catch(_){}
  w.fermer();dire('Orbe enregistrée sur cet appareil. Le compagnon suit ces réglages ; ses droits restent vides.')})}

/* ---------- enregistrer : le style dans le cube, la page dans les sites ---------- */
function garder(D,id){var e=lireSites();if(id)e.sites[D.sites[id].id]=D.sites[id];else Object.keys(D.sites).forEach(function(k){e.sites[D.sites[k].id]=D.sites[k]});var a=ecrireSites(e),b=root.AIMECubeStock.garder(D.moi,D.cube);return a&&b}

var A={type:'cube',nom:'Cube-personne',
 charger:function(source){return chargerMoteur().then(function(pres){var S=root.AIMECubeStock;return S.qui().then(function(u){return u||S.demo()}).then(function(moi){
   if(!moi)throw new Error('Pas encore de cube : créez votre timbre, puis posez une première carte dans Le Monde AIME.');
   var C=root.AIMECube,K=root.AIMECubeCompo,cube=S.charger(moi),e=lireSites(),sites={};
   C.IDS.forEach(function(id){sites[id]=K.depuis(C,cube,id,{S:root.AIMESite,moi:moi,ancien:e.sites[K.siteId(moi,id)]})});
   var D={moi:moi,cube:cube,sites:sites,pres:pres,focus:C.facette(source.facette)?source.facette:null};garder(D);var p=C.progression(cube);
   return{titre:'Mon cube'+(moi.demo?' · démonstration':''),sous:'Déplié · '+p.posees+' / '+p.total+' faces posées · blocs Métamorphose',calque:{nom:'Cube déplié',grille:{type:'universelle',pas:20},taille:{l:4*F+3*G,h:3*F+2*G}},donnees:D}})})},
 dessiner:function(g,c,vue,W,H,D,etat){var C=root.AIMECube,Sx=root.AIMESite,z=vue.z;function E(x,y){return[(x+c.t.dx-vue.x)*z,(y+c.t.dy-vue.y)*z]}
  g.fillStyle='#ECEBE6';g.fillRect(0,0,W,H);
  C.FACETTES.forEach(function(d){var f=D.cube.facettes[d.id],o=origine(d),p=E(o[0],o[1]),s=F*z,col=C.couleurs(D.cube,d.id),pose=f.etat==='posee',r=Math.min(18,s*.07);
   g.save();g.beginPath();if(g.roundRect)g.roundRect(p[0],p[1],s,s,r);else g.rect(p[0],p[1],s,s);
   if(pose){var gr=g.createLinearGradient(p[0],p[1],p[0]+s,p[1]+s);gr.addColorStop(0,col[0]);gr.addColorStop(.55,col[1]);gr.addColorStop(1,col[2]);g.fillStyle=gr}else g.fillStyle='#17151F';g.fill();
   g.lineWidth=etat.sel===d.id?3:1.2;g.strokeStyle=etat.sel===d.id?'#22D3EE':'rgba(255,255,255,.35)';if(!pose)g.setLineDash([6,5]);g.stroke();g.setLineDash([]);g.clip();
   var fs=Math.max(8,13*z);g.fillStyle=pose?'#fff':'#C4B5FD';g.font='600 '+fs+'px "Inter Variable",sans-serif';g.textBaseline='top';g.fillText(d.nom.toUpperCase()+(pose?'':' · à venir'),p[0]+PAD*z,p[1]+PAD*z*.9);
   blocs(D,d.id).forEach(function(b){var q=E(o[0]+b.x+2,o[1]+b.y+2),w=(b.w-4)*z,h=(b.h-4)*z;g.fillStyle=etat.bloc===b.s.id&&etat.sel===d.id?'rgba(255,255,255,.42)':'rgba(255,255,255,'+(pose?.2:.08)+')';g.fillRect(q[0],q[1],w,h);
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;g.strokeRect(q[0],q[1],w,h);if(h>10*z&&w>30){g.fillStyle=pose?'#fff':'rgba(255,255,255,.7)';g.font='500 '+Math.max(7,10*z)+'px "Inter Variable",sans-serif';g.fillText((Sx.BLOCS[b.s.type]||{}).nom||b.s.type,q[0]+5*z,q[1]+4*z,w-8*z)}});
   g.restore()})},
 element:function(D,c,x,y){var h=sous(D,c,x,y);if(!h)return null;var C=root.AIMECube,d=h.d,f=D.cube.facettes[d.id];D._sel=d.id;D._bloc=h.b&&h.b.id;
  var face=[{id:'apercu',nom:'Aperçu (rendu réel)'},{id:'couleurs+',nom:'Couleurs suivantes'},{id:'couleurs-',nom:'Couleurs précédentes'},{id:'disposition',nom:'Disposition complète'},{id:'carte',nom:f.etat==='vide'?'Écrire la carte':'Corriger la carte'},{id:'3d',nom:'Voir en 3D'}];
  if(h.b){var nb=(root.AIMESite.BLOCS[h.b.type]||{}).nom||h.b.type,act=[{id:'avant',nom:'Avancer le bloc'},{id:'apres',nom:'Reculer le bloc'},{id:'largeur',nom:h.b.w>=12?'Moitié de largeur':'Pleine largeur'}];
   if(h.b.type==='orbe')act.unshift({id:'orbe',nom:'Régler mon orbe'});if(h.b.type==='timbre')act.unshift({id:'timbre',nom:'Mon timbre (Point Zéro)'});
   return{titre:nb+' · face '+d.nom,dit:'Un bloc Métamorphose de la face '+d.nom+'. '+(f.etat==='posee'?'':'La face attend encore sa carte postale.'),ref:'Face '+d.nom+' · bloc '+nb,actions:act.concat(face)}}
  return{titre:'Face '+d.nom,dit:(f.etat==='posee'?'Posée':'À venir')+' · '+(f.style?'ambiance '+f.style.ambiance:'teinte de la facette')+' · '+(f.visibilite==='publie'?'publiée':'privée')+'.',ref:'Face '+d.nom,actions:face}},
 agir:function(D,id,e,etat){var C=root.AIMECube,K=root.AIMECubeCompo,S=root.AIMESite,fid=D._sel,site=D.sites[fid],moi=D.moi;if(!fid)return'';etat.sel=fid;etat.bloc=D._bloc||null;
  var dire=function(t){var p=document.querySelector('.cv-dit');if(p){p.textContent=t;p.hidden=false}};
  if(id==='apercu'){apercu(D,fid);return'Aperçu de la face '+C.facette(fid).nom+'.'}
  if(id==='3d'){vue3d(D,fid);return'Le cube en 3D : les mêmes données.'}
  if(id==='orbe'){reglerOrbe(D,dire);return''}
  if(id==='timbre'){location.href='/point-zero/?intention=identite';return''}
  if(id==='carte'){location.href='/aime/?carte='+fid;return''}
  if(id==='disposition'){garder(D,fid);location.href='/sites/?site='+encodeURIComponent(site.id)+'&retour='+encodeURIComponent('/canevas/?cube='+fid);return''}
  if(id==='couleurs+'||id==='couleurs-'){var cur=site.presentation.ambiance,i=NUANCIER.indexOf(cur),n=NUANCIER[(i<0?0:i+(id==='couleurs+'?1:NUANCIER.length-1))%NUANCIER.length],amb=(D.pres.ambiances||[]).filter(function(a){return a.id===n})[0],cs=K.couleursDe(amb);
   if(!cs)return'Cette ambiance n\'est pas disponible.';C.styler(D.cube,fid,{ambiance:n,couleurs:cs});site.presentation.ambiance=n;return garder(D,fid)?'Couleurs : '+(amb.nom||n)+'. Enregistré ; le cube 3D et le Bureau les montrent.':'Ce navigateur est plein : rien n\'a pu être enregistré.'}
  if((id==='avant'||id==='apres'||id==='largeur')&&D._bloc){var ok=id==='largeur'?K.elargir(S,site,D._bloc):K.deplacer(S,site,D._bloc,id==='avant'?-1:1);if(!ok)return'Ce bloc est déjà au bout.';return garder(D,fid)?'Disposition enregistrée.':'Ce navigateur est plein.'}
  return''}};
A.F=F;A.CROIX=CROIX;A.NUANCIER=NUANCIER;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('cube',A);else root.AIMECanevasCube=A;
})(typeof self!=='undefined'?self:this);
