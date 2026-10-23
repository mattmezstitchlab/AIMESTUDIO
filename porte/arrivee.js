/* AIME · l'arrivée dans Le Monde AIME par la porte (phase B).
   Le voile du départ se dissipe (CSS), puis le timbre entre dans le titre : le cube qui tient la place du O s'efface,
   le timbre vole jusqu'à lui, et le cube revient avec le timbre sur sa première face (« vous »). L'orbe accueille.
   Mode personnel : le timbre du compte (nom, photo ou dégradé), rien d'autre. Mode découverte (?demo=timbre) :
   un timbre fictif, dit comme tel. Sans timbre, la page reste exactement comme avant. */
(function(){'use strict';
var q=new URLSearchParams(location.search),porte=q.get('depuis')==='porte',demo=q.get('demo')==='timbre';if(!porte&&!demo)return;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function nettoyer(){try{q.delete('depuis');q.delete('demo');history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}catch(e){}}
function personne(){if(demo)return Promise.resolve({id:'demo-camille',name:'Camille',image:null,demo:true});
 return Promise.all([fetch('/api/auth/get-session',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}),fetch('/api/identite',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})])
  .then(function(r){var u=r[0]&&r[0].user,i=r[1]||{};return u&&i.timbre?{id:u.id,name:u.name,image:u.image}:null})}
function bulle(u){var b=document.createElement('div');b.className='rv-bulle';b.setAttribute('role','status');b.innerHTML='<i aria-hidden="true"></i>';
 var p=document.createElement('p');p.textContent=u.demo?'Démonstration : voici comment le timbre d\'une personne rejoint Le Monde AIME.':'Bienvenue, '+u.name+'. Votre timbre a rejoint Le Monde AIME : le cube du titre est le vôtre, il se construira avec vous.';
 if(u.demo){var d=document.createElement('span');d.className='rv-demo';d.textContent='Démonstration';p.appendChild(d)}b.appendChild(p);
 var a=document.createElement('a');a.href=u.demo?'/point-zero/?intention=identite':'/aime/#story2';a.textContent=u.demo?'Créer mon timbre':'Découvrir Le Monde AIME';b.appendChild(a);
 var x=document.createElement('button');x.type='button';x.textContent='Fermer';x.onclick=function(){b.remove()};b.appendChild(x);document.body.appendChild(b)}
function arriver(u){var T=window.AIMETimbre,cube=document.getElementById('hcube'),face=document.querySelector('#hc3 .hf');nettoyer();if(!T||!cube||!face){bulle(u);return}
 var t=T.creer({id:u.id,nom:u.name||'Vous',image:u.image,mini:false,legende:false});t.tabIndex=-1;t.setAttribute('aria-hidden','true');
 var poser=function(){var k=face.querySelector('.hf-timbre');if(!k){k=document.createElement('span');k.className='hf-timbre';k.style.cssText='position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;border-radius:inherit;pointer-events:none';face.appendChild(k)}k.textContent='';var lw=Math.max(24,cube.getBoundingClientRect().width*.58);t.style.setProperty('--l',Math.round(lw)+'px');k.appendChild(t);face.classList.add('timbre-on');cube.classList.remove('rv-absent');
  cube.setAttribute('title',u.demo?'Le timbre de démonstration':'Votre timbre');
  /* le cube se tourne vers la personne, le temps de voir son timbre, puis reprend sa rotation */
  var h3=document.getElementById('hc3');if(h3){h3.classList.add('rv-presente');if(!RM)setTimeout(function(){h3.classList.remove('rv-presente')},6000)}bulle(u)};
 if(RM)return poser();
 /* le cube s'efface, le timbre descend depuis la porte (en haut à droite) jusqu'à la place du O, puis le cube revient */
 cube.classList.add('rv-absent');var r=cube.getBoundingClientRect(),v=document.createElement('div');v.className='rv-vol';var c=t.cloneNode(true);c.style.setProperty('--l','120px');v.appendChild(c);document.body.appendChild(v);
 v.style.transform='translate('+(innerWidth-150)+'px,-180px) rotate(-12deg)';
 requestAnimationFrame(function(){requestAnimationFrame(function(){v.style.transform='translate('+(r.left+r.width/2-60)+'px,'+(r.top+r.height/2-75)+'px) scale('+Math.max(.2,r.width/120)+') rotate(0)'})});
 setTimeout(function(){v.style.opacity='0';poser();setTimeout(function(){v.remove()},450)},1250)}
function lancer(){personne().then(function(u){if(!u){nettoyer();return}var go=function(){setTimeout(function(){arriver(u)},RM?0:700)};if(document.readyState==='complete')go();else addEventListener('load',go)}).catch(nettoyer)}
lancer();
})();
