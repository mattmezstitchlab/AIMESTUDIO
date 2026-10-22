/* AIME · Ma Régie personnelle : le cube-personne comme accès à son espace (Bureau, dock).
   On le fait tourner, on choisit une face, on ouvre ce qui y est autorisé : les champs de la carte, la carte elle-même
   (pour l'écrire ou la corriger, dans Le Monde AIME), les blocs prévus pour la composition, et pour la face Activités les
   projets de ce navigateur (mini-site, Canevas). La face Identité montre le timbre et l'orbe : ses préférences, et ses
   droits, qui restent vides.
   Le modèle est AIMECube, le stockage AIMECubeStock, la vue AIMECubeVue : rien n'est recopié ici.
   La Régie maîtresse (/regie/) n'est pas touchée. */
(function(){'use strict';
var C=window.AIMECube,S=window.AIMECubeStock,V=window.AIMECubeVue;if(!C||!S||!V)return;
var $=function(i){return document.getElementById(i)},moi=null,cube=null,vue=null;
var ETAT={vide:'À venir',ecrite:'Écrite, pas encore timbrée',timbree:'Timbrée, pas encore posée',posee:'Posée'};
var ORBE_L={apparence:'Apparence',couleurs:'Couleurs',presence:'Présence',animation:'Animation',autonomie:'Autonomie',interaction:'Interaction',explications:'Explications'};
var dansOS=window.top!==window.self;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function lien(txt,href,cls){var a=el('a',cls||'rp-b',txt);a.href=href;if(dansOS&&/^\/aime\//.test(href))a.target='_top';return a}

/* les projets de ce navigateur (Point Zéro, IndexedDB « aime-point-zero ») : seulement les titres, rien n'est copié */
function projets(){return new Promise(function(ok){if(!window.indexedDB)return ok([]);var r;try{r=indexedDB.open('aime-point-zero',2)}catch(e){return ok([])}
 r.onupgradeneeded=function(){var db=r.result;if(!db.objectStoreNames.contains('fichiers'))db.createObjectStore('fichiers',{keyPath:'id'});if(!db.objectStoreNames.contains('projets'))db.createObjectStore('projets',{keyPath:'id'})};
 r.onerror=function(){ok([])};r.onsuccess=function(){try{var t=r.result.transaction('projets','readonly'),g=t.objectStore('projets').getAll();g.onsuccess=function(){ok((g.result||[]).sort(function(a,b){return(b.maj||0)-(a.maj||0)}).slice(0,8))};g.onerror=function(){ok([])}}catch(e){ok([])}}})}

function panneau(id){var d=C.facette(id),f=cube.facettes[id],P=$('rp-pan');P.textContent='';
 var h=el('div','rp-ph');h.appendChild(el('p','rp-k',ETAT[f.etat]+(f.etat==='posee'&&C.completude(cube,id)<1?' · partielle':'')));var t=el('h2',null,d.nom);t.id='rp-pt';h.appendChild(t);P.appendChild(h);
 P.appendChild(el('p','rp-vis',f.visibilite==='publie'?'Publiée : visible des membres du Réseau.':'Privée : visible de vous seul. Apparaître dans le cube ne publie rien.'));
 var dl=el('dl','rp-ch');d.champs.forEach(function(c){dl.appendChild(el('dt',null,c.l));dl.appendChild(el('dd',f.champs[c.k]?null:'rp-vide',f.champs[c.k]||'pas encore écrit'))});P.appendChild(dl);
 var act=el('div','rp-act');act.appendChild(lien(f.etat==='vide'?'Écrire la carte':'Corriger la carte','/aime/?carte='+id,'rp-b p'));
 act.appendChild(lien('Composer cette face dans le Canevas','/canevas/?cube='+encodeURIComponent(id)+'&de=/cube/'));P.appendChild(act);
 var bl=el('div','rp-blocs');bl.appendChild(el('p','rp-k','Blocs prévus pour cette face'));var ul=el('ul');d.blocs.forEach(function(b){ul.appendChild(el('li',null,b))});bl.appendChild(ul);P.appendChild(bl);
 if(id==='identite'){var z=el('div','rp-id');if(window.AIMETimbre){var tb=AIMETimbre.creer({id:moi.id,nom:moi.name||'Vous',image:moi.image,mini:false,legende:false});tb.tabIndex=-1;tb.setAttribute('aria-label','Mon timbre');z.appendChild(tb)}
  var o=el('div','rp-orbe');o.appendChild(el('p','rp-k','Mon orbe · préférences'));var od=el('dl','rp-ch');Object.keys(ORBE_L).forEach(function(k){od.appendChild(el('dt',null,ORBE_L[k]));od.appendChild(el('dd',null,cube.orbe[k]))});o.appendChild(od);
  o.appendChild(el('p','rp-vis','Droits de l\'orbe : '+(cube.droitsOrbe.length?cube.droitsOrbe.join(', '):'aucun')+'. Une orbe plus autonome n\'obtient aucun droit de plus.'));z.appendChild(o);P.appendChild(z)}
 if(id==='activites'){var pj=el('div','rp-pj');pj.appendChild(el('p','rp-k','Mes projets (ce navigateur)'));P.appendChild(pj);
  projets().then(function(L){if(!L.length){pj.appendChild(el('p','rp-vide','Aucun projet pour l\'instant : il en naîtra un au Point Zéro.'));pj.appendChild(lien('Ouvrir le Point Zéro','/point-zero/'));return}
   var u=el('ul');L.forEach(function(p){var li=el('li');li.appendChild(el('b',null,p.titre||'Projet'));var a=lien('Mini-site','/projet/?id='+encodeURIComponent(p.id)+'&de=/bureau/','rp-l2');var c=lien('Canevas','/canevas/?projet='+encodeURIComponent(p.id)+'&de=/bureau/','rp-l2');li.appendChild(a);li.appendChild(c);u.appendChild(li)});pj.appendChild(u)})}}

function afficher(){var p=C.progression(cube);$('rp-l').textContent=p.posees+' face'+(p.posees>1?'s':'')+' posée'+(p.posees>1?'s':'')+' sur '+p.total+(p.posees<p.total?' · les autres peuvent attendre':' · votre cube est entier');
 var q=$('rp-qui');q.textContent='';if(window.AIMETimbre){var t=AIMETimbre.creer({id:moi.id,nom:moi.name||'Vous',image:moi.image,mini:true});q.appendChild(t)}q.appendChild(el('span',null,moi.name||'Vous'));if(moi.demo)q.appendChild(el('span','rp-demo','Démonstration'));
 $('rp-limite').textContent=S.LIMITE+(moi.demo?' Démonstration : effacée à la fermeture de l\'onglet.':'');
 if(!vue)vue=V.monter($('rp-cube'),{cube:cube,moi:moi,interactif:true,surFace:panneau});else vue.maj(cube);V.memo(cube,moi);
 var premier=C.IDS.filter(function(id){return cube.facettes[id].etat==='posee'})[0]||'identite';vue.montrer(premier);panneau(premier)}
function vide(){$('rp-l').textContent='Votre cube se fabrique dans Le Monde AIME, carte après carte, une fois votre timbre créé.';$('rp-aide').hidden=true;
 var P=$('rp-pan');P.textContent='';P.appendChild(el('p','rp-k','Pas encore de cube'));P.appendChild(lien('Créer mon timbre','/point-zero/?intention=identite','rp-b p'));P.appendChild(lien('Découvrir Le Monde AIME','/aime/','rp-b'));
 V.monter($('rp-cube'),{cube:C.vide('personne'),interactif:false})}
if(!dansOS){$('rp-retour').textContent='';$('rp-retour').appendChild(document.createTextNode('← Bureau'))}else $('rp-retour').hidden=true;
S.qui().then(function(u){moi=u||S.demo();if(!moi)return vide();cube=S.charger(moi);afficher()}).catch(function(){moi=S.demo();if(!moi)return vide();cube=S.charger(moi);afficher()});
/* une carte posée dans un autre onglet (Le Monde AIME) : le cube suit */
addEventListener('storage',function(e){if(moi&&e.key==='aime-cube:'+moi.id){cube=S.charger(moi);afficher()}});
window.AIMERegiePerso={cube:function(){return cube},vue:function(){return vue}};
})();
