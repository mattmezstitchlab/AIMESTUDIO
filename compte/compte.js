/* AIME · mon compte. Connexion par lien e-mail ou clé d'accès (Better Auth), profil en timbre, espaces et invitations.
   Rien n'est décidé ici : le serveur vérifie la session et les règles de l'espace à chaque appel ; l'écran n'affiche que ce qu'il reçoit. */
(function(){'use strict';
var T=window.AIMETimbre,W=window.SimpleWebAuthnBrowser,C=window.AIMECreer,PJ=window.AIMEProjet;if(!T)return;
function $(id){return document.getElementById(id)}
/* la couleur du rôle, la même que sur l'accueil et les exemples (coeur/roles.js) : une pastille, jamais un droit */
function pastille(role){var s=document.createElement('span');s.setAttribute('aria-hidden','true');s.style.cssText='display:inline-block;width:.62em;height:.62em;border-radius:50%;margin-right:.45em;vertical-align:.02em;background:'+(window.AIMERoles?AIMERoles.couleur(role):'#9C9CA8');return s}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
var tt;function toast(m,ko){var t=$('toast');t.textContent=m;t.className='toast'+(ko?' ko':'');t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},ko?6500:3200)}
function requete(u,o){o=o||{};return fetch(u,{method:o.methode||(o.corps?'POST':'GET'),credentials:'same-origin',cache:'no-store',headers:o.corps?{'Content-Type':'application/json'}:{},body:o.corps?JSON.stringify(o.corps):undefined})
 .then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return{statut:r.status,j:j}})})}
function espaces(action,b){return requete('/api/espaces',{corps:Object.assign({action:action},b||{})}).then(function(r){if(r.statut!==200||!r.j||!r.j.ok)throw new Error((r.j&&(r.j.raison||r.j.message))||'Erreur '+r.statut);return r.j})}
function confirmer(b,texte,action){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib;action();return}b.dataset.lib=b.textContent;b.dataset.arme='1';b.textContent=texte;setTimeout(function(){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib}},4500)}
var ROLES={owner:'Propriétaire',editor:'Coordination',contributor:'Contribution',viewer:'Lecture seule',guest:'Invité'};
var MODELES={mariage:'Mariage',seminaire:'Séminaire'};

/* deux écrans, un seul moteur : /compte/ (l'identité : adresse, Timbre, clés, suppression) et /projets/ (Mes projets : espaces, invitations).
   Une invitation, un projet à ouvrir ou un projet venu du Point Zéro mènent toujours à Mes projets. */
var PROJETS=/^\/projets\/?$/.test(location.pathname);
if(!PROJETS&&/[?&](invitation|espace|nouvel|creer|activite)=/.test(location.search)){location.replace('/projets/'+location.search);return}
var Q=new URLSearchParams(location.search),
 /* venus de l'accueil (« Je suis… ») : créer le mariage, ou enregistrer l'activité d'un prestataire, une fois la session ouverte */
 CREER=Q.get('creer')==='mariage'&&/^[A-Za-z0-9_-]{6,80}$/.test(Q.get('origine')||'')?Q.get('origine'):null,ACTIVITE=/^[a-z][a-z-]{1,39}$/.test(Q.get('activite')||'')?Q.get('activite'):null,BIENVENUE=/^[a-z][a-z-]{1,39}$/.test(Q.get('bienvenue')||'')?Q.get('bienvenue'):null,INVIT=/^[A-Za-z0-9_-]{20,100}$/.test(Q.get('invitation')||'')?Q.get('invitation'):null,MODULE=window.AIMEModules&&AIMEModules.destination(Q.get('module')||'')?Q.get('module'):null,OUVRIR=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(Q.get('espace')||'')?Q.get('espace'):null,moi=null;
if(INVIT)$('invite').hidden=false;
if(PROJETS){document.title='AI · AIME';$('tTitre').textContent='AI';$('tSous').textContent='Ce qui vous concerne : demandes, projets, activités'}
if(Q.get('supprime'))toast('Votre compte a été supprimé. Merci d\'être passé par AIME.');
else if(Q.get('erreur')||Q.get('error'))toast('Ce lien de connexion n\'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau.',true);
function nettoyerAdresse(){var u=new URL(location.href);['invitation','erreur','error','error_description','supprime','nouvel','creer','origine','activite','bienvenue'].forEach(function(k){u.searchParams.delete(k)});history.replaceState(null,'',u.pathname+u.search)}

/* ---------- au chargement : la session ---------- */
requete('/api/auth/get-session').then(function(r){
 if(r.statut===503||r.statut===404){$('ferme').hidden=false;$('ferme').textContent=(r.j&&r.j.raison)||'Les comptes ne sont pas encore ouverts sur cet environnement.';if(PROJETS)surCetAppareil(false);return}
 if(!r.j||!r.j.user){$('connexion').hidden=false;if(PROJETS&&!OUVRIR&&!INVIT&&!CREER&&!ACTIVITE)surCetAppareil(false);if(CREER||ACTIVITE)$('depuisAccueil').hidden=false;if(!W||!window.PublicKeyCredential)$('cPasskey').hidden=true;return}
 moi=r.j.user;afficherProfil();inviterNom();$('profil').hidden=PROJETS;$('espaces').hidden=!PROJETS;$('zoneSuppr').hidden=PROJETS;
 /* ME (/compte/) : ma Carte et mon compte, réunis (ME v0, 25/10) : Timbre, nom, activités, clés d'accès, déconnexion, suppression */
 if(!PROJETS){document.title='ME · AIME';$('tTitre').textContent='ME';$('tSous').textContent='Votre Carte : Timbre, activités, accès et sécurité du compte';$('meDecouvrir').hidden=false;carteLocale()}
 (INVIT?espaces('rejoindre',{jeton:INVIT}).then(function(x){toast('Bienvenue dans « '+x.titre+' ».');$('invite').hidden=true;if(x.espace)OUVRIR=x.espace}).catch(function(e){toast(e.message,true);$('invite').hidden=true}):Promise.resolve())
  .then(function(){
   /* « Créer notre mariage » : la seule fonction de création, sans doublon (l'origine vient de l'accueil) ; puis l'écran du projet */
   if(PROJETS&&CREER&&C)return C.creer({titre:'Notre mariage',modele:'mariage',origine:CREER}).then(function(x){OUVRIR=x.id;C.oublier('accueil');if(!x.existant)toast('Votre mariage est créé : vous en êtes propriétaire.')}).catch(function(e){toast(e.message,true)});
   /* « Créer mon espace [métier] » : une activité, non publiée ; aucun projet, aucun droit */
   if(PROJETS&&ACTIVITE&&C)return C.activite(ACTIVITE).then(function(){BIENVENUE=ACTIVITE}).catch(function(e){toast(e.message,true)})})
  .then(function(){var nv=(Q.get('nouvel')||'').trim().slice(0,120);if(nv){$('eTitre').value=nv;toast('Un projet venu du Point Zéro : vérifiez son nom, puis créez l\'espace.')}nettoyerAdresse();
   /* AI : un seul écran pour AI, une demande et un projet (compte/ai.js) ; l'adresse choisit le contexte, sans rechargement ensuite */
   if(PROJETS&&window.AIMEAI&&PJ){if(BIENVENUE)chargerActivites(false);AIMEAI.monter({chargerAI:function(){chargerEspaces();surCetAppareil(true)}});
    if(OUVRIR&&!new URLSearchParams(location.search).get('espace')){AIMEAI.montrer('projet');PJ.ouvrir(OUVRIR,Q.get('page'))}else AIMEAI.route();
    if(/[?&]nouveau=1\b/.test(location.search)){var t0=$('eTitre');if(t0){t0.scrollIntoView({block:'center'});t0.focus()}}}
   else if(PROJETS&&OUVRIR&&PJ)PJ.ouvrir(OUVRIR,Q.get('page'));else if(PROJETS){chargerEspaces();if(BIENVENUE)chargerActivites(false);surCetAppareil(true);if(/[?&]nouveau=1\b/.test(location.search)){var t=$('eTitre');if(t){t.scrollIntoView({block:'center'});t.focus()}}}else{chargerCles();chargerActivites(true)}})
}).catch(function(){$('ferme').hidden=false;$('ferme').textContent='Serveur injoignable. Réessayez dans un instant.';if(PROJETS)surCetAppareil(false)});

/* ---------- se connecter ---------- */
$('fLien').onsubmit=function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;var cb='/projets/'+(INVIT?'?invitation='+encodeURIComponent(INVIT):OUVRIR?'?espace='+OUVRIR:CREER?'?creer=mariage&origine='+encodeURIComponent(CREER):ACTIVITE?'?activite='+encodeURIComponent(ACTIVITE):'');
 requete('/api/auth/sign-in/magic-link',{corps:{email:$('cEmail').value.trim(),callbackURL:cb,newUserCallbackURL:cb,errorCallbackURL:'/compte/?erreur=lien'}}).then(function(r){b.disabled=false;
  if(r.statut===200){$('lienEnvoye').hidden=false;$('lienEnvoye').textContent='Lien envoyé à '+$('cEmail').value.trim()+'. Ouvrez-le sur cet appareil ; il est valable 15 minutes.'}
  else toast((r.j&&(r.j.raison||r.j.message))||(r.statut===429?'Trop de demandes : patientez une minute.':'Envoi impossible.'),true)})};
$('cPasskey').onclick=function(){if(!W)return;requete('/api/auth/passkey/generate-authenticate-options').then(function(r){if(r.statut!==200)throw new Error('Clés d\'accès indisponibles.');return W.startAuthentication({optionsJSON:r.j})})
 .then(function(rep){return requete('/api/auth/passkey/verify-authentication',{corps:{response:rep}})}).then(function(r){if(r.statut!==200)throw new Error('Clé d\'accès refusée.');location.reload()})
 .catch(function(e){if(e&&e.name==='NotAllowedError')return;toast(e.message||'Connexion impossible.',true)})};
/* supprimer son compte : la confirmation est dans la page, jamais une boîte du navigateur */
$('suppr1').onclick=function(){$('suppr2').hidden=false;$('suppr1').hidden=true;$('supprNon').focus()};
$('supprNon').onclick=function(){$('suppr2').hidden=true;$('suppr1').hidden=false;$('suppr1').focus()};
$('supprOui').onclick=function(){var b=this;b.disabled=true;requete('/api/auth/delete-user',{corps:{}}).then(function(r){b.disabled=false;
  if(r.statut===200){location.href='/compte/?supprime=1';return}
  var expire=r.j&&/SESSION_EXPIRED|fresh|expired/i.test(String(r.j.code||'')+' '+String(r.j.message||''));
  var partage=r.j&&String(r.j.code||'')==='ESPACES_PARTAGES';
  toast(expire?'Par sécurité, reconnectez-vous (lien e-mail ou clé d\'accès), puis supprimez votre compte dans la foulée.':partage?String(r.j.message):'Suppression impossible pour le moment : réessayez.',true)}).catch(function(){b.disabled=false;toast('Serveur injoignable : réessayez.',true)})};
/* se déconnecter : ici, dans Mon compte (le + ne garde que des actions de projet, décision de Matt du 24/10) */
$('seDeconnecter').onclick=function(){var b=this;b.disabled=true;requete('/api/auth/sign-out',{corps:{}}).catch(function(){}).then(function(){location.href='/'})};

/* ---------- profil en timbre ---------- */
function afficherProfil(){var box=$('monTimbre');box.textContent='';var t=T.creer({id:moi.id,nom:moi.name||moi.email,detail:'Mon timbre',image:moi.image,legende:false});t.style.setProperty('--l','132px');t.tabIndex=-1;box.appendChild(t);
 $('bonjour').textContent=moi.name?' '+moi.name:'';$('monEmail').textContent=moi.email;$('nom').value=moi.name||'';$('sansPhoto').hidden=!moi.image}
function majProfil(champs,msg){return requete('/api/auth/update-user',{corps:champs}).then(function(r){if(r.statut!==200)throw new Error('Enregistrement refusé.');Object.assign(moi,champs);afficherProfil();toast(msg)}).catch(function(e){toast(e.message,true)})}
$('fNom').onsubmit=function(e){e.preventDefault();var n=$('nom').value.trim().slice(0,80);if(!n)return toast('Écrivez un nom.',true);majProfil({name:n},'Nom enregistré.')};
$('photo').onchange=function(){var f=this.files[0];this.value='';T.preparer(f).then(function(d){return majProfil({image:d},'Photo enregistrée : voici votre timbre.')}).catch(function(e){toast(e.message,true)})};
$('sansPhoto').onclick=function(){var b=this;confirmer(b,'Confirmer : retirer',function(){majProfil({image:null},'Photo retirée.')})};

/* ---------- clés d'accès ---------- */
function chargerCles(){requete('/api/auth/passkey/list-user-passkeys').then(function(r){var L=$('cles');L.textContent='';var cles=Array.isArray(r.j)?r.j:[];
 if(!cles.length){L.appendChild(el('li','leg','Aucune clé d\'accès pour l\'instant : la prochaine fois, il vous faudra un lien par e-mail.'))}
 cles.forEach(function(c){var li=el('li','lgn');li.appendChild(el('span',null,(c.name||'Clé d\'accès')+(c.createdAt?' · ajoutée le '+new Date(c.createdAt).toLocaleDateString('fr-FR'):'')));
  var b=el('button','b b-s','Supprimer');b.type='button';b.onclick=function(){confirmer(b,'Confirmer',function(){requete('/api/auth/passkey/delete-passkey',{corps:{id:c.id}}).then(function(){chargerCles();toast('Clé supprimée.')})})};li.appendChild(b);L.appendChild(li)});
 $('ajCle').hidden=!W||!window.PublicKeyCredential})}
function nomAppareil(){var u=navigator.userAgent;return/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Mac/.test(u)?'Mac':/Android/.test(u)?'Android':/Windows/.test(u)?'PC Windows':'Cet appareil'}
$('ajCle').onclick=function(){requete('/api/auth/passkey/generate-register-options').then(function(r){if(r.statut!==200)throw new Error('Clés d\'accès indisponibles.');return W.startRegistration({optionsJSON:r.j})})
 .then(function(rep){return requete('/api/auth/passkey/verify-registration',{corps:{response:rep,name:nomAppareil()}})}).then(function(r){if(r.statut!==200)throw new Error('Clé refusée.');toast('Clé d\'accès ajoutée : connectez-vous désormais sans e-mail.');chargerCles()})
 .catch(function(e){if(e&&(e.name==='NotAllowedError'||e.name==='AbortError'))return;toast(e.message||'Ajout impossible.',true)})};

/* ---------- espaces ---------- */
/* « Nouveau projet » : la seule fonction de création (compte/creer.js), sans doublon grâce à l'origine de ce brouillon ; puis l'écran du projet */
$('fEspace').onsubmit=function(e){e.preventDefault();var b=this.querySelector('button[type=submit]');if(b)b.disabled=true;C.creer({titre:$('eTitre').value,modele:$('eModele').value,origine:C.origine('nouveau')}).then(function(x){C.oublier('nouveau');if(b)b.disabled=false;$('eTitre').value='';if(window.AIMEAI){AIMEAI.projets(null);AIMEAI.ouvrirProjet(x.id)}else location.href='/projets/?espace='+encodeURIComponent(x.id)}).catch(function(err){toast(err.message,true);if(b)b.disabled=false})};
function chargerEspaces(){espaces('mes').then(function(r){var L=$('liste');L.textContent='';
 var liste=r.espaces||[];if(window.AIMEAI)AIMEAI.projets(liste);
 if(!liste.length){L.appendChild(el('p','leg','Aucun projet pour l\'instant. Créez-en un, ou ouvrez le lien d\'invitation que l\'on vous a envoyé.'));return}
 liste.forEach(function(s){var c=el('article','carte-c esp');var h=el('div','lgn');h.style.justifyContent='space-between';var t=el('div');t.appendChild(el('h3',null,s.titre));var lg=el('p','leg',(ROLES[s.role]||s.role)+(s.modele?' · '+MODELES[s.modele]:'')+(s.jusquau?' · jusqu\'au '+new Date(s.jusquau).toLocaleDateString('fr-FR'):''));lg.insertBefore(pastille(s.role),lg.firstChild);t.appendChild(lg);h.appendChild(t);
  var a=el('div','lgn');var o=el('a','b b-p','Ouvrir');var dest=MODULE&&window.AIMEModules&&AIMEModules.destination(MODULE,s.id);o.href=dest||'/projets/?espace='+encodeURIComponent(s.id);if(!dest)o.setAttribute('data-ouvrir',s.id);   /* sans rechargement (compte/ai.js) */
  o.setAttribute('aria-label','Ouvrir « '+s.titre+' »');a.appendChild(o);if(s.modele){var l=el('a','b b-s','Le direct');l.href='/live/?espace='+encodeURIComponent(s.id);a.appendChild(l)}h.appendChild(a);c.appendChild(h);L.appendChild(c)})}).catch(function(e){toast(e.message,true)})}

/* ---------- mes activités (prestataire) : un métier ; les missions arrivent par invitation ---------- */
/* V1, P4 : dans ME, on ajoute, on retire, et on choisit celles montrées sur sa Carte (le lien public, s'il existe ; jamais le Registre).
   montrer : dans ME, la section ; dans AI, seulement le mot de bienvenue après « Je suis… » (l'activité vit dans ME) */
var METIERS=null;
function metiers(){return METIERS?Promise.resolve(METIERS):fetch('/vitrine/metiers.json',{cache:'force-cache'}).then(function(r){return r.json()}).then(function(j){return METIERS=(j.metiers||[]).map(function(m){return{id:m.id,nom:m.nom}})}).catch(function(){return[]})}
function maj(t){return t.charAt(0).toUpperCase()+t.slice(1)}
function chargerActivites(montrer,focus){return espaces('activites').then(function(r){var L=r.activites||[],z=$('activites');
 if(!montrer){if(BIENVENUE){var n0=(L.filter(function(a){return a.metier===BIENVENUE})[0]||{}).nom;if(n0)toast('Votre espace '+n0+' est créé. Il se trouve dans ME.')}return}
 z.hidden=false;var ul=$('mesActivites');ul.textContent='';var dispo=r.presentation!=='indisponible';
 $('actVide').hidden=!!L.length;
 L.forEach(function(a){var li=el('li','act-l');var n=el('b',null,maj(a.nom));n.id='act-n-'+a.metier;li.appendChild(n);
  var lab=el('label','lgn act-c');var c=el('input');c.type='checkbox';c.id='act-c-'+a.metier;c.checked=!!a.sur_carte;c.disabled=!dispo;c.setAttribute('aria-describedby','act-n-'+a.metier);lab.setAttribute('for',c.id);lab.appendChild(c);lab.appendChild(el('span',null,'Montrer sur ma Carte'));li.appendChild(lab);
  c.onchange=function(){var v=c.checked;c.disabled=true;espaces('activiteCarte',{metier:a.metier,montrer:v}).then(function(){c.disabled=false;toast(v?maj(a.nom)+' apparaît sur votre Carte (son lien public, s\'il existe).':maj(a.nom)+' n\'apparaît plus sur votre Carte.')}).catch(function(e){c.disabled=false;c.checked=!v;toast(e.message,true)})};
  var x=el('button','b b-s','Retirer');x.type='button';x.setAttribute('aria-label','Retirer l\'activité '+a.nom);
  x.onclick=function(){confirmer(x,'Confirmer : retirer',function(){x.disabled=true;espaces('retirerActivite',{metier:a.metier}).then(function(){toast(maj(a.nom)+' est retirée de vos activités.');chargerActivites(true,'actAjout')}).catch(function(e){x.disabled=false;toast(e.message,true)})})};
  li.appendChild(x);ul.appendChild(li)});
 $('actIndispo').hidden=dispo;
 var m=$('invitezMoi'),site=location.origin;
 m.href='mailto:?subject='+encodeURIComponent('Invitez-moi sur AIME')+'&body='+encodeURIComponent('Bonjour,\n\nPour préparer votre mariage ensemble, invitez-moi dans votre projet AIME : créez-le sur '+site+'/ (« Futurs mariés »), puis Personnes → Inviter, avec mon adresse.\n\nÀ bientôt !');
 return metiers().then(function(M){var s=$('actAjout'),pris=L.map(function(a){return a.metier});s.textContent='';var o0=el('option',null,'Choisir un métier…');o0.value='';s.appendChild(o0);
  M.filter(function(m){return pris.indexOf(m.id)<0}).forEach(function(m){var o=el('option',null,maj(m.nom));o.value=m.id;s.appendChild(o)});
  $('fActivite').hidden=s.options.length<2;if(focus&&$(focus))$(focus).focus()})
}).catch(function(e){var z=$('activites');if(montrer&&z){z.hidden=false;$('actIndispo').hidden=false;$('actIndispo').textContent=e.message}})}
if($('fActivite'))$('fActivite').onsubmit=function(e){e.preventDefault();var s=$('actAjout'),b=this.querySelector('button');if(!s.value){toast('Choisissez un métier.',true);s.focus();return}b.disabled=true;var nom=s.options[s.selectedIndex].text;
 espaces('activite',{metier:s.value}).then(function(){b.disabled=false;toast(nom+' est ajoutée à vos activités. Elle n\'est montrée nulle part tant que vous ne cochez pas « Montrer sur ma Carte ».');chargerActivites(true,'actAjout')}).catch(function(err){b.disabled=false;toast(err.message,true)})};

/* ---------- le + de ME (V1, P4) : chaque geste mène à sa place dans ME, et y met le focus ; rien ne s'enregistre sans le bouton ---------- */
function versME(id){var cible=null,dit='';
 if(id==='modifierCarte'){var d=$('mcModifier');if(d){d.open=true;cible=$('mcmNom')}else{cible=document.querySelector('#mcCorps input, #mcCorps button');dit='Créez ou enregistrez d\'abord votre Carte sur votre compte : vous pourrez ensuite la modifier ici.'}}
 else if(id==='ajouterActivite'){var f=$('fActivite');if(f&&!f.hidden)cible=$('actAjout');else{cible=$('t-act');dit='Toutes les activités proposées sont déjà dans votre liste.'}}
 else if(id==='partagerCarte'){var p=document.querySelector('#mcCorps .mc-partage');if(p)cible=p.querySelector('input, button, a');else{cible=document.querySelector('#mcCorps input, #mcCorps button');dit='Enregistrez d\'abord votre Carte sur votre compte pour pouvoir la partager.'}}
 if(cible){if(!cible.hasAttribute('tabindex')&&/^H\d$/.test(cible.tagName))cible.setAttribute('tabindex','-1');cible.scrollIntoView({block:'center'});try{cible.focus({preventScroll:true})}catch(_){cible.focus()}}
 if(dit)toast(dit)}
if(!PROJETS)document.addEventListener('aime:dock-geste',function(e){var id=e.detail&&e.detail.id;if(id==='modifierCarte'||id==='ajouterActivite'||id==='partagerCarte'){e.preventDefault();versME(id)}})

/* ma Carte (compte/carte-compte.js) : sur cet appareil et sur mon compte, avec mon accord ; sans le module, l'ancien avis local */
function carteLocale(){var z=$('meCarte');if(!z)return;if(window.AIMECarteCompte){AIMECarteCompte.monter(z);return}var v=null;try{v=localStorage.getItem('aime-carte')}catch(_){v=null}z.hidden=!v}

/* ---------- sur cet appareil : les anciens essais de ce navigateur (accueil d'avant le 24/10) ----------
   Rien n'est perdu ni envoyé : ils restent dans ce navigateur, et ne partent au serveur que par un geste explicite (« Créer dans mon compte »). */
function surCetAppareil(connecte){var Pj=window.AIMEProjets,z=$('local');if(!Pj||!z)return;var L=[];try{L=Pj.Depot(window.localStorage).lister()}catch(e){L=[]}
 if(!L.length){z.hidden=true;return}z.hidden=false;var box=$('localListe');box.textContent='';$('localNote').textContent=connecte?'Ils restent dans ce navigateur. Pour les partager, créez-les dans votre compte : rien ne part sans ce geste.':'Ils restent dans ce navigateur. Connectez-vous pour les créer dans votre compte, si vous le souhaitez.';
 L.forEach(function(p){var e=Pj.evenement(p),c=el('article','carte-c esp'),h=el('div','lgn');h.style.justifyContent='space-between';var t=el('div');t.appendChild(el('h3',null,p.titre));
  var d=[e.date?new Date(e.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'',e.lieu||'','sur cet appareil'].filter(Boolean).join(' · ');t.appendChild(el('p','leg',d));h.appendChild(t);
  if(connecte&&C){var b=el('button','b b-s','Créer dans mon compte');b.type='button';b.setAttribute('aria-label','Créer « '+p.titre+' » dans mon compte');
   b.onclick=function(){confirmer(b,'Confirmer : créer',function(){b.disabled=true;var g=e.genre==='mariage'||e.genre==='seminaire'?e.genre:undefined,o=('essai-'+String(p.id).replace(/[^A-Za-z0-9_-]/g,'')).slice(0,80);
    C.creer({titre:p.titre,modele:g,origine:o}).then(function(x){location.href='/projets/?espace='+encodeURIComponent(x.id)}).catch(function(err){b.disabled=false;toast(err.message,true)})})};h.appendChild(b)}
  c.appendChild(h);box.appendChild(c)})}

/* ---------- le nom, à la première connexion : une invitation discrète, qu'on peut ignorer ; elle ne bloque jamais l'entrée ---------- */
function inviterNom(){var f=$('nomInvite');if(!PROJETS||!f||!moi||(moi.name&&moi.name.trim()))return;var cle='aime-nom-plus-tard-'+moi.id;try{if(localStorage.getItem(cle))return}catch(_){}
 f.hidden=false;
 $('nomPlusTard').onclick=function(){f.hidden=true;try{localStorage.setItem(cle,'1')}catch(_){}};
 f.onsubmit=function(e){e.preventDefault();var n=$('nomInviteChamp').value.trim().slice(0,80);if(!n){$('nomInviteChamp').focus();return}
  majProfil({name:n},'Merci, '+n+'.').then(function(){if(moi.name===n)f.hidden=true})}}

})();
