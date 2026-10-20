/* AIME STITCH · le patron canonique (format « aime-stitch », schéma 1).
   Un patron n'existe qu'une fois. L'aperçu, la grille, la légende, les quantités, le lecteur, la fiche boutique
   et le PDF en sont des représentations calculées ; aucune ne garde sa propre copie des données.

   {
     format:'aime-stitch', schema:1,
     id, version, statut:'brouillon'|'publie', titre, createur,
     l, h,                                   dimensions en POINTS (jamais en pixels)
     toile:{type:'aida', count:14},          toile conseillée (les dimensions physiques s'en déduisent)
     palette:[{id:'c1', dmc:'321', symbole:'s0', brins:2}],   références DMC seulement (nom et couleur viennent de la table)
     points:'RLE',                           matrice : 0 = toile non brodée, n = palette[n-1] ; « nb*valeur » séparés par des virgules
     demi:[{x,y,coin,c}], contours:[{c, pts:[[x,y]…]}],   points fractionnaires et backstitch (vectoriel, sur les intersections)
     calques:[], provenance:{source, auteur, note}, licence:{type, usage}, historique:[{version, date, note}]
   } */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.StitchPatron=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var SCHEMA=1,LICENCES=['originale','adaptation-autorisee','import-prive','domaine-public'];
function rle(a){var out=[],i=0;while(i<a.length){var v=a[i],n=1;while(i+n<a.length&&a[i+n]===v)n++;out.push(n===1?String(v):n+'*'+v);i+=n}return out.join(',')}
function derle(s,N){var a=new Uint16Array(N),i=0;if(!s)return a;s.split(',').forEach(function(t){var p=t.split('*'),n=p.length>1?+p[0]:1,v=+(p.length>1?p[1]:p[0]);for(var k=0;k<n&&i<N;k++)a[i++]=v});return a}

/* depuis un résultat de conversion */
function depuisConversion(c,o){o=o||{};var sym=0;return normaliser({format:'aime-stitch',schema:SCHEMA,id:o.id||('pat-'+Date.now().toString(36)),version:1,statut:'brouillon',titre:o.titre||'Sans titre',createur:o.createur||null,
 l:c.l,h:c.h,toile:o.toile||{type:'aida',count:14},palette:c.palette.map(function(p,i){return{id:'c'+(i+1),dmc:p.dmc,symbole:'s'+(sym++),brins:2}}),
 points:rle(c.points),demi:[],contours:[],calques:[],provenance:o.provenance||{source:'inconnue'},licence:o.licence||{type:'originale',usage:'prive'},
 conversion:{mode:c.mode,reglages:c.reglages,rapport:c.rapport},historique:[{version:1,date:o.date||null,note:'Conversion '+c.mode}]})}

/* en mémoire : la matrice décodée, non sérialisée */
function normaliser(p){Object.defineProperty(p,'_m',{value:derle(p.points,p.l*p.h),writable:true,enumerable:false});return p}
function matrice(p){if(!p._m)normaliser(p);return p._m}
function fixer(p){p.points=rle(matrice(p));return p}
function charger(json){var p=typeof json==='string'?JSON.parse(json):JSON.parse(JSON.stringify(json));p=migrer(p);return normaliser(p)}
function serialiser(p){fixer(p);return JSON.stringify(p)}
/* migrations : chaque schéma antérieur est porté au schéma courant, jamais modifié en place */
function migrer(p){if(!p.schema)p.schema=0;if(p.schema===0){p.demi=p.demi||[];p.contours=p.contours||[];p.calques=p.calques||[];p.schema=1}return p}

/* validation : ce qu'un patron doit respecter pour être publié ou exporté */
function valider(p,dmc){var e=[],index={};(dmc||[]).forEach(function(d){index[d.code]=1});
 if(p.format!=='aime-stitch')e.push('format inconnu');if(p.schema!==SCHEMA)e.push('schéma '+p.schema+' non migré');
 if(!(p.l>0&&p.h>0&&p.l<=1000&&p.h<=1000))e.push('dimensions invalides');
 var m=matrice(p);if(m.length!==p.l*p.h)e.push('matrice de taille incorrecte');
 var vus={},syms={};p.palette.forEach(function(c,i){if(dmc&&!index[c.dmc])e.push('référence DMC inconnue : '+c.dmc);if(vus[c.dmc])e.push('référence en double : '+c.dmc);vus[c.dmc]=1;if(syms[c.symbole])e.push('symbole en double : '+c.symbole);syms[c.symbole]=1});
 for(var i=0;i<m.length;i++)if(m[i]>p.palette.length){e.push('point '+i+' : couleur hors palette');break}
 if(p.licence&&LICENCES.indexOf(p.licence.type)<0)e.push('licence inconnue');
 return e}

/* ce qui se calcule, jamais ne se stocke */
function quantites(p){var m=matrice(p),q=new Array(p.palette.length+1).fill(0);for(var i=0;i<m.length;i++)q[m[i]]++;return p.palette.map(function(c,i){return{id:c.id,dmc:c.dmc,symbole:c.symbole,points:q[i+1]}})}
function surface(p){var m=matrice(p),x0=p.l,y0=p.h,x1=-1,y1=-1;for(var i=0;i<m.length;i++)if(m[i]){var x=i%p.l,y=(i/p.l)|0;if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}return x1<0?{l:0,h:0}:{l:x1-x0+1,h:y1-y0+1,x:x0,y:y0}}
/* dimensions physiques du motif brodé, selon la toile (count = points par pouce) */
function dimensions(p,count){var s=surface(p),c=count||p.toile.count;return{points:s,cm:{l:+(s.l/c*2.54).toFixed(1),h:+(s.h/c*2.54).toFixed(1)}}}
/* fournitures : hypothèse affichée (≈ 1 800 points complets par écheveau de 8 m en 14 ct, 2 brins), proportionnelle à la toile */
var POINTS_PAR_ECHEVEAU_14=1800;
function fournitures(p,count){var c=count||p.toile.count,par=Math.round(POINTS_PAR_ECHEVEAU_14*c/14);return quantites(p).map(function(q){return Object.assign(q,{echeveaux:Math.max(1,Math.ceil(q.points/par))})})}

/* publier : une version figée, indépendante du brouillon qui continue d'évoluer */
function publier(p,note,date){fixer(p);var v=JSON.parse(JSON.stringify(p));v.statut='publie';v.historique=(v.historique||[]).concat([{version:v.version,date:date||null,note:note||'Publication'}]);
 p.version=v.version+1;p.statut='brouillon';return normaliser(v)}
/* empreinte du contenu (hors historique) : deux exports d'une même version ont la même empreinte */
function empreinte(p){fixer(p);var c=JSON.parse(JSON.stringify(p));c.historique=[];var s=JSON.stringify(c),h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16)}

return{SCHEMA:SCHEMA,rle:rle,derle:derle,depuisConversion:depuisConversion,charger:charger,serialiser:serialiser,matrice:matrice,fixer:fixer,valider:valider,
 quantites:quantites,surface:surface,dimensions:dimensions,fournitures:fournitures,publier:publier,empreinte:empreinte,POINTS_PAR_ECHEVEAU_14:POINTS_PAR_ECHEVEAU_14};
});
