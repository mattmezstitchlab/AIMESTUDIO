/* AIME · le cœur, sur l'accueil : un seul projet, quatre écrans.
   Un seul contenu (vitrine/donnees/mariage.json), une seule couche d'accès, les quatre perspectives du même mariage.
   Les quatre pages sont composées ici, à l'instant, par le moteur de pages (AIMEVitrine.rendre) et les règles
   (synchroview/permissions.js) ; le jour J passe par le journal du direct (live/modele.js). Rien n'est recopié :
   changer le nom, la date, le lieu ou l'heure d'un moment recompose les quatre écrans depuis la même source.
   Aucune écriture : tout reste dans la page, rien n'est enregistré ni envoyé. */
(function(){'use strict';
var Vit=window.AIMEVitrine,Perms=window.AIMEPerms,Live=window.AIMELive;
var $=function(i){return document.getElementById(i)};
if(!Vit||!Perms||!$('ecrans'))return;
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function j(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}

/* les quatre personnes, dans l'ordre de la page : une perspective du mariage + une identité de la couche d'accès */
var ROLES=[
 {angle:'couple',qui:'u-lea',nom:'Le couple',court:'Couple'},
 {angle:'coordinateur',qui:'u-camille',nom:'La coordination',court:'Coordination'},
 {angle:'prestataire',qui:'u-lumen',nom:'Le prestataire',court:'Prestataire'},
 {angle:'invite',qui:'u-lucie',nom:'L\'invitée',court:'Invitée'}];
/* une ambiance sans couleur : l'accueil reste sobre, les écrans aussi */
var ROLE_FR={owner:'Propriétaire',editor:'Coordination',contributor:'Contribution',guest:'Invité',viewer:'Lecture seule'};
var AMB={nom:'AIME · monochrome',c1:'#26262B',c2:'#C9C9CF',paper:'#F4F4F2',ink:'#141416',source:'AIME (accueil)'};

var S=null,journal=[],perso={},pret=false,minuterie=0;

/* ---------- la source unique, puis ce que le jour J y change (journal rejoué, jamais une copie) ---------- */
function contenu(){var c=JSON.parse(JSON.stringify(S.base)),e=c.evenement;
 if(perso.titre)e.nom=perso.titre;if(perso.date)e.date=perso.date;if(perso.lieu){e.lieu=Object.assign({},e.lieu,{nom:perso.lieu})}
 if(Live&&journal.length){var v=jourJ().vue('u-lea'),par={};v.moments.forEach(function(m){par[m.id]=m});
  c.moments.forEach(function(m){var x=par[m.id];if(!x)return;m.debut=x.debut;m.fin=x.fin;m.espace=x.espace})}
 return c}
function jourJ(){var b=Live.base(S.base);b.evenement.nom=perso.titre||S.base.evenement.nom;var r=Live.rejouer(b,S.acces,journal,Perms);
 return{trace:r.trace,vue:function(qui){return Live.vue(r.etat,S.acces,qui,Live.hm('14:45'),Perms)}}}

/* ---------- 01 · les quatre écrans : de vraies pages, composées pour celui qui regarde ---------- */
function page(c,role){var angle=S.ps.angles.filter(function(a){return a.id===role.angle})[0];
 var out=Vit.rendre({contenu:c,acces:S.acces,perspective:angle,libelles:S.ps.libelles||{},modele:S.modele,presentation:{ambiance:AMB,polices:S.pol},regles:Perms,flux:null});
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(role.nom)+'</title>'+
  '<link rel="stylesheet" href="/vitrine/site/vitrine.css"><style>'+out.css+'</style><style>html{scrollbar-width:none}html::-webkit-scrollbar{display:none}.v-hero,.hero{min-height:420px!important}</style></head><body><div id="app">'+
  String(out.html).replace(/<script\b[\s\S]*?<\/script>/gi,'')+'</div></body></html>'}
function ecrans(){var c=contenu();
 [].forEach.call(document.querySelectorAll('#ecransGrille [data-angle]'),function(fig){var role=ROLES.filter(function(r){return r.angle===fig.getAttribute('data-angle')})[0],fr=fig.querySelector('iframe'),y=0;
  try{y=fr.contentWindow?fr.contentWindow.scrollY:0}catch(_){}
  fr.onload=function(){try{if(y)fr.contentWindow.scrollTo(0,y)}catch(_){}};fr.srcdoc=page(c,role)});
 droits(c)}
function echelle(){[].forEach.call(document.querySelectorAll('#ecransGrille .tel-ecran'),function(e){var fr=e.querySelector('iframe');fr.style.transform='scale('+(e.clientWidth/390).toFixed(4)+')'})}

/* ---------- 02 · ce que chacun peut voir et faire, décidé par les règles avant la mise en page ---------- */
function droits(c){var t=$('droitsCorps');if(!t)return;var total=(c.moments||[]).length,docs=(c.documents||[]).length;
 var L=ROLES.map(function(r){var v=Vit.politique(c,S.acces,{regard:r.qui},Perms,null),angle=S.ps.angles.filter(function(a){return a.id===r.angle})[0],
  liste=[];(angle.sections||[]).forEach(function(s){if(s.type==='actions')liste=liste.concat(s.liste||[])});
  var d=v.documents(),rep=v.reponses(),pay=v.paiements(),act=v.actions(liste);
  return{r:r,role:v.sujet.role,moments:v.moments().length,docs:d.visibles.length,caches:d.caches,rep:rep,pay:pay.length,act:act}});
 var ligne=function(titre,f){return'<tr><th scope="row">'+titre+'</th>'+L.map(function(x){return'<td>'+f(x)+'</td>'}).join('')+'</tr>'};
 t.innerHTML=
  ligne('Moments du programme',function(x){return'<b>'+x.moments+'</b> sur '+total})+
  ligne('Documents',function(x){return'<b>'+x.docs+'</b> sur '+docs+(x.caches?'<small>'+x.caches+' jamais montré'+(x.caches>1?'s':'')+'</small>':'')})+
  ligne('Réponses des invités',function(x){return x.rep.nominatives.length>1?'<b>Nominatives</b><small>'+x.rep.nominatives.length+' réponses</small>':x.rep.resume?'<b>Résumé</b><small>sans les noms</small>':x.rep.nominatives.length?'<b>La sienne</b>':'—'})+
  ligne('Paiements',function(x){return x.pay?'<b>'+x.pay+'</b> visible'+(x.pay>1?'s':''):'—'})+
  ligne('Gestes permis',function(x){return x.act.autorisees.length?x.act.autorisees.map(function(a){return esc(a.label)}).join('<br>'):'Lire, répondre'});
 $('droitsTete').innerHTML='<th scope="col"><span class="sr">Ce que chacun voit</span></th>'+L.map(function(x){return'<th scope="col">'+esc(x.r.nom)+'<small>'+esc(ROLE_FR[x.role]||x.role||'')+'</small></th>'}).join('')}

/* ---------- 03 · le jour J : une averse, un retard ; chacun voit ce qui change pour lui ---------- */
function direct(){var box=$('jourVues');if(!box||!Live)return;var J=jourJ(),der=J.trace[J.trace.length-1];
 box.innerHTML=ROLES.map(function(r){var v=J.vue(r.qui),f=filtre(r);v.moments=v.moments.filter(function(m){return f==='public'?m.public:f==='assigne'?(m.assigneeId===r.qui||(!m.public&&!m.assigneeId)):true});
  return'<article class="jj"><h3>'+esc(r.nom)+'</h3><ol>'+v.moments.slice(0,6).map(function(m){var change=m.decalage||m.planBActif;
   return'<li'+(change?' class="change"':'')+'><time>'+esc(m.debut)+'</time><span>'+esc(m.titre)+'<small>'+esc(m.espace)+(m.decalage?' · '+esc(Live.ecart(m.decalage)):'')+'</small></span></li>'}).join('')+
   (v.moments.length>6?'<li class="plus">+ '+(v.moments.length-6)+' autre'+(v.moments.length-6>1?'s':'')+'</li>':'')+'</ol></article>'}).join('');
 var t=$('jourTrace');t.textContent=der?(der.ok?'Écrit une fois au journal, rejoué pour les quatre : '+({planB:'plan B',retarder:'retard en cascade',fait:'étape terminée'}[der.a.action]||der.a.action)+'.':'Refusé par les règles : '+der.raison):'Rien n\'a encore bougé. Déclenchez une averse ou un retard.';
 $('jourAnnuler').disabled=!journal.length;var pl=journal.some(function(a){return a.action==='planB'&&a.p.actif});$('jourPluie').setAttribute('aria-pressed',String(pl))}

/* chaque écran montre le programme comme sa perspective le demande (tout, ses créneaux, le public) */
function filtre(r){var a=S.ps.angles.filter(function(x){return x.id===r.angle})[0],f='tout';((a&&a.sections)||[]).forEach(function(s){if(s.type==='programme'&&s.filtre)f=s.filtre});return f}
function tout(){if(!pret)return;ecrans();direct()}
function plus_tard(){clearTimeout(minuterie);minuterie=setTimeout(tout,260)}

/* ---------- les gestes ---------- */
function champs(){var e=S.base.evenement;$('srcTitre').value=perso.titre||e.nom;$('srcDate').value=perso.date||e.date;$('srcLieu').value=perso.lieu||e.lieu.nom}
['srcTitre','srcDate','srcLieu'].forEach(function(id){$(id).addEventListener('input',function(){var k={srcTitre:'titre',srcDate:'date',srcLieu:'lieu'}[id],v=this.value.trim();perso[k]=v;
 $('srcEtat').textContent=v?'Les quatre écrans se recomposent depuis la même source.':'Champ vide : la valeur d\'origine revient.';plus_tard()})});
$('srcRetour').addEventListener('click',function(){perso={};champs();$('srcEtat').textContent='Valeurs d\'origine rétablies.';tout()});
$('jourGestes').addEventListener('click',function(e){var b=e.target.closest('button[data-j]');if(!b||!pret)return;var a=b.getAttribute('data-j'),t=journal.length+1;
 if(a==='pluie'){var on=b.getAttribute('aria-pressed')!=='true';journal.push({qui:'u-camille',action:'planB',p:{moment:'ceremonie',actif:on},t:t})}
 else if(a==='retard')journal.push({qui:'u-camille',action:'retarder',p:{moment:'ceremonie',minutes:25,cascade:true},t:t});
 else if(a==='annuler')journal.pop();
 tout()});

$('source').addEventListener('submit',function(e){e.preventDefault()});

/* ce que ce navigateur contient déjà : quelques liens, en lecture seule (bureau/sources.js), invisible s'il n'y a rien */
(function(){var B=window.AIMEBureauSources,box=$('repriseLiens');if(!B||!box)return;try{var inv=B.inventaire(window.localStorage);if(!inv.projets||!inv.projets.length)return;
 var l=B.reprendre(inv,4);if(!l.length)l=inv.projets.slice(0,3);
 box.innerHTML=l.map(function(p){return'<a href="'+esc(p.lien)+'">'+esc(p.titre)+' <small>('+esc(p.detail||p.nom||'local')+')</small></a>'}).join('');$('repriseLocale').hidden=false}catch(_){}})();

/* le projet de la personne (écrit en haut de page) prend la place de l'exemple : nom, date, lieu */
window.AIMECoeur={projet:function(p){if(!p)return;perso={titre:p.titre||'',date:p.date||'',lieu:p.lieu||''};if(pret){champs();tout()}}};

/* ---------- démarrage : seulement quand la section approche, pour garder le premier écran léger ---------- */
function demarrer(){if(S)return;S={};Promise.all([j('/vitrine/donnees/mariage.json'),j('/vitrine/acces/mariage.json'),j('/vitrine/perspectives/mariage.json'),j('/vitrine/modeles/editorial.json'),j('/vitrine/presentation/ambiances.json')]).then(function(r){
 var pr=r[4],m=r[3];S={base:r[0],acces:r[1],ps:r[2],modele:m,pol:{titre:(pr.polices[m.polices.titre]||{}).famille,texte:(pr.polices[m.polices.texte]||{}).famille}};
 pret=true;champs();echelle();tout()}).catch(function(){S=null;$('ecransEtat').textContent='Les quatre écrans n\'ont pas pu être chargés. Rechargez la page.'})}
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){if(en.some(function(e){return e.isIntersecting})){io.disconnect();demarrer()}},{rootMargin:'600px 0px'});io.observe($('ecrans'))}else demarrer();
addEventListener('resize',echelle);if('ResizeObserver' in window)new ResizeObserver(echelle).observe($('ecransGrille'));
})();
