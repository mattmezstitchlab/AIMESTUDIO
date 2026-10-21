/* AIME · RÉGIE · l'interface. Une seule page, sept vues :
   Pages et arborescence · Édition sur la page · L'orbe, site par site · Devis et factures · Clients · Mon entreprise ·
   Publier et sauvegarder.
   Brouillon du site : localStorage « aime-regie-brouillon » (+ médias importés dans IndexedDB « aime-regie »).
   Comptabilité : localStorage « aime-regie-compta », jamais envoyée sur le réseau ; elle sort seulement par vos sauvegardes.
   Publier = télécharger site.json (et les médias) pour le déposer dans le dépôt : aucun envoi automatique. */
(function(){'use strict';
var R=window.AIMERegie,N=window.AIMENav,vue=document.getElementById('vue');if(!R||!N||!vue)return;
var CLE_B='aime-regie-brouillon',CLE_C='aime-regie-compta',CLE_A='aime-regie-apercu',CLE_O='aime-regie-onglet';
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})}
function $(id){return document.getElementById(id)}
function lire(k){try{return localStorage.getItem(k)}catch(e){return null}}
function ecrire(k,v){try{localStorage.setItem(k,v);return true}catch(e){toast('Enregistrement impossible dans ce navigateur (stockage plein ou bloqué).',true);return false}}
var tt;function toast(m,ko){var t=$('toast');t.textContent=m;t.className='toast'+(ko?' ko':'');t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},ko?6000:3200)}
function copie(o){return JSON.parse(JSON.stringify(o))}
function aujourdhui(){return new Date().toISOString().slice(0,10)}
function telecharger(nom,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},800)}
/* deux temps pour tout ce qui ne se rattrape pas : le bouton change d'étiquette, un second clic confirme */
function confirmer(b,texte,action){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib;action();return}b.dataset.lib=b.textContent;b.dataset.arme='1';b.textContent=texte;setTimeout(function(){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib}},4500)}

/* ---------- état ---------- */
var publie=R.vide(),cfg=null,compta;
(function(){var t=lire(CLE_B);if(t){try{cfg=R.config(JSON.parse(t))}catch(e){cfg=null}}})();
(function(){var t=lire(CLE_C);if(!t){compta=R.comptaVide();return}try{compta=R.compta(t)}catch(e){compta=R.comptaVide();ecrire(CLE_C+'-illisible-'+Date.now(),t);toast('La comptabilité enregistrée était illisible : elle a été mise de côté, rien n\'a été effacé.',true)}})();
function sauverCompta(){ecrire(CLE_C,JSON.stringify(compta))}
var envoiCfg=null;
function sauverCfg(sansEnvoi){cfg.maj=aujourdhui();ecrire(CLE_B,JSON.stringify(cfg));etatPub();if(!sansEnvoi){clearTimeout(envoiCfg);envoiCfg=setTimeout(envoyerCfg,180)}}
function sansDate(c){var x=copie(c);delete x.maj;return JSON.stringify(x)}
function propre(){return R.config(copie(cfg))}
function modifie(){return cfg&&sansDate(propre())!==sansDate(publie)}
function etatPub(){$('etatPub').textContent=modifie()?'Réglages non publiés':'À jour avec la version publiée'}

/* ---------- pages connues : le registre, plus celles déjà réglées ---------- */
function pages(){var vus={},L=[];N.ENTREES.forEach(function(e){var c=R.cleDePage(e.href.split('?')[0]);if(vus[c])return;vus[c]=1;L.push({cle:c,nom:e.nom,href:e.href,id:e.id,statut:e.statut})});
 Object.keys(cfg.pages).forEach(function(c){if(!vus[c]){vus[c]=1;L.push({cle:c,nom:c,href:c,id:null,statut:'disponible'})}});return L}
function pageCfg(c){return cfg.pages[c]||(cfg.pages[c]={appareils:[],textes:[]})}

/* ---------- médias importés (IndexedDB) ---------- */
function idb(){return new Promise(function(ok,ko){var rq=indexedDB.open('aime-regie',1);rq.onupgradeneeded=function(){rq.result.createObjectStore('medias')};rq.onsuccess=function(){ok(rq.result)};rq.onerror=function(){ko(rq.error)}})}
function mediaMettre(id,v){return idb().then(function(db){return new Promise(function(ok,ko){var t=db.transaction('medias','readwrite');t.objectStore('medias').put(v,id);t.oncomplete=function(){ok()};t.onerror=function(){ko(t.error)}})})}
function mediaLire(id){return idb().then(function(db){return new Promise(function(ok){var g=db.transaction('medias').objectStore('medias').get(id);g.onsuccess=function(){ok(g.result||null)};g.onerror=function(){ok(null)}})}).catch(function(){return null})}
var urls={};function mediaUrl(id){if(urls[id])return Promise.resolve(urls[id]);return mediaLire(id).then(function(v){if(!v)return null;urls[id]=URL.createObjectURL(v.blob);return urls[id]})}
var EXT={'image/webp':'webp','image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/avif':'avif','video/mp4':'mp4','video/webm':'webm'};
function importerMedia(f){var ext=EXT[f.type];if(!ext)return Promise.reject(new Error('Format non pris en charge : images WebP, JPEG, PNG, GIF, AVIF ou vidéos MP4, WebM.'));
 var max=/^video/.test(f.type)?40e6:10e6;if(f.size>max)return Promise.reject(new Error('Fichier trop lourd ('+Math.round(f.size/1e5)/10+' Mo). Limite : '+max/1e6+' Mo.'));
 var id='m-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);return mediaMettre(id,{blob:f,nom:f.name,type:f.type}).then(function(){cfg.medias[id]={nom:f.name.slice(0,120),ext:ext,type:/^video/.test(f.type)?'video':'image'};return id})}
function vignette(src){if(!src)return Promise.resolve('');var m;if((m=/^biblio:(.+)$/.exec(src)))return Promise.resolve('/sites/bibliotheque/'+m[1]+'.v.webp');if((m=/^media:(.+)$/.exec(src)))return mediaUrl(m[1]).then(function(u){return u||''});return Promise.resolve(R.cheminOk(src)?src:'')}

/* ---------- la bibliothèque de visuels ---------- */
var BIB=null;function bib(){return BIB?Promise.resolve(BIB):fetch('/sites/bibliotheque/bibliotheque.json').then(function(r){return r.json()}).then(function(j){BIB=j;return j})}

/* ---------- navigation ---------- */
var VUES={pages:vPages,edition:vEdition,orbe:vOrbe,docs:vDocs,clients:vClients,entreprise:vEntreprise,publier:vPublier};
var courant=null;
function aller(nom,opts){if(!VUES[nom])nom='pages';courant=nom;ecrire(CLE_O,nom);[].forEach.call(document.querySelectorAll('[data-onglet]'),function(b){if(b.dataset.onglet===nom)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(nom!=='edition')ed.frame=null;vue.onclick=vue.oninput=vue.onchange=vue.onkeydown=null;VUES[nom](opts||{});if(history.replaceState)history.replaceState(null,'','#'+nom);vue.focus({preventScroll:true});scrollTo(0,0)}
document.addEventListener('click',function(e){var b=e.target.closest('[data-onglet],[data-aller]');if(b){aller(b.dataset.onglet||b.dataset.aller)}});

/* ================= Pages et arborescence ================= */
function vPages(){var cats=N.categories();var h='<h1>Pages et arborescence</h1><p class="sous">Toutes les pages du site, rangées comme dans le menu Explorer. « Éditer » ouvre la page pour y poser des appareils et changer ses textes.</p><div class="arbo">';
 var vus={};cats.forEach(function(c){h+='<section class="cat"><h2>'+esc(c.t)+' <span class="leg">· '+esc(c.d)+'</span></h2><ul>'+c.l.map(function(e){var k=R.cleDePage(e.href.split('?')[0]),p=cfg.pages[k]||{appareils:[],textes:[]},o=cfg.orbe[e.id],pr=R.orbeDe(cfg,e.id).presence;vus[k]=1;
  return'<li><div><div class="nom">'+esc(e.nom)+'</div><div class="adr">'+esc(e.href)+'</div><div class="puces"><span class="puce '+esc(e.statut)+'">'+esc(N.STATUTS[e.statut]||e.statut)+'</span>'+(p.appareils.length?'<span class="puce on">'+p.appareils.length+' appareil'+(p.appareils.length>1?'s':'')+'</span>':'')+(p.textes.length?'<span class="puce on">'+p.textes.length+' texte'+(p.textes.length>1?'s':'')+'</span>':'')+(pr!=='aucune'?'<span class="puce on">orbe : '+esc(R.PRESENCES[pr])+(o?'':' (défaut)')+'</span>':'')+'</div></div>'+
  '<div class="lgn"><a class="b b-s" href="'+esc(e.href)+'" target="_blank" rel="noopener">Ouvrir</a><button class="b b-s" type="button" data-editer="'+esc(k)+'" data-href="'+esc(e.href)+'">Éditer</button><button class="b b-s" type="button" data-orbe-site="'+esc(e.id)+'">Orbe</button></div></li>'}).join('')+'</ul></section>'});
 var autres=Object.keys(cfg.pages).filter(function(k){return!vus[k]});if(autres.length)h+='<section class="cat"><h2>Autres pages réglées</h2><ul>'+autres.map(function(k){return'<li><div><div class="nom">'+esc(k)+'</div></div><div class="lgn"><button class="b b-s" type="button" data-editer="'+esc(k)+'" data-href="'+esc(k)+'">Éditer</button></div></li>'}).join('')+'</ul></section>';
 h+='<section class="cat"><h2>Éditer une autre adresse du site</h2><form class="lgn" id="autreP"><input id="autreChemin" placeholder="/stitch/atelier/" style="max-width:320px" aria-label="Chemin de la page"><button class="b" type="submit">Éditer</button></form></section></div>';
 vue.innerHTML=h;
 $('autreP').onsubmit=function(e){e.preventDefault();var c=$('autreChemin').value.trim();if(!R.cheminOk(c))return toast('Un chemin du site commence par « / », par exemple /stitch/atelier/.',true);aller('edition',{cle:R.cleDePage(c),href:c})};
 vue.onclick=function(e){var b=e.target.closest('[data-editer]');if(b)return aller('edition',{cle:b.dataset.editer,href:b.dataset.href});b=e.target.closest('[data-orbe-site]');if(b)return aller('orbe',{site:b.dataset.orbeSite})}}

/* ================= Édition sur la page ================= */
var LARGEURS={1440:'Ordinateur',820:'Tablette',390:'Téléphone'};
var ed={cle:'/',href:'/',largeur:1440,choisi:null,texte:false,ancres:[],selTexte:null,frame:null,biblio:false,cat:null};
function envoyerCfg(){if(ed.frame&&ed.frame.contentWindow){ed.frame.contentWindow.postMessage({type:'regie:config',config:cfg},location.origin);if(ed.choisi)ed.frame.contentWindow.postMessage({type:'regie:choisir',id:ed.choisi},location.origin)}}
function dirFrame(m){if(ed.frame&&ed.frame.contentWindow)ed.frame.contentWindow.postMessage(m,location.origin)}
function appCourant(){return pageCfg(ed.cle).appareils.filter(function(a){return a.id===ed.choisi})[0]||null}
function vEdition(o){if(o.cle){ed.cle=o.cle;ed.href=o.href||o.cle;ed.choisi=null;ed.selTexte=null}var P=pages();
 vue.innerHTML='<h1>Édition sur la page</h1><p class="sous">Faites glisser un appareil pour le déplacer, tirez le rond violet pour le redimensionner. En « Mode texte », cliquez un texte de la page pour le changer. Rien n\'est public avant « Publier ».</p>'+
 '<div class="ed"><div><div class="ed-barre"><label class="sr" for="edPage">Page</label><select id="edPage">'+P.map(function(p){return'<option value="'+esc(p.cle)+'" data-href="'+esc(p.href)+'"'+(p.cle===ed.cle?' selected':'')+'>'+esc(p.nom)+' · '+esc(p.cle)+'</option>'}).join('')+(P.some(function(p){return p.cle===ed.cle})?'':'<option value="'+esc(ed.cle)+'" data-href="'+esc(ed.href)+'" selected>'+esc(ed.cle)+'</option>')+'</select>'+
 '<span class="seg" role="group" aria-label="Largeur d\'aperçu">'+Object.keys(LARGEURS).sort(function(a,b){return b-a}).map(function(w){return'<button type="button" data-l="'+w+'" aria-pressed="'+(+w===ed.largeur)+'">'+LARGEURS[w]+'</button>'}).join('')+'</span>'+
 '<button class="b b-s" type="button" id="edTexte" aria-pressed="'+ed.texte+'">Mode texte</button><span class="lgn"><button class="b b-s" type="button" data-plus="iphone">+ iPhone</button><button class="b b-s" type="button" data-plus="ipad">+ iPad</button><button class="b b-s" type="button" data-plus="macbook">+ MacBook</button></span>'+
 '<a class="b b-s" id="edOuvrir" href="'+esc(ed.href)+'" target="_blank" rel="noopener">Ouvrir la page</a></div>'+
 '<div class="ed-scene" id="edScene"><iframe id="edFrame" title="Page en édition : '+esc(ed.cle)+'" src="'+esc(ed.href+(ed.href.indexOf('?')<0?'?':'&')+'regie=edition')+'"></iframe></div></div>'+
 '<aside class="ed-cote" id="edCote" aria-label="Réglages"></aside></div>';
 ed.frame=$('edFrame');ajuster();if(window.ResizeObserver)new ResizeObserver(ajuster).observe($('edScene'));
 $('edPage').onchange=function(){var op=this.selectedOptions[0];vEdition({cle:this.value,href:op.dataset.href})};
 $('edTexte').onclick=function(){ed.texte=!ed.texte;this.setAttribute('aria-pressed',ed.texte);dirFrame({type:'regie:mode',texte:ed.texte});if(ed.texte)toast('Mode texte : cliquez un titre ou un paragraphe dans la page.')};
 vue.querySelector('.ed-barre').addEventListener('click',function(e){var b=e.target.closest('[data-l]');if(b){ed.largeur=+b.dataset.l;[].forEach.call(this.querySelectorAll('[data-l]'),function(x){x.setAttribute('aria-pressed',String(x===b))});ajuster();return}
  b=e.target.closest('[data-plus]');if(b){var t=b.dataset.plus;dirFrame({type:'regie:ajoute',appareil:{id:R.nouvelId(t),type:t,l:R.APPAREILS[t].l,contenu:{type:'vide'},mobile:t==='macbook'?'visible':'masque',alt:''}})}});
 panneau()}
function ajuster(){var sc=$('edScene'),f=ed.frame;if(!sc||!f)return;var k=Math.min(1,sc.clientWidth/ed.largeur);f.style.width=ed.largeur+'px';f.style.height=Math.ceil(sc.clientHeight/k)+'px';f.style.transform='scale('+k+')'}
addEventListener('message',function(e){if(e.origin!==location.origin||!ed.frame||e.source!==ed.frame.contentWindow)return;var m=e.data||{},P=pageCfg(ed.cle);
 if(m.type==='regie:pret'){ed.ancres=m.ancres||[];envoyerCfg();if(ed.texte)dirFrame({type:'regie:mode',texte:true});panneau()}
 else if(m.type==='regie:selection'){ed.choisi=m.id;ed.selTexte=null;panneau()}
 else if(m.type==='regie:deplace'){var a=P.appareils.filter(function(x){return x.id===m.id})[0];if(!a)return;a.x=m.x;a.y=m.y;a.l=m.l;sauverCfg(true);panneau()}
 else if(m.type==='regie:ajoute-ok'){var n=R.appareil(m.appareil);P.appareils.push(n);ed.choisi=n.id;sauverCfg();panneau();toast(R.APPAREILS[n.type].nom+' posé. Choisissez ce qu\'il affiche, à droite.')}
 else if(m.type==='regie:texte'){ed.selTexte={sel:String(m.sel||'').slice(0,300),original:String(m.texte||''),actuel:String(m.actuel||'')};ed.choisi=null;panneau()}});

function champ(lib,html){return'<label class="ch"><span>'+lib+'</span>'+html+'</label>'}
function panneau(){var c=$('edCote');if(!c)return;var P=pageCfg(ed.cle),a=appCourant(),h='';
 if(ed.selTexte){var r=P.textes.filter(function(t){return t.sel===ed.selTexte.sel})[0];
  h+='<div class="carte pile"><h3>Texte choisi</h3><p class="leg" style="font-family:var(--mono);word-break:break-all">'+esc(ed.selTexte.sel)+'</p>'+champ('Nouveau texte','<textarea id="txVal" rows="4">'+esc(r?r.texte:ed.selTexte.actuel)+'</textarea>')+'<p class="leg">Texte seul. Un retour à la ligne devient un saut de ligne.</p><div class="lgn"><button class="b b-p b-s" type="button" id="txOk">Enregistrer</button>'+(r?'<button class="b b-s" type="button" id="txSuppr">Rétablir l\'original</button>':'')+'<button class="b b-s" type="button" id="txAnn">Fermer</button></div></div>'}
 if(a){var C=a.contenu;h+='<div class="carte pile"><div class="lgn" style="justify-content:space-between"><h3>'+esc(R.APPAREILS[a.type].nom)+'</h3><button class="b b-s" type="button" id="apFermer">Fermer</button></div>'+
  '<div class="g2">'+champ('Appareil','<select data-k="type">'+Object.keys(R.APPAREILS).map(function(k){return'<option value="'+k+'"'+(k===a.type?' selected':'')+'>'+R.APPAREILS[k].nom+'</option>'}).join('')+'</select>')+(a.type!=='macbook'?'<label class="ch"><span>Orientation</span><span class="lgn" style="min-height:38px"><input type="checkbox" data-k="paysage"'+(a.paysage?' checked':'')+'> Paysage</span></label>':'<span></span>')+'</div>'+
  champ('Dans l\'écran','<select data-k="contenu.type">'+Object.keys(R.CONTENUS).map(function(k){return'<option value="'+k+'"'+(k===C.type?' selected':'')+'>'+R.CONTENUS[k]+'</option>'}).join('')+'</select>');
  if(C.type==='image'||C.type==='video'){h+='<div class="lgn">'+(C.type==='image'?'<button class="b b-s" type="button" id="apBib" aria-expanded="'+ed.biblio+'">Bibliothèque</button>':'')+'<label class="b b-s">Importer un fichier<input type="file" id="apFichier" accept="'+(C.type==='image'?'image/webp,image/jpeg,image/png,image/gif,image/avif':'video/mp4,video/webm')+'" hidden></label></div>'+
   champ('Ou une adresse (chemin du site ou https)','<input data-k="contenu.src" value="'+esc(/^(biblio|media):/.test(C.src||'')?'':C.src||'')+'" placeholder="'+(C.type==='image'?'/zero/ecrans/… ou https://…':'https://….mp4')+'">')+(C.src?'<p class="leg">Actuel : '+esc(/^media:/.test(C.src)?'fichier importé · '+((cfg.medias[C.src.slice(6)]||{}).nom||''):C.src)+'</p>':'')+
   (ed.biblio&&C.type==='image'?'<div id="apBiblio" class="pile"></div>':'')+champ('Cadrage','<select data-k="contenu.ajustement"><option value="cover"'+(C.ajustement==='cover'?' selected':'')+'>Remplir l\'écran</option><option value="contain"'+(C.ajustement==='contain'?' selected':'')+'>Image entière</option></select>')}
  else if(C.type==='page'){h+=champ('Page du site','<select data-k="contenu.src"><option value="">— choisir —</option>'+pages().map(function(p){return'<option value="'+esc(p.href)+'"'+(p.href===C.src?' selected':'')+'>'+esc(p.nom)+'</option>'}).join('')+'</select>')+'<p class="leg">La page est affichée en direct, réduite à la taille de l\'écran.</p>'}
  else if(C.type==='url')h+=champ('Adresse https','<input data-k="contenu.src" value="'+esc(C.src||'')+'" placeholder="https://…">')+'<p class="leg">Beaucoup de sites refusent d\'être affichés dans un cadre : utilisez alors une capture.</p>';
  h+=champ('Lien au clic (facultatif)','<input data-k="lien" value="'+esc(a.lien)+'" placeholder="/g44/ ou https://…">')+champ('Description pour les lecteurs d\'écran','<textarea data-k="alt" rows="2">'+esc(a.alt)+'</textarea>')+
  '<div class="g4">'+champ('X %','<input type="number" step="0.5" data-k="x" value="'+a.x+'">')+champ('Y %','<input type="number" step="0.5" data-k="y" value="'+a.y+'">')+champ('Largeur %','<input type="number" step="0.5" min="3" max="100" data-k="l" value="'+a.l+'">')+champ('Rotation °','<input type="number" step="1" min="-45" max="45" data-k="rot" value="'+a.rot+'">')+'</div>'+
  '<div class="g2">'+champ('Accroché à','<select data-k="ancre">'+uniq([a.ancre].concat(ed.ancres,['body'])).map(function(x){return'<option'+(x===a.ancre?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select>')+champ('Sur petit écran','<select data-k="mobile">'+Object.keys(R.MOBILE).map(function(k){return'<option value="'+k+'"'+(k===a.mobile?' selected':'')+'>'+R.MOBILE[k]+'</option>'}).join('')+'</select>')+'</div>'+
  '<div class="lgn"><button class="b b-s" type="button" id="apDevant">Devant</button><button class="b b-s" type="button" id="apDerriere">Derrière</button><button class="b b-s" type="button" id="apDup">Dupliquer</button><button class="b b-s b-dg" type="button" id="apSuppr">Supprimer</button></div></div>'}
 if(!a&&!ed.selTexte){h+='<div class="carte pile"><h3>Sur cette page</h3>'+(P.appareils.length?'<div class="liste-app">'+P.appareils.map(function(x){return'<button type="button" data-ch="'+esc(x.id)+'"><img class="vign" alt="" data-v="'+esc(x.contenu.src||'')+'"><span><b>'+R.APPAREILS[x.type].nom+'</b><br><i>'+esc(R.CONTENUS[x.contenu.type])+'</i></span></button>'}).join('')+'</div>':'<p class="leg">Aucun appareil. Ajoutez-en un avec « + iPhone », « + iPad » ou « + MacBook ».</p>')+'</div>'+
  '<div class="carte pile"><h3>Textes remplacés</h3>'+(P.textes.length?P.textes.map(function(t,i){return'<div class="pile" style="gap:6px;border-top:1px solid var(--ligne);padding-top:8px"><span class="leg" style="font-family:var(--mono);word-break:break-all">'+esc(t.sel)+'</span><textarea data-tx="'+i+'" rows="2" aria-label="Texte">'+esc(t.texte)+'</textarea><span><button class="b b-s" type="button" data-txs="'+i+'">Rétablir l\'original</button></span></div>'}).join(''):'<p class="leg">Aucun. Activez « Mode texte » puis cliquez un texte dans la page.</p>')+'</div>'}
 c.innerHTML=h;
 [].forEach.call(c.querySelectorAll('img[data-v]'),function(im){vignette(im.dataset.v).then(function(u){if(u)im.src=u})});
 c.oninput=c.onchange=function(e){var t=e.target;if(t.dataset.tx!=null){P.textes[+t.dataset.tx].texte=t.value.slice(0,2000);sauverCfg();return}var k=t.dataset.k,a=appCourant();if(!k||!a)return;
  var v=t.type==='checkbox'?t.checked:t.type==='number'?parseFloat(t.value):t.value,o=copie(a);
  if(k.indexOf('contenu.')===0){var kk=k.slice(8);o.contenu[kk]=v;if(kk==='type'){o.contenu.src=null;ed.biblio=v==='image'}}else o[k]=v;
  if(k==='contenu.src'&&v&&!(R.sourceOk(v)||(o.contenu.type==='page'&&R.cheminOk(v))||(o.contenu.type==='url'&&R.httpsOk(v)))){if(e.type==='change')toast('Adresse refusée : un chemin du site (« /… ») ou une adresse https.',true);return}
  if(k==='lien'&&v&&!R.cibleOk(v)){if(e.type==='change')toast('Lien refusé : un chemin du site, une ancre « #… » ou une adresse https.',true);return}
  if(e.type==='input'&&(t.tagName==='SELECT'||t.type==='checkbox'))return;
  var n=R.appareil(o),i=P.appareils.indexOf(a);P.appareils[i]=n;sauverCfg();if(e.type==='change'&&(k==='type'||k==='contenu.type'||k==='contenu.src'||k==='paysage'))panneau()};
 c.onclick=function(e){var b=e.target.closest('button');if(!b)return;
  if(b.dataset.ch){ed.choisi=b.dataset.ch;dirFrame({type:'regie:choisir',id:ed.choisi});panneau();return}
  if(b.dataset.txs!=null){P.textes.splice(+b.dataset.txs,1);sauverCfg();panneau();return}
  if(b.id==='txAnn'){ed.selTexte=null;panneau();return}
  if(b.id==='txOk'){var v=$('txVal').value,r=P.textes.filter(function(t){return t.sel===ed.selTexte.sel})[0];if(r)r.texte=v;else{var nt=R.texte({sel:ed.selTexte.sel,texte:v,avant:ed.selTexte.original});if(!nt)return toast('Ce texte ne peut pas être remplacé.',true);P.textes.push(nt)}sauverCfg();ed.selTexte=null;panneau();toast('Texte enregistré dans le brouillon.');return}
  if(b.id==='txSuppr'){P.textes=P.textes.filter(function(t){return t.sel!==ed.selTexte.sel});cfg.pages[ed.cle].textes=P.textes;sauverCfg();ed.selTexte=null;panneau();return}
  a=appCourant();if(!a)return;var i=P.appareils.indexOf(a);
  if(b.id==='apFermer'){ed.choisi=null;dirFrame({type:'regie:choisir',id:null});panneau()}
  else if(b.id==='apDevant'||b.id==='apDerriere'){a.z=Math.max(1,Math.min(60,a.z+(b.id==='apDevant'?1:-1)));sauverCfg();toast('Plan : '+a.z)}
  else if(b.id==='apDup'){var d=R.appareil(Object.assign(copie(a),{id:R.nouvelId(a.type),x:a.x+3,y:a.y+3}));P.appareils.push(d);ed.choisi=d.id;sauverCfg();panneau()}
  else if(b.id==='apSuppr')confirmer(b,'Confirmer la suppression',function(){P.appareils.splice(i,1);ed.choisi=null;sauverCfg();panneau()});
  else if(b.id==='apBib'){ed.biblio=!ed.biblio;panneau()}};
 var fi=$('apFichier');if(fi)fi.onchange=function(){var f=this.files[0];this.value='';if(!f||!appCourant())return;importerMedia(f).then(function(id){var a=appCourant();if(!a)return;var o=copie(a);o.contenu.src='media:'+id;if(!o.alt)o.alt=f.name.replace(/\.[^.]+$/,'');P.appareils[P.appareils.indexOf(a)]=R.appareil(o);sauverCfg();panneau();toast('Fichier importé. Il sera publié avec le paquet .zip.')}).catch(function(err){toast(err.message,true)})};
 if($('apBiblio'))bib().then(function(j){var cats=Object.keys(j.categories);if(!ed.cat)ed.cat=cats[0];var box=$('apBiblio');if(!box)return;
  box.innerHTML='<span class="seg" role="group" aria-label="Catégories">'+cats.map(function(k){return'<button type="button" data-cat="'+k+'" aria-pressed="'+(k===ed.cat)+'">'+esc(j.categories[k])+'</button>'}).join('')+'</span><div class="biblio">'+j.images.filter(function(i){return i.cat===ed.cat}).map(function(i){return'<button type="button" data-img="'+esc(i.id)+'" title="'+esc(i.alt)+'"><img src="/sites/bibliotheque/'+esc(i.vignette)+'" alt="'+esc(i.alt)+'" loading="lazy"></button>'}).join('')+'</div>';
  box.onclick=function(e){var b=e.target.closest('button');if(!b)return;e.stopPropagation();if(b.dataset.cat){ed.cat=b.dataset.cat;panneau();return}var im=j.images.filter(function(i){return i.id===b.dataset.img})[0],a=appCourant();if(!im||!a)return;
   var o=copie(a);o.contenu.src='biblio:'+im.id;if(!o.alt||/visuel de la bibliothèque/.test(o.alt))o.alt='Un '+R.APPAREILS[o.type].nom+' affichant : '+im.alt.charAt(0).toLowerCase()+im.alt.slice(1)+', visuel de la bibliothèque AIME.';P.appareils[P.appareils.indexOf(a)]=R.appareil(o);sauverCfg();panneau()}})}
function uniq(l){var v={};return l.filter(function(x){if(!x||v[x])return false;v[x]=1;return true})}

/* ================= L'orbe, site par site ================= */
var orbeSite='*';
function vOrbe(o){if(o.site)orbeSite=o.site;var sites=[{id:'*',nom:'Par défaut (tous les sites)',href:'/'}].concat(N.ENTREES.filter(function(e,i,l){return l.findIndex(function(x){return x.id===e.id})===i}));
 var S=sites.filter(function(s){return s.id===orbeSite})[0]||sites[0],propre=!!cfg.orbe[S.id],O=R.orbeDe(cfg,S.id);
 var h='<h1>L\'orbe, site par site</h1><p class="sous">Choisissez où l\'orbe apparaît, comment elle se comporte et ce qu\'elle suggère. Le <a href="/lab/orb/" target="_blank" rel="noopener">laboratoire de l\'orbe</a> montre tout ce qu\'elle sait faire.</p><div class="sites-orbe"><div class="liste-app" role="list">'+
 sites.map(function(s){var p=R.orbeDe(cfg,s.id).presence;return'<button type="button" role="listitem" data-site="'+esc(s.id)+'" aria-pressed="'+(s.id===S.id)+'"><span class="orbe-v" style="--t:22px;'+(p==='aucune'?'opacity:.25':'')+'"></span><span><b>'+esc(s.nom)+'</b><br><i>'+esc(R.PRESENCES[p])+(s.id!=='*'&&!cfg.orbe[s.id]?' · défaut':'')+'</i></span></button>'}).join('')+'</div><div class="pile">';
 if(S.id!=='*'&&!propre)h+='<div class="carte pile"><h3>'+esc(S.nom)+'</h3><p class="leg">Ce site suit le réglage par défaut : '+esc(R.PRESENCES[O.presence])+'.</p><span><button class="b b-p" type="button" id="orPropre">Régler ce site à part</button></span></div>';
 else{h+='<div class="carte pile"><div class="lgn" style="justify-content:space-between"><h3>'+esc(S.nom)+'</h3>'+(S.id!=='*'?'<span class="lgn"><a class="b b-s" href="'+esc(S.href)+'" target="_blank" rel="noopener">Voir le site</a><button class="b b-s" type="button" id="orDefaut">Revenir au défaut</button></span>':'')+'</div>'+
  '<fieldset style="border:0;padding:0;margin:0" class="pile"><legend class="ch" style="font-size:12.5px;color:var(--doux);font-weight:600;margin-bottom:6px">Présence</legend>'+Object.keys(R.PRESENCES).map(function(k){return'<label class="lgn"><input type="radio" name="pres" value="'+k+'"'+(k===O.presence?' checked':'')+'> '+esc(R.PRESENCES[k])+'</label>'}).join('')+'</fieldset>'+
  '<fieldset style="border:0;padding:0;margin:0" class="pile"><legend class="ch" style="font-size:12.5px;color:var(--doux);font-weight:600;margin-bottom:6px">Autonomie</legend>'+Object.keys(R.AUTONOMIES).map(function(k){return'<label class="lgn"><input type="radio" name="auto" value="'+k+'"'+(k===O.autonomie?' checked':'')+'> '+esc(R.AUTONOMIES[k])+'</label>'}).join('')+'<p class="leg">Jamais d\'action irréversible sans confirmation. Le visiteur peut toujours la faire taire.</p></fieldset>'+
  '<div class="g2">'+champ('Côté','<select data-o="cote"><option value="droite"'+(O.cote==='droite'?' selected':'')+'>À droite</option><option value="gauche"'+(O.cote==='gauche'?' selected':'')+'>À gauche</option></select>')+champ('Taille : <output id="orT">'+O.taille+'</output> px','<input type="range" min="36" max="96" step="2" data-o="taille" value="'+O.taille+'">')+'</div>'+
  '<div class="lgn"><span class="orbe-v" id="orApercu" style="--t:'+O.taille+'px"></span><span class="leg">Le bouton d\'orbe, tel qu\'il apparaîtra en bas '+(O.cote==='droite'?'à droite':'à gauche')+'.</span></div></div>'+
  '<div class="carte pile"><h3>Bouton d\'orbe : accueil et suggestions</h3>'+champ('Phrase d\'accueil','<input data-o="accueil" maxlength="240" value="'+esc(O.accueil)+'" placeholder="Par où voulez-vous commencer ?">')+
  '<div class="pile" id="orSugg">'+O.suggestions.map(function(s,i){return'<div class="sugg"><input data-s="'+i+'" data-c="libelle" value="'+esc(s.libelle)+'" maxlength="60" aria-label="Libellé '+(i+1)+'"><input data-s="'+i+'" data-c="cible" value="'+esc(s.cible)+'" aria-label="Lien '+(i+1)+'"><span class="lgn"><button class="b b-s" type="button" data-sh="'+i+'" aria-label="Monter">↑</button><button class="b b-s" type="button" data-sx="'+i+'" aria-label="Retirer">×</button></span><input data-s="'+i+'" data-c="pourquoi" value="'+esc(s.pourquoi||'')+'" maxlength="160" placeholder="Pourquoi ? (montré au visiteur s\'il le demande)" aria-label="Pourquoi la suggestion '+(i+1)+'" style="grid-column:1/-1;font-size:13px"></div>'}).join('')+'</div>'+
  (O.suggestions.length<6?'<div class="lgn"><select id="orAjout" style="max-width:320px" aria-label="Ajouter une suggestion"><option value="">+ Ajouter une suggestion…</option><option value="/#contact" data-l="Parler d\'un projet">Le formulaire de contact</option>'+N.ENTREES.map(function(e){return'<option value="'+esc(e.href)+'" data-l="'+esc(e.nom)+'">'+esc(e.nom)+'</option>'}).join('')+'<option value="libre">Un lien libre…</option></select></div>':'<p class="leg">Six suggestions au plus.</p>')+'</div>'+
  '<div class="carte pile"><h3>Compagnon</h3><p class="leg">Quand il est présent, le compagnon commente ce que le visiteur survole et propose des actions. Des règles écrites, aucune IA.</p>'+Object.keys(R.OPTIONS_COMPAGNON).map(function(k){return'<label class="lgn"><input type="checkbox" data-co="'+k+'"'+(O.compagnon[k]?' checked':'')+'> '+esc(R.OPTIONS_COMPAGNON[k])+'</label>'}).join('')+'</div>'}
 vue.innerHTML=h+'</div></div>';
 function maj(f){var x=copie(R.orbeDe(cfg,S.id));f(x);cfg.orbe[S.id]=R.orbe(x);sauverCfg(true)}
 vue.onclick=function(e){var b=e.target.closest('button');if(!b)return;
  if(b.dataset.site){vOrbe({site:b.dataset.site});return}
  if(b.id==='orPropre'){cfg.orbe[S.id]=R.orbe(copie(R.orbeDe(cfg,'*')));sauverCfg(true);vOrbe({});return}
  if(b.id==='orDefaut'){delete cfg.orbe[S.id];sauverCfg(true);vOrbe({});return}
  if(b.dataset.sx!=null){maj(function(x){x.suggestions.splice(+b.dataset.sx,1)});vOrbe({});return}
  if(b.dataset.sh!=null){var i=+b.dataset.sh;if(i>0)maj(function(x){var t=x.suggestions[i];x.suggestions[i]=x.suggestions[i-1];x.suggestions[i-1]=t});vOrbe({})}};
 vue.oninput=function(e){var t=e.target;if(t.name==='pres')maj(function(x){x.presence=t.value});
  else if(t.name==='auto')maj(function(x){x.autonomie=t.value});
  else if(t.dataset.o){maj(function(x){x[t.dataset.o]=t.dataset.o==='taille'?+t.value:t.value});if(t.dataset.o==='taille'){$('orT').textContent=t.value;$('orApercu').style.setProperty('--t',t.value+'px')}}
  else if(t.dataset.co)maj(function(x){x.compagnon[t.dataset.co]=t.checked});
  else if(t.dataset.s!=null){var v=t.value;if(t.dataset.c==='cible'&&!R.cibleOk(v)){t.setAttribute('aria-invalid','true');return}t.removeAttribute('aria-invalid');maj(function(x){x.suggestions[+t.dataset.s][t.dataset.c]=v})}};
 vue.onchange=function(e){var t=e.target;if(t.id==='orAjout'&&t.value){var v=t.value,l=t.selectedOptions[0].dataset.l||'Lien';if(v==='libre'){v='/';l='Nouveau lien'}maj(function(x){x.suggestions.push({libelle:l,cible:v})});vOrbe({})}
  if(t.name==='pres'||t.dataset.o==='cote')vOrbe({})}}

/* ================= Devis et factures ================= */
var filtre='tous',docId=null;
function clientDe(d){return d.client||compta.clients.filter(function(c){return c.id===d.clientId})[0]||null}
function nomClient(c){return c?(c.societe?c.societe+(c.nom?' · '+c.nom:''):c.nom):'—'}
function vDocs(o){docId=o.id||null;if(docId)return vDoc();var D=compta.docs,an=aujourdhui().slice(0,4);
 var attente=D.filter(function(d){return d.type==='devis'&&d.statut==='envoye'}),aEnc=D.filter(function(d){return d.type==='facture'&&d.statut==='emise'}),
  enc=D.filter(function(d){return d.type==='facture'&&d.statut==='payee'&&d.paiement&&d.paiement.date.slice(0,4)===an}).reduce(function(s,d){return s+R.total(d)},0)+D.filter(function(d){return d.type==='avoir'&&d.numero&&d.date.slice(0,4)===an}).reduce(function(s,d){return s+R.total(d)},0);
 var L=D.filter(function(d){return filtre==='tous'||d.type===filtre}).slice().sort(function(a,b){return(b.date||b.cree||'').localeCompare(a.date||a.cree||'')});
 var h='<h1>Devis et factures</h1><p class="sous">Numérotation continue et chronologique, facture figée une fois émise, avoir pour annuler. Les documents s\'impriment ou s\'enregistrent en PDF depuis votre navigateur.</p>'+
 (!compta.emetteur.siren&&!compta.emetteur.siret?'<p class="alerte">Renseignez d\'abord <button class="b b-s" type="button" data-aller="entreprise">Mon entreprise</button> : nom, adresse, SIREN, coordonnées bancaires.</p>':'')+
 '<div class="kpi"><div><span>Devis en attente</span><b>'+attente.length+'</b></div><div><span>Factures à encaisser</span><b>'+R.euros(aEnc.reduce(function(s,d){return s+R.total(d)},0))+'</b></div><div><span>Encaissé en '+an+'</span><b>'+R.euros(enc)+'</b></div><div><span>Brouillons</span><b>'+D.filter(function(d){return!d.numero}).length+'</b></div></div>'+
 '<div class="lgn" style="justify-content:space-between;margin-bottom:10px"><span class="seg" role="group" aria-label="Filtrer">'+[['tous','Tous'],['devis','Devis'],['facture','Factures'],['avoir','Avoirs']].map(function(f){return'<button type="button" data-f="'+f[0]+'" aria-pressed="'+(f[0]===filtre)+'">'+f[1]+'</button>'}).join('')+'</span><span class="lgn"><button class="b" type="button" data-nouveau="devis">+ Devis</button><button class="b b-p" type="button" data-nouveau="facture">+ Facture</button></span></div>'+
 (L.length?'<div class="tabw"><table class="tab"><thead><tr><th>Numéro</th><th>Type</th><th>Client</th><th>Objet</th><th>Date</th><th class="n">Montant</th><th>Statut</th></tr></thead><tbody>'+L.map(function(d){return'<tr class="cl" data-doc="'+esc(d.id)+'" tabindex="0"><td style="font-family:var(--mono)">'+esc(d.numero||'—')+'</td><td>'+R.TYPES_DOC[d.type].nom+'</td><td>'+esc(nomClient(clientDe(d)))+'</td><td>'+esc(d.objet)+'</td><td>'+esc(R.frDate(d.date)||'')+'</td><td class="n">'+R.euros(R.total(d))+'</td><td><span class="statut '+d.statut+'">'+R.STATUTS[d.type][d.statut]+'</span></td></tr>'}).join('')+'</tbody></table></div>':'<p class="info">Aucun document pour l\'instant.</p>');
 vue.innerHTML=h;
 vue.onclick=function(e){var b=e.target.closest('[data-f],[data-nouveau],[data-doc]');if(!b)return;if(b.dataset.f){filtre=b.dataset.f;vDocs({});return}
  if(b.dataset.nouveau){var d=R.doc({type:b.dataset.nouveau,lignes:[{designation:'',quantite:1,unite:'',pu:0}],cree:new Date().toISOString()});compta.docs.push(d);sauverCompta();vDocs({id:d.id});return}
  vDocs({id:b.dataset.doc})};
 vue.onkeydown=function(e){var r=e.target.closest('[data-doc]');if(r&&e.key==='Enter')vDocs({id:r.dataset.doc})}}
function vDoc(){var d=compta.docs.filter(function(x){return x.id===docId})[0];if(!d){docId=null;return vDocs({})}var T=R.TYPES_DOC[d.type].nom,fige=!!d.numero,cl=clientDe(d);
 var h='<p><button class="b b-s" type="button" id="dRetour">← Tous les documents</button></p><h1>'+T+' '+esc(d.numero||'(brouillon)')+' <span class="statut '+d.statut+'">'+R.STATUTS[d.type][d.statut]+'</span></h1>';
 if(fige){h+='<p class="sous">Émis le '+R.frDate(d.date)+' pour '+esc(nomClient(cl))+'. Un document émis ne se modifie plus'+(d.type==='facture'?' : pour l\'annuler, créez un avoir.':'.')+'</p>'+
  '<div class="carte pile"><div class="tabw"><table class="tab"><thead><tr><th>Désignation</th><th class="n">Qté</th><th>Unité</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>'+d.lignes.map(function(l){return'<tr><td>'+esc(l.designation)+'</td><td class="n">'+String(l.quantite).replace('.',',')+'</td><td>'+esc(l.unite)+'</td><td class="n">'+R.euros(l.pu)+'</td><td class="n">'+R.euros(R.totalLigne(l))+'</td></tr>'}).join('')+'</tbody></table></div><div class="totaux"><span>Total</span><b>'+R.euros(R.total(d))+'</b></div></div>'+
  '<div class="lgn" style="margin-top:14px"><button class="b b-p" type="button" id="dImp">Imprimer ou PDF</button>'+
  (d.type==='devis'&&d.statut==='envoye'?'<button class="b" type="button" id="dAccepte">Accepté : créer la facture</button><button class="b" type="button" id="dRefuse">Refusé</button>':'')+
  (d.type==='facture'&&d.statut==='emise'?'<span class="lgn"><input type="date" id="dPayeD" value="'+aujourdhui()+'" style="width:auto" aria-label="Date du paiement"><select id="dPayeM" style="width:auto" aria-label="Mode de paiement"><option>Virement</option><option>Chèque</option><option>Espèces</option><option>Carte</option></select><button class="b" type="button" id="dPaye">Marquer payée</button></span>':'')+
  (d.type!=='devis'?'<button class="b" type="button" id="dFx" title="Les données de la facture électronique, à transmettre par votre plateforme agréée">Factur-X (XML)</button>':'')+(d.type==='facture'?'<button class="b" type="button" id="dAvoir">Créer un avoir</button>':'')+'<button class="b" type="button" id="dDup">Dupliquer en brouillon</button></div>'+(d.paiement?'<p class="leg">Payée le '+R.frDate(d.paiement.date)+' · '+esc(d.paiement.mode)+'</p>':'')}
 else{h+='<p class="sous">Brouillon : modifiable librement. Le numéro est attribué à l\'émission.</p><div class="carte pile">'+
  '<div class="g2">'+champ('Client','<select id="dCli"><option value="">— choisir —</option>'+compta.clients.map(function(c){return'<option value="'+esc(c.id)+'"'+(c.id===d.clientId?' selected':'')+'>'+esc(nomClient(c))+'</option>'}).join('')+'</select>')+'<label class="ch"><span>&nbsp;</span><button class="b" type="button" id="dNouvCli">+ Nouveau client</button></label></div>'+
  '<div class="g2">'+champ('Objet','<input data-d="objet" maxlength="200" value="'+esc(d.objet)+'" placeholder="Création d\'un site vitrine">')+champ(d.type==='devis'?'Livraison prévue (facultatif)':'Date ou période de la prestation','<input data-d="prestation" maxlength="120" value="'+esc(d.prestation)+'" placeholder="Octobre 2026">')+'</div>'+
  (d.type!=='devis'?'<div class="g2">'+champ('Nature de l\'opération','<select data-d="nature">'+Object.keys(R.NATURES).map(function(k){return'<option value="'+k+'"'+(k===d.nature?' selected':'')+'>'+R.NATURES[k]+'</option>'}).join('')+'</select>')+champ('Adresse de livraison (si différente)','<input data-d="livraison" maxlength="400" value="'+esc(d.livraison)+'" placeholder="Sinon, l\'adresse du client">')+'</div>':'')+
  '<div class="g2">'+champ('Date d\'émission','<input type="date" data-d="date" value="'+esc(d.date||aujourdhui())+'">')+champ(d.type==='devis'?'Valable jusqu\'au (sinon '+compta.emetteur.validite+' jours)':'Échéance (sinon à réception)','<input type="date" data-d="echeance" value="'+esc(d.echeance||'')+'">')+'</div>'+
  '<div class="tabw"><table class="tab lignes"><thead><tr><th>Désignation</th><th class="n">Qté</th><th>Unité</th><th class="n">Prix unitaire (€)</th><th class="n">Total</th><th><span class="sr">Retirer</span></th></tr></thead><tbody>'+d.lignes.map(function(l,i){return'<tr><td class="des"><input data-l="'+i+'" data-c="designation" value="'+esc(l.designation)+'" aria-label="Désignation ligne '+(i+1)+'"></td><td class="q"><input type="number" step="any" data-l="'+i+'" data-c="quantite" value="'+l.quantite+'" aria-label="Quantité"></td><td class="u"><input data-l="'+i+'" data-c="unite" value="'+esc(l.unite)+'" placeholder="forfait" aria-label="Unité"></td><td class="pu"><input type="number" step="0.01" data-l="'+i+'" data-c="pu" value="'+l.pu+'" aria-label="Prix unitaire"></td><td class="n" data-tl="'+i+'">'+R.euros(R.totalLigne(l))+'</td><td><button class="b b-s" type="button" data-lx="'+i+'" aria-label="Retirer la ligne">×</button></td></tr>'}).join('')+'</tbody></table></div>'+
  '<div class="lgn" style="justify-content:space-between"><button class="b b-s" type="button" id="dLigne">+ Ligne</button><div class="totaux"><span>Total (TVA non applicable)</span><b id="dTot">'+R.euros(R.total(d))+'</b></div></div>'+
  champ('Notes (imprimées sur le document)','<textarea data-d="notes" rows="2">'+esc(d.notes)+'</textarea>')+'</div>'+
  '<div class="lgn" style="margin-top:14px"><button class="b" type="button" id="dImp">Aperçu imprimable</button><button class="b b-iris" type="button" id="dEmettre">Émettre '+(d.type==='devis'?'le devis':d.type==='avoir'?'l\'avoir':'la facture')+'</button><button class="b b-dg" type="button" id="dSuppr">Supprimer le brouillon</button></div><p class="leg" id="dManque"></p><p class="leg" id="dAvert" style="color:#FCD34D"></p>'}
 vue.innerHTML=h;var m=R.manques(compta,d);if(!fige&&m.length)$('dManque').textContent='Avant d\'émettre, il manque : '+m.join(', ')+'.';var av=R.avertissements(compta,d);if(!fige&&av.length&&$('dAvert'))$('dAvert').textContent=av.join(' ');
 vue.oninput=function(e){if(fige)return;var t=e.target;if(t.dataset.d){d[t.dataset.d]=t.value}else if(t.dataset.l!=null){var l=d.lignes[+t.dataset.l];l[t.dataset.c]=t.type==='number'?parseFloat(t.value)||0:t.value;var c=vue.querySelector('[data-tl="'+t.dataset.l+'"]');c&&(c.textContent=R.euros(R.totalLigne(R.ligne(l))));$('dTot').textContent=R.euros(R.total({lignes:d.lignes.map(R.ligne)}))}
  else if(t.id==='dCli')d.clientId=t.value||null;else return;enregistrerDoc(d)};
 vue.onchange=function(e){if(e.target.id==='dCli'){d.clientId=e.target.value||null;enregistrerDoc(d);vDoc()}else if(e.target.dataset.d==='nature'){d.nature=e.target.value;enregistrerDoc(d)}};
 vue.onclick=function(e){var b=e.target.closest('button');if(!b)return;var id=b.id;
  if(id==='dRetour'){docId=null;vDocs({})}
  else if(id==='dLigne'){d.lignes.push({designation:'',quantite:1,unite:'',pu:0});enregistrerDoc(d);vDoc()}
  else if(b.dataset.lx!=null){d.lignes.splice(+b.dataset.lx,1);enregistrerDoc(d);vDoc()}
  else if(id==='dNouvCli'){aller('clients',{nouveau:true,retour:d.id})}
  else if(id==='dImp')imprimer(d);
  else if(id==='dFx'){try{var ori=d.origine&&compta.docs.filter(function(x){return x.id===d.origine})[0];telecharger('factur-x-'+d.numero+'.xml',new Blob([R.facturX(R.doc(d),ori)],{type:'application/xml'}));toast('Fichier Factur-X (XML CII, profil BASIC) téléchargé. Votre plateforme agréée le transmettra.')}catch(err){toast(err.message,true)}}
  else if(id==='dSuppr')confirmer(b,'Confirmer : supprimer',function(){compta.docs=compta.docs.filter(function(x){return x!==d});sauverCompta();docId=null;vDocs({})});
  else if(id==='dEmettre'){var mq=R.manques(compta,R.doc(d));if(mq.length){toast('Il manque : '+mq.join(', ')+'.',true);return}
   confirmer(b,'Confirmer : une fois émis, plus de modification',function(){try{compta=R.emettre(compta,d.id,d.date||aujourdhui());sauverCompta();toast(T+' émis : '+compta.docs.filter(function(x){return x.id===d.id})[0].numero+'. Pensez à sauvegarder.');vDoc()}catch(err){toast(err.message,true)}})}
  else if(id==='dAccepte'){var r=R.devisVersFacture(compta,d.id);compta=r.compta;sauverCompta();docId=r.id;vDoc();toast('Facture créée en brouillon depuis le devis.')}
  else if(id==='dRefuse'){d.statut='refuse';sauverCompta();vDoc()}
  else if(id==='dPaye'){var dt=$('dPayeD').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(dt))return toast('Date de paiement invalide.',true);d.statut='payee';d.paiement={date:dt,mode:$('dPayeM').value};sauverCompta();vDoc()}
  else if(id==='dAvoir')confirmer(b,'Confirmer : créer un avoir',function(){var r=R.avoirDe(compta,d.id);compta=r.compta;sauverCompta();docId=r.id;vDoc()});
  else if(id==='dDup'){var n=R.doc({type:d.type==='avoir'?'facture':d.type,clientId:d.clientId,objet:d.objet,prestation:'',lignes:d.lignes,notes:'',cree:new Date().toISOString()});compta.docs.push(n);sauverCompta();docId=n.id;vDoc()}}}
var encDoc=null;function enregistrerDoc(d){clearTimeout(encDoc);encDoc=setTimeout(function(){var i=compta.docs.indexOf(d);if(i<0)return;compta.docs[i]=R.doc(d);Object.assign(d,compta.docs[i]);compta.docs[i]=d;sauverCompta();var m=R.manques(compta,R.doc(d)),p=$('dManque');if(p)p.textContent=m.length?'Avant d\'émettre, il manque : '+m.join(', ')+'.':'Prêt à émettre.'},300)}

/* le document imprimé : émetteur et client figés à l'émission ; un brouillon est marqué comme tel */
function imprimer(d0){var d=R.doc(d0),E=d.emetteur||compta.emetteur,c=clientDe(d)||{},T=R.TYPES_DOC[d.type].nom,ori=d.origine&&compta.docs.filter(function(x){return x.id===d.origine})[0];
 function l(x){return x?esc(x)+'\n':''}
 var h='<div class="doc-i">'+(d.numero?'':'<p style="font:700 12pt var(--ui);color:#B42318;border:2px solid #B42318;display:inline-block;padding:2px 8px;border-radius:4px">BROUILLON · sans valeur</p>')+
 '<div class="ent"><div><h1>'+T+'</h1><div class="num">'+esc(d.numero||'—')+'</div>'+(ori&&ori.numero?'<div style="font-size:9pt">'+(d.type==='avoir'?'Sur facture ':'Selon devis ')+esc(ori.numero)+'</div>':'')+'</div><div style="text-align:right;font-size:9.5pt">Date : '+esc(R.frDate(d.date)||R.frDate(aujourdhui()))+(d.echeance?'<br>'+(d.type==='devis'?'Valable jusqu\'au ':'Échéance : ')+esc(R.frDate(d.echeance)):'')+(d.prestation?'<br>'+(d.type==='devis'?'Livraison prévue : ':'Prestation : ')+esc(d.prestation):'')+'</div></div>'+
 '<div class="blocs"><div class="bloc"><small>Émetteur</small><b>'+esc(E.nom)+(E.statut?' '+esc(E.statut):'')+'</b>\n'+l(E.commercial)+l(E.adresse)+(E.siret?'SIRET '+esc(E.siret)+'\n':E.siren?'SIREN '+esc(E.siren)+'\n':'')+(E.ape?'APE '+esc(E.ape)+'\n':'')+l(E.email)+l(E.tel)+l(E.site)+'</div>'+
 '<div class="bloc"><small>Client</small><b>'+esc(c.societe||c.nom||'')+'</b>\n'+(c.societe&&c.nom?l(c.nom):'')+l(c.adresse)+(c.siren?'SIREN '+esc(c.siren)+'\n':'')+l(c.email)+l(c.tel)+'</div></div>'+
 (d.objet?'<p><b>Objet :</b> '+esc(d.objet)+'</p>':'')+(d.livraison?'<p><b>Adresse de livraison :</b> '+esc(d.livraison)+'</p>':'')+
 '<table><thead><tr><th>Désignation</th><th class="n">Qté</th><th>Unité</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>'+d.lignes.map(function(x){return'<tr><td>'+esc(x.designation)+'</td><td class="n">'+String(x.quantite).replace('.',',')+'</td><td>'+esc(x.unite)+'</td><td class="n">'+R.euros(x.pu)+'</td><td class="n">'+R.euros(R.totalLigne(x))+'</td></tr>'}).join('')+'</tbody></table>'+
 '<div class="tot"><div><span>'+(d.type==='avoir'?'Total de l\'avoir':d.type==='devis'?'Total':'Total à payer')+'</span><span>'+R.euros(R.total(d))+'</span></div></div>'+
 (d.notes?'<p style="white-space:pre-line;margin-top:14px">'+esc(d.notes)+'</p>':'')+
 (d.type==='facture'&&(E.iban||E.bic)?'<div class="banque"><b>Règlement par virement</b><br>'+(E.banque?esc(E.banque)+' · ':'')+'IBAN '+esc(E.iban)+(E.bic?' · BIC '+esc(E.bic):'')+'<br>Référence à indiquer : '+esc(d.numero||'')+'</div>':'')+
 '<div class="ment">'+R.mentions(d,E).map(function(x){return'<div>'+esc(x)+'</div>'}).join('')+'</div>'+
 (d.type==='devis'?'<div class="accord"><div>Le client · date et signature</div><div>'+esc(E.nom)+'</div></div>':'')+'</div>';
 $('impression').innerHTML=h;setTimeout(function(){window.print()},60)}

/* ================= Clients ================= */
var cliId=null,cliRetour=null;
function vClients(o){if(o.nouveau){var c=R.client({});compta.clients.push(c);sauverCompta();cliId=c.id;cliRetour=o.retour||null}var C=compta.clients,c=C.filter(function(x){return x.id===cliId})[0];
 var h='<h1>Clients</h1><p class="sous">Les coordonnées sont reprises sur les devis et factures, puis figées au moment de l\'émission.</p><div class="lgn" style="margin-bottom:12px"><button class="b b-p" type="button" id="clNouv">+ Nouveau client</button>'+(cliRetour?'<button class="b" type="button" id="clRetour">← Revenir au document</button>':'')+'</div>';
 if(c)h+='<div class="carte pile" style="margin-bottom:16px"><h3>'+esc(nomClient(c)||'Nouveau client')+'</h3><div class="g2">'+champ('Nom et prénom','<input data-c="nom" value="'+esc(c.nom)+'" autocomplete="off">')+champ('Société (facultatif)','<input data-c="societe" value="'+esc(c.societe)+'">')+'</div>'+champ('Adresse','<textarea data-c="adresse" rows="2">'+esc(c.adresse)+'</textarea>')+
  '<div class="g3">'+champ('E-mail','<input data-c="email" type="email" value="'+esc(c.email)+'">')+champ('Téléphone','<input data-c="tel" value="'+esc(c.tel)+'">')+champ('SIREN (client pro)','<input data-c="siren" value="'+esc(c.siren)+'">')+'</div><label class="lgn"><input type="checkbox" data-c="pro"'+(c.pro?' checked':'')+'> Client professionnel (mention de l\'indemnité de 40 €)</label><div class="lgn"><button class="b b-s" type="button" id="clFermer">Fermer</button><button class="b b-s b-dg" type="button" id="clSuppr">Supprimer</button></div></div>';
 h+=C.length?'<div class="tabw"><table class="tab"><thead><tr><th>Client</th><th>E-mail</th><th>Téléphone</th><th class="n">Documents</th></tr></thead><tbody>'+C.map(function(x){var n=compta.docs.filter(function(d){return d.clientId===x.id}).length;return'<tr class="cl" data-cl="'+esc(x.id)+'" tabindex="0"><td>'+esc(nomClient(x)||'(sans nom)')+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.tel)+'</td><td class="n">'+n+'</td></tr>'}).join('')+'</tbody></table></div>':'<p class="info">Aucun client pour l\'instant.</p>';
 vue.innerHTML=h;
 vue.oninput=function(e){var t=e.target;if(!c||!t.dataset.c)return;c[t.dataset.c]=t.type==='checkbox'?t.checked:t.value;sauverCompta()};
 vue.onclick=function(e){var b=e.target.closest('button,[data-cl]');if(!b)return;
  if(b.dataset.cl){cliId=b.dataset.cl;vClients({});return}
  if(b.id==='clNouv')vClients({nouveau:true,retour:cliRetour});
  else if(b.id==='clFermer'){cliId=null;vClients({})}
  else if(b.id==='clRetour'){var d=compta.docs.filter(function(x){return x.id===cliRetour})[0];if(d&&c&&!d.clientId){d.clientId=c.id;sauverCompta()}var r=cliRetour;cliRetour=null;aller('docs',{id:r})}
  else if(b.id==='clSuppr'){if(compta.docs.some(function(d){return d.clientId===c.id}))return toast('Ce client a des documents : il ne peut pas être supprimé.',true);confirmer(b,'Confirmer la suppression',function(){compta.clients=compta.clients.filter(function(x){return x!==c});sauverCompta();cliId=null;vClients({})})}};
 vue.onkeydown=function(e){var r=e.target.closest('[data-cl]');if(r&&e.key==='Enter'){cliId=r.dataset.cl;vClients({})}}}

/* ================= Mon entreprise ================= */
var CHAMPS_E=[['nom','Nom et prénom (tels que déclarés)','input'],['statut','Statut accolé au nom','input','EI'],['commercial','Nom commercial (facultatif)','input'],['adresse','Adresse','textarea'],['siren','SIREN (9 chiffres)','input'],['siret','SIRET (14 chiffres)','input'],['ape','Code APE (facultatif)','input'],['email','E-mail','input'],['tel','Téléphone','input'],['site','Site web','input'],
 ['iban','IBAN','input'],['bic','BIC','input'],['banque','Banque','input'],['assurance','Assurance professionnelle (si obligatoire pour votre activité)','input'],
 ['tva','Mention de TVA','input'],['paiement','Conditions de paiement','textarea'],['escompte','Escompte','input'],['penalites','Pénalités de retard','textarea'],['indemnite','Indemnité forfaitaire de recouvrement','textarea'],['validite','Validité des devis (jours)','number']];
function vEntreprise(){var E=compta.emetteur;
 vue.innerHTML='<h1>Mon entreprise</h1><p class="sous">Ces informations s\'impriment sur vos devis et factures. Elles restent dans ce navigateur et dans vos sauvegardes, jamais sur le site.</p>'+
 '<p class="info">Les mentions proposées correspondent au cas courant d\'un micro-entrepreneur en franchise de TVA. Faites-les valider par votre expert-comptable ; à partir de 2026–2027, la facturation électronique devient progressivement obligatoire en France : prévoyez, le moment venu, la plateforme agréée qui transmettra vos factures.</p>'+
 '<div class="carte pile" style="margin-top:14px"><div class="g2">'+CHAMPS_E.map(function(f){var v=E[f[0]];return f[2]==='textarea'?'<div style="grid-column:1/-1">'+champ(esc(f[1]),'<textarea data-e="'+f[0]+'" rows="2">'+esc(v)+'</textarea>')+'</div>':champ(esc(f[1]),'<input data-e="'+f[0]+'"'+(f[2]==='number'?' type="number" min="1" max="365"':'')+' value="'+esc(v)+'"'+(f[3]?' placeholder="'+f[3]+'"':'')+'>')}).join('')+'</div>'+
 '<div class="lgn"><button class="b b-s" type="button" id="eDefaut">Remettre les mentions par défaut</button></div></div>';
 vue.oninput=function(e){var t=e.target;if(!t.dataset.e)return;E[t.dataset.e]=t.type==='number'?Math.max(1,Math.min(365,parseInt(t.value,10)||30)):t.value;sauverCompta()};
 vue.onclick=function(e){if(e.target.id==='eDefaut'){var M=R.MENTIONS_DEFAUT;['tva','paiement','penalites','indemnite','escompte','validite'].forEach(function(k){E[k]=M[k]});sauverCompta();vEntreprise();toast('Mentions par défaut rétablies.')}}}

/* ================= Publier et sauvegarder ================= */
function vPublier(){var nb=Object.keys(cfg.pages).reduce(function(s,k){return s+cfg.pages[k].appareils.length},0),nm=Object.keys(cfg.medias).length,sv=compta.sauvegarde,ndoc=compta.docs.length;
 var jours=sv?Math.floor((Date.now()-Date.parse(sv))/864e5):null;
 vue.innerHTML='<h1>Publier et sauvegarder</h1><p class="sous">Le site ne change que quand le fichier de configuration est déposé dans le dépôt : aucune publication automatique.</p>'+
 '<div class="carte pile"><h3>Le site</h3><p>'+(modifie()?'<b>Vos réglages diffèrent de la version publiée.</b>':'Vos réglages sont identiques à la version publiée.')+' '+nb+' appareil'+(nb>1?'s':'')+' sur '+Object.keys(cfg.pages).length+' page'+(Object.keys(cfg.pages).length>1?'s':'')+', '+Object.keys(cfg.orbe).length+' réglage'+(Object.keys(cfg.orbe).length>1?'s':'')+' d\'orbe, '+nm+' média'+(nm>1?'s':'')+' importé'+(nm>1?'s':'')+'.</p>'+
 '<div class="lgn"><button class="b b-p" type="button" id="pJson">Télécharger site.json</button>'+(nm?'<button class="b" type="button" id="pZip">Télécharger le paquet (.zip, avec les médias)</button>':'')+'<label class="b">Importer un site.json<input type="file" id="pImp" accept="application/json,.json" hidden></label><button class="b b-dg" type="button" id="pRaz">Revenir à la version publiée</button></div>'+
 '<ol class="leg" style="margin:0;padding-left:18px"><li>Téléchargez le fichier (ou le paquet si vous avez importé des images ou des vidéos).</li><li>Déposez <code>site.json</code> dans <code>regie/</code> et les médias dans <code>regie/medias/</code>, puis ouvrez une PR — ou envoyez simplement le fichier à Claude.</li><li>Après fusion, tous les visiteurs voient vos réglages.</li></ol>'+
 '<p class="leg">« Aperçu de mes réglages » (en haut) vous montre le brouillon sur le vrai site, dans ce navigateur seulement.</p></div>'+
 '<div class="carte pile" style="margin-top:14px"><h3>Devis, factures et clients</h3>'+(ndoc&&(jours===null||jours>7)?'<p class="alerte">'+(jours===null?'Aucune sauvegarde encore.':'Dernière sauvegarde il y a '+jours+' jours.')+' Ces données ne vivent que dans ce navigateur : un nettoyage du navigateur les effacerait.</p>':'<p class="leg">'+(sv?'Dernière sauvegarde : '+R.frDate(sv.slice(0,10))+'.':'Aucune sauvegarde encore.')+'</p>')+
 '<div class="lgn"><button class="b b-p" type="button" id="cExp">Exporter la sauvegarde (.json)</button><label class="b">Restaurer une sauvegarde<input type="file" id="cImp" accept="application/json,.json" hidden></label></div><p class="leg">Gardez vos sauvegardes en lieu sûr : elles contiennent vos clients et vos coordonnées bancaires.</p></div>'+
 '<div class="carte pile" style="margin-top:14px"><h3>Demandes de contact</h3><p class="leg">Le formulaire en bas de la Page Zéro vous envoie chaque demande par e-mail (adresse réglée côté serveur). Répondez depuis votre messagerie, puis créez le devis ici.</p><span><button class="b" type="button" id="cDevis">+ Créer un devis</button></span></div>';
 vue.onclick=function(e){var b=e.target.closest('button');if(!b)return;
  if(b.id==='pJson')telecharger('site.json',new Blob([JSON.stringify(propre(),null,1)],{type:'application/json'}));
  else if(b.id==='pZip')paquet();
  else if(b.id==='pRaz')confirmer(b,'Confirmer : effacer mon brouillon',function(){cfg=R.config(copie(publie));sauverCfg(true);vPublier();toast('Brouillon remplacé par la version publiée.')});
  else if(b.id==='cExp'){compta.sauvegarde=new Date().toISOString();sauverCompta();telecharger('aime-compta-'+aujourdhui()+'.json',new Blob([JSON.stringify(compta,null,1)],{type:'application/json'}));vPublier()}
  else if(b.id==='cDevis'){var d=R.doc({type:'devis',lignes:[{designation:'',quantite:1,unite:'',pu:0}],cree:new Date().toISOString()});compta.docs.push(d);sauverCompta();aller('docs',{id:d.id})}};
 $('pImp').onchange=function(){var f=this.files[0];this.value='';lireFichier(f,function(t){var c=R.config(JSON.parse(t));cfg=c;sauverCfg(true);vPublier();toast('Configuration importée dans le brouillon.')})};
 $('cImp').onchange=function(){var f=this.files[0];this.value='';lireFichier(f,function(t){var c=R.compta(t);if(compta.docs.length&&!window.__aimeConfirmeRestauration){window.__aimeConfirmeRestauration=t;toast('Restaurer remplacera vos '+compta.docs.length+' documents actuels. Choisissez de nouveau le fichier pour confirmer.',true);return}delete window.__aimeConfirmeRestauration;compta=c;sauverCompta();vPublier();toast('Sauvegarde restaurée : '+c.docs.length+' documents, '+c.clients.length+' clients.')})}}
function lireFichier(f,ok){if(!f)return;if(f.size>20e6)return toast('Fichier trop lourd.',true);var r=new FileReader();r.onload=function(){try{ok(String(r.result))}catch(e){toast(e.message||'Fichier illisible.',true)}};r.readAsText(f)}
function paquet(){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=function(){var z=new JSZip(),P=propre();z.file('site.json',JSON.stringify(P,null,1));
  Promise.all(Object.keys(cfg.medias).map(function(id){return mediaLire(id).then(function(v){if(v)z.file('medias/'+id+'.'+cfg.medias[id].ext,v.blob)})})).then(function(){return z.generateAsync({type:'blob'})}).then(function(b){telecharger('regie-'+aujourdhui()+'.zip',b)})};
 s.onerror=function(){toast('Impossible de charger l\'outil .zip. Téléchargez site.json et ajoutez les médias à la main.',true)};if(window.JSZip)s.onload();else document.head.appendChild(s)}

/* ---------- aperçu sur le vrai site ---------- */
var ap=$('apercu');ap.checked=lire(CLE_A)==='1';ap.onchange=function(){ecrire(CLE_A,ap.checked?'1':'0');toast(ap.checked?'Aperçu activé : ouvrez une page du site dans ce navigateur pour voir votre brouillon.':'Aperçu désactivé : vous voyez la version publiée.')};

/* ---------- départ : la version publiée sert de base au premier brouillon ---------- */
fetch('/regie/site.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(j){try{publie=R.config(j||{})}catch(e){publie=R.vide()}
 if(!cfg){cfg=R.config(copie(publie));ecrire(CLE_B,JSON.stringify(cfg))}etatPub();var h=(location.hash||'').slice(1);if(h==='nouveau-devis')return nouveauDevis();aller(VUES[h]?h:(lire(CLE_O)||'pages'))});
/* l'OS (ou un lien) peut changer de vue par l'adresse : #docs, #orbe, #edition, #nouveau-devis */
function nouveauDevis(){var d=R.doc({type:'devis',lignes:[{designation:'',quantite:1,unite:'',pu:0}],cree:new Date().toISOString()});compta.docs.push(d);sauverCompta();aller('docs',{id:d.id})}
addEventListener('hashchange',function(){var h=(location.hash||'').slice(1);if(h==='nouveau-devis')return nouveauDevis();if(VUES[h]&&h!==courant)aller(h)});
})();
