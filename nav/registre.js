/* AIME · le registre de navigation, UNE fois pour tout le site.
   Le menu Explorer, le Bureau et la Page Zéro le lisent ; aucune autre liste de liens ne doit exister.
   Chaque entrée dit ce qu'elle est (rôle) et où elle en est (statut). Le statut est une information, jamais un droit :
   l'accès réel se décide côté serveur, quand il y en a un.
     rôle   : travailler (le Bureau) · decouvrir (présentation) · realiser (une application, une tâche) · experimenter (Lab)
     statut : disponible · demonstration (données fictives) · experimental (peut changer ou casser) */
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
 ['bureau','Mon Bureau','/bureau/','AIME OS : toutes les apps, une orbe, une recherche','monde','travailler','disponible',true],
 ['zero','Page Zéro','/','Tout commence par une intention','monde','decouvrir','disponible'],
 ['aime','Le Monde AIME','/aime/','La grande présentation, le cube, l\'orbe','monde','decouvrir','disponible'],
 ['tout','Tout voir','/tout/','Toutes les vues d\'un coup','monde','decouvrir','disponible'],
 ['world','AIME WORLD','/vitrine/world/','Paris · New York, six perspectives','evenements','decouvrir','demonstration'],
 ['synchroview','SynchroView','/synchroview/','Comparer les perspectives côte à côte','evenements','realiser','demonstration'],
 ['mariage','Mariage Léa & Marc','/vitrine/site/?u=mariage','Démonstrateur, données fictives','evenements','decouvrir','demonstration'],
 ['seminaire','Séminaire Maison Orée','/vitrine/site/?u=seminaire','Démonstrateur, entreprise fictive','evenements','decouvrir','demonstration'],
 ['timeline','Timeline Jour J','/v1/','L\'ancienne application de planning, conservée','evenements','realiser','disponible'],
 ['g44','G44 LAB','/g44/','Le laboratoire des dépendances administratives','institutions','realiser','demonstration',true],
 ['sites','Générateur de site','/sites/','Composer un site complet, page par page','creation','realiser','disponible',true],
 ['studio','Le Studio','/studio/','Le studio complet : tous vos supports','creation','realiser','disponible'],
 ['stitch','AIME Stitch','/stitch/','Patrons de point de croix vivants','creation','realiser','disponible',true],
 ['stitchlab','Atelier Broderie','/stitchlab/','Le studio, côté broderie','creation','realiser','disponible'],
 ['web','Atelier Web','/web/','Le studio, côté web','creation','realiser','disponible'],
 ['buro','Atelier Documents','/buro/','Le studio, côté documents','creation','realiser','disponible'],
 ['accessibilite','Atelier Accessibilité','/accessibilite/','Le studio, côté accessibilité','creation','realiser','disponible'],
 ['image','Atelier Image','/image/','Le studio, côté image','creation','realiser','disponible'],
 ['infinity','AIME INFINITY','/infinity/','Le jeu de l\'onde','jeux','realiser','experimental',true],
 ['orb','Lab · AIME ORB','/lab/orb/','L\'orbe, son terrain de jeu','jeux','experimenter','experimental'],
 ['infinity-lab','Lab · INFINITY','/infinity/lab/','Les règles du jeu, en essai','jeux','experimenter','experimental'],
 ['sante','Système nerveux','/sante/','Comprendre les parcours et les connexions','jeux','experimenter','experimental',true],
 ['cartes','Lab · Trois cartes','/lab/cartes/','Les trois modèles de carte, côte à côte','jeux','experimenter','experimental',true]
].map(function(x){return{id:x[0],nom:x[1],href:x[2],phrase:x[3],cat:x[4],role:x[5],statut:x[6],nouveau:!!x[7]}});
function entree(id){for(var i=0;i<E.length;i++)if(E[i].id===id)return E[i];return null}
function par(champ,val){return E.filter(function(e){return e[champ]===val})}
function categories(){return CATS.map(function(c){return{id:c.id,t:c.t,d:c.d,l:par('cat',c.id)}})}
return{STATUTS:STATUTS,ROLES:ROLES,CATS:CATS,ENTREES:E,entree:entree,par:par,categories:categories};
});
