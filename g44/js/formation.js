/* AIME G44 LAB · formation. « Une année de mariage est erronée. Un enfant est déjà rattaché.
   Que faut-il examiner avant de préparer une correction ? » Le stagiaire choisit des étapes, dans l'ordre.
   Pas de note : chaque choix reçoit une explication (pertinente, prématurée, à éviter, hors habilitation),
   fondée sur les règles du scénario et non sur une réponse unique attendue. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.G44Formation=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var ETAPES={
 'piece':{t:'Vérifier l\'acte de mariage',avant:[],why:'La correction doit concorder avec la pièce de référence (R4). C\'est la première vérification : sans pièce concordante, rien ne justifie de modifier.'},
 'suspendre':{t:'Suspendre le rattachement de l\'enfant',avant:['piece'],hab:'H2',why:'Le rattachement actif verrouille la période (R3). Le suspendre, sans le supprimer, permet de corriger puis de le recréer.'},
 'corriger':{t:'Corriger la date du mariage',avant:['piece','suspendre'],hab:'H1',why:'La correction elle-même. Elle vient après la vérification de la pièce et la levée du verrou.'},
 'periode':{t:'Recalculer l\'ouverture de la période',avant:['corriger'],why:'La période s\'ouvre à la date du mariage (R1) : elle se recalcule après la correction.'},
 'recreer':{t:'Recréer le rattachement',avant:['periode'],hab:'H2',why:'Le rattachement se recrée une fois la période recalculée, si sa date d\'effet y reste comprise (R2).'},
 'controle':{t:'Contrôler l\'ensemble',avant:['recreer'],why:'Vérifier que la période, le rattachement et le lien de couple sont cohérents, et que les filiations n\'ont pas bougé.'},
 'valider':{t:'Faire valider le plan',avant:['piece'],why:'Un plan préparé doit être validé par une personne habilitée avant toute intervention réelle.'},
 'direct':{t:'Corriger directement l\'année',piege:true,why:'À éviter : tant que le rattachement est actif, la période est verrouillée (R3). La correction directe échouerait ou laisserait un état incohérent.'},
 'supprimer':{t:'Supprimer l\'enfant du dossier',piege:true,why:'À éviter : la filiation découle de la naissance, pas du mariage. Il s\'agit de suspendre un rattachement administratif, pas de supprimer une personne ou un lien familial.'},
 'droits':{t:'Recalculer le droit familial',piege:true,why:'À éviter dans ce scénario : aucun lien documenté ne relie ce droit à la date du mariage. C\'est une hypothèse à faire examiner par une personne compétente, pas une étape automatique.'},
 'proximite':{t:'Modifier la date de naissance, proche du mariage',piege:true,why:'À éviter : deux dates voisines ne sont pas dépendantes. La naissance est justifiée par son propre acte.'}};
var ORDRE=['piece','suspendre','corriger','periode','recreer','controle','valider'];
/* explique une suite de choix ; le stagiaire est supposé non habilité (formation) */
function expliquer(suite,habilitations){var hab=habilitations||{},vus=[],out=suite.map(function(id){var E=ETAPES[id];if(!E)return{id:id,statut:'inconnue',texte:'Étape inconnue.'};
 var r={id:id,titre:E.t};
 if(E.piege){r.statut='a-eviter';r.texte=E.why}
 else{var manque=E.avant.filter(function(a){return vus.indexOf(a)<0});r.statut=manque.length?'prematuree':'pertinente';r.texte=E.why+(manque.length?' Il manque d\'abord : '+manque.map(function(a){return ETAPES[a].t.toLowerCase()}).join(', ')+'.':'');
  if(E.hab&&!hab[E.hab]){r.habilitation=E.hab;r.texte+=' En situation réelle, cette opération demande l\'habilitation '+E.hab+' : un stagiaire la prépare, il ne l\'exécute pas.'}}
 vus.push(id);return r});
 var oublis=ORDRE.filter(function(id){return suite.indexOf(id)<0}).map(function(id){return{id:id,titre:ETAPES[id].t,texte:ETAPES[id].why}});
 return{etapes:out,oublis:oublis,attendu:'Un plan qui vérifie la pièce, lève le verrou sans rien supprimer, corrige, recalcule, recrée, contrôle, puis se fait valider avant toute intervention réelle.'}}
return{ETAPES:ETAPES,ORDRE:ORDRE,expliquer:expliquer};
});
