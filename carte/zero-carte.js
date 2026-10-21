/* AIME · Page Zéro · la naissance de la Carte universelle.
   L'orbe pose des questions (guide déterministe, toutes facultatives), la Carte se compose, la métamorphose se nourrit
   des réponses, le registre montre des Cartes publiées volontairement, et « Rejoindre Le Monde AIME » emporte la Carte
   jusqu'à une facette du cube. Une seule source : la Carte (localStorage « aime-carte »), lue par tous. */
(function(){'use strict';
var K=window.AIMECarte,G=window.AIMEGuide,R=window.AIMECarteRendu,REG=window.AIMERegistreDemo||[],$=function(s){return document.getElementById(s)};if(!K||!G||!R)return;
var CLE='aime-carte',X={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return X[c]})};
var calme=function(){return document.documentElement.classList.contains('calme')};
function aujourdhui(){return new Date().toISOString().slice(0,10)}
var carte=(function(){try{return K.migrer(JSON.parse(localStorage.getItem(CLE)||'null'))}catch(e){return null}})(),abonnes=[];
function enregistrer(c,versionPrecedente){if(versionPrecedente){try{var v=JSON.parse(localStorage.getItem(CLE+'-versions')||'[]');v.push(versionPrecedente);localStorage.setItem(CLE+'-versions',JSON.stringify(v.slice(-20)))}catch(e){}}
 carte=c;try{c?localStorage.setItem(CLE,JSON.stringify(c)):localStorage.removeItem(CLE)}catch(e){}abonnes.forEach(function(f){try{f(carte)}catch(e){}});tout()}
function base(){return carte||K.vide(aujourdhui())}
function aDesDonnees(c){return!!c&&Object.keys(K.RUBRIQUES).some(function(k){return K.rempli(c,k)})}
/* les valeurs de démonstration : clairement nommées « exemple » partout où elles servent */
var EXEMPLE=K.modifier(K.vide(),{nom:'Camille',couleurs:['#7C5CFF','#22D3EE','#FB7185'],intention:'Créer quelque chose',moments:[{id:'e1',titre:'Premier concert',date:'2009'},{id:'e2',titre:'Diplôme de design',date:'2014'},{id:'e3',titre:'Un an à Lisbonne',date:'2018'}],
 relations:[{nom:'Ma sœur'},{nom:'L\'atelier'},{nom:'Lisbonne'}],competences:['Dessin','Cuisine'],reves:['Ouvrir un lieu où l\'on crée ensemble']});

/* ---------- la Carte ---------- */
function dessinerCarte(){var c=aDesDonnees(carte)?carte:null;$('carteVue').innerHTML=R.svg(c||EXEMPLE,{id:'zc',exemple:!c});
 $('carteEtat').textContent=c?'Version '+c.version+' · gardée dans ce navigateur, nulle part ailleurs'+(c.publication.publiee?' · publiée dans le registre (démonstration)':' · privée'):'Exemple : vos réponses remplaceront ces valeurs. Rien n\'est enregistré tant que vous ne répondez pas.';
 var e=$('entrerTexte'),h=$('t-entrer');if(c){h.textContent='Votre Carte est née.';e.textContent='Votre histoire vous appartient. Découvrez maintenant ce qu\'elle peut devenir.'}else{h.textContent='Et maintenant ?';e.textContent='Découvrez ce que nous pouvons créer, relier et faire évoluer ensemble.'}}

/* ---------- le dialogue de l'orbe ---------- */
var D=$('dialogue'),faites={},pile=[],dernierMoteur=null,choixCouleurs=[];
function ouvrir(){D.hidden=false;afficher();var f=D.querySelector('input,button');if(f)f.focus({preventScroll:true})}
function fermer(){D.hidden=true}
function afficher(){var c=base(),q=G.prochaine(c,faites),n=G.QUESTIONS.length,k=Object.keys(faites).length;
 var pts='<span class="pts" aria-hidden="true">'+G.QUESTIONS.map(function(_,i){return'<i'+(i<k?' class="f"':'')+'></i>'}).join('')+'</span>';
 if(!q){D.innerHTML='<div><div class="tete-d"><span>L\'orbe</span>'+pts+'</div><h3 id="dQ">Ta Carte est prête à naître.</h3><p class="aide">Tu pourras l\'enrichir toute ta vie. Rien n\'était obligatoire.</p><div class="bas"><div>'+(pile.length?'<button type="button" data-retour>Retour</button>':'')+'</div><div><button type="button" data-fermer>Fermer</button><button type="button" class="p" data-voir>Voir ma Carte</button></div></div></div>';return}
 choixCouleurs=[];var h='<div><div class="tete-d"><span>L\'orbe · '+(k+1)+'</span>'+pts+'</div><h3 id="dQ">'+esc(q.q)+'</h3>'+(q.aide?'<p class="aide">'+esc(q.aide)+'</p>':'<p class="aide">Facultatif : tu peux passer.</p>');
 if(q.couleurs)h+='<div class="nuancier" role="group" aria-label="Couleurs, jusqu\'à trois">'+K.COULEURS.map(function(x){return'<button type="button" data-coul="'+x+'" aria-pressed="false" style="background:'+x+'" aria-label="Couleur '+x+'"></button>'}).join('')+'</div>';
 if(q.choix)h+='<div class="ch">'+q.choix.map(function(x){return'<button type="button" data-choix="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>';
 if(q.libre)h+='<input type="text" data-libre aria-label="Réponse libre" placeholder="'+esc(q.libre)+'">';
 if(dernierMoteur)h+='<p class="moteur">Moteur utilisé pour la réponse précédente : '+esc(dernierMoteur)+'.</p>';
 h+='<p class="agent">'+esc(G.AGENT.nom)+' : '+esc(G.AGENT.raison)+'</p><div class="bas"><div>'+(pile.length?'<button type="button" data-retour>Retour</button>':'')+'<button type="button" data-quitter>Quitter</button></div><div><button type="button" data-passer>Passer</button><button type="button" class="p" data-valider>Valider</button></div></div></div>';
 D.innerHTML=h;D._q=q;var inp=D.querySelector('[data-libre]');if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();valider(inp.value.trim())}})}
function valider(r){var q=D._q;if(!q)return;if(q.couleurs&&choixCouleurs.length&&!r)r=choixCouleurs.slice();if(r==null||r===''||(Array.isArray(r)&&!r.length)){passer();return}
 var avant=carte?JSON.parse(JSON.stringify(carte)):null;pile.push({q:q.id,avant:avant});faites[q.id]=1;dernierMoteur=q.moteur?G.MOTEURS[q.moteur].nom:null;
 enregistrer(G.repondre(base(),q,r,aujourdhui()),avant);pulser();afficher()}
function passer(){var q=D._q;if(!q)return;pile.push({q:q.id,avant:carte?JSON.parse(JSON.stringify(carte)):null,passee:true});faites[q.id]=1;dernierMoteur=null;afficher()}
function retour(){var p=pile.pop();if(!p)return;delete faites[p.q];if(!p.passee)enregistrer(p.avant);dernierMoteur=null;afficher()}
D.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
 if(b.dataset.coul){var x=b.dataset.coul,i=choixCouleurs.indexOf(x);if(i>=0)choixCouleurs.splice(i,1);else if(choixCouleurs.length<3)choixCouleurs.push(x);[].forEach.call(D.querySelectorAll('[data-coul]'),function(y){y.setAttribute('aria-pressed',String(choixCouleurs.indexOf(y.dataset.coul)>=0))});return}
 if(b.dataset.choix!=null){valider(b.dataset.choix);return}
 if(b.hasAttribute('data-valider')){var inp=D.querySelector('[data-libre]');valider(inp&&inp.value.trim()?inp.value.trim():null);return}
 if(b.hasAttribute('data-passer'))return passer();if(b.hasAttribute('data-retour'))return retour();
 if(b.hasAttribute('data-quitter')||b.hasAttribute('data-fermer'))return fermer();
 if(b.hasAttribute('data-voir')){fermer();$('carte').scrollIntoView({behavior:calme()?'auto':'smooth'})}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!D.hidden)fermer()});
[].forEach.call(document.querySelectorAll('[data-carte-ouvrir]'),function(b){b.addEventListener('click',ouvrir)});
/* l'orbe acquiesce : un souffle sur la grande orbe */
function pulser(){var f=$('flot');if(!f||calme()||!f.animate)return;f.animate([{filter:'brightness(1)'},{filter:'brightness(1.6)'},{filter:'brightness(1)'}],{duration:700})}

/* ---------- l'éditeur : toutes les rubriques, facultatives, chacune avec sa visibilité ---------- */
var LISTES={moments:['titre','date'],formations:['titre','annee'],voyages:['titre','annee']},TEXTES={competences:1,interets:1,reves:1,territoires:1};
function visSel(k,c){var R0=K.RUBRIQUES[k];return'<span class="vis">Visible par <select data-vis="'+k+'" aria-label="Visibilité : '+esc(R0.nom)+'">'+K.VISIBILITES.map(function(v){return'<option value="'+v+'"'+(c.visibilite[k]===v?' selected':'')+(R0.jamaisPublique&&v==='publique'?' disabled':'')+'>'+({privee:'moi seul',contacts:'mes contacts acceptés',publique:'le registre public'})[v]+'</option>'}).join('')+'</select></span>'}
function editeur(){var c=base(),h='';
 var ouverts={};[].forEach.call($('editeur').querySelectorAll('details[open]'),function(d){ouverts[d.dataset.k]=1});
 var bloc=function(k,corps){var r=K.rempli(c,k);return'<details data-k="'+k+'"'+(ouverts[k]?' open':'')+'><summary>'+esc(K.RUBRIQUES[k].nom)+'<span>'+(r?'renseigné':'facultatif')+' · '+({privee:'privé',contacts:'contacts',publique:'public'})[c.visibilite[k]]+'</span></summary>'+corps+visSel(k,c)+'</details>'};
 h+=bloc('nom','<label>Nom d\'affichage ou pseudonyme<input data-champ="nom" value="'+esc(c.nom)+'" maxlength="40"></label>');
 h+=bloc('photo','<label>Photo (réduite, gardée dans ce navigateur)<input type="file" accept="image/*" data-photo></label>'+(c.photo?'<p class="vis"><img src="'+esc(c.photo)+'" alt="Votre photo" width="56" height="56" style="border-radius:50%;object-fit:cover"> <button type="button" class="b-z" data-sansphoto>Retirer</button></p>':''));
 h+=bloc('naissance','<label>Date de naissance (toujours privée par défaut, jamais publique)<input type="date" data-champ="naissance" value="'+esc(c.naissance||'')+'"></label>');
 h+=bloc('couleurs','<div class="nuancier" role="group" aria-label="Couleurs">'+K.COULEURS.map(function(x){return'<button type="button" data-ecoul="'+x+'" aria-pressed="'+(c.couleurs.indexOf(x)>=0)+'" style="background:'+x+'" aria-label="Couleur '+x+'"></button>'}).join('')+'</div>');
 h+=bloc('intention','<label>Intention<input data-champ="intention" value="'+esc(c.intention)+'" maxlength="80"></label>');
 Object.keys(LISTES).forEach(function(k){var cols=LISTES[k];h+=bloc(k,'<div class="lst">'+c[k].map(function(it,i){return'<div><input data-liste="'+k+'" data-i="'+i+'" data-col="'+cols[0]+'" value="'+esc(it[cols[0]])+'" aria-label="'+esc(K.RUBRIQUES[k].nom)+'"><input data-liste="'+k+'" data-i="'+i+'" data-col="'+cols[1]+'" value="'+esc(it[cols[1]]||'')+'" placeholder="date (facultative)" style="max-width:150px" aria-label="Date"><button type="button" data-suppr="'+k+'" data-i="'+i+'" aria-label="Retirer">×</button></div>'}).join('')+'</div><button type="button" class="b-z" data-ajout="'+k+'" style="margin-top:10px">Ajouter</button>')});
 Object.keys(TEXTES).forEach(function(k){h+=bloc(k,'<label>'+esc(K.RUBRIQUES[k].nom)+' (séparés par des virgules)<input data-csv="'+k+'" value="'+esc(c[k].join(', '))+'"></label>')});
 h+=bloc('contributions','<label>Ce que je propose<input data-contrib="proposees" value="'+esc(c.contributions.proposees.join(', '))+'"></label><label>Ce que je recherche<input data-contrib="recherchees" value="'+esc(c.contributions.recherchees.join(', '))+'"></label>');
 h+=bloc('relations','<label>Personnes, lieux, idées reliés (toujours privés ou réservés aux contacts)<input data-rel value="'+esc(c.relations.map(function(r){return r.nom}).join(', '))+'"></label>');
 h+='<p class="carte-etat" style="text-align:left">Chaque modification crée une version. <button type="button" class="b-z" data-annuler'+(versions().length?'':' disabled')+'>Annuler la dernière</button></p>';
 $('editeur').innerHTML=h}
function versions(){try{return JSON.parse(localStorage.getItem(CLE+'-versions')||'[]')}catch(e){return[]}}
function changer(champs,note){var avant=carte?JSON.parse(JSON.stringify(carte)):null;enregistrer(K.modifier(base(),champs,note||'Modification',aujourdhui()),avant)}
var csv=function(v){return v.split(',').map(function(x){return x.trim()}).filter(Boolean)};
$('editeur').addEventListener('change',function(e){var t=e.target,c=base();
 if(t.dataset.champ){var o0={};o0[t.dataset.champ]=t.value.trim()||(t.dataset.champ==='naissance'?null:'');return changer(o0)}
 if(t.dataset.csv){var o1={};o1[t.dataset.csv]=csv(t.value);return changer(o1)}
 if(t.dataset.contrib){var o=JSON.parse(JSON.stringify(c.contributions));o[t.dataset.contrib]=csv(t.value);return changer({contributions:o})}
 if(t.hasAttribute('data-rel'))return changer({relations:csv(t.value).map(function(n){return{nom:n,explicite:true}})});
 if(t.dataset.liste){var L=JSON.parse(JSON.stringify(c[t.dataset.liste]));L[+t.dataset.i][t.dataset.col]=t.value.trim()||null;var o2={};o2[t.dataset.liste]=L;return changer(o2)}
 if(t.dataset.vis){try{var avant=carte?JSON.parse(JSON.stringify(carte)):null;var n=K.rendreVisible(c,t.dataset.vis,t.value);if(n.publication.publiee&&!Object.keys(K.RUBRIQUES).some(function(k){return n.visibilite[k]==='publique'}))n=K.retirer(n,aujourdhui());enregistrer(n,avant)}catch(err){t.value=c.visibilite[t.dataset.vis];alert0(err.message)}return}
 if(t.hasAttribute('data-photo')&&t.files[0]){var f=t.files[0],u=URL.createObjectURL(f),im=new Image();im.onload=function(){var cv=document.createElement('canvas'),s=Math.min(im.width,im.height);cv.width=cv.height=256;cv.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,256,256);URL.revokeObjectURL(u);changer({photo:cv.toDataURL('image/jpeg',.82)},'Photo')};im.src=u}});
$('editeur').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var c=base();
 if(b.dataset.ecoul){var cs=c.couleurs.slice(),i=cs.indexOf(b.dataset.ecoul);if(i>=0)cs.splice(i,1);else{cs.push(b.dataset.ecoul);cs=cs.slice(-3)}return changer({couleurs:cs},'Couleurs')}
 if(b.dataset.ajout){var k=b.dataset.ajout,o={};o[k]=c[k].concat([k==='moments'?{id:'m'+Date.now().toString(36),titre:'Nouveau moment',date:null}:{titre:'Nouveau',annee:null}]);return changer(o)}
 if(b.dataset.suppr){var k2=b.dataset.suppr,o2={};o2[k2]=c[k2].filter(function(_,j){return j!==+b.dataset.i});return changer(o2)}
 if(b.hasAttribute('data-sansphoto'))return changer({photo:null},'Photo retirée');
 if(b.hasAttribute('data-annuler')){var v=versions(),p=v.pop();try{localStorage.setItem(CLE+'-versions',JSON.stringify(v))}catch(err){}enregistrer(p||null)}});
$('carteModifier').addEventListener('click',function(){var ed=$('editeur'),o=ed.hidden;ed.hidden=!o;this.setAttribute('aria-expanded',String(o));if(o)editeur()});
function alert0(t){var e=$('carteEtat');e.textContent=t}

/* ---------- exporter : la Carte est à la personne ---------- */
$('carteExporter').addEventListener('click',function(){var c=base(),json=new Blob([K.exporter(c)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(json);a.download='ma-carte-aime.json';a.click();
 var img=new Image(),svg=new Blob([R.svg(aDesDonnees(c)?c:EXEMPLE,{id:'ex',exemple:!aDesDonnees(c)})],{type:'image/svg+xml'}),u=URL.createObjectURL(svg);img.onload=function(){var cv=document.createElement('canvas');cv.width=cv.height=1200;cv.getContext('2d').drawImage(img,0,0,1200,1200);URL.revokeObjectURL(u);cv.toBlob(function(b){var a2=document.createElement('a');a2.href=URL.createObjectURL(b);a2.download='ma-carte-aime.png';a2.click()},'image/png')};img.src=u});

/* ---------- confidentialité : ce qui est public, le consentement, le retrait ---------- */
function confid(){var c=carte,h='';var pub=c?Object.keys(K.RUBRIQUES).filter(function(k){return c.visibilite[k]==='publique'&&K.rempli(c,k)}):[];
 h+='<div><h3>Ce qui est visible</h3><p>'+(pub.length?'Public : ':'Rien n\'est public. ')+'</p><div class="pub">'+pub.map(function(k){return'<span>'+esc(K.RUBRIQUES[k].nom)+'</span>'}).join('')+'</div><p>La date de naissance et les relations ne peuvent jamais être publiques. Pour rendre une rubrique publique : « Modifier ma Carte », puis « Visible par ».</p></div>';
 if(c&&c.publication.publiee)h+='<div><h3>Votre Carte est publiée</h3><p>Dans le registre de ce navigateur seulement (démonstration). Consentement donné le '+esc(c.publication.consentement.date||'')+' pour : '+c.publication.consentement.rubriques.map(function(k){return esc(K.RUBRIQUES[k].nom)}).join(', ')+'.</p><button type="button" class="b-z" data-retirer>Retirer ma Carte du registre</button></div>';
 else h+='<div><h3>Publier dans le registre</h3><label class="acc"><input type="checkbox" data-accord'+(pub.length?'':' disabled')+'><span>'+esc(K.TEXTE_CONSENTEMENT)+'</span></label><button type="button" class="b-z" data-publier disabled>Publier</button><p style="margin-top:10px">Sans compte, la publication reste dans ce navigateur. La publication réelle attendra un compte, votre validation et le stockage Neon.</p></div>';
 h+='<div><h3>Votre session</h3><p>Sans compte, votre Carte vit dans ce navigateur, nulle part ailleurs : ni serveur, ni registre réel.</p><button type="button" class="b-z" data-effacer'+(c?'':' disabled')+'>Effacer ma Carte de ce navigateur</button></div>';
 $('confid').innerHTML=h}
$('confid').addEventListener('change',function(e){if(e.target.hasAttribute('data-accord'))$('confid').querySelector('[data-publier]').disabled=!e.target.checked});
$('confid').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-publier')){var acc=$('confid').querySelector('[data-accord]');try{enregistrer(K.publier(base(),acc.checked===true,aujourdhui()),carte)}catch(err){alert0(err.message)}return}
 if(b.hasAttribute('data-retirer'))return enregistrer(K.retirer(base(),aujourdhui()),carte);
 if(b.hasAttribute('data-effacer')){try{localStorage.removeItem(CLE+'-versions');localStorage.removeItem(CLE+'-contacts')}catch(err){}faites={};pile=[];enregistrer(null)}});

/* ---------- le registre ---------- */
var filtre=null,terme='';
function contacts(){try{return JSON.parse(localStorage.getItem(CLE+'-contacts')||'{}')}catch(e){return{}}}
function etiquettes(v){var t=[];(v.competences||[]).forEach(function(x){t.push(x)});(v.reves||[]).slice(0,1).forEach(function(x){t.push('Projet : '+x)});(v.territoires||[]).forEach(function(x){t.push(x)});if(v.contributions){(v.contributions.proposees||[]).forEach(function(x){t.push('Propose : '+x)});(v.contributions.recherchees||[]).forEach(function(x){t.push('Cherche : '+x)})}(v.moments||[]).forEach(function(m){t.push(m.titre+(m.date?' · '+m.date:''))});return t.slice(0,7)}
function registre(){var moi=carte&&K.vuePublique(carte),vues=(moi?[moi]:[]).concat(REG),L=K.filtrer(vues,filtre,terme),C=contacts();
 $('filtres').innerHTML='<button type="button" data-f="" aria-pressed="'+(!filtre)+'">Toutes</button>'+Object.keys(K.FILTRES).map(function(f){return'<button type="button" data-f="'+f+'" aria-pressed="'+(filtre===f)+'">'+esc(K.FILTRES[f].nom)+'</button>'}).join('');
 $('regListe').innerHTML=L.length?L.map(function(v){var estMoi=moi&&v.id===moi.id,pq=!estMoi&&carte?K.correspondances(carte,v):[],d=C[v.id];
  return'<li'+(estMoi?' class="moi"':'')+'><div class="vg">'+R.svg(v,{id:'r'+v.id.replace(/\W/g,''),mode:'mini'})+'</div><div><b>'+esc(v.nom||'Sans nom')+'</b>'+(estMoi?' <span class="int">· votre Carte, ce navigateur seulement</span>':'')+'<p class="int">'+esc(v.intention||'')+'</p><div class="tg">'+etiquettes(v).map(function(t){return'<span>'+esc(t)+'</span>'}).join('')+'</div>'+
   (pq.length?'<p class="pq">Pourquoi cette personne : '+esc(pq.map(function(x){return x.texte}).join(' '))+'</p>':'')+
   (estMoi?'':'<div class="ct">'+(!d?'<button type="button" data-contact="'+esc(v.id)+'">Demander un contact</button>':d.etat==='en-attente'?'<span>Demande envoyée, en attente de sa réponse.</span><button type="button" data-simuler="'+esc(v.id)+'">Simuler sa réponse (personne fictive)</button>':'<span>Contact accepté par les deux personnes. Rien d\'autre n\'est partagé sans votre accord.</span>')+'</div>')+'</div></li>'}).join(''):'<li style="display:block;color:var(--soft)">Aucune Carte ne correspond à ce filtre.</li>'}
$('filtres').addEventListener('click',function(e){var b=e.target.closest('[data-f]');if(!b)return;filtre=b.dataset.f||null;registre()});
$('cherche').addEventListener('input',function(){terme=this.value;registre()});
$('regListe').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var C=contacts();
 if(b.dataset.contact){C[b.dataset.contact]=K.demander(carte?carte.id:'visiteur',b.dataset.contact,'',aujourdhui())}
 if(b.dataset.simuler){C[b.dataset.simuler]=K.repondre(C[b.dataset.simuler],true,aujourdhui())}
 try{localStorage.setItem(CLE+'-contacts',JSON.stringify(C))}catch(err){}registre()});

/* ---------- rejoindre Le Monde AIME : la Carte part vers le cube ---------- */
$('rejoindre').addEventListener('click',function(e){if(!aDesDonnees(carte))return;e.preventDefault();var href=this.href;
 try{sessionStorage.setItem('aime-carte-arrivee',JSON.stringify({t:Date.now(),id:carte.id}))}catch(err){}
 if(calme()){location.href=href;return}
 var v=document.createElement('div');v.className='voyage';v.innerHTML=R.svg(carte,{id:'vy'});document.body.appendChild(v);
 v.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.6)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.35},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.6},{opacity:1,transform:'translate(-50%,calc(-50% - 30vh)) scale(.22)'}],{duration:1500,easing:'cubic-bezier(.6,0,.2,1)',fill:'forwards'}).onfinish=function(){location.href=href}});

/* ---------- pour la métamorphose : ce qu'elle dessine vient de la Carte, ou de l'exemple, dit comme tel ---------- */
function donneesMeta(){var c=aDesDonnees(carte)?carte:null,s=c||EXEMPLE;var grille=['nom','couleurs','moments','formations','voyages','competences','reves','contributions','relations'].map(function(k){return{nom:K.RUBRIQUES[k].nom,rempli:!!K.rempli(s,k)}});
 return{exemple:!c,nom:s.nom,intention:s.intention,moments:s.moments.concat(s.formations.map(function(f){return{titre:f.titre,date:f.annee}}),s.voyages.map(function(f){return{titre:f.titre,date:f.annee}})).slice(0,4),relations:s.relations.slice(0,4).map(function(r){return r.nom}),grille:grille,couleurs:s.couleurs,reve:s.reves[0]||'',carte:s}}
function tout(){dessinerCarte();confid();registre();if(!$('editeur').hidden)editeur()}
window.AIMEZeroCarte={get:function(){return carte},onChange:function(f){abonnes.push(f)},donneesMeta:donneesMeta,ouvrir:ouvrir};
tout();
})();
