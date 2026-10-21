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
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEVitrine=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

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
 entete:{sobre:function(x){var e=x.contenu.espace||{};return'<header class="e-entete" data-sv="entete" data-sv-label="'+esc(e.nom)+'">'+(e.kicker?'<span class="e-k">'+esc(e.kicker)+'</span>':'')+'<h1>'+esc(e.nom)+'</h1>'+(e.sous?'<p>'+esc(e.sous)+'</p>':'')+acts(e.actions)+'</header>'}},
 tuile:{defaut:function(x,s){var d=x.contenu.blocs[s.source];if(!d)return'';var il=d.illustration&&x.contenu.illustrations?x.contenu.illustrations[d.illustration]:'';
  return'<div class="e-tuile'+(il?'':' e-sans')+'">'+(il?'<div class="e-ill" aria-hidden="true">'+il+'</div>':'')+'<div><h3>'+esc(d.titre)+'</h3>'+(d.texte?'<p>'+esc(d.texte)+'</p>':'')+acts(d.actions)+'</div></div>'}},
 liste:{cartes:function(x,s){var d=x.contenu.blocs[s.source]||{};var l=d.elements||[];if(!l.length)return d.vide?'<p class="e-vide">'+esc(d.vide)+'</p>':'';
  return'<ul class="e-liste">'+l.map(function(p){return'<li'+(p.demo?' class="e-demo"':'')+'><a href="'+esc(p.lien)+'"><span class="e-src">'+esc(p.groupe||'')+(p.demo?' · fictif':'')+'</span><b>'+esc(p.titre)+'</b><span>'+esc(p.detail||'')+(p.quand?' · '+esc(jour(p.quand)):'')+'</span><em>'+esc(p.action||'Ouvrir')+' →</em></a></li>'}).join('')+'</ul>'}},
 groupes:{defaut:function(x,s){var d=x.contenu.blocs[s.source]||{};var g=(d.groupes||[]).filter(function(g){return g.elements.length});if(!g.length)return d.vide?'<div class="e-vide">'+esc(d.vide)+acts(d.actions)+'</div>':'';
  return'<div class="e-groupes">'+g.map(function(g){return'<div class="e-groupe"><h3>'+esc(g.nom)+' <small>'+g.elements.length+'</small></h3><ul>'+g.elements.map(function(p){return'<li><a href="'+esc(p.lien)+'"><b>'+esc(p.titre)+'</b><span>'+esc(p.detail||'')+(p.quand?' · '+esc(jour(p.quand)):'')+'</span></a></li>'}).join('')+'</ul></div>'}).join('')+'</div>'}},
 outils:{defaut:function(x,s){var d=x.contenu.blocs[s.source]||{};var l=d.elements||[];if(!l.length)return'';var st=d.statuts||{};
  return'<ul class="e-outils">'+l.map(function(o){return'<li><a href="'+esc(o.href)+'"><b>'+esc(o.nom)+'</b><span>'+esc(o.phrase)+'</span>'+(o.statut&&o.statut!=='disponible'?'<em class="e-st e-st-'+esc(o.statut)+'">'+esc(st[o.statut]||o.statut)+'</em>':'')+(o.note?'<i>'+esc(o.note)+'</i>':'')+'</a></li>'}).join('')+'</ul>'}},
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

return{rendre:rendre,composer:composer,politique:politique,visuel:visuel,composants:Object.keys(C),composantsEspace:Object.keys(CE)};
});
