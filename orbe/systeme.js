/* AIME · ORBE · le système : ce que l'orbe reconnaît, ce qu'elle en dit, ce qu'elle sait y faire.
   Une seule table pour tout le design system. Chaque type d'élément déclare : comment le reconnaître, comment le
   commenter, quelles actions il accepte (avec leur état réel : opérationnelle ou prévue). Le compagnon (compagnon.js)
   lit cette table ; le laboratoire l'affiche. Rien n'est appris ailleurs que dans le navigateur du visiteur.

   « Apprendre » et « raisonner » désignent ici des RÈGLES écrites à la main appliquées à une mémoire locale de gestes :
   aucune IA n'est branchée. Fonctions pures, testables sous node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEOrbeSysteme=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* ---------- les actions ---------- */
/* les formes de l'orbe, celles du laboratoire (/lab/orb/) */
var FORMES={search:'Recherche',music:'Lecteur',timeline:'Frise',radial:'Menu radial',doc:'Document vivant',cal:'Calendrier',net:'Réseau',map:'Carte',create:'Création',antic:'Anticipation'};
var ACTIONS={
 modifier:{nom:'Modifier',etat:'operationnelle',aide:'Le texte devient modifiable sur place, le temps de la visite.'},
 copier:{nom:'Copier',etat:'operationnelle',aide:'Copie le texte de l\'élément.'},
 dupliquer:{nom:'Dupliquer',etat:'operationnelle',aide:'Une copie apparaît juste après, le temps de la visite.'},
 relier:{nom:'Relier',etat:'operationnelle',aide:'Touchez un second élément : un lien les unit à l\'écran.'},
 masquer:{nom:'Masquer',etat:'operationnelle',aide:'Cache l\'élément ; « Annuler » le rétablit.'},
 expliquer:{nom:'Expliquer',etat:'operationnelle',aide:'Ce que c\'est, ce que cela déclenche, comment c\'est lu.'},
 inspecter:{nom:'Vérifier l\'accès',etat:'operationnelle',aide:'Contraste, nom accessible, taille de la cible : mesurés, pas devinés.'},
 mesurer:{nom:'Mesurer',etat:'operationnelle',aide:'Nombre de mots et temps de lecture.'},
 agrandir:{nom:'Agrandir',etat:'operationnelle',aide:'Voir l\'image en grand.'},
 remplir:{nom:'Remplir un exemple',etat:'operationnelle',aide:'Une valeur fictive adaptée au champ.'},
 vider:{nom:'Vider',etat:'operationnelle',aide:'Efface la valeur du champ.'},
 'copier-lien':{nom:'Copier le lien',etat:'operationnelle',aide:'Copie l\'adresse complète.'},
 decaler:{nom:'Décaler d\'un jour',etat:'operationnelle',aide:'Simule une date décalée, sur cet affichage seulement.'},
 remarque:{nom:'Remarque',etat:'operationnelle',aide:'À réparer, à optimiser ou à améliorer : versé au journal des remarques.'},
 traduire:{nom:'Traduire',etat:'prevue',aide:'Demande un service de traduction, absent de cette démonstration.'},
 recadrer:{nom:'Recadrer',etat:'prevue',aide:'Recadrage d\'image : prévu avec le Studio.'},
 dependances:{nom:'Ce qui en dépend',etat:'prevue',aide:'Demande le graphe de causalité du projet (voir G44 LAB pour un exemple calculé).'},
 partager:{nom:'Partager',etat:'prevue',aide:'Demande les autorisations du projet : jamais accordé par l\'interface seule.'}};

/* ---------- les types : dans l'ordre, le premier qui correspond l'emporte ---------- */
var TYPES=[
 {id:'champ',nom:'Champ de saisie',sel:'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]),textarea,select',forme:'search',actions:['remplir','vider','expliquer','inspecter','remarque'],
  dire:function(i){return i.vide?'Un champ vide'+(i.libelle?' : « '+i.libelle+' »':'')+'. Je peux y mettre un exemple fictif.':'Un champ rempli. Une information saisie une fois pourrait servir partout ailleurs.'}},
 {id:'interrupteur',nom:'Interrupteur',sel:'input[type=checkbox],input[type=radio],[role=switch]',forme:'search',actions:['expliquer','inspecter','remarque'],dire:function(i){return'Un choix '+(i.coche?'activé':'désactivé')+'. Je dis ce qu\'il change avant que vous touchiez.'}},
 {id:'curseur',nom:'Curseur',sel:'input[type=range],[role=slider]',forme:'music',actions:['expliquer','inspecter','remarque'],dire:function(i){return'Un curseur, valeur '+i.valeur+'. Glissez : je commente l\'effet.'}},
 {id:'bouton',nom:'Bouton',sel:'button,[role=button],input[type=submit]',forme:'search',actions:['expliquer','inspecter','relier','remarque'],
  dire:function(i){return'Un bouton : « '+i.court+' ». '+(i.desactive?'Il est désactivé pour l\'instant.':'Il déclenche une action : je ne la lance jamais à votre place.')}},
 {id:'lien',nom:'Lien',sel:'a[href]',forme:'search',actions:['copier-lien','expliquer','inspecter','relier','remarque'],dire:function(i){return i.ancre?'Un lien vers une autre partie de cette page.':'Un lien vers '+i.cible+'.'}},
 {id:'onglet',nom:'Onglet',sel:'[role=tab]',forme:'timeline',actions:['expliquer','inspecter','remarque'],dire:function(){return'Un onglet : une autre vue du même contenu, rien n\'est recopié.'}},
 {id:'date',nom:'Date',sel:'time,[data-date]',forme:'cal',actions:['decaler','dependances','copier','remarque'],dire:function(i){return'Une date : '+i.court+'. Si elle bougeait, je montrerais ce qui en dépend.'}},
 {id:'personne',nom:'Personne',sel:'[data-personne]',forme:'map',actions:['expliquer','relier','partager','remarque'],dire:function(i){return'Une personne : « '+i.court+' ». Ce qu\'elle voit dépend de ses autorisations, pas de l\'écran.'}},
 {id:'lieu',nom:'Lieu',sel:'[data-lieu],address',forme:'map',actions:['copier','relier','dependances','remarque'],dire:function(i){return'Un lieu : '+i.court+'. Changer de lieu, c\'est changer d\'horaires, d\'accès, de trajets.'}},
 {id:'video',nom:'Vidéo ou son',sel:'video,audio',forme:'music',actions:['expliquer','inspecter','remarque'],dire:function(){return'Un média. Je peux devenir son lecteur.'}},
 {id:'image',nom:'Image',sel:'img,picture,svg[role=img],canvas[role=img]',forme:'doc',actions:['agrandir','expliquer','inspecter','recadrer','relier','remarque'],
  dire:function(i){return i.alt?'Une image : « '+i.alt+' ».':'Une image sans description : un lecteur d\'écran ne saura pas ce qu\'elle montre.'}},
 {id:'tableau',nom:'Tableau',sel:'table',forme:'doc',actions:['copier','mesurer','inspecter','remarque'],dire:function(i){return'Un tableau de '+i.lignes+' lignes. Je peux le copier tel quel.'}},
 {id:'code',nom:'Code',sel:'pre,code,kbd',forme:'doc',actions:['copier','remarque'],dire:function(){return'Du code. Copiez-le d\'un geste.'}},
 {id:'citation',nom:'Citation',sel:'blockquote,q',forme:'doc',actions:['modifier','copier','relier','inspecter','remarque'],dire:function(i){return'Une citation de '+i.mots+' mots.'}},
 {id:'titre',nom:'Titre',sel:'h1,h2,h3,h4',forme:'doc',actions:['modifier','copier','dupliquer','relier','mesurer','inspecter','traduire','remarque'],
  dire:function(i){return'Un titre de '+i.mots+' mot'+(i.mots>1?'s':'')+'.'+(i.mots>12?' Un peu long pour être lu d\'un coup d\'œil.':'')}},
 {id:'liste',nom:'Liste',sel:'ul,ol,dl',forme:'timeline',actions:['copier','mesurer','dupliquer','remarque'],dire:function(i){return'Une liste de '+i.items+' élément'+(i.items>1?'s':'')+'.'}},
 {id:'texte',nom:'Texte',sel:'p,li,figcaption,dd,dt,small,label,span',forme:'doc',actions:['modifier','copier','mesurer','dupliquer','relier','inspecter','traduire','remarque'],
  dire:function(i){return'Un texte de '+i.mots+' mot'+(i.mots>1?'s':'')+(i.mots>60?', environ '+Math.max(1,Math.round(i.mots/230))+' min de lecture':'')+'.'}},
 {id:'carte',nom:'Carte',sel:'article,[class*=carte],[class*=card],figure',forme:'map',actions:['dupliquer','masquer','relier','expliquer','remarque'],dire:function(){return'Une carte : un objet qu\'on peut dupliquer, relier, ranger.'}},
 {id:'menu',nom:'Navigation',sel:'nav,[role=navigation],[role=menu]',forme:'search',actions:['expliquer','inspecter','remarque'],dire:function(i){return'Une navigation de '+i.liens+' entrée'+(i.liens>1?'s':'')+'.'}},
 {id:'formulaire',nom:'Formulaire',sel:'form',forme:'search',actions:['expliquer','remarque'],dire:function(){return'Un formulaire. Rien n\'est envoyé sans votre confirmation.'}},
 {id:'section',nom:'Section',sel:'section,header,footer,main,aside',forme:'doc',actions:['expliquer','masquer','remarque'],dire:function(){return'Une section de la page.'}}];

/* l'élément le plus proche qui ait un sens ; on ignore ce que le compagnon dessine lui-même */
function typer(el){for(var e=el,prof=0;e&&e.nodeType===1&&prof<8;e=e.parentElement,prof++){if(e.closest&&e.closest('[data-orbe-ignorer]'))return null;
  if(e.hasAttribute&&e.hasAttribute('data-orbe-type')){var t=parType(e.getAttribute('data-orbe-type'));if(t)return{el:e,type:t}}
  for(var i=0;i<TYPES.length;i++){var T=TYPES[i];if(T.id==='texte'&&e.tagName==='SPAN'&&texte(e).length<3)continue;if(e.matches&&e.matches(T.sel))return{el:e,type:T}}}
 return null}
function parType(id){for(var i=0;i<TYPES.length;i++)if(TYPES[i].id===id)return TYPES[i];return null}
function texte(e){return String(e.innerText!=null?e.innerText:e.textContent||'').replace(/\s+/g,' ').trim()}
function mots(t){return t?t.split(' ').length:0}
/* ce que l'orbe sait d'un élément : des faits, pas des suppositions */
function infos(e){var t=texte(e),h=e.getAttribute&&e.getAttribute('href')||'';return{
 texte:t,court:t.length>48?t.slice(0,46)+'…':t,mots:mots(t),vide:'value' in e?!e.value:false,libelle:(e.getAttribute&&(e.getAttribute('aria-label')||e.getAttribute('placeholder')))||'',
 coche:!!e.checked,valeur:e.value,desactive:!!e.disabled,alt:e.getAttribute&&(e.getAttribute('alt')||e.getAttribute('aria-label'))||'',
 ancre:/^#/.test(h),cible:h.replace(/^https?:\/\/[^/]+/,'')||'/',lignes:e.rows?e.rows.length:0,items:e.children?e.children.length:0,liens:e.querySelectorAll?e.querySelectorAll('a').length:0}}
function commenter(e,T){return T.dire(infos(e))}

/* ---------- accessibilité : des mesures ---------- */
function rgb(s){var m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
function lum(c){var f=function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return.2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)}
function contraste(a,b){var x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}

/* ---------- la mémoire et les suggestions ---------- */
function memoireVide(){return{v:1,vus:{},actions:{},refus:{},conversations:[],remarques:[],derniere:null}}
function noter(m,typeId,action){m.actions[typeId]=m.actions[typeId]||{};m.actions[typeId][action]=(m.actions[typeId][action]||0)+1;m.derniere={type:typeId,action:action};return m}
function vu(m,typeId){m.vus[typeId]=(m.vus[typeId]||0)+1;return m}
/* raisonner : trois règles, dans l'ordre, et la règle appliquée est toujours dite */
function suggerer(m,T){var faites=m.actions[T.id]||{},ops=T.actions.filter(function(a){return ACTIONS[a].etat==='operationnelle'&&a!=='remarque'});
 var habituelle=ops.slice().sort(function(a,b){return(faites[b]||0)-(faites[a]||0)})[0];
 var jamais=ops.filter(function(a){return!faites[a]&&!(m.refus[T.id+':'+a]>=2)})[0];
 if(habituelle&&(faites[habituelle]||0)>=2&&jamais)return{action:jamais,regle:'Vous faites souvent « '+ACTIONS[habituelle].nom+' » ici ; je vous propose ce que vous n\'avez jamais essayé.'};
 if(habituelle&&(faites[habituelle]||0)>=2)return{action:habituelle,regle:'C\'est ce que vous faites le plus sur ce type d\'élément.'};
 if(m.derniere&&m.derniere.action==='modifier'&&ops.indexOf('relier')>=0)return{action:'relier',regle:'Vous venez de modifier un contenu : le relier à un autre montre ce qu\'il influence.'};
 return jamais?{action:jamais,regle:'Première rencontre avec cette action sur ce type d\'élément.'}:null}
/* l'envie : l'élément visible le moins exploré ; à égalité, le plus proche du centre */
function envie(m,candidats){var best=null;candidats.forEach(function(c){var s=(m.vus[c.type]||0)*10+(c.distance||0)/100;if(!best||s<best.s)best={s:s,c:c}});return best?best.c:null}

/* ---------- l'hésitation : 3 secondes de mouvement sans but ---------- */
/* points : [{t, x, y}] ; clics : nombre de clics dans la fenêtre ; arret : durée max d'arrêt sur un élément actionnable */
function hesite(points,o){o=o||{};var F=o.fenetre||3000,N=points.length;if(N<6)return false;var t1=points[N-1].t,P=points.filter(function(p){return t1-p.t<=F});if(P.length<6||t1-P[0].t<F*.9)return false;
 if(o.clics>0||o.saisie||o.arret>900)return false;var d=0,tours=0,a0=null;for(var i=1;i<P.length;i++){var dx=P[i].x-P[i-1].x,dy=P[i].y-P[i-1].y,l=Math.hypot(dx,dy);d+=l;if(l>4){var a=Math.atan2(dy,dx);if(a0!=null){var da=Math.abs(a-a0);if(da>Math.PI)da=2*Math.PI-da;if(da>Math.PI/2)tours++}a0=a}}
 return d>(o.distance||700)&&tours>=(o.tours||3)}

/* ---------- la conversation : deux minutes pour un concept du Monde AIME ---------- */
var QUESTIONS=[
 {id:'pour',q:'Pour qui ?',choix:['Moi','Un couple','Une famille','Une équipe','Une ville','Une association']},
 {id:'intention',q:'Quelle intention ?',choix:['Se souvenir','Organiser','Créer','Relier','Transmettre','Célébrer']},
 {id:'matiere',q:'Avec quelle matière ?',choix:['Une date','Un lieu','Une photo','Un document','Une musique','Une promesse']},
 {id:'forme',q:'Et moi, quelle forme je prends ?',choix:['Une frise','Une carte','Un lecteur','Un document','Un calendrier','Une constellation']}];
var NOMS={Se_souvenir:'Mémoire',Organiser:'Partition',Créer:'Atelier',Relier:'Constellation',Transmettre:'Héritage',Célébrer:'Fête'};
function cle(s){return String(s).replace(/ /g,'_')}
function concept(r,variante){var v=variante||0,pour=r.pour||'Moi',int=r.intention||'Relier',mat=r.matiere||'Une date',forme=r.forme||'Une frise';
 var nom=(NOMS[cle(int)]||'Monde')+' '+['vivante','partagée','en mouvement','sans fin','à quatre mains'][v%5];
 var mt=mat.toLowerCase(),fm=forme.toLowerCase(),art=function(x){return x.replace(/^une /,'la ').replace(/^un /,'le ')};
 return{nom:'AIME '+nom.charAt(0).toUpperCase()+nom.slice(1),
  pitch:pour+'. L\'intention : '+int.toLowerCase()+'. La matière : '+mt+', saisie une fois. L\'orbe en fait '+fm+' et la répercute partout où elle compte.',
  orbe:['Je pointe de ma flèche '+art(mt)+' qui manque encore.','Je deviens '+fm+' quand on me touche.','Je montre ce qui change ailleurs si '+art(mt)+' change, avant toute action.'],
  prototype:['Un écran unique : '+mt+', '+fm+'. Mesurer le temps pour comprendre.','Trois personnes, trois perspectives, '+art(mt)+' en commun.',fm.charAt(0).toUpperCase()+fm.slice(1)+' qui se remplit pendant une vraie journée.'][v%3],
  mesure:'À mesurer avec cinq volontaires : temps pour comprendre, nombre d\'hésitations, envie de revenir (échelle de 1 à 7).',
  honnete:'Composé par des règles à partir de vos quatre choix : ce n\'est pas une IA.'}}

return{FORMES:FORMES,ACTIONS:ACTIONS,TYPES:TYPES,typer:typer,parType:parType,infos:infos,commenter:commenter,texte:texte,rgb:rgb,contraste:contraste,
 memoireVide:memoireVide,noter:noter,vu:vu,suggerer:suggerer,envie:envie,hesite:hesite,QUESTIONS:QUESTIONS,concept:concept};
});
