/* AIME · Réseau des facettes vivantes · le cœur pur (testé sous node), sans DOM.
   Hiérarchie : timbre (le créateur) → cube (l'ensemble) → facette (surface partageable) → bloc (Métamorphose) ; l'orbe propose.
   Rien de neuf n'est inventé : une facette d'une création est une SECTION de sa page Métamorphose (le mini-site du projet,
   « aime-site »), rendue seule par le moteur ; un module est un BLOC existant du moteur, inscrit dans un registre autorisé.

     facettesDe(site)                 jusqu'à six facettes d'une création, dans l'ordre de lecture de sa page
     seule(site, sectionId)           la page réduite à une facette (pour le rendu d'une carte), sans toucher l'original
     MODULES                          le registre des capacités autorisées (aucun code communautaire n'est exécuté)
     verifier(module, cible, S)       compatibilité, version, dépendances, données, droits, permissions, configuration
     integrer(module, site, S)        une instance du module dans l'espace autorisé (la page de SON projet)
     bibliotheque : vide / relire / mettreDeCote / retirer / contient   des RÉFÉRENCES, jamais des copies */
(function(racine,f){var M=f();if(typeof module==='object'&&module.exports)module.exports=M;else racine.AIMEReseau=M})(typeof self!=='undefined'?self:this,function(){'use strict';

var NOMS={'pz-hero':'Le projet','pz-motif':'Le motif','pz-fils':'La palette','pz-mesures':'Les dimensions','pz-avancement':'La progression','pz-decisions':'Les décisions','pz-actions':'La suite'};
/* une création montre au plus six facettes (les six faces du cube) ; celles sans contenu ne sont pas montrées */
function facettesDe(site,o){o=o||{};if(!site||!site.pages||!site.pages[0])return[];var L=site.pages[0].sections.slice(),pleines=function(s){var src={fils:'fils',avancement:'avancement',chiffres:'chiffres',etapes:'etapes',galerie:'galerie'}[s.type];return!src||((site.listes||{})[src]||[]).length>0};
 if(site.pages[0].mode==='grille')L.sort(function(a,b){return(a.y-b.y)||(a.x-b.x)});
 var C=L.filter(function(s){return(s.audience||'public')==='public'&&pleines(s)}),max=o.max||6;
 /* plus de six : les facettes les moins parlantes (texte, puis chronologie, séparateur, bouton) cèdent la place, en partant de la fin */
 ['texte','etapes','separateur','bouton'].forEach(function(t){for(var k=C.length-1;k>=0&&C.length>max;k--)if(C[k].type===t)C.splice(k,1)});
 return C.slice(0,max).map(function(s,i){return{id:s.id,type:s.type,nom:NOMS[s.id]||s.titre||s.type,rang:i}})}
function copie(o){return JSON.parse(JSON.stringify(o))}
function seule(site,sid){var c=copie(site),p=c.pages[0],s=p.sections.filter(function(x){return x.id===sid})[0];if(!s)return null;s.x=0;s.y=0;s.w=12;p.sections=[s];p.mode='grille';c.pages=[p];return c}

/* le registre : chaque module est un bloc du moteur, avec ce qu'il lit et ce qu'il requiert ; licence et version déclarées */
var MODULES=[
 {id:'galerie',bloc:'galerie',nom:'Galerie',dit:'Vos images, consultables en grand.',lit:'galerie',variante:'mosaique',titre:'Les images',licence:'aime-libre',version:'1.0',schema:1,auteur:'AIME Studio',domaines:['broderie','mariage','portfolio'],
  demo:{galerie:[{src:'biblio:ceremonie-garden',legende:'Image de la bibliothèque AIME'},{src:'biblio:ceremonie-foret-noire',legende:'Image de la bibliothèque AIME'}]}},
 {id:'palette-dmc',bloc:'fils',nom:'Palette DMC',dit:'Les fils d\'un projet, avec leurs références et leur part.',lit:'fils',variante:'nuancier',titre:'La palette DMC',licence:'aime-libre',version:'1.0',schema:1,auteur:'AIME Studio',domaines:['broderie'],
  demo:{fils:[{dmc:'922',nom:'Copper Light',hex:'#E2733B',points:1820},{dmc:'310',nom:'Black',hex:'#000000',points:410},{dmc:'3865',nom:'Winter White',hex:'#F9F7F1',points:960}]}},
 {id:'progression',bloc:'avancement',nom:'Suivi de progression',dit:'Plusieurs mesures séparées, jamais un seul pourcentage.',lit:'avancement',variante:'barres',titre:'Avancement',licence:'aime-libre',version:'1.0',schema:1,auteur:'AIME Studio',domaines:['broderie','mariage','projet'],
  demo:{avancement:[{nom:'Image',valeur:100,detail:'Confirmée'},{nom:'Couleurs',valeur:60,detail:'À valider'},{nom:'Broderie',valeur:15,detail:'Commencée'}]}},
 {id:'chronologie',bloc:'etapes',nom:'Chronologie',dit:'Les décisions et les étapes, dans l\'ordre.',lit:'etapes',variante:'verticale',titre:'Chronologie',licence:'aime-libre',version:'1.0',schema:1,auteur:'AIME Studio',domaines:['broderie','mariage','projet'],
  demo:{etapes:[{date:'3 oct.',titre:'Image choisie',detail:'Source : vous'},{date:'5 oct.',titre:'Palette réduite à 12 fils',detail:'Source : vous'}]}},
 {id:'chiffres',bloc:'chiffres',nom:'Chiffres clés',dit:'Les mesures d\'un projet, en grand.',lit:'chiffres',variante:'bande',titre:'En chiffres',licence:'aime-libre',version:'1.0',schema:1,auteur:'AIME Studio',domaines:['broderie','projet'],
  demo:{chiffres:[{valeur:'83 × 62',libelle:'points'},{valeur:'14',libelle:'fils DMC'}]}}];
function module_(id){return MODULES.filter(function(m){return m.id===id})[0]||null}
var LICENCES={'aime-libre':'Réutilisation libre dans AIME, créateur cité'};

/* la vérification avant « Ajouter à mon cube » : chaque point dit oui ou non, et pourquoi */
function verifier(m,cible,S){var r=[],ok=function(id,nom,v,dit){r.push({id:id,nom:nom,ok:!!v,dit:dit})};var site=cible&&cible.site;
 ok('compatibilite','Compatibilité',S&&S.BLOCS&&S.BLOCS[m.bloc],S&&S.BLOCS&&S.BLOCS[m.bloc]?'Bloc « '+S.BLOCS[m.bloc].nom+' » du moteur de pages.':'Ce bloc n\'existe pas dans ce moteur.');
 ok('version','Version',S&&m.schema<=S.SCHEMA,'Module '+m.version+' · schéma '+m.schema+(S?' ≤ moteur '+S.SCHEMA:''));
 ok('dependances','Dépendances',true,'Aucune : un bloc du moteur, aucun code extérieur.');
 var donnees=site&&site.listes&&(site.listes[m.lit]||[]).length;ok('donnees','Données nécessaires',donnees,donnees?donnees+' élément'+(donnees>1?'s':'')+' déjà confirmé'+(donnees>1?'s':'')+' dans votre projet.':'Votre projet n\'a pas encore ces données ; rien ne sera inventé.');
 ok('droits','Droits de réutilisation',!!LICENCES[m.licence],LICENCES[m.licence]||'Licence inconnue : réutilisation refusée.');
 ok('permissions','Permissions',cible&&cible.proprietaire===true,cible&&cible.proprietaire?'C\'est votre projet, sur cet appareil.':'Vous ne pouvez modifier que vos propres projets.');
 var deja=site&&site.pages[0].sections.some(function(s){return s.type===m.bloc});ok('configuration','Configuration',!deja,deja?'Ce module est déjà dans votre projet.':'Aucun réglage : il se place à la fin de la page, modifiable dans le Canevas.');
 return{ok:r.every(function(x){return x.ok}),points:r}}
/* l'intégration : une instance (une section) dans la page du projet ; l'original du créateur n'est jamais touché */
function integrer(m,site,S){var v=verifier(m,{site:site,proprietaire:true},S);if(!v.ok)throw new Error('Intégration impossible : '+v.points.filter(function(x){return!x.ok}).map(function(x){return x.nom}).join(', ')+'.');
 var s=S.ajouterSection(site,site.pages[0].id,m.bloc);s.variante=S.BLOCS[m.bloc].variantes[m.variante]?m.variante:s.variante;s.titre=m.titre;s.origine={module:m.id,version:m.version,auteur:m.auteur,licence:m.licence};
 var p=site.pages[0];if(p.mode==='grille'){var bas=0;p.sections.forEach(function(x){if(x!==s&&x.x!=null)bas=Math.max(bas,x.y+S.hauteur(x.type,x.w))});s.w=12;s.x=0;s.y=bas;S.tasser(p.sections,s.id)}
 site.majLe=new Date().toISOString();return s}
/* le test isolé : une page de démonstration, avec des données fictives, jamais celles du compte */
function demo(m,S){var site=S.vide('vierge');site.nom='Démonstration · '+m.nom;Object.keys(m.demo).forEach(function(k){site.listes[k]=copie(m.demo[k])});var s=S.ajouterSection(site,'index',m.bloc);s.variante=m.variante;s.titre=m.titre+' (démonstration)';site.presentation.ambiance='editorial';return site}

/* la bibliothèque personnelle : des références (source, facette, auteur, version), pas des copies */
var V=1;
function vide(){return{v:V,items:[]}}
function relire(t){var b=vide(),o;try{o=typeof t==='string'?JSON.parse(t):t}catch(e){return b}if(!o||o.v!==V||!Array.isArray(o.items))return b;
 o.items.forEach(function(i){if(i&&typeof i.cle==='string'&&/^(facette|module):/.test(i.cle)&&i.cle.length<200)b.items.push({cle:i.cle,type:i.cle.split(':')[0],titre:String(i.titre||'').slice(0,120),source:String(i.source||'').slice(0,160),auteur:String(i.auteur||'').slice(0,80),version:String(i.version||'').slice(0,40),le:String(i.le||'').slice(0,40)})});b.items=b.items.slice(0,200);return b}
function cle(ref){return ref.module?'module:'+ref.module:'facette:'+ref.projet+'#'+ref.facette}
function contient(b,ref){var k=cle(ref);return b.items.some(function(i){return i.cle===k})}
function mettreDeCote(b,ref,meta,quand){var k=cle(ref);if(contient(b,ref))return false;b.items.unshift({cle:k,type:k.split(':')[0],titre:String(meta.titre||'').slice(0,120),source:String(meta.source||'').slice(0,160),auteur:String(meta.auteur||'').slice(0,80),version:String(meta.version||'').slice(0,40),le:new Date(quand||Date.now()).toISOString()});return true}
function retirer(b,k){var n=b.items.length;b.items=b.items.filter(function(i){return i.cle!==k});return b.items.length<n}

return{NOMS:NOMS,facettesDe:facettesDe,seule:seule,MODULES:MODULES,module:module_,LICENCES:LICENCES,verifier:verifier,integrer:integrer,demo:demo,vide:vide,relire:relire,cle:cle,contient:contient,mettreDeCote:mettreDeCote,retirer:retirer};
});
