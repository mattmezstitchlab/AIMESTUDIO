/* AIME · le dessin de la Carte : un carré arrondi (celui de la dernière forme de la métamorphose) dont la composition
   découle des informations de la personne. Une seule fonction pour tous les usages : la grande Carte, les vignettes du registre,
   la facette du cube. Thème clair : fond en dégradé coloré, blocs blancs, texte noir. Renvoie une chaîne SVG (testable sous node). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMECarteRendu=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var X={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return X[c]})};
var AIME=['#FB7185','#F59E0B','#7C5CFF','#22D3EE'];
function couper(t,n,max){var mots=String(t||'').split(/\s+/),l=[],cur='';mots.forEach(function(m){if((cur+' '+m).trim().length>n){if(cur)l.push(cur);cur=m}else cur=(cur+' '+m).trim()});if(cur)l.push(cur);if(l.length>max){l=l.slice(0,max);l[max-1]=l[max-1].replace(/.{0,2}$/,'…')}return l}
function lignes(x,y,t,n,max,taille,coul,poids,interligne){return couper(t,n,max).map(function(l,i){return'<text x="'+x+'" y="'+(y+i*(interligne||taille*1.25))+'" font-size="'+taille+'" fill="'+coul+'"'+(poids?' font-weight="'+poids+'"':'')+'>'+esc(l)+'</text>'}).join('')}
/* o.mode : 'grande' | 'mini' ; o.exemple : true si les valeurs sont de démonstration */
function svg(c,o){o=o||{};c=c||{};var id='k'+(o.id||Math.floor(Math.random()*1e6)),col=(c.couleurs&&c.couleurs.length?c.couleurs:AIME).slice(0,3);while(col.length<3)col.push(col[col.length-1]);
 var mini=o.mode==='mini',nom=c.nom||'',initiale=(nom.trim()[0]||'·').toUpperCase(),F='font-family="Inter Variable, Inter, -apple-system, sans-serif"',D='font-family="Cal Sans, Inter Variable, Inter, sans-serif"';
 var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="'+esc('Carte AIME'+(nom?' de '+nom:''))+'"><defs>'+
  '<radialGradient id="'+id+'a" cx="18%" cy="14%" r="72%"><stop offset="0" stop-color="'+col[0]+'" stop-opacity=".34"/><stop offset="1" stop-color="'+col[0]+'" stop-opacity="0"/></radialGradient>'+
  '<radialGradient id="'+id+'b" cx="88%" cy="90%" r="72%"><stop offset="0" stop-color="'+col[1]+'" stop-opacity=".30"/><stop offset="1" stop-color="'+col[1]+'" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="'+id+'o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+col[0]+'"/><stop offset=".5" stop-color="'+col[1]+'"/><stop offset="1" stop-color="'+col[2]+'"/></linearGradient>'+
  '<clipPath id="'+id+'c"><rect x="0" y="0" width="400" height="400" rx="30"/></clipPath></defs>'+
  '<g clip-path="url(#'+id+'c)"><rect width="400" height="400" fill="#F8F6FF"/><rect width="400" height="400" fill="url(#'+id+'a)"/><rect width="400" height="400" fill="url(#'+id+'b)"/></g>'+
  '<rect x="1" y="1" width="398" height="398" rx="29.5" fill="none" stroke="rgba(17,17,24,.14)" stroke-width="1.5"/>';
 if(mini){/* la facette : l'initiale, les couleurs, l'orbe ; lisible à 60 px */
  s+='<text x="200" y="250" text-anchor="middle" font-size="190" fill="#111116" '+D+'>'+esc(initiale)+'</text>';
  col.forEach(function(k,i){s+='<rect x="'+(96+i*76)+'" y="300" width="56" height="18" rx="9" fill="'+k+'"/>'});
  return s+'<circle cx="338" cy="62" r="22" fill="url(#'+id+'o)"/></svg>'}
 /* l'en-tête : le nom et l'orbe, puis la ligne de la forme « Projet » */
 s+='<line x1="0" y1="78" x2="400" y2="78" stroke="rgba(17,17,24,.10)"/><circle cx="356" cy="40" r="13" fill="url(#'+id+'o)"/>';
 var nx=28;if(c.photo){s+='<clipPath id="'+id+'p"><circle cx="50" cy="40" r="22"/></clipPath><image href="'+esc(c.photo)+'" x="28" y="18" width="44" height="44" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+'p)"/><circle cx="50" cy="40" r="22" fill="none" stroke="rgba(17,17,24,.22)"/>';nx=84}
 s+=nom?'<text x="'+nx+'" y="52" font-size="'+(nom.length>16?22:28)+'" fill="#111116" '+D+'>'+esc(nom.length>24?nom.slice(0,23)+'…':nom)+'</text>':'<text x="'+nx+'" y="50" font-size="16" fill="#454556" '+F+'>Votre nom, si vous le souhaitez</text>';
 /* les quatre blocs blancs de la composition, remplis par ce qui existe */
 var B=[[28,100,196,150],[238,100,134,70],[238,184,134,66],[28,264,344,108]];
 var bloc=function(i,titre,corps){var b=B[i],plein=!!corps;return'<rect x="'+b[0]+'" y="'+b[1]+'" width="'+b[2]+'" height="'+b[3]+'" rx="14" fill="'+(plein?'#FFFFFF':'rgba(255,255,255,.62)')+'" stroke="rgba(17,17,24,'+(plein?'.12':'.14')+')"'+(plein?'':' stroke-dasharray="5 6"')+'/>'+
  '<text x="'+(b[0]+14)+'" y="'+(b[1]+24)+'" font-size="10.5" letter-spacing="1.6" fill="#454556" '+F+'>'+esc(titre.toUpperCase())+'</text>'+(corps||'<text x="'+(b[0]+14)+'" y="'+(b[1]+48)+'" font-size="12.5" fill="#5A5A6C" '+F+'>à écrire, un jour</text>')};
 var m=(c.moments||[])[0],int=c.intention;
 s+=bloc(0,int?'Intention':'Un moment',int||m?'<g '+F+'>'+lignes(42,150,int||m.titre,22,3,17,'#111116',600,22)+(int&&m?lignes(42,226,m.titre+(m.date?' · '+m.date:''),28,1,11.5,'#383846'):'')+'</g>':'');
 s+=bloc(1,'Couleurs',c.couleurs&&c.couleurs.length?c.couleurs.slice(0,3).map(function(k,i){return'<circle cx="'+(256+i*30)+'" cy="146" r="11" fill="'+k+'" stroke="rgba(17,17,24,.18)"/>'}).join(''):'');
 var comp=(c.competences||[]).concat(c.interets||[]);
 s+=bloc(2,'Talents',comp.length?'<g '+F+'>'+lignes(252,226,comp.slice(0,2).join(' · '),17,1,12.5,'#111116',600)+(comp.length>2?'<text x="252" y="242" font-size="10.5" fill="#454556">+'+(comp.length-2)+'</text>':'')+'</g>':'');
 var reve=(c.reves||[])[0],contrib=c.contributions&&(c.contributions.proposees||[])[0];
 s+=bloc(3,reve?'Un jour':contrib?'Je propose':'Projet',reve||contrib?'<g '+F+'>'+lignes(42,314,reve||contrib,40,2,19,'#111116',600,24)+'</g>':'');
 if(o.exemple)s+='<g '+F+'><rect x="292" y="356" width="94" height="26" rx="13" fill="#111116"/><text x="339" y="373" text-anchor="middle" font-size="11" fill="#FFFFFF" letter-spacing="1.2">EXEMPLE</text></g>';
 return s+'</svg>'}
return{svg:svg,couper:couper,AIME:AIME};
});
