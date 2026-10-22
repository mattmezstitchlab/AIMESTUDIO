/* AIME · le cube-personne : UN modèle, indépendant de ses affichages.
   Le Monde AIME (cartes postales), puis le Bureau, le dock, le Canevas et le Réseau liront cette même configuration :
   aucun d'eux ne garde son propre cube.

   Six facettes : identité, médias, temps, relations, documents, activités et projets. Chacune peut rester vide ou partielle.
   Une facette suit le trajet d'une carte postale : vide → écrite → timbrée → posée (elle compose alors le cube).
   Tout est privé par défaut ; seule une facette explicitement publiée pourra être montrée au Réseau.
   Le nom et le timbre ne sont PAS copiés ici : ils restent ceux du compte (Better Auth + timbre existant).
   L'orbe a des préférences (apparence, comportement…) qui ne donnent JAMAIS de droits : ses permissions sont à part
   et aucune préférence ne les modifie.

   Pur (sans DOM), testé sous node. Persistance : AIMECube.aGarder / relire (JSON versionné). */
(function(racine,f){var M=f();if(typeof module==='object'&&module.exports)module.exports=M;else racine.AIMECube=M})(typeof self!=='undefined'?self:this,function(){'use strict';

var V=1;
/* face : l'indice de la face du cube de la grande page (#cube2) qui reçoit la facette.
   blocs : les blocs Métamorphose qui composeront la face dans le Canevas (lot suivant) ; rien n'est inventé ici. */
var FACETTES=[
 {id:'identite',nom:'Identité',face:0,teinte:['#C4B5FD','#7C5CFF','#3B0764'],dit:'Qui vous êtes, en quelques mots.',blocs:['timbre','orbe','texte'],
  champs:[{k:'phrase',l:'Une phrase qui me ressemble',max:90},{k:'intention',l:'Ce que je viens créer ici',max:60}]},
 {id:'medias',nom:'Médias',face:5,teinte:['#FDBA74','#FB7185','#4C1D95'],dit:'Ce que vous montrez : images, sons, vidéos.',blocs:['galerie','media','citation'],
  champs:[{k:'titre',l:'Le média qui me représente',max:60},{k:'nature',l:'Sa nature',choix:['Photo','Vidéo','Musique','Dessin','Texte']}]},
 {id:'temps',nom:'Temps',face:1,teinte:['#A5F3FC','#22D3EE','#1E3A8A'],dit:'Vos moments et votre rythme.',blocs:['agenda','programme'],
  champs:[{k:'moment',l:'Un moment qui compte',max:50},{k:'rythme',l:'Mon rythme',choix:['Le matin','Le soir','Le week-end','Au fil de l\'eau']}]},
 {id:'relations',nom:'Relations',face:3,teinte:['#FBCFE8','#FB7185','#7C2D52'],dit:'Les cercles que vous reliez.',blocs:['contact','reseaux','livre'],
  champs:[{k:'cercle',l:'Le cercle à relier',choix:['Famille','Amis','Collègues','Communauté']},{k:'partage',l:'Ce que nous partageons',max:60}]},
 {id:'documents',nom:'Documents',face:4,teinte:['#E0E7FF','#6366F1','#111827'],dit:'Ce que vous voulez garder en ordre.',blocs:['documents','faq'],
  champs:[{k:'besoin',l:'À garder en ordre',choix:['Contrats','Factures','Souvenirs','Démarches']},{k:'note',l:'Une note pour moi',max:60}]},
 {id:'activites',nom:'Activités & projets',face:2,teinte:['#FDE68A','#F59E0B','#9A3412'],dit:'Ce que vous faites et préparez.',blocs:['programme','lieu','bouton'],
  champs:[{k:'projet',l:'Un projet en cours',max:60},{k:'etape',l:'Où j\'en suis',choix:['Une idée','En cours','Presque fini']}]}];
var IDS=FACETTES.map(function(f){return f.id});
var ETATS=['vide','ecrite','timbree','posee'];
/* l'orbe : des préférences, pas des droits */
var ORBE={apparence:['irisee','calme','lumineuse'],couleurs:['aime','froides','chaudes'],comportement:['discrete','presente'],animation:['vivante','sobre','immobile'],
 autonomie:['attend','propose','prepare'],interaction:['toucher','ecrit','voix'],explications:['toujours','sur-demande']};
var ORBE0={apparence:'irisee',couleurs:'aime',comportement:'discrete',animation:'vivante',autonomie:'attend',interaction:'toucher',explications:'toujours'};

function facette(id){for(var i=0;i<FACETTES.length;i++)if(FACETTES[i].id===id)return FACETTES[i];return null}
function copie(o){return JSON.parse(JSON.stringify(o))}
function vide(proprietaire){var c={v:V,proprietaire:String(proprietaire||'invite').slice(0,80),facettes:{},orbe:copie(ORBE0),
  /* les droits de l'orbe : le contexte autorisé, rien de plus. Vides par défaut ; une préférence ne les touche jamais. */
  droitsOrbe:[]};
 IDS.forEach(function(id){c.facettes[id]={etat:'vide',champs:{},visibilite:'prive',le:null}});return c}

function propre(f,champs){var d=facette(f),o={};if(!d||!champs||typeof champs!=='object')return o;
 d.champs.forEach(function(c){var v=champs[c.k];if(v==null)return;v=String(v).replace(/\s+/g,' ').trim();if(!v)return;
  if(c.choix){if(c.choix.indexOf(v)>=0)o[c.k]=v}else o[c.k]=v.slice(0,c.max||80)});return o}
function nbChamps(f){return Object.keys(f.champs||{}).length}
/* écrire ou corriger le verso : une carte déjà posée reste posée, son contenu suit */
function ecrire(c,id,champs){var f=c.facettes[id];if(!f)throw new Error('Facette inconnue : '+id);var p=propre(id,champs);f.champs=p;
 if(!nbChamps(f)){f.etat='vide';f.le=null}else if(f.etat==='vide')f.etat='ecrite';return c}
function timbrer(c,id){var f=c.facettes[id];if(!f)throw new Error('Facette inconnue : '+id);if(!nbChamps(f))throw new Error('Écrivez d\'abord au moins une ligne au verso.');
 if(f.etat==='ecrite')f.etat='timbree';return c}
function poser(c,id,quand){var f=c.facettes[id];if(!f)throw new Error('Facette inconnue : '+id);if(f.etat!=='timbree'&&f.etat!=='posee')throw new Error('La carte doit être timbrée avant d\'entrer dans la fente.');
 f.etat='posee';f.le=f.le||new Date(quand||Date.now()).toISOString();return c}
function retirer(c,id){var f=c.facettes[id];if(f){f.etat=nbChamps(f)?'ecrite':'vide';f.le=null;f.visibilite='prive'}return c}
/* partielle : posée, mais pas tous les champs ; c'est permis */
function completude(c,id){var f=c.facettes[id],d=facette(id);return d&&f?nbChamps(f)/d.champs.length:0}
function progression(c){var n=0;IDS.forEach(function(id){if(c.facettes[id].etat==='posee')n++});return{posees:n,total:IDS.length}}
/* publier : un geste explicite, facette par facette, et seulement une facette posée */
function publier(c,id,oui){var f=c.facettes[id];if(!f)throw new Error('Facette inconnue : '+id);if(oui&&f.etat!=='posee')throw new Error('Seule une facette posée peut être publiée.');f.visibilite=oui?'publie':'prive';return c}
/* ce que le Réseau aura le droit de lire : jamais une facette privée, même posée et affichée dans le cube */
function publiques(c){var o={};IDS.forEach(function(id){var f=c.facettes[id];if(f.etat==='posee'&&f.visibilite==='publie')o[id]={champs:copie(f.champs)}});return o}
function reglerOrbe(c,prefs){if(!prefs)return c;for(var k in ORBE)if(prefs[k]!=null&&ORBE[k].indexOf(prefs[k])>=0)c.orbe[k]=prefs[k];return c}

function aGarder(c){return JSON.stringify(c)}
function relire(t,proprietaire){var c=vide(proprietaire),o;try{o=typeof t==='string'?JSON.parse(t):t}catch(e){return c}
 if(!o||o.v!==V||(proprietaire&&o.proprietaire!==String(proprietaire).slice(0,80)))return c;
 IDS.forEach(function(id){var f=o.facettes&&o.facettes[id];if(!f)return;var g=c.facettes[id];g.champs=propre(id,f.champs);
  g.etat=ETATS.indexOf(f.etat)>=0?f.etat:'vide';if(!nbChamps(g))g.etat='vide';g.visibilite=f.visibilite==='publie'&&g.etat==='posee'?'publie':'prive';
  g.le=g.etat==='posee'&&typeof f.le==='string'?f.le.slice(0,40):null});
 reglerOrbe(c,o.orbe);/* droitsOrbe ne se relit pas depuis le stockage local : ils viendront du serveur */return c}

return{V:V,FACETTES:FACETTES,IDS:IDS,ETATS:ETATS,ORBE:ORBE,facette:facette,vide:vide,ecrire:ecrire,timbrer:timbrer,poser:poser,retirer:retirer,
 completude:completude,progression:progression,publier:publier,publiques:publiques,reglerOrbe:reglerOrbe,aGarder:aGarder,relire:relire};
});
