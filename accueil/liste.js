/* AIME · la liste « Je suis… », dessinée au style du site (film « AIME en 2 minutes », 0:12) à la place du <select> natif.
   Motif ARIA « combobox à choix seul » (APG) : le champ (#jsChoix, role="combobox") garde le focus et désigne la ligne active
   par aria-activedescendant ; la liste (role="listbox") porte les options et le groupe « Prestataire » (role="group", nommé).
   Clavier : fermé, ↓ ↑ Entrée Espace Alt+↓ ouvrent, une lettre ouvre sur la première ligne qui commence par elle ;
   ouvert, ↓ ↑ Début Fin déplacent, Entrée ou Espace choisissent, Échap ferme, Tab ferme sans choisir ; une lettre va à la suivante.
   La liste défile à l'intérieur et ne passe jamais sous le Dock. Le champ expose .value (« maries », « metier:photographe »…)
   et émet « change », comme le <select> qu'il remplace : la démo (accueil/je-suis.js) n'en est pas changée. */
(function(root){'use strict';
var $=function(i){return document.getElementById(i)};
var PHRASE={maries:'Nous sommes futurs mariés',coordination:'Je coordonne le mariage',invite:'Je suis invité·e'};
function reduit(){return document.documentElement.classList.contains('calme')||matchMedia('(prefers-reduced-motion: reduce)').matches}
function plat(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}

function monter(champ){if(!champ||champ._liste)return null;
 var liste=$(champ.getAttribute('aria-controls')),vue=$('jsChoixV'),VIDE=vue.textContent,valeur='',actif=-1;
 var opts=[].slice.call(liste.querySelectorAll('[role=option]'));
 function texte(o){return(o.querySelector('.jl-t')||o).textContent.trim()}
 function phrase(o){var v=o.getAttribute('data-value');return PHRASE[v]||('Je suis '+(v==='invite'?'invité·e':texte(o).charAt(0).toLowerCase()+texte(o).slice(1)))}
 function ouvert(){return!liste.hidden}

 /* la place disponible : sous le champ, jusqu'au Dock (ou au bas de l'écran) ; trop peu, on remonte d'abord le champ */
 function placer(){var dock=document.querySelector('#dock-site .dock'),bas=dock?dock.getBoundingClientRect().top:innerHeight,r=champ.getBoundingClientRect(),dispo=bas-r.bottom-14;
  if(dispo<Math.min(260,liste.scrollHeight)){var haut=(document.querySelector('.barre')||{offsetHeight:0}).offsetHeight||64;window.scrollBy({top:r.top-haut-12,behavior:'auto'});r=champ.getBoundingClientRect();dispo=bas-r.bottom-14}
  liste.style.maxHeight=Math.max(132,Math.floor(dispo))+'px'}
 function montrer(i){if(i<0||i>=opts.length)return;if(actif>=0)opts[actif].classList.remove('actif');actif=i;var o=opts[i];o.classList.add('actif');champ.setAttribute('aria-activedescendant',o.id);
  /* la ligne active reste visible ; la première d'un groupe montre aussi l'intitulé du groupe */
  var g=o.parentNode.querySelector('.jl-g'),premiere=g&&o.parentNode.querySelector('[role=option]')===o,a=premiere?g.offsetTop:o.offsetTop,b=o.offsetTop+o.offsetHeight;
  if(a<liste.scrollTop)liste.scrollTop=a;else if(b>liste.scrollTop+liste.clientHeight)liste.scrollTop=b-liste.clientHeight}
 function indexDe(v){for(var i=0;i<opts.length;i++)if(opts[i].getAttribute('data-value')===v)return i;return-1}
 function ouvrir(i){if(!ouvert()){liste.hidden=false;champ.setAttribute('aria-expanded','true');champ.classList.add('ouvert');placer();if(!reduit())liste.classList.add('entre')}
  montrer(i!=null?i:(valeur?indexDe(valeur):0))}
 function fermer(rendre){tape='';if(!ouvert())return;liste.hidden=true;liste.classList.remove('entre');champ.setAttribute('aria-expanded','false');champ.classList.remove('ouvert');champ.removeAttribute('aria-activedescendant');if(actif>=0)opts[actif].classList.remove('actif');actif=-1;if(rendre)champ.focus()}
 function choisir(i,silencieux){var o=opts[i];if(!o)return;var v=o.getAttribute('data-value'),change=v!==valeur;valeur=v;
  opts.forEach(function(x){x.setAttribute('aria-selected',x===o?'true':'false')});vue.textContent=phrase(o);champ.classList.add('choisi');
  fermer(true);if(change&&!silencieux)champ.dispatchEvent(new Event('change',{bubbles:true}))}

 /* la première lettre : la ligne suivante qui commence par elle (en tournant), sans accent ni majuscule */
 var tape='',tapeT=0;
 function lettre(k){var now=Date.now();tape=now-tapeT<700?tape+k:k;tapeT=now;var q=plat(tape),dep=tape.length>1?Math.max(actif,0):actif+1;
  for(var n=0;n<opts.length;n++){var i=(dep+n)%opts.length;if(plat(texte(opts[i])).indexOf(q)===0)return i}
  return-1}

 champ.addEventListener('click',function(){if(ouvert())fermer(true);else ouvrir()});
 liste.addEventListener('mousedown',function(e){e.preventDefault()});   /* le focus reste au champ */
 liste.addEventListener('click',function(e){var o=e.target.closest('[role=option]');if(o)choisir(opts.indexOf(o))});
 liste.addEventListener('mousemove',function(e){var o=e.target.closest('[role=option]');if(o&&opts.indexOf(o)!==actif)montrer(opts.indexOf(o))});
 champ.addEventListener('keydown',function(e){var k=e.key;
  if(!ouvert()){
   if(k==='ArrowDown'||k==='ArrowUp'||k==='Enter'||k===' '){e.preventDefault();ouvrir(k==='ArrowUp'?(valeur?indexDe(valeur):opts.length-1):undefined);return}
   if(k==='Home'||k==='End'){e.preventDefault();ouvrir(k==='Home'?0:opts.length-1);return}
   if(k.length===1&&/\S/.test(k)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){var j=lettre(k);if(j>=0){e.preventDefault();ouvrir(j)}}
   return}
  if(k==='ArrowDown'){e.preventDefault();montrer(Math.min(opts.length-1,actif+1));return}
  if(k==='ArrowUp'){e.preventDefault();if(e.altKey){choisir(actif);return}montrer(Math.max(0,actif-1));return}
  if(k==='Home'||k==='PageUp'){e.preventDefault();montrer(0);return}
  if(k==='End'||k==='PageDown'){e.preventDefault();montrer(opts.length-1);return}
  if(k==='Enter'||k===' '){e.preventDefault();choisir(actif);return}
  if(k==='Escape'){e.preventDefault();fermer(true);return}
  if(k==='Tab'){fermer(false);return}
  if(k.length===1&&/\S/.test(k)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){var i=lettre(k);if(i>=0){e.preventDefault();montrer(i)}}
 });
 champ.addEventListener('blur',function(){setTimeout(function(){if(document.activeElement!==champ)fermer(false)},0)});
 document.addEventListener('click',function(e){if(ouvert()&&!e.target.closest('#jsListe'))fermer(false)});
 addEventListener('resize',function(){if(ouvert())placer()});

 /* comme un <select> : .value, et « change » quand la personne choisit */
 Object.defineProperty(champ,'value',{configurable:true,get:function(){return valeur},set:function(v){var i=indexDe(String(v));if(i>=0)choisir(i,true);else{valeur='';vue.textContent=VIDE;champ.classList.remove('choisi');opts.forEach(function(x){x.setAttribute('aria-selected','false')})}}});
 champ._ouvrir=function(){champ.focus({preventScroll:true});ouvrir()};   /* « Créer un projet » du + (dock/plus.js) */
 champ._liste=true;
 return{ouvrir:ouvrir,fermer:fermer,choisir:function(v){choisir(indexDe(v))},options:function(){return opts.map(function(o){return o.getAttribute('data-value')})}};
}
root.AIMEListe={monter:monter};
monter($('jsChoix'));
})(this);
