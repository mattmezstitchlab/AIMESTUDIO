/* AIME · AI, mon environnement (/projets/) : architecture de convergence AI + ME, décision de Matt du 25/10/2026.
   Un seul écran pour trois contextes, choisis par l'adresse, sans rechargement :
     /projets/                     AI : « À traiter » (demandes reçues), mes projets et participations, mes activités
     /projets/?demande=<clé>       le détail d'une demande reçue (le serveur dit si j'ai le droit de la lire : 404 sinon)
     /projets/?espace=<id>&page=…  un projet, avec le Dock que le serveur compose pour mon rôle (compte/projet.js)
   Rien n'est décidé ici : chaque lecture et chaque geste repartent au serveur, qui revérifie tout.
   Changer de contexte invalide tout ce qui venait du précédent : une génération (gen) par contexte, toute réponse d'une génération
   passée est ignorée, et l'écran quitté est vidé avant que le suivant ne réponde. Les textes venus de la base passent par textContent.
   AIMEAI.monter({ chargerAI })   branche l'aiguillage (une fois) ; chargerAI : la liste des projets, des activités, de cet appareil
   AIMEAI.route()                 lit l'adresse et montre le bon contexte (aussi au retour du navigateur)
   AIMEAI.montrer(z)              'ai' | 'demande' | 'projet' : les sections, le Dock, et la fermeture du contexte quitté
   AIMEAI.ouvrirProjet(id)        ouvre un projet sans recharger (une entrée d'historique)
   AIMEAI.surDemande(f)           f(demande | null) à chaque changement de demande ouverte (le + contextuel s'y branche)
   Le + de AI (PR 2) : une demande ouverte, et pas encore transformée, ajoute « En faire un projet ». Le geste ouvre une
   confirmation (titre et domaine préremplis, modifiables) ; rien n'est créé avant « Créer le projet ». Le serveur crée le projet au nom
   de la personne connectée et n'en crée qu'un par demande (POST /api/demandes { action: 'convertir' }). */
(function(){'use strict';
if(!/^\/projets\/?$/.test(location.pathname))return;
var CLE=/^[A-Za-z0-9_-]{16,32}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var TYPES={site:'Création de site',refonte:'Refonte ou évolution d\'un site',supports:'Supports (faire-part, affiches, signalétique…)',projet:'Parler d\'un projet',autre:'Autre demande'};
var STATUTS={nouvelle:'Nouvelle',lue:'Lue',en_cours:'En cours',convertie:'Transformée en projet',classee:'Classée'};
var EMAIL={en_attente:'E-mail en cours d\'envoi',envoye:'E-mail envoyé',echec:'E-mail non parti',non_configure:'E-mail non configuré'};
var QUOI={recue:'Demande reçue',email_envoye:'E-mail envoyé',email_echec:'L\'e-mail n\'est pas parti',email_non_configure:'E-mail non configuré sur ce site',renvoi:'E-mail renvoyé',statut:'Statut changé',note:'Note modifiée'};
var ACTIVES=['nouvelle','lue','en_cours'];
var gen=0,genListe=0,ctx={},ouverte=null,abonnes=[],monte=false,projetsConnus=null;
function $(id){return document.getElementById(id)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function requete(u,o){o=o||{};return fetch(u,{method:o.corps?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:o.corps?{'Content-Type':'application/json'}:{},body:o.corps?JSON.stringify(o.corps):undefined})
 .then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return{statut:r.status,j:j}})})}
function jour(d,h){if(!d)return'';var x=new Date(d);if(isNaN(x))return'';return x.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+(h?' à '+x.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'')}
function dire(t,ko){var s=$('dVivant');if(!s)return;s.className='vivant'+(ko?' ko':'');s.textContent='';var n=gen;setTimeout(function(){if(n===gen)s.textContent=t},30)}
function annoncer(d){ouverte=d;abonnes.forEach(function(f){try{f(d)}catch(_){}})}

/* ---------- les contextes ---------- */
function titres(z,d){var T=$('tTitre'),S=$('tSous');if(z==='ai'){T.textContent='AI';S.textContent='Ce qui vous concerne : demandes, projets, activités';document.title='AI · AIME'}
 else if(z==='demande'){T.textContent='AI';S.textContent='Une demande reçue';document.title=(d?d.prenom+' '+d.nom+' · ':'')+'Demande · AIME'}}
function montrer(z){
 if(z!=='projet'&&window.AIMEProjet)AIMEProjet.fermer();   /* le projet quitté s'arrête, sa réponse en vol est ignorée */
 if(z!=='demande'){gen++;var c=$('dCorps');if(c)c.textContent='';if(ouverte)annoncer(null)}
 if(z!=='ai')genListe++;   /* une liste en cours de chargement ne s'affiche plus sur un autre contexte */
 $('espaces').hidden=z!=='ai';$('demande').hidden=z!=='demande';if(z!=='ai'&&$('local'))$('local').hidden=true;
 var ch=$('pChanger');if(ch)ch.open=false;
 if(z!=='projet'){titres(z);dockPersonnel()}}
/* le Dock personnel AI · + · ME (dock/plus.js), reposé en revenant d'un projet ; puis le + reçoit les gestes du contexte */
function dockPersonnel(){var d=$('dock-site');if(!d||!window.AIMEPlus)return;AIMEPlus.brancher(d).then(function(){abonnes.forEach(function(f){try{f(ouverte)}catch(_){}})})}
function route(){var q=new URLSearchParams(location.search),e=q.get('espace'),d=q.get('demande');
 if(e&&UUID.test(e)&&window.AIMEProjet){montrer('projet');return AIMEProjet.ouvrir(e,q.get('page'))}
 if(d&&CLE.test(d)){montrer('demande');return ouvrirDemande(d)}
 montrer('ai');if(ctx.chargerAI)ctx.chargerAI();chargerDemandes()}
function aller(url){try{history.pushState(null,'',url)}catch(_){location.href=url;return}route();try{window.scrollTo(0,0)}catch(_){}}
function ouvrirProjet(id){if(!UUID.test(String(id||''))||!window.AIMEProjet)return;montrer('projet');AIMEProjet.ouvrir(id,'acces',{pousser:true});try{window.scrollTo(0,0)}catch(_){}}

/* ---------- À traiter : les demandes reçues (propriétaire du site seulement : le serveur répond 404 à tout autre) ---------- */
function carte(d){var b=el('button','dm');b.type='button';b.setAttribute('data-demande',d.cle);
 var t=el('span','dm-t');t.appendChild(el('b',null,d.prenom+' '+d.nom));t.appendChild(el('span',null,(TYPES[d.type]||'Demande')+' · reçue le '+jour(d.recue_le)));if(d.extrait)t.appendChild(el('span',null,d.extrait));b.appendChild(t);
 var e=el('span','dm-e');e.appendChild(el('span','etiq'+(d.statut==='nouvelle'?' nouvelle':''),STATUTS[d.statut]||d.statut));if(d.email_statut!=='envoye')e.appendChild(el('span','etiq ko',EMAIL[d.email_statut]||d.email_statut));b.appendChild(e);return b}
function chargerDemandes(){var n=++genListe,z=$('aTraiter');
 return requete('/api/demandes?n=50').then(function(r){if(n!==genListe)return;
  if(r.statut===404||r.statut===405){z.hidden=true;return}   /* aucune boîte de demandes pour ce compte : la section n'existe pas */
  var L=$('demandes'),T=$('demandesTraitees');L.textContent='';T.textContent='';z.hidden=false;
  if(r.statut!==200||!r.j||!r.j.ok){$('traitees').hidden=true;L.appendChild(el('p','alerte',(r.j&&r.j.raison)||'Les demandes ne sont pas disponibles pour le moment.'));return}
  var tout=r.j.demandes||[],act=tout.filter(function(d){return ACTIVES.indexOf(d.statut)>=0}),fin=tout.filter(function(d){return ACTIVES.indexOf(d.statut)<0});
  if(!act.length)L.appendChild(el('p','leg','Aucune demande à traiter.'));act.forEach(function(d){L.appendChild(carte(d))});
  $('traitees').hidden=!fin.length;$('traiteesT').textContent='Demandes traitées ('+fin.length+')';fin.forEach(function(d){T.appendChild(carte(d))});
  if(r.j.suivant)L.appendChild(el('p','leg','Les 50 plus récentes sont affichées.'))}).catch(function(){if(n===genListe)z.hidden=true})}

/* ---------- le détail d'une demande ---------- */
function ligne(dl,k,v,lien){if(!v)return;dl.appendChild(el('dt',null,k));var dd=el('dd');if(lien){var a=el('a',null,v);a.href=lien;dd.appendChild(a)}else dd.textContent=v;dl.appendChild(dd)}
function afficherDemande(j){var d=j.demande,C=$('dCorps');C.textContent='';
 var h=el('h2','p-titre',d.prenom+' '+d.nom);h.id='dTitre';h.tabIndex=-1;C.appendChild(h);
 C.appendChild(el('p','leg',(TYPES[d.type]||'Demande')+' · reçue le '+jour(d.recue_le,true)));
 var dl=el('dl','d-champs');ligne(dl,'E-mail',d.email,'mailto:'+encodeURIComponent(d.email).replace(/%40/g,'@'));ligne(dl,'Téléphone',d.tel,d.tel?'tel:'+d.tel.replace(/[^0-9+]/g,''):null);
 ligne(dl,'Adresse',d.adresse);ligne(dl,'Livraison souhaitée',d.livraison?jour(d.livraison+'T12:00:00'):null);ligne(dl,'Consentement',d.consentement_le?'donné le '+jour(d.consentement_le,true):null);
 var c1=el('section','carte-c');c1.setAttribute('aria-labelledby','dMsgT');var h1=el('h3',null,'Son message');h1.id='dMsgT';c1.appendChild(h1);c1.appendChild(dl);c1.appendChild(el('p','d-message',d.message));C.appendChild(c1);
 /* le suivi : deux statuts distincts, la demande et l'e-mail */
 var c2=el('section','carte-c');c2.setAttribute('aria-labelledby','dSuiviT');var h2=el('h3',null,'Suivi');h2.id='dSuiviT';c2.appendChild(h2);
 var fS=el('form','lgn');var lS=el('label',null,'Statut de la demande');lS.setAttribute('for','dStatut');var sel=el('select');sel.id='dStatut';
 (d.statut==='convertie'?['convertie']:['nouvelle','lue','en_cours','classee']).forEach(function(k){var o=el('option',null,STATUTS[k]);o.value=k;if(k===d.statut)o.selected=true;sel.appendChild(o)});
 var bS=el('button','b b-s','Enregistrer');bS.type='submit';fS.appendChild(lS);fS.appendChild(sel);if(d.statut!=='convertie')fS.appendChild(bS);else sel.disabled=true;c2.appendChild(fS);
 fS.onsubmit=function(e){e.preventDefault();if(sel.value===d.statut)return;bS.disabled=true;var n=gen;requete('/api/demandes',{corps:{action:'statut',cle:d.cle,statut:sel.value}}).then(function(r){if(n!==gen)return;bS.disabled=false;
  if(r.statut===200){d.statut=sel.value;dire('Statut enregistré : '+STATUTS[sel.value]+'.');recharger(d.cle)}else dire((r.j&&r.j.raison)||'Statut refusé.',true)}).catch(function(){bS.disabled=false;dire('Serveur injoignable.',true)})};
 var pE=el('p',null,EMAIL[d.email_statut]+(d.email_statut==='envoye'&&d.email_envoye_le?' le '+jour(d.email_envoye_le,true):'')+(d.email_code&&d.email_code!=='config'?' (code '+d.email_code+')':''));if(d.email_statut!=='envoye')pE.className='alerte';c2.appendChild(pE);
 if(d.email_statut==='echec'||d.email_statut==='non_configure'){var bR=el('button','b b-s','Renvoyer l\'e-mail');bR.type='button';var sR=el('span');sR.appendChild(bR);c2.appendChild(sR);
  bR.onclick=function(){bR.disabled=true;var n=gen;requete('/api/demandes',{corps:{action:'renvoyer',cle:d.cle}}).then(function(r){if(n!==gen)return;bR.disabled=false;dire(r.statut===200?'E-mail renvoyé.':((r.j&&r.j.raison)||'Renvoi impossible.'),r.statut!==200);if(r.statut===200)recharger(d.cle)}).catch(function(){bR.disabled=false;dire('Serveur injoignable.',true)})}}
 var fN=el('form','pile');var lN=el('label','pile');lN.appendChild(el('span',null,'Note privée (vous seul la lisez)'));var ta=el('textarea');ta.rows=3;ta.maxLength=2000;ta.id='dNote';ta.value=d.note||'';lN.appendChild(ta);fN.appendChild(lN);
 var bN=el('button','b b-s','Enregistrer la note');bN.type='submit';var sp=el('span');sp.appendChild(bN);fN.appendChild(sp);c2.appendChild(fN);
 fN.onsubmit=function(e){e.preventDefault();bN.disabled=true;var n=gen;requete('/api/demandes',{corps:{action:'note',cle:d.cle,note:ta.value}}).then(function(r){if(n!==gen)return;bN.disabled=false;dire(r.statut===200?'Note enregistrée.':((r.j&&r.j.raison)||'Note refusée.'),r.statut!==200)}).catch(function(){bN.disabled=false;dire('Serveur injoignable.',true)})};
 if(d.conserver_jusqu_au)c2.appendChild(el('p','leg','Conservée jusqu\'au '+jour(d.conserver_jusqu_au)+' sans nouvelle activité, puis effacée avec son historique.'));
 C.appendChild(c2);
 /* le projet né de cette demande, s'il existe ; sinon, où se trouve le geste */
 if(j.projet&&UUID.test(j.projet)){var c4=el('section','carte-c');c4.setAttribute('aria-labelledby','dProjetT');var h4=el('h3',null,'Le projet créé depuis cette demande');h4.id='dProjetT';c4.appendChild(h4);
  var bo=el('button','b b-p','Ouvrir le projet');bo.type='button';bo.setAttribute('data-ouvrir',j.projet);var so=el('span');so.appendChild(bo);c4.appendChild(so);C.insertBefore(c4,c2)}
 else if(d.statut!=='convertie')c2.appendChild(el('p','leg','Pour en faire un projet : le + du Dock, « En faire un projet ».'));
 var c3=el('section','carte-c');c3.setAttribute('aria-labelledby','dHistT');var h3=el('h3',null,'Historique');h3.id='dHistT';c3.appendChild(h3);var ol=el('ol','p-journal');
 (j.journal||[]).forEach(function(x){var t=QUOI[x.quoi]||x.quoi;if(x.quoi==='statut'&&x.detail&&x.detail.a)t+=' : '+(STATUTS[x.detail.de]||x.detail.de)+' → '+(STATUTS[x.detail.a]||x.detail.a);if(x.detail&&x.detail.code)t+=' (code '+x.detail.code+')';
  ol.appendChild(el('li','p-ligne',jour(x.quand,true)+' · '+t))});c3.appendChild(ol);C.appendChild(c3)}
function recharger(cle){var n=gen;return requete('/api/demandes?cle='+encodeURIComponent(cle)).then(function(r){if(n!==gen||r.statut!==200||!r.j)return;var f=document.activeElement&&document.activeElement.id;afficherDemande(r.j);annoncer(r.j.demande);if(f&&$(f))$(f).focus({preventScroll:true})})}
function ouvrirDemande(cle){var n=++gen,C=$('dCorps');C.textContent='';C.appendChild(el('p','leg','Chargement de la demande…'));
 return requete('/api/demandes?cle='+encodeURIComponent(cle)).then(function(r){if(n!==gen)return;
  if(r.statut!==200||!r.j||!r.j.ok){C.textContent='';C.appendChild(el('p','alerte',r.statut===404?'Cette demande est introuvable, ou vous n\'avez pas accès aux demandes.':((r.j&&r.j.raison)||'La demande n\'a pas pu être chargée.')));annoncer(null);return}
  afficherDemande(r.j);titres('demande',r.j.demande);annoncer(r.j.demande);var t=$('dTitre');if(t)t.focus({preventScroll:true});
  /* consulter une demande nouvelle la marque « lue » (au serveur, inscrit à l'historique) */
  if(r.j.demande.statut==='nouvelle')requete('/api/demandes',{corps:{action:'statut',cle:cle,statut:'lue'}}).then(function(x){if(x.statut===200&&n===gen)recharger(cle)}).catch(function(){})})
 .catch(function(){if(n!==gen)return;C.textContent='';C.appendChild(el('p','alerte','Serveur injoignable. Réessayez dans un instant.'))})}

/* ---------- Demande → projet (PR 2) : le + propose, la personne confirme, le serveur crée ---------- */
var GESTE='projetDepuisDemande';
function poserPlus(d){var z=$('dock-site');if(!z||!window.AIMEDock||!window.AIMEDockVue||document.body.classList.contains('en-projet'))return;
 if(!d&&!z.querySelector('[data-geste="'+GESTE+'"]'))return;   /* rien à retirer : le Dock personnel reste tel que dock/plus.js l'a posé */
 var c=AIMEDock.composer({famille:'Public connecté'});
 if(d&&d.statut!=='convertie')c.plus.unshift({id:GESTE,nom:'En faire un projet',geste:'public',href:null,sensible:false});
 AIMEDockVue.poser(z,c,{mode:'page',id:'dock-site',actif:'ai'});
 var b=z.querySelector('.dock-plus');if(b)b.setAttribute('aria-label',d&&d.statut!=='convertie'?'Gestes : en faire un projet, nouveau projet, invitation reçue':'Nouveau projet ou invitation reçue')}
function proposer(d){var I=window.AIMEIntention,lu=null;try{lu=I?I.lire(d.message):null}catch(_){lu=null}
 var modele=lu&&(lu.modele==='mariage'||lu.modele==='seminaire')?lu.modele:'';
 return{titre:((lu&&lu.nomType&&modele?lu.nomType:TYPES[d.type]||'Projet')+' · '+d.prenom+' '+d.nom).slice(0,120),modele:modele}}
function convertir(){var d=ouverte;if(!d||d.statut==='convertie')return;var C=$('dCorps');if(!C)return;var deja=$('dConvertir');if(deja){var t0=deja.querySelector('input');if(t0)t0.focus();return}
 var p=proposer(d),f=el('form','carte-c pile');f.id='dConvertir';f.setAttribute('aria-labelledby','dConvT');var h=el('h3',null,'Créer un projet depuis cette demande');h.id='dConvT';f.appendChild(h);
 f.appendChild(el('p','leg','Rien n\'est créé avant votre confirmation. Vous serez propriétaire du projet. Seuls son nom et son domaine y entrent : les coordonnées de la personne restent dans la demande.'));
 var l1=el('label','pile');l1.appendChild(el('span',null,'Nom du projet'));var ti=el('input');ti.maxLength=120;ti.required=true;ti.value=p.titre;ti.id='dConvTitre';l1.appendChild(ti);f.appendChild(l1);
 var l2=el('label','pile');l2.appendChild(el('span',null,'Domaine'));var se=el('select');se.id='dConvModele';[['','Autre (sans programme type)'],['mariage','Mariage'],['seminaire','Séminaire']].forEach(function(o){var x=el('option',null,o[1]);x.value=o[0];if(o[0]===p.modele)x.selected=true;se.appendChild(x)});l2.appendChild(se);f.appendChild(l2);
 var lg=el('div','lgn');var ok=el('button','b b-p','Créer le projet');ok.type='submit';var an=el('button','b b-s','Annuler');an.type='button';lg.appendChild(ok);lg.appendChild(an);f.appendChild(lg);
 an.onclick=function(){f.remove();dire('Annulé. Rien n\'a été créé.');var t=$('dTitre');if(t)t.focus({preventScroll:true})};
 f.onsubmit=function(e){e.preventDefault();var titre=ti.value.trim();if(!titre){ti.focus();return}ok.disabled=true;an.disabled=true;var n=gen;
  requete('/api/demandes',{corps:{action:'convertir',cle:d.cle,titre:titre,modele:se.value||undefined}}).then(function(r){if(n!==gen)return;
   if(r.statut===200&&r.j&&r.j.ok){projetsConnus=null;dire(r.j.existant?'Ce projet existait déjà : il s\'ouvre.':'Projet créé.');ouvrirProjet(r.j.espace);return}
   ok.disabled=false;an.disabled=false;dire((r.j&&r.j.raison)||'Création impossible.',true)}).catch(function(){if(n!==gen)return;ok.disabled=false;an.disabled=false;dire('Serveur injoignable.',true)})};
 var suivi=C.querySelector('[aria-labelledby="dSuiviT"]');C.insertBefore(f,suivi||null);f.scrollIntoView({block:'center'});ti.focus();ti.select()}

/* ---------- changer de projet sans quitter l'écran ---------- */
function remplirChanger(){var L=$('pChangerListe');if(!L)return;
 (projetsConnus?Promise.resolve(projetsConnus):requete('/api/espaces',{corps:{action:'mes'}}).then(function(r){return projetsConnus=(r.statut===200&&r.j&&r.j.espaces)||[]})).then(function(liste){
  L.textContent='';var ici=window.AIMEProjet&&AIMEProjet.courant();liste.forEach(function(s){var li=el('li');var b=el('button','b b-s',s.titre);b.type='button';b.setAttribute('data-ouvrir',s.id);if(s.id===ici)b.setAttribute('aria-current','page');li.appendChild(b);L.appendChild(li)});
  if(!liste.length)L.appendChild(el('li','leg','Aucun autre projet.'))})}

/* ---------- l'aiguillage : clics et retour du navigateur ---------- */
function monter(o){ctx=o||{};if(monte)return;monte=true;
 document.addEventListener('click',function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var a=e.target.closest('[data-vers-ai],#dock-site a[data-lieu="ai"]');if(a){e.preventDefault();aller('/projets/');return}
  var np=e.target.closest('#dock-site a[data-geste="nouveauProjet"]');if(np){e.preventDefault();aller('/projets/');var t=$('eTitre');if(t){t.scrollIntoView({block:'center'});t.focus()}return}
  var dm=e.target.closest('[data-demande]');if(dm){e.preventDefault();aller('/projets/?demande='+encodeURIComponent(dm.getAttribute('data-demande')));return}
  var op=e.target.closest('[data-ouvrir]');if(op){e.preventDefault();ouvrirProjet(op.getAttribute('data-ouvrir'));return}});
 var ch=$('pChanger');if(ch)ch.addEventListener('toggle',function(){if(ch.open)remplirChanger()});
 abonnes.push(poserPlus);
 var z=$('dock-site');if(z)z.addEventListener('aime:dock-geste',function(e){if(e.detail&&e.detail.id===GESTE){e.preventDefault();convertir()}});
 window.addEventListener('popstate',route)}

window.AIMEAI={monter:monter,route:route,montrer:montrer,ouvrirProjet:ouvrirProjet,projets:function(l){projetsConnus=l||null},
 surDemande:function(f){if(typeof f==='function')abonnes.push(f)},ouverte:function(){return ouverte},aller:aller};
})();
