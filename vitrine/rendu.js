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
function heure(h){return String(h||'').replace(/^0(\d)/,'$1').replace(':',' h ').replace(/ h 00$/,' h')}

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
 var resItem=function(it){return{type:'item',id:it.id||it.nom,audience:it.audience||'public',assigneeId:it.assigneeId||null}};
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
   var resume=null;if(can('read',{type:'summary',id:'reponses'}).allow){resume={par:{},regimes:0};(contenu.reponses||[]).forEach(function(r){resume.par[r.reponse]=(resume.par[r.reponse]||0)+1;if(r.regime&&r.regime!=='—')resume.regimes++})}
   return{nominatives:lis,masquees:autres,resume:resume}},
  maReponse:function(){var r=(contenu.reponses||[]).filter(function(x){return x.subjectId===sujet.id})[0];if(!r)return null;return{r:r,lire:can('read',resPerso(r)).allow,modifier:can('edit',resPerso(r)).allow}},
  paiements:function(){return(contenu.paiements||[]).filter(function(p){return can('read',resPay(p)).allow}).map(function(p){var d=canStart('pay',resPay(p));return{p:p,payer:d.allow,confirmation:!!d.needsTx}})},
  actions:function(liste){var oui=[],non=0;(liste||[]).forEach(function(a){var res=a.res.type==='document'?resDoc((contenu.documents||[]).filter(function(d){return d.id===a.res.ref})[0]||{id:a.res.ref}):a.res.type==='event'?resMoment((contenu.moments||[]).filter(function(m){return m.id===a.res.ref})[0]||{id:a.res.ref}):a.res.type==='payment'?resPay((contenu.paiements||[]).filter(function(p){return p.id===a.res.ref})[0]||{id:a.res.ref}):{type:a.res.type,id:contenu.evenement.id,role:a.res.role};
   var d=a.action==='pay'?canStart('pay',res):can(a.action,res);if(d.allow)oui.push({label:a.label,regle:d.rule,confirmation:!!d.needsTx});else{non++;trace.push('action refusée : '+a.label+' ('+d.reason+')')}});return{autorisees:oui,refusees:non}},
  nom:function(id){var p=personne(id);return p?p.nom:''},
  personneComplete:function(id){return personne(id)},
  collection:function(cle){var vis=[],caches=0;(contenu[cle]||[]).forEach(function(it){if(can('read',resItem(it)).allow)vis.push(it);else caches++});return{visibles:vis,caches:caches}},
  trace:trace};
 return vue}

/* ---------- 2 · visuels génératifs AIME (originaux, déterministes, remplaçables par une photographie) ---------- */
function alea(g){var s=(g>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function visuel(graine,amb,ratio,style){if(style==='architecture')return archi(graine,amb,ratio);var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='g'+graine,cs=[amb.c1,amb.c2,amb.paper,amb.ink];
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Visuel génératif"><defs><filter id="'+id+'b"><feGaussianBlur stdDeviation="'+Math.round(40+r()*50)+'"/></filter><linearGradient id="'+id+'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+cs[0]+'"/><stop offset="1" stop-color="'+cs[1]+'"/></linearGradient></defs>';
 s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'l)"/><g filter="url(#'+id+'b)" opacity=".85">';
 for(var i=0;i<6;i++){var c=cs[i%3];s+='<circle cx="'+Math.round(r()*w)+'" cy="'+Math.round(r()*h)+'" r="'+Math.round(h*(.18+r()*.4))+'" fill="'+c+'" opacity="'+(.35+r()*.5).toFixed(2)+'"/>'}
 s+='</g><g fill="none" stroke="'+cs[2]+'" stroke-opacity=".38" stroke-width="1.4">';
 var cx=w*(.55+r()*.3),cy=h*(.4+r()*.3);for(var k=1;k<9;k++){s+='<circle cx="'+Math.round(cx)+'" cy="'+Math.round(cy)+'" r="'+Math.round(k*h*.075)+'"/>'}
 s+='</g></svg>';return s}
/* nature « architecture » : façades, travées et plans de lumière, pour les univers d'entreprise */
function archi(graine,amb,ratio){var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='a'+graine;
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Visuel génératif"><defs><linearGradient id="'+id+'c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+amb.c2+'"/><stop offset="1" stop-color="'+amb.paper+'"/></linearGradient><linearGradient id="'+id+'l" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
 s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'c)"/>';
 var hz=h*(.62+r()*.08),n=7+Math.floor(r()*4),bw=w/n;
 for(var i=0;i<n;i++){var x0=i*bw,hh=h*(.35+r()*.5),top=hz-hh,dark=i%2?amb.c1:amb.ink;
  s+='<rect x="'+Math.round(x0)+'" y="'+Math.round(top)+'" width="'+Math.ceil(bw+1)+'" height="'+Math.round(h-top)+'" fill="'+dark+'" opacity="'+(.55+r()*.4).toFixed(2)+'"/>';
  for(var k=0;k<5;k++){var wy=top+hh*(.12+k*.17);s+='<rect x="'+Math.round(x0+bw*.18)+'" y="'+Math.round(wy)+'" width="'+Math.round(bw*.64)+'" height="'+Math.round(hh*.07)+'" fill="'+amb.c2+'" opacity="'+(.18+r()*.35).toFixed(2)+'"/>'}}
 s+='<polygon points="0,0 '+Math.round(w*.62)+',0 '+Math.round(w*.18)+','+h+' 0,'+h+'" fill="url(#'+id+'l)"/>';
 s+='<g stroke="'+amb.paper+'" stroke-opacity=".22" stroke-width="1">';for(var g=1;g<12;g++){s+='<line x1="'+Math.round(g*w/12)+'" y1="0" x2="'+Math.round(g*w/12)+'" y2="'+h+'"/>'}s+='</g></svg>';return s}
function image(v,amb,ratio,style){if(v&&v.photo)return'<img src="'+esc(v.photo)+'" alt="" loading="lazy">';return visuel(v&&v.graine||7,amb,ratio,(v&&v.style)||style)}

/* ---------- 3 · composants : chacun reçoit la vue filtrée ; le modèle choisit la variante ---------- */
function L(x,k,d){var a=x.angle.libelles||{},u=x.libelles||{};return a[k]!=null?a[k]:u[k]!=null?u[k]:d}
var C={
 hero:{
  'pleine-page':function(x){var e=x.vue.evenement;return'<header class="v-hero hero-plein" data-sv="hero" data-sv-label="Accueil"><div class="v-img">'+image(e.visuels&&e.visuels.hero,x.amb,1.5)+'</div><div class="v-hero-t"><span class="v-k">'+esc(x.angle.kicker)+'</span><h1>'+esc(e.nom)+'</h1><p class="v-date">'+esc(dateLongue(e.date))+' · '+esc(e.lieu.nom)+'</p></div></header><section class="v-intro" data-sv="intro" data-sv-label="Introduction"><p>'+esc(x.angle.intro)+'</p></section>'}
 },
 compte:{defaut:function(x){var j=Math.max(0,Math.round((new Date(x.vue.evenement.date+'T12:00:00')-new Date())/864e5));return'<div class="v-compte"><b>'+j+'</b><span>'+esc(L(x,'compte','jours avant le'))+' '+esc(dateLongue(x.vue.evenement.date))+'</span></div>'}},
 programme:{liste:function(x,s){var ms=x.vue.moments(s.filtre);if(!ms.length)return'';return'<ol class="v-prog">'+ms.map(function(m){var notes=s.notes&&m.equipe&&x.vue.notesVisibles(m);return'<li'+(m.public?'':' class="interne"')+'><time>'+esc(heure(m.debut))+'</time><div><b>'+esc(m.titre)+'</b><span>'+esc(m.espace)+(m.planB&&s.filtre!=='public'?' · '+esc(L(x,'planB','plan B'))+' : '+esc(m.planB):'')+(m.personne?' · '+esc(x.vue.nom(m.personne)):'')+'</span>'+(notes?'<p class="v-note">'+esc(m.equipe)+(m.materiel?' · '+esc(L(x,'materiel','Matériel'))+' : '+esc(m.materiel):'')+'</p>':'')+(m.public?'':'<em>'+esc(L(x,'interne','équipe'))+'</em>')+'</div></li>'}).join('')+'</ol>'}},
 lieu:{defaut:function(x,s){var l=x.vue.evenement.lieu;return'<div class="v-lieu"><div><h3>'+esc(l.nom)+'</h3><p>'+esc(l.adresse)+'</p><p>'+esc(l.acces)+'</p>'+(s.planB&&l.planB?'<p class="v-note">'+esc(L(x,'planBLieu','Plan B'))+' : '+esc(l.planB)+'</p>':'')+'</div><div class="v-img v-img-s">'+image({graine:(x.vue.evenement.visuels.hero.graine||7)+5,style:x.vue.evenement.visuels.hero.style},x.amb,1.3)+'</div></div>'}},
 personnes:{colonnes:function(x,s){var ps=x.vue.personnes(s.groupes||[]);if(!ps.length)return'';return'<ul class="v-pers">'+ps.map(function(p){return'<li><b>'+esc(p.nom)+'</b><span>'+esc(p.fonction)+'</span>'+(s.contacts&&x.vue.contactsVisibles&&p.contact?'<span class="v-tel">'+esc(p.contact)+'</span>':'')+'</li>'}).join('')+'</ul>'}},
 documents:{liste:function(x){var d=x.vue.documents();if(!d.visibles.length&&!d.caches)return'';return'<ul class="v-docs">'+d.visibles.map(function(o){return'<li><span class="v-dn">'+esc(o.doc.nature)+'</span><b>'+esc(o.doc.titre+(o.doc.personne?' · '+x.vue.nom(o.doc.personne):''))+'</b><span>'+esc(o.doc.taille)+'</span><span class="v-da">'+(o.modifier?'modifiable':'lecture')+(o.partager?' · partage':'')+'</span></li>'}).join('')+'</ul>'+(d.caches?'<p class="v-masque">'+d.caches+' document'+(d.caches>1?'s':'')+' réservé'+(d.caches>1?'s':'')+' à d\'autres personnes.</p>':'')}},
 reponses:{defaut:function(x,s){var r=x.vue.reponses();if(!r.nominatives.length&&!r.resume)return'';var h='',lab=L(x,'valeurs',{});
  if(r.resume)h+='<div class="v-chiffres">'+Object.keys(r.resume.par).map(function(k){return'<div><b>'+r.resume.par[k]+'</b><span>'+esc(lab[k]||k)+'</span></div>'}).join('')+(r.resume.regimes?'<div><b>'+r.resume.regimes+'</b><span>'+esc(L(x,'regimes','besoins particuliers'))+'</span></div>':'')+'</div>';
  var ch=s.champs||['reponse','regime'];
  if(r.nominatives.length)h+='<ul class="v-rep">'+r.nominatives.map(function(o){return'<li><b>'+esc(o.p?o.p.nom:o.r.subjectId)+'</b>'+ch.map(function(c){return'<span>'+esc(o.r[c]==null?'—':o.r[c])+'</span>'}).join('')+'</li>'}).join('')+'</ul>';else if(r.masquees)h+='<p class="v-masque">'+esc(L(x,'privees','Les réponses nominatives restent privées : seuls les chiffres sont partagés.'))+'</p>';return h}},
 reponse:{formulaire:function(x,s){var m=x.vue.maReponse();if(!m||!m.lire)return'';var ch=s.champs||[['reponse','Votre réponse'],['regime','Besoins particuliers']];
  return'<form class="v-form" onsubmit="return false"><p>'+esc(L(x,'bonjour','Bonjour'))+' '+esc(x.vue.personne?x.vue.personne.nom:'')+'.</p><dl class="v-champs">'+ch.map(function(c){return'<dt>'+esc(c[1])+'</dt><dd>'+esc(m.r[c[0]]==null?'—':m.r[c[0]])+'</dd>'}).join('')+'</dl>'+(m.modifier?'<div class="v-btns"><button type="button" class="v-btn" data-demo>'+esc(s.bouton||L(x,'modifier','Modifier'))+'</button></div>':'')+'</form>'}},
 hebergement:{defaut:function(x,s){var c=x.contenu[s.source||'hebergements']||[];return'<ul class="v-cartes">'+c.map(function(h){return'<li><b>'+esc(h.nom)+'</b><span>'+esc(h.distance)+'</span><p>'+esc(h.note)+'</p></li>'}).join('')+'</ul>'}},
 menu:{carte:function(x,s){var m=x.contenu[s.source||'menu'];if(!m)return'';return'<div class="v-menu">'+(m.plats||[]).map(function(p){return'<p><span>'+esc(p.libelle)+'</span>'+esc(p.texte)+'</p>'}).join('')+(m.options&&m.options.length?'<p class="v-note">'+esc(L(x,'options','Options'))+' : '+esc(m.options.join(' · '))+'</p>':'')+'</div>'}},
 cadeaux:{defaut:function(x,s){var c=x.contenu[s.source||'cadeaux'];return c?'<div class="v-cad"><h3>'+esc(c.titre)+'</h3><p>'+esc(c.detail)+'</p></div>':''}},
 galerie:{mosaique:function(x){var st=(x.vue.evenement.visuels.hero||{}).style;return'<div class="v-gal">'+(x.contenu.galerie||[]).map(function(g){return'<figure><div class="v-img">'+image({graine:g.graine,photo:g.photo,style:g.style||st},x.amb,1)+'</div><figcaption>'+esc(g.titre)+'</figcaption></figure>'}).join('')+'</div>'}},
 faq:{defaut:function(x){return'<dl class="v-faq">'+(x.contenu.faq||[]).map(function(f){return'<dt>'+esc(f.q)+'</dt><dd>'+esc(f.r)+'</dd>'}).join('')+'</dl>'}},
 paiements:{defaut:function(x){var ps=x.vue.paiements();if(!ps.length)return'';return'<ul class="v-docs">'+ps.map(function(o){return'<li><span class="v-dn">'+esc(o.p.echeance)+'</span><b>'+esc(o.p.titre+(o.p.payeeId&&x.vue.nom(o.p.payeeId)?' · '+x.vue.nom(o.p.payeeId):''))+'</b><span>'+esc(o.p.montant)+' €</span><span class="v-da">'+esc(o.p.statut)+(o.payer?' · vous pouvez régler'+(o.confirmation?' (après confirmation)':''):'')+'</span></li>'}).join('')+'</ul>'}},
 urgences:{defaut:function(x){return'<ul class="v-pers">'+(x.contenu.urgences||[]).map(function(u){var pp=u.personne?x.vue.personneComplete(u.personne):null;return'<li><b>'+esc(u.qui+(pp?' · '+pp.nom:''))+'</b><span class="v-tel">'+esc(pp?pp.contact:u.tel)+'</span></li>'}).join('')+'</ul>'}},
 liste:{defaut:function(x,s){var it=x.vue.collection(s.source);if(!it.visibles.length)return'';var ch=s.champs||[];
  return'<ul class="v-liste">'+it.visibles.map(function(o){return'<li><b>'+esc(o[s.champTitre||'nom'])+'</b>'+(s.etat&&o[s.etat]?'<em class="v-etat">'+esc(o[s.etat])+'</em>':'')+ch.map(function(c){return o[c[0]]==null?'':'<span><i>'+esc(c[1])+'</i> '+esc(c[2]==='personne'?x.vue.nom(o[c[0]]):o[c[0]])+'</span>'}).join('')+'</li>'}).join('')+'</ul>'+(it.caches?'<p class="v-masque">'+it.caches+' '+esc(L(x,'elementsReserves','élément(s) réservé(s) à d\'autres rôles.'))+'</p>':'')}},
 actions:{boutons:function(x,s){var a=x.vue.actions(s.liste);if(!a.autorisees.length)return'';return'<div class="v-btns">'+a.autorisees.map(function(b){return'<button type="button" class="v-btn" data-demo title="'+esc(b.regle)+'">'+esc(b.label)+(b.confirmation?' · confirmation requise':'')+'</button>'}).join('')+'</div>'+(a.refusees?'<p class="v-masque">'+a.refusees+' action'+(a.refusees>1?'s':'')+' réservée'+(a.refusees>1?'s':'')+' à d\'autres rôles.</p>':'')}}
};

/* ---------- 4 · assemblage selon la composition du modèle ---------- */
var LIB={compte:'Compte à rebours',hero:'Accueil'};
function rendre(o){var contenu=o.contenu,modele=o.modele,pres=o.presentation||{},angle=o.perspective;
 var amb=pres.ambiance||{c1:'#2F4A36',c2:'#C7D9B7',paper:'#F3F1E8',ink:'#1F2E23'};
 var vue=politique(contenu,o.acces||{},angle,o.regles);
 var x={contenu:contenu,vue:vue,angle:angle,amb:amb,modele:modele,libelles:o.libelles||{}};
 var comp=modele.composition||{},vari=comp.variantes||{};
 var pick=function(type){var v=C[type];if(!v)return null;return v[vari[type]]||v.defaut||v[Object.keys(v)[0]]};
 var corps='',n=0;
 (angle.sections||[]).forEach(function(s){var f=pick(s.type);if(!f)return;var inner=f(x,s);if(!inner)return;n++;
  var num=comp.numeros?'<span class="v-num">'+(n<10?'0':'')+n+'</span>':'';
  corps+='<section class="v-sec v-'+s.type+'" data-sv="sec-'+s.type+(s.source?'-'+esc(s.source):'')+'" data-sv-label="'+esc(s.titre||LIB[s.type]||s.type)+'">'+(s.titre?'<h2>'+num+esc(s.titre)+'</h2>':'')+inner+'</section>'});
 var hero=(C.hero[comp.hero]||C.hero['pleine-page'])(x);
 var html='<div class="v v-'+esc(modele.id)+'" data-modele="'+esc(modele.id)+'" data-angle="'+esc(angle.id)+'">'+hero+'<main class="v-main">'+corps+'</main><footer class="v-pied"><p>'+esc(contenu.evenement.nom)+' · '+esc(dateLongue(contenu.evenement.date))+'</p><p class="v-credit">Données fictives de démonstration · visuels : '+esc((contenu.evenement.visuels.hero||{}).credit||'')+' · modèle '+esc(modele.nom)+'</p></footer></div>';
 var p=pres.polices||{};
 var css=':root{--c1:'+amb.c1+';--c2:'+amb.c2+';--paper:'+amb.paper+';--ink:'+amb.ink+';--ft:'+(p.titre||'Georgia, serif')+';--fb:'+(p.texte||'system-ui, sans-serif')+'}';
 return{html:html,css:css,titre:contenu.evenement.nom+' · '+angle.label,bilan:{sections:n,sujet:vue.sujet,trace:vue.trace}}}

return{rendre:rendre,politique:politique,visuel:visuel,composants:Object.keys(C)};
});
