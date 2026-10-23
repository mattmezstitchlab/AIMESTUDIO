/* AIME · Lire une intention écrite en une phrase, sans IA ni appel extérieur.
   « Le mariage de Léa et Marc, le 14 juin 2027 à Chantilly, 120 invités »
     → { type:'mariage', modele:'mariage', titre:'Léa & Marc', date:'2027-06-14', lieu:'Chantilly', invites:120, personnes:['Léa','Marc'] }
   Ce qui n'est pas reconnu reste vide : la personne confirme ou corrige avant que rien ne soit créé.
   Les dates passent par pointzero/analyse.js (mêmes règles que le Point Zéro). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../pointzero/analyse.js'));else root.AIMEIntention=factory(root.AIMEAnalyse)})(typeof self!=='undefined'?self:this,function(A){'use strict';

/* le type de projet décide du modèle de site (vitrine/modeles/sites.json) ; l'ordre compte : le premier qui correspond gagne */
var TYPES=[
 {id:'mariage',modele:'mariage',nom:'Mariage',mots:['mariage','marier','marient','noces','pacs','fiancailles','wedding']},
 {id:'seminaire',modele:'seminaire',nom:'Séminaire ou conférence',mots:['seminaire','conference','colloque','convention','team building','offsite','congres','journee d etude']},
 {id:'fete',modele:'anniversaire',nom:'Fête ou anniversaire',mots:['anniversaire','ans de','fete','soiree','bapteme','communion','bar mitzvah','retraite','pot de depart']},
 {id:'association',modele:'association',nom:'Association',mots:['association','asso','club','benevole','benevoles','adherent','adherents']},
 {id:'portfolio',modele:'portfolio',nom:'Portfolio ou créateur',mots:['portfolio','photographe','illustrat','artiste','musicien','saxophon','designer','createur','creatrice']},
 {id:'artisan',modele:'artisan',nom:'Artisan ou indépendant',mots:['artisan','atelier','boutique','salon','restaurant','cabinet','independant','auto-entrepreneur','freelance','entreprise']}
];
var AUTRE={id:'autre',modele:'libre',nom:'Projet',mots:[]};

function plat(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function propre(t){return String(t||'').replace(/\s+/g,' ').trim()}
function typeDe(t){var p=' '+plat(t).replace(/[^a-z0-9 -]/g,' ')+' ';for(var i=0;i<TYPES.length;i++){if(TYPES[i].mots.some(function(m){return p.indexOf(' '+m)>=0}))return TYPES[i]}return AUTRE}

/* le lieu : ce qui suit « à », « au », « aux », « chez », « en » (ou « au Château de… »), jusqu'à la ponctuation ou un mot de liaison */
var COUPE=/\s*(?:[,;.!?(]|\s(?:le|la|les|pour|avec|et|vers|samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi)\s|\d)/i;
function lieuDe(t){
 var m=/(?:^|[\s,])(?:à|a|au|aux|chez|en|sur)\s+((?:l['’]|la\s|le\s|les\s)?[A-ZÉÈÀÂÎÔÛÇ][^,;.!?\n]{1,80})/.exec(t);
 if(!m)return'';var s=m[1],c=COUPE.exec(' '+s.slice(1));if(c)s=s.slice(0,c.index);
 s=propre(s).replace(/\s+(le|la|les|du|des|de|et)$/i,'');return s.length>=2?s.slice(0,80):''}

/* les personnes : « de Léa et Marc », « Léa & Marc », « pour Julie » ; un nom de lieu n'est jamais une personne */
var PRENOM="[A-ZÉÈÀÂÎÔÛÇ][a-zéèêëàâîïôöûüç'-]+";
function personnesDe(t,lieu){
 var r=new RegExp('('+PRENOM+')\\s*(?:et|&)\\s*('+PRENOM+')').exec(t);var L=[];
 if(r)L=[r[1],r[2]];else{var p=new RegExp('(?:pour|de|d[\'’])\\s*('+PRENOM+')').exec(t);if(p)L=[p[1]]}
 var exclus=plat(lieu);return L.filter(function(n){return exclus.indexOf(plat(n))<0&&!/^(Le|La|Les|Un|Une|Mon|Ma|Mes|Notre|Nos|Chateau|Château|Domaine|Salle|Maison)$/.test(n)})}

function invitesDe(t){var m=/(\d{1,5})\s*(?:invit|personne|participant|convive|adh|membre|place)/i.exec(t);return m?Math.min(100000,+m[1]):null}

function titreDe(type,personnes,t){
 if(personnes.length===2)return personnes[0]+' & '+personnes[1];
 if(personnes.length===1)return type.id==='fete'?'La fête de '+personnes[0]:personnes[0];
 var s=propre(t).replace(/^(je\s+(veux|voudrais|souhaite|prépare|organise)|nous\s+(préparons|organisons)|on\s+(prépare|organise))\s+/i,'');
 s=s.split(/[,;.!?\n]/)[0].split(/\s(?:à|au|aux|le\s+\d|en\s+\d|pour\s+le)\s/)[0];return(s.charAt(0).toUpperCase()+s.slice(1)).slice(0,90)}

/* aujourd'hui : pour refuser une date passée sans le dire au hasard (une intention parle d'un projet à venir) */
function lire(texte,aujourdhui){
 var t=propre(texte).slice(0,600);if(!t)return null;
 var type=typeDe(t),lieu=lieuDe(t),personnes=personnesDe(t,lieu),a=A?A.analyser(t):{dates:[]},jour=aujourdhui||new Date().toISOString().slice(0,10);
 var dates=(a.dates||[]).filter(function(d){return/^\d{4}-\d{2}-\d{2}$/.test(d)}),date=dates.filter(function(d){return d>=jour})[0]||dates[0]||'';
 return{texte:t,type:type.id,nomType:type.nom,modele:type.modele,titre:titreDe(type,personnes,t),date:date,lieu:lieu,invites:invitesDe(t),personnes:personnes,passee:!!date&&date<jour}}

return{lire:lire,TYPES:TYPES,AUTRE:AUTRE,typeDe:typeDe,lieuDe:lieuDe,personnesDe:personnesDe}});
