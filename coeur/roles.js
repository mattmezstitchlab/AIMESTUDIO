/* AIME · une couleur par rôle, la même partout (accueil, exemples, Live, Sites, Compte).
   Les couleurs viennent de l'orbe : chaque rôle a la sienne, l'orbe les réunit toutes. La marque reste noire :
   la couleur désigne seulement la personne (une pastille, un aplat sur son propre écran), jamais un droit.
   c = la couleur, e = l'encre lisible dessus (contraste AA). */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.AIMERoles=f()})(typeof self!=='undefined'?self:this,function(){'use strict';
var R={
 owner:{c:'#FB7185',e:'#141416',nom:'Propriétaire'},
 contributor:{c:'#F59E0B',e:'#141416',nom:'Contribution'},
 guest:{c:'#22D3EE',e:'#141416',nom:'Invité'},
 editor:{c:'#6D4AFF',e:'#FFFFFF',nom:'Coordination'},
 viewer:{c:'#34D399',e:'#141416',nom:'Lecture seule'},
 public:{c:'#9C9CA8',e:'#141416',nom:'Public'}};
function de(role){return R[role]||R.public}
function pastille(role){var k=de(role);return'<span class="role-p" aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;margin-right:.45em;vertical-align:.02em;background:'+k.c+'"></span>'}
return{ROLES:R,de:de,couleur:function(r){return de(r).c},encre:function(r){return de(r).e},pastille:pastille}});
