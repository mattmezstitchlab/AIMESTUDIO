/* AIME · page projet : l'appareil (ou le visuel) de la réalisation, monté par la scène de la Régie. */
(function(){'use strict';var box=document.getElementById('oeuvre');if(!box)return;var id=box.getAttribute('data-id');
 function monter(){var S=window.AIMERegieScene;if(!S||!S.realisation)return setTimeout(monter,60);S.realisation(id,function(el){if(!el)return;box.textContent='';el.setAttribute('aria-hidden','true');box.appendChild(el)})}
 monter()})();
