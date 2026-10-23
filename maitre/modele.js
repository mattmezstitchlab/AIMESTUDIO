/* AIME · le Cube Maître : le site AIME lui-même, vu comme un cube. UN modèle, distinct du cube-personne (cube/modele.js),
   lu par la même vue 3D (cube/vue3d.js) et par le Canevas (canevas/adaptateurs/maitre.js).

   LECTURE SEULE. Ce modèle est pur (sans DOM, sans stockage, testé sous node) : il reçoit des sources déjà chargées et
   rend six résumés. Il n'écrit rien, ne lit aucun stockage du navigateur et ne connaît pas la comptabilité de la Régie.
   Les gestes d'administration ne sont que des liens vers la Régie maîtresse, au bon onglet, et seulement pour le
   propriétaire du site (droit décidé par le serveur, /api/identite).

   Sources (toutes facultatives ; une source absente donne une facette « à venir », jamais un chiffre inventé) :
     nav      AIMENav (nav/registre.js)             regie   AIMERegie (regie/donnees.js : config(), vocabulaires de l'orbe)
     site     regie/site.json (version publiée)     moteurs moteurs.json      univers univers.json
     sante    AIMESante (sante/modele.js)           reseau  AIMEReseau (reseau/registre.js : MODULES)
     blocs    nombre de blocs du moteur de pages (AIMESite.BLOCS)              health  true | false | null (GET /api/health)
     proprietaire  true | false (GET /api/identite)                           comptes  compteurs de GET /api/maitre (propriétaire seul)

   AIMEMaitre.resumer(sources) → un « cube » que lit AIMECubeVue.monter(…, {modele: AIMEMaitre}) :
     { v, proprietaire, facettes: { <id>: { etat, champs:{cle,dit}, visibilite, le, style, chiffres, sources, actions } } } */
(function(racine,f){var M=f();if(typeof module==='object'&&module.exports)module.exports=M;else racine.AIMEMaitre=M})(typeof self!=='undefined'?self:this,function(){'use strict';

var V=1;
/* face : la même convention d'indices que le cube-personne, pour que la vue 3D et le dépli du Canevas n'aient rien à apprendre */
var FACETTES=[
 {id:'pages',nom:'Pages et navigation',face:0,teinte:['#C4B5FD','#7C5CFF','#3B0764'],dit:'Le registre unique du site : chaque destination, sa catégorie et son statut. Le statut informe, il ne donne aucun droit.',champs:[{k:'cle'},{k:'dit'}]},
 {id:'sante',nom:'Santé du système',face:1,teinte:['#BBF7D0','#22C55E','#14532D'],dit:'Ce qui est prouvé, et à quel niveau : déclaré, testé ou vérifié dans un navigateur. Et l\'état du serveur, sans aucune donnée personnelle.',champs:[{k:'cle'},{k:'dit'}]},
 {id:'moteurs',nom:'Moteurs et capacités',face:2,teinte:['#FDE68A','#F59E0B','#9A3412'],dit:'L\'inventaire des moteurs : dépôts, modules, univers et modules autorisés du Réseau.',champs:[{k:'cle'},{k:'dit'}]},
 {id:'comptes',nom:'Comptes et espaces',face:3,teinte:['#FBCFE8','#FB7185','#7C2D52'],dit:'Des compteurs agrégés seulement : jamais un nom, un e-mail ni un identifiant. Servis au seul propriétaire, vérifié par le serveur.',champs:[{k:'cle'},{k:'dit'}],reserve:true,attente:'réservé'},
 {id:'orbe',nom:'Orbe',face:4,teinte:['#A5F3FC','#22D3EE','#1E3A8A'],dit:'Où l\'orbe apparaît et comment elle se comporte, site par site. Des préférences de présence, jamais des droits.',champs:[{k:'cle'},{k:'dit'}]},
 {id:'contenu',nom:'Contenu et réalisations',face:5,teinte:['#FDBA74','#FB7185','#4C1D95'],dit:'Ce que le site montre : réalisations et carrousels publiés, et les blocs du moteur de pages qui composent le reste.',champs:[{k:'cle'},{k:'dit'}]}];
var IDS=FACETTES.map(function(f){return f.id});
/* les seuls liens vers la Régie maîtresse : des onglets de consultation et de réglage. Jamais #nouveau-devis (il crée un devis),
   jamais la comptabilité (#docs, #clients, #entreprise). */
var REGIE_OK=['/regie/#pages','/regie/#edition','/regie/#orbe','/regie/#realisations','/regie/#sites'];
var COMPTES=['comptes','espaces','membres','invitations','matiere','identites'];

function facette(id){for(var i=0;i<FACETTES.length;i++)if(FACETTES[i].id===id)return FACETTES[i];return null}
function couleurs(c,id){var d=facette(id);return d?d.teinte:FACETTES[0].teinte}
function completude(){return 1}
function n(v){v=Number(v);return isFinite(v)&&v>=0?Math.round(v):null}
function fr(v){return String(v).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function compter(L,cle){var o={};(L||[]).forEach(function(x){var k=x&&x[cle];if(k!=null)o[k]=(o[k]||0)+1});return o}
/* une adresse : chemin interne du site, ou un onglet autorisé de la Régie */
function lienOk(h){return typeof h==='string'&&(REGIE_OK.indexOf(h)>=0||(/^\/(?!\/)[a-z0-9\-\/]*$/i.test(h)&&h.indexOf('/regie')!==0))}
function action(type,nom,dit,href){return lienOk(href)?{type:type,nom:nom,dit:dit,href:href}:null}
function vide(id){return{etat:'vide',champs:{},visibilite:'prive',le:null,style:null,chiffres:[],sources:[],actions:[]}}
function pleine(cle,dit,chiffres,sources,actions){return{etat:'posee',champs:{cle:String(cle),dit:dit},visibilite:'prive',le:null,style:null,chiffres:chiffres,sources:sources,actions:actions.filter(Boolean)}}
/* les compteurs du serveur : seulement des entiers, seulement les clés connues ; tout le reste est ignoré */
function comptesPropres(c){if(!c||typeof c!=='object')return null;var o={},ok=false;COMPTES.forEach(function(k){var v=n(c[k]);if(v!==null){o[k]=v;ok=true}});return ok?o:null}

function resumer(src){src=src||{};var P=src.proprietaire===true,R=src.regie,cfg=null,F={};
 if(R&&src.site)try{cfg=R.config(src.site)}catch(e){cfg=null}
 var regie=function(nom,dit,h){return P?action('regie',nom,dit,h):null};

 /* Pages et navigation : le registre (le visiteur ne compte pas les pages internes) et les pages réglées par la Régie */
 if(src.nav&&src.nav.ENTREES){var vis=src.nav.publiques?src.nav.publiques(P):src.nav.ENTREES,st=compter(vis,'statut'),pg=cfg?Object.keys(cfg.pages||{}):[],app=0;
  pg.forEach(function(k){app+=((cfg.pages[k]||{}).appareils||[]).length});
  F.pages=pleine(vis.length,'destinations',[
    [fr(vis.length),'destinations dans le registre'],
    [(st.disponible||0)+' · '+(st.demonstration||0)+' · '+(st.experimental||0),'disponibles · démonstrations · expérimentales'],
    [fr((src.nav.CATS||[]).length),'catégories du menu Explorer']].concat(cfg?[[fr(pg.length),'pages réglées par la Régie ('+app+' appareil'+(app>1?'s':'')+')']]:[]),
   [['nav/registre.js','ENTREES, CATS, STATUTS']].concat(cfg?[['regie/site.json','pages, version publiée']]:[]),
   [action('lecture','Explorer les destinations','Toutes les apps et pages, dans le Bureau.','/bureau/'),regie('Régler les pages','La Régie, onglet Pages et arborescence.','/regie/#pages'),regie('Éditer sur la page','La Régie, onglet Édition sur la page.','/regie/#edition')])}

 /* Orbe : les réglages publiés, site par site ; le vocabulaire est celui de la Régie ; aucun droit */
 if(cfg&&R){var ob=cfg.orbe||{},k=Object.keys(ob),pres=k.filter(function(x){return(ob[x]||{}).presence&&ob[x].presence!=='aucune'}).length,sug=0;k.forEach(function(x){sug+=((ob[x]||{}).suggestions||[]).length});
  F.orbe=pleine(k.length,'réglage'+(k.length>1?'s':'')+' publié'+(k.length>1?'s':''),[
    [fr(k.length),'réglages : le défaut et '+(k.length-1)+' site'+(k.length-1>1?'s':'')],
    [fr(pres),'site'+(pres>1?'s':'')+' où l\'orbe est présente'],
    [fr(sug),'suggestions proposées'],
    [Object.keys(R.PRESENCES||{}).length+' · '+Object.keys(R.AUTONOMIES||{}).length+' · '+Object.keys(R.OPTIONS_COMPAGNON||{}).length,'présences · autonomies · options du compagnon'],
    ['0','droit accordé à l\'orbe']],
   [['regie/site.json','orbe, version publiée'],['regie/donnees.js','PRESENCES, AUTONOMIES, OPTIONS_COMPAGNON']],
   [action('lecture','Voir l\'orbe en situation','La Page Zéro, avec son orbe.','/'),regie('Régler l\'orbe','La Régie, onglet L\'orbe, site par site.','/regie/#orbe')])}

 /* Contenu et réalisations : ce qui est publié, et les blocs du moteur de pages */
 if(cfg){var re=(cfg.realisations||[]).filter(function(r){return r&&r.publie!==false}),ca=(cfg.carrousels||[]).length,me=Object.keys(cfg.medias||{}).length,b=n(src.blocs);
  F.contenu=pleine(re.length,'réalisation'+(re.length>1?'s':'')+' publiée'+(re.length>1?'s':''),[
    [fr(re.length),'réalisations publiées'],[fr(ca),'carrousels'],[fr(me),'médias importés dans la version publiée']].concat(b!==null?[[fr(b),'blocs du moteur Métamorphose']]:[]),
   [['regie/site.json','realisations, carrousels, medias'],['api/travaux.js','pages /travaux/, rendues par le serveur']].concat(b!==null?[['vitrine/rendu.js','BLOCS']]:[]),
   [action('lecture','Parcourir les réalisations','Les pages /travaux/, publiques.','/travaux/'),regie('Gérer les réalisations','La Régie, onglet Réalisations.','/regie/#realisations'),regie('Voir les sites clients','La Régie, onglet Sites clients.','/regie/#sites')])}

 /* Moteurs et capacités : l'inventaire des dépôts, les univers, les modules autorisés du Réseau */
 if(src.moteurs&&Array.isArray(src.moteurs.repos)){var rp=src.moteurs.repos,et=compter(rp,'etat'),mo=0;rp.forEach(function(r){mo+=((r&&r.modules)||[]).length});
  var un=src.univers&&Array.isArray(src.univers.univers)?src.univers.univers.length:null,rs=src.reseau&&src.reseau.MODULES?Object.keys(src.reseau.MODULES).length:null;
  F.moteurs=pleine(rp.length,'dépôts',[
    [fr(rp.length),'dépôts inventoriés'],[(et.fonctionnel||0)+' · '+(et.prototype||0),'fonctionnels · prototypes'],[fr(mo),'modules décrits']]
    .concat(un!==null?[[fr(un),'univers']]:[]).concat(rs!==null?[[fr(rs),'modules autorisés du Réseau']]:[]),
   [['moteurs.json','repos : état, modules']].concat(un!==null?[['univers.json','univers']]:[]).concat(rs!==null?[['reseau/registre.js','MODULES']]:[]),
   [action('lecture','Ouvrir le G44 LAB','La carte des dépendances.','/g44/'),action('lecture','Ouvrir le Réseau','Les modules et leurs sept vérifications.','/reseau/')])}

 /* Santé : les parcours décrits, leurs preuves par niveau, et le serveur */
 if(src.sante&&Array.isArray(src.sante.composants)){var S=src.sante,pv={declare:0,teste:0,navigateur:0};(S.parcours||[]).forEach(function(p){(p.etapes||[]).forEach(function(e){(e.preuves||[]).forEach(function(x){if(x&&pv[x.niveau]!=null)pv[x.niveau]++})})});
  F.sante=pleine(S.composants.length,'composants suivis',[
    [fr(S.composants.length),'composants décrits'],[fr((S.parcours||[]).length),'parcours de bout en bout'],
    [pv.declare+' · '+pv.teste+' · '+pv.navigateur,'preuves déclarées · testées · vérifiées en navigateur'],
    [src.health===true?'ok':src.health===false?'indisponible':'—','serveur et base (/api/health)']],
   [['sante/modele.js','composants, parcours, niveaux de preuve'],['GET /api/health','{ ok }, sans donnée personnelle']],
   [action('lecture','Ouvrir la santé','Les parcours et leurs preuves.','/sante/')])}

 /* Comptes et espaces : propriétaire seul, compteurs du serveur seulement */
 var co=P?comptesPropres(src.comptes):null;
 if(co){F.comptes=pleine(co.comptes!=null?co.comptes:'—','compte'+(co.comptes>1?'s':''),[
    [fr(co.comptes!=null?co.comptes:'—'),'comptes'],[(co.espaces!=null?co.espaces:'—')+' · '+(co.membres!=null?co.membres:'—'),'espaces · membres'],
    [fr(co.invitations!=null?co.invitations:'—'),'invitations en attente'],[(co.matiere!=null?co.matiere:'—')+' · '+(co.identites!=null?co.identites:'—'),'notes du Point Zéro · identités confirmées']],
   [['GET /api/maitre','compteurs agrégés, propriétaire seul'],['api/_auth/proprietaire.mjs','proprietaire(req)']],
   [action('lecture','Mon compte','Mes espaces et mes invitations.','/compte/')])}

 var c={v:V,proprietaire:P,facettes:{}};IDS.forEach(function(id){c.facettes[id]=F[id]||vide(id)});return c}

/* ce qu'il manque pour une facette « à venir » : une phrase vraie, jamais un chiffre */
function raison(c,id){var f=c&&c.facettes[id];if(f&&f.etat==='posee')return'';if(id==='comptes')return c&&c.proprietaire?'Les compteurs du serveur ne sont pas disponibles pour le moment.':'Réservé au propriétaire du site : le serveur ne montre ces compteurs à personne d\'autre.';return'Cette source n\'a pas pu être lue : la facette reste vide plutôt que d\'inventer un chiffre.'}

return{V:V,FACETTES:FACETTES,IDS:IDS,REGIE_OK:REGIE_OK,COMPTES:COMPTES,facette:facette,couleurs:couleurs,completude:completude,resumer:resumer,raison:raison,lienOk:lienOk,comptesPropres:comptesPropres};
});
