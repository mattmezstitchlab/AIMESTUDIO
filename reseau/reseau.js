/* AIME · Réseau des facettes vivantes · le démonstrateur.
   Six entrées (Profils, Créations, Médias, Musique, Modules, Boutique). Une carte montre UNE facette à la fois, rendue par
   le moteur de pages avec ses vrais blocs ; la toucher passe à la suivante, sans quitter sa place dans la mosaïque.
   Les créations sont les projets réels du Point Zéro (IndexedDB « aime-point-zero ») : leur page Métamorphose est celle que
   la personne a composée (« aime-sites »), sinon celle que le moteur en tire, sans rien enregistrer ni dupliquer.
   Actions : Mettre de côté (une référence dans la bibliothèque), Tester (un module, isolé, avec des données fictives),
   Ajouter à mon cube (une instance d'un module autorisé dans SON projet, après vérification), Inspecter (source, auteur,
   version, licence, visibilité). L'orbe les propose ; les mêmes boutons restent visibles pour qui ne l'utilise pas. */
(function(){'use strict';
var S=window.AIMESite,R=window.AIMEReseau,MS=window.AIMEMiniSite,B=window.AIMEBroderie,MO=window.AIMEModes;if(!S||!R)return;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(i){return document.getElementById(i)},PRES=null,moi={id:'cet-appareil',name:'Vous',image:null,local:true},projets=[],onglet='creations',CLE_B='aime-bibliotheque',CLE_S='aime-sites';
var ONGLETS=[['profils','Profils'],['creations','Créations'],['medias','Médias'],['musique','Musique'],['modules','Modules'],['boutique','Boutique']];
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function bouton(t,c,f){var b=el('button',c||'rx-b',t);b.type='button';if(f)b.onclick=f;return b}
function lire(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
var biblio=R.relire(lire(CLE_B,null));function garderBiblio(){ecrire(CLE_B,biblio);$('rx-nb').textContent=biblio.items.length}
function jour(t){var d=new Date(t);return isNaN(d)?'':d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}

/* ---------- les données : la personne, ses projets, leurs pages ---------- */
function json(u){return fetch(u,{credentials:'same-origin',cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
function base(){return new Promise(function(ok){if(!window.indexedDB)return ok([]);var r;try{r=indexedDB.open('aime-point-zero',2)}catch(e){return ok([])}
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('fichiers'))db.createObjectStore('fichiers',{keyPath:'id'});if(!db.objectStoreNames.contains('projets'))db.createObjectStore('projets',{keyPath:'id'})};
 r.onerror=function(){ok([])};r.onsuccess=function(){try{var g=r.result.transaction('projets','readonly').objectStore('projets').getAll();g.onsuccess=function(){ok(g.result||[])};g.onerror=function(){ok([])}}catch(e){ok([])}}})}
function enDataURL(b){return new Promise(function(ok){if(!b||!(b instanceof Blob))return ok(null);var f=new FileReader();f.onload=function(){ok(/^data:image\/(png|jpe?g|webp);base64,/.test(f.result)?f.result:null)};f.onerror=function(){ok(null)};f.readAsDataURL(b)})}
/* la page d'un projet : celle que la personne a composée, sinon celle du moteur ; jamais enregistrée ici */
function pageDe(p,photo){var garde=(lire(CLE_S,{sites:{}}).sites||{})[MS.siteId(p)];return MS.depuis(p,{S:S,B:B,M:MO,ancien:garde,photo:photo,motif:p.apercu})}
function charger(){return Promise.all([json('/vitrine/presentation/studio.json'),json('/api/auth/get-session'),base()]).then(function(r){PRES=r[0];var u=r[1]&&r[1].user;if(u)moi={id:u.id,name:u.name||'Vous',image:u.image,local:false};
 var L=(r[2]||[]).filter(function(p){return p&&p.palette&&p.palette.length}).sort(function(a,b){return(b.maj||0)-(a.maj||0)}).slice(0,12);
 return Promise.all(L.map(function(p){return enDataURL(p.image).then(function(ph){return{p:p,photo:ph,site:pageDe(p,ph)}})}))}).then(function(L){projets=L})}

/* ---------- une carte vivante ---------- */
function timbre(mini){if(!window.AIMETimbre)return el('span');return AIMETimbre.creer({id:moi.id,nom:moi.name,image:moi.image,mini:mini!==false,legende:false})}
function rendu(site){return S.document(site,{presentation:PRES,medias:'/sites/bibliotheque/'}).html}
/* c : {cle, titre, sorte, facettes:[{nom, site? | html?}], meta:{source,auteur,version,licence,visibilite}, ref(facette), actions:[…]} */
function carte(c){var a=el('article','rx-carte'),i=0;a.dataset.cle=c.cle;a.setAttribute('aria-label',c.sorte+' : '+c.titre);
 var h=el('header','rx-c-t');h.appendChild(c.timbre||timbre());var t=el('div');t.appendChild(el('b',null,c.titre));t.appendChild(el('small',null,c.sorte+' · '+c.meta.auteur));h.appendChild(t);a.appendChild(h);
 var scene=el('div','rx-scene'),cadre=el('iframe','rx-if'),html=el('div','rx-html');cadre.title='Facette';cadre.setAttribute('tabindex','-1');cadre.setAttribute('loading','lazy');scene.appendChild(cadre);scene.appendChild(html);
 var suivant=bouton('','rx-suite');scene.appendChild(suivant);a.appendChild(scene);
 var pts=el('div','rx-pts');pts.setAttribute('role','group');pts.setAttribute('aria-label','Facettes');var dots=c.facettes.map(function(f,k){var d=bouton('','rx-pt',function(e){e.stopPropagation();aller(k)});d.setAttribute('aria-label','Facette '+(k+1)+' : '+f.nom);pts.appendChild(d);return d});a.appendChild(pts);
 var nom=el('p','rx-nom');a.appendChild(nom);var meta=el('p','rx-meta',c.meta.source+' · v'+c.meta.version+' · '+c.meta.visibilite);a.appendChild(meta);
 var act=el('div','rx-act');a.appendChild(act);
 var orbe=bouton('','rx-orbe');orbe.setAttribute('aria-label','L\'orbe : actions possibles');orbe.setAttribute('aria-haspopup','menu');act.appendChild(orbe);
 var cote=bouton('Mettre de côté','rx-b');act.appendChild(cote);(c.actions||[]).forEach(function(x){act.appendChild(bouton(x.nom,'rx-b'+(x.p?' p':''),function(){x.faire(i)}))});
 function majCote(){var dans=R.contient(biblio,c.ref(i));cote.textContent=dans?'Mis de côté ✓':'Mettre de côté';cote.setAttribute('aria-pressed',dans?'true':'false')}
 cote.onclick=function(){var r=c.ref(i);if(R.contient(biblio,r))R.retirer(biblio,R.cle(r));else R.mettreDeCote(biblio,r,{titre:c.titre+' · '+c.facettes[i].nom,source:c.meta.source,auteur:c.meta.auteur,version:c.meta.version});garderBiblio();majCote();annoncer(cote.textContent==='Mettre de côté'?'Retiré de la bibliothèque.':'Mis de côté : une référence, pas une copie.')};
 orbe.onclick=function(e){e.stopPropagation();menuOrbe(orbe,c,i,cote)};
 function aller(k,anime){k=(k+c.facettes.length)%c.facettes.length;var f=c.facettes[k],change=k!==i;i=k;dots.forEach(function(d,j){d.setAttribute('aria-current',j===i?'true':'false')});
  nom.textContent=f.nom+' · '+(i+1)+' / '+c.facettes.length;suivant.setAttribute('aria-label','Facette '+(i+1)+' sur '+c.facettes.length+' : '+f.nom+'. Afficher la suivante');majCote();
  var montrer=function(){if(f.site){html.hidden=true;cadre.hidden=false;cadre.onload=function(){scene.classList.remove('sort');if(change&&!RM){scene.classList.remove('entre');void scene.offsetWidth;scene.classList.add('entre')}};cadre.srcdoc=rendu(f.site)}
   else{cadre.hidden=true;html.hidden=false;html.textContent='';html.appendChild(f.html());scene.classList.remove('sort');if(change&&!RM){scene.classList.remove('entre');void scene.offsetWidth;scene.classList.add('entre')}}};
  if(change&&!RM&&anime!==false){scene.classList.add('sort');setTimeout(montrer,170)}else montrer()}
 suivant.onclick=function(){aller(i+1)};suivant.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();aller(i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();aller(i-1)}});
 a.voir=function(k){aller(k,false);a.scrollIntoView({block:'center',behavior:RM?'auto':'smooth'});suivant.focus({preventScroll:true})};a.facette=function(){return i};
 /* rendu à l'approche de l'écran seulement : une mosaïque reste légère */
 var vu=false,go=function(){if(!vu){vu=true;aller(0,false)}};if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){if(en.some(function(x){return x.isIntersecting})){go();io.disconnect()}},{rootMargin:'300px'});io.observe(a)}else go();
 return a}

/* l'orbe : les actions autorisées, en contexte ; un menu simple, au clavier aussi */
function menuOrbe(o,c,i,cote){fermerMenus();var m=el('div','rx-menu');m.setAttribute('role','menu');var items=[['Inspecter',function(){inspecter(c,i)}],[cote.textContent,function(){cote.click()}]].concat((c.actions||[]).map(function(x){return[x.nom,function(){x.faire(i)}]}));
 m.appendChild(el('p','rx-menu-t','L\'orbe propose'));items.forEach(function(x){var b=bouton(x[0],'rx-menu-i',function(){fermerMenus();x[1]()});b.setAttribute('role','menuitem');m.appendChild(b)});
 o.parentNode.appendChild(m);var b0=m.querySelector('button');b0&&b0.focus();m.addEventListener('keydown',function(e){var L=[].slice.call(m.querySelectorAll('button')),k=L.indexOf(document.activeElement);if(e.key==='Escape'){fermerMenus();o.focus()}else if(e.key==='ArrowDown'){e.preventDefault();L[(k+1)%L.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();L[(k-1+L.length)%L.length].focus()}})}
function fermerMenus(){[].forEach.call(document.querySelectorAll('.rx-menu'),function(m){m.remove()})}
document.addEventListener('click',function(e){if(!e.target.closest('.rx-menu,.rx-orbe'))fermerMenus()});

/* ---------- fenêtres : inspecter, tester, ajouter, visionner, bibliothèque ---------- */
function fenetre(titre,corps,large){var v=el('div','rx-voile'),f=el('div','rx-fen'+(large?' large':''));f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label',titre);
 var h=el('div','rx-fen-t');h.appendChild(el('b',null,titre));var x=bouton('Fermer','rx-b');h.appendChild(x);f.appendChild(h);f.appendChild(corps);v.appendChild(f);document.body.appendChild(v);document.documentElement.style.overflow='hidden';
 var avant=document.activeElement,fermer=function(){v.remove();document.documentElement.style.overflow='';if(avant&&avant.focus)avant.focus({preventScroll:true})};x.onclick=fermer;
 v.addEventListener('click',function(e){if(e.target===v)fermer()});v.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}if(e.key==='Tab'){var L=[].filter.call(f.querySelectorAll('button,a,select,iframe'),function(z){return!z.disabled&&z.offsetParent!==null});if(!L.length)return;if(e.shiftKey&&document.activeElement===L[0]){e.preventDefault();L[L.length-1].focus()}else if(!e.shiftKey&&document.activeElement===L[L.length-1]){e.preventDefault();L[0].focus()}}});
 x.focus();return{fermer:fermer,el:f}}
function inspecter(c,i){var d=el('dl','rx-dl');[['Facette',c.facettes[i].nom],['Création',c.titre],['Auteur',c.meta.auteur],['Source',c.meta.source],['Version',c.meta.version],['Licence',c.meta.licence],['Visibilité',c.meta.visibilite]].forEach(function(x){d.appendChild(el('dt',null,x[0]));d.appendChild(el('dd',null,x[1]))});fenetre('Inspecter',d)}
function annoncer(t){var a=$('rx-annonce');if(!a){a=el('p','rx-annonce');a.id='rx-annonce';a.setAttribute('role','status');document.body.appendChild(a)}a.textContent=t;a.hidden=false;clearTimeout(annoncer.t);annoncer.t=setTimeout(function(){a.hidden=true},3600)}
/* Tester : une page de démonstration, données fictives, dans un cadre isolé (aucun script, aucune donnée du compte) */
function tester(m){var b=el('div','rx-test'),f=el('iframe','rx-if-test');f.setAttribute('sandbox','');f.title='Démonstration isolée : '+m.nom;f.srcdoc=rendu(R.demo(m,S));b.appendChild(f);
 b.appendChild(el('p','rx-aide','Démonstration isolée : des données fictives, dans un cadre sans script ni accès à votre compte. Rien n\'est ajouté à vos projets.'));fenetre('Tester · '+m.nom,b,true)}
/* Ajouter à mon cube : choisir son projet, vérifier, puis intégrer une instance (jamais l'original) */
function ajouter(m){var b=el('div','rx-aj');if(!projets.length){b.appendChild(el('p',null,'Aucun projet sur cet appareil : créez-en un au Point Zéro, puis revenez.'));var a=el('a','rx-b p','Ouvrir le Point Zéro');a.href='/point-zero/';b.appendChild(a);fenetre('Ajouter à mon cube · '+m.nom,b);return}
 var l=el('label','rx-champ');l.appendChild(el('span',null,'Dans quel projet ?'));var s=el('select');projets.forEach(function(x,k){var o=el('option',null,x.p.titre||'Projet');o.value=k;s.appendChild(o)});l.appendChild(s);b.appendChild(l);
 var liste=el('ul','rx-ver'),fin=el('div','rx-act'),dit=el('p','rx-aide');b.appendChild(liste);b.appendChild(dit);b.appendChild(fin);var w=fenetre('Ajouter à mon cube · '+m.nom,b);
 function maj(){var x=projets[+s.value],v=R.verifier(m,{site:x.site,proprietaire:true},S);liste.textContent='';fin.textContent='';
  v.points.forEach(function(q){var li=el('li',q.ok?'ok':'non');li.appendChild(el('b',null,(q.ok?'✓ ':'✗ ')+q.nom));li.appendChild(el('span',null,q.dit));liste.appendChild(li)});
  dit.textContent=v.ok?'Tout est compatible : rien à régler. L\'orbe vous demande seulement de confirmer.':'L\'intégration n\'est pas possible pour l\'instant ; rien ne sera modifié.';
  if(v.ok)fin.appendChild(bouton('Confirmer l\'ajout','rx-b p',function(){try{R.integrer(m,x.site,S);var e=lire(CLE_S,{sites:{},cur:null});if(!e.sites)e.sites={};e.sites[x.site.id]=x.site;if(!e.cur)e.cur=x.site.id;
   if(!ecrire(CLE_S,e)){dit.textContent='Ce navigateur est plein : rien n\'a été enregistré.';return}
   fin.textContent='';dit.textContent='Ajouté à « '+(x.p.titre||'Projet')+' » : une nouvelle facette, visible dans votre mini-site et sa carte.';var a=el('a','rx-b p','Voir mon mini-site');a.href='/projet/?id='+encodeURIComponent(x.p.id)+'&de=/bureau/';fin.appendChild(a);liste.textContent='';afficher(onglet,true)}
   catch(err){dit.textContent=err.message}}))}
 s.onchange=maj;maj()}
function visionner(c,i){var f=c.facettes[i],b=el('div','rx-vis');if(f.site){var fr=el('iframe','rx-if-vis');fr.title=f.nom;fr.srcdoc=rendu(f.site);b.appendChild(fr)}else b.appendChild(f.html());fenetre(c.titre+' · '+f.nom,b,true)}
function bibliotheque(){var b=el('div','rx-bib');if(!biblio.items.length)b.appendChild(el('p','rx-aide','Rien de mis de côté pour l\'instant. « Mettre de côté » garde une référence vers une facette ou un module, pas une copie.'));
 var ul=el('ul');biblio.items.forEach(function(it){var li=el('li');var t=el('div');t.appendChild(el('b',null,it.titre));t.appendChild(el('small',null,(it.type==='module'?'Module':'Facette')+' · '+it.auteur+' · v'+it.version+' · '+jour(it.le)));li.appendChild(t);
  li.appendChild(bouton('Retrouver','rx-b',function(){w.fermer();retrouver(it)}));li.appendChild(bouton('Retirer','rx-b',function(){R.retirer(biblio,it.cle);garderBiblio();li.remove();afficher(onglet,true)}));ul.appendChild(li)});
 b.appendChild(ul);b.appendChild(el('p','rx-aide','Bibliothèque gardée sur cet appareil, en attendant la sauvegarde serveur.'));var w=fenetre('Ma bibliothèque',b)}
function retrouver(it){var m=it.cle.match(/^facette:(.+)#(.+)$/),mo=it.cle.match(/^module:(.+)$/);afficher(mo?'modules':'creations');setTimeout(function(){var a=document.querySelector('.rx-carte[data-cle="'+(mo?'module:'+mo[1]:'projet:'+m[1])+'"]');if(!a)return annoncer('Cette source n\'est plus disponible sur cet appareil.');
  var k=0;if(m){var c=a.carte;c.facettes.forEach(function(f,j){if(f.id===m[2])k=j})}a.voir(k)},60)}

/* ---------- les entrées ---------- */
function carteProjet(x){var p=x.p,F=R.facettesDe(x.site).map(function(f){return{id:f.id,nom:f.nom,site:R.seule(x.site,f.id)}});
 var c={cle:'projet:'+p.id,titre:p.titre||'Projet broderie',sorte:'Création · Broderie',facettes:F,ref:function(i){return{projet:p.id,facette:F[i].id}},
  meta:{auteur:moi.name,source:'Projet Point Zéro « '+(p.titre||'Projet')+' »',version:jour(p.maj||p.cree)||'1',licence:'Tous droits réservés (non publié)',visibilite:'Privé · démonstration locale'},
  actions:[{nom:'Agrandir',faire:function(i){visionner(c,i)}},{nom:'Voir mon mini-site',faire:function(){location.href='/projet/?id='+encodeURIComponent(p.id)+'&de=/bureau/'}}]};
 var a=carte(c);a.carte=c;return a}
function carteModule(m){var pres=function(){var d=el('div','rx-mod');d.appendChild(el('b',null,m.nom));d.appendChild(el('p',null,m.dit));var u=el('ul');[['Bloc du moteur',(S.BLOCS[m.bloc]||{}).nom||m.bloc],['Auteur',m.auteur],['Version',m.version],['Licence',R.LICENCES[m.licence]],['Domaines',m.domaines.join(', ')]].forEach(function(z){var li=el('li');li.appendChild(el('span',null,z[0]));li.appendChild(el('b',null,z[1]));u.appendChild(li)});d.appendChild(u);return d};
 var compat=function(){var d=el('div','rx-mod');d.appendChild(el('b',null,'Compatibilité'));if(!projets.length){d.appendChild(el('p',null,'Aucun projet sur cet appareil pour le vérifier.'));return d}var x=projets[0],v=R.verifier(m,{site:x.site,proprietaire:true},S);
  d.appendChild(el('p',null,'Avec « '+(x.p.titre||'Projet')+' » : '+(v.ok?'compatible, sans réglage.':'pas maintenant.')));var u=el('ul','rx-ver');v.points.forEach(function(q){var li=el('li',q.ok?'ok':'non');li.appendChild(el('b',null,(q.ok?'✓ ':'✗ ')+q.nom));u.appendChild(li)});d.appendChild(u);return d};
 var c={cle:'module:'+m.id,titre:m.nom,sorte:'Module',facettes:[{id:'presentation',nom:'Présentation',html:pres},{id:'demo',nom:'Démonstration',site:R.demo(m,S)},{id:'compat',nom:'Compatibilité',html:compat}],ref:function(){return{module:m.id}},
  meta:{auteur:m.auteur,source:'Registre des capacités AIME',version:m.version,licence:R.LICENCES[m.licence],visibilite:'Public · module autorisé'},
  actions:[{nom:'Tester',faire:function(){tester(m)}},{nom:'Ajouter à mon cube',p:true,faire:function(){ajouter(m)}}],timbre:(function(){var o=el('span','rx-orbe-mini');o.setAttribute('aria-hidden','true');return o})()};
 var a=carte(c);a.carte=c;return a}
function vide(t,d,lien){var v=el('div','rx-vide');v.appendChild(el('b',null,t));v.appendChild(el('p',null,d));if(lien){var a=el('a','rx-b p',lien[0]);a.href=lien[1];v.appendChild(a)}return v}
function afficher(id,garder){onglet=id;[].forEach.call(document.querySelectorAll('.rx-o'),function(b){var on=b.dataset.o===id;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1});
 var P=$('rx-panneau');P.setAttribute('aria-labelledby','rx-o-'+id);var avant=garder?[].map.call(P.querySelectorAll('.rx-carte'),function(a){return[a.dataset.cle,a.facette()]}):[];P.textContent='';var g=el('div','rx-grille');
 if(id==='creations'){if(!projets.length)P.appendChild(vide('Pas encore de création sur cet appareil','Une broderie préparée au Point Zéro apparaît ici, facette après facette : le motif, la palette, les dimensions, la progression.',['Commencer au Point Zéro','/point-zero/']));else projets.forEach(function(x){g.appendChild(carteProjet(x))})}
 else if(id==='modules'){P.appendChild(el('p','rx-aide','Des capacités autorisées : chacune est un bloc du moteur de pages, sans code extérieur. Testez-les à part, ou ajoutez-les à votre projet après vérification.'));R.MODULES.forEach(function(m){g.appendChild(carteModule(m))})}
 else if(id==='profils')P.appendChild(vide('Les profils arrivent avec la publication','Un profil montrera d\'abord sa face Identité (le timbre), puis les facettes que la personne a choisi de rendre visibles. Rien n\'est publié automatiquement.',['Mon cube','/bureau/']));
 else if(id==='medias')P.appendChild(vide('Les médias arrivent avec la publication','Photographies, vidéos, portfolios : une visionneuse dans le Réseau, avec les droits déclarés par chaque créateur.'));
 else if(id==='musique')P.appendChild(vide('La musique arrive avec la publication','Des extraits autorisés et des playlists, filtrés par genre, ambiance et moment (« Mariage » puis « Cocktail »). Aucun droit de diffusion n\'est présumé.'));
 else P.appendChild(vide('La boutique viendra après les licences','Patrons, compositions, modèles, modules : gratuits ou payants, avec auteur, version, licence et compatibilité. Aucun paiement dans ce démonstrateur.'));
 if(g.childNodes.length)P.appendChild(g);avant.forEach(function(z){var a=P.querySelector('.rx-carte[data-cle="'+z[0]+'"]');if(a&&z[1])setTimeout(function(){a.voir&&a.voir(z[1])},0)})}
function onglets(){var T=$('rx-onglets');ONGLETS.forEach(function(o){var b=el('button','rx-o',o[1]);b.type='button';b.id='rx-o-'+o[0];b.dataset.o=o[0];b.setAttribute('role','tab');b.setAttribute('aria-controls','rx-panneau');b.onclick=function(){afficher(o[0])};T.appendChild(b)});
 T.addEventListener('keydown',function(e){var L=[].slice.call(T.querySelectorAll('.rx-o')),k=L.indexOf(document.activeElement);if(k<0)return;var n=e.key==='ArrowRight'?k+1:e.key==='ArrowLeft'?k-1:null;if(n==null)return;e.preventDefault();n=(n+L.length)%L.length;L[n].focus();afficher(L[n].dataset.o)})}

onglets();garderBiblio();$('rx-biblio').onclick=bibliotheque;
charger().then(function(){var q=$('rx-qui');q.appendChild(timbre());q.appendChild(el('span',null,moi.name+(moi.local?' · cet appareil':'')));afficher(new URLSearchParams(location.search).get('onglet')||'creations')}).catch(function(){afficher('creations')});
window.AIMEReseauDemo={projets:function(){return projets},biblio:function(){return biblio}};
})();
