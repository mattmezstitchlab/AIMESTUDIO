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
var etat={place:'owner',decale:false,planB:false,choisi:null,niveau:'jour',onglet:'cercle'};
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
 var t=$('vHero').querySelector('.v-onglet[data-vue="cercle"]');if(t)try{t.focus({preventScroll:true})}catch(_){t.focus()}}
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
  b.onclick=function(){etat.place=p.id;hero();dire(p.nom+' : '+n+' moments dans ce jour.')};
  li.appendChild(b);L.appendChild(li)})}
/* AI est le tableau de bord : ce qui est prévu pour cette place (l'onglet Programme), et la même chose sur le cadran
   (l'onglet Circle). Le + du Dock choisit la place ; tout ce qui suit en dépend — c'est la même règle que le serveur. */
function hero(){if(!$('vHero'))return;var r=composer(etat.place,etat);
 if(etat.choisi&&!r.vus.some(function(m){return m.id===etat.choisi}))etat.choisi=null;   /* la place a changé : un moment qu'elle ne voit pas ne reste pas choisi */
 $('vVous').textContent=r.place.nom;$('vVousPt').style.setProperty('--pt',r.couleur);
 $('vNb').textContent=r.vus.length+' moments';
 /* AI est le calendrier ; une date ouvre le jour en profondeur, et l'onglet commande le corps */
 var cal=$('vVueCalendrier'),jv=$('vVueJour'),k=$('vPageK');
 if(cal)cal.hidden=etat.niveau!=='calendrier';if(jv)jv.hidden=etat.niveau!=='jour';
 if(k)k.textContent=etat.niveau==='calendrier'?'AI · ce qui est prévu':'Jour J';
 if($('vRetour'))$('vRetour').hidden=etat.niveau!=='jour';   /* le retour n'existe que dans la date ouverte */
 [].forEach.call($('vHero').querySelectorAll('.v-onglet'),function(b){b.setAttribute('aria-pressed',b.getAttribute('data-vue')===etat.onglet?'true':'false')});
 var vueC=$('vVueCercle'),vueP=$('vVueProgramme'),vueX=$('vVuePersonnes');
 if(vueC)vueC.hidden=etat.onglet!=='cercle';if(vueP)vueP.hidden=etat.onglet!=='programme';if(vueX)vueX.hidden=etat.onglet!=='personnes';
 peindreCalendrier();peindreSuite(r.vus.length);peindrePersonnes();
 /* la place en cours se lit dans la carte ; elle se change dans le + */
 var PA=$('vPlaces');if(PA){PA.textContent='';PA.appendChild(pastille(r.couleur));var pn=el('b',null,r.place.nom);PA.appendChild(pn)}
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
 $('vCache').textContent=r.caches?r.caches+(r.caches>1?' moments ne sont pas envoyés à cette place : ils ne la concernent pas.':' moment n’est pas envoyé à cette place : il ne la concerne pas.'):'Cette place voit tout le programme.';
 dessinerCadran(r);
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
 var noms={};r.vus.forEach(function(m){noms[m.id]=m.titre+' · '+m.debut+' – '+m.fin+' · '+m.lieu+(m.change?' · mis à jour':'')});
 /* le cadran de l'iPhone se touche comme celui du module : même nom accessible, même clic, même Entrée */
 dessin(S,C.modele(cadran(etat.place,etat),{rayon:352,epaisseur:40,ecart:9}),{choisi:etat.choisi,qui:'la place « '+r.place.nom+' »',noms:noms,
  choisir:function(id){etat.choisi=etat.choisi===id?null:id;hero();
   var a=$('vCercle')&&$('vCercle').querySelector('.v-td-arc[data-moment="'+id+'"]');if(a){try{a.focus({preventScroll:true})}catch(_){a.focus()}}},
  ids:{titre:'vCercleT',desc:'vCercleD'}})}
function dire(t){var d=$('vReelDit');if(d){d.textContent=t}}
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
 var p=PLACES.filter(function(x){return x.id===id})[0];etat.place=id;hero();if(p)dire(p.nom+' : AI, Programme et Circle se composent pour cette place.')}
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

function tels(evt){var L=$('vTels');if(!L)return;L.textContent='';
 telephones(evt).forEach(function(t){
  var li=el('li','v-tel'+(t.on?' allume':' eteint')+(t.on?'':' cache'));li.style.setProperty('--role',t.c);
  li.style.setProperty('--role-fond',teinte(t.c,.20));   /* le fond du téléphone, pas un liseré */
  li.style.setProperty('--role-fond-doux',teinte(t.c,.08));
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
  /* le Dock du produit, identique dans les sept écrans */
  var dk=el('div','v-p-dock');dk.setAttribute('aria-hidden','true');
  c.appendChild(dk);
  li.appendChild(c);
  var n=el('p','nom');n.appendChild(pastille(t.c));n.appendChild(document.createTextNode(t.nom));li.appendChild(n);
  li.appendChild(el('p','voit',t.voit));
  L.appendChild(li)});
 [].forEach.call(document.querySelectorAll('#vEvts button'),function(b){b.setAttribute('aria-pressed',b.dataset.evt===evt?'true':'false')});
 poserDocks();
 reglerTels($('vTels').classList.contains('tous'))}
/* les écrans qui réagissent d'abord ; les autres (qui restent silencieux) sur demande, pour que la leçon se voie */
function reglerTels(tous){var L=$('vTels'),b=$('vTelsTous');if(!L||!b)return;
 L.classList.toggle('tous',!!tous);b.setAttribute('aria-pressed',tous?'true':'false');
 var n=L.querySelectorAll('.v-tel.cache').length;
 b.hidden=!tous&&!n;   /* tout le monde est concerné : il n'y a rien à ouvrir */
 b.textContent=tous?'Voir seulement les écrans concernés':'Voir les '+n+' autres téléphones'}

function monter(){if(!$('vHero'))return;hero();poserDocks();
 [].forEach.call($('vHero').querySelectorAll('.v-onglet'),function(b){b.onclick=function(){var v=b.getAttribute('data-vue');etat.onglet=v==='programme'?'programme':v==='personnes'?'personnes':'cercle';etat.niveau='jour';hero()}});
 if($('vOuvrir'))$('vOuvrir').onclick=ouvrirJour;
 if($('vRetour'))$('vRetour').onclick=function(){etat.niveau='calendrier';hero();var g=$('vCal');if(g){var d=g.querySelector('.v-cal-jour');if(d)try{d.focus({preventScroll:true})}catch(_){d.focus()}}};
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
return{PLACES:PLACES,MOMENTS:MOMENTS,EVTS:EVTS,JOUR:JOUR,calendrier:calendrier,teinte:teinte,composer:composer,cadran:cadran,telephones:telephones};
});
