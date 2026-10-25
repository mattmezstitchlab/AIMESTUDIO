(function initFenetreContact(){
 'use strict';
 const $=id=>document.getElementById(id);
 const compact=$('visitorNote'), subject=$('visitorNoteText'), original=$('commandCapsule'), status=$('noteStatus');
 if(!compact||!subject||!original)return;
 const startedAt=Date.now();
 let stage=0,busy=false,wasSent=false,previousFocus=null;
 const panel=document.createElement('section');
 panel.id='fc-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','fc-title');
 panel.innerHTML=[
 '<header><h2 class="fc-title" id="fc-title">Écrire à AIME</h2><button type="button" class="fc-close" id="fc-close" aria-label="Fermer le contact">×</button></header>',
 '<form id="fc-form" novalidate>',
 '<div class="fc-step" data-step="0"><p class="fc-hint">01 / 03 · Votre demande</p>',
 '<div class="fc-field"><label for="fc-object">Objet du message *</label><input id="fc-object" name="objet" maxlength="140" required placeholder="Ex. Musique pour notre mariage"></div>',
 '<div class="fc-field"><label for="fc-kind">De quoi s’agit-il ? *</label><select id="fc-kind" name="nature"><option value="evenement">Prestation ou événement</option><option value="site">Création de site</option><option value="refonte">Refonte / amélioration</option><option value="supports">Supports graphiques / design</option><option value="partenariat">Collaboration / partenariat</option><option value="autre">Autre demande</option></select></div>',
 '<div class="fc-field" id="fc-event-wrap"><label for="fc-event">Type d’événement</label><select id="fc-event"><option>Mariage</option><option>Événement d’entreprise</option><option>Anniversaire / fête privée</option><option>Commémoration / cérémonie</option><option>Association / solidarité</option><option>Autre événement</option></select></div>',
 '<div class="fc-field" id="fc-presta-wrap"><label for="fc-presta">Prestation recherchée</label><select id="fc-presta"><option>Saxophoniste / musique</option><option>Conception d’expérience / application</option><option>Direction artistique / design</option><option>Organisation / coordination</option><option>Autre prestation</option></select></div>',
 '</div>',
 '<div class="fc-step" data-step="1" hidden><p class="fc-hint">02 / 03 · Précisions</p>',
 '<div class="fc-grid"><div class="fc-field"><label for="fc-date">Date souhaitée</label><input type="date" id="fc-date"></div><div class="fc-field"><label for="fc-place">Lieu / ville</label><input id="fc-place" maxlength="180" placeholder="Ville ou lieu"></div></div>',
 '<div class="fc-field"><label for="fc-message">Décrivez votre besoin (facultatif)</label><textarea id="fc-message" maxlength="3200" placeholder="Votre idée, le déroulement, les horaires, vos besoins…"></textarea></div>',
 '<p class="fc-hint">Il n’est pas nécessaire d’avoir un projet entièrement défini pour écrire.</p>',
 '</div>',
 '<div class="fc-step" data-step="2" hidden><p class="fc-hint">03 / 03 · Votre réponse</p>',
 '<div class="fc-grid"><div class="fc-field"><label for="fc-first">Prénom *</label><input id="fc-first" maxlength="80" autocomplete="given-name" required></div><div class="fc-field"><label for="fc-last">Nom *</label><input id="fc-last" maxlength="80" autocomplete="family-name" required></div></div>',
 '<div class="fc-field"><label for="fc-email">E-mail *</label><input type="email" id="fc-email" maxlength="160" autocomplete="email" required></div>',
 '<div class="fc-field"><label for="fc-tel">Téléphone (facultatif)</label><input type="tel" id="fc-tel" maxlength="30" autocomplete="tel"></div>',
 '<label class="fc-consent" for="fc-consent"><input type="checkbox" id="fc-consent" required><span>J’accepte l’utilisation de ces informations pour répondre à ma demande. Conservation annoncée : jusqu’à 24 mois après le dernier échange. <a href="/confidentialite/" target="_blank" rel="noopener noreferrer">Confidentialité</a>.</span></label>',
 '<input class="fc-trap" id="fc-web" name="site_web" tabindex="-1" autocomplete="off" aria-hidden="true">',
 '</div>',
 '<div class="fc-actions"><button type="button" id="fc-back">Retour</button><button type="button" id="fc-next" class="fc-primary">Continuer →</button><button type="submit" id="fc-send" class="fc-primary" hidden>Envoyer la demande →</button></div>',
 '<p class="fc-status" id="fc-status" role="status" aria-live="polite"></p>',
 '</form>'
 ].join('');
 document.body.appendChild(panel);
 const form=$('fc-form');
 const info=$('fc-status');
 const val=id=>$(id).value.trim();
 const error=(s,ok=false)=>{info.textContent=s;info.classList.toggle('ok',ok)};
 function types(){
  const isEvent=val('fc-kind')==='evenement';
  $('fc-event-wrap').hidden=!isEvent;$('fc-presta-wrap').hidden=!isEvent;
 }
 function update(){
  Array.from(panel.querySelectorAll('[data-step]')).forEach(el=>el.hidden=Number(el.dataset.step)!==stage);
  $('fc-back').hidden=stage===0;$('fc-next').hidden=stage===2;$('fc-send').hidden=stage!==2;
  error('');
  const toFocus=stage===0?$('fc-object'):stage===1?$('fc-date'):$('fc-first');
  toFocus.focus();
 }
 function closeAll(){
  panel.hidden=true;compact.hidden=true;original.hidden=false;
  if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  else $('postitBtn').focus();
 }
 function openCompact(){
  previousFocus=document.activeElement;
  for(const id of ['commandModes','commandMore','sceneCatalog','pop','plPop']){const n=$(id);if(n)n.hidden=true}
  compact.hidden=false;original.hidden=true;panel.hidden=true;status.hidden=false;
  status.textContent='Objet de la demande : puis → pour continuer dans la fenêtre.';
  subject.focus();
 }
 function openPanel(){
  const t=subject.value.trim();
  if(t.length<4){status.textContent='Indiquez un objet (4 caractères au moins).';status.hidden=false;subject.focus();return}
  $('fc-object').value=t;
  compact.hidden=true;original.hidden=false;panel.hidden=false;stage=0;types();update();
 }
 document.addEventListener('openaime:compose',openCompact);
 $('noteBack').addEventListener('click',closeAll);
 $('noteDiscard').addEventListener('click',()=>{if(subject.value&&!window.confirm('Effacer l’objet de votre demande ?'))return;subject.value='';status.hidden=true;subject.focus()});
 compact.addEventListener('submit',e=>{e.preventDefault();openPanel()});
 $('fc-kind').addEventListener('change',types);
 $('fc-close').addEventListener('click',()=>{panel.hidden=true;compact.hidden=false;original.hidden=true;subject.focus()});
 $('fc-back').addEventListener('click',()=>{if(busy)return;stage=Math.max(0,stage-1);update()});
 function checkStep(){
  if(stage===0&&!$('fc-object').checkValidity()){$('fc-object').reportValidity();return false}
  return true;
 }
 $('fc-next').addEventListener('click',()=>{if(busy||!checkStep())return;stage=Math.min(2,stage+1);update()});
 panel.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();$('fc-close').click();return}
  if(e.key!=='Tab')return;
  const list=Array.from(panel.querySelectorAll('input,textarea,select,button,a')).filter(x=>!x.closest('[hidden]')&&!x.disabled&&x.tabIndex!==-1&&x.getClientRects().length);
  if(!list.length)return;
  if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list[list.length-1].focus()}
  else if(!e.shiftKey&&document.activeElement===list[list.length-1]){e.preventDefault();list[0].focus()}
 });
 function message(){
  const category=val('fc-kind');
  const labels={evenement:'Prestation / événement',site:'Création de site',refonte:'Refonte',supports:'Design / supports',partenariat:'Collaboration',autre:'Autre'};
  const lines=['Objet : '+val('fc-object'),'Nature : '+labels[category]];
  if(category==='evenement'){lines.push('Type d’événement : '+val('fc-event'));lines.push('Prestation : '+val('fc-presta'))}
  if(val('fc-date'))lines.push('Date souhaitée : '+val('fc-date'));
  if(val('fc-place'))lines.push('Lieu : '+val('fc-place'));
  if(val('fc-message'))lines.push('Description :\n'+val('fc-message'));
  return lines.join('\n');
 }
 function project(){
  const c=val('fc-kind');return {evenement:'projet',site:'site',refonte:'refonte',supports:'supports',partenariat:'projet',autre:'autre'}[c]||'autre';
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||stage!==2)return;
  for(const id of ['fc-first','fc-last','fc-email','fc-consent']){if(!$(id).checkValidity()){$(id).reportValidity();return}}
  const text=message();
  if(text.length<20||text.length>4000){error('Précisez votre demande ; elle doit contenir entre 20 et 4 000 caractères.');return}
  const duration=Date.now()-startedAt;if(duration<3000){error('Vous pouvez envoyer votre demande dans un instant.');return}
  const payload={prenom:val('fc-first'),nom:val('fc-last'),email:val('fc-email'),tel:val('fc-tel'),adresse:val('fc-place'),livraison:val('fc-date'),projet:project(),message:text,consentement:$('fc-consent').checked,site_web:val('fc-web'),duree:duration};
  busy=true;$('fc-send').disabled=true;error('Envoi en cours…');
  try{
   const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
   const body=await response.json().catch(()=>({}));
   if(response.ok&&body.ok){
    wasSent=true;error('Votre demande a été prise en charge par AIME. Merci !',true);
    $('fc-send').hidden=true;$('fc-back').hidden=true;$('fc-next').hidden=true;
    subject.value='';
   }else if(response.status===422){
    error('Champs à corriger : '+Object.values(body.champs||{}).join(' ')||'Données à vérifier.');
   }else if(response.status===429){
    error('Trop de demandes rapprochées. Réessayez plus tard.');
   }else if(response.status===503){
    error('Le contact n’est pas configuré dans cet environnement. Rien n’a été envoyé.');
   }else{error('La demande n’a pas abouti. Votre texte reste disponible pour réessayer.')}
  }catch(_){error('Réseau indisponible. Votre demande reste dans la fenêtre pour réessayer.')}
  finally{busy=false;$('fc-send').disabled=false}
 });
 $('fc-close').addEventListener('click',()=>{if(wasSent){form.reset();wasSent=false;closeAll()}});
})();
