/* AIME · la Carte universelle : UNE source de données pour une personne.
   La Page Zéro la crée, le cube de la landing en montre une facette, Le Monde AIME l'enrichit. Aucun composant
   graphique n'en garde de copie : tous lisent cet objet, ou sa vue publique.

   La personne n'est ni un score ni un dossier : la Carte lui appartient. Rien n'est obligatoire. Tout est privé par
   défaut ; seule la personne choisit ce qui devient visible, et une publication est toujours explicite et révocable.

   Sans compte : la Carte vit dans ce navigateur (localStorage « aime-carte »), nulle part ailleurs.
   Avec un compte, plus tard : la même structure, conservée par Neon après authentification et consentement. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMECarte=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var SCHEMA=1;
/* les rubriques, toutes facultatives ; la visibilité se règle par rubrique */
var RUBRIQUES={
 nom:{nom:'Nom d\'affichage',defaut:'privee'},
 photo:{nom:'Photo',defaut:'privee'},
 naissance:{nom:'Date de naissance',defaut:'privee',jamaisPublique:true},
 couleurs:{nom:'Couleurs',defaut:'privee'},
 intention:{nom:'Intention',defaut:'privee'},
 moments:{nom:'Moments de vie',defaut:'privee'},
 formations:{nom:'Écoles et formations',defaut:'privee'},
 voyages:{nom:'Voyages et expériences',defaut:'privee'},
 competences:{nom:'Compétences',defaut:'privee'},
 interets:{nom:'Centres d\'intérêt',defaut:'privee'},
 reves:{nom:'Rêves et projets',defaut:'privee'},
 contributions:{nom:'Contributions',defaut:'privee'},
 territoires:{nom:'Territoires',defaut:'privee'},
 relations:{nom:'Relations',defaut:'privee',jamaisPublique:true}};
var VISIBILITES=['privee','contacts','publique'];
var COULEURS=['#FB7185','#F59E0B','#7C5CFF','#22D3EE','#34D399','#F472B6','#60A5FA','#FBBF24','#A3E635','#EDEDF0'];

function uid(p){return(p||'c')+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)}
function vide(date){var v={};Object.keys(RUBRIQUES).forEach(function(k){v[k]=RUBRIQUES[k].defaut});
 return{format:'aime-carte',schema:SCHEMA,id:uid('carte-'),version:1,creeLe:date||null,
  nom:'',photo:null,naissance:null,couleurs:[],intention:'',moments:[],formations:[],voyages:[],competences:[],interets:[],reves:[],
  contributions:{proposees:[],recherchees:[]},territoires:[],relations:[],
  visibilite:v,publication:{publiee:false,consentement:null,revoqueeLe:null},suite:{},
  historique:[{version:1,date:date||null,note:'Naissance de la Carte'}]}}
function migrer(c){if(!c||c.format!=='aime-carte')return null;if(!c.schema)c.schema=1;var v=vide(c.creeLe);for(var k in v)if(c[k]==null)c[k]=v[k];for(var r in RUBRIQUES)if(!c.visibilite[r])c.visibilite[r]=RUBRIQUES[r].defaut;return c}
function copie(o){return JSON.parse(JSON.stringify(o))}

/* modifier : chaque changement crée une version ; la Carte précédente reste lisible dans l'historique */
function modifier(c,champs,note,date){var n=copie(c);for(var k in champs){if(k==='visibilite'||k==='publication'||k==='historique'||k==='id'||k==='format')continue;n[k]=champs[k]}
 n.version=c.version+1;n.historique=c.historique.concat([{version:n.version,date:date||null,note:note||'Modification',avant:resume(c)}]);if(n.historique.length>50)n.historique=n.historique.slice(-50);return n}
function resume(c){return{nom:c.nom,couleurs:c.couleurs.slice(),intention:c.intention,moments:c.moments.length,reves:c.reves.slice(0,1)}}
function rendreVisible(c,rubrique,niveau){if(!RUBRIQUES[rubrique])throw new Error('rubrique inconnue');if(VISIBILITES.indexOf(niveau)<0)throw new Error('visibilité inconnue');
 if(RUBRIQUES[rubrique].jamaisPublique&&niveau==='publique')throw new Error(RUBRIQUES[rubrique].nom+' ne peut pas être publique');var n=copie(c);n.visibilite[rubrique]=niveau;return n}

/* la vue publique : seulement ce que la personne a rendu public ; jamais la naissance, jamais les relations, jamais l'historique */
function vuePublique(c){if(!c.publication||!c.publication.publiee)return null;var v={id:c.id,version:c.version};
 Object.keys(RUBRIQUES).forEach(function(k){if(RUBRIQUES[k].jamaisPublique)return;if(c.visibilite[k]==='publique')v[k]=copie(c[k])});return v}
/* publier : un consentement explicite, daté, avec son texte ; révocable à tout moment */
var TEXTE_CONSENTEMENT='Je choisis de rendre visibles dans le registre AIME les rubriques que j\'ai marquées « publique ». Je peux retirer ma Carte à tout moment.';
function publier(c,accord,date){if(accord!==true)throw new Error('consentement explicite requis');var pub=Object.keys(RUBRIQUES).filter(function(k){return c.visibilite[k]==='publique'});
 if(!pub.length)throw new Error('aucune rubrique publique : rien à publier');var n=copie(c);n.publication={publiee:true,consentement:{date:date||null,texte:TEXTE_CONSENTEMENT,rubriques:pub},revoqueeLe:null};return n}
function retirer(c,date){var n=copie(c);n.publication={publiee:false,consentement:null,revoqueeLe:date||null};return n}

/* mise en relation : seulement par ce qui a été déclaré publiquement, et toujours expliquée */
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim()}
function correspondances(a,b){if(!a||!b)return[];var out=[],vu={},L=function(x){return(x||[]).filter(Boolean)},has=function(liste,x){var n=norm(x);return L(liste).some(function(y){return norm(y)===n})},add=function(t,txt){if(vu[txt])return;vu[txt]=1;out.push({type:t,texte:txt})};
 var cA=a.contributions||{},cB=b.contributions||{};
 L(cA.proposees).forEach(function(p){if(has(cB.recherchees,p))add('contribution','Vous proposez « '+p+' » : cette personne le recherche.')});
 L(cA.recherchees).forEach(function(p){if(has(cB.proposees,p))add('contribution','Vous recherchez « '+p+' » : cette personne le propose.')});
 [['competences','compétence'],['interets','centre d\'intérêt'],['territoires','territoire']].forEach(function(r){L(a[r[0]]).forEach(function(x){if(has(b[r[0]],x))add(r[0],'En commun, '+r[1]+' : « '+x+' ».')})});
 L(a.reves).forEach(function(x){L(b.reves).forEach(function(y){var mx=norm(x).split(/\W+/).filter(function(w){return w.length>4}),my=norm(y).split(/\W+/);if(mx.some(function(w){return my.indexOf(w)>=0}))add('reves','Des projets proches : « '+x+' » et « '+y+' ».')})});
 return out}
/* le registre : des vues publiques, filtrées par ce qu'elles déclarent */
var FILTRES={projets:{nom:'Projets',champ:'reves'},interets:{nom:'Centres d\'intérêt',champ:'interets'},competences:{nom:'Compétences',champ:'competences'},contributions:{nom:'Contributions',champ:'contributions'},territoires:{nom:'Territoires',champ:'territoires'},parcours:{nom:'Parcours partagés',champ:'moments'}};
function valeurs(v,f){var x=v[FILTRES[f].champ];if(!x)return[];if(f==='contributions')return(x.proposees||[]).concat(x.recherchees||[]);if(f==='parcours')return x.map(function(m){return m.titre});return x}
function filtrer(vues,filtre,terme){return vues.filter(function(v){if(!filtre)return true;var vals=valeurs(v,filtre);if(!vals.length)return false;return!terme||vals.some(function(x){return norm(x).indexOf(norm(terme))>=0})})}
/* demandes de contact : réciproques ; rien n'est partagé avant l'acceptation */
function demander(de,vers,message,date){return{id:uid('d-'),de:de,vers:vers,message:message||'',etat:'en-attente',date:date||null}}
function repondre(d,accepte,date){var n=copie(d);n.etat=accepte?'acceptee':'refusee';n.reponseLe=date||null;return n}

/* ce qui reste à proposer, sans jamais redemander ce qui est déjà rempli */
function rempli(c,k){var v=c[k];if(k==='contributions')return v&&((v.proposees||[]).length||(v.recherchees||[]).length);return Array.isArray(v)?v.length>0:!!v}
function exporter(c){return JSON.stringify(c,null,2)}
function importer(json){var c=typeof json==='string'?JSON.parse(json):json;return migrer(c)}
return{SCHEMA:SCHEMA,RUBRIQUES:RUBRIQUES,VISIBILITES:VISIBILITES,COULEURS:COULEURS,FILTRES:FILTRES,TEXTE_CONSENTEMENT:TEXTE_CONSENTEMENT,
 vide:vide,migrer:migrer,modifier:modifier,rendreVisible:rendreVisible,vuePublique:vuePublique,publier:publier,retirer:retirer,
 correspondances:correspondances,filtrer:filtrer,valeurs:valeurs,demander:demander,repondre:repondre,rempli:rempli,exporter:exporter,importer:importer,norm:norm};
});
