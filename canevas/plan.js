/* AIME · Canevas · le plan de travail. Neutre : il ne connaît aucun moteur métier.
   Il affiche la scène (canevas/scene.js), gère la vue, la sélection, les notes et la grille du calque actif, et délègue
   le dessin d'un calque à son adaptateur s'il en a un. Un adaptateur se déclare avec AIMECanevas.adaptateur(type, a) :
     a.charger(source) → Promise<{ titre, sous, calque:{nom, grille:{type,pas}, taille:{l,h}}, donnees }>
     a.dessiner(g, calque, vue, W, H, donnees, etat)     dessine son calque (la grille de son métier comprise)
     a.element(donnees, calque, x, y) → { titre, dit, actions:[{id,nom}] } | null     ce qui est sous le pointeur
     a.agir(donnees, actionId, element, etat) → texte     une action métier, contextuelle
   La palette basse ne change jamais : sélection, main, zoom, note. Les outils métier n'apparaissent qu'à la sélection.

   AIMECanevas.monter(conteneur, { scene, adaptateurs:{type:url}, sauver(scene) }) */
(function(root){'use strict';if(root.AIMECanevas&&root.AIMECanevas.monter)return;
var C=root.AIMECanevasScene,RM=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var ADAPT=root.AIMECanevas&&root.AIMECanevas._a||{};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function bouton(t,c,f,titre){var b=el('button',c,t);b.type='button';if(f)b.onclick=f;if(titre){b.title=titre;b.setAttribute('aria-label',titre)}return b}
function script(u){return new Promise(function(ok,ko){if(!/^\/canevas\/adaptateurs\/[a-z0-9-]+\.js$/.test(u))return ko(new Error('adaptateur refusé'));var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('Adaptateur indisponible.'))};document.head.appendChild(s)})}
function saisie(e){var t=e.target;return t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))}

function monter(conteneur,o){o=o||{};var S=o.scene||C.vide(),outil='selection',donnees=null,adapt=null,etat={},espace=false,sel=null,carteNote=null;
 conteneur.textContent='';var R=el('div','cv');conteneur.appendChild(R);
 var fond=el('canvas','cv-fond');fond.setAttribute('role','img');fond.setAttribute('aria-label','Plan de travail');R.appendChild(fond);
 var calqueNotes=el('div','cv-notes');R.appendChild(calqueNotes);
 var dit=el('p','cv-dit');dit.hidden=true;dit.setAttribute('role','status');dit.setAttribute('aria-live','polite');R.appendChild(dit);
 function dire(t){dit.textContent=t||'';dit.hidden=!t;clearTimeout(dire.t);if(t)dire.t=setTimeout(function(){dit.hidden=true},4200)}

 /* ---------- en haut : ce qui est ouvert, la grille, les notes ---------- */
 var haut=el('div','cv-haut');R.appendChild(haut);
 var titre=el('div','cv-titre');var tt=el('b',null,S.titre),ts=el('span',null,'');titre.appendChild(tt);titre.appendChild(ts);haut.appendChild(titre);
 var reglGrille=el('details','cv-reg');reglGrille.appendChild(el('summary',null,'Grille'));var fg=el('div','cv-reg-f');reglGrille.appendChild(fg);haut.appendChild(reglGrille);
 var notesB=el('details','cv-reg cv-lst');notesB.appendChild(el('summary',null,'Notes'));var ln=el('div','cv-reg-f');notesB.appendChild(ln);haut.appendChild(notesB);
 function majGrille(){fg.textContent='';var c=C.actif(S),g=c.grille;
  var lt=el('label','cv-champ');lt.appendChild(el('span',null,'Type'));var se=el('select');Object.keys(C.GRILLES).forEach(function(k){var op=el('option',null,C.GRILLES[k].nom);op.value=k;se.appendChild(op)});se.value=g.type;
  se.disabled=!!c.adaptateur;if(c.adaptateur)se.title='La grille de ce calque vient de son contenu : '+C.GRILLES[g.type].nom.toLowerCase()+'.';se.onchange=function(){C.regler(S,c.id,{type:se.value});changer();majGrille();dessiner()};lt.appendChild(se);fg.appendChild(lt);
  if(!c.adaptateur&&g.type!=='libre'){var lp=el('label','cv-champ');lp.appendChild(el('span',null,'Pas'));var r=el('input');r.type='range';r.min=8;r.max=96;r.step=4;r.value=g.pas;var out=el('output',null,g.pas+' unités');
   r.oninput=function(){C.regler(S,c.id,{pas:+r.value});out.textContent=r.value+' unités';changer(true);dessiner()};lp.appendChild(r);lp.appendChild(out);fg.appendChild(lp)}
  var lv=el('label','cv-coche');var cb=el('input');cb.type='checkbox';cb.checked=g.visible;cb.onchange=function(){C.regler(S,c.id,{visible:cb.checked});changer();dessiner()};lv.appendChild(cb);lv.appendChild(el('span',null,'Grille visible'));fg.appendChild(lv);
  fg.appendChild(el('p','cv-aide',c.adaptateur?'Unités de ce calque : '+(C.GRILLES[g.type]||{}).dit:C.GRILLES[g.type].dit))}
 function majListe(){ln.textContent='';var ouv=C.ouvertes(S).length;notesB.querySelector('summary').textContent='Notes · '+ouv+(S.notes.length>ouv?' (+'+(S.notes.length-ouv)+' résolue'+(S.notes.length-ouv>1?'s':'')+')':'');
  if(!S.notes.length){ln.appendChild(el('p','cv-aide','Aucune note. Outil Note (N), puis un clic sur le plan.'));return}
  S.notes.slice().sort(function(a,b){return(a.etat===b.etat?0:a.etat==='ouverte'?-1:1)||String(b.majLe).localeCompare(String(a.majLe))}).forEach(function(n){
   var b=bouton('','cv-li'+(n.etat==='resolue'?' res':''),function(){centrer(n);ouvrirNote(n.id)});b.appendChild(el('b',null,n.texte.slice(0,60)));b.appendChild(el('small',null,(n.etat==='resolue'?'Résolue · ':'')+n.auteur+(n.reponses.length?' · '+n.reponses.length+' réponse'+(n.reponses.length>1?'s':''):'')));ln.appendChild(b)})}

 /* ---------- en bas : la palette universelle ---------- */
 var pal=el('div','cv-pal');pal.setAttribute('role','toolbar');pal.setAttribute('aria-label','Outils du canevas');R.appendChild(pal);
 var OUT={selection:['Sélection','V','<path d="M5 3l14 8-6 2-2 6z"/>'],main:['Main','H','<path d="M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4.5a1.5 1.5 0 013 0V12M14 11.5V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7s-5-1.5-6.5-4L3 12.5a1.5 1.5 0 012.5-1.5L8 13"/>'],note:['Note','N','<path d="M4 5h16v11H9l-5 4z"/>']};
 function icone(d){return'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+d+'</svg>'}
 var bt={};function bOutil(k){var b=bouton('','cv-o',function(){choisir(k)},OUT[k][0]+' ('+OUT[k][1]+')');b.innerHTML=icone(OUT[k][2]);b.setAttribute('aria-pressed','false');bt[k]=b;return b}
 pal.appendChild(bOutil('selection'));pal.appendChild(bOutil('main'));pal.appendChild(el('span','cv-sep'));
 var moins=bouton('−','cv-o cv-z',function(){zoom(1/1.25)},'Zoom arrière (Ctrl −)'),pc=bouton('100 %','cv-pc',function(){vueA(C.zoomA(S.vue,1,W,H))},'Revenir à 100 % (0) · double-clic : ajuster (1)'),plus=bouton('+','cv-o cv-z',function(){zoom(1.25)},'Zoom avant (Ctrl +)');
 pc.ondblclick=function(){ajusterVue()};pal.appendChild(moins);pal.appendChild(pc);pal.appendChild(plus);pal.appendChild(el('span','cv-sep'));pal.appendChild(bOutil('note'));
 function choisir(k){outil=k;Object.keys(bt).forEach(function(x){bt[x].setAttribute('aria-pressed',String(x===k))});R.dataset.outil=k;if(k!=='selection')fermerInspecteur()}
 choisir('selection');

 /* ---------- l'inspecteur : l'orbe se pose sur l'élément choisi et propose ses outils métier ---------- */
 var insp=el('div','cv-insp');insp.hidden=true;insp.setAttribute('role','dialog');insp.setAttribute('aria-label','Élément sélectionné');R.appendChild(insp);
 function fermerInspecteur(){insp.hidden=true;sel=null}
 function inspecter(x,y,X,Y){var e=adapt&&adapt.element?adapt.element(donnees,C.actif(S),x,y):null;if(!e){fermerInspecteur();return}sel={x:x,y:y,e:e};insp.textContent='';
  var t=el('div','cv-insp-t');t.appendChild(el('i','cv-orbe'));var tx=el('div');tx.appendChild(el('small',null,'L\'orbe'));tx.appendChild(el('b',null,e.titre));t.appendChild(tx);t.appendChild(bouton('×','cv-x',fermerInspecteur,'Fermer'));insp.appendChild(t);
  if(e.dit)insp.appendChild(el('p',null,e.dit));var a=el('div','cv-insp-a');(e.actions||[]).forEach(function(ac){a.appendChild(bouton(ac.nom,'cv-b',function(){var r=adapt.agir(donnees,ac.id,e,etat);dessiner();if(r)dire(r);inspecter(x,y,X,Y)}))});
  a.appendChild(bouton('Noter ici','cv-b',function(){nouvelleNote(x,y,e.ref)}));insp.appendChild(a);insp.hidden=false;placerInsp(X,Y)}
 function placerInsp(X,Y){if(innerWidth<=640){insp.style.left='';insp.style.top='';return}var w=insp.offsetWidth,h=insp.offsetHeight;insp.style.left=Math.max(12,Math.min(W-w-12,X+18))+'px';insp.style.top=Math.max(70,Math.min(H-h-90,Y-10))+'px'}

 /* ---------- la vue ---------- */
 var W=0,H=0,dpr=1,raf=0;
 function taille(){var r=R.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);dpr=Math.min(2,root.devicePixelRatio||1);fond.width=Math.round(W*dpr);fond.height=Math.round(H*dpr);fond.style.width=W+'px';fond.style.height=H+'px';dessiner()}
 function vueA(v){S.vue=v;pc.textContent=C.pourcent(v);dessiner();notesPos();changer(true)}
 function zoom(f,X,Y){vueA(C.zoomer(S.vue,f,X==null?W/2:X,Y==null?H/2:Y))}
 function ajusterVue(){var c=C.actif(S),t=c.taille;vueA(t?C.ajuster({x:c.t.dx,y:c.t.dy,l:t.l*c.t.echelle,h:t.h*c.t.echelle},W,H,innerWidth<=640?24:70):C.ajuster({x:-W/2,y:-H/2,l:W,h:H},W,H,0))}
 function centrer(n){vueA({x:n.ancre.x-W/2/S.vue.z,y:n.ancre.y-H/2/S.vue.z,z:S.vue.z})}
 function dessiner(){cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){var g=fond.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
   S.calques.forEach(function(c){if(!c.visible)return;if(c.adaptateur&&adapt&&donnees){adapt.dessiner(g,c,S.vue,W,H,donnees,Object.assign({grille:c.grille.visible},etat));return}grilleNeutre(g,c)})})}
 function grilleNeutre(g,c){var L=C.lignes(c,S.vue,W,H);g.fillStyle=getComputedStyle(R).getPropertyValue('--cv-fond')||'#F7F7F5';g.fillRect(0,0,W,H);
  if(L.points.length){g.fillStyle='rgba(20,20,30,.28)';L.points.forEach(function(p){g.beginPath();g.arc(p[0],p[1],1.4,0,7);g.fill()});return}
  g.lineWidth=1;L.v.forEach(function(l){g.strokeStyle=l.fort?'rgba(124,92,255,.35)':'rgba(20,20,30,.08)';g.beginPath();g.moveTo(Math.round(l.X)+.5,0);g.lineTo(Math.round(l.X)+.5,H);g.stroke()});
  L.h.forEach(function(l){g.strokeStyle=l.fort?'rgba(124,92,255,.35)':'rgba(20,20,30,.08)';g.beginPath();g.moveTo(0,Math.round(l.Y)+.5);g.lineTo(W,Math.round(l.Y)+.5);g.stroke()})}

 /* ---------- les notes : bulles posées sur le plan ---------- */
 var marques={};
 function notesDom(){calqueNotes.textContent='';marques={};S.notes.forEach(function(n){var m=bouton('','cv-note'+(n.etat==='resolue'?' res':''),null,'Note : '+n.texte.slice(0,80)+(n.etat==='resolue'?' (résolue)':''));m.dataset.id=n.id;m.appendChild(el('span',null,n.reponses.length?String(n.reponses.length+1):''));calqueNotes.appendChild(m);marques[n.id]=m;glisserNote(m,n)});notesPos();majListe()}
 function notesPos(){S.notes.forEach(function(n){var m=marques[n.id];if(!m)return;var p=C.versEcran(S.vue,n.ancre.x,n.ancre.y);m.style.transform='translate('+Math.round(p[0])+'px,'+Math.round(p[1])+'px)';m.hidden=n.etat==='resolue'&&!R.classList.contains('voir-res')});if(carteNote)placerCarte()}
 function glisserNote(m,n){var d=null;m.addEventListener('pointerdown',function(e){if(outil==='main'||espace)return;e.stopPropagation();d={X:e.clientX,Y:e.clientY,x:n.ancre.x,y:n.ancre.y,bouge:false,id:e.pointerId};try{m.setPointerCapture(e.pointerId)}catch(_){}});
  m.addEventListener('pointermove',function(e){if(!d||d.id!==e.pointerId)return;var dx=(e.clientX-d.X)/S.vue.z,dy=(e.clientY-d.Y)/S.vue.z;if(!d.bouge&&Math.hypot(e.clientX-d.X,e.clientY-d.Y)<5)return;d.bouge=true;n.ancre.x=d.x+dx;n.ancre.y=d.y+dy;notesPos()});
  m.addEventListener('pointerup',function(e){if(!d)return;var b=d.bouge;d=null;if(b){C.deplacerNote(S,n.id,n.ancre.x,n.ancre.y);changer();dire('Note déplacée.')}else ouvrirNote(n.id)});
  m.addEventListener('keydown',function(e){var k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!k||!e.altKey)return;e.preventDefault();C.deplacerNote(S,n.id,n.ancre.x+k[0]*10/S.vue.z,n.ancre.y+k[1]*10/S.vue.z);notesPos();changer()})}
 var carte=el('div','cv-carte');carte.hidden=true;carte.setAttribute('role','dialog');R.appendChild(carte);
 function placerCarte(){if(!carteNote||innerWidth<=640){carte.style.left='';carte.style.top='';return}var n=S.notes.filter(function(x){return x.id===carteNote})[0];if(!n)return;var p=C.versEcran(S.vue,n.ancre.x,n.ancre.y),w=carte.offsetWidth,h=carte.offsetHeight;carte.style.left=Math.max(12,Math.min(W-w-12,p[0]+22))+'px';carte.style.top=Math.max(70,Math.min(H-h-90,p[1]-12))+'px'}
 function fermerCarte(){carte.hidden=true;var id=carteNote;carteNote=null;if(id&&marques[id])marques[id].focus()}
 function ouvrirNote(id,edition){var n=S.notes.filter(function(x){return x.id===id})[0];if(!n)return;carteNote=id;carte.textContent='';carte.setAttribute('aria-label','Note');fermerInspecteur();
  var t=el('div','cv-insp-t');t.appendChild(el('i','cv-pastille'+(n.etat==='resolue'?' res':'')));var tx=el('div');tx.appendChild(el('small',null,'Note · '+(n.etat==='resolue'?'résolue':'ouverte')));tx.appendChild(el('b',null,n.auteur));t.appendChild(tx);t.appendChild(bouton('×','cv-x',fermerCarte,'Fermer'));carte.appendChild(t);
  if(n.ancre.ref)carte.appendChild(el('p','cv-aide','Sur : '+n.ancre.ref));
  if(edition){var ta=el('textarea');ta.rows=3;ta.maxLength=2000;ta.value=n.texte;ta.setAttribute('aria-label','Texte de la note');carte.appendChild(ta);var a0=el('div','cv-insp-a');
   a0.appendChild(bouton('Enregistrer','cv-b cv-b-p',function(){try{C.modifierNote(S,n.id,ta.value);changer();notesDom();ouvrirNote(n.id)}catch(e){dire(e.message)}}));a0.appendChild(bouton('Annuler','cv-b',function(){ouvrirNote(n.id)}));carte.appendChild(a0);carte.hidden=false;placerCarte();ta.focus();return}
  carte.appendChild(el('p','cv-texte',n.texte));n.reponses.forEach(function(r){var p=el('p','cv-rep');p.appendChild(el('b',null,r.auteur+' : '));p.appendChild(document.createTextNode(r.texte));carte.appendChild(p)});
  if(n.proposition)carte.appendChild(el('p','cv-prop','Proposée comme décision le '+new Date(n.proposition.le).toLocaleDateString('fr-FR')+' : en attente de confirmation dans le projet. La note seule ne change rien.'));
  var rp=el('div','cv-rep-f');var ri=el('input');ri.type='text';ri.maxLength=1000;ri.placeholder='Répondre…';ri.setAttribute('aria-label','Répondre à la note');rp.appendChild(ri);rp.appendChild(bouton('Envoyer','cv-b',function(){try{C.repondre(S,n.id,ri.value);changer();notesDom();ouvrirNote(n.id)}catch(e){dire(e.message)}}));carte.appendChild(rp);
  ri.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();rp.querySelector('button').click()}});
  var a=el('div','cv-insp-a');a.appendChild(n.etat==='ouverte'?bouton('Résoudre','cv-b cv-b-p',function(){C.resoudre(S,n.id);changer();notesDom();fermerCarte();dire('Note résolue : elle reste consultable dans la liste.')}):bouton('Rouvrir','cv-b',function(){C.rouvrir(S,n.id);changer();notesDom();ouvrirNote(n.id)}));
  a.appendChild(bouton('Modifier','cv-b',function(){ouvrirNote(n.id,true)}));
  if(!n.proposition&&S.source)a.appendChild(bouton('Proposer comme décision','cv-b',function(){C.proposer(S,n.id);changer();ouvrirNote(n.id);dire('Proposition créée : elle attend une confirmation dans le projet.')}));
  var sup=bouton('Supprimer','cv-b cv-b-d'),arme=0;sup.onclick=function(){if(Date.now()-arme<4000){C.retirerNote(S,n.id);changer();notesDom();fermerCarte();dire('Note supprimée.')}else{arme=Date.now();sup.textContent='Confirmer la suppression'}};a.appendChild(sup);carte.appendChild(a);
  carte.hidden=false;placerCarte()}
 function nouvelleNote(x,y,ref){carteNote=null;carte.textContent='';fermerInspecteur();carte.setAttribute('aria-label','Nouvelle note');var t=el('div','cv-insp-t');t.appendChild(el('i','cv-pastille'));var tx=el('div');tx.appendChild(el('small',null,'Nouvelle note'));tx.appendChild(el('b',null,ref||'Sur le plan'));t.appendChild(tx);
  t.appendChild(bouton('×','cv-x',function(){carte.hidden=true},'Annuler'));carte.appendChild(t);var ta=el('textarea');ta.rows=3;ta.maxLength=2000;ta.placeholder='Votre note…';ta.setAttribute('aria-label','Texte de la note');carte.appendChild(ta);
  var a=el('div','cv-insp-a');a.appendChild(bouton('Poser la note','cv-b cv-b-p',function(){try{var n=C.note(S,{x:x,y:y,ref:ref,texte:ta.value});changer();notesDom();ouvrirNote(n.id);dire('Note posée et enregistrée.')}catch(e){dire(e.message)}}));a.appendChild(bouton('Annuler','cv-b',function(){carte.hidden=true}));carte.appendChild(a);
  ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))a.firstChild.click()});
  var p=C.versEcran(S.vue,x,y);carte.hidden=false;if(innerWidth>640){carte.style.left=Math.max(12,Math.min(W-carte.offsetWidth-12,p[0]+22))+'px';carte.style.top=Math.max(70,Math.min(H-carte.offsetHeight-90,p[1]-12))+'px'}ta.focus()}

 /* ---------- les gestes : souris, toucher, stylet ---------- */
 var ptrs={},glis=null,pinch=null;
 fond.addEventListener('pointerdown',function(e){fond.setPointerCapture(e.pointerId);ptrs[e.pointerId]={X:e.clientX,Y:e.clientY};var ids=Object.keys(ptrs);
  if(ids.length===2){var a=ptrs[ids[0]],b=ptrs[ids[1]];pinch={d:Math.hypot(a.X-b.X,a.Y-b.Y),cx:(a.X+b.X)/2,cy:(a.Y+b.Y)/2,v:S.vue};glis=null;return}
  glis={X:e.clientX,Y:e.clientY,v:S.vue,bouge:false,main:outil==='main'||espace||e.button===1||e.pointerType==='touch'&&outil!=='note'}});
 fond.addEventListener('pointermove',function(e){if(!ptrs[e.pointerId])return;ptrs[e.pointerId]={X:e.clientX,Y:e.clientY};var r=R.getBoundingClientRect();
  if(pinch){var ids=Object.keys(ptrs),a=ptrs[ids[0]],b=ptrs[ids[1]];if(!a||!b)return;var d=Math.hypot(a.X-b.X,a.Y-b.Y),cx=(a.X+b.X)/2,cy=(a.Y+b.Y)/2,v=C.zoomer(pinch.v,d/pinch.d,pinch.cx-r.left,pinch.cy-r.top);vueA(C.deplacer(v,cx-pinch.cx,cy-pinch.cy));return}
  if(!glis)return;var dx=e.clientX-glis.X,dy=e.clientY-glis.Y;if(!glis.bouge&&Math.hypot(dx,dy)<4)return;glis.bouge=true;if(glis.main){R.classList.add('glisse');vueA(C.deplacer(glis.v,dx,dy))}});
 function fin(e){delete ptrs[e.pointerId];R.classList.remove('glisse');if(pinch){if(Object.keys(ptrs).length<2)pinch=null;glis=null;return}if(!glis)return;var g=glis;glis=null;if(g.bouge)return;
  var r=R.getBoundingClientRect(),X=e.clientX-r.left,Y=e.clientY-r.top,p=C.versScene(S.vue,X,Y);
  if(outil==='note'){var c=C.actif(S),q=C.aimanter(c,p[0],p[1]),e2=adapt&&adapt.element?adapt.element(donnees,c,p[0],p[1]):null;nouvelleNote(q[0],q[1],e2&&e2.ref);return}
  if(outil==='selection'){carte.hidden=true;carteNote=null;inspecter(p[0],p[1],X,Y)}}
 fond.addEventListener('pointerup',fin);fond.addEventListener('pointercancel',function(e){delete ptrs[e.pointerId];pinch=null;glis=null;R.classList.remove('glisse')});
 /* molette : défiler déplace la vue ; Ctrl (ou le pincement du pavé) zoome autour du pointeur, comme dans les outils de design */
 fond.addEventListener('wheel',function(e){e.preventDefault();var r=R.getBoundingClientRect();if(e.ctrlKey||e.metaKey)zoom(Math.exp(-e.deltaY*.01),e.clientX-r.left,e.clientY-r.top);else vueA(C.deplacer(S.vue,-e.deltaX,-e.deltaY))},{passive:false});
 document.addEventListener('keydown',function(e){if(saisie(e)){if(e.key==='Escape'){carte.hidden=true;carteNote=null}return}
  if(e.key===' '&&!espace){espace=true;R.classList.add('espace');e.preventDefault();return}
  if((e.ctrlKey||e.metaKey)&&(e.key==='+'||e.key==='=')){e.preventDefault();zoom(1.25);return}if((e.ctrlKey||e.metaKey)&&e.key==='-'){e.preventDefault();zoom(1/1.25);return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;var k=e.key.toLowerCase();
  if(k==='v')choisir('selection');else if(k==='h')choisir('main');else if(k==='n')choisir('note');else if(k==='0')vueA(C.zoomA(S.vue,1,W,H));else if(k==='1')ajusterVue();
  else if(k==='escape'){fermerInspecteur();if(!carte.hidden)fermerCarte()}
  else if(/^arrow/.test(k)&&document.activeElement===fond){e.preventDefault();var d={arrowleft:[60,0],arrowright:[-60,0],arrowup:[0,60],arrowdown:[0,-60]}[k];vueA(C.deplacer(S.vue,d[0],d[1]))}});
 document.addEventListener('keyup',function(e){if(e.key===' '){espace=false;R.classList.remove('espace')}});
 fond.tabIndex=0;fond.addEventListener('keydown',function(e){if(e.key==='Enter'&&outil==='note'){var p=C.versScene(S.vue,W/2,H/2);nouvelleNote(p[0],p[1])}});
 addEventListener('resize',function(){taille();notesPos()});

 /* ---------- garder : la vue et les notes, à chaque changement ---------- */
 var tS=0;function changer(vueSeule){if(!o.sauver)return;clearTimeout(tS);tS=setTimeout(function(){var ok=o.sauver(C.aGarder(S));if(ok===false)dire('Ce navigateur refuse d\'enregistrer : les notes seront perdues en fermant la page.')},vueSeule?400:0)}

 /* ---------- ouvrir un contenu : charger son adaptateur seulement à ce moment ---------- */
 function ouvrir(source){if(!source)return Promise.resolve();var u=(o.adaptateurs||{})[source.type];if(!u){dire('Ce type de contenu ne s\'ouvre pas encore dans le Canevas.');return Promise.resolve()}
  R.classList.add('charge');return(ADAPT[source.type]?Promise.resolve():script(u)).then(function(){adapt=ADAPT[source.type];if(!adapt)throw new Error('Adaptateur indisponible.');return adapt.charger(source)}).then(function(r){donnees=r.donnees;
   var c=S.calques.filter(function(x){return x.adaptateur===source.type})[0];if(!c){c=C.calque({nom:r.calque.nom,adaptateur:source.type,grille:r.calque.grille});S.calques=[c];S.actif=c.id}
   c.taille=r.calque.taille;c.grille.type=r.calque.grille.type;c.grille.pas=r.calque.grille.pas;tt.textContent=r.titre;ts.textContent=r.sous||'';S.titre=r.titre;R.classList.remove('charge');majGrille();
   if(!o.vueGardee)ajusterVue();else dessiner();notesDom();changer()}).catch(function(e){R.classList.remove('charge');adapt=null;donnees=null;dire((e&&e.message)||'Impossible d\'ouvrir ce contenu.');majGrille();dessiner()})}

 taille();majGrille();notesDom();pc.textContent=C.pourcent(S.vue);if(!S.source&&!o.vueGardee)vueA({x:-W/2,y:-H/2,z:1});
 var pret=ouvrir(S.source);
 return{scene:function(){return S},pret:pret,outil:function(){return outil},choisir:choisir,zoom:zoom,ajuster:ajusterVue,vue:function(){return S.vue}}}

root.AIMECanevas={monter:monter,_a:ADAPT,adaptateur:function(type,a){ADAPT[type]=a}};
})(typeof self!=='undefined'?self:this);
