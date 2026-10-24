/* AIME · module Temps, le moteur PUR (aucune base, aucun réseau) : testé sous node, utilisé par le serveur (api/_temps/moteur.mjs).
   Il ne réécrit aucune règle : chaque décision passe par synchroview/permissions.js (P), et la grammaire des gestes comme
   l'effet papillon (la cascade, atomique) sont ceux d'AIME Live (live/modele.js, L), appliqués à l'état lu dans la table moments.

   Le programme d'un projet (lu dans la base par le serveur) :
     { rev, moments: [{ id, titre, lieu, debut, fin, decalage, audience, responsable, planB, planBActif, fait, note, position, majRev }],
       membres: { userId: role }, confirmations: { userId: { momentId: rev } }, revImport }   (revImport : la révision du programme de départ)
   Heures : minutes depuis minuit le jour de l'événement (0 à 2879).

   decider(prog, sujet, geste, P)      → { ok, code, regle, raison, touches[], effets[] } : rien n'est écrit ici
   conflit(prog, decision, revVue)     → le premier moment touché qui a changé après la révision vue par le navigateur, ou null
   vue(prog, sujet, P)                 → ce que CETTE personne peut voir et faire, champ par champ (le serveur n'envoie que ça)
   comparer(prog, demandeur, cible, P) → la vue de la cible, réduite à ce que le demandeur peut lui-même lire
   historique(lignes, prog, sujet, P, noms) → le journal filtré pour cette personne
   reconstruire(lignes)                → l'état rejoué depuis le journal (doit égaler la table moments) */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../../live/modele.js'));else root.AIMETempsMoteur=factory(root.AIMELive)})(typeof self!=='undefined'?self:this,function(L){'use strict';

var AUDIENCES={public:'Tout le monde',membres:'Les membres du projet',equipe:'L\'équipe',organisation:'L\'organisation'};
var GESTES=['retarder','fait','planB','confirmer'];
var JOUR_MAX=2879;

function fmt(min){return L.fmt(min)}
function ressource(m){return{type:'event',id:m.id,public:m.audience==='public',assigneeId:m.responsable||null,authorId:null}}
/* lire un moment : la règle du programme (event.read) PUIS son audience (item.read) ; les deux doivent passer */
function lisible(s,m,P){return !!(s&&s.role&&P.can(s,'read',ressource(m)).allow&&P.can(s,'read',{type:'item',audience:m.audience}).allow)}
function equipe(s,P){return !!(s&&s.role&&P.can(s,'read',{type:'item',audience:'equipe'}).allow)}
function orga(s,P){return !!(s&&s.role&&P.can(s,'create',{type:'event'}).allow)}
function debutEff(m){return m.debut+(m.decalage||0)}
function finEff(m){return m.fin+(m.decalage||0)}
function trier(M){return M.slice().sort(function(a,b){return debutEff(a)-debutEff(b)||a.position-b.position||(a.id<b.id?-1:1)})}
function parId(prog,id){for(var i=0;i<prog.moments.length;i++)if(prog.moments[i].id===id)return prog.moments[i];return null}
function etatDe(m){return{decalage:m.decalage||0,fait:!!m.fait,planBActif:!!m.planBActif}}

/* l'état au format d'AIME Live : les décalages déjà appliqués deviennent la base ; seul le nouveau geste est rejoué */
function versLive(prog){var M=trier(prog.moments).map(function(m){return{id:m.id,titre:m.titre,espace:m.lieu,planB:m.planB||'',public:m.audience==='public',assigneeId:m.responsable||null,authorId:null,equipe:'',debut:debutEff(m),fin:finEff(m)}});
 var faits={},planB={};prog.moments.forEach(function(m){if(m.fait)faits[m.id]=true;if(m.planBActif)planB[m.id]=true});
 return{evenement:{id:'',nom:'',date:''},debutJour:0,moments:M,decalage:{},faits:faits,planB:planB,annonces:[]}}

function refus(code,regle,raison){return{ok:false,code:code,regle:regle||'',raison:raison,touches:[],effets:[]}}

function decider(prog,sujet,geste,P){geste=geste||{};
 if(!sujet||!sujet.role)return refus(404,'','Projet introuvable.');
 if(GESTES.indexOf(geste.action)<0)return refus(400,'','Geste inconnu.');
 var p=geste.p||{},m=typeof p.moment==='string'?parId(prog,p.moment):null;
 /* un moment qu'on ne peut pas lire n'existe pas pour soi : même réponse qu'un moment inconnu */
 if(!m||!lisible(sujet,m,P))return refus(404,'','Moment introuvable.');
 if(geste.action==='confirmer'){var c=P.can(sujet,'confirm',ressource(m));if(!c.allow)return refus(403,c.rule,c.reason);
  var deja=((prog.confirmations||{})[sujet.id]||{})[m.id]||0;if(deja>=m.majRev||m.majRev<=(prog.revImport||0))return refus(409,c.rule,'Rien de nouveau à confirmer pour ce moment.');
  return{ok:true,code:200,regle:c.rule,raison:'',touches:[m.id],effets:[],confirme:m.id}}
 var a=L.action({qui:'x'+String(sujet.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,60),action:geste.action,p:p,t:0});
 if(!a)return refus(400,'','Geste mal formé.');
 var acces={membres:{}};acces.membres[a.qui]=sujet.role;
 var perms={can:function(s,act,r){return P.can({id:sujet.id,role:s.role},act,r)}};   /* le sujet réel, pas l'alias exigé par le format du journal du direct */
 var r=L.rejouer(versLive(prog),acces,[a],perms),d=r.trace[0],e=r.etat;
 if(!d.ok){var raison=d.raison||'refusé';
  /* le motif d'une cascade refusée ne nomme jamais un moment que cette personne ne peut pas lire */
  if(/^cascade refusée/.test(raison)){var nomme=/« (.*) »/.exec(raison),vu=nomme&&prog.moments.some(function(x){return x.titre===nomme[1]&&lisible(sujet,x,P)});if(!vu)raison='cascade refusée : un des moments suivants ne vous est pas attribué'}
  return refus(/déjà|pas de plan B/.test(raison)?409:403,d.regle,raison)}
 var touches=geste.action==='retarder'?d.touches:[m.id],effets=[];
 for(var i=0;i<touches.length;i++){var x=parId(prog,touches[i]),avant=etatDe(x),apres={decalage:avant.decalage+(e.decalage[x.id]||0),fait:!!e.faits[x.id],planBActif:!!e.planB[x.id]};
  if(x.debut+apres.decalage<0||x.fin+apres.decalage>JOUR_MAX||Math.abs(apres.decalage)>720)return refus(400,d.regle,'« '+(lisible(sujet,x,P)?x.titre:'un moment')+' » sortirait de la journée.');
  if(apres.decalage!==avant.decalage||apres.fait!==avant.fait||apres.planBActif!==avant.planBActif)effets.push({id:x.id,avant:avant,apres:apres})}
 if(!effets.length)return refus(409,d.regle,'Ce geste ne change rien.');
 return{ok:true,code:200,regle:d.regle,raison:'',touches:effets.map(function(f){return f.id}),effets:effets}}

/* conflit : un moment touché a changé après la révision que la personne avait sous les yeux */
function conflit(prog,decision,revVue){var v=Number(revVue);if(!isFinite(v)||v<0)return{raison:'révision vue manquante'};
 for(var i=0;i<decision.touches.length;i++){var m=parId(prog,decision.touches[i]);if(m&&m.majRev>v)return{moment:m.id}}return null}

/* les gestes possibles sur un moment, pour CETTE personne : calculés ici, revérifiés à l'envoi */
function gestesSur(prog,s,m,P){var ed=P.can(s,'edit',ressource(m)).allow,conf=((prog.confirmations||{})[s.id]||{})[m.id]||0;
 return{retarder:ed&&!m.fait,fait:ed&&!m.fait,planB:ed&&!!m.planB,confirmer:P.can(s,'confirm',ressource(m)).allow&&m.majRev>conf&&m.majRev>(prog.revImport||0)}}

/* une conséquence qu'AIME ne tranche pas : un moment qui empiète maintenant sur le suivant (et ne le faisait pas au départ).
   Proposée seulement à qui peut lire les deux et modifier le second ; jamais appliquée sans son geste. */
function propositions(prog,s,P,visibles){var V=trier(visibles),out=[];
 for(var i=0;i<V.length;i++)for(var j=0;j<V.length;j++){var A=V[i],B=V[j];if(A===B||B.fait)continue;
  if(debutEff(B)<debutEff(A))continue;
  var avant=A.fin<=B.debut,maintenant=finEff(A)>debutEff(B);if(!avant||!maintenant)continue;
  if(!P.can(s,'edit',ressource(B)).allow)continue;var n=finEff(A)-debutEff(B);
  out.push({type:'chevauchement',moment:B.id,apres:A.id,minutes:n,texte:'« '+B.titre+' » commence maintenant avant la fin de « '+A.titre+' ». Décaler « '+B.titre+' » et la suite de '+n+' min ?',geste:{action:'retarder',p:{moment:B.id,minutes:n,cascade:true}}})}
 return out}

function vue(prog,s,P){if(!s||!s.role)return null;var eq=equipe(s,P),org=orga(s,P),V=prog.moments.filter(function(m){return lisible(s,m,P)});
 var M=trier(V).map(function(m){var g=gestesSur(prog,s,m,P),o={id:m.id,titre:m.titre,lieu:m.planBActif&&m.planB?m.planB:m.lieu,debut:fmt(debutEff(m)),fin:fmt(finEff(m)),
   prevu:fmt(m.debut),decalage:m.decalage||0,fait:!!m.fait,planB:m.planB||'',planBActif:!!m.planBActif,audience:m.audience,audienceNom:AUDIENCES[m.audience],
   rev:m.majRev,gestes:g,aConfirmer:g.confirmer};
  if(eq&&m.note)o.note=m.note;                                            /* les consignes d'équipe restent à l'équipe */
  if(m.responsable){if(m.responsable===s.id)o.responsable='moi';else if(org)o.responsable=m.responsable}   /* qui porte quoi : l'organisation, ou soi-même */
  return o});
 return{rev:prog.rev,role:s.role,moments:M,propositions:propositions(prog,s,P,V),aConfirmer:M.filter(function(m){return m.aConfirmer}).map(function(m){return m.id}),
  peutComparer:P.can(s,'compare',{type:'space'}).allow,equipe:eq}}

/* la Comparaison ne crée aucun privilège : la vue de la cible, coupée à ce que le demandeur lit lui-même, champ par champ */
function comparer(prog,demandeur,cibleId,P){var d=P.can(demandeur,'compare',{type:'space'});if(!d.allow)return{ok:false,code:403,raison:d.reason};
 var role=(prog.membres||{})[cibleId];if(!role)return{ok:false,code:404,raison:'Cette personne n\'est pas membre du projet.'};
 var c={id:cibleId,role:role},vc=vue(prog,c,P),vd=vue(prog,demandeur,P),mien={};vd.moments.forEach(function(m){mien[m.id]=m});
 var M=vc.moments.filter(function(m){return mien[m.id]}).map(function(m){var o=Object.assign({},m),x=mien[m.id];
  if(!('note' in x))delete o.note;
  if(o.responsable==='moi')o.responsable='cible';                       /* « c'est cette personne qui porte ce moment » */
  else if(o.responsable!==undefined&&x.responsable===undefined)delete o.responsable;
  return o});
 var ids={};M.forEach(function(m){ids[m.id]=1});
 return{ok:true,code:200,cible:{id:cibleId,role:role},vue:{rev:vc.rev,role:role,moments:M,aConfirmer:vc.aConfirmer.filter(function(i){return ids[i]}),
  propositions:vc.propositions.filter(function(p){return ids[p.moment]&&ids[p.apres]}),peutComparer:false,equipe:vc.equipe&&vd.equipe}}}

/* le journal pour CETTE personne : une ligne n'apparaît que si elle peut lire un des moments touchés, et seulement ces moments.
   L'auteur est nommé si member.read le permet (noms : userId → nom, déjà réduits par le serveur), sinon « une personne ». */
function historique(lignes,prog,s,P,noms){noms=noms||{};var M={};prog.moments.forEach(function(m){M[m.id]=m});var org=orga(s,P);
 return(lignes||[]).map(function(l){var base={rev:Number(l.rev),action:l.action,le:l.le||null,moi:l.qui===s.id,qui:l.qui===s.id?'vous':(noms[l.qui]||'une personne')};
  if(l.action==='importer')return org?Object.assign(base,{moments:[],texte:'Programme importé ('+((l.p&&l.p.moments)||[]).length+' moments).'}):null;
  if(l.action==='confirmer'){var c=M[l.p&&l.p.moment];if(!c||!lisible(s,c,P)||!(org||l.qui===s.id))return null;return Object.assign(base,{moments:[{id:c.id,titre:c.titre}],texte:'Nouvel horaire de « '+c.titre+' » confirmé.'})}
  var vus=(l.effets||[]).filter(function(f){return M[f.id]&&lisible(s,M[f.id],P)});if(!vus.length)return null;
  var mo=vus.map(function(f){var m=M[f.id];return{id:f.id,titre:m.titre,avant:fmt(m.debut+f.avant.decalage),apres:fmt(m.debut+f.apres.decalage),fait:f.apres.fait,planB:f.apres.planBActif}});
  var t=l.action==='retarder'?('« '+mo[0].titre+' » '+(l.p.minutes>0?'décalé':'avancé')+' de '+Math.abs(l.p.minutes)+' min'+(mo.length>1?' (et '+(mo.length-1)+' moment'+(mo.length>2?'s':'')+' à la suite)':'')+'.'):
   l.action==='fait'?('« '+mo[0].titre+' » marqué fait.'):l.action==='planB'?('« '+mo[0].titre+' » '+(l.p.actif===false?'revient au lieu prévu':'passe en plan B')+'.'):'Changement inscrit.';
  return Object.assign(base,{moments:mo,texte:t})}).filter(Boolean)}

/* un programme type → les lignes de la table moments. Deux formats : celui des démonstrations (vitrine/donnees/<modèle>.json :
   espace, public, equipe, assigneeId) et celui du projet de démonstration de Temps (lieu, audience, note, responsable).
   responsables : clé ou identifiant du modèle → identifiant d'un membre réel ; sans correspondance, le moment n'a pas de responsable.
   Les heures « avant la première » sont après minuit (comme dans le direct). */
function importer(donnees,responsables){responsables=responsables||{};var src=(donnees&&donnees.moments)||[],d0=null;
 return src.map(function(m,i){var a=L.hm(m.debut),b=L.hm(m.fin);if(a==null||b==null)throw new Error('heure invalide : '+m.id);if(d0===null)d0=a;
  if(a<d0)a+=1440;if(b<a)b+=1440;if(b<d0)b+=1440;
  var aud=m.audience||(m.public?'public':'membres');if(!AUDIENCES[aud])throw new Error('audience inconnue : '+aud);
  var r=m.responsable||m.assigneeId||null;
  return{id:String(m.id),titre:String(m.titre||m.id).slice(0,120),lieu:String(m.lieu||m.espace||'').slice(0,120),debut:a,fin:b,decalage:0,audience:aud,
   responsable:r&&responsables[r]?responsables[r]:null,planB:String(m.planB||'').slice(0,120),planBActif:false,fait:false,note:String(m.note||m.equipe||'').slice(0,500),position:i}})}

/* la reconstruction : le programme de départ (ligne « importer »), puis les effets de chaque geste, dans l'ordre des révisions */
function reconstruire(lignes){var L2=(lignes||[]).slice().sort(function(a,b){return Number(a.rev)-Number(b.rev)}),etat=null,rev=0,conf={};
 L2.forEach(function(l){var r=Number(l.rev);if(r!==rev+1)throw new Error('révision manquante : '+(rev+1)+' attendue, '+r+' trouvée');rev=r;
  if(l.action==='importer'){if(etat)throw new Error('deux imports');etat={};(l.p.moments||[]).forEach(function(m){etat[m.id]={decalage:m.decalage||0,fait:!!m.fait,planBActif:!!m.planBActif,majRev:r}});return}
  if(!etat)throw new Error('geste avant l\'import');
  if(l.action==='confirmer'){(conf[l.qui]=conf[l.qui]||{})[l.p.moment]=r;return}
  (l.effets||[]).forEach(function(f){if(!etat[f.id])throw new Error('moment inconnu : '+f.id);var x=etat[f.id];
   if(x.decalage!==f.avant.decalage||x.fait!==f.avant.fait||x.planBActif!==f.avant.planBActif)throw new Error('effet incohérent sur '+f.id+' (rev '+r+')');
   etat[f.id]={decalage:f.apres.decalage,fait:f.apres.fait,planBActif:f.apres.planBActif,majRev:r}})});
 return{rev:rev,moments:etat||{},confirmations:conf}}

return{AUDIENCES:AUDIENCES,GESTES:GESTES,importer:importer,lisible:lisible,ressource:ressource,decider:decider,conflit:conflit,vue:vue,comparer:comparer,propositions:propositions,historique:historique,reconstruire:reconstruire,fmt:fmt,debutEff:debutEff,finEff:finEff};
});
