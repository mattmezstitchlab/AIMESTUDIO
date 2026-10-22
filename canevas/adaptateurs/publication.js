/* AIME · Canevas · adaptateur « publication » : le Studio Publication. Ce n'est pas une application à part : c'est le
   Canevas ouvert sur une publication (un site « aime-site » avec `publication`, ses pages en mode « planche »).
   - Le rendu est celui du moteur de pages (AIMESite.document + publication/planche.js) : ce qu'on compose est ce qu'on publie.
   - Quatre espaces : à gauche la STRUCTURE (pages et blocs, gabarits, blocs à ajouter, médias, styles) ; au centre la
     COMPOSITION (double page, grille 12 × 16 par page, marges, sélection, déplacement et taille à la souris, au doigt et au
     clavier) ; à droite les PROPRIÉTÉS du bloc, de la page ou de la publication ; en bas le CHEMIN DE FER.
   - Rien n'est écrit tant que la personne n'a pas confirmé : « Enregistrer » range la publication dans « aime-sites »
     (avec les mini-sites, et donc dans la sauvegarde du Bureau) ; « Annuler » revient à la dernière version enregistrée ;
     « Défaire » remonte les gestes un par un.
   - Aucune adresse libre : les images viennent de la bibliothèque d'AIME, les liens passent par le filtre du moteur. */
(function(root){'use strict';
var CLE='aime-sites',MED='/sites/bibliotheque/',CASE=60,HP=960,LP=720,EXEMPLES={'aime-magazine':'/publication/exemples/aime-magazine-temoins.aime-site.json'};
function script(u){return new Promise(function(ok,ko){var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Le moteur de pages n\'a pas pu être chargé.'))};document.head.appendChild(s)})}
function feuille(u){if(document.querySelector('link[href="'+u+'"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}
function json(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Indisponible : '+u);return r.json()})}
var moteur=null;
function chargerMoteur(){if(moteur)return moteur;feuille('/canevas/adaptateurs/publication.css');
 moteur=(root.AIMESite?Promise.resolve():script('/vitrine/rendu.js')).then(function(){return root.AIMEPlanche?0:script('/publication/planche.js')}).then(function(){return root.AIMEPublication?0:script('/publication/gabarits.js')})
  .then(function(){return root.AIMEDesignCharger?0:script('/design/charger.js')})
  .then(function(){return Promise.all([json('/vitrine/presentation/studio.json'),root.AIMEDesignCharger(),json(MED+'bibliotheque.json').catch(function(){return{images:[],categories:{}}})])})
  .then(function(r){var P=r[0];P.systemes=r[1].compiles;return{pres:P,cat:r[1],biblio:r[2]}});moteur.catch(function(){moteur=null});return moteur}
function lire(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.sites)return o}catch(e){}return{sites:{},cur:null}}
function ecrire(o){try{localStorage.setItem(CLE,JSON.stringify(o));return true}catch(e){return false}}
function copie(o){return JSON.parse(JSON.stringify(o))}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function btn(t,c,f,lab){var b=el('button',c||'pb',t);b.type='button';if(f)b.onclick=f;if(lab)b.setAttribute('aria-label',lab);return b}
function P(){return root.AIMEPublication}
function S(){return root.AIMESite}
function page(D){return D.site.pages.filter(function(p){return p.id===D.cur})[0]||D.site.pages[0]}
function section(D,id){var p=page(D);return p&&p.sections.filter(function(s){return s.id===id})[0]||null}
function nbp(p){return p&&p.pages===1?1:2}
function nomBloc(t){return(S().BLOCS[t]||{}).nom||t}

/* ---------- les gestes : chaque modification passe ici (défaire, état « non enregistré », rendu) ---------- */
function geste(D,f,msg){var avant=JSON.stringify(D.site);var r=f();if(r===false)return false;if(JSON.stringify(D.site)===avant)return false;D.pile.push(avant);if(D.pile.length>40)D.pile.shift();D.sale=true;rafraichir(D);if(msg)dire(D,msg);return true}
function defaire(D){if(!D.pile.length){dire(D,'Rien à défaire.');return}D.site=JSON.parse(D.pile.pop());if(!section(D,D.sel))D.sel=null;if(!D.site.pages.some(function(p){return p.id===D.cur}))D.cur=D.site.pages[0].id;D.sale=true;rafraichir(D);dire(D,'Geste défait.')}
function dire(D,t){var s=D.ui&&D.ui.dit;if(!s)return;s.textContent='';setTimeout(function(){s.textContent=t},20)}
function enregistrer(D){var pb=P().verifier(D.site);if(pb.length){dire(D,'À corriger avant d\'enregistrer : '+pb[0]);return}var e=lire();D.site.majLe=new Date().toISOString();e.sites[D.site.id]=copie(D.site);if(!ecrire(e)){dire(D,'Ce navigateur est plein : rien n\'a pu être enregistré.');return}
 D.garde=copie(D.site);D.sale=false;D.pile=[];if(/[?&]publication=(nouvelle|exemple-)/.test(location.search)){try{history.replaceState(null,'','/canevas/?publication='+encodeURIComponent(D.site.id))}catch(x){}}barre(D);dire(D,'Enregistré sur cet appareil. Vous retrouverez cette composition à l\'identique.')}
function annuler(D){D.site=copie(D.garde);D.sale=false;D.pile=[];D.sel=null;if(!D.site.pages.some(function(p){return p.id===D.cur}))D.cur=D.site.pages[0].id;rafraichir(D);dire(D,'Revenu à la dernière version enregistrée.')}

/* ---------- le rendu réel de la double page, dans la scène ---------- */
var minuteur=null;
function rafraichir(D,lent){clearTimeout(minuteur);if(lent){minuteur=setTimeout(function(){rafraichir(D)},280);return}afficherPlanche(D);structure(D);proprietes(D);cheminDeFer(D);barre(D)}
function afficherPlanche(D){var p=page(D),f=D.ui.iframe,W=nbp(p)*LP;D.ui.planche.style.width=W+'px';D.ui.planche.style.height=HP+'px';f.style.width=W+'px';f.style.height=HP+'px';
 var doc=S().document(D.site,{page:p.id,presentation:D.pres,medias:MED,edition:true});
 f.onload=function(){try{var d=f.contentDocument;d.documentElement.style.overflow='hidden';d.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a)e.preventDefault()});
  var b=d.body;b.style.background='transparent';var m=d.querySelector('main');if(m){m.style.padding='0';m.style.display='block'}var pl=d.querySelector('.planche');if(pl){pl.style.width=W+'px';pl.style.boxShadow='none'}
  D.debords={};[].forEach.call(d.querySelectorAll('.pl[data-sec]'),function(n){if(n.scrollHeight>n.clientHeight+3||n.scrollWidth>n.clientWidth+3)D.debords[n.getAttribute('data-sec')]=1});cadre(D);proprietes(D)}catch(e){}};
 f.srcdoc=doc.html;ajuster(D);grille(D);cadre(D)}
function ajuster(D){var sc=D.ui.scene,W=nbp(page(D))*LP,dispo=sc.clientWidth-48,haut=sc.clientHeight-48,z=D.zoom==='ajuste'?Math.max(.2,Math.min(1,dispo/W,haut/HP)):D.zoom;D.z=z;
 D.ui.planche.style.transform='scale('+z+')';D.ui.support.style.width=Math.round(W*z)+'px';D.ui.support.style.height=Math.round(HP*z)+'px';D.ui.planche.style.setProperty('--z',z);D.ui.zoom.textContent=Math.round(z*100)+' %'}
function grille(D){var g=D.ui.grille,n=nbp(page(D));g.hidden=!D.grille;g.style.width=n*LP+'px';g.style.setProperty('--n',n*12)}
function geo(pl){return{x:(pl.p*12+pl.x)*CASE,y:pl.y*CASE,w:pl.w*CASE,h:pl.h*CASE}}
function cadre(D){var c=D.ui.cadre,s=D.sel&&section(D,D.sel);if(!s||!s.place){c.hidden=true;return}var g=geo(s.place);c.hidden=false;c.style.left=g.x+'px';c.style.top=g.y+'px';c.style.width=g.w+'px';c.style.height=g.h+'px';
 c.classList.toggle('verrou',!!s.verrou);c.classList.toggle('deborde',!!(D.debords&&D.debords[s.id]));c.querySelector('.pc-nom').textContent=nomBloc(s.type)+(s.verrou?' · verrouillé':'')+(D.debords&&D.debords[s.id]?' · le contenu dépasse':'');
 c.setAttribute('aria-label',nomBloc(s.type)+', page '+(s.place.p+1)+', colonne '+(s.place.x+1)+', rangée '+(s.place.y+1)+', '+s.place.w+' sur '+s.place.h+(s.verrou?', verrouillé':'')+'. Flèches : déplacer ; Maj + flèches : dimensionner ; Page haut ou bas : passer devant ou derrière ; Entrée : régler.')}
function selectionner(D,id,focus){D.sel=id;cadre(D);proprietes(D);structure(D);if(focus&&!D.ui.cadre.hidden)setTimeout(function(){D.ui.cadre.focus({preventScroll:false})},30)}
/* déplacer d'une case, éventuellement d'une page à l'autre de la double page ; dimensionner ; passer devant ou derrière */
function bouger(D,id,d){var s=section(D,id);if(!s||!s.place)return false;if(s.verrou){dire(D,'Ce bloc est verrouillé : déverrouillez-le dans ses propriétés.');return false}
 return geste(D,function(){var n=nbp(page(D)),pl=s.place,col=pl.p*12+pl.x+(d.dx||0);if(d.dx){var p=Math.max(0,Math.min(n-1,Math.floor(col/12)));if(col<0)col=0;var x=col-p*12;if(x+pl.w>12){x=12-pl.w}pl.p=p;pl.x=Math.max(0,x)}
  return P().deplacer(s,{dy:d.dy||0,dw:d.dw||0,dh:d.dh||0,dz:d.dz||0},n)||!!d.dx})}
function armer(D){var c=D.ui.cadre,g=null;
 c.addEventListener('pointerdown',function(e){var s=D.sel&&section(D,D.sel);if(!s)return;e.preventDefault();e.stopPropagation();if(s.verrou){dire(D,'Ce bloc est verrouillé.');return}
  g={mode:e.target.classList.contains('pc-p')?'taille':'place',x0:e.clientX,y0:e.clientY,s:copie(s.place),r:geo(s.place)};try{c.setPointerCapture(e.pointerId)}catch(x){}c.classList.add('tire')});
 c.addEventListener('pointermove',function(e){if(!g)return;var z=D.z||1,dx=(e.clientX-g.x0)/z,dy=(e.clientY-g.y0)/z;if(g.mode==='place'){c.style.left=(g.r.x+dx)+'px';c.style.top=(g.r.y+dy)+'px'}else{c.style.width=Math.max(CASE,g.r.w+dx)+'px';c.style.height=Math.max(CASE,g.r.h+dy)+'px'}});
 c.addEventListener('pointerup',function(e){if(!g)return;var z=D.z||1,dc=Math.round((e.clientX-g.x0)/z/CASE),dr=Math.round((e.clientY-g.y0)/z/CASE),m=g;g=null;c.classList.remove('tire');
  if(!dc&&!dr){cadre(D);return}if(m.mode==='place'){if(!bouger(D,D.sel,{dx:dc,dy:dr}))cadre(D)}else if(!bouger(D,D.sel,{dw:dc,dh:dr}))cadre(D)});
 c.addEventListener('pointercancel',function(){g=null;c.classList.remove('tire');cadre(D)});
 c.addEventListener('keydown',function(e){var k=e.key,d=null;if(!D.sel)return;
  if(e.shiftKey&&(k==='ArrowLeft'||k==='ArrowRight'))d={dw:k==='ArrowRight'?1:-1};else if(e.shiftKey&&(k==='ArrowUp'||k==='ArrowDown'))d={dh:k==='ArrowDown'?1:-1};
  else if(k==='ArrowLeft'||k==='ArrowRight')d={dx:k==='ArrowRight'?1:-1};else if(k==='ArrowUp'||k==='ArrowDown')d={dy:k==='ArrowDown'?1:-1};else if(k==='PageUp'||k==='PageDown')d={dz:k==='PageUp'?1:-1};
  else if(k==='Enter'){e.preventDefault();var i=D.ui.props.querySelector('input,textarea,select');if(i)i.focus();return}else if(k==='Escape'){e.preventDefault();selectionner(D,null);return}
  if(!d)return;e.preventDefault();e.stopPropagation();bouger(D,D.sel,d);setTimeout(function(){c.focus({preventScroll:true})},40)});
 /* cliquer dans la page : le bloc le plus en avant sous le pointeur */
 D.ui.planche.addEventListener('pointerdown',function(e){if(e.target.closest('.pc'))return;var r=D.ui.planche.getBoundingClientRect(),z=D.z||1,x=(e.clientX-r.left)/z,y=(e.clientY-r.top)/z,best=null;
  page(D).sections.forEach(function(s){if(!s.place)return;var q=geo(s.place);if(x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h){if(!best||(s.place.z||0)>(best.place.z||0)||((s.place.z||0)===(best.place.z||0)&&q.w*q.h<geo(best.place).w*geo(best.place).h))best=s}});
  selectionner(D,best?best.id:null,!!best)})}

/* ---------- l'interface : quatre espaces ---------- */
function construire(D,R){if(D.ui)return;R.classList.add('pub-mode');var ui={};D.ui=ui;
 var bar=el('div','pub-barre');bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Publication');ui.barre=bar;
 ui.etat=el('span','pub-etat');bar.appendChild(ui.etat);
 ui.enr=btn('Enregistrer','pb pb-p',function(){enregistrer(D)});ui.ann=btn('Annuler','pb',function(){annuler(D)});ui.def=btn('Défaire','pb',function(){defaire(D)},'Défaire le dernier geste');bar.appendChild(ui.enr);bar.appendChild(ui.ann);bar.appendChild(ui.def);
 bar.appendChild(el('span','pub-sep'));
 ui.bGrille=btn('Grille','pb',function(){D.grille=!D.grille;ui.bGrille.setAttribute('aria-pressed',String(D.grille));grille(D)});ui.bGrille.setAttribute('aria-pressed','true');bar.appendChild(ui.bGrille);
 bar.appendChild(btn('Ajuster','pb',function(){D.zoom='ajuste';ajuster(D)},'Ajuster la double page à l\'écran'));ui.zoom=btn('100 %','pb',function(){D.zoom=1;ajuster(D)},'Afficher à 100 %');bar.appendChild(ui.zoom);
 bar.appendChild(btn('Aperçu','pb',function(){apercu(D)},'Prévisualiser la publication, sur ordinateur ou sur téléphone'));
 ui.lire=el('a','pb','Lire');ui.lire.target='_blank';ui.lire.rel='noopener';bar.appendChild(ui.lire);
 ui.bStr=btn('Structure','pb pb-mob',function(){R.classList.toggle('pub-voir-g');R.classList.remove('pub-voir-d')});ui.bPro=btn('Propriétés','pb pb-mob',function(){R.classList.toggle('pub-voir-d');R.classList.remove('pub-voir-g')});bar.appendChild(ui.bStr);bar.appendChild(ui.bPro);
 ui.dit=el('p','pub-dit');ui.dit.setAttribute('role','status');ui.dit.setAttribute('aria-live','polite');bar.appendChild(ui.dit);
 /* à gauche : la structure */
 var g=el('aside','pub-g');g.setAttribute('aria-label','Structure de la publication');ui.g=g;var tabs=el('div','pub-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Structure');g.appendChild(tabs);ui.gc=el('div','pub-gc');ui.gc.setAttribute('role','tabpanel');g.appendChild(ui.gc);
 D.onglet='pages';[['pages','Pages'],['gabarits','Gabarits'],['blocs','Blocs'],['medias','Médias'],['styles','Styles']].forEach(function(o){var b=btn(o[1],'pub-tab',function(){D.onglet=o[0];structure(D)});b.setAttribute('role','tab');b.id='pub-tab-'+o[0];b.dataset.o=o[0];tabs.appendChild(b)});
 tabs.addEventListener('keydown',function(e){if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;var L=[].slice.call(tabs.children),i=L.indexOf(document.activeElement);if(i<0)return;var j=(i+(e.key==='ArrowRight'?1:L.length-1))%L.length;L[j].click();L[j].focus()});
 /* au centre : la composition */
 var sc=el('div','pub-scene');ui.scene=sc;var sup=el('div','pub-support');ui.support=sup;var pl=el('div','pub-planche');ui.planche=pl;var f=el('iframe','pub-if');f.title='La double page, rendue par le moteur de pages';f.setAttribute('tabindex','-1');ui.iframe=f;
 var gr=el('div','pub-grille');gr.setAttribute('aria-hidden','true');ui.grille=gr;var cd=el('div','pc');cd.tabIndex=0;cd.setAttribute('role','group');cd.hidden=true;cd.appendChild(el('b','pc-nom'));var pp=el('span','pc-p');pp.setAttribute('aria-hidden','true');cd.appendChild(pp);ui.cadre=cd;
 pl.appendChild(f);pl.appendChild(gr);pl.appendChild(cd);sup.appendChild(pl);sc.appendChild(sup);
 /* à droite : les propriétés */
 var d=el('aside','pub-d');d.setAttribute('aria-label','Propriétés');ui.props=d;
 /* en bas : le chemin de fer */
 var cf=el('nav','pub-cf');cf.setAttribute('aria-label','Chemin de fer');ui.cf=cf;
 [sc,g,d,cf,bar].forEach(function(x){R.appendChild(x)});armer(D);
 addEventListener('resize',function(){ajuster(D)});
 R.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){e.preventDefault();defaire(D)}});
 addEventListener('beforeunload',function(ev){if(D.sale){ev.preventDefault();ev.returnValue=''}})}

function barre(D){var u=D.ui;if(!u)return;u.etat.textContent=D.sale?'Modifications non enregistrées':(D.nouveau?'Nouvelle publication, pas encore enregistrée':'Enregistré sur cet appareil');u.enr.disabled=!D.sale&&!D.nouveau;u.ann.disabled=!D.sale;u.def.disabled=!D.pile.length;
 var ok=!D.sale&&!D.nouveau&&lire().sites[D.site.id];u.lire.hidden=!ok;if(ok)u.lire.href='/publication/?id='+encodeURIComponent(D.site.id)}

/* ---------- la structure (à gauche) ---------- */
function mini(p,petit){var n=nbp(p),s='<svg viewBox="0 0 '+(n*12)+' 16" aria-hidden="true" class="pub-mini'+(petit?' petit':'')+'"><rect width="'+(n*12)+'" height="16" class="m-f"/>'+(n===2?'<line x1="12" y1="0" x2="12" y2="16" class="m-l"/>':'');
 (p.sections||p.emplacements||[]).forEach(function(x){var q=x.place;if(!q)return;s+='<rect x="'+(q.p*12+q.x+.15)+'" y="'+(q.y+.15)+'" width="'+Math.max(.3,q.w-.3)+'" height="'+Math.max(.3,q.h-.3)+'" class="m-'+(x.type==='image'?'i':x.type==='titraille'?'t':'x')+'"/>'});return s+'</svg>'}
function structure(D){var u=D.ui;if(!u)return;[].forEach.call(u.g.querySelectorAll('.pub-tab'),function(b){var on=b.dataset.o===D.onglet;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});u.gc.setAttribute('aria-labelledby','pub-tab-'+D.onglet);var c=u.gc;c.textContent='';var p=page(D);
 if(D.onglet==='pages'){c.appendChild(el('p','pub-h','Publication'));var t=el('p','pub-pt',D.site.infos.titre||D.site.nom);c.appendChild(t);
  var ul=el('ol','pub-arbre');D.site.pages.forEach(function(pg){var li=el('li'),b=btn((pg.rubrique?pg.rubrique+' · ':'')+(pg.titre||pg.id),'pub-li'+(pg.id===p.id?' on':''),function(){D.cur=pg.id;D.sel=null;rafraichir(D)});if(pg.id===p.id)b.setAttribute('aria-current','page');li.appendChild(b);
   if(pg.id===p.id){var sl=el('ol','pub-blocs');pg.sections.slice().sort(function(a,b){return(+a.lecture||999)-(+b.lecture||999)}).forEach(function(s){var l2=el('li'),bb=btn((s.place?'':'Réserve · ')+nomBloc(s.type)+(s.titre?' · '+String(s.titre).replace(/\*/g,'').slice(0,28):''),'pub-bl'+(s.id===D.sel?' on':'')+(s.place?'':' res'),function(){if(!s.place){geste(D,function(){s.place={p:0,x:1,y:1,w:6,h:3,z:5}},'Bloc replacé dans la page : ajustez sa place.')}selectionner(D,s.id,true)});l2.appendChild(bb);sl.appendChild(l2)});li.appendChild(sl)}ul.appendChild(li)});c.appendChild(ul)}
 if(D.onglet==='gabarits'){c.appendChild(el('p','pub-aide','Appliquer un gabarit range les blocs de la page par rôle. Les blocs verrouillés gardent leur place ; ce qui ne trouve pas d\'emplacement passe en réserve. Rien n\'est perdu.'));
  P().GABARITS.forEach(function(g){var b=el('div','pub-gab'+(p.gabarit===g.id?' on':''));b.innerHTML=mini(g,true);var tx=el('div');tx.appendChild(el('b',null,g.nom));tx.appendChild(el('span',null,g.famille+' · '+(g.pages===1?'page seule':'double page')));b.appendChild(tx);
   b.appendChild(btn('Appliquer','pb',function(){var r;geste(D,function(){r=P().appliquer(p,g.id);var i=D.site.pages.indexOf(p);D.site.pages[i]=r.page},null);if(r)dire(D,'Gabarit « '+g.nom+' » : '+r.placees.length+' bloc(s) placé(s), '+r.creees.length+' créé(s), '+r.reserve.length+' en réserve.')},'Appliquer le gabarit '+g.nom));
   b.title=g.principe;c.appendChild(b)})}
 if(D.onglet==='blocs'){c.appendChild(el('p','pub-aide','Ajouter un bloc à la page. Il se pose en haut à gauche ; déplacez-le ensuite.'));var gl=el('div','pub-grid2');
  ['titraille','texte','image','citation','encadre','etapes','comparaison','sommaire','folio','bouton','separateur'].forEach(function(t){gl.appendChild(btn(nomBloc(t),'pb pub-add',function(){ajouterBloc(D,t)}))});c.appendChild(gl)}
 if(D.onglet==='medias'){var s=D.sel&&section(D,D.sel);c.appendChild(el('p','pub-aide',s&&s.type==='image'?'Choisir une image remplace celle du bloc sélectionné.':'Choisir une image l\'ajoute à la page. Sélectionnez d\'abord un bloc image pour la remplacer.'));
  var cats=D.biblio.categories||{},sel=el('select','pub-in');sel.setAttribute('aria-label','Catégorie');Object.keys(cats).forEach(function(k){var o=el('option',null,cats[k]);o.value=k;if(k===(D.cat_m||'ecrans'))o.selected=true;sel.appendChild(o)});sel.onchange=function(){D.cat_m=sel.value;structure(D)};c.appendChild(sel);
  var mg=el('div','pub-meds');(D.biblio.images||[]).filter(function(i){return i.cat===(D.cat_m||'ecrans')}).slice(0,60).forEach(function(i){var b=btn('','pub-med',function(){choisirMedia(D,i)},i.alt);var im=el('img');im.src=MED+(i.vignette||i.fichier);im.alt='';im.loading='lazy';b.appendChild(im);mg.appendChild(b)});c.appendChild(mg)}
 if(D.onglet==='styles'){c.appendChild(el('p','pub-aide','Les styles viennent du Design System de la publication. Ils s\'appliquent au bloc sélectionné du même genre.'));
  [['titraille','masthead','Titre de couverture'],['titraille','monumental','Titre monumental'],['titraille','grand','Grand titre'],['titraille','moyen','Titre'],['texte','simple','Corps'],['texte','colonnes','Corps en colonnes'],['texte','lettrine','Corps avec lettrine'],['citation','grande','Grande citation'],['citation','encadree','Citation avec filet'],['etapes','numerotee','Étapes numérotées'],['folio','sceau','Folio avec sceau']].forEach(function(st){
   c.appendChild(btn(st[2],'pub-st pub-st-'+st[0]+'-'+st[1],function(){var s=D.sel&&section(D,D.sel);if(!s){dire(D,'Sélectionnez d\'abord un bloc.');return}if(s.type!==st[0]){dire(D,'Ce style s\'applique à un bloc « '+nomBloc(st[0])+' ».');return}geste(D,function(){s.variante=st[1]},'Style « '+st[2]+' » appliqué.')}))})}}
function ajouterBloc(D,t){var p=page(D),z=p.sections.reduce(function(m,s){return Math.max(m,s.place&&s.place.z||0)},0),s={id:'s-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type:t,variante:Object.keys(S().BLOCS[t].variantes||{})[0]||null,audience:'public',place:{p:0,x:1,y:1,w:t==='image'?6:5,h:t==='separateur'?1:3,z:Math.min(9,z+1)},lecture:p.sections.length+1};
 (S().BLOCS[t].champs||[]).forEach(function(k){s[k]=''});if(t==='etapes')s.liste=[{date:'1',titre:'Première étape',detail:''}];geste(D,function(){p.sections.push(s)},nomBloc(t)+' ajouté.');selectionner(D,s.id,true)}
function choisirMedia(D,i){var s=D.sel&&section(D,D.sel),r=i.l&&i.h?Math.round(i.l/i.h*1000)/1000:null;
 if(s&&s.type==='image'){geste(D,function(){s.src='biblio:'+i.id;if(!s.alt)s.alt=i.alt;if(r&&s.reperes&&s.reperes.length)s.ratio=r},'Image remplacée.');return}
 if(s&&s.type==='comparaison'&&s.variante==='avant-apres'){geste(D,function(){if(!s.src)s.src='biblio:'+i.id;else s.src2='biblio:'+i.id},'Image de comparaison choisie.');return}
 ajouterBloc(D,'image');var n=section(D,D.sel);if(n)geste(D,function(){n.src='biblio:'+i.id;n.alt=i.alt},'Image ajoutée.')}

/* ---------- les propriétés (à droite) ---------- */
function champ(lab,inp){var l=el('label','pub-ch');l.appendChild(el('span',null,lab));l.appendChild(inp);return l}
function texte(D,s,k,lab,long,max){var i=el(long?'textarea':'input','pub-in');i.value=s[k]==null?'':s[k];i.maxLength=max||(long?4000:160);if(long)i.rows=Math.min(10,Math.max(3,String(i.value).split('\n').length+1));
 i.addEventListener('input',function(){var v=i.value;var avant=JSON.stringify(D.site);s[k]=v;if(!D.saisie){D.pile.push(avant);D.saisie=true}D.sale=true;barre(D);clearTimeout(i._t);i._t=setTimeout(function(){D.saisie=false;afficherPlanche(D);cheminDeFer(D)},350)});return champ(lab,i)}
function choix(D,s,k,lab,opts,f){var se=el('select','pub-in');Object.keys(opts).forEach(function(v){var o=el('option',null,opts[v]);o.value=v;if(String(s[k]==null?'':s[k])===v)o.selected=true;se.appendChild(o)});se.onchange=function(){geste(D,function(){s[k]=se.value||null;if(f)f(se.value)})};return champ(lab,se)}
function nombre(D,s,k,lab,min,max,pas,unite,parent){var i=el('input','pub-in');i.type='range';i.min=min;i.max=max;i.step=pas||1;var o=parent?(s[parent]||{}):s;i.value=o[k]!=null?o[k]:(k==='zoom'?100:50);var out=el('output',null,i.value+(unite||''));
 i.addEventListener('input',function(){out.textContent=i.value+(unite||'')});i.addEventListener('change',function(){geste(D,function(){if(parent){s[parent]=s[parent]||{x:50,y:50,zoom:100};s[parent][k]=+i.value}else s[k]=+i.value})});var l=champ(lab,i);l.appendChild(out);return l}
function proprietes(D){var d=D.ui&&D.ui.props;if(!d)return;var cle=(D.sel||'')+'|'+D.cur,garde=D.propsPour===cle&&document.activeElement&&d.contains(document.activeElement)&&/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);if(garde)return;D.propsPour=cle;d.textContent='';var p=page(D),s=D.sel&&section(D,D.sel);
 if(s){d.appendChild(el('p','pub-h',nomBloc(s.type)));if(D.debords&&D.debords[s.id])d.appendChild(el('p','pub-alerte','Le contenu dépasse de son emplacement : agrandissez le bloc ou raccourcissez le texte.'));
  var B=S().BLOCS[s.type]||{};if(B.variantes)d.appendChild(choix(D,s,'variante','Style',B.variantes));
  var T={surtitre:['Surtitre'],titre:['Titre (*mot* = accent italique)'],texte:['Texte',true],auteur:['Auteur'],url:['Adresse du lien'],avant:['Légende « avant »'],apres:['Légende « après »']};
  (B.champs||[]).forEach(function(k){if(s.type==='image'&&k==='texte')return;if(T[k])d.appendChild(texte(D,s,k,s.type==='titraille'&&k==='texte'?'Chapô':T[k][0],T[k][1]))});
  if(s.type==='image'){d.appendChild(texte(D,s,'alt','Texte alternatif (ce que montre l\'image)',false,300));d.appendChild(texte(D,s,'legende','Légende',false,300));
   var fs=el('fieldset','pub-fs');fs.appendChild(el('legend',null,'Cadrage'));fs.appendChild(nombre(D,s,'x','Horizontal',0,100,1,' %','cadrage'));fs.appendChild(nombre(D,s,'y','Vertical',0,100,1,' %','cadrage'));fs.appendChild(nombre(D,s,'zoom','Zoom',100,230,1,' %','cadrage'));d.appendChild(fs);
   var v=el('input');v.type='checkbox';v.checked=!!s.voile;v.onchange=function(){geste(D,function(){s.voile=v.checked})};d.appendChild(champ('Voile pour un texte posé dessus',v));
   var rp=el('fieldset','pub-fs');rp.appendChild(el('legend',null,'Repères (annotations)'));(s.reperes||[]).forEach(function(r,i){var row=el('div','pub-rep');row.appendChild(el('b',null,String(i+1)));var t=el('input','pub-in');t.value=r.texte||'';t.setAttribute('aria-label','Repère '+(i+1)+' : texte');t.maxLength=200;t.onchange=function(){geste(D,function(){r.texte=t.value})};row.appendChild(t);
    var xx=el('input','pub-in pub-n');xx.type='number';xx.min=2;xx.max=98;xx.value=r.x;xx.setAttribute('aria-label','Repère '+(i+1)+' : position horizontale en %');xx.onchange=function(){geste(D,function(){r.x=+xx.value})};var yy=el('input','pub-in pub-n');yy.type='number';yy.min=2;yy.max=98;yy.value=r.y;yy.setAttribute('aria-label','Repère '+(i+1)+' : position verticale en %');yy.onchange=function(){geste(D,function(){r.y=+yy.value})};row.appendChild(xx);row.appendChild(yy);
    row.appendChild(btn('×','pb',function(){geste(D,function(){s.reperes.splice(i,1)})},'Retirer le repère '+(i+1)));rp.appendChild(row)});
   rp.appendChild(btn('+ Repère','pb',function(){geste(D,function(){s.reperes=s.reperes||[];if(s.reperes.length<12)s.reperes.push({x:50,y:50,texte:''})},'Repère ajouté au centre de l\'image : réglez sa position.')}));d.appendChild(rp)}
  if(s.type==='etapes'){var ta=el('textarea','pub-in');ta.rows=6;ta.value=(s.liste||[]).map(function(r){return r.titre+(r.detail?' | '+r.detail:'')}).join('\n');ta.onchange=function(){geste(D,function(){s.liste=ta.value.split('\n').filter(function(l){return l.trim()}).slice(0,20).map(function(l,i){var a=l.split('|');return{date:String(i+1),titre:a[0].trim().slice(0,160),detail:(a.slice(1).join('|')||'').trim().slice(0,400)}})})};d.appendChild(champ('Étapes (une par ligne : titre | détail)',ta))}
  if(s.type==='folio'){var nn=el('input');nn.type='checkbox';nn.checked=s.numero!==false;nn.onchange=function(){geste(D,function(){s.numero=nn.checked?undefined:false})};d.appendChild(champ('Afficher le numéro de page',nn))}
  var fs2=el('fieldset','pub-fs');fs2.appendChild(el('legend',null,'Mise en page'));
  fs2.appendChild(choix(D,s,'ton','Ton',{normal:'Sur le fond',inverse:'Sur une image (texte clair)'}));fs2.appendChild(choix(D,s,'aligne','Alignement',{'':'Par défaut',gauche:'À gauche',centre:'Centré',droite:'À droite'}));
  fs2.appendChild(nombre(D,s,'taille','Taille du texte',.7,1.5,.05,''));
  if(s.place){var pl=el('p','pub-pl','Page '+(s.place.p+1)+' · colonne '+(s.place.x+1)+' · rangée '+(s.place.y+1)+' · '+s.place.w+' × '+s.place.h+' · plan '+(s.place.z||0));fs2.appendChild(pl);
   var gst=el('div','pub-grid2');[['← ',{dx:-1},'Déplacer à gauche'],[' →',{dx:1},'Déplacer à droite'],['↑',{dy:-1},'Monter'],['↓',{dy:1},'Descendre'],['Plus large',{dw:1}],['Moins large',{dw:-1}],['Plus haut',{dh:1}],['Moins haut',{dh:-1}],['Devant',{dz:1}],['Derrière',{dz:-1}]].forEach(function(a){gst.appendChild(btn(a[0],'pb',function(){bouger(D,s.id,a[1])},a[2]))});fs2.appendChild(gst)}
  var vr=el('input');vr.type='checkbox';vr.checked=!!s.verrou;vr.onchange=function(){geste(D,function(){s.verrou=vr.checked||undefined},vr.checked?'Bloc verrouillé : il garde sa place, même en changeant de gabarit.':'Bloc déverrouillé.')};fs2.appendChild(champ('Verrouiller la place',vr));
  var lc=el('input','pub-in pub-n');lc.type='number';lc.min=1;lc.max=99;lc.value=s.lecture||'';lc.onchange=function(){geste(D,function(){s.lecture=Math.max(1,Math.min(99,+lc.value||1))})};fs2.appendChild(champ('Ordre de lecture (téléphone, lecteur d\'écran)',lc));d.appendChild(fs2);
  var act=el('div','pub-grid2');act.appendChild(btn('Dupliquer','pb',function(){var c=copie(s);c.id='s-'+Date.now().toString(36);if(c.place){c.place.z=Math.min(9,(c.place.z||0)+1)}geste(D,function(){p.sections.push(c)},'Bloc dupliqué.');selectionner(D,c.id,true)}));
  act.appendChild(btn('Mettre en réserve','pb',function(){geste(D,function(){s.place=null},'Bloc mis en réserve : il est gardé, hors de la page.');selectionner(D,null)}));
  var sup=btn('Supprimer','pb pb-danger',function(){if(sup.dataset.ok){geste(D,function(){p.sections=p.sections.filter(function(x){return x.id!==s.id})},'Bloc supprimé (Défaire pour revenir).');selectionner(D,null)}else{sup.dataset.ok='1';sup.textContent='Confirmer la suppression'}});act.appendChild(sup);d.appendChild(act);return}
 /* rien de sélectionné : la page, puis la publication */
 d.appendChild(el('p','pub-h','Page'));d.appendChild(texte(D,p,'titre','Titre de la page (sommaire)',false,120));d.appendChild(texte(D,p,'rubrique','Rubrique',false,8));
 var fonds={fond:'Fond',surface:'Surface',surface2:'Surface haute',relief:'Relief',encre:'Encre (sombre)',primaire:'Couleur principale'};for(var i=0;i<nbp(p);i++)(function(i){var o={fonds:(p.fonds||[])[i]||'fond'};var w=choix(D,o,'fonds',(nbp(p)===2?(i?'Fond de la page droite':'Fond de la page gauche'):'Fond de la page'),fonds,function(v){p.fonds=p.fonds||[];p.fonds[i]=v});d.appendChild(w)})(i);
 var som=el('input');som.type='checkbox';som.checked=p.sommaire!==false;som.onchange=function(){geste(D,function(){if(som.checked)delete p.sommaire;else p.sommaire=false})};d.appendChild(champ('Citer cette page au sommaire',som));
 d.appendChild(el('p','pub-h','Publication'));d.appendChild(texte(D,D.site.infos,'titre','Titre de la publication',false,120));
 var E=root.AIMEDesign,cur=E&&E.pointeur(D.site),opt={'':'Apparence d\'origine'};(D.cat.ids||[]).forEach(function(id){opt[id]=D.cat.compiles[id].nom});var o2={ds:cur?cur.id:''};
 d.appendChild(choix(D,o2,'ds','Design System',opt,function(v){var r=E.appliquer(D.site,v||null,D.cat);if(r.change&&E.empreinte(r.site)===E.empreinte(D.site)){D.site.presentation=r.site.presentation;dire(D,r.message)}}));
 var dsb=el('div','pub-grid2');dsb.appendChild(btn('Annuler le changement','pb',function(){var r=E.annuler(D.site);geste(D,function(){D.site.presentation=r.site.presentation},r.message)}));dsb.appendChild(btn('Revenir à l\'origine','pb',function(){var r=E.restaurer(D.site);geste(D,function(){D.site.presentation=r.site.presentation},r.message)}));d.appendChild(dsb);
 d.appendChild(el('p','pub-aide','Changer de Design System ne touche ni aux textes, ni aux images, ni aux annotations, ni à l\'ordre de lecture : AIME le vérifie (empreinte du contenu).'))}

/* ---------- le chemin de fer (en bas) ---------- */
function cheminDeFer(D){var c=D.ui&&D.ui.cf;if(!c)return;c.textContent='';var f=root.AIMEPlanche.folios(D.site.pages),L=el('ol','pub-cf-l');
 D.site.pages.forEach(function(p,i){var li=el('li'),n=nbp(p),b=btn('','pub-cf-p'+(p.id===D.cur?' on':''),function(){D.cur=p.id;D.sel=null;rafraichir(D)});b.innerHTML=mini(p);b.appendChild(el('span',null,(n===2?f[p.id]+'–'+(f[p.id]+1):String(f[p.id]))+' · '+(p.titre||p.id)));if(p.id===D.cur)b.setAttribute('aria-current','page');li.appendChild(b);L.appendChild(li)});c.appendChild(L);
 var a=el('div','pub-cf-a'),p=page(D);
 a.appendChild(btn('←','pb',function(){var r=P().deplacerPage(D.site,p.id,-1);if(r.ok)geste(D,function(){D.site=r.site},'Page avancée.');else dire(D,'La couverture reste en tête.')},'Avancer la page'));
 a.appendChild(btn('→','pb',function(){var r=P().deplacerPage(D.site,p.id,1);if(r.ok)geste(D,function(){D.site=r.site},'Page reculée.');else dire(D,'Cette page ne peut pas aller plus loin.')},'Reculer la page'));
 a.appendChild(btn('Dupliquer','pb',function(){var r=P().dupliquerPage(D.site,p.id);if(r.page)geste(D,function(){D.site=r.site;D.cur=r.page},'Page dupliquée.')}));
 var sp=btn('Retirer','pb pb-danger',function(){if(!sp.dataset.ok){sp.dataset.ok='1';sp.textContent='Confirmer';return}var r=P().retirerPage(D.site,p.id);if(r.ok)geste(D,function(){D.site=r.site;D.cur=D.site.pages[0].id},'Page retirée (Défaire pour revenir).');else dire(D,'La couverture ne se retire pas.')});a.appendChild(sp);
 var se=el('select','pub-in');se.setAttribute('aria-label','Gabarit de la nouvelle page');P().GABARITS.forEach(function(g){var o=el('option',null,g.nom);o.value=g.id;se.appendChild(o)});a.appendChild(se);
 a.appendChild(btn('+ Page','pb pb-p',function(){var r=P().ajouterPage(D.site,se.value,p.id);geste(D,function(){D.site=r.site;D.cur=r.page},'Page ajoutée après la page courante.')}));c.appendChild(a)}

/* ---------- l'aperçu : la publication entière, ordinateur ou téléphone, sans rien enregistrer ---------- */
function apercu(D){var v=el('div','pub-voile'),f=el('section','pub-ap');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label','Aperçu de la publication');
 var h=el('div','pub-ap-h');h.appendChild(el('b',null,'Aperçu · '+(D.site.infos.titre||D.site.nom)));var o=btn('Ordinateur','pb',null),t=btn('Téléphone','pb',null),x=btn('Fermer','pb',null);o.setAttribute('aria-pressed','true');t.setAttribute('aria-pressed','false');[o,t,x].forEach(function(b){h.appendChild(b)});f.appendChild(h);
 var cad=el('div','pub-ap-c'),fr=el('iframe');fr.title='Aperçu de la publication';fr.srcdoc=S().document(D.site,{unePage:true,presentation:D.pres,medias:MED}).html;cad.appendChild(fr);f.appendChild(cad);v.appendChild(f);document.body.appendChild(v);
 function mode(m){cad.classList.toggle('tel',m);o.setAttribute('aria-pressed',String(!m));t.setAttribute('aria-pressed',String(m))}o.onclick=function(){mode(false)};t.onclick=function(){mode(true)};
 var fermer=function(){v.remove();D.ui.barre.querySelector('button').focus()};x.onclick=fermer;v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});x.focus()}

/* ---------- ouvrir ---------- */
function source(id){if(id==='nouvelle')return Promise.resolve({site:P().nouvelle({titre:'Ma publication',design:'aime-editorial'}),nouveau:true});
 var m=/^exemple-([a-z0-9-]+)$/.exec(id);if(m&&EXEMPLES[m[1]]){return json(EXEMPLES[m[1]]).then(function(s){var loc=lire().sites[s.id];return loc?{site:loc}:{site:s,nouveau:true}})}
 var s=lire().sites[id];if(!s)return Promise.reject(new Error('Cette publication n\'est pas sur cet appareil.'));if(!s.publication)return Promise.reject(new Error('Ce site n\'est pas une publication : ouvrez-le comme mini-site.'));return Promise.resolve({site:s})}
var A={type:'publication',nom:'Publication',
 charger:function(src){var id=String(src.site||'nouvelle');return chargerMoteur().then(function(m){return source(id).then(function(o){var site=S().migrer?S().migrer(copie(o.site)):copie(o.site);
  var D={site:site,garde:copie(site),pres:m.pres,cat:m.cat,biblio:m.biblio,cur:site.pages[0].id,sel:null,sale:!!o.nouveau,nouveau:!!o.nouveau,pile:[],zoom:'ajuste',grille:true,debords:{}};A.derniere=D;
  return{titre:site.infos.titre||site.nom||'Publication',sous:'Publication · '+site.pages.length+' pages · Studio Publication',calque:{nom:'Publication',grille:{type:'libre',pas:0},taille:{l:1440,h:960}},donnees:D}})})},
 dessiner:function(g,c,vue,W,H,D){g.fillStyle='#1C1C22';g.fillRect(0,0,W,H);var R=g.canvas.parentElement;if(!D.ui){construire(D,R);rafraichir(D)}else ajuster(D)},
 element:function(){return null},agir:function(){return''}};
A.CASE=CASE;
if(root.AIMECanevas&&root.AIMECanevas.adaptateur)root.AIMECanevas.adaptateur('publication',A);else root.AIMECanevasPublication=A;
})(typeof self!=='undefined'?self:this);
