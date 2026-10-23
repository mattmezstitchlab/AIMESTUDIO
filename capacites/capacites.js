/* AIME · Atlas des capacités : l'interface. Lit trois fichiers publics, n'écrit rien, ne garde rien. */
(function(){'use strict';
var A=window.AIMECapacites;if(!A)return;
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var GH='https://github.com/mattmezstitchlab/';
var D=null,liste=[],montres=0,PAS=60;

function statut(s){var x=A.STATUTS[s]||{nom:s};return'<span class="statut s-'+esc(s)+'" title="'+esc(x.dit||'')+'">'+esc(x.nom)+'</span>'}
function nombre(n){return Number(n).toLocaleString('fr-FR')}
function dateFr(iso){if(!iso)return'—';var p=iso.split('-');return p[2]+'/'+p[1]+'/'+p[0]}

/* Ce que l'audit dit d'un dépôt, en phrases courtes. */
function attention(s,prive){
 if(prive||!s||s.lu===false)return['<span class="att">Privé : non lu par l\'audit</span>'];
 var o=[];
 if(s.contenuDansUneBranche)o.push('<span class="att warn">Le code est dans une branche, pas sur main</span>');
 if(s.codeArchive)o.push('<span class="att warn">Code enfermé dans un .zip</span>');
 if(s.failles&&s.failles.critiques)o.push('<span class="att '+(s.correctifPret?'warn':'crit')+'">'+s.failles.critiques+' faille(s) critique(s)'+(s.correctifPret?' · correctif prêt':'')+'</span>');
 else if(s.failles&&s.failles.elevees)o.push('<span class="att warn">'+s.failles.elevees+' faille(s) élevée(s)</span>');
 if(s.brancheNonFusionnees)o.push('<span class="att">'+s.brancheNonFusionnees+' branche(s) non fusionnée(s)</span>');
 if(s.vercel&&s.vercel.http===404)o.push('<span class="att warn">Site Vercel « '+esc(s.vercel.projet)+' » introuvable</span>');
 if(s.etat==='Vide'||s.etat==='Coquille')o.push('<span class="att">Dépôt '+(s.etat==='Vide'?'vide':'quasi vide')+'</span>');
 if(!o.length)o.push('<span class="att ok">Rien à signaler</span>');
 return o;
}

function rendreChiffres(){
 var c=D.chiffres,p=c.parStatut;
 var items=[[c.modules,'modules déclarés'],[c.depots,'dépôts sources'],[c.cites,'cités par les univers d\'AIME'],[(p.integre||0)+(p.partiel||0),'dans des dépôts déjà repris, en tout ou en partie'],[p.brancher||0,'à brancher'],[p.evaluer||0,'jamais évalués']];
 $('chiffres').innerHTML=items.map(function(x){return'<div><dt>'+nombre(x[0])+'</dt><dd>'+esc(x[1])+'</dd></div>'}).join('');
 if(c.date)$('date-audit').textContent=dateFr(c.date);
}

function rendrePrio(){
 $('prio').innerHTML=A.prioritaires(D.modules,24,3).map(function(m){
  return'<li><span class="rang"><span>'+esc(m.points)+' pts</span></span>'+statut(m.statut)+
  '<h3>'+esc(m.nom)+'</h3><p>'+esc(m.fait)+'</p><p class="meta">'+esc(m.repo)+(m.prive?' (privé)':'')+' · '+esc(m.famille)+'</p>'+
  '<ul class="raisons">'+m.raisons.map(function(r){return'<li>'+esc(r)+'</li>'}).join('')+'</ul>'+
  '<button type="button" class="lien" data-ouvrir="'+esc(m.id)+'">Voir la fiche</button></li>'}).join('');
}

function rendreBranchements(){
 var ordre=['integre','partiel','externe','brancher','ecarte'];
 var L=Object.keys(A.BRANCHEMENTS).map(function(k){var d=D.depots.find(function(x){return x.repo.toLowerCase()===k});return{k:k,b:A.BRANCHEMENTS[k],d:d}})
  .sort(function(a,b){return ordre.indexOf(a.b.statut)-ordre.indexOf(b.b.statut)||a.k.localeCompare(b.k)});
 $('branchements').innerHTML=L.map(function(x){var nom=x.d?x.d.repo:x.k;
  return'<tr><td><a href="'+GH+encodeURIComponent(nom)+'" rel="noopener">'+esc(nom)+'</a>'+(x.d?'<small>'+x.d.nb+' modules</small>':'')+'</td><td>'+statut(x.b.statut)+'</td><td>'+(x.b.ou?'<code>'+esc(x.b.ou)+'</code>':'—')+'</td><td>'+esc(x.b.note)+'</td><td><small>'+esc(x.b.preuve)+'</small></td></tr>'}).join('');
}

function remplirFiltres(){
 var opt=function(id,vals){$(id).insertAdjacentHTML('beforeend',vals.map(function(v){return'<option value="'+esc(v[0])+'">'+esc(v[1])+'</option>'}).join(''))};
 opt('f-univers',D.univers.map(function(u){return[u.id,u.titre]}));
 opt('f-famille',Object.keys(D.familles).sort(function(a,b){return a.localeCompare(b,'fr')}).map(function(f){return[f,f+' ('+D.familles[f]+')']}));
 opt('f-statut',Object.keys(A.STATUTS).map(function(s){return[s,A.STATUTS[s].nom+' ('+(D.chiffres.parStatut[s]||0)+')']}));
 opt('f-depot',D.depots.slice().sort(function(a,b){return a.repo.localeCompare(b.repo,'fr',{sensitivity:'base'})}).map(function(d){return[d.repo,d.repo+' ('+d.nb+')']}));
}

function fiche(m){
 var b=m.branchement;
 return'<details id="m-'+esc(m.id.replace('#','-'))+'"><summary><span class="nom">'+esc(m.nom)+'</span><span class="sous">'+esc(m.repo)+(m.prive?' (privé)':'')+' · '+esc(m.famille)+(m.cite?' · cité '+m.cite+'×':'')+(m.autonome?' · autonome':'')+'</span>'+statut(m.statut)+'</summary>'+
 '<div class="fiche"><dl><div><dt>Ce qu\'il fait</dt><dd>'+esc(m.fait)+'</dd></div><div><dt>Entrée</dt><dd>'+esc(m.entree)+'</dd></div><div><dt>Sortie</dt><dd>'+esc(m.sortie)+'</dd></div></dl>'+
 '<dl><div><dt>Exemple</dt><dd>'+esc(m.exemple)+'</dd></div>'+(m.regards.length?'<div><dt>Cité par</dt><dd>'+m.regards.map(esc).join(' · ')+'</dd></div>':'')+
 '<div><dt>Fichiers</dt><dd>'+(m.fichiers.length?m.fichiers.map(function(f){return'<code>'+esc(f)+'</code>'}).join(' '):'—')+'</dd></div></dl>'+
 '<dl><div><dt>Le dépôt</dt><dd>'+esc(m.repo)+' · déclaré '+esc(m.etatDepot||'?')+(m.doublon?' · doublon de '+esc(m.doublon):'')+'</dd></div><div><dt>Audit</dt><dd>'+attention(m.sante,m.prive).join('')+'</dd></div>'+
 (b?'<div><dt>Dans AIME</dt><dd>'+esc(b.note)+(b.ou?' <code>'+esc(b.ou)+'</code>':'')+'</dd></div>':'')+
 '<div><dt>Pourquoi ce rang</dt><dd>'+esc(m.points)+' pts : '+esc(m.raisons.join(', ')||'aucun signal')+'</dd></div></dl>'+
 '<div class="actions"><button type="button" class="action" data-demande="'+esc(m.id)+'">Préparer la demande</button>'+
 (m.prive?'':'<a href="'+GH+encodeURIComponent(m.repo)+'" rel="noopener">Ouvrir le dépôt</a>')+(m.url?' <a href="'+esc(m.url)+'" rel="noopener">Voir en ligne</a>':'')+'</div></div></details>';
}

function filtres(){return{q:$('q').value,univers:$('f-univers').value,famille:$('f-famille').value,statut:$('f-statut').value,depot:$('f-depot').value}}
function rendreCatalogue(){
 liste=A.filtrer(D.modules,filtres()).sort(function(a,b){return b.points-a.points||a.nom.localeCompare(b.nom,'fr')});
 montres=0;$('modules').innerHTML='';plus();
}
function plus(){
 var lot=liste.slice(montres,montres+PAS);montres+=lot.length;
 $('modules').insertAdjacentHTML('beforeend',lot.map(function(m){return'<li>'+fiche(m)+'</li>'}).join(''));
 $('compte').textContent=liste.length?nombre(liste.length)+' module'+(liste.length>1?'s':'')+', du plus prometteur au moins prometteur · '+nombre(montres)+' affiché'+(montres>1?'s':''):'Aucun module ne correspond. Essayez un mot plus court ou retirez un filtre.';
 $('plus').hidden=montres>=liste.length;
}

function rendreDepots(){
 var L=D.depots.slice().sort(function(a,b){return a.repo.localeCompare(b.repo,'fr',{sensitivity:'base'})});
 $('liste-depots').innerHTML=L.map(function(d){var s=d.sante||{};
  return'<tr><td>'+(d.prive?esc(d.repo)+'<small>privé</small>':'<a href="'+GH+encodeURIComponent(d.repo)+'" rel="noopener">'+esc(d.repo)+'</a>')+(d.resume?'<small>'+esc(d.resume.slice(0,140))+(d.resume.length>140?'…':'')+'</small>':'')+'</td>'+
  '<td class="num">'+d.nb+'</td><td>'+esc(d.etat||'—')+(d.doublon?'<small>doublon de '+esc(d.doublon)+'</small>':'')+'</td><td class="num">'+dateFr(s.dernier)+'</td><td>'+attention(s,d.prive).join('')+'</td><td>'+(d.branchement?statut(d.branchement.statut):'<span class="meta">—</span>')+'</td></tr>'}).join('');
}

/* La demande : tout ce qu'un agent doit savoir, rien d'inventé. */
function demande(m){
 var b=m.branchement,s=m.sante||{};
 return['Brancher dans AIMESTUDIO (lemondeaime.com) le module « '+m.nom+' ».','',
 'Source : dépôt '+m.repo+(m.prive?' (privé)':'')+', déclaré '+(m.etatDepot||'?')+'.'+(m.fichiers.length?' Fichiers : '+m.fichiers.join(', ')+'.':''),
 'Ce qu\'il fait : '+m.fait,'Entrée : '+m.entree,'Sortie : '+m.sortie,'Exemple : '+m.exemple,
 m.regards.length?'Déjà cité par : '+m.regards.join(' ; ')+'.':'Aucun univers d\'AIME ne le cite encore.',
 b?'État dans AIME : '+A.STATUTS[b.statut].nom+(b.ou?' ('+b.ou+')':'')+'. '+b.note+' Preuve : '+b.preuve+'.':'État dans AIME : '+A.STATUTS[m.statut].nom+'.',
 s.contenuDansUneBranche?'Attention : le code de ce dépôt est dans une branche, pas sur main.':'',
 s.failles&&s.failles.critiques?'Attention : le dépôt a des failles critiques de dépendances ; ne pas recopier ses dépendances telles quelles.':'',
 '','Règles : vérifier d\'abord que le module fait réellement ce qui est déclaré (moteurs.json est un index, pas une preuve). Reprendre le moteur, pas l\'interface. Respecter la charte AIME (noir, structure, contraste ; l\'orbe seule porte la couleur) et la règle « qui voit quoi » : dire pour quels rôles le module est visible. Ne modifier ni la Régie maîtresse ni les données existantes. Ajouter des tests sous tests/. Mettre à jour BRANCHEMENTS dans capacites/modele.js une fois le module branché.'
 ].filter(function(l,i,a){return l!==''||a[i-1]!==''}).join('\n');
}

function trouver(id){return D.modules.find(function(m){return m.id===id})}
function ouvrir(id){
 var m=trouver(id);if(!m)return;
 $('q').value='';$('f-univers').value='';$('f-famille').value='';$('f-statut').value='';$('f-depot').value=m.repo;rendreCatalogue();
 var el=document.getElementById('m-'+id.replace('#','-'));
 while(!el&&montres<liste.length){plus();el=document.getElementById('m-'+id.replace('#','-'))}
 if(el){el.open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});el.querySelector('summary').focus()}
}

document.addEventListener('click',function(e){
 var t=e.target.closest('[data-ouvrir],[data-demande]');if(!t)return;
 if(t.dataset.ouvrir)ouvrir(t.dataset.ouvrir);
 if(t.dataset.demande){var m=trouver(t.dataset.demande);if(!m)return;$('demande').value=demande(m);$('statut').textContent='Demande prête pour « '+m.nom+' ».';$('demande-bloc').scrollIntoView({block:'start'});$('demande').focus()}
});
$('copier').addEventListener('click',function(){
 var v=$('demande').value;if(!v){$('statut').textContent='Choisissez d\'abord un module.';return}
 var ok=function(){$('statut').textContent='Demande copiée.'},ko=function(){$('demande').select();$('statut').textContent='Copie refusée par le navigateur : le texte est sélectionné, copiez-le au clavier.'};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(ok,ko);else ko();
});
var minuteur=null;
['q','f-univers','f-famille','f-statut','f-depot'].forEach(function(id){$(id).addEventListener('input',function(){clearTimeout(minuteur);minuteur=setTimeout(rendreCatalogue,120)})});
$('plus').addEventListener('click',plus);

Promise.all(['/moteurs.json','/univers.json','/capacites/etat-depots.json'].map(function(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}))
.then(function(r){
 D=A.construire({moteurs:r[0],univers:r[1],etat:r[2]});
 rendreChiffres();rendrePrio();rendreBranchements();remplirFiltres();rendreCatalogue();rendreDepots();
 var h=location.hash.slice(1);if(h&&document.getElementById(h))document.getElementById(h).scrollIntoView();
})
.catch(function(err){$('compte').textContent='Impossible de lire '+(err&&err.message||'les données')+'. Les fichiers bruts restent consultables : /moteurs.json, /univers.json.'});
})();
