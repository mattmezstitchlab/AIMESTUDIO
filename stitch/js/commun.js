/* AIME STITCH · ce que les pages partagent : chargement des données, boîte à fils de la brodeuse, acquisitions simulées.
   Rien ici ne recopie le patron : tout ce qui est technique se calcule depuis le patron canonique. */
(function(){"use strict";
var P=window.StitchPatron,C=window.StitchCouleur,M=window.StitchMesures;
function j(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.json()})}
function lire(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}
var cache={},dmcIndex=null,dmcLab={};
var S=window.Stitch={
 donnees:function(){if(cache.d)return cache.d;cache.d=Promise.all([j('/stitch/data/dmc.json'),j('/stitch/data/catalogue.json'),j('/stitch/data/boite-demo.json')]).then(function(r){
  dmcIndex={};r[0].fils.forEach(function(d){dmcIndex[d.code]=d;var c=C.hex(d.hex);dmcLab[d.code]=C.lab(c[0],c[1],c[2])});if(window.StitchRendu)StitchRendu.tableDMC(r[0].fils);
  return{dmc:r[0],catalogue:r[1],boiteDemo:r[2].fils}});return cache.d},
 patron:function(id){if(!/^pat-[a-z0-9-]+$/.test(id||''))return Promise.reject(new Error('patron inconnu'));if(!cache[id])cache[id]=j('/stitch/data/patrons/'+id+'.json');return cache[id].then(function(x){return P.charger(x)})},
 fil:function(code){return dmcIndex&&dmcIndex[code]},
 /* la boîte à fils appartient à la brodeuse ; la démonstration part d'une boîte fictive */
 mesFils:function(v){if(v)return ecrire('stitch-mes-fils',v);return lire('stitch-mes-fils',null)},
 /* ce que la brodeuse possède, ce qui manque, et l'alternative la plus proche qu'elle possède (écart CIEDE2000) */
 disponibilite:function(p,mes){var set={};mes.forEach(function(c){set[c]=1});var res={possedes:[],manquants:[]};
  p.palette.forEach(function(c){if(set[c.dmc]){res.possedes.push(c.dmc);return}var b=null,bd=Infinity;mes.forEach(function(m){if(!dmcLab[m]||!dmcLab[c.dmc])return;var d=C.de2000(dmcLab[c.dmc],dmcLab[m]);if(d<bd){bd=d;b=m}});res.manquants.push({dmc:c.dmc,alternative:b,ecart:+bd.toFixed(1)})});return res},
 /* acquisitions SIMULÉES : aucune transaction, aucune donnée de paiement */
 acquis:function(prod){var a=lire('stitch-acquisitions',[]);return prod?a.indexOf(prod)>=0:a},
 acquerir:function(prod){var a=lire('stitch-acquisitions',[]);if(a.indexOf(prod)<0)a.push(prod);ecrire('stitch-acquisitions',a)},
 /* fiche technique calculée depuis le patron */
 fiche:function(p,count){var d=P.dimensions(p,count),m=M.mesurer(p);return{dimensions:d,mesures:m,fournitures:P.fournitures(p,count)}},
 TOILES:[['aida-11','Aida 11',11],['aida-14','Aida 14',14],['aida-16','Aida 16',16],['aida-18','Aida 18',18],['lin-28','Lin 28 (sur 2 fils)',14],['lin-32','Lin 32 (sur 2 fils)',16]],
 prix:function(p){return p.prix?(p.prix.toFixed(2).replace('.',',')+' €'):'Offert'},
 toast:function(t,ms){var e=document.getElementById('toast');if(!e)return;e.textContent=t;e.classList.add('on');clearTimeout(S._t);S._t=setTimeout(function(){e.classList.remove('on')},ms||2600)},
 esc:function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})},
 lire:lire,ecrire:ecrire
};
})();
