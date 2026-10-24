/* AIME · module Temps, la présentation dans l'écran de projet (page « Programme », compte/projet.js → bloc { type: 'module' }).
   Le navigateur ne décide d'AUCUN droit : il affiche la vue que /api/temps a calculée pour la personne connectée, propose les gestes
   que cette vue contient, et renvoie chaque geste au serveur avec la révision qu'il avait sous les yeux (409 : il reçoit la version à jour).
   Trois présentations d'une même ressource : Liste (préparer), Chronologie (le jour J), Comparer (le propriétaire vérifie les perspectives).
   Relecture toutes les 2 s (« depuis » la révision connue : rien ne repart si rien n'a changé). Textes venus du serveur : textContent.
   AIMETemps.monter(zone, { espace, dire }) → { arreter() } */
(function(){'use strict';
var RELIRE=2000;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function bouton(txt,cls,aria){var b=el('button','b '+(cls||'b-s'),txt);b.type='button';if(aria)b.setAttribute('aria-label',aria);return b}
function api(espace,q){return fetch('/api/temps?espace='+encodeURIComponent(espace)+(q||''),{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._code=r.status;return j})})}
function envoyer(b){return fetch('/api/temps',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._code=r.status;return j})})}
var MOTS={owner:'organisation',editor:'coordination',contributor:'contribution',viewer:'lecture',guest:'invité'};

function monter(zone,o){var espace=o.espace,dire=o.dire||function(){},etat={rev:null,vue:null,mode:'liste',actif:null,cible:null,comparaison:null,personnes:null,occupe:false},minuterie=null,fini=false;
 zone.textContent='';zone.classList.add('tp');
 var vivant=el('p','sr');vivant.setAttribute('aria-live','polite');vivant.setAttribute('role','status');
 var tete=el('div','tp-tete'),modes=el('div','tp-modes'),corps=el('div','tp-corps'),hist=el('details','tp-hist carte-c');
 modes.setAttribute('role','group');modes.setAttribute('aria-label','Présentation du programme');
 var sum=el('summary',null,'Historique des changements');hist.appendChild(sum);var histL=el('ol','tp-hist-l');hist.appendChild(histL);
 hist.addEventListener('toggle',function(){if(hist.open)chargerHistorique()});
 tete.appendChild(modes);zone.appendChild(vivant);zone.appendChild(tete);zone.appendChild(corps);zone.appendChild(hist);
 function annoncer(t){vivant.textContent='';setTimeout(function(){vivant.textContent=t},30)}

 function poserModes(){modes.textContent='';var L=[['liste','Liste'],['chrono','Chronologie']];if(etat.vue&&etat.vue.peutComparer)L.push(['comparer','Comparer les vues']);
  L.forEach(function(m){var b=bouton(m[1],'b-s');b.setAttribute('aria-pressed',etat.mode===m[0]?'true':'false');b.onclick=function(){etat.mode=m[0];poserModes();afficher();if(m[0]==='comparer')chargerPersonnes()};modes.appendChild(b)})}

 /* ---------- ce qui a changé entre deux vues : annoncé, jamais seulement montré ---------- */
 function changements(av,ap){if(!av)return[];var M={};av.moments.forEach(function(m){M[m.id]=m});var out=[];
  ap.moments.forEach(function(m){var x=M[m.id];if(!x)return;if(x.debut!==m.debut)out.push('« '+m.titre+' » : '+m.debut+' (au lieu de '+x.debut+')');else if(x.lieu!==m.lieu)out.push('« '+m.titre+' » : '+m.lieu);else if(x.fait!==m.fait&&m.fait)out.push('« '+m.titre+' » est fait')});return out}

 function geste(action,p,quoi){if(etat.occupe)return;etat.occupe=true;
  envoyer({action:'geste',espace:espace,geste:{action:action,p:p},rev:etat.rev}).then(function(j){etat.occupe=false;
   if(j._code===200&&j.ok){annoncer(quoi+' : c\'est enregistré pour tout le projet.');dire(quoi+' : enregistré.');return relire(true)}
   if(j._code===409&&j.vue){var av=etat.vue;etat.rev=j.rev;etat.vue=j.vue;afficher();var t=j.raison+(changements(av,j.vue).length?' '+changements(av,j.vue).join(' ; ')+'.':'');annoncer(t);dire(t,true);return}
   var t2=j.raison||('Refusé ('+j._code+').');annoncer(t2);dire(t2,true);if(j._code===404||j._code===403)relire(true)}).catch(function(){etat.occupe=false;dire('Serveur injoignable : rien n\'a été enregistré.',true)})}

 /* ---------- un moment, en liste ---------- */
 function carteMoment(m,lecture){var li=el('li','tp-m'+(m.fait?' fait':'')+(m.decalage?' decale':''));li.dataset.id=m.id;
  var h=el('div','tp-h');var heure=el('span','tp-heure',m.debut+' – '+m.fin);h.appendChild(heure);
  if(m.decalage){var p=el('span','tp-prevu','prévu '+m.prevu+' ('+(m.decalage>0?'+':'−')+Math.abs(m.decalage)+' min)');h.appendChild(p)}
  li.appendChild(h);
  var t=el('div','tp-t');t.appendChild(el('strong',null,m.titre));var lieu=el('span','tp-lieu',m.lieu+(m.planBActif?' · plan B':''));t.appendChild(lieu);li.appendChild(t);
  var tags=el('div','tp-tags');if(m.audience!=='public')tags.appendChild(el('span','tp-tag',m.audienceNom));if(m.fait)tags.appendChild(el('span','tp-tag ok','Fait'));
  if(m.responsable==='moi')tags.appendChild(el('span','tp-tag moi','Vous portez ce moment'));else if(m.responsable==='cible')tags.appendChild(el('span','tp-tag moi','Porté par cette personne'));
  if(tags.childNodes.length)li.appendChild(tags);
  if(m.note)li.appendChild(el('p','tp-note',m.note));
  if(lecture)return li;
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
  var v=etat.vue;if(!v)return;poserModes();
  if(etat.mode!=='comparer'){
   if(v.propositions.length){var pr=el('div','carte-c tp-props');pr.appendChild(el('h3','k','À décider'));v.propositions.forEach(function(p){var l=el('div','lgn');l.appendChild(el('span',null,p.texte));
     var ok=bouton('Décaler de '+p.minutes+' min','b-p');ok.onclick=function(){geste(p.geste.action,p.geste.p,'Proposition appliquée')};l.appendChild(ok);pr.appendChild(l)});
    pr.appendChild(el('p','leg','AIME ne décide pas à votre place : rien ne bouge sans votre geste.'));corps.appendChild(pr)}
   if(v.aConfirmer.length){var ac=el('p','bandeau tp-confirmer','Nouvel horaire à confirmer : '+v.moments.filter(function(m){return m.aConfirmer}).map(function(m){return m.titre+' ('+m.debut+')'}).join(', ')+'.');corps.appendChild(ac)}
  }
  corps.appendChild(etat.mode==='chrono'?chrono(v):etat.mode==='comparer'?comparer(v):liste(v,false));
  if(cle){var n=[].slice.call(corps.querySelectorAll('[data-id] button')).filter(function(x){return x.closest('[data-id]').dataset.id+'|'+(x.getAttribute('aria-label')||x.textContent)===cle})[0];if(n)n.focus({preventScroll:true})}}

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
