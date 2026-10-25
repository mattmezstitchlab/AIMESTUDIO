/* AIME · aperçu public du Temps, en lecture seule.
   Même fixture que le module (modules/temps/demo-camille-gabriel.json), mêmes permissions et même moteur pur que le serveur.
   L'accueil ne lit aucun projet réel et n'invente aucune date : seule la démonstration fictive est chargée.

   Depuis le 25/10, l'aperçu se manipule : la légende est une liste de boutons (le cadran reste une image, role="img"),
   choisir un moment le dit en toutes lettres (aria-live), souligne son arc et, sur Circle, restreint le cadran à sa
   fenêtre de temps (AIMECercle.fenetre : 30 min de marge, jamais plus de 24 h). « Revenir à la journée entière » rend
   les 24 heures. Aucune règle n'est recalculée ici : la vue filtrée vient du moteur, le cercle ne fait que la placer.
   Le 25/10 encore : plus de liste sous le cadran. En Circle, le cadran est seul — chaque arc est un bouton (role,
   tabindex, nom accessible, Entrée/Espace), le détail dit le moment choisi et la légende ne nomme que les états. */
(function(root,factory){
 var deps;
 if(typeof module==='object'&&module.exports){
  deps={
   P:require('../synchroview/permissions.js'),
   T:require('../modules/temps/moteur.js'),
   C:require('../modules/temps/cercle.js'),
   Roles:require('../coeur/roles.js'),
   demo:require('../modules/temps/demo-camille-gabriel.json')
  };
  module.exports=factory(root,deps);
 }else{
  deps={P:root.AIMEPerms,T:root.AIMETempsMoteur,C:root.AIMECercle,Roles:root.AIMERoles,demo:null};
  root.AIMETempsAccueil=factory(root,deps);
  if(root.document)root.AIMETempsAccueil.monter();
 }
})(typeof self!=='undefined'?self:this,function(root,deps){'use strict';
var PERSONNES=[
 {cle:'camille',libelle:'Camille · le couple'},
 {cle:'lea',libelle:'Léa · la coordination'},
 {cle:'alex',libelle:'Alex · un prestataire'},
 {cle:'emma',libelle:'Emma · une invitée'}
];
function el(t,c,texte){var e=root.document.createElement(t);if(c)e.setAttribute('class',c);if(texte!=null)e.textContent=texte;return e}
function svgEl(t,a){var e=root.document.createElementNS('http://www.w3.org/2000/svg',t);Object.keys(a||{}).forEach(function(k){e.setAttribute(k,a[k])});return e}
function preparer(d,cle){
 if(!d||!Array.isArray(d.personnes)||!Array.isArray(d.moments)||!deps.T||!deps.P)throw new Error('La démonstration du Temps est indisponible.');
 var ids={},membres={},personnes={};
 d.personnes.forEach(function(p){ids[p.cle]='vitrine-'+p.cle;membres[ids[p.cle]]=p.role;personnes[p.cle]=p});
 var personne=personnes[cle]||personnes.camille;if(!personne)throw new Error('Personne de démonstration introuvable.');
 var moments=deps.T.importer(d,ids).map(function(m){m.majRev=1;return m});
 var prog={rev:1,moments:moments,membres:membres,confirmations:{},revImport:1};
 var vue=deps.T.vue(prog,{id:ids[personne.cle],role:personne.role},deps.P);
 return{personne:personne,vue:vue,total:moments.length,titre:d.titre};
}
/* le cadran de la vue, sur toute la journée par défaut */
function modeleCercle(vue,fenetre){if(!deps.C)throw new Error('Circle est indisponible.');return deps.C.modele(vue,{rayon:352,epaisseur:38,ecart:9,fenetre:fenetre||null})}
/* la fenêtre de zoom d'un moment : lui, 30 min de marge, arrondie à la demi-heure pour que les graduations tombent juste.
   Un moment qui passe minuit garde sa fin au-delà de 1440 ; une fenêtre de moins d'une heure est élargie à une heure,
   jamais plus de 24 h. */
function fenetreMoment(m){
 var debut=Math.max(0,m.dm-30), fin=m.fm>1440?m.fm+30:Math.min(m.fm+30,1440);
 debut=Math.floor(debut/30)*30; fin=Math.ceil(fin/30)*30;
 if(fin-debut<60)fin=debut+60;
 if(fin-debut>1440)fin=debut+1440;
 return{debut:debut,fin:fin,duree:fin-debut,jour:fin-debut===1440};
}
/* ce que le moment dit, en une phrase : sert au détail visible et au nom accessible du bouton */
function resumeMoment(m){
 var t=[m.titre,m.debut+' – '+m.fin+(m.fm>=1440?' (lendemain)':'')];
 if(m.lieu)t.push(m.lieu);
 if(m.fait)t.push('fait');
 if(m.decalage)t.push('horaire modifié, prévu '+m.prevu);
 if(m.responsable==='moi')t.push('vous portez ce moment');
 if(m.aConfirmer)t.push('nouvel horaire à confirmer');
 return t.join(' · ');
}
 /* le dessin du cadran, à partir du modèle de modules/temps/cercle.js : le même code sert ici et à l'iPhone de
    « Chacun son écran » (accueil/vitrine.js). Le cadran reste une image (role="img") : le clavier passe par la légende. */
 function dessiner(svg,M,o){o=o||{};if(!svg||!M)return;
  var CENTRE=M.centre,choix=o.choisi,fen=M.fenetre;
  while(svg.firstChild)svg.removeChild(svg.firstChild);
  var titre=svgEl('title',{id:(o.ids&&o.ids.titre)||'tempsDemoSvgT'});
  titre.textContent=fen.jour?'Circle · journée de 24 heures':'Circle · de '+deps.C.hm(fen.debut)+' à '+deps.C.hm(fen.fin);svg.appendChild(titre);
  /* dans une fenêtre zoomée, un moment qui s'arrête pile au bord n'a pas de durée visible : il reste dans la légende */
  var arcs=fen.jour?M.arcs:M.arcs.filter(function(a){return a.a1>a.a0||a.id===choix});
  var desc=svgEl('desc',{id:(o.ids&&o.ids.desc)||'tempsDemoSvgD'});
  var noms=o.noms||{},dits=arcs.map(function(a){return noms[a.id]}).filter(Boolean);
  desc.textContent='Cadran '+(fen.jour?'de 24 heures':'de '+deps.C.hm(fen.debut)+' à '+deps.C.hm(fen.fin))+', dans la vue de '+(o.qui||'cette place')+' : '+arcs.length+' moment'+(arcs.length===1?'':'s')+' représenté'+(arcs.length===1?'':'s')+'.'+(dits.length?' '+dits.join(' ; ')+'.':'');svg.appendChild(desc);
  svg.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon+M.epaisseur/2+8,class:'v-td-face'}));
  svg.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon+M.epaisseur/2+8,class:'v-td-anneau'}));
  for(var i=0;i<M.couloirs;i++)svg.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon-i*(M.epaisseur+M.ecart),class:'v-td-piste',style:'stroke-width:'+M.epaisseur+'px'}));
  M.graduations.forEach(function(g){svg.appendChild(svgEl('line',{x1:g.x1,y1:g.y1,x2:g.x2,y2:g.y2,class:g.cardinale?'v-td-tick fort':'v-td-tick'}));
   /* journée entière : les quatre cardinales ; fenêtre zoomée : chaque heure de la fenêtre, sinon rien ne se lit */
   var texte=g.texte||(fen.jour?'':deps.C.hm(g.minute));
   if(texte){var t=svgEl('text',{x:g.lx,y:g.ly,'text-anchor':g.ancre,class:g.texte?'v-td-heure':'v-td-heure v-td-heure-zoom'});t.textContent=texte;svg.appendChild(t)}});
  /* Plus de liste sous le cadran (25/10) : l'arc est donc le SEUL chemin, à la souris comme au clavier.
     Chaque arc est un bouton nommé en toutes lettres (heure, titre, lieu, état) et se choisit au clic, à Entrée ou à l'Espace. */
  arcs.forEach(function(a){if(a.id===choix)svg.appendChild(svgEl('path',{d:a.d,class:'v-td-choix'}));
   var nom=noms[a.id]||a.nom||a.titre||'';
   var p=svgEl('path',{d:a.d,class:'v-td-arc'+(a.id===choix?' est-choisi':'')});p.setAttribute('data-id',a.id);p.setAttribute('data-moment',a.id);
   if(o.choisir){p.setAttribute('role','button');p.setAttribute('tabindex','0');p.setAttribute('aria-pressed',a.id===choix?'true':'false');
    if(nom)p.setAttribute('aria-label',nom);var ti=svgEl('title');ti.textContent=nom;p.appendChild(ti);
    p.onclick=function(){o.choisir(a.id)};
    p.onkeydown=function(e){if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){e.preventDefault();o.choisir(a.id)}}}
   if(o.surligner){p.onmouseenter=function(){o.surligner(a.id)};p.onmouseleave=function(){o.surligner(null)}}
   svg.appendChild(p);if(a.dPrevu)svg.appendChild(svgEl('path',{d:a.dPrevu,class:'v-td-prevu'}))});
  M.zones.forEach(function(z){svg.appendChild(svgEl('path',{d:z.d,class:'v-td-zone'}))});
  var centre=svgEl('text',{x:CENTRE,y:CENTRE-4,'text-anchor':'middle',class:'v-td-centre'});centre.textContent=o.centre||'JOUR J';svg.appendChild(centre);
  var sous=svgEl('text',{x:CENTRE,y:CENTRE+25,'text-anchor':'middle',class:'v-td-sous'});sous.textContent=fen.jour?'24 heures':deps.C.hm(fen.debut)+' → '+deps.C.hm(fen.fin);svg.appendChild(sous);
  if(M.debordements.length){var plus=svgEl('text',{x:CENTRE,y:CENTRE+54,'text-anchor':'middle',class:'v-td-plus'});plus.textContent='+'+M.debordements.length+' autres moments';svg.appendChild(plus)}
 }
function monter(){
 if(!root.document||!root.document.getElementById('tempsDemoQui'))return;
 var D=deps.demo,mode='liste',choix='camille',choisi=null,etat=root.document.getElementById('tempsDemoEtat');
 function $(id){return root.document.getElementById(id)}
 function majTexte(texte){if(etat)etat.textContent=texte}
 function momentDe(vue,id){var t=null;((vue&&vue.moments)||[]).some(function(m){if(m.id===id){t=m;return true}return false});return t}
 /* le bouton d'un moment, dans un panneau : sert à rendre le focus après un rendu (la liste est reconstruite) */
 function cibler(id,panneau){var s=id&&$(panneau);return s?s.querySelector('[data-moment="'+id+'"]'):null}
 function focaliser(b){if(!b)return;try{b.focus({preventScroll:true})}catch(_){b.focus()}}
  function liste(vue,id){var L=$(id);if(!L)return;L.textContent='';   /* la liste ne sert plus qu'à Programme */
  vue.moments.forEach(function(m){
   var li=el('li'),b=el('button','v-temps-item'),h=el('time','v-temps-h',m.debut+' – '+m.fin+(m.fm>=1440?' · lendemain':''));h.setAttribute('datetime',m.debut);b.appendChild(h);
   var c=el('span','v-temps-item-texte');c.appendChild(el('b',null,m.titre));if(m.lieu)c.appendChild(el('span','v-temps-lieu',m.lieu));
   if(m.decalage)c.appendChild(el('span','v-temps-changement','Horaire modifié · prévu '+m.prevu));if(m.fait)c.appendChild(el('span','v-temps-changement','Fait'));
   b.appendChild(c);b.type='button';b.setAttribute('aria-label',resumeMoment(m));b.setAttribute('data-moment',m.id);if(m.id===choisi)b.setAttribute('aria-current','true');
   b.onclick=function(){choisir(m.id)};
   li.appendChild(b);L.appendChild(li)})}
 /* choisir le même moment deux fois le relâche : le cadran revient à la journée entière */
 function choisir(id){choisi=choisi===id?null:id;afficherApercu()}
 /* l'aperçu de l'accueil : la vue du module Temps, et le moment choisi s'il y en a un */
 function dessinerApercu(vue,info){var s=$('tempsDemoSvg');if(!s)return;var m=choisi?momentDe(vue,choisi):null,noms={};
  vue.moments.forEach(function(x){noms[x.id]=resumeMoment(x)});   /* le même texte que la Liste, jamais recopié */
  dessiner(s,modeleCercle(vue,m?fenetreMoment(m):null),{choisi:choisi,qui:info.personne.nom,choisir:choisir,noms:noms,ids:{titre:'tempsDemoSvgT',desc:'tempsDemoSvgD'}})}
 function afficherApercu(){
  if(!D)return;var info;try{info=preparer(D,choix)}catch(e){majTexte(e.message);return}
  var who=$('tempsDemoPlace'),n=$('tempsDemoNombre'),panelL=$('tempsDemoListe'),panelC=$('tempsDemoCercle'),titre=$('tempsDemoTitre');
  if(choisi&&!momentDe(info.vue,choisi))choisi=null;   /* la place a changé : un moment qu'elle ne voit pas ne reste pas choisi */
  if(who)who.textContent=info.personne.nom+' · '+((deps.Roles&&deps.Roles.de(info.personne.role).nom)||info.personne.role);
  if(n)n.textContent=info.vue.moments.length+' moment'+(info.vue.moments.length===1?'':'s')+' visible'+(info.vue.moments.length===1?'':'s');
  if(titre)titre.textContent=mode==='cercle'?'Circle':'Programme';
  if(panelL)panelL.hidden=mode!=='liste';if(panelC)panelC.hidden=mode!=='cercle';
  var actif=root.document.activeElement, garde=actif&&actif.getAttribute?actif.getAttribute('data-moment'):null;
  liste(info.vue,'tempsDemoMoments');   /* Circle n'a pas de liste : le cadran est seul (les arcs sont les boutons) */
  var m=choisi?momentDe(info.vue,choisi):null,jour=$('tempsDemoJour'),det=$('tempsDemoDetail'),cap=$('tempsDemoLegende');
  if(mode==='cercle')dessinerApercu(info.vue,info);
  /* le cadran est redessiné : le focus revient sur l'arc qui l'avait, une fois le nouveau dessin en place */
  if(garde)focaliser(cibler(garde,mode==='cercle'?'tempsDemoCercle':'tempsDemoMoments'));
  if(det)det.textContent=m?resumeMoment(m):(mode==='cercle'?'Rien n’est choisi : le cadran montre la journée entière.':'Choisissez un moment : sa ligne dit tout de lui.');
  if(jour)jour.hidden=!(mode==='cercle'&&m);
  if(cap)cap.textContent=(mode==='cercle'&&m)
   ? 'Cadran restreint à '+deps.C.hm(fenetreMoment(m).debut)+' – '+deps.C.hm(fenetreMoment(m).fin)+' (heure de fin comprise) ; « Revenir à la journée entière » rend les 24 heures.'
   : 'Chaque moment est un arc à son heure : touchez-le (ou Tab puis Entrée) et le cadran s’arrête dessus.';
  var caches=Math.max(0,info.total-info.vue.moments.length);
  majTexte(caches?info.vue.moments.length+' moments visibles. '+caches+' autre'+(caches===1?'':'s')+' '+(caches===1?'n’est':'ne sont')+' pas envoyé'+(caches===1?'':'s')+' à cette place.':'Cette place voit les '+info.total+' moments du programme.');
 }
 var select=$('tempsDemoQui'),modes=root.document.querySelectorAll('[data-temps-mode]'),retour=$('tempsDemoJour');
 function remplirSelect(){if(!select)return;if(!D){select.disabled=true;return}select.textContent='';PERSONNES.forEach(function(p){if(!D.personnes.some(function(x){return x.cle===p.cle}))return;var o=el('option',null,p.libelle);o.value=p.cle;select.appendChild(o)});select.value=choix;select.disabled=false}
 if(select)select.onchange=function(){choix=select.value;choisi=null;afficherApercu()};remplirSelect();
 Array.prototype.forEach.call(modes,function(b){b.disabled=!D;b.onclick=function(){if(!D)return;mode=b.getAttribute('data-temps-mode')==='cercle'?'cercle':'liste';Array.prototype.forEach.call(modes,function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});afficherApercu()}});
 if(retour)retour.onclick=function(){var id=choisi;choisi=null;afficherApercu();focaliser(cibler(id,'tempsDemoCercle'))};
 if(D){afficherApercu();return}
 if(!root.fetch){majTexte('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.');return}
 root.fetch('/modules/temps/demo-camille-gabriel.json',{credentials:'omit',cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.');return r.json()}).then(function(d){D=d;remplirSelect();Array.prototype.forEach.call(modes,function(b){b.disabled=false});afficherApercu()}).catch(function(){majTexte('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.')});
}
return{PERSONNES:PERSONNES,preparer:preparer,modeleCercle:modeleCercle,fenetreMoment:fenetreMoment,resumeMoment:resumeMoment,dessiner:dessiner,monter:monter};
});
