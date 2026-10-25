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
 return{place:pl,couleur:RL.couleur(place),vus:vus,caches:MOMENTS.length-vus.length,decaler:decaler}}
/* la vue du cadran : exactement les moments que la place reçoit, au format que modules/temps/cercle.js attend.
   Rien n'est recalculé : ce sont les mêmes moments, ni plus (une place ne reçoit pas ce qu'elle ne lit pas) ni moins. */
function cadran(place,etat){var r=composer(place,etat);
 return{rev:1,role:r.place.id,ligne:r.place.nom,moments:r.vus.map(function(m){
  return{id:m.id,titre:m.titre,lieu:m.lieu,debut:m.debut,fin:m.fin,dm:m.dm,fm:m.fm,decalage:m.decalage}})}}

/* les sept téléphones : un vrai écran par personne (notification, moments selon ses droits, mission, Dock) */
var TELS=[
 {id:'mariee',nom:'La mariée',role:'owner',c:'#FB7185',voit:'Tout : programme, réponses, prestataires.',mission:'118 présents · 4 prestataires',missions:{reponse:'119 présents · 4 prestataires',retard:'Dîner décalé · équipe prévenue',pluie:'Plan B actif · Orangerie'},indices:[0,2]},
 {id:'temoin',nom:'Le témoin',role:'viewer',c:'#34D399',voit:'Sa mission, et la surprise.',mission:'Discours 21:00 · surprise',missions:{surprise:'Surprise 21:40 · piste prête',pluie:'Cérémonie · Orangerie'},indices:[2,5]},
 {id:'invite',nom:'L’invité',role:'guest',c:'#22D3EE',voit:'Le programme public, le lieu.',mission:'Présence confirmée · table 4',missions:{reponse:'Présence enregistrée · merci',pluie:'Rendez-vous · Orangerie'},indices:[2,3]},
 {id:'coord',nom:'La coordination',role:'editor',c:'#6D4AFF',e:'#FFFFFF',voit:'Le déroulé, l’équipe, le plan B.',mission:'7 moments · plan B prêt',missions:{pluie:'Orangerie ouverte à 13:30',retard:'Dîner 19:00 · DJ recalé',surprise:'Créneau 21:40 réservé'},indices:[0,2]},
 {id:'traiteur',nom:'Le traiteur',role:'contributor',c:'#F59E0B',voit:'Son service, l’effectif sans noms.',mission:'118 couverts, sans noms',missions:{reponse:'119 couverts, sans noms',retard:'Service dîner recalé 19:00'},indices:[3,5]},
 {id:'dj',nom:'Le DJ',role:'contributor',c:'#E879F9',voit:'Ses horaires, et ce qui le touche.',mission:'Installation 14:00 · bal 22:00',missions:{retard:'Set cocktail +30 min',surprise:'Piste surprise 21:40',pluie:'Sono sous l’Orangerie'},indices:[1,4]},
 {id:'photo',nom:'Le photographe',role:'contributor',c:'#60A5FA',voit:'Ses créneaux, l’accès.',mission:'Couple 17:30 · contrat signé',missions:{pluie:'Photos sous l’Orangerie'},indices:[2,3]}];
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
   moments:momentsTel(t,e.id)}})}

/* le jour J de la démonstration : une seule date au programme, juin 2027 (samedi 12) */
var JOUR={annee:2027,mois:5,jour:12},MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],SEMAINE=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
if(typeof document==='undefined')return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,JOUR:JOUR,calendrier:calendrier,teinte:teinte,composer:composer,cadran:cadran,telephones:telephones};

/* ---------- le navigateur ---------- */
function $(id){return document.getElementById(id)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function pastille(c){var p=el('span','v-pt');p.style.setProperty('--pt',c);p.setAttribute('aria-hidden','true');return p}
var etat={place:'owner',decale:false,planB:false,choisi:null,niveau:'jour',onglet:'programme'};
/* AI est le tableau de bord : le mois, semaine par semaine (lundi d'abord). Pur, testé sous node. */
function calendrier(annee,mois){
 var premier=(new Date(annee,mois,1).getDay()+6)%7,nb=new Date(annee,mois+1,0).getDate(),cases=[],d;
 for(d=0;d<premier;d++)cases.push(null);
 for(d=1;d<=nb;d++)cases.push({jour:d,jourJ:annee===JOUR.annee&&mois===JOUR.mois&&d===JOUR.jour,weekend:(d+premier-1)%7>4});
 return{annee:annee,mois:mois,titre:MOIS[mois]+' '+annee,nb:nb,cases:cases,date:JOUR};
}
function dateLongue(){return SEMAINE[(new Date(JOUR.annee,JOUR.mois,JOUR.jour).getDay()+6)%7]+' '+JOUR.jour+' '+MOIS[JOUR.mois]}

/* le calendrier d'AI : les jours du mois, le jour J est le seul qui soit plein (les autres dates sont vides) */
function ouvrirJour(){etat.niveau='jour';etat.onglet='cercle';hero();
 var t=document.querySelector('.v-onglet[data-vue="cercle"]');if(t)try{t.focus({preventScroll:true})}catch(_){t.focus()}}
function peindreCalendrier(){
 var G=$('vCal');if(!G)return;
 var M=calendrier(JOUR.annee,JOUR.mois),T=$('vCalTitre');
 if(T)T.textContent=M.titre;
 if(G.getAttribute('data-mois')===M.titre&&G.childNodes.length)return;   /* même mois : déjà dessiné */
 G.setAttribute('data-mois',M.titre);G.textContent='';
 M.cases.forEach(function(c){
  if(!c){var v=el('span','v-cal-vide');v.setAttribute('aria-hidden','true');G.appendChild(v);return}
  if(!c.jourJ){var x=el('span','v-cal-j'+(c.weekend?' we':''),String(c.jour));x.setAttribute('aria-hidden','true');G.appendChild(x);return}
  var b=el('button','v-cal-jour');b.type='button';b.setAttribute('aria-label','Ouvrir le '+dateLongue());
  b.appendChild(el('b',null,String(c.jour)));b.appendChild(el('i','v-cal-point'));
  b.onclick=function(){ouvrirJour()};
  G.appendChild(b)})}
/* la ligne du calendrier : la date et ce qu'elle contient pour cette place */
function peindreSuite(n){var q=$('vCalQuand');if(q)q.textContent=dateLongue()+' · '+n+(n>1?' moments':' moment')}
/* l'onglet Personnes : qui est dans ce jour, et ce que chacun en voit (composer(), donc permissions.js) */
function peindrePersonnes(){
 var L=$('vPersonnes');if(!L||L.getAttribute('data-place')===etat.place&&L.childNodes.length)return;
 L.setAttribute('data-place',etat.place);L.textContent='';
 PLACES.forEach(function(p){
  var n=composer(p.id,etat).vus.length,li=el('li'),b=el('button','v-p-pers');b.type='button';
  b.setAttribute('aria-pressed',p.id===etat.place?'true':'false');
  b.appendChild(pastille(RL.couleur(p.id)));
  var t=el('span','v-p-pers-t');t.appendChild(el('b',null,p.nom));t.appendChild(el('small',null,n+(n>1?' moments':' moment')));
  b.appendChild(t);
  b.onclick=function(){etat.place=p.id;hero()};
  li.appendChild(b);L.appendChild(li)})}
/* AI est le tableau de bord : ce qui est prévu pour cette place (l'onglet Programme), et la même chose sur le cadran
   (l'onglet Circle). Le + du Dock choisit la place ; tout ce qui suit en dépend — c'est la même règle que le serveur. */
function hero(){if(!$('vListe'))return;var r=composer(etat.place,etat);
 if(etat.choisi&&!r.vus.some(function(m){return m.id===etat.choisi}))etat.choisi=null;   /* la place a changé : un moment qu'elle ne voit pas ne reste pas choisi */
 $('vVous').textContent=r.place.nom;$('vVousPt').style.setProperty('--pt',r.couleur);
 $('vNb').textContent=r.vus.length+' moments';
 /* AI est le calendrier ; une date ouvre le jour en profondeur, et l'onglet commande le corps */
 var cal=$('vVueCalendrier'),jv=$('vVueJour'),k=$('vPageK');
 if(cal)cal.hidden=etat.niveau!=='calendrier';if(jv)jv.hidden=etat.niveau!=='jour';
 if(k)k.textContent=etat.niveau==='calendrier'?'AI · ce qui est prévu':'Jour J';
 if($('vRetour'))$('vRetour').hidden=etat.niveau!=='jour';   /* le retour n'existe que dans la date ouverte */
 [].forEach.call(document.querySelectorAll('.v-onglet[data-vue]'),function(b){b.setAttribute('aria-pressed',b.getAttribute('data-vue')===etat.onglet?'true':'false')});
 var vueC=$('vVueCercle'),vueP=$('vVueProgramme'),vueX=$('vVuePersonnes');
 if(vueC)vueC.hidden=etat.onglet!=='cercle';if(vueP)vueP.hidden=etat.onglet!=='programme';if(vueX)vueX.hidden=etat.onglet!=='personnes';
 peindreCalendrier();peindreSuite(r.vus.length);peindrePersonnes();
 /* « ce qui est prévu » : les mêmes moments que le cadran, jamais une autre liste */
 var LB=$('vListe');
 if(LB){LB.textContent='';r.vus.forEach(function(m){
  var li=el('li'),b=el('button','v-p-m');b.type='button';b.setAttribute('aria-label',m.titre+' · '+m.debut+' – '+m.fin+' · '+m.lieu+(m.change?' · mis à jour':''));
  b.appendChild(el('time','v-p-h',m.debut));
  var t=el('span','v-p-t');t.appendChild(el('b',null,m.titre));t.appendChild(el('small',null,m.lieu));b.appendChild(t);
  if(m.change)b.appendChild(el('span','v-p-maj','mis à jour'));
  /* entrer en profondeur : la ligne ouvre le même moment sur le cercle */
  b.onclick=function(){etat.choisi=m.id;etat.onglet='cercle';hero();var a=$('vCercle')&&$('vCercle').querySelector('.v-td-arc[data-moment="'+m.id+'"]');if(a){try{a.focus({preventScroll:true})}catch(_){a.focus()}}};
  li.appendChild(b);LB.appendChild(li)})}
 /* une ligne dit le moment choisi (le cadran est seul, sans liste en dessous) */
 var choisi=etat.choisi?r.vus.filter(function(m){return m.id===etat.choisi})[0]:null,dit=$('vCercleDit');
 if(dit)dit.textContent=choisi?(choisi.titre+' · '+choisi.debut+' – '+choisi.fin+' · '+choisi.lieu+(choisi.change?' · mis à jour':'')):'Touchez un arc : son heure, son titre et son lieu s’affichent ici.';
 if($('vCache'))$('vCache').textContent=r.caches?r.caches+(r.caches>1?' moments ne sont pas envoyés à cette place : ils ne la concernent pas.':' moment n’est pas envoyé à cette place : il ne la concerne pas.'):'Cette place voit tout le programme.';
 dessinerCadran(r)}
/* le cadran de l'iPhone : le modèle de modules/temps/cercle.js, dessiné par accueil/temps.js (le même dessin que l'aperçu) */
function dessinerCadran(r){var S=$('vCercle');if(!S||!C)return;
 var dessin=root.AIMETempsAccueil&&root.AIMETempsAccueil.dessiner;
 if(!dessin)return;
 var noms={};r.vus.forEach(function(m){noms[m.id]=m.titre+' · '+m.debut+' – '+m.fin+' · '+m.lieu+(m.change?' · mis à jour':'')});
 /* le cadran de l'iPhone se touche comme celui du module : même nom accessible, même clic, même Entrée */
 dessin(S,C.modele(cadran(etat.place,etat),{rayon:352,epaisseur:40,ecart:9}),{choisi:etat.choisi,qui:'la place « '+r.place.nom+' »',noms:noms,
  choisir:function(id){etat.choisi=etat.choisi===id?null:id;hero();
   var a=$('vCercle')&&$('vCercle').querySelector('.v-td-arc[data-moment="'+id+'"]');if(a){try{a.focus({preventScroll:true})}catch(_){a.focus()}}},
  ids:{titre:'vCercleT',desc:'vCercleD'}})}
/* Le Dock du produit, le même partout : AI | + | ME (docs/DOCK.md, entrées `ai` et `me`). Décoratif dans une démonstration :
   les écrans sont des images du produit, pas des navigations. Un seul dessin, posé dans chaque écran (accueil/temps.js). */
var ICONES={ai:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',me:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5'};
/* la teinte d'une place : son rôle (coeur/roles.js) mélangé à du blanc — le fond des sept téléphones */
function teinte(hex,p){var m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return '#FFFFFF';
 var n=parseInt(m[1],16),r=(n>>16)&255,v=(n>>8)&255,b=n&255,mel=function(x){return Math.round(255-(255-x)*p)};
 return '#'+[mel(r),mel(v),mel(b)].map(function(x){return Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0')}).join('')}
function iconeDock(nom){var s=document.createElementNS('http://www.w3.org/2000/svg','svg'),c=document.createElementNS('http://www.w3.org/2000/svg','path');
 s.setAttribute('class','v-p-dk-i');s.setAttribute('viewBox','0 0 24 24');c.setAttribute('d',ICONES[nom]);s.appendChild(c);return s}
function poserDocks(){[].forEach.call(document.querySelectorAll('.v-p-dock'),function(z){
 if(z.childNodes.length)return;   /* déjà posé (rendu refait) */
 var genre=z.getAttribute('data-plus');
 var ai=z.getAttribute('data-ai');
 [['ai','AI'],null,['me','ME']].forEach(function(x){
  var e=el('span','v-p-dk');e.setAttribute('aria-hidden','true');e.title=x?x[1]:'';
  if(x&&x[0]==='ai'&&ai==='basculer'){var ba=el('button','v-p-dk');ba.type='button';ba.setAttribute('aria-label','AI, le calendrier du projet');
   ba.onclick=function(){etat.niveau=etat.niveau==='calendrier'?'jour':'calendrier';hero()};
   ba.appendChild(iconeDock('ai'));z.appendChild(ba);return}
  if(!x){
   if(genre){var b=el('button','v-p-dk v-p-dk-plus');b.type='button';b.setAttribute('aria-haspopup','true');b.setAttribute('aria-expanded','false');
    b.setAttribute('aria-label',genre==='personnes'?'Choisir la place de la démonstration':'Choisir ma place');
    b.onclick=function(){plus(z,b)};b.removeAttribute('aria-hidden');e=b}
   else{e.className='v-p-dk v-p-dk-plus'}   /* sans place à choisir, le + reste une image du Dock */
   e.appendChild(el('i'));z.appendChild(e);return}
  e.appendChild(iconeDock(x[0]));z.appendChild(e)})})}
/* ---------- le + : c'est là qu'on choisit son rôle (docs/DOCK.md) ----------
   Dans AI, la place décide de tout : ce que l'onglet Programme liste, ce que Circle dessine, ce que la carte autorise. */
function itemsPlus(genre){
 if(genre==='personnes'){var P=(root.AIMETempsAccueil&&root.AIMETempsAccueil.PERSONNES)||[],sel=$('tempsDemoQui');
  return P.map(function(p){return{id:p.cle,nom:p.libelle,actif:!!sel&&sel.value===p.cle}})}
 return PLACES.map(function(p){return{id:p.id,nom:p.nom,couleur:RL.couleur(p.id),actif:etat.place===p.id}})}
function choisirPlus(genre,id){
 if(genre==='personnes'){var sel=$('tempsDemoQui');if(sel){sel.value=id;sel.dispatchEvent(new Event('change'))}return}
 etat.place=id;hero()}
function fermerPlus(z,rendre){var m=z.querySelector('.v-plus');if(m&&m.parentNode)m.parentNode.removeChild(m);
 var b=z.querySelector('.v-p-dk-plus');if(b){b.setAttribute('aria-expanded','false');if(rendre)try{b.focus()}catch(_){}}}
function plus(z,bouton){
 if(z.querySelector('.v-plus')){fermerPlus(z,true);return}
 var genre=z.getAttribute('data-plus'),items=itemsPlus(genre),m=el('div','v-plus');
 m.setAttribute('role','menu');m.setAttribute('aria-label',genre==='personnes'?'Choisir la place de la démonstration':'Choisir ma place');
 m.appendChild(el('p','v-plus-t',genre==='personnes'?'Voir depuis':'Je suis…'));
 items.forEach(function(it){var b=el('button','v-plus-i');b.type='button';b.setAttribute('role','menuitemradio');
  b.setAttribute('aria-checked',it.actif?'true':'false');b.dataset.place=it.id;
  if(it.couleur)b.appendChild(pastille(it.couleur));
  b.appendChild(el('span',null,it.nom));
  b.onclick=function(){fermerPlus(z);choisirPlus(genre,it.id);var bb=z.querySelector('.v-p-dk-plus');if(bb)try{bb.focus()}catch(_){}};
  m.appendChild(b)});
 z.appendChild(m);bouton.setAttribute('aria-expanded','true');
 var actif=m.querySelector('[aria-checked="true"]')||m.querySelector('.v-plus-i');if(actif)actif.focus();
 m.addEventListener('keydown',function(e){var L=[].slice.call(m.querySelectorAll('.v-plus-i')),i=L.indexOf(document.activeElement);
  if(e.key==='ArrowDown'){e.preventDefault();(L[i+1]||L[0]).focus()}
  else if(e.key==='ArrowUp'){e.preventDefault();(L[i-1]||L[L.length-1]).focus()}
  else if(e.key==='Escape'){e.preventDefault();fermerPlus(z,true)}
  else if(e.key==='Tab'){fermerPlus(z)}});
 setTimeout(function(){var dehors=function(e){if(!z.contains(e.target)){fermerPlus(z);document.removeEventListener('pointerdown',dehors,true)}};
  document.addEventListener('pointerdown',dehors,true)},0)}

/* ---------- les cinq temps (25/10) : un seul iPhone, un écran par section ----------
   Chaque section déclare son état (data-place, data-niveau, data-onglet, data-choisi, data-decale) ; la ligne de lecture
   choisit la section lue, et le téléphone prend son écran. Ce sont les mêmes écrans que la démonstration, composés par
   composer() : rien n'est inventé pour la page. Sans script, la première section s'affiche — le téléphone montre le mois. */
var COURANT=0;
function etapes(){return [].slice.call(document.querySelectorAll('.etape'))}
function calme(){return document.documentElement.classList.contains('calme')}
/* le changement d'écran : un fondu court, sec quand on a demandé « réduire les animations » */
function fondu(){var e=document.querySelector('.v-cinq-tele .v-p-ecran');if(!e||calme())return;
 e.classList.remove('v-change');void e.offsetWidth;e.classList.add('v-change');
 clearTimeout(fondu.t);fondu.t=setTimeout(function(){e.classList.remove('v-change')},280)}
function poserEtape(i,sec){var L=etapes(),a=L[i];if(!a)return;COURANT=i;
 etat.place=a.getAttribute('data-place')||etat.place;
 etat.niveau=a.getAttribute('data-niveau')==='calendrier'?'calendrier':'jour';
 etat.onglet=a.getAttribute('data-onglet')||'programme';
 etat.choisi=a.getAttribute('data-choisi')||null;
 etat.decale=a.getAttribute('data-decale')==='true';etat.planB=false;
 if($('vEtape'))$('vEtape').textContent=String(i+1).padStart(2,'0');
 if($('vEtapeNom'))$('vEtapeNom').textContent=a.getAttribute('data-nom')||'';
 if(!sec)fondu();
 hero()}
/* la ligne de lecture : le milieu de l'écran sur un ordinateur ; sous le téléphone collé sur un mobile, là où le
   titre d'une section arrive. C'est la section qui traverse cette ligne qui commande l'écran. */
function ligneLecture(){var z=document.querySelector('.v-cinq-tele'),h=root.innerHeight||800;
 if(z&&root.matchMedia&&root.matchMedia('(max-width:900px)').matches){var b=z.getBoundingClientRect().bottom;return Math.min(Math.max(b+h*0.2,h*0.36),h*0.82)}
 return h*0.5}
function choisirParLecture(){var L=etapes();if(!L.length)return;var y=ligneLecture(),dedans=-1,dernier=-1;
 L.forEach(function(a,i){var r=a.getBoundingClientRect();if(r.top<=y&&r.bottom>=y)dedans=i;if(r.top<=y)dernier=i});
 var i=dedans>=0?dedans:Math.max(0,dernier);
 if(i!==COURANT)poserEtape(i)}
function suivreEtapes(){poserEtape(0,true);
 function au(){choisirParLecture()}
 root.addEventListener('scroll',au,{passive:true});
 root.addEventListener('resize',au);
 root.addEventListener('orientationchange',au);
 au()}

function monter(){if(!$('vEtapes'))return;
 poserDocks();
 [].forEach.call(document.querySelectorAll('.v-onglet[data-vue]'),function(b){b.onclick=function(){var v=b.getAttribute('data-vue');etat.onglet=v==='cercle'?'cercle':v==='personnes'?'personnes':'programme';etat.niveau='jour';hero()}});
 if($('vOuvrir'))$('vOuvrir').onclick=ouvrirJour;
 if($('vRetour'))$('vRetour').onclick=function(){etat.niveau='calendrier';hero();var g=$('vCal'),d=g&&g.querySelector('.v-cal-jour');if(d)try{d.focus({preventScroll:true})}catch(_){d.focus()}};
 suivreEtapes();
 /* l'inscription du cinquième temps : le même service que la capsule (#atBloc), la place venant de « Je suis… » */
 var f=$('vInscription');if(f&&root.AIMEAttente&&root.AIMEAttente.bloc)root.AIMEAttente.bloc(f)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',monter);else monter();
return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,JOUR:JOUR,calendrier:calendrier,teinte:teinte,composer:composer,cadran:cadran,telephones:telephones};
});
