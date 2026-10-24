/* AIME · l'écran de projet (/projets/?espace=…) : Mon accès, Journal, Personnes, et le Dock, tels que le serveur les compose (GET /api/page).
   Le navigateur ne calcule AUCUNE permission : il affiche les blocs reçus et propose les gestes que la réponse contient ;
   chaque geste repart au serveur (POST /api/espaces), qui revérifie tout. Les textes venus de la base passent par textContent.
   AIMEProjet.ouvrir(espace, gabarit)   → affiche la page dans #projet et le Dock du projet dans #dock-site */
(function(){'use strict';
var GAB=['acces','journal','personnes'];
function $(id){return document.getElementById(id)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function date(d){return d?new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):''}
var espace=null,courant='acces',rep=null,dockPose=false;
function dire(t,ko){var s=$('pVivant');if(!s)return;s.className='vivant'+(ko?' ko':'');s.textContent='';setTimeout(function(){s.textContent=t},30)}
function post(b){return fetch('/api/espaces',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(r.status!==200||!j.ok)throw new Error(j.raison||('Erreur '+r.status));return j})})}
function lire(g){return fetch('/api/page?espace='+encodeURIComponent(espace)+'&gabarit='+encodeURIComponent(g),{credentials:'same-origin',cache:'no-store'})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(j){j._code=r.status;return j})})}

/* ---------- le Dock : celui de la réponse, jamais un autre ---------- */
function dock(){var z=$('dock-site');if(!z||!window.AIMEDockVue)return;
 if(!rep||!rep.dock){z.innerHTML='';document.body.classList.remove('avec-dock');return}
 var lieu=(rep.dock.lieux||[]).filter(function(l){return l.gabarit===courant})[0];
 AIMEDockVue.poser(z,rep.dock,{mode:'page',id:'dock-site',actif:lieu?lieu.id:null});document.body.classList.add('avec-dock');
 if(dockPose)return;dockPose=true;
 z.addEventListener('aime:dock-lieu',function(e){var l=(rep&&rep.dock&&rep.dock.lieux||[]).filter(function(x){return x.id===e.detail.id})[0];if(!l||!l.gabarit)return;e.preventDefault();ouvrir(espace,l.gabarit)});
 z.addEventListener('aime:dock-geste',function(e){var id=e.detail.id;
  if(id==='inviter'){e.preventDefault();ouvrir(espace,'personnes').then(function(){var f=$('pInviter');if(f){f.scrollIntoView({block:'center'});var s=f.querySelector('select,input');if(s)s.focus()}})}
  else if(id==='inattendu'){e.preventDefault();ouvrir(espace,'acces').then(function(){var d=$('pSignaler');if(d){d.open=true;d.scrollIntoView({block:'center'});var t=d.querySelector('textarea');if(t)t.focus()}})}})}

/* ---------- les blocs ---------- */
var RENDU={
 role:function(b){var c=el('div','p-role');c.appendChild(el('p','p-texte',b.texte));return c},
 gestes:function(b){var c=el('div','carte-c');c.appendChild(el('h2','k','Ce que vous pouvez faire'));var u=el('ul','p-liste');(b.verbes||[]).forEach(function(v){u.appendChild(el('li',null,v.charAt(0).toUpperCase()+v.slice(1)))});c.appendChild(u);return c},
 origine:function(b){return el('p','leg',b.texte)},
 fin:function(b){var p=el('p','p-fin',b.texte);if(b.jusquau)p.classList.add('a-fin');return p},
 compte:function(b){return el('p','leg',b.texte)},
 ligne:function(b){var li=el('li','p-ligne'+(b.moi?' moi':''));li.appendChild(el('span',null,b.texte));if(b.motif){var q=el('q','p-motif',b.motif);li.appendChild(q)}return li},
 personne:function(b){var d=el('div','carte-c');d.appendChild(el('p',null,b.nom+(b.moi?' (vous)':'')+(b.relation?' · '+b.relation:'')));return d},
 liste:function(b){var c=el('div','carte-c');c.appendChild(el('h2','k','Les personnes du projet'));var u=el('ul','p-liste p-personnes');
  (b.personnes||[]).forEach(function(x){var li=el('li','lgn');var t=el('span',null,x.nom+(x.moi?' (vous)':'')+' · '+x.relation+(x.jusquau?' · jusqu\'au '+date(x.jusquau):'')+(x.email?' · '+x.email:''));li.appendChild(t);
   if(x.ref){var bt=el('button','b b-s','Retirer');bt.type='button';bt.onclick=function(){confirmer(bt,'Confirmer le retrait',function(){post({action:'retirer',espace:espace,membre:x.ref}).then(function(){dire(x.nom+' n\'a plus accès au projet.');ouvrir(espace,'personnes')}).catch(function(e){dire(e.message,true)})})};li.appendChild(bt)}
   u.appendChild(li)});c.appendChild(u);return c},
 effectif:function(b){var N={owner:'propriétaire',editor:'coordination',contributor:'contribution',viewer:'lecture',guest:'invité'};return el('p','leg',b.texte+' '+Object.keys(b.effectif||{}).map(function(k){return b.effectif[k]+' × '+(N[k]||k)}).join(', ')+'.')},
 invitations:function(b){var c=el('div','carte-c');c.appendChild(el('h2','k','Invitations en cours'));if(!(b.invitations||[]).length){c.appendChild(el('p','leg','Aucune invitation en cours.'));return c}
  var u=el('ul','p-liste');b.invitations.forEach(function(i){var li=el('li','lgn');li.appendChild(el('span',null,i.relation+(i.email?' · '+i.email:(i.nominative?' · nominative':' · sans adresse'))+' · expire le '+date(i.expire)+(i.jusquau?' · rôle jusqu\'au '+date(i.jusquau):'')));
   if(i.annulable){var bt=el('button','b b-s','Annuler');bt.type='button';bt.onclick=function(){post({action:'annuler',espace:espace,invitation:i.ref}).then(function(){dire('Invitation annulée.');ouvrir(espace,'personnes')}).catch(function(e){dire(e.message,true)})};li.appendChild(bt)}
   u.appendChild(li)});c.appendChild(u);return c},
 geste:function(b){return b.geste==='signaler'?signaler(b):b.geste==='inviter'?inviter(b):null}
};
function confirmer(b,texte,action){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib;action();return}b.dataset.lib=b.textContent;b.dataset.arme='1';b.textContent=texte;setTimeout(function(){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib}},4500)}

/* « Je vois un accès inattendu » : toujours là ; le texte d'aide vient du serveur */
function signaler(b){var d=el('details','signal');d.id='pSignaler';d.appendChild(el('summary',null,b.texte));var f=el('form','pile');
 var lab=el('label','pile');lab.appendChild(el('span',null,'Ce que vous avez vu (facultatif)'));var t=el('textarea');t.rows=2;t.maxLength=280;t.id='pMotif';t.setAttribute('aria-describedby','pMotifAide');lab.appendChild(t);f.appendChild(lab);
 var aide=el('p','leg',b.aide||'');aide.id='pMotifAide';f.appendChild(aide);var ok=el('button','b','Signaler');ok.type='submit';f.appendChild(ok);d.appendChild(f);
 f.onsubmit=function(e){e.preventDefault();ok.disabled=true;post({action:'signaler',espace:espace,motif:t.value.trim()||undefined}).then(function(x){t.value='';d.open=false;dire(x.prevenu?'Signalement inscrit ; le propriétaire est prévenu.':'Signalement inscrit au journal du projet.')}).catch(function(e){dire(e.message,true)}).then(function(){ok.disabled=false})};
 return d}
/* inviter : seulement les rôles que la réponse propose ; la relation est un mot, jamais un droit */
function inviter(b){var c=el('form','carte-c pile');c.id='pInviter';c.appendChild(el('h2','k','Inviter quelqu\'un'));
 var l1=el('label','pile');l1.appendChild(el('span',null,'Sa place dans le projet'));var sel=el('select');(b.roles||[]).forEach(function(r){var o=el('option',null,r.relation.charAt(0).toUpperCase()+r.relation.slice(1));o.value=r.role;sel.appendChild(o)});l1.appendChild(sel);c.appendChild(l1);
 var l2=el('label','pile');l2.appendChild(el('span',null,'Sa relation (facultatif) : témoin, fleuriste, traiteur…'));var rel=el('input');rel.maxLength=40;rel.setAttribute('list','pRelations');rel.autocomplete='off';l2.appendChild(rel);var dl=el('datalist');dl.id='pRelations';l2.appendChild(dl);c.appendChild(l2);
 function suggestions(){dl.textContent='';var r=(b.roles||[]).filter(function(x){return x.role===sel.value})[0];((r&&r.suggestions)||[]).forEach(function(s){var o=el('option');o.value=s;dl.appendChild(o)})}sel.onchange=suggestions;suggestions();
 var l3=el('label','pile');l3.appendChild(el('span',null,'Son adresse e-mail (conseillé : le lien lui est réservé, 7 jours ; sans adresse, 48 heures)'));var em=el('input');em.type='email';em.autocomplete='off';l3.appendChild(em);c.appendChild(l3);
 var l4=el('label','pile');l4.appendChild(el('span',null,'Accès jusqu\'au (facultatif)'));var ju=el('input');ju.type='date';ju.min=new Date(Date.now()+864e5).toISOString().slice(0,10);l4.appendChild(ju);c.appendChild(l4);
 var ok=el('button','b b-p','Créer le lien d\'invitation');ok.type='submit';c.appendChild(ok);var res=el('div','pile');res.setAttribute('aria-live','polite');c.appendChild(res);
 c.onsubmit=function(e){e.preventDefault();ok.disabled=true;post({action:'inviter',espace:espace,role:sel.value,relation:rel.value.trim()||undefined,email:em.value.trim()||undefined,jusquau:ju.value?new Date(ju.value+'T23:59:59').toISOString():undefined})
  .then(function(x){res.textContent='';var lg=el('div','lgn lien');var i=el('input');i.readOnly=true;i.value=x.lien;i.setAttribute('aria-label','Lien d\'invitation');i.style.flex='1';i.style.minWidth='0';
   var cp=el('button','b','Copier');cp.type='button';cp.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(x.lien):Promise.reject()).then(function(){dire('Lien copié.')}).catch(function(){i.select();dire('Sélectionné : copiez-le.')})};lg.appendChild(i);lg.appendChild(cp);res.appendChild(lg);
   res.appendChild(el('p','leg','Lien à usage unique, valable '+x.jours+' jours'+(x.email?', réservé à '+x.email:'')+(x.relation?', comme '+x.relation:'')+(x.jusquau?' ; accès jusqu\'au '+date(x.jusquau):'')+'. Envoyez-le par le moyen de votre choix.'));rel.value='';em.value='';ju.value=''})
  .catch(function(err){dire(err.message,true)}).then(function(){ok.disabled=false})};
 return c}

function composerPage(){var C=$('pCorps');C.textContent='';
 var nav=el('nav','p-onglets');nav.setAttribute('aria-label','Pages du projet');
 (rep.dock&&rep.dock.lieux||[]).forEach(function(l){if(GAB.indexOf(l.gabarit)<0)return;var a=el('a','b b-s',l.nom);a.href='/projets/?espace='+encodeURIComponent(espace)+'&page='+l.gabarit;if(l.gabarit===courant)a.setAttribute('aria-current','page');a.onclick=function(e){e.preventDefault();ouvrir(espace,l.gabarit)};nav.appendChild(a)});
 C.appendChild(nav);
 var h=el('h2','p-titre',(rep.mots&&rep.mots.titre)||'');h.tabIndex=-1;h.id='pTitre';C.appendChild(h);
 var lignes=null;(rep.blocs||[]).forEach(function(b){var f=RENDU[b.type];if(!f)return;var n=f(b);if(!n)return;if(b.type==='ligne'){if(!lignes){lignes=el('ol','p-journal');C.appendChild(lignes)}lignes.appendChild(n)}else C.appendChild(n)});
 if(rep.vide)C.appendChild(el('p','leg',rep.vide))}

function ouvrir(id,g){espace=id;courant=GAB.indexOf(g)>=0?g:'acces';var P=$('projet');if(!P)return Promise.resolve();
 P.hidden=false;if($('espaces'))$('espaces').hidden=true;
 return lire(courant).then(function(j){
  if(j._code!==200||!j.ok){rep=null;dock();$('pCorps').textContent='';$('pCorps').appendChild(el('p','alerte',j._code===404?'Ce projet est introuvable, ou votre accès a pris fin.':(j.raison||'Le projet n\'a pas pu être chargé.')));return}
  rep=j;$('tTitre').textContent=(j.mots&&j.mots.projet)||'Projet';$('tSous').textContent=(j.mots&&j.mots.role)||'';document.title=((j.mots&&j.mots.projet)||'Projet')+' · AIME';
  try{history.replaceState(null,'','/projets/?espace='+encodeURIComponent(espace)+(courant!=='acces'?'&page='+courant:''))}catch(_){}
  composerPage();dock();var t=$('pTitre');if(t)t.focus({preventScroll:true})})
 .catch(function(){$('pCorps').textContent='';$('pCorps').appendChild(el('p','alerte','Serveur injoignable. Réessayez dans un instant.'))})}

window.AIMEProjet={ouvrir:ouvrir,RENDU:RENDU};
})();
