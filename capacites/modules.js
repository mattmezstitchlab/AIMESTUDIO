/* AIME · Atlas des capacités : les modules d'AIME, lus dans le registre (modules/registre.js), le même que lisent le serveur et le Dock.
   Aucune liste ici : si un module change de statut dans le registre, l'Atlas, les pages servies et le Dock changent ensemble.
   « Ouvrir dans mon projet » mène à la même destination que l'entrée du Dock (AIMEModules.destination). */
(function(){'use strict';
var R=window.AIMEModules,z=document.getElementById('modules-aime');if(!R||!z)return;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
var NOMS_P={liste:'liste',grille:'grille',chronologie:'chronologie',calendrier:'calendrier',document:'document',carte:'carte',editeur:'éditeur',comparaison:'comparaison'};
R.MODULES.forEach(function(m){var li=el('li','mod-aime s-'+m.statut);li.id='module-'+m.id;
 var h=el('div','mod-tete');h.appendChild(el('h3',null,m.nom));var st=el('span','statut',R.STATUTS[m.statut].nom);st.title=R.STATUTS[m.statut].dit;h.appendChild(st);li.appendChild(h);
 li.appendChild(el('p',null,m.fonction));
 var dl=el('dl','mod-dl');
 function ligne(k,v){if(!v)return;dl.appendChild(el('dt',null,k));dl.appendChild(el('dd',null,v))}
 ligne('Actions',Object.keys(m.actions).map(function(k){var a=m.actions[k];return a.nom+' ('+a.regle.join('.')+')'}).join(' · '));
 ligne('Présentations',m.presentations.length?m.presentations.map(function(p){return NOMS_P[p]}).join(', ')+(m.prevues.length?' ; prévues : '+m.prevues.map(function(p){return NOMS_P[p]}).join(', '):''):'aucune encore'+(m.prevues.length?' ; prévues : '+m.prevues.map(function(p){return NOMS_P[p]}).join(', '):''));
 ligne('Accès',m.acces);
 ligne('Journal',m.journal.length?m.journal.join(', '):'—');
 ligne('Preuves',m.preuves.join(', '));
 li.appendChild(dl);
 var d=R.destination(m.id);
 if(d){var a=el('a','b b-p','Ouvrir dans mon projet');a.href=d;a.setAttribute('aria-label','Ouvrir « '+m.nom+' » dans mon projet');li.appendChild(a)}
 else li.appendChild(el('p','meta','Pas encore ouvrable dans un projet : '+R.STATUTS[m.statut].dit));
 z.appendChild(li)});
})();
