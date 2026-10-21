/* AIME · Page Zéro : le formulaire de contact. Vérifie les champs avant l'envoi (le serveur revérifie tout),
   envoie en JSON à /api/contact, et dit clairement ce qui s'est passé. Aucune donnée n'est gardée dans le navigateur. */
(function(){'use strict';
var f=document.getElementById('formContact');if(!f)return;
var t0=Date.now(),envoi=document.getElementById('c-envoyer'),etat=document.getElementById('c-etat'),msg=document.getElementById('c-message'),compte=document.getElementById('compte');
var CHAMPS=['prenom','nom','email','tel','adresse','livraison','message'];
function el(n){return f.elements[n]}
function erreur(n,texte){var e=document.getElementById('e-'+n),c=n==='consentement'?document.getElementById('c-accord'):el(n);if(e)e.textContent=texte||'';if(c&&c.setAttribute){if(texte)c.setAttribute('aria-invalid','true');else c.removeAttribute('aria-invalid')}}
function dire(texte,ok){etat.textContent=texte;etat.className='etat'+(ok===true?' ok':ok===false?' ko':'')}
msg.addEventListener('input',function(){compte.textContent=msg.value.length.toLocaleString('fr-FR')});
var d=el('livraison');d.min=new Date().toISOString().slice(0,10);

function lire(){var v={};CHAMPS.forEach(function(n){v[n]=el(n).value.trim()});var p=f.querySelector('input[name=projet]:checked');v.projet=p?p.value:'';v.consentement=document.getElementById('c-accord').checked;v.site_web=el('site_web').value;v.duree=Date.now()-t0;return v}
function verifier(v){var e={};
 if(!v.prenom)e.prenom='Indiquez votre prénom.';if(!v.nom)e.nom='Indiquez votre nom.';
 if(!/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/.test(v.email))e.email='Adresse e-mail invalide.';
 if(v.tel&&!/^[0-9+().\s-]{6,30}$/.test(v.tel))e.tel='Numéro de téléphone invalide.';
 if(v.livraison&&v.livraison<new Date(Date.now()-86400000).toISOString().slice(0,10))e.livraison='La date de livraison est déjà passée.';
 if(v.message.length<20)e.message='Décrivez votre demande en quelques phrases (20 caractères au moins).';
 if(!v.consentement)e.consentement='Cochez la case pour que nous puissions vous répondre.';return e}
function montrer(e){CHAMPS.concat(['consentement']).forEach(function(n){erreur(n,e[n])});var k=Object.keys(e);if(k.length){var c=k[0]==='consentement'?document.getElementById('c-accord'):el(k[0]);c&&c.focus();dire(k.length>1?k.length+' champs à corriger.':'Un champ à corriger.',false)}return!k.length}

f.addEventListener('submit',function(ev){ev.preventDefault();if(envoi.disabled)return;var v=lire();if(!montrer(verifier(v)))return;
 envoi.disabled=true;dire('Envoi en cours…');
 fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v),credentials:'same-origin'}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{s:r.status,j:j}})}).then(function(x){
  if(x.s===200&&x.j.ok){f.reset();compte.textContent='0';t0=Date.now();dire('Merci, votre demande est bien partie. Vous recevrez une réponse par e-mail.',true);return}
  if(x.s===422&&x.j.champs){montrer(x.j.champs);return}
  if(x.s===429){var m=Math.max(1,Math.ceil((x.j.attente||600)/60));dire('Trop d\'envois en peu de temps. Réessayez dans '+m+' minute'+(m>1?'s':'')+'.',false);return}
  if(x.s===503){dire('Le formulaire n\'est pas encore ouvert sur cette version du site. Rien n\'a été envoyé.',false);return}
  dire('L\'envoi n\'a pas abouti. Rien n\'a été perdu : votre texte est toujours là, réessayez dans un instant.',false)
 }).catch(function(){dire('Pas de connexion. Votre texte est toujours là : réessayez quand le réseau revient.',false)}).then(function(){envoi.disabled=false})});
})();
