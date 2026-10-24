/* AIME · module Temps, le CERCLE : la géométrie TEMPORELLE du noyau radial (modules/radial/noyau.js), pour le cadran de Temps.
   Un calculateur PUR (aucun DOM, aucun réseau, testé sous node) qui transforme la vue Temps d'une personne (déjà calculée et filtrée
   par le serveur, modules/temps/moteur.js vue()) en un modèle de cadran à dessiner.
   Il ne décide de rien : ni droit, ni conséquence. Il place ce que la vue contient : moments, horaire prévu, propositions,
   confirmations attendues. Aucun vocabulaire de domaine : il sert un mariage, une formation, un séminaire.

   Ce qui est propre au TEMPS vit ici : la fenêtre de temps (le futur zoom), l'angle d'une minute, l'étendue d'un moment à travers
   minuit, les couloirs des moments simultanés, le nom accessible d'un moment. La géométrie polaire, le tracé d'arc et le toucher
   viennent du noyau commun (ré-exposés ici à l'identique : AIMECercle.polarXY === AIMERadial.polarXY).

   Le cadran est une FENÊTRE de temps : par défaut la journée (0 → 1440 minutes, minuit en haut). Un zoom futur sur une plage
   (par exemple 15:00 → 03:00) passera une autre fenêtre ; rien d'autre ne change (fenetre(), angle()).

   AIMECercle.modele(vue, { couloirs, fenetre, rayon, epaisseur, ecart }) → {
     fenetre, graduations[], arcs[{ id, couloir, d, dPrevu?, debut, fin, etat[], nom }], zones[{ moment, apres, d, nom }],
     debordements[{ id, nom, angle }], couloirs, ordre[] }
   AIMECercle.couloirs(moments, max) → { place: { id: couloir }, deborde: [id], n } */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../radial/noyau.js'));else root.AIMECercle=factory(root.AIMERadial)})(typeof self!=='undefined'?self:this,function(N){'use strict';   /* N : le noyau radial (R reste le rayon du cadran, dans modele) */
if(!N||!N.polarXY)throw new Error('le noyau radial (modules/radial/noyau.js) doit être chargé avant le cercle de Temps');

var GEOMETRIE=N.geometrie('temporelle');
var JOUR=1440,CENTRE=500;

/* ---------- géométrie : celle du noyau commun ---------- */
var polarXY=N.polarXY,arcPathAt=N.arcPathAt,normDeg=N.normDeg;
function n(v){return Math.round(v*100)/100}

/* ---------- la fenêtre de temps (le futur zoom) ---------- */
function fenetre(f){f=f||{};var d=typeof f.debut==='number'?f.debut:0,fi=typeof f.fin==='number'?f.fin:d+JOUR;if(!(fi>d))throw new Error('fenêtre vide');if(fi-d>JOUR)throw new Error('fenêtre de plus de 24 h');return{debut:d,fin:fi,duree:fi-d,jour:fi-d===JOUR}}
/* l'angle d'une minute dans la fenêtre. Journée entière : la minute modulo 1440 (minuit en haut, 06:00 à droite, 12:00 en bas, 18:00 à gauche).
   Fenêtre plus courte (zoom) : proportionnel, hors fenêtre → null */
function angle(m,f){f=f||fenetre();if(f.jour)return normDeg((m-f.debut)/JOUR*360);var x=m;while(x<f.debut)x+=JOUR;while(x>f.fin+JOUR)x-=JOUR;if(x>f.fin)return null;return(x-f.debut)/f.duree*360}
/* l'étendue angulaire d'un moment [dm, fm] : continue, même à travers minuit (le bal de 22:00 à 01:30 passe le sommet sans se couper) */
function etendue(dm,fm,f){f=f||fenetre();if(f.jour){var a0=angle(dm,f);return{a0:a0,a1:a0+Math.min(fm-dm,JOUR)/JOUR*360}}
 var lo=Math.max(dm,f.debut),hi=Math.min(fm,f.fin);if(hi<lo)return null;return{a0:(lo-f.debut)/f.duree*360,a1:(hi-f.debut)/f.duree*360}}

/* ---------- les couloirs : des anneaux concentriques pour les moments simultanés ---------- */
/* glouton dans l'ordre des débuts : un moment prend le premier couloir libre ; au-delà de max, il déborde (montré par une pastille « +N ») */
function couloirs(M,max){max=max||3;var fins=[],place={},deborde=[];
 M.slice().sort(function(a,b){return a.dm-b.dm||b.fm-a.fm||(a.id<b.id?-1:1)}).forEach(function(m){var c=0;while(c<fins.length&&fins[c]>m.dm)c++;
  if(c>=max){deborde.push(m.id);return}fins[c]=m.fm;place[m.id]=c});
 return{place:place,deborde:deborde,n:Math.min(max,Math.max(1,fins.length))}}

function hm(min){min=((Math.round(min)%JOUR)+JOUR)%JOUR;var h=Math.floor(min/60),m=min%60;return(h<10?'0':'')+h+':'+(m<10?'0':'')+m}
function ecart(d){return(d>0?'décalé de ':'avancé de ')+Math.abs(d)+' min'}

/* le nom accessible d'un arc : tout ce que le dessin dit, en mots (la couleur ne porte jamais seule une information) */
function nom(m,props){var t=[m.titre+', '+m.debut+' à '+m.fin+(m.fm>=JOUR&&m.dm<JOUR?' (finit le lendemain)':'')];
 if(m.decalage)t.push(ecart(m.decalage)+', prévu '+m.prevu);
 if(m.fait)t.push('fait');if(m.planBActif)t.push('lieu de repli : '+m.lieu);
 if(m.responsable==='moi')t.push('vous portez ce moment');
 if(m.aConfirmer)t.push('nouvel horaire à confirmer');
 (props||[]).forEach(function(p){t.push('proposition : '+p.texte)});
 return t.join(' ; ')}

/* ---------- le modèle du cadran ---------- */
function modele(vue,o){o=o||{};var f=fenetre(o.fenetre),max=o.couloirs||3,R=o.rayon||370,E=o.epaisseur||44,G=o.ecart||10;
 var M=(vue&&vue.moments)||[],props=(vue&&vue.propositions)||[],pp={};props.forEach(function(p){(pp[p.moment]=pp[p.moment]||[]).push(p)});
 var c=couloirs(M,max),r=function(k){return R-k*(E+G)};
 var arcs=[];M.forEach(function(m){if(!(m.id in c.place))return;var e=etendue(m.dm,m.fm,f);if(!e)return;var k=c.place[m.id],etat=[];
  if(m.fait)etat.push('fait');if(m.decalage)etat.push('decale');if(m.aConfirmer)etat.push('a-confirmer');if(pp[m.id])etat.push('propose');if(m.planBActif)etat.push('repli');if(m.responsable==='moi')etat.push('moi');
  var vis=Math.max(e.a1,e.a0+2);   /* un moment très court reste visible (2° au moins) ; ses heures exactes sont dans son nom */
  var a={id:m.id,couloir:k,rayon:r(k),d:arcPathAt(CENTRE,CENTRE,r(k),e.a0,vis),debut:m.debut,fin:m.fin,a0:e.a0,a1:e.a1,etat:etat,nom:nom(m,pp[m.id]),lendemain:m.fm>JOUR&&m.dm<JOUR};
  if(m.decalage){var p=etendue(m.dm-m.decalage,m.fm-m.decalage,f);if(p)a.dPrevu=arcPathAt(CENTRE,CENTRE,r(k)+E/2+6,p.a0,p.a1)}
  if(m.responsable==='moi')a.dMoi=arcPathAt(CENTRE,CENTRE,r(k)-E/2-8,e.a0,e.a1);   /* « mes moments » : un liseré intérieur */
  arcs.push(a)});
 /* une proposition : la partie du moment qui empiète, sur son propre arc */
 var parId={};M.forEach(function(m){parId[m.id]=m});var aP={};arcs.forEach(function(a){aP[a.id]=a});
 var zones=props.map(function(p){var b=parId[p.moment],a=aP[p.moment];if(!b||!a)return null;var e=etendue(b.dm,b.dm+p.minutes,f);if(!e)return null;
  return{moment:p.moment,apres:p.apres,minutes:p.minutes,d:arcPathAt(CENTRE,CENTRE,a.rayon,e.a0,e.a1),nom:p.texte}}).filter(Boolean);
 var debordements=c.deborde.map(function(id){var m=parId[id];return{id:id,nom:nom(m,pp[id]),angle:angle(m.dm,f)}}).filter(function(x){return x.angle!=null});
 /* les graduations : chaque heure de la fenêtre, les quatre cardinales marquées (en journée entière : 00, 06, 12, 18) */
 var graduations=[];for(var h=Math.ceil(f.debut/60)*60;h<=f.fin-(f.jour?1:0);h+=60){var a=angle(h,f);if(a==null)continue;var card=f.jour?h%360===0:false;
  var p1=polarXY(CENTRE,CENTRE,R+E/2+6,a),p2=polarXY(CENTRE,CENTRE,R+E/2+(card?24:16),a),pl=polarXY(CENTRE,CENTRE,R+E/2+(a===0||a===180?58:32),a);
  /* les heures des côtés s'écrivent vers l'extérieur (jamais sur leur trait), celles du haut et du bas centrées */
  graduations.push({minute:h,angle:a,cardinale:card,x1:n(p1.x),y1:n(p1.y),x2:n(p2.x),y2:n(p2.y),lx:n(pl.x),ly:n(pl.y),ancre:a===90?'start':a===270?'end':'middle',texte:card?(hm(h).slice(0,2)+' h'):''})}
 /* l'ordre de parcours au clavier : par heure de début, puis couloir */
 var ordre=arcs.slice().sort(function(a,b){return(parId[a.id].dm-parId[b.id].dm)||(a.couloir-b.couloir)}).map(function(a){return a.id});
 return{fenetre:f,centre:CENTRE,rayon:R,epaisseur:E,ecart:G,graduations:graduations,arcs:arcs,zones:zones,debordements:debordements,couloirs:c.n,ordre:ordre}}

/* toucher : un point du cadran (unités du dessin) → le moment le plus proche, dans une tolérance donnée (le noyau commun ;
   un moment très court compte pour 2°, comme il est dessiné) */
function toucher(M,x,y,tol){return N.toucher(M,x,y,tol,{minSpan:2})}

return{GEOMETRIE:GEOMETRIE,JOUR:JOUR,toucher:toucher,polarXY:polarXY,arcPathAt:arcPathAt,normDeg:normDeg,fenetre:fenetre,angle:angle,etendue:etendue,couloirs:couloirs,nom:nom,modele:modele,hm:hm};
});
