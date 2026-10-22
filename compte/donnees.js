/* AIME · où sont mes données (V1, bêta). Une phrase claire, visible, et le chemin vers la sauvegarde.
   Remplit chaque élément [data-donnees] de la page. Ne lit ni n'envoie rien. */
(function(){'use strict';
var TXT='Vos projets, votre cube et votre bibliothèque restent dans ce navigateur : ils ne sont pas encore sauvegardés sur votre compte. Effacer les données du site les efface.';
function poser(){var L=document.querySelectorAll('[data-donnees]');for(var i=0;i<L.length;i++){var el=L[i];if(el.getAttribute('data-pose'))continue;el.setAttribute('data-pose','1');el.setAttribute('role','note');el.classList.add('aime-donnees');
 el.innerHTML='<span class="ad-b">Bêta</span> <span class="ad-t"></span> <a class="ad-l" href="/bureau/espace/">Sauvegarder dans un fichier</a>';el.querySelector('.ad-t').textContent=TXT}}
var st=document.createElement('style');st.textContent='.aime-donnees{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;max-width:72ch;margin:10px auto 0;padding:8px 12px;border:1px solid rgba(167,139,250,.35);border-radius:12px;background:rgba(124,92,255,.08);color:#C9C9D3;font:13px/1.45 "Inter Variable",Inter,system-ui,sans-serif;text-align:left}.aime-donnees .ad-b{font:600 10.5px/1.6 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#C4B5FD}.aime-donnees .ad-l{color:#C4B5FD;font-weight:600;text-underline-offset:3px}.aime-donnees .ad-l:focus-visible{outline:2px solid #22D3EE;outline-offset:2px;border-radius:4px}';
document.head.appendChild(st);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',poser);else poser();
})();
