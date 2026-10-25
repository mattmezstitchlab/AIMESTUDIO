/* AIME · les règles des engagements (V1, P6) : « qui doit quoi à qui, pour quand ».
   synchroview/permissions.js reste la source des droits et n'est pas modifié (fichier protégé) : ce module s'appuie
   sur lui pour savoir qui est l'organisation (event.create : propriétaire et coordination) et qui est membre (space.read),
   et ajoute seulement ce qui est propre à un engagement. Utilisé par le serveur pour REFUSER (api/_engagements/moteur.mjs)
   et par la page pour MONTRER ; toute action est revérifiée au serveur.

   can(sujet, action, ressource) → { allow, rule, reason }
     sujet     : { id, role }   (le rôle vient de space_members, jamais de la requête)
     ressource : { deQui, pourQui (null = l'organisation du projet), creePar, etat: propose | accepte | refuse | tenu | annule }
   Actions : read · create · accept · refuse · keep · cancel ; toute autre : refusée par défaut. */
(function(root,factory){var P=(typeof module==='object'&&module.exports)?require('./permissions.js'):root.AIMEPerms;var E=factory(P);if(typeof module==='object'&&module.exports)module.exports=E;else root.AIMEEngagementsRegles=E})(typeof self!=='undefined'?self:this,function(P){'use strict';

function yes(rule){return{allow:true,rule:rule,reason:''}}
function no(rule,reason){return{allow:false,rule:rule,reason:reason}}
/* l'organisation du projet, telle que permissions.js la définit : ceux qui composent le déroulé */
function orga(s){return P.can(s,'create',{type:'event'}).allow}
function membre(s){return P.can(s,'read',{type:'space'}).allow}

var RULES={
 read:function(s,r){if(r.deQui===s.id||r.pourQui===s.id||r.creePar===s.id)return yes('engagement.read : personne concernée');if(orga(s))return yes('engagement.read : organisation');return no('engagement.read','engagement entre d\'autres personnes')},
 create:function(s,r){if(s.role==='guest'||s.role==='viewer')return no('engagement.create',s.role==='guest'?'un invité ne prend pas d\'engagement dans le projet':'consultation seule');
  if(r.deQui===s.id)return yes('engagement.create : on s\'engage soi-même');if(orga(s))return yes('engagement.create : l\'organisation demande un engagement');
  return no('engagement.create','seule l\'organisation demande un engagement à quelqu\'un d\'autre')},
 accept:function(s,r){if(r.etat!=='propose')return no('engagement.accept','rien à accepter');return r.deQui===s.id?yes('engagement.accept : la personne sollicitée'):no('engagement.accept','seule la personne sollicitée accepte')},
 refuse:function(s,r){if(r.etat!=='propose')return no('engagement.refuse','rien à refuser');return r.deQui===s.id?yes('engagement.refuse : la personne sollicitée'):no('engagement.refuse','seule la personne sollicitée refuse')},
 keep:function(s,r){if(r.etat!=='accepte')return no('engagement.keep','seul un engagement accepté peut être tenu');return r.deQui===s.id?yes('engagement.keep : celui qui s\'est engagé'):no('engagement.keep','seul celui qui s\'est engagé le déclare tenu')},
 cancel:function(s,r){if(r.etat!=='propose'&&r.etat!=='accepte')return no('engagement.cancel','cet engagement est clos');if(r.creePar===s.id)return yes('engagement.cancel : son auteur');if(s.role==='owner')return yes('engagement.cancel : propriétaire');return no('engagement.cancel','réservé à l\'auteur et au propriétaire')}
};

function can(s,action,r){if(!s||P.ROLES.indexOf(s.role)<0||!membre(s))return no('sujet','rôle inconnu');var f=RULES[action];if(!f)return no('engagement.'+action,'action inconnue : refusée par défaut');
 try{return f(s,r||{})}catch(e){return no('engagement.'+action,'erreur d\'évaluation : refusée par défaut')}}
return{can:can,actions:function(){return Object.keys(RULES)}};
});
