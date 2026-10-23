/* AIME · Taxonomie des événements, reprise d'AIMEEVENT (src/data/taxonomie.ts, 13/10/2026).
   Règle : ne jamais mélanger CE QUE C'EST (catégorie), COMMENT ÇA SE VIT (format), QUI LE PORTE (organisateur),
   OÙ L'ON PARTICIPE (mode) et QUI PEUT VENIR (accès). Alignée sur Schema.org (schemaType) pour les pages publiées.
   Ajout AIME : « mots » (pour lire une intention écrite librement) et « modele » (le modèle de site du moteur de pages). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMETaxonomie=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var CATEGORIES=[
 {id:'celebrations',nom:'Mariages & célébrations',description:'Les grands moments privés ou familiaux.',mots:['mariage','marier','noces','pacs','fiancailles','bapteme','communion','remise de diplome','reunion de famille','anniversaire de mariage','wedding'],schemaType:'SocialEvent',modele:'mariage'},
 {id:'famille',nom:'Enfants & famille',description:'Des événements pensés pour les enfants, parents et proches.',mots:['anniversaire','ans de','spectacle enfant','atelier famille','conte','gouter','fete d enfant'],schemaType:'ChildrensEvent',modele:'anniversaire'},
 {id:'musique',nom:'Musique & concerts',description:'Toute programmation musicale, live ou enregistrée.',mots:['concert','dj','chorale','jam','recital','musique','groupe','orchestre','fanfare','live'],schemaType:'MusicEvent',modele:'libre'},
 {id:'spectacles',nom:'Spectacles & scène',description:'Ce qui se joue devant un public.',mots:['theatre','danse','cirque','humour','spectacle','stand-up','performance','one man show'],schemaType:'PerformingArtsEvent',modele:'libre'},
 {id:'cinema',nom:'Cinéma & médias',description:'Images projetées, produites ou discutées.',mots:['projection','avant-premiere','cine','cinema','film','podcast','tournage','documentaire'],schemaType:'ScreeningEvent',modele:'libre'},
 {id:'arts',nom:'Arts & expositions',description:'Œuvres, artistes, patrimoine et design.',mots:['exposition','expo','vernissage','galerie','installation','defile','patrimoine','musee'],schemaType:'ExhibitionEvent',modele:'portfolio'},
 {id:'festivals',nom:'Festivals & grands événements',description:'Programmes multi-activités ou multi-jours.',mots:['festival','salon','foire','convention','carnaval','fete de la','biennale'],schemaType:'Festival',modele:'libre'},
 {id:'sport',nom:'Sport & activités physiques',description:'Pratiquer, concourir, supporter ou se remettre en mouvement.',mots:['match','tournoi','course','marathon','trail','randonnee','sport','competition','cours de sport','velo'],schemaType:'SportsEvent',modele:'libre'},
 {id:'ateliers',nom:'Ateliers & loisirs',description:'Faire, fabriquer, essayer et pratiquer ensemble.',mots:['atelier','bricolage','jeu','club','initiation','broderie','ceramique','tricot','couture'],schemaType:'EducationEvent',modele:'artisan'},
 {id:'formation',nom:'Cours & formation',description:'Apprendre, transmettre et certifier.',mots:['cours','formation','masterclass','stage','webinaire','classe','apprendre'],schemaType:'EducationEvent',modele:'seminaire'},
 {id:'pro',nom:'Conférences & professionnel',description:'Partager des idées, travailler et créer des opportunités.',mots:['conference','seminaire','networking','congres','lancement','colloque','convention','team building','offsite','assemblee'],schemaType:'BusinessEvent',modele:'seminaire'},
 {id:'gastronomie',nom:'Gastronomie & dégustations',description:'Cuisiner, goûter, partager et découvrir.',mots:['repas','degustation','cours de cuisine','brunch','marche','diner','banquet','vin','oenologie'],schemaType:'FoodEvent',modele:'libre'},
 {id:'bienetre',nom:'Santé & bien-être',description:'Prévention, soin, équilibre et santé mentale.',mots:['yoga','meditation','sante','groupe de parole','retraite','bien-etre','bain sonore','sophrologie'],schemaType:'Event',modele:'libre'},
 {id:'sorties',nom:'Sorties & plein air',description:'Découvrir un lieu, un territoire ou la nature.',mots:['visite','balade','excursion','voyage','camp','sortie','pique-nique'],schemaType:'Event',modele:'libre'},
 {id:'communaute',nom:'Communauté & solidarité',description:'Se rencontrer, agir, collecter ou défendre une cause.',mots:['collecte','benevolat','benevole','reunion citoyenne','association','caritatif','solidaire','quartier'],schemaType:'SocialEvent',modele:'association'},
 {id:'ecole',nom:'École & jeunesse',description:'Vie scolaire, universitaire et périscolaire.',mots:['sortie scolaire','kermesse','reunion parents','orientation','ecole','college','lycee','universite','fin d annee'],schemaType:'EducationEvent',modele:'association'},
 {id:'spiritualite',nom:'Spiritualité & cérémonies',description:'Rituels, pratiques spirituelles et rassemblements religieux.',mots:['ceremonie','office','pelerinage','celebration religieuse','messe','obseques','funerailles','hommage'],schemaType:'Event',modele:'libre'},
 {id:'autre',nom:'Autre événement',description:'Pour ce qui n\'entre dans aucune case, sans bloquer la création.',mots:[],schemaType:'Event',modele:'libre'}
];
var FORMATS=['Concert ou spectacle','Projection','Exposition','Festival ou fête','Atelier','Cours ou formation','Conférence ou débat','Réunion ou networking','Salon ou marché','Match ou compétition','Course ou défi','Visite ou sortie','Voyage ou séjour','Repas ou dégustation','Soirée ou fête privée','Mariage ou cérémonie','Collecte ou action solidaire','Rendez-vous individuel'];
var ORGANISATEURS=['Salle de spectacle','Cinéma','Festival','École ou université','Club sportif','Association','Entreprise','Collectivité','Musée ou bibliothèque','Restaurant ou commerce','Artiste ou collectif','Famille ou particulier'];
var MODES=['Sur place','En ligne','Hybride'];
var ACCES=['Ouvert au public','Sur inscription','Sur invitation','Privé'];
var OBJECTIFS=['Divertir','Apprendre','Se rencontrer','Pratiquer','Célébrer','Vendre ou présenter','Collecter ou aider','Informer ou débattre'];

function plat(t){return' '+String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 -]/g,' ').replace(/\s+/g,' ')+' '}
/* la catégorie : celle dont un mot apparaît le plus tôt dans la phrase (« le concert de mariage » est d'abord une célébration) */
function categorieDe(texte){var p=plat(texte),best=null,pos=Infinity;CATEGORIES.forEach(function(c){c.mots.forEach(function(m){var i=p.indexOf(' '+m);if(i>=0&&i<pos){pos=i;best=c}})});return best||CATEGORIES[CATEGORIES.length-1]}
function modeDe(texte){var p=plat(texte);if(/ (hybride|sur place et en ligne|en ligne et sur place) /.test(p))return'Hybride';if(/ (en ligne|visio|zoom|webinaire|en direct sur) /.test(p))return'En ligne';return'Sur place'}
/* l'accès par défaut suit la catégorie : une célébration est sur invitation, le reste est ouvert, sauf mot contraire */
function accesDe(texte,cat){var p=plat(texte);if(/ (prive|privee|intime|entre nous) /.test(p))return'Privé';if(/ (sur invitation|invites|invitation) /.test(p))return'Sur invitation';if(/ (inscription|sur reservation|reserver|billet) /.test(p))return'Sur inscription';return cat&&(cat.id==='celebrations'||cat.id==='famille')?'Sur invitation':'Ouvert au public'}
function categorie(id){return CATEGORIES.filter(function(c){return c.id===id})[0]||CATEGORIES[CATEGORIES.length-1]}
return{CATEGORIES:CATEGORIES,FORMATS:FORMATS,ORGANISATEURS:ORGANISATEURS,MODES:MODES,ACCES:ACCES,OBJECTIFS:OBJECTIFS,categorieDe:categorieDe,modeDe:modeDe,accesDe:accesDe,categorie:categorie}});
