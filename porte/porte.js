/* AIME · la porte : le bouton universel d'accès. C'est le rond irisé « + » de la grande page AIME Studio (.plus5,
   sous la démonstration du mini-site builder), extrait en composant partagé : même capsule, même contour conique, même
   geste. Un seul état, venu du compte (/api/identite), décide de sa forme :
     plus    pas encore de timbre       → ouvre le Point Zéro, parcours d'identité
     fleche  timbre confirmé, Monde AIME pas encore découvert → révèle le Monde AIME (pulsation à la découverte, puis calme)
     retour  Monde AIME déjà découvert  → y retourne
   AIMEPorte.etat(info) est pur (testé sous node). AIMEPorte.monter(conteneur, {contexte, position}) pose le bouton.
   Un module de révélation peut se déclarer : AIMEPorte.revelation = function(cible, bouton) → Promise (phase B). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEPorte=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var MONDE='/aime/?depuis=porte',IDENTITE='/point-zero/?intention=identite';
var ICONES={plus:'<path class="ap-v" d="M12 5v14"/><path class="ap-h" d="M5 12h14"/>',fleche:'<path class="ap-v" d="M12 5v14"/><path class="ap-h" d="M6 13l6 6 6-6"/>'};
function etat(i){i=i||{};if(!i.connecte||!i.timbre)return{mode:'plus',href:IDENTITE,libelle:i.connecte?'Créer votre timbre':'Commencer',aria:i.connecte?'Créer votre timbre dans le Point Zéro':'Commencer : créer votre identité AIME dans le Point Zéro',indice:'',pulsation:false};
 if(!i.mondeLe)return{mode:'fleche',href:MONDE,libelle:'Découvrez votre Monde AIME',aria:'Découvrez votre Monde AIME',indice:'Découvrez votre Monde AIME',pulsation:true};
 return{mode:'retour',href:MONDE,libelle:'Le Monde AIME',aria:'Retourner dans Le Monde AIME',indice:'',pulsation:false}}

var info=null,attente=null,boutons=[];
function lire(){if(attente)return attente;attente=fetch('/api/identite',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():{connecte:false}}).catch(function(){return{connecte:false}}).then(function(j){info=j||{connecte:false};attente=null;return info});return attente}
function appliquer(b){var e=etat(info||{}),svg=b.querySelector('svg');b.dataset.mode=e.mode;b.setAttribute('aria-label',e.aria);b.title=e.libelle;b.href=e.href;
 svg.innerHTML=e.mode==='plus'?ICONES.plus:ICONES.fleche;b.classList.toggle('ap-pouls',e.pulsation);var d=b.parentNode.querySelector('.ap-dit');if(d){d.textContent=e.indice;d.hidden=!e.indice}}
function rafraichir(){info=null;return lire().then(function(){boutons.forEach(appliquer)})}

function monter(conteneur,o){o=o||{};if(!conteneur)return null;var cap=document.createElement('div');cap.className='aime-porte ap-'+(o.position||'haut')+' ap-'+(o.contexte||'page');
 var b=document.createElement('a');b.className='ap-b';b.href=IDENTITE;b.dataset.mode='plus';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONES.plus+'</svg>';
 var d=document.createElement('span');d.className='ap-dit';d.hidden=true;d.setAttribute('aria-hidden','true');
 cap.appendChild(b);cap.appendChild(d);conteneur.appendChild(cap);boutons.push(b);
 b.addEventListener('click',function(ev){var e=etat(info||{});if(e.mode==='plus')return;ev.preventDefault();b.classList.add('ap-active');
  var marque=e.mode==='fleche'?fetch('/api/identite',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'monde'})}).catch(function(){}):Promise.resolve();
  var R=window.AIMEPorte,anim=R&&typeof R.revelation==='function'?Promise.resolve().then(function(){return R.revelation(e.href,b)}).catch(function(){}):Promise.resolve();
  /* jamais bloquant : quoi qu'il arrive à l'animation, on part */
  var parti=false,partir=function(){if(!parti){parti=true;location.href=e.href}};Promise.all([marque,anim]).then(partir,partir);setTimeout(partir,2600)});
 lire().then(function(){appliquer(b)});return b}

if(typeof window!=='undefined')window.addEventListener('aime:identite',function(){rafraichir()});
return{etat:etat,monter:monter,rafraichir:rafraichir,MONDE:MONDE,IDENTITE:IDENTITE,revelation:null};
});
