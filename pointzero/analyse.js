/* AIME · Point Zéro : lire une matière brute et la distribuer dans ses formes.
   Aucune IA, aucun appel extérieur : des règles lisibles, testées sous node, appliquées pareil dans le navigateur et sur le serveur.

   AIMEAnalyse.analyser(texte, {ref, nom})  → { genre, titre, dates[], personnes[], emails[], liens[], telephones[], montants[], themes[], etapes[] }
   AIMEAnalyse.distribuer(elements, ref)    → { point, ligne, relation, grille, composition, projet } : ce que chaque forme montre
   Un « élément » : { id, texte, cree, origine: 'compte'|'appareil', fichier?: {nom, type, taille} , a: analyse } */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEAnalyse=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var ETAPES=['point','ligne','relation','grille','composition','projet'];
var GENRES={intention:'Intention',demande:'Demande',description:'Description',liste:'Liste',note:'Note',fichier:'Fichier'};
var THEMES={
 evenement:{nom:'Événement',mots:['mariage','seminaire','fete','soiree','ceremonie','invite','invites','salle','traiteur','reception','anniversaire','gala','concert','jour j','evenement','programme']},
 site:{nom:'Site et web',mots:['site','page','web','landing','domaine','seo','internet','en ligne','portfolio','vitrine']},
 identite:{nom:'Identité',mots:['logo','charte','couleur','couleurs','typo','typographie','marque','identite','graphique','palette']},
 document:{nom:'Documents',mots:['dossier','contrat','devis','facture','administratif','formulaire','attestation','courrier','declaration','justificatif','grille']},
 contenu:{nom:'Contenus',mots:['texte','article','video','photo','photos','magazine','reseaux','instagram','post','podcast','edition','livre']},
 produit:{nom:'Produit',mots:['app','application','outil','plateforme','fonctionnalite','logiciel','prototype','interface','bureau','os']},
 budget:{nom:'Budget',mots:['budget','prix','cout','tarif','paiement','acompte','euros','eur']}};
var MOIS=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
var VIDES={je:1,tu:1,il:1,elle:1,nous:1,vous:1,ils:1,elles:1,le:1,la:1,les:1,un:1,une:1,des:1,de:1,du:1,et:1,ou:1,mais:1,donc:1,pour:1,avec:1,dans:1,sur:1,par:1,en:1,au:1,aux:1,ce:1,cette:1,ces:1,mon:1,ma:1,mes:1,notre:1,nos:1,votre:1,vos:1,bonjour:1,merci:1,salut:1,aime:1,point:1,ligne:1,relation:1,grille:1,composition:1,projet:1,lundi:1,mardi:1,mercredi:1,jeudi:1,vendredi:1,samedi:1,dimanche:1};
MOIS.forEach(function(m){VIDES[m]=1});

function plier(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function uniques(L){var v={},o=[];L.forEach(function(x){var k=plier(x);if(x&&!v[k]){v[k]=1;o.push(x)}});return o}
function iso(a,m,j){if(m<1||m>12||j<1||j>31||a<1900||a>2200)return null;var d=new Date(Date.UTC(a,m-1,j));return d.getUTCMonth()===m-1?d.toISOString().slice(0,10):null}
/* une date sans année : la prochaine occurrence à partir de la date de référence */
function prochaine(m,j,ref){var a=ref.getUTCFullYear(),d=iso(a,m,j);if(d&&d<ref.toISOString().slice(0,10))d=iso(a+1,m,j);return d}

function dates(t,ref){var o=[],p=plier(t),r;
 var re1=/\b(\d{4})-(\d{2})-(\d{2})\b/g;while((r=re1.exec(t)))o.push(iso(+r[1],+r[2],+r[3]));
 var re2=/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g;while((r=re2.exec(t))){var a=r[3]?(+r[3]<100?2000+(+r[3]):+r[3]):null;o.push(a?iso(a,+r[2],+r[1]):prochaine(+r[2],+r[1],ref))}
 var re3=new RegExp('\\b(\\d{1,2})(?:er)?\\s+('+MOIS.join('|')+')(?:\\s+(\\d{4}))?\\b','g');while((r=re3.exec(p))){var m=MOIS.indexOf(r[2])+1;o.push(r[3]?iso(+r[3],m,+r[1]):prochaine(m,+r[1],ref))}
 return uniques(o.filter(Boolean)).sort()}

function personnes(t){var o=[],r;
 /* « Léa & Marc », « Léa et Marc » */
 var reC=/(?:^|[^A-Za-zÀ-ÿ])([A-ZÀ-Ý][a-zà-ÿ]{1,20})\s+(?:&|et)\s+([A-ZÀ-Ý][a-zà-ÿ]{1,20})(?![A-Za-zÀ-ÿ])/g;while((r=reC.exec(t))){if(!VIDES[plier(r[1])])o.push(r[1]);if(!VIDES[plier(r[2])])o.push(r[2])}
 /* Prénom Nom, jamais en tête de phrase (« Appeler Inès » n'est pas une personne) */
 var reN=/([^.!?\n]\s)([A-ZÀ-Ý][a-zà-ÿ]{1,20})\s+([A-ZÀ-Ý][a-zà-ÿA-ZÀ-Ý-]{1,25})(?![A-Za-zÀ-ÿ])/g;while((r=reN.exec(t))){if(!VIDES[plier(r[2])]&&!VIDES[plier(r[3])])o.push(r[2]+' '+r[3]);reN.lastIndex=r.index+r[0].length-r[3].length-1}
 /* « avec Paul », « pour Inès », « de Camille » */
 var reA=/(?:^|[^A-Za-zÀ-ÿ])(?:avec|pour|chez|de|par|à)\s+([A-ZÀ-Ý][a-zà-ÿ]{2,20})(?![A-Za-zÀ-ÿ])(?!\s+[A-ZÀ-Ý])/g;while((r=reA.exec(t))){if(!VIDES[plier(r[1])])o.push(r[1])}
 /* un prénom seul déjà vu dans un nom complet ne compte qu'une fois */
 var L=uniques(o);return L.filter(function(x){return x.indexOf(' ')>0||!L.some(function(y){return y!==x&&(y.indexOf(x+' ')===0||y.slice(-x.length-1)===' '+x)})})}

function genre(t){var p=plier(t).trim(),lignes=t.split(/\n/).filter(function(l){return l.trim()});
 if(lignes.filter(function(l){return /^\s*([-*•–]|\d+[.)])\s+/.test(l)}).length>=3)return'liste';
 if(/^(je veux|je voudrais|nous voulons|nous voudrions|objectif|mon idee|notre idee|l'idee|idee|intention|le but|but :|vision)/.test(p))return'intention';
 if(/\?\s*$/.test(p)||/^(peux-tu|pouvez-vous|pourriez-vous|est-ce que|merci de|il faut|il faudrait|j'aimerais|nous aimerions|besoin d|on a besoin|faire|creer|realiser|preparer|envoyer)/.test(p))return'demande';
 if(t.length>400)return'description';
 return'note'}

function analyser(texte,o){o=o||{};var t=String(texte||'').slice(0,20000),ref=o.ref?new Date(o.ref):new Date(),p=' '+plier(t)+' ';
 var a={genre:o.fichier?'fichier':genre(t)};
 var premiere=(t.split(/\n/).filter(function(l){return l.trim()})[0]||o.nom||'Sans titre').replace(/^\s*([-*•–]|\d+[.)])\s+/,'').trim();
 if(a.genre==='liste'&&/^\s*([-*•–]|\d+[.)])\s+/.test(t.split(/\n/).filter(function(l){return l.trim()})[0]||''))premiere=t.split(/\n/).filter(function(l){return /^\s*([-*•–]|\d+[.)])\s+/.test(l)}).slice(0,4).map(function(l){return l.replace(/^\s*([-*•–]|\d+[.)])\s+/,'').trim()}).join(', ');
 a.titre=premiere.length>72?premiere.slice(0,70).replace(/\s+\S*$/,'')+'…':premiere;
 a.dates=dates(t,ref);
 a.emails=uniques((t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]).map(function(x){return x.toLowerCase()}));
 a.liens=uniques(t.match(/https?:\/\/[^\s<>"')]+/g)||[]);
 a.telephones=uniques((t.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g)||[]).map(function(x){return x.replace(/[\s.-]/g,'')}));
 a.montants=uniques((t.match(/\d[\d\s.,]*\s?(?:k€|€|euros?\b|eur\b)/gi)||[]).map(function(x){return x.replace(/\s+/g,' ').trim()}));
 a.personnes=personnes(t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,' ').replace(/https?:\/\/\S+/g,' '));
 a.themes=Object.keys(THEMES).filter(function(k){return THEMES[k].mots.some(function(m){return p.indexOf(' '+m+' ')>=0||p.indexOf(' '+m+'s ')>=0||p.indexOf(' '+m+',')>=0||p.indexOf(' '+m+'.')>=0})});
 if(a.montants.length&&a.themes.indexOf('budget')<0)a.themes.push('budget');
 var e=['point'];
 if(a.dates.length)e.push('ligne');
 if(a.personnes.length||a.emails.length||a.liens.length||a.telephones.length)e.push('relation');
 if(a.themes.length||a.genre==='liste')e.push('grille');
 if(a.genre==='description'||a.genre==='liste'||t.length>280)e.push('composition');
 if((a.genre==='intention'||a.genre==='demande')&&a.themes.length)e.push('projet');
 a.etapes=e;return a}

/* ---------- ce que chaque forme montre ---------- */
function distribuer(L,ref){L=(L||[]).slice().sort(function(x,y){return String(y.cree).localeCompare(String(x.cree))});
 var D={point:L};
 /* Ligne : chaque date citée devient un jalon ; les éléments sans date restent en bout de ligne */
 var j=[];L.forEach(function(x){(x.a.dates||[]).forEach(function(d){j.push({date:d,el:x})})});j.sort(function(a,b){return a.date.localeCompare(b.date)});
 D.ligne={jalons:j,sansDate:L.filter(function(x){return!(x.a.dates||[]).length})};
 /* Relation : les entités (personnes, adresses, liens) et les éléments qui les citent */
 var E={},cle=function(type,v){var k=type+':'+plier(v);if(!E[k])E[k]={type:type,nom:v,els:[]};return E[k]};
 L.forEach(function(x){(x.a.personnes||[]).forEach(function(v){cle('personne',v).els.push(x.id)});(x.a.emails||[]).forEach(function(v){cle('email',v).els.push(x.id)});
  (x.a.liens||[]).forEach(function(v){var h=v.replace(/^https?:\/\//,'').split('/')[0];cle('lien',h).els.push(x.id)})});
 var ents=Object.keys(E).map(function(k){var e=E[k];e.els=uniques(e.els);return e}).sort(function(a,b){return b.els.length-a.els.length||a.nom.localeCompare(b.nom,'fr')});
 /* deux entités sont reliées quand un même élément les cite toutes les deux */
 var liens=[];for(var a=0;a<ents.length;a++)for(var b=a+1;b<ents.length;b++){var c=ents[a].els.filter(function(id){return ents[b].els.indexOf(id)>=0}).length;if(c)liens.push({a:a,b:b,poids:c})}
 D.relation={entites:ents,liens:liens};
 /* Grille : thèmes × genres */
 var T=Object.keys(THEMES).concat(['divers']),G=Object.keys(GENRES),cases={};
 L.forEach(function(x){var th=(x.a.themes||[]).length?x.a.themes:['divers'];th.forEach(function(t){var k=t+'|'+x.a.genre;(cases[k]=cases[k]||[]).push(x.id)})});
 D.grille={lignes:T.filter(function(t){return G.some(function(g){return cases[t+'|'+g]})}),colonnes:G.filter(function(g){return T.some(function(t){return cases[t+'|'+g]})}),cases:cases};
 /* Composition : un premier brouillon, l'intention en tête, puis une partie par thème */
 var intention=L.filter(function(x){return x.a.genre==='intention'})[0]||L[0],parties=[];
 D.grille.lignes.forEach(function(t){var els=L.filter(function(x){return(x.a.themes.length?x.a.themes:['divers']).indexOf(t)>=0&&x!==intention});if(els.length)parties.push({titre:t==='divers'?'Autres éléments':THEMES[t].nom,els:els})});
 D.composition={titre:intention?intention.a.titre:'',intention:intention||null,parties:parties};
 /* Projet : un dossier par thème qui réunit au moins deux éléments ou une intention */
 D.projet=Object.keys(THEMES).map(function(t){var els=L.filter(function(x){return x.a.themes.indexOf(t)>=0});if(els.length<2&&!els.some(function(x){return x.a.genre==='intention'||x.a.genre==='demande'}))return null;
  var tous=function(champ){return uniques([].concat.apply([],els.map(function(x){return x.a[champ]||[]})))},dts=tous('dates').sort(),tete=els.filter(function(x){return x.a.genre==='intention'||x.a.genre==='demande'})[0]||els[0];
  return{theme:t,nom:THEMES[t].nom,titre:tete.a.titre,els:els,dates:dts,prochaine:dts.filter(function(d){return d>=(ref||new Date().toISOString()).slice(0,10)})[0]||null,personnes:tous('personnes'),montants:tous('montants')}}).filter(Boolean);
 return D}

/* combien d'éléments dans chaque forme : pour les badges du Point Zéro */
function compter(D){return{point:D.point.length,ligne:D.ligne.jalons.length,relation:D.relation.entites.length,grille:Object.keys(D.grille.cases).length,composition:D.composition.parties.length,projet:D.projet.length}}

return{ETAPES:ETAPES,GENRES:GENRES,THEMES:THEMES,analyser:analyser,distribuer:distribuer,compter:compter,plier:plier};
});
