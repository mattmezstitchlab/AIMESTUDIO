/* AIME · générateur de site : l'éditeur. Il ne dessine rien lui-même : chaque aperçu et chaque export passent par le moteur
   partagé (AIMESite.document / exporter). Ici : la structure (pages, sections), le contenu (écrit une fois), le style,
   l'historique (annuler / rétablir), et la persistance locale (localStorage « aime-sites »), dite comme telle. */
(function(){'use strict';
var S=window.AIMESite,N=window.AIMENav;if(!S)return;
var $=function(i){return document.getElementById(i)},esc=S.esc,CLE='aime-sites';
var MODELES=[],PRES=null,VUES=[],etat={sites:{},cur:null},site=null,page='index',sel=null,persp='public',passe=[],futur=[],tSave=0;
function dire(t){var v=$('vivant');v.textContent='';setTimeout(function(){v.textContent=t},30);clearTimeout(dire.t);dire.t=setTimeout(function(){v.textContent=''},6000)}
function lire(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.sites)return o}catch(e){}return{sites:{},cur:null}}
function ecrire(){try{localStorage.setItem(CLE,JSON.stringify(etat));return true}catch(e){dire('Enregistrement impossible : ce navigateur est plein (les photos prennent de la place). Exportez le site, puis retirez des photos.');return false}}
function charger(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}

/* ---------- modifier : chaque geste passe ici (historique, date, enregistrement, aperçu) ---------- */
function changer(f,silence){passe.push(JSON.stringify(site));if(passe.length>60)passe.shift();futur=[];f(site);site.majLe=new Date().toISOString();etat.sites[site.id]=site;clearTimeout(tSave);tSave=setTimeout(ecrire,250);boutons();if(!silence)tout()}
function annuler(){if(!passe.length)return;futur.push(JSON.stringify(site));site=JSON.parse(passe.pop());etat.sites[site.id]=site;ecrire();boutons();tout();dire('Annulé.')}
function retablir(){if(!futur.length)return;passe.push(JSON.stringify(site));site=JSON.parse(futur.pop());etat.sites[site.id]=site;ecrire();boutons();tout();dire('Rétabli.')}
function boutons(){$('annuler').disabled=!passe.length;$('retablir').disabled=!futur.length}
function pageCour(){return site.pages.filter(function(p){return p.id===page})[0]||site.pages[0]}
function secCour(){var l=pageCour().sections;return l.filter(function(s){return s.id===sel})[0]||null}

/* ---------- ouvrir, créer ---------- */
function ouvrir(id){site=S.migrer(etat.sites[id]);if(!site)return accueil();etat.cur=id;ecrire();page=site.pages[0].id;sel=null;passe=[];futur=[];boutons();$('accueil').hidden=true;$('atelier').hidden=false;listeSites();tout()}
function accueil(){$('accueil').hidden=false;$('atelier').hidden=true;listeSites();demosUI();
 $('modeles').innerHTML=MODELES.map(function(m){var a=ambi(m.ambiance);return'<li><button type="button" class="modele" data-modele="'+esc(m.id)+'" style="--m1:'+a.c1+';--m2:'+a.c2+';--mf:'+a.fond+';--me:'+a.encre+'"><span class="m-v" aria-hidden="true"><i></i><i></i><i></i></span><b>'+esc(m.nom)+'</b><span>'+esc(m.description)+'</span><small>'+m.pages.length+' page'+(m.pages.length>1?'s':'')+' · '+esc(a.nom)+'</small></button></li>'}).join('')}
var DEMOS=[['mariage','Mariage · Léa & Marc','Dix personnes, neuf moments dont quatre réservés à l\'équipe, un menu, une cagnotte.','m_sauge'],['seminaire','Séminaire · Maison Orée','Un séminaire de 250 personnes : déroulé, équipe, transports.','e_navy'],['world','AIME WORLD · Paris / New York','Un mariage parisien à New York : moments, échéances, voyageurs.','m_nuit']];
function demosUI(){$('demos').innerHTML=DEMOS.map(function(d){var a=ambi(d[3]);return'<li><button type="button" class="modele" data-demo="'+d[0]+'" style="--m1:'+a.c1+';--m2:'+a.c2+';--mf:'+a.fond+';--me:'+a.encre+'"><span class="m-v" aria-hidden="true"><i></i><i></i><i></i></span><b>'+esc(d[1])+'</b><span>'+esc(d[2])+'</span><small>Données fictives · 5 pages · rôles réels</small></button></li>'}).join('')}
function depuisDemo(u){var d=DEMOS.filter(function(x){return x[0]===u})[0];charger('/vitrine/donnees/'+u+'.json').then(function(j){var s=S.depuisVitrine(j,{ambiance:d[3]});s.creeLe=s.majLe=new Date().toISOString();etat.sites[s.id]=s;ecrire();ouvrir(s.id);dire('« '+d[1]+' » est devenu un site à modifier. Essayez « Voir comme » : chaque rôle voit ce que les règles lui permettent.')}).catch(function(){dire('Démonstrateur indisponible.')})}
function creer(mid){var m=MODELES.filter(function(x){return x.id===mid})[0];if(!m)return;var s=S.appliquerModele(S.vide(m.univers),m);s.nom=m.nom===('Page blanche')?'Mon site':m.nom+' · '+new Date().toLocaleDateString('fr-FR');s.creeLe=s.majLe=new Date().toISOString();etat.sites[s.id]=s;ecrire();ouvrir(s.id);dire('Site créé à partir du modèle « '+m.nom+' ». Remplacez les textes d\'exemple dans « Contenu ».')}
function listeSites(){var ids=Object.keys(etat.sites).sort(function(a,b){return String(etat.sites[b].majLe||'').localeCompare(String(etat.sites[a].majLe||''))});
 $('choixSite').innerHTML='<option value="">'+(ids.length?'Choisir un site…':'Aucun site encore')+'</option>'+ids.map(function(i){return'<option value="'+esc(i)+'"'+(site&&site.id===i?' selected':'')+'>'+esc(etat.sites[i].nom)+'</option>'}).join('')}
function ambi(id){return(PRES.ambiances.filter(function(a){return a.id===id})[0])||PRES.ambiances[0]}

/* ---------- tout redessiner (structure, réglages, aperçu) ---------- */
function tout(){if(!site)return;$('comparer').href='/synchroview/?v='+['public','proche','pro','coord'].map(function(c){return site.id+'.'+c+'.pc.ici'}).join(',');pagesUI();sectionsUI();reglages();apercu()}
function pagesUI(){var G=pageCour().mode==='grille';$('pageMode').setAttribute('aria-pressed',String(G));$('pageMode').textContent=G?'Grille ✓':'Grille';[].forEach.call(document.querySelectorAll('[data-meteo]'),function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-meteo')==='1')===!!site.infos.pluie))});$('pages').innerHTML=site.pages.map(function(p){return'<button type="button" role="tab" data-page="'+esc(p.id)+'" aria-selected="'+(p.id===page)+'">'+esc(p.titre)+'</button>'}).join('');$('pageSuppr').disabled=site.pages.length<2||page==='index'}
function sectionsUI(){var l=pageCour().sections;
 $('sections').innerHTML=l.length?l.map(function(s,i){var b=S.BLOCS[s.type]||{nom:s.type,variantes:{}},org=s.audience&&s.audience!=='public';return'<li class="'+(s.id===sel?'on':'')+'"><button type="button" class="sec-n" data-sel="'+esc(s.id)+'"><b>'+esc(b.nom)+'</b><span>'+esc(s.titre||(pageCour().mode==='grille'?(S.FORMES[s.type]?b.variantes[S.formeDe(s.type,s.w)]+' · ':'')+s.w+' col.':b.variantes[s.variante])||'')+(org?' · '+S.AUDIENCES[s.audience]:'')+'</span></button><span class="sec-a"><button type="button" class="mini" data-monter="'+esc(s.id)+'" aria-label="Monter '+esc(b.nom)+'"'+(i?'':' disabled')+'>↑</button><button type="button" class="mini" data-descendre="'+esc(s.id)+'" aria-label="Descendre '+esc(b.nom)+'"'+(i<l.length-1?'':' disabled')+'>↓</button><button type="button" class="mini" data-dupliquer="'+esc(s.id)+'" aria-label="Dupliquer '+esc(b.nom)+'">⧉</button><button type="button" class="mini" data-retirer="'+esc(s.id)+'" aria-label="Retirer '+esc(b.nom)+'">×</button></span></li>'}).join(''):'<li class="vide">Cette page est vide : ajoutez une section.</li>'}
function catalogueUI(){var par={};Object.keys(S.BLOCS).forEach(function(k){var b=S.BLOCS[k];(par[b.cat]=par[b.cat]||[]).push(b)});
 $('catalogue').innerHTML=Object.keys(S.CATS).filter(function(c){return par[c]}).map(function(c){return'<div><h3>'+esc(S.CATS[c])+'</h3><ul>'+par[c].map(function(b){return'<li><button type="button" data-ajout="'+esc(b.id)+'">'+esc(b.nom)+(b.source?'<small>lit « '+esc(etiquetteListe(b.source))+' »</small>':'')+'</button></li>'}).join('')+'</ul></div>'}).join('')}

/* ---------- réglages : section, contenu, style ---------- */
var ONGLET='section';
function champ(lbl,html){return'<label class="ch"><span>'+esc(lbl)+'</span>'+html+'</label>'}
function inp(k,v,o){o=o||{};return o.multi?'<textarea data-k="'+esc(k)+'" rows="'+(o.rows||4)+'">'+esc(v)+'</textarea>':'<input data-k="'+esc(k)+'" value="'+esc(v)+'"'+(o.type?' type="'+o.type+'"':'')+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+'>'}
function reglages(){$('o-section').innerHTML=regSection();$('o-contenu').innerHTML=regContenu();$('o-style').innerHTML=regStyle()}
function regSection(){var s=secCour();if(!s)return'<p class="aide">Choisissez une section dans la liste, ou cliquez-la dans l\'aperçu.</p>';var b=S.BLOCS[s.type];
 var h='<h2 class="gen-h">'+esc(b.nom)+'</h2>';
 if(Object.keys(b.variantes).length>1)h+=champ('Forme','<select data-sk="variante">'+Object.keys(b.variantes).map(function(v){return'<option value="'+esc(v)+'"'+(v===s.variante?' selected':'')+'>'+esc(b.variantes[v])+'</option>'}).join('')+'</select>');
 b.champs.forEach(function(c){h+=champ(S.CHAMPS[c]||c,c==='texte'?'<textarea data-sk="texte" rows="5">'+esc(s.texte||'')+'</textarea>':c==='src'?'<span class="ch-img"><input data-sk="src" value="'+esc(s.src&&s.src.indexOf('data:')===0?'(image importée)':s.src||'')+'" placeholder="https://…"'+(s.src&&s.src.indexOf('data:')===0?' readonly':'')+'><button type="button" class="mini" data-img-sec="1">Importer</button></span>':'<input data-sk="'+esc(c)+'" value="'+esc(s[c]||'')+'">')});
 if(pageCour().mode==='grille'){var fo=S.FORMES[s.type]?' · forme : '+(S.BLOCS[s.type].variantes[S.formeDe(s.type,s.w)]||''):'';h+=champ('Largeur (colonnes sur 12)'+fo,'<input type="number" min="2" max="12" data-sk="w" value="'+(s.w||6)+'">')}
 if(b.source)h+='<p class="aide">Cette section lit « '+esc(etiquetteListe(b.source))+' » dans l\'onglet Contenu : écrit une fois, affiché partout où il sert. <button type="button" class="lienb" data-aller-liste="'+esc(b.source)+'">Modifier la liste</button></p>';
 h+=champ('Qui voit cette section','<select data-sk="audience">'+Object.keys(S.AUDIENCES).map(function(a){return'<option value="'+a+'"'+((s.audience||'public')===a?' selected':'')+'>'+esc(S.AUDIENCES[a])+'</option>'}).join('')+'</select>')+'<p class="aide">Décidé par les mêmes règles que les espaces partagés (SynchroView). Ici, c\'est un aperçu ; en ligne, le serveur ne transmettra pas une section à qui n\'a pas le droit de la voir. Un site exporté en fichiers ne contient que ce qui est pour tout le monde.</p>';
 return h}
var LIBL={programme:'Programme',faq:'Questions',personnes:'Personnes',galerie:'Galerie',documents:'Documents',cadeaux:'Cadeaux',hebergements:'Hébergements',menu:'Menu',tarifs:'Tarifs',chiffres:'Chiffres',etapes:'Chronologie',liens:'Liens',partenaires:'Partenaires'};
var LIBC={heure:'Heure',titre:'Titre',detail:'Détail',q:'Question',r:'Réponse',nom:'Nom',role:'Rôle',src:'Image',legende:'Légende',lien:'Lien',plat:'Plat',prix:'Prix',valeur:'Valeur',libelle:'Libellé',date:'Date',url:'Adresse'};
function etiquetteListe(k){return LIBL[k]||k}
var INFOS=[['titre','Titre du site'],['sous','Phrase d\'accroche'],['date','Date','date'],['heure','Heure','time'],['lieu','Lieu'],['adresse','Adresse'],['ville','Ville'],['acces','Accès, parking'],['planB','Plan B en cas de pluie'],['email','E-mail (réponses, contact)','email'],['tel','Téléphone','tel'],['url','Lien du bouton principal'],['bouton','Texte du bouton principal']];
var OUVERTE=null;
function regContenu(){var h='<label class="ch"><span>Nom du site (pour vous)</span><input data-nom value="'+esc(site.nom)+'"></label><details class="bloc-c" open><summary>Infos <small>écrites une fois, reprises partout</small></summary>'+INFOS.map(function(f){return champ(f[1],'<input data-info="'+f[0]+'" value="'+esc(site.infos[f[0]]||'')+'"'+(f[2]?' type="'+f[2]+'"':'')+'>')}).join('')+'</details>';
 Object.keys(S.LISTES).forEach(function(k){var cols=S.LISTES[k],l=site.listes[k];
  h+='<details class="bloc-c" data-liste="'+k+'"'+(OUVERTE===k?' open':'')+'><summary>'+esc(LIBL[k])+' <small>'+l.length+'</small></summary><ol class="lignes">'+l.map(function(r,i){return'<li>'+cols.map(function(c){return k==='galerie'&&c==='src'?(S.img(r.src)?'<img class="vign" src="'+esc(r.src)+'" alt="">':'<input data-l="'+k+'" data-i="'+i+'" data-c="src" value="'+esc(r.src||'')+'" placeholder="https://…">'):'<input data-l="'+k+'" data-i="'+i+'" data-c="'+c+'" value="'+esc(r[c]||'')+'" placeholder="'+esc(LIBC[c]||c)+'" aria-label="'+esc(LIBC[c]||c)+' '+(i+1)+'">'}).join('')+'<select data-l="'+k+'" data-i="'+i+'" data-c="audience" aria-label="Qui voit la ligne '+(i+1)+'" title="Qui voit cette ligne">'+Object.keys(S.AUDIENCES).map(function(a){return'<option value="'+a+'"'+((r.audience||'public')===a?' selected':'')+'>'+esc({public:'Tous',membres:'Membres',equipe:'Équipe',organisation:'Orga'}[a])+'</option>'}).join('')+'</select><button type="button" class="mini" data-lsuppr="'+k+'" data-i="'+i+'" aria-label="Retirer la ligne '+(i+1)+'">×</button></li>'}).join('')+'</ol><button type="button" class="mini" data-lajout="'+k+'">+ Ajouter</button>'+(k==='galerie'?' <button type="button" class="mini" data-img-gal="1">Importer des photos</button>':'')+'</details>'});
 return h}
function regStyle(){var p=site.presentation;return'<h2 class="gen-h">Ambiance <small>36, reprises d\'AIME Studio</small></h2><div class="ambs">'+PRES.ambiances.map(function(a){return'<button type="button" class="amb" data-amb="'+esc(a.id)+'" aria-pressed="'+(a.id===p.ambiance)+'" title="'+esc(a.nom)+'" style="--a1:'+a.c1+';--a2:'+a.c2+';--af:'+a.fond+';--ae:'+a.encre+'"><i></i><span>'+esc(a.nom)+'</span></button>'}).join('')+'</div>'+
 champ('Typographie','<select data-pres="typo"><option value="">Celle de l\'ambiance</option>'+Object.keys(PRES.typographies).map(function(k){return'<option value="'+esc(k)+'"'+(k===p.typo?' selected':'')+'>'+esc(PRES.typographies[k].nom)+'</option>'}).join('')+'</select>')+
 champ('Arrondis','<input type="range" min="0" max="32" step="2" data-pres="rayon" value="'+(p.rayon!=null?p.rayon:ambi(p.ambiance).rayon)+'">')+
 champ('Espacement','<select data-pres="densite"><option value="aere"'+(p.densite!=='compact'?' selected':'')+'>Aéré</option><option value="compact"'+(p.densite==='compact'?' selected':'')+'>Compact</option></select>')+
 '<p class="aide">Contraste : le texte posé sur la couleur principale choisit tout seul le plus lisible du fond ou de l\'encre.</p>'}

/* ---------- l'aperçu : le moteur, dans un cadre ---------- */
function apercu(){var f=$('apercu'),y=0;try{y=f.contentWindow.scrollY}catch(e){}var d=S.document(site,{page:page,vue:vueDe(persp),regles:window.AIMEPerms,presentation:PRES,edition:true});f.srcdoc=d.html;
 f.onload=function(){try{var doc=f.contentDocument;doc.documentElement.style.scrollBehavior='auto';f.contentWindow.scrollTo(0,y);doc.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault()}if(glisse){glisse=false;e.stopPropagation();return}var s=e.target.closest('[data-sec]');if(s){choisir(s.getAttribute('data-sec'),true)}},true);marquer();onde(doc);grilleEdition(doc)}catch(e){}};
 var V=vueInfo(persp),m=d.bilan.masquees;$('noteP').textContent='Vue « '+V.label+' »'+(V.role?' (rôle '+V.role+')':' (sans compte)')+' : '+d.bilan.sections+' section'+(d.bilan.sections>1?'s':'')+(m.length?', '+m.length+' masquée'+(m.length>1?'s':'')+' ('+m.map(function(x){return x.titre||x.nom}).join(', ')+')':'')+(d.bilan.lignesMasquees?', '+d.bilan.lignesMasquees+' ligne'+(d.bilan.lignesMasquees>1?'s':'')+' masquée'+(d.bilan.lignesMasquees>1?'s':''):'')+'. Les liens ne s\'ouvrent pas dans l\'aperçu.'}
/* ---------- l'onde : une info change, les blocs qui l'affichent s'allument, avec « Annuler » ---------- */
var VAGUE=null,tOnde=0;
function vague(types){if(!types)return;VAGUE=(VAGUE||[]).concat(types)}
function onde(doc){if(!VAGUE)return;var T=VAGUE;VAGUE=null;var n=0,el=[].filter.call(doc.querySelectorAll('[data-t]'),function(e){return T.indexOf(e.getAttribute('data-t'))>=0});
 el.forEach(function(e,i){setTimeout(function(){e.classList.remove('hit');void e.offsetWidth;e.classList.add('hit')},Math.min(900,i*120));n++});
 if(!n)return;var o=$('onde');o.querySelector('span').textContent=n+' bloc'+(n>1?'s':'')+' mis à jour';o.hidden=false;clearTimeout(tOnde);tOnde=setTimeout(function(){o.hidden=true},5000)}
$('ondeAnnuler').addEventListener('click',function(){$('onde').hidden=true;premier=null;annuler()});
/* ---------- la grille libre : glisser pour déplacer, poignée pour agrandir (la hauteur suit la largeur) ---------- */
var glisse=false;
function grilleEdition(doc){var g=doc.querySelector('.grille');if(!g||pageCour().mode!=='grille')return;
 var st=doc.createElement('style');st.textContent='.gb{cursor:grab;touch-action:none;user-select:none}.gb .poi{position:absolute;right:6px;bottom:6px;width:18px;height:18px;border-radius:6px;background:#7C5CFF;box-shadow:0 0 0 3px #fff;cursor:nwse-resize;z-index:5}.gb.glisse{z-index:9;opacity:.9;box-shadow:0 24px 60px rgba(0,0,0,.35);cursor:grabbing}.fantome{border:2px dashed #7C5CFF;border-radius:12px;background:rgba(124,92,255,.10);pointer-events:none}.fantome b{display:block;margin:6px;font:600 12px system-ui;color:#5B3FE0}';doc.head.appendChild(st);
 [].forEach.call(g.querySelectorAll('.gb'),function(b){var h=doc.createElement('span');h.className='poi';h.setAttribute('aria-hidden','true');b.appendChild(h)});
 g.addEventListener('pointerdown',function(e){var b=e.target.closest('.gb');if(!b||e.button)return;var rs=e.target.classList.contains('poi'),R=g.getBoundingClientRect(),cell=(R.width+10)/12,t=b.getAttribute('data-t');
  var o={x:e.clientX,y:e.clientY,bx:+b.dataset.x,by:+b.dataset.y,bw:+b.dataset.w},n={x:o.bx,y:o.by,w:o.bw},bouge=false,f=doc.createElement('div');f.className='fantome';
  b.setPointerCapture(e.pointerId);
  function mv(ev){var dx=ev.clientX-o.x,dy=ev.clientY-o.y;if(!bouge&&Math.hypot(dx,dy)<6)return;if(!bouge){bouge=true;b.classList.add('glisse');g.appendChild(f)}
   if(rs){n.w=Math.max(2,Math.min(12-o.bx,o.bw+Math.round(dx/cell)))}else{n.x=Math.max(0,Math.min(12-o.bw,o.bx+Math.round(dx/cell)));n.y=Math.max(0,o.by+Math.round(dy/cell));b.style.transform='translate('+dx+'px,'+dy+'px)'}
   f.style.gridColumn=(n.x+1)+' / span '+n.w;f.style.gridRow=(n.y+1)+' / span '+S.hauteur(t,n.w);f.innerHTML='<b>'+n.w+' × '+S.hauteur(t,n.w)+(S.FORMES[t]?' · '+S.BLOCS[t].variantes[S.formeDe(t,n.w)]:'')+'</b>'}
  function up(){b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',up);b.removeEventListener('pointercancel',up);if(!bouge)return;glisse=true;f.remove();b.classList.remove('glisse');b.style.transform='';var id=b.id;
   changer(function(){var l=pageCour().sections,s=l.filter(function(q){return q.id===id})[0];if(s){s.x=n.x;s.y=n.y;s.w=n.w;S.tasser(l,id)}});sel=id;setTimeout(function(){glisse=false},50)}
  b.addEventListener('pointermove',mv);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)})}
function vueInfo(id){return VUES.filter(function(v){return v.id===id})[0]||VUES[0]}
function vueDe(id){var v=vueInfo(id);return v.role?{id:'apercu-'+v.id,role:v.role}:null}
function marquer(){try{var doc=$('apercu').contentDocument;[].forEach.call(doc.querySelectorAll('[data-sec]'),function(e){e.classList.toggle('sel',e.getAttribute('data-sec')===sel)});if(sel){var e=doc.querySelector('[data-sec="'+sel+'"]');if(e){var r=e.getBoundingClientRect();if(r.top<0||r.top>doc.defaultView.innerHeight*.7)e.scrollIntoView({block:'start'})}}}catch(e){}}
function choisir(id,depuisApercu){sel=id;sectionsUI();ONG('section');$('o-section').innerHTML=regSection();if(depuisApercu){var b=document.querySelector('[data-sel="'+id+'"]');b&&b.scrollIntoView({block:'nearest'})}marquer()}
function ONG(o){ONGLET=o;[].forEach.call(document.querySelectorAll('[data-onglet]'),function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-onglet')===o))});['section','contenu','style'].forEach(function(k){$('o-'+k).hidden=k!==o})}

/* ---------- images importées : réduites, en JPEG, gardées dans le site ---------- */
function reduire(file,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var M=1600,k=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.82))};im.onerror=function(){dire('Image illisible.')};im.src=r.result};r.readAsDataURL(file)}
var cibleImg=null;
$('fichierImg').addEventListener('change',function(){var fs=[].slice.call(this.files||[]),t=cibleImg;this.value='';if(!fs.length)return;
 if(t==='gal'){var n=0,urls=[];fs.slice(0,12).forEach(function(f){reduire(f,function(u){urls.push(u);if(++n===Math.min(12,fs.length)){OUVERTE='galerie';changer(function(s){urls.forEach(function(x){s.listes.galerie.push({src:x,legende:''})})});dire(urls.length+' photo'+(urls.length>1?'s':'')+' ajoutée'+(urls.length>1?'s':'')+' à la galerie.')}})})}
 else if(t==='sec')reduire(fs[0],function(u){changer(function(){var s=secCour();if(s)s.src=u})})});

/* ---------- les gestes ---------- */
document.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var d=b.dataset;
 if(d.modele){creer(d.modele);return}
 if(d.demo){depuisDemo(d.demo);return}
 if(d.page){page=d.page;sel=null;tout();return}
 if(d.sel){choisir(d.sel);return}
 if(d.monter||d.descendre){var id=d.monter||d.descendre;changer(function(){var l=pageCour().sections,i=l.map(function(s){return s.id}).indexOf(id),j=i+(d.monter?-1:1);if(j<0||j>=l.length)return;var t=l[i];l[i]=l[j];l[j]=t});return}
 if(d.dupliquer){changer(function(){var l=pageCour().sections,i=l.map(function(s){return s.id}).indexOf(d.dupliquer),c=JSON.parse(JSON.stringify(l[i]));c.id=S.uid('x');if(pageCour().mode==='grille'){var p=S.placeLibre(l,c.w,S.hauteur(c.type,c.w));c.x=p.x;c.y=p.y}l.splice(i+1,0,c);sel=c.id});return}
 if(d.retirer){var nomB=(S.BLOCS[(pageCour().sections.filter(function(s){return s.id===d.retirer})[0]||{}).type]||{}).nom;changer(function(){var l=pageCour().sections;l.splice(l.map(function(s){return s.id}).indexOf(d.retirer),1);if(sel===d.retirer)sel=null});dire('Section « '+nomB+' » retirée. « Annuler » la remet.');return}
 if(d.ajout){var nv;changer(function(s){nv=S.ajouterSection(s,page,d.ajout,sel);var pg=s.pages.filter(function(q){return q.id===page})[0];if(pg.mode==='grille'){nv.w=S.LARGEUR[nv.type]||6;var p=S.placeLibre(pg.sections.filter(function(q){return q!==nv}),nv.w,S.hauteur(nv.type,nv.w));nv.x=p.x;nv.y=p.y}});sel=nv.id;$('catalogue').hidden=true;$('ajout').setAttribute('aria-expanded','false');tout();choisir(nv.id);return}
 if(d.onglet){ONG(d.onglet);return}
 if(d.amb){changer(function(s){s.presentation.ambiance=d.amb;s.presentation.rayon=null});return}
 if(d.lajout){OUVERTE=d.lajout;changer(function(s){var o={};S.LISTES[d.lajout].forEach(function(c){o[c]=''});s.listes[d.lajout].push(o)});ONG('contenu');var x=document.querySelector('[data-liste="'+d.lajout+'"] li:last-child input');x&&x.focus();return}
 if(d.lsuppr){OUVERTE=d.lsuppr;changer(function(s){s.listes[d.lsuppr].splice(+d.i,1)});ONG('contenu');return}
 if(d.allerListe){OUVERTE=d.allerListe;$('o-contenu').innerHTML=regContenu();ONG('contenu');var dl=document.querySelector('[data-liste="'+d.allerListe+'"]');dl&&dl.scrollIntoView({block:'start'});return}
 if(d.imgGal){cibleImg='gal';$('fichierImg').multiple=true;$('fichierImg').click();return}
 if(d.imgSec){cibleImg='sec';$('fichierImg').multiple=false;$('fichierImg').click();return}
 if(d.taille){[].forEach.call(document.querySelectorAll('[data-taille]'),function(x){x.setAttribute('aria-pressed',String(x===b))});$('apercu').style.width=d.taille;return}
 if(d.persp){persp=d.persp;[].forEach.call(document.querySelectorAll('[data-persp]'),function(x){x.setAttribute('aria-pressed',String(x===b))});apercu();return}
 if(d.exp){menuExp(false);exporter(d.exp);return}
 if(d.meteo!=null){var on=d.meteo==='1';vague(S.DEPS.pluie);changer(function(s){s.infos.pluie=on});return}
});
/* les saisies : l'aperçu suit à la frappe, l'historique garde un état par champ modifié */
var tIn=0,premier=null;
document.addEventListener('input',function(e){var t=e.target,d=t.dataset;if(!site)return;
 var appliquer=null;
 if(d.sk)appliquer=function(){var s=secCour();if(!s)return;if(d.sk==='w'){var w=Math.max(2,Math.min(12,+t.value||6));s.w=w;s.x=Math.min(s.x||0,12-w);S.tasser(pageCour().sections,s.id)}else s[d.sk]=t.value};
 else if(d.info)appliquer=function(s){s.infos[d.info]=t.value;vague(S.DEPS[d.info])};
 else if(d.nom!=null)appliquer=function(s){s.nom=t.value};
 else if(d.l)appliquer=function(s){s.listes[d.l][+d.i][d.c]=t.value;OUVERTE=d.l;vague(S.DEPS[d.l])};
 else if(d.pres)appliquer=function(s){s.presentation[d.pres]=d.pres==='rayon'?+t.value:(t.value||null)};
 if(!appliquer)return;
 if(premier!==t){premier=t;passe.push(JSON.stringify(site));futur=[];boutons()}
 appliquer(site);site.majLe=new Date().toISOString();etat.sites[site.id]=site;clearTimeout(tIn);tIn=setTimeout(function(){ecrire();apercu();if(d.nom!=null)listeSites();sectionsUI()},220)});
document.addEventListener('change',function(e){var t=e.target,d=t.dataset;if(!site)return;
 if(d.sk==='variante'||d.sk==='audience'||d.pres||d.c==='audience'){premier=null;tout()}});
document.addEventListener('focusout',function(){premier=null});

$('choixSite').addEventListener('change',function(){if(this.value)ouvrir(this.value)});
$('nouveau').addEventListener('click',function(){site=null;accueil()});
$('annuler').addEventListener('click',annuler);$('retablir').addEventListener('click',retablir);
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();e.shiftKey?retablir():annuler()}if(e.key==='Escape'){menuExp(false);if(!$('catalogue').hidden){$('catalogue').hidden=true;$('ajout').setAttribute('aria-expanded','false');$('ajout').focus()}}});
$('ajout').addEventListener('click',function(){var o=$('catalogue').hidden;$('catalogue').hidden=!o;this.setAttribute('aria-expanded',String(o));if(o){var f=$('catalogue').querySelector('button');f&&f.focus()}});
$('pageMode').addEventListener('click',function(){var G=pageCour().mode==='grille';changer(function(){if(G)S.versSections(pageCour());else S.versGrille(pageCour())});dire(G?'Page en sections : les blocs se suivent, dans l\'ordre de la grille.':'Grille libre : glissez les blocs, agrandissez-les par la poignée violette. La date, le lieu et les personnes changent de forme avec leur largeur.')});
$('pageAjout').addEventListener('click',function(){var t='Nouvelle page',id;changer(function(s){id=S.slug(t);while(s.pages.some(function(p){return p.id===id}))id+='-2';s.pages.push({id:id,titre:t,sections:[]})});page=id;sel=null;tout();dire('Page ajoutée. « Renommer » pour lui donner un titre.')});
$('pageRenommer').addEventListener('click',function(){var p=pageCour(),b=document.querySelector('[data-page="'+p.id+'"]'),i=document.createElement('input');i.value=p.titre;i.className='ren';i.setAttribute('aria-label','Titre de la page');b.replaceWith(i);i.focus();i.select();
 var fin=function(ok){if(ok&&i.value.trim()&&i.value.trim()!==p.titre)changer(function(){p.titre=i.value.trim().slice(0,40)});else pagesUI()};i.addEventListener('keydown',function(e){if(e.key==='Enter')fin(true);if(e.key==='Escape')fin(false)});i.addEventListener('blur',function(){fin(true)})});
$('pageSuppr').addEventListener('click',function(){if(page==='index')return;var t=pageCour().titre;changer(function(s){s.pages=s.pages.filter(function(p){return p.id!==page})});page='index';sel=null;tout();dire('Page « '+t+' » supprimée. « Annuler » la remet.')});
$('importer').addEventListener('click',function(){$('fichierSite').click()});
$('fichierSite').addEventListener('change',function(){var f=this.files[0];this.value='';if(!f)return;var r=new FileReader();r.onload=function(){try{var s=S.migrer(JSON.parse(r.result));if(!s)throw 0;if(etat.sites[s.id])s.id=S.uid('site-');etat.sites[s.id]=s;ecrire();ouvrir(s.id);dire('Site « '+s.nom+' » importé.')}catch(e){dire('Ce fichier n\'est pas un site AIME.')}};r.readAsText(f)});
function menuExp(on){$('menuExp').hidden=!on;$('exporter').setAttribute('aria-expanded',String(on))}
$('exporter').addEventListener('click',function(e){e.stopPropagation();menuExp($('menuExp').hidden)});
document.addEventListener('click',function(e){if(!e.target.closest('.gen-exp'))menuExp(false)});

/* ---------- exporter : des fichiers autonomes ---------- */
function telecharger(nom,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}
function charge(src){return new Promise(function(ok,ko){if(window.JSZip)return ok();var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)})}
function exporter(k){var base=S.slug(site.infos.titre||site.nom);
 if(k==='json'){telecharger(base+'.aime-site.json',new Blob([JSON.stringify(site,null,1)],{type:'application/json'}));dire('Données du site exportées.');return}
 if(k==='une'){telecharger(base+'.html',new Blob([S.exporter(site,{presentation:PRES,unePage:true})[0].contenu],{type:'text/html'}));dire('Le site en une seule page est prêt.');return}
 if(k==='onglet'){var u=URL.createObjectURL(new Blob([S.document(site,{page:page,perspective:persp,presentation:PRES}).html],{type:'text/html'}));window.open(u,'_blank','noopener');return}
 if(k==='zip')charge('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(function(){var z=new JSZip();S.exporter(site,{presentation:PRES}).forEach(function(f){z.file(f.chemin,f.contenu)});z.file('site.aime.json',JSON.stringify(site,null,1));
  z.file('LISEZ-MOI.txt','Site exporté depuis le générateur AIME.\nOuvrez index.html dans un navigateur, ou déposez ces fichiers chez votre hébergeur.\nLes polices viennent de Google Fonts. Les réponses (RSVP) ouvrent la messagerie du visiteur : rien n\'est envoyé sans lui.\nsite.aime.json se réimporte dans le générateur.\n');
  return z.generateAsync({type:'blob'})}).then(function(b){if(b){telecharger(base+'.zip',b);dire('Le site est prêt : '+site.pages.length+' page'+(site.pages.length>1?'s':'')+' HTML et les données, dans '+base+'.zip.')}}).catch(function(){dire('Export .zip impossible (bibliothèque non chargée). Essayez « Une seule page ».')})}

/* ---------- démarrage ---------- */
Promise.all([charger('/vitrine/modeles/sites.json'),charger('/vitrine/presentation/studio.json'),charger('/vitrine/perspectives/sites.json')]).then(function(r){MODELES=r[0].modeles;PRES=r[1];VUES=r[2].vues;
 $('persps').innerHTML=VUES.map(function(p){return'<button type="button" data-persp="'+esc(p.id)+'" aria-pressed="'+(p.id===persp)+'" title="'+esc(p.description)+'">'+esc(p.label)+'</button>'}).join('');catalogueUI();
 etat=lire();var q=new URLSearchParams(location.search).get('site');if(q&&etat.sites[q])ouvrir(q);else if(etat.cur&&etat.sites[etat.cur])ouvrir(etat.cur);else accueil()})
 .catch(function(){document.body.insertAdjacentHTML('beforeend','<p class="e-vide" style="margin:20px">Le générateur n\'a pas pu charger ses modèles. Rechargez la page.</p>')});
window.AIMEGenerateur={site:function(){return site},exporter:function(o){return S.exporter(site,Object.assign({presentation:PRES},o||{}))}};
})();
