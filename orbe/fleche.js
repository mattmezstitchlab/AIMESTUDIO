/* AIME · grande landing : la pointe de la flèche boussole devient le pointeur.
   L'orbe-curseur (#ocur) ne marque plus le point cliqué : elle suit la flèche, derrière sa queue.
   La flèche garde son rôle de boussole (elle se tourne vers la prochaine étape) ; sans destination, elle pointe
   en haut à gauche, comme un pointeur ordinaire. Le clic a lieu exactement à la pointe. */
(function(){'use strict';
var G=document.getElementById('gps'),C=window.aimeCur;if(!G||!C||!C.fine)return;var O=C.el;
var css=document.createElement('style');css.textContent=
 '#gps b{display:none}'+
 '#gps i{margin:-7px 0 0 -15px!important;border-left-width:15px!important;border-top-width:7px!important;border-bottom-width:7px!important;filter:drop-shadow(0 0 4px rgba(124,92,255,.9)) drop-shadow(0 1px 2px rgba(0,0,0,.85))!important;animation:none!important}'+
 '#gps.pointe{opacity:1}#gps.near i{border-left-color:#C4B5FD!important}'+
 '#ocur.dot{transition:opacity .15s,width .25s,height .25s,margin .12s linear}';
document.head.appendChild(css);
var px=-1,py=-1;document.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'){px=e.clientX;py=e.clientY}},{passive:true});
function angleBoussole(){var m=/rotate\(([-\d.e]+)rad\)/.exec(G.style.transform||'');return m?+m[1]:null}
(function boucle(){var dot=O.classList.contains('dot')&&!O.classList.contains('on')&&!document.body.classList.contains('cal');
 if(dot&&px>=0){var a;if(G.classList.contains('on')){a=angleBoussole();G.classList.remove('pointe')}if(a==null){a=-2.36;G.style.transform='translate('+px+'px,'+py+'px) rotate('+a+'rad)';G.classList.add('pointe')}
  var h=O.classList.contains('hov')?14:10;O.style.marginLeft=(-h-Math.cos(a)*24).toFixed(1)+'px';O.style.marginTop=(-h-Math.sin(a)*24).toFixed(1)+'px'}
 else{G.classList.remove('pointe');O.style.marginLeft='';O.style.marginTop=''}
 requestAnimationFrame(boucle)})();
})();
