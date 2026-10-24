/* AIME · le NOYAU RADIAL : ce que toutes les présentations circulaires partagent, et rien d'autre.
   Un calculateur PUR (aucun DOM, aucun réseau, testé sous node) : géométrie polaire, tracé d'arc, toucher au doigt, parcours au clavier,
   position « 3 sur 12 ». Il ne connaît ni module, ni ressource, ni rôle, ni permission : il reçoit des segments déjà calculés
   ({ id, a0, a1, rayon }) par une géométrie, et rend des identifiants. Ce qui est affiché, et ce qui est permis, se décide ailleurs
   (la vue servie par le serveur, le registre de modules).

   Deux GÉOMÉTRIES, à ne jamais confondre (docs/RADIAL.md) :
   - temporelle : l'angle porte une heure ; la longueur d'un arc EST une durée ; des moments simultanés vont en couloirs concentriques.
     Exemple : modules/temps/cercle.js (présentation « cercle » du registre).
   - collection : l'angle porte un rang ; les segments sont ÉGAUX ; des groupes en secteurs ; au-delà d'une limite, des pages.
     Exemple prévu : l'Anneau (présentation « anneau » du registre).
   Une géométrie se DÉCLARE (geometrie(nom)) ; elle n'est jamais déduite des données.

   Géométrie reprise de RIPPLECIRCLE (mattmezstitchlab/RIPPLECIRCLE, src/utils/radial.ts : polarXY, arcPathAt), complétée :
   arc nul, tour complet. Convention : 0° en haut, sens horaire. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMERadial=Object.assign(root.AIMERadial||{},factory())})(typeof self!=='undefined'?self:this,function(){'use strict';

var GEOMETRIES={
 temporelle:{angle:'heure',segments:'proportionnels à la durée',simultanes:'couloirs concentriques',limite:'couloirs, puis « +N »'},
 collection:{angle:'rang',segments:'égaux',simultanes:'sans objet',limite:'groupes, puis pages'}};
function geometrie(nom){if(!Object.prototype.hasOwnProperty.call(GEOMETRIES,nom))throw new Error('géométrie radiale inconnue : '+nom);return nom}

/* ---------- géométrie polaire ---------- */
function polarXY(cx,cy,r,deg){var rad=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}}
function n(v){return Math.round(v*100)/100}
/* un arc dans le sens horaire de a0 à a1 (degrés, a1 ≥ a0) ; tour complet = deux demi-arcs ; arc nul = un trait minimal */
function arcPathAt(cx,cy,r,a0,a1){if(a1-a0>=359.99){return arcPathAt(cx,cy,r,a0,a0+180)+' '+arcPathAt(cx,cy,r,a0+180,a0+359.99)}
 if(a1-a0<0.5)a1=a0+0.5;var s=polarXY(cx,cy,r,a0),e=polarXY(cx,cy,r,a1);
 return'M'+n(s.x)+' '+n(s.y)+' A'+r+' '+r+' 0 '+(a1-a0>180?1:0)+' 1 '+n(e.x)+' '+n(e.y)}
function normDeg(a){return((a%360)+360)%360}

/* ---------- toucher : un point (unités du dessin) → le segment le plus proche, dans une tolérance ----------
   M = { centre, epaisseur, arcs: [{ id, a0, a1, rayon }] }. Le doigt n'a pas à viser un segment étroit : on mesure la distance au
   tracé (l'écart d'angle ramené en longueur, et l'écart de rayon au-delà de l'épaisseur). Un segment très court compte pour
   o.minSpan degrés (2 par défaut). À distance égale, le segment dont le rayon est le plus proche l'emporte. */
function toucher(M,x,y,tol,o){var min=o&&typeof o.minSpan==='number'?o.minSpan:2,dx=x-M.centre,dy=y-M.centre,r=Math.sqrt(dx*dx+dy*dy),a=normDeg(Math.atan2(dy,dx)*180/Math.PI+90),best=null;
 M.arcs.forEach(function(c){var span=Math.max(c.a1-c.a0,min),d=normDeg(a-c.a0),ang=d<=span?0:Math.min(d-span,360-d),long=ang*Math.PI/180*c.rayon,rad=Math.max(0,Math.abs(r-c.rayon)-M.epaisseur/2),dist=Math.sqrt(long*long+rad*rad);
  if(dist<=tol&&(!best||dist<best.dist||(dist===best.dist&&Math.abs(r-c.rayon)<best.rad)))best={id:c.id,dist:dist,rad:Math.abs(r-c.rayon)}});
 return best?best.id:null}

/* ---------- clavier : un seul arrêt de tabulation, les flèches parcourent l'ordre (focus itinérant) ---------- */
/* l'intention d'une touche sur un segment : 'ouvrir' (Entrée, Espace), 'fermer' (Échap), sinon null */
function intention(touche){return touche==='Enter'||touche===' '?'ouvrir':touche==='Escape'?'fermer':null}
/* le segment suivant dans l'ordre de parcours (boucle aux deux bouts) ; null si la touche ne déplace pas */
function suivant(ordre,id,touche){var L=ordre.length;if(!L)return null;var i=ordre.indexOf(id);
 if(touche==='ArrowRight'||touche==='ArrowDown')return ordre[(i+1)%L];
 if(touche==='ArrowLeft'||touche==='ArrowUp')return ordre[(i-1+L)%L];
 if(touche==='Home')return ordre[0];if(touche==='End')return ordre[L-1];return null}
/* la position dite à un lecteur d'écran : « 3 sur 12 » (i compté à partir de 0) */
function position(i,total){return(i+1)+' sur '+total}

return{GEOMETRIES:GEOMETRIES,geometrie:geometrie,polarXY:polarXY,arcPathAt:arcPathAt,normDeg:normDeg,toucher:toucher,intention:intention,suivant:suivant,position:position};
});
