/* AIME · le cœur : un seul projet, N personnes, chacune son écran.
   Un SCÉNARIO (vitrine/scenarios/<u>.json) décrit les rôles d'un exemple : leur arrivée (ce que l'orbe recueille)
   et leur perspective. Le contenu, la couche d'accès et les perspectives restent ceux de la vitrine
   (vitrine/donnees, vitrine/acces, vitrine/perspectives) : le scénario ne contient AUCUNE donnée métier ni AUCUN droit.

   AIMECoeur.html(sc)     le balisage des chapitres (arrivées, écrans, droits, jour J s'il y en a un)
   AIMECoeur.monter(sc)   anime ce balisage : chorégraphie de l'orbe, écrans composés par AIMEVitrine.rendre,
                          tableau calculé par AIMEVitrine.politique + synchroview/permissions.js, journal du jour J
   AIMECoeur.projet(p)    le projet du visiteur (titre, date, lieu) prend la place de l'exemple

   Rien n'est écrit ni envoyé : tout reste dans la page. Fonctionne pour 2, 4, 5, 6 rôles ou plus. */
(function(root){'use strict';
var $=function(i){return document.getElementById(i)};
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
/* la typographie de la marque, la même dans chaque écran : titres en Cal Sans (comme les titres d'AIME), texte en Inter */
var FONTES='@font-face{font-family:"Cal Sans";font-weight:400 700;font-display:swap;src:url("/fonts/CalSans-latin.woff2") format("woff2")}'+
 '@font-face{font-family:"Cal Sans";font-weight:400 700;font-display:swap;src:url("/fonts/CalSans-latin-ext.woff2") format("woff2");unicode-range:U+0100-024F,U+1E00-1EFF}'+
 '@font-face{font-family:"Inter Variable";font-weight:100 900;font-display:swap;src:url("/fonts/InterVariable-latin.woff2") format("woff2-variations")}'+
 '@font-face{font-family:"Inter Variable";font-weight:100 900;font-display:swap;src:url("/fonts/InterVariable-latin-ext.woff2") format("woff2-variations");unicode-range:U+0100-024F,U+1E00-1EFF}';
var TITRE='"Cal Sans","Inter Variable",Inter,system-ui,sans-serif',TEXTE='"Inter Variable",Inter,system-ui,sans-serif';
var TITRES='h1,h2,h3,h4{font-family:'+TITRE+'!important;font-weight:400!important;font-style:normal!important;font-variation-settings:normal!important;letter-spacing:-.02em}body{font-family:'+TEXTE+'}';
var NOMBRES=['Zéro','Un','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf','Dix'];
function nombre(n){return NOMBRES[n]||String(n)}
var ROLE_FR={owner:'Propriétaire',editor:'Coordination',contributor:'Contribution',guest:'Invité',viewer:'Lecture seule'};
/* une ambiance sans couleur : les écrans restent dans la charte de la marque */
var AMB={nom:'AIME · monochrome',c1:'#26262B',c2:'#C9C9CF',paper:'#F4F4F2',ink:'#141416',source:'AIME'};
/* une couleur par rôle, prise dans l'orbe : chaque personne a la sienne, l'orbe les réunit toutes.
   c = la couleur, e = l'encre lisible dessus (contraste AA). Un scénario peut imposer la sienne (rôle.couleur). */
var COULEURS=[{c:'#FB7185',e:'#141416'},{c:'#F59E0B',e:'#141416'},{c:'#22D3EE',e:'#141416'},{c:'#6D4AFF',e:'#FFFFFF'},{c:'#34D399',e:'#141416'},{c:'#E879F9',e:'#141416'},{c:'#FDE68A',e:'#141416'},{c:'#93C5FD',e:'#141416'}];
var TEINTES=null;
function couleur(sc,i){var r=sc.roles[i]||{};if(r.couleur)return{c:r.couleur,e:r.encre||'#141416'};if(TEINTES&&TEINTES[i])return TEINTES[i];return COULEURS[i%COULEURS.length]}
/* une fois l'accès connu : la couleur du rôle technique (coeur/roles.js), la même que dans Live, Sites et Compte ;
   si deux personnes ont le même rôle dans l'exemple, la seconde prend une couleur libre de l'orbe */
function teintes(sc,acces){var R=root.AIMERoles,pris={};TEINTES=sc.roles.map(function(r){var t=R&&R.ROLES[(acces.membres||{})[r.qui]];if(t&&!pris[t.c]){pris[t.c]=1;return{c:t.c,e:t.e}}return null});
 TEINTES=TEINTES.map(function(k){if(k)return k;var libre=COULEURS.filter(function(x){return!pris[x.c]})[0]||COULEURS[0];pris[libre.c]=1;return libre})}

/* ================= le balisage ================= */
function fiche(f){var h='';(f||[]).forEach(function(b){h+='<p class="fiche-k">'+esc(b.k)+'</p>';
 if(b.phrase)h+='<p class="fiche-phrase">« '+esc(b.phrase)+' »</p>';
 if(b.chemins)h+='<ol class="fiche-chemins">'+b.chemins.map(function(c){return'<li><b>'+esc(c[0])+'</b><span>'+esc(c[1])+'</span></li>'}).join('')+'</ol>';
 if(b.liste)h+='<dl class="fiche-l">'+b.liste.map(function(l){return'<div><dt>'+esc(l[0])+'</dt><dd>'+esc(l[1])+'</dd></div>'}).join('')+'</dl>'});return h}
function html(sc,o){o=o||{};var N=sc.roles.length,n0=o.premier||1,num=function(k){var v=n0+k;return(v<10?'0':'')+v};
 var a='<div class="arrivees" id="arrivees">'+
  '<div class="cx-in arr-tete"><div class="cx-tete apparait"><p class="cx-n" aria-hidden="true">'+num(0)+'</p><h2 id="t-arrivees">'+esc(sc.arrivees||(nombre(N)+' arrivées, une seule mémoire.'))+'</h2><p>'+esc(sc.arriveesTexte||'Chacun arrive par son propre chemin. L\'orbe recueille ce qu\'il apporte, une seule fois, dans le même projet.')+'</p></div></div>'+
  sc.roles.map(function(r,i){var ar=r.arrivee||{},id='arr-'+r.angle,lg=ar.legende||[];
   return'<section class="sc" id="'+id+'" aria-labelledby="t-'+id+'"><div class="cx-in sc-in"><div class="sc-texte"><p class="sc-k">'+(i+1)+' / '+N+' · '+esc(r.nom)+'</p><h3 id="t-'+id+'">'+esc(ar.titre)+'</h3><p>'+esc(ar.texte)+'</p></div>'+
    '<figure class="fiche"><span class="ancre ancre-sc" data-orbe="1" aria-hidden="true"></span>'+fiche(ar.fiche)+(lg.length?'<figcaption>'+esc(lg[0])+' · <b>'+esc(lg[1])+'</b> '+esc(lg[2]||'')+'</figcaption>':'')+'</figure></div></section>'}).join('')+'</div>';
 var e='<section class="cx cx-ecrans" id="ecrans" aria-labelledby="t-ecrans"><div class="cx-in"><div class="cx-tete apparait"><p class="cx-n" aria-hidden="true">'+num(1)+'</p><h2 id="t-ecrans">'+esc(nombre(N))+' écrans, une seule source.</h2><p>L\'orbe compose une page pour chacun, à partir de tout ce qu\'elle a recueilli : '+esc(nombre(N).toLowerCase())+' vraies pages, composées à l\'instant par le moteur de pages. Faites défiler chaque écran.</p></div></div>'+
  '<section class="ecrans-scene" id="ecransScene" aria-label="L\'orbe compose un écran pour chacun"><div class="ecrans-collant"><div class="ecrans'+(N>6?' nombreux':'')+'" id="ecransGrille" role="list" aria-label="'+esc(sc.titre)+', vu par '+esc(nombre(N).toLowerCase())+' personnes" style="--n:'+N+'"><span class="ancre ancre-ecran" id="ancreEcran" data-orbe="1" aria-hidden="true"></span>'+
  sc.roles.map(function(r){return'<figure class="tel" role="listitem" data-angle="'+esc(r.angle)+'"><div class="tel-ecran"><span class="tel-attente" aria-hidden="true"></span><iframe title="Écran '+esc(r.de)+'" sandbox="allow-same-origin" loading="lazy" tabindex="0"></iframe></div><figcaption><b>'+esc(r.nom)+'</b><span>'+esc(r.resume||'')+'</span></figcaption></figure>'}).join('')+
  '</div><p class="ecrans-etat" id="ecransPas" aria-hidden="true"></p></div></section>'+
  '<div class="cx-in"><form class="source" id="source" aria-labelledby="t-source"><p class="source-t" id="t-source">Écrivez une fois, les '+esc(nombre(N).toLowerCase())+' écrans suivent</p><div class="source-champs">'+
  (sc.source&&sc.source.champs?sc.source.champs.map(function(c){return'<label>'+esc(c.label)+'<input id="src-'+esc(c.id)+'" type="'+esc(c.type||'text')+'"'+(c.min!=null?' min="'+c.min+'"':'')+(c.max!=null?' max="'+c.max+'"':'')+' autocomplete="off"></label>'}).join(''):
  '<label>'+esc((sc.source&&sc.source.titre)||'Le projet')+'<input id="srcTitre" type="text" maxlength="60" autocomplete="off"></label><label>La date<input id="srcDate" type="date"></label><label>Le lieu<input id="srcLieu" type="text" maxlength="80" autocomplete="off"></label>')+
  '<button type="button" class="source-r" id="srcRetour">Revenir à l\'exemple</button></div><p class="source-etat" id="srcEtat" role="status" aria-live="polite"></p></form>'+
  '<p class="cx-note" id="ecransEtat">Démonstration · données fictives ('+esc(sc.titre)+'). Rien n\'est enregistré ni envoyé.</p></div></section>';
 var d='<section class="cx" id="droits" aria-labelledby="t-droits"><div class="cx-in"><div class="cx-tete apparait"><p class="cx-n" aria-hidden="true">'+num(2)+'</p><h2 id="t-droits">Décidé avant l\'affichage.</h2><p>Ce qu\'un écran ne montre pas n\'est pas masqué : la page n\'est composée qu\'avec ce que les règles autorisent pour cette personne.</p></div>'+
  '<dl class="demo-cible"><div><dt>Ce que fait cette démonstration</dt><dd>'+esc(sc.demo||(sc.moteur?'Les écrans sont composés dans votre navigateur, à partir de données fictives, par les règles du prototype écrites pour cet exemple.':'Les écrans sont composés dans votre navigateur, à partir de données fictives, par les mêmes règles que le serveur.'))+'</dd></div><div><dt>L\'architecture visée</dt><dd>Dans un vrai projet, chaque écran est composé par le serveur : une donnée non autorisée n\'est jamais envoyée au navigateur.</dd></div></dl>'+
  '<div class="droits-cadre" tabindex="0" role="region" aria-label="Ce que chacun voit et peut faire"><table class="droits" style="--n:'+N+'"><caption class="sr">Ce que chacun voit et peut faire, calculé par les règles</caption><thead><tr id="droitsTete"><th scope="col"><span class="sr">Ce que chacun voit</span></th>'+
  sc.roles.map(function(r){return'<th scope="col">'+esc(r.nom)+'</th>'}).join('')+'</tr></thead><tbody id="droitsCorps"></tbody></table></div></div></section>';
 var j=sc.jourJ?'<section class="cx" id="jourj" aria-labelledby="t-jourj"><div class="cx-in"><div class="cx-tete apparait"><p class="cx-n" aria-hidden="true">'+num(3)+'</p><h2 id="t-jourj">'+esc(sc.jourJ.titre||'Le réel bouge, chacun le sait.')+'</h2><p>Un imprévu, un retard : on l\'écrit une fois au journal. Les écrans se recalent, chacun avec ce qui le concerne.</p></div>'+
  '<div class="gestes" id="jourGestes" role="group" aria-label="Faire bouger le jour J"><button type="button" class="geste-b" data-j="pluie" id="jourPluie" aria-pressed="false">'+esc(sc.jourJ.pluie)+'</button><button type="button" class="geste-b" data-j="retard">Retard de 25 minutes</button><button type="button" class="geste-b" data-j="annuler" id="jourAnnuler" disabled>Annuler le dernier geste</button></div>'+
  '<p class="cx-trace" id="jourTrace" role="status" aria-live="polite"></p><div class="jours" id="jourVues" style="--n:'+N+'"></div></div></section>':'';
 return a+e+d+j}

/* ================= le comportement ================= */
function monter(sc){
var Vit=root.AIMEVitrine,Perms=root.AIMEPerms,Live=root.AIMELive,Flux=root.AIMEFlux;
/* un moteur qui n'est pas une vitrine (G44, Stitch…) apporte son adaptateur : charger, page(rôle), droits(rôles) */
var AD=sc.moteur?(root.AIMECoeur.adaptateurs||{})[sc.moteur]:null,CH=sc.source&&sc.source.champs||null;
if(sc.moteur&&!AD)return null;
if((!AD&&(!Vit||!Perms))||!$('ecrans'))return null;
var ROLES=sc.roles,N=ROLES.length,J=sc.jourJ||null,S=null,journal=[],perso={},pret=false,minuterie=0;
function j(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
function angleDe(r){return S.ps.angles.filter(function(a){return a.id===r.angle})[0]}
function flux(){return S.base.missions&&Flux?Flux:null}

/* la source unique, puis ce que le jour J y change (journal rejoué, jamais une copie) */
function lieuDe(c){var l=c.evenement.lieu;if(l&&typeof l==='object')return l;return(c.lieux||[]).filter(function(x){return x.id===l})[0]||null}
function contenu(){var c=JSON.parse(JSON.stringify(S.base)),e=c.evenement;
 if(perso.titre)e.nom=perso.titre;if(perso.date)e.date=perso.date;
 if(perso.lieu){var l=lieuDe(c);if(l)l.nom=perso.lieu;else e.lieu={nom:perso.lieu}}
 if(J&&Live&&journal.length){var v=jourJ().vue(ROLES[0].qui),par={};v.moments.forEach(function(m){par[m.id]=m});
  c.moments.forEach(function(m){var x=par[m.id];if(!x)return;m.debut=x.debut;m.fin=x.fin;m.espace=x.espace})}
 return c}
function jourJ(){var b=Live.base(S.base);b.evenement.nom=perso.titre||S.base.evenement.nom;var r=Live.rejouer(b,S.acces,journal,Perms);
 return{trace:r.trace,vue:function(qui){return Live.vue(r.etat,S.acces,qui,Live.hm(J.heure||'14:45'),Perms)}}}

/* les écrans : de vraies pages, composées pour celui qui regarde */
function page(c,role){var k=couleur(sc,ROLES.indexOf(role)),out=Vit.rendre({contenu:c,acces:S.acces,perspective:angleDe(role),libelles:S.ps.libelles||{},modele:S.modele,presentation:{ambiance:AMB,polices:S.pol},regles:Perms,flux:flux()});
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(role.nom)+'</title>'+
  '<link rel="stylesheet" href="/vitrine/site/vitrine.css"><style>'+out.css+'</style><style>'+FONTES+TITRES+'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}.v-hero,.hero{min-height:420px!important}'+
  '.v-hero .v-img,.hero .v-img{background:'+k.c+'!important}.v-hero .v-img>*,.hero .v-img>*{display:none!important}.v-hero .v-img::after,.hero-plein::after,.hero .v-img::after{display:none!important}'+
  '.v-hero,.v-hero *,.hero-plein,.hero-plein *{color:'+k.e+'!important;text-shadow:none!important}</style></head><body><div id="app">'+
  String(out.html).replace(/<script\b[\s\S]*?<\/script>/gi,'')+'</div></body></html>'}
function ecrans(){if(AD){[].forEach.call(document.querySelectorAll('#ecransGrille [data-angle]'),function(fig){var i=-1;ROLES.forEach(function(r,k){if(r.angle===fig.getAttribute('data-angle'))i=k});if(i<0)return;var fr=fig.querySelector('iframe'),y=0;
  try{y=fr.contentWindow?fr.contentWindow.scrollY:0}catch(_){}fr.onload=function(){try{if(y)fr.contentWindow.scrollTo(0,y)}catch(_){}};fr.srcdoc=AD.page(ROLES[i],perso,couleur(sc,i))});
 var t=$('droitsCorps');if(t)t.innerHTML=AD.droits(ROLES,perso).map(function(l){return'<tr><th scope="row">'+esc(l.titre)+'</th>'+l.valeurs.map(function(v){return'<td>'+v+'</td>'}).join('')+'</tr>'}).join('');
 $('droitsTete').innerHTML='<th scope="col"><span class="sr">Ce que chacun voit</span></th>'+ROLES.map(function(r){return'<th scope="col">'+esc(r.nom)+(AD.etiquette?'<small>'+esc(AD.etiquette(r))+'</small>':'')+'</th>'}).join('');return}
 var c=contenu();
 [].forEach.call(document.querySelectorAll('#ecransGrille [data-angle]'),function(fig){var role=ROLES.filter(function(r){return r.angle===fig.getAttribute('data-angle')})[0],fr=fig.querySelector('iframe'),y=0;if(!role)return;
  try{y=fr.contentWindow?fr.contentWindow.scrollY:0}catch(_){}
  fr.onload=function(){try{if(y)fr.contentWindow.scrollTo(0,y)}catch(_){}};fr.srcdoc=page(c,role)});
 droits(c)}
function echelle(){[].forEach.call(document.querySelectorAll('#ecransGrille .tel-ecran'),function(e){var fr=e.querySelector('iframe');fr.style.transform='scale('+(e.clientWidth/390).toFixed(4)+')'})}

/* ce que chacun peut voir et faire, décidé par les règles avant la mise en page */
function droits(c){var t=$('droitsCorps');if(!t)return;var total=(c.moments||[]).length,docs=(c.documents||[]).length,F=flux();
 var L=ROLES.map(function(r){var v=Vit.politique(c,S.acces,{regard:r.qui},Perms,F),liste=[];
  (angleDe(r).sections||[]).forEach(function(s){if(s.type==='actions')liste=liste.concat(s.liste||[])});
  var d=v.documents(),rep=v.reponses(),pay=v.paiements(),act=v.actions(liste),mi=null;
  if(F&&c.missions){var vues=c.missions.map(function(m){return v.mission(m.id)}).filter(Boolean);mi={vues:vues.length,total:c.missions.length,gestes:vues.reduce(function(s,x){return s+Object.keys(x.actions||{}).filter(function(k){return x.actions[k]&&x.actions[k].allow}).length},0)}}
  return{r:r,role:v.sujet.role,moments:v.moments().length,docs:d.visibles.length,caches:d.caches,rep:rep,pay:pay.length,act:act,mi:mi}});
 var muet=function(x){return!x.role||x.role==='guest'},ligne=function(titre,f){return'<tr><th scope="row">'+titre+'</th>'+L.map(function(x){return'<td>'+f(x)+'</td>'}).join('')+'</tr>'},vide=function(f){return L.every(function(x){return f(x)==='—'})};
 var lignes=[
  /* docs/ROLES.md · fuite par le compte : pour un destinataire ou le public, silence par défaut, ni le contenu ni le total */
  ['Moments du programme',function(x){return'<b>'+x.moments+'</b>'+(muet(x)?'':' sur '+total)}],
  ['Documents',function(x){return'<b>'+x.docs+'</b>'+(muet(x)?'':' sur '+docs+(x.caches?'<small>'+x.caches+' non montré'+(x.caches>1?'s':'')+'</small>':''))}],
  ['Missions',function(x){return x.mi?(x.mi.vues?'<b>'+x.mi.vues+'</b> sur '+x.mi.total+(x.mi.gestes?'<small>'+x.mi.gestes+' geste'+(x.mi.gestes>1?'s':'')+' permis</small>':''):'—'):'—'}],
  ['Réponses',(c.reponses||[]).length?function(x){return x.rep.nominatives.length>1?'<b>Nominatives</b><small>'+x.rep.nominatives.length+' réponses</small>':x.rep.resume?'<b>Résumé</b><small>sans les noms</small>':x.rep.nominatives.length?'<b>La sienne</b>':'—'}:function(){return'—'}],
  ['Paiements',function(x){return x.pay?'<b>'+x.pay+'</b> visible'+(x.pay>1?'s':''):'—'}],
  ['Gestes permis',L.some(function(x){return x.act.autorisees.length})?function(x){return x.act.autorisees.length?x.act.autorisees.map(function(a){return esc(a.label)}).join('<br>'):'Lire'+(x.rep.nominatives.length===1?', répondre':'')}:function(){return'—'}]];
 t.innerHTML=lignes.filter(function(l){return!vide(l[1])}).map(function(l){return ligne(l[0],l[1])}).join('');
 $('droitsTete').innerHTML='<th scope="col"><span class="sr">Ce que chacun voit</span></th>'+L.map(function(x){return'<th scope="col">'+esc(x.r.nom)+'<small>'+esc(ROLE_FR[x.role]||x.role||'')+'</small></th>'}).join('')}

/* le jour J : un imprévu, un retard ; chacun voit ce qui change pour lui */
function filtre(r){var f='tout';((angleDe(r)||{}).sections||[]).forEach(function(s){if(s.type==='programme'&&s.filtre)f=s.filtre});return f}
function direct(){var box=$('jourVues');if(AD||!box||!Live||!J)return;var X=jourJ(),der=X.trace[X.trace.length-1];
 box.innerHTML=ROLES.map(function(r){var v=X.vue(r.qui),f=filtre(r);v.moments=v.moments.filter(function(m){return f==='public'?m.public:f==='assigne'?(m.assigneeId===r.qui||(!m.public&&!m.assigneeId)):true});
  return'<article class="jj"><h3>'+esc(r.nom)+'</h3><ol>'+v.moments.slice(0,6).map(function(m){var change=m.decalage||m.planBActif;
   return'<li'+(change?' class="change"':'')+'><time>'+esc(m.debut)+'</time><span>'+esc(m.titre)+'<small>'+esc(m.espace)+(m.decalage?' · '+esc(Live.ecart(m.decalage)):'')+'</small></span></li>'}).join('')+
   (v.moments.length>6?'<li class="plus">+ '+(v.moments.length-6)+' autre'+(v.moments.length-6>1?'s':'')+'</li>':'')+(v.moments.length?'':'<li class="plus">Aucun moment pour cette personne.</li>')+'</ol></article>'}).join('');
 $('jourTrace').textContent=der?(der.ok?'Écrit une fois au journal, rejoué pour les '+nombre(N).toLowerCase()+' : '+({planB:'plan B',retarder:'retard en cascade',fait:'étape terminée'}[der.a.action]||der.a.action)+'.':'Refusé par les règles : '+der.raison):'Rien n\'a encore bougé. Déclenchez un imprévu ou un retard.';
 $('jourAnnuler').disabled=!journal.length;$('jourPluie').setAttribute('aria-pressed',String(journal.some(function(a){return a.action==='planB'&&a.p.actif})))}

function tout(){if(!pret)return;ecrans();direct();teinter()}
function plus_tard(){clearTimeout(minuterie);minuterie=setTimeout(tout,260)}

/* les gestes */
function champs(){if(CH){CH.forEach(function(c){var el=$('src-'+c.id);if(el)el.value=perso[c.id]!=null?perso[c.id]:(c.defaut!=null?c.defaut:'')});return}var e=S.base.evenement,l=lieuDe(S.base);$('srcTitre').value=perso.titre||e.nom;$('srcDate').value=perso.date||e.date||'';$('srcLieu').value=perso.lieu||(l&&l.nom)||''}
['srcTitre','srcDate','srcLieu'].forEach(function(id){var el=$(id);if(el)el.addEventListener('input',function(){var k={srcTitre:'titre',srcDate:'date',srcLieu:'lieu'}[id],v=this.value.trim();perso[k]=v;
 $('srcEtat').textContent=v?'Les '+nombre(N).toLowerCase()+' écrans se recomposent depuis la même source.':'Champ vide : la valeur d\'origine revient.';plus_tard()})});
if(CH)CH.forEach(function(c){var el=$('src-'+c.id);if(el)el.addEventListener('input',function(){var v=this.value.trim();if(v==='')delete perso[c.id];else perso[c.id]=v;
 $('srcEtat').textContent=v?'Les '+nombre(N).toLowerCase()+' écrans se recomposent depuis la même source.':'Champ vide : la valeur d\'origine revient.';plus_tard()})});
if($('srcRetour'))$('srcRetour').addEventListener('click',function(){perso={};champs();$('srcEtat').textContent='Valeurs d\'origine rétablies.';tout()});
if($('source'))$('source').addEventListener('submit',function(e){e.preventDefault()});
if($('jourGestes')&&J)$('jourGestes').addEventListener('click',function(e){var b=e.target.closest('button[data-j]');if(!b||!pret)return;var a=b.getAttribute('data-j'),t=journal.length+1;
 if(a==='pluie'){var on=b.getAttribute('aria-pressed')!=='true';journal.push({qui:J.qui,action:'planB',p:{moment:J.moment,actif:on},t:t})}
 else if(a==='retard')journal.push({qui:J.qui,action:'retarder',p:{moment:J.moment,minutes:25,cascade:true},t:t});
 else if(a==='annuler')journal.pop();
 tout()});

/* la chorégraphie de l'orbe (zero/zero.js suit les ancres [data-orbe]) :
   1 · chaque arrivée : quand sa scène passe au milieu de l'écran, l'orbe se pose sur la fiche et la recueille ;
   2 · les écrans : la scène reste en place pendant que l'orbe passe d'un téléphone à l'autre,
       et l'écran de cette personne se compose à son passage. En mouvement réduit, tout est déjà là. */
var calme=function(){return document.documentElement.classList.contains('calme')||matchMedia('(prefers-reduced-motion: reduce)').matches};
var SC=[].slice.call(document.querySelectorAll('.sc')),scene=$('ecransScene'),ancre=$('ancreEcran'),TELS=[].slice.call(document.querySelectorAll('#ecransGrille .tel')),actif=-2,DER=N-1;
function nes(n){TELS.forEach(function(f,i){f.classList.toggle('ne',i<=n)})}
function placer(i){var f=TELS[Math.max(0,i)],g0=$('ecransGrille');if(!f||!ancre)return;var g=g0.getBoundingClientRect(),r=f.querySelector('.tel-ecran').getBoundingClientRect();
 ancre.style.left=(r.left-g.left+g0.scrollLeft+r.width/2-ancre.offsetWidth/2)+'px';ancre.style.top=(r.top-g.top+r.height*.17-ancre.offsetHeight/2)+'px'}
function choregraphie(){var V=innerHeight;
 SC.forEach(function(s){var r=s.getBoundingClientRect();if(r.top<V*.5&&r.bottom>V*.3)s.classList.add('recueilli')});
 if(!scene)return;if(calme()){if(actif!==DER){actif=DER;nes(DER);document.body.classList.add('ecrans-libres')}return}
 var r=scene.getBoundingClientRect(),course=r.height-V,p=course>0?-r.top/course:1,i=p<.04?-1:Math.min(DER,Math.floor((p-.04)/(.8/N)));
 if(i!==actif){actif=i;nes(i);var pas=$('ecransPas');if(pas)pas.textContent=i<0?'L\'orbe arrive avec tout ce qu\'elle a recueilli.':i<DER?'L\'orbe compose l\'écran '+ROLES[i].de+'.':nombre(N)+' écrans, composés depuis la même source.';
  var tel=TELS[Math.max(0,i)],g=$('ecransGrille');if(tel&&g.scrollWidth>g.clientWidth+4)g.scrollTo({left:tel.offsetLeft-20,behavior:'smooth'})}
 placer(actif);requestAnimationFrame(choregraphie)}
if(calme()){nes(DER);document.body.classList.add('ecrans-libres');SC.forEach(function(s){s.classList.add('recueilli')})}
if(scene)scene.style.setProperty('--n',N);
function teinter(){var poser=function(sel,dec){[].forEach.call(document.querySelectorAll(sel),function(el,i){var k=couleur(sc,i-(dec||0));if(i-(dec||0)<0||i-(dec||0)>=N)return;el.style.setProperty('--role',k.c);el.style.setProperty('--role-encre',k.e)})};
 poser('.sc');poser('#ecransGrille .tel');poser('#droitsTete th',1);poser('#jourVues .jj')}
teinter();
requestAnimationFrame(choregraphie);

/* démarrage : seulement quand la section approche, pour garder le premier écran léger */
var U=sc.univers;
function demarrer(){if(S)return;S={};if(AD){AD.charger(sc).then(function(){pret=true;champs();echelle();tout()}).catch(function(){S=null;var e=$('ecransEtat');if(e)e.textContent='Les écrans n\'ont pas pu être chargés. Rechargez la page.'});return}Promise.all([j('/vitrine/donnees/'+U+'.json'),j('/vitrine/acces/'+U+'.json'),j('/vitrine/perspectives/'+U+'.json'),j('/vitrine/modeles/'+(sc.modele||'editorial')+'.json'),j('/vitrine/presentation/ambiances.json')]).then(function(r){
 var pr=r[4],m=r[3];S={base:r[0],acces:r[1],ps:r[2],modele:m,pol:{titre:TITRE,texte:TEXTE}};
 teintes(sc,S.acces);pret=true;champs();echelle();tout()}).catch(function(){S=null;var e=$('ecransEtat');if(e)e.textContent='Les écrans n\'ont pas pu être chargés. Rechargez la page.'})}
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){if(en.some(function(e){return e.isIntersecting})){io.disconnect();demarrer()}},{rootMargin:'600px 0px'});io.observe($('arrivees')||$('ecrans'))}else demarrer();
addEventListener('resize',echelle);if('ResizeObserver' in window)new ResizeObserver(echelle).observe($('ecransGrille'));

return{projet:function(p){if(!p)return;perso={titre:p.titre||'',date:p.date||'',lieu:p.lieu||''};if(pret){champs();tout()}}}}

/* une seule instance par page ; le projet du visiteur peut arriver avant ou après le montage */
var inst=null,attente=null;
root.AIMECoeur={html:html,nombre:nombre,couleurs:COULEURS,adaptateurs:{},FONTES:FONTES,TITRES:TITRES,TITRE:TITRE,
 monter:function(sc){inst=monter(sc);if(inst&&attente)inst.projet(attente);return inst},
 projet:function(p){if(inst)inst.projet(p);else attente=p}};
if(typeof module==='object'&&module.exports)module.exports=root.AIMECoeur;
})(typeof self!=='undefined'?self:this);
