/* AIME · module Temps, la présentation dans l'écran de projet (page « Programme », compte/projet.js → bloc { type: 'module' }).
   Le navigateur ne décide d'AUCUN droit : il affiche la vue que /api/temps a calculée pour la personne connectée, propose les gestes
   que cette vue contient, et renvoie chaque geste au serveur avec la révision qu'il avait sous les yeux (409 : il reçoit la version à jour).
   Présentations d'une même ressource : Liste et Circle (le cadran de 24 heures, modules/temps/cercle.js), et Comparer pour le propriétaire.
   La Chronologie reste dans le code (vue=chrono dans l'adresse) mais n'est plus proposée : Circle la remplace (décision D1).
   Le contexte (mode, moment choisi) vit dans l'adresse : changer de mode garde le moment ; un lien le rouvre.
   Un arc du cercle ouvre le MÊME panneau que la carte de la Liste (carteMoment), donc les mêmes gestes autorisés.
   Relecture toutes les 2 s (« depuis » la révision connue : rien ne repart si rien n'a changé). Textes venus du serveur : textContent.
   AIMETemps.monter(zone, { espace, dire }) → { arreter() } */
(function(){'use strict';
var RELIRE=2000;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function bouton(txt,cls,aria){var b=el('button','b '+(cls||'b-s'),txt);b.type='button';if(aria)b.setAttribute('aria-label',aria);return b}
function api(espace,q){return fetch('/api/temps?espace='+encodeURIComponent(espace)+(q||''),{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._code=r.status;return j})})}
function envoyer(b){return fetch('/api/temps',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._code=r.status;return j})})}
var MOTS={owner:'organisation',editor:'coordination',contributor:'contribution',viewer:'lecture',guest:'participation'};

var MODES={liste:1,cercle:1,chrono:1,comparer:1};
/* le contexte du module dans l'adresse : vue (mode) et moment ; le reste de l'adresse (espace, page) n'est pas touché */
function lireContexte(){try{var q=new URLSearchParams(location.search),v=q.get('vue'),m=q.get('moment');return{mode:MODES[v]?v:'liste',moment:/^[a-z0-9-]{1,60}$/.test(m||'')?m:null}}catch(_){return{mode:'liste',moment:null}}}
function ecrireContexte(mode,moment){try{var u=new URL(location.href);if(mode&&mode!=='liste')u.searchParams.set('vue',mode);else u.searchParams.delete('vue');
 if(moment)u.searchParams.set('moment',moment);else u.searchParams.delete('moment');var a=u.pathname+u.search;if(a!==location.pathname+location.search)history.replaceState(history.state,'',a)}catch(_){}}

function monter(zone,o){var espace=o.espace,dire=o.dire||function(){},cx=lireContexte(),etat={rev:null,vue:null,mode:cx.mode,selection:cx.moment,actif:null,cible:null,comparaison:null,personnes:null,occupe:false},minuterie=null,fini=false;
 zone.textContent='';zone.classList.add('tp');
 var vivant=el('p','sr');vivant.setAttribute('aria-live','polite');vivant.setAttribute('role','status');
 var tete=el('div','tp-tete'),modes=el('div','tp-modes'),corps=el('div','tp-corps'),hist=el('details','tp-hist carte-c');
 modes.setAttribute('role','group');modes.setAttribute('aria-label','Présentation du programme');
 var sum=el('summary',null,'Historique des changements');hist.appendChild(sum);var histL=el('ol','tp-hist-l');hist.appendChild(histL);
 hist.addEventListener('toggle',function(){if(hist.open)chargerHistorique()});
 var jourEl=el('p','tp-jour');tete.appendChild(modes);tete.appendChild(jourEl);zone.appendChild(vivant);zone.appendChild(tete);zone.appendChild(corps);zone.appendChild(hist);
 function annoncer(t){vivant.textContent='';setTimeout(function(){vivant.textContent=t},30)}

 function poserModes(){modes.textContent='';var L=[['liste','Liste'],['cercle','Circle']];if(etat.vue&&etat.vue.peutComparer)L.push(['comparer','Comparer les vues']);
  L.forEach(function(m){var b=bouton(m[1],'b-s');b.setAttribute('aria-pressed',etat.mode===m[0]?'true':'false');b.onclick=function(){changerMode(m[0])};modes.appendChild(b)})}
 /* changer de mode garde le moment choisi (et le reste du contexte) */
 function changerMode(mo){etat.mode=mo;ecrireContexte(mo,etat.selection);poserModes();afficher();if(mo==='comparer')chargerPersonnes();
  if(etat.selection&&mo==='liste'){var c=corps.querySelector('[data-id="'+etat.selection+'"]');if(c){c.scrollIntoView({block:'center'});var t=c.querySelector('.tp-t strong');if(t){t.tabIndex=-1;t.focus({preventScroll:true})}}}}
 function choisir(id,annonce,montrer){etat.selection=id||null;ecrireContexte(etat.mode,etat.selection);afficher();
  if(montrer){var d=corps.querySelector('.tp-detail');if(d&&d.scrollIntoView)d.scrollIntoView({block:'nearest'})}   /* le panneau, au-dessus du Dock (scroll-padding) */
  var m=id&&etat.vue&&etat.vue.moments.filter(function(x){return x.id===id})[0];if(m&&annonce)annoncer(m.titre+', '+m.debut+' à '+m.fin+' : détail ouvert.')}

 /* ---------- ce qui a changé entre deux vues : annoncé, jamais seulement montré ---------- */
 function changements(av,ap){if(!av)return[];var M={};av.moments.forEach(function(m){M[m.id]=m});var out=[];
  ap.moments.forEach(function(m){var x=M[m.id];if(!x)return;if(x.debut!==m.debut)out.push('« '+m.titre+' » : '+m.debut+' (au lieu de '+x.debut+')');else if(x.lieu!==m.lieu)out.push('« '+m.titre+' » : '+m.lieu);else if(x.fait!==m.fait&&m.fait)out.push('« '+m.titre+' » est fait')});return out}

 function geste(action,p,quoi){if(etat.occupe)return;etat.occupe=true;
  envoyer({action:'geste',espace:espace,geste:{action:action,p:p},rev:etat.rev}).then(function(j){etat.occupe=false;
   if(j._code===200&&j.ok){annoncer(quoi+' : c\'est enregistré pour tout le projet.');dire(quoi+' : enregistré.');return relire(true)}
   if(j._code===409&&j.vue){var av=etat.vue;etat.rev=j.rev;etat.vue=j.vue;afficher();var t=j.raison+(changements(av,j.vue).length?' '+changements(av,j.vue).join(' ; ')+'.':'');annoncer(t);dire(t,true);return}
   var t2=j.raison||('Refusé ('+j._code+').');annoncer(t2);dire(t2,true);if(j._code===404||j._code===403)relire(true)}).catch(function(){etat.occupe=false;dire('Serveur injoignable : rien n\'a été enregistré.',true)})}

 /* ---------- un moment, en liste ---------- */
 function carteMoment(m,lecture){var li=el('li','tp-m'+(m.fait?' fait':'')+(m.decalage?' decale':'')+(m.id===etat.selection?' choisi':''));li.dataset.id=m.id;
  var h=el('div','tp-h');var heure=el('span','tp-heure',m.debut+' – '+m.fin);h.appendChild(heure);
  if(m.decalage){var p=el('span','tp-prevu','prévu '+m.prevu+' ('+(m.decalage>0?'+':'−')+Math.abs(m.decalage)+' min)');h.appendChild(p)}
  li.appendChild(h);
  var t=el('div','tp-t');t.appendChild(el('strong',null,m.titre));var lieu=el('span','tp-lieu',m.lieu+(m.planBActif?' · plan B':''));t.appendChild(lieu);li.appendChild(t);
  var tags=el('div','tp-tags');if(m.audience!=='public')tags.appendChild(el('span','tp-tag',m.audienceNom));if(m.fait)tags.appendChild(el('span','tp-tag ok','Fait'));
  if(m.responsable==='moi')tags.appendChild(el('span','tp-tag moi','Vous portez ce moment'));else if(m.responsable==='cible')tags.appendChild(el('span','tp-tag moi','Porté par cette personne'));
  if(tags.childNodes.length)li.appendChild(tags);
  if(m.note)li.appendChild(el('p','tp-note',m.note));
  if(lecture)return li;
  /* choisir un moment depuis la Liste : il le reste en passant dans Circle (un clic hors des boutons) */
  li.addEventListener('click',function(e){if(e.target.closest('button,input,label,a'))return;if(etat.selection!==m.id){etat.selection=m.id;ecrireContexte(etat.mode,m.id);[].forEach.call(corps.querySelectorAll('.tp-m.choisi'),function(x){x.classList.remove('choisi')});li.classList.add('choisi')}});
  var g=m.gestes||{},act=el('div','tp-act');
  if(m.aConfirmer){var c=bouton('J\'ai vu le nouvel horaire','b-p','Confirmer le nouvel horaire de « '+m.titre+' » : '+m.debut);c.onclick=function(){geste('confirmer',{moment:m.id},'Nouvel horaire de « '+m.titre+' » confirmé')};act.appendChild(c)}
  if(g.retarder){var casc=el('label','tp-casc');var cb=el('input');cb.type='checkbox';cb.id='casc-'+m.id;casc.appendChild(cb);casc.appendChild(el('span',null,'et la suite'));
   [[-5,'−5 min'],[5,'+5 min'],[15,'+15 min']].forEach(function(x){var b=bouton(x[1],'b-s',(x[0]>0?'Décaler':'Avancer')+' « '+m.titre+' » de '+Math.abs(x[0])+' minutes');b.onclick=function(){geste('retarder',{moment:m.id,minutes:x[0],cascade:cb.checked},'« '+m.titre+' » '+(x[0]>0?'décalé':'avancé')+' de '+Math.abs(x[0])+' min'+(cb.checked?' avec la suite':''))};act.appendChild(b)});
   act.appendChild(casc)}
  if(g.planB){var pb=bouton(m.planBActif?'Revenir au lieu prévu':'Plan B : '+m.planB,'b-s');pb.onclick=function(){geste('planB',{moment:m.id,actif:!m.planBActif},'« '+m.titre+' » '+(m.planBActif?'revient au lieu prévu':'passe en plan B'))};act.appendChild(pb)}
  if(g.fait){var f=bouton('Fait','b-s','Marquer « '+m.titre+' » comme fait');f.onclick=function(){geste('fait',{moment:m.id},'« '+m.titre+' » marqué fait')};act.appendChild(f)}
  if(act.childNodes.length)li.appendChild(act);
  return li}

 function liste(v,lecture){var ol=el('ol','tp-liste');v.moments.forEach(function(m){ol.appendChild(carteMoment(m,lecture))});return ol}

 /* ---------- la chronologie : la même ressource, posée sur l'axe des heures (les heures restent du texte) ---------- */
 function chrono(v){var M=v.moments;if(!M.length)return el('p','leg','Aucun moment.');
  var t0=Math.floor(Math.min.apply(null,M.map(function(m){return m.dm}))/60)*60,t1=Math.ceil(Math.max.apply(null,M.map(function(m){return m.fm}))/60)*60,k=1.1;
  var axe=el('div','tp-chrono');axe.style.height=Math.max(200,(t1-t0)*k)+'px';axe.setAttribute('role','list');axe.setAttribute('aria-label','Chronologie du jour');
  for(var h=t0;h<=t1;h+=60){var r=el('span','tp-graduation',('0'+((h/60)%24)).slice(-2)+' h');r.style.top=((h-t0)*k)+'px';r.setAttribute('aria-hidden','true');axe.appendChild(r)}
  /* des couloirs pour les moments qui se chevauchent */
  var fins=[];M.slice().sort(function(a,b){return a.dm-b.dm}).forEach(function(m){var c=0;while(fins[c]!=null&&fins[c]>m.dm)c++;fins[c]=m.fm;m._c=c});var n=Math.max(1,fins.length);
  M.forEach(function(m){var b=el('div','tp-bloc'+(m.decalage?' decale':'')+(m.fait?' fait':''));b.setAttribute('role','listitem');b.style.top=((m.dm-t0)*k)+'px';b.style.height=Math.max(26,(m.fm-m.dm)*k-2)+'px';
   b.style.left='calc(52px + (100% - 52px) * '+(m._c/n)+')';b.style.width='calc((100% - 52px) / '+n+' - 4px)';
   b.appendChild(el('strong',null,m.titre));b.appendChild(el('span',null,m.debut+' – '+m.fin+(m.decalage?' (prévu '+m.prevu+')':'')));axe.appendChild(b)});
  return axe}

 /* ---------- Circle : la même vue, sur un cadran de 24 heures (modèle calculé par modules/temps/cercle.js) ---------- */
 var NS='http://www.w3.org/2000/svg';
 function svg(t,a){var e=document.createElementNS(NS,t);for(var k in a)if(a[k]!=null)e.setAttribute(k,a[k]);return e}
 /* la date du programme : centrale, et le futur point d'entrée du Calendrier. Tant que les moments n'ont pas de date en base
    (migration 08, PR Calendrier), le programme est « Jour J » ; rien n'est inventé. */
 function dateDe(v){if(!v||!v.jour)return null;try{return new Date(v.jour+'T12:00:00Z').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}catch(_){return null}}
 function cercle(v){var K=window.AIMECercle,z=el('div','tp-cercle');if(!K||!window.AIMERadial||!window.AIMERadial.interactions){z.appendChild(el('p','alerte','Le cadran n\'a pas pu être chargé : la Liste reste disponible.'));return z}
  if(!v.moments.length){z.appendChild(el('p','leg','Aucun moment à afficher.'));return z}
  var narrow=window.matchMedia&&window.matchMedia('(max-width: 560px)').matches,M=narrow?K.modele(v,{couloirs:3,epaisseur:60,rayon:366,ecart:8}):K.modele(v,{couloirs:4}),C=M.centre;
  if(etat.selection&&!v.moments.some(function(m){return m.id===etat.selection}))etat.selection=null;   /* un moment devenu invisible : rien n'en est dit */
  var s=svg('svg',{viewBox:'0 0 1000 1000',class:'tp-cadran',role:'group','aria-label':'Cadran de 24 heures, minuit en haut : '+M.arcs.length+' moment'+(M.arcs.length>1?'s':'')+'. Flèches pour passer d\'un moment à l\'autre, Entrée pour ouvrir son détail.'});
  var defs=svg('defs'),grad=svg('radialGradient',{id:'tp-face',cx:'50%',cy:'45%',r:'55%'});
  grad.appendChild(svg('stop',{offset:'0%','stop-color':'#1A1A20'}));grad.appendChild(svg('stop',{offset:'100%','stop-color':'#0B0B0E'}));defs.appendChild(grad);s.appendChild(defs);
  var fond=svg('g',{'aria-hidden':'true',class:'tp-fond'});
  var trait=Math.round(M.epaisseur*.6);   /* des anneaux plus fins que la place qu'ils occupent : de l'air entre les couloirs */
  fond.appendChild(svg('circle',{cx:C,cy:C,r:M.rayon+M.epaisseur/2+8,class:'tp-face'}));
  fond.appendChild(svg('circle',{cx:C,cy:C,r:M.rayon+M.epaisseur/2+8,class:'tp-anneau'}));
  for(var k=0;k<M.couloirs;k++)fond.appendChild(svg('circle',{cx:C,cy:C,r:M.rayon-k*(M.epaisseur+M.ecart),class:'tp-piste',style:'stroke-width:'+trait+'px'}));   /* les pistes, comme les anneaux d'une montre */
  M.graduations.forEach(function(g){fond.appendChild(svg('line',{x1:g.x1,y1:g.y1,x2:g.x2,y2:g.y2,class:g.cardinale?'tp-trait fort':'tp-trait'}));if(g.texte){var t=svg('text',{x:g.lx,y:g.ly+12,class:'tp-heure-c','text-anchor':g.ancre});t.textContent=g.texte;fond.appendChild(t)}});
  s.appendChild(fond);
  var arcs=svg('g',{class:'tp-arcs'}),focusable=etat.selection&&M.ordre.indexOf(etat.selection)>=0?etat.selection:M.ordre[0];
  M.arcs.forEach(function(a){var g=svg('g',{class:'tp-arc '+a.etat.map(function(e){return'e-'+e}).join(' ')+(a.id===etat.selection?' choisi':''),role:'button',tabindex:a.id===focusable?'0':'-1','aria-label':a.nom,'aria-pressed':a.id===etat.selection?'true':'false','data-id':a.id});
   var ti=svg('title');ti.textContent=a.nom;g.appendChild(ti);
   if(a.dPrevu)g.appendChild(svg('path',{d:a.dPrevu,class:'tp-prevu-c'}));
   if(a.dMoi)g.appendChild(svg('path',{d:a.dMoi,class:'tp-moi-c'}));
   /* bouts arrondis rentrés dans l'arc : le trait commence et finit aux heures exactes */
   var cap=trait/2/a.rayon*180/Math.PI,span=Math.max(a.a1-a.a0,2);
   if(span>2*cap+0.5)g.appendChild(svg('path',{d:K.arcPathAt(C,C,a.rayon,a.a0+cap,a.a0+span-cap),class:'tp-trait-m',style:'stroke-width:'+trait+'px'}));
   else{var pm=K.polarXY(C,C,a.rayon,a.a0+span/2);g.appendChild(svg('circle',{cx:pm.x,cy:pm.y,r:trait/2,class:'tp-pastille'}))}
   if(a.etat.indexOf('a-confirmer')>=0){var pc=K.polarXY(C,C,a.rayon,a.a0);g.appendChild(svg('circle',{cx:pc.x,cy:pc.y,r:11,class:'tp-point'}))}
   arcs.appendChild(g)});
  s.appendChild(arcs);
  /* toucher au doigt (le moment le plus proche du point touché, dans un rayon de 24 px à l'écran, même un arc étroit ou serré) et
     clavier (focus itinérant : flèches, Début, Fin ; Entrée ouvre le détail ; Échap le referme) : les interactions du noyau radial */
  window.AIMERadial.interactions(s,{groupe:arcs,selecteur:'.tp-arc',ordre:M.ordre,tolerance:24,ignorer:'.tp-plus',
   toucher:function(x,y,tol){return K.toucher(M,x,y,tol)},
   choisir:function(id,comment){if(comment==='toucher')choisir(id,true,true);else choisir(id,true)},
   fermer:function(){choisir(null)}});
  var zones=svg('g',{class:'tp-zones','aria-hidden':'true'});M.zones.forEach(function(zn){zones.appendChild(svg('path',{d:zn.d,class:'tp-zone',style:'stroke-width:'+trait+'px'}))});s.appendChild(zones);
  /* au-delà des couloirs visibles : une pastille « +N » par moment, qui ouvre la Liste sur lui */
  M.debordements.forEach(function(d){var p=K.polarXY(C,C,M.rayon+M.epaisseur/2+36,d.angle),g=svg('g',{class:'tp-plus',role:'button',tabindex:'0','aria-label':'Moment de plus, à voir dans la Liste : '+d.nom});
   g.appendChild(svg('circle',{cx:p.x,cy:p.y,r:26}));var t=svg('text',{x:p.x,y:p.y+9,'text-anchor':'middle'});t.textContent='+1';g.appendChild(t);
   var ouvrir=function(){etat.selection=d.id;changerMode('liste')};g.addEventListener('click',ouvrir);g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrir()}});s.appendChild(g)});
  /* le centre résume le moment choisi (idée de RIPPLECIRCLE v9) ; décoratif : le panneau dit la même chose en texte */
  var ch=etat.selection&&v.moments.filter(function(m){return m.id===etat.selection})[0],cen=svg('g',{'aria-hidden':'true',class:'tp-centre'});
  var l0=svg('text',{x:C,y:C-62,'text-anchor':'middle',class:'tp-c0'}),l1=svg('text',{x:C,y:C-6,'text-anchor':'middle',class:'tp-c1'}),l2=svg('text',{x:C,y:C+42,'text-anchor':'middle',class:'tp-c2'});
  l0.textContent=(dateDe(v)||'Jour J').toUpperCase();l1.textContent=ch?ch.titre:'24 heures';l2.textContent=ch?(ch.debut+' – '+ch.fin):(M.arcs.length+M.debordements.length)+' moments';cen.appendChild(l0);cen.appendChild(l1);cen.appendChild(l2);s.appendChild(cen);
  z.appendChild(s);
  /* le panneau de détail : la carte de la Liste elle-même, donc les mêmes gestes autorisés */
  var det=el('section','tp-detail');det.setAttribute('aria-label','Moment choisi');
  if(ch){var ol=el('ol','tp-liste');ol.appendChild(carteMoment(ch,false));det.appendChild(ol)}
  else det.appendChild(el('p','leg','Touchez un arc, ou utilisez les flèches, pour voir le moment et ses actions.'));
  z.appendChild(det);
  /* la légende ne nomme que les états présents dans CE cadran (les arcs disent tout en mots à qui les parcourt) */
  var vus={};M.arcs.forEach(function(a){a.etat.forEach(function(e){vus[e]=1})});
  var L=[['decale','tp-k-prevu','horaire prévu'],['propose','tp-k-propose','à décider'],['a-confirmer','tp-k-confirmer','à confirmer'],['moi','tp-k-moi','vos moments']].filter(function(k){return vus[k[0]]});
  if(L.length){var cle=el('ul','tp-cle');L.forEach(function(k){var li=el('li');li.appendChild(el('span','tp-k '+k[1]));li.appendChild(el('span',null,k[2]));cle.appendChild(li)});z.appendChild(cle)}
  return z}

 /* ---------- comparer : le propriétaire voit la vue d'une autre personne, coupée par le serveur à la sienne ---------- */
 function chargerPersonnes(){if(etat.personnes)return afficher();api(espace,'&comparer=').then(function(j){if(j._code!==200){dire(j.raison||'Comparaison indisponible.',true);return}etat.personnes=j.personnes;afficher()})}
 function chargerCible(id){etat.cible=id;if(!id){etat.comparaison=null;return afficher()}
  api(espace,'&comparer='+encodeURIComponent(id)).then(function(j){if(j._code!==200){dire(j.raison||'Comparaison indisponible.',true);return}etat.comparaison=j;afficher();annoncer('Vue de '+j.cible.nom+' : '+j.vue.moments.length+' moments sur '+etat.vue.moments.length+'.')})}
 function comparer(v){var z=el('div','tp-comp');
  var lab=el('label','pile');lab.appendChild(el('span',null,'Voir le programme comme'));var s=el('select');s.appendChild(new Option('choisir une personne…',''));
  (etat.personnes||[]).forEach(function(p){var op=new Option(p.nom+(p.relation?' · '+p.relation:' · '+(MOTS[p.role]||p.role)),p.id);if(p.id===etat.cible)op.selected=true;s.appendChild(op)});
  s.onchange=function(){chargerCible(s.value)};lab.appendChild(s);z.appendChild(lab);
  if(!etat.comparaison){z.appendChild(el('p','leg','La vue d\'une personne n\'est jamais plus large que la vôtre : le serveur la calcule avec ses droits, puis la coupe aux vôtres.'));return z}
  var c=etat.comparaison,ids={};c.vue.moments.forEach(function(m){ids[m.id]=1});
  var cols=el('div','tp-cols');
  var a=el('section','tp-col');a.appendChild(el('h3','k','Vous ('+v.moments.length+' moments)'));a.appendChild(liste(v,true));
  var b=el('section','tp-col');b.appendChild(el('h3','k',c.cible.nom+(c.cible.relation?' · '+c.cible.relation:'')+' ('+c.vue.moments.length+' moments)'));b.appendChild(liste(c.vue,true));
  var absents=v.moments.filter(function(m){return !ids[m.id]});
  if(absents.length){var p=el('p','leg','Absent de sa vue : '+absents.map(function(m){return m.titre}).join(', ')+'.');b.appendChild(p)}
  cols.appendChild(a);cols.appendChild(b);z.appendChild(cols);return z}

 function afficher(){var f=document.activeElement,cle=f&&f.getAttribute&&f.closest&&f.closest('[data-id]')?f.closest('[data-id]').dataset.id+'|'+(f.getAttribute('aria-label')||f.textContent):null;
  corps.textContent='';
  if(etat.actif===false){var c=el('div','carte-c');c.appendChild(el('p',null,'Aucun programme dans ce projet pour l\'instant.'));
   if(etat.peutActiver){c.appendChild(el('p','leg','Importez le programme type de votre domaine : vous pourrez ensuite décaler chaque moment, et chacun verra les changements selon ses droits.'));
    var b=bouton('Importer le programme type','b-p');b.onclick=function(){b.disabled=true;envoyer({action:'activer',espace:espace}).then(function(j){if(j._code===200){annoncer('Programme importé.');dire('Programme importé : '+j.moments+' moments.');if(window.AIMEProjet&&AIMEProjet.ouvrir)AIMEProjet.ouvrir(espace,'deroule');else relire(true)}else{b.disabled=false;dire(j.raison||'Import refusé.',true)}})};c.appendChild(b)}
   corps.appendChild(c);return}
  var v=etat.vue;if(!v)return;poserModes();jourEl.textContent=dateDe(v)||'Jour J';
  if(etat.mode!=='comparer'){
   if(v.propositions.length){var pr=el('div','carte-c tp-props');pr.appendChild(el('h3','k','À décider'));v.propositions.forEach(function(p){var l=el('div','lgn');l.appendChild(el('span',null,p.texte));
     var ok=bouton('Décaler de '+p.minutes+' min','b-p');ok.onclick=function(){geste(p.geste.action,p.geste.p,'Proposition appliquée')};l.appendChild(ok);pr.appendChild(l)});
    pr.appendChild(el('p','leg','AIME ne décide pas à votre place : rien ne bouge sans votre geste.'));corps.appendChild(pr)}
   if(v.aConfirmer.length){var ac=el('p','bandeau tp-confirmer','Nouvel horaire à confirmer : '+v.moments.filter(function(m){return m.aConfirmer}).map(function(m){return m.titre+' ('+m.debut+')'}).join(', ')+'.');corps.appendChild(ac)}
  }
  corps.appendChild(etat.mode==='chrono'?chrono(v):etat.mode==='comparer'?comparer(v):etat.mode==='cercle'?cercle(v):liste(v,false));
  if(cle){var n=[].slice.call(corps.querySelectorAll('[data-id] button, [data-id][role=button]')).filter(function(x){var d=x.closest('[data-id]');return d.dataset.id+'|'+(x.getAttribute('aria-label')||x.textContent)===cle})[0];
   if(!n&&f&&f.getAttribute&&f.getAttribute('role')==='button'&&f.dataset&&f.dataset.id)n=corps.querySelector('.tp-arc[data-id="'+f.dataset.id+'"]');if(n)n.focus({preventScroll:true})}}

 function chargerHistorique(){api(espace,'&journal=1').then(function(j){histL.textContent='';if(j._code!==200)return;
  if(!j.lignes.length){histL.appendChild(el('li','leg','Aucun changement.'));return}
  j.lignes.forEach(function(l){var li=el('li',l.moi?'moi':null);li.appendChild(el('span','tp-quand',new Date(l.le).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})));li.appendChild(el('span',null,' '+(l.qui==='vous'?'Vous':l.qui)+' · '+l.texte));histL.appendChild(li)})})}

 function relire(tout){if(fini)return Promise.resolve();return api(espace,tout||etat.rev==null?'':'&depuis='+etat.rev).then(function(j){if(fini)return;
   if(j._code!==200){if(!etat.vue){corps.textContent='';corps.appendChild(el('p','alerte',j.raison||'Le programme n\'a pas pu être chargé.'))}return}
   if(j.inchange)return;
   etat.actif=j.actif;etat.peutActiver=!!j.peutActiver;if(!j.actif){etat.vue=null;return afficher()}
   var av=etat.vue,ch=changements(av,j.vue);etat.rev=j.rev;etat.vue=j.vue;if(etat.mode==='comparer'&&!j.vue.peutComparer)etat.mode='liste';
   if(etat.cible&&etat.mode==='comparer'){chargerCible(etat.cible)}else afficher();
   if(ch.length&&!tout)annoncer('Le programme a changé : '+ch.join(' ; ')+'.');if(hist.open)chargerHistorique()}).catch(function(){})}
 function boucle(){if(fini)return;minuterie=setTimeout(function(){(document.hidden?Promise.resolve():relire(false)).then(boucle)},RELIRE)}
 corps.appendChild(el('p','leg','Chargement du programme…'));relire(true).then(boucle);
 return{arreter:function(){fini=true;clearTimeout(minuterie)},relire:relire}}

window.AIMETemps={monter:monter};
})();
