/* AIME OS sur la Page Zéro : pose la coque (dock, fenêtres, recherche, toutes les apps, orbe système) par-dessus la page.
   Le balisage est fixe (aucune donnée extérieure) ; os/os.js s'en sert ensuite en mode « page ». */
(function(){'use strict';if(document.querySelector('.os-coque'))return;
/* dans un cadre (fenêtre de l'OS, édition de la Régie, écran d'un appareil) : pas d'OS dans l'OS ;
   en Mode Site par défaut (consolidation), la coque ne recouvre la page que si ?coque=1 est demandé */
if(window.parent!==window||!/[?&]coque=1\b/.test(location.search))return;document.body.classList.add('os-page');
var c=document.createElement('div');c.className='os-coque';
c.innerHTML=
 '<div class="fenetres" id="fenetres"></div>'+
 '<nav class="os-dock" id="dock" aria-label="AIME OS">'+
  '<button class="os-dock-orbe" type="button" id="orbeBtn" aria-haspopup="dialog" aria-expanded="false" aria-controls="orbePan" aria-label="L\'orbe : suggestions"><span class="mini-orbe"></span></button>'+
  '<button class="os-dock-accueil" type="button" id="accueilBtn" aria-label="Page Zéro : réduire les fenêtres et revenir en haut" title="Page Zéro">0</button>'+
  '<span class="os-dock-sep" aria-hidden="true"></span><div class="os-dock-apps" id="dockApps"></div><span class="os-dock-sep" aria-hidden="true"></span>'+
  '<button class="os-dock-app" type="button" id="chercheBtn" aria-label="Rechercher (Ctrl K)" title="Rechercher (Ctrl K)"><span class="ico" style="--t:#3A3A42"><svg viewBox="0 0 20 20" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/></svg></span></button>'+
  '<button class="os-dock-app toutes" type="button" id="toutBtn" aria-haspopup="dialog" aria-label="Toutes les apps"><span class="ico"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="5" r="1.6"/><circle cx="10" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="5" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15" cy="10" r="1.6"/><circle cx="5" cy="15" r="1.6"/><circle cx="10" cy="15" r="1.6"/><circle cx="15" cy="15" r="1.6"/></svg></span></button>'+
 '</nav>'+
 '<div class="voile" id="voile" hidden></div>'+
 '<div class="palette" id="palette" role="dialog" aria-modal="true" aria-label="Rechercher dans AIME OS" hidden><div class="palette-q"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/></svg><input id="paletteQ" role="combobox" aria-expanded="true" aria-controls="paletteL" aria-autocomplete="list" placeholder="Une app, un projet, une action…" autocomplete="off" spellcheck="false"></div><ul class="palette-l" id="paletteL" role="listbox" aria-label="Résultats"></ul><p class="palette-aide"><kbd>↑</kbd><kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ouvrir · <kbd>Échap</kbd> fermer</p></div>'+
 '<div class="tout" id="tout" role="dialog" aria-modal="true" aria-labelledby="t-tout" hidden><div class="tout-t"><h2 id="t-tout">Toutes les apps</h2><button class="b-fermer" type="button" data-fermer aria-label="Fermer">×</button></div><div class="tout-g" id="toutG"></div></div>'+
 '<div class="orbe-bulle" id="orbeBulle" role="status" hidden><span id="orbeBulleT"></span><button type="button" id="orbeBulleVoir">Voir</button><button type="button" id="orbeBulleNon">Plus tard</button></div>'+
 '<div class="orbe-pan" id="orbePan" role="dialog" aria-labelledby="t-orbe" hidden><div><p class="k" id="t-orbe">L\'orbe</p><p class="orbe-dit" id="orbeDit"></p><nav class="orbe-sugg" id="orbeSugg" aria-label="Suggestions"></nav><label class="orbe-pref"><span>L\'orbe me propose</span><select id="orbePref"><option value="">comme réglé pour chaque site</option><option value="discrete">seulement quand je l\'appelle</option><option value="attentive">quelque chose aux pauses</option><option value="active">ses suggestions aux pauses</option></select></label></div></div>'+
 '<p class="sr" id="annonce" role="status" aria-live="polite"></p>';
document.body.appendChild(c);
var l=document.createElement('link');l.rel='stylesheet';l.href='/os/coque.css';document.head.appendChild(l);
})();
