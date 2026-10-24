/* AIME · la création d'un projet : UNE seule fonction, appelée depuis Mes projets (« Nouveau projet »), depuis le + du Dock
   et depuis l'accueil (« Créer notre mariage », après le lien de connexion). Elle appelle creer() au serveur (api/_auth/espaces.mjs), sans doublon :
   une même origine, pour le même propriétaire, rend le projet déjà créé. Rien d'autre ne part au serveur, hormis l'activité d'un prestataire (plus bas).
   AIMECreer.creer({ titre, modele, origine }) → Promise { id, titre, modele, role, existant }
   AIMECreer.origine(cle)                       → un identifiant stable pour ce brouillon (cette page, cet onglet), jusqu'au succès
   AIMECreer.oublier(cle)                       → après un succès, le prochain brouillon aura une nouvelle origine
   AIMECreer.activite(metier)                   → l'activité d'un prestataire (accueil, « Je suis… ») : aucun projet, aucun droit */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMECreer=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var MODELES=['mariage','seminaire'];
function hasard(){var a=new Uint8Array(12);(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(a):a.forEach(function(_,i){a[i]=Math.random()*256|0}));return Array.prototype.map.call(a,function(x){return('0'+x.toString(16)).slice(-2)}).join('')}
function origine(cle){var k='aime-origine-'+String(cle||'nouveau');try{var v=sessionStorage.getItem(k);if(v&&/^[A-Za-z0-9_-]{6,80}$/.test(v))return v;v='np-'+hasard();sessionStorage.setItem(k,v);return v}catch(_){return'np-'+hasard()}}
function oublier(cle){try{sessionStorage.removeItem('aime-origine-'+String(cle||'nouveau'))}catch(_){}}
function corps(o){o=o||{};var b={action:'creer',titre:String(o.titre||'').trim().slice(0,120)};if(MODELES.indexOf(o.modele)>=0)b.modele=o.modele;if(o.origine)b.origine=String(o.origine);return b}
function creer(o){var b=corps(o);if(!b.titre)return Promise.reject(new Error('Donnez un nom à votre projet.'));
 return fetch('/api/espaces',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
  .then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(r.status!==200||!j.ok)throw new Error(j.raison||('Erreur '+r.status));return j})})}
/* l'activité d'un prestataire (« Je suis fleuriste ») : un métier, non publié ; aucun projet, aucun droit (api/_auth/activites.mjs) */
function activite(metier){return fetch('/api/espaces',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'activite',metier:String(metier||'')})})
  .then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(r.status!==200||!j.ok)throw new Error(j.raison||('Erreur '+r.status));return j})})}
return{creer:creer,activite:activite,origine:origine,oublier:oublier,corps:corps,MODELES:MODELES};
});
