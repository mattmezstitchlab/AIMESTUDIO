/* AIME · aperçu public du Temps, en lecture seule.
   Même fixture que le module (modules/temps/demo-camille-gabriel.json), mêmes permissions et même moteur pur que le serveur.
   L'accueil ne lit aucun projet réel et n'invente aucune date : seule la démonstration fictive est chargée. */
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
function modeleCercle(vue){if(!deps.C)throw new Error('Circle est indisponible.');return deps.C.modele(vue,{rayon:352,epaisseur:38,ecart:9})}
function monter(){
 if(!root.document||!root.document.getElementById('tempsDemoQui'))return;
 var D=deps.demo,mode='liste',choix='camille',etat=root.document.getElementById('tempsDemoEtat');
 function majTexte(texte){if(etat)etat.textContent=texte}
 function liste(vue,id){var L=root.document.getElementById(id);if(!L)return;L.textContent='';
  vue.moments.forEach(function(m){var li=el('li','v-temps-item'),h=el('time','v-temps-h',m.debut+' – '+m.fin+(m.fm>=1440?' · lendemain':''));h.setAttribute('datetime',m.debut);li.appendChild(h);
   var c=el('span','v-temps-item-texte');c.appendChild(el('b',null,m.titre));if(m.lieu)c.appendChild(el('span','v-temps-lieu',m.lieu));
   if(m.decalage)c.appendChild(el('span','v-temps-changement','Horaire modifié · prévu '+m.prevu));if(m.fait)c.appendChild(el('span','v-temps-changement','Fait'));
   li.appendChild(c);L.appendChild(li)})}
 function dessiner(vue,info){
  var s=root.document.getElementById('tempsDemoSvg');if(!s)return;var M=modeleCercle(vue),C=deps.C,CENTRE=M.centre;
  while(s.firstChild)s.removeChild(s.firstChild);
  var titre=svgEl('title',{id:'tempsDemoSvgT'});titre.textContent='Circle · journée de 24 heures';s.appendChild(titre);
  var desc=svgEl('desc',{id:'tempsDemoSvgD'});desc.textContent='Cadran de 24 heures : '+M.arcs.length+' moments sont représentés dans la vue de '+info.personne.nom+'. Leurs horaires sont listés après le dessin.';s.appendChild(desc);
  s.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon+M.epaisseur/2+8,class:'v-td-face'}));
  s.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon+M.epaisseur/2+8,class:'v-td-anneau'}));
  for(var i=0;i<M.couloirs;i++)s.appendChild(svgEl('circle',{cx:CENTRE,cy:CENTRE,r:M.rayon-i*(M.epaisseur+M.ecart),class:'v-td-piste',style:'stroke-width:'+M.epaisseur+'px'}));
  M.graduations.forEach(function(g){s.appendChild(svgEl('line',{x1:g.x1,y1:g.y1,x2:g.x2,y2:g.y2,class:g.cardinale?'v-td-tick fort':'v-td-tick'}));if(g.texte){var t=svgEl('text',{x:g.lx,y:g.ly,'text-anchor':g.ancre,class:'v-td-heure'});t.textContent=g.texte;s.appendChild(t)}});
  M.arcs.forEach(function(a){s.appendChild(svgEl('path',{d:a.d,class:'v-td-arc'}));if(a.dPrevu)s.appendChild(svgEl('path',{d:a.dPrevu,class:'v-td-prevu'}))});
  M.zones.forEach(function(z){s.appendChild(svgEl('path',{d:z.d,class:'v-td-zone'}))});
  var centre=svgEl('text',{x:CENTRE,y:CENTRE-4,'text-anchor':'middle',class:'v-td-centre'});centre.textContent='JOUR J';s.appendChild(centre);
  var sous=svgEl('text',{x:CENTRE,y:CENTRE+25,'text-anchor':'middle',class:'v-td-sous'});sous.textContent='24 heures';s.appendChild(sous);
  if(M.debordements.length){var plus=svgEl('text',{x:CENTRE,y:CENTRE+54,'text-anchor':'middle',class:'v-td-plus'});plus.textContent='+'+M.debordements.length+' autres moments';s.appendChild(plus)}
 }
 function afficherApercu(){
  if(!D)return;var info;try{info=preparer(D,choix)}catch(e){majTexte(e.message);return}
  var who=root.document.getElementById('tempsDemoPlace'),n=root.document.getElementById('tempsDemoNombre'),panelL=root.document.getElementById('tempsDemoListe'),panelC=root.document.getElementById('tempsDemoCercle'),titre=root.document.getElementById('tempsDemoTitre');
  if(who)who.textContent=info.personne.nom+' · '+((deps.Roles&&deps.Roles.de(info.personne.role).nom)||info.personne.role);
  if(n)n.textContent=info.vue.moments.length+' moment'+(info.vue.moments.length===1?'':'s')+' visible'+(info.vue.moments.length===1?'':'s');
  if(titre)titre.textContent=mode==='cercle'?'Circle':'Programme';
  if(panelL)panelL.hidden=mode!=='liste';if(panelC)panelC.hidden=mode!=='cercle';
  liste(info.vue,'tempsDemoMoments');liste(info.vue,'tempsDemoMomentsCercle');
  if(mode==='cercle')dessiner(info.vue,info);
  var caches=Math.max(0,info.total-info.vue.moments.length);
  majTexte(caches?info.vue.moments.length+' moments visibles. '+caches+' autre'+(caches===1?'':'s')+' '+(caches===1?'n’est':'ne sont')+' pas envoyé'+(caches===1?'':'s')+' à cette place.':'Cette place voit les '+info.total+' moments du programme.');
 }
 var select=root.document.getElementById('tempsDemoQui'),modes=root.document.querySelectorAll('[data-temps-mode]');
 function remplirSelect(){if(!select)return;if(!D){select.disabled=true;return}select.textContent='';PERSONNES.forEach(function(p){if(!D.personnes.some(function(x){return x.cle===p.cle}))return;var o=el('option',null,p.libelle);o.value=p.cle;select.appendChild(o)});select.value=choix;select.disabled=false}
 if(select)select.onchange=function(){choix=select.value;afficherApercu()};remplirSelect();
 Array.prototype.forEach.call(modes,function(b){b.disabled=!D;b.onclick=function(){if(!D)return;mode=b.getAttribute('data-temps-mode')==='cercle'?'cercle':'liste';Array.prototype.forEach.call(modes,function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});afficherApercu()}});
 if(D){afficherApercu();return}
 if(!root.fetch){majTexte('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.');return}
 root.fetch('/modules/temps/demo-camille-gabriel.json',{credentials:'omit',cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.');return r.json()}).then(function(d){D=d;remplirSelect();Array.prototype.forEach.call(modes,function(b){b.disabled=false});afficherApercu()}).catch(function(){majTexte('Aperçu indisponible : le programme de démonstration ne peut pas être chargé.')});
}
return{PERSONNES:PERSONNES,preparer:preparer,modeleCercle:modeleCercle,monter:monter};
});
