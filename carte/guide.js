/* AIME · le guide d'intention : les questions de l'orbe, une par une, toutes facultatives.
   C'est un guide INTERACTIF DÉTERMINISTE : des questions écrites, choisies selon les réponses, et de petits moteurs
   locaux qui transforment une réponse en élément de Carte (palette, date, parcours, compétence…).
   L'agent connecté (architecture agentique AIME) n'est pas branché ici : la place lui est réservée, et la page le dit. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./carte.js'));else root.AIMEGuide=factory(root.AIMECarte)})(typeof self!=='undefined'?self:this,function(K){'use strict';

/* ---------- les moteurs locaux : une réponse → un élément de Carte, avec leur nom ---------- */
var MOIS={janvier:1,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,aout:8,septembre:9,octobre:10,novembre:11,decembre:12};
var MOTEURS={
 /* une date dans une phrase : 2019, « juin 2019 », « 14/06/2019 » ; sinon, un moment sans date (c'est permis) */
 date:{nom:'Dates (local)',faire:function(t){var s=K.norm(t),m=s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(m)return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  m=s.match(/(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/);if(m)return m[2]+'-'+('0'+MOIS[m[1]]).slice(-2);m=s.match(/\b(19\d\d|20\d\d)\b/);return m?m[1]:null}},
 /* un parcours : école, voyage ou expérience, d'après des mots déclarés */
 parcours:{nom:'Parcours (local)',faire:function(t){var s=K.norm(t);if(/ecole|lycee|universite|fac|diplome|master|licence|bts|formation|beaux-arts|saint-luc|conservatoire/.test(s))return'formations';if(/voyage|japon|new york|tour du monde|sejour|erasmus|pays|ile/.test(s))return'voyages';return'moments'}},
 /* une couleur : nom ou code, et deux couleurs qui l'accompagnent */
 palette:{nom:'Palette (local)',faire:function(t){var s=K.norm(t),N={rose:'#FB7185',corail:'#FB7185',orange:'#F59E0B',ambre:'#F59E0B',violet:'#7C5CFF',mauve:'#7C5CFF',bleu:'#60A5FA',cyan:'#22D3EE',turquoise:'#22D3EE',vert:'#34D399',jaune:'#FBBF24',blanc:'#EDEDF0',noir:'#141417',rouge:'#F43F5E'};
  var hex=(s.match(/#[0-9a-f]{6}\b/)||[])[0];if(!hex)for(var k in N)if(s.indexOf(k)>=0){hex=N[k];break}if(!hex)return null;var i=K.COULEURS.indexOf(hex.toUpperCase());return[hex.toUpperCase()].concat(i>=0?[K.COULEURS[(i+2)%K.COULEURS.length]]:[])}},
 /* des compétences ou intérêts : une liste propre, sans doublon */
 liste:{nom:'Liste (local)',faire:function(t){var seen={};return String(t||'').split(/[,;\n]| et /).map(function(x){return x.trim()}).filter(function(x){var k=K.norm(x);if(!k||seen[k])return false;seen[k]=1;return true}).slice(0,8)}}};
/* l'agent connecté : réservé, pas branché ; sa disponibilité se vérifie, elle ne s'affirme pas */
var AGENT={nom:'Agent AIME connecté',disponible:false,raison:'Non branché sur cette page : le guide reste déterministe.'};

/* ---------- les questions ---------- */
var Q=[
 {id:'intention',q:'Qu\'est-ce qui t\'amène aujourd\'hui ?',choix:['Raconter mon parcours','Créer quelque chose','Rencontrer des personnes','Garder un souvenir','Juste découvrir'],libre:'Ou avec tes mots…',
  appliquer:function(c,r){return{intention:r}}},
 {id:'nom',q:'Comment souhaites-tu être présenté ?',libre:'Un prénom, un pseudonyme…',aide:'Un pseudonyme suffit.',appliquer:function(c,r){return{nom:r.slice(0,40)}}},
 {id:'couleurs',q:'Quelle couleur te représente aujourd\'hui ?',couleurs:true,libre:'Ou un nom de couleur…',moteur:'palette',appliquer:function(c,r){return{couleurs:Array.isArray(r)?r.slice(0,3):(MOTEURS.palette.faire(r)||[])}}},
 {id:'moment',q:'Quel moment aimerais-tu garder ?',libre:'Un moment, avec une date si tu veux…',moteur:'date',
  appliquer:function(c,r){var d=MOTEURS.date.faire(r);return{moments:c.moments.concat([{id:'m'+c.moments.length,titre:r.slice(0,80),date:d}])}}},
 {id:'parcours',q:'Quel parcours souhaites-tu raconter ?',libre:'Une école, un voyage, une expérience…',moteur:'parcours',
  quand:function(c){return/parcours|souvenir/i.test(c.intention)||!c.intention},
  appliquer:function(c,r){var cat=MOTEURS.parcours.faire(r),d=MOTEURS.date.faire(r),o={};o[cat]=c[cat].concat([cat==='moments'?{id:'m'+c.moments.length,titre:r.slice(0,80),date:d}:{titre:r.slice(0,80),annee:d}]);return o}},
 {id:'relation',q:'Qui ou quoi aimerais-tu relier à ta Carte ?',libre:'Une personne, un lieu, une idée…',aide:'Les relations restent privées.',
  appliquer:function(c,r){return{relations:c.relations.concat([{nom:r.slice(0,60),explicite:true}])}}},
 {id:'competences',q:'Une compétence que tu aimes partager ?',choix:['Photographie','Musique','Cuisine','Écriture','Code','Couture','Jardinage'],libre:'Plusieurs, séparées par des virgules…',moteur:'liste',
  quand:function(c){return!/souvenir/i.test(c.intention)},appliquer:function(c,r){return{competences:uniq(c.competences.concat(MOTEURS.liste.faire(r)))}}},
 {id:'reve',q:'Qu\'aimerais-tu réaliser un jour ?',libre:'Un rêve, un projet, une création…',appliquer:function(c,r){return{reves:c.reves.concat([r.slice(0,100)])}}},
 {id:'contribution',q:'Que pourrais-tu proposer, ou que recherches-tu ?',choix:['Je propose mon aide','Je cherche des partenaires','Je cherche à apprendre'],libre:'Par exemple : « je propose la photographie »',moteur:'liste',
  quand:function(c){return/rencontr|creer|créer/i.test(c.intention)},
  appliquer:function(c,r){var s=K.norm(r),p=c.contributions.proposees.slice(),q=c.contributions.recherchees.slice();var net=function(x){return x.replace(/^je (cherche|recherche|propose)\s*(à|a)?\s*/i,'').replace(/^(le |la |les |l'|un |une |des |du |de la |mon |ma |mes )/i,'').trim()};if(/^je cherche|recherche|apprendre/.test(s))q.push(net(r));else p.push(net(r));return{contributions:{proposees:p,recherchees:q}}}}];
function uniq(a){var s={};return a.filter(function(x){var k=K.norm(x);if(s[k])return false;s[k]=1;return true})}
var RUB={intention:'intention',nom:'nom',couleurs:'couleurs',moment:'moments',parcours:null,relation:'relations',competences:'competences',reve:'reves',contribution:'contributions'};
/* la prochaine question : dans l'ordre, si elle s'applique, ni déjà répondue, ni ignorée, ni déjà remplie */
function prochaine(c,faites){faites=faites||{};for(var i=0;i<Q.length;i++){var q=Q[i];if(faites[q.id])continue;if(q.quand&&!q.quand(c))continue;if(RUB[q.id]&&K.rempli(c,RUB[q.id]))continue;return q}return null}
function repondre(c,q,r,date){if(r==null||r===''||(Array.isArray(r)&&!r.length))return c;return K.modifier(c,q.appliquer(c,r),'Réponse : '+q.q,date)}

/* ---------- la suite, dans Le Monde AIME : jamais ce qui est déjà su ---------- */
var SUITE=[
 {id:'envie',q:'Que souhaiterais-tu faire maintenant ?',choix:['Créer','Rencontrer des personnes','Découvrir des possibilités','Juste regarder']},
 {id:'projet',q:'As-tu un projet que tu aimerais commencer ?',libre:'Un mariage, une exposition, un voyage…',quand:function(c){return!c.reves.length}},
 {id:'projetDepuisReve',q:'Ton rêve, « {reve} » : veux-tu en faire un premier projet ?',choix:['Oui, commençons','Pas encore'],quand:function(c){return c.reves.length>0}},
 {id:'partage',q:'Préfères-tu garder ta Carte privée, ou partager certains éléments ?',choix:['Garder privée','Choisir ce que je partage']}];
function suite(c){for(var i=0;i<SUITE.length;i++){var q=SUITE[i];if(c.suite&&c.suite[q.id]!=null)continue;if(q.quand&&!q.quand(c))continue;return{id:q.id,q:q.q.replace('{reve}',c.reves[0]||''),choix:q.choix,libre:q.libre}}return null}
function repondreSuite(c,id,r,date){var s=JSON.parse(JSON.stringify(c.suite||{}));s[id]=r;return K.modifier(c,{suite:s},'Le Monde AIME : '+id,date)}
return{MOTEURS:MOTEURS,AGENT:AGENT,QUESTIONS:Q,prochaine:prochaine,repondre:repondre,SUITE:SUITE,suite:suite,repondreSuite:repondreSuite};
});
