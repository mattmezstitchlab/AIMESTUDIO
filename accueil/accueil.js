/* AIME · le premier écran : une phrase → ce que l'Orbe a compris (corrigeable) → un projet enregistré dans ce navigateur.
   Plus d'aperçu de mini-site, de choix d'apparence ni de lien vers le Canevas (mis de côté, brief du 24/10).
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
function montrer(etape){$('monProjet').hidden=false;$('acComprendre').hidden=false;
 var cible=$('acT'),bloc=$('acComprendre');bloc.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});setTimeout(function(){cible.focus({preventScroll:true})},350)}

/* 1 · lire la phrase et montrer ce qui a été compris */
function comprendre(texte){var l=I.lire(texte);if(!l){dire('Écrivez d\'abord ce que vous préparez, en une phrase.');$('acTexte').focus();return}
 lecture=l;$('acType').value=l.type;$('acTitre').value=l.titre;$('acDate').value=l.date;$('acLieu').value=l.lieu;$('acInvites').value=l.invites||'';$('acCategorie').value=l.categorie||'autre';$('acAcces').value=l.acces||'Ouvert au public';
 $('acPassee').hidden=!l.passee;montrer('comprendre')}
$('acForm').addEventListener('submit',function(e){e.preventDefault();comprendre($('acTexte').value)});
[].forEach.call(document.querySelectorAll('[data-ac-ex]'),function(b){b.addEventListener('click',function(){$('acTexte').value=b.textContent;comprendre(b.textContent)})});
$('acCorriger').addEventListener('click',function(){$('monProjet').hidden=true;$('acTexte').focus();$('haut').scrollIntoView({block:'start'})});
$('acDate').addEventListener('input',function(){var j=new Date().toISOString().slice(0,10);$('acPassee').hidden=!this.value||this.value>=j});

/* 2 · « Oui, c'est ça » : le projet naît, il est enregistré, sa page est composée */
$('acOui').addEventListener('click',function(){var b=this;b.disabled=true;
 moteur().then(function(){
  var X=window.AIMETaxonomie,cat=X?X.categorie($('acCategorie').value):null,t=I.TYPES.filter(function(x){return x.id===$('acType').value})[0]||{id:'autre',modele:cat?cat.modele:'libre'};
  var l={texte:lecture?lecture.texte:'',type:t.id,modele:t.modele,titre:$('acTitre').value.trim()||'Mon projet',date:$('acDate').value,lieu:$('acLieu').value.trim(),invites:+$('acInvites').value||null,personnes:lecture?lecture.personnes:[],categorie:cat?cat.id:'autre',schemaType:cat?cat.schemaType:'Event',mode:lecture?lecture.mode:'Sur place',acces:$('acAcces').value};
  var p=P.versProjet(l),m=MODELES.filter(function(x){return x.id===t.modele})[0],s=P.versSite(p,S,m),r=D.enregistrer(p,s);
  if(!r.ok){dire(r.raison);return}projet=r.projet;brancher(projet);dire('Projet « '+projet.titre+' » enregistré dans ce navigateur. Pour le partager, créez votre compte : « J\'ai un compte », dans le Dock.')})
 .catch(function(){dire('La page n\'a pas pu être composée (connexion ?). Réessayez.')}).then(function(){b.disabled=false})});

/* les démonstrations plus bas (regards, jour J, supports) lisent le projet de la personne, pas un exemple */
var CAS={mariage:'mariage',fete:'mariage',seminaire:'seminaire',association:'institution',portfolio:'createur',artisan:'createur',autre:'createur'};
function brancher(p){if(p&&window.AIMECoeur){var e0=P.evenement(p);window.AIMECoeur.projet({titre:p.titre,date:e0.date,lieu:e0.lieu})}var V=window.AIMEVerticale;if(!V||!p)return;try{var n=V.instance(),e=P.evenement(p);if(n.CAS[CAS[e.genre]||'createur'])n.choisirCas(CAS[e.genre]||'createur');
 n.modifier({titre:p.titre,date:e.date||n.lire().etat.date,lieu:e.lieu||n.lire().etat.lieu,intention:p.extensions.intention&&p.extensions.intention.texte||n.lire().etat.intention},'projet');
 var note=$('acCapNote');if(note)note.textContent='Les démonstrations ci-dessous reprennent le titre, la date et le lieu de votre projet « '+p.titre+' ». Les personnes, missions et montants qu\'elles montrent restent des exemples.'}catch(err){}}
[].forEach.call(document.querySelectorAll('[data-ac-sup]'),function(a){a.addEventListener('click',function(){var b=document.querySelector('#supOnglets [data-sup="'+a.getAttribute('data-ac-sup')+'"]');if(b)setTimeout(function(){b.click()},0)})});
/* au chargement, les scripts des démonstrations (chargés après celui-ci) doivent exister : on attend la fin du chargement */
addEventListener('load',function(){brancher(D.courant())});
})();
