/* AIME · ORBE · le compagnon. Il lit la table du système (systeme.js) et vit sur n'importe quelle page :
   - au survol, l'orbe commente l'élément pointé et propose une action, en disant pourquoi ;
   - au clic sur un contenu (titre, texte, image, carte…) ou au clic droit / appui long sur n'importe quel élément,
     un menu d'actions apparaît : seules les actions réellement faisables sont actives, les autres sont dites « prévues » ;
   - la pointe de la flèche est le pointeur ; l'orbe la suit, et la flèche se tourne vers ce qu'elle aimerait essayer ;
   - après trois secondes de mouvement sans but, l'orbe se détache et propose deux minutes de réflexion.
   Mémoire : ce navigateur seulement (localStorage « aime-orbe »). Aucune IA : des règles, toujours dites.
   AIMECompagnon.demarrer({pointeur, envie, hesitation, clic}) */
(function(){'use strict';
var S=window.AIMEOrbeSysteme,NS='http://www.w3.org/2000/svg';if(!S)return;
var FINE=matchMedia('(pointer:fine)').matches,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
var CLE='aime-orbe',M=(function(){try{var v=JSON.parse(localStorage.getItem(CLE)||'null');if(v&&v.v===1)return v}catch(e){}return S.memoireVide()})();
var reglages=(function(){try{return JSON.parse(localStorage.getItem(CLE+'-reglages')||'null')||{}}catch(e){return{}}})();
function sauver(){try{localStorage.setItem(CLE,JSON.stringify(M))}catch(e){}emettre('memoire',M)}
function sauverReglages(){try{localStorage.setItem(CLE+'-reglages',JSON.stringify(reglages))}catch(e){}}
function emettre(type,detail){try{window.dispatchEvent(new CustomEvent('aime-orbe:'+type,{detail:detail}))}catch(e){}}
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})};
var O={pointeur:FINE,envie:true,hesitation:true,clic:true},px=-1,py=-1,actif=false;

/* ---------- la couche du compagnon (jamais commentée par lui-même) ---------- */
var L,BUL,MENU,CADRE,LIENS,PT,FL,MINI,ENV;
function couche(){var css=document.createElement('style');css.textContent=
 '#aorb{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:14px/1.45 "Inter Variable",Inter,-apple-system,"Segoe UI",sans-serif;color:#EDEDF0}'+
 '#aorb *{box-sizing:border-box}'+
 '.aorb-cadre{position:fixed;left:0;top:0;border-radius:10px;opacity:0;transition:opacity .2s;box-shadow:0 0 0 1.5px rgba(196,181,253,.9),0 0 0 5px rgba(124,92,255,.18)}.aorb-cadre.on{opacity:1}'+
 '.aorb-bulle{position:fixed;left:0;top:0;max-width:min(320px,calc(100vw - 24px));padding:1.5px;border-radius:16px;background:linear-gradient(135deg,#FB7185,#F59E0B,#7C5CFF,#22D3EE);opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;pointer-events:none}.aorb-bulle.on{opacity:1;transform:none;pointer-events:auto}'+
 '.aorb-bulle>div,.aorb-menu>div,.aorb-conv>div{background:rgba(14,13,20,.96);border-radius:14.5px;padding:12px 14px}'+
 '.aorb-bulle small,.aorb-menu small,.aorb-conv small{display:block;font:600 10px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#9C9CA8;margin-bottom:4px}'+
 '.aorb-bulle p{margin:0}.aorb-sug{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;color:#C9C9D2}'+
 '.aorb-sug button,.aorb-menu button,.aorb-conv button{font:600 12.5px "Inter Variable",Inter,sans-serif;border:1px solid #2B2B33;background:#1B1B22;color:#EDEDF0;border-radius:999px;padding:6px 11px;cursor:pointer}'+
 '.aorb-sug button.p,.aorb-menu button.p,.aorb-conv button.p{background:#EDEDF0;color:#0A0A0C;border-color:#EDEDF0}'+
 '.aorb-pourquoi{color:#9C9CA8;font-size:12px;margin-top:6px}'+
 '.aorb-menu{position:fixed;left:0;top:0;width:min(300px,calc(100vw - 24px));padding:1.5px;border-radius:16px;background:linear-gradient(135deg,#FB7185,#F59E0B,#7C5CFF,#22D3EE);pointer-events:auto;box-shadow:0 20px 60px rgba(0,0,0,.55)}'+
 '.aorb-menu p{margin:0 0 10px;color:#C9C9D2;font-size:13px}.aorb-menu ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}'+
 '.aorb-menu li button{width:100%;text-align:left;border-radius:10px;display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 10px}'+
 '.aorb-menu li button:hover,.aorb-menu li button:focus-visible{background:#2A2A33;outline:none}.aorb-menu li button[disabled]{opacity:.45;cursor:default}'+
 '.aorb-menu li button i{font-style:normal;font:500 10px ui-monospace,Menlo,monospace;color:#9C9CA8;letter-spacing:.06em}'+
 '.aorb-menu li.sug button{border-color:#7C5CFF}'+
 '.aorb-liens{position:fixed;inset:0;width:100%;height:100%;overflow:visible}'+
 '.aorb-pt{position:fixed;left:0;top:0;width:0;height:0}.aorb-fl{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;transition:transform .35s cubic-bezier(.2,.8,.2,1)}'+
 '.aorb-fl i{position:absolute;left:-15px;top:-7px;width:0;height:0;border-left:15px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;filter:drop-shadow(0 0 4px rgba(124,92,255,.9)) drop-shadow(0 1px 2px rgba(0,0,0,.8))}'+
 '.aorb-mini{position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px;border-radius:50%;background:conic-gradient(#FB7185,#F59E0B,#7C5CFF,#22D3EE,#FB7185);box-shadow:0 0 0 2px rgba(10,10,12,.7),0 0 18px rgba(124,92,255,.8);transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s}'+
 '.aorb-mini.vole{transition:transform .9s cubic-bezier(.45,0,.2,1)}'+
 '.aorb-env{position:absolute;left:24px;top:14px;white-space:nowrap;font:600 10px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#C9C9D2;text-shadow:0 1px 6px #000;opacity:0;transition:opacity .3s}.aorb-env.on{opacity:.9}'+
 'html.aorb-pointe,html.aorb-pointe *{cursor:none!important}html.aorb-pointe input,html.aorb-pointe textarea,html.aorb-pointe [contenteditable=true],html.aorb-pointe [data-orbe-curseur]{cursor:text!important}'+
 'html.aorb-pointe [data-orbe-ignorer] *{cursor:auto!important}html.aorb-pointe [data-orbe-ignorer] button,html.aorb-pointe [data-orbe-ignorer] a{cursor:pointer!important}'+
 '.aorb-conv{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(380px,calc(100vw - 32px));padding:1.5px;border-radius:20px;background:linear-gradient(135deg,#FB7185,#F59E0B,#7C5CFF,#22D3EE);pointer-events:auto;box-shadow:0 24px 80px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .35s,transform .35s}.aorb-conv.on{opacity:1;transform:none}'+
 '.aorb-conv>div{padding:16px 18px;border-radius:18.5px}.aorb-conv h3{margin:0 0 8px;font:400 22px/1.15 "Cal Sans","Inter Variable",sans-serif}.aorb-conv p{margin:0 0 10px;color:#C9C9D2}'+
 '.aorb-conv .ch{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.aorb-conv .tps{float:right;font:600 12px ui-monospace,Menlo,monospace;color:#9C9CA8}'+
 '.aorb-conv ul{margin:6px 0 10px;padding-left:18px;color:#C9C9D2}.aorb-conv .h{font-size:11.5px;color:#9C9CA8}.aorb-conv input,.aorb-conv textarea,.aorb-conv select{width:100%;border:1px solid #2B2B33;background:#0F0F14;color:#EDEDF0;border-radius:10px;padding:8px 10px;font:14px "Inter Variable",Inter,sans-serif;margin:4px 0 10px}'+
 '.aorb-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translate(-50%,10px);background:#EDEDF0;color:#0A0A0C;border-radius:12px;padding:10px 14px;font:600 13px "Inter Variable",Inter,sans-serif;opacity:0;transition:.25s;pointer-events:auto;display:flex;gap:12px;align-items:center}.aorb-toast.on{opacity:1;transform:translate(-50%,0)}.aorb-toast button{border:0;background:none;font:inherit;text-decoration:underline;cursor:pointer;color:inherit}'+
 '.aorb-loupe{position:fixed;inset:0;background:rgba(10,10,12,.86);display:grid;place-items:center;pointer-events:auto;cursor:zoom-out}.aorb-loupe img{max-width:92vw;max-height:88vh;border-radius:10px}'+
 '@media (prefers-reduced-motion:reduce){.aorb-fl,.aorb-mini,.aorb-bulle,.aorb-conv{transition:none}}';
 document.head.appendChild(css);
 L=document.createElement('div');L.id='aorb';L.setAttribute('data-orbe-ignorer','');document.body.appendChild(L);
 L.innerHTML='<svg class="aorb-liens" aria-hidden="true"></svg><div class="aorb-cadre" aria-hidden="true"></div><div class="aorb-bulle" role="status" aria-live="polite"><div></div></div>';
 LIENS=L.querySelector('.aorb-liens');CADRE=L.querySelector('.aorb-cadre');BUL=L.querySelector('.aorb-bulle');
 if(O.pointeur&&FINE){PT=document.createElement('div');PT.className='aorb-pt';PT.setAttribute('aria-hidden','true');PT.innerHTML='<div class="aorb-fl"><i></i></div><div class="aorb-mini"></div><span class="aorb-env"></span>';L.appendChild(PT);
  FL=PT.querySelector('.aorb-fl');MINI=PT.querySelector('.aorb-mini');ENV=PT.querySelector('.aorb-env');document.documentElement.classList.add('aorb-pointe');PT.style.opacity=0}}
function toast(html,ms,annuler){var t=L.querySelector('.aorb-toast');if(!t){t=document.createElement('div');t.className='aorb-toast';t.setAttribute('role','status');L.appendChild(t)}t.innerHTML=html+(annuler?'<button type="button">Annuler</button>':'');if(annuler)t.querySelector('button').onclick=function(){annuler();t.classList.remove('on')};t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},ms||2600)}

/* ---------- le pointeur : la pointe de la flèche pointe, l'orbe suit derrière ---------- */
var angle=-2.36,cible=null,detache=false;
function dessinerPointeur(){if(!PT)return;PT.style.transform='translate('+px+'px,'+py+'px)';var a=angle;FL.style.transform='rotate('+a+'rad)';
 if(!detache)MINI.style.transform='translate('+(-Math.cos(a)*26).toFixed(1)+'px,'+(-Math.sin(a)*26).toFixed(1)+'px)'}
/* sur une page qui a déjà son orbe-curseur (la grande landing), le compagnon ne dessine pas de pointeur */

/* ---------- survol : l'orbe commente ---------- */
var fixe=null,survol=null,attente=0,dernierEl=null,bulleEl=null,menuOuvert=false,lienEnCours=null;
function cadrer(el){if(!el){CADRE.classList.remove('on');return}var r=el.getBoundingClientRect();CADRE.style.transform='translate('+(r.left-4)+'px,'+(r.top-4)+'px)';CADRE.style.width=(r.width+8)+'px';CADRE.style.height=(r.height+8)+'px';CADRE.classList.add('on')}
function placer(box,x,y){var w=box.offsetWidth,h=box.offsetHeight,X=x+22,Y=y+22;if(X+w>innerWidth-12)X=x-w-22;if(Y+h>innerHeight-12)Y=y-h-22;box.style.transform='translate('+Math.max(12,X)+'px,'+Math.max(12,Y)+'px)'}
function commenter(t){var T=t.type,sug=S.suggerer(M,T);bulleEl=t.el;
 BUL.firstChild.innerHTML='<small>'+esc(T.nom)+'</small><p>'+esc(S.commenter(t.el,T))+'</p>'+(sug?'<div class="aorb-sug">Je suggère <button type="button" class="p" data-a="'+sug.action+'">'+esc(S.ACTIONS[sug.action].nom)+'</button><button type="button" data-pq>Pourquoi ?</button></div><div class="aorb-pourquoi" hidden>'+esc(sug.regle)+'</div>':'')+'<div class="aorb-pourquoi">Clic'+(estContenu(t)?'':' droit')+' : toutes les actions.</div>';
 BUL.classList.add('on');placer(BUL,px,py);S.vu(M,T.id);emettre('survol',{type:T.id});
 BUL.onclick=function(e){var b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-pq')){BUL.querySelector('.aorb-pourquoi[hidden]').hidden=false;return}faire(b.dataset.a,t)}}
function cacherBulle(){BUL.classList.remove('on');bulleEl=null}
function surPointeur(e){if(e.pointerType&&e.pointerType!=='mouse')return;px=e.clientX;py=e.clientY;if(PT&&PT.style.opacity==='0')PT.style.opacity=1;trace.push({t:performance.now(),x:px,y:py});if(trace.length>200)trace.shift();
 if(L.contains(e.target))return;
 if(menuOuvert||detache||lienEnCours&&!e.target)return;if(fixe){if(Math.hypot(px-fixe[0],py-fixe[1])<90&&performance.now()-fixe[2]<9000)return;fixe=null}if(PT){var ign=e.target.closest&&e.target.closest('[data-orbe-ignorer]');PT.style.opacity=ign&&!L.contains(e.target)?0:1}var t=S.typer(e.target);
 if(!t){if(survol){survol=null;cadrer(null);cacherBulle()}return}
 if(survol&&survol.el===t.el){if(BUL.classList.contains('on'))placer(BUL,px,py);return}
 survol=t;cadrer(lienEnCours?t.el:null);cacherBulle();clearTimeout(attente);debutArret=performance.now();
 if(reglages.commentaires===false||O.commentaires===false)return;attente=setTimeout(function(){if(survol===t&&!menuOuvert&&!fixe&&!detache)commenter(t)},lienEnCours?0:520)}

/* ---------- le menu d'actions ---------- */
var CONTENU={titre:1,texte:1,citation:1,image:1,carte:1,tableau:1,liste:1,date:1,lieu:1,personne:1,code:1};
function estContenu(t){if(!CONTENU[t.type.id])return false;return!t.el.closest('a,button,input,select,textarea,label,[role=button],[contenteditable=true],[tabindex]')}
function ouvrirMenu(t,x,y){clearTimeout(attente);fermerMenu();cacherBulle();menuOuvert=true;var T=t.type,sug=S.suggerer(M,T);cadrer(t.el);
 var ordre=T.actions.slice();if(sug){ordre.splice(ordre.indexOf(sug.action),1);ordre.unshift(sug.action)}
 MENU=document.createElement('div');MENU.className='aorb-menu';MENU.setAttribute('role','menu');MENU.setAttribute('aria-label','Actions de l\'orbe : '+T.nom);
 MENU.innerHTML='<div><small>'+esc(T.nom)+'</small><p>'+esc(S.commenter(t.el,T))+'</p><ul>'+ordre.map(function(a){var A=S.ACTIONS[a],op=A.etat==='operationnelle';return'<li'+(sug&&a===sug.action?' class="sug"':'')+'><button type="button" role="menuitem" data-a="'+a+'" title="'+esc(A.aide)+'"'+(op?'':' disabled aria-disabled="true"')+'>'+esc(A.nom)+'<i>'+(op?(sug&&a===sug.action?'suggérée':''):'prévue')+'</i></button></li>'}).join('')+'</ul>'+(sug?'<div class="aorb-pourquoi">'+esc(sug.regle)+'</div>':'')+'</div>';
 L.appendChild(MENU);placer(MENU,x,y);var bs=[].slice.call(MENU.querySelectorAll('button:not([disabled])'));if(bs[0])bs[0].focus({preventScroll:true});
 MENU.addEventListener('click',function(e){var b=e.target.closest('button[data-a]');if(!b||b.disabled)return;var a=b.dataset.a;fermerMenu(true);faire(a,t)});
 MENU.addEventListener('keydown',function(e){var i=bs.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();bs[(i+1)%bs.length].focus()}if(e.key==='ArrowUp'){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus()}if(e.key==='Escape'){fermerMenu()}});
 MENU._sug=sug;MENU._t=t;emettre('menu',{type:T.id})}
function fermerMenu(agi){if(!MENU)return;if(!agi&&MENU._sug){var k=MENU._t.type.id+':'+MENU._sug.action;M.refus[k]=(M.refus[k]||0)+1;sauver()}MENU.remove();MENU=null;menuOuvert=false;cadrer(null)}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(lienEnCours){lienEnCours=null;cadrer(null);toast('Lien abandonné.')}fermerMenu();cacherBulle()}},true);

/* ---------- les actions, pour de vrai (le temps de la visite) ---------- */
function copierTexte(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).then(function(){toast('Copié.')},function(){selection(t)});selection(t)}
function selection(t){var a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copié.')}catch(e){toast('Copie impossible ici : sélectionnez le texte.')}a.remove()}
var EX={email:'lea.martin@exemple.fr',tel:'01 23 45 67 89',date:'2027-06-14',number:'42',url:'https://exemple.fr',search:'mariage à Nantes',text:'Léa Martin',textarea:'Une note fictive, pour essayer.'};
function faire(a,t){var el=t.el,T=t.type,A=S.ACTIONS[a];if(!A||A.etat!=='operationnelle'){toast(esc(A?A.nom+' : prévue.':'Action inconnue.'));return}
 clearTimeout(attente);S.noter(M,T.id,a);sauver();emettre('action',{type:T.id,action:a});cacherBulle();
 if(a==='modifier'){var avant=el.innerHTML;el.setAttribute('contenteditable','true');el.focus();try{document.getSelection().selectAllChildren(el)}catch(e){}el.addEventListener('blur',function f(){el.removeAttribute('contenteditable');el.removeEventListener('blur',f);if(el.innerHTML!==avant)toast('Modifié sur cet écran seulement.',3600,function(){el.innerHTML=avant})});return}
 if(a==='copier')return copierTexte(S.texte(el));
 if(a==='copier-lien')return copierTexte(el.href);
 if(a==='dupliquer'){var c=el.cloneNode(true);c.removeAttribute('id');[].forEach.call(c.querySelectorAll('[id]'),function(x){x.removeAttribute('id')});el.after(c);c.animate&&c.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:350});toast('Dupliqué, le temps de la visite.',3600,function(){c.remove()});return}
 if(a==='masquer'){var v=el.style.visibility;el.style.visibility='hidden';toast('Masqué.',5000,function(){el.style.visibility=v});return}
 if(a==='relier'){setTimeout(function(){lienEnCours=t;cadrer(el)},0);toast('Touchez un second élément à relier. Échap pour abandonner.',4200);return}
 if(a==='mesurer'){var m=S.texte(el).split(' ').filter(Boolean).length;toast(m+' mots · environ '+Math.max(1,Math.round(m/230))+' min de lecture');return}
 if(a==='agrandir'){var src=el.currentSrc||el.src;if(!src){toast('Rien à agrandir.');return}var lp=document.createElement('div');lp.className='aorb-loupe';lp.innerHTML='<img alt="'+esc(el.alt||'')+'" src="'+esc(src)+'">';lp.onclick=function(){lp.remove()};L.appendChild(lp);return}
 if(a==='remplir'){var ty=(el.type||el.tagName).toLowerCase();if(el.tagName==='SELECT'){el.selectedIndex=Math.min(1,el.options.length-1)}else el.value=EX[ty]||EX.text;el.dispatchEvent(new Event('input',{bubbles:true}));toast('Exemple fictif posé.');return}
 if(a==='vider'){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));return}
 if(a==='decaler'){var tx=el.getAttribute('datetime')||el.getAttribute('data-date')||'',d=new Date(tx);if(isNaN(d)){toast('Je ne lis pas cette date : rien n\'est décalé.');return}var av=el.textContent,av2=tx;d.setDate(d.getDate()+1);var iso=d.toISOString().slice(0,10);el.setAttribute(el.hasAttribute('datetime')?'datetime':'data-date',iso);el.textContent=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});toast('Décalé d\'un jour, sur cet affichage seulement.',4200,function(){el.textContent=av;el.setAttribute(el.hasAttribute('datetime')?'datetime':'data-date',av2)});return}
 if(a==='expliquer'){var i=S.infos(el),r=el.getBoundingClientRect();BUL.firstChild.innerHTML='<small>'+esc(T.nom)+' · &lt;'+el.tagName.toLowerCase()+'&gt;</small><p>'+esc(S.commenter(el,T))+'</p><div class="aorb-pourquoi">'+Math.round(r.width)+' × '+Math.round(r.height)+' px'+(i.libelle?' · nom : « '+esc(i.libelle)+' »':'')+'. Ce que je sais faire ici : '+T.actions.filter(function(x){return S.ACTIONS[x].etat==='operationnelle'}).map(function(x){return S.ACTIONS[x].nom.toLowerCase()}).join(', ')+'.</div>';BUL.classList.add('on');placer(BUL,px<0?r.left:px,py<0?r.top:py);bulleEl=el;fixe=[px,py,performance.now()];return}
 if(a==='inspecter'){var rep=inspecter(el);BUL.firstChild.innerHTML='<small>Vérification · mesurée</small>'+rep.map(function(x){return'<p style="margin:0 0 4px">'+(x.ok?'✓ ':'✕ ')+esc(x.t)+'</p>'}).join('')+(rep.some(function(x){return!x.ok})?'<div class="aorb-sug"><button type="button" class="p" data-a="remarque">Verser en remarque</button></div>':'');BUL.classList.add('on');var rr=el.getBoundingClientRect();fixe=[px,py,performance.now()];placer(BUL,px<0?rr.left:px,py<0?rr.top:py);BUL.onclick=function(e){if(e.target.closest('[data-a]'))remarque(t,'À réparer',rep.filter(function(x){return!x.ok}).map(function(x){return x.t}).join(' · '))};return}
 if(a==='remarque')return remarque(t)}
/* accessibilité : contraste, nom, taille de cible — des mesures, jamais une impression */
function fond(el){for(var e=el;e&&e.nodeType===1;e=e.parentElement){var c=S.rgb(getComputedStyle(e).backgroundColor);if(c&&c.a>.5)return c}return{r:10,g:10,b:12,a:1}}
function inspecter(el){var cs=getComputedStyle(el),out=[],c=S.rgb(cs.color),f=fond(el),r=el.getBoundingClientRect(),gros=parseFloat(cs.fontSize)>=24||parseFloat(cs.fontSize)>=18.66&&+cs.fontWeight>=700;
 if(c&&S.texte(el)){var k=S.contraste(c,f);out.push({ok:k>=(gros?3:4.5),t:'Contraste '+k.toFixed(2).replace('.',',')+':1 (seuil '+(gros?'3':'4,5')+':1)'})}
 var nom=el.getAttribute('aria-label')||el.getAttribute('alt')||el.getAttribute('title')||S.texte(el);if(/^(A|BUTTON|INPUT|SELECT|TEXTAREA|IMG)$/.test(el.tagName))out.push({ok:!!nom||el.getAttribute('alt')==='',t:nom?'Nom accessible : « '+nom.slice(0,40)+' »':'Aucun nom accessible'});
 if(/^(A|BUTTON|INPUT|SELECT)$/.test(el.tagName)||el.getAttribute('role')==='button')out.push({ok:r.width>=24&&r.height>=24,t:'Cible '+Math.round(r.width)+' × '+Math.round(r.height)+' px (minimum 24 × 24)'});
 if(el.tagName==='IMG')out.push({ok:el.hasAttribute('alt'),t:el.hasAttribute('alt')?'Attribut alt présent':'Attribut alt absent'});
 if(!out.length)out.push({ok:true,t:'Rien à mesurer ici.'});return out}

/* ---------- les remarques : à réparer, à optimiser, à améliorer ---------- */
function chemin(el){var p=[];for(var e=el;e&&e.nodeType===1&&p.length<5;e=e.parentElement){var s=e.tagName.toLowerCase();if(e.id){p.unshift(s+'#'+e.id);break}var cl=[].slice.call(e.classList).filter(function(c){return!/^aorb/.test(c)}).slice(0,2);if(cl.length)s+='.'+cl.join('.');p.unshift(s)}return p.join(' > ')}
function remarque(t,cat,texte){fermerMenu(true);cacherBulle();var B=document.createElement('div');B.className='aorb-conv on';B.setAttribute('role','dialog');B.setAttribute('aria-label','Nouvelle remarque');
 B.innerHTML='<div><small>Remarque · '+esc(t?t.type.nom:'page')+'</small><h3>Que faut-il faire ?</h3><select aria-label="Catégorie"><option>À réparer</option><option>À optimiser</option><option>À améliorer</option></select><textarea rows="3" aria-label="Remarque" placeholder="Ce que vous avez constaté…"></textarea><p class="h">Élément : '+esc(t?chemin(t.el):location.pathname)+'</p><div class="ch"><button type="button" class="p">Verser au journal</button><button type="button" data-x>Annuler</button></div></div>';
 L.appendChild(B);var sel=B.querySelector('select'),ta=B.querySelector('textarea');if(cat)sel.value=cat;if(texte)ta.value=texte;ta.focus();
 B.querySelector('.p').onclick=function(){var r={id:'r'+Date.now().toString(36),date:new Date().toISOString(),page:location.pathname,categorie:sel.value,texte:ta.value.trim(),element:t?{type:t.type.id,chemin:chemin(t.el),extrait:S.infos(t.el).court}:null};if(!r.texte){ta.focus();return}M.remarques.push(r);sauver();emettre('remarque',r);B.remove();toast('Versée au journal des remarques ('+M.remarques.length+').')};
 B.querySelector('[data-x]').onclick=function(){B.remove()}}

/* ---------- clic : sur un contenu, le menu ; ailleurs, le clic garde son sens ---------- */
document.addEventListener('click',function(e){if(!e.target.isConnected||e.target.closest('[data-orbe-ignorer]'))return;
 if(lienEnCours){var t2=S.typer(e.target);if(t2&&t2.el!==lienEnCours.el){e.preventDefault();e.stopPropagation();relier(lienEnCours.el,t2.el);S.noter(M,t2.type.id,'relier');sauver();lienEnCours=null;cadrer(null);toast('Reliés : le lien suit les deux éléments, le temps de la visite.')}return}
 if(menuOuvert){fermerMenu();return}
 if(!O.clic||reglages.clic===false)return;var t=S.typer(e.target);if(!t||!estContenu(t))return;
 /* si la page réagit déjà au clic (elle change quelque chose), l'orbe se tait */
 var x=e.clientX,y=e.clientY,bouge=0,mo=new MutationObserver(function(l){l.forEach(function(m){var n=m.target.nodeType===1?m.target:m.target.parentElement;if(!n||n.closest('[data-orbe-ignorer],[aria-hidden=true]'))return;if(m.type==='attributes'&&(/^(style|d|transform|points|cx|cy|r|x|y|opacity)$/.test(m.attributeName)||m.oldValue===n.getAttribute(m.attributeName)))return;bouge++})});mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,characterData:true});var sy=scrollY;
 setTimeout(function(){mo.disconnect();if(!bouge&&scrollY===sy&&!menuOuvert&&!document.getSelection().toString())ouvrirMenu(t,x,y)},140)},false);
/* priorité au menu de l'orbe sur l'élément : écouté en capture, avant les autres menus de la page (le radial de la landing reste au bouton orbe et à l'appui long) ; Maj + clic droit rend le menu du navigateur */
window.addEventListener('contextmenu',function(e){if(!actif||!e.target.isConnected||e.target.closest('[data-orbe-ignorer]')||e.shiftKey)return;var t=S.typer(e.target);if(!t)return;e.preventDefault();e.stopImmediatePropagation();ouvrirMenu(t,e.clientX,e.clientY)},true);
/* appui long sur écran tactile */
(function(){var tm=0,x0=0,y0=0;document.addEventListener('touchstart',function(e){if(e.touches.length!==1||e.target.closest('[data-orbe-ignorer]'))return;x0=e.touches[0].clientX;y0=e.touches[0].clientY;var tg=e.target;tm=setTimeout(function(){var t=S.typer(tg);if(t){px=x0;py=y0;ouvrirMenu(t,x0,y0)}},560)},{passive:true});
 ['touchend','touchcancel'].forEach(function(n){document.addEventListener(n,function(){clearTimeout(tm)},{passive:true})});document.addEventListener('touchmove',function(e){if(Math.hypot(e.touches[0].clientX-x0,e.touches[0].clientY-y0)>10)clearTimeout(tm)},{passive:true})})();

/* ---------- relier : un lien visible qui suit les deux éléments ---------- */
var paires=[];function relier(a,b){paires.push([a,b]);emettre('lien',{n:paires.length})}
function dessinerLiens(){if(!paires.length){if(LIENS.firstChild)LIENS.innerHTML='';return}LIENS.innerHTML='<defs><linearGradient id="aorbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FB7185"/><stop offset=".5" stop-color="#7C5CFF"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs>'+paires.filter(function(p){return p[0].isConnected&&p[1].isConnected}).map(function(p){var a=p[0].getBoundingClientRect(),b=p[1].getBoundingClientRect(),x1=a.left+a.width/2,y1=a.top+a.height/2,x2=b.left+b.width/2,y2=b.top+b.height/2,mx=(x1+x2)/2,my=Math.min(y1,y2)-60;
 return'<path d="M'+x1+','+y1+' Q'+mx+','+my+' '+x2+','+y2+'" fill="none" stroke="url(#aorbg)" stroke-width="2" stroke-dasharray="6 6"/><circle cx="'+x1+'" cy="'+y1+'" r="4" fill="#C4B5FD"/><circle cx="'+x2+'" cy="'+y2+'" r="4" fill="#C4B5FD"/>'}).join('')}

/* ---------- l'envie : la flèche se tourne vers ce que l'orbe aimerait essayer ---------- */
var derniereEnvie=0,immobile=0;
function chercherEnvie(){var c=[];var T=S.TYPES.filter(function(t){return t.id!=='section'&&t.id!=='menu'});var vus=0;
 [].forEach.call(document.querySelectorAll(T.map(function(t){return t.sel}).join(',')),function(el){if(vus>500||el.closest('[data-orbe-ignorer]'))return;vus++;var r=el.getBoundingClientRect();if(r.width<16||r.height<10||r.bottom<60||r.top>innerHeight-40||r.right<0||r.left>innerWidth)return;var t=S.typer(el);if(!t||t.el!==el)return;var cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(cx-px,cy-py);if(d<120)return;c.push({el:el,type:t.type.id,nom:t.type.nom,distance:d,x:cx,y:cy})});
 return S.envie(M,c)}
function majEnvie(now){if(!PT||!O.envie||reglages.envie===false||detache)return;if(now-derniereEnvie>2200){derniereEnvie=now;cible=chercherEnvie()}
 if(cible&&cible.el.isConnected){var r=cible.el.getBoundingClientRect();cible.x=r.left+r.width/2;cible.y=r.top+r.height/2;angle=Math.atan2(cible.y-py,cible.x-px);var lent=now-immobile>1200;ENV.textContent='J\'aimerais essayer : '+cible.nom.toLowerCase();ENV.classList.toggle('on',lent&&!BUL.classList.contains('on')&&!menuOuvert)}else{angle=-2.36;ENV.classList.remove('on')}}

/* ---------- l'hésitation : trois secondes sans but, et l'orbe propose de réfléchir ---------- */
var trace=[],clics=0,debutArret=0,saisie=false,dejaPropose=false;
document.addEventListener('pointerdown',function(){clics++;setTimeout(function(){clics=Math.max(0,clics-1)},3000)},true);
document.addEventListener('keydown',function(){saisie=true;setTimeout(function(){saisie=false},3000)},true);
function verifierHesitation(now){if(!O.hesitation||reglages.hesitation===false||detache||menuOuvert||dejaPropose||!FINE)return;if(document.querySelector('.aorb-conv'))return;
 var arret=survol&&/^(bouton|lien|champ|onglet)$/.test(survol.type.id)?now-debutArret:0;
 if(S.hesite(trace,{clics:clics,saisie:saisie,arret:arret})){dejaPropose=true;converser()}}
/* l'orbe quitte le pointeur, se pose, et ouvre la conversation */
var conv=null;
function converser(){detache=true;cacherBulle();cadrer(null);var B=document.createElement('div');B.className='aorb-conv';B.setAttribute('role','dialog');B.setAttribute('aria-label','Deux minutes avec l\'orbe');L.appendChild(B);conv=B;
 var dest=function(){var r=B.getBoundingClientRect();return[r.left+26,r.top+26]};
 if(MINI){var d=dest();MINI.classList.add('vole');MINI.style.transform='translate('+(d[0]-px)+'px,'+(d[1]-py)+'px) scale(1.6)'}else{var ocur=document.getElementById('ocur');if(ocur)ocur.style.opacity=0}
 setTimeout(function(){B.classList.add('on')},RM?0:500);
 var rep={},etape=-1,fin=Date.now()+120000,tick=null,variante=0;
 function tps(){var s=Math.max(0,Math.round((fin-Date.now())/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
 function afficherConv(){var h='';
  if(etape<0)h='<small>L\'orbe<span class="tps">2:00</span></small><h3>Vous cherchez ?</h3><p>On dirait que vous ne savez pas où aller. Et si on prenait deux minutes pour imaginer un concept pour le Monde AIME ?</p><div class="ch"><button type="button" class="p" data-go>Réfléchissons</button><button type="button" data-x>Plus tard</button></div><p class="h">Une conversation guidée par des règles, pas une IA.</p>';
  else if(etape<S.QUESTIONS.length){var Q=S.QUESTIONS[etape];h='<small>Concept · '+(etape+1)+' / '+S.QUESTIONS.length+'<span class="tps">'+tps()+'</span></small><h3>'+esc(Q.q)+'</h3><div class="ch">'+Q.choix.map(function(c){return'<button type="button" data-c="'+esc(c)+'">'+esc(c)+'</button>'}).join('')+'</div><input type="text" aria-label="Autre réponse" placeholder="Ou dites-le autrement…"><div class="ch"><button type="button" data-x>Arrêter</button></div>'}
  else{var C=S.concept(rep,variante);B._concept=C;h='<small>Notre concept<span class="tps">'+tps()+'</span></small><h3>'+esc(C.nom)+'</h3><p>'+esc(C.pitch)+'</p><p class="h">Ce que je ferais</p><ul>'+C.orbe.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul><p class="h">À prototyper d\'abord</p><p>'+esc(C.prototype)+'</p><p class="h">'+esc(C.mesure)+'</p><div class="ch"><button type="button" class="p" data-garder>Garder ce concept</button><button type="button" data-autre>Une autre idée</button><button type="button" data-copier>Copier</button><button type="button" data-x>Fermer</button></div><p class="h">'+esc(C.honnete)+'</p>'}
  B.innerHTML='<div>'+h+'</div>';var f=B.querySelector('button');if(f)f.focus({preventScroll:true});
  var inp=B.querySelector('input');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&inp.value.trim()){rep[S.QUESTIONS[etape].id]=inp.value.trim();etape++;afficherConv()}})}
 B.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-go')){etape=0;fin=Date.now()+120000;tick=setInterval(function(){var t=B.querySelector('.tps');if(t)t.textContent=tps();if(Date.now()>fin){clearInterval(tick);if(etape<S.QUESTIONS.length){etape=S.QUESTIONS.length}afficherConv();var tt=B.querySelector('.tps');if(tt)tt.textContent='temps écoulé'}},1000);afficherConv();return}
  if(b.dataset.c){rep[S.QUESTIONS[etape].id]=b.dataset.c;etape++;afficherConv();return}
  if(b.hasAttribute('data-autre')){variante++;afficherConv();return}
  if(b.hasAttribute('data-copier')){var C=B._concept;copierTexte(C.nom+'\n\n'+C.pitch+'\n\n'+C.orbe.map(function(x){return'- '+x}).join('\n')+'\n\nÀ prototyper : '+C.prototype+'\n'+C.mesure);return}
  if(b.hasAttribute('data-garder')){M.conversations.push({date:new Date().toISOString(),reponses:rep,concept:B._concept});M.remarques.push({id:'c'+Date.now().toString(36),date:new Date().toISOString(),page:location.pathname,categorie:'Concept',texte:B._concept.nom+' : '+B._concept.pitch,element:null});sauver();emettre('concept',B._concept);toast('Concept gardé dans le journal.');finir();return}
  if(b.hasAttribute('data-x'))finir()});
 function finir(){clearInterval(tick);B.classList.remove('on');setTimeout(function(){B.remove()},350);detache=false;conv=null;if(MINI){MINI.style.transform='';setTimeout(function(){MINI.classList.remove('vole')},900)}else{var oc=document.getElementById('ocur');if(oc)oc.style.opacity=''}
  /* une fois par visite seulement, sauf si on le redemande */
  setTimeout(function(){dejaPropose=false},10*60*1000)}
 afficherConv()}

/* ---------- la boucle ---------- */
var dernierMouv=0;
function image(now){if(px>=0){if(trace.length&&now-trace[trace.length-1].t<60)immobile=now;majEnvie(now);dessinerPointeur();verifierHesitation(now)}if(bulleEl&&!bulleEl.isConnected)cacherBulle();if(CADRE.classList.contains('on')){var c=lienEnCours?lienEnCours.el:MENU&&MENU._t?MENU._t.el:null;if(c)cadrer(c)}dessinerLiens();requestAnimationFrame(image)}

window.AIMECompagnon={demarrer:function(o){if(actif)return;actif=true;for(var k in o)O[k]=o[k];couche();document.addEventListener('pointermove',surPointeur,{passive:true});document.addEventListener('pointerleave',function(){if(PT)PT.style.opacity=0});requestAnimationFrame(image)},
 memoire:function(){return M},reglages:function(r){if(r){for(var k in r)reglages[k]=r[k];sauverReglages()}return reglages},
 oublier:function(){M=S.memoireVide();sauver()},remarques:function(){return M.remarques},retirerRemarque:function(id){M.remarques=M.remarques.filter(function(r){return r.id!==id});sauver()},
 converser:function(){dejaPropose=true;converser()},ouvrir:function(el,x,y){var t=S.typer(el);if(t)ouvrirMenu(t,x||0,y||0)},faire:function(a,el){var t=S.typer(el);if(t)faire(a,t)},envie:function(){return cible},diagnostic:function(){var n=performance.now();return{trace:trace.filter(function(p){return n-p.t<3000}).length,clics:clics,saisie:saisie,deja:dejaPropose,detache:detache,menu:menuOuvert,fine:FINE,hesite:S.hesite(trace,{clics:clics,saisie:saisie})}}};
})();
