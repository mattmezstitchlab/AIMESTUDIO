/* AIME — registre des capacités du constructeur du Monde AIME.
   Phase 0 : description PURE et non intrusive ; aucun chargement, écriture ou migration.
   L'interface existante conserve l'autorité sur ses blocs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEBuilderCapacites=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var ITEMS=[
 {id:'texte',nom:'Texte',famille:'contenu',statut:'existant',origine:'aime/index.html'},
 {id:'image',nom:'Image',famille:'media',statut:'existant',origine:'aime/index.html'},
 {id:'lien',nom:'Lien',famille:'interaction',statut:'existant',origine:'aime/index.html'},
 {id:'document',nom:'Document',famille:'document',statut:'existant',origine:'aime/index.html'},
 {id:'grille',nom:'Grille et blocs',famille:'structure',statut:'existant',origine:'aime/index.html'},
 {id:'timbre-identite',nom:'Timbre d’identité',famille:'identite',statut:'separe',origine:'compte/timbre.js'},
 {id:'canevas',nom:'Édition visuelle',famille:'edition',statut:'a-adapter',origine:'canevas/plan.js'},
 {id:'regie',nom:'Présentation et publication',famille:'edition',statut:'a-adapter',origine:'regie/scene.js'},
 {id:'studio',nom:'Supports du Studio',famille:'creation',statut:'a-adapter',origine:'studio/index.html'},
 {id:'stitch',nom:'Broderie',famille:'creation',statut:'a-adapter',origine:'stitch/'},
 {id:'ripplecircle',nom:'Cadran causal',famille:'interaction',statut:'externe',origine:'mattmezstitchlab/RIPPLECIRCLE'},
 {id:'magazine',nom:'Magazine',famille:'document',statut:'propose',origine:null}
];
function tous(){return ITEMS.map(function(v){return Object.assign({},v)})}
function trouver(id){var x=ITEMS.find(function(v){return v.id===id});return x?Object.assign({},x):null}
function disponibles(){return tous().filter(function(x){return x.statut==='existant'})}
return{tous:tous,trouver:trouver,disponibles:disponibles};
});
