/* AIME Vitrine · moteur de rendu universel.
   rendre({ contenu, acces, perspective, modele, presentation, regles }) → { html, css, titre, bilan }

   Cinq couches, jamais mélangées :
     contenu       vitrine/donnees/<univers>.json      les faits de l'événement, écrits une fois
     acces         vitrine/acces/<univers>.json        rôles techniques des membres, droits explicites sur les documents
     perspective   vitrine/perspectives/<univers>.json l'angle : sections, filtres, actions, mots (aucune donnée, aucun droit)
     modele        vitrine/modeles/<id>.json           la composition graphique et ses variantes (aucun contenu)
     presentation  vitrine/presentation/ambiances.json couleurs, polices, visuel
   Les règles d'accès (synchroview/permissions.js) filtrent le contenu et les actions AVANT la mise en page :
   un modèle reçoit une vue déjà filtrée, il ne peut ni montrer ni cacher ce que les règles décident. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEVitrine=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function dateLongue(iso){var d=new Date(iso+'T12:00:00');return isNaN(d)?iso:d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear()}
function heure(h){return String(h||'').replace(':',' h ').replace(/ h 00$/,' h')}

/* ---------- 1 · la politique : contenu + accès + règles → vue filtrée, indépendante de tout modèle ---------- */
function politique(contenu,acces,perspective,regles){
 var sujet={id:perspective.regard,role:(acces.membres||{})[perspective.regard]||null};
 var can=function(action,res,ctx){return regles.can(sujet,action,res,ctx)};
 var canStart=function(action,res){return regles.canStart?regles.canStart(sujet,action,res):regles.can(sujet,action,res)};
 var resMoment=function(m){return{type:'event',id:m.id,public:!!m.public,assigneeId:m.assigneeId||null,authorId:m.authorId||null}};
 var resDoc=function(d){var a=(acces.documents||{})[d.id]||{};return{type:'document',id:d.id,authorId:a.authorId||null,grants:a.grants||[]}};
 var resPerso=function(r){return{type:'personal',id:r.id,subjectId:r.subjectId}};
 var resPay=function(p){return{type:'payment',id:p.id,amount:p.montant,payer:p.payer,payeeId:p.payeeId,payerId:p.payerId||null}};
 var personne=function(id){return(contenu.personnes||[]).filter(function(p){return p.id===id})[0]||null};
 var trace=[];
 var vue={sujet:sujet,personne:personne(sujet.id),evenement:contenu.evenement,
  moments:function(filtre){var all=(contenu.moments||[]).filter(function(m){var ok=can('read',resMoment(m)).allow;if(!ok)trace.push('moment masqué par la règle : '+m.id);return ok});
   if(filtre==='public')return all.filter(function(m){return m.public});
   if(filtre==='assigne')return all.filter(function(m){return m.assigneeId===sujet.id||(!m.public&&!m.assigneeId)});return all},
  notesVisibles:function(m){return can('read',{type:'event',id:m.id,public:false}).allow},
  peutModifier:function(m){return can('edit',resMoment(m)).allow},
  personnes:function(groupes){return(contenu.personnes||[]).filter(function(p){return groupes.indexOf(p.groupe)>=0&&p.id!==sujet.id})},
  contactsVisibles:sujet.role&&sujet.role!=='guest',
  documents:function(){var vis=[],caches=0;(contenu.documents||[]).forEach(function(d){if(can('read',resDoc(d)).allow)vis.push({doc:d,partager:can('share',resDoc(d)).allow,modifier:can('edit',resDoc(d)).allow});else caches++});return{visibles:vis,caches:caches}},
  reponses:function(){var lis=[],autres=0;(contenu.reponses||[]).forEach(function(r){if(can('read',resPerso(r)).allow)lis.push({r:r,p:personne(r.subjectId)});else autres++});
   var resume=can('read',{type:'summary',id:'reponses'}).allow?{oui:(contenu.reponses||[]).filter(function(r){return r.reponse==='Oui'}).length,non:(contenu.reponses||[]).filter(function(r){return r.reponse==='Non'}).length,regimes:(contenu.reponses||[]).filter(function(r){return r.regime&&r.regime!=='—'}).length}:null;
   return{nominatives:lis,masquees:autres,resume:resume}},
  maReponse:function(){var r=(contenu.reponses||[]).filter(function(x){return x.subjectId===sujet.id})[0];if(!r)return null;return{r:r,lire:can('read',resPerso(r)).allow,modifier:can('edit',resPerso(r)).allow}},
  paiements:function(){return(contenu.paiements||[]).filter(function(p){return can('read',resPay(p)).allow}).map(function(p){var d=canStart('pay',resPay(p));return{p:p,payer:d.allow,confirmation:!!d.needsTx}})},
  actions:function(liste){var oui=[],non=0;(liste||[]).forEach(function(a){var res=a.res.type==='document'?resDoc((contenu.documents||[]).filter(function(d){return d.id===a.res.ref})[0]||{id:a.res.ref}):a.res.type==='event'?resMoment((contenu.moments||[]).filter(function(m){return m.id===a.res.ref})[0]||{id:a.res.ref}):a.res.type==='payment'?resPay((contenu.paiements||[]).filter(function(p){return p.id===a.res.ref})[0]||{id:a.res.ref}):{type:a.res.type,id:contenu.evenement.id,role:a.res.role};
   var d=a.action==='pay'?canStart('pay',res):can(a.action,res);if(d.allow)oui.push({label:a.label,regle:d.rule,confirmation:!!d.needsTx});else{non++;trace.push('action refusée : '+a.label+' ('+d.reason+')')}});return{autorisees:oui,refusees:non}},
  trace:trace};
 return vue}

/* ---------- 2 · visuels génératifs AIME (originaux, déterministes, remplaçables par une photographie) ---------- */
function alea(g){var s=(g>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function visuel(graine,amb,ratio){var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='g'+graine,cs=[amb.c1,amb.c2,amb.paper,amb.ink];
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Visuel génératif"><defs><filter id="'+id+'b"><feGaussianBlur stdDeviation="'+Math.round(40+r()*50)+'"/></filter><linearGradient id="'+id+'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+cs[0]+'"/><stop offset="1" stop-color="'+cs[1]+'"/></linearGradient></defs>';
 s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'l)"/><g filter="url(#'+id+'b)" opacity=".85">';
 for(var i=0;i<6;i++){var c=cs[i%3];s+='<circle cx="'+Math.round(r()*w)+'" cy="'+Math.round(r()*h)+'" r="'+Math.round(h*(.18+r()*.4))+'" fill="'+c+'" opacity="'+(.35+r()*.5).toFixed(2)+'"/>'}
 s+='</g><g fill="none" stroke="'+cs[2]+'" stroke-opacity=".38" stroke-width="1.4">';
 var cx=w*(.55+r()*.3),cy=h*(.4+r()*.3);for(var k=1;k<9;k++){s+='<circle cx="'+Math.round(cx)+'" cy="'+Math.round(cy)+'" r="'+Math.round(k*h*.075)+'"/>'}
 s+='</g></svg>';return s}
function image(v,amb,ratio){if(v&&v.photo)return'<img src="'+esc(v.photo)+'" alt="" loading="lazy">';return visuel(v&&v.graine||7,amb,ratio)}

/* ---------- 3 · composants : chacun reçoit la vue filtrée ; le modèle choisit la variante ---------- */
var C={
 hero:{
  'pleine-page':function(x){var e=x.vue.evenement;return'<header class="v-hero hero-plein" data-sv="hero" data-sv-label="Accueil"><div class="v-img">'+image(e.visuels&&e.visuels.hero,x.amb,1.5)+'</div><div class="v-hero-t"><span class="v-k">'+esc(x.angle.kicker)+'</span><h1>'+esc(e.nom)+'</h1><p class="v-date">'+esc(dateLongue(e.date))+' · '+esc(e.lieu.nom)+'</p></div></header><section class="v-intro" data-sv="intro" data-sv-label="Introduction"><p>'+esc(x.angle.intro)+'</p></section>'}
 },
 compte:{defaut:function(x){var j=Math.max(0,Math.round((new Date(x.vue.evenement.date+'T12:00:00')-new Date())/864e5));return'<div class="v-compte"><b>'+j+'</b><span>jours avant le '+esc(dateLongue(x.vue.evenement.date))+'</span></div>'}},
 programme:{liste:function(x,s){var ms=x.vue.moments(s.filtre);if(!ms.length)return'';return'<ol class="v-prog">'+ms.map(function(m){var notes=s.notes&&m.equipe&&x.vue.notesVisibles(m);return'<li'+(m.public?'':' class="interne"')+'><time>'+esc(heure(m.debut))+'</time><div><b>'+esc(m.titre)+'</b><span>'+esc(m.espace)+(m.planB&&s.filtre!=='public'?' · plan B : '+esc(m.planB):'')+'</span>'+(notes?'<p class="v-note">'+esc(m.equipe)+'</p>':'')+(m.public?'':'<em>équipe</em>')+'</div></li>'}).join('')+'</ol>'}},
 lieu:{defaut:function(x,s){var l=x.vue.evenement.lieu;return'<div class="v-lieu"><div><h3>'+esc(l.nom)+'</h3><p>'+esc(l.adresse)+'</p><p>'+esc(l.acces)+'</p>'+(s.planB&&l.planB?'<p class="v-note">Plan B : '+esc(l.planB)+'</p>':'')+'</div><div class="v-img v-img-s">'+image({graine:(x.vue.evenement.visuels.hero.graine||7)+5},x.amb,1.3)+'</div></div>'}},
 personnes:{colonnes:function(x,s){var ps=x.vue.personnes(s.groupes||[]);if(!ps.length)return'';return'<ul class="v-pers">'+ps.map(function(p){return'<li><b>'+esc(p.nom)+'</b><span>'+esc(p.fonction)+'</span>'+(s.contacts&&x.vue.contactsVisibles&&p.contact?'<span class="v-tel">'+esc(p.contact)+'</span>':'')+'</li>'}).join('')+'</ul>'}},
 documents:{liste:function(x){var d=x.vue.documents();if(!d.visibles.length&&!d.caches)return'';return'<ul class="v-docs">'+d.visibles.map(function(o){return'<li><span class="v-dn">'+esc(o.doc.nature)+'</span><b>'+esc(o.doc.titre)+'</b><span>'+esc(o.doc.taille)+'</span><span class="v-da">'+(o.modifier?'modifiable':'lecture')+(o.partager?' · partage':'')+'</span></li>'}).join('')+'</ul>'+(d.caches?'<p class="v-masque">'+d.caches+' document'+(d.caches>1?'s':'')+' réservé'+(d.caches>1?'s':'')+' à d\'autres personnes.</p>':'')}},
 reponses:{defaut:function(x){var r=x.vue.reponses();if(!r.nominatives.length&&!r.resume)return'';var h='';if(r.resume)h+='<div class="v-chiffres"><div><b>'+r.resume.oui+'</b><span>présents</span></div><div><b>'+r.resume.non+'</b><span>absents</span></div><div><b>'+r.resume.regimes+'</b><span>régimes particuliers</span></div></div>';
  if(r.nominatives.length)h+='<ul class="v-rep">'+r.nominatives.map(function(o){return'<li><b>'+esc(o.p?o.p.nom:o.r.subjectId)+'</b><span>'+esc(o.r.reponse)+'</span><span>'+esc(o.r.regime)+'</span></li>'}).join('')+'</ul>';else if(r.masquees)h+='<p class="v-masque">Les réponses nominatives restent privées : seuls les chiffres sont partagés.</p>';return h}},
 reponse:{formulaire:function(x){var m=x.vue.maReponse();if(!m||!m.lire)return'';return'<form class="v-form" onsubmit="return false"><p>Bonjour '+esc(x.vue.personne?x.vue.personne.nom:'')+', votre réponse : <b>'+esc(m.r.reponse)+'</b> · régime : <b>'+esc(m.r.regime)+'</b></p>'+(m.modifier?'<div class="v-btns"><button type="button" class="v-btn" data-demo>Modifier ma réponse</button></div>':'')+'</form>'}},
 hebergement:{defaut:function(x){var c=x.contenu.hebergements||[];return'<ul class="v-cartes">'+c.map(function(h){return'<li><b>'+esc(h.nom)+'</b><span>'+esc(h.distance)+'</span><p>'+esc(h.note)+'</p></li>'}).join('')+'</ul>'}},
 menu:{carte:function(x){var m=x.contenu.menu;if(!m)return'';return'<div class="v-menu"><p><span>Entrée</span>'+esc(m.entree)+'</p><p><span>Plat</span>'+esc(m.plat)+'</p><p><span>Dessert</span>'+esc(m.dessert)+'</p><p class="v-note">Options : '+esc((m.options||[]).join(' · '))+'</p></div>'}},
 cadeaux:{defaut:function(x){var c=x.contenu.cadeaux;return c?'<div class="v-cad"><h3>'+esc(c.titre)+'</h3><p>'+esc(c.detail)+'</p></div>':''}},
 galerie:{mosaique:function(x){return'<div class="v-gal">'+(x.contenu.galerie||[]).map(function(g){return'<figure><div class="v-img">'+image({graine:g.graine},x.amb,1)+'</div><figcaption>'+esc(g.titre)+'</figcaption></figure>'}).join('')+'</div>'}},
 faq:{defaut:function(x){return'<dl class="v-faq">'+(x.contenu.faq||[]).map(function(f){return'<dt>'+esc(f.q)+'</dt><dd>'+esc(f.r)+'</dd>'}).join('')+'</dl>'}},
 paiements:{defaut:function(x){var ps=x.vue.paiements();if(!ps.length)return'';return'<ul class="v-docs">'+ps.map(function(o){return'<li><span class="v-dn">'+esc(o.p.echeance)+'</span><b>'+esc(o.p.titre)+'</b><span>'+esc(o.p.montant)+' €</span><span class="v-da">'+esc(o.p.statut)+(o.payer?' · vous pouvez régler'+(o.confirmation?' (après confirmation)':''):'')+'</span></li>'}).join('')+'</ul>'}},
 urgences:{defaut:function(x){return'<ul class="v-pers">'+(x.contenu.urgences||[]).map(function(u){return'<li><b>'+esc(u.qui)+'</b><span class="v-tel">'+esc(u.tel)+'</span></li>'}).join('')+'</ul>'}},
 actions:{boutons:function(x,s){var a=x.vue.actions(s.liste);if(!a.autorisees.length)return'';return'<div class="v-btns">'+a.autorisees.map(function(b){return'<button type="button" class="v-btn" data-demo title="'+esc(b.regle)+'">'+esc(b.label)+(b.confirmation?' · confirmation requise':'')+'</button>'}).join('')+'</div>'+(a.refusees?'<p class="v-masque">'+a.refusees+' action'+(a.refusees>1?'s':'')+' réservée'+(a.refusees>1?'s':'')+' à d\'autres rôles.</p>':'')}}
};

/* ---------- 4 · assemblage selon la composition du modèle ---------- */
var LIB={compte:'Compte à rebours',hero:'Accueil'};
function rendre(o){var contenu=o.contenu,modele=o.modele,pres=o.presentation||{},angle=o.perspective;
 var amb=pres.ambiance||{c1:'#2F4A36',c2:'#C7D9B7',paper:'#F3F1E8',ink:'#1F2E23'};
 var vue=politique(contenu,o.acces||{},angle,o.regles);
 var x={contenu:contenu,vue:vue,angle:angle,amb:amb,modele:modele};
 var comp=modele.composition||{},vari=comp.variantes||{};
 var pick=function(type){var v=C[type];if(!v)return null;return v[vari[type]]||v.defaut||v[Object.keys(v)[0]]};
 var corps='',n=0;
 (angle.sections||[]).forEach(function(s){var f=pick(s.type);if(!f)return;var inner=f(x,s);if(!inner)return;n++;
  var num=comp.numeros?'<span class="v-num">'+(n<10?'0':'')+n+'</span>':'';
  corps+='<section class="v-sec v-'+s.type+'" data-sv="sec-'+s.type+'" data-sv-label="'+esc(s.titre||LIB[s.type]||s.type)+'">'+(s.titre?'<h2>'+num+esc(s.titre)+'</h2>':'')+inner+'</section>'});
 var hero=(C.hero[comp.hero]||C.hero['pleine-page'])(x);
 var html='<div class="v v-'+esc(modele.id)+'" data-modele="'+esc(modele.id)+'" data-angle="'+esc(angle.id)+'">'+hero+'<main class="v-main">'+corps+'</main><footer class="v-pied"><p>'+esc(contenu.evenement.nom)+' · '+esc(dateLongue(contenu.evenement.date))+'</p><p class="v-credit">Données fictives de démonstration · visuels : '+esc((contenu.evenement.visuels.hero||{}).credit||'')+' · modèle '+esc(modele.nom)+'</p></footer></div>';
 var p=pres.polices||{};
 var css=':root{--c1:'+amb.c1+';--c2:'+amb.c2+';--paper:'+amb.paper+';--ink:'+amb.ink+';--ft:'+(p.titre||'Georgia, serif')+';--fb:'+(p.texte||'system-ui, sans-serif')+'}';
 return{html:html,css:css,titre:contenu.evenement.nom+' · '+angle.label,bilan:{sections:n,sujet:vue.sujet,trace:vue.trace}}}

return{rendre:rendre,politique:politique,visuel:visuel,composants:Object.keys(C)};
});
