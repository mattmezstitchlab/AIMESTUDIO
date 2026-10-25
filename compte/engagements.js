/* AIME · les engagements (V1, PR P6) : « qui doit quoi à qui, et pour quand ».
   Deux places, pas de nouveau lieu dans le Dock (décision de Matt, 24/10) :
     - dans un projet, la page « Mon accès » (bloc « engagements ») : la liste que le serveur me laisse lire, ses gestes, et le formulaire ;
     - dans AI, « Mes engagements » : mes engagements ouverts, dans tous mes projets.
   Le navigateur ne décide d'aucun droit : il affiche ce que /api/engagements renvoie (les gestes accordés par permissions.js, par
   engagement) et chaque geste repart au serveur, qui revérifie tout. Les textes venus de la base passent par textContent.
   AIMEEngagements.monter(z, { espace, dire })    → { arreter() }   (dans un projet)
   AIMEEngagements.miens(z, { ouvrir })           → remplit la section AI (ouvrir(espace) : ouvrir le projet) */
(function(){'use strict';
var ETATS={propose:'En attente de réponse',accepte:'En cours',refuse:'Refusé',tenu:'Tenu',annule:'Annulé'};
var GESTES={accepter:'Accepter',refuser:'Refuser',tenir:'Marquer comme tenu',annuler:'Annuler'};
var FAITS={accepter:'Engagement accepté.',refuser:'Engagement refusé.',tenir:'Engagement tenu : c\'est noté.',annuler:'Engagement annulé.'};
var OUVERTS={propose:1,accepte:1};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function jour(d){if(!d)return'';var x=new Date(d+'T12:00:00');return isNaN(x)?d:x.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
function requete(u,corps){return fetch(u,{method:corps?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:corps?{'Content-Type':'application/json'}:{},body:corps?JSON.stringify(corps):undefined})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{statut:r.status,j:j||{}}})})}
/* la phrase d'un engagement : qui, envers qui, pour quand ; le retard est dit en toutes lettres */
function phrase(e){var de=e.deQui==='vous'?'Vous':e.deQui.charAt(0).toUpperCase()+e.deQui.slice(1);
 return de+' '+(e.deQui==='vous'?'vous engagez':'s\'engage')+' envers '+(e.pourQui==='vous'?'vous':e.pourQui)+' · échéance le '+jour(e.echeance)}
function etiquette(e){var s=el('span','etiq'+(e.enRetard?' ko':e.etat==='propose'?' nouvelle':''),e.enRetard?'En retard':(ETATS[e.etat]||e.etat));return s}

/* ---------- dans un projet ---------- */
function monter(z,o){o=o||{};var espace=o.espace,dire=o.dire||function(){},vivant=true,occupe=false;
 var c=el('section','carte-c pile p-engagements');c.setAttribute('aria-labelledby','pEngT');var h=el('h2','k','Engagements');h.id='pEngT';c.appendChild(h);
 var corps=el('div','pile');c.appendChild(corps);z.appendChild(c);
 function charger(focus){return requete('/api/engagements?espace='+encodeURIComponent(espace)).then(function(r){if(!vivant)return;corps.textContent='';
   if(r.statut===503){corps.appendChild(el('p','leg',r.j.raison||'Les engagements ne sont pas encore installés ici.'));return}
   if(r.statut!==200||!r.j.ok){corps.appendChild(el('p','alerte',r.j.raison||'Les engagements n\'ont pas pu être chargés.'));return}
   afficher(r.j);if(focus){var n=c.querySelector(focus);if(n)n.focus()}}).catch(function(){if(vivant){corps.textContent='';corps.appendChild(el('p','alerte','Serveur injoignable : les engagements n\'ont pas pu être chargés.'))}})}
 function geste(e,g,b){if(occupe)return;occupe=true;b.disabled=true;
  requete('/api/engagements',{action:'geste',espace:espace,ref:e.ref,geste:g}).then(function(r){occupe=false;b.disabled=false;
   if(r.statut===200&&r.j.ok){dire(FAITS[g]);charger('#pEngT')}else{dire(r.j.raison||'Ce geste n\'a pas pu être fait.',true);if(r.statut===409||r.statut===404)charger()}})
  .catch(function(){occupe=false;b.disabled=false;dire('Réseau indisponible : rien n\'a changé.',true)})}
 function ligne(e){var li=el('li','pile p-eng');li.appendChild(el('b',null,e.titre));var l=el('p','leg');l.appendChild(document.createTextNode(phrase(e)+' '));l.appendChild(etiquette(e));li.appendChild(l);
  if(e.gestes.length){var g=el('div','lgn');e.gestes.forEach(function(x){var b=el('button','b '+(x==='accepter'||x==='tenir'?'b-p':'b-s'),GESTES[x]);b.type='button';b.setAttribute('aria-label',GESTES[x]+' : '+e.titre);
   b.onclick=function(){if(x==='annuler'||x==='refuser'){if(!b.dataset.arme){b.dataset.arme='1';b.textContent='Confirmer : '+GESTES[x].toLowerCase();setTimeout(function(){if(b.dataset.arme){delete b.dataset.arme;b.textContent=GESTES[x]}},4500);return}delete b.dataset.arme}geste(e,x,b)};g.appendChild(b)});li.appendChild(g)}
  return li}
 function afficher(j){var L=j.engagements||[],ouverts=L.filter(function(e){return OUVERTS[e.etat]}),clos=L.filter(function(e){return!OUVERTS[e.etat]});
  corps.appendChild(el('p','leg',j.peutDemander?'Qui doit quoi à qui, et pour quand. Vous voyez tous les engagements du projet.':'Qui doit quoi à qui, et pour quand. Vous voyez ceux qui vous concernent.'));
  if(!ouverts.length)corps.appendChild(el('p','leg','Aucun engagement en cours.'));else{var u=el('ul','p-liste pile');ouverts.forEach(function(e){u.appendChild(ligne(e))});corps.appendChild(u)}
  if(clos.length){var d=el('details','pile');d.appendChild(el('summary',null,'Engagements clos ('+clos.length+')'));var u2=el('ul','p-liste pile');clos.forEach(function(e){u2.appendChild(ligne(e))});d.appendChild(u2);corps.appendChild(d)}
  if(j.peutPrendre||j.peutDemander)corps.appendChild(formulaire(j))}
 function formulaire(j){var f=el('form','pile');f.id='pEngagement';f.noValidate=true;f.appendChild(el('h3',null,j.peutDemander?'Prendre ou demander un engagement':'Prendre un engagement'));
  var l1=el('label','pile');l1.htmlFor='pEngTitre';l1.appendChild(el('span',null,'L\'engagement (ce qui sera fait)'));var t=el('input');t.id='pEngTitre';t.maxLength=120;t.setAttribute('aria-required','true');t.placeholder='Envoyer la playlist, confirmer le nombre de couverts…';l1.appendChild(t);f.appendChild(l1);
  var sDe=null;if(j.peutDemander&&j.personnes.length){var l2=el('label','pile');l2.htmlFor='pEngDe';l2.appendChild(el('span',null,'Qui s\'engage'));sDe=el('select');sDe.id='pEngDe';var o0=el('option',null,'Vous');o0.value='';sDe.appendChild(o0);j.personnes.forEach(function(p){var o=el('option',null,p.nom);o.value=p.ref;sDe.appendChild(o)});l2.appendChild(sDe);f.appendChild(l2)}
  var l3=el('label','pile');l3.htmlFor='pEngPour';l3.appendChild(el('span',null,'Envers qui'));var sPour=el('select');sPour.id='pEngPour';var p0=el('option',null,'L\'organisation du projet');p0.value='';sPour.appendChild(p0);j.personnes.forEach(function(p){var o=el('option',null,p.nom);o.value=p.ref;sPour.appendChild(o)});l3.appendChild(sPour);f.appendChild(l3);
  var l4=el('label','pile');l4.htmlFor='pEngDate';l4.appendChild(el('span',null,'Échéance'));var dt=el('input');dt.id='pEngDate';dt.type='date';dt.min=j.aujourdhui||'';dt.setAttribute('aria-required','true');l4.appendChild(dt);f.appendChild(l4);
  var aide=el('p','leg','Vous vous engagez vous-même : l\'engagement est pris tout de suite. Demandé à quelqu\'un d\'autre, il attend sa réponse.');f.appendChild(aide);
  var ok=el('button','b b-p',j.peutDemander?'Enregistrer l\'engagement':'Prendre l\'engagement');ok.type='submit';f.appendChild(ok);
  f.onsubmit=function(ev){ev.preventDefault();if(occupe)return;var titre=t.value.trim();
   if(titre.length<2){dire('Décrivez l\'engagement en quelques mots.',true);t.focus();return}
   if(!dt.value){dire('Choisissez une échéance.',true);dt.focus();return}
   var b={action:'creer',espace:espace,titre:titre,echeance:dt.value};if(sDe&&sDe.value)b.de=sDe.value;if(sPour.value)b.pour=sPour.value;
   occupe=true;ok.disabled=true;requete('/api/engagements',b).then(function(r){occupe=false;ok.disabled=false;
    if(r.statut===200&&r.j.ok){dire(r.j.etat==='propose'?'Engagement demandé : il attend la réponse de la personne.':'Engagement pris.');charger('#pEngTitre')}
    else dire(r.j.raison||'L\'engagement n\'a pas pu être enregistré.',true)}).catch(function(){occupe=false;ok.disabled=false;dire('Réseau indisponible : rien n\'a été enregistré.',true)})};
  return f}
 charger();
 return{arreter:function(){vivant=false},recharger:charger}}

/* ---------- dans AI : mes engagements ouverts, tous projets confondus ---------- */
function miens(z,o){o=o||{};var L=z.querySelector('.ai-eng-liste')||z;
 return requete('/api/engagements').then(function(r){
  if(r.statut!==200||!r.j.ok){z.hidden=true;return}   /* pas installé, pas de session : la section n'existe pas */
  var E=r.j.engagements||[];L.textContent='';z.hidden=!E.length;
  E.forEach(function(e){var b=el('button','dm');b.type='button';var t=el('span','dm-t');t.appendChild(el('b',null,e.titre));t.appendChild(el('span',null,e.projet+' · '+phrase(e)));b.appendChild(t);
   var s=el('span','dm-e');s.appendChild(etiquette(e));if(e.gestes.indexOf('accepter')>=0)s.appendChild(el('span','etiq nouvelle','Réponse attendue'));b.appendChild(s);
   b.onclick=function(){if(o.ouvrir)o.ouvrir(e.espace)};L.appendChild(b)})}).catch(function(){z.hidden=true})}

window.AIMEEngagements={monter:monter,miens:miens};
})();
