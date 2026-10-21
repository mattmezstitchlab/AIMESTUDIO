/* AIME LIVE · le modèle du jour J, partagé par tout l'espace (navigateur et serveur, testé sous node).

   Une seule source : le contenu de l'événement (vitrine/donnees/<u>.json) et la couche d'accès (vitrine/acces/<u>.json).
   Le direct n'est PAS une copie qui dérive : c'est un JOURNAL d'actions ({qui, action, p, t}).
   rejouer(base, acces, journal, perms) revérifie chaque action avec les règles de l'espace (synchroview/permissions.js),
   dans l'ordre : une action refusée n'a aucun effet, même si un navigateur l'a inscrite ou diffusée.
   Le rôle vient TOUJOURS de l'appartenance à l'espace (acces.membres), jamais de l'action.

   Actions : retarder {moment, minutes, cascade} · fait {moment} · planB {moment, actif} · annoncer {texte, audience}
   Effet papillon : retarder un moment « en cascade » décale aussi tous les moments qui le suivent et ne sont pas faits ;
   la cascade est atomique : si une seule personne n'a pas le droit de modifier un des moments touchés, rien ne bouge. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMELive=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

var ACTIONS=['retarder','fait','planB','annoncer'];
var AUDIENCES={tous:'Tout le monde',equipe:'L\'équipe seulement'};
var MAX_JOURNAL=500,MAX_ANNONCE=280;

function hm(s){var m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m?(+m[1])*60+(+m[2]):null}
function fmt(min){min=((Math.round(min)%1440)+1440)%1440;var h=Math.floor(min/60),m=min%60;return(h<10?'0':'')+h+':'+(m<10?'0':'')+m}
function clone(o){return JSON.parse(JSON.stringify(o))}

/* l'axe du jour : les heures « avant le début » sont après minuit */
/* les moments sont écrits dans l'ordre du jour : le premier fixe le début, ce qui est plus tôt dans l'horloge est après minuit */
function axe(moments){for(var i=0;i<moments.length;i++){var x=hm(moments[i].debut);if(x!=null)return x}return 0}
function surAxe(v,debutJour){return v<debutJour?v+1440:v}

/* l'état de départ : les moments de l'événement, sans rien recopier d'autre */
function base(donnees){var M=(donnees&&donnees.moments)||[],d0=axe(M);
 var moments=M.map(function(m){var a=surAxe(hm(m.debut),d0),b=surAxe(hm(m.fin),d0);if(b<a)b+=1440;
  return{id:String(m.id),titre:String(m.titre||m.id),espace:String(m.espace||''),planB:m.planB?String(m.planB):'',public:m.public===true,
   assigneeId:m.assigneeId||null,authorId:m.authorId||null,equipe:m.equipe?String(m.equipe):'',debut:a,fin:b}});
 moments.sort(function(x,y){return x.debut-y.debut});
 return{evenement:{id:(donnees&&donnees.evenement&&donnees.evenement.id)||'',nom:(donnees&&donnees.evenement&&donnees.evenement.nom)||'',date:(donnees&&donnees.evenement&&donnees.evenement.date)||''},
  debutJour:d0,moments:moments,decalage:{},faits:{},planB:{},annonces:[]}}

function sujet(acces,qui){return{id:String(qui||''),role:((acces&&acces.membres)||{})[qui]||null}}
function ressource(m){return{type:'event',id:m.id,public:m.public,assigneeId:m.assigneeId,authorId:m.authorId}}
function moment(e,id){return e.moments.filter(function(m){return m.id===id})[0]||null}
function debutEff(e,m){return m.debut+(e.decalage[m.id]||0)}
function finEff(e,m){return m.fin+(e.decalage[m.id]||0)}

/* une action bien formée, ou null : le journal ne garde jamais autre chose */
function action(a){a=a||{};if(ACTIONS.indexOf(a.action)<0||typeof a.qui!=='string'||!/^[a-z0-9-]{2,40}$/.test(a.qui))return null;
 var p=a.p||{},o={qui:a.qui,action:a.action,t:typeof a.t==='number'&&isFinite(a.t)?Math.round(a.t):0,p:{}};
 if(a.action==='annoncer'){var tx=String(p.texte||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,MAX_ANNONCE);if(!tx)return null;o.p={texte:tx,audience:AUDIENCES[p.audience]?p.audience:'tous'};return o}
 if(typeof p.moment!=='string'||!/^[a-z0-9-]{1,60}$/.test(p.moment))return null;o.p.moment=p.moment;
 if(a.action==='retarder'){var n=Math.round(Number(p.minutes));if(!isFinite(n)||n===0||n<-60||n>120)return null;o.p.minutes=n;o.p.cascade=p.cascade===true}
 if(a.action==='planB')o.p.actif=p.actif!==false;
 return o}

/* une action → décision (avec la règle) et, si elle passe, ses effets */
function appliquer(e,acces,a,perms){var s=sujet(acces,a.qui),refus=function(r){return{ok:false,regle:r.rule||'',raison:r.reason||r}};
 if(!s.role)return refus('pas membre de cet espace');
 if(a.action==='annoncer'){var d=perms.can(s,'create',{type:'event'});if(!d.allow)return refus(d);
  e.annonces.push({qui:a.qui,texte:a.p.texte,audience:a.p.audience,t:a.t});return{ok:true,regle:d.rule}}
 var m=moment(e,a.p.moment);if(!m)return refus('moment inconnu');
 var d1=perms.can(s,'edit',ressource(m));if(!d1.allow)return refus(d1);
 if(a.action==='fait'){if(e.faits[m.id])return refus('déjà marqué fait');e.faits[m.id]=a.t||true;return{ok:true,regle:d1.rule}}
 if(a.action==='planB'){if(!m.planB)return refus('pas de plan B prévu pour ce moment');e.planB[m.id]=a.p.actif;return{ok:true,regle:d1.rule}}
 /* retarder : le moment, et en cascade tous ceux qui commencent après lui et ne sont pas faits */
 if(e.faits[m.id])return refus('ce moment est déjà fait');
 var touches=[m];if(a.p.cascade){var t0=debutEff(e,m);e.moments.forEach(function(x){if(x!==m&&!e.faits[x.id]&&debutEff(e,x)>=t0)touches.push(x)})}
 for(var i=0;i<touches.length;i++){var d=perms.can(s,'edit',ressource(touches[i]));if(!d.allow)return refus({rule:d.rule,reason:'cascade refusée : « '+touches[i].titre+' » — '+d.reason})}
 touches.forEach(function(x){e.decalage[x.id]=(e.decalage[x.id]||0)+a.p.minutes});
 return{ok:true,regle:d1.rule,touches:touches.map(function(x){return x.id})}}

/* tout l'état se reconstruit depuis la base et le journal : chaque écran arrive au même résultat */
function rejouer(b,acces,journal,perms){var e=clone(b),trace=[];
 (journal||[]).slice(-MAX_JOURNAL).forEach(function(brut){var a=action(brut);if(!a){trace.push({a:brut,ok:false,raison:'action mal formée'});return}
  var r=appliquer(e,acces,a,perms);trace.push({a:a,ok:r.ok,regle:r.regle,raison:r.raison||'',touches:r.touches||[]})});
 return{etat:e,trace:trace}}

/* ce que voit UNE personne à UNE heure : rien de plus que ce que les règles lui ouvrent */
function vue(e,acces,qui,heure,perms){var s=sujet(acces,qui),now=surAxe(heure,e.debutJour);
 var equipe=!!(s.role&&perms.can(s,'read',{type:'item',audience:'equipe'}).allow);
 var M=e.moments.filter(function(m){return s.role&&perms.can(s,'read',ressource(m)).allow}).map(function(m){var a=debutEff(e,m),b=finEff(e,m),f=!!e.faits[m.id];
  return{id:m.id,titre:m.titre,espace:e.planB[m.id]&&m.planB?m.planB:m.espace,planBActif:!!(e.planB[m.id]&&m.planB),planB:m.planB,public:m.public,
   debut:fmt(a),fin:fmt(b),prevu:fmt(m.debut),decalage:e.decalage[m.id]||0,fait:f,
   statut:f?'fait':now>=b?'passe':now>=a?'en-cours':'a-venir',dans:a-now,equipe:equipe?m.equipe:'',
   modifiable:!!(s.role&&perms.can(s,'edit',ressource(m)).allow),assigneeId:m.assigneeId,_t:a}}).sort(function(x,y){return x._t-y._t});
 var maintenant=M.filter(function(m){return m.statut==='en-cours'}),ensuite=M.filter(function(m){return m.statut==='a-venir'})[0]||null;
 var annonces=e.annonces.filter(function(n){return n.audience==='tous'||equipe}).slice().reverse();
 return{qui:s,equipe:equipe,annoncer:!!(s.role&&perms.can(s,'create',{type:'event'}).allow),moments:M,maintenant:maintenant,ensuite:ensuite,annonces:annonces,heure:fmt(now)}}

/* le décalage d'un moment pour l'humain : « +15 min », « −5 min » */
function ecart(n){return n?(n>0?'+':'−')+Math.abs(n)+' min':''}

return{ACTIONS:ACTIONS,AUDIENCES:AUDIENCES,MAX_ANNONCE:MAX_ANNONCE,hm:hm,fmt:fmt,base:base,action:action,rejouer:rejouer,vue:vue,ecart:ecart,sujet:sujet,surAxe:surAxe};
});
