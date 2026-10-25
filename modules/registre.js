/* AIME · le registre des modules : UN catalogue, lu par le serveur (les pages servies, donc le Dock), par l'Atlas (/capacites/)
   et par l'écran de projet. Aucun autre fichier ne tient sa propre liste de modules.

   Un module n'est pas une page : c'est une capacité appliquée à une situation (« décaler un moment », « voir ce qui me concerne »).
   Il déclare ses ressources, ses actions, la règle de synchroview/permissions.js qui décide chacune, ses présentations,
   sa destination, ses états, ses exigences d'accessibilité et ce qu'il inscrit au journal. Le registre ne décide d'AUCUN droit :
   il nomme la règle ; permissions.js la tranche, au serveur, à chaque lecture et à chaque écriture.

   Statuts (ne jamais présenter un module documenté comme opérationnel) :
     operationnel : servi par le serveur dans un vrai projet, avec ses tests (preuves[]) ;
     composant    : du code existe (démonstration, règles), mais pas de parcours serveur complet ;
     documente    : décrit ici, rien d'exécutable encore.

   AIMEModules.MODULES            : les déclarations
   AIMEModules.valider(m)         : [] si le contrat est complet, sinon la liste des manques
   AIMEModules.module(id)         : une déclaration ou null
   AIMEModules.parGabarit(g)      : le module servi par ce gabarit, ou null
   AIMEModules.servis(actifs)     : les gabarits servis à un membre, selon les modules activés dans ce projet ({temps:true})
   AIMEModules.destination(id, espace) : l'adresse du module dans un projet (la même pour le Dock et l'Atlas)
   AIMEModules.intention(texte)   : une phrase → { module, action } ou null ; déterministe, sans IA
   AIMEModules.permises(id, sujet, ressource, P) : les actions du module que permissions.js accorde à ce sujet sur cette ressource */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEModules=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var CONTRAT=1;
var STATUTS={
 operationnel:{nom:'Opérationnel',dit:'Servi par le serveur dans un vrai projet, droits vérifiés à chaque appel, couvert par des tests.'},
 composant:{nom:'Composant',dit:'Du code existe (règles, démonstration) ; pas encore de parcours serveur complet.'},
 documente:{nom:'Documenté',dit:'Décrit dans le registre ; rien d\'exécutable encore.'}
};
var PRESENTATIONS=['liste','grille','chronologie','cercle','calendrier','document','carte','editeur','comparaison'];
var CHAMPS=['id','contrat','nom','fonction','statut','ressources','actions','acces','presentations','contextes','destination','etats','accessibilite','journal','intentions','preuves'];
var ETATS=['chargement','vide','succes','refus','introuvable','ferme'];

/* les états communs : un code HTTP et la phrase montrée ; chaque module peut en ajouter (conflit…) */
function etats(extra){var e={
 chargement:{dit:'Chargement…'},
 vide:{dit:'Rien à afficher pour l\'instant.'},
 succes:{code:200,dit:'C\'est enregistré.'},
 refus:{code:403,dit:'Vous n\'avez pas ce droit dans ce projet.'},
 introuvable:{code:404,dit:'Ce projet est introuvable, ou votre accès a pris fin.'},
 ferme:{code:503,dit:'Ce module n\'est pas encore installé sur cet environnement.'}};
 Object.keys(extra||{}).forEach(function(k){e[k]=extra[k]});return e}
var A11Y=['Atteignable et utilisable au clavier, ordre de tabulation logique','Chaque changement annoncé dans une zone aria-live polie','Contraste AA, cibles tactiles de 44 px','Fonctionne de 320 px à l\'ordinateur, sans défilement horizontal','Le focus reste sur l\'élément actif après une mise à jour'];

var MODULES=[
 {id:'temps',contrat:1,nom:'Programme',statut:'operationnel',
  fonction:'Le temps partagé d\'un projet : ce qui se passe, quand et où, pour qui ; une modification se propage à chacun selon ses droits.',
  ressources:[{type:'event',etat:'moments',historique:'live_journal',dit:'Les moments du projet. La table moments est l\'état courant ; live_journal en garde chaque changement, avec ses effets.'}],
  actions:{
   lire:{regle:['event','read'],ecrit:false,nom:'Voir le programme'},
   retarder:{regle:['event','edit'],ecrit:true,journal:'retarder',conflit:true,nom:'Décaler un moment'},
   fait:{regle:['event','edit'],ecrit:true,journal:'fait',conflit:true,nom:'Marquer comme fait'},
   planB:{regle:['event','edit'],ecrit:true,journal:'planB',conflit:true,nom:'Basculer en plan B'},
   confirmer:{regle:['event','read'],condition:'responsable du moment',ecrit:true,journal:'confirmer',nom:'Confirmer le nouvel horaire'},
   comparer:{regle:['space','manage_members'],ecrit:false,nom:'Comparer les vues'},
   activer:{regle:['space','manage_members'],ecrit:true,journal:'importer',nom:'Importer le programme type'}
  },
  acces:'Membre actif du projet (space_members, date de fin comprise) ; règles relues à chaque appel. Visibilité : event.read, puis l\'audience du moment (item.read).',
  presentations:['liste','cercle','comparaison'],
  prevues:['calendrier','carte'],
  contextes:{preparation:'liste',jourJ:'cercle',verification:'comparaison'},
  destination:{gabarit:'deroule',requiert:'temps'},
  api:'/api/temps',
  etats:etats({conflit:{code:409,dit:'Le programme a changé entre-temps : voici la version à jour, rien n\'a été enregistré.'},vide:{dit:'Aucun programme dans ce projet pour l\'instant.'}}),
  accessibilite:A11Y.concat(['Les heures sont du texte, jamais seulement une couleur ou une position']),
  journal:['importer','retarder','fait','planB','confirmer'],
  intentions:[
   {motif:/\b(d[ée]cal|retard|avanc|repouss)/i,action:'retarder'},
   {motif:/\b(confirmer|j'ai vu|bien re[çc]u)\b/i,action:'confirmer'},
   {motif:/\b(plan b|repli|pluie)\b/i,action:'planB'},
   {motif:/\b(comparer|voir comme|perspective)\b/i,action:'comparer'},
   {motif:/\b(programme|d[ée]roul[ée]|horaires?|planning|me concerne|demain|aujourd'hui|quand|cons[ée]quences?)\b/i,action:'lire'}],
  preuves:['api/temps.mjs','api/_temps/moteur.mjs','modules/temps/moteur.js','modules/temps/cercle.js','tests/temps-moteur.test.cjs','tests/temps-cercle.test.cjs','tests/temps.test.cjs']},

 {id:'acces',contrat:1,nom:'Mon accès',statut:'operationnel',
  fonction:'Ce que je suis dans ce projet, ce que je peux y faire, qui me l\'a accordé et jusqu\'à quand.',
  ressources:[{type:'space',etat:'space_members',historique:'audit',dit:'Ma participation.'}],
  actions:{lire:{regle:['space','read'],ecrit:false,nom:'Voir mon accès'}},
  acces:'Tout membre actif.',presentations:['liste'],prevues:[],contextes:{preparation:'liste'},
  destination:{gabarit:'acces'},api:'/api/page',etats:etats(),accessibilite:A11Y,journal:['signalement'],
  intentions:[{motif:/\b(mon acc[èe]s|mon r[ôo]le|mes droits)\b/i,action:'lire'}],
  preuves:['api/_auth/pages.mjs','tests/pages.test.cjs']},

 {id:'journal',contrat:1,nom:'Journal',statut:'operationnel',
  fonction:'Qui a fait quoi dans ce projet, dans la portée de chacun.',
  ressources:[{type:'space',etat:'audit',historique:'audit',dit:'Le journal en ajout seul.'}],
  actions:{lire:{regle:['space','read'],ecrit:false,nom:'Lire le journal'}},
  acces:'Le propriétaire lit tout ; les autres, les lignes où ils agissent ou sont concernés.',presentations:['liste'],prevues:['chronologie'],contextes:{preparation:'liste'},
  destination:{gabarit:'journal'},api:'/api/page',etats:etats(),accessibilite:A11Y,journal:[],
  intentions:[{motif:/\b(journal|historique|qui a)\b/i,action:'lire'}],
  preuves:['api/_auth/journal.mjs','tests/journal-confidentialite.test.cjs']},

 {id:'personnes',contrat:1,nom:'Personnes',statut:'operationnel',
  fonction:'Les personnes du projet dans la portée de chacun ; inviter, retirer.',
  ressources:[{type:'member',etat:'space_members',historique:'audit',dit:'Les membres et les invitations.'}],
  actions:{lire:{regle:['member','read'],ecrit:false,nom:'Voir les personnes'},inviter:{regle:['space','invite'],ecrit:true,journal:'invitation',nom:'Inviter'},retirer:{regle:['space','manage_members'],ecrit:true,journal:'retrait',nom:'Retirer'}},
  acces:'Membre actif ; la liste se réduit selon member.read.',presentations:['liste'],prevues:['grille'],contextes:{preparation:'liste'},
  destination:{gabarit:'personnes'},api:'/api/page',etats:etats(),accessibilite:A11Y,journal:['invitation','acceptation','retrait'],
  intentions:[{motif:/\b(inviter|personnes|membres|qui participe)\b/i,action:'lire'}],
  preuves:['api/_auth/pages.mjs','tests/parcours-reel.test.cjs']},

 {id:'engagements',contrat:1,nom:'Engagements',statut:'operationnel',
  fonction:'Qui doit quoi à qui, et pour quand : une promesse datée entre personnes d\'un même projet, vue seulement par les personnes concernées et l\'organisation.',
  ressources:[{type:'engagement',etat:'engagements',historique:'audit',dit:'Les engagements du projet. Le journal du projet garde chaque geste et son échéance, jamais le texte.'}],
  actions:{
   lire:{regle:['engagement','read'],ecrit:false,nom:'Voir les engagements'},
   prendre:{regle:['engagement','create'],ecrit:true,journal:'engagement',nom:'Prendre un engagement'},
   accepter:{regle:['engagement','accept'],ecrit:true,journal:'engagement',nom:'Accepter'},
   refuser:{regle:['engagement','refuse'],ecrit:true,journal:'engagement',nom:'Refuser'},
   tenir:{regle:['engagement','keep'],ecrit:true,journal:'engagement',nom:'Marquer comme tenu'},
   annuler:{regle:['engagement','cancel'],ecrit:true,journal:'engagement',nom:'Annuler'}
  },
  acces:'Règles : synchroview/engagements.js, adossées à permissions.js (qui est l\'organisation, qui est membre). Membre actif du projet ; chacun lit les engagements qui le concernent (et l\'organisation, tous). On s\'engage soi-même ; seule l\'organisation demande un engagement à quelqu\'un d\'autre.',
  presentations:['liste'],prevues:['calendrier','chronologie'],contextes:{preparation:'liste'},
  /* pas de cinquième lieu dans le Dock (décision de Matt, 24/10) : les engagements vivent dans « Mon accès », et dans AI pour les miens */
  destination:{gabarit:'acces'},api:'/api/engagements',
  etats:etats({vide:{dit:'Aucun engagement pour l\'instant.'},conflit:{code:409,dit:'Cet engagement a changé entre-temps : voici la version à jour.'}}),
  accessibilite:A11Y.concat(['Le retard est dit en toutes lettres, jamais seulement par une couleur']),
  journal:['engagement'],
  intentions:[{motif:/\b(engag|promesse|promis|je m'engage|[ée]ch[ée]ance)/i,action:'lire'}],
  preuves:['api/engagements.mjs','api/_engagements/moteur.mjs','synchroview/engagements.js','tests/engagements.test.cjs']},

 {id:'documents',contrat:1,nom:'Documents',statut:'composant',
  fonction:'Partager un document avec les bonnes personnes, et seulement elles.',
  ressources:[{type:'document',etat:null,historique:null,dit:'Les règles d\'accès existent (autorisation explicite) ; aucun stockage serveur encore.'}],
  actions:{lire:{regle:['document','read'],ecrit:false,nom:'Lire'},partager:{regle:['document','share'],ecrit:true,nom:'Partager'},deposer:{regle:['document','upload'],ecrit:true,nom:'Déposer'}},
  acces:'Autorisation explicite par document (grants), jamais par le rôle seul.',presentations:[],prevues:['liste','document'],contextes:{},
  destination:{gabarit:'documents'},api:null,etats:etats(),accessibilite:A11Y,journal:[],
  intentions:[{motif:/\b(document|contrat|partager|fichier)\b/i,action:'lire'}],
  preuves:['synchroview/permissions.js','tests/permissions.test.cjs']},

 {id:'finances',contrat:1,nom:'Finances',statut:'composant',
  fonction:'Les paiements du projet : qui règle quoi, avec une autorisation propre à chaque transaction.',
  ressources:[{type:'payment',etat:null,historique:null,dit:'Les règles existent ; aucun paiement réel n\'est branché.'}],
  actions:{lire:{regle:['payment','read'],ecrit:false,nom:'Voir les paiements'},payer:{regle:['payment','pay'],ecrit:true,nom:'Régler'}},
  acces:'Rôle autorisé ET autorisation de transaction.',presentations:[],prevues:['liste'],contextes:{},
  destination:{gabarit:null},api:null,etats:etats(),accessibilite:A11Y,journal:[],
  intentions:[{motif:/\b(payer|paiement|facture|acompte|budget)\b/i,action:'lire'}],
  preuves:['synchroview/permissions.js','tests/permissions.test.cjs']},

 {id:'messages',contrat:1,nom:'Messages',statut:'documente',
  fonction:'Écrire à l\'équipe ou à tout le projet, selon l\'audience.',
  ressources:[{type:'item',etat:null,historique:null,dit:'Les annonces existent dans la démonstration du direct ; rien côté serveur pour un vrai projet.'}],
  actions:{lire:{regle:['item','read'],ecrit:false,nom:'Lire'}},
  acces:'Selon l\'audience (item.read).',presentations:[],prevues:['liste'],contextes:{},
  destination:{gabarit:'messages'},api:null,etats:etats(),accessibilite:A11Y,journal:[],
  intentions:[{motif:/\b(message|[ée]crire|annonce|pr[ée]venir)\b/i,action:'lire'}],
  preuves:['docs/GABARITS.md']}
];

var PAR_ID={};MODULES.forEach(function(m){PAR_ID[m.id]=m});

function valider(m){var e=[];if(!m||typeof m!=='object')return['pas un objet'];
 CHAMPS.forEach(function(c){if(m[c]===undefined)e.push('champ manquant : '+c)});
 if(m.contrat!==CONTRAT)e.push('contrat '+m.contrat+' ≠ '+CONTRAT);
 if(!/^[a-z][a-z0-9-]{1,30}$/.test(String(m.id||'')))e.push('identifiant invalide');
 if(!STATUTS[m.statut])e.push('statut inconnu : '+m.statut);
 if(!Array.isArray(m.ressources)||!m.ressources.length)e.push('aucune ressource');
 var A=m.actions||{};if(!Object.keys(A).length)e.push('aucune action');
 Object.keys(A).forEach(function(k){var a=A[k];if(!Array.isArray(a.regle)||a.regle.length!==2)e.push('action '+k+' : règle manquante');if(typeof a.ecrit!=='boolean')e.push('action '+k+' : ecrit doit être vrai ou faux');if(!a.nom)e.push('action '+k+' : nom manquant');
  if(a.ecrit&&m.statut==='operationnel'&&a.journal===undefined)e.push('action '+k+' : une écriture opérationnelle doit dire ce qu\'elle inscrit au journal')});
 (m.presentations||[]).concat(m.prevues||[]).forEach(function(p){if(PRESENTATIONS.indexOf(p)<0)e.push('présentation inconnue : '+p)});
 ETATS.forEach(function(s){if(!m.etats||!m.etats[s])e.push('état manquant : '+s)});
 if(!Array.isArray(m.accessibilite)||m.accessibilite.length<3)e.push('exigences d\'accessibilité insuffisantes');
 if(!Array.isArray(m.preuves)||!m.preuves.length)e.push('aucune preuve citée');
 if(m.statut==='operationnel'){if(!m.presentations.length)e.push('opérationnel sans présentation');if(!m.destination||!m.destination.gabarit)e.push('opérationnel sans destination');if(!m.api)e.push('opérationnel sans API')}
 (m.intentions||[]).forEach(function(i,n){if(!(i.motif instanceof RegExp)||!A[i.action])e.push('intention '+n+' invalide')});
 return e}

function module(id){return PAR_ID[id]||null}
function parGabarit(g){for(var i=0;i<MODULES.length;i++)if(MODULES[i].destination&&MODULES[i].destination.gabarit===g)return MODULES[i];return null}
/* les gabarits servis à un membre : les modules opérationnels sans condition, puis ceux dont la condition est remplie dans ce projet */
function servis(actifs){actifs=actifs||{};var ok=MODULES.filter(function(m){return m.statut==='operationnel'&&m.destination.gabarit});
 var g=ok.filter(function(m){return !m.destination.requiert}).concat(ok.filter(function(m){var r=m.destination.requiert;return r&&actifs[r]===true})).map(function(m){return m.destination.gabarit});
 /* deux modules peuvent partager une page (Engagements vit dans « Mon accès ») : une page n'est servie qu'une fois */
 return g.filter(function(x,i){return g.indexOf(x)===i})}
function destination(id,espace){var m=module(id);if(!m||!m.destination||!m.destination.gabarit||m.statut!=='operationnel')return null;
 var g=m.destination.gabarit;if(!espace)return'/projets/?module='+encodeURIComponent(id);
 return'/projets/?espace='+encodeURIComponent(espace)+(g==='acces'?'':'&page='+encodeURIComponent(g))}
function sansAccents(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'')}
/* une phrase → l'intention qui apparaît le plus tôt dans la phrase (le verbe d'abord : « partager un document avec les personnes »
   → Documents) ; à égalité, un module opérationnel l'emporte. Un module non opérationnel est rendu marqué « non disponible ». */
function intention(texte){var t=String(texte||'').slice(0,200);if(!t.trim())return null;var s=sansAccents(t),best=null;
 MODULES.forEach(function(m){m.intentions.forEach(function(it){var x=it.motif.exec(t)||it.motif.exec(s);if(!x)return;var ok=m.statut==='operationnel';
  if(!best||x.index<best.i||(x.index===best.i&&ok&&!best.r.disponible))best={i:x.index,r:{module:m.id,action:it.action,nom:m.actions[it.action].nom,disponible:ok}}})});
 return best?best.r:null}
/* une action à condition (« responsable du moment ») se décide objet par objet, dans le moteur du module : elle n'est jamais accordée ici */
function permises(id,sujet,ressource,P){var m=module(id);if(!m||!P)return[];return Object.keys(m.actions).filter(function(k){var a=m.actions[k];if(a.condition)return false;var r=Object.assign({type:a.regle[0]},ressource||{});r.type=a.regle[0];return P.can(sujet,a.regle[1],r).allow})}

return{CONTRAT:CONTRAT,STATUTS:STATUTS,PRESENTATIONS:PRESENTATIONS,MODULES:MODULES,valider:valider,module:module,parGabarit:parGabarit,servis:servis,destination:destination,intention:intention,permises:permises};
});
