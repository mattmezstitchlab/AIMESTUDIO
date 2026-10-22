/* AIME · Canevas · la scène commune : neutre, sans aucun moteur métier.
   Une scène décrit des calques (chacun avec sa grille et sa transformation vers la scène), des notes, et la vue.
   Les unités de la scène sont abstraites ; chaque adaptateur déclare ses unités natives et sa transformation
   (ex. broderie : une case = un pas). Le millimètre n'est qu'une unité physique facultative d'un adaptateur.
   Logique pure, testée sous node.

   Scène : { format:'aime-canevas', schema:1, id, titre, source:{type,id}|null,
     calques:[{ id, nom, adaptateur:null|'broderie'…, grille:{type,pas,colonnes,gouttiere,visible}, t:{echelle,dx,dy}, visible, verrou }],
     actif, notes:[ Note ], vue:{x,y,z} }
   Note : { id, ancre:{type:'point'|'element', x, y, ref?}, texte, auteur, creeLe, majLe, etat:'ouverte'|'resolue', resoluLe?, reponses:[{texte,auteur,le}], proposition? }
   Une note n'est JAMAIS une décision : proposer() en tire une proposition, que seul le projet peut confirmer. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMECanevasScene=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var GRILLES={
 universelle:{nom:'Grille universelle',dit:'Colonnes et rangées pour composer des blocs.',pas:24,colonnes:12,gouttiere:1},
 broderie:{nom:'Grille broderie',dit:'Une case par point de fil, repères tous les 10.',pas:12,repere:10},
 points:{nom:'Grille de points',dit:'Des points réguliers pour placer des nœuds et des relations.',pas:32},
 libre:{nom:'Fond libre',dit:'Aucune grille visible.',pas:0}};
var Z_MIN=.05,Z_MAX=16;
function uid(p){return(p||'')+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function borner(v,a,b){return Math.max(a,Math.min(b,v))}
function propre(t,max){return String(t==null?'':t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim().slice(0,max||2000)}

function grille(type,o){var g=GRILLES[type]?type:'universelle',d=GRILLES[g];o=o||{};return{type:g,pas:o.pas!=null?borner(+o.pas||0,0,400):d.pas,colonnes:d.colonnes||null,gouttiere:d.gouttiere||null,repere:d.repere||null,visible:o.visible!==false}}
function calque(o){o=o||{};return{id:o.id||uid('c-'),nom:propre(o.nom||'Calque',80),adaptateur:o.adaptateur||null,grille:grille(o.grille&&o.grille.type||o.type||'universelle',o.grille),
 t:{echelle:o.t&&+o.t.echelle>0?+o.t.echelle:1,dx:o.t&&+o.t.dx||0,dy:o.t&&+o.t.dy||0},visible:o.visible!==false,verrou:!!o.verrou,taille:o.taille||null}}
function vide(o){o=o||{};var c=calque({nom:'Plan de travail',type:o.grille||'universelle'});
 return{format:'aime-canevas',schema:1,id:o.id||uid('cv-'),titre:propre(o.titre||'Canevas vide',120),source:o.source||null,calques:[c],actif:c.id,notes:[],vue:{x:0,y:0,z:1},creeLe:o.maintenant||new Date().toISOString()}}
function actif(s){return s.calques.filter(function(c){return c.id===s.actif})[0]||s.calques[0]}
function regler(s,id,o){var c=s.calques.filter(function(x){return x.id===id})[0];if(!c)return s;if(o.type)c.grille=grille(o.type,{pas:o.pas!=null?o.pas:undefined,visible:c.grille.visible});
 if(o.pas!=null)c.grille.pas=borner(+o.pas||0,0,400);if(o.visible!=null)c.grille.visible=!!o.visible;return s}

/* ---------- la vue : coordonnées de scène ↔ écran ---------- */
function versEcran(v,x,y){return[(x-v.x)*v.z,(y-v.y)*v.z]}
function versScene(v,X,Y){return[v.x+X/v.z,v.y+Y/v.z]}
/* zoomer autour d'un point de l'écran (le point sous le pointeur reste immobile) */
function zoomer(v,f,X,Y){var z=borner(v.z*f,Z_MIN,Z_MAX),p=versScene(v,X,Y);return{x:p[0]-X/z,y:p[1]-Y/z,z:z}}
function zoomA(v,z,W,H){return zoomer(v,z/v.z,W/2,H/2)}
function deplacer(v,dX,dY){return{x:v.x-dX/v.z,y:v.y-dY/v.z,z:v.z}}
/* ajuster la vue à un rectangle de scène, avec une marge */
function ajuster(r,W,H,marge){marge=marge==null?40:marge;if(!r||!(r.l>0)||!(r.h>0))return{x:-W/2,y:-H/2,z:1};var z=borner(Math.min((W-2*marge)/r.l,(H-2*marge)/r.h),Z_MIN,Z_MAX);return{x:r.x-(W/z-r.l)/2,y:r.y-(H/z-r.h)/2,z:z}}
function pourcent(v){return Math.round(v.z*100)+' %'}

/* ---------- la grille neutre : les lignes visibles dans la vue (pour les grilles sans adaptateur) ---------- */
function lignes(c,v,W,H){var g=c.grille;if(!g.visible||!g.pas)return{v:[],h:[],points:[]};var pas=g.pas*c.t.echelle,ecran=pas*v.z;
 /* trop serrées à l'écran : on n'en garde qu'une sur n */
 var k=1;while(ecran*k<8)k*=2;pas*=k;var x0=Math.floor((v.x-c.t.dx)/pas)*pas+c.t.dx,y0=Math.floor((v.y-c.t.dy)/pas)*pas+c.t.dy,r={v:[],h:[],points:[],pas:pas};
 var fort=g.type==='broderie'?(g.repere||10):g.type==='universelle'?(g.colonnes||12):0;
 if(g.type==='points'){for(var x=x0;x<=v.x+W/v.z;x+=pas)for(var y=y0;y<=v.y+H/v.z;y+=pas)r.points.push(versEcran(v,x,y));return r}
 for(var a=x0;a<=v.x+W/v.z;a+=pas){var i=Math.round((a-c.t.dx)/(g.pas*c.t.echelle));r.v.push({X:versEcran(v,a,0)[0],fort:!!fort&&i%fort===0})}
 for(var b=y0;b<=v.y+H/v.z;b+=pas){var j=Math.round((b-c.t.dy)/(g.pas*c.t.echelle));r.h.push({Y:versEcran(v,0,b)[1],fort:!!fort&&j%fort===0})}return r}
/* aimanter une position de scène sur la grille du calque actif */
function aimanter(c,x,y){var g=c.grille;if(!g.visible||!g.pas||g.type==='libre')return[x,y];var p=g.pas*c.t.echelle;return[Math.round((x-c.t.dx)/p)*p+c.t.dx,Math.round((y-c.t.dy)/p)*p+c.t.dy]}

/* ---------- les notes : de vrais objets, jamais des décisions ---------- */
function note(s,o){o=o||{};var t=propre(o.texte,2000);if(!t)throw new Error('Une note a besoin d\'un texte.');var maintenant=o.maintenant||new Date().toISOString();
 var n={id:uid('n-'),ancre:{type:o.ref?'element':'point',x:+o.x||0,y:+o.y||0,ref:o.ref||null},texte:t,auteur:propre(o.auteur||'Vous',80),creeLe:maintenant,majLe:maintenant,etat:'ouverte',reponses:[]};s.notes.push(n);return n}
function trouver(s,id){var n=s.notes.filter(function(x){return x.id===id})[0];if(!n)throw new Error('Note introuvable.');return n}
function deplacerNote(s,id,x,y){var n=trouver(s,id);n.ancre.x=+x||0;n.ancre.y=+y||0;n.majLe=new Date().toISOString();return n}
function modifierNote(s,id,texte){var n=trouver(s,id),t=propre(texte,2000);if(!t)throw new Error('Une note a besoin d\'un texte.');n.texte=t;n.majLe=new Date().toISOString();return n}
function resoudre(s,id,qui){var n=trouver(s,id);n.etat='resolue';n.resoluLe=new Date().toISOString();n.resoluPar=propre(qui||'Vous',80);return n}
function rouvrir(s,id){var n=trouver(s,id);n.etat='ouverte';delete n.resoluLe;delete n.resoluPar;return n}
function repondre(s,id,texte,qui){var n=trouver(s,id),t=propre(texte,1000);if(!t)throw new Error('Une réponse a besoin d\'un texte.');n.reponses.push({texte:t,auteur:propre(qui||'Vous',80),le:new Date().toISOString()});n.majLe=new Date().toISOString();return n}
function retirerNote(s,id){trouver(s,id);s.notes=s.notes.filter(function(n){return n.id!==id});return s}
/* une note peut devenir une PROPOSITION : elle attend la confirmation du projet, elle ne change rien d'elle-même */
function proposer(s,id){var n=trouver(s,id);n.proposition={statut:'en attente',le:new Date().toISOString(),texte:n.texte,source:'note',noteId:n.id};return n.proposition}
function ouvertes(s){return s.notes.filter(function(n){return n.etat==='ouverte'})}

/* ---------- garder : la vue et les notes, jamais le contenu du projet (il reste dans le projet) ---------- */
function aGarder(s){return{format:s.format,schema:s.schema,id:s.id,titre:s.titre,source:s.source,calques:s.calques.map(function(c){return{id:c.id,nom:c.nom,adaptateur:c.adaptateur,grille:c.grille,t:c.t,visible:c.visible,verrou:c.verrou}}),actif:s.actif,notes:s.notes,vue:s.vue,creeLe:s.creeLe}}
function relire(o){if(!o||o.format!=='aime-canevas')return null;var s=vide({id:o.id,titre:o.titre,source:o.source});s.creeLe=o.creeLe||s.creeLe;
 if(Array.isArray(o.calques)&&o.calques.length)s.calques=o.calques.map(calque);s.actif=s.calques.some(function(c){return c.id===o.actif})?o.actif:s.calques[0].id;
 s.notes=(Array.isArray(o.notes)?o.notes:[]).filter(function(n){return n&&n.id&&n.texte}).map(function(n){return{id:String(n.id),ancre:{type:n.ancre&&n.ancre.ref?'element':'point',x:+(n.ancre&&n.ancre.x)||0,y:+(n.ancre&&n.ancre.y)||0,ref:n.ancre&&n.ancre.ref||null},
  texte:propre(n.texte,2000),auteur:propre(n.auteur||'Vous',80),creeLe:n.creeLe,majLe:n.majLe,etat:n.etat==='resolue'?'resolue':'ouverte',resoluLe:n.resoluLe,resoluPar:n.resoluPar,reponses:Array.isArray(n.reponses)?n.reponses.slice(0,100):[],proposition:n.proposition||undefined}});
 if(o.vue&&isFinite(o.vue.x)&&isFinite(o.vue.y)&&o.vue.z>0)s.vue={x:+o.vue.x,y:+o.vue.y,z:borner(+o.vue.z,Z_MIN,Z_MAX)};return s}

return{GRILLES:GRILLES,Z_MIN:Z_MIN,Z_MAX:Z_MAX,vide:vide,calque:calque,grille:grille,actif:actif,regler:regler,versEcran:versEcran,versScene:versScene,zoomer:zoomer,zoomA:zoomA,deplacer:deplacer,ajuster:ajuster,pourcent:pourcent,
 lignes:lignes,aimanter:aimanter,note:note,deplacerNote:deplacerNote,modifierNote:modifierNote,resoudre:resoudre,rouvrir:rouvrir,repondre:repondre,retirerNote:retirerNote,proposer:proposer,ouvertes:ouvertes,aGarder:aGarder,relire:relire};
});
