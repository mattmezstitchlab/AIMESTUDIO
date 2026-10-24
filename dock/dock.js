/* AIME · le Dock par rôle : le composant (référence : docs/DOCK.md). Il affiche une composition de dock/modele.js,
   sans jamais décider d'une entrée : ce qui n'est pas dans la composition n'existe pas.

   AIMEDockVue.html(compo, {id, mode:'page'|'ecran', actif}) → le balisage (texte échappé)
   AIMEDockVue.poser(el, compo, opts)                      → pose le dock dans el et le rend vivant
   AIMEDockVue.monter(el)                                   → rend vivants les docks déjà posés dans el
   Événements émis sur le nav : « aime:dock-lieu » {id, nom} et « aime:dock-geste » {id, nom, geste} (après confirmation
   pour un geste sensible). Sans écouteur, le composant dit simplement ce qui se passerait : c'est une démonstration.

   Accessibilité (EAA, WCAG 2.2 AA) : nav nommée, aria-current, + en aria-haspopup="menu" / aria-expanded, menu parcourable
   aux flèches, Échap ferme et rend le focus au +, cibles de 44 px, texte sous chaque icône, pastille annoncée, aucune
   action au survol, mouvement réduit respecté. */
(function(root){'use strict';
var D=root.AIMEDock;
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* Icônes au trait (1,5 px), 24 × 24, sans couleur propre. */
var P={
 cloche:'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0',
 bulle:'M4 5h16v11H9l-5 4V5Z',
 projet:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
 part:'M12 3a9 9 0 1 0 9 9h-9V3ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z',
 calendrier:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
 coche:'M4 12l5 5L20 6',
 document:'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
 personnes:'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c1.7.7 2.8 2.5 3 5.2',
 effectif:'M5 20V10M10 20V4M15 20v-7M20 20v-4',
 budget:'M3 7h18v12H3zM3 11h18M7 15h3',
 deroule:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
 mission:'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
 reponse:'M4 5h16v11H9l-5 4V5ZM9 10.5l2 2 4-4',
 lieu:'M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
 journal:'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
 signal:'M5 21V4M5 4h11l-2 4 2 4H5',
 consentement:'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3ZM9 12l2 2 4-4',
 reglages:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12l2-1-1-3-2 .2-1.5-1.5L16.7 4l-3-1-1 2h-1.4l-1-2-3 1 .2 2.7L6 8.2 4 8l-1 3 2 1v1.4L3 14.6l1 3 2-.2 1.5 1.5L7.3 21l3 1 1-2h1.4l1 2 3-1-.2-2.7L18 16.8l2 .2 1-3-2-1.2V12Z',
 planb:'M4 7h11l-3-3M20 17H9l3 3',
 export:'M12 3v12M7 8l5-5 5 5M4 15v5h16v-5',
 controle:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l5 5',
 contenus:'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
 coeur:'M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
 exemples:'M3 6h8v12H3zM13 6h8v5h-8zM13 13h8v5h-8z',
 lab:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 14h9',
 compte:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5',
 cadeau:'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1'
};
function icone(n){return'<svg class="dock-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+(P[n]||P.projet)+'"/></svg>'}

var compteur=0;
/* le champ « J'ai reçu une invitation » du + public : un lien collé, que dock/plus.js conduit à /projets/?invitation=… (le serveur vérifie tout) */
function invitation(c,id){if(!c.plus.some(function(a){return a.id==='invitationRecue'}))return'';
 return'<form class="dock-inv" data-invitation hidden novalidate><p id="'+esc(id)+'-inv">Ouvrez le lien reçu par e-mail ou par message.</p>'+
  '<div><label class="dock-sr" for="'+esc(id)+'-lien">Lien d\'invitation</label><input id="'+esc(id)+'-lien" type="url" inputmode="url" autocomplete="off" placeholder="Collez le lien ici" aria-describedby="'+esc(id)+'-inv"><button type="submit">Ouvrir</button></div>'+
  '<p class="dock-inv-e" role="alert"></p></form>'}
function html(c,o){
 o=o||{};if(!c)return'';var id=o.id||('dock'+(++compteur)),mode=o.mode==='ecran'?'ecran':'page';
 var moitie=Math.ceil(c.lieux.length/2),gauche=c.lieux.slice(0,moitie),droite=c.lieux.slice(moitie);
 var entree=function(e){var cur=o.actif===e.id?' aria-current="page"':'',
   pas=e.id==='notifications'&&c.pastille>0?'<span class="dock-p" aria-label="'+c.pastille+' notification'+(c.pastille>1?'s':'')+'">'+c.pastille+'</span>':'',
   corps=icone(e.icone)+'<span class="dock-t">'+esc(e.nom)+'</span>'+pas;
  /* le nom en aria-label, tel qu'on l'écrit (pas en capitales : il n'est pas épelé), même quand le mot est masqué ou en petites capitales */
  var nom=' aria-label="'+esc(e.nom)+(pas?' · '+c.pastille+' notification'+(c.pastille>1?'s':''):'')+'"';
  return'<li>'+(e.href?'<a class="dock-e" href="'+esc(e.href)+'" data-lieu="'+esc(e.id)+'"'+nom+cur+'>'+corps+'</a>':'<button type="button" class="dock-e" data-lieu="'+esc(e.id)+'"'+nom+cur+'>'+corps+'</button>')+'</li>'};
 /* le + public est une carte (deux gestes et un champ) : des boutons ordinaires dans un groupe, pas un menu ; dans un projet, un vrai menu */
 var item=function(a){var attrs=(c.public?'':' role="menuitem" tabindex="-1"')+' data-geste="'+esc(a.id)+'" data-type="'+esc(a.geste)+'"'+(a.sensible?' data-sensible="1"':'');
  var t=esc(a.nom)+(a.sensible?'<small>Confirmation demandée</small>':'');
  return a.href?'<a class="dock-g" href="'+esc(a.href)+'"'+attrs+'>'+t+'</a>':'<button type="button" class="dock-g"'+attrs+'>'+t+'</button>'};
 var menu=c.plus.map(item).join('')+(c.inattendu?'<span class="dock-sep" role="separator"></span><button type="button" class="dock-g dock-g-alerte" role="menuitem" tabindex="-1" data-geste="inattendu" data-type="repondre">Je vois un accès inattendu</button>':'');
 var vide=!c.plus.length&&!c.inattendu;
 return'<div class="dock-zone dock-'+mode+'" data-dock="'+esc(id)+'">'+
  (c.mention.length?'<p class="dock-m">'+c.mention.map(esc).join(' · ')+'</p>':'')+
  '<nav class="dock" aria-label="'+(c.public?'Navigation du site':'Navigation · '+esc(c.nom))+'">'+
  '<ul class="dock-l">'+gauche.map(entree).join('')+
  '<li class="dock-c">'+(vide?'':'<button type="button" class="dock-plus"'+(c.public?'':' aria-haspopup="menu"')+' aria-expanded="false" aria-controls="'+esc(id)+'-menu" aria-label="Gestes possibles"><span aria-hidden="true"></span></button>'+
  '<div class="dock-menu'+(c.public?' dock-carte':'')+'" id="'+esc(id)+'-menu" role="'+(c.public?'group':'menu')+'" aria-label="'+(c.public?'Actions':'Gestes de '+esc(c.nom))+'" hidden>'+menu+invitation(c,id)+'</div>')+'</li>'+
  droite.map(entree).join('')+'</ul></nav>'+
  '<div class="dock-conf" role="alertdialog" aria-modal="false" aria-labelledby="'+esc(id)+'-ct" hidden><p id="'+esc(id)+'-ct"></p><div><button type="button" data-conf="oui">Confirmer</button><button type="button" data-conf="non">Annuler</button></div></div>'+
  '<p class="dock-s" role="status" aria-live="polite"></p></div>';
}

function zone(el){return el.closest('.dock-zone')}
function fermer(z,rendre){var b=z.querySelector('.dock-plus'),m=z.querySelector('.dock-menu');if(!b||!m||m.hidden)return;m.hidden=true;b.setAttribute('aria-expanded','false');if(rendre)b.focus()}
function ouvrir(z){var b=z.querySelector('.dock-plus'),m=z.querySelector('.dock-menu');if(!b||!m)return;
 document.querySelectorAll('.dock-zone').forEach(function(o){if(o!==z)fermer(o)});
 m.hidden=false;b.setAttribute('aria-expanded','true');var p=m.querySelector('[role=menuitem],.dock-g');if(p)p.focus()}
function dire(z,t){var s=z.querySelector('.dock-s');if(!s)return;s.textContent='';setTimeout(function(){s.textContent=t},30)}
function emettre(z,nom,detail){var nav=z.querySelector('.dock');var ev=new CustomEvent(nom,{bubbles:true,cancelable:true,detail:detail});return nav.dispatchEvent(ev)}

function geste(z,el){
 var d={id:el.getAttribute('data-geste'),nom:el.childNodes[0].textContent,geste:el.getAttribute('data-type')};
 fermer(z);
 if(el.getAttribute('data-sensible')){var c=z.querySelector('.dock-conf');c.querySelector('p').textContent='« '+d.nom+' » est un geste sensible. Le confirmer ?';c.hidden=false;c._d=d;c.querySelector('[data-conf=non]').focus();return}
 faire(z,d);
}
function faire(z,d){if(emettre(z,'aime:dock-geste',d))dire(z,d.id==='inattendu'?'Démonstration : votre signalement serait transmis au propriétaire et inscrit au journal.':'Démonstration : « '+d.nom+' » ne modifie et n\'envoie rien.')}

function monter(el){
 if(!el||el._dock)return;el._dock=true;
 el.addEventListener('click',function(e){
  var z=zone(e.target);if(!z)return;
  var plus=e.target.closest('.dock-plus');if(plus){var m=z.querySelector('.dock-menu');if(m.hidden)ouvrir(z);else fermer(z,true);return}
  var g=e.target.closest('.dock-g');if(g){if(g.tagName==='A'){fermer(z);return}e.preventDefault();geste(z,g);return}
  var conf=e.target.closest('[data-conf]');if(conf){var c=z.querySelector('.dock-conf'),d=c._d;c.hidden=true;c._d=null;
   if(conf.getAttribute('data-conf')==='oui'&&d)faire(z,d);else dire(z,'Annulé. Rien n\'a été fait.');var b=z.querySelector('.dock-plus');if(b)b.focus();return}
  var l=e.target.closest('.dock-e');if(l){
   z.querySelectorAll('.dock-e').forEach(function(x){x.removeAttribute('aria-current')});l.setAttribute('aria-current','page');
   var p=l.querySelector('.dock-p');if(p)p.remove();
   if(l.tagName==='A')return;
   var det={id:l.getAttribute('data-lieu'),nom:l.querySelector('.dock-t').textContent};
   if(emettre(z,'aime:dock-lieu',det))dire(z,'Démonstration : « '+det.nom+' » s\'ouvrirait ici.')}
 });
 el.addEventListener('keydown',function(e){
  var z=zone(e.target);if(!z)return;var m=z.querySelector('.dock-menu');
  if(e.key==='Escape'){var c=z.querySelector('.dock-conf');if(c&&!c.hidden){c.hidden=true;c._d=null;dire(z,'Annulé. Rien n\'a été fait.');z.querySelector('.dock-plus').focus();e.preventDefault();return}
   if(m&&!m.hidden){fermer(z,true);e.preventDefault()}return}
  if(!m||m.hidden||!m.contains(e.target))return;
  var it=[].slice.call(m.querySelectorAll('[role=menuitem]')),i=it.indexOf(e.target);if(i<0)return;   /* dans le champ d'invitation, les flèches restent au champ */
  if(e.key==='ArrowDown'||e.key==='ArrowRight'){it[(i+1)%it.length].focus();e.preventDefault()}
  else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){it[(i-1+it.length)%it.length].focus();e.preventDefault()}
  else if(e.key==='Home'){it[0].focus();e.preventDefault()}else if(e.key==='End'){it[it.length-1].focus();e.preventDefault()}
 });
 /* le focus quitte le menu (Tab, clic ailleurs) : il se referme ; il reste ouvert tant qu'on passe d'un geste au champ d'invitation */
 el.addEventListener('focusout',function(e){var z=zone(e.target);if(!z)return;var m=z.querySelector('.dock-menu');if(!m||m.hidden||!m.contains(e.target))return;
  var vers=e.relatedTarget;if(vers&&(m.contains(vers)||vers===z.querySelector('.dock-plus')))return;if(vers)fermer(z)});
 if(!root._aimeDockDoc){root._aimeDockDoc=true;document.addEventListener('click',function(e){if(!e.target.closest('.dock-zone'))document.querySelectorAll('.dock-zone').forEach(function(z){fermer(z)})})}
}

/* un mot du Dock ne passe jamais sur deux lignes ni ne déborde : sur un écran très étroit, tout le Dock prend un point de moins (jamais un mot coupé) */
function ajuster(z){if(!z||!z.classList.contains('dock-page'))return;z.classList.remove('serre');
 var trop=[].some.call(z.querySelectorAll('.dock-t'),function(t){return t.scrollWidth>t.clientWidth+1||t.getClientRects().length>1});if(trop)z.classList.add('serre')}
function poser(el,c,o){if(!el)return;el._dockOpts=o||{};el.innerHTML=html(c,o);monter(el);var z=el.querySelector('.dock-zone');ajuster(z);
 if(!el._ajuste&&typeof addEventListener==='function'){el._ajuste=true;addEventListener('resize',function(){ajuster(el.querySelector('.dock-zone'))});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){ajuster(el.querySelector('.dock-zone'))})}
 return z}

root.AIMEDockVue={html:html,poser:poser,monter:monter,ajuster:ajuster,icone:icone,ICONES:Object.keys(P)};   /* icone : aussi pour la grille « Qu'attendez-vous d'AIME ? » (attente/attente.js) */
})(typeof self!=='undefined'?self:this);
