/* AIME · l'accueil clair : les démonstrations vivantes (données fictives, rien n'est envoyé).
   « Un projet. Chacun son écran. » utilise les VRAIES règles : synchroview/permissions.js décide ce que chaque place lit
   (event.read, puis l'audience du moment par item.read) et qui peut décaler (event.edit) ; coeur/roles.js donne la couleur
   de chaque place. Rien n'est calculé ici qui ne le soit pas aussi au serveur dans un vrai projet.
   AIMEVitrine.composer(place, etat) : pur, testé sous node (tests/accueil-clair.test.cjs). */
(function(root,factory){var V=factory(root);if(typeof module==='object'&&module.exports)module.exports=V;else root.AIMEVitrine=V})(typeof self!=='undefined'?self:this,function(root){'use strict';
var P=(typeof require==='function'&&typeof module==='object')?require('../synchroview/permissions.js'):root.AIMEPerms;
var RL=(typeof require==='function'&&typeof module==='object')?require('../coeur/roles.js'):root.AIMERoles;

/* les quatre places de l'accueil (décision de Matt du 23/10 : le couple, la coordination, le prestataire, l'invité) */
var PLACES=[
 {id:'owner',nom:'Le couple',place:'J’organise',gestes:['Décaler un moment','Inviter et donner une place','Demander un engagement']},
 {id:'editor',nom:'La coordination',place:'Je coordonne',gestes:['Décaler un moment','Basculer en plan B','Inviter des invités']},
 {id:'contributor',nom:'Le DJ',place:'Je contribue',gestes:['Confirmer son horaire','Prendre un engagement','Déposer ses documents']},
 {id:'guest',nom:'L’invitée',place:'Je participe',gestes:['Répondre à l’invitation','Voir le programme public']}];
var FONDS={owner:'#FFF1F3',editor:'#F1EEFF',contributor:'#FFF6E5',guest:'#E8FAFD'};
var MOMENTS=[
 {t:'Brief traiteur',m:810,a:'organisation',l:'Cuisine · organisation seulement'},
 {t:'Installation son',m:840,a:'equipe',l:'Jardin · équipe',resp:'contributor'},
 {t:'Cérémonie',m:900,a:'public',l:'Jardin des Aulnes',b:'Orangerie (plan B : il pleut)'},
 {t:'Cocktail',m:960,a:'public',l:'Terrasse',d:1},
 {t:'Set cocktail du DJ',m:960,a:'equipe',l:'Terrasse · équipe',d:1,resp:'contributor'},
 {t:'Dîner',m:1110,a:'public',l:'Grande salle'},
 {t:'Premier bal',m:1320,a:'public',l:'Grande salle'}];
function hm(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function sujet(id){return{id:'demo-'+id,role:id}}
/* ce qu'une place lit : la règle du serveur, appliquée moment par moment */
function lit(s,x){return P.can(s,'read',{type:'event',public:x.a==='public'}).allow&&P.can(s,'read',{type:'item',audience:x.a==='organisation'?'organisation':x.a==='equipe'?'equipe':'public'}).allow}
function composer(place,etat){etat=etat||{};var s=sujet(place),pl=PLACES.filter(function(p){return p.id===place})[0]||PLACES[0];
 var vus=MOMENTS.filter(function(x){return lit(s,x)}).map(function(x){var dec=x.d&&etat.decale?15:0,ch=(x.d&&etat.decale)||(x.b&&etat.planB);
  return{titre:x.t,heure:hm(x.m+dec),lieu:x.b&&etat.planB?x.b:(dec?x.l+' · décalé de 15 min':x.l),change:!!ch}});
 var decaler=P.can(s,'edit',{type:'event'}).allow;
 return{place:pl,couleur:RL.couleur(place),fond:FONDS[place],vus:vus,caches:MOMENTS.length-vus.length,decaler:decaler}}

/* les sept téléphones : seuls les écrans concernés s'allument */
var TELS=[
 {id:'mariee',nom:'La mariée',c:'#FB7185',voit:'Tout : programme, réponses, prestataires.'},
 {id:'temoin',nom:'Le témoin',c:'#34D399',voit:'Sa mission, et la surprise.'},
 {id:'invite',nom:'L’invité',c:'#22D3EE',voit:'Le programme public, le lieu.'},
 {id:'coord',nom:'La coordination',c:'#6D4AFF',e:'#FFFFFF',voit:'Le déroulé, l’équipe, le plan B.'},
 {id:'traiteur',nom:'Le traiteur',c:'#F59E0B',voit:'Son service, l’effectif sans noms.'},
 {id:'dj',nom:'Le DJ',c:'#E879F9',voit:'Ses horaires, et ce qui le touche.'},
 {id:'photo',nom:'Le photographe',c:'#60A5FA',voit:'Ses créneaux, l’accès.'}];
var EVTS=[
 {id:'pluie',t:'Il pleut : cérémonie à l’Orangerie',m:{mariee:'Plan B activé : Orangerie.',temoin:'Rendez-vous à l’Orangerie.',invite:'Cérémonie à l’Orangerie.',coord:'Plan B confirmé à 13 h 02.',traiteur:'Service inchangé.',dj:'Son à installer à l’Orangerie.',photo:'Lumière : Orangerie.'}},
 {id:'retard',t:'Le traiteur annonce 30 min de retard',m:{mariee:'Dîner à 19 h 00.',coord:'Dîner décalé : 19 h 00.',traiteur:'Retard noté, merci.',dj:'Set prolongé de 30 min.'}},
 {id:'surprise',t:'Les témoins préparent une surprise',m:{temoin:'Surprise à 21 h 40.',coord:'5 min réservées à 21 h 40.',dj:'Musique de la surprise.'}},
 {id:'reponse',t:'Un invité confirme sa présence',m:{mariee:'119 présents confirmés.',invite:'Réponse enregistrée.',traiteur:'Effectif : 119 couverts.'}}];
function telephones(evt){var e=EVTS.filter(function(x){return x.id===evt})[0]||EVTS[0];return TELS.map(function(t){var on=!!e.m[t.id];return{nom:t.nom,c:t.c,e:t.e||'#141416',voit:t.voit,on:on,msg:on?e.m[t.id]:'Écran silencieux.'}})}

if(typeof document==='undefined')return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,composer:composer,telephones:telephones};

/* ---------- le navigateur ---------- */
function $(id){return document.getElementById(id)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function pastille(c){var p=el('span','v-pt');p.style.setProperty('--pt',c);p.setAttribute('aria-hidden','true');return p}
var etat={place:'owner',decale:false,planB:false};

function hero(){var z=$('vHero');if(!z)return;var P0=$('vPlaces'),r=composer(etat.place,etat);
 $('vScene').style.background=r.fond;var t=$('vVous');t.textContent=r.place.nom;$('vVousPt').style.setProperty('--pt',r.couleur);
 $('vNb').textContent=r.vus.length+' moments visibles';
 var L=$('vMoments');L.textContent='';r.vus.forEach(function(m){var li=el('li');li.appendChild(el('span','h',m.heure));var d=el('span','t');d.appendChild(el('b',null,m.titre));d.appendChild(el('small',null,m.lieu));li.appendChild(d);if(m.change){var p=el('span','v-pil','mis à jour');p.style.background='#111114';p.style.color='#FFFFFF';p.style.borderColor='#111114';li.appendChild(p)}L.appendChild(li)});
 $('vCache').textContent=r.caches?r.caches+(r.caches>1?' moments ne sont pas envoyés à cette place : ils ne la concernent pas.':' moment n’est pas envoyé à cette place : il ne la concerne pas.'):'Cette place voit tout le programme.';
 if(!P0.childNodes.length)PLACES.forEach(function(p){var b=el('button','v-place');b.type='button';b.dataset.place=p.id;b.appendChild(pastille(RL.couleur(p.id)));b.appendChild(el('span',null,p.nom));b.appendChild(el('small',null,p.place));
  b.onclick=function(){etat.place=p.id;hero();dire(p.nom+' : la page se compose pour cette place.')};P0.appendChild(b)});
 [].forEach.call(P0.querySelectorAll('.v-place'),function(b){b.setAttribute('aria-pressed',b.dataset.place===etat.place?'true':'false')});
 var G=$('vGestes');G.textContent='';r.place.gestes.forEach(function(g){G.appendChild(el('li',null,g))});
 $('vDecaler').disabled=!r.decaler;$('vPlanB').disabled=!r.decaler;$('vDecaler').setAttribute('aria-pressed',etat.decale?'true':'false');$('vPlanB').setAttribute('aria-pressed',etat.planB?'true':'false');
 $('vPlanB').textContent=etat.planB?'Revenir au jardin':'Il pleut : basculer en plan B';
 if(!r.decaler)$('vReelDit').textContent='Cette place voit les changements, sans pouvoir les faire.';
 else if(!$('vReelDit').dataset.gardé)$('vReelDit').textContent='Changez quelque chose, puis passez d’une place à l’autre.'}
function dire(t){var d=$('vReelDit');if(d){d.textContent=t}}
function tels(evt){var L=$('vTels');if(!L)return;L.textContent='';telephones(evt).forEach(function(t){var li=el('li','v-tel'+(t.on?'':' eteint'));var c=el('div','cadre'),a=el('div','aplat',t.on?'Nouveau':'Rien pour vous');if(t.on){a.style.background=t.c;a.style.color=t.e}c.appendChild(a);c.appendChild(el('p','msg',t.msg));li.appendChild(c);
  var n=el('p','nom');n.appendChild(pastille(t.c));n.appendChild(document.createTextNode(t.nom));li.appendChild(n);li.appendChild(el('p','voit',t.voit));L.appendChild(li)});
 [].forEach.call(document.querySelectorAll('#vEvts button'),function(b){b.setAttribute('aria-pressed',b.dataset.evt===evt?'true':'false')})}

function monter(){if(!$('vHero'))return;hero();
 $('vDecaler').onclick=function(){etat.decale=!etat.decale;$('vReelDit').dataset.gardé='1';hero();dire(etat.decale?'Écrit une fois : le cocktail passe à 16:15 sur chaque écran qui le voit.':'Le cocktail revient à 16:00.')};
 $('vPlanB').onclick=function(){etat.planB=!etat.planB;$('vReelDit').dataset.gardé='1';hero();dire(etat.planB?'Plan B : la cérémonie passe à l’Orangerie, pour chaque place qui la voit.':'Retour au jardin.')};
 var E=$('vEvts');if(E){EVTS.forEach(function(x){var b=el('button','v-btn2',x.t);b.type='button';b.dataset.evt=x.id;b.onclick=function(){tels(x.id)};E.appendChild(b)});tels('pluie')}
 /* les engagements (P6) : accepter, puis marquer comme tenu */
 [].forEach.call(document.querySelectorAll('[data-eng]'),function(b){b.onclick=function(){var li=b.closest('.v-eng'),e=li.querySelector('.v-pil');
  if(b.dataset.eng==='propose'){b.dataset.eng='accepte';e.textContent='En cours';e.style.background='#FFF6E5';e.style.borderColor='#FFF6E5';b.textContent='Marquer comme tenu'}
  else{b.dataset.eng='tenu';e.textContent='Tenu';e.style.background='#E7F8EF';e.style.borderColor='#E7F8EF';b.remove()}}});
 var env=$('vEnvoyer');if(env)env.onclick=function(){env.textContent='Envoyé';$('vEnvoiDit').textContent='Arrivée dans son AI, avec vos réponses : '+$('vqDate').value+' · '+$('vqFormule').value+'.'};
 var ag=$('vAgent');if(ag)ag.onclick=function(){var li=document.querySelectorAll('#vEtapes li');[].forEach.call(li,function(x){x.classList.remove('fait');x.firstChild.textContent='·'});
  [].forEach.call(li,function(x,i){setTimeout(function(){x.classList.add('fait');x.firstChild.textContent='✓'},(i+1)*(document.documentElement.classList.contains('calme')?1:550))})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',monter);else monter();
return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,composer:composer,telephones:telephones};
});
