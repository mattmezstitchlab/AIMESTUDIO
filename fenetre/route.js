/* Routes de présentation uniquement. Aucun rôle, compte ou projet n'est stocké ici. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEFenetreRoute=factory()})(typeof self!=='undefined'?self:this,function(){
const PANELS=['accueil','activite','identite','studio','recit','univers','reseau','supports'];
function target(raw,origin){if(!raw)return null;try{const u=new URL(raw,origin);if(u.origin!==origin||!(u.pathname==='/'||/^\/(compte|projets|canevas|studio|publication|c)\/(?:index\.html)?$/.test(u.pathname)))return null;return u.pathname+u.search+u.hash}catch{return null}}
function state(search,origin){const q=new URLSearchParams(search),panel=PANELS.includes(q.get('panneau'))?q.get('panneau'):'accueil';return{panel,target:target(q.get('cible')||'',origin)}}
function historical(path,search,hash){const q=new URLSearchParams(search);q.delete('fenetre-interne');q.delete('historique');const activity=/^\/projets\/?$/.test(path)||['invitation','espace','nouvel','creer','activite','demande'].some(k=>q.has(k));const original=(activity?'/projets/':'/compte/')+(q.size?'?'+q:'')+(hash||'');return '/fenetre/?'+new URLSearchParams({panneau:activity?'activite':'identite',cible:original})}
return{PANELS,target,state,historical};
});
