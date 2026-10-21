/* AIME · orbe légère, réutilisable.
   Représentation PROVISOIRE de l'orbe AIME : elle reprend la technique de la grande landing (un cône de couleurs
   AIME découpé par une enveloppe, avec un halo) mais sans GSAP ni moteur de formes. L'enveloppe respire grâce à
   quelques ondes lentes. Le moteur AIME ORB (/lab/orb/) pourra la remplacer : seule l'API ci-dessous compte.

   AIMEOrbe.monter(element, {amplitude}) → {arreter(), animer(bool)}
   Aucune dépendance. Respecte prefers-reduced-motion (enveloppe immobile). */
(function(root){'use strict';
var n=0;
function monter(el,o){o=o||{};var id='aime-orbe-'+(++n),A=o.amplitude==null?.022:o.amplitude,NS='http://www.w3.org/2000/svg';
 el.innerHTML='<span class="aime-orbe"><span class="ao-halo"></span><svg class="ao-def" width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id="'+id+'" clipPathUnits="objectBoundingBox"><path/></clipPath></defs></svg><span class="ao-peau" style="clip-path:url(#'+id+');-webkit-clip-path:url(#'+id+')"><span class="ao-cone"></span><span class="ao-lumiere"></span></span></span>';
 var path=el.querySelector('path'),reduit=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,actif=!reduit,raf=0,t0=performance.now();
 /* quatre ondes lentes, déphasées : un contour vivant mais calme */
 var ON=[[2,.9,.00031,.3],[3,.55,-.00023,1.7],[5,.28,.00041,4.1],[7,.14,-.00052,2.6]];
 function forme(t){var N=96,d='';for(var i=0;i<=N;i++){var th=i/N*Math.PI*2,r=1;ON.forEach(function(w){r+=A*w[1]*Math.sin(w[0]*th+w[3]+t*w[2])});r*=.5/(1+A*1.9);var x=.5+r*Math.cos(th),y=.5+r*Math.sin(th);d+=(i?'L':'M')+x.toFixed(4)+','+y.toFixed(4)}path.setAttribute('d',d+'Z')}
 /* l'enveloppe change lentement : 30 images par seconde suffisent et ménagent les téléphones */
 var der=0;function boucle(now){if(now-der>32){der=now;forme(now-t0)}if(actif)raf=requestAnimationFrame(boucle)}
 forme(0);if(actif)raf=requestAnimationFrame(boucle);
 return{arreter:function(){actif=false;cancelAnimationFrame(raf)},animer:function(on){on=!!on&&!reduit;if(on===actif)return;actif=on;if(on)raf=requestAnimationFrame(boucle);else cancelAnimationFrame(raf)}}}
root.AIMEOrbe={monter:monter};
})(typeof self!=='undefined'?self:this);
