/* AIME · Point Zéro → mini-site privé du projet.
   Aucun nouveau générateur : le projet devient un site au format « aime-site », rendu par le moteur de pages existant
   (vitrine/rendu.js) avec ses blocs, et modifiable dans le générateur existant (/sites/). Ici, seulement la traduction.

   AIMEMiniSite.depuis(p, {S, B, M, ancien, photo}) → site
     p       le projet du Point Zéro (broderie)
     ancien  le site déjà enregistré pour ce projet : sa disposition (positions, tailles, variantes, blocs ajoutés ou
             retirés, ambiance) est GARDÉE ; seul le contenu qui vient du projet est rafraîchi
     photo   l'image du projet en data:image (facultatif) ; motif : le patron redessiné plus net (facultatif)
   Le contenu « appartient » au projet : les listes fils, avancement, chiffres, etapes et galerie, le titre, le motif.
   Le reste (sections ajoutées dans le générateur, textes propres, style) appartient au site. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEMiniSite=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var PROPRES=['fils','avancement','chiffres','etapes','galerie'];
var SECTIONS=[
 {id:'pz-hero',type:'hero',variante:'scinde'},
 {id:'pz-motif',type:'image',variante:'encadree',titre:'Le motif'},
 {id:'pz-fils',type:'fils',variante:'nuancier',titre:'La palette DMC'},
 {id:'pz-mesures',type:'chiffres',variante:'bande',titre:'Les dimensions'},
 {id:'pz-avancement',type:'avancement',variante:'barres',titre:'Avancement'},
 {id:'pz-actions',type:'texte',variante:'simple',titre:'Prochaines actions'},
 {id:'pz-decisions',type:'etapes',variante:'verticale',titre:'Décisions'}];
var MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function jour(iso){var d=new Date(iso);return isNaN(d)?'':d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear()}
function nombre(n){return Number(n||0).toLocaleString('fr-FR')}
function siteId(p){return'pz-'+String(p.id).replace(/[^a-z0-9-]/gi,'').slice(0,40)}

/* ce que le projet dit, mis en listes du moteur de pages */
function contenu(p,o){var B=o.B,M=o.M,g=p.grille||(p.choix?B.grille(p.choix,p.ratio||1):null),t=B.toile(p.choix&&p.choix.toile),cf=p.confirme||{};
 var tot=(p.palette||[]).reduce(function(a,f){return a+(+f.points||0)},0);
 var chiffres=[];if(g){chiffres.push({valeur:g.l+' × '+g.h,libelle:'points'+(cf.points?'':' (à confirmer)')});chiffres.push({valeur:String(g.cm[0]).replace('.',',')+' × '+String(g.cm[1]).replace('.',',')+' cm',libelle:'sur '+t.nom+(cf.toile?'':' (à confirmer)')})}
 if(p.palette)chiffres.push({valeur:String(p.palette.length),libelle:'fils DMC'+(cf.dmc?'':' (à valider)')});if(tot)chiffres.push({valeur:nombre(tot),libelle:'points à broder'});
 var fils=(p.palette||[]).map(function(f){return{dmc:String(f.dmc),nom:f.nom||'',hex:f.hex||'',ecran:f.ecran||'',points:+f.points||0}});
 var avancement=M.avancements(p).map(function(a){return{nom:a.nom,valeur:a.v,detail:a.dit}});
 var H=(p.historique||[]).slice(0,12),etapes=H.length?H.map(function(h){return{date:jour(h.le),titre:h.texte,detail:'Source : '+(M.SOURCES[h.source]||h.source)}}):
  B.ETAPES.filter(function(e){return cf[e.id]}).map(function(e){return{date:jour(p.maj||p.cree),titre:e.nom+' : confirmé',detail:'Source : Vous'}});
 var manques=M.manques(p),actions=[B.action(p)];if(manques.length)actions.push('À confirmer : '+manques.join(', ')+'.');actions.push('Le patron détaillé (PDF) viendra ensuite, dans l\'atelier.');
 var galerie=[];if(o.photo)galerie.push({src:o.photo,legende:'Votre image'});if(o.motif||p.apercu)galerie.push({src:o.motif||p.apercu,legende:'Le motif'});
 return{listes:{fils:fils,avancement:avancement,chiffres:chiffres,etapes:etapes,galerie:galerie},actions:actions.join('\n\n'),
  infos:{titre:p.titre||'Projet broderie',sous:'Broderie · '+B.statut(p)+(g?' · '+g.l+' × '+g.h+' points':'')}}}

function depuis(p,o){o=o||{};var S=o.S,c=contenu(p,o),site;
 var ancien=o.ancien&&o.ancien.format==='aime-site'?S.migrer?S.migrer(JSON.parse(JSON.stringify(o.ancien))):JSON.parse(JSON.stringify(o.ancien)):null;
 if(ancien){site=ancien}
 else{site=S.vide('vierge');site.id=siteId(p);site.nom='Mini-site · '+(p.titre||'Projet');site.modele='pointzero:'+p.id;site.presentation.ambiance='editorial';
  var page={id:'index',titre:'Le projet',mode:'grille',sections:SECTIONS.map(function(x){return Object.assign({audience:'public'},x)})};
  /* la disposition de départ : l'image et la palette côte à côte, les mesures en bande, l'avancement à côté des actions */
  var L={'pz-hero':[0,0,12],'pz-motif':[0,0,6],'pz-fils':[6,0,6],'pz-mesures':[0,0,12],'pz-avancement':[0,0,6],'pz-actions':[6,0,6],'pz-decisions':[0,0,12]},y=0,ligne=[];
  page.sections.forEach(function(s){var l=L[s.id];s.w=l[2];s.x=l[0];if(s.x===0&&ligne.length){y+=Math.max.apply(null,ligne);ligne=[]}s.y=y;ligne.push(S.hauteur(s.type,s.w))});
  site.pages=[page]}
 PROPRES.forEach(function(k){site.listes[k]=c.listes[k]});
 site.infos.titre=c.infos.titre;site.infos.sous=c.infos.sous;site.majLe=new Date().toISOString();
 site.pages.forEach(function(pg){pg.sections.forEach(function(s){if(s.id==='pz-motif'){s.src=o.motif||p.apercu||'';var g=p.grille;s.texte='Le motif'+(g?' · '+g.l+' × '+g.h+' points, un point de fil par case':'')}if(s.id==='pz-actions')s.texte=c.actions})});
 return site}

return{depuis:depuis,siteId:siteId,SECTIONS:SECTIONS,PROPRES:PROPRES};
});
