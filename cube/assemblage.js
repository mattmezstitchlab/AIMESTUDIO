/* AIME · le cube-personne s'assemble, puis s'ouvre sur l'orbe (phase C, priorité 1).
   Sur la grande page, le cube du chapitre « Votre cube » (#cube2) garde ses six faces, sa rotation, sa lumière et son
   ouverture au défilement : on n'y touche pas. Dès qu'une première carte est posée, le cube devient celui de la personne :
     - les faces validées sont pleines (cube/cartes.js les compose) ; les autres restent en verre irisé, « à venir » ;
     - une jauge de six cases, sous le cube, dit où en est l'assemblage ;
     - quand une carte arrive, sa face s'assemble (elle se pose sur le cube), puis le cube s'ouvre : c'est la même
       ouverture que celle du défilement, jouée pour la personne (et interrompue dès qu'elle reprend la main) ;
     - au cœur du cube ouvert, l'orbe apparaît : le même rond irisé que l'orbe de la page (--conic, hue, breathe).
       La toucher ouvre le compagnon existant (AIMECompagnon), qui ne voit que ce qui est à l'écran.
   Lecture seule du modèle AIMECube via AIMECartes : aucune seconde copie du cube.
   Mouvement réduit : pas d'ouverture jouée ; l'orbe apparaît, immobile, quand la personne ouvre le cube elle-même. */
(function(){'use strict';
var C=window.AIMECube,story=document.getElementById('story2'),stage=document.getElementById('stage2');if(!C||!story||!stage)return;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function cube(){return window.AIMECartes&&AIMECartes.cube()}
function cl(v){return Math.max(0,Math.min(1,v))}
/* la géométrie du cube, celle de la page : centre (cx, cy), côté c2, ouverture au défilement entre 50 % et 80 % */
function centre(){var W=innerWidth,H=innerHeight,m=W<760;return[m?W/2:W*.655,m?H*.39:H*.5]}
function c2(){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--c2'))||200}
function prog(){var r=story.getBoundingClientRect(),len=r.height-innerHeight;return len>0?cl(-r.top/len):0}
function ouverture(){return cl((prog()-.5)/.3)}
function versP(p){return story.offsetTop+(story.offsetHeight-innerHeight)*p}

/* ---------- la jauge d'assemblage et l'orbe ---------- */
var jauge=el('div','ca-jauge');jauge.setAttribute('role','img');jauge.hidden=true;
C.FACETTES.forEach(function(d){var i=el('i');i.dataset.f=d.id;i.title=d.nom;jauge.appendChild(i)});var dit=el('span');jauge.appendChild(dit);stage.appendChild(jauge);
var orbe=el('button','ca-orbe');orbe.type='button';orbe.hidden=true;orbe.setAttribute('aria-label','Votre orbe, au cœur du cube : ouvrir le compagnon');
orbe.innerHTML='<span class="ca-coeur" aria-hidden="true"></span><span class="ca-nom" aria-hidden="true"><b>AI + ME</b><i>I ÂME</i></span>';stage.appendChild(orbe);
var mot=el('div','ca-mot');mot.hidden=true;mot.setAttribute('role','dialog');mot.setAttribute('aria-label','Votre orbe');stage.appendChild(mot);
orbe.addEventListener('click',function(){mot.textContent='';mot.appendChild(el('b',null,'Votre orbe · AI + ME · I ÂME'));
 mot.appendChild(el('span',null,'Votre compagnon. Il ne voit que ce qui est à l\'écran ; aucune facette ne lui est ouverte sans votre accord.'));
 var A=window.AIMECompagnon,r=el('span','ca-act');if(A&&A.converser){var b=el('button',null,'Réfléchir avec elle · 2 min');b.type='button';b.onclick=function(){mot.hidden=true;A.converser()};r.appendChild(b)}
 var x=el('button',null,'Fermer');x.type='button';x.onclick=function(){mot.hidden=true;orbe.focus({preventScroll:true})};r.appendChild(x);mot.appendChild(r);mot.hidden=false;(r.firstChild||x).focus({preventScroll:true})});
mot.addEventListener('keydown',function(e){if(e.key==='Escape'){mot.hidden=true;orbe.focus({preventScroll:true})}});
function etat(){var c=cube();if(!c)return null;var p=C.progression(c);return{c:c,n:p.posees,t:p.total}}
/* les faces en attente : du verre irisé, nommé, à la place du média de démonstration */
function habiller(nouvelle){var e=etat();if(!e)return;var perso=e.n>0;document.documentElement.classList.toggle('ca-perso',perso);jauge.hidden=!perso;
 C.FACETTES.forEach(function(d){var face=document.querySelector('#cube2 .f2[data-i="'+d.face+'"]'),o=face&&face.querySelector('.o');if(!o)return;
  var f=e.c.facettes[d.id],v=o.querySelector('.ca-verre'),posee=f.etat==='posee';
  face.classList.toggle('ca-attente',perso&&!posee);
  if(perso&&!posee){if(!v){v=el('span','ca-verre');v.setAttribute('aria-hidden','true');o.appendChild(v)}v.textContent='';v.appendChild(el('small',null,d.nom));v.appendChild(el('b',null,'à venir'))}else if(v)v.remove();
  jauge.querySelector('[data-f="'+d.id+'"]').classList.toggle('on',posee);
  if(nouvelle===d.id&&!RM){var p=o.querySelector('.cp-pose');if(p){p.classList.remove('ca-pose');void p.offsetWidth;p.classList.add('ca-pose')}}});
 dit.textContent=e.n+' / '+e.t;jauge.setAttribute('aria-label','Votre cube : '+e.n+' face'+(e.n>1?'s':'')+' assemblée'+(e.n>1?'s':'')+' sur '+e.t)}

/* ---------- l'ouverture jouée pour la personne (même animation que le défilement) ----------
   Elle s'arrête à mi-ouverture : les faces s'écartent, l'orbe est au plus grand. Continuer à défiler ouvre le cube en entier
   (ses outils), et l'orbe se fait petite au centre. */
var jeu=null;
function ouvrir(){if(RM||jeu)return;var a=scrollY,b=versP(.65),t0=0,dur=2200;if(b<=a+4)return;
 jeu=function(now){if(!jeu)return;if(!t0)t0=now;var x=cl((now-t0)/dur),e=x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;scrollTo({top:a+(b-a)*e,behavior:'instant'});if(x<1)requestAnimationFrame(jeu);else jeu=null};
 requestAnimationFrame(jeu)}
function main(){jeu=null}
addEventListener('wheel',main,{passive:true});addEventListener('touchstart',main,{passive:true});addEventListener('keydown',function(e){if(/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key))main()});

/* ---------- chaque image : la jauge suit le cube, l'orbe naît de l'ouverture ---------- */
function image(){var e=etat(),vis=story.getBoundingClientRect(),vu=false;
 if(e&&e.n>0&&vis.bottom>0&&vis.top<innerHeight){var k=centre(),s=c2(),o=ouverture(),m=innerWidth<760;
  jauge.style.left=k[0]+'px';jauge.style.top=(k[1]+(m?Math.min(innerWidth*.46,innerHeight*.25):Math.min(innerWidth*.2,innerHeight*.34))*1.18)+'px';jauge.style.opacity=o>.12?0:1;
  vu=o>.08;
  if(vu){var bell=Math.sin(Math.PI*Math.min(1,o/.9)),taille=Math.max(s*.22,s*.62*bell);orbe.style.left=k[0]+'px';orbe.style.top=k[1]+'px';orbe.style.setProperty('--t',taille.toFixed(1)+'px');
   orbe.classList.toggle('pleine',taille>s*.4);mot.style.left=k[0]+'px';mot.style.top=(k[1]+taille/2+16)+'px'}}
 else jauge.style.opacity=0;
 orbe.hidden=!vu;if(!vu)mot.hidden=true;
 requestAnimationFrame(image)}

addEventListener('aime:cube',function(ev){var d=ev.detail||{};habiller(d.id);if(d.type==='posee')setTimeout(ouvrir,RM?0:1500)});
if(document.readyState==='complete')habiller();else addEventListener('load',function(){habiller()});
requestAnimationFrame(image);
window.AIMEAssemblage={habiller:habiller,ouvrir:ouvrir,ouverture:ouverture};
})();
