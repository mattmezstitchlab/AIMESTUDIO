/* AIME G44 LAB · le Rewind du hero. Une grille de saisie fictive (reconstitution pédagogique, codes inventés), le refus
   que tout agent connaît (période verrouillée par un rattachement actif), puis la chaîne qui se défait et se rejoue.
   Rien n'est joué « à la main » : chaque étape vient du moteur (G44Moteur.simuler) sur le dossier fictif, et rien n'est
   modifié : on travaille sur une copie, abandonnée d'un geste. sequence() est pure et testée ; l'interface est en dessous. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./dossier.js'),require('./moteur.js'));else root.G44Rewind=factory(root.G44Dossier,root.G44Moteur)})(typeof self!=='undefined'?self:this,function(D,M){'use strict';
function fr(d){var p=String(d||'').split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:String(d||'')}
function etatGrille(o){var e=o.objets;return{date:e['ev-mariage'].dates.evenement,periode:e['per-foyer'].debut,ratt:e['op-ratt'].etat==='active'?'ACTIF':String(e['op-ratt'].etat).toUpperCase(),effet:e['op-ratt'].dates.effet,piece:e['d-mariage'].mentionne['ev-mariage']}}
/* ce qui se passe quand l'agent valide l'année saisie, puis quand il « rembobine » */
function sequence(annee){var d=D.dossier(),g0=etatGrille(d),jour=g0.date.slice(4),valeur=String(annee)+jour;
 if(!/^\d{4}$/.test(String(annee)))return{erreur:'Année invalide.',grille:g0};
 if(valeur===g0.date)return{refus:null,grille:g0,etapes:[],rien:true};
 var r=M.simuler(null,{objet:'ev-mariage',valeur:valeur}),R=D.REGLES;
 var bloc=r.bloquants[0]||null,refus=bloc?{regle:bloc.regle,message:'MODIFICATION IMPOSSIBLE : PÉRIODE VERROUILLÉE ('+(bloc.id==='op-ratt'?'RATTACHEMENT ENFANT ACTIF':'OPÉRATION ACTIVE')+')',texte:R[bloc.regle].texte}:null;
 if(r.incoherences.length)return{refus:refus,grille:g0,incoherences:r.incoherences.map(function(i){return{regle:i.regle,texte:i.texte}}),etapes:[],plan:r.plan,empreinte:r.empreinte,valeur:valeur};
 var fin=etatGrille(r.etat),per=r.diff.filter(function(x){return x.id==='per-foyer'})[0],g=JSON.parse(JSON.stringify(g0)),et=[];
 function pas(sens,texte,regle,maj){Object.keys(maj||{}).forEach(function(k){g[k]=maj[k]});et.push({sens:sens,texte:texte,regle:regle||null,regleTexte:regle?R[regle].nom:null,grille:JSON.parse(JSON.stringify(g))})}
 if(bloc){pas('defaire','Suspendre le rattachement de l\'enfant, sans le supprimer','R3',{ratt:'SUSPENDU'});pas('defaire','La période n\'est plus verrouillée','R3',{})}
 pas('corriger','Corriger la date : '+fr(g0.date)+' → '+fr(valeur)+(valeur===g0.piece?', conforme à l\'acte':''),'R4',{date:valeur});
 if(per)pas('rejouer','Recalculer l\'ouverture de la période : '+fr(per.apres),'R1',{periode:per.apres});
 if(bloc)pas('rejouer','Recréer le rattachement, date d\'effet '+fr(g0.effet)+' (comprise dans la période)','R2',{ratt:'ACTIF',effet:fin.effet});
 pas('controler',r.controles&&r.controles.length?r.controles.length+' contrôle(s) à reprendre':'Contrôles : aucune incohérence','',{});
 return{refus:refus,grille:g0,etapes:et,final:g,plan:r.plan,empreinte:r.empreinte,valeur:valeur,incoherences:[]}}
return{sequence:sequence,fr:fr};
});

/* ---------- l'interface (navigateur seulement) ---------- */
(function(){'use strict';if(typeof document==='undefined')return;var R=window.G44Rewind,box=document.getElementById('rewind');if(!R||!box)return;
var doux=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),seq=null,minuteurs=[],annee='2015';
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function $(s){return box.querySelector(s)}
function grille(g,vif){var fr=R.fr,c=function(k){return vif&&vif[k]?' class="maj"':''};
 return'<div class="rw-l"><span>DOSSIER</span><b>DOS-FICTIF-0001 · MAR-01</b></div>'+
  '<div class="rw-l"><span>DATE ÉVÉNEMENT</span><b'+c('date')+'>'+fr(g.date).slice(0,6)+'<label class="rw-an"><span class="cache">Année du mariage</span><input id="rwAn" value="'+esc(annee)+'" inputmode="numeric" maxlength="4" autocomplete="off" aria-describedby="rwAide"></label></b></div>'+
  '<div class="rw-l"><span>PIÈCE JUSTIF.</span><b>ACTE MAR. · '+fr(g.piece)+'</b></div>'+
  '<div class="rw-l"><span>PÉRIODE VCD</span><b'+c('periode')+'>OUVERTE · '+fr(g.periode)+'</b></div>'+
  '<div class="rw-l"><span>RATTACH. ENF.</span><b'+c('ratt')+'>'+esc(g.ratt)+' · EFFET '+fr(g.effet)+'</b></div>'}
function init(){box.innerHTML='<div class="rw-ecran" role="group" aria-labelledby="rwT"><div class="rw-tete"><span id="rwT">G44 · CORRECTION D\'ÉVÉNEMENT</span><span>RECONSTITUTION PÉDAGOGIQUE · CODES FICTIFS</span></div>'+
 '<div class="rw-g" id="rwGrille"></div><p class="rw-msg" id="rwMsg" role="status" aria-live="polite"></p>'+
 '<div class="rw-f"><button type="button" id="rwValider">F5 Valider</button><button type="button" id="rwAnnuler">F12 Annuler</button><span id="rwAide">Saisissez 2016 (l\'année de l\'acte), puis validez.</span></div></div>'+
 '<div class="rw-chaine" id="rwChaine" aria-live="polite" hidden><div class="rw-ch-t"><span class="k">AIME · Rewind</span><b id="rwTitre">La chaîne, avant de toucher à quoi que ce soit</b></div><ol id="rwEtapes"></ol><div class="rw-act" id="rwAct"></div></div>';
 afficher();$('#rwValider').onclick=valider;$('#rwAnnuler').onclick=annuler;}
function afficher(vif){var g=seq&&seq.courant||R.sequence(2015).grille;$('#rwGrille').innerHTML=grille(g,vif);var i=$('#rwAn');i.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key==='F5'){e.preventDefault();valider()}if(e.key==='F12'||e.key==='Escape'){e.preventDefault();annuler()}});i.addEventListener('input',function(){annee=i.value.replace(/\D/g,'').slice(0,4);i.value=annee})}
function stop(){minuteurs.forEach(clearTimeout);minuteurs=[]}
function valider(){stop();annee=($('#rwAn').value||'').trim();var s=R.sequence(annee);seq=s;var m=$('#rwMsg');m.className='rw-msg';$('#rwEtapes').innerHTML='';$('#rwAct').innerHTML='';
 if(s.erreur){m.textContent='ERR · '+s.erreur.toUpperCase();m.classList.add('err');return}
 if(s.rien){m.textContent='AUCUNE MODIFICATION.';return}
 if(s.refus){m.innerHTML='<b>ERR '+esc(s.refus.regle)+'</b> · '+esc(s.refus.message);m.classList.add('err');box.classList.add('refus');setTimeout(function(){box.classList.remove('refus')},500)}
 $('#rwChaine').hidden=false;$('#rwTitre').textContent='Le système refuse. Il a raison. Voyons pourquoi.';
 $('#rwAct').innerHTML='<button type="button" class="btn rw-go" id="rwGo"><span aria-hidden="true">⏪</span> Rembobiner</button>';$('#rwGo').onclick=rembobiner;$('#rwGo').focus()}
function rembobiner(){var s=seq;stop();$('#rwAct').innerHTML='';var ol=$('#rwEtapes');ol.innerHTML='';
 if(s.incoherences&&s.incoherences.length){$('#rwTitre').textContent='Avant même de défaire quoi que ce soit : '+s.incoherences.length+' incohérence'+(s.incoherences.length>1?'s':'')+'.';
  ol.innerHTML=s.incoherences.map(function(i){return'<li class="on incoh"><i>'+esc(i.regle)+'</i><span>'+esc(i.texte)+'</span></li>'}).join('');
  $('#rwAct').innerHTML='<p class="rw-fin">Rien n\'a été modifié. Le laboratoire ne corrige pas une erreur par une autre : il la signale avant.</p><button type="button" class="btn sec petit" id="rwRetour">Revenir à 2016</button>';$('#rwRetour').onclick=function(){annee='2016';annuler(true);setTimeout(valider,50)};return}
 $('#rwTitre').textContent='On défait, on corrige, on rejoue. Dans l\'ordre.';
 ol.innerHTML=s.etapes.map(function(e,k){return'<li class="'+e.sens+'" data-k="'+k+'"><i>'+(e.regle||'✓')+'</i><span>'+esc(e.texte)+(e.regleTexte?'<small>'+esc(e.regle)+' · '+esc(e.regleTexte)+'</small>':'')+'</span></li>'}).join('');
 var avant=s.grille,dt=doux?850:0;
 s.etapes.forEach(function(e,k){minuteurs.push(setTimeout(function(){var li=ol.querySelector('[data-k="'+k+'"]');li&&li.classList.add('on');var vif={};Object.keys(e.grille).forEach(function(x){if(e.grille[x]!==avant[x])vif[x]=1});avant=e.grille;s.courant=e.grille;afficher(vif);
  var m=$('#rwMsg');m.className='rw-msg '+(e.sens==='defaire'?'att':'ok');m.textContent=(e.sens==='defaire'?'⏪ ':e.sens==='controler'?'✓ ':'▶ ')+e.texte.toUpperCase();
  if(k===s.etapes.length-1)fin()},dt*(k+1)))})}
function fin(){var s=seq;$('#rwAct').innerHTML='<p class="rw-fin"><b>Rien n\'a été modifié.</b> C\'était une simulation sur une copie (empreinte '+esc(s.empreinte)+'). Le plan complet compte '+s.plan.length+' étapes, à faire valider par une personne habilitée.</p><div class="rw-b"><button type="button" class="btn sec petit" id="rwRemettre">Tout remettre comme avant</button><button type="button" class="btn sec petit" id="rw2018">Et si on saisissait 2018 ?</button><a class="btn petit" href="#lab02">Voir le plan détaillé</a></div>';
 $('#rwRemettre').onclick=function(){annuler()};$('#rw2018').onclick=function(){annuler(true);annee='2018';afficher();valider();setTimeout(rembobiner,doux?600:0)}}
function annuler(silence){stop();seq=null;if(!silence)annee='2015';box.classList.remove('refus');afficher();$('#rwMsg').className='rw-msg';$('#rwMsg').textContent=silence?'':'ANNULÉ · ÉTAT ENREGISTRÉ INCHANGÉ.';$('#rwEtapes').innerHTML='';$('#rwAct').innerHTML='';$('#rwTitre').textContent='La chaîne, avant de toucher à quoi que ce soit';if(!silence)$('#rwChaine').hidden=true}
init();window.G44RewindUI={valider:valider,rembobiner:rembobiner,annuler:annuler};
})();
