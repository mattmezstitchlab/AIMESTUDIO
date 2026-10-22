/* AIME · la composition d'une face du cube-personne : une page du moteur Métamorphose (vitrine/rendu.js, AIMESite).
   Pas de second système : une face est un document « aime-site » (comme le mini-site d'un projet), rangé avec les autres
   sites (« aime-sites ») et modifiable aussi dans le générateur de sites. Ici, seulement :
     siteId(moi, facette)                  l'adresse stable de la face de CETTE personne
     depuis(cube, facette, {S, ancien})    crée la page de la face, ou rafraîchit les mots d'une page existante sans toucher
                                           à sa disposition ; l'ambiance suit le style de la face
     deplacer(site, sectionId, ±1)         un bloc avant / après, la grille se range
     elargir(site, sectionId)              pleine largeur ↔ moitié
     couleursDe(ambiance)                  les trois couleurs d'une ambiance, pour la 3D (clair, couleur, encre)
   Le timbre et l'orbe ne sont pas écrits dans la page : AIMESite.document(site, {personne, orbe}) les lit au rendu.
   Pur, testé sous node. */
(function(racine,f){var M=f();if(typeof module==='object'&&module.exports)module.exports=M;else racine.AIMECubeCompo=M})(typeof self!=='undefined'?self:this,function(){'use strict';
var DEFAUT={identite:'editorial',medias:'f_affiche',temps:'a_ciel',relations:'h_doux',documents:'suisse',activites:'m_terra'};
function hache(s){var h=2166136261;s=String(s||'');for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function siteId(moi,id){return'cube-'+id+'-'+hache(moi&&moi.id)}
function mots(C,cube,id){var d=C.facette(id),f=cube.facettes[id];return d.champs.map(function(c){return f.champs[c.k]}).filter(Boolean).join(' · ')}
/* la grille se range dans l'ordre des blocs : deux moitiés par ligne, une pleine largeur seule */
function ranger(S,page){var y=0,x=0,h=0;page.sections.forEach(function(s){if(s.w>12||s.w<1)s.w=12;if(x+s.w>12){y+=h;x=0;h=0}s.x=x;s.y=y;var hs=S.hauteur(s.type,s.w);h=Math.max(h,hs);x+=s.w;if(x>=12){y+=h;x=0;h=0}});return page}
function depuis(C,cube,id,o){var S=o.S,d=C.facette(id),f=cube.facettes[id],site;if(!d)throw new Error('Facette inconnue : '+id);
 var ancien=o.ancien&&o.ancien.format==='aime-site'?(S.migrer?S.migrer(JSON.parse(JSON.stringify(o.ancien))):JSON.parse(JSON.stringify(o.ancien))):null;
 if(ancien)site=ancien;
 else{site=S.vide('vierge');site.id=siteId(o.moi,id);site.nom='Cube · '+d.nom;site.modele='cube:'+id;
  var secs=[{id:'cf-mots',type:'texte',w:12}].concat(d.blocs.filter(function(b){return b!=='texte'}).map(function(b){return{id:'cf-'+b,type:b,w:b==='timbre'?4:b==='orbe'?8:6}}));
  site.pages=[ranger(S,{id:'index',titre:d.nom,mode:'grille',sections:secs.map(function(s){return Object.assign({audience:'public'},s)})})]}
 var st=f.style;site.presentation.ambiance=st&&st.ambiance||DEFAUT[id]||'editorial';
 site.infos.titre=d.nom;site.infos.sous=d.dit;
 site.pages[0].sections.forEach(function(s){if(s.id==='cf-mots'){s.titre=d.nom;s.texte=mots(C,cube,id)||(f.etat==='vide'?'Cette face attend sa carte postale.':'')}});
 site.majLe=new Date().toISOString();return site}
function trouver(site,sid){var p=site.pages[0],i=-1;p.sections.forEach(function(s,k){if(s.id===sid)i=k});return{p:p,i:i}}
function deplacer(S,site,sid,sens){var t=trouver(site,sid),j=t.i+sens;if(t.i<0||j<0||j>=t.p.sections.length)return false;var L=t.p.sections,a=L[t.i];L[t.i]=L[j];L[j]=a;ranger(S,t.p);return true}
function elargir(S,site,sid){var t=trouver(site,sid);if(t.i<0)return false;var s=t.p.sections[t.i];s.w=s.w>=12?6:12;ranger(S,t.p);return true}
function couleursDe(amb){if(!amb)return null;var ok=function(x){return/^#[0-9a-fA-F]{6}$/.test(x||'')};var a=[amb.c2,amb.c1,amb.encre];return a.every(ok)?a:null}
return{DEFAUT:DEFAUT,siteId:siteId,depuis:depuis,ranger:ranger,deplacer:deplacer,elargir:elargir,couleursDe:couleursDe,mots:mots};
});
