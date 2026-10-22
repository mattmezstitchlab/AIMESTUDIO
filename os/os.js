/* AIME OS · la coque. Un bureau, des fenêtres, un dock, une recherche, une orbe système.
   Chaque app est une page du site ouverte dans une fenêtre (même origine). L'orbe système lit les réglages d'orbe de la
   Régie (regie/site.json, ou le brouillon si « Aperçu de mes réglages » est actif) pour l'app au premier plan.
   Ce qui est gardé : la disposition des fenêtres et les apps épinglées (localStorage « aime-os »), rien d'autre. */
(function(){'use strict';
var A=window.AIMEOSApps,N=window.AIMENav,R=window.AIMERegie,B=window.AIMEBureauSources;if(!A||!N||!document.getElementById('dock'))return;
window.AIMEOS={version:1};
var CLE='aime-os',ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})}
function $(id){return document.getElementById(id)}
function lire(k){try{var t=localStorage.getItem(k);return t?JSON.parse(t):null}catch(e){return null}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches,PETIT=matchMedia('(max-width:760px)');
/* mode « page » : la Page Zéro est le bureau (os/coque.js pose le dock et les fenêtres par-dessus) */
var PAGE=document.body.classList.contains('os-page');
function texte(id,t){var e=$(id);if(e)e.textContent=t}
var cat=A.catalogue(N.ENTREES),parId={};cat.forEach(function(a){parId[a.id]=a});
if(PAGE)CLE='aime-os-zero';var etat=A.etat(lire(CLE)),fen=[],z=10,focusId=null,seq=0,cfg=null;
function annoncer(m){texte('annonce',m)}

/* ---------- icônes ---------- */
function ico(a,cls){if(a.id==='cube'&&window.AIMECubeVue)return'<span class="ico cube-ico'+(cls?' '+cls:'')+'" aria-hidden="true">'+AIMECubeVue.miniHTML()+'</span>';return'<span class="ico'+(a.teinte==='iris'?' iris':'')+(cls?' '+cls:'')+'" style="--t:'+esc(a.teinte==='iris'?'#7C5CFF':a.teinte)+'" aria-hidden="true"><b>'+esc(a.sigle)+'</b></span>'}
/* l'app qui porte une adresse : le plus long préfixe */
function appDe(href){var p=String(href||'').split(/[?#]/)[0],best=null,lg=-1;cat.forEach(function(a){var h=a.href.split(/[?#]/)[0];if(p===h||(h!=='/'&&p.indexOf(h)===0)){if(h.length>lg){lg=h.length;best=a}}});return best||parId.zero||cat[0]}

/* ---------- les réglages d'orbe de la Régie ---------- */
function chargerRegie(){if(!R)return;var apercu=false;try{apercu=localStorage.getItem('aime-regie-apercu')==='1'}catch(e){}
 var b=apercu?lire('aime-regie-brouillon'):null;if(b){try{cfg=R.config(b)}catch(e){}return}
 fetch('/regie/site.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).then(function(j){try{cfg=R.config(j||{})}catch(e){cfg=null}}).catch(function(){})}

/* ---------- géométrie ---------- */
function zone(){var d=$('dock');if(PAGE)return{x:12,y:12,l:innerWidth-24,h:innerHeight-(d.offsetHeight+30)-12};var b=$('bureau');return{x:12,y:12,l:b.clientWidth-24,h:b.clientHeight-(d.offsetHeight+30)}}
function placer(w){var s=w.el.style;if(w.agrandie){var zz=zone();s.left='0px';s.top='0px';s.width=(PAGE?innerWidth:$('bureau').clientWidth)+'px';s.height=(zz.h+24)+'px';return}s.left=w.x+'px';s.top=w.y+'px';s.width=w.l+'px';s.height=w.h+'px'}
var tEnr;function enregistrer(){clearTimeout(tEnr);tEnr=setTimeout(function(){etat.fenetres=fen.map(function(w){return{app:w.app.id,href:w.href,x:w.x,y:w.y,l:w.l,h:w.h,reduite:w.reduite,agrandie:w.agrandie}});ecrire(CLE,etat)},250)}

/* ---------- les fenêtres ---------- */
var SVG={reduire:'<path d="M3 8h10"/>',agrandir:'<rect x="3" y="3" width="10" height="10" rx="2"/>',onglet:'<path d="M9 3h4v4M13 3 7.5 8.5M12 9.5V13H3V4h3.5"/>',fermer:'<path d="M4 4l8 8M12 4l-8 8"/>'};
function bouton(f,l){return'<button type="button" data-f="'+f+'" aria-label="'+l+'" title="'+l+'"><svg viewBox="0 0 16 16" aria-hidden="true">'+SVG[f==='agrandir'?'agrandir':f]+'</svg></button>'}
function ouvrir(id,href,opts){opts=opts||{};var a=parId[id]||appDe(href);href=A.adresseApp(href||a.href);
 var w=fen.filter(function(x){return x.app.id===a.id})[0];
 if(w&&!opts.nouvelle){if(href!==w.href)naviguer(w,href);w.reduite=false;w.el.hidden=false;focaliser(w);enregistrer();return w}
 return creer({app:a,href:href},opts)}
function naviguer(w,href){var cur='';try{cur=w.frame.contentWindow.location.pathname+w.frame.contentWindow.location.search}catch(e){}var p=href.split('#')[0],h=href.indexOf('#')>=0?href.slice(href.indexOf('#')):'';
 if(cur&&cur===p&&h){try{w.frame.contentWindow.location.hash=h}catch(e){}w.href=href;return}w.href=href;w.frame.src=href;w.charge.classList.remove('fini')}
function creer(o,opts){var a=o.app,zz=zone(),g=o.x!=null?A.contraindre(o,zz):A.cascade(fen.length,zz);
 var w={id:'f'+(++seq),app:a,href:o.href,x:g.x,y:g.y,l:g.l,h:g.h,reduite:!!o.reduite,agrandie:!!o.agrandie,prec:null};
 var el=document.createElement('section');el.className='fen';el.setAttribute('role','region');el.setAttribute('aria-label',a.nom);el.dataset.id=w.id;
 el.innerHTML='<div class="fen-barre">'+ico(a,'fen-ico')+'<span class="fen-titre"><b>'+esc(a.nom)+'</b><span class="fen-sous"></span></span><span class="fen-b">'+bouton('reduire','Réduire')+bouton('agrandir','Agrandir')+bouton('onglet','Ouvrir dans un onglet')+bouton('fermer','Fermer')+'</span></div>'+
  '<div class="fen-corps"><iframe title="'+esc(a.nom)+'"></iframe><div class="fen-charge"><span></span></div><div class="fen-voile"></div></div><span class="fen-poignee" aria-hidden="true"></span>';
 w.el=el;w.frame=el.querySelector('iframe');w.charge=el.querySelector('.fen-charge');$('fenetres').appendChild(el);
 w.frame.addEventListener('load',function(){charge(w)});w.frame.src=w.href;
 brancher(w);fen.push(w);placer(w);if(w.reduite)el.hidden=true;else focaliser(w);majDock();accueilVisible();enregistrer();annoncer(a.nom+' ouvert.');return w}
function charge(w){w.charge.classList.add('fini');var cw=w.frame.contentWindow,p='',t='';
 try{p=cw.location.pathname+cw.location.search+cw.location.hash;t=cw.document.title||''}catch(e){}
 /* pas de bureau dans le bureau : un lien vers l'OS ouvre Mon espace */
 if(/^\/bureau\/?(index\.html)?([?#]|$)/.test(p)){w.frame.src='/bureau/espace/';return}
 /* sur la Page Zéro, une fenêtre qui revient à la Page Zéro se referme : on y est déjà */
 if(PAGE&&/^\/(index\.html)?([?#]|$)/.test(p)){fermer(w);scrollTo({top:0,behavior:RM?'auto':'smooth'});return}
 if(p){w.href=A.adresseApp(p);enregistrer()}
 w.el.querySelector('.fen-sous').textContent=t&&t.indexOf(w.app.nom)<0?t.replace(/\s*[·|–-]\s*AIME.*$/,''):'';
 try{cw.addEventListener('keydown',raccourcis);cw.addEventListener('pointerdown',function(){focaliser(w)});['pointermove','keydown','scroll'].forEach(function(ev){cw.addEventListener(ev,activite,{passive:true})})}catch(e){}
 if(w.id===focusId)majContexte()}
function focaliser(w){if(!w)return;focusId=w.id;w.el.style.zIndex=++z;fen.forEach(function(x){x.el.classList.toggle('focus',x===w)});texte('appCourante',w.app.nom);majDock();majContexte()}
function fenDe(el){var id=el&&el.closest&&el.closest('.fen');id=id&&id.dataset.id;return fen.filter(function(w){return w.id===id})[0]}
function fermer(w){w.el.remove();fen=fen.filter(function(x){return x!==w});if(focusId===w.id){focusId=null;var d=premier();if(d)focaliser(d);else texte('appCourante','')}majDock();accueilVisible();enregistrer();annoncer(w.app.nom+' fermé.')}
function reduire(w){w.reduite=true;w.el.hidden=true;if(focusId===w.id){focusId=null;var d=premier();if(d)focaliser(d);else texte('appCourante','')}majDock();accueilVisible();enregistrer()}
function agrandir(w){w.agrandie=!w.agrandie;w.el.classList.toggle('agrandie',w.agrandie);placer(w);enregistrer()}
function premier(){var v=fen.filter(function(x){return!x.reduite});v.sort(function(a,b){return(+b.el.style.zIndex||0)-(+a.el.style.zIndex||0)});return v[0]}
function accueilVisible(){var plein=fen.some(function(w){return!w.reduite&&w.agrandie});if($('accueil'))$('accueil').style.visibility=plein?'hidden':'';if(fond)fond.pause(plein)}

function brancher(w){var el=w.el,barre=el.querySelector('.fen-barre');
 el.addEventListener('pointerdown',function(){focaliser(w)});
 barre.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var f=b.dataset.f;
  if(f==='fermer')fermer(w);else if(f==='reduire')reduire(w);else if(f==='agrandir')agrandir(w);
  else if(f==='onglet'){var u=w.href;try{u=w.frame.contentWindow.location.href}catch(_){}window.open(u,'_blank','noopener')}});
 barre.addEventListener('dblclick',function(e){if(!e.target.closest('button')&&!PETIT.matches)agrandir(w)});
 geste(barre,w,'deplacer');geste(el.querySelector('.fen-poignee'),w,'taille')}
function geste(poignee,w,mode){poignee.addEventListener('pointerdown',function(e){if(e.button!==0||PETIT.matches||e.target.closest('button'))return;if(mode==='deplacer'&&w.agrandie)return;
 e.preventDefault();focaliser(w);var x0=e.clientX,y0=e.clientY,g={x:w.x,y:w.y,l:w.l,h:w.h},fini=false;document.body.classList.add('os-geste');try{poignee.setPointerCapture(e.pointerId)}catch(_){}
 function bouge(ev){var dx=ev.clientX-x0,dy=ev.clientY-y0;if(mode==='deplacer'){w.x=g.x+dx;w.y=Math.max(0,g.y+dy)}else{w.l=Math.max(A.MIN.l,g.l+dx);w.h=Math.max(A.MIN.h,g.h+dy)}placer(w)}
 function lache(){if(fini)return;fini=true;document.body.classList.remove('os-geste');poignee.removeEventListener('pointermove',bouge);var c=A.contraindre(w,zone());w.x=c.x;w.y=c.y;w.l=c.l;w.h=c.h;placer(w);enregistrer()}
 poignee.addEventListener('pointermove',bouge);poignee.addEventListener('pointerup',lache,{once:true});poignee.addEventListener('pointercancel',lache,{once:true})})}
/* un clic dans une fenêtre (dans son cadre) la met au premier plan */
addEventListener('blur',function(){setTimeout(function(){var a=document.activeElement;if(a&&a.tagName==='IFRAME'){var w=fenDe(a);if(w&&w.id!==focusId)focaliser(w)}},0)});
addEventListener('resize',function(){var zz=zone();fen.forEach(function(w){var c=A.contraindre(w,zz);w.x=c.x;w.y=c.y;w.l=c.l;w.h=c.h;placer(w)})});

/* ---------- le dock ---------- */
function epinglees(){return A.epingles(cat,etat.epingles)}
function majDock(){var ep=epinglees(),ids=ep.map(function(a){return a.id}),ouvertes=fen.map(function(w){return w.app}).filter(function(a,i,l){return ids.indexOf(a.id)<0&&l.indexOf(a)===i});
 $('dockApps').innerHTML=ep.concat(ouvertes).map(function(a){var w=fen.filter(function(x){return x.app.id===a.id})[0],f=w&&w.id===focusId;
  return'<button class="dock-app'+(w?' ouverte':'')+(f?' focus':'')+'" type="button" data-app="'+esc(a.id)+'" aria-label="'+esc(a.nom+(w?(w.reduite?', réduite':', ouverte'):''))+'">'+ico(a)+'<span class="dock-bulle" aria-hidden="true">'+esc(a.nom)+'</span></button>'}).join('');}
$('dockApps').addEventListener('click',function(e){var b=e.target.closest('[data-app]');if(!b)return;var w=fen.filter(function(x){return x.app.id===b.dataset.app})[0];
 if(!w)return ouvrir(b.dataset.app);if(w.reduite){w.reduite=false;w.el.hidden=false;focaliser(w);accueilVisible();enregistrer()}else if(w.id===focusId)reduire(w);else focaliser(w)});

/* ---------- la recherche (palette) ---------- */
var resultats=[],sel=0;
function elements(q){var projets=[];if(B){try{projets=B.inventaire(localStorage).projets.slice(0,60).map(function(p){return{type:'projet',nom:p.titre,phrase:p.detail,href:p.lien,app:appDe(p.lien)}})}catch(e){}}
 var groupes=[['Fenêtres ouvertes',A.chercher(q,fen.map(function(w){return{type:'fenetre',nom:w.app.nom,phrase:'Au premier plan',w:w,app:w.app}}),6)],
  ['Apps',A.chercher(q,cat.map(function(a){return{type:'app',nom:a.nom,phrase:a.phrase,app:a}}),q?8:12)],
  ['Actions',A.chercher(q,A.ACTIONS.map(function(x){return{type:'action',nom:x.nom,mots:x.mots,phrase:'',href:x.href,app:parId[x.app]||appDe(x.href)}}),6)],
  ['Projets',q?A.chercher(q,projets,8):projets.slice(0,4)]];
 groupes=groupes.filter(function(g){return g[1].length});if(A.pertinence&&A.plier(q))groupes.sort(function(a,b){return A.pertinence(q,b[1][0])-A.pertinence(q,a[1][0])});return groupes}
function rendrePalette(){var q=$('paletteQ').value,G=elements(q),h='',i=0;resultats=[];
 G.forEach(function(g){h+='<li class="grp" role="presentation">'+esc(g[0])+'</li>';g[1].forEach(function(r){resultats.push(r);h+='<li role="option" id="opt-'+i+'" data-i="'+i+'" aria-selected="'+(i===sel)+'">'+ico(r.app)+'<span class="pt"><b>'+esc(r.nom)+'</b>'+(r.phrase?'<small>'+esc(r.phrase)+'</small>':'')+'</span></li>';i++})});
 if(!resultats.length)h='<li class="vide" role="presentation">Rien ne correspond. Essayez « devis », « site », « Stitch »…</li>';
 $('paletteL').innerHTML=h;sel=Math.min(sel,Math.max(0,resultats.length-1));$('paletteQ').setAttribute('aria-activedescendant',resultats.length?'opt-'+sel:'')}
function choisir(i){var r=resultats[i];if(!r)return;fermerTout();
 if(r.type==='fenetre'){if(r.w.reduite){r.w.reduite=false;r.w.el.hidden=false}focaliser(r.w);accueilVisible()}else if(r.type==='app')ouvrir(r.app.id);else ouvrir(r.app.id,r.href)}
function ouvrirPalette(texte){fermerTout();$('voile').hidden=false;$('palette').hidden=false;var q=$('paletteQ');q.value=texte||'';sel=0;rendrePalette();q.focus();if(texte)q.setSelectionRange(q.value.length,q.value.length)}
$('paletteQ').addEventListener('input',function(){sel=0;rendrePalette()});
$('paletteQ').addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!resultats.length)return;sel=(sel+(e.key==='ArrowDown'?1:-1)+resultats.length)%resultats.length;
  [].forEach.call($('paletteL').querySelectorAll('[role=option]'),function(o){o.setAttribute('aria-selected',String(+o.dataset.i===sel))});$('paletteQ').setAttribute('aria-activedescendant','opt-'+sel);var o=$('opt-'+sel);o&&o.scrollIntoView({block:'nearest'})}
 else if(e.key==='Enter'){e.preventDefault();choisir(sel)}});
$('paletteL').addEventListener('click',function(e){var o=e.target.closest('[role=option]');if(o)choisir(+o.dataset.i)});
if($('chercheBtn'))$('chercheBtn').onclick=function(){ouvrirPalette()};
if($('lanceur')){$('lanceur').addEventListener('submit',function(e){e.preventDefault();ouvrirPalette($('lanceur-q').value)});
$('lanceur-q').addEventListener('input',function(){var v=this.value;this.value='';ouvrirPalette(v)})}

/* ---------- toutes les apps ---------- */
function ouvrirTout(){fermerTout();var cats=[{id:'systeme',t:'Système'}].concat(N.CATS);
 $('toutG').innerHTML=cats.map(function(c){var l=cat.filter(function(a){return a.cat===c.id});if(!l.length)return'';return'<h3>'+esc(c.t)+'</h3><div class="g">'+l.map(function(a){return'<button type="button" data-app="'+esc(a.id)+'">'+ico(a)+'<span class="n">'+esc(a.nom)+'</span>'+(a.statut!=='disponible'?'<span class="s">'+esc(N.STATUTS[a.statut]||a.statut)+'</span>':'')+'</button>'}).join('')+'</div>'}).join('');
 $('voile').hidden=false;$('tout').hidden=false;var f=$('toutG').querySelector('button');f&&f.focus()}
$('toutBtn').onclick=ouvrirTout;
$('tout').addEventListener('click',function(e){if(e.target.closest('[data-fermer]'))return fermerTout();var b=e.target.closest('[data-app]');if(b){fermerTout();ouvrir(b.dataset.app)}});

/* ---------- l'orbe système ---------- */
function courante(){return fen.filter(function(w){return w.id===focusId})[0]||null}
function majContexte(){if(!$('orbePan').hidden)remplirOrbe()}
function suggestions(){var w=courante(),a=w&&w.app||(PAGE?parId.zero:null),o=a&&cfg&&R?R.orbeDe(cfg,a.id):null,L=[];
 if(o&&o.presence!=='aucune')o.suggestions.forEach(function(s){L.push({nom:s.libelle,aide:'Pour '+a.nom,cible:s.cible,pourquoi:s.pourquoi||'Choisie par le propriétaire de '+a.nom+' dans la Régie.',site:true})});
 if(B){try{var r=B.reprendre(B.inventaire(localStorage),1)[0];if(r)L.push({nom:'Reprendre : '+r.titre,aide:r.detail,cible:r.lien,pourquoi:'C\'est le projet modifié le plus récemment dans ce navigateur.'})}catch(e){}}
 if(a&&a.id!=='regie')L.push({nom:'Régler l\'orbe de '+a.nom,aide:'Présence, autonomie, suggestions',cible:'/regie/#orbe',pourquoi:'Vous décidez de ce que l\'orbe dit et fait sur chaque site.'});
 L.push({nom:'Rechercher une app, un projet, une action',aide:'Ctrl K',cible:'palette',pourquoi:'Toujours disponible, partout dans l\'OS.'});return{w:w,a:a,o:o,L:L.slice(0,7)}}
function agir(s,w){fermerTout();if(s.cible==='palette')return ouvrirPalette();if(/^https:/.test(s.cible))return window.open(s.cible,'_blank','noopener');
 if(s.cible.charAt(0)==='#'){if(w){try{w.frame.contentWindow.location.hash=s.cible}catch(_){}}else if(PAGE)location.hash=s.cible;return}ouvrir(appDe(s.cible).id,s.cible)}
function remplirOrbe(){var S=suggestions(),a=S.a,o=S.o,L=S.L;
 $('orbeDit').textContent=a?(o&&o.accueil?o.accueil:'Vous êtes dans '+a.nom+'. Voici ce que je peux vous proposer.'):'Que voulez-vous faire ?';
 $('orbeSugg').innerHTML=L.map(function(s,i){return'<div class="rg-l"><button type="button" data-s="'+i+'">'+esc(s.nom)+(s.aide?'<small>'+esc(s.aide)+'</small>':'')+'</button><button type="button" class="q" data-q="'+i+'" aria-expanded="false" aria-controls="pq-'+i+'" aria-label="Pourquoi : '+esc(s.nom)+'">?</button><p class="pq" id="pq-'+i+'" hidden>'+esc(s.pourquoi)+'</p></div>'}).join('');
 $('orbeSugg').onclick=function(e){var q=e.target.closest('[data-q]');if(q){var p=$('pq-'+q.dataset.q);p.hidden=!p.hidden;q.setAttribute('aria-expanded',String(!p.hidden));return}var b=e.target.closest('[data-s]');if(b)agir(L[+b.dataset.s],S.w)};
 $('orbePref').value=etat.orbe||''}
$('orbePref').onchange=function(){etat.orbe=this.value||null;ecrire(CLE,A.etat(Object.assign({},etat,{fenetres:etat.fenetres})));annoncer(this.value?'Réglage de l\'orbe enregistré.':'L\'orbe suit le réglage de chaque site.')};
/* autonomie : à la première vraie pause dans une app, l'orbe propose (bulle) ou s'ouvre, selon le site et le choix du visiteur ; une fois par app et par visite */
var dejaPropose={},tPause=0;
function activite(){clearTimeout(tPause);tPause=setTimeout(pauseOrbe,8000)}
function pauseOrbe(){var S=suggestions();if(!S.a||dejaPropose[S.a.id]||document.hidden)return;var site=S.o&&S.o.presence!=='aucune'?S.o.autonomie:'discrete',niv=A.autonomie(site,etat.orbe),n=S.L.filter(function(x){return x.site}).length;
 if(niv==='discrete'||!n||!$('palette').hidden||!$('tout').hidden||!$('orbePan').hidden)return;dejaPropose[S.a.id]=true;
 if(niv==='active'){remplirOrbe();$('orbePan').hidden=false;$('orbeBtn').setAttribute('aria-expanded','true');annoncer('L\'orbe propose '+n+' suggestion'+(n>1?'s':'')+' pour '+S.a.nom+'.');return}
 $('orbeBulleT').textContent=(n>1?n+' suggestions':'Une suggestion')+' pour '+S.a.nom;$('orbeBulle').hidden=false}
$('orbeBulleVoir').onclick=function(){$('orbeBulle').hidden=true;$('orbeBtn').click()};$('orbeBulleNon').onclick=function(){$('orbeBulle').hidden=true};
['pointermove','keydown','scroll'].forEach(function(ev){addEventListener(ev,activite,{passive:true})});
$('orbeBtn').onclick=function(){var ouvert=!$('orbePan').hidden;fermerTout();if(ouvert)return;remplirOrbe();$('orbePan').hidden=false;this.setAttribute('aria-expanded','true');var f=$('orbeSugg').querySelector('button');f&&f.focus()};

function fermerTout(){['voile','palette','tout','orbePan','orbeBulle'].forEach(function(id){$(id).hidden=true});$('orbeBtn').setAttribute('aria-expanded','false')}
$('voile').onclick=fermerTout;
function raccourcis(e){if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='k'||e.key==='K')){e.preventDefault();ouvrirPalette()}else if(e.key==='Escape'){var ouvert=!$('palette').hidden||!$('tout').hidden||!$('orbePan').hidden;if(ouvert){e.preventDefault();fermerTout();if($('lanceur-q'))$('lanceur-q').blur()}}}
document.addEventListener('keydown',raccourcis);
document.addEventListener('pointerdown',function(e){if(!$('orbePan').hidden&&!e.target.closest('#orbePan,#orbeBtn'))fermerTout()});
$('accueilBtn').onclick=function(){fen.forEach(function(w){if(!w.reduite){w.reduite=true;w.el.hidden=true}});focusId=null;texte('appCourante','');majDock();accueilVisible();enregistrer();if($('lanceur-q'))$('lanceur-q').focus();else if(PAGE)scrollTo({top:0,behavior:RM?'auto':'smooth'})};

/* ---------- l'accueil ---------- */
function accueil(){var salut=A.salutation(new Date().getHours());$('salut').textContent=salut;
 /* le Point Zéro : le bureau commence par une matière à déposer ; sans lui, l'orbe seule */
 if(window.AIMEPointZero&&$('pointZero'))try{AIMEPointZero.monter($('pointZero'),{salut:function(n){if(n)$('salut').textContent=salut+' '+n}})}catch(e){}
 else if(window.AIMEOrbe&&$('orbeAccueil'))try{var o=AIMEOrbe.monter($('orbeAccueil'),{amplitude:.03});if(RM&&o&&o.animer)o.animer(false)}catch(e){}
 $('actionsRapides').innerHTML=A.ACTIONS.slice(0,5).map(function(x,i){return'<button type="button" data-a="'+i+'">'+esc(x.nom)+'</button>'}).join('');
 $('actionsRapides').onclick=function(e){var b=e.target.closest('[data-a]');if(!b)return;var x=A.ACTIONS[+b.dataset.a];ouvrir(x.app,x.href)};
 var P=[];if(B){try{P=B.reprendre(B.inventaire(localStorage),6)}catch(e){}}
 if(P.length){$('reprendre').hidden=false;$('cartes').innerHTML=P.map(function(p,i){return'<button class="carte-p" type="button" data-p="'+i+'"><b>'+esc(p.titre)+'</b><small>'+esc(p.detail||'')+'</small></button>'}).join('');
  $('cartes').onclick=function(e){var b=e.target.closest('[data-p]');if(!b)return;var p=P[+b.dataset.p];ouvrir(appDe(p.lien).id,p.lien)}}}
function heure(){var d=new Date();$('heure').innerHTML='<span class="j">'+esc(d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'}))+' · </span>'+esc(d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))}

/* ---------- le fond : des points qui se relient en traits blancs, comme sur la Page Zéro ---------- */
var fond=!$('fond')?null:(function(){var c=$('fond'),x=c.getContext('2d'),P=[],W=0,H=0,dpr=1,arret=false,raf=0;
 function taille(){dpr=Math.min(2,devicePixelRatio||1);W=c.clientWidth;H=c.clientHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);var n=Math.round(Math.min(90,W*H/16000));P=[];for(var i=0;i<n;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12});dessin()}
 function dessin(){x.clearRect(0,0,W,H);var D=130;for(var i=0;i<P.length;i++){var p=P[i];for(var j=i+1;j<P.length;j++){var q=P[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);if(d<D){x.strokeStyle='rgba(237,237,240,'+(.09*(1-d/D))+')';x.lineWidth=1;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke()}}
  x.fillStyle='rgba(237,237,240,.32)';x.beginPath();x.arc(p.x,p.y,1.1,0,6.283);x.fill()}}
 function pas(){if(arret||document.hidden){raf=0;return}P.forEach(function(p){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1});dessin();raf=requestAnimationFrame(pas)}
 function lancer(){if(!RM&&!raf&&!arret)raf=requestAnimationFrame(pas)}
 addEventListener('resize',taille);document.addEventListener('visibilitychange',lancer);taille();lancer();
 return{pause:function(on){arret=on;if(!on)lancer()}}})();

/* ---------- départ ---------- */
chargerRegie();if(!PAGE){accueil();heure();setInterval(heure,20000)}majDock();
/* sur la Page Zéro : les liens vers une app s'ouvrent dans une fenêtre (sur grand écran), la page reste dessous */
if(PAGE)document.addEventListener('click',function(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||PETIT.matches)return;var l=e.target.closest&&e.target.closest('a[href]');
 if(!l||l.target||l.hasAttribute('download')||l.closest('.os-coque')||l.closest('.aime-porte'))return;/* la porte ouvre une vraie page, jamais une fenêtre */var u;try{u=new URL(l.href)}catch(_){return}if(u.origin!==location.origin||u.pathname==='/'||/^\/travaux\//.test(u.pathname))return;
 var p=A.adresseApp(u.pathname),a=null,lg=-1;cat.forEach(function(x){var h=x.href.split(/[?#]/)[0];if(h!=='/'&&(p===h||p.indexOf(h)===0)&&h.length>lg){lg=h.length;a=x}});if(!a)return;
 e.preventDefault();ouvrir(a.id,p===u.pathname?p+u.search+u.hash:p)});
if(!PAGE)etat.fenetres.forEach(function(s){var a=parId[s.app]||appDe(s.href);if(a)creer({app:a,href:s.href,x:s.x,y:s.y,l:s.l,h:s.h,reduite:s.reduite,agrandie:s.agrandie})});
fen.forEach(function(w){if(w.agrandie)w.el.classList.add('agrandie');placer(w)});
/* ouvrir une app par l'adresse : /bureau/#app=studio */
var m=/^#app=([a-z0-9-]+)$/.exec(location.hash);if(m&&parId[m[1]]){ouvrir(m[1]);history.replaceState(null,'',location.pathname)}
accueilVisible();
})();
