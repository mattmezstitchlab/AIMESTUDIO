/* AIME · le premier écran rendu réel : une phrase → ce que l'Orbe a compris (corrigeable) → un projet enregistré → sa page.
   Moteurs réutilisés tels quels : projets/intention.js (lecture), contrats/projet.js (format), vitrine/rendu.js (la page),
   design/systemes.js + design/charger.js (les quatre Design Systems), sites/editeur.js (la modification fine, sur /sites/).
   Tout reste dans ce navigateur : c'est dit à l'écran. */
(function(){'use strict';
var I=window.AIMEIntention,P=window.AIMEProjets,S=window.AIMESite;if(!I||!P||!S)return;
var $=function(i){return document.getElementById(i)};
var D=P.Depot(window.localStorage),MODELES=null,PRES=null,DSCAT=null,lecture=null,projet=null;
function charger(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
function moteur(){if(MODELES)return Promise.resolve();return Promise.all([charger('/vitrine/modeles/sites.json'),charger('/vitrine/presentation/studio.json')]).then(function(r){MODELES=r[0].modeles;PRES=r[1];
 return window.AIMEDesignCharger?window.AIMEDesignCharger().then(function(c){DSCAT=c;if(c&&c.ids.length)PRES.systemes=c.compiles}):null})}
function dire(t){var v=$('acVivant');v.textContent='';setTimeout(function(){v.textContent=t},30)}
function sansScript(h){return String(h).replace(/<script\b[\s\S]*?<\/script>/gi,'')}
function montrer(etape){$('monProjet').hidden=false;$('acComprendre').hidden=etape!=='comprendre';$('acPage').hidden=etape!=='page';
 var cible=etape==='comprendre'?$('acT'):$('acPageT'),bloc=etape==='comprendre'?$('acComprendre'):$('acPage');bloc.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});setTimeout(function(){cible.focus({preventScroll:true})},350)}

/* 1 · lire la phrase et montrer ce qui a été compris */
function comprendre(texte){var l=I.lire(texte);if(!l){dire('Écrivez d\'abord ce que vous préparez, en une phrase.');$('acTexte').focus();return}
 lecture=l;$('acType').value=l.type;$('acTitre').value=l.titre;$('acDate').value=l.date;$('acLieu').value=l.lieu;$('acInvites').value=l.invites||'';
 $('acPassee').hidden=!l.passee;montrer('comprendre')}
$('acForm').addEventListener('submit',function(e){e.preventDefault();comprendre($('acTexte').value)});
[].forEach.call(document.querySelectorAll('[data-ac-ex]'),function(b){b.addEventListener('click',function(){$('acTexte').value=b.textContent;comprendre(b.textContent)})});
$('acCorriger').addEventListener('click',function(){$('monProjet').hidden=true;$('acTexte').focus();$('haut').scrollIntoView({block:'start'})});
$('acDate').addEventListener('input',function(){var j=new Date().toISOString().slice(0,10);$('acPassee').hidden=!this.value||this.value>=j});

/* 2 · « Oui, c'est ça » : le projet naît, il est enregistré, sa page est composée */
$('acOui').addEventListener('click',function(){var b=this;b.disabled=true;
 moteur().then(function(){
  var t=I.TYPES.filter(function(x){return x.id===$('acType').value})[0]||I.AUTRE;
  var l={texte:lecture?lecture.texte:'',type:t.id,modele:t.modele,titre:$('acTitre').value.trim()||'Mon projet',date:$('acDate').value,lieu:$('acLieu').value.trim(),invites:+$('acInvites').value||null,personnes:lecture?lecture.personnes:[]};
  var p=P.versProjet(l),m=MODELES.filter(function(x){return x.id===t.modele})[0],s=P.versSite(p,S,m),r=D.enregistrer(p,s);
  if(!r.ok){dire(r.raison);return}projet=r.projet;page();brancher(projet);dire('Projet « '+projet.titre+' » créé et enregistré dans ce navigateur.')})
 .catch(function(){dire('La page n\'a pas pu être composée (connexion ?). Réessayez.')}).then(function(){b.disabled=false})});

/* 3 · la page du projet, rendue par le moteur de pages ; l'apparence se change sans toucher au contenu */
function page(){var s=D.site(projet);if(!s){dire('La page de ce projet est introuvable dans ce navigateur.');return}
 $('acPageT').textContent=projet.titre;$('acModifier').href='/sites/?site='+encodeURIComponent(s.id);
 var e=P.evenement(projet);$('acResume').textContent=[e.genre&&e.genre!=='autre'?(I.TYPES.filter(function(x){return x.id===e.genre})[0]||{}).nom:'',e.date?new Date(e.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'',e.lieu,e.invites?e.invites+' personnes':''].filter(Boolean).join(' · ');
 dsUI(s);afficher(s);montrer('page');reprendreUI()}
function afficher(s){$('acApercu').srcdoc=sansScript(S.document(s,{presentation:PRES,visuels:null}).html)}
function dsUI(s){var B=$('acDS');if(!DSCAT||!DSCAT.ids.length||!window.AIMEDesign){B.hidden=true;return}B.hidden=false;var cur=window.AIMEDesign.pointeur(s),id=cur?cur.id:'origine';
 B.innerHTML=DSCAT.ids.map(function(k){return'<button type="button" data-ac-ds="'+k+'" aria-pressed="'+(k===id)+'">'+DSCAT.compiles[k].nom+'</button>'}).join('')+'<button type="button" data-ac-ds="origine" aria-pressed="'+(id==='origine')+'">Modèle</button>'}
$('acDS').addEventListener('click',function(e){var b=e.target.closest('[data-ac-ds]');if(!b||!projet)return;var s=D.site(projet),r=window.AIMEDesign.appliquer(s,b.getAttribute('data-ac-ds')==='origine'?null:b.getAttribute('data-ac-ds'),DSCAT);
 if(!r.change){dire(r.message);return}if(!D.majSite(r.site)){dire('Ce changement n\'a pas pu être enregistré.');return}dsUI(r.site);afficher(r.site);dire(r.message)});
$('acVues').addEventListener('click',function(e){var b=e.target.closest('[data-ac-vue]');if(!b)return;[].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',String(x===b))});$('acCadre').classList.toggle('tel',b.getAttribute('data-ac-vue')==='tel')});
$('acNouveau').addEventListener('click',function(){$('monProjet').hidden=true;$('acTexte').value='';$('acTexte').focus();$('haut').scrollIntoView({block:'start'})});


/* les démonstrations plus bas (regards, jour J, supports) lisent le projet de la personne, pas un exemple */
var CAS={mariage:'mariage',fete:'mariage',seminaire:'seminaire',association:'institution',portfolio:'createur',artisan:'createur',autre:'createur'};
function brancher(p){if(p&&window.AIMECoeur){var e0=P.evenement(p);window.AIMECoeur.projet({titre:p.titre,date:e0.date,lieu:e0.lieu})}var V=window.AIMEVerticale;if(!V||!p)return;try{var n=V.instance(),e=P.evenement(p);if(n.CAS[CAS[e.genre]||'createur'])n.choisirCas(CAS[e.genre]||'createur');
 n.modifier({titre:p.titre,date:e.date||n.lire().etat.date,lieu:e.lieu||n.lire().etat.lieu,intention:p.extensions.intention&&p.extensions.intention.texte||n.lire().etat.intention},'projet');
 var note=$('acCapNote');if(note)note.textContent='Les démonstrations ci-dessous reprennent le titre, la date et le lieu de votre projet « '+p.titre+' ». Les personnes, missions et montants qu\'elles montrent restent des exemples.'}catch(err){}}
[].forEach.call(document.querySelectorAll('[data-ac-sup]'),function(a){a.addEventListener('click',function(){var b=document.querySelector('#supOnglets [data-sup="'+a.getAttribute('data-ac-sup')+'"]');if(b)setTimeout(function(){b.click()},0)})});
/* revenir : le dernier projet de ce navigateur attend au même endroit */
function reprendreUI(){var p=D.courant(),R=$('acReprendre');if(!p){R.hidden=true;return}R.hidden=false;$('acReprendreB').textContent='Reprendre « '+p.titre+' »'}
$('acReprendreB').addEventListener('click',function(){projet=D.courant();if(!projet)return;moteur().then(page).catch(function(){dire('La page n\'a pas pu être chargée. Réessayez.')})});
reprendreUI();
/* au chargement, les scripts des démonstrations (chargés après celui-ci) doivent exister : on attend la fin du chargement */
addEventListener('load',function(){brancher(D.courant())});
/* ce que ce navigateur contient déjà : quelques liens, en lecture seule (bureau/sources.js), invisible s'il n'y a rien */
(function(){var B=window.AIMEBureauSources,box=$('repriseLiens');if(!B||!box)return;try{var inv=B.inventaire(window.localStorage);if(!inv.projets||!inv.projets.length)return;
 var l=B.reprendre(inv,4);if(!l.length)l=inv.projets.slice(0,3);var e=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
 box.innerHTML=l.map(function(p){return'<a href="'+e(p.lien)+'">'+e(p.titre)+' <small>('+e(p.detail||p.nom||'local')+')</small></a>'}).join('');$('repriseLocale').hidden=false}catch(_){}})();
})();
