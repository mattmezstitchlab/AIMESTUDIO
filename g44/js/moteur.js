/* AIME G44 LAB · moteur de simulation.
   Déterministe (aucun hasard, aucune horloge), isolé (l'état initial n'est jamais modifié), annulable (abandonner = ne rien garder).
   Il n'exécute AUCUNE opération réelle : il produit un rapport et une PROPOSITION d'ordre de contrôles, à faire valider.

   Méthode : 1 charger l'état · 2 identifier la valeur · 3 copier l'état · 4 parcourir les dépendances qui propagent
   · 5 appliquer les règles connues du scénario · 6 relever les incohérences · 7 proposer un ordre · 8 comparer · 9 rapporter.
   Une relation de chronologie ou une hypothèse ne transmet jamais une modification : elle est signalée, pas appliquée. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./dossier.js'));else root.G44Moteur=factory(root.G44Dossier)})(typeof self!=='undefined'?self:this,function(D){'use strict';
var copie=function(o){return JSON.parse(JSON.stringify(o))},fr=function(d){var p=String(d).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d};
function etatInitial(){return D.dossier()}
function liensDe(e,id){return e.liens.filter(function(l){return l.de===id})}
function liensVers(e,id){return e.liens.filter(function(l){return l.vers===id})}

/* 4 · parcours des dépendances depuis l'objet modifié : seuls les types qui propagent sont suivis */
function parcourir(e,depart){var vus={},ordre=[],chemins={},file=[depart];vus[depart]=1;chemins[depart]=[];
 while(file.length){var id=file.shift();liensDe(e,id).forEach(function(l){var t=D.RELATIONS[l.type];if(!t||!t.propage||vus[l.vers])return;vus[l.vers]=1;chemins[l.vers]=chemins[id].concat([l.id]);ordre.push(l.vers);file.push(l.vers)})}
 return{ordre:ordre,chemins:chemins}}

/* simulation d'une nouvelle date d'événement pour le mariage (le scénario fondateur) */
function simuler(etat,demande){var avant=etat||etatInitial(),e=copie(avant),obj=demande.objet,val=demande.valeur,o=e.objets[obj];
 if(!o||!o.dates)throw new Error('objet sans date : '+obj);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(val))throw new Error('date attendue AAAA-MM-JJ');
 var r={demande:{objet:obj,champ:'dates.evenement',de:o.dates.evenement,vers:val},touches:[],independants:[],bloquants:[],incoherences:[],controles:[],incertitudes:[],chronologie:[],plan:[],journal:[]};
 var log=function(t){r.journal.push(t)};
 log('1 · État initial chargé (version '+avant.version+').');log('2 · Valeur à corriger : '+o.nom+', date de l\'événement '+o.dates.evenement+' → '+val+'.');
 if(val===o.dates.evenement){log('Aucune différence : rien à simuler.');r.etat=e;r.diff=[];return r}
 log('3 · Copie isolée de l\'état : l\'original reste inchangé.');
 o.dates.evenement=val;o.dates.effet=val;
 /* 4 · dépendances */
 var p=parcourir(e,obj);log('4 · Dépendances parcourues : '+p.ordre.length+' objet(s) atteint(s) par des relations qui propagent.');
 /* 5 · règles connues du scénario */
 p.ordre.forEach(function(id){var x=e.objets[id],via=e.liens.filter(function(l){return l.vers===id&&(l.de===obj||p.ordre.indexOf(l.de)>=0)&&D.RELATIONS[l.type].propage})[0],t={id:id,nom:x.nom,via:p.chemins[id],type:via.type,regle:via.regle||null,niveau:'simule',effet:''};/* le niveau le plus faible se propage : une conséquence d'une simulation reste simulée */
  if(id==='r-couple'){x.depuis=val;t.effet='Le lien de couple daterait du '+fr(val)+'.'}
  else if(id==='per-foyer'){x.debut=val;t.effet='La période s\'ouvrirait le '+fr(val)+' (R1).'}
  else if(id==='op-ratt'){t.effet='Opération active rattachée à la période : la période ne peut pas être modifiée directement (R3).';r.bloquants.push({id:id,regle:'R3',texte:D.REGLES.R3.texte,niveau:'simule'})}
  else if(id==='r-ratt'){t.effet='À recréer après la correction, si la date d\'effet reste dans la période.'}
  r.touches.push(t)});
 log('5 · Règles du scénario appliquées : R1, R3'+(r.bloquants.length?' (blocage relevé)':'')+'.');
 /* 6 · incohérences */
 var piece=e.objets['d-mariage'].mentionne['ev-mariage'];
 if(piece!==val)r.incoherences.push({regle:'R4',id:'d-mariage',texte:'La valeur envisagée ('+fr(val)+') ne concorde pas avec l\'acte de mariage fictif ('+fr(piece)+').',niveau:'documente'});
 var ratt=e.objets['op-ratt'].dates.effet,deb=e.objets['per-foyer'].debut;
 if(ratt<deb)r.incoherences.push({regle:'R2',id:'op-ratt',texte:'Le rattachement prend effet le '+fr(ratt)+', avant l\'ouverture simulée de la période ('+fr(deb)+'). Sa date d\'effet devrait être réexaminée : le laboratoire ne la choisit pas.',niveau:'simule'});
 log('6 · Incohérences relevées : '+r.incoherences.length+'.');
 /* indépendants : objets non atteints, présentés comme inchangés */
 Object.keys(e.objets).forEach(function(id){if(id===obj||p.ordre.indexOf(id)>=0)return;var x=e.objets[id];if(['personne','procedure','autorisation','document'].indexOf(x.type)>=0)return;if(e.liens.some(function(l){return l.type==='hypothese'&&l.vers===id&&(p.ordre.indexOf(l.de)>=0||l.de===obj)}))return;r.independants.push({id:id,nom:x.nom,raison:raisonIndependance(e,id,obj)})});
 /* hypothèses et chronologie : signalées, jamais appliquées */
 e.liens.forEach(function(l){if(l.type==='hypothese'&&(p.ordre.indexOf(l.de)>=0||l.de===obj))r.incertitudes.push({id:l.vers,nom:e.objets[l.vers].nom,texte:l.pourquoi,niveau:'nonverifie'});
  if(l.type==='chronologie'&&(l.de===obj||l.vers===obj))r.chronologie.push({id:l.de===obj?l.vers:l.de,texte:l.pourquoi})});
 /* 7 · ordre de contrôles proposé */
 r.plan=plan(e,r);log('7 · Ordre de contrôles proposé : '+r.plan.length+' étapes. Aucune n\'est exécutée.');
 /* 8 · comparaison */
 r.etat=e;r.diff=comparer(avant,e);log('8 · États comparés : '+r.diff.length+' valeur(s) différente(s).');
 log('9 · Rapport produit. Simulation abandonnable sans trace sur l\'état initial.');
 r.empreinte=empreinte(r);return r}
function raisonIndependance(e,id,obj){if(liensVers(e,id).some(function(l){return l.type==='chronologie'})||liensDe(e,id).some(function(l){return l.type==='chronologie'&&l.vers===obj}))return'Seulement voisin dans le temps : aucune règle ne le lie à la date modifiée.';
 var o=e.objets[id];if(o.type==='operation')return'Opération passée : elle reste dans l\'historique ; une correction crée une nouvelle version.';if(o.genre==='familiale')return'Découle de la naissance, pas du mariage.';if(o.type==='droit')return'Lien seulement hypothétique : non appliqué.';return'Aucune relation qui propage ne le relie à la date modifiée.'}
/* une proposition, ordonnée, à faire valider ; chaque étape dit qui peut la faire et avec quel niveau de connaissance */
function plan(e,r){var P=[],n=function(t,qui,hab,niveau,det){P.push({n:P.length+1,texte:t,qui:qui,habilitation:hab||null,niveau:niveau,detail:det||''})},val=r.demande.vers;
 n('Comparer la valeur envisagée avec l\'acte de mariage','Agent',null,'documente',r.incoherences.some(function(i){return i.regle==='R4'})?'Écart relevé : ne pas poursuivre sans pièce concordante.':'Concordance avec la pièce fictive.');
 if(r.bloquants.length)n('Suspendre le rattachement de l\'enfant, sans le supprimer','Agent habilité','H2','simule','Nécessaire pour lever le verrou de la période (R3).');
 n('Corriger la date du mariage ('+fr(val)+')','Agent habilité','H1','simule');
 n('Recalculer l\'ouverture de la période','Agent','','simule','R1 : ouverture au '+fr(val)+'.');
 if(r.bloquants.length){var r2=r.incoherences.some(function(i){return i.regle==='R2'});n(r2?'Faire décider la date d\'effet du rattachement':'Recréer le rattachement à sa date d\'effet d\'origine',r2?'Responsable':'Agent habilité',r2?'H3':'H2',r2?'nonverifie':'deduit',r2?'La date d\'origine précède la nouvelle période (R2). Le laboratoire ne propose pas de date.':'La date d\'effet ('+fr(e.objets['op-ratt'].dates.effet)+') reste dans la période corrigée.')}
 n('Contrôler : période, rattachement, lien de couple, filiations inchangées','Agent',null,'deduit');
 if(r.incertitudes.length)n('Faire examiner le droit familial fictif par une personne compétente','Responsable',null,'nonverifie','Lien hypothétique, non appliqué par la simulation.');
 n('Valider le plan avant toute intervention réelle','Responsable','H3','simule');
 n('Contrôle final documenté','Contrôleur',null,'simule','Vérifie la provenance et les décisions, sans accès automatique aux données personnelles.');
 return P}
/* 8 · différences entre deux états, champ par champ */
function comparer(a,b){var out=[];Object.keys(a.objets).forEach(function(id){var x=a.objets[id],y=b.objets[id];(function plonge(u,v,ch){Object.keys(Object.assign({},u,v)).forEach(function(k){var p=ch?ch+'.'+k:k,U=u&&u[k],V=v&&v[k];if(U&&typeof U==='object'&&!Array.isArray(U))plonge(U,V,p);else if(JSON.stringify(U)!==JSON.stringify(V))out.push({id:id,nom:x.nom,champ:p,avant:U==null?null:U,apres:V==null?null:V})})})(x,y,'')});return out}
function empreinte(r){var s=JSON.stringify({d:r.demande,t:r.touches,b:r.bloquants,i:r.incoherences,p:r.plan}),h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16)}
/* objets atteints, par type de lien, pour l'onde du hero et le graphe */
function voisins(e,id){return liensDe(e,id).concat(liensVers(e,id))}
return{etatInitial:etatInitial,simuler:simuler,comparer:comparer,parcourir:parcourir,plan:plan,voisins:voisins,empreinte:empreinte,copie:copie};
});
