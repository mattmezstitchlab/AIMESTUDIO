/* AIME G44 LAB · interface du kit de pilote (logique dans kit.js). La session reste dans ce navigateur (clé g44-kit). */
(function(){'use strict';var K=window.G44Kit,CLE='g44-kit',app=document.getElementById('kitApp');if(!K||!app)return;
var S=null,cur=null,parc=null,chrono=null,tick=0,effacer=false;
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function lire(){try{var t=localStorage.getItem(CLE);return t?K.lire(t):null}catch(e){return null}}
function ecrire(){try{localStorage.setItem(CLE,JSON.stringify(S))}catch(e){}}
function mm(ms){var s=Math.round(ms/1000);return Math.floor(s/60)+' min '+('0'+s%60).slice(-2)+' s'}
function telecharger(nom,txt,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:type}));a.download=nom;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
document.getElementById('kitConsigne').textContent=K.nouvelleSession(2).consigne;

function accueil(){app.innerHTML='<div class="kit-h"><span class="k">Nouvelle session</span><h3>Préparer le pilote</h3></div>'+
 '<form class="kit-f" id="kitNouveau"><label>Organisme ou service (facultatif)<input id="kitOrg" maxlength="80" placeholder="ex. Caisse pilote, service prestations"></label>'+
 '<label>Nombre de participants<input id="kitN" type="number" min="2" max="40" value="8" required></label>'+
 '<div class="actions"><button class="btn" type="submit">Créer la session</button><label class="btn sec petit kit-imp">Reprendre un export (.json)<input type="file" id="kitImp" accept="application/json,.json" hidden></label></div></form>'+
 '<p class="leg">Les participants reçoivent un code (P01, P02…). Gardez la correspondance code / personne sur papier, hors de cet outil.</p>';
 document.getElementById('kitNouveau').onsubmit=function(e){e.preventDefault();S=K.nouvelleSession(document.getElementById('kitN').value,document.getElementById('kitOrg').value);S.creeLe=new Date().toISOString().slice(0,10);cur=S.participants[0].code;parc=S.participants[0].ordre[0];ecrire();afficher()};
 document.getElementById('kitImp').onchange=importer}
function importer(){var f=this.files&&this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{S=K.lire(r.result);cur=S.participants[0].code;parc=S.participants[0].ordre[0];ecrire();afficher()}catch(e){app.insertAdjacentHTML('afterbegin','<p class="kit-err" role="alert">'+esc(e.message)+'</p>')}};r.readAsText(f)}
function P(){return S.participants.filter(function(p){return p.code===cur})[0]}
function afficher(){if(!S)return accueil();var p=P(),m=p.mesures[parc],c=K.complet(S);
 var h='<div class="kit-h"><span class="k">Session'+(S.organisme?' · '+esc(S.organisme):'')+(S.creeLe?' · '+esc(S.creeLe):'')+'</span><h3>'+S.participants.length+' participants · '+c.remplies+' mesures sur '+c.total+'</h3></div>';
 h+='<div class="kit-p" role="group" aria-label="Participant">'+S.participants.map(function(x){var n=Object.keys(x.mesures.ref).length+Object.keys(x.mesures.aug).length;return'<button type="button" data-p="'+x.code+'" aria-pressed="'+(x.code===cur)+'">'+x.code+'<small>'+n+'</small></button>'}).join('')+'</div>';
 h+='<div class="kit-o" role="group" aria-label="Parcours">'+p.ordre.map(function(k,j){return'<button type="button" data-parc="'+k+'" aria-pressed="'+(k===parc)+'">'+(j+1)+'. '+esc(K.PARCOURS[k])+'</button>'}).join('')+'</div>';
 var actif=chrono&&chrono.code===cur&&chrono.parc===parc;
 h+='<div class="kit-chrono"><output id="kitT">'+(actif?mm(Date.now()-chrono.t0):'0 min 00 s')+'</output>'+(actif?'<button class="btn sec petit" type="button" data-top="comprendre">Problème compris</button><button class="btn sec petit" type="button" data-top="procedure">Procédure trouvée</button><button class="btn petit" type="button" data-top="total">Plan terminé</button>':'<button class="btn petit" type="button" data-start>Démarrer le chronomètre</button>')+'</div>';
 h+='<div class="kit-g">'+K.INDICATEURS.map(function(ind){var v=m[ind.id],champ;
  if(ind.type==='compte')champ='<span class="kit-c"><button type="button" data-moins="'+ind.id+'" aria-label="Moins un : '+esc(ind.nom)+'">−</button><output>'+(v==null?'—':v)+'</output><button type="button" data-plus="'+ind.id+'" aria-label="Plus un : '+esc(ind.nom)+'">+</button></span>';
  else if(ind.type==='binaire')champ='<span class="kit-c"><button type="button" data-bin="'+ind.id+'" data-v="oui" aria-pressed="'+(v===1)+'">Oui</button><button type="button" data-bin="'+ind.id+'" data-v="non" aria-pressed="'+(v===0)+'">Non</button></span>';
  else if(ind.type==='echelle')champ='<select data-val="'+ind.id+'" aria-label="'+esc(ind.nom)+'"><option value="">—</option>'+[1,2,3,4,5,6,7].map(function(n){return'<option'+(v===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select>';
  else champ='<input data-val="'+ind.id+'" inputmode="decimal" value="'+(v==null?'':String(v).replace('.',','))+'" aria-label="'+esc(ind.nom)+' en minutes" placeholder="min">';
  return'<div class="kit-i"><div><b>'+esc(ind.nom)+'</b><small>'+esc(ind.aide)+'</small></div>'+champ+'</div>'}).join('')+'</div>';
 var R=K.resultats(S);h+='<div class="kit-r"><h4>Résultats de la session</h4><div class="tablo"><table><thead><tr><th scope="col">Indicateur</th><th scope="col">Référence</th><th scope="col">Augmenté</th><th scope="col">Lecture</th></tr></thead><tbody>'+R.map(function(x){var f=function(st){return st?(x.unite==='oui / non'?Math.round(st.moyenne*100)+' %':'méd. '+String(st.mediane).replace('.',','))+' <small>n='+st.n+'</small>':'—'};return'<tr><th scope="row">'+esc(x.nom)+' <small>'+esc(x.unite)+'</small></th><td>'+f(x.ref)+'</td><td>'+f(x.aug)+'</td><td>'+esc(x.lecture)+'</td></tr>'}).join('')+'</tbody></table></div>'+
  '<div class="actions"><button class="btn petit" type="button" data-csv>Exporter (.csv)</button><button class="btn sec petit" type="button" data-json>Exporter la session (.json)</button><button class="btn sec petit" type="button" data-effacer>'+(effacer?'Confirmer : tout effacer':'Effacer la session')+'</button></div></div>';
 app.innerHTML=h}
function maj(id,v){K.saisir(S,cur,parc,id,v);ecrire();afficher()}
app.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||!S)return;var d=b.dataset;
 if(d.p){cur=d.p;parc=P().ordre[0];effacer=false;afficher();var f=app.querySelector('[data-p="'+cur+'"]');f&&f.focus();return}
 if(d.parc){parc=d.parc;afficher();return}
 if(d.start!=null){chrono={code:cur,parc:parc,t0:Date.now()};clearInterval(tick);tick=setInterval(function(){var o=document.getElementById('kitT');if(o&&chrono)o.textContent=mm(Date.now()-chrono.t0)},1000);afficher();return}
 if(d.top){var min=Math.round((Date.now()-chrono.t0)/600)/100;if(d.top==='total'){clearInterval(tick);chrono=null}maj(d.top,min);return}
 if(d.plus||d.moins){var id=d.plus||d.moins,v=P().mesures[parc][id]||0;maj(id,Math.max(0,v+(d.plus?1:-1)));return}
 if(d.bin){maj(d.bin,d.v);return}
 if(d.csv!=null){telecharger('pilote-g44'+(S.creeLe?'-'+S.creeLe:'')+'.csv',K.csv(S),'text/csv;charset=utf-8');return}
 if(d.json!=null){telecharger('pilote-g44'+(S.creeLe?'-'+S.creeLe:'')+'.json',JSON.stringify(S,null,1),'application/json');return}
 if(d.effacer!=null){if(!effacer){effacer=true;afficher();return}try{localStorage.removeItem(CLE)}catch(_){}S=null;chrono=null;clearInterval(tick);effacer=false;accueil()}});
app.addEventListener('change',function(e){var t=e.target;if(t.dataset&&t.dataset.val&&S)maj(t.dataset.val,t.value)});
S=lire();if(S){cur=S.participants[0].code;parc=S.participants[0].ordre[0]}afficher();
})();
