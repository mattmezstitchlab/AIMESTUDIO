/* AIME · Cube Maître (/maitre/) : l'app. Le site AIME en six facettes, sur ses données réelles, en lecture seule.
   Le modèle est AIMEMaitre (maitre/modele.js), les sources AIMEMaitreSources (maitre/sources.js), la vue la même que
   celle du cube-personne (AIMECubeVue, avec {modele}) : rien n'est recopié ici, rien n'est écrit.
   Vue visiteur : cinq facettes, la sixième (Comptes) reste réservée. Vue propriétaire (droit du serveur) : les six, et des
   liens vers la Régie maîtresse au bon onglet. La Régie n'est ni chargée ni modifiée. */
(function(){'use strict';
var M=window.AIMEMaitre,V=window.AIMECubeVue,Src=window.AIMEMaitreSources;
var $=function(i){return document.getElementById(i)},cube=null,vue=null;
var dansOS=window.top!==window.self;
var LIB={lecture:'Lecture',regie:'Régie · propriétaire'};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function lien(txt,href,cls){var a=el('a',cls||'rp-b',txt);a.href=href;return a}

function panneau(id){var d=M.facette(id),f=cube.facettes[id],P=$('mc-pan');if(!d||!f)return;P.textContent='';
 var h=el('div','rp-ph');h.appendChild(el('p','rp-k',d.reserve?'Propriétaire seulement':'Lu par tous'));var t=el('h2',null,d.nom);t.id='mc-pt';h.appendChild(t);P.appendChild(h);
 if(f.etat!=='posee'){P.appendChild(el('p','rp-vis',M.raison(cube,id)));}
 else{P.appendChild(el('p','rp-vis',d.dit));var g=el('div','mc-ch');f.chiffres.forEach(function(x){var k=el('div','mc-c');k.appendChild(el('b',null,x[0]));k.appendChild(el('span',null,x[1]));g.appendChild(k)});P.appendChild(g)}
 if(f.sources.length){var s=el('div','mc-src');s.appendChild(el('p','rp-k','Sources réelles'));var ul=el('ul');f.sources.forEach(function(x){var li=el('li');li.appendChild(el('code',null,x[0]));li.appendChild(el('span',null,' · '+x[1]));ul.appendChild(li)});s.appendChild(ul);P.appendChild(s)}
 var act=el('div','mc-act');f.actions.forEach(function(a){var n=lien('',a.href,'mc-a');n.appendChild(el('span','mc-p mc-p-'+a.type,LIB[a.type]||a.type));var tx=el('span','mc-at');tx.appendChild(el('b',null,a.nom));tx.appendChild(el('small',null,a.dit));n.appendChild(tx);act.appendChild(n)});
 act.appendChild(lien('Ouvrir dans le Canevas','/canevas/?maitre='+encodeURIComponent(id)+'&de=/maitre/','rp-b p'));P.appendChild(act)}

function qui(){var q=$('mc-qui');q.textContent='';q.appendChild(el('span',cube.proprietaire?'mc-role pro':'mc-role','Vue '+(cube.proprietaire?'propriétaire':'visiteur')))}
function afficher(){var n=M.IDS.filter(function(id){return cube.facettes[id].etat==='posee'}).length;
 $('mc-l').textContent=n+' facette'+(n>1?'s':'')+' sur 6, sur les données réelles du site'+(cube.proprietaire?'.':' · la sixième est réservée au propriétaire.');qui();
 if(!vue)vue=V.monter($('mc-cube'),{cube:cube,modele:M,interactif:true,surFace:panneau});else vue.maj(cube);
 var demande=(location.hash||'').slice(1),premier=M.facette(demande)?demande:'pages';vue.montrer(premier);panneau(premier)}
if(dansOS)$('mc-retour').hidden=true;else{$('mc-retour').textContent='';$('mc-retour').appendChild(document.createTextNode('← Bureau'))}
if(!M||!V||!Src){$('mc-l').textContent='Le Cube Maître n\'a pas pu se charger.';return}
Src.charger().then(function(c){cube=c;afficher()}).catch(function(e){$('mc-l').textContent=(e&&e.message)||'Les données du site sont indisponibles pour le moment.';$('mc-aide').hidden=true});
window.AIMECubeMaitre={cube:function(){return cube},vue:function(){return vue}};
})();
