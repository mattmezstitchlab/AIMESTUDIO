/* AIME · où vit le cube-personne, en un seul endroit (le Monde AIME, le Bureau, le dock, le Canevas passent tous par ici).
   qui()      → Promise de la personne : le compte Better Auth avec un timbre confirmé (/api/identite), sinon null.
   charger(moi) / garder(moi, cube) : le cube de CETTE personne, et de personne d'autre.
   Aujourd'hui : localStorage « aime-cube:<id du compte> » (sessionStorage pour la démonstration, effacée à la fermeture).
   Demain : le lot de persistance (serveur, permissions des espaces) remplacera ces deux fonctions, sans toucher aux vues. */
(function(racine){'use strict';var C=racine.AIMECube;if(!C||racine.AIMECubeStock)return;
var DEMO={id:'demo-camille',name:'Camille',image:null,demo:true};
function lire(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
function qui(){return Promise.all([lire('/api/auth/get-session'),lire('/api/identite')]).then(function(r){var u=r[0]&&r[0].user,i=r[1]||{};return u&&i.timbre?{id:u.id,name:u.name,image:u.image,demo:false}:null})}
function cle(moi){return'aime-cube:'+moi.id}
function stock(moi){try{return moi.demo?racine.sessionStorage:racine.localStorage}catch(e){return null}}
function charger(moi){var s=stock(moi),t=null;try{t=s&&s.getItem(cle(moi))}catch(e){}return C.relire(t,moi.id)}
function garder(moi,cube){var s=stock(moi);try{s&&s.setItem(cle(moi),C.aGarder(cube));return true}catch(e){return false}}
/* la démonstration n'existe que si elle a été commencée dans cet onglet */
function demo(){var s=stock(DEMO),t=null;try{t=s&&s.getItem(cle(DEMO))}catch(e){}return t?DEMO:null}
racine.AIMECubeStock={DEMO:DEMO,qui:qui,charger:charger,garder:garder,demo:demo,LIMITE:'Enregistré sur cet appareil seulement, en attendant la sauvegarde serveur.'};
})(typeof self!=='undefined'?self:this);
