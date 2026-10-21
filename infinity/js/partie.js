/* AIME INFINITY · une partie (état, actions, budget, progression, records). Logique pure.
   Une grille se rejoue à l'identique à partir de sa configuration et de la suite des cases touchées. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./regles.js'),require('./niveaux.js'));else root.AIMEInfinityPartie=factory(root.AIMEInfinityRegles,root.AIMEInfinityNiveaux)})(typeof self!=='undefined'?self:this,function(R,NV){'use strict';

/* une grille en cours */
function Grille(g){this.g=g;this.n=g.n;this.vivant=new Uint8Array(g.n*g.n).fill(1);this.restant=g.n*g.n;this.actions=0;this.coups=[];this.plusGrande=0;this.eliminees=0}
Grille.prototype.statut=function(){return this.restant===0?'gagne':this.actions>=this.g.budget?'perdu':'en-cours'};
Grille.prototype.reste=function(){return this.g.budget-this.actions};
/* toucher une case : null si l'action n'a pas de sens (case déjà partie, budget épuisé, grille finie) */
Grille.prototype.toucher=function(i){if(this.statut()!=='en-cours'||!(i>=0&&i<this.vivant.length)||!this.vivant[i])return null;
 var c=R.cascade(this.n,this.g.cases,this.vivant,i);for(var q=0;q<c.ordre.length;q++)this.vivant[c.ordre[q]]=0;
 this.restant-=c.ordre.length;this.eliminees+=c.ordre.length;this.actions++;this.coups.push(i);if(c.ordre.length>this.plusGrande)this.plusGrande=c.ordre.length;
 c.statut=this.statut();return c};
function rejouer(g,coups){var G=new Grille(g);coups.forEach(function(i){G.toucher(i)});return G}

/* la progression : 2 × 2, 4 × 4, 8 × 8… On ne perd jamais un niveau validé.
   Classement : la plus grande grille terminée, puis le moins d'actions cumulées pour y arriver. */
function Campagne(etat){etat=etat||{};this.graine=etat.graine||'aime';this.L=etat.L||1;this.actions=etat.actions||0;this.parfaits=etat.parfaits||0;this.essais=etat.essais||0;
 this.record=etat.record||{L:0,actions:0};this.nouvelle()}
Campagne.prototype.nouvelle=function(){this.g=NV.niveau(this.L,this.graine);this.grille=new Grille(this.g);return this.grille};
Campagne.prototype.reprendre=function(){this.essais++;this.grille=new Grille(this.g);return this.grille};
/* appelée quand la grille est gagnée : compte ses actions et ouvre la suivante */
Campagne.prototype.valider=function(){var G=this.grille;if(G.statut()!=='gagne')return null;
 var bilan={L:this.L,n:G.n,actions:G.actions,optimum:this.g.optimum,parfait:G.actions<=this.g.optimum};
 this.actions+=G.actions;if(bilan.parfait)this.parfaits++;
 if(this.L>this.record.L||(this.L===this.record.L&&this.actions<this.record.actions))this.record={L:this.L,actions:this.actions};
 bilan.record=this.record;bilan.fin=this.L>=NV.MAX;if(!bilan.fin){this.L++;this.nouvelle()}return bilan};
Campagne.prototype.etat=function(){return{graine:this.graine,L:this.L,actions:this.actions,parfaits:this.parfaits,essais:this.essais,record:this.record}};

/* score d'un défi : les cases éliminées, puis la plus grande cascade */
function scoreDefi(G){return{eliminees:G.eliminees,total:G.n*G.n,actions:G.actions,plusGrande:G.plusGrande,score:G.eliminees*10+G.plusGrande}}

return{Grille:Grille,Campagne:Campagne,rejouer:rejouer,scoreDefi:scoreDefi};
});
