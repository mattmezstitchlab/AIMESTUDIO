/* AIME OS · le catalogue des apps et la logique pure du bureau (recherche, placement des fenêtres).
   Le registre (nav/registre.js) reste la seule liste des sites ; l'OS y ajoute ses apps système
   (le Point Zéro, Mon espace, la Régie) et retire l'entrée « Mon Bureau », puisque l'OS EST le Bureau. Testé sous node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEOSApps=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* une couleur par famille, tirée de l'iris AIME */
var TEINTES={systeme:'iris',monde:'#7C5CFF',evenements:'#FB7185',institutions:'#22D3EE',creation:'#F59E0B',jeux:'#86EFAC'};
var SYSTEME=[
 {id:'cube',nom:'Mon cube',href:'/cube/',phrase:'Ma Régie personnelle : mes six facettes, mon timbre, mon orbe',cat:'systeme',statut:'experimental',sigle:'Cu'},
 {id:'pointzero',nom:'Point Zéro',href:'/point-zero/',phrase:'Déposer une matière : intention, notes, fichiers ; le système la distribue',cat:'systeme',statut:'experimental',sigle:'P0'},
 {id:'espace',nom:'Mon espace',href:'/bureau/espace/',phrase:'Reprendre ses projets, sauvegarder ce navigateur',cat:'systeme',statut:'disponible',sigle:'Es'},
 {id:'regie',nom:'AIME Régie',href:'/regie/',phrase:'Pages, appareils, orbe, devis et factures',cat:'systeme',statut:'disponible',sigle:'Ré',reserve:true}];
/* réservé : seulement pour le propriétaire du site, droit décidé par le serveur (/api/identite → proprietaire) ;
   l'interface ne fait que montrer ou masquer, elle ne protège rien. */
/* sigles choisis quand le calcul automatique tromperait (« Le Réseau » donnerait « Lr », trop proche d'une lettre au hasard) */
var SIGLES={reseau:'Rs',canevas:'Cv'};
var EPINGLES=['cube','pointzero','espace','regie','reseau','canevas','studio','stitch','g44','world','zero'];
/* les actions que l'on peut lancer depuis la palette ou l'orbe */
var ACTIONS=[
 {id:'deposer',nom:'Déposer une matière au point zéro',app:'pointzero',href:'/point-zero/',mots:'deposer importer note intention demande fichier trier classer point zero'},
 {id:'nouveau-devis',nom:'Nouveau devis',app:'regie',href:'/regie/#nouveau-devis',mots:'devis facture client'},
 {id:'canevas',nom:'Modifier un mini-site dans le Canevas',app:'canevas',href:'/canevas/',mots:'canevas modifier site mini-site page bloc disposition'},
 {id:'reseau',nom:'Découvrir le Réseau des facettes',app:'reseau',href:'/reseau/',mots:'reseau facettes decouvrir bibliotheque module'},
 {id:'nouveau-site',nom:'Créer un site (ancien générateur)',app:'sites',href:'/sites/',mots:'site générateur créer importer exporter page web'},
 {id:'sites-clients',nom:'Voir les sites clients (trois écrans, par rôle)',app:'regie',href:'/regie/#sites',mots:'site client aperçu rôle perspective générateur'},
 {id:'direct',nom:'Lancer le direct du jour J',app:'live',href:'/live/',mots:'live direct jour j retard annonce plan b salle'},
 {id:'editer-zero',nom:'Placer des appareils sur la Page Zéro',app:'regie',href:'/regie/#edition',mots:'iphone ipad macbook appareil maquette'},
 {id:'regler-orbe',nom:'Régler l\'orbe, site par site',app:'regie',href:'/regie/#orbe',mots:'orbe compagnon suggestions'},
 {id:'publier',nom:'Publier les réglages du site',app:'regie',href:'/regie/#publier',mots:'publier sauvegarde site.json'},
 {id:'sauvegarder',nom:'Sauvegarder ce navigateur',app:'espace',href:'/bureau/espace/',mots:'sauvegarde export restaurer'},
 {id:'labo-orbe',nom:'Ouvrir le laboratoire de l\'orbe',app:'orb',href:'/lab/orb/',mots:'orbe lab formes'},
 {id:'rewind',nom:'Voir le Rewind G44',app:'g44',href:'/g44/',mots:'g44 rewind correction administratif'}];

function sigle(nom){var m=String(nom||'').replace(/^AIME\s+/i,'').replace(/[^A-Za-zÀ-ÿ0-9 ]/g,' ').trim().split(/\s+/);return((m[0]||'?').charAt(0).toUpperCase()+((m[1]||m[0]||'').charAt(m[1]?0:1)||'').toLowerCase()).slice(0,2)}
/* le catalogue : apps système d'abord, puis le registre sans « bureau » ; une adresse = une app */
function catalogue(entrees,o){var proprio=!!(o&&o.proprietaire),vus={},L=[];SYSTEME.forEach(function(a){vus[a.id]=1;if(a.reserve&&!proprio)return;L.push(Object.assign({},a,{teinte:TEINTES.systeme}))});
 (entrees||[]).forEach(function(e){if(!e||e.id==='bureau'||(e.interne&&!proprio)||vus[e.id]||typeof e.href!=='string'||!/^\/(?!\/)/.test(e.href))return;vus[e.id]=1;
  L.push({id:e.id,nom:e.nom,href:e.href,phrase:e.phrase||'',cat:e.cat||'monde',statut:e.statut||'disponible',sigle:SIGLES[e.id]||sigle(e.nom),teinte:TEINTES[e.cat]||TEINTES.monde})});return L}
/* le cube, accès à la Régie personnelle, reste toujours en tête du dock, même avec des épingles choisies */
/* les actions proposées : celles d'une app réservée seulement au propriétaire */
function actions(o){var proprio=!!(o&&o.proprietaire);return ACTIONS.filter(function(x){return proprio||!SYSTEME.some(function(a){return a.reserve&&a.id===x.app})})}
function epingles(cat,choix){var ids=Array.isArray(choix)&&choix.length?choix:EPINGLES;ids=['cube'].concat(ids.filter(function(i){return i!=='cube'}));return ids.map(function(id){return cat.filter(function(a){return a.id===id})[0]}).filter(Boolean)}

/* recherche tolérante : sans accents ni casse ; début de mot > contenu ; le nom compte plus que la phrase */
function plier(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function score(q,texte,poids){var t=' '+plier(texte)+' ';if(!q)return 0;if(t.indexOf(' '+q)>=0)return 3*poids;if(t.indexOf(q)>=0)return 1*poids;return 0}
function pertinence(q,e){q=plier(q);return q?score(q,e.nom,4)+score(q,e.phrase||e.detail||'',1)+score(q,e.mots||'',2):1}
function chercher(q,elements,max){var L=(elements||[]).map(function(e){return{e:e,s:pertinence(q,e)}}).filter(function(x){return x.s>0});
 L.sort(function(a,b){return b.s-a.s||String(a.e.nom).localeCompare(String(b.e.nom),'fr')});return L.slice(0,max||20).map(function(x){return x.e})}

/* fenêtres : en cascade dans la zone utile, jamais hors de l'écran, jamais plus petites que le minimum */
var MIN={l:320,h:220};
function contraindre(f,z){var l=Math.max(MIN.l,Math.min(f.l,z.l)),h=Math.max(MIN.h,Math.min(f.h,z.h));
 var x=Math.min(Math.max(f.x,z.x-l+120),z.x+z.l-120),y=Math.min(Math.max(f.y,z.y),z.y+z.h-40);return{x:Math.round(x),y:Math.round(y),l:Math.round(l),h:Math.round(h)}}
function cascade(n,z){var l=Math.round(Math.min(z.l*.72,1180)),h=Math.round(Math.min(z.h*.82,820)),pas=28,k=n%6;
 return contraindre({x:z.x+Math.round((z.l-l)/2)-pas*2.5+pas*k,y:z.y+16+pas*k,l:l,h:h},z)}
/* une adresse ouverte DANS l'OS : jamais l'OS lui-même (pas de bureau dans le bureau) */
function adresseApp(href){href=String(href||'/');if(!/^\/(?!\/)/.test(href))return'/';var p=href.split(/[?#]/)[0];if(/^\/bureau\/?(index\.html)?$/.test(p))return'/bureau/espace/';return href}

/* ce qui est gardé entre deux visites : uniquement des adresses internes et des nombres */
function etat(o){o=o||{};var f=(Array.isArray(o.fenetres)?o.fenetres:[]).slice(0,10).map(function(w){w=w||{};if(typeof w.app!=='string'||!/^[a-z0-9-]{2,40}$/.test(w.app))return null;
  var n=function(v,d){v=Number(v);return isFinite(v)?Math.round(v):d};return{app:w.app,href:adresseApp(w.href),x:n(w.x,40),y:n(w.y,40),l:n(w.l,900),h:n(w.h,600),reduite:w.reduite===true,agrandie:w.agrandie===true}}).filter(Boolean);
 var orbe=['discrete','attentive','active'].indexOf(o.orbe)>=0?o.orbe:null;
 var ep=Array.isArray(o.epingles)?o.epingles.filter(function(x){return typeof x==='string'&&/^[a-z0-9-]{2,40}$/.test(x)}).slice(0,16):null;return{version:1,fenetres:f,epingles:ep,orbe:orbe}}
/* La clé « aime-os » appartient à l'ancien Bureau (dossiers, cartes, messages, mémos) : l'OS ne l'écrit plus jamais.
   Son état vit sous CLE_ETAT. Une valeur « aime-os » au format de l'OS (avec « fenetres », 21-23/10/2026) est seulement relue une fois. */
var CLE_ETAT='aime-os-v2',CLE_ANCIENNE='aime-os';
function ancienBureau(o){return!!o&&typeof o==='object'&&!Array.isArray(o)&&!Array.isArray(o.fenetres)}
function etatInitial(v2,ancienne){if(v2)return etat(v2);if(ancienne&&!ancienBureau(ancienne))return etat(ancienne);return etat(null)}
/* l'autonomie de l'orbe : le choix du visiteur l'emporte sur celui du site ; sans choix, à la demande */
function autonomie(site,visiteur){var ok=['discrete','attentive','active'];return ok.indexOf(visiteur)>=0?visiteur:ok.indexOf(site)>=0?site:'discrete'}

function salutation(h){return h<5?'Bonne nuit':h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir'}
return{TEINTES:TEINTES,SYSTEME:SYSTEME,EPINGLES:EPINGLES,ACTIONS:ACTIONS,actions:actions,MIN:MIN,catalogue:catalogue,epingles:epingles,plier:plier,chercher:chercher,pertinence:pertinence,contraindre:contraindre,cascade:cascade,autonomie:autonomie,adresseApp:adresseApp,etat:etat,CLE_ETAT:CLE_ETAT,CLE_ANCIENNE:CLE_ANCIENNE,ancienBureau:ancienBureau,etatInitial:etatInitial,sigle:sigle,salutation:salutation};
});
