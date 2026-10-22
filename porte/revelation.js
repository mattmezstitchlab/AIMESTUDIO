/* AIME · la révélation (phase B), branchée sur la porte : la scène remonte, le Monde AIME apparaît dessous.
   Elle ne bloque jamais : la porte part d'elle-même au bout de 2,6 s, et en mouvement réduit tout est immédiat. */
(function(){'use strict';var P=window.AIMEPorte;if(!P)return;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
P.revelation=function(cible,bouton){return new Promise(function(ok){var h=document.documentElement;
 var s=document.createElement('div');s.className='rv-scene';s.setAttribute('aria-hidden','true');s.innerHTML='<p class="rv-titre">Le monde<em>AIME</em></p>';h.appendChild(s);
 h.style.setProperty('--rv-y',(window.scrollY||0)+'px');h.classList.add('rv-depart');if(RM){h.classList.add('rv-leve');return setTimeout(ok,120)}
 requestAnimationFrame(function(){requestAnimationFrame(function(){h.classList.add('rv-leve')})});setTimeout(ok,1150)})};
/* retour arrière (cache de page) : on remet la scène en place */
addEventListener('pageshow',function(e){if(!e.persisted)return;var h=document.documentElement;h.classList.remove('rv-depart','rv-leve');var s=document.querySelector('.rv-scene');if(s)s.remove()});
})();
