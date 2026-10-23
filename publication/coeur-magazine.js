/* AIME Magazine · branché sur le cœur (coeur/coeur.js) : un numéro, quatre personnes, quatre écrans.
   L'autrice, la rédactrice en chef, le maquettiste et la lectrice lisent le MÊME numéro (magazine/n001.aime-site.json).
   La lectrice voit la vraie page publiée, composée par le moteur de pages (AIMESite.document) ; les trois autres
   voient leur poste de travail sur ce même fichier. Ce que chacun peut faire vient d'une règle explicite par geste,
   écrite ici pour le prototype ; en production, ces contrôles seraient vérifiés côté serveur. */
(function(root){'use strict';
var S=root.AIMESite;if(!root.AIMECoeur||!S)return;
var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var X={};
var GESTES={
 'lire':{nom:'Lire le numéro publié',qui:{autrice:1,chef:1,maquettiste:1,lectrice:1},raison:'Le numéro n° 001 est public, sans compte.'},
 'ecrire':{nom:'Écrire et corriger son article',qui:{autrice:1},raison:'L\'autrice écrit son texte ; personne ne le réécrit à sa place.'},
 'mettre-en-page':{nom:'Mettre en page (gabarits, planche 12 × 16)',qui:{maquettiste:1},raison:'Le maquettiste place les sections sans toucher au texte.'},
 'valider':{nom:'Valider le chemin de fer',qui:{chef:1},raison:'La rédactrice en chef décide de l\'ordre et du contenu du numéro.'},
 'publier':{nom:'Publier et dater le numéro',qui:{chef:1},raison:'Une édition datée : seule la rédaction en chef la publie.'}};
function peut(q,g){return!!GESTES[g].qui[q]}
function j(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
function site(perso){var s=JSON.parse(JSON.stringify(X.site));if(perso&&perso.titre){var h=s.pages.filter(function(p){return p.id==='edito'})[0].sections.filter(function(x){return x.type==='hero'})[0];if(h)h.titre=perso.titre}return s}
function sections(s,id){return s.pages.filter(function(p){return p.id===id})[0].sections}
var CSS='@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("/fonts/InterVariable-latin.woff2") format("woff2-variations")}'+
 '*{box-sizing:border-box}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}body{margin:0;background:#F4F4F2;color:#141416;font:400 15px/1.5 "Inter Variable",Inter,system-ui,sans-serif}'+
 '.h{min-height:420px;display:grid;align-content:end;padding:28px 24px 30px}.h .k{margin:0 0 10px;font:600 10px/1 "Inter Variable",sans-serif;letter-spacing:.2em;text-transform:uppercase}'+
 '.h h1{margin:0;font:600 40px/1.02 "Inter Variable",sans-serif;letter-spacing:-.03em}.h p{margin:12px 0 0;font-size:15px}'+
 '.s{padding:24px;border-top:1px solid #DCDCE1}.s h2{margin:0 0 14px;font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#55555E}'+
 '.l{list-style:none;margin:0;padding:0;display:grid;gap:10px}.l li{display:grid;gap:2px}.l b{font-weight:600}.l span{color:#55555E;font-size:13.5px}.t{white-space:pre-line;font-size:14.5px;line-height:1.6}'+
 '.g li{grid-template-columns:auto 1fr;column-gap:10px;align-items:baseline}.e{font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:5px 7px;border-radius:6px;border:1px solid #141416}.e.non{border-color:#C9C9CF;color:#55555E}';
function section(t,h){return'<section class="s"><h2>'+esc(t)+'</h2>'+h+'</section>'}
function poste(q,s,k,titre,sous,corps){var h='<header class="h" style="background:'+k.c+';color:'+k.e+'"><p class="k">AIME Magazine · N° 001</p><h1>'+esc(titre)+'</h1><p>'+esc(sous)+'</p></header>'+corps;
 h+=section('Mes gestes','<ul class="l g">'+Object.keys(GESTES).map(function(g){var o=peut(q,g);return'<li><span class="e'+(o?'':' non')+'">'+(o?'Autorisé':'Refusé')+'</span><span><b>'+esc(GESTES[g].nom)+'</b><br>'+esc(GESTES[g].raison)+'</span></li>'}).join('')+'</ul>');
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(titre)+'</title><style>'+CSS+'</style></head><body>'+h+'</body></html>'}
function page(role,perso,k){var q=role.angle,s=site(perso),ed=sections(s,'edito'),hero=ed.filter(function(x){return x.type==='hero'})[0]||{};
 if(q==='lectrice'){var d=S.document(s,{page:'edito',presentation:X.pres});
  /* la vraie page publiée ; seul son en-tête prend la couleur de la lectrice */
  return String(d.html).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace('</head>','<style>html{scrollbar-width:none}html::-webkit-scrollbar{display:none}.hero,.v-hero{min-height:420px!important;background:'+k.c+'!important}.hero *,.v-hero *{color:'+k.e+'!important;text-shadow:none!important}.hero img,.v-hero img,.hero .vis-b,.hero-v{display:none!important}</style></head>')}
 if(q==='autrice')return poste(q,s,k,hero.titre||'Édito','Mon article · '+(X.site.infos.date||''),
  section('Mon texte',ed.filter(function(x){return x.type==='texte'}).map(function(x){return'<p class="t">'+esc(String(x.texte||'').slice(0,520))+'…</p>'}).join(''))+
  section('Où il paraît','<ul class="l"><li><b>Édito</b><span>Page 2 du numéro, après la couverture</span></li><li><b>Statut</b><span>Publié, numéro daté du '+esc(X.site.infos.date)+'</span></li></ul>'));
 if(q==='chef')return poste(q,s,k,'Le chemin de fer','Le numéro entier, page par page',
  section('Les pages ('+s.pages.length+')','<ul class="l">'+s.pages.map(function(p,i){var h=p.sections.filter(function(x){return x.type==='hero'})[0];return'<li><b>'+(i+1)+'. '+esc(p.titre)+'</b><span>'+esc(h&&h.titre||'')+' · '+p.sections.length+' sections</span></li>'}).join('')+'</ul>')+
  section('L\'édition','<ul class="l"><li><b>N° 001</b><span>Daté du '+esc(X.site.infos.date)+' · public, sans compte</span></li></ul>'));
 return poste(q,s,k,'La mise en page','Gabarits sur la grille 12 × 16',
  section('Les gabarits ('+X.gab.length+')','<ul class="l">'+X.gab.map(function(g){return'<li><b>'+esc(g.nom)+'</b><span>'+(g.emplacements||[]).length+' emplacements · '+esc(g.famille||'')+'</span></li>'}).join('')+'</ul>')+
  section('L\'édito, section par section','<ul class="l">'+ed.map(function(x){return'<li><b>'+esc(x.type)+'</b><span>'+esc(x.titre||'(sans titre)')+'</span></li>'}).join('')+'</ul>'))}
function droits(roles){var L=[{titre:'Ce qu\'il ou elle voit',valeurs:roles.map(function(r){return{autrice:'<b>Son article</b><small>et où il paraît</small>',chef:'<b>Le numéro entier</b><small>chemin de fer</small>',maquettiste:'<b>Les gabarits</b><small>et les sections</small>',lectrice:'<b>La page publiée</b>'}[r.angle]||'—'})}];
 Object.keys(GESTES).forEach(function(g){L.push({titre:GESTES[g].nom,valeurs:roles.map(function(r){return'<b>'+(peut(r.angle,g)?'Autorisé':'Refusé')+'</b>'})})});return L}
root.AIMECoeur.adaptateurs.magazine={
 charger:function(){return Promise.all([j('/magazine/n001.aime-site.json'),j('/vitrine/presentation/studio.json')]).then(function(r){X.site=r[0];X.pres=r[1];X.gab=(root.AIMEPublication&&root.AIMEPublication.GABARITS)||[]})},
 page:page,droits:droits,
 etiquette:function(r){return{autrice:'Rédaction',chef:'Rédaction en chef',maquettiste:'Mise en page',lectrice:'Sans compte'}[r.angle]||''}};
})(typeof self!=='undefined'?self:this);
