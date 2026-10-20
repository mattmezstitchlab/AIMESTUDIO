/* AIME · flux des missions (source unique, navigateur et serveur).
   Une information n'est écrite qu'une fois : une action produit des modifications ciblées par identifiant
   ({op:'set', id, champ, val} ou {op:'add', coll, val}), jamais une copie. Chaque vue relit la même donnée.

   Le journal d'une démonstration est une liste d'ACTIONS ({qui, action, p}), pas de modifications :
   rejouer(base, acces, regles, journal) revérifie chaque action avec les règles, dans l'ordre.
   Une action refusée n'a aucun effet, même si le navigateur l'a inscrite.

   Étapes : decouvrir → candidater → valider → organiser → realiser → cloturer → close (terminée). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEFlux=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var ETAPES=['decouvrir','candidater','valider','organiser','realiser','cloturer'];
var STATUT={decouvrir:'ouverte',candidater:'ouverte',valider:'ouverte',organiser:'attribuee',realiser:'en-cours',cloturer:'en-cours',close:'terminee'};
function statut(m){return STATUT[m&&m.etape]||'ouverte'}
function clone(o){return JSON.parse(JSON.stringify(o))}
function cherche(c,id){for(var k in c){var v=c[k];if(Array.isArray(v))for(var i=0;i<v.length;i++)if(v[i]&&v[i].id===id)return v[i]}return null}
function personne(c,id){return(c.personnes||[]).filter(function(p){return p.id===id})[0]||null}

/* l'identité et ses attributs viennent de la donnée et de l'accès, jamais de la requête */
function sujet(c,acces,id){var p=personne(c,id)||{};return{id:id,role:((acces&&acces.membres)||{})[id]||null,pro:p.groupe==='prestataires',qualifications:p.qualifications||[]}}
function ressource(c,m,step){var t=(c.taches||[]).filter(function(x){return x.mission===m.id});
 return{type:'mission',id:m.id,etape:m.etape,step:step||null,responsableId:m.responsable||null,coordinateurId:m.coordinateur||null,assigneeIds:m.affectes||[],
  candidateIds:(c.candidatures||[]).filter(function(x){return x.mission===m.id&&x.statut!=='non-retenue'}).map(function(x){return x.personne}),
  pro:m.nature==='prestation',reglementee:!!m.reglementee,qualification:m.qualification||null,confirme:!!m.confirme,tachesFaites:t.length>0&&t.every(function(x){return x.fait})}}
function resCandidature(x){return{type:'candidature',id:x.id,subjectId:x.personne}}

/* ---------- appliquer des modifications ciblées ---------- */
function appliquer(c,patches){(patches||[]).forEach(function(p){if(p.op==='set'){var o=cherche(c,p.id);if(o)o[p.champ]=clone(p.val)}else if(p.op==='add'){(c[p.coll]=c[p.coll]||[]).push(clone(p.val))}});return c}

/* ---------- une action → décision + modifications ---------- */
var ACTIONS={
 apply:function(c,s,m){var n=(c.candidatures||[]).length+1,id='c-'+(n<10?'0':'')+n;while(cherche(c,id)){n++;id='c-'+(n<10?'0':'')+n}
  var P=[{op:'add',coll:'candidatures',val:{id:id,mission:m.id,personne:s.id,statut:'deposee',message:'Candidature déposée depuis AIME (démonstration).'}}];if(m.etape==='decouvrir')P.push({op:'set',id:m.id,champ:'etape',val:'candidater'});
  return{patches:P,message:'Candidature envoyée.',courriel:{a:m.responsable,objet:'Nouvelle candidature · '+m.titre}}},
 shortlist:function(c,s,m,p){var x=cherche(c,p.candidature);if(!x||x.mission!==m.id||x.statut!=='deposee')return{refus:'candidature introuvable pour cette mission'};
  return{patches:[{op:'set',id:x.id,champ:'statut',val:'proposee'},{op:'set',id:m.id,champ:'etape',val:'valider'}],message:'Candidature proposée pour validation.'}},
 validate:function(c,s,m){var x=(c.candidatures||[]).filter(function(y){return y.mission===m.id&&y.statut==='proposee'})[0];if(!x)return{refus:'aucune candidature proposée'};
  var P=[{op:'set',id:x.id,champ:'statut',val:'retenue'},{op:'set',id:m.id,champ:'affectes',val:[x.personne]},{op:'set',id:m.id,champ:'etape',val:'organiser'},{op:'set',id:m.id,champ:'confirme',val:false}];
  (c.candidatures||[]).forEach(function(y){if(y.mission===m.id&&y.id!==x.id&&y.statut==='deposee')P.push({op:'set',id:y.id,champ:'statut',val:'non-retenue'})});
  return{patches:P,message:'Mission attribuée.',courriel:{a:x.personne,objet:'Mission confirmée · '+m.titre}}},
 reject:function(c,s,m){var x=(c.candidatures||[]).filter(function(y){return y.mission===m.id&&y.statut==='proposee'})[0];if(!x)return{refus:'aucune candidature proposée'};
  return{patches:[{op:'set',id:x.id,champ:'statut',val:'deposee'},{op:'set',id:m.id,champ:'etape',val:'candidater'}],message:'Proposition renvoyée au responsable.'}},
 confirm:function(c,s,m){return{patches:[{op:'set',id:m.id,champ:'confirme',val:true}],message:'Horaire et accès confirmés.'}},
 start:function(c,s,m){return{patches:[{op:'set',id:m.id,champ:'etape',val:'realiser'}],message:'Mission démarrée.'}},
 task:function(c,s,m,p){var t=cherche(c,p.tache);if(!t||t.mission!==m.id)return{refus:'tâche introuvable pour cette mission'};return{patches:[{op:'set',id:t.id,champ:'fait',val:!t.fait}],message:t.fait?'Tâche rouverte.':'Tâche faite.'}},
 finish:function(c,s,m){return{patches:[{op:'set',id:m.id,champ:'etape',val:'cloturer'}],message:'Réalisation déclarée terminée.',courriel:{a:m.responsable,objet:'Mission terminée · '+m.titre}}},
 close:function(c,s,m){return{patches:[{op:'set',id:m.id,champ:'etape',val:'close'}],message:'Mission clôturée.'}},
 /* lieu et horaire : un changement de logistique demande une nouvelle confirmation au prestataire */
 move:function(c,s,m,p){var l=(c.lieux||[]).filter(function(x){return x.id===p.lieu})[0];if(!l)return{refus:'lieu inconnu'};if(l.id===m.lieu)return{refus:'c\'est déjà le lieu de la mission'};
  return{patches:[{op:'set',id:m.id,champ:'lieu',val:l.id}].concat(m.etape==='organiser'?[{op:'set',id:m.id,champ:'confirme',val:false}]:[]),message:'Lieu modifié partout.',courriel:m.affectes&&m.affectes[0]?{a:m.affectes[0],objet:'Lieu modifié · '+m.titre}:null}},
 reschedule:function(c,s,m,p){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.debut||''))return{refus:'horaire invalide'};if(p.debut===m.debut)return{refus:'c\'est déjà l\'horaire de la mission'};
  return{patches:[{op:'set',id:m.id,champ:'debut',val:p.debut}].concat(m.etape==='organiser'?[{op:'set',id:m.id,champ:'confirme',val:false}]:[]),message:'Horaire modifié partout.',courriel:m.affectes&&m.affectes[0]?{a:m.affectes[0],objet:'Horaire modifié · '+m.titre}:null}},
 reassign:function(c,s,m,p,acces){var r=((acces&&acces.membres)||{})[p.responsable];if(r!=='editor'&&r!=='owner')return{refus:'le responsable doit faire partie de l\'organisation'};if(p.responsable===m.responsable)return{refus:'c\'est déjà le responsable'};
  return{patches:[{op:'set',id:m.id,champ:'responsable',val:p.responsable}],message:'Responsable modifié partout.',courriel:{a:p.responsable,objet:'Vous êtes responsable · '+m.titre}}}
};
var REGLE={move:'edit',reschedule:'edit'};

function transition(c,acces,regles,qui,action,p){p=p||{};var m=cherche(c,p.mission);
 if(!m||!(c.missions||[]).some(function(x){return x.id===m.id}))return{allow:false,rule:'mission',reason:'mission inconnue'};
 var f=ACTIONS[action];if(!f)return{allow:false,rule:'mission.'+action,reason:'action inconnue : refusée par défaut'};
 var s=sujet(c,acces,qui),d=regles.can(s,REGLE[action]||action,ressource(c,m));if(!d.allow)return{allow:false,rule:d.rule,reason:d.reason};
 var e=f(c,s,m,p,acces);if(e.refus)return{allow:false,rule:d.rule,reason:e.refus};
 return{allow:true,rule:d.rule,patches:e.patches,message:e.message,courriel:e.courriel||null}}

/* rejoue un journal d'actions sur la donnée d'origine, chaque action revérifiée */
function rejouer(base,acces,regles,journal){var c=clone(base),ok=0,refus=[];
 (journal||[]).forEach(function(a,i){var t=transition(c,acces,regles,a.qui,a.action,a.p);if(t.allow){appliquer(c,t.patches);ok++}else refus.push({i:i,action:a.action,raison:t.reason})});
 c.revision=(base.revision||1)+ok;return{contenu:c,refus:refus}}

/* actions possibles pour une personne sur une mission (affichage ; le serveur revérifie) */
function possibles(c,acces,regles,qui,m){var s=sujet(c,acces,qui),r=ressource(c,m),out={};
 ['apply','shortlist','validate','reject','confirm','start','task','finish','close','edit','reassign'].forEach(function(a){out[a]=regles.can(s,a,r)});return out}

return{ETAPES:ETAPES,statut:statut,sujet:sujet,ressource:ressource,resCandidature:resCandidature,appliquer:appliquer,transition:transition,rejouer:rejouer,possibles:possibles,REGLE:REGLE};
});
