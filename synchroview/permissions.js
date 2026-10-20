/* AIME · règles d'accès d'un espace partagé (source unique).
   Utilisées par le serveur pour REFUSER, et par l'interface pour MONTRER ou MASQUER.
   L'interface seule ne protège rien : toute action est revérifiée côté serveur (api/sv/*).

   Rôles d'espace : owner · editor · contributor · viewer · guest.
   Les profils (Moi, Pro, Participant, Coordinateur, Lecture seule) ne sont PAS des rôles :
   un profil désigne une identité ; le rôle de cette identité vient de l'appartenance à l'espace, côté serveur.

   can(sujet, action, ressource, contexte) → { allow, rule, reason, needsTx? }
     sujet     : { id, role }
     ressource : { type, id, authorId, assigneeId, grants[], public, subjectId, payerId, payeeId, payer, role }
     contexte  : { tx } — autorisation propre à une transaction (paiements). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEPerms=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var ROLES=['owner','editor','contributor','viewer','guest'];
var ORGA={owner:1,editor:1};

function yes(rule){return{allow:true,rule:rule,reason:''}}
function no(rule,reason){return{allow:false,rule:rule,reason:reason}}

var RULES={
 /* ---- l'espace ---- */
 space:{
  read:function(s){return ROLES.indexOf(s.role)>=0?yes('space.read : tout membre'):no('space.read','pas membre de cet espace')},
  /* 6 · suppression réservée au propriétaire */
  delete:function(s){return s.role==='owner'?yes('space.delete : propriétaire'):no('space.delete','réservé au propriétaire')},
  /* 5 · membres et invitations limités aux rôles autorisés */
  manage_members:function(s){return s.role==='owner'?yes('space.manage_members : propriétaire'):no('space.manage_members','réservé au propriétaire')},
  invite:function(s,r){var target=r.role;if(['editor','contributor','viewer','guest'].indexOf(target)<0)return no('space.invite','rôle invité inconnu');
   if(s.role==='owner')return yes('space.invite : propriétaire, tout rôle sauf propriétaire');
   if(s.role==='editor'&&(target==='viewer'||target==='guest'))return yes('space.invite : coordination, lecture seule ou invité');
   if(s.role==='editor')return no('space.invite','la coordination n\'invite que des lecteurs ou des invités');
   return no('space.invite','inviter est réservé au propriétaire et à la coordination')}
 },
 /* ---- les moments du jour (timeline) ---- */
 event:{
  read:function(s,r){if(s.role==='guest')return r.public?yes('event.read : invité, moment public'):no('event.read','moment non public pour les invités');return ROLES.indexOf(s.role)>=0?yes('event.read : membre'):no('event.read','pas membre')},
  create:function(s){return ORGA[s.role]?yes('event.create : organisation'):no('event.create','réservé au propriétaire et à la coordination')},
  /* 2 · un contributeur ne modifie que ses contenus ou ceux qui lui sont attribués */
  edit:function(s,r){if(ORGA[s.role])return yes('event.edit : organisation');if(s.role==='contributor'&&(r.assigneeId===s.id||r.authorId===s.id))return yes('event.edit : contributeur, moment attribué ou créé par lui');
   return no('event.edit',s.role==='contributor'?'ce moment ne lui est pas attribué':'lecture seule pour ce rôle')},
  delete:function(s,r){if(s.role==='owner')return yes('event.delete : propriétaire');if(s.role==='contributor'&&r.authorId===s.id)return yes('event.delete : contributeur, son propre moment');return no('event.delete','réservé au propriétaire (ou à l\'auteur contributeur)')}
 },
 /* ---- 1 · les documents : seulement les personnes explicitement autorisées ---- */
 document:{
  read:function(s,r){if(r.authorId===s.id)return yes('document.read : auteur');if((r.grants||[]).indexOf(s.id)>=0)return yes('document.read : autorisation explicite');return no('document.read','aucune autorisation explicite sur ce document')},
  edit:function(s,r){var rd=RULES.document.read(s,r);if(!rd.allow)return no('document.edit','aucune autorisation explicite sur ce document');if(r.authorId===s.id)return yes('document.edit : auteur');if(ORGA[s.role])return yes('document.edit : organisation autorisée sur le document');return no('document.edit','lecture seule sur ce document')},
  share:function(s,r){if(r.authorId===s.id)return yes('document.share : auteur');if(s.role==='owner'&&(r.grants||[]).indexOf(s.id)>=0)return yes('document.share : propriétaire autorisé sur le document');return no('document.share','seul l\'auteur ou le propriétaire autorisé gère les accès')},
  upload:function(s){return(ORGA[s.role]||s.role==='contributor')?yes('document.upload : organisation ou contributeur (ses documents)'):no('document.upload','déposer est réservé à l\'organisation et aux contributeurs')},
  delete:function(s,r){if(r.authorId===s.id)return yes('document.delete : auteur');return no('document.delete','seul l\'auteur supprime un document')}
 },
 /* ---- 3 · données personnelles des participants (réponse, régime, coordonnées) ---- */
 personal:{
  read:function(s,r){if(r.subjectId===s.id)return yes('personal.read : ses propres données');if(ORGA[s.role])return yes('personal.read : organisation');return no('personal.read','données personnelles d\'un autre participant')},
  edit:function(s,r){if(r.subjectId===s.id)return yes('personal.edit : ses propres données');if(s.role==='owner')return yes('personal.edit : propriétaire');return no('personal.edit','données personnelles d\'un autre participant')}
 },
 /* résumé sans nom (nombre de réponses, régimes comptés) : pour préparer sans exposer les personnes */
 summary:{
  read:function(s){return s.role!=='guest'?yes('summary.read : membre (sans données nominatives)'):no('summary.read','les invités ne voient que leurs propres réponses')}
 },
 /* ---- 4 · paiements : rôle autorisé ET autorisation propre à la transaction ---- */
 payment:{
  read:function(s,r){if(ORGA[s.role])return yes('payment.read : organisation');if(s.role==='contributor'&&r.payeeId===s.id)return yes('payment.read : contributeur, paiement qui lui est destiné');if(r.payerId===s.id)return yes('payment.read : son propre paiement');return no('payment.read','paiement d\'un autre membre')},
  pay:function(s,r,c){var ok=(r.payer==='space'&&s.role==='owner')||(r.payerId===s.id);
   if(!ok)return no('payment.pay',r.payer==='space'?'seul le propriétaire règle les paiements de l\'espace':'ce paiement n\'est pas le vôtre');
   var t=c&&c.tx;if(!t||t.subjectId!==s.id||t.paymentId!==r.id||t.amount!==r.amount||!(t.expires>Date.now()))return{allow:false,needsTx:true,rule:'payment.pay',reason:'autorisation propre à cette transaction requise'};
   return yes('payment.pay : '+(r.payer==='space'?'propriétaire':'payeur')+' + autorisation de transaction')}
 }
};

function can(s,action,r,c){if(!s||ROLES.indexOf(s.role)<0)return no('sujet','rôle inconnu');var T=RULES[r&&r.type];if(!T||!T[action])return no((r&&r.type)+'.'+action,'action inconnue : refusée par défaut');try{return T[action](s,r||{},c||{})}catch(e){return no((r&&r.type)+'.'+action,'erreur d\'évaluation : refusée par défaut')}}
/* « permis sous réserve d'autorisation de transaction » : pour l'affichage d'une action de paiement avant confirmation */
function canStart(s,action,r){var d=can(s,action,r,{});if(d.needsTx)return{allow:true,needsTx:true,rule:'payment.pay : '+(r.payer==='space'?'propriétaire':'payeur')+' (confirmation de la transaction requise)',reason:''};return d}
return{ROLES:ROLES,can:can,canStart:canStart,actions:function(type){return RULES[type]?Object.keys(RULES[type]):[]}};
});
