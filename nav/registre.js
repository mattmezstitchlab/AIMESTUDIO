/* AIME · le registre de navigation, UNE fois pour tout le site.
   Le menu Explorer, le Bureau et la Page Zéro le lisent ; aucune autre liste de liens ne doit exister.
   Chaque entrée dit ce qu'elle est (rôle) et où elle en est (statut). Le statut est une information, jamais un droit :
   l'accès réel se décide côté serveur, quand il y en a un.
     rôle   : travailler (le Bureau) · decouvrir (présentation) · realiser (une application, une tâche) · experimenter (Lab)
     statut : disponible · demonstration (données fictives) · experimental (peut changer ou casser)
   interne : un démonstrateur de recherche (identités fictives) que la navigation publique ne propose pas ;
   il reste listé ici (la Régie le voit) ; sa page est servie mais seulement masquée dans le navigateur, et ses routes /api/sv/* sont fermées au serveur en production (sauf au propriétaire du site). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMENav=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var STATUTS={disponible:'Disponible',demonstration:'Démonstration',experimental:'Expérimental'};
var ROLES={travailler:'Travailler',decouvrir:'Découvrir',realiser:'Réaliser',experimenter:'Expérimenter'};
var CATS=[
 {id:'monde',t:'Le monde AIME',d:'Travailler, découvrir, tout ce qui relie.'},
 {id:'evenements',t:'Événements',d:'Une information écrite une fois, vue par chacun.'},
 {id:'institutions',t:'Institutions',d:'Comprendre avant d\'agir.'},
 {id:'creation',t:'Création',d:'Un contenu, tous vos supports.'},
 {id:'jeux',t:'Jeux et Lab',d:'Des règles simples, des essais en cours.'}];
/* id, nom, adresse, phrase, catégorie, rôle, statut, nouveau? */
var E=[
 ['projets','Mes projets','/projets/','Vos projets, vos invitations : l\'entrée de la personne connectée','monde','travailler','disponible',true],
 ['bureau','Mon Bureau','/bureau/','AIME OS : vos outils, une orbe, une recherche','monde','realiser','disponible',true],
 ['compte','Mon compte','/compte/','Mes espaces partagés, mes invitations, mes clés d\'accès','monde','realiser','experimental',true],
 ['zero','Page Zéro','/','Tout commence par une intention','monde','decouvrir','disponible'],
 ['tout','Tout voir','/tout/','Les quatre écrans d\'un projet côte à côte : un outil de contrôle (Régie)','monde','decouvrir','disponible',false,true],
 ['capacites','Atlas des capacités','/capacites/','Tout ce qui peut servir au site : 1 191 modules, 130 dépôts, leur état','monde','decouvrir','experimental',true],
 ['exemples','Les exemples','/exemples/','Un seul projet, chacun son écran : mariage, mariage à distance, séminaire','evenements','decouvrir','demonstration',true],
 ['world','AIME WORLD','/vitrine/world/','Paris · New York, six perspectives','evenements','decouvrir','demonstration'],
 ['live','AIME Live','/live/','Le jour J en direct : un retard, une annonce, chacun le voit','evenements','realiser','demonstration',true],
 ['synchroview','SynchroView','/synchroview/','Comparer les perspectives côte à côte','evenements','realiser','demonstration',false,true],
 ['mariage','Mariage Léa & Marc','/vitrine/site/?u=mariage','Démonstrateur, données fictives','evenements','decouvrir','demonstration'],
 ['seminaire','Séminaire Maison Orée','/vitrine/site/?u=seminaire','Démonstrateur, entreprise fictive','evenements','decouvrir','demonstration'],
 ['g44','G44 LAB','/g44/','Le laboratoire des dépendances administratives','institutions','realiser','demonstration',true],
 ['canevas','Le Canevas','/canevas/','Le plan de travail commun : modifier un mini-site, un cube, un patron','creation','realiser','experimental',true],
 ['sites','Canevas universel · Site','/sites/','Composer un site sur trois panneaux : pages et blocs, rendu réel, inspecteur (Design System, sources)','creation','realiser','disponible'],
 ['studio','Le Studio','/studio/','Le studio complet : tous vos supports','creation','realiser','disponible'],
 ['stitch','AIME Stitch','/stitch/','Patrons de point de croix vivants','creation','realiser','disponible',true],
 ['stitchlab','Atelier Broderie','/stitchlab/','Le studio, côté broderie','creation','realiser','disponible'],
 ['web','Atelier Web','/web/','Le studio, côté web','creation','realiser','disponible'],
 ['buro','Atelier Documents','/buro/','Le studio, côté documents','creation','realiser','disponible'],
 ['accessibilite','Atelier Accessibilité','/accessibilite/','Le studio, côté accessibilité','creation','realiser','disponible'],
 ['image','Atelier Image','/image/','Le studio, côté image','creation','realiser','disponible'],
 ['infinity','AIME INFINITY','/infinity/','Le jeu de l\'onde','jeux','realiser','experimental',true],
 ['aime','Lab · Le Monde AIME','/aime/','L\'ancienne grande présentation, le cube, l\'orbe','jeux','experimenter','experimental'],
 ['orb','Lab · AIME ORB','/lab/orb/','L\'orbe, son terrain de jeu','jeux','experimenter','experimental'],
 ['infinity-lab','Lab · INFINITY','/infinity/lab/','Les règles du jeu, en essai','jeux','experimenter','experimental'],
 ['sante','Système nerveux','/sante/','Comprendre les parcours et les connexions','jeux','experimenter','experimental',true],
 ['reseau','Lab · Le Réseau','/reseau/','Découvrir, garder et réutiliser des facettes vivantes (données locales)','jeux','experimenter','demonstration'],
 ['cartes','Lab · Trois cartes','/lab/cartes/','Les trois modèles de carte, côte à côte','jeux','experimenter','demonstration',true]
].map(function(x){return{id:x[0],nom:x[1],href:x[2],phrase:x[3],cat:x[4],role:x[5],statut:x[6],nouveau:!!x[7],interne:!!x[8]}});

function entree(id){for(var i=0;i<E.length;i++)if(E[i].id===id)return E[i];return null}
function par(champ,val){return E.filter(function(e){return e[champ]===val})}
function categories(){return CATS.map(function(c){return{id:c.id,t:c.t,d:c.d,l:par('cat',c.id)}})}
/* la navigation publique : sans les démonstrateurs internes, sauf pour le propriétaire (droit décidé par le serveur) */
function publiques(proprietaire){return E.filter(function(e){return proprietaire||!e.interne})}
function categoriesPubliques(proprietaire){return CATS.map(function(c){return{id:c.id,t:c.t,d:c.d,l:publiques(proprietaire).filter(function(e){return e.cat===c.id})}})}
return{STATUTS:STATUTS,ROLES:ROLES,CATS:CATS,ENTREES:E,entree:entree,par:par,categories:categories,publiques:publiques,categoriesPubliques:categoriesPubliques};
});
