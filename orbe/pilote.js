/* AIME · ORBE · le pilote : l'orbe devient le pointeur intelligent d'un canevas.
   Elle suit doucement le pointeur (si le mouvement est permis), se pose près de l'élément sélectionné, et ouvre une bulle
   bâtie UNIQUEMENT à partir de ce que l'élément déclare (orbe/contexte.js) : ce qu'il est, pourquoi il est relié,
   ses réglages, ses actions, ses droits. Chaque modification suit : observer → proposer → régler → confirmer → enregistrer.
   Elle ne prend jamais le clic, le glisser, le toucher ni le focus clavier : sa couche est transparente aux gestes.

   AIMEOrbePilote.monter(zone, {mouvement:bool, autonomie:'discrete'|'attentive'|'active', annoncer(texte)})
     → { montrer(el, {clavier}), fermer(), suggerer(el, texte), reglerMouvement(bool), reglerAutonomie(id), actuel() }
   Un descripteur peut fournir : appliquer(valeurs) → Promise<texte>, consequence(valeurs) → texte, faire sur ses actions. */
(function(root){'use strict';if(root.AIMEOrbePilote)return;
var C=root.AIMEOrbeContexte,RM=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,FINE=root.matchMedia&&matchMedia('(pointer:fine)').matches;
var ETAPES={observer:'Observer',proposer:'Proposer',regler:'Régler',confirmer:'Confirmer',enregistrer:'Enregistrer'};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function bouton(t,c,f){var b=el('button',c,t);b.type='button';if(f)b.onclick=f;return b}

function monter(zone,o){o=o||{};var mouvement=o.mouvement!==false&&!RM&&FINE,autonomie=o.autonomie||'attentive';
 var couche=el('div','pp-couche');couche.setAttribute('data-orbe-ignorer','');couche.setAttribute('aria-hidden','true');
 var cadre=el('div','pp-cadre'),mini=el('i','pp-mini');couche.appendChild(cadre);couche.appendChild(mini);document.body.appendChild(couche);
 var bulle=el('div','pp-bulle');bulle.setAttribute('role','dialog');bulle.setAttribute('aria-modal','false');bulle.setAttribute('data-orbe-ignorer','');bulle.hidden=true;document.body.appendChild(bulle);
 var sug=el('div','pp-sug');sug.setAttribute('role','status');sug.setAttribute('data-orbe-ignorer','');sug.hidden=true;document.body.appendChild(sug);

 /* l'orbe suit le pointeur avec douceur ; au repos (ou si le mouvement est coupé) elle se pose près de la sélection */
 var X=-100,Y=-100,cx=-100,cy=-100,dedans=false,actuel=null,raf=0;
 function boucle(){cx+=(X-cx)*.18;cy+=(Y-cy)*.18;mini.style.transform='translate('+cx.toFixed(1)+'px,'+cy.toFixed(1)+'px)';if(Math.abs(X-cx)+Math.abs(Y-cy)>.3)raf=requestAnimationFrame(boucle);else raf=0}
 function viser(x,y,tout){X=x;Y=y;if(!mouvement||tout){cx=x;cy=y;mini.style.transform='translate('+x+'px,'+y+'px)';return}if(!raf)raf=requestAnimationFrame(boucle)}
 zone.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse'||!mouvement)return;dedans=true;couche.classList.add('suit');viser(e.clientX+18,e.clientY+18)},{passive:true});
 zone.addEventListener('pointerleave',function(){dedans=false;if(actuel)poser(actuel.el);else couche.classList.remove('suit')});
 function poser(e){var r=e.getBoundingClientRect();viser(r.right+4,r.top-4,!mouvement);couche.classList.add('suit')}
 var marque=null;function encadrer(e){if(marque)marque.classList.remove('pp-sel');marque=e||null;if(e&&e.classList)e.classList.add('pp-sel');if(!e||e instanceof SVGElement){cadre.classList.remove('on');return}var r=e.getBoundingClientRect();cadre.style.transform='translate('+(r.left-5)+'px,'+(r.top-5)+'px)';cadre.style.width=(r.width+10)+'px';cadre.style.height=(r.height+10)+'px';cadre.classList.add('on')}

 /* la bulle : près de l'élément, jamais hors de l'écran ; sur téléphone, en bas */
 function placer(e){if(innerWidth<=720){bulle.style.transform='';bulle.classList.add('bas');return}bulle.classList.remove('bas');var r=e.getBoundingClientRect(),w=bulle.offsetWidth,h=bulle.offsetHeight,x=r.right+16,y=r.top;
  if(x+w>innerWidth-12)x=r.left-w-16;if(x<12){x=Math.min(innerWidth-w-12,Math.max(12,r.left));y=r.bottom+14}if(y+h>innerHeight-12)y=Math.max(12,innerHeight-h-12);bulle.style.transform='translate('+Math.round(x)+'px,'+Math.round(Math.max(12,y))+'px)'}
 function cycle(etape){var c=el('ol','pp-cycle');C.CYCLE.forEach(function(k){var li=el('li',k===etape?'on':'',ETAPES[k]);c.appendChild(li)});return c}
 function controle(p,brouillon,changer){var w=el('label','pp-prop');w.appendChild(el('span',null,p.nom));var v=brouillon[p.id]!==undefined?brouillon[p.id]:p.valeur,i;
  if(p.type==='choix'){i=el('div','pp-choix');i.setAttribute('role','radiogroup');i.setAttribute('aria-label',p.nom);(p.options||[]).forEach(function(x){var b=bouton(x.nom,'pp-opt'+(x.id===v?' on':''),function(){changer(p,x.id);[].forEach.call(i.children,function(y){y.classList.toggle('on',y===b);y.setAttribute('aria-checked',String(y===b))})});b.setAttribute('role','radio');b.setAttribute('aria-checked',String(x.id===v));if(x.dit)b.title=x.dit;i.appendChild(b)});w=el('div','pp-prop');w.appendChild(el('span',null,p.nom));w.appendChild(i);return w}
  i=el('input');if(p.type==='curseur'){i.type='range'}else if(p.type==='nombre'){i.type='number'}else if(p.type==='date'){i.type='date'}else i.type='text';
  if(p.min!=null)i.min=p.min;if(p.max!=null)i.max=p.max;if(p.pas)i.step=p.pas;i.value=v==null?'':v;var lu=el('output',null,(v==null?'':v)+(p.unite?' '+p.unite:''));
  i.oninput=function(){lu.textContent=i.value+(p.unite?' '+p.unite:'');changer(p,i.value)};w.appendChild(i);if(p.type==='curseur')w.appendChild(lu);return w}

 function montrer(e,opt){opt=opt||{};var t=C.lire(e);if(!t)return fermer();actuel=t;var d=t.d,T=C.TYPES[d.type]||{nom:d.type},brouillon={},erreur=null;
  sug.hidden=true;encadrer(t.el);poser(t.el);bulle.textContent='';bulle.setAttribute('aria-label',(T.nom||'')+' : '+(d.titre||''));
  var tete=el('div','pp-tete');tete.appendChild(el('i','pp-pastille'));var tt=el('div');tt.appendChild(el('small',null,'L\'orbe · '+(T.nom||'')));tt.appendChild(el('b',null,d.titre||''));tete.appendChild(tt);
  tete.appendChild(bouton('×','pp-x',function(){fermer(true)}));tete.lastChild.setAttribute('aria-label','Fermer');bulle.appendChild(tete);
  if(d.valeur)bulle.appendChild(el('p','pp-valeur',d.valeur));if(d.dit)bulle.appendChild(el('p','pp-dit',d.dit));if(d.pourquoi)bulle.appendChild(el('p','pp-pourquoi',d.pourquoi));
  if(d.contenu)bulle.appendChild(d.contenu());
  var modif=d.permis&&d.permis.modifier===false?false:true,props=(d.props||[]);
  if(props.length&&!modif)bulle.appendChild(el('p','pp-refus',(d.permis&&d.permis.raison)||'Vous ne pouvez pas modifier cet élément.'));
  var zp=el('div','pp-props'),msg=el('p','pp-msg'),conseq=el('p','pp-conseq');msg.setAttribute('role','status');
  function changer(p,v){var r=C.verifier(p,v);if(!r.ok){erreur=r.raison;msg.textContent=r.raison;msg.className='pp-msg ko'}else{erreur=null;brouillon[p.id]=r.valeur;msg.textContent='';msg.className='pp-msg'}
   var c=d.consequence&&!erreur?d.consequence(Object.assign({},brouillon)):'';conseq.textContent=c||'';conseq.hidden=!c;etat('regler')}
  if(modif)props.forEach(function(p){zp.appendChild(controle(p,brouillon,changer))});if(props.length&&modif)bulle.appendChild(zp);bulle.appendChild(conseq);conseq.hidden=true;bulle.appendChild(msg);
  var act=el('div','pp-act');
  if(props.length&&modif&&d.appliquer){var ok=bouton(d.valide?'Confirmer à nouveau':'Confirmer ce réglage','pp-b pp-b-p',function(){if(erreur)return;
    /* une valeur non touchée est confirmée telle quelle */
    props.forEach(function(p){if(brouillon[p.id]===undefined&&p.valeur!=null)brouillon[p.id]=p.valeur});etat('confirmer');ok.disabled=true;
    Promise.resolve(d.appliquer(brouillon)).then(function(t2){etat('enregistrer');msg.className='pp-msg ok';msg.textContent=t2||'Enregistré.';if(o.annoncer)o.annoncer(t2||'Enregistré.');ok.disabled=false;setTimeout(function(){if(!actuel||actuel.el!==t.el)return;var c=document.contains(t.el)?t.el:(d.id&&zone.querySelector('[data-orbe-id="'+String(d.id).replace(/["\\]/g,'')+'"]'));if(c)montrer(c);else fermer()},900)},function(err){ok.disabled=false;msg.className='pp-msg ko';msg.textContent=(err&&err.message)||'Impossible pour le moment.'})});act.appendChild(ok)}
  (d.actions||[]).forEach(function(a){if(a.permis===false&&!modif)return;var b=bouton(a.nom,'pp-b'+(a.principale?' pp-b-p':''),function(){if(a.consequence&&!b.dataset.arme){b.dataset.arme='1';conseq.textContent=a.consequence;conseq.hidden=false;b.textContent='Confirmer : '+a.nom;etat('confirmer');return}
    b.disabled=true;Promise.resolve(a.faire&&a.faire()).then(function(t2){etat('enregistrer');msg.className='pp-msg ok';msg.textContent=t2||'Fait.';if(o.annoncer)o.annoncer(t2||'Fait.');b.disabled=false;if(!document.contains(t.el)){var c=d.id&&zone.querySelector('[data-orbe-id="'+String(d.id).replace(/["\\]/g,'')+'"]');if(c&&!a.ferme)setTimeout(function(){montrer(c)},700);else{bulle.hidden=true;encadrer(null);actuel=null;if(o.annoncer)o.annoncer(t2||'Fait.')}}},function(err){b.disabled=false;msg.className='pp-msg ko';msg.textContent=(err&&err.message)||'Impossible pour le moment.'})});
   if(a.dit)b.title=a.dit;act.appendChild(b)});
  if(act.children.length)bulle.appendChild(act);var cy=cycle(props.length||(d.actions||[]).length?'proposer':'observer');bulle.appendChild(cy);
  function etat(k){[].forEach.call(cy.children,function(li,i){li.className=C.CYCLE[i]===k?'on':''})}
  bulle.hidden=false;placer(t.el);if(opt.clavier){var f=bulle.querySelector('input,.pp-opt.on,.pp-opt,.pp-b');if(f)f.focus()}}
 function fermer(rendre){var e=actuel&&actuel.el;actuel=null;bulle.hidden=true;encadrer(null);if(!dedans)couche.classList.remove('suit');if(rendre&&e&&e.focus)e.focus()}
 /* une suggestion discrète (niveau « attentif ») : une ligne près de l'élément, à ouvrir ou ignorer */
 function suggerer(e,texte){if(autonomie==='discrete'||actuel)return;if(autonomie==='active')return montrer(e);sug.textContent='';sug.appendChild(el('i','pp-pastille'));sug.appendChild(el('span',null,texte));
  sug.appendChild(bouton('Voir','pp-b pp-b-s',function(){montrer(e,{clavier:true})}));sug.appendChild(bouton('Plus tard','pp-b pp-b-s',function(){sug.hidden=true}));sug.hidden=false;
  var r=e.getBoundingClientRect();if(innerWidth>720)sug.style.transform='translate('+Math.round(Math.min(innerWidth-sug.offsetWidth-12,Math.max(12,r.left)))+'px,'+Math.round(Math.min(innerHeight-60,r.bottom+12))+'px)';else sug.style.transform='';poser(e)}

 /* sélectionner suffit : clic, toucher, ou focus clavier (Entrée / Espace ouvre les réglages) */
 zone.addEventListener('click',function(e){var t=C.lire(e.target);if(t){montrer(t.el,{clavier:e.detail===0})}});
 zone.addEventListener('focusin',function(e){var t=C.lire(e.target);if(t&&!(actuel&&actuel.el===t.el)){encadrer(t.el);poser(t.el)}});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!bulle.hidden){e.stopPropagation();fermer(true)}});
 document.addEventListener('pointerdown',function(e){if(!bulle.hidden&&!bulle.contains(e.target)&&!C.lire(e.target))fermer()});
 addEventListener('resize',function(){if(actuel){encadrer(actuel.el);placer(actuel.el);poser(actuel.el)}});addEventListener('scroll',function(){if(actuel){encadrer(actuel.el);placer(actuel.el);poser(actuel.el)}},{passive:true});
 return{montrer:montrer,fermer:fermer,suggerer:suggerer,actuel:function(){return actuel},reglerMouvement:function(v){mouvement=!!v&&!RM;if(!mouvement)couche.classList.remove('suit')},reglerAutonomie:function(id){autonomie=id},
  autonomie:function(){return autonomie},mouvement:function(){return mouvement},detruire:function(){couche.remove();bulle.remove();sug.remove()}}}

root.AIMEOrbePilote={monter:monter};
})(typeof self!=='undefined'?self:this);
