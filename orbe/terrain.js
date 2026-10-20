/* AIME · ORBE · le terrain de jeu du laboratoire (/lab/orb/).
   Un spécimen réel de chaque type d'élément du design system, avec ce que l'orbe sait y faire (lu dans systeme.js,
   jamais recopié), ce qu'elle a appris de vous, et le journal des remarques à réparer, optimiser ou améliorer. */
(function(){'use strict';
var S=window.AIMEOrbeSysteme,C=window.AIMECompagnon,$=function(s){return document.getElementById(s)};if(!S||!C)return;
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})};
/* un spécimen par type, avec des données fictives */
var SPEC={
 champ:'<label class="sp-l">Prénom<input type="text" placeholder="Votre prénom"></label><label class="sp-l">Courriel<input type="email" placeholder="nom@exemple.fr"></label>',
 interrupteur:'<label class="sp-row"><input type="checkbox" checked> Recevoir le programme</label><label class="sp-row"><input type="radio" name="sp-r"> Pro <input type="radio" name="sp-r" checked> Participant</label>',
 curseur:'<label class="sp-l">Budget du dîner<input type="range" min="0" max="100" value="60"></label>',
 bouton:'<div class="sp-row"><button type="button" class="btn">Réserver</button><button type="button" class="btn" disabled>Publier</button></div>',
 lien:'<p><a href="/g44/">Ouvrir G44 LAB</a> · <a href="#jeu">Revenir en haut du terrain</a></p>',
 onglet:'<div class="sp-row" role="tablist" aria-label="Vues"><button type="button" role="tab" aria-selected="true" class="btn">Couple</button><button type="button" role="tab" aria-selected="false" class="btn">Invités</button></div>',
 date:'<p>Cérémonie le <time datetime="2027-06-14">lundi 14 juin 2027</time>, accueil <span data-date="2027-06-14">le matin même</span>.</p>',
 personne:'<p><span data-personne class="sp-p">Léa Martin · mariée</span> <span data-personne class="sp-p">Karim · photographe</span></p>',
 lieu:'<address data-lieu>Domaine des Tilleuls, 44120 Vertou (fictif)</address>',
 video:'<audio controls aria-label="Morceau d\'exemple (silencieux)"></audio>',
 image:'<img alt="Une orbe iridescente sur fond sombre" width="160" height="100" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 160 100%22%3E%3Crect width=%22160%22 height=%22100%22 fill=%22%2317171C%22/%3E%3Ccircle cx=%2280%22 cy=%2250%22 r=%2230%22 fill=%22%237C5CFF%22/%3E%3C/svg%3E"> <img width="100" height="100" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23222228%22/%3E%3C/svg%3E">',
 tableau:'<table class="sp-t"><thead><tr><th>Moment</th><th>Heure</th></tr></thead><tbody><tr><td>Cérémonie</td><td>15 h</td></tr><tr><td>Dîner</td><td>20 h</td></tr></tbody></table>',
 code:'<pre><code>AIMEOrbe.monter(element)</code></pre>',
 citation:'<blockquote>Une information saisie une fois, répercutée partout où elle est utile.</blockquote>',
 titre:'<h3 class="sp-h">Le jour où tout se relie</h3>',
 liste:'<ul><li>Choisir le lieu</li><li>Inviter les témoins</li><li>Écrire le discours</li></ul>',
 texte:'<p>Touchez ce texte : l\'orbe propose de le modifier, le copier, le mesurer ou le relier à un autre élément de la page.</p><p style="color:#55555F">Ce texte gris est volontairement peu contrasté : vérifiez-le.</p>',
 carte:'<article class="sp-c"><b>Fleuriste · Atelier Bloom</b><span>Installation florale, New York (fictif)</span></article>',
 menu:'<nav aria-label="Exemple"><a href="#jeu">Terrain</a> · <a href="#appris">Mémoire</a> · <a href="#journal">Remarques</a></nav>',
 formulaire:'<form class="sp-row" onsubmit="return false"><input type="text" aria-label="Recherche" placeholder="Chercher…"><button class="btn" type="submit">Chercher</button></form>',
 section:'<section class="sp-s">Une section : un conteneur de contenus.</section>'};
function etiquetteEtat(a){var A=S.ACTIONS[a];return'<span class="sp-a '+(A.etat==='operationnelle'?'op':'pr')+'" title="'+esc(A.aide)+'">'+esc(A.nom)+(A.etat==='operationnelle'?'':' · prévue')+'</span>'}
function specimens(){$('jeuGrille').innerHTML=S.TYPES.map(function(T){return'<div class="sp" data-type="'+T.id+'"><header data-orbe-ignorer><b>'+esc(T.nom)+'</b><button type="button" class="sp-f" data-f="'+T.forme+'">Forme : '+esc(S.FORMES[T.forme])+'</button></header><div class="sp-v">'+(SPEC[T.id]||'')+'</div><footer data-orbe-ignorer><small>Ce que l\'orbe sait faire</small><div>'+T.actions.map(etiquetteEtat).join('')+'</div></footer></div>'}).join('');
 $('jeuGrille').addEventListener('click',function(e){var b=e.target.closest('.sp-f');if(!b)return;var c=document.querySelector('#chips .chip[data-f="'+b.dataset.f+'"]');if(c){document.getElementById('stage').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){c.click()},450)}})}
/* la table complète : type × réactions */
function table(){var ops=0,pr=0;S.TYPES.forEach(function(T){T.actions.forEach(function(a){S.ACTIONS[a].etat==='operationnelle'?ops++:pr++})});
 $('jeuTable').innerHTML='<thead><tr><th>Élément</th><th>Reconnu par</th><th>Au survol</th><th>Actions opérationnelles</th><th>Prévues</th><th>Forme</th></tr></thead><tbody>'+S.TYPES.map(function(T){return'<tr><td><b>'+esc(T.nom)+'</b></td><td><code>'+esc(T.sel.length>60?T.sel.slice(0,58)+'…':T.sel)+'</code></td><td>Commente, propose une action</td><td>'+T.actions.filter(function(a){return S.ACTIONS[a].etat==='operationnelle'}).map(function(a){return esc(S.ACTIONS[a].nom)}).join(', ')+'</td><td>'+(T.actions.filter(function(a){return S.ACTIONS[a].etat!=='operationnelle'}).map(function(a){return esc(S.ACTIONS[a].nom)}).join(', ')||'—')+'</td><td>'+esc(S.FORMES[T.forme])+'</td></tr>'}).join('')+'</tbody>';
 $('jeuCompte').textContent=S.TYPES.length+' types d\'éléments · '+ops+' couples élément-action opérationnels · '+pr+' prévus'}
/* ce que l'orbe a appris : des comptes, et les règles qui s'en servent */
function appris(){var M=C.memoire(),types=S.TYPES.map(function(T){var a=M.actions[T.id]||{},n=Object.keys(a).reduce(function(s,k){return s+a[k]},0);return{T:T,vus:M.vus[T.id]||0,n:n,a:a}});
 var env=C.envie();$('apprisEnvie').textContent=env?'En ce moment, ma flèche pointe vers : '+env.nom.toLowerCase()+' (le type que vous avez le moins exploré à l\'écran).':'Bougez le pointeur : ma flèche cherchera ce que je n\'ai pas encore exploré.';
 $('apprisTable').innerHTML='<thead><tr><th>Élément</th><th>Survols</th><th>Actions faites</th><th>Ma suggestion, et pourquoi</th></tr></thead><tbody>'+types.map(function(x){var sg=S.suggerer(M,x.T);return'<tr><td>'+esc(x.T.nom)+'</td><td>'+x.vus+'</td><td>'+(x.n?Object.keys(x.a).map(function(k){return esc(S.ACTIONS[k].nom)+' × '+x.a[k]}).join(', '):'—')+'</td><td>'+(sg?'<b>'+esc(S.ACTIONS[sg.action].nom)+'</b> : '+esc(sg.regle):'—')+'</td></tr>'}).join('')+'</tbody>';
 $('apprisResume').textContent=Object.keys(M.vus).reduce(function(s,k){return s+M.vus[k]},0)+' survols commentés · '+types.reduce(function(s,x){return s+x.n},0)+' actions · '+M.conversations.length+' concept(s) gardé(s)'}
/* le journal : ce qu'il faut réparer, optimiser, améliorer */
var filtre='Toutes';
function journal(){var R=C.remarques().slice().reverse(),cats=['Toutes','À réparer','À optimiser','À améliorer','Concept'],F=R.filter(function(r){return filtre==='Toutes'||r.categorie===filtre});
 $('journalFiltres').innerHTML=cats.map(function(c){var n=c==='Toutes'?R.length:R.filter(function(r){return r.categorie===c}).length;return'<button type="button" class="chip" aria-pressed="'+(c===filtre)+'" data-c="'+esc(c)+'">'+esc(c)+' <b>'+n+'</b></button>'}).join('');
 $('journalListe').innerHTML=F.length?F.map(function(r){return'<li><div><span class="jr-c">'+esc(r.categorie)+'</span> <span class="jr-d">'+esc(new Date(r.date).toLocaleString('fr-FR'))+' · '+esc(r.page)+'</span></div><p>'+esc(r.texte)+'</p>'+(r.element?'<p class="jr-e">'+esc(r.element.type)+' · '+esc(r.element.chemin)+(r.element.extrait?' · « '+esc(r.element.extrait)+' »':'')+'</p>':'')+'<button type="button" class="jr-x" data-x="'+r.id+'" aria-label="Retirer cette remarque">×</button></li>'}).join(''):'<li class="jr-vide">Aucune remarque. Clic droit sur un élément, puis « Remarque » ; ou utilisez « Vérifier l\'accès ».</li>'}
function exporter(fmt){var R=C.remarques();if(fmt==='json'){var b=new Blob([JSON.stringify({export:new Date().toISOString(),source:'AIME ORB · journal local',remarques:R},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='aime-orbe-remarques.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);return}
 var md='# Remarques AIME ORB\n\n'+['À réparer','À optimiser','À améliorer','Concept'].map(function(c){var l=R.filter(function(r){return r.categorie===c});return l.length?'## '+c+'\n\n'+l.map(function(r){return'- '+r.texte.replace(/\n/g,' ')+' ('+r.page+(r.element?', '+r.element.type+' : `'+r.element.chemin+'`':'')+')'}).join('\n')+'\n':''}).join('\n');
 (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(md):Promise.reject()).then(function(){$('journalInfo').textContent='Copié en Markdown : collez-le où vous voulez.'},function(){var t=document.createElement('textarea');t.value=md;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();$('journalInfo').textContent='Copié.'})}
function reglages(){var R=C.reglages();[['commentaires','Commenter au survol'],['clic','Menu au clic sur un contenu'],['envie','Flèche vers ce que l\'orbe veut essayer'],['hesitation','Proposer de réfléchir après 3 s d\'hésitation']].forEach(function(r){var i=document.querySelector('[data-reg="'+r[0]+'"]');if(i)i.checked=R[r[0]]!==false})}
function monter(){specimens();table();appris();journal();reglages();
 $('journalFiltres').addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;filtre=b.dataset.c;journal()});
 $('journalListe').addEventListener('click',function(e){var b=e.target.closest('[data-x]');if(!b)return;C.retirerRemarque(b.dataset.x);journal()});
 $('expJson').onclick=function(){exporter('json')};$('expMd').onclick=function(){exporter('md')};
 $('parler').onclick=function(){C.converser()};
 $('oublier').onclick=function(){C.oublier();appris();journal();$('journalInfo').textContent='Mémoire et journal effacés de ce navigateur.'};
 document.getElementById('reglagesOrbe').addEventListener('change',function(e){var i=e.target.closest('[data-reg]');if(!i)return;var o={};o[i.dataset.reg]=i.checked;C.reglages(o)});
 ['memoire','remarque','action','concept'].forEach(function(n){addEventListener('aime-orbe:'+n,function(){appris();journal()})});setInterval(appris,2500)}
monter();
})();
