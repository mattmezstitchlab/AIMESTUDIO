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
/* ---------- le « + » : comme sur la landing, vos informations puis les blocs, rangés en familles de six au plus (les mêmes que la landing pour Présenter, Organiser et Relier).
   Un toucher pose le bloc ; en grille libre, on peut aussi le glisser à sa place. Chaque bloc du moteur est dans une famille, une seule fois. */
var PALETTE=[["Présenter",["hero","video","texte","galerie","citation","bouton"]],["Organiser",["date","programme","lieu","compte","rsvp","faq"]],["Relier",["contact","personnes","gens","liens","documents","cadeaux"]],["Compléter",["endroit","hebergement","menu","image","separateur","partenaires"]],["Activité",["tarifs","chiffres","etapes"]]];
var ICO={hero:'<path d="M4 6h16M4 11h11M4 16h7"/>',texte:'<path d="M5 7h14M5 12h14M5 17h9"/>',citation:'<path d="M7 9h3v4H6v-2a4 4 0 0 1 2-3.5M15 9h3v4h-4v-2a4 4 0 0 1 2-3.5"/>',bouton:'<rect x="3" y="8.5" width="18" height="7" rx="3.5"/><path d="M9 12h6"/>',separateur:'<path d="M4 12h16"/><circle cx="12" cy="12" r="1.5"/>',image:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',galerie:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',video:'<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M10.5 9.5v5l4-2.5z"/>',compte:'<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M10 3h4"/>',programme:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',lieu:'<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',rsvp:'<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',faq:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5M12 16.5v.2"/>',hebergement:'<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',menu:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2.5 5-2.5 8H17v10"/>',cadeaux:'<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1-3-5-4-5-1.5S12 9 12 9zm0 0c1-3 5-4 5-1.5S12 9 12 9z"/>',contact:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',personnes:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',liens:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',documents:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',partenaires:'<path d="M3 12l4-4 3 2 4-4 4 4 3-2v6l-6 5-4-3-3 2-5-4z"/>',tarifs:'<path d="M20 12l-8 8-8-8V4h8z"/><circle cx="8" cy="8" r="1.4"/>',chiffres:'<path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/>',etapes:'<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',date:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',endroit:'<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><path d="M9.5 10h5"/>',gens:'<circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M7.8 7.6l2.8 7.8M16.2 7.6l-2.8 7.8M8 7h8"/>'};
var ICO_INF={titre:'<path d="M4 6h16M12 6v13"/>',sous:'<path d="M5 9h14M5 14h9"/>',date:ICO.date,heure:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',lieu:ICO.lieu,adresse:'<path d="M4 10l8-6 8 6v10H4z"/><path d="M10 20v-5h4v5"/>',ville:'<path d="M4 20V9l5-3v14M9 20V4l6 4v12M15 20v-8l5 2v6"/>',acces:'<path d="M5 18h14M7 18l2-8h6l2 8M10 6h4"/>',planB:'<path d="M5 15a7 7 0 0 1 14 0z"/><path d="M12 8V5M12 15v4a2 2 0 0 1-3 1.5"/>',email:ICO.rsvp,tel:ICO.contact,url:ICO.liens,bouton:ICO.bouton};
var VUEPAL='info';
function svg(p){return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(p||'<circle cx="12" cy="12" r="7"/>')+'</svg>'}
function catalogueUI(){$('ptabs').innerHTML='<button type="button" class="gp-t" data-pal="info" aria-pressed="'+(VUEPAL==='info')+'">← Vos informations</button>'+PALETTE.map(function(f,i){return'<button type="button" class="gp-t" data-pal="'+i+'" aria-pressed="'+(VUEPAL===i)+'">'+esc(f[0])+'</button>'}).join('')+'<button type="button" class="gp-x" data-pal="fermer" aria-label="Fermer">×</button>';
 if(VUEPAL==='info'){$('tray').className='gp-tray inf';$('tray').innerHTML=INFOS.map(function(f){return'<label class="gp-tile inf"><span class="il">'+svg(ICO_INF[f[0]])+esc(f[1])+'</span><input data-info="'+f[0]+'" value="'+esc(site&&site.infos[f[0]]||'')+'"'+(f[2]?' type="'+f[2]+'"':'')+'></label>'}).join('')+'<p class="gp-aide">Écrites une fois, reprises partout : en-tête, compte à rebours, plan, réponse.</p>';return}
 $('tray').className='gp-tray';$('tray').innerHTML=PALETTE[VUEPAL][1].filter(function(k){return S.BLOCS[k]}).map(function(k){var b=S.BLOCS[k];return'<button type="button" class="gp-tile" data-ajout="'+esc(k)+'" aria-label="Ajouter : '+esc(b.nom)+'" title="'+esc(b.source?'Lit « '+etiquetteListe(b.source)+' »':b.nom)+'">'+svg(ICO[k])+'<span>'+esc(b.nom)+'</span></button>'}).join('')}
function palette(on,vue){var P=$('catalogue');if(vue!=null)VUEPAL=vue;if(on){catalogueUI()}P.hidden=!on;$('plus').setAttribute('aria-expanded',String(on));$('ajout').setAttribute('aria-expanded',String(on));if(on){var f=P.querySelector('[aria-pressed=true]')||P.querySelector('button');f&&f.focus()}}

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
/* un bloc s'écrit dans le site ; la grille repousse ce qui chevauche */
function placer(id,n){sel=id;changer(function(){var l=pageCour().sections,s=l.filter(function(q){return q.id===id})[0];if(s){s.x=n.x;s.y=n.y;s.w=n.w;S.tasser(l,id)}});sel=id;setTimeout(function(){glisse=false},50)}
function grilleEdition(doc){var g=doc.querySelector('.grille');if(!g||pageCour().mode!=='grille')return;
 var st=doc.createElement('style');st.textContent='.gb{cursor:grab;touch-action:none;user-select:none}.gb .poi{position:absolute;width:16px;height:16px;border-radius:5px;background:#7C5CFF;box-shadow:0 0 0 3px #fff;z-index:5;opacity:0;transition:opacity .15s}.gb:hover .poi,.gb.sel .poi{opacity:1}.poi.hg{left:5px;top:5px;cursor:nwse-resize}.poi.hd{right:5px;top:5px;cursor:nesw-resize}.poi.bg{left:5px;bottom:5px;cursor:nesw-resize}.poi.bd{right:5px;bottom:5px;cursor:nwse-resize}'+
  '.gb.glisse{z-index:9;opacity:.9;box-shadow:0 24px 60px rgba(0,0,0,.35);cursor:grabbing}.fantome{border:2px dashed #7C5CFF;border-radius:12px;background:rgba(124,92,255,.10);pointer-events:none;z-index:8}.fantome b{display:block;margin:6px;font:600 12px system-ui;color:#5B3FE0}.fantome.aligne{border-color:#16A34A;background:rgba(22,163,74,.08)}'+
  '.guide{position:absolute;pointer-events:none;background:#16A34A;z-index:10}.grille{position:relative}'+
  '.barre5{position:absolute;z-index:12;display:flex;gap:2px;padding:4px;border-radius:12px;background:#15131F;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:translateY(-100%);margin-top:-8px}.barre5 button{border:0;background:none;color:#EDEDF0;font:600 12px system-ui;padding:6px 8px;border-radius:8px;cursor:pointer}.barre5 button:hover{background:rgba(255,255,255,.1)}.barre5 i{width:1px;background:rgba(255,255,255,.15);margin:4px 2px}';doc.head.appendChild(st);
 [].forEach.call(g.querySelectorAll('.gb'),function(b){['hg','hd','bg','bd'].forEach(function(c){var h=doc.createElement('span');h.className='poi '+c;h.setAttribute('data-coin',c);h.setAttribute('aria-hidden','true');b.appendChild(h)})});
 var R0=function(){var R=g.getBoundingClientRect();return{R:R,cell:(R.width+10)/12}};
 /* les repères : verts quand un bord s'aligne sur celui d'un autre bloc */
 function guides(n,t,sauf){[].forEach.call(g.querySelectorAll('.guide'),function(x){x.remove()});var m=R0(),al=false,H=S.hauteur(t,n.w);
  pageCour().sections.forEach(function(o){if(o.id===sauf||o.x==null)return;[[o.x,n.x],[o.x+o.w,n.x+n.w],[o.x,n.x+n.w],[o.x+o.w,n.x]].forEach(function(p){if(p[0]===p[1]){al=true;var v=doc.createElement('i');v.className='guide';v.style.cssText='left:'+(p[0]*m.cell-5)+'px;top:0;bottom:0;width:2px';g.appendChild(v)}});
   [[o.y,n.y],[o.y+S.hauteur(o.type,o.w),n.y+H]].forEach(function(p){if(p[0]===p[1]){al=true;var v=doc.createElement('i');v.className='guide';v.style.cssText='top:'+(p[0]*m.cell-5)+'px;left:0;right:0;height:2px';g.appendChild(v)}})});return al}
 function fin(){[].forEach.call(g.querySelectorAll('.guide,.fantome'),function(x){x.remove()})}
 g.addEventListener('pointerdown',function(e){var b=e.target.closest('.gb');if(!b||e.button||e.target.closest('.barre5'))return;var coin=e.target.getAttribute('data-coin'),m=R0(),t=b.getAttribute('data-t');
  var o={x:e.clientX,y:e.clientY,bx:+b.dataset.x,by:+b.dataset.y,bw:+b.dataset.w},n={x:o.bx,y:o.by,w:o.bw},bouge=false,f=doc.createElement('div');f.className='fantome';b.setPointerCapture(e.pointerId);
  function mv(ev){var dx=ev.clientX-o.x,dy=ev.clientY-o.y;if(!bouge&&Math.hypot(dx,dy)<6)return;if(!bouge){bouge=true;b.classList.add('glisse');g.appendChild(f);cacherBarre()}
   if(coin){var dw=Math.round(dx/m.cell)*(coin[1]==='g'?-1:1),w=Math.max(2,Math.min(12,o.bw+dw));if(coin[1]==='g'){w=Math.min(w,o.bx+o.bw);n.x=o.bx+o.bw-w}else{w=Math.min(w,12-o.bx);n.x=o.bx}n.w=w;
    n.y=coin[0]==='h'?Math.max(0,o.by+S.hauteur(t,o.bw)-S.hauteur(t,w)):o.by}
   else{n.x=Math.max(0,Math.min(12-o.bw,o.bx+Math.round(dx/m.cell)));n.y=Math.max(0,o.by+Math.round(dy/m.cell));b.style.transform='translate('+dx+'px,'+dy+'px)'}
   f.style.gridColumn=(n.x+1)+' / span '+n.w;f.style.gridRow=(n.y+1)+' / span '+S.hauteur(t,n.w);f.classList.toggle('aligne',guides(n,t,b.id));f.innerHTML='<b>'+n.w+' × '+S.hauteur(t,n.w)+(S.FORMES[t]?' · '+S.BLOCS[t].variantes[S.formeDe(t,n.w)]:'')+'</b>'}
  function up(){b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',up);b.removeEventListener('pointercancel',up);if(!bouge)return;glisse=true;fin();b.classList.remove('glisse');b.style.transform='';placer(b.id,n)}
  b.addEventListener('pointermove',mv);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)});
 /* la petite barre du bloc choisi : teinte, arrondi, empattement, taille, dupliquer, retirer (comme la capsule du mini-site) */
 var barre=null;function cacherBarre(){if(barre){barre.remove();barre=null}}
 function montrerBarre(){cacherBarre();var b=sel&&doc.getElementById(sel);if(!b||!b.classList.contains('gb'))return;var s=secCour();if(!s)return;var stl=s.style||{};
  barre=doc.createElement('div');barre.className='barre5';barre.setAttribute('role','toolbar');barre.setAttribute('aria-label','Style du bloc');
  barre.innerHTML='<button type="button" data-b="teinte" title="Changer la teinte">Teinte</button><button type="button" data-b="arrondi" title="Arrondi : 0, 12 ou 26">Arrondi</button><button type="button" data-b="serif" title="Avec ou sans empattement">'+(stl.serif?'Sans':'Serif')+'</button><button type="button" data-b="moins" title="Texte plus petit">A−</button><button type="button" data-b="plus" title="Texte plus grand">A+</button><i></i><button type="button" data-b="dup">Dupliquer</button><button type="button" data-b="neutre" title="Revenir au style du site">Neutre</button><button type="button" data-b="suppr">Retirer</button>';
  barre.style.top=b.offsetTop+'px';g.appendChild(barre);barre.style.left=Math.max(0,Math.min(b.offsetLeft,g.clientWidth-barre.offsetWidth))+'px';
  barre.addEventListener('click',function(e){var k=(e.target.closest('[data-b]')||{}).getAttribute&&e.target.closest('[data-b]').getAttribute('data-b');if(!k)return;e.stopPropagation();
   if(k==='dup'){var bt=document.querySelector('[data-dupliquer="'+s.id+'"]');bt&&bt.click();return}if(k==='suppr'){var br=document.querySelector('[data-retirer="'+s.id+'"]');br&&br.click();return}
   changer(function(){var q=secCour();if(!q)return;var x=q.style||{};if(k==='teinte')x.teinte=((x.teinte==null?-45:x.teinte)+45)%360;if(k==='arrondi')x.arrondi=x.arrondi===0?12:x.arrondi===12?26:0;if(k==='serif')x.serif=!x.serif;if(k==='moins')x.taille=Math.max(.7,Math.round(((x.taille||1)-.1)*10)/10);if(k==='plus')x.taille=Math.min(1.6,Math.round(((x.taille||1)+.1)*10)/10);if(k==='neutre')x={};q.style=Object.keys(x).length?x:undefined})},true)}
 montrerBarre();grilleEdition.barre=montrerBarre}
/* glisser un module du catalogue jusque dans la grille (comme le « + » du mini-site) ; un simple clic le pose à la première place libre */
document.addEventListener('pointerdown',function(e){var b=e.target.closest('[data-ajout]');if(!b||e.button||!site||pageCour().mode!=='grille')return;var t=b.getAttribute('data-ajout'),f=$('apercu'),o={x:e.clientX,y:e.clientY},bouge=false,ghost=null,fan=null,pos=null;b.setPointerCapture(e.pointerId);
 function mv(ev){if(!bouge&&Math.hypot(ev.clientX-o.x,ev.clientY-o.y)<6)return;if(!bouge){bouge=true;ghost=document.createElement('div');ghost.className='gen-fantome';$('catalogue').classList.add('glisse');ghost.textContent=S.BLOCS[t].nom;document.body.appendChild(ghost)}
  ghost.style.transform='translate('+(ev.clientX+12)+'px,'+(ev.clientY+12)+'px)';var R=f.getBoundingClientRect(),doc=f.contentDocument,g=doc&&doc.querySelector('.grille');pos=null;if(fan){fan.remove();fan=null}
  if(!g||ev.clientX<R.left||ev.clientX>R.right||ev.clientY<R.top||ev.clientY>R.bottom)return;var gr=g.getBoundingClientRect(),cell=(gr.width+10)/12,w=S.LARGEUR[t]||6,x=Math.max(0,Math.min(12-w,Math.floor((ev.clientX-R.left-gr.left)/cell-w/2+.5))),y=Math.max(0,Math.floor((ev.clientY-R.top-gr.top)/cell));
  pos={x:x,y:y,w:w};fan=doc.createElement('div');fan.className='fantome';fan.style.gridColumn=(x+1)+' / span '+w;fan.style.gridRow=(y+1)+' / span '+S.hauteur(t,w);fan.innerHTML='<b>'+esc(S.BLOCS[t].nom)+'</b>';g.appendChild(fan)}
 function up(){b.removeEventListener('pointermove',mv);b.removeEventListener('pointerup',up);$('catalogue').classList.remove('glisse');if(ghost)ghost.remove();if(fan)fan.remove();if(!bouge)return;b.dataset.glisse='1';setTimeout(function(){delete b.dataset.glisse},60);
  if(!pos){dire('Lâchez le module sur la grille de l\'aperçu.');return}var nv;changer(function(s2){nv=S.ajouterSection(s2,page,t);nv.w=pos.w;nv.x=pos.x;nv.y=pos.y;S.tasser(pageCour().sections,nv.id)});sel=nv.id;tout();choisir(nv.id);dire('« '+S.BLOCS[t].nom+' » posé sur la grille.')}
 b.addEventListener('pointermove',mv);b.addEventListener('pointerup',up)},true);
function vueInfo(id){return VUES.filter(function(v){return v.id===id})[0]||VUES[0]}
function vueDe(id){var v=vueInfo(id);return v.role?{id:'apercu-'+v.id,role:v.role}:null}
function marquer(){try{var doc=$('apercu').contentDocument;[].forEach.call(doc.querySelectorAll('[data-sec]'),function(e){e.classList.toggle('sel',e.getAttribute('data-sec')===sel)});if(sel){var e=doc.querySelector('[data-sec="'+sel+'"]');if(e){var r=e.getBoundingClientRect();if(r.top<0||r.top>doc.defaultView.innerHeight*.7)e.scrollIntoView({block:'start'})}}}catch(e){}}
function choisir(id,depuisApercu){sel=id;sectionsUI();ONG('section');$('o-section').innerHTML=regSection();if(grilleEdition.barre)try{grilleEdition.barre()}catch(e){}if(depuisApercu){var b=document.querySelector('[data-sel="'+id+'"]');b&&b.scrollIntoView({block:'nearest'})}marquer()}
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
 if(d.imp==='landing'){$('fichierSite').click();return}
 if(d.imp==='dossier'||d.imp==='zip'){if(!$('droits').checked){dire('Cochez d\'abord : « Ce site m\'appartient, ou j\'ai l\'autorisation de le reprendre ».');$('droits').focus();return}$(d.imp==='dossier'?'fichierDossier':'fichierZip').click();return}
 if(d.imp==='studio'){var L=studioProjets(),box=$('studioListe');box.hidden=false;box.innerHTML=L.length?'<p class="aide">Projets du Studio dans ce navigateur :</p><div class="e-acts">'+L.map(function(p){return'<button type="button" class="e-btn" data-studio="'+esc(p.id)+'">'+esc(p.name||'Projet')+'</button>'}).join('')+'</div>':'<p class="aide">Aucun projet du Studio dans ce navigateur. Créez-en un dans <a href="/studio/">le Studio</a>, puis revenez.</p>';return}
 if(d.studio){var pj=studioProjets().filter(function(p){return p.id===d.studio})[0];if(pj)installer(S.depuisStudio(pj),'Projet du Studio');return}
 if(d.page){page=d.page;sel=null;tout();return}
 if(d.sel){choisir(d.sel);return}
 if(d.monter||d.descendre){var id=d.monter||d.descendre;changer(function(){var l=pageCour().sections,i=l.map(function(s){return s.id}).indexOf(id),j=i+(d.monter?-1:1);if(j<0||j>=l.length)return;var t=l[i];l[i]=l[j];l[j]=t});return}
 if(d.dupliquer){changer(function(){var l=pageCour().sections,i=l.map(function(s){return s.id}).indexOf(d.dupliquer),c=JSON.parse(JSON.stringify(l[i]));c.id=S.uid('x');if(pageCour().mode==='grille'){var p=S.placeLibre(l,c.w,S.hauteur(c.type,c.w));c.x=p.x;c.y=p.y}l.splice(i+1,0,c);sel=c.id});return}
 if(d.retirer){var nomB=(S.BLOCS[(pageCour().sections.filter(function(s){return s.id===d.retirer})[0]||{}).type]||{}).nom;changer(function(){var l=pageCour().sections;l.splice(l.map(function(s){return s.id}).indexOf(d.retirer),1);if(sel===d.retirer)sel=null});dire('Section « '+nomB+' » retirée. « Annuler » la remet.');return}
 if(d.ajout&&b.dataset.glisse)return;
 if(d.ajout){var nv;changer(function(s){nv=S.ajouterSection(s,page,d.ajout,sel);var pg=s.pages.filter(function(q){return q.id===page})[0];if(pg.mode==='grille'){nv.w=S.LARGEUR[nv.type]||6;var p=S.placeLibre(pg.sections.filter(function(q){return q!==nv}),nv.w,S.hauteur(nv.type,nv.w));nv.x=p.x;nv.y=p.y}});sel=nv.id;tout();choisir(nv.id);dire('« '+S.BLOCS[d.ajout].nom+' » ajouté. Touchez un autre bloc pour continuer.');if(!$('catalogue').hidden){var tl=$('tray').querySelector('[data-ajout="'+d.ajout+'"]');tl&&tl.focus()}return}
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
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();e.shiftKey?retablir():annuler()}if(e.key==='Escape'){menuExp(false);if(!$('catalogue').hidden){palette(false);$('plus').focus()}}});
$('plus').addEventListener('click',function(){palette($('catalogue').hidden)});
$('ajout').addEventListener('click',function(){palette($('catalogue').hidden,VUEPAL==='info'?0:null)});
$('ptabs').addEventListener('click',function(e){var b=e.target.closest('[data-pal]');if(!b)return;var v=b.dataset.pal;if(v==='fermer'){palette(false);$('plus').focus();return}VUEPAL=v==='info'?'info':+v;catalogueUI();var f=$('ptabs').querySelector('[aria-pressed=true]');f&&f.focus()});
document.addEventListener('pointerdown',function(e){if(!$('catalogue').hidden&&!e.target.closest('.gen-dock')&&!e.target.closest('#ajout'))palette(false)});
$('pageMode').addEventListener('click',function(){var G=pageCour().mode==='grille';changer(function(){if(G)S.versSections(pageCour());else S.versGrille(pageCour())});dire(G?'Page en sections : les blocs se suivent, dans l\'ordre de la grille.':'Grille libre : glissez les blocs, agrandissez-les par la poignée violette. La date, le lieu et les personnes changent de forme avec leur largeur.')});
$('pageAjout').addEventListener('click',function(){var t='Nouvelle page',id;changer(function(s){id=S.slug(t);while(s.pages.some(function(p){return p.id===id}))id+='-2';s.pages.push({id:id,titre:t,sections:[]})});page=id;sel=null;tout();dire('Page ajoutée. « Renommer » pour lui donner un titre.')});
$('pageRenommer').addEventListener('click',function(){var p=pageCour(),b=document.querySelector('[data-page="'+p.id+'"]'),i=document.createElement('input');i.value=p.titre;i.className='ren';i.setAttribute('aria-label','Titre de la page');b.replaceWith(i);i.focus();i.select();
 var fin=function(ok){if(ok&&i.value.trim()&&i.value.trim()!==p.titre)changer(function(){p.titre=i.value.trim().slice(0,40)});else pagesUI()};i.addEventListener('keydown',function(e){if(e.key==='Enter')fin(true);if(e.key==='Escape')fin(false)});i.addEventListener('blur',function(){fin(true)})});
$('pageSuppr').addEventListener('click',function(){if(page==='index')return;var t=pageCour().titre;changer(function(s){s.pages=s.pages.filter(function(p){return p.id!==page})});page='index';sel=null;tout();dire('Page « '+t+' » supprimée. « Annuler » la remet.')});
$('importer').addEventListener('click',function(){$('fichierSite').click()});
/* ---------- régénérer : fichiers AIME (fidèles) ou dossier HTML (approché, avec compte rendu) ---------- */
function installer(res,quoi){var s2=res.site;if(etat.sites[s2.id])s2.id=S.uid('site-');s2.creeLe=s2.majLe=new Date().toISOString();etat.sites[s2.id]=s2;ecrire();ouvrir(s2.id);compteRendu(res.rapport,quoi)}
function compteRendu(R,quoi){var li=function(t){return'<li>'+esc(t)+'</li>'},sec=R.sections?Object.keys(R.sections).map(function(k){return R.sections[k]+' × '+((S.BLOCS[k]||{}).nom||k)}):[];
 $('rapport').innerHTML='<h2 id="t-rap">'+esc(quoi)+' : compte rendu</h2>'+
  (R.pages!=null?'<p>'+R.pages+' page'+(R.pages>1?'s':'')+' · '+sec.length+' sorte'+(sec.length>1?'s':'')+' de sections · '+R.images+' image'+(R.images>1?'s':'')+'</p>':'<p>'+R.repris+' bloc'+(R.repris>1?'s':'')+' repris.</p>')+
  (R.categories?['reconnu','transforme','ignore','aVerifier'].map(function(k){var l=R.categories[k],t={reconnu:'Reconnu',transforme:'Transformé',ignore:'Ignoré',aVerifier:'À vérifier'}[k];return'<h3>'+t+' <small>('+l.length+')</small></h3>'+(l.length?'<ul>'+l.map(li).join('')+'</ul>':'<p class="aide">Rien.</p>')}).join(''):
  (sec.length?'<h3>Reconnu</h3><ul>'+sec.map(li).join('')+(R.infos||[]).map(function(t){return li('Info : '+t)}).join('')+(R.ambiance?li('Ambiance : '+R.ambiance):'')+(R.typo?li('Typographie : '+R.typo):'')+'</ul>':'')+
  ((R.omis&&R.omis.length)||(R.nonReconnu&&R.nonReconnu.length)||(R.ignores&&R.ignores.length)?'<h3>Non repris</h3><ul>'+(R.omis||[]).map(function(k){return li('Bloc « '+k+' » : démonstration de la landing, pas un bloc de site')}).join('')+(R.nonReconnu||[]).map(li).join('')+(R.ignores||[]).map(function(t){return li('Ignoré pour la sécurité : '+t)}).join('')+'</ul>':'<p>Rien n\'a été laissé de côté.</p>'))+
  (R.categories?'':'<p class="aide">Vérifiez les textes : la lecture est faite par des règles fixes, sans IA.</p>')+'<div class="e-acts"><button type="button" class="e-btn e-p" id="rapOk">Compris</button></div>';
 $('rapport').hidden=false;$('rapOk').focus();$('rapOk').onclick=function(){$('rapport').hidden=true}}
function importerJSON(texte,nom){var j=JSON.parse(texte);
 if(j&&j.format==='aime-site'){delete j._avertissement;var s2=S.migrer(j);installer({site:s2,rapport:{repris:s2.pages.reduce(function(a,p){return a+p.sections.length},0),omis:[]}},'Site AIME');return}
 if(j&&j.P&&Array.isArray(j.blocks)){installer(S.depuisMiniSite(j),'Mini-site de la landing');return}
 throw new Error('Ce fichier JSON n\'est ni un site AIME ni un export du mini-site de la landing.')}
function importerHTML(fichiers,quoi){if(!$('droits').checked&&!confirmeDroits){dire('Cochez d\'abord : « Ce site m\'appartient, ou j\'ai l\'autorisation de le reprendre ».');accueil();$('droits').focus();return}
 var I=window.AIMEImport,lot;try{lot=fichiers.tri?fichiers:I.depuisFichiers(fichiers)}catch(e){echec(e);return}
 if(importEnCours){dire('Un import est déjà en cours.');return}importEnCours=true;dire('Lecture du site…');
 I.lire(lot.fichiers,PRES,lot.tri).then(function(r){importEnCours=false;installer(r,quoi)}).catch(function(e){importEnCours=false;echec(e,'Import impossible.')})}
function echec(e,defaut){var m=e&&e.message||defaut;dire(m+(/n'a été (importé|modifié)/.test(m)?'':' Votre site en cours n\'a pas été modifié.'))}
var importEnCours=false;
var confirmeDroits=false;
/* l'archive : taille vérifiée avant de charger quoi que ce soit, puis tri des entrées, puis décompression une à une (sites/importer.js) */
function zipVersFichiers(blob){var L=window.AIMEImport.LIMITES;if(blob.size>L.archive)return Promise.reject(new Error('Cette archive pèse '+String(Math.round(blob.size/1e5)/10).replace('.',',')+' Mo ; la limite est de '+L.archive/1e6+' Mo. Rien n\'a été importé.'));
 return charge('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(function(){return JSZip.loadAsync(blob,{checkCRC32:true}).catch(function(){throw new Error('Ce .zip est illisible ou abîmé. Rien n\'a été importé.')})}).then(window.AIMEImport.depuisArchive)}
function routerFichiers(fs){fs=[].slice.call(fs||[]);if(!fs.length)return;var f=fs[0];
 if(fs.length===1&&/\.json$/i.test(f.name)){var r=new FileReader();r.onload=function(){try{importerJSON(r.result,f.name)}catch(e){dire(e.message)}};r.readAsText(f);return}
 if(fs.length===1&&/\.zip$/i.test(f.name)){if(!$('droits').checked){accueil();dire('Cochez d\'abord la case des droits, puis reprenez le .zip.');$('droits').focus();return}zipVersFichiers(f).then(function(lot){importerHTML(lot,'Site HTML (.zip)')}).catch(function(e){echec(e,'Ce .zip est illisible.')});return}
 importerHTML(fs.map(function(x){return{chemin:x.webkitRelativePath?x.webkitRelativePath.split('/').slice(1).join('/'):x.name,blob:x}}),fs[0].webkitRelativePath?'Dossier HTML':'Pages HTML')}
$('fichierSite').addEventListener('change',function(){var fs=this.files;routerFichiers(fs);this.value=''});
$('fichierDossier').addEventListener('change',function(){var fs=this.files;routerFichiers(fs);this.value=''});
$('fichierZip').addEventListener('change',function(){var fs=this.files;routerFichiers(fs);this.value=''});
function studioProjets(){try{var db=JSON.parse(localStorage.getItem('echos:v2')||'null');return db&&Array.isArray(db.projects)?db.projects.filter(function(p){return p&&p.id}):[]}catch(e){return[]}}

function menuExp(on){$('menuExp').hidden=!on;$('exporter').setAttribute('aria-expanded',String(on))}
$('exporter').addEventListener('click',function(e){e.stopPropagation();menuExp($('menuExp').hidden)});
document.addEventListener('click',function(e){if(!e.target.closest('.gen-exp'))menuExp(false)});

/* ---------- exporter : des fichiers autonomes ---------- */
function telecharger(nom,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}
function charge(src){return new Promise(function(ok,ko){if(window.JSZip)return ok();var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)})}
function exporter(k){var base=S.slug(site.infos.titre||site.nom);
 /* sauvegarder mon projet : complet, privé, réimportable */
 if(k==='json'){var sv=S.sauvegarde(site);telecharger(sv.chemin,new Blob([sv.contenu],{type:'application/json'}));dire('Sauvegarde privée prête ('+sv.chemin+') : elle contient aussi le réservé. Gardez-la pour vous, ne la publiez pas.');return}
 /* exporter pour publier : la vue publique seulement */
 if(k==='une'){telecharger(base+'.html',new Blob([S.exporter(site,{presentation:PRES,unePage:true})[0].contenu],{type:'text/html'}));dire('Page publique prête : seulement ce qui est pour tout le monde.');return}
 if(k==='onglet'){var u=URL.createObjectURL(new Blob([S.document(site,{page:page,vue:vueDe(persp),regles:window.AIMEPerms,presentation:PRES}).html],{type:'text/html'}));window.open(u,'_blank','noopener');return}
 if(k==='zip')charge('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js').then(function(){var z=new JSZip(),F=S.exporterPublic(site,{presentation:PRES});F.forEach(function(f){z.file(f.chemin,f.contenu)});z.__n=F.length-1;return z.generateAsync({type:'blob'}).then(function(b){return{b:b,n:F.length-1}})})
  .then(function(r){if(r){telecharger(base+'.publication.zip',r.b);dire('Prêt à publier : '+r.n+' page'+(r.n>1?'s':'')+' publique'+(r.n>1?'s':'')+', sans le réservé ni le fichier de projet ('+base+'.publication.zip).')}}).catch(function(){dire('Export .zip impossible (bibliothèque non chargée). Essayez « Une seule page ».')})}

/* ---------- démarrage ---------- */
Promise.all([charger('/vitrine/modeles/sites.json'),charger('/vitrine/presentation/studio.json'),charger('/vitrine/perspectives/sites.json')]).then(function(r){MODELES=r[0].modeles;PRES=r[1];VUES=r[2].vues;
 $('persps').innerHTML=VUES.map(function(p){return'<button type="button" data-persp="'+esc(p.id)+'" aria-pressed="'+(p.id===persp)+'" title="'+esc(p.description)+'">'+esc(p.label)+'</button>'}).join('');catalogueUI();
 etat=lire();var q=new URLSearchParams(location.search).get('site');if(q&&etat.sites[q])ouvrir(q);else if(etat.cur&&etat.sites[etat.cur])ouvrir(etat.cur);else accueil()})
 .catch(function(){document.body.insertAdjacentHTML('beforeend','<p class="e-vide" style="margin:20px">Le générateur n\'a pas pu charger ses modèles. Rechargez la page.</p>')});
window.AIMEGenerateur={site:function(){return site},exporter:function(o){return S.exporterPublic(site,Object.assign({presentation:PRES},o||{}))},sauvegarde:function(){return S.sauvegarde(site)}};
})();
