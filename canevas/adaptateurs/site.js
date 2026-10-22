/* AIME · Canevas · adaptateur « aime-site ». Un mini-site (ou toute page du moteur Métamorphose) s'édite ICI, dans le
   Canevas, avec ses vrais blocs et ses vraies données : il n'y a pas de second environnement d'édition.
   - Le rendu est celui du moteur (AIMESite.document, le même que l'aperçu du projet), posé sur le plan de travail à sa
     taille réelle ; il suit le zoom et le déplacement du Canevas.
   - Sélectionner un bloc : un cadre apparaît. Le glisser déplace le bloc sur la grille de 12 colonnes ; la poignée de droite
     le dimensionne. Au clavier : flèches pour déplacer, Maj + flèches gauche/droite pour dimensionner, Entrée pour régler.
     L'inspecteur du Canevas propose les mêmes gestes et « Régler le bloc » (variante, titre, texte : le catalogue du moteur).
   - Les opérations sont celles du moteur : S.tasser (aucun chevauchement), S.hauteur (la hauteur suit la largeur).
   - Droits : on compose la page de son propre mini-site sur cet appareil. Le contenu issu du projet validé (motif, fils,
     mesures, avancement, décisions) reste protégé : il se modifie au Point Zéro, jamais ici.
   - Rien n'est écrit tant que la personne n'a pas confirmé : « Enregistrer » range la page dans « aime-sites » (là où
     l'aperçu du projet la relit), « Annuler » revient à la dernière version enregistrée. */
(function(root){'use strict';
var LARG=1280,CLE='aime-sites',PROTEGES=['pz-motif','pz-fils','pz-mesures','pz-avancement','pz-actions','pz-decisions'];
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Le moteur de pages n\'a pas pu être chargé.'))};document.head.appendChild(s)})}
var moteur=null;
function feuille(u){if(document.querySelector('link[href="'+u+'"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}
function chargerMoteur(){if(moteur)return moteur;feuille('/canevas/adaptateurs/site.css');moteur=(root.AIMESite?Promise.resolve():script('/vitrine/rendu.js')).then(function(){return fetch('/vitrine/presentation/studio.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Les ambiances du moteur sont indisponibles.');return r.json()})})
  .then(function(pres){return chargerSystemes().then(function(cat){pres.systemes=cat.compiles;pres.catalogue=cat;return pres})});moteur.catch(function(){moteur=null});return moteur}
/* les Design Systems du catalogue (design/catalogue, format 3.0), validés au chargement ; sans eux, le Canevas reste entier */
function chargerSystemes(){return(root.AIMEDesignCharger?Promise.resolve():script('/design/charger.js')).then(function(){return root.AIMEDesignCharger()}).catch(function(){return{ids:[],sources:{},compiles:{},rapports:{},bases:{}}})}
function lire(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.sites)return o}catch(e){}return{sites:{},cur:null}}
function ecrire(o){try{localStorage.setItem(CLE,JSON.stringify(o));return true}catch(e){return false}}
function copie(o){return JSON.parse(JSON.stringify(o))}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function page(D){return D.site.pages[0]}
function section(D,id){return page(D).sections.filter(function(s){return s.id===id})[0]||null}
function protege(D,s){return/^pointzero:/.test(D.site.modele||'')&&PROTEGES.indexOf(s.id)>=0}
function nomBloc(s){return(root.AIMESite.BLOCS[s.type]||{}).nom||s.type}

/* ---------- le rendu réel, posé sur le plan ---------- */
function couche(D,R){if(D.couche)return;var c=el('div','cvs-couche'),p=el('div','cvs-page'),f=el('iframe','cvs-if');f.title='Le mini-site, rendu par le moteur de pages';f.setAttribute('tabindex','-1');
 var cadre=el('div','cvs-sel');cadre.hidden=true;cadre.tabIndex=0;cadre.setAttribute('role','group');var poignee=el('span','cvs-poignee');poignee.setAttribute('aria-hidden','true');cadre.appendChild(el('b','cvs-nom'));cadre.appendChild(poignee);
 p.appendChild(f);p.appendChild(cadre);c.appendChild(p);var fond=R.querySelector('canvas');R.insertBefore(c,fond?fond.nextSibling:R.firstChild);
 var barre=el('div','cvs-barre');barre.hidden=true;barre.setAttribute('role','status');R.appendChild(barre);
 var ds=el('button','cvs-ds-b');ds.type='button';ds.setAttribute('aria-haspopup','dialog');ds.setAttribute('aria-expanded','false');ds.appendChild(el('i',null));ds.appendChild(el('span',null,'Design System'));ds.onclick=function(){designSystem(D)};R.appendChild(ds);D.dsBouton=ds;
 D.couche=c;etiquetteDS(D);D.page=p;D.iframe=f;D.cadre=cadre;D.barre=barre;armer(D);afficherPage(D)}
function afficherPage(D){var f=D.iframe,doc=root.AIMESite.document(D.site,{presentation:D.pres,medias:'/sites/bibliotheque/'});
 f.onload=function(){try{var d=f.contentDocument;d.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a)e.preventDefault()});
  var h=Math.max(400,d.documentElement.scrollHeight);f.style.height=h+'px';D.page.style.height=h+'px';D.h=h;if(D.calque)D.calque.taille={l:LARG,h:h};mesurer(D);montrerCadre(D);if(D.redessiner)D.redessiner()}catch(e){}};
 f.srcdoc=doc.html}
/* la géométrie, lue dans le rendu : les blocs, et les pistes de la grille (colonnes, lignes) */
function mesurer(D){var d=D.iframe.contentDocument,g=d&&d.querySelector('.grille');D.blocs={};if(!g)return;var o=g.getBoundingClientRect(),cs=d.defaultView.getComputedStyle(g);
 function pistes(v,depart,ecart){var a=[],x=depart;String(v).split(/\s+/).forEach(function(t){var n=parseFloat(t);if(!isNaN(n)){a.push([x,x+n]);x+=n+ecart}});return a}
 D.grille={cols:pistes(cs.gridTemplateColumns,o.left,parseFloat(cs.columnGap)||0),rows:pistes(cs.gridTemplateRows,o.top,parseFloat(cs.rowGap)||0)};
 page(D).sections.forEach(function(s){var e=d.getElementById(s.id);if(!e)return;var r=e.getBoundingClientRect();D.blocs[s.id]={x:r.left,y:r.top,w:r.width,h:r.height}})}
function piste(L,v){var best=0,dm=1e9;L.forEach(function(p,i){var m=(p[0]+p[1])/2,dd=Math.abs(v-m);if(v>=p[0]&&v<=p[1])dd=-1;if(dd<dm){dm=dd;best=i}});return best}
function montrerCadre(D){var b=D.sel&&D.blocs&&D.blocs[D.sel],c=D.cadre;if(!b){c.hidden=true;return}var s=section(D,D.sel);
 c.hidden=false;c.style.left=b.x+'px';c.style.top=b.y+'px';c.style.width=b.w+'px';c.style.height=b.h+'px';c.querySelector('.cvs-nom').textContent=nomBloc(s)+' · '+s.w+' col.';
 c.setAttribute('aria-label','Bloc '+nomBloc(s)+', colonne '+(s.x+1)+', largeur '+s.w+' sur 12. Flèches pour déplacer, Maj + flèches pour dimensionner, Entrée pour régler.')}

/* ---------- modifier : un geste, les opérations du moteur, puis le rendu ---------- */
function changer(D,id,f){var S=root.AIMESite,s=section(D,id);if(!s)return false;var avant=JSON.stringify([s.x,s.y,s.w]);f(s);s.w=Math.max(2,Math.min(12,s.w));s.x=Math.max(0,Math.min(12-s.w,s.x));s.y=Math.max(0,s.y);
 if(JSON.stringify([s.x,s.y,s.w])===avant)return false;S.tasser(page(D).sections,id);sale(D);afficherPage(D);return true}
function sale(D){D.sale=true;barre(D,'Modifications non enregistrées')}
function barre(D,texte,ok){var b=D.barre;b.textContent='';b.appendChild(el('span',null,texte));
 if(D.sale){var e=el('button','cv-b cv-b-p','Enregistrer');e.type='button';e.onclick=function(){enregistrer(D)};var a=el('button','cv-b','Annuler');a.type='button';a.onclick=function(){annuler(D)};b.appendChild(e);b.appendChild(a)}
 else if(ok&&D.apercu){var v=el('a','cv-b cv-b-p','Voir mon mini-site');v.href=D.apercu;b.appendChild(v)}b.hidden=false}
function enregistrer(D){var e=lire();D.site.majLe=new Date().toISOString();e.sites[D.site.id]=copie(D.site);if(!ecrire(e)){barre(D,'Ce navigateur est plein : rien n\'a pu être enregistré.');return}D.garde=copie(D.site);D.sale=false;barre(D,'Enregistré : votre mini-site montre cette composition.',true)}
function annuler(D){D.site=copie(D.garde);D.sale=false;D.sel=null;afficherPage(D);etiquetteDS(D);if(D.dsFen)remplirDS(D,D.dsFen);barre(D,'Revenu à la dernière version enregistrée.')}

/* glisser (déplacer) et poignée (dimensionner), sur la grille du rendu ; clavier sur le cadre */
function armer(D){var c=D.cadre,g=null;
 c.addEventListener('pointerdown',function(e){if(!D.sel)return;e.stopPropagation();e.preventDefault();var s=section(D,D.sel),b=D.blocs[D.sel];if(!s||!b)return;
  g={mode:e.target.classList.contains('cvs-poignee')?'taille':'place',x0:e.clientX,y0:e.clientY,b:b,s:{x:s.x,y:s.y,w:s.w}};try{c.setPointerCapture(e.pointerId)}catch(_){}c.classList.add('tire')});
 c.addEventListener('pointermove',function(e){if(!g)return;var z=D.z||1,dx=(e.clientX-g.x0)/z,dy=(e.clientY-g.y0)/z;
  if(g.mode==='place'){c.style.left=(g.b.x+dx)+'px';c.style.top=(g.b.y+dy)+'px'}else c.style.width=Math.max(40,g.b.w+dx)+'px'});
 c.addEventListener('pointerup',function(e){if(!g)return;var z=D.z||1,dx=(e.clientX-g.x0)/z,dy=(e.clientY-g.y0)/z,G=D.grille,m=g;g=null;c.classList.remove('tire');if(!G||!G.cols.length){montrerCadre(D);return}
  if(Math.abs(dx)<3&&Math.abs(dy)<3){montrerCadre(D);return}
  if(m.mode==='place'){var col=piste(G.cols,m.b.x+dx+8),row=G.rows.length?piste(G.rows,m.b.y+dy+8):m.s.y;if(!changer(D,D.sel,function(s){s.x=col;s.y=row}))montrerCadre(D)}
  else{var fin=piste(G.cols,m.b.x+m.b.w+dx-8);if(!changer(D,D.sel,function(s){s.w=fin-s.x+1}))montrerCadre(D)}});
 c.addEventListener('pointercancel',function(){g=null;c.classList.remove('tire');montrerCadre(D)});
 c.addEventListener('keydown',function(e){if(!D.sel)return;var k=e.key,f=null;
  if(e.shiftKey&&(k==='ArrowLeft'||k==='ArrowRight'))f=function(s){s.w+=k==='ArrowRight'?1:-1};
  else if(k==='ArrowLeft'||k==='ArrowRight')f=function(s){s.x+=k==='ArrowRight'?1:-1};else if(k==='ArrowUp'||k==='ArrowDown')f=function(s){s.y+=k==='ArrowDown'?1:-1};
  else if(k==='Enter'){e.preventDefault();regler(D);return}if(!f)return;e.preventDefault();changer(D,D.sel,f);setTimeout(function(){c.focus({preventScroll:true})},60)})}

/* « Régler le bloc » : variante, titre, texte ; ce que le catalogue du moteur déclare pour ce bloc */
function regler(D){var s=section(D,D.sel);if(!s)return;var b=root.AIMESite.BLOCS[s.type]||{},prot=protege(D,s),v=el('div','cvs-voile'),f=el('form','cvs-fen');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label','Régler le bloc');
 var h=el('div','cvs-t');h.appendChild(el('b',null,'Régler · '+nomBloc(s)));f.appendChild(h);
 if(b.variantes){var l=el('label','cv-champ');l.appendChild(el('span',null,'Forme'));var se=el('select');se.name='variante';Object.keys(b.variantes).forEach(function(k){var o=el('option',null,b.variantes[k]);o.value=k;if((s.variante||Object.keys(b.variantes)[0])===k)o.selected=true;se.appendChild(o)});l.appendChild(se);f.appendChild(l)}
 (b.champs||[]).filter(function(k){return k==='titre'||(k==='texte'&&!prot)}).forEach(function(k){var l=el('label','cv-champ');l.appendChild(el('span',null,k==='titre'?'Titre':'Texte'));var i=el(k==='texte'?'textarea':'input');i.name=k;i.value=s[k]||'';i.maxLength=k==='titre'?120:1200;if(k==='texte')i.rows=3;l.appendChild(i);f.appendChild(l)});
 if(prot)f.appendChild(el('p','cv-aide','Le contenu de ce bloc vient du projet validé (motif, fils, mesures, avancement, décisions) : il se modifie au Point Zéro. Ici, on règle sa forme et son titre.'));
 var a=el('div','cvs-a'),ok=el('button','cv-b cv-b-p','Appliquer');ok.type='submit';var x=el('button','cv-b','Fermer');x.type='button';a.appendChild(ok);a.appendChild(x);f.appendChild(a);v.appendChild(f);document.body.appendChild(v);
 var fermer=function(){v.remove();D.cadre.focus({preventScroll:true})};x.onclick=fermer;v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});
 f.addEventListener('submit',function(e){e.preventDefault();var ch=false;['variante','titre','texte'].forEach(function(k){var i=f.elements[k];if(i&&String(s[k]||'')!==i.value){s[k]=i.value;ch=true}});fermer();if(ch){sale(D);afficherPage(D)}});
 (f.querySelector('select,input,textarea')||ok).focus()}

/* ---------- Design System : une direction en un clic ; le contenu ne bouge pas ----------
   Le choix ne change que le pointeur `presentation.design` (design/systemes.js). Avant d'accepter un changement, on
   compare l'empreinte du contenu : si elle diffère, rien n'est appliqué. Comme tout geste du Canevas, le changement reste
   en attente jusqu'à « Enregistrer » ; « Annuler le changement » remonte l'historique d'apparence ; « Revenir à
   l'apparence d'origine » retire le Design System et rend l'ambiance du mini-site. */
function catDS(D){return D.pres&&D.pres.catalogue||{ids:[],compiles:{}}}
function nomAmbiance(D){var id=D.site.presentation.ambiance,a=(D.pres.ambiances||[]).filter(function(x){return x.id===id})[0];return a&&a.nom||id||'ambiance du mini-site'}
function actuelDS(D){var p=root.AIMEDesign?root.AIMEDesign.pointeur(D.site):null,C=catDS(D);return p&&C.compiles[p.id]?C.compiles[p.id]:null}
function etiquetteDS(D){if(!D.dsBouton)return;var c=actuelDS(D);D.dsBouton.querySelector('span').textContent=c?'Design System · '+c.nom:'Design System';D.dsBouton.querySelector('i').style.background=c?'linear-gradient(135deg,'+c.a.fond+' 0 50%,'+c.a.c1+' 50%)':''}
/* la présentation telle que le moteur la lit, pour un site donné (comparaison et écarts) */
function presDe(D,site){var S=root.AIMESite,doc=S.document(site,{presentation:D.pres,medias:'/sites/bibliotheque/'});return doc}
function resolu(D,site){var c=root.AIMEDesign.resoudre(site,catDS(D));if(c)return c;var a=(D.pres.ambiances||[]).filter(function(x){return x.id===site.presentation.ambiance})[0]||{c1:'#111111',c2:'#D9D9D2',fond:'#FAFAF7',encre:'#111111',typo:'minimal',rayon:6};
 var t=(D.pres.typographies||{})[site.presentation.typo||a.typo]||{titre:'Georgia',texte:'system-ui',graisse:700,casse:'none',interligne:1,approche:'-.01em'};return{a:a,t:t,rayon:site.presentation.rayon!=null?site.presentation.rayon:a.rayon}}
function changerDS(D,r,fen){if(!r.change){dsDire(fen,r.message);return}var E=root.AIMEDesign;
 if(E.empreinte(r.site)!==E.empreinte(D.site)){dsDire(fen,'Changement refusé : il aurait modifié le contenu.');return}
 D.site=r.site;sale(D);afficherPage(D);etiquetteDS(D);if(fen)remplirDS(D,fen);dsDire(fen,r.message)}
function dsDire(fen,t){var s=fen&&fen.querySelector('.cvs-ds-dit');if(s){s.textContent='';setTimeout(function(){s.textContent=t},30)}}
function nuancier(cs){var n=el('span','cvs-ds-n');n.setAttribute('aria-hidden','true');cs.forEach(function(c){var i=el('i');i.style.background=c;n.appendChild(i)});return n}

function designSystem(D){if(D.dsFen){D.dsFen.querySelector('input:checked,input').focus();return}
 if(!root.AIMEDesign||!catDS(D).ids.length){barre(D,'Les Design Systems sont indisponibles pour le moment : le mini-site garde son apparence.');return}
 var f=el('section','cvs-ds');f.setAttribute('role','dialog');f.setAttribute('aria-modal','false');f.setAttribute('aria-labelledby','cvs-ds-t');
 var h=el('div','cvs-ds-h'),t=el('h2',null,'Design System');t.id='cvs-ds-t';h.appendChild(t);var x=el('button','cv-b cvs-ds-x','Fermer');x.type='button';h.appendChild(x);f.appendChild(h);
 f.appendChild(el('p','cvs-ds-p','Une direction change la présentation du mini-site : couleurs, polices, arrondis, densité. Le texte, les images et les données restent identiques.'));
 var fs=el('fieldset','cvs-ds-l');fs.appendChild(el('legend',null,'Choisir une direction'));f.appendChild(fs);
 var a=el('div','cvs-ds-a');[['comparer','Comparer avant / après'],['annuler','Annuler le changement'],['origine','Revenir à l\'apparence d\'origine']].forEach(function(b){var e=el('button','cv-b','');e.type='button';e.dataset.a=b[0];e.textContent=b[1];a.appendChild(e)});f.appendChild(a);
 var dit=el('p','cvs-ds-dit');dit.setAttribute('role','status');dit.setAttribute('aria-live','polite');f.appendChild(dit);
 var det=el('div','cvs-ds-e');f.appendChild(det);
 a.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||b.disabled)return;var E=root.AIMEDesign;
  if(b.dataset.a==='comparer')comparer(D);else if(b.dataset.a==='annuler')changerDS(D,E.annuler(D.site),f);else changerDS(D,E.restaurer(D.site),f)});
 fs.addEventListener('change',function(e){var v=e.target.value;changerDS(D,root.AIMEDesign.appliquer(D.site,v==='origine'?null:v,catDS(D)),f)});
 var fermer=function(){f.remove();D.dsFen=null;D.dsBouton.setAttribute('aria-expanded','false');D.dsBouton.focus({preventScroll:true})};x.onclick=fermer;
 f.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});
 D.couche.parentElement.appendChild(f);D.dsFen=f;D.dsBouton.setAttribute('aria-expanded','true');remplirDS(D,f);(f.querySelector('input:checked')||x).focus()}

function remplirDS(D,f){var C=catDS(D),E=root.AIMEDesign,cur=E.pointeur(D.site),fs=f.querySelector('fieldset'),deja=fs.querySelectorAll('input');
 /* la liste se construit une fois : la reconstruire à chaque choix ferait perdre le focus clavier */
 if(deja.length){[].forEach.call(deja,function(i){i.checked=(cur?cur.id:'origine')===i.value})}else{
 var opts=[{id:'origine',nom:'Apparence d\'origine',dit:'L\'ambiance du mini-site : '+nomAmbiance(D)+'.',cs:(function(r){return[r.a.fond,r.a.c1,r.a.c2,r.a.encre]})(resolu(D,Object.assign({},D.site,{presentation:Object.assign({},D.site.presentation,{design:null})})))}]
  .concat(C.ids.map(function(i){var c=C.compiles[i],s=C.sources[i];return{id:i,nom:c.nom,dit:s.description,cs:[c.a.fond,c.a.c1,c.a.c2,c.a.encre]}}));
 opts.forEach(function(o){var l=el('label','cvs-ds-o'),i=el('input');i.type='radio';i.name='cvs-ds';i.value=o.id;i.checked=(cur?cur.id:'origine')===o.id;
  var tx=el('span','cvs-ds-ot');tx.appendChild(el('b',null,o.nom));tx.appendChild(el('small',null,o.dit));l.appendChild(i);l.appendChild(nuancier(o.cs));l.appendChild(tx);fs.appendChild(l)});}
 var h=D.site.presentation.historique;f.querySelector('[data-a=annuler]').disabled=!(Array.isArray(h)&&h.length);f.querySelector('[data-a=origine]').disabled=!cur;f.querySelector('[data-a=comparer]').disabled=!(Array.isArray(h)&&h.length);
 /* ce qui change par rapport à l'état précédent, et les contrastes de l'état actuel */
 var det=f.querySelector('.cvs-ds-e');det.textContent='';var avant=avantDe(D),A=resolu(D,avant),B=resolu(D,D.site),L=E.ecarts(A,B);
 if(L.length){var tb=el('table','cvs-ds-tab'),cap=el('caption',null,'Ce qui a changé au dernier choix');tb.appendChild(cap);var tr=el('tr');['Jeton','Avant','Après'].forEach(function(x){var th=el('th',null,x);th.scope='col';tr.appendChild(th)});var th0=el('thead');th0.appendChild(tr);tb.appendChild(th0);var bd=el('tbody');
  L.forEach(function(e){var r=el('tr'),th=el('th',null,e.jeton);th.scope='row';r.appendChild(th);[e.avant,e.apres].forEach(function(v){var td=el('td');if(e.couleur)td.appendChild(nuancier([v]));td.appendChild(document.createTextNode(v));r.appendChild(td)});bd.appendChild(r)});tb.appendChild(bd);det.appendChild(tb)}
 var K=E.contrastes(B),u=el('ul','cvs-ds-k');K.forEach(function(k){var li=el('li',k.ok?'ok':'ko',k.paire+' : '+String(k.ratio).replace('.',',')+':1 '+(k.ok?'(AA)':'(insuffisant)'));u.appendChild(li)});det.appendChild(el('p','cvs-ds-st','Contrastes de l\'apparence actuelle'));det.appendChild(u)}
/* l'état « avant » : le site tel qu'il était avant le dernier changement d'apparence */
function avantDe(D){var h=D.site.presentation.historique;if(!Array.isArray(h)||!h.length)return D.site;var s=copie(D.site);s.presentation.design=h[h.length-1].design||null;return s}

/* la comparaison : deux rendus du même contenu par le moteur de pages, côte à côte (empilés sur téléphone) */
function comparer(D){var v=el('div','cvs-voile cvs-comp-v'),f=el('section','cvs-comp');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-labelledby','cvs-comp-t');
 var h=el('div','cvs-ds-h'),t=el('h2',null,'Avant / après');t.id='cvs-comp-t';h.appendChild(t);var x=el('button','cv-b','Fermer');x.type='button';h.appendChild(x);f.appendChild(h);
 var A=avantDe(D),E=root.AIMEDesign;f.appendChild(el('p','cvs-ds-p',E.empreinte(A)===E.empreinte(D.site)?'Même contenu des deux côtés (empreinte '+E.empreinte(D.site).split('-')[0]+') : seule la présentation diffère.':'Attention : le contenu diffère.'));
 var g=el('div','cvs-comp-g');[['Avant',A],['Après',D.site]].forEach(function(p){var fig=el('figure','cvs-comp-f'),cap=el('figcaption');var c=resolu(D,p[1]);cap.appendChild(el('b',null,p[0]));cap.appendChild(document.createTextNode(' · '+(E.pointeur(p[1])?c.nom||'':'Apparence d\'origine')));fig.appendChild(cap);
  var b=el('div','cvs-comp-b'),z=el('div','cvs-comp-z'),i=el('iframe');b.tabIndex=0;b.setAttribute('role','region');b.setAttribute('aria-label',p[0]+' : faire défiler la page (flèches)');i.title=p[0]+' : le mini-site rendu par le moteur de pages';i.setAttribute('tabindex','-1');i.srcdoc=presDe(D,p[1]).html;
  /* la page à sa largeur réelle (1280 px), réduite pour tenir dans la colonne : on compare la composition entière */
  i.onload=function(){try{var h=Math.max(800,i.contentDocument.documentElement.scrollHeight);i.style.height=h+'px';i.dataset.h=h;echelle()}catch(e){}};z.appendChild(i);b.appendChild(z);fig.appendChild(b);g.appendChild(fig)});f.appendChild(g);
 var cadres=[].slice.call(g.querySelectorAll('.cvs-comp-b'));function echelle(){cadres.forEach(function(b){var i=b.querySelector('iframe'),k=b.clientWidth/LARG;i.style.transform='scale('+k+')';b.firstChild.style.height=((+i.dataset.h||1600)*k)+'px'})}
 /* les deux côtés défilent ensemble */
 var lie=false;cadres.forEach(function(b,n){b.addEventListener('scroll',function(){if(lie){lie=false;return}lie=true;cadres[1-n].scrollTop=b.scrollTop})});addEventListener('resize',echelle);
 v.appendChild(f);document.body.appendChild(v);var fermer=function(){removeEventListener('resize',echelle);v.remove();var o=D.dsFen&&D.dsFen.querySelector('[data-a=comparer]');(o||D.dsBouton).focus({preventScroll:true})};x.onclick=fermer;
 v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}if(e.key==='Tab'){var L=[x].concat(cadres),k=L.indexOf(document.activeElement);e.preventDefault();L[(k+(e.shiftKey?L.length-1:1))%L.length].focus()}});x.focus()}

var A={type:'site',nom:'Mini-site',
 charger:function(source){return chargerMoteur().then(function(pres){var e=lire(),brut=e.sites[source.site];if(!brut)throw new Error('Ce mini-site n\'est pas sur cet appareil. Ouvrez-le d\'abord depuis votre projet.');
   var S=root.AIMESite,site=S.migrer?S.migrer(copie(brut)):copie(brut);var p=site.pages[0];if(p.mode!=='grille')S.versGrille(p);
   var D={site:site,garde:copie(site),pres:pres,sel:null,sale:false,h:1600,apercu:source.projet?'/projet/?id='+encodeURIComponent(source.projet)+'&de='+encodeURIComponent(source.de||'/point-zero/'):null};
   A.derniere=D;/* diagnostic : la dernière page ouverte (tests) */
   addEventListener('beforeunload',function(ev){if(D.sale){ev.preventDefault();ev.returnValue=''}});
   return{titre:site.nom||'Mini-site',sous:'Mini-site · '+p.sections.length+' blocs · rendu par le moteur de pages',calque:{nom:'Page',grille:{type:'libre',pas:20},taille:{l:LARG,h:1600}},donnees:D}})},
 dessiner:function(g,c,vue,W,H,D){var R=g.canvas.parentElement;D.calque=c;couche(D,R);D.z=vue.z;
  D.redessiner=function(){var cv=R.querySelector('canvas');if(cv)cv.dispatchEvent(new Event('aime:redessiner'))};
  g.fillStyle='#ECEBE6';g.fillRect(0,0,W,H);var X=(c.t.dx-vue.x)*vue.z,Y=(c.t.dy-vue.y)*vue.z;g.fillStyle='rgba(0,0,0,.18)';g.fillRect(X+6,Y+10,LARG*vue.z,(D.h||1600)*vue.z);
  D.page.style.transform='translate('+X+'px,'+Y+'px) scale('+vue.z+')';D.page.style.setProperty('--z',vue.z);montrerCadre(D)},
 element:function(D,c,x,y){var lx=x-c.t.dx,ly=y-c.t.dy,id=null;Object.keys(D.blocs||{}).forEach(function(k){var b=D.blocs[k];if(lx>=b.x&&lx<=b.x+b.w&&ly>=b.y&&ly<=b.y+b.h)id=k});
  D.sel=id;montrerCadre(D);if(!id)return null;var s=section(D,id),prot=protege(D,s);setTimeout(function(){D.cadre.focus({preventScroll:true})},30);
  var rc=D.cadre.getBoundingClientRect(),rr=D.couche.getBoundingClientRect();
  return{eviter:{x:rc.left-rr.left-12,y:rc.top-rr.top,w:rc.width+24,h:rc.height},titre:nomBloc(s),dit:'Colonne '+(s.x+1)+', largeur '+s.w+' sur 12.'+(prot?' Contenu issu du projet validé : protégé.':''),ref:'Bloc '+nomBloc(s),
   actions:[{id:'regler',nom:'Régler le bloc'},{id:'design',nom:'Design System'},{id:'gauche',nom:'← Déplacer'},{id:'droite',nom:'Déplacer →'},{id:'haut',nom:'↑ Monter'},{id:'bas',nom:'↓ Descendre'},{id:'plus',nom:'Élargir'},{id:'moins',nom:'Rétrécir'}]}},
 agir:function(D,id){if(id==='design'){designSystem(D);return''}if(!D.sel)return'';if(id==='regler'){regler(D);return''}
  var f={gauche:function(s){s.x--},droite:function(s){s.x++},haut:function(s){s.y--},bas:function(s){s.y++},plus:function(s){s.w++},moins:function(s){s.w--}}[id];
  if(!f)return'';return changer(D,D.sel,f)?'Composition modifiée : enregistrez pour la garder.':'Ce bloc ne peut pas aller plus loin.'}};
A.LARG=LARG;A.PROTEGES=PROTEGES;A.designSystem=designSystem;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('site',A);else root.AIMECanevasSite=A;
})(typeof self!=='undefined'?self:this);
