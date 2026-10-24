/* AIME · l'accueil : « Je suis… », la démo, puis son espace (brief unique du 24/10, PR C).
   Plus de champ de texte ni d'aperçu de site : on choisit sa place, les téléphones de la démo apparaissent (accueil/demo.js),
   puis un seul bouton, selon le rôle choisi :
   - futurs mariés ou coordination : « Créer notre mariage » → lien par e-mail → AIMECreer.creer() → l'écran du projet ;
   - prestataire : « Créer mon espace [métier] » → lien par e-mail → AIMECreer.activite() (non publiée, aucun projet, aucun droit) ;
   - invité·e : « Ce rôle arrive par invitation », sans inscription.
   Le choix ne donne aucun rôle : seule la personne qui crée un projet en devient propriétaire, parce que le serveur le crée.
   Aucun appel au serveur avant le clic sur « Créer » ; aucune donnée de démo n'est copiée dans un vrai compte.
   Les vidéos : deux vignettes, un lecteur qui se ferme avec Échap, sous-titres par défaut (quand le .vtt est là), rien en lecture automatique. */
(function(){'use strict';
var $=function(i){return document.getElementById(i)},C=window.AIMECreer,D=window.AIMEDemo;
var choix=$('jsChoix'),zone=$('demo');if(!choix||!zone||!D)return;
var METIERS=null,demo=null,courant='';
function charger(){if(METIERS)return Promise.resolve(METIERS);return fetch('/vitrine/metiers.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('metiers');return r.json()}).then(function(j){METIERS=j;return j})}
function metier(id){return METIERS&&METIERS.metiers.filter(function(m){return m.id===id})[0]}
function reduit(){return document.documentElement.classList.contains('calme')||matchMedia('(prefers-reduced-motion: reduce)').matches}
function vivant(t){var v=$('jsVivant');v.textContent='';setTimeout(function(){v.textContent=t},30)}

/* ce que dit la démo, et le bouton dessous, pour chaque choix */
function texteDe(v){
 if(v==='maries')return{tete:'Vous êtes au centre : le projet est le vôtre. Les autres téléphones montrent ce que chacun reçoit.',bouton:'Créer notre mariage',type:'projet'};
 if(v==='coordination')return{tete:'Au centre, la coordination : le déroulé, l’équipe, le plan B. Les autres téléphones montrent ce que chacun reçoit.',bouton:'Créer notre mariage',type:'projet',note:'Vous créez le projet : vous en êtes propriétaire, et vous y invitez les mariés.'};
 if(v==='invite')return{tete:'Au centre, l’invitée : le programme public, le lieu, sa réponse. Rien de plus.',type:'invite'};
 if(v.indexOf('metier:')===0){var m=metier(v.slice(7));if(!m)return null;return{tete:'Au centre, '+m.titre.charAt(0).toLowerCase()+m.titre.slice(1)+' : sa mission, et seulement elle. Les autres téléphones montrent ce que chacun reçoit.',bouton:'Créer mon espace '+m.nom,type:'activite',metier:m.id,note:m.preparation||'Votre espace ne contient aucun projet : vos missions arrivent quand des mariés ou une coordination vous invitent.'}}
 return null}

function montrer(v){courant=v;
 if(demo){demo.arreter();demo=null}
 var go=$('dmGo'),son=$('dmSon');go.hidden=false;go.disabled=false;son.hidden=true;son.setAttribute('aria-pressed','false');son.textContent='Couper le son';$('dmEtat').textContent='';
 if(!v){zone.hidden=true;document.body.classList.remove('avec-demo');return}
 charger().then(function(){var t=texteDe(v);if(!t)return;
  zone.hidden=false;document.body.classList.add('avec-demo');
  demo=D.monter(zone,METIERS,v,{etat:$('dmEtat')});
  $('dmTete').textContent=t.tete;suite(t);
  /* la démo est dans le hero : on la montre sans perdre la liste de vue sur ordinateur */
  requestAnimationFrame(function(){zone.scrollIntoView({behavior:reduit()?'auto':'smooth',block:'nearest'})})
 }).catch(function(){zone.hidden=false;$('dmEtat').textContent='La démonstration n’a pas pu être chargée. Rechargez la page.'})}

/* ---------- le bouton sous la démo ---------- */
function suite(t){var s=$('jsSuite');s.textContent='';$('jsLien').hidden=true;$('jsEnvoye').hidden=true;
 if(t.type==='invite'){var p=document.createElement('p');p.className='js-invit';p.innerHTML='<b>Ce rôle arrive par invitation.</b> Les mariés ou la coordination vous envoient un lien personnel : il suffit de l’ouvrir. Il n’y a rien à créer ici.';s.appendChild(p);return}
 var b=document.createElement('button');b.type='button';b.className='bouton js-creer';b.id='jsCreer';b.innerHTML='';b.appendChild(document.createTextNode(t.bouton+' '));var f=document.createElement('span');f.setAttribute('aria-hidden','true');f.textContent='→';b.appendChild(f);
 b.addEventListener('click',function(){creer(t,b)});s.appendChild(b);
 if(t.note){var n=document.createElement('p');n.className='js-note';n.textContent=t.note;s.appendChild(n)}}

/* où mène le lien de connexion : la page Mes projets fait le reste (compte/compte.js), une fois la session ouverte */
function retour(t){return t.type==='projet'?'/projets/?creer=mariage&origine='+encodeURIComponent(C.origine('accueil')):'/projets/?activite='+encodeURIComponent(t.metier)}
var cible=null;
function creer(t,b){if(!C)return;cible=t;b.disabled=true;
 /* le premier appel au serveur : seulement maintenant, après le clic. Déjà connecté ? on crée tout de suite. */
 fetch('/api/auth/get-session',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(s){
  if(s&&s.user)return agir(t);
  b.disabled=false;var f=$('jsLien');f.hidden=false;$('jsLienT').textContent=t.type==='projet'?'Recevez votre lien de connexion : votre mariage sera créé à l’ouverture.':'Recevez votre lien de connexion : votre espace '+metier(t.metier).nom+' sera créé à l’ouverture.';
  $('jsEmail').focus()})}
function agir(t){
 if(t.type==='projet')return C.creer({titre:'Notre mariage',modele:'mariage',origine:C.origine('accueil')}).then(function(x){C.oublier('accueil');location.href='/projets/?espace='+encodeURIComponent(x.id)}).catch(function(e){vivant(e.message);var b=$('jsCreer');if(b)b.disabled=false});
 return C.activite(t.metier).then(function(){location.href='/projets/?bienvenue='+encodeURIComponent(t.metier)}).catch(function(e){vivant(e.message);var b=$('jsCreer');if(b)b.disabled=false})}
$('jsLien').addEventListener('submit',function(e){e.preventDefault();if(!cible)return;var b=this.querySelector('button'),mail=$('jsEmail').value.trim();if(!mail){$('jsEmail').focus();return}b.disabled=true;var cb=retour(cible);
 fetch('/api/auth/sign-in/magic-link',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:mail,callbackURL:cb,newUserCallbackURL:cb,errorCallbackURL:'/projets/?erreur=lien'})})
  .then(function(r){return r.json().catch(function(){return{}}).then(function(j){b.disabled=false;
   if(r.status===200){var ok=$('jsEnvoye');ok.hidden=false;ok.textContent='Lien envoyé à '+mail+'. Ouvrez-le sur cet appareil ; il est valable 15 minutes.'}
   else vivant(j.raison||j.message||(r.status===429?'Trop de demandes : patientez une minute.':r.status===503?'Les comptes ne sont pas encore ouverts sur cet environnement.':'Envoi impossible.'))})})
  .catch(function(){b.disabled=false;vivant('Serveur injoignable. Réessayez dans un instant.')})});

/* ---------- la démo ---------- */
choix.addEventListener('change',function(){montrer(choix.value)});
$('dmGo').addEventListener('click',function(){if(!demo)return;var go=this;go.hidden=true;$('dmSon').hidden=false;demo.jouer().then(function(){go.hidden=false;go.textContent='Rejouer la démo'})});
$('dmSon').addEventListener('click',function(){if(!demo)return;var m=demo.couper();this.setAttribute('aria-pressed',m?'true':'false');this.textContent=m?'Remettre le son':'Couper le son'});
/* un choix déjà fait (retour arrière du navigateur) : la démo suit */
if(choix.value)montrer(choix.value);

/* ---------- les vidéos ---------- */
var dlg=$('lecteur'),video=$('lecteurVideo'),ouvreur=null;
function fermer(){if(!dlg.open)return;try{video.pause()}catch(e){}video.removeAttribute('src');[].forEach.call(video.querySelectorAll('track'),function(t){t.remove()});video.load();if(dlg.close)dlg.close();else dlg.removeAttribute('open');document.body.classList.remove('lecteur-ouvert');if(ouvreur)ouvreur.focus()}
[].forEach.call(document.querySelectorAll('[data-video]'),function(b){b.addEventListener('click',function(){ouvreur=b;var n=b.getAttribute('data-video');
 $('lecteurT').textContent=b.getAttribute('data-titre');video.setAttribute('poster','/media/'+n+'.jpg');video.setAttribute('preload','none');video.src='/media/'+n+'.mp4';
 /* les sous-titres, affichés par défaut, dès que leur fichier est déposé dans media/ (data-vtt sur la vignette) */
 if(b.hasAttribute('data-vtt')){var tr=document.createElement('track');tr.kind='subtitles';tr.srclang='fr';tr.label='Français';tr.src='/media/'+n+'.fr.vtt';tr.default=true;video.appendChild(tr)}
 if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');document.body.classList.add('lecteur-ouvert');
 video.addEventListener('loadedmetadata',function x(){video.removeEventListener('loadedmetadata',x);if(video.textTracks[0])video.textTracks[0].mode='showing'});
 $('lecteurFermer').focus()})});
$('lecteurFermer').addEventListener('click',fermer);
dlg.addEventListener('cancel',function(e){e.preventDefault();fermer()});
dlg.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();fermer()}});
dlg.addEventListener('click',function(e){if(e.target===dlg)fermer()});
})();
