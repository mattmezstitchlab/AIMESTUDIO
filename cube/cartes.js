/* AIME · Le Monde AIME, phase C, première tranche : Carte postale → Timbre → Fente → Voyage vertical → Facette du cube.
   (Rangé dans /cube/ : /monde/ est une adresse de la grande page dans vercel.json.)
   La grande page reste celle d'aujourd'hui ; ce script ajoute, sous le héros, la fente et six cartes postales.
   Une carte se retourne (verso manuscrit, champs structurés et éditables), reçoit le timbre du compte (glisser-déposer
   ou bouton), entre dans la fente, descend le long de la règle millimétrée (lecture automatique, pause, reprise, passer,
   ou au défilement), puis devient une face du cube du chapitre « Votre cube ».
   Le modèle est AIMECube (cube/modele.js), le même que liront le Bureau, le dock, le Canevas et le Réseau.
   Mode personnel : session Better Auth + timbre confirmé (/api/identite). Sinon, mode découverte : un timbre fictif
   (Camille), dit comme tel, rien n'est rattaché à un compte.
   Enregistrement : cube/stock.js (local à ce navigateur, par compte ; effacé à la fermeture en découverte) en attendant le lot
   de persistance serveur. Rien n'est envoyé au serveur ici. */
(function(){'use strict';
var C=window.AIMECube,hero=document.getElementById('hero0'),story=document.getElementById('story2');if(!C||!window.AIMECubeStock||!hero||!story)return;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var DEMO=window.AIMECubeStock&&AIMECubeStock.DEMO;
var moi=DEMO,cube=C.vide(DEMO.id),ouverte=null,voyage=null;
var ICO={identite:'<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/>',medias:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M3 16l5-4 4 3 3-2 6 4"/>',
 temps:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',relations:'<circle cx="7" cy="9" r="2.6"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 19c.8-2.8 2.4-4.2 4.5-4.2S10.7 16.2 11.5 19M12.5 19c.8-2.8 2.4-4.2 4.5-4.2s3.7 1.4 4.5 4.2"/>',
 documents:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 15h6"/>',activites:'<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z"/>'};
var ETAT={vide:'À écrire',ecrite:'Écrite',timbree:'Timbrée',posee:'Posée ✓'};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function svg(id){return'<svg viewBox="0 0 24 24" aria-hidden="true">'+ICO[id]+'</svg>'}
function teinte(e,d){e.style.setProperty('--a',d.teinte[0]);e.style.setProperty('--b',d.teinte[1]);e.style.setProperty('--c',d.teinte[2])}
function timbre(o){var T=window.AIMETimbre;if(!T)return el('span');var t=T.creer({id:moi.id,nom:moi.name||'Vous',image:moi.image,mini:!!(o&&o.mini),legende:false});return t}
function aujourdhui(){return new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}).toUpperCase()}
function cachet(){var c=el('span','cp-cachet');c.setAttribute('aria-hidden','true');c.innerHTML='Le Monde<br>AIME<br>'+aujourdhui().replace(/\./g,'');return c}

/* ---------- l'enregistrement : local, par compte ---------- */
/* le stockage est celui de cube/stock.js : le même pour le Monde AIME, le Bureau et le Canevas */
var S=window.AIMECubeStock;
function charger(){cube=S.charger(moi)}
function garder(){S.garder(moi,cube)}

/* ---------- la section : la fente, puis la planche de cartes ---------- */
var sec=el('section','cp');sec.id='cartes';sec.setAttribute('aria-labelledby','cp-t');
sec.innerHTML='<div class="cp-in"><div class="cp-fente" id="cp-fente"><span class="cp-fente-l" aria-hidden="true"></span><p><b>La fente</b> · vos cartes y entrent, puis voyagent jusqu\'à votre cube</p></div>'+
 '<p class="cp-k">Chapitre 0 · Votre cube commence ici</p><h2 class="cp-t" id="cp-t">Six cartes postales, <em>six facettes</em>.</h2>'+
 '<p class="cp-l">Choisissez une carte, retournez-la, écrivez au verso, apposez votre timbre et glissez-la dans la fente. Elle traverse la page et devient une face de votre cube. Aucune carte n\'est obligatoire, une face peut rester vide.</p>'+
 '<p class="cp-mode" id="cp-mode"></p><ol class="cp-grille" id="cp-grille" aria-label="Les cartes postales"></ol><p class="cp-prog" id="cp-prog" aria-live="polite"></p></div>';
hero.parentNode.insertBefore(sec,hero.nextSibling);
var grille=sec.querySelector('#cp-grille'),fente=sec.querySelector('#cp-fente');
/* le sommaire du héros gagne son chapitre 0 */
var toc=document.querySelector('.toc0 ol');if(toc&&!toc.querySelector('a[href="#cartes"]')){var li=el('li');li.innerHTML='<a href="#cartes"><span>0</span><b>Vos cartes</b></a>';toc.insertBefore(li,toc.firstChild)}

function planche(){grille.textContent='';C.FACETTES.forEach(function(d){var f=cube.facettes[d.id],li=el('li'),b=el('button','cp-carte');b.type='button';b.dataset.f=d.id;b.dataset.etat=f.etat;teinte(b,d);
  var premier=d.champs.map(function(c){return f.champs[c.k]}).filter(Boolean)[0];
  b.innerHTML=svg(d.id)+'<span class="cp-etat"></span><b></b><small></small>';b.querySelector('.cp-etat').textContent=ETAT[f.etat];b.querySelector('b').textContent=d.nom;b.querySelector('small').textContent=premier||d.dit;
  if(f.etat==='timbree'||f.etat==='posee'){var m=el('span','cp-mini');m.appendChild(timbre({mini:true}));b.appendChild(m)}
  b.setAttribute('aria-label','Carte '+d.nom+', '+ETAT[f.etat].replace(' ✓','')+(C.completude(cube,d.id)>0&&C.completude(cube,d.id)<1?', partielle':'')+'. Ouvrir la carte');
  b.addEventListener('click',function(){ouvrir(d.id,b)});li.appendChild(b);grille.appendChild(li)});
 var p=C.progression(cube);sec.querySelector('#cp-prog').innerHTML='<b>'+p.posees+' / '+p.total+'</b> facette'+(p.posees>1?'s':'')+' posée'+(p.posees>1?'s':'')+' · le reste peut attendre'}
function mode(){var m=sec.querySelector('#cp-mode');m.textContent='';
 if(moi.demo){m.appendChild(el('span','cp-demo','Démonstration'));m.appendChild(document.createTextNode(' Timbre fictif de Camille ; rien n\'est rattaché à un compte. '));var a=el('a',null,'Créer mon timbre');a.href='/point-zero/?intention=identite';m.appendChild(a)}
 else{m.appendChild(document.createTextNode('Le timbre de '+moi.name+' · vos cartes restent privées, enregistrées sur cet appareil'))}}

/* ---------- la table : la carte en grand, recto puis verso ---------- */
var table=el('div','cp-table');table.hidden=true;table.setAttribute('role','dialog');table.setAttribute('aria-modal','true');table.setAttribute('aria-labelledby','cp-tt');
table.innerHTML='<div class="cp-scene"><div class="cp-grande" id="cp-grande"><div class="cp-face cp-recto" id="cp-recto"></div><div class="cp-face cp-verso" id="cp-verso"></div></div></div>'+
 '<div class="cp-outils"><div class="cp-mien" id="cp-mien"></div><button type="button" id="cp-tourner">Retourner la carte</button><button type="button" id="cp-apposer">Apposer mon timbre</button>'+
 '<button type="button" class="p" id="cp-inserer" disabled>Glisser dans la fente</button><button type="button" id="cp-fermer">Fermer</button><p class="cp-dit" id="cp-dit" role="status"></p></div>';
document.body.appendChild(table);
var G=table.querySelector('#cp-grande'),R=table.querySelector('#cp-recto'),VS=table.querySelector('#cp-verso'),dit=table.querySelector('#cp-dit'),bInserer=table.querySelector('#cp-inserer'),bApposer=table.querySelector('#cp-apposer'),mien=table.querySelector('#cp-mien'),retourFocus=null;
function dire(t){dit.textContent=t}
function ouvrir(id,depuis){var d=C.facette(id),f=cube.facettes[id];ouverte=id;retourFocus=depuis||null;teinte(R,d);
 R.innerHTML=svg(id)+'<i>AIME · carte postale</i><b id="cp-tt"></b><small></small>';R.querySelector('b').textContent=d.nom;R.querySelector('small').textContent=d.dit;
 VS.textContent='';var form=el('form','cp-mots');form.setAttribute('aria-label','Verso de la carte '+d.nom);form.addEventListener('submit',function(e){e.preventDefault()});
 form.appendChild(el('p','cp-cher','Cher Monde AIME,'));
 d.champs.forEach(function(c){var l=el('label','cp-champ'),s=el('span',null,c.l),i;l.appendChild(s);
  if(c.choix){i=el('select');var o0=el('option',null,'Choisir…');o0.value='';i.appendChild(o0);c.choix.forEach(function(v){var o=el('option',null,v);o.value=v;i.appendChild(o)})}
  else{i=el('input');i.type='text';i.maxLength=c.max||80;i.placeholder='…';i.autocomplete='off'}
  i.name=c.k;i.value=f.champs[c.k]||'';i.addEventListener(c.choix?'change':'input',noter);l.appendChild(i);form.appendChild(l)});
 var droite=el('div','cp-droite'),cs=el('div','cp-case');cs.id='cp-case';cs.setAttribute('aria-label','Emplacement du timbre');cs.textContent='Placez votre timbre ici';
 droite.appendChild(cs);droite.appendChild(cachet());var adr=el('div','cp-adr');[ 'Le Monde AIME','Facette '+d.nom,'Cube de '+(moi.name||'vous')].forEach(function(t){adr.appendChild(el('span',null,t))});droite.appendChild(adr);
 VS.appendChild(form);VS.appendChild(el('span','cp-sep'));VS.appendChild(droite);
 mien.textContent='';var t=timbre();t.setAttribute('aria-label','Mon timbre : le glisser sur la case, ou toucher pour l\'apposer');mien.appendChild(t);mien.appendChild(el('span',null,'Glissez-le sur la case'));armerGlisse(t);
 G.classList.remove('retournee');etatTable();table.hidden=false;document.documentElement.style.overflow='hidden';dire('Recto : '+d.nom+'. Retournez la carte pour écrire au verso.');
 table.querySelector('#cp-tourner').focus();
 if(f.etat!=='vide')setTimeout(tourner,RM?0:260)}
function etatTable(){var f=cube.facettes[ouverte],cs=VS.querySelector('#cp-case'),pose=f.etat==='timbree'||f.etat==='posee';
 cs.classList.toggle('pose',pose);var deja=cs.querySelector('.timbre');if(pose&&!deja){cs.textContent='';cs.appendChild(timbre({mini:true}))}else if(!pose&&deja){cs.textContent='Placez votre timbre ici'}
 VS.querySelector('.cp-cachet').classList.toggle('on',pose);mien.querySelector('.timbre')&&mien.querySelector('.timbre').classList.toggle('porte',pose);
 bApposer.disabled=pose;bInserer.disabled=f.etat!=='timbree';bInserer.textContent=f.etat==='posee'?'Déjà dans votre cube':'Glisser dans la fente'}
function tourner(){var v=!G.classList.contains('retournee');G.classList.toggle('retournee',v);table.querySelector('#cp-tourner').textContent=v?'Voir le recto':'Retourner la carte';
 if(v){dire('Verso : écrivez une ligne ou deux, rien n\'est obligatoire.');var i=VS.querySelector('input,select');if(i)setTimeout(function(){i.focus({preventScroll:true})},RM?0:500)}}
function noter(){var form=VS.querySelector('form'),o={};[].forEach.call(form.elements,function(i){if(i.name)o[i.name]=i.value});var f=cube.facettes[ouverte],avant=f.etat;C.ecrire(cube,ouverte,o);garder();
 if(f.etat!==avant)etatTable();planche()}
function apposer(){try{if(!G.classList.contains('retournee'))tourner();C.timbrer(cube,ouverte);garder();etatTable();planche();dire('Timbre apposé. Glissez maintenant la carte dans la fente.');bInserer.focus()}
 catch(e){dire(e.message);var i=VS.querySelector('input,select');if(i)i.focus()}}
function fermer(){table.hidden=true;document.documentElement.style.overflow='';var r=retourFocus&&grille.querySelector('[data-f="'+ouverte+'"]');ouverte=null;if(r)r.focus({preventScroll:true})}
table.querySelector('#cp-tourner').addEventListener('click',tourner);bApposer.addEventListener('click',apposer);table.querySelector('#cp-fermer').addEventListener('click',fermer);
bInserer.addEventListener('click',function(){var id=ouverte;fermer();inserer(id)});
table.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer();return}
 if(e.key==='Tab'){var f=[].filter.call(table.querySelectorAll('button,input,select'),function(x){return!x.disabled&&x.offsetParent!==null});if(!f.length)return;var a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});

/* glisser le timbre sur la case ; un simple toucher l'appose aussi (la commande accessible reste le bouton) */
function armerGlisse(t){var g=null,bouge=false;
 t.addEventListener('pointerdown',function(e){if(t.classList.contains('porte'))return;bouge=false;g=el('div','cp-glisse');g.appendChild(timbre());document.body.appendChild(g);place(e);try{t.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
 t.addEventListener('pointermove',function(e){if(!g)return;bouge=true;place(e);var cs=VS.querySelector('#cp-case');if(cs)cs.classList.toggle('vise',dessus(e,cs))});
 function fin(e){if(!g)return;var cs=VS.querySelector('#cp-case'),ok=cs&&dessus(e,cs);g.remove();g=null;if(cs)cs.classList.remove('vise');if(ok||!bouge)apposer();else dire('Déposez le timbre sur la case en haut à droite du verso.')}
 t.addEventListener('pointerup',fin);t.addEventListener('pointercancel',function(){if(g){g.remove();g=null}});
 t.addEventListener('click',function(e){if(e.detail===0)apposer()});/* clavier : Entrée ou Espace sur le timbre */
 function place(e){g.style.transform='translate('+(e.clientX-32)+'px,'+(e.clientY-40)+'px)'}}
function dessus(e,n){var r=n.getBoundingClientRect(),m=14;return e.clientX>r.left-m&&e.clientX<r.right+m&&e.clientY>r.top-m&&e.clientY<r.bottom+m}

/* ---------- la fente, puis le voyage vertical ---------- */
function voyageur(id){var d=C.facette(id),v=el('div','cp-voy');teinte(v,d);v.appendChild(timbre({mini:true}));v.appendChild(el('b',null,d.nom));v.setAttribute('aria-hidden','true');document.body.appendChild(v);return v}
function versY(y){scrollTo({top:Math.max(0,y),behavior:'instant'})}
function inserer(id){var v=voyageur(id);fente.scrollIntoView({block:'center',behavior:'instant'});
 var r=fente.querySelector('.cp-fente-l').getBoundingClientRect(),x=r.left+r.width/2-39,y=r.top-26;
 if(RM){v.remove();fente.classList.add('recoit');partir(id);return}
 v.style.transform='translate('+(innerWidth/2-39)+'px,'+(innerHeight*.72)+'px) rotate(-8deg) scale(1.6)';
 requestAnimationFrame(function(){requestAnimationFrame(function(){v.classList.add('fente');v.style.transform='translate('+x+'px,'+y+'px) rotate(0) scale(1)';
  setTimeout(function(){v.classList.add('dedans');fente.classList.remove('recoit');void fente.offsetWidth;fente.classList.add('recoit')},450);
  setTimeout(function(){v.remove();partir(id)},1150)})})}
/* départ : sous la fente ; arrivée : le chapitre « Votre cube », quand le cube a fini de grandir */
function bornes(){var a=sec.offsetTop+fente.offsetTop-Math.round(innerHeight*.35),b=story.offsetTop+Math.round((story.offsetHeight-innerHeight)*.12);return[a,Math.max(a+1,b)]}
var barre=el('div','cp-barre');barre.hidden=true;barre.setAttribute('role','region');barre.setAttribute('aria-label','Le voyage de votre carte');
barre.innerHTML='<p aria-live="polite"><b>Votre carte voyage</b> · <span id="cp-ou">La fente</span></p><progress id="cp-pr" max="100" value="0"></progress><button type="button" id="cp-pause">Pause</button><button type="button" id="cp-passer">Passer</button>';
document.body.appendChild(barre);
function lieu(){var L=window.svAnchors?window.svAnchors():[],y=scrollY+innerHeight/2,n='Le Monde AIME';L.forEach(function(a){if(a.top<=y)n=a.label});return n}
function partir(id){var b=bornes();voyage={id:id,a:b[0],b:b[1],auto:!RM,p:0,t:0,vu:-1,dur:Math.min(16000,Math.max(6000,(b[1]-b[0])/innerHeight*1150)),der:0,v:voyageur(id)};
 voyage.v.style.transition='none';barre.hidden=false;barre.querySelector('#cp-pause').textContent=voyage.auto?'Pause':'Lecture';
 if(RM){versY(voyage.b);arriver();return}versY(voyage.a);requestAnimationFrame(pas)}
function ease(x){return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}
/* reprendre là où la carte se trouve : le temps qui donne cette position (l'inverse de l'accélération) */
function temps(p){return p<.5?Math.sqrt(p/2):1-Math.sqrt(2*(1-p))/2}
function pas(now){var V=voyage;if(!V)return;var dt=V.der?Math.min(64,now-V.der):16;V.der=now;
 if(V.auto){V.t=Math.min(V.dur,V.t+dt);V.p=V.t/V.dur;versY(V.a+(V.b-V.a)*ease(V.p))}else{V.p=Math.max(0,Math.min(1,(scrollY-V.a)/(V.b-V.a)))}
 var H=innerHeight,top=Math.min(H-120,Math.max(84,84+(H-210)*V.p)),gauche=innerWidth<761?30:44;V.v.style.transform='translate('+gauche+'px,'+top+'px) rotate('+(Math.sin(V.p*12)*4).toFixed(2)+'deg)';
 var pc=Math.round(V.p*100);barre.querySelector('#cp-pr').value=pc;var tr=Math.floor(V.p*10);if(tr!==V.vu){V.vu=tr;barre.querySelector('#cp-ou').textContent=lieu()+' · '+pc+' %';if(window.aimeRuler&&aimeRuler.wave)aimeRuler.wave(top-64)}
 if(V.p>=1){arriver();return}requestAnimationFrame(pas)}
function main(){if(voyage&&voyage.auto){voyage.auto=false;barre.querySelector('#cp-pause').textContent='Lecture';barre.querySelector('#cp-ou').textContent='Vous guidez : faites défiler'}}
addEventListener('wheel',main,{passive:true});addEventListener('touchstart',function(e){if(!barre.contains(e.target))main()},{passive:true});
addEventListener('keydown',function(e){if(voyage&&/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)&&!barre.contains(e.target))main()});
barre.querySelector('#cp-pause').addEventListener('click',function(){var V=voyage;if(!V)return;V.auto=!V.auto;if(V.auto){V.p=Math.max(0,Math.min(1,(scrollY-V.a)/(V.b-V.a)));V.t=V.dur*temps(V.p);V.der=0}this.textContent=V.auto?'Pause':'Lecture'});
barre.querySelector('#cp-passer').addEventListener('click',function(){var V=voyage;if(!V)return;V.p=1;versY(V.b);arriver()});

/* ---------- l'arrivée : la carte devient une face du cube ---------- */
function centreCube(){var W=innerWidth,H=innerHeight,m=W<760;return[m?W/2:W*.655,m?H*.39:H*.5]}
function arriver(){var V=voyage;if(!V)return;voyage=null;barre.hidden=true;
 try{C.poser(cube,V.id);garder()}catch(e){}
 var c=centreCube();if(RM){V.v.remove()}else{V.v.classList.add('arrive');V.v.style.transition='';requestAnimationFrame(function(){V.v.style.transform='translate('+(c[0]-39)+'px,'+(c[1]-26)+'px) scale(.4)';V.v.style.opacity='0'});setTimeout(function(){V.v.remove()},1300)}
 faces(V.id);planche();bulle(V.id)}
function faces(nouvelle){C.FACETTES.forEach(function(d){var f=cube.facettes[d.id],face=document.querySelector('#cube2 .f2[data-i="'+d.face+'"]'),o=face&&face.querySelector('.o');if(!o)return;
 var p=o.querySelector('.cp-pose');if(f.etat!=='posee'){if(p)p.remove();face.classList.remove('cp-on');return}
 if(!p){p=el('span','cp-pose');p.setAttribute('aria-hidden','true');o.appendChild(p)}teinte(p,d);p.textContent='';p.appendChild(el('small',null,d.nom));
 var txt=d.champs.map(function(c){return f.champs[c.k]}).filter(Boolean).join(' · ');p.appendChild(el('b',null,txt||d.nom));p.appendChild(timbre({mini:true}));p.appendChild(cachet());face.classList.add('cp-on');
 if(nouvelle===d.id&&!RM){face.classList.remove('cp-arrivee');void face.offsetWidth;face.classList.add('cp-arrivee')}});
 var n=C.progression(cube).posees,h=document.getElementById('h0t');if(story)story.setAttribute('aria-label','Votre cube : '+n+' facette'+(n>1?'s':'')+' sur 6 posée'+(n>1?'s':''))}
function bulle(id){var vieille=document.querySelector('.rv-bulle.cp-b');if(vieille)vieille.remove();var d=C.facette(id),p=C.progression(cube),b=el('div','rv-bulle cp-b');b.setAttribute('role','status');b.appendChild(el('i'));
 var t=el('p',null,'Votre carte « '+d.nom+' » est devenue une face de votre cube · '+p.posees+' / '+p.total+'. '+(p.posees<p.total?'Les autres peuvent attendre.':'Votre cube est entier.'));
 if(moi.demo){t.appendChild(document.createTextNode(' '));t.appendChild(el('span','rv-demo','Démonstration'))}b.appendChild(t);
 var a=el('a',null,moi.demo?'Créer mon timbre':'Aller au Bureau');a.href=moi.demo?'/point-zero/?intention=identite':'/bureau/';
 var u=el('button',null,'Une autre carte');u.type='button';u.onclick=function(){b.remove();sec.scrollIntoView({behavior:RM?'auto':'smooth'});var c=grille.querySelector('.cp-carte[data-etat=vide],.cp-carte[data-etat=ecrite]');if(c)setTimeout(function(){c.focus({preventScroll:true})},RM?0:600)};
 var x=el('button',null,'Fermer');x.type='button';x.onclick=function(){b.remove()};b.appendChild(u);b.appendChild(a);b.appendChild(x);document.body.appendChild(b);u.focus({preventScroll:true})}

/* ---------- qui est là : le compte et son timbre, sinon la démonstration ---------- */
function afficher(){charger();mode();planche();faces()}
afficher();
if(!/[?&]demo=timbre\b/.test(location.search))S.qui().then(function(u){if(u){moi=u;afficher()}}).catch(function(){});
/* les faces du cube sont construites par la page : on y repose les facettes une fois la page chargée */
if(document.readyState!=='complete')addEventListener('load',function(){faces()});
/* ?carte=<facette> : le Bureau ou le Canevas renvoient ici pour écrire ou corriger une carte */
(function(){var id=new URLSearchParams(location.search).get('carte');if(id&&C.facette(id)){var go=function(){sec.scrollIntoView({behavior:'instant'});ouvrir(id)};if(document.readyState==='complete')setTimeout(go,300);else addEventListener('load',function(){setTimeout(go,300)})}})();
window.AIMECartes={ouvrir:function(id){ouvrir(id)},cube:function(){return cube},moi:function(){return moi}};
})();
