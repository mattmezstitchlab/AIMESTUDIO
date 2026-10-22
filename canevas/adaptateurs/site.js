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
function chargerMoteur(){if(moteur)return moteur;feuille('/canevas/adaptateurs/site.css');moteur=(root.AIMESite?Promise.resolve():script('/vitrine/rendu.js')).then(function(){return fetch('/vitrine/presentation/studio.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Les ambiances du moteur sont indisponibles.');return r.json()})});moteur.catch(function(){moteur=null});return moteur}
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
 D.couche=c;D.page=p;D.iframe=f;D.cadre=cadre;D.barre=barre;armer(D);afficherPage(D)}
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
function annuler(D){D.site=copie(D.garde);D.sale=false;D.sel=null;afficherPage(D);barre(D,'Revenu à la dernière version enregistrée.')}

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
   actions:[{id:'regler',nom:'Régler le bloc'},{id:'gauche',nom:'← Déplacer'},{id:'droite',nom:'Déplacer →'},{id:'haut',nom:'↑ Monter'},{id:'bas',nom:'↓ Descendre'},{id:'plus',nom:'Élargir'},{id:'moins',nom:'Rétrécir'}]}},
 agir:function(D,id){if(!D.sel)return'';if(id==='regler'){regler(D);return''}
  var f={gauche:function(s){s.x--},droite:function(s){s.x++},haut:function(s){s.y--},bas:function(s){s.y++},plus:function(s){s.w++},moins:function(s){s.w--}}[id];
  if(!f)return'';return changer(D,D.sel,f)?'Composition modifiée : enregistrez pour la garder.':'Ce bloc ne peut pas aller plus loin.'}};
A.LARG=LARG;A.PROTEGES=PROTEGES;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('site',A);else root.AIMECanevasSite=A;
})(typeof self!=='undefined'?self:this);
