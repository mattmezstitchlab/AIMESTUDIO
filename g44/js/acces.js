/* AIME G44 LAB · accès. Neuf notions séparées, jamais confondues :
   IDENTITÉ (qui) · CARTE D'USAGE (avec quel poste) · PERSPECTIVE (quelle présentation) · MISSION (sur quel dossier, pour quoi)
   · DOSSIER · RESSOURCE · ACTION · AUTORISATION (règle explicite) · DURÉE (validité de la mission).
   La perspective choisit ce qui est AFFICHÉ (visible / masqué). Elle n'accorde AUCUN droit : l'autorisation
   (autorisé / refusé / non vérifié) se calcule à partir de l'identité, de la mission et des habilitations.
   Prototype : en production, ces contrôles s'appliqueraient côté serveur, pas dans l'interface. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.G44Acces=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var DATE_LABO='2026-10-21';/* date fixe du laboratoire : le résultat ne dépend pas de l'horloge */
var IDENTITES={
 'agent':{nom:'Agent fictif 3',carte:'Poste de travail',habilitations:{H1:'accordee',H2:'declaree'},missions:[{dossier:'DOS-FICTIF-0001',objet:'Instruire la correction',jusqu:'2026-12-31'}]},
 'formateur':{nom:'Formateur fictif',carte:'Salle de formation',habilitations:{},missions:[{dossier:'DOS-FICTIF-0001',objet:'Former sur une copie anonymisée',jusqu:'2026-12-31',anonymise:true}]},
 'responsable':{nom:'Responsable fictif',carte:'Poste de travail',habilitations:{H3:'accordee'},missions:[{dossier:'DOS-FICTIF-0001',objet:'Valider le plan',jusqu:'2026-11-30'}]},
 'controleur':{nom:'Contrôleur fictif',carte:'Poste de contrôle',habilitations:{},missions:[{dossier:'DOS-FICTIF-0001',objet:'Contrôler la provenance et les décisions',jusqu:'2027-01-31',sansDonneesPersonnelles:true}]}};
var ACTIONS={
 'lire-identites':{nom:'Lire les identités du dossier'},
 'lire-scenario':{nom:'Lire le scénario anonymisé'},
 'lire-provenance':{nom:'Lire la provenance et le journal'},
 'simuler':{nom:'Lancer une simulation'},
 'suspendre-rattachement':{nom:'Suspendre le rattachement',habilitation:'H2'},
 'corriger-date':{nom:'Corriger la date du mariage',habilitation:'H1'},
 'valider-plan':{nom:'Valider le plan de correction',habilitation:'H3'},
 'executer':{nom:'Exécuter dans un système officiel'}};
/* l'autorisation : une règle explicite par action ; la perspective n'est pas un paramètre */
function autoriser(qui,action,dossier,date){var I=IDENTITES[qui],A=ACTIONS[action],d=date||DATE_LABO;
 if(!I||!A)return{etat:'refuse',raison:'Identité ou action inconnue.'};
 if(action==='executer')return{etat:'refuse',raison:'Le laboratoire n\'est relié à aucun système : aucune opération réelle n\'est possible.'};
 var M=I.missions.filter(function(m){return m.dossier===(dossier||'DOS-FICTIF-0001')})[0];
 if(!M)return{etat:'refuse',raison:'Aucune mission sur ce dossier.'};
 if(d>M.jusqu)return{etat:'refuse',raison:'Mission expirée le '+M.jusqu+'.'};
 if(action==='lire-scenario')return{etat:'autorise',raison:'Mission en cours sur ce dossier.'};
 if(action==='lire-identites'){if(M.anonymise)return{etat:'refuse',raison:'Mission de formation : copie anonymisée seulement.'};if(M.sansDonneesPersonnelles)return{etat:'refuse',raison:'Le contrôle porte sur la provenance et les décisions, pas sur les données personnelles.'};return{etat:'autorise',raison:'Mission d\'instruction ou de validation.'}}
 if(action==='lire-provenance')return{etat:'autorise',raison:'Mission en cours sur ce dossier.'};
 if(action==='simuler'){if(M.anonymise||qui==='agent'||qui==='responsable')return{etat:'autorise',raison:'Simulation isolée, sans effet.'};return{etat:'refuse',raison:'La mission de contrôle n\'inclut pas la préparation.'}}
 var h=A.habilitation,s=I.habilitations[h];
 if(s==='accordee')return{etat:'autorise',raison:'Habilitation '+h+' accordée (fictive).'};
 if(s==='declaree')return{etat:'nonverifie',raison:'Habilitation '+h+' déclarée mais non vérifiée : à confirmer avant toute intervention.'};
 return{etat:'refuse',raison:'Habilitation '+h+' absente.'}}
/* la présentation : ce que chaque perspective affiche ; elle ne change aucune autorisation */
var PERSPECTIVES={
 agent:{nom:'Agent',sections:{identites:'visible',chronologie:'visible',plan:'visible',journal:'masque',formation:'masque'}},
 formateur:{nom:'Formateur',sections:{identites:'masque',chronologie:'visible',plan:'visible',journal:'masque',formation:'visible'}},
 responsable:{nom:'Responsable',sections:{identites:'visible',chronologie:'visible',plan:'visible',journal:'visible',formation:'masque'}},
 controleur:{nom:'Contrôleur',sections:{identites:'masque',chronologie:'visible',plan:'visible',journal:'visible',formation:'masque'}}};
/* ce qui s'affiche d'une personne : masqué si l'action de lecture n'est pas autorisée, quoi qu'affiche la perspective */
function afficherNom(qui,perspective,nom,role){var a=autoriser(qui,'lire-identites'),v=PERSPECTIVES[perspective].sections.identites==='visible';return a.etat==='autorise'&&v?nom:role}
return{DATE_LABO:DATE_LABO,IDENTITES:IDENTITES,ACTIONS:ACTIONS,PERSPECTIVES:PERSPECTIVES,autoriser:autoriser,afficherNom:afficherNom};
});
