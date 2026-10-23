/* AIME · Le projet d'une personne, né d'une intention, enregistré, et sa première page.
   - versProjet(lecture)            → un projet « aime-projet » v1 (contrats/projet.js) : l'événement, le lieu, les personnes
   - versSite(projet, S, modele)    → un site « aime-site » rendu par le moteur de pages (vitrine/rendu.js), relié au projet
   - Depot(stockage)                → enregistrer / lire / lister, dans « aime-projets » (projets) et « aime-sites » (pages)
   Rien n'est jamais écrasé ni effacé : on ajoute un projet, on met à jour le sien. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../contrats/projet.js'));else root.AIMEProjets=factory(root.AIMEProjetContrat)})(typeof self!=='undefined'?self:this,function(C){'use strict';
var CLE='aime-projets',CLE_SITES='aime-sites';
function uid(p){return p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function copie(o){return JSON.parse(JSON.stringify(o))}

function versProjet(l,maintenant){
 var id=uid('pr'),quand=maintenant||new Date().toISOString(),p=C.creer({id:id,titre:l.titre||'Mon projet',module:'accueil',identifiant:id});
 p.contenus.push({id:'evenement',type:'evenement',titre:p.titre,date:l.date||'',lieu:l.lieu||'',invites:l.invites||null,genre:l.type||'autre'});
 (l.personnes||[]).forEach(function(n,i){p.contenus.push({id:'personne-'+(i+1),type:'personne',nom:n})});
 p.relations=(l.personnes||[]).map(function(_,i){return{id:'r-'+(i+1),type:'participe',de:'personne-'+(i+1),vers:'evenement'}});
 p.extensions={intention:{texte:l.texte||'',type:l.type||'autre',modele:l.modele||'libre'},creeLe:quand,majLe:quand};
 return C.lire(p)}

function evenement(p){return p.contenus.filter(function(c){return c.type==='evenement'})[0]||{}}

/* la page : le modèle du type de projet, puis les informations du projet écrites une fois (titre, date, lieu) */
function versSite(p,S,modele){
 var e=evenement(p),m=modele,s=S.vide(m&&m.univers||'vierge');if(m)s=S.appliquerModele(s,m);
 s.nom=p.titre;s.infos.titre=p.titre;if(e.date)s.infos.date=e.date;if(e.lieu){s.infos.lieu=e.lieu;s.infos.ville=''}
 var gens=p.contenus.filter(function(c){return c.type==='personne'});if(gens.length&&s.listes&&s.listes.personnes)s.listes.personnes=gens.map(function(g){return{nom:g.nom,role:''}});
 s.projet=p.id;s.creeLe=s.majLe=p.extensions.creeLe;return s}

/* le dépôt : localStorage (ou tout objet getItem/setItem), lecture prudente, écriture sans jamais retirer une entrée */
function Depot(st){
 function lire(k,vide){try{var o=JSON.parse(st.getItem(k)||'null');return o&&typeof o==='object'?o:vide}catch(e){return vide}}
 function ecrire(k,o){try{st.setItem(k,JSON.stringify(o));return true}catch(e){return false}}
 return{
  lister:function(){var o=lire(CLE,{projets:{}});return Object.keys(o.projets||{}).map(function(k){return o.projets[k]}).filter(function(p){return C.valide(p).ok}).sort(function(a,b){return String(b.extensions.majLe).localeCompare(String(a.extensions.majLe))})},
  courant:function(){var o=lire(CLE,{projets:{}});var p=o.cur&&o.projets&&o.projets[o.cur];return p&&C.valide(p).ok?p:null},
  lire:function(id){var o=lire(CLE,{projets:{}});return o.projets&&o.projets[id]||null},
  /* enregistre le projet et sa page ; les autres projets et sites restent intacts */
  enregistrer:function(p,site){
   var o=lire(CLE,{format:'aime-projets',projets:{}});o.format='aime-projets';o.projets=o.projets||{};p=copie(p);p.extensions.majLe=new Date().toISOString();
   if(site){p.extensions.site=site.id;var s=lire(CLE_SITES,{sites:{},cur:null});s.sites=s.sites||{};s.sites[site.id]=site;s.cur=site.id;if(!ecrire(CLE_SITES,s))return{ok:false,raison:'Ce navigateur est plein : la page n\'a pas pu être enregistrée.'}}
   o.projets[p.id]=p;o.cur=p.id;return ecrire(CLE,o)?{ok:true,projet:p}:{ok:false,raison:'Ce navigateur refuse l\'enregistrement (navigation privée ?).'}},
  site:function(p){var s=lire(CLE_SITES,{sites:{}});return p&&p.extensions&&s.sites?s.sites[p.extensions.site]||null:null},
  majSite:function(site){var s=lire(CLE_SITES,{sites:{},cur:null});if(!s.sites||!s.sites[site.id])return false;site.majLe=new Date().toISOString();s.sites[site.id]=site;return ecrire(CLE_SITES,s)}}}

return{CLE:CLE,versProjet:versProjet,versSite:versSite,evenement:evenement,Depot:Depot}});
