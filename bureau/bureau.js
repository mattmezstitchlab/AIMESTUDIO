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

function contenu(){var st=S||vide,inv=B.inventaire(st),c=null;try{c=K?K.migrer(JSON.parse(st.getItem('aime-carte')||'null')):null}catch(e){c=null}
 var ill={},carte;
 if(c){if(R)ill.carte=R.svg(c,{id:'bc',mode:'grande'});var p=inv.sources[0].projets[0]||{};
  carte={titre:c.nom||'Ma Carte',texte:p.detail||'',illustration:R?'carte':null,actions:[{lien:'/#carte',libelle:'Ouvrir ma Carte',principal:true},{lien:'/aime/',libelle:'La voir dans Le Monde AIME'}]}}
 else carte={titre:'Pas encore de Carte',texte:'Quelques questions de l\'orbe, toutes facultatives. Votre Carte reste dans ce navigateur, privée par défaut.',actions:[{lien:'/#carte',libelle:'Commencer ma Carte',principal:true}]};
 var nom={};inv.sources.forEach(function(s){nom[s.id]=s.nom});
 var groupes=inv.sources.filter(function(s){return s.id!=='carte'}).map(function(s){return{nom:s.nom+(s.demo?' (données fictives)':''),elements:s.projets}});
 var rep=B.reprendre(inv,3).map(function(p){return{titre:p.titre,detail:p.detail,quand:p.quand,lien:p.lien,action:p.action,groupe:nom[p.source],demo:p.demo}});
 var nav=[];
 if(!S)nav.push('Ce navigateur refuse le stockage local (navigation privée, ou données du site bloquées) : le Bureau ne peut rien retrouver, et les outils ne pourront rien garder.');
 else nav.push('Vos projets sont enregistrés dans ce navigateur, pas sur un compte : '+inv.total+' élément'+(inv.total>1?'s':'')+' sur ce site. Il n\'y a ni synchronisation ni partage : un autre navigateur, un autre appareil ou une fenêtre privée ne les voient pas, et effacer les données du site les efface.');
 if(inv.ancienBureau.length)nav.push('Ce navigateur garde aussi '+inv.ancienBureau.length+' réglage'+(inv.ancienBureau.length>1?'s':'')+' de l\'ancien Bureau à fenêtres, retiré le 20 octobre 2026. Plus aucune page ne les utilise ; ils sont conservés tels quels et font partie de la sauvegarde.');
 nav.push('Comptes : pas encore. Quand ils arriveront, vous pourrez importer cette sauvegarde dans le vôtre ; rien ne partira sans votre accord.');
 return{inv:inv,c:{espace:{kicker:'Mon Bureau',nom:'Reprendre là où vous en étiez.',sous:'Vos projets, vos outils, votre Carte. Travailler ici ; découvrir sur Le Monde AIME ; essayer dans le Lab.'},illustrations:ill,
  blocs:{carte:carte,
   reprendre:{elements:rep,vide:'Rien à reprendre dans ce navigateur pour l\'instant.'},
   projets:{groupes:groupes,vide:'Ce navigateur ne contient encore aucun projet AIME. Trois façons de commencer :',actions:[{lien:'/#carte',libelle:'Commencer ma Carte',principal:true},{lien:'/studio/',libelle:'Créer des supports dans le Studio'},{lien:'/stitch/',libelle:'Créer un patron avec Stitch'}]},
   creer:{elements:outils('realiser'),statuts:N.STATUTS},lab:{elements:outils('experimenter'),statuts:N.STATUTS},decouvrir:{elements:outils('decouvrir'),statuts:N.STATUTS},
   navigateur:{paragraphes:nav,actions:S?[{action:'sauvegarder',libelle:'Sauvegarder tout dans un fichier',principal:true},{action:'restaurer',libelle:'Restaurer une sauvegarde…'}]:[]}}}}}

var style=document.createElement('style');document.head.appendChild(style);
function afficher(){var x=contenu();var r=V.composer({contenu:x.c,perspective:PERSP,modele:MODELE,presentation:{ambiance:AMB,polices:POL}});
 style.textContent=r.css;var ouverts=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('[data-action]');var foc=ouverts?ouverts.getAttribute('data-action'):null;
 racine.innerHTML=r.html;racine.setAttribute('data-blocs',r.bilan.blocs.join(' '));if(foc){var b=racine.querySelector('[data-action="'+foc+'"]');b&&b.focus({preventScroll:true})}
 return x.inv}

/* ---------- sauvegarder ---------- */
function sauvegarder(){var s=B.sauvegarder(S,new Date().toISOString());var blob=new Blob([JSON.stringify(s,null,1)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aime-sauvegarde-'+auj()+'.json';document.body.appendChild(a);a.click();
 setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);dire('Sauvegarde prête : '+s.nombre+' élément'+(s.nombre>1?'s':'')+', dans le fichier aime-sauvegarde-'+auj()+'.json.')}

/* ---------- restaurer : choisir, voir, confirmer ---------- */
var panneau=document.getElementById('restauration'),fichier=document.getElementById('fichier'),enCours=null;
function fermer(){panneau.hidden=true;enCours=null;fichier.value='';var b=racine.querySelector('[data-action="restaurer"]');b&&b.focus()}
function el(n){return n+' élément'+(n>1?'s':'')}
function montrer(sauv){enCours=sauv;var a=B.apercu(S,sauv),n=a.nouvelles.length,d=a.differentes.length,i=a.identiques.length;
 panneau.innerHTML='<h2 id="t-rest">Restaurer cette sauvegarde ?</h2><p>'+(sauv.date?'Faite le '+esc(sauv.date.slice(0,10))+'. ':'')+el(sauv.nombre)+' dans le fichier.</p>'+
  '<ul><li><b>'+el(n)+'</b> absent'+(n>1?'s':'')+' de ce navigateur : '+(n>1?'ils seront ajoutés':'il sera ajouté')+'.</li><li><b>'+el(d)+'</b> différent'+(d>1?'s':'')+' de ce que ce navigateur contient : '+(d>1?'gardés tels quels':'gardé tel quel')+', sauf si vous choisissez de remplacer.</li><li><b>'+el(i)+'</b> identique'+(i>1?'s':'')+'.</li></ul>'+
  '<p class="r-note">Rien n\'est jamais effacé : ce qui est dans ce navigateur et pas dans le fichier reste.</p><div class="e-acts">'+
  (n?'<button type="button" class="e-btn e-p" data-r="ajouter">Ajouter ce qui manque ('+n+')</button>':'')+
  (d?'<button type="button" class="e-btn" data-r="remplacer">Ajouter et remplacer '+(d>1?'les '+d+' différents':'le différent')+'</button>':'')+
  '<button type="button" class="e-btn" data-r="annuler">'+(n||d?'Annuler':'Fermer : rien à restaurer')+'</button></div>';
 panneau.hidden=false;var f=panneau.querySelector('button');f&&f.focus()}
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
fichier.addEventListener('change',function(){var f=fichier.files&&fichier.files[0];if(!f)return;var lr=new FileReader();lr.onload=function(){try{montrer(B.lireSauvegarde(String(lr.result)))}catch(e){dire(e.message);fichier.value=''}};lr.onerror=function(){dire('Fichier illisible.')};lr.readAsText(f)});
panneau.addEventListener('click',function(e){var b=e.target.closest('[data-r]');if(!b||!enCours)return;var r=b.getAttribute('data-r');if(r==='annuler'){fermer();return}
 var res=B.restaurer(S,enCours,r==='remplacer');afficher();fermer();dire(res.ecrites.length+' élément'+(res.ecrites.length>1?'s':'')+' restauré'+(res.ecrites.length>1?'s':'')+(res.gardees.length?', '+res.gardees.length+' gardé'+(res.gardees.length>1?'s':'')+' tel'+(res.gardees.length>1?'s':'')+' quel'+(res.gardees.length>1?'s':''):'')+(res.erreurs.length?', '+res.erreurs.length+' impossible'+(res.erreurs.length>1?'s':'')+' (stockage plein ?)':'')+'.')});
panneau.addEventListener('keydown',function(e){if(e.key==='Escape')fermer()});
racine.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b)return;var a=b.getAttribute('data-action');if(a==='sauvegarder')sauvegarder();else if(a==='restaurer')fichier.click()});

/* un autre onglet modifie un projet : le Bureau suit */
addEventListener('storage',function(){if(panneau.hidden)afficher()});
Promise.all([charger('/vitrine/modeles/bureau.json'),charger('/vitrine/perspectives/bureau.json'),charger('/vitrine/presentation/ambiances.json')]).then(function(r){MODELE=r[0];PERSP=r[1].angles[0];var a=r[2];AMB=a.ambiances[MODELE.ambiance];
 POL={titre:(a.polices[MODELE.polices.titre]||{}).famille,texte:(a.polices[MODELE.polices.texte]||{}).famille};afficher();window.AIMEBureau={inventaire:function(){return B.inventaire(S||vide)},rafraichir:afficher}})
 .catch(function(){racine.innerHTML='<p class="e-vide">Le Bureau n\'a pas pu charger son modèle. Rechargez la page.</p>'});
})();
