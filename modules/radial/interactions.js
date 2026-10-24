/* AIME · les INTERACTIONS du noyau radial, dans le navigateur : toucher au doigt et clavier, pour n'importe quelle présentation circulaire.
   Elles ne dessinent rien et ne décident de rien : la présentation (un module) dessine ses segments, chacun portant data-id ;
   les interactions disent « ce segment-là » (choisir) ou « revenir » (fermer). Le calcul vient de modules/radial/noyau.js.

   AIMERadial.interactions(svg, {
     groupe,                 // l'élément qui contient les segments focusables (délégation : un seul écouteur clavier)
     selecteur,              // les segments focusables dans ce groupe (role="button", tabindex, data-id)
     ordre,                  // l'ordre de parcours au clavier : [id]
     toucher(x, y, tol),     // un point du dessin → un id ou null (le noyau, avec le modèle de la présentation)
     tolerance,              // en px À L'ÉCRAN (24 par défaut) : convertie en unités du dessin
     ignorer,                // les éléments dont le clic appartient à la présentation (ex. une pastille « +N »)
     choisir(id, comment),   // comment : 'toucher' | 'clavier'
     fermer()                // Échap
   })
   Un seul écouteur de clic (sur le SVG) et un seul écouteur clavier (sur le groupe), quel que soit le nombre de segments. */
(function(root){'use strict';
var R=root.AIMERadial=root.AIMERadial||{};
function interactions(svg,o){var tol=o.tolerance||24;
 svg.addEventListener('click',function(e){if(o.ignorer&&e.target.closest&&e.target.closest(o.ignorer))return;var ctm=svg.getScreenCTM();if(!ctm)return;
  var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;var q=p.matrixTransform(ctm.inverse());var id=o.toucher(q.x,q.y,tol/ctm.a);if(id)o.choisir(id,'toucher')});
 o.groupe.addEventListener('keydown',function(e){var seg=e.target.closest&&e.target.closest(o.selecteur);if(!seg||!o.groupe.contains(seg))return;var id=seg.getAttribute('data-id'),k=e.key,v=R.intention(k);
  if(v==='ouvrir'){e.preventDefault();o.choisir(id,'clavier');return}
  if(v==='fermer'){e.preventDefault();if(o.fermer)o.fermer();return}
  var cible=R.suivant(o.ordre,id,k);
  if(cible){e.preventDefault();[].forEach.call(o.groupe.querySelectorAll(o.selecteur),function(x){x.setAttribute('tabindex',x.getAttribute('data-id')===cible?'0':'-1')});
   var c=[].filter.call(o.groupe.querySelectorAll(o.selecteur),function(x){return x.getAttribute('data-id')===cible})[0];if(c)c.focus()}})}
R.interactions=interactions;
})(typeof self!=='undefined'?self:this);
