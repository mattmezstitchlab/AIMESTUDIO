/* AIME · publications : gabarits de double page et opérations sur les pages. Logique pure, testée sous node.

   Un gabarit est une liste d'EMPLACEMENTS typés posés sur la Grille universelle (12 × 16 par page), comme les archétypes
   d'AIMEPROJET (surtitre, titre, corps, média, méta, sceau…). Appliquer un gabarit ne réécrit jamais un contenu :
   - une section verrouillée garde sa place ;
   - chaque emplacement prend la section qui lui correspond le mieux (même rôle, sinon même type de bloc), comme le
     « fragments → composition » d'AIMEPROJET ;
   - un emplacement sans section en reçoit une vide, à remplir ;
   - une section sans emplacement passe « en réserve » (place:null) : gardée, jamais rendue, replaçable. Rien n'est perdu.

     AIMEPublication.GABARITS, gabarit(id)
     nouvelle({titre}) → site                                   une publication de départ (couverture + ouverture)
     appliquer(page, id) → { page, placees, creees, reserve }   (copie)
     ajouterPage(site, id, apres) / dupliquerPage(site, id) / deplacerPage(site, id, ±1) / retirerPage(site, id) → site (copie)
     deplacer(section, {dx,dy,dw,dh}, pages) / verifier(site) */
(function(root,factory){if(typeof module==='object'&&module.exports){var R=require('../vitrine/rendu.js');require('./planche.js');module.exports=factory(R.site)}else root.AIMEPublication=factory(root.AIMESite)})(typeof self!=='undefined'?self:this,function(S){'use strict';
var COL=12,RANG=16;
function copie(o){return JSON.parse(JSON.stringify(o))}
function uid(p){return(p||'s-')+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
/* e(id, type, variante, p, x, y, w, h, lecture, options) : un emplacement */
function e(id,type,variante,p,x,y,w,h,lecture,o){return Object.assign({id:id,type:type,variante:variante,place:{p:p,x:x,y:y,w:w,h:h,z:(o&&o.z)||0},lecture:lecture},o||{})}
var GABARITS=[
 {id:'couverture',nom:'Quatrième et couverture',famille:'Cadre',pages:2,fonds:['surface','fond'],sommaire:false,principe:'À droite la couverture : image à fond perdu, titre de couverture et accroche par-dessus. À gauche la quatrième : citation, sommaire, colophon et sceau.',
  emplacements:[e('masthead','titraille','masthead',1,1,1,10,4,1,{ton:'inverse',z:2}),e('visuel','image','pleine',1,0,0,12,16,2,{voile:true}),e('accroche','titraille','grand',1,1,10,10,3,3,{ton:'inverse',z:2}),e('une','texte','simple',1,1,13,10,2,4,{ton:'inverse',z:2}),
   e('citation','citation','grande',0,1,1,10,4,5),e('sommaire','sommaire','liste',0,1,5,10,7,6),e('colophon','texte','simple',0,1,12,10,2,7),e('sceau','folio','sceau',0,1,15,10,1,8,{numero:false})]},
 {id:'ouverture-image',nom:'Ouverture · image pleine page',famille:'Axe',pages:2,fonds:['fond','fond'],principe:'Une image à fond perdu à gauche ; à droite la titraille monumentale, le texte sur deux colonnes, une citation et le folio.',
  emplacements:[e('titre','titraille','monumental',1,1,1,10,5,1),e('visuel','image','pleine',0,0,0,12,16,2),e('texte','texte','lettrine',1,1,6,10,6,3),e('citation','citation','encadree',1,1,12,8,2,4),e('folio','folio','sceau',1,1,15,10,1,5)]},
 {id:'article-colonnes',nom:'Article · colonnes et image',famille:'Flux',pages:2,fonds:['fond','fond'],principe:'Titraille et texte en colonnes à gauche ; à droite une grande image et une citation.',
  emplacements:[e('titre','titraille','grand',0,1,1,10,4,1),e('texte','texte','colonnes',0,1,5,10,9,2),e('folio','folio','simple',0,1,15,10,1,3),e('visuel','image','large',1,0,0,12,9,4),e('citation','citation','grande',1,1,10,10,4,5),e('folio-d','folio','simple',1,1,15,10,1,6)]},
 {id:'demonstration',nom:'Démonstration annotée',famille:'Partition',pages:2,fonds:['fond','fond'],principe:'Une leçon : étapes numérotées et encadré à gauche ; à droite l\'écran annoté (repères reliés aux étapes), une comparaison et le lien vers l\'outil.',
  emplacements:[e('titre','titraille','grand',0,1,1,10,4,1),e('ecran','image','encadree',1,1,1,10,7,2),e('etapes','etapes','numerotee',0,1,5,10,7,3),e('comparaison','comparaison','design-systems',1,1,8,10,5,4),e('encadre','encadre','simple',0,1,12,10,2,5),e('lien','bouton','centre',1,1,13,10,2,6),e('folio','folio','simple',0,1,15,10,1,7),e('folio-d','folio','sceau',1,1,15,10,1,8)]},
 {id:'essai-photo',nom:'Essai photographique',famille:'Rupture',pages:2,fonds:['fond','fond'],principe:'Deux images à fond perdu ; le titre se pose sur l\'image de droite.',
  emplacements:[e('visuel','image','pleine',0,0,0,12,16,2),e('titre','titraille','monumental',1,1,10,10,5,1,{ton:'inverse',z:2}),e('visuel-d','image','pleine',1,0,0,12,16,3,{voile:true})]},
 {id:'sommaire',nom:'Sommaire',famille:'Trame',pages:2,fonds:['surface','fond'],principe:'Le sommaire automatique à gauche, une image à droite.',
  emplacements:[e('titre','titraille','grand',0,1,1,10,3,1),e('sommaire','sommaire','liste',0,1,4,10,10,2),e('folio','folio','simple',0,1,15,10,1,3),e('visuel','image','pleine',1,0,0,12,16,4)]},
 {id:'page-texte',nom:'Page de texte',famille:'Trame',pages:1,fonds:['fond'],principe:'Une page seule : titraille, texte, folio.',
  emplacements:[e('titre','titraille','moyen',0,1,1,10,3,1),e('texte','texte','simple',0,1,4,10,10,2),e('folio','folio','simple',0,1,15,10,1,3)]},
 {id:'quatrieme',nom:'Quatrième seule',famille:'Axe',pages:1,fonds:['surface'],sommaire:false,principe:'Une page seule : citation centrée et sceau.',
  emplacements:[e('citation','citation','grande',0,1,4,10,5,1),e('colophon','texte','simple',0,1,12,10,2,2),e('sceau','folio','sceau',0,1,15,10,1,3)]}];
function gabarit(id){return GABARITS.filter(function(g){return g.id===id})[0]||null}

function nouvelleSection(slot){var s={id:uid('s-'),type:slot.type,variante:slot.variante,audience:'public'};(S.BLOCS[slot.type]&&S.BLOCS[slot.type].champs||[]).forEach(function(k){s[k]=''});return s}
function presenter(s,slot){s.place=copie(slot.place);s.lecture=slot.lecture;s.role=slot.id;if(slot.variante)s.variante=slot.variante;['ton','voile','numero'].forEach(function(k){if(slot[k]!=null)s[k]=slot[k];else delete s[k]});return s}
function appliquer(page,id){var g=gabarit(id);if(!g)throw new Error('Gabarit inconnu.');var p=copie(page),secs=p.sections||[],libres=secs.filter(function(s){return!(s.verrou&&s.place)}),placees=[],creees=[];
 var slots=g.emplacements.slice().sort(function(a,b){return a.lecture-b.lecture});
 slots.forEach(function(slot){var i=-1;libres.some(function(s,k){if(s.role===slot.id){i=k;return true}});if(i<0)libres.some(function(s,k){if(s.type===slot.type&&!g.emplacements.some(function(o){return o.id===s.role&&o.id!==slot.id})){i=k;return true}});
  if(i>=0){var s=libres.splice(i,1)[0];presenter(s,slot);placees.push(s.id)}else{var n=presenter(nouvelleSection(slot),slot);secs.push(n);creees.push(n.id)}});
 libres.forEach(function(s){s.place=null});
 p.sections=secs;p.mode='planche';p.gabarit=g.id;p.pages=g.pages;p.fonds=g.fonds.slice();if(g.sommaire===false)p.sommaire=false;else delete p.sommaire;
 return{page:p,placees:placees,creees:creees,reserve:libres.map(function(s){return s.id})}}

function nouvellePage(id,titre){return{id:id,titre:titre||'Nouvelle page',rubrique:'',mode:'planche',sections:[]}}
function idPage(site,base){var b=S.slug(base||'page').slice(0,30)||'page',id=b,n=2;while(site.pages.some(function(p){return p.id===id}))id=b+'-'+(n++);return id}
function nouvelle(o){o=o||{};var s=S.vide('vierge');s.id=uid('pub-');s.nom=String(o.titre||'Ma publication').slice(0,80);s.modele='publication';s.infos.titre=s.nom;
 s.publication={format:{l:3,h:4},numero:String(o.numero||'').slice(0,20)};s.presentation.design=o.design?{id:o.design,revision:'1.0.0'}:null;
 var c=nouvellePage('index','Couverture');c=appliquer(c,'couverture').page;var a=nouvellePage('ouverture','Ouverture');a.rubrique='01';a=appliquer(a,'ouverture-image').page;
 s.pages=[c,a];return s}
function ajouterPage(site,id,apres,titre){var s=copie(site),g=gabarit(id)||gabarit('ouverture-image'),i=s.pages.findIndex(function(p){return p.id===apres}),p=appliquer(nouvellePage(idPage(s,titre||g.nom),titre||g.nom),g.id).page;s.pages.splice(i<0?s.pages.length:i+1,0,p);return{site:s,page:p.id}}
function dupliquerPage(site,id){var s=copie(site),i=s.pages.findIndex(function(p){return p.id===id});if(i<0)return{site:site,page:null};var p=copie(s.pages[i]);p.id=idPage(s,p.titre+' copie');p.titre=(p.titre||'Page')+' (copie)';p.sections.forEach(function(x){x.id=uid('s-')});s.pages.splice(i+1,0,p);return{site:s,page:p.id}}
/* la couverture (index) reste en tête : c'est la première page de la publication et le point d'entrée du site */
function deplacerPage(site,id,d){var s=copie(site),i=s.pages.findIndex(function(p){return p.id===id}),j=i+(d<0?-1:1);if(i<1||j<1||j>=s.pages.length)return{site:site,ok:false};var t=s.pages[i];s.pages[i]=s.pages[j];s.pages[j]=t;return{site:s,ok:true}}
function retirerPage(site,id){if(id==='index')return{site:site,ok:false};var s=copie(site),n=s.pages.length;s.pages=s.pages.filter(function(p){return p.id!==id});return{site:s,ok:s.pages.length<n}}
/* un geste sur la grille : déplacer, dimensionner ; jamais hors de sa page, jamais une section verrouillée */
function deplacer(sec,d,pages){if(!sec.place||sec.verrou)return false;var pl=sec.place,avant=JSON.stringify(pl),np=pages===1?1:2;
 if(d.dp){pl.p=Math.max(0,Math.min(np-1,pl.p+d.dp))}pl.w=Math.max(1,Math.min(COL,pl.w+(d.dw||0)));pl.h=Math.max(1,Math.min(RANG,pl.h+(d.dh||0)));pl.x=Math.max(0,Math.min(COL-pl.w,pl.x+(d.dx||0)));pl.y=Math.max(0,Math.min(RANG-pl.h,pl.y+(d.dy||0)));if(d.dz)pl.z=Math.max(0,Math.min(9,(pl.z||0)+d.dz));
 return JSON.stringify(pl)!==avant}
/* ce qu'une publication doit respecter avant d'être enregistrée ou publiée */
function verifier(site){var pb=[],ids={};site.pages.forEach(function(p){if(p.mode!=='planche')return;p.sections.forEach(function(s){if(ids[s.id])pb.push('Identifiant de bloc en double : '+s.id);ids[s.id]=1;if(!S.BLOCS[s.type])pb.push('Bloc inconnu : '+s.type);
  if(s.type==='image'&&s.src&&!(s.alt||s.texte))pb.push('Image sans texte alternatif (page « '+(p.titre||p.id)+' »)')})});return pb}

return{COL:COL,RANG:RANG,GABARITS:GABARITS,gabarit:gabarit,appliquer:appliquer,nouvelle:nouvelle,ajouterPage:ajouterPage,dupliquerPage:dupliquerPage,deplacerPage:deplacerPage,retirerPage:retirerPage,deplacer:deplacer,verifier:verifier}});
