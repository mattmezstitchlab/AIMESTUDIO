/* SynchroView · cartes d'usage de démonstration (configurables) : Moi, Pro, Participant, Coordinateur, Lecture seule.
   Une carte = un nom affiché + une identité de test. Il ne porte PAS de rôle :
   le rôle de l'identité est connu du serveur seul (appartenance à l'espace), et peut changer sans toucher aux profils. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.SVProfiles=f()})(typeof self!=='undefined'?self:this,function(){
return[
 {id:'moi',label:'Moi',identity:'u-lea'},
 {id:'pro',label:'Pro',identity:'u-lumen'},
 {id:'proche',label:'Participant',identity:'u-lucie'},
 {id:'coord',label:'Coordinateur',identity:'u-camille'},
 {id:'viewer',label:'Lecture seule',identity:'u-paul',optional:true}
]});
