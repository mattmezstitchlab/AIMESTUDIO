/* AIME · le Point Zéro. Le bureau ne commence pas par une app à choisir, mais par une matière à déposer.
   Au centre, le point zéro reçoit : une intention, une note, une demande, une description, des fichiers.
   Autour, six formes la reprennent : Point (ce qui est entré), Ligne (les dates), Relation (les personnes et les liens),
   Grille (le classement), Composition (un premier brouillon), Projet (des dossiers exploitables).

   AIMEPointZero.monter(conteneur, {salut(nom)})
   Où vit la matière : les textes sur le compte quand on est connecté (/api/matiere), sinon dans ce navigateur ;
   les fichiers TOUJOURS sur cet appareil (IndexedDB), jamais envoyés. Tout le texte affiché passe par textContent ou esc(). */
(function(root){'use strict';if(root.AIMEPointZero)return;
var A=root.AIMEAnalyse,F=root.AIMEFormes,NS='http://www.w3.org/2000/svg';
var RM=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var ETAPES=[
 {id:'point',nom:'Point',verbe:'recevoir',phrase:'Tout ce qui est entré, tel quel : la matière brute.',vide:'Rien n\'est encore entré. Cliquez sur le point zéro pour déposer une première matière.'},
 {id:'ligne',nom:'Ligne',verbe:'séquencer',phrase:'Les dates citées deviennent des jalons, dans l\'ordre du temps.',vide:'Aucune date dans votre matière pour l\'instant : écrivez « le 14 juin », « 05/11 » ou « 2027-06-14 », et elle prendra place sur la ligne.'},
 {id:'relation',nom:'Relation',verbe:'relier',phrase:'Les personnes, adresses et liens cités, et ce qui les relie.',vide:'Aucune personne, adresse ou lien cité pour l\'instant. Nommez quelqu\'un (« avec Léa », « Paul Durand ») ou collez une adresse.'},
 {id:'grille',nom:'Grille',verbe:'classer',phrase:'Chaque élément rangé par thème et par nature.',vide:'Rien à classer pour l\'instant.'},
 {id:'composition',nom:'Composition',verbe:'mettre en forme',phrase:'Un premier brouillon assemblé : l\'intention en tête, une partie par thème.',vide:'Déposez au moins une intention ou quelques notes : un brouillon se composera ici.'},
 {id:'projet',nom:'Projet',verbe:'concrétiser',phrase:'Des dossiers exploitables, réunis par thème, avec leurs dates et leurs personnes.',vide:'Un dossier naît quand une intention ou une demande touche un thème, ou quand deux éléments partagent un thème.'}];
/* positions autour du point (en % de la scène), dans le sens des aiguilles : on lit de gauche à droite puis on redescend */
var POS={point:[13,50],ligne:[29,15],relation:[71,15],grille:[87,50],composition:[71,85],projet:[29,85]};
var CLE_LOCAL='aime-point-zero',BASE_IDB='aime-point-zero';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function sv(t,a,p){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
function lire(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function ecrire(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function jour(d){try{return new Date(d+'T12:00:00Z').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}catch(e){return d}}
function ecart(d){var j=Math.round((new Date(d+'T12:00:00Z')-new Date(new Date().toISOString().slice(0,10)+'T12:00:00Z'))/864e5);return j===0?'aujourd\'hui':j===1?'demain':j===-1?'hier':j>0?'dans '+j+' jours':'il y a '+(-j)+' jours'}
function taille(o){return o<1024?o+' o':o<1048576?Math.round(o/1024)+' Ko':(o/1048576).toFixed(1)+' Mo'}
function post(url,corps){return fetch(url,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(corps||{})}).then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return{statut:r.status,j:j}})})}

/* ---------- les fichiers : sur cet appareil seulement ---------- */
var idb=null;
function base(){if(idb)return idb;idb=new Promise(function(ok,ko){if(!root.indexedDB)return ko(new Error('indisponible'));var r=indexedDB.open(BASE_IDB,1);
 r.onupgradeneeded=function(){r.result.createObjectStore('fichiers',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){ko(r.error)}});idb.catch(function(){idb=null});return idb}
function idbFaire(mode,f){return base().then(function(db){return new Promise(function(ok,ko){var t=db.transaction('fichiers',mode),s=t.objectStore('fichiers'),r=f(s);t.oncomplete=function(){ok(r&&r.result)};t.onerror=function(){ko(t.error)}})})}
function fichiersTous(){return idbFaire('readonly',function(s){return s.getAll()}).catch(function(){return[]})}
function fichierGarder(f){return idbFaire('readwrite',function(s){return s.put(f)})}
function fichierRetirer(id){return idbFaire('readwrite',function(s){return s.delete(id)})}
function lisible(f){return /^text\/|json|csv|xml|markdown/.test(f.type)||/\.(txt|md|csv|json|vcf|ics)$/i.test(f.name)}
function lireTexte(f){return lisible(f)&&f.size<=1048576?f.text().then(function(t){return t.slice(0,20000)}).catch(function(){return''}):Promise.resolve('')}

/* ---------- le composant ---------- */
function monter(conteneur,o){o=o||{};
 var S={connecte:false,nom:'',compteOk:false,raison:'',elements:[],local:[],fichiers:[],ouverte:null,occupe:false};
 var racine=el('section','pz');racine.setAttribute('aria-label','Point Zéro');conteneur.textContent='';conteneur.appendChild(racine);

 /* la scène : les traits, le point, les six formes */
 var scene=el('div','pz-scene');racine.appendChild(scene);
 var traits=sv('svg',{class:'pz-traits',viewBox:'0 0 1000 600',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'},scene);
 var defs=sv('defs',{},traits),lg=sv('linearGradient',{id:'pzIris',x1:0,y1:0,x2:1,y2:1},defs);[['0','#FB7185'],['.35','#F59E0B'],['.68','#7C5CFF'],['1','#22D3EE']].forEach(function(s){sv('stop',{offset:s[0],'stop-color':s[1]},lg)});
 sv('ellipse',{cx:500,cy:300,rx:370,ry:210,fill:'none',stroke:'#EDEDF0','stroke-opacity':.09,'stroke-dasharray':'2 7','vector-effect':'non-scaling-stroke'},traits);
 var rayons={};ETAPES.forEach(function(e,i){var p=POS[e.id],x=p[0]*10,y=p[1]*6;rayons[e.id]=sv('line',{x1:500,y1:300,x2:x,y2:y,stroke:'#EDEDF0','stroke-opacity':.16,'vector-effect':'non-scaling-stroke',class:'pz-rayon'},traits);
  var n=ETAPES[(i+1)%6].id,q=POS[n];sv('line',{x1:x,y1:y,x2:q[0]*10,y2:q[1]*6,stroke:'#EDEDF0','stroke-opacity':.06,'vector-effect':'non-scaling-stroke'},traits)});

 var centre=el('button','pz-centre');centre.type='button';centre.setAttribute('aria-haspopup','dialog');
 var marque=sv('svg',{class:'pz-point',viewBox:'150 150 100 100','aria-hidden':'true',focusable:'false'},centre);marquePoint(marque);
 var ct=el('span','pz-centre-t');ct.appendChild(el('b',null,'Point zéro'));ct.appendChild(el('small',null,'Déposer une matière'));centre.appendChild(ct);scene.appendChild(centre);

 var boutons={};ETAPES.forEach(function(e,i){var b=el('button','pz-etape');b.type='button';b.dataset.e=e.id;b.style.setProperty('--x',POS[e.id][0]+'%');b.style.setProperty('--y',POS[e.id][1]+'%');b.style.setProperty('--i',i);
  var g=sv('svg',{class:'pz-glyphe',viewBox:'0 0 400 400','aria-hidden':'true',focusable:'false'},b);glyphe(g,i);
  var t=el('span','pz-etape-t');t.appendChild(el('b',null,e.nom));t.appendChild(el('small',null,e.verbe));b.appendChild(t);
  var n=el('span','pz-n','0');n.setAttribute('aria-hidden','true');b.appendChild(n);b.onclick=function(){ouvrir(e.id)};scene.appendChild(b);boutons[e.id]={b:b,n:n}});

 var etat=el('div','pz-etat');etat.setAttribute('role','status');racine.appendChild(etat);

 /* le dépôt */
 var dlg=el('dialog','pz-depot');dlg.setAttribute('aria-labelledby','pzDepotT');
 dlg.innerHTML='<form method="dialog" class="pz-depot-f"><h2 id="pzDepotT">Déposer au point zéro</h2>'+
  '<p class="pz-leg">Une intention, une demande, des notes, une description de projet, des éléments en vrac : collez tout, le système trie.</p>'+
  '<label class="pz-sr" for="pzTexte">Votre matière</label><textarea id="pzTexte" rows="7" maxlength="20000" placeholder="Je veux… / Pouvez-vous… / Le 14 juin, avec Léa et Marc… / - une idée&#10;- une autre…"></textarea>'+
  '<div class="pz-zone" tabindex="-1"><span>Glissez des fichiers ici, ou </span><label class="pz-b pz-b-s">choisir des fichiers<input type="file" multiple hidden></label><small>Les fichiers restent sur cet appareil : ils ne sont jamais envoyés.</small><ul class="pz-choisis"></ul></div>'+
  '<p class="pz-ou" aria-live="polite"></p>'+
  '<div class="pz-depot-a"><button class="pz-b" value="annuler" type="submit" formnovalidate>Annuler</button><button class="pz-b pz-b-p" value="deposer" type="submit">Déposer</button></div></form>';
 racine.appendChild(dlg);
 var zt=dlg.querySelector('textarea'),zf=dlg.querySelector('input[type=file]'),zone=dlg.querySelector('.pz-zone'),zl=dlg.querySelector('.pz-choisis'),zou=dlg.querySelector('.pz-ou'),choisis=[];
 function majChoisis(){zl.textContent='';choisis.forEach(function(f,i){var li=el('li',null,f.name+' · '+taille(f.size)+' ');var x=el('button','pz-x','retirer');x.type='button';x.setAttribute('aria-label','Retirer '+f.name);x.onclick=function(){choisis.splice(i,1);majChoisis()};li.appendChild(x);zl.appendChild(li)})}
 function ajouterFichiers(L){[].slice.call(L||[]).forEach(function(f){if(choisis.length<20&&f.size<=50*1048576)choisis.push(f)});majChoisis()}
 zf.onchange=function(){ajouterFichiers(zf.files);zf.value=''};
 zone.addEventListener('dragover',function(e){e.preventDefault();zone.classList.add('sur')});zone.addEventListener('dragleave',function(){zone.classList.remove('sur')});
 zone.addEventListener('drop',function(e){e.preventDefault();zone.classList.remove('sur');ajouterFichiers(e.dataTransfer&&e.dataTransfer.files)});
 dlg.addEventListener('paste',function(e){if(e.clipboardData&&e.clipboardData.files&&e.clipboardData.files.length){e.preventDefault();ajouterFichiers(e.clipboardData.files)}});
 centre.onclick=function(){zou.textContent=S.connecte&&S.compteOk?'Les textes iront sur votre compte ; les fichiers restent sur cet appareil.':'Tout restera dans ce navigateur. Connectez-vous pour retrouver vos textes partout.';
  if(dlg.showModal){dlg.showModal()}else dlg.setAttribute('open','');setTimeout(function(){zt.focus()},30)};
 dlg.addEventListener('close',function(){if(dlg.returnValue==='deposer')deposer(zt.value,choisis.slice());dlg.returnValue='';zt.value='';choisis=[];majChoisis();centre.focus()});
 dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});

 /* la lecture d'une forme */
 var pan=el('aside','pz-lecture');pan.hidden=true;pan.setAttribute('role','dialog');pan.setAttribute('aria-labelledby','pzLectT');racine.appendChild(pan);
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pan.hidden){fermer()}});

 /* le point zéro : exactement le premier état de la métamorphose de la Page Zéro, un anneau iris et un point iris, parfaitement ronds */
 function marquePoint(g){var d=sv('defs',{},g),id='pzP'+Math.random().toString(36).slice(2,7),l=sv('linearGradient',{id:id,x1:0,y1:0,x2:1,y2:1},d);
  [['0','#FB7185'],['.35','#F59E0B'],['.68','#7C5CFF'],['1','#22D3EE']].forEach(function(s){sv('stop',{offset:s[0],'stop-color':s[1]},l)});
  F.traits(0,sv,sv('g',{class:'pz-anneau'},g),{fill:'none',stroke:'#EDEDF0','stroke-width':1.4,'stroke-opacity':.55,'vector-effect':'non-scaling-stroke'},id);
  sv('circle',{class:'pz-noyau',cx:200,cy:200,r:11.6,fill:'url(#'+id+')'},g)}
 function glyphe(g,i){var st={fill:'none',stroke:'#EDEDF0','stroke-width':1.4,'stroke-opacity':.7,'vector-effect':'non-scaling-stroke'},d=sv('defs',{},g),l=sv('linearGradient',{id:'pzG'+i+'-'+Math.random().toString(36).slice(2,6),x1:0,y1:0,x2:1,y2:1},d);
  [['0','#FB7185'],['.5','#7C5CFF'],['1','#22D3EE']].forEach(function(s){sv('stop',{offset:s[0],'stop-color':s[1]},l)});
  F.traits(i,sv,sv('g',{},g),st,l.id);F.etats()[i].forEach(function(p){sv('circle',{cx:p[0],cy:p[1],r:i?9:26,fill:i?'#EDEDF0':'url(#'+l.id+')'},g)})}

 /* ---------- les données ---------- */
 function tout(){return S.elements.concat(S.local,S.fichiers)}
 function enLocal(n){return{id:n.id,texte:n.texte,cree:n.cree,origine:'appareil',a:A.analyser(n.texte,{ref:new Date()})}}
 function charger(){S.local=(lire(CLE_LOCAL,[])||[]).filter(function(n){return n&&typeof n.texte==='string'&&n.id}).slice(0,500).map(enLocal);
  return Promise.all([
   fetch('/api/auth/get-session',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(j){
    S.connecte=!!(j&&j.user);S.nom=S.connecte?(j.user.name||String(j.user.email||'').split('@')[0]):'';if(o.salut)o.salut(S.nom);
    if(!S.connecte)return;return post('/api/matiere',{action:'liste'}).then(function(r){if(r.statut===200&&r.j&&r.j.ok){S.compteOk=true;S.elements=r.j.elements||[]}else{S.compteOk=false;S.raison=(r.j&&r.j.raison)||''}}).catch(function(){S.compteOk=false})}),
   fichiersTous().then(function(L){S.fichiers=(L||[]).map(function(f){return{id:'f-'+f.id,cle:f.id,texte:f.texte||f.nom,cree:f.cree,origine:'appareil',fichier:{nom:f.nom,type:f.type,taille:f.taille},a:A.analyser(f.texte||f.nom,{fichier:true,nom:f.nom,ref:new Date()})}})})
  ]).then(afficher)}

 function deposer(texte,fichiers){texte=String(texte||'').trim();var nouveaux=[],promesses=[];if(!texte&&!fichiers.length)return;S.occupe=true;majEtat();
  if(texte){if(S.connecte&&S.compteOk)promesses.push(post('/api/matiere',{action:'ajouter',texte:texte}).then(function(r){if(r.statut===200&&r.j&&r.j.ok){S.elements=r.j.elements.concat(S.elements);nouveaux=nouveaux.concat(r.j.elements)}else{garderLocal(texte);dire((r.j&&r.j.raison?r.j.raison+' ':'')+'Gardé dans ce navigateur en attendant.')}}));
   else garderLocal(texte)}
  function garderLocal(t){var n={id:'l-'+uid(),texte:t.slice(0,20000),cree:new Date().toISOString()},L=lire(CLE_LOCAL,[])||[];L.unshift(n);if(!ecrire(CLE_LOCAL,L.slice(0,500)))dire('Ce navigateur refuse d\'enregistrer : la matière disparaîtra en fermant la page.');var x=enLocal(n);S.local.unshift(x);nouveaux.push(x)}
  fichiers.forEach(function(f){promesses.push(lireTexte(f).then(function(t){var id=uid(),r={id:id,nom:f.name,type:f.type||'',taille:f.size,cree:new Date().toISOString(),texte:t,blob:f};
   return fichierGarder(r).then(function(){var x={id:'f-'+id,cle:id,texte:t||f.name,cree:r.cree,origine:'appareil',fichier:{nom:f.name,type:r.type,taille:f.size},a:A.analyser(t||f.name,{fichier:true,nom:f.name,ref:new Date()})};S.fichiers.unshift(x);nouveaux.push(x)})
    .catch(function(){dire('« '+f.name+' » n\'a pas pu être gardé sur cet appareil.')})}))});
  Promise.all(promesses).then(function(){S.occupe=false;afficher();propager(nouveaux)},function(){S.occupe=false;afficher()})}

 function retirer(x){var p;if(x.origine==='compte')p=post('/api/matiere',{action:'supprimer',id:x.id}).then(function(r){if(r.statut===200||r.statut===404)S.elements=S.elements.filter(function(y){return y.id!==x.id});else throw new Error('refus')});
  else if(x.fichier)p=fichierRetirer(x.cle).then(function(){S.fichiers=S.fichiers.filter(function(y){return y.id!==x.id})});
  else{ecrire(CLE_LOCAL,(lire(CLE_LOCAL,[])||[]).filter(function(n){return n.id!==x.id}));S.local=S.local.filter(function(y){return y.id!==x.id});p=Promise.resolve()}
  return p.then(function(){afficher();if(S.ouverte)ouvrir(S.ouverte,true)},function(){dire('Retrait impossible pour le moment : réessayez.')})}

 function ranger(){var L=lire(CLE_LOCAL,[])||[];if(!L.length)return;S.occupe=true;majEtat();
  post('/api/matiere',{action:'importer',textes:L.slice(0,50).map(function(n){return n.texte})}).then(function(r){S.occupe=false;
   if(r.statut===200&&r.j&&r.j.ok){var reste=L.slice(50);ecrire(CLE_LOCAL,reste);S.local=reste.map(enLocal);S.elements=r.j.elements.concat(S.elements);dire(r.j.elements.length+' élément'+(r.j.elements.length>1?'s rangés':' rangé')+' sur votre compte.');afficher()}
   else{dire((r.j&&r.j.raison)||'Rangement impossible pour le moment.');majEtat()}}).catch(function(){S.occupe=false;dire('Serveur injoignable : réessayez.');majEtat()})}

 /* ---------- l'affichage ---------- */
 var dernierMot='';function dire(t){dernierMot=t;majEtat()}
 function majEtat(){etat.textContent='';var p=el('p');
  if(S.occupe)p.textContent='Le point zéro trie votre matière…';
  else if(S.connecte&&S.compteOk)p.textContent='Bonjour '+S.nom+' : vos textes sont rangés sur votre compte, vos fichiers restent sur cet appareil.';
  else if(S.connecte)p.textContent=(S.raison||'Le rangement sur le compte n\'est pas disponible pour le moment.')+' Votre matière reste dans ce navigateur.';
  else{p.appendChild(document.createTextNode('Votre matière reste dans ce navigateur. '));var a=el('a',null,'Se connecter');a.href='/compte/';p.appendChild(a);p.appendChild(document.createTextNode(' pour la retrouver sur tous vos appareils.'))}
  etat.appendChild(p);
  if(S.connecte&&S.compteOk&&S.local.length&&!S.occupe){var b=el('button','pz-b pz-b-s','Ranger sur mon compte les '+S.local.length+' note'+(S.local.length>1?'s':'')+' de ce navigateur');b.type='button';b.onclick=ranger;etat.appendChild(b)}
  if(dernierMot){etat.appendChild(el('p','pz-mot',dernierMot))}}

 var D=null;
 function afficher(){D=A.distribuer(tout(),new Date().toISOString());var c=A.compter(D);
  ETAPES.forEach(function(e){var k=c[e.id];boutons[e.id].n.textContent=k;boutons[e.id].b.classList.toggle('vide',!k);boutons[e.id].b.setAttribute('aria-label',e.nom+' : '+e.phrase+' '+k+' '+(k>1?'éléments':'élément')+'.');rayons[e.id].setAttribute('stroke-opacity',k?.32:.12)});
  centre.classList.toggle('vierge',!tout().length);majEtat()}

 /* la matière se propage : un point part du centre vers chaque forme qu'elle touche */
 function propager(L){if(!L.length)return;var cible={};L.forEach(function(x){x.a.etapes.forEach(function(e){cible[e]=1})});
  dire(L.length===1?'« '+L[0].a.titre+' » rejoint : '+L[0].a.etapes.map(function(e){return ETAPES.filter(function(x){return x.id===e})[0].nom}).join(', ')+'.':L.length+' éléments déposés et rangés.');
  Object.keys(cible).forEach(function(e,i){var b=boutons[e].b;if(RM||!b.animate){b.classList.add('touche');setTimeout(function(){b.classList.remove('touche')},900);return}
   var r=scene.getBoundingClientRect(),c=centre.getBoundingClientRect(),q=b.getBoundingClientRect(),d=el('i','pz-goutte');d.setAttribute('aria-hidden','true');scene.appendChild(d);
   var x0=c.left+c.width/2-r.left,y0=c.top+c.height/2-r.top,x1=q.left+q.width/2-r.left,y1=q.top+q.height/2-r.top;
   var an=d.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(1.6)',opacity:0},{opacity:1,offset:.15},{transform:'translate('+x1+'px,'+y1+'px) scale(.6)',opacity:.9}],{duration:820,delay:i*110,easing:'cubic-bezier(.3,.7,.2,1)',fill:'both'});
   an.onfinish=function(){d.remove();b.classList.add('touche');setTimeout(function(){b.classList.remove('touche')},700)}})}

 function fermer(){pan.hidden=true;S.ouverte=null;racine.classList.remove('lit');var b=boutons[pan.dataset.e];if(b)b.b.focus()}
 function ouvrir(id,garder){var e=ETAPES.filter(function(x){return x.id===id})[0],i=ETAPES.indexOf(e);S.ouverte=id;pan.dataset.e=id;pan.textContent='';racine.classList.add('lit');
  var h=el('header','pz-l-tete'),g=sv('svg',{class:'pz-glyphe',viewBox:'0 0 400 400','aria-hidden':'true'},h);glyphe(g,i);var ht=el('div');var t=el('h2',null,e.nom);t.id='pzLectT';ht.appendChild(t);ht.appendChild(el('p','pz-leg',e.phrase));h.appendChild(ht);
  var x=el('button','pz-fermer','×');x.type='button';x.setAttribute('aria-label','Fermer');x.onclick=fermer;h.appendChild(x);pan.appendChild(h);
  var corps=el('div','pz-l-corps');pan.appendChild(corps);VUES[id](corps,e);pan.hidden=false;if(!garder)x.focus()}

 function vide(c,e){c.appendChild(el('p','pz-vide',e.vide))}
 function puce(t,c){return el('span','pz-puce'+(c?' '+c:''),t)}
 function carte(x,opts){opts=opts||{};var c=el('article','pz-carte-e');var h=el('div','pz-c-tete');h.appendChild(puce(A.GENRES[x.a.genre]||'Note'));h.appendChild(puce(x.origine==='compte'?'Compte':'Cet appareil','o'));c.appendChild(h);
  c.appendChild(el('h3',null,x.a.titre));if(x.fichier){var f=el('p','pz-leg',x.fichier.nom+' · '+taille(x.fichier.taille));c.appendChild(f)}
  else if(x.texte.length>x.a.titre.length+2)c.appendChild(el('p','pz-extrait',x.texte.slice(0,280)+(x.texte.length>280?'…':'')));
  if(!opts.court){var et=el('p','pz-etapes');x.a.etapes.forEach(function(k){var b=el('button','pz-mini',ETAPES.filter(function(z){return z.id===k})[0].nom);b.type='button';b.onclick=function(){ouvrir(k)};et.appendChild(b)});c.appendChild(et);
   var a=el('div','pz-c-act');if(x.fichier){var o2=el('button','pz-b pz-b-s','Ouvrir le fichier');o2.type='button';o2.onclick=function(){idbFaire('readonly',function(s){return s.get(x.cle)}).then(function(r){if(r&&r.blob){var u=URL.createObjectURL(r.blob),l=document.createElement('a');l.href=u;l.download=r.nom;document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000)}})};a.appendChild(o2)}
    var r=el('button','pz-b pz-b-s','Retirer');r.type='button';var arme=0;r.onclick=function(){if(Date.now()-arme<4000){r.disabled=true;retirer(x)}else{arme=Date.now();r.textContent='Confirmer le retrait';setTimeout(function(){r.textContent='Retirer'},4000)}};a.appendChild(r);c.appendChild(a)}
  return c}
 function liste(c,L,opts){var u=el('div','pz-liste');L.forEach(function(x){u.appendChild(carte(x,opts))});c.appendChild(u)}

 var VUES={
  point:function(c,e){if(!D.point.length)return vide(c,e);var b=el('button','pz-b pz-b-p','Déposer une matière');b.type='button';b.onclick=function(){centre.click()};c.appendChild(b);liste(c,D.point)},
  ligne:function(c,e){if(!D.ligne.jalons.length)vide(c,e);else{var ol=el('ol','pz-ligne'),auj=new Date().toISOString().slice(0,10),pose=false;
    D.ligne.jalons.forEach(function(j){if(!pose&&j.date>=auj){pose=true;var m=el('li','pz-auj','Aujourd\'hui');ol.appendChild(m)}var li=el('li',j.date<auj?'passe':'');li.appendChild(el('time',null,jour(j.date)));li.firstChild.setAttribute('datetime',j.date);
     li.appendChild(el('small',null,ecart(j.date)));li.appendChild(el('b',null,j.el.a.titre));ol.appendChild(li)});if(!pose)ol.appendChild(el('li','pz-auj','Aujourd\'hui'));c.appendChild(ol)}
   if(D.ligne.sansDate.length){var d=el('details','pz-sans');d.appendChild(el('summary',null,D.ligne.sansDate.length+' élément'+(D.ligne.sansDate.length>1?'s':'')+' sans date'));liste(d,D.ligne.sansDate,{court:true});c.appendChild(d)}},
  relation:function(c,e){var R=D.relation;if(!R.entites.length)return vide(c,e);var n=Math.min(R.entites.length,18),W=520,H=360,cx=W/2,cy=H/2,g=sv('svg',{class:'pz-reseau',viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Réseau des personnes, adresses et liens cités'},c);
   var P=R.entites.slice(0,n).map(function(_,i){var a=i/n*Math.PI*2-Math.PI/2,rr=n<4?90:140;return[cx+rr*1.35*Math.cos(a),cy+rr*Math.sin(a)]});
   R.liens.forEach(function(l){if(l.a<n&&l.b<n)sv('line',{x1:P[l.a][0],y1:P[l.a][1],x2:P[l.b][0],y2:P[l.b][1],stroke:'#EDEDF0','stroke-opacity':Math.min(.7,.2+.15*l.poids),'stroke-width':1.2},g)});
   sv('circle',{cx:cx,cy:cy,r:5,fill:'#EDEDF0','fill-opacity':.35},g);P.forEach(function(p){sv('line',{x1:cx,y1:cy,x2:p[0],y2:p[1],stroke:'#EDEDF0','stroke-opacity':.07},g)});
   R.entites.slice(0,n).forEach(function(en,i){var p=P[i];sv('circle',{cx:p[0],cy:p[1],r:4+Math.min(6,en.els.length*1.5),fill:en.type==='personne'?'#EDEDF0':en.type==='email'?'#22D3EE':'#F59E0B'},g);
    var t=sv('text',{x:p[0],y:p[1]+(p[1]<cy?-14:22),'text-anchor':'middle',fill:'#A1A1AC','font-size':12},g);t.textContent=en.nom.length>24?en.nom.slice(0,23)+'…':en.nom});
   var u=el('ul','pz-ent');R.entites.forEach(function(en){var li=el('li');li.appendChild(puce(en.type==='personne'?'Nom':en.type==='email'?'Adresse':'Lien',en.type));li.appendChild(el('b',null,en.nom));
    li.appendChild(el('small',null,en.els.map(function(id){var x=tout().filter(function(y){return y.id===id})[0];return x?x.a.titre:''}).filter(Boolean).join(' · ')));u.appendChild(li)});c.appendChild(u)},
  grille:function(c,e){var G=D.grille;if(!G.lignes.length)return vide(c,e);var w=el('div','pz-table');var tb=el('table');var th=el('tr');th.appendChild(el('th'));G.colonnes.forEach(function(k){th.appendChild(el('th',null,A.GENRES[k]))});var tt=el('thead');tt.appendChild(th);tb.appendChild(tt);
   var bd=el('tbody'),zone2=el('div','pz-filtre');G.lignes.forEach(function(t){var tr=el('tr');tr.appendChild(el('th',null,t==='divers'?'Divers':A.THEMES[t].nom));G.colonnes.forEach(function(k){var ids=G.cases[t+'|'+k]||[],td=el('td');
     if(ids.length){var b=el('button','pz-case');b.type='button';b.setAttribute('aria-label',ids.length+' : '+(t==='divers'?'Divers':A.THEMES[t].nom)+', '+A.GENRES[k]);for(var q=0;q<Math.min(ids.length,9);q++)b.appendChild(el('i'));if(ids.length>9)b.appendChild(el('small',null,'+'+(ids.length-9)));
      b.onclick=function(){zone2.textContent='';zone2.appendChild(el('h3',null,(t==='divers'?'Divers':A.THEMES[t].nom)+' · '+A.GENRES[k]));liste(zone2,tout().filter(function(x){return ids.indexOf(x.id)>=0}),{court:true});zone2.scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'})};td.appendChild(b)}tr.appendChild(td)});bd.appendChild(tr)});
   tb.appendChild(bd);w.appendChild(tb);c.appendChild(w);c.appendChild(el('p','pz-leg','Choisissez une case pour voir ce qu\'elle contient.'));c.appendChild(zone2)},
  composition:function(c,e){var C=D.composition;if(!C.intention)return vide(c,e);var doc=el('article','pz-doc');doc.appendChild(el('h3',null,C.titre));
   if(C.intention.texte.length>C.titre.length+2)doc.appendChild(el('p',null,C.intention.texte.slice(0,1200)));
   C.parties.forEach(function(p){doc.appendChild(el('h4',null,p.titre));var ul=el('ul');p.els.forEach(function(x){var d=[].concat(x.a.dates.map(jour),x.a.personnes).slice(0,4).join(' · ');ul.appendChild(el('li',null,x.a.titre+(d?' — '+d:'')))});doc.appendChild(ul)});
   c.appendChild(doc);var md=function(){var s='# '+C.titre+'\n\n'+(C.intention.texte.length>C.titre.length+2?C.intention.texte+'\n\n':'');C.parties.forEach(function(p){s+='## '+p.titre+'\n\n';p.els.forEach(function(x){s+='- '+x.a.titre+'\n'});s+='\n'});return s};
   var a=el('div','pz-c-act'),b=el('button','pz-b pz-b-p','Copier le brouillon');b.type='button';b.onclick=function(){var t=md();(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='Copié'},function(){var z=el('textarea');z.value=t;z.className='pz-copie';a.appendChild(z);z.select();b.textContent='Sélectionné : copiez-le'});setTimeout(function(){b.textContent='Copier le brouillon'},2500)};a.appendChild(b);
   var t2=el('button','pz-b','Télécharger (.md)');t2.type='button';t2.onclick=function(){var u=URL.createObjectURL(new Blob([md()],{type:'text/markdown'})),l=document.createElement('a');l.href=u;l.download='brouillon-aime.md';document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000)};a.appendChild(t2);c.appendChild(a)},
  projet:function(c,e){if(!D.projet.length)return vide(c,e);var g=el('div','pz-dossiers');D.projet.forEach(function(p){var d=el('article','pz-dossier');d.appendChild(puce(p.nom));d.appendChild(el('h3',null,p.titre));
    var f=el('dl');var ligne=function(k,v){if(!v)return;f.appendChild(el('dt',null,k));f.appendChild(el('dd',null,v))};ligne('Éléments',String(p.els.length));ligne('Prochaine date',p.prochaine?jour(p.prochaine)+' ('+ecart(p.prochaine)+')':'');ligne('Personnes',p.personnes.slice(0,6).join(', '));ligne('Montants',p.montants.slice(0,4).join(', '));d.appendChild(f);
    var a=el('div','pz-c-act');if(S.connecte){var l=el('a','pz-b pz-b-p','Créer un espace pour ce projet');l.href='/compte/?nouvel='+encodeURIComponent(p.titre.slice(0,120));a.appendChild(l)}else{var l2=el('a','pz-b','Se connecter pour en faire un espace partagé');l2.href='/compte/';a.appendChild(l2)}
    var v=el('button','pz-b','Voir les éléments');v.type='button';var zone3=el('div');v.onclick=function(){zone3.textContent='';liste(zone3,p.els,{court:true});v.hidden=true};a.appendChild(v);d.appendChild(a);d.appendChild(zone3);g.appendChild(d)});c.appendChild(g)}};

 /* les traits s'arrêtent à l'anneau, comme sur la Page Zéro : le point reste seul dans son cercle */
 function masque(){var r=centre.getBoundingClientRect().width*.44;scene.style.setProperty('--pz-r',r.toFixed(1)+'px')}
 masque();if(root.ResizeObserver)new ResizeObserver(masque).observe(scene);else addEventListener('resize',masque);
 afficher();charger();
 return{recharger:charger,ouvrir:ouvrir,deposer:function(t){deposer(t,[])}}}

root.AIMEPointZero={monter:monter,ETAPES:ETAPES};
})(typeof self!=='undefined'?self:this);
