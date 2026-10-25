/* AIME · l'accueil clair : les démonstrations vivantes (données fictives, rien n'est envoyé).
   « Un projet. Chacun son écran. » utilise les VRAIES règles : synchroview/permissions.js décide ce que chaque place lit
   (event.read, puis l'audience du moment par item.read) et qui peut décaler (event.edit) ; coeur/roles.js donne la couleur
   de chaque place. Le cadran de l'iPhone est celui du module Temps : MOMENTS passe par synchroview/permissions.js, puis par
   modules/temps/cercle.js (le modèle) et accueil/temps.js (le même dessin que l'aperçu public). Aucune règle recopiée.
   AIMEVitrine.composer(place, etat) et AIMEVitrine.cadran(place, etat) : purs, testés sous node (tests/accueil-clair.test.cjs). */
(function(root,factory){var V=factory(root);if(typeof module==='object'&&module.exports)module.exports=V;else root.AIMEVitrine=V})(typeof self!=='undefined'?self:this,function(root){'use strict';
var P=(typeof require==='function'&&typeof module==='object')?require('../synchroview/permissions.js'):root.AIMEPerms;
var RL=(typeof require==='function'&&typeof module==='object')?require('../coeur/roles.js'):root.AIMERoles;
var C=(typeof require==='function'&&typeof module==='object')?require('../modules/temps/cercle.js'):root.AIMECercle;

/* les quatre places de l'accueil (décision de Matt du 23/10 : le couple, la coordination, le prestataire, l'invité) */
var PLACES=[
 {id:'owner',nom:'Le couple',place:'J’organise',gestes:['Décaler un moment','Inviter et donner une place','Demander un engagement']},
 {id:'editor',nom:'La coordination',place:'Je coordonne',gestes:['Décaler un moment','Basculer en plan B','Inviter des invités']},
 {id:'contributor',nom:'Le DJ',place:'Je contribue',gestes:['Confirmer son horaire','Prendre un engagement','Déposer ses documents']},
 {id:'guest',nom:'L’invitée',place:'Je participe',gestes:['Répondre à l’invitation','Voir le programme public']}];
var FONDS={
 owner:'linear-gradient(140deg,#FFC2D1 0%,#FFE0BE 100%)',
 editor:'linear-gradient(140deg,#CEC2FF 0%,#C4E8FF 100%)',
 contributor:'linear-gradient(140deg,#FFD599 0%,#FFC9BE 100%)',
 guest:'linear-gradient(140deg,#ADEBFF 0%,#C2F5DF 100%)'};
/* dur : la durée du moment, en minutes ; c'est elle qui donne son arc au cadran (le bal finit après minuit) */
var MOMENTS=[
 {id:'brief',t:'Brief traiteur',m:810,dur:30,a:'organisation',l:'Cuisine · organisation seulement'},
 {id:'installation',t:'Installation son',m:840,dur:60,a:'equipe',l:'Jardin · équipe',resp:'contributor'},
 {id:'ceremonie',t:'Cérémonie',m:900,dur:45,a:'public',l:'Jardin des Aulnes',b:'Orangerie (plan B : il pleut)'},
 {id:'cocktail',t:'Cocktail',m:960,dur:150,a:'public',l:'Terrasse',d:1},
 {id:'set',t:'Set cocktail du DJ',m:960,dur:90,a:'equipe',l:'Terrasse · équipe',d:1,resp:'contributor'},
 {id:'diner',t:'Dîner',m:1110,dur:150,a:'public',l:'Grande salle'},
 {id:'bal',t:'Premier bal',m:1320,dur:180,a:'public',l:'Grande salle'}];
function hm(m){m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function sujet(id){return{id:'demo-'+id,role:id}}
/* ce qu'une place lit : la règle du serveur, appliquée moment par moment */
function lit(s,x){return P.can(s,'read',{type:'event',public:x.a==='public'}).allow&&P.can(s,'read',{type:'item',audience:x.a==='organisation'?'organisation':x.a==='equipe'?'equipe':'public'}).allow}
function composer(place,etat){etat=etat||{};var s=sujet(place),pl=PLACES.filter(function(p){return p.id===place})[0]||PLACES[0];
 var vus=MOMENTS.filter(function(x){return lit(s,x)}).map(function(x){var dec=x.d&&etat.decale?15:0,dep=x.m+dec,fin=dep+x.dur,ch=(x.d&&etat.decale)||(x.b&&etat.planB);
  return{id:x.id,titre:x.t,heure:hm(dep),debut:hm(dep),fin:hm(fin),dm:dep,fm:fin,decalage:dec,
   lieu:x.b&&etat.planB?x.b:(dec?x.l+' · décalé de 15 min':x.l),change:!!ch}});
 var decaler=P.can(s,'edit',{type:'event'}).allow;
 return{place:pl,couleur:RL.couleur(place),fond:FONDS[place],vus:vus,caches:MOMENTS.length-vus.length,decaler:decaler}}
/* la vue du cadran : exactement les moments que la place reçoit, au format que modules/temps/cercle.js attend.
   Rien n'est recalculé : ce sont les mêmes moments, ni plus (une place ne reçoit pas ce qu'elle ne lit pas) ni moins. */
function cadran(place,etat){var r=composer(place,etat);
 return{rev:1,role:r.place.id,ligne:r.place.nom,moments:r.vus.map(function(m){
  return{id:m.id,titre:m.titre,lieu:m.lieu,debut:m.debut,fin:m.fin,dm:m.dm,fm:m.fm,decalage:m.decalage}})}}

/* les sept téléphones : un vrai écran par personne (notification, moments selon ses droits, mission, Dock) */
var TELS=[
 {id:'mariee',nom:'La mariée',role:'owner',c:'#FB7185',voit:'Tout : programme, réponses, prestataires.',mission:'118 présents · 4 prestataires',missions:{reponse:'119 présents · 4 prestataires',retard:'Dîner décalé · équipe prévenue',pluie:'Plan B actif · Orangerie'},dock:['Accès','Prog.','Pers.'],indices:[0,2]},
 {id:'temoin',nom:'Le témoin',role:'viewer',c:'#34D399',voit:'Sa mission, et la surprise.',mission:'Discours 21:00 · surprise',missions:{surprise:'Surprise 21:40 · piste prête',pluie:'Cérémonie · Orangerie'},dock:['Accès','Prog.','Surprise'],indices:[2,5]},
 {id:'invite',nom:'L’invité',role:'guest',c:'#22D3EE',voit:'Le programme public, le lieu.',mission:'Présence confirmée · table 4',missions:{reponse:'Présence enregistrée · merci',pluie:'Rendez-vous · Orangerie'},dock:['Prog.','Lieu','Réponse'],indices:[2,3]},
 {id:'coord',nom:'La coordination',role:'editor',c:'#6D4AFF',e:'#FFFFFF',voit:'Le déroulé, l’équipe, le plan B.',mission:'7 moments · plan B prêt',missions:{pluie:'Orangerie ouverte à 13:30',retard:'Dîner 19:00 · DJ recalé',surprise:'Créneau 21:40 réservé'},dock:['Déroulé','Équipe','Plan B'],indices:[0,2]},
 {id:'traiteur',nom:'Le traiteur',role:'contributor',c:'#F59E0B',voit:'Son service, l’effectif sans noms.',mission:'118 couverts, sans noms',missions:{reponse:'119 couverts, sans noms',retard:'Service dîner recalé 19:00'},dock:['Mission','Effectif','Docs'],indices:[3,5]},
 {id:'dj',nom:'Le DJ',role:'contributor',c:'#E879F9',voit:'Ses horaires, et ce qui le touche.',mission:'Installation 14:00 · bal 22:00',missions:{retard:'Set cocktail +30 min',surprise:'Piste surprise 21:40',pluie:'Sono sous l’Orangerie'},dock:['Mission','Horaires','Docs'],indices:[1,4]},
 {id:'photo',nom:'Le photographe',role:'contributor',c:'#60A5FA',voit:'Ses créneaux, l’accès.',mission:'Couple 17:30 · contrat signé',missions:{pluie:'Photos sous l’Orangerie'},dock:['Mission','Accès','Docs'],indices:[2,3]}];
var EVTS=[
 {id:'pluie',t:'Il pleut : cérémonie à l’Orangerie',m:{mariee:'Plan B activé : Orangerie.',temoin:'Rendez-vous à l’Orangerie.',invite:'Cérémonie à l’Orangerie.',coord:'Plan B confirmé à 13 h 02.',traiteur:'Service inchangé.',dj:'Son à installer à l’Orangerie.',photo:'Lumière : Orangerie.'}},
 {id:'retard',t:'Le traiteur annonce 30 min de retard',m:{mariee:'Dîner à 19 h 00.',coord:'Dîner décalé : 19 h 00.',traiteur:'Retard noté, merci.',dj:'Set prolongé de 30 min.'}},
 {id:'surprise',t:'Les témoins préparent une surprise',m:{temoin:'Surprise à 21 h 40.',coord:'5 min réservées à 21 h 40.',dj:'Musique de la surprise.'}},
 {id:'reponse',t:'Un invité confirme sa présence',m:{mariee:'119 présents confirmés.',invite:'Réponse enregistrée.',traiteur:'Effectif : 119 couverts.'}}];

function momentsTel(t,evt){
 var s=sujet(t.role),autorises=MOMENTS.filter(function(x){return lit(s,x)});
 var choisis=(t.indices||[]).map(function(i){return MOMENTS[i]}).filter(function(x){return x&&autorises.indexOf(x)>=0});
 if(choisis.length<2)choisis=autorises.slice(0,2);
 return choisis.slice(0,2).map(function(x){
  var m=x.m+(evt==='retard'&&x.t==='Dîner'?30:0)+(evt==='retard'&&x.d?15:0);
  var titre=x.t==='Cérémonie'&&evt==='pluie'?'Cérémonie · Orangerie':x.t;
  return{heure:hm(m),titre:titre};
 })}

function telephones(evt){var e=EVTS.filter(function(x){return x.id===evt})[0]||EVTS[0];
 return TELS.map(function(t){var on=!!e.m[t.id];
  return{id:t.id,nom:t.nom,role:t.role,c:t.c,e:t.e||'#141416',voit:t.voit,on:on,
   msg:on?e.m[t.id]:'Aucune alerte pour vous.',
   mission:(t.missions&&t.missions[e.id])||t.mission,
   moments:momentsTel(t,e.id),
   dock:t.dock}})}

if(typeof document==='undefined')return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,composer:composer,cadran:cadran,telephones:telephones};

/* ---------- le navigateur ---------- */
function $(id){return document.getElementById(id)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function pastille(c){var p=el('span','v-pt');p.style.setProperty('--pt',c);p.setAttribute('aria-hidden','true');return p}
var etat={place:'owner',decale:false,planB:false};

function hero(){if(!$('vHero'))return;var r=composer(etat.place,etat);
 /* le fond : une couche par place, celle de la place choisie s'allume (les autres s'éteignent) */
 [].forEach.call(document.querySelectorAll('.v-fond'),function(f){var on=f.getAttribute('data-fond')===etat.place;f.classList.toggle('on',on);if(on)f.style.backgroundImage=r.fond});
 $('vVous').textContent=r.place.nom;$('vVousPt').style.setProperty('--pt',r.couleur);
 $('vNb').textContent=r.vus.length+' moments visibles';
 var L=$('vMoments');L.textContent='';r.vus.forEach(function(m){var li=el('li');li.appendChild(el('span','h',m.heure));var d=el('span','t');d.appendChild(el('b',null,m.titre));d.appendChild(el('small',null,m.lieu));li.appendChild(d);if(m.change){var p=el('span','v-pil','mis à jour');p.style.background='#111114';p.style.color='#FFFFFF';p.style.borderColor='#111114';li.appendChild(p)}L.appendChild(li)});
 $('vCache').textContent=r.caches?r.caches+(r.caches>1?' moments ne sont pas envoyés à cette place : ils ne la concernent pas.':' moment n’est pas envoyé à cette place : il ne la concerne pas.'):'Cette place voit tout le programme.';
 dessinerCadran(r);
 var P0=$('vPlaces');
 if(P0&&!P0.childNodes.length)PLACES.forEach(function(p){var b=el('button','v-place');b.type='button';b.dataset.place=p.id;b.appendChild(pastille(RL.couleur(p.id)));b.appendChild(el('span',null,p.nom));b.appendChild(el('small',null,p.place));
  b.onclick=function(){etat.place=p.id;hero();dire(p.nom+' : la page se compose pour cette place.')};P0.appendChild(b)});
 if(P0)[].forEach.call(P0.querySelectorAll('.v-place'),function(b){b.setAttribute('aria-pressed',b.dataset.place===etat.place?'true':'false')});
 var G=$('vGestes');if(G){G.textContent='';r.place.gestes.forEach(function(g){G.appendChild(el('li',null,g))})}
 $('vDecaler').disabled=!r.decaler;$('vPlanB').disabled=!r.decaler;$('vDecaler').setAttribute('aria-pressed',etat.decale?'true':'false');$('vPlanB').setAttribute('aria-pressed',etat.planB?'true':'false');
 /* le retour au jardin ne se propose qu'à qui peut basculer : une place qui ne fait que lire garde le libellé neutre */
 $('vPlanB').textContent=r.decaler&&etat.planB?'Revenir au jardin':'Il pleut : basculer en plan B';
 if(!r.decaler)$('vReelDit').textContent='Cette place voit les changements, sans pouvoir les faire.';
 else if(!$('vReelDit').dataset.gardé)$('vReelDit').textContent='Changez quelque chose, puis passez d’une place à l’autre.'}
/* le cadran de l'iPhone : le modèle de modules/temps/cercle.js, dessiné par accueil/temps.js (le même dessin que l'aperçu) */
function dessinerCadran(r){var S=$('vCercle');if(!S||!C)return;
 var dessin=root.AIMETempsAccueil&&root.AIMETempsAccueil.dessiner;
 if(!dessin)return;
 dessin(S,C.modele(cadran(etat.place,etat),{rayon:352,epaisseur:40,ecart:9}),{qui:'la place « '+r.place.nom+' »',ids:{titre:'vCercleT',desc:'vCercleD'}})}
function dire(t){var d=$('vReelDit');if(d){d.textContent=t}}

function tels(evt){var L=$('vTels');if(!L)return;L.textContent='';
 telephones(evt).forEach(function(t){
  var li=el('li','v-tel'+(t.on?' allume':' eteint')+(t.on?'':' cache'));li.style.setProperty('--role',t.c);
  var c=el('div','cadre');
  /* barre supérieure du téléphone */
  var haut=el('div','vt-haut');
  haut.appendChild(el('span','vt-heure','9:41'));
  var prj=el('span','vt-prj');prj.appendChild(pastille(t.c));prj.appendChild(document.createTextNode('Léa & Marc'));haut.appendChild(prj);
  c.appendChild(haut);
  /* notification : active sur les écrans concernés, calme sinon */
  var nf=el('div','vt-notif'+(t.on?' on':''));
  var nfK=el('span','vt-k',t.on?'Notification':'Silencieux');
  nf.appendChild(nfK);
  nf.appendChild(el('p','msg',t.msg));
  c.appendChild(nf);
  /* mission selon la place */
  var ms=el('div','vt-bloc');
  ms.appendChild(el('span','vt-k','Mission'));
  ms.appendChild(el('p','vt-mission',t.mission));
  c.appendChild(ms);
  /* prochains moments autorisés par permissions.js */
  var mo=el('div','vt-bloc vt-prog');
  mo.appendChild(el('span','vt-k','Moments'));
  var ul=el('ul','vt-moments');
  t.moments.forEach(function(m){var it=el('li');it.appendChild(el('b',null,m.heure));it.appendChild(el('span',null,m.titre));ul.appendChild(it)});
  mo.appendChild(ul);
  c.appendChild(mo);
  /* mini-Dock du téléphone */
  var dk=el('div','vt-dock');dk.setAttribute('aria-hidden','true');
  var g0=el('span','vt-dk on',t.dock[0]);if(t.on)g0.appendChild(el('i','vt-pastille'));
  dk.appendChild(g0);
  dk.appendChild(el('span','vt-dk',t.dock[1]));
  dk.appendChild(el('span','vt-plus','+'));
  dk.appendChild(el('span','vt-dk',t.dock[2]));
  c.appendChild(dk);
  li.appendChild(c);
  var n=el('p','nom');n.appendChild(pastille(t.c));n.appendChild(document.createTextNode(t.nom));li.appendChild(n);
  li.appendChild(el('p','voit',t.voit));
  L.appendChild(li)});
 [].forEach.call(document.querySelectorAll('#vEvts button'),function(b){b.setAttribute('aria-pressed',b.dataset.evt===evt?'true':'false')});
 reglerTels($('vTels').classList.contains('tous'))}
/* les écrans qui réagissent d'abord ; les autres (qui restent silencieux) sur demande, pour que la leçon se voie */
function reglerTels(tous){var L=$('vTels'),b=$('vTelsTous');if(!L||!b)return;
 L.classList.toggle('tous',!!tous);b.setAttribute('aria-pressed',tous?'true':'false');
 var n=L.querySelectorAll('.v-tel.cache').length;
 b.hidden=!tous&&!n;   /* tout le monde est concerné : il n'y a rien à ouvrir */
 b.textContent=tous?'Voir seulement les écrans concernés':'Voir les '+n+' autres téléphones'}

function monter(){if(!$('vHero'))return;hero();
 $('vDecaler').onclick=function(){etat.decale=!etat.decale;$('vReelDit').dataset.gardé='1';hero();dire(etat.decale?'Écrit une fois : le cocktail passe à 16:15 sur chaque écran qui le voit.':'Le cocktail revient à 16:00.')};
 $('vPlanB').onclick=function(){etat.planB=!etat.planB;$('vReelDit').dataset.gardé='1';hero();dire(etat.planB?'Plan B : la cérémonie passe à l’Orangerie, pour chaque place qui la voit.':'Retour au jardin.')};
 var E=$('vEvts');if(E){EVTS.forEach(function(x){var b=el('button','v-btn2',x.t);b.type='button';b.dataset.evt=x.id;b.onclick=function(){tels(x.id)};E.appendChild(b)});tels('surprise')}
 var TB=$('vTelsTous');if(TB)TB.onclick=function(){reglerTels(!$('vTels').classList.contains('tous'));if(TB.getAttribute('aria-pressed')==='false')$('vEvts').scrollIntoView({block:'nearest'})};
 /* les engagements (P6) : accepter, puis marquer comme tenu */
 [].forEach.call(document.querySelectorAll('[data-eng]'),function(b){b.onclick=function(){var li=b.closest('.v-eng'),e=li.querySelector('.v-pil');
  if(b.dataset.eng==='propose'){b.dataset.eng='accepte';e.textContent='En cours';e.style.background='#FEF3C7';e.style.borderColor='#F59E0B';e.style.color='#78350F';b.textContent='Marquer comme tenu'}
  else{b.dataset.eng='tenu';e.textContent='Tenu';e.style.background='#D1FAE5';e.style.borderColor='#6EE7B7';e.style.color='#065F46';b.remove()}}});
 var env=$('vEnvoyer');if(env)env.onclick=function(){env.textContent='Envoyé';$('vEnvoiDit').textContent='Arrivée dans son AI, avec vos réponses : '+$('vqDate').value+' · '+$('vqFormule').value+'.'};
 var ag=$('vAgent');if(ag)ag.onclick=function(){var li=document.querySelectorAll('#vEtapes li');[].forEach.call(li,function(x){x.classList.remove('fait');x.firstChild.textContent='·'});
  [].forEach.call(li,function(x,i){setTimeout(function(){x.classList.add('fait');x.firstChild.textContent='✓'},(i+1)*(document.documentElement.classList.contains('calme')?1:550))})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',monter);else monter();
return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,composer:composer,cadran:cadran,telephones:telephones};
});
