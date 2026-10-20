/* AIME · règles d'accès d'un espace partagé (source unique).
   Utilisées par le serveur pour REFUSER, et par l'interface pour MONTRER ou MASQUER.
   L'interface seule ne protège rien : toute action est revérifiée côté serveur (api/sv/*).

   Rôles d'espace : owner · editor · contributor · viewer · guest.
   Les profils (Moi, Pro, Participant, Coordinateur, Lecture seule) ne sont PAS des rôles :
   un profil désigne une identité ; le rôle de cette identité vient de l'appartenance à l'espace, côté serveur.

   can(sujet, action, ressource, contexte) → { allow, rule, reason, needsTx? }
     sujet     : { id, role }
     ressource : { type, id, authorId, assigneeId, grants[], public, subjectId, payerId, payeeId, payer, role } (missions : voir RULES.mission)
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
 /* ---- éléments d'une collection (salles, matériel, incidents, décisions…) selon leur audience ---- */
 item:{
  read:function(s,r){var a=r.audience||'public';if(a==='public'||a==='membres')return yes('item.read : '+a);
   if(a==='equipe')return(ORGA[s.role]||s.role==='contributor')?yes('item.read : équipe'):no('item.read','réservé à l\'équipe');
   if(a==='organisation')return ORGA[s.role]?yes('item.read : organisation'):no('item.read','réservé à l\'organisation');
   return no('item.read','audience inconnue : refusé par défaut')}
 },
 /* ---- missions : un seul objet suivi par le responsable, le coordinateur, les affectés et les candidats ----
    ressource : { etape, responsableId, coordinateurId, assigneeIds[], candidateIds[], pro, reglementee, qualification, confirme, tachesFaites, step }
    sujet     : { id, role, pro, qualifications[] }  (attributs de l'identité, fixés côté serveur, jamais par la requête) */
 mission:{
  read:function(s,r){if(ORGA[s.role])return yes('mission.read : organisation');if(lien(s,r))return yes('mission.read : '+lien(s,r));
   if(OUVERTE[r.etape]&&s.role==='contributor'){var e=eligible(s,r);return e.ok?yes('mission.read : mission ouverte au réseau, profil compatible'):no('mission.read',e.raison)}
   return no('mission.read',OUVERTE[r.etape]?'mission ouverte aux contributeurs seulement':'mission attribuée : réservée aux personnes concernées')},
  /* chaque étape n'est visible que par les personnes concernées */
  step:function(s,r){var st=r.step,l=lien(s,r),orga=ORGA[s.role];
   if(st==='decouvrir')return RULES.mission.read(s,r).allow?yes('mission.step : découvrir, toute personne qui voit la mission'):no('mission.step','mission non visible');
   if(st==='candidater'||st==='valider'){if(orga)return yes('mission.step : '+st+', organisation');if(l==='candidat'||l==='affecté')return yes('mission.step : '+st+', sa propre candidature');return no('mission.step','étape réservée aux candidats et à l\'organisation')}
   if(st==='organiser'||st==='realiser'||st==='cloturer'){if(orga||l)return yes('mission.step : '+st+', '+(orga?'organisation':l));return no('mission.step','étape réservée à l\'équipe de la mission')}
   return no('mission.step','étape inconnue : refusée par défaut')},
  apply:function(s,r){if(!OUVERTE[r.etape])return no('mission.apply','les candidatures sont closes');if(s.role!=='contributor')return no('mission.apply','candidater est réservé aux contributeurs du réseau');
   if(lien(s,r))return no('mission.apply','déjà '+lien(s,r)+' sur cette mission');var e=eligible(s,r);return e.ok?yes('mission.apply : contributeur, profil compatible'):no('mission.apply',e.raison)},
  shortlist:function(s,r){if(r.etape!=='candidater')return no('mission.shortlist','aucune candidature à proposer à cette étape');return r.responsableId===s.id?yes('mission.shortlist : responsable de la mission'):no('mission.shortlist','réservé au responsable de la mission')},
  validate:function(s,r){if(r.etape!=='valider')return no('mission.validate','rien à valider à cette étape');return s.role==='owner'?yes('mission.validate : propriétaire de l\'espace'):no('mission.validate','la validation finale revient au propriétaire de l\'espace')},
  reject:function(s,r){if(r.etape!=='valider')return no('mission.reject','rien à refuser à cette étape');return s.role==='owner'?yes('mission.reject : propriétaire de l\'espace'):no('mission.reject','réservé au propriétaire de l\'espace')},
  confirm:function(s,r){if(r.etape!=='organiser')return no('mission.confirm','rien à confirmer à cette étape');if(r.confirme)return no('mission.confirm','déjà confirmé');return(r.assigneeIds||[]).indexOf(s.id)>=0?yes('mission.confirm : affecté à la mission'):no('mission.confirm','réservé aux personnes affectées')},
  start:function(s,r){if(r.etape!=='organiser')return no('mission.start','la mission n\'est pas prête à démarrer');if(!r.confirme)return no('mission.start','en attente de la confirmation du prestataire');
   return(r.coordinateurId===s.id||r.responsableId===s.id)?yes('mission.start : coordination de la mission'):no('mission.start','réservé au coordinateur et au responsable')},
  task:function(s,r){if(r.etape!=='realiser')return no('mission.task','la mission n\'est pas en cours');return((r.assigneeIds||[]).indexOf(s.id)>=0||r.coordinateurId===s.id)?yes('mission.task : affecté ou coordinateur'):no('mission.task','réservé aux affectés et au coordinateur')},
  finish:function(s,r){if(r.etape!=='realiser')return no('mission.finish','la mission n\'est pas en cours');if(!r.tachesFaites)return no('mission.finish','toutes les tâches ne sont pas faites');return(r.assigneeIds||[]).indexOf(s.id)>=0?yes('mission.finish : affecté à la mission'):no('mission.finish','réservé aux personnes affectées')},
  close:function(s,r){if(r.etape!=='cloturer')return no('mission.close','la mission n\'est pas prête à être clôturée');return(r.responsableId===s.id||s.role==='owner')?yes('mission.close : responsable de la mission'):no('mission.close','réservé au responsable de la mission')},
  /* lieu et horaire : coordination de la mission ; responsable : organisation seulement */
  edit:function(s,r){if(r.etape==='close')return no('mission.edit','mission clôturée');if(s.role==='owner'||r.responsableId===s.id||r.coordinateurId===s.id)return yes('mission.edit : '+(s.role==='owner'?'propriétaire':r.responsableId===s.id?'responsable':'coordinateur'));return no('mission.edit','réservé au responsable, au coordinateur et au propriétaire')},
  reassign:function(s,r){if(r.etape==='close')return no('mission.reassign','mission clôturée');return ORGA[s.role]?yes('mission.reassign : organisation'):no('mission.reassign','changer de responsable est réservé à l\'organisation')},
  read_logistics:function(s,r){if(ORGA[s.role])return yes('mission.read_logistics : organisation');var l=lien(s,r);return(l&&l!=='candidat')?yes('mission.read_logistics : '+l):no('mission.read_logistics','accès et consignes réservés à l\'équipe de la mission')}
 },
 /* une candidature est une donnée personnelle du candidat : les autres candidats ne la voient jamais */
 candidature:{
  read:function(s,r){if(r.subjectId===s.id)return yes('candidature.read : sa propre candidature');if(ORGA[s.role])return yes('candidature.read : organisation');return no('candidature.read','candidature d\'une autre personne')}
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

var OUVERTE={decouvrir:1,candidater:1};
function lien(s,r){if(r.responsableId===s.id)return'responsable';if(r.coordinateurId===s.id)return'coordinateur';if((r.assigneeIds||[]).indexOf(s.id)>=0)return'affecté';if((r.candidateIds||[]).indexOf(s.id)>=0)return'candidat';return''}
/* une prestation s'adresse aux professionnels, une contribution aux proches ; une mission réglementée exige la qualification */
function eligible(s,r){if(r.pro&&!s.pro)return{ok:false,raison:'prestation réservée aux professionnels'};if(!r.pro&&s.pro)return{ok:false,raison:'contribution réservée aux proches du projet'};
 if(r.reglementee&&(s.qualifications||[]).indexOf(r.qualification)<0)return{ok:false,raison:'mission réglementée : qualification « '+r.qualification+' » requise'};return{ok:true}}
function can(s,action,r,c){if(!s||ROLES.indexOf(s.role)<0)return no('sujet','rôle inconnu');var T=RULES[r&&r.type];if(!T||!T[action])return no((r&&r.type)+'.'+action,'action inconnue : refusée par défaut');try{return T[action](s,r||{},c||{})}catch(e){return no((r&&r.type)+'.'+action,'erreur d\'évaluation : refusée par défaut')}}
/* « permis sous réserve d'autorisation de transaction » : pour l'affichage d'une action de paiement avant confirmation */
function canStart(s,action,r){var d=can(s,action,r,{});if(d.needsTx)return{allow:true,needsTx:true,rule:'payment.pay : '+(r.payer==='space'?'propriétaire':'payeur')+' (confirmation de la transaction requise)',reason:''};return d}
return{ROLES:ROLES,can:can,canStart:canStart,actions:function(type){return RULES[type]?Object.keys(RULES[type]):[]}};
});
