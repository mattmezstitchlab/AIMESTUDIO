/* AIME Vitrine · moteur de rendu universel.
   rendre({ contenu, acces, perspective, modele, presentation, regles, flux? }) → { html, css, titre, bilan }   (événements)
   composer({ contenu, perspective, modele, presentation }) → { html, css, titre, bilan }                    (espaces de travail : le Bureau)
   flux (synchroview/flux.js, facultatif) : étapes et actions des missions, décidées par les mêmes règles.

   Cinq couches, jamais mélangées :
     contenu       vitrine/donnees/<univers>.json      les faits de l'événement, écrits une fois
     acces         vitrine/acces/<univers>.json        rôles techniques des membres, droits explicites sur les documents
     perspective   vitrine/perspectives/<univers>.json l'angle : sections, filtres, actions, mots (aucune donnée, aucun droit)
     modele        vitrine/modeles/<id>.json           la composition graphique et ses variantes (aucun contenu)
     presentation  vitrine/presentation/ambiances.json couleurs, polices, visuel
   Les règles d'accès (synchroview/permissions.js) filtrent le contenu et les actions AVANT la mise en page :
   un modèle reçoit une vue déjà filtrée, il ne peut ni montrer ni cacher ce que les règles décident. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else{root.AIMEVitrine=factory();root.AIMESite=root.AIMEVitrine.site}})(typeof self!=='undefined'?self:this,function(){'use strict';

function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function dateLongue(iso){var d=new Date(iso+'T12:00:00');return isNaN(d)?iso:d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear()}
function avant(h,min){var p=String(h||'').split(':');if(p.length<2)return h;var v=(+p[0])*60+(+p[1])-min;v=(v+1440)%1440;return('0'+Math.floor(v/60)).slice(-2)+':'+('0'+v%60).slice(-2)}
function heure(h){return String(h||'').replace(/^0(\d)/,'$1').replace(':',' h ').replace(/ h 00$/,' h')}

/* ---------- 1 · la politique : contenu + accès + règles → vue filtrée, indépendante de tout modèle ---------- */
function politique(contenu,acces,perspective,regles,flux){
 var sujet=flux?flux.sujet(contenu,acces,perspective.regard):{id:perspective.regard,role:(acces.membres||{})[perspective.regard]||null};
 var can=function(action,res,ctx){return regles.can(sujet,action,res,ctx)};
 var canStart=function(action,res){return regles.canStart?regles.canStart(sujet,action,res):regles.can(sujet,action,res)};
 var resMoment=function(m){return{type:'event',id:m.id,public:!!m.public,assigneeId:m.assigneeId||null,authorId:m.authorId||null}};
 var resDoc=function(d){var a=(acces.documents||{})[d.id]||{};return{type:'document',id:d.id,authorId:a.authorId||null,grants:a.grants||[]}};
 var resPerso=function(r){return{type:'personal',id:r.id,subjectId:r.subjectId}};
 var resPay=function(p){return{type:'payment',id:p.id,amount:p.montant,payer:p.payer,payeeId:p.payeeId,payerId:p.payerId||null}};
 var personne=function(id){return(contenu.personnes||[]).filter(function(p){return p.id===id})[0]||null};
 var trace=[];
 var lienMission=function(r){return r.responsableId===sujet.id?'responsable':r.coordinateurId===sujet.id?'coordinateur':(r.assigneeIds||[]).indexOf(sujet.id)>=0?'affecte':(r.candidateIds||[]).indexOf(sujet.id)>=0?'candidat':''};
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
  /* un lieu peut être écrit une fois (référence) ou décrit sur place : la vue rend toujours son nom à jour */
  lieu:function(v){if(v&&typeof v==='object')return v;return(contenu.lieux||[]).filter(function(l){return l.id===v})[0]||(v?{nom:v}:null)},
  lieuNom:function(v){var l=vue.lieu(v);return l?l.nom:''},
  /* missions : un seul objet, lu à travers les règles ; chaque étape n'apparaît qu'aux personnes concernées */
  mission:function(id){var m=(contenu.missions||[]).filter(function(x){return x.id===id})[0];if(!m||!flux)return null;var res=flux.ressource(contenu,m);
   if(!can('read',res).allow){trace.push('mission masquée par la règle : '+id);return null}
   var et={};flux.ETAPES.forEach(function(e){et[e]=can('step',flux.ressource(contenu,m,e)).allow});
   var cands=[],cach=0;(contenu.candidatures||[]).filter(function(c){return c.mission===id}).forEach(function(c){if(can('read',flux.resCandidature(c)).allow)cands.push(c);else cach++});
   return{m:m,statut:flux.statut(m),rang:m.etape==='close'?flux.ETAPES.length:flux.ETAPES.indexOf(m.etape),etapes:et,actions:flux.possibles(contenu,acces,regles,sujet.id,m),
    candidatures:cands,cachees:cach,logistique:can('read_logistics',res).allow,taches:(contenu.taches||[]).filter(function(t){return t.mission===id}),lien:lienMission(res)}},
  missions:function(filtre){var out=[];(contenu.missions||[]).forEach(function(m){var res=flux?flux.ressource(contenu,m):null;if(!res||!can('read',res).allow)return;var l=lienMission(res),ouverte=m.etape==='decouvrir'||m.etape==='candidater';
    if(filtre==='ouvertes'&&!(ouverte&&!l))return;if(filtre==='miennes'&&!l)return;out.push({m:m,statut:flux.statut(m),lien:l,candidater:can('apply',res)})});return out},
  membresOrganisation:function(){return(contenu.personnes||[]).filter(function(p){var r=(acces.membres||{})[p.id];return r==='owner'||r==='editor'})},
  collection:function(cle){var vis=[],caches=0;(contenu[cle]||[]).forEach(function(it){if(can('read',resItem(it)).allow)vis.push(it);else caches++});return{visibles:vis,caches:caches}},
  trace:trace};
 return vue}

/* ---------- 2 · visuels génératifs AIME (originaux, déterministes, remplaçables par une photographie) ---------- */
function alea(g){var s=(g>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function visuel(graine,amb,ratio,style){if(style==='architecture')return archi(graine,amb,ratio);if(style==='toits')return toits(graine,amb,ratio);if(style==='gratte-ciel')return gratteCiel(graine,amb,ratio);var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='g'+graine,cs=[amb.c1,amb.c2,amb.paper,amb.ink];
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
/* nature « toits » : ciel de fin de journée, toits mansardés, cheminées, tour en treillis au loin */
function toits(graine,amb,ratio){var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='t'+graine;
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Visuel génératif"><defs><linearGradient id="'+id+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+amb.c1+'"/><stop offset=".55" stop-color="'+amb.c2+'"/><stop offset="1" stop-color="'+amb.paper+'"/></linearGradient><radialGradient id="'+id+'g"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
 s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'s)"/><circle cx="'+Math.round(w*(.62+r()*.2))+'" cy="'+Math.round(h*.52)+'" r="'+Math.round(h*.3)+'" fill="url(#'+id+'g)" opacity=".55"/>';
 var tx=w*(.66+r()*.14),tb=h*.66,th=h*.5;s+='<g stroke="'+amb.ink+'" stroke-opacity=".55" fill="none" stroke-width="2"><path d="M'+(tx-th*.16)+' '+tb+' L'+tx+' '+(tb-th)+' L'+(tx+th*.16)+' '+tb+'"/>';
 for(var k=1;k<9;k++){var yy=tb-th*k/9,hw=th*.16*(1-k/9);s+='<line x1="'+(tx-hw).toFixed(1)+'" y1="'+yy.toFixed(1)+'" x2="'+(tx+hw).toFixed(1)+'" y2="'+yy.toFixed(1)+'"/>'}s+='</g>';
 for(var row=0;row<3;row++){var base=h*(.66+row*.12),col=row===2?amb.ink:amb.c1,op=[.55,.75,.95][row],x=-40;
  while(x<w){var bw=90+r()*170,mh=h*(.07+r()*.08),top=base-mh;
   s+='<polygon points="'+Math.round(x)+','+h+' '+Math.round(x)+','+Math.round(base)+' '+Math.round(x+bw*.12)+','+Math.round(top)+' '+Math.round(x+bw*.88)+','+Math.round(top)+' '+Math.round(x+bw)+','+Math.round(base)+' '+Math.round(x+bw)+','+h+'" fill="'+col+'" opacity="'+op+'"/>';
   var nc=1+Math.floor(r()*3);for(var c=0;c<nc;c++){var cx=x+bw*(.2+r()*.6);s+='<rect x="'+Math.round(cx)+'" y="'+Math.round(top-h*.035)+'" width="'+Math.round(10+r()*12)+'" height="'+Math.round(h*.035)+'" fill="'+col+'" opacity="'+op+'"/>'}
   if(row<2)for(var f=0;f<3;f++){s+='<rect x="'+Math.round(x+bw*(.22+f*.22))+'" y="'+Math.round(top+mh*.35)+'" width="'+Math.round(bw*.08)+'" height="'+Math.round(mh*.3)+'" fill="'+amb.c2+'" opacity=".55"/>'}
   x+=bw+2}}
 return s+'</svg>'}
/* nature « gratte-ciel » : heure bleue, tours, fenêtres allumées, reflet sur l'eau */
function gratteCiel(graine,amb,ratio){var r=alea(graine),w=1600,h=Math.round(w/(ratio||1.6)),id='n'+graine;
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Visuel génératif"><defs><linearGradient id="'+id+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+amb.ink+'"/><stop offset=".7" stop-color="'+amb.c1+'"/><stop offset="1" stop-color="'+amb.c2+'"/></linearGradient></defs>';
 s+='<rect width="'+w+'" height="'+h+'" fill="url(#'+id+'s)"/>';var water=h*.8,x=-20,lit=[];
 while(x<w){var bw=50+r()*120,bh=h*(.2+Math.pow(r(),1.6)*.62),top=water-bh;s+='<rect x="'+Math.round(x)+'" y="'+Math.round(top)+'" width="'+Math.round(bw)+'" height="'+Math.round(bh)+'" fill="'+amb.ink+'" opacity="'+(.78+r()*.2).toFixed(2)+'"/>';
  if(r()>.6)s+='<rect x="'+Math.round(x+bw*.42)+'" y="'+Math.round(top-h*.05)+'" width="'+Math.round(bw*.16)+'" height="'+Math.round(h*.05)+'" fill="'+amb.ink+'"/>';
  for(var yy=top+10;yy<water-12;yy+=14)for(var xx=x+8;xx<x+bw-10;xx+=12)if(r()>.78)lit.push('<rect x="'+Math.round(xx)+'" y="'+Math.round(yy)+'" width="5" height="7" fill="'+amb.paper+'" opacity="'+(.35+r()*.6).toFixed(2)+'"/>');
  x+=bw+3+r()*14}
 s+=lit.join('')+'<rect y="'+Math.round(water)+'" width="'+w+'" height="'+(h-Math.round(water))+'" fill="'+amb.ink+'" opacity=".85"/>';
 for(var k=0;k<40;k++){var ry=water+6+r()*(h-water-10);s+='<rect x="'+Math.round(r()*w)+'" y="'+Math.round(ry)+'" width="'+Math.round(20+r()*90)+'" height="2" fill="'+amb.paper+'" opacity="'+(.08+r()*.22).toFixed(2)+'"/>'}
 return s+'</svg>'}
function image(v,amb,ratio,style){if(v&&v.photo)return'<img src="'+esc(v.photo)+'" alt="" loading="lazy">';return visuel(v&&v.graine||7,amb,ratio,(v&&v.style)||style)}

/* ---------- 3 · composants : chacun reçoit la vue filtrée ; le modèle choisit la variante ---------- */
function L(x,k,d){var a=x.angle.libelles||{},u=x.libelles||{};return a[k]!=null?a[k]:u[k]!=null?u[k]:d}
var C={
 hero:{
  'pleine-page':function(x){var e=x.vue.evenement;return'<header class="v-hero hero-plein" data-sv="hero" data-sv-label="Accueil"><div class="v-img">'+image(x.angle.visuel&&!(e.visuels&&e.visuels.hero&&e.visuels.hero.photo)?x.angle.visuel:e.visuels&&e.visuels.hero,x.amb,1.5)+'</div><div class="v-hero-t"><span class="v-k">'+esc(x.angle.kicker)+'</span><h1>'+esc(e.nom)+'</h1><p class="v-date">'+esc(dateLongue(e.date))+' · '+esc(x.vue.lieuNom(e.lieu))+'</p></div></header><section class="v-intro" data-sv="intro" data-sv-label="Introduction"><p>'+esc(x.angle.intro)+'</p></section>'}
 },
 compte:{defaut:function(x){var j=Math.max(0,Math.round((new Date(x.vue.evenement.date+'T12:00:00')-new Date())/864e5));return'<div class="v-compte"><b>'+j+'</b><span>'+esc(L(x,'compte','jours avant le'))+' '+esc(dateLongue(x.vue.evenement.date))+'</span></div>'}},
 programme:{liste:function(x,s){var ms=x.vue.moments(s.filtre);if(!ms.length)return'';return'<ol class="v-prog">'+ms.map(function(m){var notes=s.notes&&m.equipe&&x.vue.notesVisibles(m);return'<li'+(m.public?'':' class="interne"')+'><time>'+esc(heure(m.debut))+'</time><div><b>'+esc(m.titre)+'</b><span>'+esc(x.vue.lieuNom(m.espace))+(m.planB&&s.filtre!=='public'?' · '+esc(L(x,'planB','plan B'))+' : '+esc(m.planB):'')+(m.personne?' · '+esc(x.vue.nom(m.personne)):'')+'</span>'+(notes?'<p class="v-note">'+esc(m.equipe)+(m.materiel?' · '+esc(L(x,'materiel','Matériel'))+' : '+esc(m.materiel):'')+'</p>':'')+(m.public?'':'<em>'+esc(L(x,'interne','équipe'))+'</em>')+'</div></li>'}).join('')+'</ol>'}},
 lieu:{defaut:function(x,s){var l=x.vue.lieu(x.vue.evenement.lieu)||{};return'<div class="v-lieu"><div><h3>'+esc(l.nom)+'</h3><p>'+esc(l.adresse)+'</p><p>'+esc(l.acces)+'</p>'+(s.planB&&l.planB?'<p class="v-note">'+esc(L(x,'planBLieu','Plan B'))+' : '+esc(l.planB)+'</p>':'')+'</div><div class="v-img v-img-s">'+image({graine:(x.vue.evenement.visuels.hero.graine||7)+5,style:x.vue.evenement.visuels.hero.style},x.amb,1.3)+'</div></div>'}},
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
  return'<ul class="v-liste">'+it.visibles.map(function(o){return'<li><b>'+esc(o[s.champTitre||'nom']||o.nom||o.titre||o.code)+'</b>'+(s.etat&&o[s.etat]?'<em class="v-etat">'+esc(o[s.etat])+'</em>':'')+ch.map(function(c){return o[c[0]]==null?'':'<span><i>'+esc(c[1])+'</i> '+esc(c[2]==='personne'?x.vue.nom(o[c[0]]):c[2]==='lieu'?x.vue.lieuNom(o[c[0]]):c[2]==='heure'?heure(o[c[0]]):c[2]==='date'?dateLongue(o[c[0]]):o[c[0]])+'</span>'}).join('')+'</li>'}).join('')+'</ul>'+(it.caches?'<p class="v-masque">'+it.caches+' '+esc(L(x,'elementsReserves','élément(s) réservé(s) à d\'autres rôles.'))+'</p>':'')}},
 mission:{dossier:function(x,s){var M=x.vue.mission(s.ref);if(!M)return'';var m=M.m,id=m.id,A=M.actions,E=x.flux.ETAPES,lab=L(x,'etapes',{}),st=L(x,'statuts',{});
  var EL={decouvrir:'Découvrir',candidater:'Candidater',valider:'Valider',organiser:'Organiser',realiser:'Réaliser',cloturer:'Clôturer'};
  var h='<div class="v-mi" data-sv-id="mission:'+esc(id)+'"><div class="v-mi-h"><span class="v-k">'+esc(m.categorie)+'</span><h3>'+esc(m.titre)+'</h3><em class="v-etat e-'+esc(M.statut)+'">'+esc(st[M.statut]||M.statut)+'</em></div>';
  h+='<dl class="v-champs v-mi-f"><dt>'+esc(L(x,'lieu','Lieu'))+'</dt><dd data-sv-id="mission:'+esc(id)+':lieu">'+esc(x.vue.lieuNom(m.lieu))+'</dd><dt>'+esc(L(x,'horaire','Horaire'))+'</dt><dd data-sv-id="mission:'+esc(id)+':horaire">'+esc(dateLongue(m.date))+(m.debut?' · '+esc(heure(m.debut)):'')+(m.duree?' · '+esc(m.duree):'')+'</dd><dt>'+esc(L(x,'responsable','Responsable'))+'</dt><dd data-sv-id="mission:'+esc(id)+':responsable">'+esc(x.vue.nom(m.responsable))+'</dd>'+(m.coordinateur?'<dt>'+esc(L(x,'coordination','Sur place'))+'</dt><dd>'+esc(x.vue.nom(m.coordinateur))+'</dd>':'')+((m.affectes||[]).length&&M.etapes.organiser?'<dt>'+esc(L(x,'affectes','Réalisé par'))+'</dt><dd>'+esc(m.affectes.map(x.vue.nom).join(', '))+'</dd>':'')+'</dl>';
  h+='<ol class="v-rail" aria-label="'+esc(L(x,'parcours','Étapes de la mission'))+'">'+E.map(function(e,i){return'<li class="'+(i<M.rang?'fait':i===M.rang?'ici':'')+(M.etapes[e]?'':' ferme')+'"'+(i===M.rang?' aria-current="step"':'')+'>'+esc(lab[e]||EL[e])+'</li>'}).join('')+'</ol>';
  var B=function(act,p,label,primaire){var d=act==='edit'?A.edit:A[act]||{allow:false,rule:'mission.'+act,reason:'non évaluée'};p.mission=id;var k='act:'+id+':'+act+(p.tache?':'+p.tache:p.candidature?':'+p.candidature:'');
   if(!d.allow)return'<button type="button" class="v-btn" hidden disabled data-act="'+act+'" data-sv-id="'+esc(k)+'" data-regle="'+esc(d.rule)+'" data-refus="'+esc(d.reason)+'">'+esc(label)+'</button>';
   return'<button type="button" class="v-btn'+(primaire?' v-btn-p':'')+'" data-act="'+act+'" data-p="'+esc(JSON.stringify(p))+'" data-sv-id="'+esc(k)+'" data-regle="'+esc(d.rule)+'"'+(primaire?' data-orb="'+esc(label)+'"':'')+'>'+esc(label)+'</button>'};
  /* l'étape ouverte : l'étape en cours si la personne la voit, sinon la dernière étape qui la concerne */
  var ouv=-1;E.forEach(function(e,i){if(M.etapes[e]&&i<=M.rang)ouv=i});
  var blocs=E.map(function(e,i){if(!M.etapes[e]||i>M.rang)return'';var c='',ici=i===M.rang,ouvert=i===ouv&&M.rang<E.length;
   if(e==='decouvrir')c='<p>'+esc(m.description)+'</p><dl class="v-champs"><dt>'+esc(L(x,'competences','Compétences'))+'</dt><dd>'+esc((m.competences||[]).join(', '))+'</dd><dt>'+esc(L(x,'conditions','Conditions'))+'</dt><dd>'+esc(m.conditions)+'</dd><dt>'+esc(L(x,'remuneration','Rémunération'))+'</dt><dd>'+esc(m.remuneration)+'</dd><dt>'+esc(L(x,'postes','Postes'))+'</dt><dd>'+esc(m.postes)+'</dd></dl>'+(ici||m.etape==='candidater'?'<div class="v-btns">'+B('apply',{},L(x,'candidater','Candidater'),true)+'</div>':'');
   if(e==='candidater'){var cs=M.candidatures;c=cs.length?'<ul class="v-cand">'+cs.map(function(k){return'<li data-sv-id="candidature:'+esc(k.id)+'"><b>'+esc(x.vue.nom(k.personne))+'</b><em class="v-etat">'+esc((L(x,'candidatures',{}))[k.statut]||k.statut)+'</em><span>'+esc(k.message)+(k.proposition?' · '+esc(k.proposition):'')+'</span>'+(ici&&k.statut==='deposee'?'<div class="v-btns">'+B('shortlist',{candidature:k.id},L(x,'proposer','Proposer pour validation'),true)+'</div>':'')+'</li>'}).join('')+'</ul>':'<p class="v-masque">'+esc(L(x,'aucuneCandidature','Aucune candidature visible pour vous.'))+'</p>';
    if(M.cachees)c+='<p class="v-masque">'+M.cachees+' '+esc(L(x,'candidaturesPrivees','candidature(s) d\'autres personnes, privée(s).'))+'</p>'}
   if(e==='valider'){var pr=M.candidatures.filter(function(k){return k.statut==='proposee'||k.statut==='retenue'})[0];c=pr?'<p><b>'+esc(x.vue.nom(pr.personne))+'</b> · '+esc((L(x,'candidatures',{}))[pr.statut]||pr.statut)+'</p>':'<p class="v-masque">'+esc(L(x,'enValidation','Une candidature est en cours de validation.'))+'</p>';if(ici)c+='<div class="v-btns">'+B('validate',{},L(x,'valider','Valider'),true)+B('reject',{},L(x,'refuser','Renvoyer'))+'</div>'}
   if(e==='organiser'){if(M.logistique){var o=m.organisation||{};c='<dl class="v-champs"><dt>'+esc(L(x,'arrivee','Arrivée'))+'</dt><dd data-sv-id="mission:'+esc(id)+':arrivee">'+esc(heure(avant(m.debut,30)))+' · '+esc(x.vue.lieuNom(m.lieu))+'</dd><dt>'+esc(L(x,'acces','Accès'))+'</dt><dd>'+esc(o.acces)+'</dd><dt>'+esc(L(x,'consignes','Consignes'))+'</dt><dd>'+esc(o.consignes)+'</dd><dt>'+esc(L(x,'contact','Contact sur place'))+'</dt><dd>'+esc(x.vue.nom(m.coordinateur))+(x.vue.contactsVisibles&&x.vue.personneComplete(m.coordinateur)?' · '+esc(x.vue.personneComplete(m.coordinateur).contact):'')+'</dd><dt>'+esc(L(x,'confirmation','Confirmation'))+'</dt><dd data-sv-id="mission:'+esc(id)+':confirmation">'+esc(m.confirme?L(x,'confirme','confirmée par le prestataire'):L(x,'aConfirmer','à confirmer par le prestataire'))+'</dd></dl>'}
    if(ici)c+='<div class="v-btns">'+B('confirm',{},L(x,'confirmer','Confirmer horaire et accès'),true)+B('start',{},L(x,'demarrer','Démarrer la mission'),true)+'</div>'}
   if(e==='realiser'){c='<ul class="v-taches">'+M.taches.map(function(t){var d=A.task;return'<li data-sv-id="tache:'+esc(t.id)+'" class="'+(t.fait?'fait':'')+'">'+(ici&&d.allow?'<button type="button" class="v-coche" role="checkbox" aria-checked="'+!!t.fait+'" data-act="task" data-p="'+esc(JSON.stringify({mission:id,tache:t.id}))+'" data-sv-id="act:'+esc(id)+':task:'+esc(t.id)+'" data-regle="'+esc(d.rule)+'"'+(t.fait?'':' data-orb="'+esc(t.titre)+'"')+'><span aria-hidden="true"></span>'+esc(t.titre)+'</button>':'<span class="v-coche-l" aria-hidden="true"></span><span>'+esc(t.titre)+'</span>')+'</li>'}).join('')+'</ul>';if(ici)c+='<div class="v-btns">'+B('finish',{},L(x,'terminer','Déclarer terminé'),true)+'</div>'}
   if(e==='cloturer'){c='<p>'+esc(m.etape==='close'?L(x,'cloturee','Mission clôturée.'):L(x,'aCloturer','Réalisation terminée, en attente de clôture.'))+'</p>';if(ici)c+='<div class="v-btns">'+B('close',{},L(x,'cloturer','Clôturer la mission'),true)+'</div>'}
   /* l'étape en cours est ouverte ; les étapes passées se replient pour garder une lecture simple */
   if(ouvert)return'<div class="v-mi-e ici" data-sv-id="mission:'+esc(id)+':etape:'+e+'"><h4>'+esc(lab[e]||EL[e])+'</h4>'+c+'</div>';
   return'<details class="v-mi-e" data-sv-id="mission:'+esc(id)+':etape:'+e+'"><summary><h4>'+esc(lab[e]||EL[e])+'</h4><span>'+esc(L(x,'fait','fait'))+'</span></summary>'+c+'</details>'}).join('');
  h+=blocs;
  /* modifier une fois : le lieu, l'horaire, le responsable ; toutes les vues relisent le même objet */
  if(A.edit.allow||A.reassign.allow){var hs=[];for(var t=6*60;t<=20*60;t+=30)hs.push(('0'+Math.floor(t/60)).slice(-2)+':'+('0'+t%60).slice(-2));
   h+='<div class="v-mi-ed" data-sv-id="mission:'+esc(id)+':modifier"><h4>'+esc(L(x,'modifier','Modifier une fois, partout'))+'</h4>'+(A.edit.allow?'<label>'+esc(L(x,'lieu','Lieu'))+' <select data-act="move" data-k="lieu" data-p="'+esc(JSON.stringify({mission:id}))+'" data-regle="'+esc(A.edit.rule)+'">'+(x.contenu.lieux||[]).map(function(l){return'<option value="'+esc(l.id)+'"'+(l.id===m.lieu?' selected':'')+'>'+esc(l.nom)+'</option>'}).join('')+'</select></label><label>'+esc(L(x,'horaire','Horaire'))+' <select data-act="reschedule" data-k="debut" data-p="'+esc(JSON.stringify({mission:id}))+'" data-regle="'+esc(A.edit.rule)+'">'+hs.map(function(v){return'<option value="'+v+'"'+(v===m.debut?' selected':'')+'>'+esc(heure(v))+'</option>'}).join('')+'</select></label>':'')+
    (A.reassign.allow?'<label>'+esc(L(x,'responsable','Responsable'))+' <select data-act="reassign" data-k="responsable" data-p="'+esc(JSON.stringify({mission:id}))+'" data-regle="'+esc(A.reassign.rule)+'">'+x.vue.membresOrganisation().map(function(p){return'<option value="'+esc(p.id)+'"'+(p.id===m.responsable?' selected':'')+'>'+esc(p.nom)+'</option>'}).join('')+'</select></label>':'')+'</div>'}
  return h+'</div>'}},
 missions:{cartes:function(x,s){var ls=x.vue.missions(s.filtre||'toutes').filter(function(o){return(x.dossiers||[]).indexOf(o.m.id)<0});if(!ls.length)return s.vide?'<p class="v-masque">'+esc(s.vide)+'</p>':'';var st=L(x,'statuts',{}),li=L(x,'liens',{});
  return'<ul class="v-mis">'+ls.map(function(o){var m=o.m,d=o.candidater;return'<li data-sv-id="mission:'+esc(m.id)+':carte"><span class="v-k">'+esc(m.categorie)+'</span><em class="v-etat e-'+esc(o.statut)+'">'+esc(st[o.statut]||o.statut)+'</em><b>'+esc(m.titre)+'</b><span>'+esc(x.vue.lieuNom(m.lieu))+' · '+esc(dateLongue(m.date))+(m.debut?' · '+esc(heure(m.debut)):'')+'</span><span class="v-tags"><i>'+esc(m.nature==='contribution'?L(x,'benevole','Bénévole'):L(x,'remuneree','Rémunérée'))+'</i>'+(m.reglementee?'<i class="reg">'+esc(L(x,'reglementee','Réglementée'))+'</i>':'')+(o.lien?'<i class="moi">'+esc(li[o.lien]||o.lien)+'</i>':'')+'</span>'+(s.candidater&&d.allow?'<div class="v-btns"><button type="button" class="v-btn" data-act="apply" data-p="'+esc(JSON.stringify({mission:m.id}))+'" data-sv-id="act:'+esc(m.id)+':apply" data-regle="'+esc(d.rule)+'">'+esc(L(x,'candidater','Candidater'))+'</button></div>':'')+'</li>'}).join('')+'</ul>'}},
 actions:{boutons:function(x,s){var a=x.vue.actions(s.liste);if(!a.autorisees.length)return'';return'<div class="v-btns">'+a.autorisees.map(function(b){return'<button type="button" class="v-btn" data-demo title="'+esc(b.regle)+'">'+esc(b.label)+(b.confirmation?' · confirmation requise':'')+'</button>'}).join('')+'</div>'+(a.refusees?'<p class="v-masque">'+a.refusees+' action'+(a.refusees>1?'s':'')+' réservée'+(a.refusees>1?'s':'')+' à d\'autres rôles.</p>':'')}}
};

/* ---------- 4 · assemblage selon la composition du modèle ---------- */
var LIB={compte:'Compte à rebours',hero:'Accueil'};
function rendre(o){var contenu=o.contenu,modele=o.modele,pres=o.presentation||{},angle=o.perspective;
 var amb=pres.ambiance||{c1:'#2F4A36',c2:'#C7D9B7',paper:'#F3F1E8',ink:'#1F2E23'};
 var vue=politique(contenu,o.acces||{},angle,o.regles,o.flux||null);
 var x={contenu:contenu,vue:vue,angle:angle,amb:amb,modele:modele,libelles:o.libelles||{},flux:o.flux||null,
  /* une mission déjà présentée en détail n'est pas répétée dans les listes de la même perspective */
  dossiers:(angle.sections||[]).filter(function(s){return s.type==='mission'&&s.ref}).map(function(s){return s.ref})};
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

/* ---------- 5 · espaces de travail : le même moteur, pour des pages qui ne sont pas des événements ----------
   composer({ contenu, perspective, modele, presentation }) → { html, css, titre, bilan }
     contenu      { espace:{kicker,nom,sous,actions[]}, blocs:{<source>:données}, illustrations:{<clé>:svg produit par un moteur AIME} }
     perspective  { id, sections:[{ type, titre, source, ... }] }  l'ordre et le choix des blocs (aucune donnée, aucun droit)
     modele       { id, nom, composition:{ entete, variantes } }   la forme
     presentation { ambiance:{c1,c2,paper,ink}, polices }          les couleurs et les polices
   Les composants ne lisent que leur source ; les interactions (boutons data-action) sont branchées par la page. */
function act(a){if(!a)return'';var c='e-btn'+(a.principal?' e-p':'');if(a.action)return'<button type="button" class="'+c+'" data-action="'+esc(a.action)+'"'+(a.valeur!=null?' data-valeur="'+esc(a.valeur)+'"':'')+'>'+esc(a.libelle)+'</button>';
 return'<a class="'+c+'" href="'+esc(a.lien)+'">'+esc(a.libelle)+'</a>'}
function acts(l){return l&&l.length?'<div class="e-acts">'+l.map(act).join('')+'</div>':''}
function jour(t){if(!t)return'';var d=new Date(t);return isNaN(d)?'':d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear()}
var CE={
 entete:{sobre:function(x){var e=x.contenu.espace||{};return'<header class="e-entete" data-sv="entete" data-sv-label="'+esc(e.nom)+'">'+(e.kicker?'<span class="e-k">'+esc(e.kicker)+'</span>':'')+'<h1>'+esc(e.nom)+(e.accent?' <span class="e-acc">'+esc(e.accent)+'</span>':'')+'</h1>'+(e.sous?'<p>'+esc(e.sous)+'</p>':'')+acts(e.actions)+'</header>'}},
 tuile:{defaut:function(x,s){var d=x.contenu.blocs[s.source];if(!d)return'';var il=d.illustration&&x.contenu.illustrations?x.contenu.illustrations[d.illustration]:'';
  return'<div class="e-tuile'+(il?'':' e-sans')+'">'+(il?'<div class="e-ill" aria-hidden="true">'+il+'</div>':'')+'<div><h3>'+esc(d.titre)+'</h3>'+(d.texte?'<p>'+esc(d.texte)+'</p>':'')+acts(d.actions)+'</div></div>'}},
 liste:{cartes:function(x,s){var d=x.contenu.blocs[s.source]||{};var l=d.elements||[];if(!l.length)return d.vide?'<p class="e-vide">'+esc(d.vide)+'</p>':'';
  return'<ul class="e-liste">'+l.map(function(p){return'<li'+(p.demo?' class="e-demo"':'')+'><a href="'+esc(p.lien)+'"><span class="e-src">'+esc(p.groupe||'')+(p.demo?' · fictif':'')+'</span><b>'+esc(p.titre)+'</b><span>'+esc(p.detail||'')+(p.quand?' · '+esc(jour(p.quand)):'')+'</span><em>'+esc(p.action||'Ouvrir')+' →</em></a></li>'}).join('')+'</ul>'}},
 groupes:{defaut:function(x,s){var d=x.contenu.blocs[s.source]||{};var g=(d.groupes||[]).filter(function(g){return g.elements.length});if(!g.length)return d.vide?'<div class="e-vide">'+esc(d.vide)+acts(d.actions)+'</div>':'';
  return'<div class="e-groupes">'+g.map(function(g){return'<div class="e-groupe"><h3>'+esc(g.nom)+' <small>'+g.elements.length+'</small></h3><ul>'+g.elements.map(function(p){return'<li><a href="'+esc(p.lien)+'"><b>'+esc(p.titre)+'</b><span>'+esc(p.detail||'')+(p.quand?' · '+esc(jour(p.quand)):'')+'</span></a></li>'}).join('')+'</ul></div>'}).join('')+'</div>'}},
 outils:{defaut:function(x,s){var d=x.contenu.blocs[s.source]||{};var l=d.elements||[];if(!l.length)return'';var st=d.statuts||{};
  return'<ul class="e-outils">'+l.map(function(o){return'<li><a href="'+esc(o.href)+'"><b>'+esc(o.nom)+'</b><span>'+esc(o.phrase)+'</span>'+(o.statut&&o.statut!=='disponible'?'<em class="e-st e-st-'+esc(o.statut)+'">'+esc(st[o.statut]||o.statut)+'</em>':'')+(o.note?'<i>'+esc(o.note)+'</i>':'')+'</a></li>'}).join('')+'</ul>'}},
 dossiers:{defaut:function(x,s){var d=x.contenu.blocs[s.source]||{};var l=d.dossiers||[];if(!l.length)return'';var st=d.statuts||{};
  var nb=function(n,u,p){return n+' '+(n>1?p:u)};
  var ic=function(o){return'<span class="e-dos-i" aria-hidden="true"><i class="e-dos-dos"></i><i class="e-dos-feuille"></i><i class="e-dos-face">'+(o.elements.length?'<small>'+o.elements.length+'</small>':'')+'</i></span>'};
  var grille='<ul class="e-dossiers">'+l.map(function(o){var t=o.teinte||['#7C5CFF','#22D3EE'];return'<li><button type="button" class="e-dos'+(o.elements.length?'':' e-dos-vide')+'" data-dossier="'+esc(o.id)+'" aria-expanded="false" aria-controls="dos-'+esc(o.id)+'" style="--t1:'+esc(t[0])+';--t2:'+esc(t[1])+'">'+ic(o)+'<b>'+esc(o.nom)+'</b><span>'+esc(o.sous||nb(o.elements.length,'élément','éléments'))+'</span></button></li>'}).join('')+'</ul>';
  var fen=l.map(function(o){var t=o.teinte||['#7C5CFF','#22D3EE'];return'<div class="e-fen" id="dos-'+esc(o.id)+'" role="region" aria-label="'+esc(o.nom)+'" hidden style="--t1:'+esc(t[0])+';--t2:'+esc(t[1])+'"><div class="e-fen-barre"><span class="e-pts" aria-hidden="true"><i></i><i></i><i></i></span><b>'+esc(o.nom)+'</b><button type="button" class="e-fermer" data-fermer>Fermer</button></div>'+
   (o.elements.length?'<ul class="e-fichiers">'+o.elements.map(function(p){return'<li'+(p.demo?' class="e-demo"':'')+'><a href="'+esc(p.lien||p.href)+'"><span class="e-fic-i" aria-hidden="true"></span><b>'+esc(p.titre||p.nom)+'</b><span>'+esc(p.detail||p.phrase||'')+(p.quand?' · '+esc(jour(p.quand)):'')+'</span>'+(p.statut&&p.statut!=='disponible'?'<em class="e-st e-st-'+esc(p.statut)+'">'+esc(st[p.statut]||p.statut)+'</em>':'')+(p.note?'<i>'+esc(p.note)+'</i>':'')+'<u>'+esc(p.action||'Ouvrir')+' →</u></a></li>'}).join('')+'</ul>':'<p class="e-vide">'+esc(o.vide||'Ce dossier est vide.')+'</p>')+
   (o.ouvrir?'<div class="e-acts">'+act(o.ouvrir)+'</div>':'')+'</div>'}).join('');
  return'<div class="e-bureau">'+grille+fen+'</div>'}},
 note:{defaut:function(x,s){var d=x.contenu.blocs[s.source];if(!d)return'';return'<div class="e-note">'+(d.paragraphes||[]).map(function(t){return'<p>'+esc(t)+'</p>'}).join('')+(d.liste&&d.liste.length?'<ul>'+d.liste.map(function(t){return'<li>'+esc(t)+'</li>'}).join('')+'</ul>':'')+acts(d.actions)+'</div>'}}};
function composer(o){var contenu=o.contenu,modele=o.modele||{},pres=o.presentation||{},angle=o.perspective||{sections:[]};
 var amb=pres.ambiance||{c1:'#7C5CFF',c2:'#22D3EE',paper:'#0F0F14',ink:'#EDEDF0'};contenu.blocs=contenu.blocs||{};
 var x={contenu:contenu,angle:angle,amb:amb,modele:modele},comp=modele.composition||{},vari=comp.variantes||{};
 var pick=function(t){var v=CE[t];if(!v)return null;return v[vari[t]]||v.defaut||v[Object.keys(v)[0]]};
 var corps='',n=0,vus=[];
 (angle.sections||[]).forEach(function(s){var f=pick(s.type);if(!f)return;var inner=f(x,s);if(!inner)return;n++;vus.push(s.source||s.type);
  corps+='<section class="e-sec e-s-'+esc(s.type)+'" id="'+esc(s.ancre||s.source||s.type)+'" data-sv="sec-'+esc(s.source||s.type)+'" data-sv-label="'+esc(s.titre||s.type)+'"'+(s.titre?' aria-labelledby="t-'+esc(s.source||s.type)+'"':'')+'>'+(s.titre?'<h2 id="t-'+esc(s.source||s.type)+'">'+esc(s.titre)+'</h2>':'')+(s.intro?'<p class="e-intro">'+esc(s.intro)+'</p>':'')+inner+'</section>'});
 var ent=(CE.entete[comp.entete]||CE.entete.sobre)(x);
 var p=pres.polices||{};
 return{html:'<div class="e e-'+esc(modele.id||'espace')+'" data-modele="'+esc(modele.id||'')+'" data-angle="'+esc(angle.id||'')+'">'+ent+'<main class="e-main">'+corps+'</main></div>',
  css:':root{--c1:'+amb.c1+';--c2:'+amb.c2+';--paper:'+amb.paper+';--ink:'+amb.ink+';--ft:'+(p.titre||'Georgia, serif')+';--fb:'+(p.texte||'system-ui, sans-serif')+'}',
  titre:(contenu.espace||{}).nom||'',bilan:{sections:n,blocs:vus}}}


/* ---------- 6 · sites entiers : le générateur de site (AIMEVitrine.site, alias AIMESite) ----------
AIME · générateur de site : le moteur partagé, pour des sites entiers.
      Même mécanisme que les pages d'événements (vitrine/rendu.js) et le Bureau, couches jamais mélangées :
        données       le site (format « aime-site ») : infos écrites UNE fois, listes (programme, FAQ, personnes…), pages
        modèles       vitrine/modeles/sites.json : des compositions de départ par univers (aucun contenu réel)
        présentation  vitrine/presentation/studio.json : 36 ambiances et 10 typographies d'AIME Studio
        perspectives  vitrine/perspectives/sites.json : public, invite, organisation (identifiants). Une perspective CHOISIT ce qui s'affiche ;
                      elle ne protège rien : un site exporté est public, tout ce qui y est écrit peut être lu.
      Une info saisie une fois se propage : la date des infos nourrit l'en-tête, le compte à rebours, le lieu, le programme.
   
      AIMESite.vide(univers) · migrer(s) · BLOCS (catalogue, avec champs et variantes) · ajouterSection(site, page, type)
      AIMESite.document(site, {page, perspective, presentation, edition, export}) → { html, titre, bilan }
      AIMESite.exporter(site, opts) → [{ chemin, contenu }]   un fichier HTML autonome par page */
var SITE=(function(V){'use strict';
var SCHEMA=1;
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(p){return(p||'s')+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)}
function copie(o){return JSON.parse(JSON.stringify(o))}
var MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function dateLongue(d){if(!d)return'';var p=String(d).split('-');if(p.length<3)return d;return(+p[2])+' '+MOIS[(+p[1])-1]+' '+p[0]}
/* un lien n'accepte que http(s), mailto, tel, une ancre ou un chemin relatif ; jamais javascript: ni data: */
function lien(u){u=String(u||'').trim();if(!u)return'';if(/^(https?:|mailto:|tel:|#|\/(?!\/)|\.\/|[\w-]+\.html)/i.test(u))return u;if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u))return'https://'+u;return''}
/* une image : une URL https ou une image importée (data:image/…) */
function img(u){u=String(u||'');return/^https:\/\//.test(u)||/^data:image\/(png|jpe?g|webp|gif);base64,/.test(u)?u:''}
function slug(t){return String(t||'page').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'page'}

/* ---------- couleurs : contraste WCAG pour le texte posé sur une couleur ---------- */
function rgb(h){h=String(h||'#000').replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');return[0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16)||0})}
function lum(h){return rgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce(function(a,v,i){return a+v*[.2126,.7152,.0722][i]},0)}
function contraste(a,b){var x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function surCouleur(fond,a,b){return contraste(fond,a)>=contraste(fond,b)?a:b}

/* ---------- les données ---------- */
var LISTES={programme:['heure','titre','detail'],faq:['q','r'],personnes:['nom','role'],galerie:['src','legende'],documents:['titre','lien'],cadeaux:['titre','detail','lien'],hebergements:['nom','detail','lien'],menu:['plat','detail'],tarifs:['nom','prix','detail'],chiffres:['valeur','libelle'],etapes:['date','titre','detail'],liens:['nom','url'],partenaires:['nom','url']};
function vide(univers){var l={};Object.keys(LISTES).forEach(function(k){l[k]=[]});
 return{format:'aime-site',schema:SCHEMA,id:uid('site-'),nom:'Mon site',univers:univers||'vierge',modele:null,creeLe:null,majLe:null,
  infos:{titre:'',sous:'',date:'',heure:'',lieu:'',adresse:'',ville:'',acces:'',email:'',tel:'',url:'',bouton:''},listes:l,
  pages:[{id:'index',titre:'Accueil',sections:[]}],presentation:{ambiance:'minimal',typo:null,rayon:null,densite:'aere'}}}
function migrer(s){if(!s||s.format!=='aime-site')return null;var v=vide(s.univers);for(var k in v)if(s[k]==null)s[k]=v[k];for(var i in v.infos)if(s.infos[i]==null)s.infos[i]='';for(var l in LISTES)if(!Array.isArray(s.listes[l]))s.listes[l]=[];
 if(!Array.isArray(s.pages)||!s.pages.length)s.pages=v.pages;s.pages.forEach(function(p){if(!Array.isArray(p.sections))p.sections=[];p.sections.forEach(function(x){if(!x.id)x.id=uid('x');if(x.pour&&!x.audience){x.audience=x.pour.length===1&&x.pour[0]==='organisation'?'organisation':'public'}delete x.pour;if(!AUDIENCES[x.audience])x.audience='public'})});s.schema=SCHEMA;return s}

/* ---------- le catalogue : chaque bloc dit ce qu'il lit, ses variantes et ses champs propres ---------- */
var CATS={structure:'Structure',texte:'Texte',medias:'Images et vidéo',evenement:'Événement',personnes:'Personnes et contact',pro:'Activité'};
var BLOCS={};
function bloc(id,o){o.id=id;BLOCS[id]=o}
function titreSec(s,d){return s.titre!=null&&s.titre!==''?s.titre:d}
function h2(s,d){var t=titreSec(s,d);return t?'<h2>'+esc(t)+'</h2>':''}
function intro(s){return s.texte?'<p class="s-intro">'+esc(s.texte)+'</p>':''}
function vide_(x,s,msg){return x.edition?'<p class="s-vide">'+esc(msg)+'</p>':''}
function decor(x,ratio,g){var a=x.amb;return V&&V.visuel?V.visuel(g||((x.site.id||'').length*7+3),{c1:a.c1,c2:a.c2,paper:a.fond,ink:a.encre},ratio||1.6):''}

bloc('hero',{nom:'En-tête',cat:'structure',variantes:{plein:'Image pleine page',scinde:'Image à côté',affiche:'Affiche',minimal:'Typographique'},champs:['titre','texte'],
 rendre:function(x,s){var i=x.infos,t=titreSec(s,i.titre||x.site.nom),sous=s.texte||i.sous,quand=[dateLongue(i.date),i.heure,i.lieu||i.ville].filter(Boolean).join(' · '),photo=img((x.listes.galerie[0]||{}).src);
  var vis=photo?'<img src="'+esc(photo)+'" alt="">':decor(x,s.variante==='scinde'?1:1.7);
  var cta=i.bouton?'<a class="btn" href="'+esc(lien(i.url)||(x.ancre('rsvp')||x.ancre('contact')||'#'))+'">'+esc(i.bouton)+'</a>':'';
  return'<header class="hero hero-'+esc(s.variante||'plein')+'">'+(s.variante==='minimal'?'':'<div class="hero-v">'+vis+'</div>')+'<div class="hero-t"><h1>'+esc(t)+'</h1>'+(sous?'<p class="hero-s">'+esc(sous)+'</p>':'')+(quand?'<p class="hero-q">'+esc(quand)+'</p>':'')+cta+'</div></header>'}});
bloc('texte',{nom:'Paragraphe',cat:'texte',variantes:{simple:'Simple',colonnes:'Deux colonnes',lettrine:'Lettrine'},champs:['titre','texte'],
 rendre:function(x,s){if(!s.texte&&!s.titre)return vide_(x,s,'Écrivez un titre et un texte dans les réglages de la section.');return h2(s,'')+'<div class="texte texte-'+esc(s.variante||'simple')+'">'+String(s.texte||'').split(/\n{2,}/).map(function(p){return'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>'}).join('')+'</div>'}});
bloc('citation',{nom:'Citation',cat:'texte',variantes:{grande:'Grande',encadree:'Encadrée'},champs:['texte','auteur'],
 rendre:function(x,s){if(!s.texte)return vide_(x,s,'Écrivez la citation (et son auteur) dans les réglages.');return'<blockquote class="cit cit-'+esc(s.variante||'grande')+'"><p>'+esc(s.texte)+'</p>'+(s.auteur?'<cite>'+esc(s.auteur)+'</cite>':'')+'</blockquote>'}});
bloc('bouton',{nom:'Bouton',cat:'texte',variantes:{centre:'Centré',large:'Bandeau'},champs:['titre','texte','url'],
 rendre:function(x,s){var u=lien(s.url)||lien(x.infos.url);if(!s.titre||!u)return vide_(x,s,'Donnez un libellé et une adresse au bouton.');return'<div class="cta cta-'+esc(s.variante||'centre')+'">'+(s.texte?'<p>'+esc(s.texte)+'</p>':'')+'<a class="btn" href="'+esc(u)+'">'+esc(s.titre)+'</a></div>'}});
bloc('separateur',{nom:'Séparateur',cat:'texte',variantes:{onde:'Onde',ligne:'Ligne',points:'Trois points'},champs:[],
 rendre:function(x,s){var v=s.variante||'onde';return'<div class="sep sep-'+esc(v)+'" aria-hidden="true">'+(v==='onde'?'<svg viewBox="0 0 600 24" preserveAspectRatio="none"><path d="M0 12 Q 75 0 150 12 T 300 12 T 450 12 T 600 12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>':v==='points'?'<i></i><i></i><i></i>':'')+'</div>'}});
bloc('galerie',{nom:'Galerie',cat:'medias',source:'galerie',variantes:{grille:'Grille',mosaique:'Mosaïque',bande:'Bande défilante'},champs:['titre'],
 rendre:function(x,s){var l=x.listes.galerie.filter(function(g){return img(g.src)});if(!l.length)return vide_(x,s,'Ajoutez des photos dans « Contenu › Galerie ».');
  return h2(s,'Galerie')+'<ul class="gal gal-'+esc(s.variante||'grille')+'">'+l.map(function(g){return'<li><figure><img src="'+esc(img(g.src))+'" alt="'+esc(g.legende||'')+'" loading="lazy">'+(g.legende?'<figcaption>'+esc(g.legende)+'</figcaption>':'')+'</figure></li>'}).join('')+'</ul>'}});
bloc('image',{nom:'Image',cat:'medias',variantes:{large:'Pleine largeur',encadree:'Encadrée'},champs:['src','texte'],
 rendre:function(x,s){var u=img(s.src);return'<figure class="imgb imgb-'+esc(s.variante||'large')+'">'+(u?'<img src="'+esc(u)+'" alt="'+esc(s.texte||'')+'" loading="lazy">':decor(x,2.2,(s.id||'').length*11))+(s.texte?'<figcaption>'+esc(s.texte)+'</figcaption>':'')+'</figure>'}});
bloc('video',{nom:'Vidéo',cat:'medias',variantes:{carte:'Carte'},champs:['titre','url'],
 rendre:function(x,s){var u=lien(s.url);if(!u)return vide_(x,s,'Collez l\'adresse de la vidéo (YouTube, Vimeo…).');return h2(s,'')+'<a class="vid" href="'+esc(u)+'" rel="noopener"><span class="vid-v">'+decor(x,1.78,9)+'<i aria-hidden="true">▶</i></span><span>Regarder la vidéo</span></a>'}});
bloc('compte',{nom:'Compte à rebours',cat:'evenement',variantes:{grand:'Grand',sobre:'Sobre'},champs:['titre'],
 rendre:function(x,s){var d=x.infos.date;if(!d)return vide_(x,s,'Indiquez une date dans « Contenu › Infos » : le compte à rebours la suit.');
  return'<div class="compte compte-'+esc(s.variante||'grand')+'" data-compte="'+esc(d+'T'+(x.infos.heure||'12:00'))+'">'+(s.titre?'<p class="compte-t">'+esc(s.titre)+'</p>':'')+'<div class="compte-n"><span><b data-j>–</b>jours</span><span><b data-h>–</b>heures</span><span><b data-m>–</b>minutes</span></div><p class="compte-d">'+esc(dateLongue(d))+'</p></div>'}});
bloc('programme',{nom:'Programme',cat:'evenement',source:'programme',variantes:{liste:'Liste',frise:'Frise'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.programme;if(!l.length)return vide_(x,s,'Ajoutez les moments dans « Contenu › Programme ».');
  return h2(s,'Programme')+intro(s)+'<ol class="prog prog-'+esc(s.variante||'liste')+'">'+l.map(function(m){return'<li><time>'+esc(m.heure||'')+'</time><div><b>'+esc(m.titre)+'</b>'+(m.detail?'<span>'+esc(m.detail)+'</span>':'')+'</div></li>'}).join('')+'</ol>'}});
bloc('lieu',{nom:'Lieu',cat:'evenement',variantes:{carte:'Avec plan',sobre:'Sobre'},champs:['titre'],
 rendre:function(x,s){var i=x.infos;if(!i.lieu&&!i.adresse&&!i.ville)return vide_(x,s,'Indiquez le lieu dans « Contenu › Infos ».');var q=[i.lieu,i.adresse,i.ville].filter(Boolean).join(', '),osm='https://www.openstreetmap.org/search?query='+encodeURIComponent(q);
  return h2(s,'Le lieu')+'<div class="lieu lieu-'+esc(s.variante||'carte')+'"><div><h3>'+esc(i.lieu||i.ville)+'</h3>'+(i.adresse||i.ville?'<p>'+esc([i.adresse,i.ville].filter(Boolean).join(', '))+'</p>':'')+(i.acces?'<p class="lieu-a">'+esc(i.acces)+'</p>':'')+'<a class="lien" href="'+esc(osm)+'" rel="noopener">Voir le plan →</a></div>'+(s.variante==='sobre'?'':'<div class="lieu-v" aria-hidden="true">'+decor(x,1.3,21)+'<i></i></div>')+'</div>'}});
bloc('rsvp',{nom:'Réponse (RSVP)',cat:'evenement',variantes:{formulaire:'Formulaire'},champs:['titre','texte'],
 rendre:function(x,s){var m=x.infos.email;if(!m)return vide_(x,s,'Indiquez un e-mail dans « Contenu › Infos » : les réponses y seront envoyées par la messagerie de la personne qui répond.');
  return h2(s,'Votre réponse')+intro(s)+'<form class="rsvp" data-rsvp="'+esc(m)+'" data-objet="'+esc('Réponse · '+(x.infos.titre||x.site.nom))+'"><label>Nom<input name="nom" autocomplete="name" required></label><fieldset><legend>Présence</legend><label><input type="radio" name="p" value="Présent·e" checked> Présent·e</label><label><input type="radio" name="p" value="Absent·e"> Absent·e</label></fieldset><label>Nombre de personnes<input name="n" type="number" min="1" value="1"></label><label>Un mot, un régime particulier<textarea name="mot" rows="3"></textarea></label><button class="btn" type="submit">Envoyer ma réponse</button><p class="rsvp-n">Votre messagerie s\'ouvre avec la réponse prête : rien n\'est envoyé sans vous. Destinataire : '+esc(m)+'</p></form>'}});
bloc('hebergement',{nom:'Hébergement',cat:'evenement',source:'hebergements',variantes:{cartes:'Cartes'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.hebergements;if(!l.length)return vide_(x,s,'Ajoutez des hébergements dans « Contenu ».');return h2(s,'Où dormir')+intro(s)+'<ul class="cartes">'+l.map(function(h){var u=lien(h.lien);return'<li><b>'+esc(h.nom)+'</b>'+(h.detail?'<span>'+esc(h.detail)+'</span>':'')+(u?'<a class="lien" href="'+esc(u)+'" rel="noopener">Réserver →</a>':'')+'</li>'}).join('')+'</ul>'}});
bloc('menu',{nom:'Menu',cat:'evenement',source:'menu',variantes:{carte:'Carte'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.menu;if(!l.length)return vide_(x,s,'Ajoutez les plats dans « Contenu › Menu ».');return h2(s,'Le menu')+intro(s)+'<ul class="menu">'+l.map(function(m){return'<li><b>'+esc(m.plat)+'</b>'+(m.detail?'<span>'+esc(m.detail)+'</span>':'')+'</li>'}).join('')+'</ul>'}});
bloc('cadeaux',{nom:'Liste de cadeaux',cat:'evenement',source:'cadeaux',variantes:{cartes:'Cartes'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.cadeaux;if(!l.length)return vide_(x,s,'Ajoutez des idées ou un lien de cagnotte dans « Contenu › Cadeaux ».');return h2(s,'Cadeaux')+intro(s)+'<ul class="cartes">'+l.map(function(c){var u=lien(c.lien);return'<li><b>'+esc(c.titre)+'</b>'+(c.detail?'<span>'+esc(c.detail)+'</span>':'')+(u?'<a class="lien" href="'+esc(u)+'" rel="noopener">Voir →</a>':'')+'</li>'}).join('')+'</ul>'}});
bloc('faq',{nom:'Questions',cat:'evenement',source:'faq',variantes:{accordeon:'Accordéon',liste:'Liste'},champs:['titre'],
 rendre:function(x,s){var l=x.listes.faq;if(!l.length)return vide_(x,s,'Ajoutez des questions dans « Contenu › Questions ».');return h2(s,'Questions')+(s.variante==='liste'?'<dl class="faq-l">'+l.map(function(f){return'<dt>'+esc(f.q)+'</dt><dd>'+esc(f.r)+'</dd>'}).join('')+'</dl>':'<div class="faq">'+l.map(function(f){return'<details><summary>'+esc(f.q)+'</summary><p>'+esc(f.r)+'</p></details>'}).join('')+'</div>')}});
bloc('personnes',{nom:'Personnes',cat:'personnes',source:'personnes',variantes:{grille:'Grille',liste:'Liste'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.personnes;if(!l.length)return vide_(x,s,'Ajoutez des personnes dans « Contenu › Personnes ».');return h2(s,'L\'équipe')+intro(s)+'<ul class="pers pers-'+esc(s.variante||'grille')+'">'+l.map(function(p){return'<li><i aria-hidden="true">'+esc(String(p.nom||'?').trim().charAt(0).toUpperCase())+'</i><b>'+esc(p.nom)+'</b>'+(p.role?'<span>'+esc(p.role)+'</span>':'')+'</li>'}).join('')+'</ul>'}});
bloc('contact',{nom:'Contact',cat:'personnes',variantes:{carte:'Carte',bandeau:'Bandeau'},champs:['titre','texte'],
 rendre:function(x,s){var i=x.infos;if(!i.email&&!i.tel&&!i.adresse)return vide_(x,s,'Indiquez un e-mail, un téléphone ou une adresse dans « Contenu › Infos ».');
  return h2(s,'Contact')+intro(s)+'<div class="contact contact-'+esc(s.variante||'carte')+'">'+(i.email?'<p><span>E-mail</span><a href="mailto:'+esc(i.email)+'">'+esc(i.email)+'</a></p>':'')+(i.tel?'<p><span>Téléphone</span><a href="tel:'+esc(i.tel.replace(/\s/g,''))+'">'+esc(i.tel)+'</a></p>':'')+(i.adresse||i.ville?'<p><span>Adresse</span>'+esc([i.lieu,i.adresse,i.ville].filter(Boolean).join(', '))+'</p>':'')+'</div>'}});
bloc('liens',{nom:'Réseaux et liens',cat:'personnes',source:'liens',variantes:{pastilles:'Pastilles'},champs:['titre'],
 rendre:function(x,s){var l=x.listes.liens.filter(function(k){return lien(k.url)});if(!l.length)return vide_(x,s,'Ajoutez vos liens dans « Contenu › Liens ».');return h2(s,'')+'<ul class="liens">'+l.map(function(k){return'<li><a href="'+esc(lien(k.url))+'" rel="noopener">'+esc(k.nom||k.url)+'</a></li>'}).join('')+'</ul>'}});
bloc('tarifs',{nom:'Tarifs',cat:'pro',source:'tarifs',variantes:{colonnes:'Colonnes',liste:'Liste'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.tarifs;if(!l.length)return vide_(x,s,'Ajoutez vos offres dans « Contenu › Tarifs ».');return h2(s,'Tarifs')+intro(s)+'<ul class="tarifs tarifs-'+esc(s.variante||'colonnes')+'">'+l.map(function(t){return'<li><b>'+esc(t.nom)+'</b><strong>'+esc(t.prix)+'</strong>'+(t.detail?'<span>'+esc(t.detail)+'</span>':'')+'</li>'}).join('')+'</ul>'}});
bloc('chiffres',{nom:'Chiffres',cat:'pro',source:'chiffres',variantes:{bande:'Bande'},champs:['titre'],
 rendre:function(x,s){var l=x.listes.chiffres;if(!l.length)return vide_(x,s,'Ajoutez vos chiffres (réels) dans « Contenu › Chiffres ».');return h2(s,'')+'<ul class="chiffres">'+l.map(function(c){return'<li><b>'+esc(c.valeur)+'</b><span>'+esc(c.libelle)+'</span></li>'}).join('')+'</ul>'}});
bloc('etapes',{nom:'Chronologie',cat:'pro',source:'etapes',variantes:{verticale:'Verticale'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.etapes;if(!l.length)return vide_(x,s,'Ajoutez des étapes dans « Contenu › Chronologie ».');return h2(s,'Notre histoire')+intro(s)+'<ol class="etapes">'+l.map(function(e){return'<li><time>'+esc(e.date)+'</time><b>'+esc(e.titre)+'</b>'+(e.detail?'<span>'+esc(e.detail)+'</span>':'')+'</li>'}).join('')+'</ol>'}});
bloc('partenaires',{nom:'Partenaires',cat:'pro',source:'partenaires',variantes:{noms:'Noms'},champs:['titre'],
 rendre:function(x,s){var l=x.listes.partenaires;if(!l.length)return vide_(x,s,'Ajoutez vos partenaires dans « Contenu › Partenaires ».');return h2(s,'Partenaires')+'<ul class="parts">'+l.map(function(p){var u=lien(p.url);return'<li>'+(u?'<a href="'+esc(u)+'" rel="noopener">'+esc(p.nom)+'</a>':esc(p.nom))+'</li>'}).join('')+'</ul>'}});
bloc('documents',{nom:'Documents',cat:'pro',source:'documents',variantes:{liste:'Liste'},champs:['titre','texte'],
 rendre:function(x,s){var l=x.listes.documents.filter(function(d){return lien(d.lien)});if(!l.length)return vide_(x,s,'Ajoutez des documents (avec leur lien) dans « Contenu › Documents ».');return h2(s,'Documents')+intro(s)+'<ul class="docs">'+l.map(function(d){return'<li><a href="'+esc(lien(d.lien))+'" rel="noopener"><i aria-hidden="true"></i>'+esc(d.titre||d.lien)+'</a></li>'}).join('')+'</ul>'}});
var CHAMPS={titre:'Titre de la section',texte:'Texte',auteur:'Auteur',url:'Adresse (https://…)',src:'Image (adresse https ou importée)'};

/* ---------- les modèles : des compositions de départ ---------- */
function ajouterSection(site,pageId,type,apres){var p=site.pages.filter(function(q){return q.id===pageId})[0]||site.pages[0],b=BLOCS[type];if(!b)throw new Error('bloc inconnu : '+type);
 var s={id:uid('x'),type:type,variante:Object.keys(b.variantes)[0],audience:'public'};var i=apres==null?p.sections.length:p.sections.map(function(x){return x.id}).indexOf(apres)+1;p.sections.splice(i,0,s);return s}
function appliquerModele(site,m){var s=copie(site);s.modele=m.id;s.univers=m.univers||s.univers;if(m.ambiance)s.presentation.ambiance=m.ambiance;
 s.pages=m.pages.map(function(p){return{id:p.id||slug(p.titre),titre:p.titre,sections:p.sections.map(function(t){var o=typeof t==='string'?{type:t}:copie(t);o.id=uid('x');if(!o.variante)o.variante=Object.keys(BLOCS[o.type].variantes)[0];if(o.pour&&!o.audience)o.audience=o.pour.length===1&&o.pour[0]==='organisation'?'organisation':'public';delete o.pour;if(!o.audience)o.audience='public';return o})}});
 if(m.exemple){Object.keys(m.exemple.infos||{}).forEach(function(k){if(!s.infos[k])s.infos[k]=m.exemple.infos[k]});Object.keys(m.exemple.listes||{}).forEach(function(k){if(!s.listes[k].length)s.listes[k]=copie(m.exemple.listes[k])})}return s}

/* ---------- la présentation ---------- */
function presentation(site,P){P=P||{};var a=(P.ambiances||[]).filter(function(x){return x.id===site.presentation.ambiance})[0]||{c1:'#111111',c2:'#D9D9D2',fond:'#FAFAF7',encre:'#111111',typo:'minimal',rayon:6},t=(P.typographies||{})[site.presentation.typo||a.typo]||{titre:'Georgia, serif',texte:'system-ui, sans-serif',graisse:700,casse:'none',interligne:1,approche:'-.01em'};
 return{a:a,t:t,rayon:site.presentation.rayon!=null?site.presentation.rayon:a.rayon,fonts:P.googleFonts||''}}
function css(pr,dense){var a=pr.a,t=pr.t,surC1=surCouleur(a.c1,a.fond,a.encre),r=Math.max(0,Math.min(40,+pr.rayon||0)),g=dense==='compact'?.7:1;
 return':root{--c1:'+a.c1+';--c2:'+a.c2+';--fond:'+a.fond+';--encre:'+a.encre+';--sur1:'+surC1+';--ft:'+t.titre+';--fb:'+t.texte+';--fw:'+t.graisse+';--tt:'+t.casse+';--lh:'+t.interligne+';--ls:'+t.approche+';--r:'+r+'px;--esp:'+g+'}'+
 '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--fond);color:var(--encre);font:17px/1.6 var(--fb);-webkit-font-smoothing:antialiased;overflow-x:hidden}img,svg{max-width:100%;display:block}a{color:inherit}'+
 'h1,h2,h3{font-family:var(--ft);font-weight:var(--fw);text-transform:var(--tt);line-height:var(--lh);letter-spacing:var(--ls);text-wrap:balance;margin:0}h2{font-size:clamp(30px,4.6vw,52px);margin-bottom:calc(22px*var(--esp))}h3{font-size:22px}'+
 '.nav{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px max(20px,4vw);background:color-mix(in srgb,var(--fond) 88%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid color-mix(in srgb,var(--encre) 10%,transparent)}.nav b{font-family:var(--ft);font-weight:var(--fw);text-transform:var(--tt);font-size:18px}.nav ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin:0;padding:0;font-size:15px}.nav a{text-decoration:none}.nav a[aria-current]{text-decoration:underline;text-underline-offset:5px}'+
 'main>section{padding:calc(72px*var(--esp)) max(20px,6vw)}main>section>*{max-width:1080px;margin-left:auto;margin-right:auto}main>section:nth-child(even of .bande){background:color-mix(in srgb,var(--c2) 22%,var(--fond))}.s-intro{max-width:62ch;margin:-8px 0 26px;opacity:.82}'+
 '.btn{display:inline-block;background:var(--c1);color:var(--sur1);text-decoration:none;font:600 16px var(--fb);border:0;border-radius:max(6px,var(--r));padding:14px 24px;cursor:pointer}.lien{font-weight:600;text-decoration:underline;text-underline-offset:4px}'+
 '.hero{display:grid;min-height:min(86vh,820px);position:relative}.hero-v{position:absolute;inset:0;overflow:hidden}.hero-v>*{width:100%;height:100%;object-fit:cover}.hero-v svg{width:100%;height:100%}.hero-t{position:relative;align-self:end;padding:clamp(28px,6vw,80px) max(20px,6vw);display:grid;gap:12px;justify-items:start}.hero h1{font-size:clamp(46px,9vw,124px)}.hero-s{font-size:clamp(18px,2.2vw,24px);margin:0;max-width:40ch}.hero-q{margin:0;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-size:14px}'+
 '.hero-plein .hero-t{color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.35)}.hero-plein::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(0,0,0,.55))}.hero-plein .hero-t{z-index:1}'+
 '.hero-scinde{grid-template-columns:1fr 1fr;align-items:stretch}.hero-scinde .hero-v{position:relative;order:2}.hero-scinde .hero-t{align-self:center}@media (max-width:760px){.hero-scinde{grid-template-columns:1fr}.hero-scinde .hero-v{min-height:46vh;order:0}}'+
 '.hero-affiche{min-height:auto;padding:max(20px,5vw)}.hero-affiche .hero-v{position:relative;border-radius:var(--r);aspect-ratio:16/8;max-height:60vh}.hero-affiche .hero-t{padding:28px 0 0;justify-items:center;text-align:center}'+
 '.hero-minimal{min-height:70vh;place-items:center;text-align:center}.hero-minimal .hero-t{align-self:center;justify-items:center}'+
 '.texte p{max-width:66ch;margin:0 0 1em}.texte-colonnes{columns:2 320px;column-gap:48px}.texte-colonnes p{max-width:none}.texte-lettrine p:first-child::first-letter{float:left;font:var(--fw) 4.2em/.8 var(--ft);padding:6px 10px 0 0;color:var(--c1)}'+
 '.cit{margin:0;text-align:center}.cit p{font:var(--fw) clamp(26px,4vw,44px)/1.2 var(--ft);margin:0 auto;max-width:28ch}.cit cite{display:block;margin-top:16px;font-style:normal;opacity:.75}.cit-encadree{border:1px solid color-mix(in srgb,var(--encre) 18%,transparent);border-radius:var(--r);padding:clamp(24px,5vw,56px)}'+
 '.cta{text-align:center;display:grid;gap:14px;justify-items:center}.cta-large{background:var(--c1);color:var(--sur1);border-radius:var(--r);padding:clamp(28px,5vw,60px)}.cta-large .btn{background:var(--sur1);color:var(--c1)}'+
 '.sep{display:flex;justify-content:center;gap:14px;color:var(--c1);padding:0}.sep svg{width:min(600px,80%);height:24px}.sep-ligne{border-top:1px solid color-mix(in srgb,var(--encre) 16%,transparent)}.sep-points i{width:7px;height:7px;border-radius:50%;background:currentColor}'+
 '.gal{list-style:none;padding:0;margin:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}.gal figure{margin:0}.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r)}.gal figcaption{font-size:14px;opacity:.75;margin-top:6px}.gal-mosaique li:nth-child(3n+1){grid-row:span 2}.gal-mosaique img{height:100%}.gal-bande{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.gal-bande li{flex:0 0 min(78%,420px);scroll-snap-align:start}'+
 '.imgb{margin:0}.imgb img,.imgb svg{width:100%;border-radius:var(--r)}.imgb-encadree{padding:14px;border:1px solid color-mix(in srgb,var(--encre) 14%,transparent);border-radius:calc(var(--r) + 8px)}.imgb figcaption{font-size:14px;opacity:.75;margin-top:8px;text-align:center}'+
 '.vid{display:grid;gap:10px;text-decoration:none;font-weight:600}.vid-v{position:relative;display:block;border-radius:var(--r);overflow:hidden;aspect-ratio:16/9}.vid-v svg{width:100%;height:100%}.vid-v i{position:absolute;inset:0;margin:auto;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:var(--c1);color:var(--sur1);font-style:normal;font-size:24px}'+
 '.compte{text-align:center}.compte-t{font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:14px}.compte-n{display:flex;justify-content:center;gap:clamp(18px,5vw,56px)}.compte-n span{display:grid;font-size:14px;opacity:.85}.compte-n b{font:var(--fw) clamp(48px,9vw,110px)/1 var(--ft);color:var(--c1);opacity:1}.compte-sobre b{font-size:clamp(34px,5vw,56px)}.compte-d{opacity:.75}'+
 '.prog{list-style:none;margin:0;padding:0;display:grid;gap:0}.prog li{display:grid;grid-template-columns:90px 1fr;gap:18px;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--encre) 12%,transparent)}.prog time{font-weight:700;color:var(--c1)}.prog span{display:block;opacity:.78}.prog-frise{grid-auto-flow:column;grid-auto-columns:minmax(180px,1fr);overflow-x:auto;border-top:2px solid var(--c1)}.prog-frise li{grid-template-columns:1fr;border:0;padding:16px 16px 0 0}'+
 '.lieu{display:grid;grid-template-columns:1fr 1.2fr;gap:32px;align-items:center}.lieu-sobre{grid-template-columns:1fr}.lieu p{margin:6px 0}.lieu-a{opacity:.78}.lieu-v{position:relative;border-radius:var(--r);overflow:hidden;aspect-ratio:4/3}.lieu-v svg{width:100%;height:100%}.lieu-v i{position:absolute;left:50%;top:46%;width:26px;height:26px;border-radius:50% 50% 50% 0;background:var(--c1);transform:translate(-50%,-50%) rotate(-45deg);box-shadow:0 0 0 6px color-mix(in srgb,var(--c1) 30%,transparent)}@media (max-width:760px){.lieu{grid-template-columns:1fr}}'+
 '.rsvp{display:grid;gap:14px;max-width:560px}.rsvp label{display:grid;gap:6px;font-weight:600}.rsvp fieldset{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:16px}.rsvp legend{font-weight:600;margin-bottom:6px}.rsvp fieldset label{display:flex;font-weight:400;gap:8px}.rsvp input,.rsvp textarea{font:inherit;padding:12px;border-radius:max(4px,calc(var(--r)/2));border:1px solid color-mix(in srgb,var(--encre) 25%,transparent);background:var(--fond);color:var(--encre)}.rsvp-n{font-size:13.5px;opacity:.72}'+
 '.cartes,.menu,.pers,.tarifs,.chiffres,.etapes,.liens,.parts,.docs{list-style:none;margin:0;padding:0}.cartes{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.cartes li{display:grid;gap:6px;border:1px solid color-mix(in srgb,var(--encre) 14%,transparent);border-radius:var(--r);padding:18px}.cartes span{opacity:.78}'+
 '.menu{display:grid;gap:18px;text-align:center}.menu b{font:var(--fw) 22px var(--ft);display:block}.menu span{opacity:.75}'+
 '.faq details{border-bottom:1px solid color-mix(in srgb,var(--encre) 14%,transparent);padding:14px 0}.faq summary{cursor:pointer;font-weight:600;font-size:18px}.faq p{margin:10px 0 0;opacity:.85}.faq-l dt{font-weight:700;margin-top:18px}.faq-l dd{margin:4px 0 0;opacity:.85}'+
 '.pers-grille{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}.pers li{display:grid;justify-items:center;text-align:center;gap:4px}.pers i{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;font:var(--fw) 32px var(--ft);font-style:normal;background:var(--c2);color:var(--encre)}.pers span{opacity:.75;font-size:15px}.pers-liste li{grid-template-columns:48px 1fr;justify-items:start;text-align:left;align-items:center}.pers-liste i{width:48px;height:48px;font-size:18px;grid-row:span 2}'+
 '.contact{display:grid;gap:10px;font-size:18px}.contact p{margin:0;display:grid}.contact span{font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.65}.contact-bandeau{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));background:color-mix(in srgb,var(--c2) 30%,var(--fond));border-radius:var(--r);padding:28px}'+
 '.liens{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.liens a{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:8px 16px;text-decoration:none}'+
 '.tarifs-colonnes{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.tarifs li{display:grid;gap:6px;border:1px solid color-mix(in srgb,var(--encre) 14%,transparent);border-radius:var(--r);padding:22px}.tarifs strong{font:var(--fw) 34px var(--ft);color:var(--c1)}.tarifs span{opacity:.78}.tarifs-liste li{grid-template-columns:1fr auto;border-width:0 0 1px;border-radius:0}'+
 '.chiffres{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));text-align:center}.chiffres b{display:block;font:var(--fw) clamp(40px,6vw,64px)/1 var(--ft);color:var(--c1)}.chiffres span{opacity:.8}'+
 '.etapes{border-left:2px solid var(--c1);padding-left:24px;display:grid;gap:22px}.etapes li{position:relative;display:grid;gap:2px}.etapes li::before{content:"";position:absolute;left:-31px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--c1)}.etapes time{font-weight:700;color:var(--c1)}.etapes span{opacity:.78}'+
 '.parts{display:flex;flex-wrap:wrap;gap:12px 34px;justify-content:center;font:var(--fw) 20px var(--ft);opacity:.85}.parts a{text-decoration:none}'+
 '.docs{display:grid;gap:8px}.docs a{display:flex;gap:12px;align-items:center;text-decoration:none;border:1px solid color-mix(in srgb,var(--encre) 14%,transparent);border-radius:var(--r);padding:14px 16px;font-weight:600}.docs i{width:22px;height:28px;border-radius:3px 9px 3px 3px;background:var(--c2)}'+
 '.s-vide{border:1px dashed color-mix(in srgb,var(--encre) 30%,transparent);border-radius:var(--r);padding:18px;opacity:.7;font-size:15px}'+
 'footer.pied{padding:36px max(20px,6vw);text-align:center;font-size:14px;opacity:.7;border-top:1px solid color-mix(in srgb,var(--encre) 10%,transparent)}'+
 '[data-sec].sel{outline:2px solid var(--c1);outline-offset:-2px}.aud-m{display:inline-block;margin:0 0 12px!important;font:600 11px var(--fb);letter-spacing:.08em;text-transform:uppercase;color:#7A4B00;background:#FDE7B0;border-radius:999px;padding:3px 10px}'+
 '@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}'}

var SCRIPT="(function(){function pad(n){return n<10?'0'+n:n}document.querySelectorAll('[data-compte]').forEach(function(c){var t=new Date(c.getAttribute('data-compte')).getTime();function f(){var d=Math.max(0,t-Date.now());c.querySelector('[data-j]').textContent=Math.floor(d/864e5);c.querySelector('[data-h]').textContent=pad(Math.floor(d/36e5)%24);c.querySelector('[data-m]').textContent=pad(Math.floor(d/6e4)%60)}f();setInterval(f,30000)});"+
 "document.querySelectorAll('[data-rsvp]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f),corps='Nom : '+(d.get('nom')||'')+'\\nPrésence : '+(d.get('p')||'')+'\\nPersonnes : '+(d.get('n')||'')+'\\nMot : '+(d.get('mot')||'');location.href='mailto:'+f.getAttribute('data-rsvp')+'?subject='+encodeURIComponent(f.getAttribute('data-objet'))+'&body='+encodeURIComponent(corps)})})})();";

/* ---------- l'assemblage d'une page ---------- */
/* ---------- qui voit quoi : les mêmes règles que les espaces partagés (synchroview/permissions.js, « item.read ») ----------
   audience d'une section ou d'une ligne : public · membres (tout rôle de l'espace) · equipe (organisation et prestataires) · organisation.
   vue : { role } d'une identité membre de l'espace, ou null pour une personne sans compte (public seulement).
   Dans le navigateur, c'est un APERÇU : en ligne, ces mêmes règles seront appliquées par le serveur, qui ne transmettra pas
   ce qu'une personne n'a pas le droit de voir. Un fichier exporté, lui, est public : on n'exporte que la vue publique par défaut. */
var AUDIENCES={public:'Tout le monde',membres:'Les membres de l\'espace',equipe:'L\'équipe',organisation:'L\'organisation'};
var ROLES_LOC={public:{public:1,membres:1,equipe:1,organisation:1},membres:{owner:1,editor:1,contributor:1,viewer:1,guest:1},equipe:{owner:1,editor:1,contributor:1},organisation:{owner:1,editor:1}};
function voit(vue,aud,regles){aud=aud||'public';if(aud==='public')return{ok:true};if(!vue||!vue.role)return{ok:false,raison:'réservé aux membres de l\'espace : une personne sans compte ne le voit pas'};
 if(regles&&regles.can){var d=regles.can({id:vue.id||'apercu',role:vue.role},'read',{type:'item',audience:aud});return{ok:!!d.allow,raison:d.reason||d.rule}}
 var t=ROLES_LOC[aud];return t&&t[vue.role]?{ok:true}:{ok:false,raison:'réservé : '+AUDIENCES[aud]}}
var COMPAT={public:null,invite:{role:'guest'},organisation:{role:'owner'}};
function document_(site,o){o=o||{};var pr=presentation(site,o.presentation),page=site.pages.filter(function(p){return p.id===o.page})[0]||site.pages[0];
 var vue=o.vue!==undefined?o.vue:(o.perspective?COMPAT[o.perspective]:null),masq=[],lm=0;
 var visibles=function(p){return p.sections.filter(function(s){var v=voit(vue,s.audience,o.regles);if(!v.ok)masq.push({id:s.id,nom:(BLOCS[s.type]||{}).nom||s.type,titre:s.titre||'',audience:s.audience,raison:v.raison});return v.ok})};
 var L={};Object.keys(site.listes).forEach(function(k){L[k]=(site.listes[k]||[]).filter(function(r){var v=voit(vue,r&&r.audience,o.regles);if(!v.ok)lm++;return v.ok})});
 var fichier=function(p){return o.unePage?'#'+p.id:(p.id==='index'?'index.html':p.id+'.html')};
 var toutes=o.unePage?site.pages:[page],vis={},ancres={};toutes.forEach(function(p){vis[p.id]=visibles(p);vis[p.id].forEach(function(s){if(!ancres[s.type])ancres[s.type]='#'+s.id})});
 var x={site:site,infos:site.infos,listes:L,amb:pr.a,edition:!!o.edition,vue:vue,ancre:function(t){return ancres[t]||''}};
 var n=0,corps=toutes.map(function(p){return(o.unePage&&p.id!=='index'?'<span id="'+esc(p.id)+'"></span>':'')+vis[p.id].map(function(s){var b=BLOCS[s.type];if(!b)return'';var h=b.rendre(x,s);if(!h)return'';n++;
  var aud=s.audience&&s.audience!=='public'?' aud aud-'+esc(s.audience):'',sv=' data-sv="'+esc(s.id)+'" data-sv-label="'+esc(s.titre||b.nom)+'"'+(o.edition?' data-sec="'+esc(s.id)+'"':'');
  return s.type==='hero'?'<div id="'+esc(s.id)+'"'+sv+'>'+h+'</div>':'<section id="'+esc(s.id)+'" class="s-'+esc(s.type)+(['texte','citation','compte','faq','tarifs','personnes'].indexOf(s.type)>=0?' bande':'')+aud+'"'+sv+'>'+(o.edition&&aud?'<p class="aud-m">'+esc(AUDIENCES[s.audience])+'</p>':'')+h+'</section>'}).join('')}).join('');
 var nav=site.pages.length>1?'<nav class="nav" aria-label="Pages"><b>'+esc(site.infos.titre||site.nom)+'</b><ul>'+site.pages.map(function(p){return'<li><a href="'+esc(fichier(p))+'"'+(!o.unePage&&p.id===page.id?' aria-current="page"':'')+'>'+esc(p.titre)+'</a></li>'}).join('')+'</ul></nav>':'';
 var titre=(page.id==='index'||o.unePage?'':page.titre+' · ')+(site.infos.titre||site.nom);
 var html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(titre)+'</title>'+(site.infos.sous?'<meta name="description" content="'+esc(site.infos.sous)+'">':'')+
  (pr.fonts?'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="'+esc(pr.fonts)+'">':'')+'<style>'+css(pr,site.presentation.densite)+'</style></head><body>'+nav+'<main>'+corps+'</main><footer class="pied"><p>'+esc(site.infos.titre||site.nom)+(site.infos.date?' · '+esc(dateLongue(site.infos.date)):'')+'</p><p>Fait avec AIME</p></footer><script>'+SCRIPT+'</'+'script>'+(o.pont?'<script src="'+esc(o.pont)+'"></'+'script>':'')+'</body></html>';
 return{html:html,titre:titre,bilan:{sections:n,page:page.id,vue:vue,masquees:masq,lignesMasquees:lm}}}
function exporter(site,o){o=o||{};if(o.unePage)return[{chemin:'index.html',contenu:document_(site,{presentation:o.presentation,unePage:true,perspective:o.perspective}).html}];
 return site.pages.map(function(p){return{chemin:p.id==='index'?'index.html':p.id+'.html',contenu:document_(site,{presentation:o.presentation,page:p.id,perspective:o.perspective}).html}})}

/* ---------- partir d'un démonstrateur (vitrine/donnees/*.json) : les mêmes faits, devenus un site éditable ----------
   Rien n'est inventé : chaque champ vient des données du démonstrateur (fictives et dites comme telles). Les moments non
   publics deviennent des lignes « équipe » ; les échéances, des lignes « membres » ; les accès restent ceux des règles. */
function depuisVitrine(d,o){o=o||{};var e=d.evenement||{},s=vide(e.univers||'vierge'),lx={};(d.lieux||[]).forEach(function(l){lx[l.id]=l});
 var lieu=typeof e.lieu==='object'&&e.lieu?e.lieu:(lx[e.lieu]||{});s.nom=(e.nom||'Démonstrateur')+' · démonstrateur';s.modele='vitrine:'+(e.univers||'');
 s.infos.titre=e.nom||'';s.infos.sous=[e.sousTitre||e.accroche,'(démonstrateur, données fictives)'].filter(Boolean).join(' ');s.infos.date=e.date||'';s.infos.lieu=lieu.nom||'';s.infos.adresse=lieu.adresse||'';s.infos.ville=e.ville||lieu.ville||'';s.infos.acces=lieu.acces||'';s.infos.bouton='Répondre';
 s.listes.programme=(d.moments||[]).map(function(m){return{heure:m.debut||'',titre:m.titre||'',detail:(lx[m.espace]||{}).nom||m.espace||'',audience:m.public===false?'equipe':'public'}});
 var hote=((d.personnes||[])[0]||{}).groupe;/* les hôtes (le groupe de la première personne) sont publics ; les autres, pour les membres */
 s.listes.personnes=(d.personnes||[]).map(function(p){return{nom:p.nom,role:p.fonction||'',audience:p.groupe===hote?'public':'membres'}});
 s.listes.faq=(d.faq||[]).map(function(f){return{q:f.q,r:f.r}});
 s.listes.hebergements=(d.hebergements||d.transports||[]).map(function(h){return{nom:h.nom,detail:[h.distance,h.note].filter(Boolean).join(' · '),lien:''}});
 s.listes.menu=((d.menu&&d.menu.plats)||[]).map(function(m){return{plat:m.libelle,detail:m.texte}});
 if(d.cadeaux)s.listes.cadeaux=[].concat(d.cadeaux).map(function(c){return{titre:c.titre,detail:c.detail||'',lien:''}});
 s.listes.etapes=(d.echeances||[]).map(function(x){return{date:x.date,titre:x.titre,detail:'',audience:'membres'}});
 var sec=function(t,o2){return Object.assign({type:t},o2||{})};
 s.pages=[{id:'index',titre:'Accueil',sections:[sec('hero',{variante:'plein'}),sec('compte'),sec('personnes',{titre:'Qui est là'})]},
  {id:'programme',titre:'Programme',sections:[sec('programme',{texte:'Les moments réservés à l\'équipe n\'apparaissent qu\'à l\'équipe.'}),sec('lieu'),sec('menu')]},
  {id:'pratique',titre:'Infos pratiques',sections:[sec('hebergement'),sec('etapes',{titre:'Les échéances',audience:'membres'}),sec('cadeaux'),sec('faq')]},
  {id:'organisation',titre:'Organisation',sections:[sec('texte',{titre:'Note d\'organisation',texte:'Page réservée à l\'organisation : un exemple de ce que les règles retirent pour les autres vues.',audience:'organisation'})]},
  {id:'reponse',titre:'Répondre',sections:[sec('rsvp'),sec('contact')]}].map(function(p){p.sections=p.sections.map(function(x){x.id=uid('x');if(!x.variante)x.variante=Object.keys(BLOCS[x.type].variantes)[0];if(!x.audience)x.audience='public';return x});return p});
 s.presentation.ambiance=o.ambiance||'minimal';return s}

return{AUDIENCES:AUDIENCES,voit:voit,depuisVitrine:depuisVitrine,SCHEMA:SCHEMA,LISTES:LISTES,CATS:CATS,BLOCS:BLOCS,CHAMPS:CHAMPS,vide:vide,migrer:migrer,ajouterSection:ajouterSection,appliquerModele:appliquerModele,
 document:document_,exporter:exporter,contraste:contraste,lien:lien,img:img,slug:slug,esc:esc,uid:uid};
})({visuel:visuel});

return{site:SITE,rendre:rendre,composer:composer,politique:politique,visuel:visuel,composants:Object.keys(C),composantsEspace:Object.keys(CE)};
});
