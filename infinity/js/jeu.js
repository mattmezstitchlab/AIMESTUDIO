/* AIME INFINITY · l'écran de jeu : gestes, interface, enchaînement. La logique (regles, niveaux, partie)
   décide ; le rendu et le son montrent. Les animations ne bloquent jamais une commande. */
(function(){"use strict";
var NV=window.AIMEInfinityNiveaux,P=window.AIMEInfinityPartie,S=window.AIMEInfinitySon,$=function(s){return document.getElementById(s)};
var CLE='aime-infinity',CLE_DEFI='aime-infinity-defi';
function lire(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function nb(x){return String(x).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function taille(n){return n+' × '+n}
var MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function aujourdhui(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function joli(iso){var p=iso.split('-');return(+p[2])+' '+MOIS[+p[1]-1]}

var C=new P.Campagne(lire(CLE)||{}),mode='partie',defi=null,G=C.grille,jeton=0,finAnim=0,minuteur=0,curseur=null;
var cv=$('c'),V=AIMEInfinityRendu.creer(cv);
function zone(){var W=innerWidth,H=innerHeight,st=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat'))||0;
 var haut=$('niv').getBoundingClientRect().bottom+14,bas=H-document.querySelector('.bas').getBoundingClientRect().top+14,s=Math.floor(Math.min(W-32,H-haut-bas,760));
 s=Math.max(120,s);return{x:Math.round((W-s)/2),y:Math.round(haut+(H-haut-bas-s)/2),s:s}}
function placer(){var z=zone();V.taille(z);var a=$('astuce');a.style.top=(z.y+z.s+10)+'px';$('msg').style.top=(z.y+z.s*.5-90)+'px';$('menu').style.top=($('niv').getBoundingClientRect().bottom+8)+'px'}

/* ---------- interface ---------- */
function ui(){var n=G.n;$('nivT').textContent=mode==='defi'?'Défi':taille(n);$('nivS').textContent=mode==='defi'?joli(defi.date)+' · '+taille(n):nb(n*n)+' cases';
 var b=$('budget'),tot=G.g.budget,r=G.reste(),h='';for(var i=0;i<tot;i++)h+='<i class="'+(i<r?'':'vide')+(tot>12?' peu':'')+'"></i>';b.innerHTML=h;b.setAttribute('aria-label',r+' action'+(r>1?'s':'')+' restante'+(r>1?'s':'')+' sur '+tot);
 if(mode==='defi')$('score').textContent=nb(G.eliminees)+' / '+nb(n*n)+' cases · plus grande cascade '+nb(G.plusGrande);
 else{var rec=C.record.L?' · record '+taille(1<<C.record.L)+(C.record.actions?' en '+C.record.actions:''):'';$('score').textContent=(C.actions+G.actions)+' action'+(C.actions+G.actions>1?'s':'')+(C.parfaits?' · ✦ '+C.parfaits:'')+rec}
 $('partieS').textContent=taille(1<<C.L);$('astuce').hidden=!(mode==='partie'&&C.L===1&&C.actions===0&&G.actions===0)}
function dire(t){$('sr').textContent=t}
var mT=0;function message(html,ms){var m=$('msg');m.innerHTML=html;m.classList.add('on');clearTimeout(mT);if(ms)mT=setTimeout(function(){m.classList.remove('on')},ms)}
function taire(){clearTimeout(mT);$('msg').classList.remove('on')}
function iconeSon(){var m=S.muet();$('son').setAttribute('aria-pressed',String(!m));$('son').setAttribute('aria-label',m?'Activer le son':'Couper le son');
 $('sonI').innerHTML=m?'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>':'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'}

/* ---------- une action ---------- */
function jouer(i){S.reveil();if(V.enTransition()){V.passer();return}if(i==null||i<0)return;
 var r=G.toucher(i);if(!r){if(G.statut()==='en-cours')S.toucher();return}
 taire();var a=V.cascade(r);S.cascade(a.vagues,G.n>1?Math.log2(G.n):1);ui();
 dire(r.ordre.length+' case'+(r.ordre.length>1?'s':'')+'. '+(G.restant?'Il en reste '+G.restant+', '+G.reste()+' action'+(G.reste()>1?'s':'')+'.':'Grille vidée.'));
 /* la suite attend la fin de la dernière cascade visible, sans jamais bloquer les gestes */
 finAnim=Math.max(finAnim,performance.now()+a.ms);var j=++jeton;clearTimeout(minuteur);
 if(r.statut!=='en-cours')minuteur=setTimeout(function(){if(j===jeton)conclure(r.statut)},Math.max(0,finAnim-performance.now())+(r.statut==='gagne'?120:380))}

function conclure(st){if(mode==='defi')return finDefi();
 if(st==='perdu'){S.echec();message('<div class="carte"><h2>Il reste '+nb(G.restant)+' case'+(G.restant>1?'s':'')+'</h2><p>Cette grille peut se vider en '+G.g.optimum+' action'+(G.g.optimum>1?'s':'')+'.</p><button class="go" type="button" data-a="refaire">Rejouer la grille</button></div>');return}
 var b=C.valider();ecrire(CLE,C.etat());S.accord(b.L);
 if(b.fin){message('<div class="carte"><h2>'+taille(b.n)+' terminé</h2><p>Vous avez atteint la limite de ce prototype, en '+C.actions+' actions'+(C.parfaits?' et '+C.parfaits+' ✦':'')+'.</p><button class="go" type="button" data-a="neuf">Repartir de 2 × 2</button></div>');ui();return}
 message('<h2>'+(b.parfait?'Parfait ✦':b.actions+' actions')+'</h2>'+(b.parfait?'':'<p>Optimum : '+b.optimum+'</p>'),1500);
 V.transition(function(){G=C.grille;V.grille(G);ui()},function(){ui();dire('Nouvelle grille : '+taille(G.n)+', '+G.g.budget+' actions.')})}
function refaire(){S.reveil();taire();jeton++;clearTimeout(minuteur);finAnim=0;if(mode==='defi'){G=new P.Grille(defi.g);defi.G=G}else G=C.reprendre();V.grille(G,{fondu:true});ui();dire('Grille recommencée.')}
function neuf(){var rec=C.record;C=new P.Campagne({record:rec});G=C.grille;ecrire(CLE,C.etat());mode='partie';taire();jeton++;V.grille(G,{fondu:true});ui()}

/* ---------- défi du jour : même grille pour tous, cinq actions ---------- */
function ouvrirDefi(){var d=aujourdhui();defi={date:d,g:NV.defi(d)};defi.G=G=new P.Grille(defi.g);mode='defi';taire();jeton++;V.grille(G,{fondu:true});ui();dire('Défi du jour : '+taille(G.n)+', cinq actions, le plus de cases possible.')}
function finDefi(){var s=P.scoreDefi(G),meil=lire(CLE_DEFI)||{};var m=meil[defi.date];if(!m||s.score>m.score){meil={};meil[defi.date]=s;ecrire(CLE_DEFI,meil)}var best=meil[defi.date];
 if(G.restant===0)S.accord(4);else S.echec();
 message('<div class="carte"><span class="k">Défi du '+joli(defi.date)+'</span><h2>'+(G.restant===0?'Grille vidée':nb(s.eliminees)+' cases')+'</h2><div class="chiffres"><div><b>'+nb(s.eliminees)+'</b><span>sur '+nb(s.total)+'</span></div><div><b>'+nb(s.plusGrande)+'</b><span>plus grande cascade</span></div><div><b>'+s.actions+'</b><span>actions</span></div></div>'+
  (best&&best!==s?'<p>Votre meilleur aujourd\'hui : '+nb(best.eliminees)+' cases</p>':'')+'<button class="go" type="button" data-a="partager">Partager</button><button class="go sec" type="button" data-a="refaire">Rejouer le défi</button><button class="go sec" type="button" data-a="partie">Revenir à la progression</button></div>')}
function partager(btn){var s=P.scoreDefi(G),url=location.origin+location.pathname,t='AIME INFINITY · défi du '+joli(defi.date)+'\n'+nb(s.eliminees)+' / '+nb(s.total)+' cases en '+s.actions+' actions · plus grande cascade '+nb(s.plusGrande);
 var ok=function(x){btn.textContent=x};if(navigator.share){navigator.share({title:'AIME INFINITY',text:t,url:url}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(t+'\n'+url).then(function(){ok('Copié')},function(){ok('Copie impossible')})}else ok('Partage indisponible')}
function retourPartie(){mode='partie';defi=null;G=C.grille;if(G.statut()!=='en-cours')G=C.reprendre();taire();jeton++;V.grille(G,{fondu:true});ui()}

/* ---------- gestes : viser en glissant, tirer en relâchant ; souris : survoler, cliquer ; clavier : flèches, Entrée ---------- */
var vise=null;
cv.addEventListener('pointerdown',function(e){if(!e.isPrimary)return;fermerMenu();S.reveil();if(V.enTransition()){V.passer();return}
 var i=V.caseA(e.clientX,e.clientY);if(i<0)return;vise={id:e.pointerId,i:i,touch:e.pointerType!=='mouse'};try{cv.setPointerCapture(e.pointerId)}catch(_){}V.viser(i,vise.touch?{x:e.clientX,y:e.clientY}:null)});
cv.addEventListener('pointermove',function(e){var i=V.caseA(e.clientX,e.clientY);if(vise&&e.pointerId===vise.id){vise.i=i;V.viser(i>=0?i:null,vise.touch?{x:e.clientX,y:e.clientY}:null)}else if(e.pointerType==='mouse'&&!vise)V.viser(i>=0?i:null)});
cv.addEventListener('pointerup',function(e){if(!vise||e.pointerId!==vise.id)return;var i=vise.i;vise=null;V.viser(e.pointerType==='mouse'&&i>=0?i:null);if(i>=0)jouer(i)});
cv.addEventListener('pointercancel',function(){vise=null;V.viser(null)});
cv.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&!vise)V.viser(null)});
document.addEventListener('keydown',function(e){var surBouton=e.target.closest&&e.target.closest('button,a,input');if(surBouton&&/^(Enter| |Arrow)/.test(e.key))return;var n=G.n,d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(d){e.preventDefault();if(curseur==null)curseur=(n>>1)*n+(n>>1);var x=curseur%n+d[0],y=((curseur/n)|0)+d[1];x=Math.max(0,Math.min(n-1,x));y=Math.max(0,Math.min(n-1,y));curseur=y*n+x;V.curseur(curseur);return}
 if(e.key==='Enter'||e.key===' '){e.preventDefault();if(curseur==null){curseur=(n>>1)*n+(n>>1);V.curseur(curseur);return}jouer(curseur);return}
 if(e.key==='r'||e.key==='R')refaire();if(e.key==='m'||e.key==='M'){S.muet(!S.muet());iconeSon()}if(e.key==='Escape')fermerMenu()});

/* ---------- commandes ---------- */
$('refaire').addEventListener('click',refaire);
$('son').addEventListener('click',function(){S.muet(!S.muet());iconeSon()});
function fermerMenu(){$('menu').hidden=true;$('niv').setAttribute('aria-expanded','false')}
$('niv').addEventListener('click',function(e){e.stopPropagation();var m=$('menu');m.hidden=!m.hidden;this.setAttribute('aria-expanded',String(!m.hidden))});
$('menu').addEventListener('click',function(e){var b=e.target.closest('[data-m]');if(!b)return;fermerMenu();var a=b.getAttribute('data-m');if(a==='defi')ouvrirDefi();if(a==='partie')retourPartie();if(a==='neuf')neuf()});
document.addEventListener('click',function(e){if(!e.target.closest('#menu,#niv'))fermerMenu();var b=e.target.closest('[data-a]');if(!b)return;var a=b.getAttribute('data-a');
 if(a==='refaire')refaire();if(a==='neuf')neuf();if(a==='partager')partager(b);if(a==='partie')retourPartie()});
addEventListener('resize',function(){clearTimeout(placer.t);placer.t=setTimeout(placer,80)});
document.fonts&&document.fonts.ready.then(placer);
placer();V.grille(G);ui();iconeSon();
window.__infinity={campagne:function(){return C},grille:function(){return G},jouer:jouer,mode:function(){return mode}};
})();
