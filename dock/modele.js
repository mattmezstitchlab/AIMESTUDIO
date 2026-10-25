/* AIME · le Dock par rôle : le modèle, PUR, le même au navigateur et au serveur (référence : docs/DOCK.md).
   Un dock ne contient que ce que la personne a le droit d'ouvrir. Une entrée interdite n'est pas grisée : elle n'existe pas,
   et son nom ne figure nulle part dans la composition renvoyée.

   AIMEDock.composer(demande) → composition | null
     demande : { famille | roleServeur | instance, gestes?, notifications?, fin?, demonstration?, session? }
       - instance     : 'univers:angle' (ex. 'mariage:invite'), un dock écrit pour un rôle précis (docs/DOCK.md, « Les instances ») ;
       - famille      : une des 14 familles de docs/ROLES.md ;
       - roleServeur  : owner · editor · contributor · viewer · guest (space_members), ou absent pour le public ;
       - gestes       : les gestes réellement accordés (s'ils sont donnés, une action non accordée disparaît) ;
       - notifications: [{a:'moi'|autre}] ; la pastille ne compte que ce qui est à soi ;
       - fin          : date de fin d'un rôle temporaire (ISO) ; affichée « jusqu'au … » ;
       - ancien       : true pour un ancien membre (aucun dock).
     composition : { famille, nom, lieux:[{id,nom,icone}], plus:[{id,nom,geste,sensible}], inattendu, pastille, mention[], demonstration }
   AIMEDock.pourScenario(univers, role, acces) → la demande d'un rôle de scénario (instance, famille écrite, puis rôle serveur).
   AIMEDock.FAMILLES · AIMEDock.ENTREES · AIMEDock.INSTANCES · AIMEDock.SENSIBLES : les tables, lisibles et testées. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEDock=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* Le vocabulaire des entrées : un seul pour tout AIMESTUDIO. Un domaine peut renommer une entrée (nom), jamais en inventer une
   qui ne s'appuie sur aucun droit (droit). L'icône est un nom du jeu d'icônes du composant. */
var ENTREES={
 notifications:{nom:'Notifications',icone:'cloche',droit:'lire'},
 messages:{nom:'Messages',icone:'bulle',droit:'repondre'},
 projet:{nom:'Projet',icone:'projet',droit:'lire'},
 mapart:{nom:'Ma part',icone:'part',droit:'lire'},
 calendrier:{nom:'Agenda',icone:'calendrier',droit:'lire'},
 taches:{nom:'Tâches',icone:'coche',droit:'lire'},
 documents:{nom:'Documents',icone:'document',droit:'lire'},
 personnes:{nom:'Personnes',icone:'personnes',droit:'lire'},
 effectif:{nom:'Effectif',icone:'effectif',droit:'lire'},
 budget:{nom:'Budget',icone:'budget',droit:'lire'},
 deroule:{nom:'Déroulé',icone:'deroule',droit:'lire'},
 mission:{nom:'Mission',icone:'mission',droit:'lire'},
 programme:{nom:'Programme',icone:'deroule',droit:'lire'},
 mareponse:{nom:'Réponse',icone:'reponse',droit:'repondre'},
 lieu:{nom:'Lieu',icone:'lieu',droit:'lire'},
 journal:{nom:'Journal',icone:'journal',droit:'lire'},
 signalements:{nom:'Signalements',icone:'signal',droit:'lire'},
 consentements:{nom:'Consentements',icone:'consentement',droit:'lire'},
 reglages:{nom:'Réglages',icone:'reglages',droit:'transmettre'},
 equipe:{nom:'Équipe',icone:'personnes',droit:'lire'},
 planb:{nom:'Plan B',icone:'planb',droit:'modifier'},
 exports:{nom:'Exports',icone:'export',droit:'lire'},
 controle:{nom:'Ce qu\'il contrôle',icone:'controle',droit:'lire'},
 contenus:{nom:'Contenus publics',icone:'contenus',droit:'lire'},
 justificatifs:{nom:'Justificatifs',icone:'document',droit:'deposer'},
 budgetfinance:{nom:'Budget financé',icone:'budget',droit:'lire'},
 designation:{nom:'Ma désignation',icone:'consentement',droit:'lire'},
 /* le parcours public (la navigation du site, mise en dock) */
 coeur:{nom:'Le cœur',icone:'coeur',droit:'public',href:'/#coeur'},
 exemples:{nom:'Exemples',icone:'exemples',droit:'public',href:'/exemples/'},
 lab:{nom:'Lab',icone:'lab',droit:'public',href:'/lab/grande-partition/'},
 compte:{nom:'J\'ai un compte',icone:'compte',droit:'public',href:'/compte/'},
 /* connecté, hors projet : AI | + | ME (architecture de convergence, décision de Matt du 25/10).
    AI : mon environnement (demandes, projets, participations, activités), à /projets/ ; ME : ma Carte et mon compte, à /compte/.
    Les adresses restent celles d'avant ; « Exemples » et « Le cœur » quittent le Dock connecté (l'accueil, l'Atlas et AI y mènent). */
 ai:{nom:'AI',dit:'AI, mon environnement',icone:'projet',droit:'public',href:'/projets/'},
 me:{nom:'ME',dit:'ME, ma Carte',icone:'compte',droit:'public',href:'/compte/'}
};

/* Les gestes (docs/ROLES.md). Ceux-ci ne sont jamais à un toucher : confirmation lisible, une action à la fois, annulation. */
var SENSIBLES={payer:1,supprimer:1,inviter:1,publier:1,transmettre:1,annuler:1};

/* Les actions du +, chacune adossée à un geste. */
var ACTIONS={
 inviter:{nom:'Inviter',geste:'inviter'},
 ecrire:{nom:'Écrire',geste:'repondre'},
 tache:{nom:'Ajouter une tâche',geste:'modifier'},
 publier:{nom:'Publier',geste:'publier'},
 ecrireEquipe:{nom:'Écrire à l\'équipe',geste:'repondre'},
 modifierDeroule:{nom:'Modifier le déroulé',geste:'modifier'},
 planB:{nom:'Activer le plan B',geste:'modifier'},
 deposer:{nom:'Déposer un document',geste:'deposer'},
 retard:{nom:'Signaler un retard',geste:'repondre'},
 ecrireCoordination:{nom:'Écrire à la coordination',geste:'repondre'},
 confirmer:{nom:'Confirmer ma présence',geste:'repondre'},
 ecrireOrganisateurs:{nom:'Écrire aux organisateurs',geste:'repondre'},
 commencer:{nom:'Commencer',geste:'public',href:'/?commencer=1'},
 /* le + du public : des actions, jamais une destination du Dock (dock/plus.js les rend vivantes) */
 creerProjet:{nom:'Créer un projet',geste:'public',href:'/?commencer=1'},
 nouveauProjet:{nom:'Nouveau projet',geste:'public',href:'/projets/?nouveau=1'},
 invitationRecue:{nom:'J\'ai reçu une invitation',geste:'public'},
 /* le + de AI, une demande ouverte (compte/ai.js) : la confirmation suit, le serveur crée (POST /api/demandes { action: 'convertir' }) */
 projetDepuisDemande:{nom:'En faire un projet',geste:'public'},
 /* le + de ME (V1, P4, critère 2.10) : modifier ma Carte, ajouter une activité, la partager (compte/compte.js les rend vivants) */
 modifierCarte:{nom:'Modifier ma Carte',geste:'public'},
 ajouterActivite:{nom:'Ajouter une activité',geste:'public'},
 partagerCarte:{nom:'Partager ma Carte',geste:'public'},
 justificatif:{nom:'Déposer un justificatif',geste:'deposer'},
 ecrireProprietaire:{nom:'Écrire au propriétaire',geste:'repondre'},
 exporter:{nom:'Exporter',geste:'lire'},
 demanderPiece:{nom:'Demander une pièce',geste:'repondre'},
 masquer:{nom:'Masquer un contenu public',geste:'modifier'},
 repondreSignalement:{nom:'Répondre à un signalement',geste:'repondre'},
 repondrePour:{nom:'Répondre pour la personne représentée',geste:'repondre'},
 consentement:{nom:'Donner ou retirer un consentement',geste:'modifier'}
};

/* Le dock des 14 familles (docs/DOCK.md). lieux : 4 au plus, lus de gauche à droite, le + au centre. */
var FAMILLES={
 'Propriétaire':{lieux:['notifications','messages','projet','calendrier'],plus:['inviter','ecrire','tache','publier'],garde:'Transmettre et supprimer vivent dans Réglages, avec double validation.'},
 'Co-propriétaire':{lieux:['notifications','messages','projet','calendrier'],plus:['inviter','ecrire','tache','publier'],garde:'Ne retire pas l\'autre propriétaire seul ; aucune suppression sans les deux.'},
 'Délégué':{lieux:['notifications','deroule','equipe','planb'],plus:['ecrireEquipe','modifierDeroule','planB','inviter'],garde:'N\'invite qu\'à un rôle inférieur ou égal ; jamais transmettre.'},
 'Équipe':{lieux:['notifications','mapart','messages','calendrier'],plus:['tache','ecrire','deposer'],garde:'Aucun accès aux paiements par défaut.'},
 'Contributeur':{lieux:['notifications','mission','documents','messages'],plus:['deposer','retard','ecrireCoordination'],garde:'Effectifs seulement, jamais la liste nominative.'},
 'Destinataire':{lieux:['programme','mareponse','lieu','messages'],plus:['confirmer','ecrireOrganisateurs'],garde:'Ne voit que sa propre réponse ; aucun compteur de ce qui existe ailleurs.'},
 'Public':{lieux:['ai','me'],plus:['creerProjet','invitationRecue'],garde:'Aucune donnée personnelle.',public:true},   /* AI · + · ME partout (décision de Matt, 25/10/2026) : sans compte, AI et ME mènent à la connexion */
 'Public connecté':{lieux:['ai','me'],plus:['nouveauProjet','invitationRecue'],garde:'Aucune donnée d\'un projet hors du projet.',public:true},
 'Financeur':{lieux:['notifications','budgetfinance','justificatifs'],plus:['justificatif','ecrireProprietaire'],garde:'Voit des montants, pas les invités.'},
 'Contrôleur':{lieux:['controle','exports','journal'],plus:['exporter','demanderPiece'],garde:'Lecture seule ; affiche « accès jusqu\'au … ».'},
 'Garant':{lieux:['signalements','contenus','journal'],plus:['masquer','repondreSignalement'],garde:'N\'accède pas aux contenus privés par confort.'},
 'Représentant légal':{lieux:['programme','mareponse','lieu','consentements'],plus:['repondrePour','consentement'],garde:'Toujours deux noms : qui agit, pour qui.'},
 'Successeur':{lieux:['designation'],plus:[],garde:'Activé par une procédure, jamais par un lien.'},
 'Agent IA':{aucun:true,garde:'Pas de dock : vit dans le + de sa personne, « proposé par l\'orbe ».'},
 'Système':{aucun:true,garde:'Pas de dock : apparaît seulement au Journal.'}
};

/* Rôle serveur (space_members) → famille. Le rôle serveur reste la source ; la famille choisit le dock. */
var SERVEUR={owner:'Propriétaire',editor:'Délégué',contributor:'Contributeur',viewer:'Contrôleur',guest:'Destinataire'};

/* Les gestes par défaut d'une famille (docs/ROLES.md). Utilisés quand les gestes réels ne sont pas fournis. */
var GESTES={
 'Propriétaire':['lire','repondre','deposer','modifier','inviter','payer','publier','supprimer','transmettre'],
 'Co-propriétaire':['lire','repondre','deposer','modifier','inviter','payer','publier'],
 'Délégué':['lire','repondre','deposer','modifier','inviter'],
 'Équipe':['lire','repondre','deposer','modifier'],
 'Contributeur':['lire','repondre','deposer','annuler'],
 'Destinataire':['lire','repondre'],
 'Public':['public'],
 'Public connecté':['public'],
 'Financeur':['lire','repondre','deposer'],
 'Contrôleur':['lire','repondre'],
 'Garant':['lire','repondre','modifier'],
 'Représentant légal':['lire','repondre','modifier'],
 'Successeur':['lire']
};

/* Les instances : un rôle précis prend le dock de sa famille, avec ses mots à lui (docs/DOCK.md, « Les instances »).
   lieux : [id] ou [id, nom renommé] ; une entrée propre (ex. « Surprise ») porte son droit. */
function L(id,nom,icone,droit){return{id:id,nom:nom,icone:icone,droit:droit}}
var INSTANCES={
 /* Le mariage de démonstration (Léa & Marc) */
 'mariage:couple':{famille:'Propriétaire',nom:'La mariée',lieux:['notifications','messages','projet','calendrier'],plus:[['inviter'],['ecrire','Écrire'],['tache']]},
 'mariage:marie':{famille:'Co-propriétaire',nom:'Le marié',lieux:['notifications','messages','projet','calendrier'],plus:[['inviter'],['ecrire','Écrire'],['tache']]},
 'mariage:temoin':{famille:'Équipe',nom:'Le témoin',lieux:['notifications','mapart','messages',L('surprise','Surprise','cadeau','lire')],plus:[['tache'],['ecrire','Écrire aux témoins']]},
 'mariage:invite':{famille:'Destinataire',nom:'L\'invitée',lieux:['programme','mareponse','lieu','messages'],plus:[['confirmer'],['ecrireOrganisateurs','Écrire aux mariés']]},
 'mariage:coordinateur':{famille:'Délégué',nom:'La coordination',lieux:['notifications','deroule','equipe','planb'],plus:[['modifierDeroule'],['planB'],[{id:'remplacant',nom:'Valider un remplaçant',geste:'modifier'}]]},
 'mariage:traiteur':{famille:'Contributeur',nom:'Le traiteur',lieux:['notifications','mission','effectif','documents'],plus:[['retard'],['deposer']]},
 'mariage:prestataire':{famille:'Contributeur',nom:'Le photographe',lieux:['notifications','mission',L('acces','Accès','lieu','lire'),'documents'],plus:[['retard'],[{id:'annulerPrestation',nom:'Annuler la prestation',geste:'annuler'}]]},
 'mariage:dj':{famille:'Contributeur',nom:'Le DJ',lieux:['notifications','mission',L('horaires','Horaires','calendrier','lire'),'documents'],plus:[['retard'],[{id:'playlist',nom:'Déposer la playlist',geste:'deposer'}]]},
 'mariage:parents':{famille:'Financeur',nom:'Les parents qui participent',lieux:['notifications','budgetfinance','justificatifs'],plus:[['justificatif']]},
 /* La Régie (propriétaire du site) */
 'regie:proprietaire':{famille:'Propriétaire',lieux:[L('pages','Pages','projet','lire'),L('realisations','Réalisations','contenus','lire'),L('orbe','Orbe','coeur','modifier'),L('entreprise','Entreprise','budget','lire')],plus:[['publier'],[{id:'restaurer',nom:'Restaurer',geste:'modifier'}],[{id:'realisation',nom:'Ajouter une réalisation',geste:'modifier'}]]},
 'regie:collaborateur':{famille:'Délégué',lieux:[L('realisations','Réalisations','contenus','lire'),L('textes','Textes','document','lire'),L('medias','Médias','exemples','lire')],plus:[[{id:'proposer',nom:'Proposer une modification',geste:'modifier'}],[{id:'media',nom:'Déposer un média',geste:'deposer'}]]},
 'regie:comptable':{famille:'Contrôleur',lieux:[L('comptabilite','Comptabilité','budget','lire'),'exports'],plus:[['exporter']]},
 'regie:client':{famille:'Destinataire',lieux:[L('devis','Mon devis','document','lire'),L('facture','Ma facture','budget','lire')],plus:[[{id:'accepter',nom:'Accepter le devis',geste:'repondre'}],['ecrire','Écrire']]},
 'regie:visiteur':{famille:'Public'},
 'regie:orbe':{famille:'Agent IA'},
 /* Le Studio */
 'studio:auteur':{famille:'Propriétaire',lieux:[L('supports','Supports','contenus','lire'),'messages','projet','calendrier'],plus:[[{id:'support',nom:'Créer un support',geste:'modifier'}],[{id:'relecture',nom:'Envoyer en relecture',geste:'repondre'}],[{id:'bat',nom:'Envoyer le bon à tirer',geste:'publier'}]]},
 'studio:client':{famille:'Propriétaire',nom:'Client commanditaire',lieux:[L('bat','Bon à tirer','document','lire'),'messages'],plus:[[{id:'valider',nom:'Valider le bon à tirer',geste:'publier'}],[{id:'correction',nom:'Demander une correction',geste:'repondre'}]]},
 'studio:relecteur':{famille:'Contrôleur',lieux:[L('arelire','À relire','controle','lire'),'journal'],plus:[[{id:'annoter',nom:'Annoter',geste:'repondre'}]]},
 'studio:imprimeur':{famille:'Contributeur',lieux:[L('fichiers','Fichiers','document','lire'),L('quantites','Quantités','effectif','lire')],plus:[[{id:'imprime',nom:'Confirmer l\'impression',geste:'repondre'}],[{id:'probleme',nom:'Signaler un problème',geste:'repondre'}]]},
 'studio:destinataire':{famille:'Destinataire',lieux:[L('monsupport','Mon support','document','lire')],plus:[]},
 'studio:badgee':{famille:'Destinataire',lieux:[L('pointages','Mes pointages','coche','lire')],plus:[[{id:'pointer',nom:'Pointer',geste:'repondre'}]]},
 'studio:pointages':{famille:'Délégué',lieux:[L('pointagesgroupe','Pointages du groupe','coche','lire'),'exports'],plus:[['exporter']]},
 'studio:avis':{famille:'Destinataire',lieux:[L('monavis','Mon avis','reponse','lire')],plus:[[{id:'avis',nom:'Déposer un avis',geste:'repondre'}]]},
 'studio:ia':{famille:'Agent IA'},
 /* Familles proposées pour les exemples sans dock écrit (à confirmer, voir docs/DOCK.md) */
 'g44:agent':{famille:'Équipe',propose:true},
 'g44:formateur':{famille:'Équipe',propose:true},
 'g44:responsable':{famille:'Délégué',propose:true},
 'g44:controleur':{famille:'Contrôleur',propose:true},
 'stitch:creatrice':{famille:'Propriétaire',propose:true},
 'stitch:boutique':{famille:'Délégué',propose:true},
 'stitch:brodeuse':{famille:'Destinataire',propose:true},
 'stitch:visiteuse':{famille:'Public',propose:true},
 'magazine:autrice':{famille:'Équipe',propose:true},
 'magazine:chef':{famille:'Propriétaire',propose:true},
 'magazine:maquettiste':{famille:'Contributeur',propose:true},
 'magazine:lectrice':{famille:'Public',propose:true}
};

var MAX_LIEUX=4,MAX_PLUS=4;

/* « Délégué » et « Destinataire et valideur » : une famille écrite dans un scénario se ramène à l'une des 14. */
function familleDe(nom){if(!nom)return null;if(FAMILLES[nom])return nom;
 var n=String(nom).toLowerCase();for(var k in FAMILLES)if(n.indexOf(k.toLowerCase())===0)return k;return null}

function lieu(x){
 if(typeof x==='string'){var e=ENTREES[x];if(!e)throw new Error('entrée inconnue : '+x);return{id:x,nom:e.nom,dit:e.dit||null,icone:e.icone,droit:e.droit,href:e.href||null}}
 if(!x||!x.id||!x.nom||!x.droit)throw new Error('entrée propre incomplète');return{id:x.id,nom:x.nom,icone:x.icone||'projet',droit:x.droit,href:x.href||null}}
function action(x){
 var base=typeof x[0]==='string'?ACTIONS[x[0]]:x[0];if(!base)throw new Error('action inconnue : '+x[0]);
 var id=typeof x[0]==='string'?x[0]:base.id;return{id:id,nom:x[1]||base.nom,geste:base.geste,href:base.href||null}}

function composer(d){
 d=d||{};if(d.ancien)return null;
 var inst=d.instance?INSTANCES[d.instance]:null;
 if(d.instance&&!inst)throw new Error('instance inconnue : '+d.instance);
 var fam=(inst&&inst.famille)||familleDe(d.famille)||(d.roleServeur?SERVEUR[d.roleServeur]:null)||'Public';
 var F=FAMILLES[fam];if(!F)throw new Error('famille inconnue : '+fam);if(F.aucun)return null;
 var gestes=d.gestes||GESTES[fam]||[],permis=function(g){return g==='public'||gestes.indexOf(g)>=0};
 var lieux=((inst&&inst.lieux)||F.lieux).map(lieu).filter(function(e){return permis(e.droit)});
 if(lieux.length>MAX_LIEUX)lieux=lieux.slice(0,MAX_LIEUX);
 var plus=((inst&&inst.plus)||F.plus.map(function(id){return[id]})).map(action).filter(function(a){return permis(a.geste)}).slice(0,MAX_PLUS)
  .map(function(a){a.sensible=!!SENSIBLES[a.geste];return a});
 var notes=(d.notifications||[]).filter(function(n){return n&&n.a==='moi'}).length;
 var mention=[];
 if(d.demonstration!==false&&!F.public)mention.push('Démonstration');
 if(d.fin){var f=new Date(d.fin);if(!isNaN(f))mention.push((fam==='Contrôleur'?'Accès':'Rôle')+' jusqu\'au '+f.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}))}
 if(inst&&inst.propose)mention.push('Famille proposée');
 return{famille:fam,nom:(inst&&inst.nom)||d.nom||fam,lieux:lieux.map(function(e){var x={id:e.id,nom:e.nom,icone:e.icone,href:e.href};if(e.dit)x.dit=e.dit;return x}),
  plus:plus,inattendu:!F.public&&d.session!==false,pastille:F.public?0:notes,mention:mention,garde:F.garde,public:!!F.public};
}

/* Un rôle de scénario (vitrine/scenarios) → sa demande de dock : instance écrite, sinon famille du scénario, sinon rôle serveur. */
function pourScenario(univers,role,acces){
 role=role||{};var k=univers+':'+role.angle;
 if(INSTANCES[k])return{instance:k};
 if(role.famille&&familleDe(role.famille))return{famille:familleDe(role.famille),nom:role.nom};
 var rs=acces&&acces.membres&&role.qui?acces.membres[role.qui]:null;
 if(rs)return{roleServeur:rs,nom:role.nom};
 return{famille:'Public',nom:role.nom};
}

/* ---------- Le dock d'un vrai espace (docs/GABARITS.md § 4 et § 7) ----------
   Chaque lieu ouvre l'un des sept gabarits. Un domaine renomme un lieu, il n'en invente pas. */
var GABARIT_DE={
 ai:null,me:null,
 mareponse:'acces',acces:'acces',monavis:'acces',consentements:'acces',reglages:'acces',compte:'acces',
 notifications:'journal',journal:'journal',signalements:'journal',controle:'journal',
 personnes:'personnes',equipe:'personnes',effectif:'personnes',designation:'personnes',
 projet:'projet',mapart:'projet',mission:'projet',surprise:'projet',realisations:'projet',pages:'projet',textes:'projet',medias:'projet',contenus:'projet',supports:'projet',monsupport:'projet',entreprise:'projet',
 calendrier:'deroule',programme:'deroule',deroule:'deroule',horaires:'deroule',planb:'deroule',taches:'deroule',quantites:'deroule',pointages:'deroule',pointagesgroupe:'deroule',lieu:'deroule',
 documents:'documents',justificatifs:'documents',devis:'documents',facture:'documents',bat:'documents',arelire:'documents',fichiers:'documents',exports:'documents',comptabilite:'documents',budget:'documents',budgetfinance:'documents',
 messages:'messages',
 orbe:null,coeur:null,exemples:null,lab:null   /* l'Orbe n'est pas un lieu ; la navigation publique est hors gabarit */
};
var NOM_GABARIT={acces:'Mon accès',journal:'Journal',personnes:'Personnes',projet:'Projet',deroule:'Programme',documents:'Documents',messages:'Messages'};
var ICONE_GABARIT={acces:'consentement',journal:'journal',personnes:'personnes',projet:'projet',deroule:'deroule',documents:'document',messages:'bulle'};

/* composerReel(demande) : le dock d'une personne dans un vrai espace. Les droits ne viennent JAMAIS de la table par défaut :
   demande.gestes est obligatoire et calculé par le serveur avec synchroview/permissions.js
   ({ lire, inviter: [rôles], signaler }). demande.servis : les gabarits que le serveur sait composer pour ce projet.
   Un lieu dont le gabarit n'est pas servi n'existe pas ; « Mon accès » est toujours là (il ne se masque jamais) ;
   chaque page servie a son lieu (demande.servis vient de pagesDe() : la page et le Dock suivent la même règle). */
function composerReel(d){
 d=d||{};if(d.ancien)return null;
 var g=d.gestes;if(!g||typeof g!=='object'||!Array.isArray(g.inviter))throw new Error('gestes calculés par le serveur requis');
 if(!g.lire)return null;
 var servis=d.servis||[],inst=d.instance?INSTANCES[d.instance]:null;
 if(d.instance&&!inst)throw new Error('instance inconnue : '+d.instance);
 var fam=(inst&&inst.famille)||familleDe(d.famille)||(d.roleServeur?SERVEUR[d.roleServeur]:null);
 if(!fam)throw new Error('rôle inconnu');var F=FAMILLES[fam];if(!F||F.aucun)return null;
 var vus={},lieux=[];
 function poser(id,nom,icone,gab){if(vus[gab]||servis.indexOf(gab)<0)return;vus[gab]=1;lieux.push({id:id,nom:nom,icone:icone,gabarit:gab,href:null})}
 poser('acces',NOM_GABARIT.acces,ICONE_GABARIT.acces,'acces');
 /* dans un vrai projet, un lieu porte le nom de la page servie (Journal, Personnes…), pas le mot de la démonstration */
 ((inst&&inst.lieux)||F.lieux||[]).map(lieu).forEach(function(e){var gab=GABARIT_DE[e.id];if(!gab)return;if(gab==='acces')return;poser(e.id,NOM_GABARIT[gab]||e.nom,e.icone,gab)});
 /* toute page que le serveur sert à ce rôle a sa place dans le Dock (la même règle décide de la page et du lieu : pagesDe, api/_auth/pages.mjs) */
 servis.forEach(function(gab){if(ICONE_GABARIT[gab])poser(gab,NOM_GABARIT[gab]||gab,ICONE_GABARIT[gab],gab)});
 lieux=lieux.slice(0,MAX_LIEUX);
 /* le même ordre pour tous les rôles : celui des pages servies (le registre des modules), Mon accès en tête ; le choix des lieux ne change pas */
 lieux.sort(function(a,b){return servis.indexOf(a.gabarit)-servis.indexOf(b.gabarit)});
 var plus=[];
 if(g.inviter.length&&vus.personnes)plus.push({id:'inviter',nom:'Inviter',geste:'inviter',sensible:true,roles:g.inviter.slice(),gabarit:'personnes'});
 /* prendre un engagement (V1, P6) : dans « Mon accès », seulement si permissions.js l'accorde à ce rôle */
 if(g.engager&&vus.acces)plus.push({id:'engagement',nom:'Prendre un engagement',geste:'engagement',sensible:false,gabarit:'acces'});
 var notes=(d.notifications||[]).filter(function(n){return n&&n.a==='moi'}).length;
 var mention=[];if(d.fin){var f=new Date(d.fin);if(!isNaN(f))mention.push((fam==='Contrôleur'?'Accès':'Rôle')+' jusqu\'au '+f.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}))}
 return{famille:fam,nom:(inst&&inst.nom)||d.nom||fam,lieux:lieux,plus:plus,inattendu:!!g.signaler,pastille:vus.journal?notes:0,mention:mention,garde:F.garde,public:false,reel:true};
}

/* Tous les mots qu'une composition expose : utile pour vérifier qu'aucun nom d'entrée interdite n'y figure, même en texte. */
function mots(c){if(!c)return'';return JSON.stringify(c)}

return{GABARIT_DE:GABARIT_DE,NOM_GABARIT:NOM_GABARIT,composerReel:composerReel,ENTREES:ENTREES,ACTIONS:ACTIONS,FAMILLES:FAMILLES,SERVEUR:SERVEUR,GESTES:GESTES,INSTANCES:INSTANCES,SENSIBLES:SENSIBLES,
 MAX_LIEUX:MAX_LIEUX,MAX_PLUS:MAX_PLUS,composer:composer,pourScenario:pourScenario,familleDe:familleDe,mots:mots};
});
