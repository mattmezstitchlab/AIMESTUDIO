/* AIME · la démo de l'accueil : les téléphones de la mosaïque mariage (exemples/mosaique, #102), composés selon le rôle choisi
   dans « Je suis… ». Le téléphone du rôle choisi est au centre, mis en avant ; pour un métier, c'est le gabarit prestataire
   avec les mots de ce métier (vitrine/metiers.json, un seul fichier de données, aucun écran codé à la main).
   - composer(metiers, choix)  → { tels, centre }   (logique pure, testée dans tests/demo.test.cjs)
   - monter(zone, metiers, choix, { etat, go, son }) → { jouer, couper, arreter }   (le navigateur)
   Honnêteté : données fictives (Léa & Marc), rien n'est enregistré ni envoyé ; le son ne démarre qu'après « Activer la démo ». */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEDemo=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* les personnes du mariage (les mêmes que la mosaïque) ; les prestataires viennent de vitrine/metiers.json */
var PERSONNES={
 mariee:{id:'mariee',titre:'La mariée',desc:'Tout : programme, réponses, prestataires.',c:'#FB7185',k:'Notre mariage',lead:'Tout votre jour, en un seul endroit.',compte:true,note:67,
  dock:[['bell','Alertes'],['chat','Messages'],['grid','Projet'],['cal','Agenda']],gestes:['Inviter','Écrire','Ajouter une tâche']},
 temoin:{id:'temoin',titre:'Le témoin',desc:'Sa mission, et la surprise.',c:'#34D399',k:'Votre mission',lead:'Ce qui vous concerne, et ce qu’on prépare en secret.',note:74,
  dock:[['bell','Alertes'],['list','Ma part'],['chat','Messages'],['gift','Surprise']],gestes:['Écrire aux témoins','Lancer la surprise','Ajouter une tâche']},
 invite:{id:'invite',titre:'L’invitée',desc:'Le programme public, le lieu, sa réponse.',c:'#22D3EE',k:'Vous êtes invitée',lead:'Le programme, le lieu, votre réponse.',compte:true,note:79,
  dock:[['prog','Programme'],['check','Réponse'],['pin','Lieu'],['chat','Messages']],gestes:['Écrire aux mariés','Confirmer ma présence','Accès inattendu ?']},
 coord:{id:'coord',titre:'La coordination',desc:'Le déroulé, l’équipe, le plan B.',c:'#7C5CFF',k:'Votre jour J, coordonné',lead:'Le déroulé minute par minute, l’équipe, le plan B.',note:62,
  dock:[['bell','Alertes'],['time','Déroulé'],['team','Équipe'],['umb','Plan B']],gestes:['Modifier le déroulé','Activer le plan B','Valider un remplaçant']}
};
var BASE=['mariee','temoin','invite','coord'],PRESTA=['traiteur','dj','photographe'];
/* le choix de « Je suis… » → le téléphone mis en avant */
var CHOIX={maries:'mariee',coordination:'coord',invite:'invite'};

function metierDe(metiers,id){var L=(metiers&&metiers.metiers)||metiers||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null}
function telMetier(m){return{id:'m-'+m.id,metier:m.id,titre:m.titre,desc:m.desc,c:m.c,k:'Votre mission',lead:m.lead,live:m.live,note:m.note,dock:m.dock,gestes:m.gestes,messages:m.messages||{},preparation:m.preparation||null,prestataire:true}}

/* composer : la liste des téléphones, le rôle choisi au centre */
function composer(metiers,choix){
 var tels=BASE.map(function(k){return PERSONNES[k]}),cible=null,m=null;
 PRESTA.forEach(function(id){var x=metierDe(metiers,id);if(x)tels.push(telMetier(x))});
 if(choix&&choix.indexOf('metier:')===0){m=metierDe(metiers,choix.slice(7));if(!m)return null;cible='m-'+m.id;if(!tels.some(function(t){return t.id===cible}))tels.push(telMetier(m))}
 else if(CHOIX[choix])cible=CHOIX[choix];else return null;
 var i=tels.map(function(t){return t.id}).indexOf(cible),t=tels.splice(i,1)[0],milieu=Math.floor(tels.length/2);tels.splice(milieu,0,t);
 return{tels:tels,centre:milieu,choisi:t}}

/* le scénario : qui sonne, qui reste muet. Les messages des prestataires viennent de leur métier. */
function scenario(tels){
 var presta=tels.filter(function(t){return t.prestataire}),traiteur=tels.filter(function(t){return t.metier==='traiteur'})[0];
 var a={id:'rsvp',de:'invite',dire:'Une invitée confirme. Seule la mariée est prévenue. Ceux qui comptent les couverts voient l’effectif changer, sans nom et sans sonnerie.',
  vers:{invite:['Envoyé','Présence confirmée. Merci !','envoye'],mariee:['Réponse','Lucie confirme sa présence. 87 invités sur 120.']}};
 presta.forEach(function(t){if(t.messages.effectif)a.vers[t.id]=t.messages.effectif.concat('calme')});
 var b=traiteur?{id:'retard',de:traiteur.id,dire:'Un retard. Ceux qu’il touche sont prévenus ; l’invitée n’est pas dérangée.',
  vers:{coord:['Retard','Traiteur : +30 min. Vin d’honneur prolongé.'],mariee:['Retard','Le dîner commence à 20 h 30. Rien à faire.']}}:null;
 if(b){b.vers[traiteur.id]=['Envoyé','Retard de 30 min transmis à la coordination.','envoye'];presta.forEach(function(t){if(t.messages.retard)b.vers[t.id]=t.messages.retard})}
 var c={id:'pluie',de:'coord',dire:'Il pleut. Le lieu public change : cette fois, tout le monde sonne.',
  vers:{coord:['Envoyé','Plan B activé : Orangerie, installer à 13 h 30.','envoye'],mariee:['Plan B','La cérémonie passe à l’Orangerie, 15 h.'],temoin:['Plan B','Cérémonie à l’Orangerie, 15 h.'],invite:['Changement','La cérémonie a lieu à l’Orangerie, 15 h.']}};
 presta.forEach(function(t){c.vers[t.id]=t.messages.pluie||['Plan B','La cérémonie passe à l’Orangerie.']});
 return[a,b,c].filter(Boolean)}

/* ---------------- le navigateur ---------------- */
var IC={bell:'<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',chat:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 cal:'<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',list:'<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r=".8"/><circle cx="5" cy="12" r=".8"/><circle cx="5" cy="17" r=".8"/>',
 gift:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M12 9v11M12 9c-1.5-3.5-5-3.5-5-1s5 1 5 1zM12 9c1.5-3.5 5-3.5 5-1s-5 1-5 1z"/>',prog:'<path d="M8 4v16M8 8h9M8 12h7M8 16h10"/>',
 check:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',pin:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
 time:'<circle cx="6" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><path d="M6 7.6v2.8M6 13.6v2.8M10 6h10M10 12h7M10 18h9"/>',
 team:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.2a4.6 4.6 0 0 1 5.5 4.8"/>',umb:'<path d="M3.5 12a8.5 8.5 0 0 1 17 0z"/><path d="M12 12v6a2 2 0 0 1-4 0"/>',
 case:'<rect x="4" y="7.5" width="16" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M4 12.5h16"/>',count:'<path d="M5 19V9M10 19V5M15 19v-7M20 19V8"/>',
 doc:'<path d="M7 3.5h7l4.5 4.5V20a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4.5M9.5 13h6M9.5 16.5h6"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
 key:'<circle cx="8.5" cy="12" r="4"/><path d="M12.5 12H20M17 12v3M20 12v2.5"/>'};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function svg(k){return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(IC[k]||'')+'</svg>'}
var JOURS=function(){return Math.max(1,Math.ceil((new Date(2027,5,14)-new Date())/86400000))};

function telHTML(t,choisi){var d=t.dock,cell=function(x,k){return'<span class="dk'+(k===0?' on':'')+'">'+svg(x[0])+'<span>'+esc(x[1])+'</span>'+(k===0?'<span class="badge"></span>':'')+'</span>'};
 var corps=t.compte?'<p class="count"><b>'+JOURS()+'</b><em>jours avant le 14 juin 2027</em></p>':t.live?'<p class="live"><b>'+esc(t.live[0])+'</b><span>'+esc(t.live[1])+'</span></p>':'<p class="live"><b>Aujourd’hui</b><span>Rien de nouveau pour vous.</span></p>';
 return'<li class="dm-tel'+(choisi?' choisi':'')+'" data-t="'+esc(t.id)+'" style="--role:'+esc(t.c)+'"><div class="dm-ecran" role="img" aria-label="'+esc('Écran de '+t.titre.charAt(0).toLowerCase()+t.titre.slice(1)+' : '+t.lead)+'"><div class="page"><div class="notifs"></div>'
  +'<header class="hero"><span class="k">'+esc(t.k)+'</span><h3>Léa &amp; Marc</h3><p>14 juin 2027 · Domaine des Aulnes</p></header>'
  +'<div class="p-body"><p class="lead">'+esc(t.lead)+'</p><div class="rule"></div>'+corps+'</div>'
  +'<div class="dock">'+cell(d[0],0)+cell(d[1],1)+'<span class="plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>'+cell(d[2],2)+cell(d[3],3)+'</div></div></div>'
  +'<p class="dm-leg"><b>'+esc(t.titre)+'</b><span>'+esc(t.desc)+'</span>'+(t.preparation?'<i class="dm-prep">Module intermittent · en préparation</i>':'')+'<em aria-live="off"></em></p></li>'}

function monter(zone,metiers,choix,o){o=o||{};
 var c=composer(metiers,choix);if(!c||!zone)return null;
 var bande=zone.querySelector('.dm-bande'),liste=zone.querySelector('.dm-tels'),etat=o.etat,reduit=function(){return document.documentElement.classList.contains('calme')||matchMedia('(prefers-reduced-motion: reduce)').matches};
 liste.innerHTML=c.tels.map(function(t,i){return telHTML(t,i===c.centre)}).join('');
 liste.setAttribute('aria-label','Le même mariage, vu par '+c.tels.length+' personnes ; au centre : '+c.choisi.titre.toLowerCase());
 var tels=[].slice.call(liste.querySelectorAll('.dm-tel')),idx={};c.tels.forEach(function(t,i){idx[t.id]=i});
 function echelle(){tels.forEach(function(t){var w=t.querySelector('.dm-ecran').clientWidth;if(w)t.querySelector('.page').style.transform='scale('+(w/390).toFixed(4)+')'})}
 echelle();var ro=window.ResizeObserver?new ResizeObserver(echelle):null;if(ro)ro.observe(liste);else addEventListener('resize',echelle);
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(echelle);

 /* centrer un téléphone dans la bande (sans faire défiler la page) */
 function centrer(i,doux){var t=tels[i];if(!t||!bande)return;var x=t.offsetLeft+t.offsetWidth/2-bande.clientWidth/2;bande.scrollTo({left:Math.max(0,x),behavior:doux&&!reduit()?'smooth':'auto'})}
 requestAnimationFrame(function(){centrer(c.centre,false)});

 /* le défilement lent : pause au survol, au focus, au toucher ; aucun en mouvement réduit */
 var pause=0,sens=1,raf=0,actif=true;
 function suspendre(ms){pause=Math.max(pause,Date.now()+(ms||0))}
 var survol=false,focus=false;
 bande.addEventListener('pointerenter',function(){survol=true});bande.addEventListener('pointerleave',function(){survol=false});
 bande.addEventListener('focusin',function(){focus=true});bande.addEventListener('focusout',function(){focus=false});
 bande.addEventListener('pointerdown',function(){suspendre(6000)});bande.addEventListener('wheel',function(){suspendre(6000)},{passive:true});
 suspendre(2500);
 function glisser(){raf=requestAnimationFrame(glisser);if(!actif||survol||focus||reduit()||document.hidden||Date.now()<pause)return;
  var max=bande.scrollWidth-bande.clientWidth;if(max<=2)return;var x=bande.scrollLeft+sens*0.35;if(x>=max){x=max;sens=-1;suspendre(1800)}else if(x<=0){x=0;sens=1;suspendre(1800)}bande.scrollLeft=x}
 raf=requestAnimationFrame(glisser);

 /* le son : rien avant le clic sur « Activer la démo » */
 var ctx=null,master=null,verb=null,muet=false;
 function audio(){if(ctx)return;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=muet?0:0.7;var comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
  var len=ctx.sampleRate*2,b=ctx.createBuffer(2,len,ctx.sampleRate);for(var k=0;k<2;k++){var d=b.getChannelData(k);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}verb=ctx.createConvolver();verb.buffer=b;var vg=ctx.createGain();vg.gain.value=0.3;verb.connect(vg);vg.connect(master)}
 function hz(m){return 440*Math.pow(2,(m-69)/12)}
 function cloche(m,t,v,p){if(!ctx||muet)return;var out=ctx.createGain(),n=out;if(ctx.createStereoPanner){var pn=ctx.createStereoPanner();pn.pan.value=p;out.connect(pn);n=pn}n.connect(master);n.connect(verb);
  [[1,1,1.4],[2,.18,.5],[3.01,.1,.3]].forEach(function(r){var os=ctx.createOscillator();os.type='sine';os.frequency.value=hz(m)*r[0];var g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v*r[1]*0.3,t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+r[2]);os.connect(g);g.connect(out);os.start(t);os.stop(t+r[2]+0.05)})}
 function pan(i){return tels.length>1?-0.8+i*(1.6/(tels.length-1)):0}
 function sonnerie(i){if(!ctx)return;var b=c.tels[i].note,t=ctx.currentTime+0.01;cloche(b,t,.6,pan(i));cloche(b+7,t+.14,.45,pan(i));cloche(b+12,t+.28,.3,pan(i))}
 function doux(i){if(ctx)cloche(c.tels[i].note+12,ctx.currentTime+0.01,.14,pan(i))}
 function couper(v){muet=v==null?!muet:!!v;if(master)master.gain.value=muet?0:0.7;return muet}

 function dire(t){if(etat)etat.textContent=t}
 function attendre(ms){return new Promise(function(r){setTimeout(r,reduit()?Math.min(ms,250):ms)})}
 function notifier(i,titre,texte,envoye){var box=tels[i].querySelector('.notifs');[].forEach.call(box.querySelectorAll('.nt'),function(n){n.classList.add('vieux')});
  var n=document.createElement('div');n.className='nt'+(envoye?' envoye':'');n.innerHTML='<b>'+esc(titre)+'</b>'+esc(texte);box.insertBefore(n,box.firstChild);var tout=box.querySelectorAll('.nt');if(tout.length>2)tout[tout.length-1].remove()}
 function calme(i,titre,texte){var l=tels[i].querySelector('.live');if(l)l.innerHTML='<b>'+esc(titre)+'</b><span>'+esc(texte)+'</span>'}
 var badges={},sonnes={},silences={};
 function pastille(i){var b=tels[i].querySelector('.badge');badges[i]=(badges[i]||0)+1;b.textContent=badges[i];b.classList.add('vu')}
 function sonner(i){pastille(i);var t=tels[i];t.classList.remove('sonne');void t.offsetWidth;if(!reduit())t.classList.add('sonne');sonnerie(i)}
 function bilan(){tels.forEach(function(t,i){var id=c.tels[i].id,g=sonnes[id]||0,q=silences[id]||0;t.querySelector('.dm-leg em').textContent=(g||q)?g+' sonnerie'+(g>1?'s':'')+' · '+q+' en silence':''})}

 var jeton=0,enCours=false;
 function jouer(){var mien=++jeton;audio();if(ctx&&ctx.state==='suspended')ctx.resume();enCours=true;zone.classList.add('joue');
  badges={};sonnes={};silences={};tels.forEach(function(t){t.querySelector('.notifs').innerHTML='';var b=t.querySelector('.badge');b.textContent='';b.classList.remove('vu')});bilan();
  var evs=scenario(c.tels),p=Promise.resolve();
  dire('Chaque écran est composé pour la personne qui le tient. Écoutez qui sonne… et qui reste muet.');
  p=p.then(function(){return attendre(1600)});
  evs.forEach(function(e){p=p.then(function(){if(mien!==jeton)return;
   zone.classList.add('evenement');dire(e.dire);tels.forEach(function(t){t.classList.add('repos')});
   var de=idx[e.de];tels[de].classList.remove('repos');centrer(de,true);suspendre(4000);var x=e.vers[e.de];
   return attendre(700).then(function(){if(mien!==jeton)return;notifier(de,x[0],x[1],true);doux(de);
    var q=Promise.resolve();Object.keys(e.vers).forEach(function(id){if(id===e.de||idx[id]==null)return;q=q.then(function(){if(mien!==jeton)return;var i=idx[id],m=e.vers[id];
     tels[i].classList.remove('repos');centrer(i,true);suspendre(3000);
     return attendre(650).then(function(){if(mien!==jeton)return;if(m[2]==='calme'){calme(i,m[0],m[1]);silences[id]=(silences[id]||0)+1}else{notifier(i,m[0],m[1],false);sonner(i);sonnes[id]=(sonnes[id]||0)+1}return attendre(300)})})});
    return q})
   .then(function(){if(mien!==jeton)return;c.tels.forEach(function(t){if(!e.vers[t.id])silences[t.id]=(silences[t.id]||0)+1});bilan();return attendre(2200)})
   .then(function(){tels.forEach(function(t){t.classList.remove('repos')});zone.classList.remove('evenement')})})});
  return p.then(function(){if(mien!==jeton)return;enCours=false;zone.classList.remove('joue');centrer(c.centre,true);dire('Fin de la démonstration. Chaque téléphone n’a reçu que ce qui le concernait.')})}
 function arreter(){jeton++;enCours=false;actif=false;cancelAnimationFrame(raf);if(ro)ro.disconnect();if(ctx&&ctx.close)ctx.close().catch(function(){});zone.classList.remove('joue','evenement')}
 return{jouer:jouer,couper:couper,arreter:arreter,composition:c,enCours:function(){return enCours}}}

return{composer:composer,scenario:scenario,monter:monter,PERSONNES:PERSONNES,CHOIX:CHOIX}});
