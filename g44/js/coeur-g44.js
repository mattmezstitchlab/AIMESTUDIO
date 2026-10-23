/* AIME G44 LAB · branché sur le cœur (coeur/coeur.js) : quatre identités, quatre écrans, un seul dossier fictif.
   Rien n'est recopié : chaque écran lit le même dossier (G44Dossier) et la même simulation (G44Moteur) ;
   ce qu'il montre vient de la perspective (G44Acces.PERSPECTIVES, présentation seulement) et ce que la personne
   peut faire vient des règles (G44Acces.autoriser). Prototype : en production, ces contrôles seraient côté serveur. */
(function(root){'use strict';
var D=root.G44Dossier,M=root.G44Moteur,A=root.G44Acces,F=root.G44Formation;
if(!root.AIMECoeur||!D||!M||!A)return;
var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var fr=function(d){var p=String(d||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:(d||'—')};
var BASE=null,ETATS={autorise:'Autorisé',refuse:'Refusé',nonverifie:'Non vérifié'};
var SECTIONS={identites:'identités',chronologie:'chronologie',plan:'plan',journal:'journal',formation:'formation'};
function annee(perso){var a=parseInt(perso&&perso.annee,10);return a>=2012&&a<=2020?a:2016}
function simulation(perso){return M.simuler(BASE,{objet:'ev-mariage',valeur:annee(perso)+'-06-18'})}
/* la typographie de la marque, partagée par le cœur : titres en Cal Sans, texte en Inter */
var CSS=root.AIMECoeur.FONTES+
 '*{box-sizing:border-box}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}body{margin:0;background:#F4F4F2;color:#141416;font:400 15px/1.5 "Inter Variable",Inter,system-ui,sans-serif}'+
 '.h{min-height:420px;display:grid;align-content:end;padding:28px 24px 30px}.h .k{margin:0 0 10px;font:600 10px/1 "Inter Variable",sans-serif;letter-spacing:.2em;text-transform:uppercase}'+
 '.h h1{margin:0;font:400 46px/1 '+root.AIMECoeur.TITRE+';letter-spacing:-.02em}.h p{margin:12px 0 0;font-size:15px}'+
 '.s{padding:26px 24px;border-top:1px solid #DCDCE1}.s h2{margin:0 0 14px;font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#55555E}'+
 '.l{list-style:none;margin:0;padding:0;display:grid;gap:10px}.l li{display:grid;gap:2px}.l b{font-weight:600}.l span{color:#55555E;font-size:13.5px}'+
 '.g li{grid-template-columns:auto 1fr;column-gap:10px;align-items:baseline}.e{font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:5px 7px;border-radius:6px;border:1px solid #141416}'+
 '.e.refuse{border-color:#C9C9CF;color:#55555E}.e.nonverifie{border-style:dashed}.m{color:#55555E;font-size:13px}.c{color:#141416;font-weight:600}';
function section(t,h){return'<section class="s"><h2>'+esc(t)+'</h2>'+h+'</section>'}
function page(role,perso,k){var qui=role.angle,I=A.IDENTITES[qui],P=A.PERSPECTIVES[qui],S=P.sections,r=simulation(perso),e=r.etat,m=I.missions[0];
 var h='<header class="h" style="background:'+k.c+';color:'+k.e+'"><p class="k">G44 LAB · '+esc(BASE.id)+' (fictif)</p><h1>'+esc(P.nom)+'</h1><p>'+esc(m.objet)+' · jusqu\'au '+esc(fr(m.jusqu))+'</p><p class="m" style="color:'+k.e+'">'+esc(I.carte)+'</p></header>';
 /* qui est dans le dossier : le nom n'apparaît que si la règle l'autorise ET que la perspective l'affiche */
 h+=section('Le dossier','<ul class="l">'+['p-a','p-b','p-e'].map(function(id){var o=BASE.objets[id],n=A.afficherNom(qui,qui,o.nom,o.role);return'<li><b>'+esc(n)+'</b><span>'+(n===o.role?'Identité non affichée pour cette mission':esc(o.role))+'</span></li>'}).join('')+'</ul>');
 if(S.chronologie==='visible')h+=section('La chronologie','<ul class="l"><li><b>Mariage enregistré</b><span>'+fr(BASE.objets['ev-mariage'].dates.evenement)+' · envisagé : <span class="c">'+fr(e.objets['ev-mariage'].dates.evenement)+'</span></span></li><li><b>Naissance</b><span>'+fr(e.objets['ev-naissance'].dates.evenement)+' (inchangée)</span></li><li><b>Période ouverte</b><span>'+fr(e.objets['per-foyer'].debut)+'</span></li></ul>');
 if(S.plan==='visible')h+=section('Le plan proposé ('+r.plan.length+' étapes, aucune exécutée)','<ul class="l">'+r.plan.map(function(p){var mien=p.habilitation&&I.habilitations[p.habilitation]==='accordee';return'<li><b>'+p.n+'. '+esc(p.texte)+'</b><span>'+esc(p.qui)+(p.habilitation?' · '+esc(p.habilitation)+(mien?' · vous':''):'')+'</span></li>'}).join('')+'</ul>');
 if(r.incoherences.length&&S.plan==='visible')h+=section('À vérifier','<ul class="l">'+r.incoherences.map(function(i){return'<li><b>'+esc(i.regle)+'</b><span>'+esc(i.texte)+'</span></li>'}).join('')+'</ul>');
 if(S.journal==='visible')h+=section('Le journal de la simulation','<ul class="l">'+r.journal.map(function(j){return'<li><span>'+esc(j)+'</span></li>'}).join('')+'</ul>');
 if(S.formation==='visible'&&F)h+=section('La séance de formation','<ul class="l">'+F.ORDRE.map(function(id,i){return'<li><b>'+(i+1)+'. '+esc(F.ETAPES[id].t)+'</b></li>'}).join('')+'</ul><p class="m">Copie anonymisée : aucune identité n\'est montrée.</p>');
 h+=section('Vos gestes','<ul class="l g">'+Object.keys(A.ACTIONS).map(function(a){var d=A.autoriser(qui,a);return'<li><span class="e '+d.etat+'">'+ETATS[d.etat]+'</span><span><b>'+esc(A.ACTIONS[a].nom)+'</b><br>'+esc(d.raison)+'</span></li>'}).join('')+'</ul>');
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(P.nom)+'</title><style>'+CSS+'</style></head><body>'+h+'</body></html>'}
function droits(roles,perso){var r=simulation(perso),ligne=function(titre,f){return{titre:titre,valeurs:roles.map(function(x){return f(x.angle)})}};
 var L=[ligne('Identités du dossier',function(q){var o=BASE.objets['p-a'];return A.afficherNom(q,q,o.nom,o.role)===o.nom?'<b>Nominatives</b>':'<b>Masquées</b><small>rôles seulement</small>'}),
  ligne('Ce que la page montre',function(q){var S=A.PERSPECTIVES[q].sections;return Object.keys(S).filter(function(k){return S[k]==='visible'}).length+' sections<small>'+Object.keys(S).filter(function(k){return S[k]==='visible'}).map(function(k){return SECTIONS[k]||k}).join(', ')+'</small>'}),
  ligne('Plan de correction',function(q){var I=A.IDENTITES[q];return A.PERSPECTIVES[q].sections.plan==='visible'?'<b>'+r.plan.length+'</b> étapes'+'<small>dont '+r.plan.filter(function(p){return p.habilitation&&I.habilitations[p.habilitation]==='accordee'}).length+' à sa main</small>':'—'})];
 Object.keys(A.ACTIONS).forEach(function(a){L.push(ligne(A.ACTIONS[a].nom,function(q){var d=A.autoriser(q,a);return'<b>'+ETATS[d.etat]+'</b>'}))});
 return L}
root.AIMECoeur.adaptateurs.g44={
 charger:function(){BASE=M.etatInitial();return Promise.resolve()},
 page:page,droits:droits,
 etiquette:function(r){var I=A.IDENTITES[r.angle],h=Object.keys(I.habilitations).filter(function(k){return I.habilitations[k]==='accordee'});return h.length?'Habilitation '+h.join(', '):'Sans habilitation'}};
})(typeof self!=='undefined'?self:this);
