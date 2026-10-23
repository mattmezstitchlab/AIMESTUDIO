/* AIME · le cœur, version « règles écrites » (moteur 'regles').
   Pour les produits qui n'ont pas encore de moteur de partage (la Régie, le Studio), le scénario décrit lui-même,
   en données, les six dimensions de chaque rôle (docs/ROLES.md) : qui, relation (famille), portée, gestes, durée, preuve.
   Un seul projet fictif (sc.regles.blocs) ; chaque écran est composé depuis ces blocs, selon la portée du rôle :
   - un bloc absent de la portée n'est pas « caché » : il n'est pas dans l'écran, et rien ne dit qu'il existe ;
   - une portée « le sien » montre la variante du bloc écrite pour ce rôle (son devis, ses pointages) ;
   - un geste est autorisé, proposé seulement (un agent IA, un délégué) ou refusé ; toujours avec sa raison.
   Démonstration : tout se calcule dans le navigateur ; en production, ces règles seraient vérifiées au serveur. */
(function(root){'use strict';
var C=root.AIMECoeur;if(!C)return;
var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var RG=null,SC=null;
var ETATS={oui:'Autorisé',propose:'Propose',non:'Refusé'};
/* les valeurs que la personne règle (sc.source.champs) et celles qui s'en déduisent (regles.calculs) */
function nombre(v,f){if(f==='euros')return v.toLocaleString('fr-FR',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})+' €';return v.toLocaleString('fr-FR')}
function valeurs(perso){var o={};((SC.source&&SC.source.champs)||[]).forEach(function(c){var v=parseFloat(String(perso&&perso[c.id]!=null&&perso[c.id]!==''?perso[c.id]:c.defaut).replace(',','.'));if(!(v>=c.min&&v<=c.max))v=c.defaut;o[c.id]=nombre(v,c.format);o['_'+c.id]=v});
 Object.keys(RG.calculs||{}).forEach(function(k){var x=RG.calculs[k];o[k]=nombre(Math.round(o['_'+x.de]*x.fois*100)/100,x.format)});return o}
function remplir(t,V){return esc(t).replace(/\{(\w+)\}/g,function(m,k){return V[k]!=null?esc(V[k]):m})}
/* la portée d'un rôle sur un bloc : 'tout', 'sien' (une variante écrite pour lui) ou rien */
function portee(bloc,q){return(bloc.voient||{})[q]||null}
function vue(bloc,q){var p=portee(bloc,q);if(!p)return null;return p==='sien'&&bloc.sien&&bloc.sien[q]?bloc.sien[q]:bloc}
function geste(g,q){return(g.qui||{})[q]||'non'}
function raison(g,q){var r=g.raisons||{};return r[q]||r[geste(g,q)]||''}
var CSS=C.FONTES+
 '*{box-sizing:border-box}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}body{margin:0;background:#F4F4F2;color:#141416;font:400 15px/1.5 "Inter Variable",Inter,system-ui,sans-serif}'+
 '.h{min-height:420px;display:grid;align-content:end;padding:28px 24px 30px}.h .k{margin:0 0 10px;font:600 10px/1 "Inter Variable",sans-serif;letter-spacing:.2em;text-transform:uppercase}'+
 '.h h1{margin:0;font:400 40px/1.02 '+C.TITRE+';letter-spacing:-.02em}.h p{margin:12px 0 0;font-size:15px}'+
 '.s{padding:24px;border-top:1px solid #DCDCE1}.s h2{margin:0 0 14px;font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#55555E}'+
 '.l{list-style:none;margin:0;padding:0;display:grid;gap:10px}.l li{display:grid;gap:2px}.l b{font-weight:600}.l span{color:#55555E;font-size:13.5px}'+
 '.g li{grid-template-columns:auto 1fr;column-gap:10px;align-items:baseline}.e{font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:5px 7px;border-radius:6px;border:1px solid #141416}'+
 '.e.non{border-color:#C9C9CF;color:#55555E}.e.propose{border-style:dashed}.m{color:#55555E;font-size:13px;margin:10px 0 0}'+
 '.d{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0}.d dt{font:600 11px/1.6 "Inter Variable",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#55555E}.d dd{margin:0;font-size:14px}';
function section(t,h){return'<section class="s"><h2>'+esc(t)+'</h2>'+h+'</section>'}
function liste(lignes,V){return'<ul class="l">'+lignes.map(function(l){return'<li><b>'+remplir(l[0],V)+'</b>'+(l[1]?'<span>'+remplir(l[1],V)+'</span>':'')+'</li>'}).join('')+'</ul>'}
function page(role,perso,k){var q=role.angle,V=valeurs(perso),E=(RG.ecrans||{})[q]||{};
 var h='<header class="h" style="background:'+k.c+';color:'+k.e+'"><p class="k">'+esc(RG.entete)+'</p><h1>'+remplir(E.titre||role.nom,V)+'</h1>'+(E.texte?'<p>'+remplir(E.texte,V)+'</p>':'')+'</header>';
 /* les blocs de sa portée, et eux seuls : aucun compte de ce qui n'est pas là */
 RG.blocs.forEach(function(b){var v=vue(b,q);if(v)h+=section(remplir(v.titre||b.titre,V),liste(v.lignes||[],V)+(v.note?'<p class="m">'+remplir(v.note,V)+'</p>':''))});
 h+=section('Ce que je peux faire','<ul class="l g">'+RG.gestes.map(function(g){var e=geste(g,q);return'<li><span class="e '+e+'">'+ETATS[e]+'</span><span><b>'+esc(g.nom)+'</b>'+(raison(g,q)?'<br>'+esc(raison(g,q)):'')+'</span></li>'}).join('')+'</ul>');
 /* la grammaire du rôle, lisible par la personne elle-même */
 h+=section('Mon rôle','<dl class="d"><dt>Famille</dt><dd>'+esc(role.famille||'—')+'</dd><dt>Portée</dt><dd>'+esc(role.portee||'—')+'</dd><dt>Durée</dt><dd>'+esc(role.duree||'—')+'</dd><dt>Preuve</dt><dd>'+esc(role.preuve||'—')+'</dd></dl>'+(RG.note?'<p class="m">'+esc(RG.note)+'</p>':''));
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(role.nom)+'</title><style>'+CSS+'</style></head><body>'+h+'</body></html>'}
function droits(roles,perso){var V=valeurs(perso),ligne=function(t,f){return{titre:t,valeurs:roles.map(function(r){return f(r)})}};
 var L=[ligne('Famille',function(r){return'<b>'+esc(r.famille||'—')+'</b>'}),ligne('Durée',function(r){return esc(r.duree||'—')})];
 RG.blocs.forEach(function(b){L.push(ligne(b.titre.replace(/\{\w+\}/g,'').trim(),function(r){var p=portee(b,r.angle);if(!p)return'—';var v=vue(b,r.angle);return p==='sien'?'<b>Sa part</b><small>'+remplir(v.titre||'',V)+'</small>':'<b>'+(b.tout||'Tout')+'</b>'}))});
 RG.gestes.forEach(function(g){L.push(ligne(g.nom,function(r){var e=geste(g,r.angle);return'<b>'+ETATS[e]+'</b>'}))});return L}
C.adaptateurs.regles={
 charger:function(sc){SC=sc;RG=sc.regles;return RG&&RG.blocs&&RG.gestes?Promise.resolve():Promise.reject(new Error('regles'))},
 page:page,droits:droits,
 etiquette:function(r){return r.famille||''}};
})(typeof self!=='undefined'?self:this);
