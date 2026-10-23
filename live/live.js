/* AIME LIVE · l'écran. Lit le contenu et l'accès de l'espace, rejoue le journal, montre ce que la personne a le droit de voir.
   ?u=mariage|seminaire · ?qui=<identifiant d'une personne de l'espace> · ?mode=salle (grand écran public). */
(function(){'use strict';
var L=window.AIMELive,P=window.AIMEPerms,C=window.AIMELiveCanal;if(!L||!P||!C)return;
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})}
function $(id){return document.getElementById(id)}
var tt;function toast(m,ko){var t=$('toast');t.textContent=m;t.className='toast'+(ko?' ko':'');t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},ko?6000:3000)}
var Q=new URLSearchParams(location.search),U=/^(mariage|seminaire)$/.test(Q.get('u')||'')?Q.get('u'):'mariage',SALLE=Q.get('mode')==='salle',ECRAN='ecran-salle';
var ROLES={owner:'Propriétaire de l\'espace',editor:'Coordination',contributor:'Contributeur (prestataire, intervenant)',viewer:'Lecture seule',guest:'Invité'};
if(SALLE)document.body.classList.add('salle');
$('espace').value=U;$('espace').onchange=function(){location.search='?u='+this.value};

var D,A,B,canal,qui=null,etat=null,trace=[],GENS=[];
/* un espace réel (?espace=<uuid>) : la personne connectée, les membres et le programme viennent du serveur ; sinon une démonstration */
var ESP=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(Q.get('espace')||'')?Q.get('espace'):null,REEL=null;
function charger(){if(!ESP)return Promise.all([fetch('/vitrine/donnees/'+U+'.json').then(function(r){return r.json()}),fetch('/vitrine/acces/'+U+'.json').then(function(r){return r.json()})]).then(function(r){return{D:r[0],A:r[1],gens:(r[0].personnes||[]).filter(function(p){return r[1].membres[p.id]})}});
 return fetch('/api/espaces',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'acces',espace:ESP})}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{s:r.status,j:j}})}).then(function(x){
  if(x.s===401){var e=new Error('connexion');e.connexion=true;throw e}if(x.s!==200)throw new Error(x.j.raison||'Espace inaccessible.');if(!x.j.modele)throw new Error('Cet espace n\'a pas de programme du jour J.');
  REEL=x.j;U=x.j.modele;return fetch('/vitrine/donnees/'+U+'.json').then(function(r){return r.json()}).then(function(d){return{D:d,A:{membres:x.j.membres},gens:x.j.personnes}})})}
charger().then(function(o){D=o.D;A=o.A;GENS=o.gens;if(REEL)document.body.classList.add('reel');
 /* l'écran de salle est un invité de l'espace : il ne voit que le public */
 if(SALLE){A=JSON.parse(JSON.stringify(A));A.membres[ECRAN]='guest'}
 B=L.base(D);var E=D.evenement||{};$('evNom').textContent=REEL?REEL.titre:(E.nom||'');$('evDate').textContent=E.date?new Date(E.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
 document.title='AIME Live · '+(REEL?REEL.titre:(E.nom||''));
 var gens=GENS;
 qui=SALLE?ECRAN:REEL?REEL.moi.id:(gens.some(function(p){return p.id===Q.get('qui')})?Q.get('qui'):((gens.filter(function(p){return A.membres[p.id]==='editor'})[0]||gens[0]||{}).id));
 $('qui').innerHTML=gens.map(function(p){return'<option value="'+esc(p.id)+'"'+(p.id===qui?' selected':'')+'>'+esc(p.nom)+' · '+esc(p.fonction||'')+'</option>'}).join('');
 $('qui').onchange=function(){qui=this.value;var u=new URL(location.href);u.searchParams.set('qui',qui);history.replaceState(null,'',u);canal.presence(qui,'moi');canal.identite(qui);afficher()};
 $('salle').href=REEL?'/live/?espace='+ESP+'&mode=salle':'/live/?u='+U+'&mode=salle';
 if(REEL){$('espace').hidden=true;$('qui').closest('label').hidden=true;$('autre').hidden=true;$('quiDemo').hidden=true;var moiP=gens.filter(function(p){return p.id===qui})[0];
  $('quiNom').textContent=SALLE?'Écran de salle':(moiP?moiP.nom:'');membresTimbres()}
 $('autre').onclick=function(){var autre=gens.filter(function(p){return p.id!==qui&&A.membres[p.id]!==A.membres[qui]})[0]||gens[0];window.open('/live/?u='+U+'&qui='+encodeURIComponent(autre.id),'_blank','noopener')};
 /* horloge : de 30 min avant le premier moment à la fin du dernier */
 var fin=Math.max.apply(null,B.moments.map(function(m){return m.fin})),deb=B.debutJour-30;$('hCurseur').min=deb;$('hCurseur').max=fin;
 canal=C.ouvrir(ESP||U,{journal:function(){rejouer();afficher()},presence:presence,horloge:function(){afficher()},mode:function(m){var e=$('mode');e.textContent=m==='appareils'?'Entre appareils':REEL?'Hors ligne':'Dans ce navigateur';e.className='mode '+m;e.title=m==='appareils'?'Chaque geste est revérifié par le serveur puis reçu par tous les appareils.':'Le direct entre appareils n\'est pas ouvert ici : les onglets de ce navigateur se synchronisent entre eux.';$('recommencer').hidden=m==='appareils';rejouer();afficher(true)}});
 if(!canal.horloge())canal.regler({base:B.moments.filter(function(m){return m.public})[0].debut+20,depuis:Date.now(),vitesse:0});
 canal.presence(qui,SALLE?'salle':'moi');canal.identite(qui);rejouer();afficher();setInterval(afficher,1000);
}).catch(function(e){var m=$('mtn');m.textContent='';if(e&&e.connexion){m.appendChild(document.createTextNode('Connectez-vous pour rejoindre ce direct. '));var a=document.createElement('a');a.href='/compte/';a.textContent='Se connecter';m.appendChild(a)}else m.textContent=(e&&e.message)||'Impossible de charger cet espace.'});
/* les membres d'un espace réel, en timbres */
function membresTimbres(){var T=window.AIMETimbre,box=$('membres');if(!T||!box||!REEL)return;box.textContent='';var pl=document.createElement('div');pl.className='planche';
 GENS.forEach(function(p){pl.appendChild(T.creer({id:p.id,nom:p.nom+(p.id===REEL.moi.id?' (vous)':''),role:A.membres[p.id],image:p.image}))});var k=document.createElement('p');k.className='k';k.textContent='Les membres de l\'espace';box.appendChild(k);box.appendChild(pl)}

function maintenantMin(){var h=canal.horloge();if(!h)return B.debutJour;var t=h.base+(h.vitesse?(Date.now()-h.depuis)/60000*h.vitesse:0),max=+$('hCurseur').max;if(t>max){canal.regler({base:max,depuis:Date.now(),vitesse:0});t=max}return t}
function rejouer(){var r=L.rejouer(B,A,canal.journal(),P);etat=r.etat;trace=r.trace}
$('hCurseur').oninput=function(){var h=canal.horloge()||{};canal.regler({base:+this.value,depuis:Date.now(),vitesse:h.vitesse||0})};
document.querySelector('.horloge .seg').onclick=function(e){var b=e.target.closest('[data-v]');if(!b)return;canal.regler({base:maintenantMin(),depuis:Date.now(),vitesse:+b.dataset.v})};

function agir(action,p){var a={qui:qui,action:action,p:p,t:Math.round(maintenantMin())},av=trace.length;canal.envoyer(a).then(function(rep){rejouer();afficher(true);
 if(rep&&rep.serveur){if(rep.ok)toast(rep.touches&&rep.touches.length>1?rep.touches.length+' moments décalés : tous les appareils le voient.':'Fait : tous les appareils le voient.');else toast('Refusé : '+rep.raison,true);return}
 if(rep&&rep.ok===false)return toast(rep.raison,true);
 var r=trace[trace.length-1];if(trace.length>av&&r){if(r.ok)toast(action==='retarder'&&r.touches.length>1?r.touches.length+' moments décalés : tout l\'espace le voit.':'Fait : tout l\'espace le voit.');else toast('Refusé : '+r.raison,true)}})}

var dernier='';
function afficher(force){if(!etat)return;var now=maintenantMin(),v=L.vue(etat,A,qui,Math.round(now)%1440,P),h=canal.horloge()||{};
 $('hHeure').textContent=v.heure;if(document.activeElement!==$('hCurseur'))$('hCurseur').value=Math.round(now/5)*5;
 [].forEach.call(document.querySelectorAll('.horloge [data-v]'),function(b){b.setAttribute('aria-pressed',String(+b.dataset.v===(h.vitesse||0)))});
 $('quiRole').innerHTML=SALLE?'':(window.AIMERoles&&v.qui.role?AIMERoles.pastille(v.qui.role):'')+esc('Rôle dans l\'espace : '+(ROLES[v.qui.role]||'aucun'));
 var cle=JSON.stringify([v.heure,v.moments,v.annonces,trace.length,qui]);if(cle===dernier&&!force)return;dernier=cle;
 /* maintenant */
 $('mtn').innerHTML=v.maintenant.length?v.maintenant.map(function(m){var a=L.hm(m.debut),b=L.hm(m.fin),n=L.surAxe(L.hm(v.heure),etat.debutJour),aa=L.surAxe(a,etat.debutJour),bb=L.surAxe(b,etat.debutJour);if(bb<aa)bb+=1440;var pc=Math.max(0,Math.min(100,(n-aa)/(bb-aa)*100));
  return'<article class="carte-m en-cours"><h3>'+esc(m.titre)+'</h3><p class="lieu">'+esc(m.espace)+(m.planBActif?' <span class="puce b">plan B</span>':'')+'</p><p class="hr">'+esc(m.debut)+' – '+esc(m.fin)+(m.decalage?' <span class="puce d">'+esc(L.ecart(m.decalage))+'</span>':'')+'</p><div class="barre" role="progressbar" aria-label="Avancement" aria-valuenow="'+Math.round(pc)+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+pc.toFixed(1)+'%"></i></div>'+(m.equipe?'<p class="eq">'+esc(m.equipe)+'</p>':'')+'</article>'}).join(''):'<p class="vide">'+(v.ensuite?'Entre deux moments.':'La journée est terminée. Merci.')+'</p>';
 /* ensuite */
 var e=v.ensuite;$('ens').innerHTML=e?'<article class="carte-m"><h3>'+esc(e.titre)+'</h3><p class="lieu">'+esc(e.espace)+(e.planBActif?' <span class="puce b">plan B</span>':'')+'</p><p class="hr">'+esc(e.debut)+(e.decalage?' <span class="puce d">'+esc(L.ecart(e.decalage))+'</span>':'')+' · <b>'+dans(e.dans)+'</b></p></article>':'<p class="vide">Plus rien après.</p>';
 /* annonces */
 $('annoncer').hidden=!v.annoncer||SALLE;
 $('flux').innerHTML=v.annonces.length?v.annonces.slice(0,SALLE?3:20).map(function(n){return'<li><span class="hr">'+esc(L.fmt(n.t))+'</span><span>'+esc(n.texte)+'</span>'+(n.audience==='equipe'?'<span class="puce e">équipe</span>':'')+'</li>'}).join(''):'<li class="vide">Aucune annonce.</li>';
 /* la journée : les gestes possibles n'apparaissent que là où la règle les permet */
 var peut=v.moments.some(function(m){return m.modifiable});$('cascadeL').hidden=!peut||SALLE;
 $('moments').innerHTML=v.moments.map(function(m){var act=m.modifiable&&!SALLE&&m.statut!=='fait'&&m.statut!=='passe';
  return'<li class="m '+m.statut+'"><span class="hr">'+esc(m.debut)+(m.decalage?'<s>'+esc(m.prevu)+'</s>':'')+'</span><div><b>'+esc(m.titre)+'</b>'+(m.public?'':'<span class="puce e">équipe</span>')+'<span class="puce s">'+({fait:'fait','passe':'passé','en-cours':'en cours','a-venir':'à venir'})[m.statut]+'</span>'+(m.decalage?'<span class="puce d">'+esc(L.ecart(m.decalage))+'</span>':'')+'<br><span class="lieu">'+esc(m.espace)+(m.planBActif?' · plan B':'')+'</span>'+
   (act?'<div class="gestes" data-m="'+esc(m.id)+'"><button type="button" data-g="-5">−5 min</button><button type="button" data-g="5">+5 min</button><button type="button" data-g="15">+15 min</button>'+(m.statut==='en-cours'?'<button type="button" data-g="fait">C\'est fait</button>':'')+(m.planB?'<button type="button" data-g="planB" aria-pressed="'+m.planBActif+'">Plan B : '+esc(m.planB)+'</button>':'')+'</div>':'')+'</div></li>'}).join('');
 /* le journal : l'équipe voit tout ; les autres, seulement leurs propres gestes */
 var mien=trace.filter(function(t){return v.equipe||(t.a&&t.a.qui===qui)});$('journalS').hidden=SALLE||!mien.length&&!v.equipe;
 var noms={};GENS.forEach(function(p){noms[p.id]=p.nom});
 $('jnl').innerHTML=mien.slice(-30).reverse().map(function(t){var a=t.a||{},p=a.p||{},mm=p.moment?(etat.moments.filter(function(x){return x.id===p.moment})[0]||{}).titre:'';
  var quoi=a.action==='retarder'?'décale « '+mm+' » de '+L.ecart(p.minutes)+(p.cascade?' et la suite':''):a.action==='fait'?'marque « '+mm+' » fait':a.action==='planB'?(p.actif?'active':'retire')+' le plan B de « '+mm+' »':a.action==='annoncer'?'annonce'+(p.audience==='equipe'?' à l\'équipe':''):'action inconnue';
  return'<li class="'+(t.ok?'ok':'ko')+'"><span class="hr">'+esc(L.fmt(a.t||0))+'</span><span><b>'+esc(noms[a.qui]||a.qui)+'</b> '+esc(quoi)+'<br><span class="regle">'+(t.ok?'✓ '+esc(t.regle):'✕ refusé : '+esc(t.raison))+'</span></span></li>'}).join('')}
function dans(n){n=Math.round(n);if(n<=0)return'maintenant';if(n<60)return'dans '+n+' min';var h=Math.floor(n/60),m=n%60;return'dans '+h+' h'+(m?' '+(m<10?'0':'')+m:'')}

$('moments').onclick=function(e){var b=e.target.closest('[data-g]');if(!b)return;var m=b.closest('[data-m]').dataset.m,g=b.dataset.g;
 if(g==='fait')agir('fait',{moment:m});else if(g==='planB')agir('planB',{moment:m,actif:b.getAttribute('aria-pressed')!=='true'});else agir('retarder',{moment:m,minutes:+g,cascade:$('cascade').checked})};
$('annoncer').onsubmit=function(e){e.preventDefault();var t=$('annTexte').value.trim();if(!t)return;agir('annoncer',{texte:t,audience:$('annAud').value});$('annTexte').value=''};
var arme=false;$('recommencer').onclick=function(){if(!arme){arme=true;this.textContent='Confirmer : tout effacer';var b=this;setTimeout(function(){arme=false;b.textContent='Recommencer la démonstration'},4000);return}arme=false;this.textContent='Recommencer la démonstration';canal.recommencer();toast('Démonstration remise à zéro dans ce navigateur.')};

function presence(liste){if(!D)return;var noms={};GENS.forEach(function(p){noms[p.id]=p.nom});noms[ECRAN]='Écran de salle';
 var n=liste.length;$('presents').textContent=n>1?n+' écrans en direct':'';
 $('presentsListe').innerHTML=n>1?'<p class="k">En direct dans ce navigateur</p>'+liste.map(function(x){return'<span class="pres"><i></i>'+esc(noms[x.qui]||x.qui||'…')+(x.moi?' (cet onglet)':'')+'</span>'}).join(''):REEL?'':'<p class="leg">Ouvrez une autre personne ou l\'écran de salle : chaque geste apparaît aussitôt partout.</p>'}
})();
