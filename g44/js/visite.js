/* AIME G44 LAB · visite guidée : 9 étapes, environ 7 minutes, sur le même dossier fictif.
   Chaque étape amène à une section, la met en évidence et, si besoin, déclenche l'action déjà présente sur la page
   (les mêmes boutons qu'à la main) : rien n'est simulé à part. Clavier : ← → pour avancer ou reculer, Échap pour quitter. */
(function(){'use strict';
var ETAPES=[
 {id:'haut',t:'Une date erronée',x:'Dans le dossier fictif DOS-FICTIF-0001, le mariage est enregistré en 2015 au lieu de 2016. Touchez la date : le moteur calcule ce qui en dépend : liens, opérations, contrôles.',agir:function(){clic('toucher')}},
 {id:'scenario',t:'Une seule erreur, plusieurs conséquences',x:'Un enfant est déjà rattaché au dossier. La simulation montre l\'état enregistré et l\'état corrigé envisagé, côte à côte. Rien n\'est modifié : c\'est une copie.',agir:function(){clic('simulerScen')}},
 {id:'graphe',t:'Un graphe calculé, pas un dessin',x:'Chaque relation a un type, une justification et une date. Seules certaines relations propagent une modification ; les autres sont seulement signalées. Touchez une relation pour savoir pourquoi elle existe.'},
 {id:'lab01',t:'L\'existant, puis la lecture augmentée',x:'La grille historique, reconstituée pour la pédagogie, puis la même information avec ses dépendances rendues visibles. Les codes sont fictifs.',agir:function(){var b=document.querySelector('#lab01 [data-mode="aug"]');b&&b.click()}},
 {id:'lab02',t:'Comprendre avant de corriger',x:'Rewind simule la correction : un élément est bloquant (la règle R3 verrouille la période tant que le rattachement est actif), cinq sont indépendants. La simulation est déterministe, reproductible, et s\'abandonne sans laisser de trace.',agir:function(){clic('simuler');setTimeout(function(){clic('comparer')},300)}},
 {id:'lab03',t:'Trois natures de relation',x:'Un lien familial, un rattachement administratif et un droit social ne sont pas interchangeables. C\'est pour cela qu\'on suspend un rattachement sans toucher à la filiation.'},
 {id:'lab05',t:'Quatre responsabilités, une même situation',x:'L\'agent, le formateur, le responsable et le contrôleur ne voient pas la même chose. Mais la perspective ne donne aucun droit : l\'autorisation se calcule à part, et en production côté serveur.'},
 {id:'lab06',t:'Transmettre sans multiplier les erreurs',x:'Un stagiaire choisit des étapes dans l\'ordre. Pas de note : chaque choix reçoit une explication fondée sur les règles du scénario. Les pièges (corriger directement, supprimer l\'enfant) sont expliqués.'},
 {id:'kit',t:'Ne nous croyez pas : mesurez',x:'Le kit de pilote permet de mesurer chez vous, avec vos agents, ce que la lecture augmentée change : temps, retours arrière, erreurs de séquence, plans complets. Vous repartez avec vos chiffres. Aucun gain n\'est annoncé d\'avance.'}];
var i=-1,bar=null,prec=null;
function clic(id){var b=document.getElementById(id);if(b&&!b.disabled)b.click()}
var doux=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function montrer(n){i=Math.max(0,Math.min(ETAPES.length-1,n));var E=ETAPES[i],sec=document.getElementById(E.id);
 if(prec)prec.classList.remove('visite-ici');if(sec){sec.classList.add('visite-ici');prec=sec;sec.scrollIntoView({behavior:doux?'smooth':'auto',block:'start'})}
 if(E.agir)setTimeout(E.agir,doux?500:0);
 bar.querySelector('.vb-n').textContent=(i+1)+' / '+ETAPES.length;bar.querySelector('.vb-t').textContent=E.t;bar.querySelector('.vb-x').textContent=E.x;
 bar.querySelector('.vb-prog i').style.width=((i+1)/ETAPES.length*100)+'%';bar.querySelector('[data-vb="prec"]').disabled=i===0;bar.querySelector('[data-vb="suiv"]').textContent=i===ETAPES.length-1?'Terminer':'Suivant'}
function ouvrir(){if(!bar){bar=document.createElement('div');bar.className='visite';bar.setAttribute('role','dialog');bar.setAttribute('aria-modal','false');bar.setAttribute('aria-label','Visite guidée');
  bar.innerHTML='<div class="vb-prog" aria-hidden="true"><i></i></div><div class="vb-c"><span class="vb-n k"></span><b class="vb-t"></b><p class="vb-x" aria-live="polite"></p></div><div class="vb-a"><button type="button" class="btn sec petit" data-vb="prec">Précédent</button><button type="button" class="btn petit" data-vb="suiv">Suivant</button><button type="button" class="vb-q" data-vb="quitter" aria-label="Quitter la visite">×</button></div>';
  document.body.appendChild(bar);bar.addEventListener('click',function(e){var b=e.target.closest('[data-vb]');if(!b)return;var k=b.dataset.vb;if(k==='prec')montrer(i-1);else if(k==='suiv'){if(i===ETAPES.length-1)fermer();else montrer(i+1)}else fermer()})}
 bar.hidden=false;document.body.classList.add('en-visite');montrer(0);bar.querySelector('[data-vb="suiv"]').focus()}
function fermer(){if(!bar)return;bar.hidden=true;document.body.classList.remove('en-visite');if(prec)prec.classList.remove('visite-ici');i=-1;var b=document.querySelector('[data-visite]');b&&b.focus()}
document.addEventListener('click',function(e){if(e.target.closest('[data-visite]'))ouvrir()});
document.addEventListener('keydown',function(e){if(!bar||bar.hidden)return;if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
 if(e.key==='ArrowRight'){e.preventDefault();if(i<ETAPES.length-1)montrer(i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();montrer(i-1)}else if(e.key==='Escape')fermer()});
if(location.hash==='#visite')setTimeout(ouvrir,600);
window.G44Visite={ETAPES:ETAPES,ouvrir:ouvrir,fermer:fermer};
})();
