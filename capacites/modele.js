/* AIME · Atlas des capacités : le modèle, PUR et testé sous node.
   Il croise trois sources, sans rien écrire nulle part :
     - moteurs.json            : 130 dépôts, 1 191 modules déclarés (un index, pas une preuve) ;
     - univers.json            : les modules que les 10 univers d'AIME citent déjà dans leurs parcours et leurs regards ;
     - capacites/etat-depots.json : l'état réel des dépôts relevé par l'audit (commits, branches, failles, Vercel).
   Et une table écrite à la main, BRANCHEMENTS : ce qui vit déjà dans ce site, d'où ça vient, et ce qui a été écarté.
   Chaque entrée cite le document ou le fichier qui le prouve. Sans preuve, un dépôt reste « à évaluer ».

   AIMECapacites.construire({moteurs, univers, etat}) → {modules, depots, familles, univers, chiffres}
   AIMECapacites.score(module) → {points, raisons[]}  (« vaut le coup », expliqué, jamais une note opaque)
   AIMECapacites.filtrer(modules, {q, famille, univers, statut, depot}) → modules
   AIMECapacites.STATUTS : les statuts dans AIME et ce qu'ils veulent dire. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMECapacites=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var STATUTS={
 integre:{nom:'Dans AIME',dit:'La capacité vit déjà dans ce site, à l\'adresse indiquée.'},
 partiel:{nom:'En partie',dit:'Une part a été reprise ; le reste attend.'},
 externe:{nom:'À côté',dit:'Elle tourne dans son propre dépôt ; AIME y renvoie sans l\'embarquer.'},
 brancher:{nom:'À brancher',dit:'Citée par un univers d\'AIME ou jugée utile, pas encore reprise.'},
 evaluer:{nom:'À évaluer',dit:'Personne ne l\'a encore examinée pour AIME.'},
 ecarte:{nom:'Écarté',dit:'Examiné et laissé de côté ; la raison est donnée.'}
};

/* dépôt (minuscules) → { statut, ou (adresse ou fichier dans AIME), note, preuve } */
var BRANCHEMENTS={
 'aime-studio':{statut:'integre',ou:'/studio/',note:'Le Studio, ses ateliers, ses 36 ambiances et 10 typographies. Son ancienne Timeline Jour J a été abandonnée le 24/10.',preuve:'docs/AUDIT-AIME-STUDIO.md · vitrine/presentation/studio.json'},
 'aime-projet':{statut:'integre',ou:'/projets/ · contrats/projet.js',note:'Le contrat d\'échange « aime-projet » v1.',preuve:'docs/FUSION-PHASE-1.md'},
 'timbre':{statut:'integre',ou:'/compte/ · compte/timbre.js',note:'Le Timbre d\'identité, utilisé par la porte, le cube et le Monde AIME.',preuve:'docs/FUSION-PHASE-2-TIMBRES.md'},
 'pointzero':{statut:'partiel',ou:'/stitch/',note:'Table DMC et placement en puzzle repris ; l\'import PDF vectoriel et l\'éditeur complet restent à porter.',preuve:'docs/STITCH.md'},
 'universalbroderie':{statut:'partiel',ou:'/stitch/',note:'Les principes repris : progression séparée de la grille, validation, migrations.',preuve:'docs/STITCH.md'},
 'aime-composer':{statut:'partiel',ou:'/g44/',note:'États de connaissance et triage de PDF repris dans G44.',preuve:'g44/js/page.js · docs/G44.md'},
 'aime-archive':{statut:'partiel',ou:'/g44/',note:'Propagation, simulation isolée, retour arrière ; contraintes et statuts.',preuve:'g44/js/page.js · docs/G44.md'},
 'ripplecircle':{statut:'externe',ou:'ripplecircle.vercel.app',note:'Le cadran causal ; sa règle « le niveau le plus faible se propage » est appliquée dans G44.',preuve:'constructeur/capacites.js · docs/G44.md'},
 'relia':{statut:'brancher',ou:'/g44/ (chronologie)',note:'Dates avec précision et provenance : « à copier pour la chronologie et l\'avant/après ».',preuve:'g44/js/page.js'},
 'minisitewedding':{statut:'partiel',ou:'/sites/ (bibliothèque)',note:'Ses photos alimentent la bibliothèque d\'images du Canevas Site.',preuve:'sites/bibliotheque/bibliotheque.json'},
 'lemondeaimedesignsystem':{statut:'partiel',ou:'sites/theme-monde-aime.css',note:'Le thème du Monde AIME pour le Canevas Site.',preuve:'docs/SITES.md'},
 'brodia':{statut:'ecarte',note:'Idées seulement : PDF rastérisé, cellules stockées une par une.',preuve:'docs/STITCH.md'},
 'brodez':{statut:'ecarte',note:'Maquette à 24 couleurs ; ancienne configuration Supabase.',preuve:'docs/STITCH.md'},
 'aime-coloria':{statut:'ecarte',note:'Rien à reprendre, au mieux le schéma Stripe plus tard.',preuve:'docs/STITCH.md'},
 'colorcard':{statut:'ecarte',note:'Rien à reprendre pour la broderie.',preuve:'docs/STITCH.md'},
 'stitch3d':{statut:'ecarte',note:'Dépôt vide.',preuve:'docs/STITCH.md'},
 'aimeatelier':{statut:'ecarte',note:'Dépôt vide.',preuve:'docs/STITCH.md'},
 'brodezvotremariage':{statut:'ecarte',note:'Dépôt quasi vide.',preuve:'docs/STITCH.md'},
 'aime-wedding':{statut:'ecarte',note:'AIME Wedding en une seule page : abandonné le 24/10.',preuve:'docs/AUDIT-ROLES.md'},
 'bureau-uni-msa':{statut:'ecarte',note:'Cockpit sans moteur : non repris.',preuve:'g44/js/page.js'}
};

/* Familles proches du cœur d'AIME (rôles, événement, documents, publication) : un petit bonus, dit comme tel. */
var COEUR={'Événement':1,'Mariage':1,'Invités':1,'Planning':1,'Documents':1,'Contrats':1,'Accessibilité':1,'Web':1,'Données':1,'Plan de table':1,'Budget':1,'Magazine':1};

function cle(s){return String(s||'').toLowerCase()}

function score(m){
 var p=0,r=[];
 if(m.cite>0){var c=Math.min(m.cite,3);p+=c*3;r.push('cité '+m.cite+' fois par les univers d\'AIME')}
 if(m.autonome){p+=2;r.push('autonome : se branche seul')}
 if(m.etatDepot==='fonctionnel'){p+=2;r.push('dépôt fonctionnel')}else if(m.etatDepot==='prototype'){p+=1;r.push('dépôt en prototype')}else if(m.etatDepot==='vide'){p-=3;r.push('dépôt vide')}
 if(COEUR[m.famille]){p+=1;r.push('famille proche du cœur d\'AIME')}
 if(m.doublon){p-=2;r.push('doublon de '+m.doublon)}
 var s=m.sante||{};
 if(s.contenuDansUneBranche){r.push('le code est dans une branche, pas sur main')}
 if(s.codeArchive){p-=1;r.push('code enfermé dans une archive')}
 if(s.failles&&s.failles.critiques&&!s.correctifPret){p-=1;r.push('faille critique à corriger d\'abord')}
 return{points:p,raisons:r};
}

function construire(src){
 var R=(src.moteurs&&src.moteurs.repos)||[],U=(src.univers&&src.univers.univers)||[],E=(src.etat&&src.etat.depots)||{};
 /* qui cite quoi : clé « Dépôt#index » → [{univers, regard}] */
 var cites={};
 U.forEach(function(u){
  (u.aspects||[]).forEach(function(a){(a.k||[]).forEach(function(k){(cites[k]=cites[k]||[]).push({univers:u.id,titre:u.titre,regard:a.titre})})});
  (u.processus||[]).forEach(function(p){(p.etapes||[]).forEach(function(e){if(e.k)(cites[e.k]=cites[e.k]||[]).push({univers:u.id,titre:u.titre,regard:p.titre})})});
 });
 var modules=[],depots=[],familles={};
 R.forEach(function(d){
  var b=BRANCHEMENTS[cle(d.repo)]||null,sante=E[cle(d.repo)]||null;
  depots.push({repo:d.repo,resume:d.resume,tech:d.tech,etat:d.etat,url:d.url,prive:!!d.prive,doublon:d.doublon_de||null,nb:(d.modules||[]).length,branchement:b,sante:sante});
  (d.modules||[]).forEach(function(m,i){
   var k=d.repo+'#'+i,c=cites[k]||[];
   var statut=b?b.statut:(c.length?'brancher':'evaluer');
   var x={id:k,nom:m.nom,famille:m.famille||'Autre',fait:m.fait,entree:m.entree,sortie:m.sortie,exemple:m.exemple,fichiers:m.fichiers||[],autonome:!!m.autonome,
    repo:d.repo,prive:!!d.prive,etatDepot:d.etat,url:d.url||null,doublon:d.doublon_de||null,cite:c.length,
    univers:c.map(function(z){return z.univers}).filter(function(v,j,a){return a.indexOf(v)===j}),
    regards:c.map(function(z){return z.titre+' · '+z.regard}).filter(function(v,j,a){return a.indexOf(v)===j}),
    statut:statut,branchement:b,sante:sante};
   var s=score(x);x.points=s.points;x.raisons=s.raisons;
   modules.push(x);familles[x.famille]=(familles[x.famille]||0)+1;
  });
 });
 var parStatut={};modules.forEach(function(m){parStatut[m.statut]=(parStatut[m.statut]||0)+1});
 return{modules:modules,depots:depots,familles:familles,
  univers:U.map(function(u){return{id:u.id,titre:u.titre,sous:u.sous}}),
  chiffres:{modules:modules.length,depots:depots.length,cites:modules.filter(function(m){return m.cite>0}).length,
   autonomes:modules.filter(function(m){return m.autonome}).length,parStatut:parStatut,date:src.etat&&src.etat.date||null}};
}

/* Les meilleures candidates : à brancher ou à évaluer, triées par points, un dépôt ne monopolise pas la liste. */
function prioritaires(modules,n,parDepot){
 n=n||24;parDepot=parDepot||3;var vu={},out=[];
 modules.filter(function(m){return m.statut==='brancher'||m.statut==='evaluer'||m.statut==='partiel'})
  .slice().sort(function(a,b){return b.points-a.points||b.cite-a.cite||a.nom.localeCompare(b.nom)})
  .forEach(function(m){if(out.length>=n)return;vu[m.repo]=(vu[m.repo]||0)+1;if(vu[m.repo]<=parDepot)out.push(m)});
 return out;
}

function sansAccent(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function filtrer(modules,f){
 f=f||{};var q=sansAccent(f.q).trim(),mots=q?q.split(/\s+/):[];
 return modules.filter(function(m){
  if(f.famille&&m.famille!==f.famille)return false;
  if(f.univers&&m.univers.indexOf(f.univers)<0)return false;
  if(f.statut&&m.statut!==f.statut)return false;
  if(f.depot&&m.repo!==f.depot)return false;
  if(!mots.length)return true;
  var t=sansAccent([m.nom,m.fait,m.famille,m.repo,m.entree,m.sortie,m.regards.join(' ')].join(' '));
  return mots.every(function(w){return t.indexOf(w)>=0});
 });
}

return{STATUTS:STATUTS,BRANCHEMENTS:BRANCHEMENTS,construire:construire,score:score,prioritaires:prioritaires,filtrer:filtrer};
});
