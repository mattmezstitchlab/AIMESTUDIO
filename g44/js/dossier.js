/* AIME G44 LAB · le dossier fictif, écrit une seule fois. Tous les laboratoires de la page le lisent ; aucun ne le recopie.
   Données ENTIÈREMENT FICTIVES : personnes, dates, documents, agents, règles. Aucun numéro d'identification réel.
   Les règles R1–R4 sont des règles EXPÉRIMENTALES du scénario : elles ne décrivent pas un logiciel ni une procédure réels.

   Cinq dates distinctes, jamais interchangeables :
     evenement    — quand le fait a eu lieu (selon l'enregistrement)
     effet        — à partir de quand il produit un effet administratif
     saisie       — quand il a été saisi
     modification — dernière modification
     connaissance — quand l'organisme fictif en a eu connaissance */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.G44Dossier=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* niveaux de connaissance : la page affiche toujours lequel s'applique */
var NIVEAUX={
 observe:{nom:'Observé',def:'Difficulté ou exemple rapporté, dont les circonstances restent à confirmer.'},
 documente:{nom:'Documenté',def:'Présent dans un document identifiable. Ici : une pièce du dossier fictif.'},
 deduit:{nom:'Déduit',def:'Conclusion logique tirée d\'informations définies, avec ses hypothèses.'},
 simule:{nom:'Simulé',def:'Résultat d\'une règle expérimentale du scénario, sans valeur opérationnelle.'},
 nonverifie:{nom:'Non vérifié',def:'Information insuffisante ou incertaine.'}};

/* types de relation : seuls ceux qui « propagent » transmettent une modification */
var RELATIONS={
 reference:{nom:'Référence',propage:true,def:'L\'objet cite l\'autre : une valeur en est tirée.'},
 dependance:{nom:'Dépendance documentée',propage:true,def:'Une règle du scénario lie les deux objets.'},
 contrainte:{nom:'Contrainte',propage:true,def:'Une règle limite ce que l\'on peut modifier.'},
 chronologie:{nom:'Chronologie',propage:false,def:'Ordre dans le temps. Une proximité de dates ne crée aucune dépendance.'},
 hypothese:{nom:'Hypothèse',propage:false,def:'Lien possible, non documenté : à vérifier, jamais appliqué.'},
 autorisation:{nom:'Autorisation',propage:false,def:'Habilitation nécessaire pour agir sur l\'objet.'},
 preuve:{nom:'Justificatif',propage:false,def:'Pièce qui permet de contrôler la valeur.'}};

var REGLES={
 R1:{nom:'Ouverture de la période',texte:'La période « vie commune déclarée » s\'ouvre à la date du mariage enregistré.',niveau:'simule'},
 R2:{nom:'Rattachement dans la période',texte:'La date d\'effet d\'un rattachement d\'enfant ne peut pas précéder l\'ouverture de la période à laquelle il se rapporte.',niveau:'simule'},
 R3:{nom:'Période verrouillée',texte:'La date d\'ouverture d\'une période ne peut pas être modifiée directement tant qu\'une opération active s\'y rapporte.',niveau:'simule'},
 R4:{nom:'Concordance avec la pièce',texte:'Une date d\'événement corrigée doit concorder avec le justificatif de référence.',niveau:'simule'}};

var HABILITATIONS={
 H1:{nom:'Correction d\'un événement d\'état civil',def:'Habilitation fictive du scénario.'},
 H2:{nom:'Suspension et recréation d\'un rattachement',def:'Habilitation fictive du scénario.'},
 H3:{nom:'Validation d\'un plan de correction',def:'Habilitation fictive du scénario.'}};

function dossier(){return{
 id:'DOS-FICTIF-0001',titre:'Dossier familial fictif',version:1,
 objets:{
  'p-a':{type:'personne',nom:'Camille Morel',role:'Adulte A',niveau:'documente'},
  'p-b':{type:'personne',nom:'Jules Morel',role:'Adulte B',niveau:'documente'},
  'p-e':{type:'personne',nom:'Léon Morel',role:'Enfant',niveau:'documente'},
  'ev-mariage':{type:'evenement',nom:'Mariage',niveau:'documente',
   dates:{evenement:'2015-06-18',effet:'2015-06-18',saisie:'2016-07-04',modification:'2016-07-04',connaissance:'2016-06-30'},
   note:'Année enregistrée : 2015. L\'acte fictif indique 2016.'},
  'ev-naissance':{type:'evenement',nom:'Naissance de l\'enfant',niveau:'documente',
   dates:{evenement:'2017-03-04',effet:'2017-03-04',saisie:'2017-03-22',modification:'2017-03-22',connaissance:'2017-03-20'}},
  'd-mariage':{type:'document',nom:'Acte de mariage (fictif)',niveau:'documente',mentionne:{'ev-mariage':'2016-06-18'},recu:'2024-02-12'},
  'd-naissance':{type:'document',nom:'Acte de naissance (fictif)',niveau:'documente',mentionne:{'ev-naissance':'2017-03-04'},recu:'2017-03-20'},
  'r-couple':{type:'relation',genre:'familiale',nom:'Lien de couple A–B',niveau:'documente',depuis:'2015-06-18'},
  'r-fil-a':{type:'relation',genre:'familiale',nom:'Filiation enfant – A',niveau:'documente',depuis:'2017-03-04'},
  'r-fil-b':{type:'relation',genre:'familiale',nom:'Filiation enfant – B',niveau:'documente',depuis:'2017-03-04'},
  'per-foyer':{type:'periode',nom:'Période « vie commune déclarée »',niveau:'simule',debut:'2015-06-18',fin:null},
  'op-enreg':{type:'operation',nom:'Enregistrement du mariage',niveau:'documente',etat:'active',auteur:'Agent fictif 1',
   dates:{saisie:'2016-07-04',effet:'2015-06-18'}},
  'op-ratt':{type:'operation',nom:'Rattachement de l\'enfant au dossier familial',niveau:'documente',etat:'active',auteur:'Agent fictif 2',
   dates:{saisie:'2017-04-10',effet:'2017-04-01'},periode:'per-foyer',habilitation:'H2'},
  'r-ratt':{type:'relation',genre:'administrative',nom:'Rattachement administratif enfant – dossier',niveau:'documente',depuis:'2017-04-01'},
  'droit-f':{type:'droit',nom:'Droit familial (fictif)',niveau:'nonverifie',note:'Un droit social n\'est ni un lien familial ni un rattachement administratif.'},
  'adr':{type:'information',nom:'Adresse du foyer',niveau:'documente',valeur:'Adresse fictive'},
  'proc':{type:'procedure',nom:'Procédure du scénario : corriger une date d\'événement',niveau:'simule',regles:['R1','R2','R3','R4']},
  'hab-h2':{type:'autorisation',nom:'Habilitation H2',niveau:'simule'}},
 liens:[
  {id:'l1',de:'p-a',vers:'ev-mariage',type:'reference',pourquoi:'Adulte A est partie à l\'événement.',source:'d-mariage'},
  {id:'l2',de:'p-b',vers:'ev-mariage',type:'reference',pourquoi:'Adulte B est partie à l\'événement.',source:'d-mariage'},
  {id:'l3',de:'ev-mariage',vers:'r-couple',type:'reference',champ:'depuis',pourquoi:'Le lien de couple date de l\'événement.',source:'d-mariage',depuis:'2015-06-18'},
  {id:'l4',de:'ev-mariage',vers:'per-foyer',type:'dependance',regle:'R1',champ:'debut',pourquoi:'La période s\'ouvre à la date du mariage (R1).',source:'proc',depuis:'2015-06-18'},
  {id:'l5',de:'per-foyer',vers:'op-ratt',type:'contrainte',regle:'R3',pourquoi:'Le rattachement actif se rapporte à la période (R3).',source:'proc',depuis:'2017-04-10'},
  {id:'l6',de:'op-ratt',vers:'r-ratt',type:'dependance',pourquoi:'Le rattachement administratif est créé par l\'opération.',source:'op-ratt',depuis:'2017-04-01'},
  {id:'l7',de:'r-ratt',vers:'droit-f',type:'hypothese',pourquoi:'Le droit pourrait dépendre du rattachement : aucune règle documentée ne l\'établit ici.',source:null},
  {id:'l8',de:'d-mariage',vers:'ev-mariage',type:'preuve',regle:'R4',pourquoi:'L\'acte permet de contrôler la date.',source:'d-mariage',depuis:'2024-02-12'},
  {id:'l9',de:'d-naissance',vers:'ev-naissance',type:'preuve',pourquoi:'L\'acte justifie la naissance.',source:'d-naissance',depuis:'2017-03-20'},
  {id:'l10',de:'ev-naissance',vers:'r-fil-a',type:'reference',pourquoi:'La filiation découle de la naissance, pas du mariage.',source:'d-naissance',depuis:'2017-03-04'},
  {id:'l11',de:'ev-naissance',vers:'r-fil-b',type:'reference',pourquoi:'La filiation découle de la naissance, pas du mariage.',source:'d-naissance',depuis:'2017-03-04'},
  {id:'l12',de:'p-e',vers:'ev-naissance',type:'reference',pourquoi:'L\'enfant est l\'objet de l\'événement.',source:'d-naissance'},
  {id:'l13',de:'ev-mariage',vers:'ev-naissance',type:'chronologie',pourquoi:'Dates voisines. Aucune règle ne lie la naissance à la date du mariage.',source:null},
  {id:'l14',de:'hab-h2',vers:'op-ratt',type:'autorisation',pourquoi:'Suspendre puis recréer le rattachement demande l\'habilitation H2.',source:'proc'},
  {id:'l15',de:'p-e',vers:'r-ratt',type:'reference',pourquoi:'L\'enfant est l\'objet du rattachement.',source:'op-ratt'},
  {id:'l16',de:'op-enreg',vers:'ev-mariage',type:'reference',pourquoi:'L\'opération a enregistré la valeur actuelle.',source:'op-enreg'}],
 versions:[{v:1,date:'2017-04-10',note:'État enregistré (fictif)'}],
 observe:[{texte:'Une correction d\'année de mariage peut devenir difficile lorsqu\'un enfant est déjà rattaché au dossier : il faut parfois annuler, corriger, recréer puis revérifier.',niveau:'observe',source:'Difficulté rapportée par un professionnel. Circonstances, organisme et logiciel à confirmer.'}]}}

return{dossier:dossier,NIVEAUX:NIVEAUX,RELATIONS:RELATIONS,REGLES:REGLES,HABILITATIONS:HABILITATIONS};
});
