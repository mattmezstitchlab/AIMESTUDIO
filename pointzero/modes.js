/* AIME · Point Zéro, les six formes deviennent des outils : la logique pure des réglages (testée sous node).
   Ligne : les paramètres (un point = une décision). Relation : fils DMC, voisins, paires proches.
   Grille : déplacer et regrouper des fils (les cases du patron suivent). Composition : des blocs ordonnés et dimensionnés.
   Projet : avancement séparé (analyse, confirmations, réalisation, livrables), décisions, manques.
   Les références DMC ne sont jamais inventées ni modifiées : un fil ne peut être remplacé que par une entrée réelle du nuancier. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./broderie.js'));else root.AIMEModes=factory(root.AIMEBroderie)})(typeof self!=='undefined'?self:this,function(B){'use strict';

/* ---------- la trace : chaque décision garde sa source ---------- */
var SOURCES={utilisateur:'Vous',calcul:'Calcul',import:'Import',ia:'Hypothèse IA'};
function decider(p,cle,valeur,texte,source){p.decisions=p.decisions||{};p.historique=p.historique||[];var t=new Date().toISOString(),avant=p.decisions[cle];
 p.decisions[cle]={valeur:valeur,texte:texte,source:source||'utilisateur',le:t};p.historique.unshift({cle:cle,texte:texte,source:source||'utilisateur',le:t,avant:avant?avant.texte:null});
 if(p.historique.length>200)p.historique.length=200;p.maj=t;return p}

/* ---------- LIGNE : les paramètres de la broderie ---------- */
function parametres(p){var c=p.choix||{},cf=p.confirme||{};return[
 {id:'largeurCm',etape:'format',nom:'Largeur',type:'curseur',min:4,max:120,pas:1,unite:'cm',valeur:+c.largeurCm||15,valide:!!cf.format,lu:(+c.largeurCm||15)+' cm'},
 {id:'usage',etape:'format',nom:'Usage',type:'choix',options:B.USAGES,valeur:c.usage||'patron',valide:!!cf.format,lu:(B.USAGES.filter(function(u){return u.id===c.usage})[0]||B.USAGES[1]).nom},
 {id:'toile',etape:'toile',nom:'Toile',type:'choix',options:B.TOILES,valeur:c.toile||'aida14',valide:!!cf.toile,lu:B.toile(c.toile).nom},
 {id:'finesse',etape:'points',nom:'Densité',type:'choix',options:B.FINESSES,valeur:c.finesse||'fidele',valide:!!cf.points,lu:(B.FINESSES.filter(function(f){return f.id===c.finesse})[0]||B.FINESSES[0]).nom},
 {id:'couleurs',etape:'couleurs',nom:'Couleurs',type:'choix',options:B.COULEURS,valeur:c.couleurs||'equilibre',valide:!!cf.couleurs,lu:(B.COULEURS.filter(function(x){return x.id===c.couleurs})[0]||B.COULEURS[1]).nom}]}
/* la conséquence d'un réglage, avant de l'appliquer : la grille qui en résulte */
function consequence(p,cle,v){var c=Object.assign({},p.choix);c[cle]=v;var g=B.grille(c,p.ratio||1),a=p.grille||B.grille(p.choix,p.ratio||1);
 if(cle==='usage')return'Ne change pas la grille : '+g.l+' × '+g.h+' points.';
 if(cle==='couleurs'){var n=(B.COULEURS.filter(function(x){return x.id===v})[0]||{}).n;return'Jusqu\'à '+n+' fils au lieu de '+((p.palette||[]).length||'?')+' : la conversion sera refaite à partir de votre image.'}
 return g.l+' × '+g.h+' points ('+g.points.toLocaleString('fr-FR')+'), soit '+g.cm[0]+' × '+g.cm[1]+' cm'+(g.points!==a.points?' : '+(g.points>a.points?'+':'')+(g.points-a.points).toLocaleString('fr-FR')+' points.':'.')+(g.plafonne?' Limité à '+B.MAX_POINTS+' points de large.':'')}
/* appliquer un réglage : la valeur est déjà vérifiée ; l'étape correspondante est confirmée, sauf les couleurs (il faut reconvertir) */
function regler(p,cle,v){p.choix=p.choix||{};p.choix[cle]=v;p.confirme=p.confirme||{};var prm=parametres(p).filter(function(x){return x.id===cle})[0];
 if(cle!=='couleurs'){p.grille=B.grille(p.choix,p.ratio||1);p.confirme[prm.etape]=true}
 decider(p,cle,v,prm.nom+' : '+parametres(p).filter(function(x){return x.id===cle})[0].lu,'utilisateur');return p}

/* ---------- RELATION : fils et voisins ---------- */
function ecart(a,b){var x=B.rgbDe(a),y=B.rgbDe(b);return Math.round(Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]))}
function total(p){return(p.palette||[]).reduce(function(s,x){return s+(x.points||0)},0)||1}
/* les fils réels du nuancier les plus proches de la couleur d'écran, hors ceux déjà dans la palette */
function voisins(p,i,fils,n){var x=p.palette[i],pris={};p.palette.forEach(function(y){pris[y.dmc]=1});
 return(fils||[]).filter(function(f){return f&&f.code&&f.hex&&!pris[f.code]}).map(function(f){return{code:f.code,nom:f.nom||'',hex:f.hex,ecart:ecart(x.ecran||x.hex,f.hex)}}).sort(function(a,b){return a.ecart-b.ecart}).slice(0,n||3)}
/* remplacer un fil par une entrée RÉELLE du nuancier (vérifiée par son code) : les cases suivent, rien n'est inventé */
function remplacer(p,i,code,fils){var f=(fils||[]).filter(function(x){return x.code===code})[0];if(!f)throw new Error('Ce fil n\'est pas dans le nuancier DMC.');
 if(p.palette.some(function(y,j){return j!==i&&y.dmc===code}))throw new Error('Ce fil est déjà dans la palette : regroupez plutôt les deux.');
 var a=p.palette[i];p.palette[i]=Object.assign({},a,{dmc:f.code,nom:f.nom||'',hex:f.hex});decider(p,'fil-'+i,f.code,'DMC '+a.dmc+' remplacé par DMC '+f.code,'utilisateur');p.confirme.dmc=false;return p}
/* les paires de fils les plus proches : candidates au regroupement */
function paires(p,n){var L=[],P=p.palette||[];for(var i=0;i<P.length;i++)for(var j=i+1;j<P.length;j++)L.push({a:i,b:j,ecart:ecart(P[i].hex,P[j].hex)});return L.sort(function(x,y){return x.ecart-y.ecart}).slice(0,n||3)}

/* ---------- GRILLE : regrouper et déplacer (les cases du patron suivent) ---------- */
/* regrouper : les fils « autres » rejoignent le fil « garde » ; les cases sont renumérotées */
function regrouper(p,garde,autres){var P=p.palette,ids=autres.filter(function(j){return j!==garde&&j>=0&&j<P.length});if(!ids.length)return p;
 var map=[],k=0,nv=[];P.forEach(function(x,j){if(ids.indexOf(j)>=0)return;map[j]=k++;nv.push(Object.assign({},x))});var gi=map[garde];
 ids.forEach(function(j){map[j]=gi;nv[gi].points+=P[j].points});
 if(p.cases)for(var c=0;c<p.cases.length;c++){var v=p.cases[c];if(v)p.cases[c]=map[v-1]+1}
 var codes=ids.map(function(j){return'DMC '+P[j].dmc}).join(', ');p.palette=nv;p.confirme.dmc=false;decider(p,'regroupe-'+P[garde].dmc,null,codes+' regroupé'+(ids.length>1?'s':'')+' avec DMC '+P[garde].dmc,'utilisateur');return p}
/* déplacer un fil dans l'ordre de broderie */
function deplacer(p,de,vers){var P=p.palette;if(de===vers||de<0||vers<0||de>=P.length||vers>=P.length)return p;var ordre=P.map(function(_,i){return i}),x=ordre.splice(de,1)[0];ordre.splice(vers,0,x);
 var map=[];ordre.forEach(function(ancien,nouveau){map[ancien]=nouveau});p.palette=ordre.map(function(i){return P[i]});
 if(p.cases)for(var c=0;c<p.cases.length;c++){var v=p.cases[c];if(v)p.cases[c]=map[v-1]+1}decider(p,'ordre',null,'Ordre de broderie : DMC '+P[de].dmc+' en position '+(vers+1),'utilisateur');return p}

/* ---------- COMPOSITION : des blocs, une interface responsive (4 colonnes, réduites à 1 sur téléphone) ---------- */
var BLOCS={image:'Votre image',grille:'La grille',fils:'Les fils DMC',ecran:'Les couleurs de l\'image',infos:'Les mesures'};
function composition(p){if(p.composition&&p.composition.blocs)return p.composition;return{valide:false,blocs:[{id:'image',l:2,h:2},{id:'fils',l:2,h:1},{id:'ecran',l:2,h:1},{id:'grille',l:4,h:2},{id:'infos',l:4,h:1}]}}
function bloc(c,id){return c.blocs.filter(function(b){return b.id===id})[0]}
function bouger(c,id,d){var i=c.blocs.indexOf(bloc(c,id)),j=i+d;if(i<0||j<0||j>=c.blocs.length)return c;var x=c.blocs.splice(i,1)[0];c.blocs.splice(j,0,x);c.valide=false;return c}
function dimensionner(c,id,l,h){var b=bloc(c,id);if(!b)return c;b.l=Math.max(1,Math.min(4,Math.round(l)));b.h=Math.max(1,Math.min(3,Math.round(h)));c.valide=false;return c}
function valider(p,c){c.valide=true;p.composition=c;decider(p,'composition',null,'Composition validée : '+c.blocs.map(function(b){return BLOCS[b.id]}).join(', '),'utilisateur');return p}

/* ---------- PROJET : des avancements séparés, jamais 100 % parce que l'animation est finie ---------- */
function avancements(p){var cf=p.confirme||{},n=B.ETAPES.filter(function(e){return cf[e.id]}).length;
 return[{id:'analyse',nom:'Analyse',v:p.palette?100:p.reconnaissance?50:0,dit:p.palette?'Image lue, couleurs relevées, fils proposés.':'En cours.'},
  {id:'confirmations',nom:'Confirmations',v:Math.round(n/B.ETAPES.length*100),dit:n+' sur '+B.ETAPES.length+' choix confirmés.'},
  {id:'realisation',nom:'Réalisation',v:0,dit:'Pas commencée : l\'atelier prendra le relais quand vous le déciderez.'},
  {id:'livrables',nom:'Livrables',v:0,dit:'Patron PDF : à venir.'}]}
function manques(p){var cf=p.confirme||{};var L=B.ETAPES.filter(function(e){return!cf[e.id]}).map(function(e){return e.nom});if(p.composition&&!p.composition.valide||!p.composition)L.push('La composition');return L}

return{SOURCES:SOURCES,BLOCS:BLOCS,decider:decider,parametres:parametres,consequence:consequence,regler:regler,ecart:ecart,total:total,voisins:voisins,remplacer:remplacer,paires:paires,
 regrouper:regrouper,deplacer:deplacer,composition:composition,bouger:bouger,dimensionner:dimensionner,valider:valider,avancements:avancements,manques:manques};
});
