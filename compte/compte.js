/* AIME · mon compte. Connexion par lien e-mail ou clé d'accès (Better Auth), profil en timbre, espaces et invitations.
   Rien n'est décidé ici : le serveur vérifie la session et les règles de l'espace à chaque appel ; l'écran n'affiche que ce qu'il reçoit. */
(function(){'use strict';
var T=window.AIMETimbre,P=window.AIMEPerms,W=window.SimpleWebAuthnBrowser;if(!T||!P)return;
function $(id){return document.getElementById(id)}
/* la couleur du rôle, la même que sur l'accueil et les exemples (coeur/roles.js) : une pastille, jamais un droit */
function pastille(role){var s=document.createElement('span');s.setAttribute('aria-hidden','true');s.style.cssText='display:inline-block;width:.62em;height:.62em;border-radius:50%;margin-right:.45em;vertical-align:.02em;background:'+(window.AIMERoles?AIMERoles.couleur(role):'#9C9CA8');return s}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
var tt;function toast(m,ko){var t=$('toast');t.textContent=m;t.className='toast'+(ko?' ko':'');t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true},ko?6500:3200)}
function requete(u,o){o=o||{};return fetch(u,{method:o.methode||(o.corps?'POST':'GET'),credentials:'same-origin',cache:'no-store',headers:o.corps?{'Content-Type':'application/json'}:{},body:o.corps?JSON.stringify(o.corps):undefined})
 .then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return{statut:r.status,j:j}})})}
function espaces(action,b){return requete('/api/espaces',{corps:Object.assign({action:action},b||{})}).then(function(r){if(r.statut!==200||!r.j||!r.j.ok)throw new Error((r.j&&(r.j.raison||r.j.message))||'Erreur '+r.statut);return r.j})}
function confirmer(b,texte,action){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib;action();return}b.dataset.lib=b.textContent;b.dataset.arme='1';b.textContent=texte;setTimeout(function(){if(b.dataset.arme){delete b.dataset.arme;b.textContent=b.dataset.lib}},4500)}
var ROLES={owner:'Propriétaire',editor:'Coordination',contributor:'Contributeur (prestataire, intervenant)',viewer:'Lecture seule',guest:'Invité'};
var MODELES={mariage:'Mariage',seminaire:'Séminaire'};

var Q=new URLSearchParams(location.search),INVIT=/^[A-Za-z0-9_-]{20,100}$/.test(Q.get('invitation')||'')?Q.get('invitation'):null,moi=null;
if(INVIT)$('invite').hidden=false;
if(Q.get('supprime'))toast('Votre compte a été supprimé. Merci d\'être passé par AIME.');
else if(Q.get('erreur')||Q.get('error'))toast('Ce lien de connexion n\'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau.',true);
function nettoyerAdresse(){var u=new URL(location.href);['invitation','erreur','error','error_description','supprime','nouvel'].forEach(function(k){u.searchParams.delete(k)});history.replaceState(null,'',u.pathname+u.search)}

/* ---------- au chargement : la session ---------- */
requete('/api/auth/get-session').then(function(r){
 if(r.statut===503||r.statut===404){$('ferme').hidden=false;$('ferme').textContent=(r.j&&r.j.raison)||'Les comptes ne sont pas encore ouverts sur cet environnement.';return}
 if(!r.j||!r.j.user){$('connexion').hidden=false;if(!W||!window.PublicKeyCredential)$('cPasskey').hidden=true;return}
 moi=r.j.user;afficherProfil();$('profil').hidden=false;$('espaces').hidden=false;$('sortir').hidden=false;$('zoneSuppr').hidden=false;
 (INVIT?espaces('rejoindre',{jeton:INVIT}).then(function(x){toast('Bienvenue dans « '+x.titre+' » ('+(ROLES[x.role]||x.role)+').');$('invite').hidden=true}).catch(function(e){toast(e.message,true);$('invite').hidden=true}):Promise.resolve())
  .then(function(){var nv=(Q.get('nouvel')||'').trim().slice(0,120);if(nv){$('eTitre').value=nv;toast('Un projet venu du Point Zéro : vérifiez son nom, puis créez l\'espace.')}nettoyerAdresse();chargerEspaces();chargerCles()})
}).catch(function(){$('ferme').hidden=false;$('ferme').textContent='Serveur injoignable. Réessayez dans un instant.'});

/* ---------- se connecter ---------- */
$('fLien').onsubmit=function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;var cb='/compte/'+(INVIT?'?invitation='+encodeURIComponent(INVIT):'');
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
  toast(expire?'Par sécurité, reconnectez-vous (lien e-mail ou clé d\'accès), puis supprimez votre compte dans la foulée.':'Suppression impossible pour le moment : réessayez.',true)}).catch(function(){b.disabled=false;toast('Serveur injoignable : réessayez.',true)})};
$('sortir').onclick=function(){requete('/api/auth/sign-out',{corps:{}}).then(function(){location.href='/compte/'})};

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
$('fEspace').onsubmit=function(e){e.preventDefault();espaces('creer',{titre:$('eTitre').value,modele:$('eModele').value}).then(function(x){$('eTitre').value='';toast('Espace « '+x.titre+' » créé. Invitez maintenant les autres.');chargerEspaces(x.id)}).catch(function(err){toast(err.message,true)})};
function chargerEspaces(ouvert){espaces('mes').then(function(r){var L=$('liste');L.textContent='';
 var liste=r.espaces||[];
 if(!liste.length){L.appendChild(el('p','leg','Aucun espace pour l\'instant. Créez-en un, ou ouvrez le lien d\'invitation que l\'on vous a envoyé.'));return}
 liste.forEach(function(s){var c=el('article','carte-c esp');var h=el('div','lgn');h.style.justifyContent='space-between';var t=el('div');t.appendChild(el('h3',null,s.titre));var lg=el('p','leg',(ROLES[s.role]||s.role)+(s.modele?' · programme : '+MODELES[s.modele]:''));lg.insertBefore(pastille(s.role),lg.firstChild);t.appendChild(lg);h.appendChild(t);
  var a=el('div','lgn');if(s.modele){var l=el('a','b b-s','Ouvrir le direct');l.href='/live/?espace='+encodeURIComponent(s.id);a.appendChild(l)}var m=el('button','b b-s','Membres et invitations');m.type='button';m.setAttribute('aria-expanded','false');a.appendChild(m);h.appendChild(a);c.appendChild(h);
  var pan=el('div','pan pile');pan.hidden=true;c.appendChild(pan);m.onclick=function(){var o=pan.hidden;pan.hidden=!o;m.setAttribute('aria-expanded',String(o));if(o)chargerMembres(s,pan)};L.appendChild(c);if(s.id===ouvert)m.click()})}).catch(function(e){toast(e.message,true)})}

function chargerMembres(s,pan,dernier){pan.textContent='';pan.appendChild(el('p','leg','Chargement…'));espaces('membres',{espace:s.id}).then(function(r){pan.textContent='';
 var pl=el('div','planche');pl.setAttribute('aria-label','Membres de l\'espace');r.membres.forEach(function(x){pl.appendChild(T.creer({id:x.id,nom:x.nom+(x.id===r.moi.id?' (vous)':'')+(x.jusquau?' · jusqu\'au '+new Date(x.jusquau).toLocaleDateString('fr-FR'):''),role:x.role,image:x.image}))});pan.appendChild(pl);
 /* hors de sa portée, les autres membres ne sont pas envoyés : seulement des effectifs, sans noms, si le rôle y a droit */
 if(r.effectif)pan.appendChild(el('p','leg','Dans l\'espace : '+Object.keys(ROLES).filter(function(k){return r.effectif[k]}).map(function(k){return r.effectif[k]+' × '+ROLES[k].split(' (')[0].toLowerCase()}).join(', ')+'.'));
 /* inviter : seulement les rôles que les règles ouvrent à mon rôle (le serveur revérifie) */
 var possibles=['editor','contributor','viewer','guest'].filter(function(k){return P.can({id:r.moi.id,role:r.moi.role},'invite',{type:'space',role:k}).allow});
 if(possibles.length){var f=el('form','lgn inv');var sel=el('select');sel.setAttribute('aria-label','Rôle de la personne invitée');possibles.forEach(function(k){var o=el('option',null,ROLES[k]);o.value=k;sel.appendChild(o)});
  var em=el('input');em.type='email';em.placeholder='Son adresse e-mail (facultatif : réserve le lien à cette adresse)';em.setAttribute('aria-label','Adresse e-mail de la personne invitée');em.style.flex='1';em.style.minWidth='220px';
  var ju=el('input');ju.type='date';ju.setAttribute('aria-label','Rôle valable jusqu\'au (facultatif)');ju.title='Rôle valable jusqu\'au (facultatif)';ju.min=new Date(Date.now()+864e5).toISOString().slice(0,10);
  var ok=el('button','b b-p','Créer le lien d\'invitation');ok.type='submit';f.appendChild(sel);f.appendChild(em);f.appendChild(ju);f.appendChild(ok);pan.appendChild(f);var res=el('div','pile');pan.appendChild(res);
  function montrer(x){res.textContent='';var lg=el('div','lgn lien');var i=el('input');i.readOnly=true;i.value=x.lien;i.setAttribute('aria-label','Lien d\'invitation');i.style.flex='1';i.style.minWidth='0';
    var cp=el('button','b','Copier');cp.type='button';cp.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(x.lien):Promise.reject()).then(function(){toast('Lien copié.')}).catch(function(){i.select();toast('Sélectionné : copiez-le.')})};lg.appendChild(i);lg.appendChild(cp);res.appendChild(lg);
    res.appendChild(el('p','leg','Lien à usage unique, valable '+x.jours+' jours, pour le rôle « '+ROLES[x.role]+' »'+(x.email?', réservé à '+x.email:'')+(x.jusquau?' ; le rôle prendra fin le '+new Date(x.jusquau).toLocaleDateString('fr-FR'):'')+'. Envoyez-le par le moyen de votre choix.'))}
  if(dernier)montrer(dernier);
  f.onsubmit=function(e){e.preventDefault();espaces('inviter',{espace:s.id,role:sel.value,email:em.value.trim()||undefined,jusquau:ju.value?new Date(ju.value+'T23:59:59').toISOString():undefined}).then(function(x){if(r.gerer)chargerMembres(s,pan,x);else montrer(x)}).catch(function(err){toast(err.message,true)})}}
 else pan.appendChild(el('p','leg','Votre rôle ne permet pas d\'inviter dans cet espace.'));
 /* gérer : le propriétaire voit les adresses, les invitations, et peut retirer quelqu'un */
 if(r.gerer){var g=el('div','pile gerer');g.appendChild(el('h4','k','Membres'));r.membres.forEach(function(x){var li=el('div','lgn ligne');li.appendChild(T.creer({id:x.id,nom:x.nom,role:x.role,image:x.image,mini:true}));var nm=el('span',null,x.nom+' · '+(ROLES[x.role]||x.role)+(x.email?' · '+x.email:''));nm.insertBefore(pastille(x.role),nm.firstChild);li.appendChild(nm);
   if(x.id!==r.moi.id){var b=el('button','b b-s','Retirer');b.type='button';b.onclick=function(){confirmer(b,'Confirmer le retrait',function(){espaces('retirer',{espace:s.id,membre:x.id}).then(function(){toast(x.nom+' a été retiré·e.');chargerMembres(s,pan)}).catch(function(e){toast(e.message,true)})})};li.appendChild(b)}g.appendChild(li)});
  var inv=(r.invitations||[]);if(inv.length){g.appendChild(el('h4','k','Invitations'));inv.forEach(function(v){var exp=new Date(v.expire),actif=!v.utilisee&&exp>new Date();var li=el('div','lgn ligne');li.appendChild(el('span',null,ROLES[v.role]+(v.email?' · '+v.email:'')+' · '+(v.utilisee?'utilisée':actif?'expire le '+exp.toLocaleDateString('fr-FR'):'expirée')));
   if(actif){var b=el('button','b b-s','Annuler');b.type='button';b.onclick=function(){espaces('annuler',{espace:s.id,invitation:v.id}).then(function(){chargerMembres(s,pan)}).catch(function(e){toast(e.message,true)})};li.appendChild(b)}g.appendChild(li)})}pan.appendChild(g)}
}).catch(function(e){pan.textContent='';pan.appendChild(el('p','alerte',e.message))})}
})();
