/* AIME · le Bureau : assemble le contenu (sources du navigateur + registre de navigation + Carte), le fait mettre en
   page par le moteur partagé (AIMEVitrine.composer), puis branche ses interactions propres : sauvegarder, restaurer.
   Aucune donnée n'est écrite, sauf par une restauration que la personne a vue et confirmée. */
(function(){'use strict';
var V=window.AIMEVitrine,B=window.AIMEBureauSources,N=window.AIMENav,K=window.AIMECarte,R=window.AIMECarteRendu;
var racine=document.getElementById('espace'),vivant=document.getElementById('vivant');if(!V||!B||!N||!racine)return;
var S=(function(){try{var s=window.localStorage;s.getItem('x');return s}catch(e){return null}})();
var vide={length:0,key:function(){return null},getItem:function(){return null},setItem:function(){throw new Error('stockage indisponible')}};
var MODELE=null,PERSP=null,AMB=null,POL={};
function charger(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
var tDire=0;function dire(t){vivant.textContent='';clearTimeout(tDire);setTimeout(function(){vivant.textContent=t},30);tDire=setTimeout(function(){vivant.textContent=''},7000)}
function auj(){return new Date().toISOString().slice(0,10)}

/* les outils qui savent lister leurs projets ; les autres n'ont qu'un lien, et le Bureau le dit */
var LISTENT={};B.SOURCES.forEach(function(s){LISTENT[s.outil]=1});
function outils(role){return N.par('role',role).filter(function(e){return e.id!=='bureau'}).map(function(e){var o={href:e.href,nom:e.nom,phrase:e.phrase,statut:e.statut};
 if(role==='realiser'&&!LISTENT[e.id]&&!/^(stitchlab|web|buro|accessibilite|image)$/.test(e.id))o.note=e.id==='g44'?'Ne garde rien : rien à lister.':'Ses projets ne sont pas encore listés ici.';return o})}

/* les dossiers : un par outil qui a quelque chose dans ce navigateur, plus Ma carte, Applications, Lab, Découvrir */
var TEINTES={carte:['#FB7185','#F59E0B'],studio:['#7C5CFF','#22D3EE'],evenements:['#F472B6','#7C5CFF'],stitch:['#34D399','#22D3EE'],compositions:['#60A5FA','#7C5CFF'],infinity:['#FBBF24','#FB7185'],simulations:['#A3E635','#22D3EE'],sites:['#F472B6','#F59E0B'],timeline:['#F59E0B','#F472B6'],
 applications:['#22D3EE','#34D399'],lab:['#67E8F9','#7C5CFF'],decouvrir:['#FB7185','#7C5CFF'],archives:['#5E5E6A','#9C9CA8']};
var NOMS={studio:'Supports',evenements:'Événements',stitch:'Broderies',compositions:'Comparaisons',infinity:'Parties',simulations:'Démonstrations',sites:'Sites',timeline:'Jour J'};
var OUVRIR={studio:{lien:'/studio/',libelle:'Ouvrir le Studio'},evenements:{lien:'/studio/',libelle:'Ouvrir le Studio'},stitch:{lien:'/stitch/',libelle:'Ouvrir AIME Stitch'},compositions:{lien:'/synchroview/',libelle:'Ouvrir SynchroView'},infinity:{lien:'/infinity/',libelle:'Ouvrir INFINITY'},simulations:{lien:'/vitrine/world/',libelle:'Ouvrir AIME WORLD'},sites:{lien:'/canevas/',libelle:'Ouvrir le Canevas'}};
function contenu(){var st=S||vide,inv=B.inventaire(st),src={};inv.sources.forEach(function(s){src[s.id]=s});
 var D=[],carte=src.carte.projets;
 D.push({id:'carte',nom:'Ma carte',teinte:TEINTES.carte,elements:carte,sous:carte.length?'Créée dans ce navigateur':'À composer',vide:'Votre carte se compose sur Le Monde AIME : qui vous êtes, ce que vous faites, ce que vous préparez.',ouvrir:carte.length?null:{lien:'/aime/#story2',libelle:'Composer ma carte',principal:true}});
 var stitch=(src.stitch?src.stitch.projets:[]).concat(src.broderies?src.broderies.projets:[]);
 ['sites','studio','evenements','stitch','compositions','infinity','simulations'].forEach(function(id){var l=id==='stitch'?stitch:(src[id]?src[id].projets:[]);if(!l.length)return;
  D.push({id:id,nom:NOMS[id],teinte:TEINTES[id],elements:l,sous:id==='simulations'?l.length+' · données fictives':null,ouvrir:OUVRIR[id]})});
 D.push({id:'applications',nom:'Applications',teinte:TEINTES.applications,elements:outils('realiser'),sous:'Créer, ouvrir un outil'});
 D.push({id:'lab',nom:'Lab',teinte:TEINTES.lab,elements:outils('experimenter'),sous:'Expérimental'});
 D.push({id:'decouvrir',nom:'Découvrir',teinte:TEINTES.decouvrir,elements:outils('decouvrir'),sous:'Le Monde AIME et les démonstrateurs'});
 if(inv.ancienBureau.length)D.push({id:'archives',nom:'Archives',teinte:TEINTES.archives,sous:'Ancien Bureau · '+inv.ancienBureau.length+' réglages',elements:inv.ancienBureau.map(function(k){return{titre:k,detail:'Réglage de l\'ancien Bureau à fenêtres, conservé tel quel',lien:'#navigateur',action:'Compris dans la sauvegarde'}})});
 var nom={};inv.sources.forEach(function(s){nom[s.id]=NOMS[s.id]||s.nom});nom.broderies='Broderies';
 var rep=B.reprendre(inv,3).map(function(p){return{titre:p.titre,detail:p.detail,quand:p.quand,lien:p.lien,action:p.action,groupe:nom[p.source],demo:p.demo}});
 var nav=[];
 if(!S)nav.push('Ce navigateur refuse le stockage local (navigation privée, ou données du site bloquées) : le Bureau ne peut rien retrouver, et les outils ne pourront rien garder.');
 else nav.push('Vos projets sont enregistrés dans ce navigateur, pas sur un compte : '+inv.total+' élément'+(inv.total>1?'s':'')+' sur ce site. Il n\'y a ni synchronisation ni partage : un autre navigateur, un autre appareil ou une fenêtre privée ne les voient pas, et effacer les données du site les efface.');
 if(inv.ancienBureau.length)nav.push('Le dossier Archives garde '+inv.ancienBureau.length+' réglage'+(inv.ancienBureau.length>1?'s':'')+' de l\'ancien Bureau à fenêtres, retiré le 20 octobre 2026 : plus aucune page ne les utilise, ils sont conservés tels quels et font partie de la sauvegarde.');
 nav.push('Bêta : votre compte garde votre nom et votre timbre, mais pas encore vos projets, votre cube ni votre bibliothèque. La sauvegarde dans un fichier les emporte tous, images du Point Zéro comprises ; vous pourrez l\'importer dans votre compte quand la sauvegarde en ligne arrivera, et rien ne partira sans votre accord.');
 return{inv:inv,c:{espace:{kicker:'Mon Bureau',nom:'Reprendre,',accent:'là où vous en étiez.',sous:'Vos dossiers, vos outils, votre carte. Travailler ici ; découvrir sur Le Monde AIME ; essayer dans le Lab.'},illustrations:{},
  blocs:{reprendre:{elements:rep,vide:'Rien à reprendre dans ce navigateur pour l\'instant : ouvrez un dossier, ou commencez par votre carte.'},
   dossiers:{dossiers:D,statuts:N.STATUTS},
   navigateur:{paragraphes:nav,actions:S?[{action:'sauvegarder',libelle:'Sauvegarder tout dans un fichier',principal:true},{action:'restaurer',libelle:'Restaurer une sauvegarde…'}]:[]}}}}}

var style=document.createElement('style');document.head.appendChild(style);
function afficher(){var x=contenu();var r=V.composer({contenu:x.c,perspective:PERSP,modele:MODELE,presentation:{ambiance:AMB,polices:POL}});
 style.textContent=r.css;var ouverts=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('[data-action]');var foc=ouverts?ouverts.getAttribute('data-action'):null;
 racine.innerHTML=r.html;racine.setAttribute('data-blocs',r.bilan.blocs.join(' '));if(typeof ouvrir==='function'&&ouvert)ouvrir(ouvert,false);if(foc){var b=racine.querySelector('[data-action="'+foc+'"]');b&&b.focus({preventScroll:true})}
 return x.inv}

/* ---------- sauvegarder ---------- */
/* les bases du navigateur (projets du Point Zéro, leurs images) : lues telles quelles, jamais créées par une lecture */
function ouvrirBase(nom,creer){return new Promise(function(ok){if(!window.indexedDB)return ok(null);var r;try{r=creer?indexedDB.open(nom,2):indexedDB.open(nom)}catch(e){return ok(null)}
 r.onupgradeneeded=function(){if(!creer){try{r.transaction.abort()}catch(e){}return}var db=r.result;(B.BASES[nom]||[]).forEach(function(s){if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})})};
 r.onerror=function(){ok(null)};r.onsuccess=function(){ok(r.result)}})}
function tout(db,s,m){return new Promise(function(ok){if(!db||!db.objectStoreNames.contains(s))return ok([]);try{var g=db.transaction(s,'readonly').objectStore(s)[m]();g.onsuccess=function(){ok(g.result||[])};g.onerror=function(){ok([])}}catch(e){ok([])}})}
function lireBlob(b){return new Promise(function(ok,ko){var lr=new FileReader();lr.onload=function(){ok(String(lr.result))};lr.onerror=function(){ko(lr.error)};lr.readAsDataURL(b)})}
function lireBases(){var o={};return Promise.all(Object.keys(B.BASES).map(function(n){return ouvrirBase(n,false).then(function(db){o[n]={};return Promise.all(B.BASES[n].map(function(s){return tout(db,s,'getAll').then(function(L){return B.encoder(L,lireBlob)}).then(function(L){if(L.length)o[n][s]=L})})).then(function(){db&&db.close()})})})).then(function(){return o})}
function sauvegarder(){var s=B.sauvegarder(S,new Date().toISOString());dire('Je prépare la sauvegarde, images comprises…');
 lireBases().catch(function(){return{}}).then(function(bases){s.schema=2;s.bases=bases;s.nombreBases=B.compterBases(bases);
 var blob=new Blob([JSON.stringify(s)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aime-sauvegarde-'+auj()+'.json';document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);dire('Sauvegarde prête : '+s.nombre+' réglage'+(s.nombre>1?'s':'')+' et '+s.nombreBases+' projet'+(s.nombreBases>1?'s':'')+' ou image'+(s.nombreBases>1?'s':'')+' du Point Zéro, dans le fichier aime-sauvegarde-'+auj()+'.json.')})}
/* restaurer les bases : ajoute ce qui manque ; remplace seulement si demandé ; n'efface jamais */
function apercuBases(bases){var a={nouveaux:0,existants:0};return Promise.all(Object.keys(bases).map(function(n){return ouvrirBase(n,false).then(function(db){return Promise.all(Object.keys(bases[n]).map(function(s){return tout(db,s,'getAllKeys').then(function(K){bases[n][s].forEach(function(x){if(K.indexOf(x.id)>=0)a.existants++;else a.nouveaux++})})})).then(function(){db&&db.close()})})})).then(function(){return a})}
function ecrireBases(bases,remplacer){var n=0;return Promise.all(Object.keys(bases).map(function(nom){return ouvrirBase(nom,true).then(function(db){if(!db)return;return Promise.all(Object.keys(bases[nom]).map(function(s){return tout(db,s,'getAllKeys').then(function(K){return new Promise(function(ok){var t=db.transaction(s,'readwrite'),st=t.objectStore(s);
 bases[nom][s].forEach(function(x){if(K.indexOf(x.id)<0||remplacer===true){st.put(B.decoder(x));n++}});t.oncomplete=function(){ok()};t.onerror=function(){ok()};t.onabort=function(){ok()}})})})).then(function(){db.close()})})})).then(function(){return n})}

/* ---------- restaurer : choisir, voir, confirmer ---------- */
var panneau=document.getElementById('restauration'),fichier=document.getElementById('fichier'),enCours=null;
function fermer(){panneau.hidden=true;enCours=null;fichier.value='';var b=racine.querySelector('[data-action="restaurer"]');b&&b.focus()}
function el(n){return n+' élément'+(n>1?'s':'')}
function montrer(sauv){apercuBases(sauv.bases||{}).then(function(ab){montrerAvec(sauv,ab)})}
function montrerAvec(sauv,ab){enCours=sauv;var a=B.apercu(S,sauv),n=a.nouvelles.length,d=a.differentes.length,i=a.identiques.length;
 panneau.innerHTML='<h2 id="t-rest">Restaurer cette sauvegarde ?</h2><p>'+(sauv.date?'Faite le '+esc(sauv.date.slice(0,10))+'. ':'')+el(sauv.nombre)+' dans le fichier.</p>'+
  '<ul><li><b>'+el(n)+'</b> absent'+(n>1?'s':'')+' de ce navigateur : '+(n>1?'ils seront ajoutés':'il sera ajouté')+'.</li><li><b>'+el(d)+'</b> différent'+(d>1?'s':'')+' de ce que ce navigateur contient : '+(d>1?'gardés tels quels':'gardé tel quel')+', sauf si vous choisissez de remplacer.</li><li><b>'+el(i)+'</b> identique'+(i>1?'s':'')+'.</li></ul>'+
  (ab.nouveaux||ab.existants?'<p>Projets et images du Point Zéro : <b>'+ab.nouveaux+'</b> à ajouter, '+ab.existants+' déjà présent'+(ab.existants>1?'s':'')+' (gardé'+(ab.existants>1?'s':'')+' tel'+(ab.existants>1?'s':'')+' quel'+(ab.existants>1?'s':'')+', sauf si vous remplacez).</p>':'')+
  '<p class="r-note">Rien n\'est jamais effacé : ce qui est dans ce navigateur et pas dans le fichier reste.</p><div class="e-acts">'+
  (n||ab.nouveaux?'<button type="button" class="e-btn e-p" data-r="ajouter">Ajouter ce qui manque ('+(n+ab.nouveaux)+')</button>':'')+
  (d||ab.existants?'<button type="button" class="e-btn" data-r="remplacer">Ajouter et remplacer'+(d?' '+(d>1?'les '+d+' différents':'le différent'):'')+(ab.existants?(d?' et ':' ')+ab.existants+' projet'+(ab.existants>1?'s':'')+' ou image'+(ab.existants>1?'s':''):'')+'</button>':'')+
  '<button type="button" class="e-btn" data-r="annuler">'+(n||d||ab.nouveaux||ab.existants?'Annuler':'Fermer : rien à restaurer')+'</button></div>';
 panneau.hidden=false;var f=panneau.querySelector('button');f&&f.focus()}
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
fichier.addEventListener('change',function(){var f=fichier.files&&fichier.files[0];if(!f)return;var lr=new FileReader();lr.onload=function(){try{montrer(B.lireSauvegarde(String(lr.result)))}catch(e){dire(e.message);fichier.value=''}};lr.onerror=function(){dire('Fichier illisible.')};lr.readAsText(f)});
panneau.addEventListener('click',function(e){var b=e.target.closest('[data-r]');if(!b||!enCours)return;var r=b.getAttribute('data-r');if(r==='annuler'){fermer();return}
 var sv=enCours,res=B.restaurer(S,sv,r==='remplacer');ecrireBases(sv.bases||{},r==='remplacer').then(function(nb){if(nb)dire(nb+' projet'+(nb>1?'s':'')+' ou image'+(nb>1?'s':'')+' du Point Zéro restauré'+(nb>1?'s':'')+'.')});afficher();fermer();dire(res.ecrites.length+' élément'+(res.ecrites.length>1?'s':'')+' restauré'+(res.ecrites.length>1?'s':'')+(res.gardees.length?', '+res.gardees.length+' gardé'+(res.gardees.length>1?'s':'')+' tel'+(res.gardees.length>1?'s':'')+' quel'+(res.gardees.length>1?'s':''):'')+(res.erreurs.length?', '+res.erreurs.length+' impossible'+(res.erreurs.length>1?'s':'')+' (stockage plein ?)':'')+'.')});
panneau.addEventListener('keydown',function(e){if(e.key==='Escape')fermer()});
/* ---------- les dossiers : un seul ouvert à la fois, comme une fenêtre posée sous la grille ---------- */
var ouvert=null;try{ouvert=localStorage.getItem('aime-bureau-dossier')}catch(e){}
function ouvrir(id,focus){racine.querySelectorAll('.e-fen').forEach(function(f){f.hidden=true});racine.querySelectorAll('[data-dossier]').forEach(function(b){b.setAttribute('aria-expanded','false');b.classList.remove('on')});
 ouvert=id;try{id?localStorage.setItem('aime-bureau-dossier',id):localStorage.removeItem('aime-bureau-dossier')}catch(e){}if(!id)return;
 var f=document.getElementById('dos-'+id),b=racine.querySelector('[data-dossier="'+id+'"]');if(!f||!b){ouvert=null;return}f.hidden=false;b.setAttribute('aria-expanded','true');b.classList.add('on');
 if(focus){var a=f.querySelector('.e-fichiers a,.e-acts a')||f.querySelector('.e-fermer');a&&a.focus({preventScroll:true});var r=f.getBoundingClientRect();if(r.bottom>innerHeight||r.top<0)f.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}
racine.addEventListener('click',function(e){var d=e.target.closest('[data-dossier]');if(d){var id=d.getAttribute('data-dossier');ouvrir(ouvert===id?null:id,ouvert!==id);return}
 if(e.target.closest('[data-fermer]')){var id2=ouvert;ouvrir(null);var b2=racine.querySelector('[data-dossier="'+id2+'"]');b2&&b2.focus();return}});
racine.addEventListener('keydown',function(e){if(e.key==='Escape'&&ouvert){var id=ouvert;ouvrir(null);var b=racine.querySelector('[data-dossier="'+id+'"]');b&&b.focus()}});
racine.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b)return;var a=b.getAttribute('data-action');if(a==='sauvegarder')sauvegarder();else if(a==='restaurer')fichier.click()});

/* un autre onglet modifie un projet : le Bureau suit */
addEventListener('storage',function(){if(panneau.hidden)afficher()});
Promise.all([charger('/vitrine/modeles/bureau.json'),charger('/vitrine/perspectives/bureau.json'),charger('/vitrine/presentation/ambiances.json')]).then(function(r){MODELE=r[0];PERSP=r[1].angles[0];var a=r[2];AMB=a.ambiances[MODELE.ambiance];
 POL={titre:(a.polices[MODELE.polices.titre]||{}).famille,texte:(a.polices[MODELE.polices.texte]||{}).famille};afficher();window.AIMEBureau={inventaire:function(){return B.inventaire(S||vide)},rafraichir:afficher}})
 .catch(function(){racine.innerHTML='<p class="e-vide">Le Bureau n\'a pas pu charger son modèle. Rechargez la page.</p>'});
})();
