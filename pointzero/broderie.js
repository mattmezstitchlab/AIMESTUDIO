/* AIME · Point Zéro, moteur « broderie » : de la photo déposée à une carte projet qualifiée.
   Ici, rien ne produit le patron final : on reconnaît, on propose, on fait confirmer, on mesure l'avancement.
   La conversion des couleurs réutilise le moteur d'AIME Stitch (stitch/js/conversion.js) et son nuancier DMC, tels quels.
   Logique pure, testée sous node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEBroderie=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* les supports : nombre de points par pouce (2,54 cm) */
var TOILES=[
 {id:'aida11',nom:'Aïda 11',ct:11,dit:'Grosses cases, rapide et très lisible : idéal pour débuter.'},
 {id:'aida14',nom:'Aïda 14',ct:14,dit:'Le standard : un bon équilibre entre finesse et confort.'},
 {id:'aida16',nom:'Aïda 16',ct:16,dit:'Plus fin : davantage de détails, des points plus petits.'},
 {id:'aida18',nom:'Aïda 18',ct:18,dit:'Très fin : beaucoup de détails, demande de bons yeux.'},
 {id:'lin28',nom:'Lin 28 fils (brodé sur 2 fils)',ct:14,dit:'Rendu plus délicat, même finesse qu\'Aïda 14, un peu plus exigeant.'}];
var USAGES=[
 {id:'apercu',nom:'Voir un aperçu'},{id:'patron',nom:'Un patron à broder'},{id:'impression',nom:'L\'imprimer'},{id:'pdf',nom:'Un PDF plus tard'}];
var FORMATS=[10,15,20,30];
/* la finesse : la part de points gardée par rapport au maximum que permet le format sur cette toile */
var FINESSES=[{id:'fidele',nom:'Fidèle au format',k:1,dit:'Tous les points que permet la taille choisie.'},{id:'allege',nom:'Allégé',k:.75,dit:'Un quart de points en moins : plus rapide à broder, moins de détails.'},{id:'simple',nom:'Très simple',k:.5,dit:'Moitié moins de points : de grands aplats, idéal pour un premier ouvrage.'}];
/* le nombre de couleurs : les trois modes d'AIME Stitch */
var COULEURS=[{id:'simple',nom:'Palette réduite',n:8,dit:'Peu de couleurs, de grandes zones faciles à broder.'},{id:'equilibre',nom:'Palette équilibrée',n:16,dit:'Le compromis entre fidélité et faisabilité.'},{id:'precis',nom:'Palette détaillée',n:28,dit:'Davantage de nuances et de détails.'}];

var ETAPES=[
 {id:'format',nom:'Le format final',question:'Quelle taille pour l\'ouvrage fini, et pour quoi faire ?'},
 {id:'toile',nom:'La toile',question:'Sur quel support brodez-vous ?'},
 {id:'points',nom:'Le nombre de points',question:'Quelle finesse pour la grille ?'},
 {id:'couleurs',nom:'Le nombre de couleurs',question:'Combien de couleurs de fil ?'},
 {id:'conversion',nom:'Écran, impression, fil',question:'Les couleurs ne sont pas les mêmes selon où on les voit : on vérifie ensemble ?'},
 {id:'dmc',nom:'La validation DMC',question:'Ces références DMC vous conviennent-elles ?'}];
var MAX_POINTS=220; /* au-delà, on reste en préparation : l'atelier fera le travail fin */

/* ---------- reconnaître ---------- */
var MOTS=['broderie','broder','brode','point de croix','points de croix','canevas','dmc','aida','aïda','patron','grille','fil','fils','ouvrage','tambour'];
function plier(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
/* une matière : {type:'image', l, h, couleurs?} ou {type:'texte', texte} ; score de 0 à 1 et raisons lisibles */
function reconnaitre(m){m=m||{};var raisons=[],s=0;
 if(m.type==='image'){s+=.55;raisons.push('une image : elle peut devenir une grille de points');
  if(m.l&&m.h){var r=Math.max(m.l,m.h)/Math.min(m.l,m.h);if(r<=2.2){s+=.15;raisons.push('des proportions faciles à encadrer')}}
  if(m.couleurs&&m.couleurs<=48){s+=.1;raisons.push('un nombre de couleurs que des fils peuvent rendre')}
  if(m.nom&&MOTS.some(function(w){return plier(m.nom).indexOf(plier(w))>=0})){s+=.15;raisons.push('un nom de fichier qui parle de broderie')}}
 if(m.type==='texte'){var p=' '+plier(m.texte)+' ',vus=MOTS.filter(function(w){return p.indexOf(' '+plier(w))>=0});if(vus.length){s+=Math.min(.8,.35+.15*vus.length);raisons.push('des mots de broderie : '+vus.slice(0,3).join(', '))}}
 s=Math.min(1,s);return{broderie:s>=.5,score:+s.toFixed(2),raisons:raisons}}

/* ---------- mesurer ---------- */
function toile(id){return TOILES.filter(function(t){return t.id===id})[0]||TOILES[1]}
/* la grille : du format (largeur en cm) et de la toile, on tire le nombre de points, puis la finesse l'allège */
function grille(c,ratio){ratio=ratio||1;var t=toile(c.toile),cm=+c.largeurCm||FORMATS[1],max=Math.round(cm*t.ct/2.54),f=(FINESSES.filter(function(x){return x.id===c.finesse})[0]||FINESSES[0]).k;
 var l=Math.max(20,Math.min(MAX_POINTS,Math.round(max*f))),h=Math.max(1,Math.round(l/ratio)),cmL=l*2.54/t.ct,cmH=h*2.54/t.ct;
 return{l:l,h:h,points:l*h,cm:[+cmL.toFixed(1),+cmH.toFixed(1)],plafonne:Math.round(max*f)>MAX_POINTS}}

/* ---------- l'écran, l'impression, le fil ---------- */
function hex(rgb){return'#'+rgb.map(function(v){return('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2)}).join('').toUpperCase()}
function rgbDe(h){h=String(h||'').replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
/* conversion naïve RVB → CMJN : seulement pour montrer que l'impression parle un autre langage (les vraies valeurs dépendent du profil d'impression) */
function cmjn(rgb){var r=rgb[0]/255,g=rgb[1]/255,b=rgb[2]/255,k=1-Math.max(r,g,b);if(k>=1)return[0,0,0,100];return[(1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k].map(function(v){return Math.round(v*100)})}

/* ---------- avancer ---------- */
/* l'avancement : la matière reçue et reconnue compte pour une étape, puis chaque confirmation */
function progression(p){var faites=ETAPES.filter(function(e){return p.confirme&&p.confirme[e.id]}).length,total=ETAPES.length+1;return Math.round((1+faites)/total*100)}
function suivante(p){return ETAPES.filter(function(e){return!(p.confirme&&p.confirme[e.id])})[0]||null}
function statut(p){var s=suivante(p);return s?'en préparation':'prêt pour l\'atelier'}
/* ce que l'orbe propose ensuite, en une phrase */
function action(p){var s=suivante(p);if(!s)return'Tout est confirmé. Le projet est prêt à passer en atelier (AIME Stitch) quand vous le déciderez.';
 return{format:'Choisir la taille de l\'ouvrage fini.',toile:'Choisir la toile : elle décide de la taille des points.',points:'Régler la finesse de la grille.',couleurs:'Choisir le nombre de couleurs de fil.',conversion:'Comprendre l\'écart entre l\'écran, l\'impression et le fil.',dmc:'Confirmer les références DMC proposées.'}[s.id]}
function resume(p){var c=p.choix||{},g=p.grille,t=toile(c.toile),L=[];
 L.push(['Format',c.largeurCm?(g?g.cm[0]+' × '+g.cm[1]+' cm':c.largeurCm+' cm de large')+(c.usage?' · '+(USAGES.filter(function(u){return u.id===c.usage})[0]||{}).nom:''):'à confirmer']);
 L.push(['Support',p.confirme&&p.confirme.toile?t.nom:'à confirmer']);
 L.push(['Points',g&&p.confirme&&p.confirme.points?g.l+' × '+g.h+' ('+g.points.toLocaleString('fr-FR')+' points)':'à confirmer']);
 L.push(['Couleurs',p.palette&&p.confirme&&p.confirme.couleurs?p.palette.length+' fils':'à confirmer']);
 L.push(['Conversion DMC',p.confirme&&p.confirme.dmc?'confirmée':(p.confirme&&p.confirme.conversion?'à valider':'à confirmer')]);return L}

/* le résumé structuré que l'orbe remonte (sans l'image : elle reste sur l'appareil) */
function remontee(p){return{type:'broderie',titre:p.titre,statut:statut(p),progression:progression(p),cree:p.cree,source:{nom:p.source&&p.source.nom,l:p.source&&p.source.l,h:p.source&&p.source.h},
 choix:p.choix||{},grille:p.grille||null,palette:(p.palette||[]).map(function(c){return{dmc:c.dmc,nom:c.nom,points:c.points}}),confirme:p.confirme||{},reconnaissance:p.reconnaissance||null}}

return{TOILES:TOILES,USAGES:USAGES,FORMATS:FORMATS,FINESSES:FINESSES,COULEURS:COULEURS,ETAPES:ETAPES,MAX_POINTS:MAX_POINTS,
 reconnaitre:reconnaitre,grille:grille,toile:toile,hex:hex,rgbDe:rgbDe,cmjn:cmjn,progression:progression,suivante:suivante,statut:statut,action:action,resume:resume,remontee:remontee};
});
