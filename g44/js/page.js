/* AIME G44 LAB · la page. Tous les instruments lisent le même dossier (G44Dossier) et la même simulation (G44Moteur).
   Aucune donnée n'est recopiée d'un laboratoire à l'autre ; aucune action réelle n'est possible.
   Branchement futur de l'orbe AIME : chaque signal (source, relation, conséquence, anomalie, proposition) est émis
   sur window en « g44:signal ». La page fonctionne entièrement sans orbe. */
(function(){'use strict';
var D=G44Dossier,M=G44Moteur,A=G44Acces,F=G44Formation,$=function(s){return document.getElementById(s)};
var ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'},esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ESC[c]})};
var NS='http://www.w3.org/2000/svg';
var REDUIT=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var BASE=M.etatInitial(),S={annee:2016,sim:null,sel:null};
var empreinteEtat=function(e){var s=JSON.stringify(e),h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16)};
var EMP0=empreinteEtat(BASE);
function signal(type,id,texte){try{window.dispatchEvent(new CustomEvent('g44:signal',{detail:{type:type,id:id,texte:texte}}))}catch(e){}}
function toast(t,ms){var e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(function(){e.classList.remove('on')},ms||3200)}
function niv(n){return'<span class="niv '+n+'" title="'+esc(D.NIVEAUX[n].def)+'">'+esc(D.NIVEAUX[n].nom)+'</span>'}
function fr(d){if(!d)return'—';var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function dateAn(an){return an+'-06-18'}
function obj(id,e){return(e||BASE).objets[id]}
function el(tag,attrs,parent){var n=document.createElementNS(NS,tag);for(var k in attrs)n.setAttribute(k,attrs[k]);if(parent)parent.appendChild(n);return n}

/* ---------- simulation partagée ---------- */
function simuler(){S.sim=M.simuler(BASE,{objet:'ev-mariage',valeur:dateAn(S.annee)});$('comparer').disabled=false;$('abandonner').disabled=false;
 signal('source','ev-mariage','Valeur modifiée');S.sim.touches.forEach(function(t){signal('consequence',t.id,t.effet)});S.sim.incoherences.forEach(function(i){signal('anomalie',i.id,i.texte)});signal('proposition','plan',S.sim.plan.length+' étapes');
 toutRendre();return S.sim}
function abandonner(){S.sim=null;S.diff=false;$('comparer').disabled=true;$('abandonner').disabled=true;toutRendre();
 var ok=empreinteEtat(BASE)===EMP0;$('l2').innerHTML='<p class="vide">Simulation abandonnée. L\'état initial est intact : empreinte '+EMP0+(ok?' (identique avant et après)':' (différente : anomalie)')+'.</p>';toast('Simulation abandonnée. Rien n\'a été conservé.')}
function toutRendre(){frises();grapheEtat();lab01();lab02();persp();$('simInfo').textContent='Année envisagée : '+S.annee+(S.sim?' · simulation en cours, empreinte '+S.sim.empreinte:'.')}

/* ---------- 01 · hero : la ligne de causalité ---------- */
function hero(){var r=M.simuler(BASE,{objet:'ev-mariage',valeur:'2016-06-18'}),st={};[].forEach.call(document.querySelectorAll('.ligne li[data-st]'),function(li){st[li.dataset.st]=li});
 var liens=r.touches.filter(function(t){return obj(t.id).type!=='operation'}).map(function(t){return{t:obj(t.id).nom}}).concat(r.incertitudes.map(function(i){return{t:i.nom+' : hypothèse, non appliquée',hyp:1}}));
 var ops=r.touches.filter(function(t){return obj(t.id).type==='operation'}).map(function(t){return{t:obj(t.id).nom+' (bloquant, R3)'}});
 var ctr=r.plan.filter(function(p){return /Comparer|Contrôler|Valider|Contrôle final/.test(p.texte)}).map(function(p){return{t:p.texte}});
 var data={liens:liens,operations:ops,controles:ctr};
 $('toucher').addEventListener('click',function(){var o=$('onde');o.classList.remove('go');void o.offsetWidth;o.classList.add('go');st.date.classList.add('on');st.date.querySelector('ul').innerHTML='<li class="vu">Mariage : 2015 → 2016</li>';
  ['liens','operations','controles'].forEach(function(k,i){var li=st[k];li.classList.remove('on');var ul=li.querySelector('ul');ul.innerHTML=data[k].map(function(x){return'<li'+(x.hyp?' class="hyp"':'')+'>'+esc(x.t)+'</li>'}).join('');
   setTimeout(function(){li.classList.add('on');[].forEach.call(ul.children,function(c,j){setTimeout(function(){c.classList.add('vu')},REDUIT?0:j*140)})},REDUIT?0:350+i*450)});
  signal('source','ev-mariage','Onde déclenchée')})}

/* ---------- 02 · membres et frises ---------- */
function membres(){$('membres').innerHTML=['p-a','p-b','p-e'].map(function(id){var o=obj(id);return'<div><b>'+esc(o.nom)+'</b><span>'+esc(o.role)+'</span></div>'}).join('')}
var X0=new Date('2014-01-01').getTime(),X1=new Date('2026-12-31').getTime(),xd=function(d){return 30+(new Date(d).getTime()-X0)/(X1-X0)*660};
function frise(svg,e,fantome){while(svg.lastChild&&svg.lastChild.tagName!=='title')svg.removeChild(svg.lastChild);
 var AX=150,g=el('g',{},svg),F='Inter Variable, Inter, sans-serif';el('line',{x1:30,x2:690,y1:AX,y2:AX,stroke:'#C9C4B8','stroke-width':1.5},g);
 for(var a=2014;a<=2026;a+=2){var x=xd(a+'-01-01');el('line',{x1:x,x2:x,y1:AX-4,y2:AX+4,stroke:'#C9C4B8'},g);var t=el('text',{x:x,y:AX+18,'text-anchor':'middle','font-size':11,fill:'#6B6A72','font-family':F},g);t.textContent=a}
 /* la période, sous l'axe */
 var per=e.objets['per-foyer'],p0=xd(per.debut);el('rect',{x:p0,y:AX+28,width:690-p0,height:8,rx:4,fill:fantome?'#F3C2AC':'#DCD8CF'},g);
 var tp=el('text',{x:p0,y:AX+52,'font-size':11,fill:'#3C3C43','font-family':F},g);tp.textContent='Période ouverte le '+fr(per.debut);
 if(fantome){var avant=xd(BASE.objets['per-foyer'].debut);if(p0>avant)el('rect',{x:avant,y:AX+28,width:p0-avant,height:8,rx:4,fill:'none',stroke:'#B4593A','stroke-dasharray':'3 3'},g)}
 var mchg=fantome&&e.objets['ev-mariage'].dates.evenement!==BASE.objets['ev-mariage'].dates.evenement;
 var ev=[['Mariage',e.objets['ev-mariage'].dates.evenement,mchg],['Enregistrement',e.objets['ev-mariage'].dates.saisie],['Naissance',e.objets['ev-naissance'].dates.evenement],['Rattachement',e.objets['op-ratt'].dates.effet],['Pièce reçue',e.objets['d-mariage'].recu]];
 if(fantome)ev.push(['Correction envisagée',A.DATE_LABO]);
 /* étiquettes sans chevauchement : chaque étiquette prend la première rangée libre */
 ev.sort(function(p,q){return p[1]<q[1]?-1:1});var rangs=[],RY=[112,80,48,16];
 ev.forEach(function(v){var x=xd(v[1]),w=Math.max(v[0].length*6.6,62)+10,lo=Math.max(0,Math.min(x-w/2,720-w)),r=0;while(rangs[r]!=null&&rangs[r]>lo)r++;rangs[r]=lo+w;var y=RY[Math.min(r,3)],chg=v[2],tx=lo+w/2;
  el('line',{x1:x,x2:x,y1:y+6,y2:AX,stroke:chg?'#B4593A':'#9C988F','stroke-width':chg?2:1},g);el('circle',{cx:x,cy:AX,r:chg?6:4.5,fill:chg?'#B4593A':'#141417'},g);
  var t=el('text',{x:tx,y:y,'text-anchor':'middle','font-size':12,'font-weight':600,fill:chg?'#B4593A':'#141417','font-family':F},g);t.textContent=v[0];
  var t2=el('text',{x:tx,y:y-14,'text-anchor':'middle','font-size':10.5,fill:'#6B6A72','font-family':F},g);t2.textContent=fr(v[1])});
 if(mchg){var xa=xd(BASE.objets['ev-mariage'].dates.evenement);el('circle',{cx:xa,cy:AX,r:5,fill:'none',stroke:'#B4593A','stroke-dasharray':'2 2'},g)}}
function frises(){frise($('friseA'),BASE,false);var e=S.sim?S.sim.etat:M.simuler(BASE,{objet:'ev-mariage',valeur:dateAn(S.annee)}).etat,r=S.sim||M.simuler(BASE,{objet:'ev-mariage',valeur:dateAn(S.annee)});frise($('friseB'),e,true);
 $('friseTxt').textContent='Lecture : mariage '+fr(BASE.objets['ev-mariage'].dates.evenement)+' → '+fr(e.objets['ev-mariage'].dates.evenement)+'. Période ouverte au '+fr(e.objets['per-foyer'].debut)+'. Rattachement au '+fr(e.objets['op-ratt'].dates.effet)+(r.incoherences.length?' — incohérences : '+r.incoherences.map(function(i){return i.regle}).join(', '):' — aucune incohérence')+'. Naissance, enregistrement et pièce : inchangés.'}
function annee(d){S.annee=Math.max(2012,Math.min(2020,S.annee+d));$('an').textContent=S.annee;if(S.sim)simuler();else{frises();$('simInfo').textContent='Année envisagée : '+S.annee+'.'}}

/* ---------- 03 · le graphe causal ---------- */
var POS={'p-a':[110,130],'p-b':[110,250],'p-e':[110,470],'d-mariage':[360,60],'ev-mariage':[360,190],'op-enreg':[640,335],'ev-naissance':[360,450],'d-naissance':[360,570],
 'r-couple':[640,110],'per-foyer':[640,230],'r-fil-a':[640,410],'r-fil-b':[640,500],'hab-h2':[900,110],'op-ratt':[900,230],'r-ratt':[900,370],'droit-f':[1120,370],'proc':[1120,110],'adr':[1120,560]};
var TYPES_NOEUD={personne:'Personne',evenement:'Événement',document:'Justificatif',relation:'Relation',periode:'Période',operation:'Opération',droit:'Droit',information:'Information',procedure:'Procédure',autorisation:'Autorisation'};
var STYLE={reference:{s:'#141417',w:1.4},dependance:{s:'#B4593A',w:2.4},contrainte:{s:'#9B2C2C',w:2.4,d:'10 3 2 3'},chronologie:{s:'#9C988F',w:1.6,d:'1.5 5',cap:'round'},hypothese:{s:'#7A5A12',w:1.8,d:'7 6'},autorisation:{s:'#3C3C43',w:1.4,d:'12 4 2 4'},preuve:{s:'#2F6B4F',w:1.6}};
function forme(g,o,w,h){var t=o.type,c={fill:'#fff',stroke:'#3C3C43','stroke-width':1.4};
 if(t==='personne')return el('circle',Object.assign({cx:0,cy:0,r:40},c),g);
 if(t==='operation')return el('polygon',Object.assign({points:[-w/2+14,-h/2,w/2-14,-h/2,w/2,0,w/2-14,h/2,-w/2+14,h/2,-w/2,0].join(' ')},c),g);
 return el('rect',Object.assign({x:-w/2,y:-h/2,width:w,height:h,rx:t==='relation'||t==='periode'?h/2:t==='document'?2:10},c,t==='droit'?{'stroke-dasharray':'5 4'}:{}),g)}
function chemin(a,b){var x1=a[0],y1=a[1],x2=b[0],y2=b[1],mx=(x1+x2)/2;if(Math.abs(x1-x2)<20)return'M'+x1+','+y1+' L'+x2+','+y2;return'M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2}
function bord(p,q,id){var o=obj(id),dx=q[0]-p[0],dy=q[1]-p[1];if(o.type==='personne'){var L=Math.hypot(dx,dy)||1;return[p[0]+dx/L*42,p[1]+dy/L*42]}var w=o.type==='personne'?60:dims(o)[0]/2+2,h=dims(o)[1]/2+2;if(Math.abs(dx)*h>Math.abs(dy)*w)return[p[0]+Math.sign(dx)*w,p[1]+dy*w/Math.abs(dx||1)];return[p[0]+dx*h/Math.abs(dy||1),p[1]+Math.sign(dy)*h]}
function dims(o){var n=Math.min(o.nom.length,24);return[Math.max(130,Math.min(232,n*8.6+30)),o.type==='periode'?50:58]}
function graphe(){var box=$('grapheBox'),svg=el('svg',{viewBox:'0 0 1230 640',role:'group','aria-label':'Graphe des dépendances du dossier fictif'});box.appendChild(svg);
 var defs=el('defs',{},svg);Object.keys(STYLE).forEach(function(k){var m=el('marker',{id:'fl-'+k,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M0,0 L10,5 L0,10 z',fill:STYLE[k].s},m)});
 var gE=el('g',{},svg),gN=el('g',{},svg);
 BASE.liens.forEach(function(l){var a=POS[l.de],b=POS[l.vers],st=STYLE[l.type],T=D.RELATIONS[l.type],pa=bord(a,b,l.de),pb=bord(b,a,l.vers),d=chemin(pa,pb);
  var g=el('g',{class:'e','data-id':l.id,tabindex:0,role:'button','aria-label':'Relation '+T.nom+' : '+obj(l.de).nom+' vers '+obj(l.vers).nom},gE);
  el('path',{class:'hit',d:d},g);el('path',{class:'vis',d:d,stroke:st.s,'stroke-width':st.w,'stroke-dasharray':st.d||'','stroke-linecap':st.cap||'butt','marker-end':'url(#fl-'+l.type+')'},g);
  g.addEventListener('click',function(){choisirLien(l.id)});g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();choisirLien(l.id)}})});
 Object.keys(POS).forEach(function(id){var o=obj(id),p=POS[id],wh=dims(o),g=el('g',{class:'n','data-id':id,transform:'translate('+p[0]+','+p[1]+')',tabindex:0,role:'button','aria-label':TYPES_NOEUD[o.type]+' : '+o.nom},gN);
  forme(g,o,wh[0],wh[1]);var ty=el('text',{class:'ty','text-anchor':'middle',y:o.type==='personne'?-50:-wh[1]/2-8},g);ty.textContent=TYPES_NOEUD[o.type];
  var lab=o.type==='personne'?o.role:o.nom,t=el('text',{'text-anchor':'middle',y:o.type==='personne'?5:5},g);
  if(o.type==='personne'){t.textContent=lab}else{var mots=lab.split(' '),l1='',l2='';mots.forEach(function(m){if((l1+' '+m).length<=22&&!l2)l1=(l1?l1+' ':'')+m;else l2=(l2?l2+' ':'')+m});if(l2){t.setAttribute('y',-4);t.textContent=l1;var t2=el('text',{'text-anchor':'middle',y:15},g);t2.textContent=l2.length>24?l2.slice(0,23)+'…':l2}else t.textContent=l1}
  var etat=el('text',{class:'ty etq','text-anchor':'middle',y:o.type==='personne'?60:wh[1]/2+17,'data-etq':id},g);
  g.addEventListener('click',function(){choisirNoeud(id)});g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();choisirNoeud(id)}})});
 $('types').innerHTML=Object.keys(STYLE).map(function(k){var st=STYLE[k];return'<span title="'+esc(D.RELATIONS[k].def)+'"><svg width="38" height="10" aria-hidden="true"><line x1="1" y1="5" x2="37" y2="5" stroke="'+st.s+'" stroke-width="'+st.w+'" stroke-dasharray="'+(st.d||'')+'" stroke-linecap="'+(st.cap||'butt')+'"/></svg>'+esc(D.RELATIONS[k].nom)+(D.RELATIONS[k].propage?'':' (ne propage pas)')+'</span>'}).join('');
 $('grapheTexte').innerHTML='<table><thead><tr><th>De</th><th>Relation</th><th>Vers</th><th>Pourquoi</th><th>Justifiée par</th><th>Depuis</th><th>Propage</th></tr></thead><tbody>'+BASE.liens.map(function(l){return'<tr><td>'+esc(obj(l.de).nom)+'</td><td>'+esc(D.RELATIONS[l.type].nom)+(l.regle?' ('+l.regle+')':'')+'</td><td>'+esc(obj(l.vers).nom)+'</td><td>'+esc(l.pourquoi)+'</td><td>'+(l.source?esc(obj(l.source).nom):'Aucune source')+'</td><td>'+fr(l.depuis)+'</td><td>'+(D.RELATIONS[l.type].propage?'Oui':'Non')+'</td></tr>'}).join('')+'</tbody></table>'}
function grapheEtat(){var r=S.sim,tch={},blq={},inc={};if(r){r.touches.forEach(function(t){tch[t.id]=1;(t.via||[]).forEach(function(l){tch['L'+l]=1})});r.bloquants.forEach(function(b){blq[b.id]=1});r.incertitudes.forEach(function(i){inc[i.id]=1});tch['ev-mariage']=1}
 [].forEach.call(document.querySelectorAll('#grapheBox .n'),function(g){var id=g.dataset.id;g.classList.toggle('touche',!!tch[id]&&!blq[id]);g.classList.toggle('bloque',!!blq[id]);g.classList.toggle('incert',!!inc[id]);g.classList.toggle('sel',S.sel===id);
  var t=g.querySelector('[data-etq]');t.textContent=blq[id]?'⚠ Bloquant (R3)':inc[id]?'? Hypothèse':id==='ev-mariage'&&r?'● Valeur simulée':tch[id]?'● Concerné':''});
 [].forEach.call(document.querySelectorAll('#grapheBox .e'),function(g){g.classList.toggle('touche',!!tch['L'+g.dataset.id]);g.classList.toggle('sel',S.sel==='L'+g.dataset.id)})}
function choisirLien(id){var l=BASE.liens.filter(function(x){return x.id===id})[0],T=D.RELATIONS[l.type],R=l.regle?D.REGLES[l.regle]:null,aff=T.propage?M.parcourir(BASE,l.vers).ordre:[];S.sel='L'+id;grapheEtat();
 var nivL=l.type==='hypothese'?'nonverifie':l.type==='chronologie'?'deduit':R?R.niveau:'documente';
 $('panneau').innerHTML='<span class="k">Relation · '+esc(T.nom)+'</span><h3>'+esc(obj(l.de).nom)+' → '+esc(obj(l.vers).nom)+'</h3>'+niv(nivL)+
  '<dl><dt>Pourquoi</dt><dd>'+esc(l.pourquoi)+'</dd><dt>Justifiée par</dt><dd>'+(l.source?esc(obj(l.source).nom):'Aucune information ne la justifie')+'</dd><dt>Valable depuis</dt><dd>'+fr(l.depuis)+'</dd>'+
  '<dt>Statut</dt><dd>'+(R?'Règle '+l.regle+' du scénario : '+esc(R.texte)+' (règle expérimentale, fictive)':l.type==='hypothese'?'Hypothèse : signalée, jamais appliquée':l.type==='chronologie'?'Ordre dans le temps : ne transmet rien':'Relation du dossier fictif')+'</dd>'+
  '<dt>Si l\'origine change</dt><dd>'+(T.propage?(aff.length?'Atteint aussi : '+[obj(l.vers).nom].concat(aff.map(function(i){return obj(i).nom})).map(esc).join(', '):'Seul '+esc(obj(l.vers).nom)+' est concerné'):'Rien : ce type de relation ne propage pas')+'</dd></dl>';
 signal('relation',id,l.pourquoi)}
function choisirNoeud(id){var o=obj(id),cur=S.sim?S.sim.etat.objets[id]:o,vs=M.voisins(BASE,id);S.sel=id;grapheEtat();
 var dates=cur.dates?Object.keys(cur.dates).map(function(k){return'<dt>Date '+({evenement:'de l\'événement',effet:'d\'effet',saisie:'de saisie',modification:'de modification',connaissance:'de connaissance'})[k]+'</dt><dd>'+fr(cur.dates[k])+(S.sim&&o.dates[k]!==cur.dates[k]?' <span class="niv simule">simulée</span>':'')+'</dd>'}).join(''):'';
 $('panneau').innerHTML='<span class="k">'+esc(TYPES_NOEUD[o.type])+'</span><h3>'+esc(o.nom)+'</h3>'+niv(o.niveau)+'<dl>'+dates+(cur.debut?'<dt>Ouverture</dt><dd>'+fr(cur.debut)+'</dd>':'')+(cur.depuis?'<dt>Depuis</dt><dd>'+fr(cur.depuis)+'</dd>':'')+(o.etat?'<dt>État</dt><dd>'+esc(o.etat)+'</dd>':'')+(o.auteur?'<dt>Auteur</dt><dd>'+esc(o.auteur)+'</dd>':'')+(o.note?'<dt>Note</dt><dd>'+esc(o.note)+'</dd>':'')+
  '<dt>Relations</dt><dd>'+vs.length+' : '+vs.map(function(l){return esc(D.RELATIONS[l.type].nom.toLowerCase())}).join(', ')+'</dd></dl>';signal('source',id,o.nom)}

/* ---------- liste des laboratoires ---------- */
var LABS=[['01','G44 historique','Comprendre l\'existant : la grille reconstituée, puis sa lecture augmentée.','proto','Prototype'],['02','G44 Rewind','Simuler, comparer, abandonner. Déterministe et annulable.','op','Opérationnel'],['03','Family Graph','Lien familial, rattachement administratif, droit social : trois natures.','op','Opérationnel'],
 ['04','Document Intelligence','Lire une procédure PDF et proposer des éléments, tous corrigibles.','proto','Prototype'],['05','SynchroView','Quatre responsabilités ; visible n\'est pas autorisé.','op','Opérationnel'],['06','Formation','Choisir des étapes et comprendre chaque choix.','op','Opérationnel']];
function labos(){$('labosListe').innerHTML=LABS.map(function(l){return'<a href="#lab'+l[0]+'"><small>LAB '+l[0]+'</small><b>'+esc(l[1])+'</b><p>'+esc(l[2])+'</p><span class="statut '+l[3]+'">'+l[4]+'</span></a>'}).join('')}

/* ---------- LAB 01 · la grille reconstituée ---------- */
var MODE1='hist';
function lab01(){var e=S.sim?S.sim.etat:BASE,m=e.objets['ev-mariage'],r=e.objets['op-ratt'],chg=S.sim&&m.dates.evenement!==BASE.objets['ev-mariage'].dates.evenement;
 var CH=[['DOS','DOS-FICTIF-0001','Dossier','Identifiant du dossier fictif.','documente',''],['TYP EVT','MAR','Type d\'événement','Mariage (code fictif « MAR »).','simule',''],
  ['DT EVT',fr(m.dates.evenement),'Date de l\'événement','Date à laquelle le mariage a eu lieu, selon l\'enregistrement.','documente',chg?'Valeur envisagée : à concorder avec l\'acte (R4).':'Écart avec l\'acte fictif : '+fr(e.objets['d-mariage'].mentionne['ev-mariage'])+'.'],
  ['DT EFF',fr(m.dates.effet),'Date d\'effet','À partir de quand l\'événement produit un effet administratif. Distincte de la date de l\'événement.','simule',''],
  ['DT SAI',fr(m.dates.saisie),'Date de saisie','Quand la valeur a été saisie. Elle ne change pas avec une correction.','documente',''],
  ['PER DEB',fr(e.objets['per-foyer'].debut),'Ouverture de la période','Calculée depuis la date du mariage (R1).','simule',chg?'Recalculée par la simulation.':''],
  ['ENF RAT','ACTIF','Rattachement de l\'enfant','Opération active depuis le '+fr(r.dates.effet)+'. Elle verrouille la période (R3).','documente','Bloquant pour une correction directe.'],
  ['PCE','ACTE MAR','Justificatif','Acte de mariage fictif, reçu le '+fr(e.objets['d-mariage'].recu)+'.','documente',''],
  ['CTRL','R2 R3 R4','Contrôles','Règles expérimentales du scénario appliquées avant validation.','simule','']];
 if(MODE1==='hist'){$('l1').innerHTML='<div class="g44" role="region" aria-label="Grille reconstituée, fictive"><div class="g44-barre"><span>ECR 12 · ÉVÉNEMENTS FAMILIAUX</span><span>RECONSTITUTION FICTIVE</span></div><div class="g44-corps">'+CH.map(function(c){return'<div class="g44-ch"><i>'+esc(c[0])+'</i><b>'+esc(c[1])+'</b></div>'}).join('')+'</div><div class="g44-pied">F1 AIDE · F3 RETOUR · F12 VALIDER — touches fictives : rien n\'est relié à un logiciel</div></div>'}
 else $('l1').innerHTML='<div class="augmente">'+CH.map(function(c){return'<div class="aug"><div><b>'+esc(c[2])+'</b><div class="leg">Code fictif '+esc(c[0])+'</div></div><div><span class="val">'+esc(c[1])+'</span><p>'+esc(c[3])+'</p>'+(c[5]?'<p style="color:var(--saumonF);margin-top:4px">'+esc(c[5])+'</p>':'')+'<p class="leg" style="margin-top:4px">Provenance : champ reconstitué pour la pédagogie, sans document source réel.</p></div><div>'+niv(c[4])+'</div></div>'}).join('')+'</div>'}
document.addEventListener('click',function(e){var b=e.target.closest('.bascule [data-mode]');if(!b)return;MODE1=b.dataset.mode;[].forEach.call(b.parentNode.children,function(x){x.setAttribute('aria-pressed',String(x===b))});lab01()});

/* ---------- LAB 02 · rewind ---------- */
function lab02(){var r=S.sim;if(!r){if(!$('l2').querySelector('.vide'))$('l2').innerHTML='<p class="vide">Aucune simulation en cours. L\'état du dossier est l\'état enregistré.</p>';return}
 var li=function(arr,f){return arr.length?'<ul class="liste">'+arr.map(f).join('')+'</ul>':'<p class="vide">Aucun.</p>'};
 var verifs=r.incoherences.map(function(i){return{t:'Incohérence '+i.regle,d:i.texte,n:i.niveau}}).concat(r.plan.filter(function(p){return /Comparer|Contrôler|Contrôle final/.test(p.texte)}).map(function(p){return{t:p.texte,d:p.detail,n:p.niveau}}));
 $('l2').innerHTML='<div class="rewind">'+
  '<div class="bloc"><h3>Potentiellement bloquants <span>'+r.bloquants.length+'</span></h3>'+li(r.bloquants,function(b){return'<li><b>⚠ '+esc(obj(b.id).nom)+'</b><span>'+esc(b.regle+' · '+b.texte)+'</span>'+niv(b.niveau)+'</li>'})+'</div>'+
  '<div class="bloc"><h3>Indépendants, inchangés <span>'+r.independants.length+'</span></h3>'+li(r.independants,function(x){return'<li><b>'+esc(x.nom)+'</b><span>'+esc(x.raison)+'</span></li>'})+'</div>'+
  '<div class="bloc"><h3>Vérifications nécessaires <span>'+verifs.length+'</span></h3>'+li(verifs,function(v){return'<li><b>'+esc(v.t)+'</b><span>'+esc(v.d)+'</span>'+niv(v.n)+'</li>'})+'</div>'+
  '<div class="bloc"><h3>Opérations et liens à examiner <span>'+r.touches.length+'</span></h3>'+li(r.touches,function(t){return'<li><b>'+esc(t.nom)+'</b><span>'+esc(t.effet)+'</span><span class="leg">Chemin : '+esc(t.via.join(' → '))+'</span></li>'})+'</div>'+
  '<div class="bloc"><h3>Incertitudes <span>'+r.incertitudes.length+'</span></h3>'+li(r.incertitudes.concat(r.chronologie.map(function(c){return{nom:obj(c.id).nom+' (proximité de dates)',texte:c.texte,niveau:'deduit'}})),function(x){return'<li><b>'+esc(x.nom)+'</b><span>'+esc(x.texte)+'</span>'+niv(x.niveau)+'</li>'})+'</div>'+
  '<div class="bloc"><h3>Journal de la simulation</h3><pre class="journal">'+esc(r.journal.join('\n'))+'\nEmpreinte du rapport : '+r.empreinte+'</pre></div></div>'+
  '<div class="bloc" style="margin-top:20px"><h3>Ordre de reprise proposé <span>Proposition, à valider</span></h3><ol class="plan">'+r.plan.map(function(p){return'<li><div><b>'+esc(p.texte)+'</b>'+(p.detail?'<div class="leg" style="margin-top:3px">'+esc(p.detail)+'</div>':'')+'<div class="meta">'+niv(p.niveau)+'<span>'+esc(p.qui)+'</span>'+(p.habilitation?'<span>Habilitation '+p.habilitation+' : '+esc(D.HABILITATIONS[p.habilitation].nom)+'</span>':'')+'</div></div></li>'}).join('')+'</ol></div>'+
  (S.diff?diffTable(r):'')}
function diffTable(r){return'<div class="bloc" style="margin-top:20px" id="diffBloc"><h3>État initial / état simulé <span>'+r.diff.length+' valeurs</span></h3><div class="tablo"><table class="diff"><thead><tr><th>Objet</th><th>Champ</th><th>Initial</th><th>Simulé</th></tr></thead><tbody>'+r.diff.map(function(d){return'<tr><td>'+esc(d.nom)+'</td><td>'+esc(d.champ)+'</td><td><del>'+esc(fr(d.avant))+'</del></td><td><ins>'+esc(fr(d.apres))+'</ins></td></tr>'}).join('')+'</tbody></table></div><p class="leg" style="margin-top:10px">Tout le reste du dossier est identique. Empreinte de l\'état initial : '+EMP0+(empreinteEtat(BASE)===EMP0?', inchangée.':', MODIFIÉE (anomalie).')+'</p></div>'}

/* ---------- LAB 03 · trois natures de relation ---------- */
var COUCHES={familiale:true,administrative:true,droit:true};
function lab03(){var box=$('famBox');box.innerHTML='';var svg=el('svg',{viewBox:'0 0 760 420',role:'group','aria-label':'Graphe familial du dossier fictif'});box.appendChild(svg);svg.style.minWidth='560px';
 var P={a:[150,90],b:[450,90],e:[300,290],dos:[640,290],droit:[640,90]};
 var trait=function(a,b,st,lab,couche){if(!COUCHES[couche])return;var g=el('g',{},svg);el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:st.s,'stroke-width':st.w,'stroke-dasharray':st.d||''},g);var t=el('text',{x:(a[0]+b[0])/2,y:(a[1]+b[1])/2-8,'text-anchor':'middle','font-size':12,fill:st.s,'font-weight':600,'font-family':'Inter Variable, Inter, sans-serif'},g);t.textContent=lab};
 var e=S.sim?S.sim.etat:BASE;
 trait(P.a,P.b,{s:'#141417',w:2},'Couple · depuis '+fr(e.objets['r-couple'].depuis),'familiale');trait(P.a,P.e,{s:'#141417',w:2},'Filiation','familiale');trait(P.b,P.e,{s:'#141417',w:2},'Filiation','familiale');
 trait(P.e,P.dos,{s:'#B4593A',w:2.5},'Rattachement · '+fr(e.objets['op-ratt'].dates.effet),'administrative');
 trait(P.dos,P.droit,{s:'#7A5A12',w:2,d:'7 6'},'Hypothèse','droit');
 var noeud=function(p,lab,sous,id,forme){var g=el('g',{transform:'translate('+p[0]+','+p[1]+')',tabindex:0,role:'button',class:'n','aria-label':lab+', '+sous,'data-id':id},svg);
  if(forme==='rond')el('circle',{r:40,fill:'#fff',stroke:'#3C3C43','stroke-width':1.5},g);else el('rect',{x:-80,y:-30,width:160,height:60,rx:forme==='droit'?4:12,fill:forme==='droit'?'#F5EBD3':'#fff',stroke:forme==='droit'?'#7A5A12':'#3C3C43','stroke-dasharray':forme==='droit'?'5 4':'','stroke-width':1.5},g);
  var t=el('text',{'text-anchor':'middle',y:-2},g);t.textContent=lab;var t2=el('text',{'text-anchor':'middle',y:14,class:'ty'},g);t2.textContent=sous;
  g.addEventListener('click',function(){famInfo(id)});g.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();famInfo(id)}})};
 noeud(P.a,obj('p-a').nom.split(' ')[0],'Adulte A','p-a','rond');noeud(P.b,obj('p-b').nom.split(' ')[0],'Adulte B','p-b','rond');noeud(P.e,obj('p-e').nom.split(' ')[0],'Enfant','p-e','rond');
 if(COUCHES.administrative||COUCHES.droit)noeud(P.dos,'Dossier familial','DOS-FICTIF-0001','dos','rect');if(COUCHES.droit)noeud(P.droit,'Droit familial','fictif, non vérifié','droit-f','droit')}
function famInfo(id){var e=S.sim?S.sim.etat:BASE,h='';
 if(id==='p-e'){var r=e.objets['op-ratt'];h='<span class="k">Enfant</span><h3>'+esc(obj('p-e').nom)+'</h3><dl><dt>Filiation</dt><dd>Lien familial, depuis le '+fr(e.objets['r-fil-a'].depuis)+'. Justifiée par l\'acte de naissance fictif. Ne dépend pas du mariage.</dd>'+
  '<dt>Rattachement</dt><dd>Relation administrative, effet au '+fr(r.dates.effet)+', saisie le '+fr(r.dates.saisie)+', par '+esc(r.auteur)+'. État : '+esc(r.etat)+'.</dd><dt>Période</dt><dd>Se rapporte à la période ouverte le '+fr(e.objets['per-foyer'].debut)+(S.sim?' (simulée)':'')+'.</dd>'+
  '<dt>Droit</dt><dd>Un droit social est un troisième objet. Son lien avec le rattachement est une hypothèse, non documentée ici.</dd><dt>Justificatifs</dt><dd>Acte de naissance (fictif), reçu le '+fr(e.objets['d-naissance'].recu)+'.</dd></dl>'}
 else if(id==='dos')h='<span class="k">Dossier</span><h3>Dossier familial fictif</h3><p>Le rattachement est une relation <b>administrative</b> : il relie l\'enfant au dossier, pas aux personnes. Le suspendre ne supprime aucune filiation.</p>';
 else if(id==='droit-f')h='<span class="k">Droit social</span><h3>Droit familial (fictif)</h3>'+niv('nonverifie')+'<p style="margin-top:10px">'+esc(obj('droit-f').note)+' Aucune règle documentée ne le relie ici à la date du mariage : la simulation le signale sans l\'appliquer.</p>';
 else{var o=obj(id);h='<span class="k">'+esc(o.role)+'</span><h3>'+esc(o.nom)+'</h3><dl><dt>Couple</dt><dd>Lien familial, depuis le '+fr(e.objets['r-couple'].depuis)+(S.sim?' (simulé)':'')+'.</dd><dt>Justificatif</dt><dd>Acte de mariage fictif : '+fr(e.objets['d-mariage'].mentionne['ev-mariage'])+'.</dd></dl>'}
 $('famPanneau').innerHTML=h;signal('source',id,'')}
function couches(){var L=[['familiale','Lien familial','#141417',''],['administrative','Rattachement administratif','#B4593A',''],['droit','Droit social','#7A5A12','7 6']];
 $('couches').innerHTML=L.map(function(c){return'<button type="button" aria-pressed="true" data-c="'+c[0]+'"><svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" stroke="'+c[2]+'" stroke-width="2.5" stroke-dasharray="'+c[3]+'"/></svg>'+c[1]+'</button>'}).join('');
 $('couches').addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;COUCHES[b.dataset.c]=!COUCHES[b.dataset.c];b.setAttribute('aria-pressed',String(COUCHES[b.dataset.c]));lab03()})}

/* ---------- LAB 04 · documents ---------- */
var pdfjs=null;
function chargerPdfjs(){if(pdfjs)return Promise.resolve(pdfjs);return import('/g44/vendor/pdfjs-4.10.38.min.mjs').then(function(m){m.GlobalWorkerOptions.workerSrc='/g44/vendor/pdfjs-4.10.38.worker.min.mjs';pdfjs=m;return m})}
function chargerJsPDF(){if(window.jspdf)return Promise.resolve(window.jspdf.jsPDF);return new Promise(function(ok,ko){var s=document.createElement('script');s.src='/g44/vendor/jspdf-4.2.1.umd.min.js';s.onload=function(){ok(window.jspdf.jsPDF)};s.onerror=ko;document.head.appendChild(s)})}
var latin=function(s){return String(s).replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...').replace(/[—–]/g,'-').replace(/→/g,'->').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[•●]/g,'-').replace(/ /g,' ')};
/* la fiche d'exemple : un document fictif, fabriqué ici, puis relu par le même lecteur qu'un PDF déposé */
function ficheExemple(){return chargerJsPDF().then(function(J){var d=new J({unit:'pt',format:'a4'}),y=70,L=function(t,o){o=o||{};d.setFont('helvetica',o.b?'bold':'normal');d.setFontSize(o.s||11);d.splitTextToSize(latin(t),470).forEach(function(l){d.text(l,60,y);y+=(o.s||11)*1.45});y+=o.ap||4};
 L('FICHE PÉDAGOGIQUE FICTIVE - AIME G44 LAB',{b:1,s:9});L('Grille G44 : correction d\'un coefficient d\'emploi (reconstitution fictive)',{b:1,s:16,ap:10});
 L('Document fabriqué pour la démonstration. Il ne reproduit aucune procédure réelle.',{s:9,ap:12});
 L('Prérequis',{b:1,s:12});L('Avant toute saisie, vérifier que la période d\'emploi est close et que le justificatif employeur est présent au dossier.');L('Préalable : disposer de l\'habilitation de correction (fictive).',{ap:10});
 L('Champs',{b:1,s:12});L('GRILLE : G44');L('PÉRIODE DÉBUT : date de début de la période concernée');L('COEF EMPLOI : coefficient à corriger');L('MOTIF : code motif de correction');L('DATE EFFET : 01/01/2025',{ap:10});
 L('Opérations',{b:1,s:12});L('1. Annuler la ligne de coefficient erronée.');L('2. Saisir le coefficient corrigé avec sa date d\'effet.');L('3. Valider la grille.',{ap:10});
 L('Contrôles',{b:1,s:12});L('Contrôler que la somme des coefficients de la période reste cohérente.');L('S\'assurer que la date d\'effet n\'est pas antérieure à la période.',{ap:10});
 L('Source',{b:1,s:12});L('Ref. : fiche fictive FF-G44-01, version 1, 21/10/2026.');
 return{nom:'fiche-g44-fictive.pdf',data:new Uint8Array(d.output('arraybuffer'))}})}
function lireDocument(f){$('docVue').hidden=false;$('docVue').innerHTML='<p class="leg">Lecture…</p>';$('docInfo').textContent='';
 if(/^image\//.test(f.type)){var u=URL.createObjectURL(f);$('docVue').innerHTML='<img alt="Document importé" src="'+u+'">';$('docInfo').textContent='Image';
  extraits([],'Image : la reconnaissance de caractères n\'est pas intégrée à ce prototype. Ajoutez les éléments à la main ; ils restent des propositions.');return}
 f.arrayBuffer().then(function(b){return lirePdf({nom:f.name,data:new Uint8Array(b)})}).catch(function(e){$('docVue').innerHTML='<p class="vide">Lecture impossible : '+esc(e.message)+'</p>'})}
function lirePdf(src){return chargerPdfjs().then(function(P){return P.getDocument({data:src.data}).promise}).then(function(doc){var pages=[],vue=$('docVue');vue.innerHTML='';
 var suite=Promise.resolve();for(var i=1;i<=Math.min(doc.numPages,8);i++)(function(i){suite=suite.then(function(){return doc.getPage(i)}).then(function(pg){var v=pg.getViewport({scale:1.2}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;c.setAttribute('aria-label','Page '+i);vue.appendChild(c);
  return pg.render({canvasContext:c.getContext('2d'),viewport:v}).promise.then(function(){return pg.getTextContent()}).then(function(tc){var lignes={};tc.items.forEach(function(it){var y=Math.round(it.transform[5]);(lignes[y]=lignes[y]||[]).push(it.str)});Object.keys(lignes).sort(function(a,b){return b-a}).forEach(function(y){var t=lignes[y].join(' ').replace(/\s+/g,' ').trim();if(t)pages.push({p:i,t:t})})})})})(i);
 return suite.then(function(){$('docInfo').textContent=src.nom+' · '+doc.numPages+' page'+(doc.numPages>1?'s':'');if(!pages.length){extraits([],'Aucun texte dans ce PDF (document scanné ?). Sans reconnaissance de caractères, rien n\'est proposé automatiquement.');return}extraits(analyser(pages),'')})})}
/* repérage par motifs : chaque proposition dit comment elle a été trouvée et reste à confirmer */
function analyser(lignes){var out=[],vu={},add=function(cat,val,how,p){var k=cat+'|'+val;if(vu[k])return;vu[k]=1;out.push({cat:cat,val:val,how:how,p:p})},section='';
 lignes.forEach(function(l){var t=l.t,low=t.toLowerCase();
  if(/^(pr[ée]requis|champs|op[ée]rations|contr[ôo]les|source)$/i.test(t)){section=low.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return}
  (t.match(/\bG\s?\d{2}\b/g)||[]).forEach(function(g){add('Grille',g.replace(/\s/,''),'Motif « G + deux chiffres »',l.p)});
  var c=t.match(/^([A-ZÉÈ][A-ZÉÈ ]{2,})\s:\s*(.*)$/);if(c)add('Champ',c[1].trim()+(c[2]?' — '+c[2]:''),'Ligne « LIBELLÉ EN MAJUSCULES : »',l.p);
  if(/^\d+\.\s/.test(t)||/\b(annuler|saisir|valider|corriger|recr[ée]er)\b/i.test(t)&&section==='operations')add('Opération',t.replace(/^\d+\.\s*/,''),section==='operations'?'Rubrique « Opérations »':'Verbe d\'action repéré',l.p);
  if(/\b(avant|pr[ée]alable|pr[ée]requis)\b/i.test(t)&&section!=='')add('Prérequis',t,'Mot « avant / préalable » ou rubrique',l.p);
  if(/\b(v[ée]rifier|contr[ôo]ler|s'assurer)\b/i.test(t))add('Contrôle',t,'Verbe « vérifier / contrôler / s\'assurer »',l.p);
  if(/^(r[ée]f\.?|source|version)\b/i.test(t)||section==='source')add('Source',t,'Rubrique ou mot « Réf. / Source »',l.p);
  (t.match(/\b\d{2}\/\d{2}\/\d{4}\b/g)||[]).forEach(function(d){add('Date',d,'Motif JJ/MM/AAAA',l.p)})});
 return out}
function extraits(L,msg){var box=$('docExtraits');box.innerHTML=(msg?'<p class="vide">'+esc(msg)+'</p>':'<p class="leg" style="margin:0 0 6px">'+L.length+' propositions. Toutes sont incertaines tant qu\'une personne ne les a pas confirmées. Aucune n\'est écrite dans le dossier.</p>')+
 '<div id="exL">'+L.map(ligneExtrait).join('')+'</div><div class="actions" style="margin-top:12px"><button class="btn sec petit" type="button" id="exAjout">Ajouter un élément</button><button class="btn petit" type="button" id="exExport">Exporter les propositions (JSON)</button></div>';
 $('exAjout').onclick=function(){$('exL').insertAdjacentHTML('beforeend',ligneExtrait({cat:'Champ',val:'',how:'Saisie manuelle'}))};
 $('exExport').onclick=function(){var data=[].map.call(document.querySelectorAll('#exL .extrait'),function(r){return{categorie:r.querySelector('select').value,valeur:r.querySelector('input').value,methode:r.dataset.how,statut:'proposition non confirmée'}}),b=new Blob([JSON.stringify({document:$('docInfo').textContent,avertissement:'Propositions extraites par motifs. Aucune valeur n\'est confirmée ni appliquée à un dossier.',elements:data},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='g44-propositions.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},2000)};
 box.onclick=function(e){if(e.target.classList.contains('x'))e.target.closest('.extrait').remove()}}
function ligneExtrait(x){var cats=['Grille','Champ','Opération','Prérequis','Contrôle','Source','Date'];return'<div class="extrait" data-how="'+esc(x.how)+'"><select aria-label="Catégorie" class="cat" style="border:0;background:none;font:600 11px var(--ui);letter-spacing:.1em;text-transform:uppercase;color:var(--doux)">'+cats.map(function(c){return'<option'+(c===x.cat?' selected':'')+'>'+c+'</option>'}).join('')+'</select><div><input value="'+esc(x.val)+'" aria-label="Valeur proposée"><div class="leg" style="margin-top:4px">'+esc(x.how)+(x.p?' · page '+x.p:'')+' · <span class="niv nonverifie">À confirmer</span></div></div><button class="x" type="button" aria-label="Retirer cette proposition">×</button></div>'}
function lab04(){var dp=$('depot');dp.addEventListener('dragover',function(e){e.preventDefault();dp.classList.add('survol')});dp.addEventListener('dragleave',function(){dp.classList.remove('survol')});dp.addEventListener('drop',function(e){e.preventDefault();dp.classList.remove('survol');if(e.dataTransfer.files[0])lireDocument(e.dataTransfer.files[0])});
 $('fichier').addEventListener('change',function(){if(this.files[0])lireDocument(this.files[0])});
 $('exemple').addEventListener('click',function(){$('docVue').hidden=false;$('docVue').innerHTML='<p class="leg">Fabrication de la fiche fictive…</p>';ficheExemple().then(lirePdf).catch(function(e){toast('Lecture impossible : '+e.message)})})}

/* ---------- LAB 05 · perspectives ---------- */
function persp(){var r=S.sim,ids=Object.keys(A.PERSPECTIVES);
 $('persp').innerHTML=ids.map(function(pid){var P=A.PERSPECTIVES[pid],I=A.IDENTITES[pid],m=I.missions[0];
  var noms=['p-a','p-b','p-e'].map(function(id){var o=obj(id);return A.afficherNom(pid,pid,o.nom,o.role)});
  var sec=Object.keys(P.sections).map(function(k){return'<div class="lig"><span>'+({identites:'Identités',chronologie:'Chronologie',plan:'Plan',journal:'Journal et provenance',formation:'Mode formation'})[k]+'</span><span class="etat '+P.sections[k]+'">'+(P.sections[k]==='visible'?'Visible':'Masqué')+'</span></div>'}).join('');
  var act=Object.keys(A.ACTIONS).map(function(a){var z=A.autoriser(pid,a);return'<div class="lig" title="'+esc(z.raison)+'"><span>'+esc(A.ACTIONS[a].nom)+'<span class="leg" style="display:block">'+esc(z.raison)+'</span></span><span class="etat '+z.etat+'">'+({autorise:'Autorisé',refuse:'Refusé',nonverifie:'Non vérifié'})[z.etat]+'</span></div>'}).join('');
  return'<article class="vue" aria-labelledby="pv-'+pid+'"><div><span class="k">Perspective</span><h3 id="pv-'+pid+'">'+esc(P.nom)+'</h3><div class="qui">'+esc(I.nom)+' · carte d\'usage : '+esc(I.carte)+'</div><div class="qui">Mission : '+esc(m.objet)+' · jusqu\'au '+fr(m.jusqu)+'</div></div>'+
   '<div><h4>Le dossier, vu d\'ici</h4><div class="lig"><span>Personnes</span><span>'+noms.map(esc).join(', ')+'</span></div><div class="lig"><span>Simulation</span><span>'+(r?'En cours, '+r.plan.length+' étapes':'Aucune')+'</span></div></div>'+
   '<div><h4>Présentation</h4>'+sec+'</div><div><h4>Autorisations</h4>'+act+'</div></article>'}).join('')}

/* ---------- LAB 06 · formation ---------- */
var SUITE=[],MELANGE=['direct','piece','supprimer','suspendre','droits','corriger','proximite','periode','recreer','controle','valider'];
function lab06(){var rendre=function(){$('puces').innerHTML=MELANGE.map(function(id){return'<button type="button" data-e="'+id+'"'+(SUITE.indexOf(id)>=0?' disabled':'')+'>'+esc(F.ETAPES[id].t)+'</button>'}).join('');
  $('suite').innerHTML=SUITE.length?SUITE.map(function(id,i){return'<li><span>'+esc(F.ETAPES[id].t)+'</span><button class="x" type="button" data-r="'+i+'" aria-label="Retirer">×</button></li>'}).join(''):'<li style="grid-template-columns:1fr;color:var(--doux)">Touchez des étapes à gauche, dans l\'ordre où vous les feriez.</li>';$('expliquer').disabled=!SUITE.length};
 $('puces').addEventListener('click',function(e){var b=e.target.closest('[data-e]');if(!b)return;SUITE.push(b.dataset.e);$('bilan').innerHTML='';rendre()});
 $('suite').addEventListener('click',function(e){var b=e.target.closest('[data-r]');if(!b)return;SUITE.splice(+b.dataset.r,1);$('bilan').innerHTML='';rendre()});
 $('effacer').addEventListener('click',function(){SUITE=[];$('bilan').innerHTML='';rendre()});
 $('expliquer').addEventListener('click',function(){var r=F.expliquer(SUITE),LB={pertinente:'Pertinente',prematuree:'Prématurée','a-eviter':'À éviter',inconnue:'?'},CL={pertinente:'autorise',prematuree:'nonverifie','a-eviter':'refuse'};
  $('suite').innerHTML=r.etapes.map(function(x,i){return'<li><span><b>'+esc(x.titre)+'</b></span><span class="etat '+(CL[x.statut]||'')+'">'+LB[x.statut]+'</span><div class="expl">'+esc(x.texte)+'</div></li>'}).join('');
  $('bilan').innerHTML=(r.oublis.length?'<div class="bloc" style="margin-top:16px"><h3>À examiner aussi</h3><ul class="liste">'+r.oublis.map(function(o){return'<li><b>'+esc(o.titre)+'</b><span>'+esc(o.texte)+'</span></li>'}).join('')+'</ul></div>':'')+'<p class="note">'+esc(r.attendu)+'</p>';signal('proposition','formation','')});rendre()}

/* ---------- 04 · mesurer ---------- */
var MES=[['Temps de compréhension','minutes','Chronométré, du début de lecture à la reformulation correcte du problème'],['Temps de recherche de procédure','minutes','Chronométré jusqu\'à l\'identification de la procédure applicable'],['Changements d\'écran','nombre','Compté sur enregistrement d\'écran'],['Informations ressaisies','nombre','Compté sur les traces de saisie'],['Retours arrière','nombre','Compté sur enregistrement d\'écran'],['Erreurs de séquence','nombre','Écarts à l\'ordre validé par des experts'],['Correction complète','% des participants','Plan complet et cohérent, jugé à l\'aveugle'],['Appels à une assistance','nombre','Demandes d\'aide pendant la tâche'],['Difficulté perçue','échelle 1 à 7','Questionnaire après chaque parcours']];
var SYN=[[14,6],[9,2],[23,7],[5,1],[6,1],[2,0],[55,85],[2,0],[5.4,3.1]];
function mesures(synth){$('mesuresT').innerHTML='<thead><tr><th>Indicateur</th><th>Unité</th><th>Méthode</th><th>Parcours de référence</th><th>Parcours augmenté</th></tr></thead><tbody>'+MES.map(function(m,i){var v=function(x){return synth?'<td class="s">'+String(x).replace('.',',')+' <span class="leg">synthétique</span></td>':'<td class="m">Mesure à réaliser</td>'};return'<tr><td><b>'+esc(m[0])+'</b></td><td>'+esc(m[1])+'</td><td>'+esc(m[2])+'</td>'+v(SYN[i][0])+v(SYN[i][1])+'</tr>'}).join('')+'</tbody>';$('synthAvis').classList.toggle('on',!!synth)}
function visuels(){var r=M.simuler(BASE,{objet:'ev-mariage',valeur:'2016-06-18'}),s=$('visOps');
 var REF=['Chercher la procédure','Annuler le rattachement','Corriger la date','Recréer le rattachement','Revérifier'],AUG=['Suspendre le rattachement','Corriger la date','Recalculer la période','Recréer le rattachement','Contrôler'];
 var col=function(x,titre,L,ss,prep){var t=el('text',{x:x,y:22,'font-size':13,'font-weight':700,fill:'#141417','font-family':'Inter Variable, Inter, sans-serif'},s);t.textContent=titre;
  if(prep){el('rect',{x:x,y:34,width:230,height:30,rx:6,fill:'#FBE7DD',stroke:'#B4593A','stroke-dasharray':'4 3'},s);var tp=el('text',{x:x+10,y:54,'font-size':11.5,fill:'#B4593A','font-family':'Inter Variable, Inter, sans-serif'},s);tp.textContent='Préparation visible : plan de '+r.plan.length+' étapes'}
  L.forEach(function(l,i){var y=(prep?74:40)+i*36;el('rect',{x:x,y:y,width:230,height:28,rx:6,fill:ss,stroke:'#3C3C43'},s);var tt=el('text',{x:x+10,y:y+18,'font-size':12,fill:'#141417','font-family':'Inter Variable, Inter, sans-serif'},s);tt.textContent=(i+1)+'. '+l})};
 col(10,'Rapporté (observé)',REF,'#fff',false);col(300,'Augmenté (simulé)',AUG,'#fff',true);
 var p=$('visParcours'),lane=function(y,titre,L,retour){var t=el('text',{x:10,y:y-12,'font-size':12.5,'font-weight':700,fill:'#141417','font-family':'Inter Variable, Inter, sans-serif'},p);t.textContent=titre;var w=104;
  L.forEach(function(l,i){var x=10+i*(w+6);el('rect',{x:x,y:y,width:w,height:40,rx:8,fill:i===L.length-1?'#141417':'#fff',stroke:'#3C3C43'},p);var tt=el('text',{x:x+w/2,y:y+24,'text-anchor':'middle','font-size':11,fill:i===L.length-1?'#F6F4EF':'#141417','font-family':'Inter Variable, Inter, sans-serif'},p);tt.textContent=l});
  if(retour){el('path',{d:'M'+(10+3*(w+6)+w/2)+','+(y+44)+' C'+(10+3*(w+6))+','+(y+78)+' '+(10+1*(w+6)+w)+','+(y+78)+' '+(10+1*(w+6)+w/2)+','+(y+44),fill:'none',stroke:'#9B2C2C','stroke-width':1.6,'stroke-dasharray':'5 4','marker-end':'url(#flR)'},p);var tr=el('text',{x:10+2*(w+6)+w/2,y:y+90,'text-anchor':'middle','font-size':11,fill:'#9B2C2C','font-family':'Inter Variable, Inter, sans-serif'},p);tr.textContent='retour arrière possible (rapporté, à mesurer)'}};
 var dfs=el('defs',{},p),mk=el('marker',{id:'flR',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},dfs);el('path',{d:'M0,0 L10,5 L0,10 z',fill:'#9B2C2C'},mk);
 lane(30,'Référence',['Erreur','Recherche','Annulation','Correction','Contrôle'],true);lane(170,'Augmenté',['Erreur','Graphe','Simulation','Plan validé','Contrôle'],false)}

/* ---------- 05 · vérité ---------- */
function verite(){var r=M.simuler(BASE,{objet:'ev-mariage',valeur:'2016-06-18'});
 var CAT=[['observe',BASE.observe.map(function(o){return{t:o.texte,src:o.source}})],
  ['documente',[{t:'Acte de mariage fictif : 18/06/2016.',src:'Pièce d-mariage du dossier fictif, reçue le '+fr(obj('d-mariage').recu)+'.'},{t:'Acte de naissance fictif : 04/03/2017.',src:'Pièce d-naissance du dossier fictif.'},{t:'Rattachement actif depuis le 01/04/2017.',src:'Opération op-ratt du dossier fictif, saisie le '+fr(obj('op-ratt').dates.saisie)+'.'}]],
  ['deduit',[{t:'Avec 2016, le rattachement reste dans la période corrigée.',src:'Comparaison de dates : '+fr(obj('op-ratt').dates.effet)+' ≥ '+fr(r.etat.objets['per-foyer'].debut)+'. Hypothèse : règle R2 du scénario.'},{t:'Les filiations ne dépendent pas de la date du mariage.',src:'Les liens l10 et l11 partent de la naissance ; aucun lien qui propage ne les relie au mariage.'}]],
  ['simule',Object.keys(D.REGLES).map(function(k){return{t:k+' · '+D.REGLES[k].nom,src:D.REGLES[k].texte+' Règle expérimentale du scénario : elle ne décrit aucune procédure réelle.'}})],
  ['nonverifie',[{t:'Le droit familial dépendrait du rattachement.',src:'Lien l7, de type hypothèse : aucune règle documentée.'},{t:'L\'habilitation H2 de l\'agent fictif.',src:'Déclarée, non vérifiée (LAB 05).'},{t:'La procédure G44 du coefficient d\'emploi.',src:'Document évoqué mais non versé au laboratoire.'}]]];
 $('veriteBox').innerHTML=CAT.map(function(c){return'<div>'+niv(c[0])+'<p>'+esc(D.NIVEAUX[c[0]].def)+'</p><ul>'+c[1].map(function(x){return'<li>'+esc(x.t)+'<br><button type="button" data-src="'+esc(x.src)+'" data-t="'+esc(x.t)+'">Ouvrir la source</button></li>'}).join('')+'</ul></div>'}).join('');
 $('veriteBox').addEventListener('click',function(e){var b=e.target.closest('[data-src]');if(!b)return;source(b.dataset.t,b.dataset.src)})}
function source(t,src){var d=$('dlgSource');if(!d){d=document.createElement('dialog');d.id='dlgSource';d.style.cssText='border:0;border-radius:22px;padding:28px;max-width:560px;width:calc(100vw - 32px);box-shadow:0 30px 80px rgba(0,0,0,.25);font:16px/1.5 var(--ui);color:var(--encre)';document.body.appendChild(d)}
 d.innerHTML='<span class="k">Source</span><h3 class="t-m" style="margin:8px 0 12px">'+esc(t)+'</h3><p style="margin:0;color:var(--graphite)">'+esc(src)+'</p><div class="actions" style="margin-top:20px"><button class="btn petit" type="button" autofocus>Fermer</button></div>';d.querySelector('button').onclick=function(){d.close()};if(d.showModal)d.showModal();else toast(src,6000)}

/* ---------- moteurs ---------- */
var MOT=[['Permissions séparées des interfaces','AIMESTUDIO · SynchroView',1,'Structure reprise : refus par défaut, règle citée à chaque décision.'],['Source commune, patches, rejeu','AIMESTUDIO · SynchroView',1,'Modèle de la simulation isolée : on rejoue, on jette.'],['Dates avec précision, provenance, comparaison','RELIA',1,'À copier pour la chronologie et l\'avant/après.'],['Chaîne de preuve entre deux objets','RELIA',1,'Explication d\'une conséquence (chemin).'],['États de connaissance, validation humaine','AIME-COMPOSER',1,'Vocabulaire repris ; « simulé » et « non vérifié » ajoutés.'],['Triage de PDF (version, pages)','AIME-COMPOSER',1,'Ne lit pas le texte : pdf.js utilisé ici.'],['Propagation, simulation isolée, retour arrière','AIME-ARCHIVE (copie : gaia)',2,'Structure base / isolé / propagé ; axe en minutes à remplacer par des dates.'],['Contraintes et statuts (satisfaite, violée, inconnue)','AIME-ARCHIVE',2,'Vocabulaire repris pour R2–R4.'],['« Le niveau le plus faible se propage »','RIPPLECIRCLE',2,'Règle appliquée : une conséquence simulée reste simulée.'],['Contrôles bloquants, pièces exigées, fil du dossier','Outil administratif (dépôt privé)',2,'Fonctions pures à porter ; application des événements à réécrire.'],['Graphe familial','Outil administratif (dépôt privé)',3,'Liste groupée seulement : moteur écrit ici.'],['Cockpit, connecteurs, recherche','Bureau unifié (dépôt privé)',3,'Interface sans moteur : non repris.'],['Inventaire moteurs.json','AIMESTUDIO',4,'130 dépôts, 1 191 modules déclarés : un index, pas une preuve.'],['Niveau « simulé », lecture PDF sans serveur, journal persistant','—',5,'Les deux premiers sont faits ici ; le journal persistant reste à faire.']];
function moteurs(){$('moteursT').innerHTML='<thead><tr><th>Capacité</th><th>Dépôt</th><th>Classe</th><th>Usage pour G44</th></tr></thead><tbody>'+MOT.map(function(m){return'<tr><td><b>'+esc(m[0])+'</b></td><td>'+esc(m[1])+'</td><td><i class="classe c'+m[2]+'" aria-label="Classe '+m[2]+'">'+m[2]+'</i></td><td>'+esc(m[3])+'</td></tr>'}).join('')+'</tbody>'}

/* ---------- final : la ligne saumon devient grille, graphe, chronologie, décision ---------- */
function fil(){var s=$('fil'),d='M10,100 H120 V40 H200 V160 H120 V100 H280 M280,100 L360,40 L440,120 L520,60 L600,100 M600,100 H900 M680,90 V110 M760,90 V110 M840,90 V110 M900,100 L960,60 H1090 V140 H960 Z';
 var g=el('g',{},s);for(var x=120;x<=200;x+=20)el('line',{x1:x,y1:40,x2:x,y2:160,stroke:'#F3C2AC'},g);for(var y=40;y<=160;y+=20)el('line',{x1:120,y1:y,x2:200,y2:y,stroke:'#F3C2AC'},g);
 [[360,40],[440,120],[520,60]].forEach(function(p){el('circle',{cx:p[0],cy:p[1],r:7,fill:'#fff',stroke:'#B4593A','stroke-width':2},g)});
 var p=el('path',{d:d,fill:'none',stroke:'#E9A285','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'},s),L=p.getTotalLength?p.getTotalLength():3000;
 var t=el('text',{x:1025,y:106,'text-anchor':'middle','font-size':14,'font-weight':700,fill:'#141417','font-family':'Inter Variable, Inter, sans-serif'},s);t.textContent='Décision';
 [['Grille',160,186],['Graphe',440,186],['Chronologie',760,140]].forEach(function(z){var tt=el('text',{x:z[1],y:z[2],'text-anchor':'middle','font-size':12,fill:'#6B6A72','font-family':'Inter Variable, Inter, sans-serif'},s);tt.textContent=z[0]});
 if(REDUIT||!('IntersectionObserver' in window))return;p.style.strokeDasharray=L;p.style.strokeDashoffset=L;p.style.transition='stroke-dashoffset 3.2s ease';
 new IntersectionObserver(function(en,o){if(en[0].isIntersecting){p.style.strokeDashoffset=0;o.disconnect()}},{threshold:.4}).observe(s)}

/* ---------- le dossier de présentation (un vrai PDF, fabriqué dans le navigateur) ---------- */
function dossierPdf(){var b=$('dossierPdf');b.disabled=true;b.textContent='Préparation du PDF…';
 chargerJsPDF().then(function(J){var r=S.sim||M.simuler(BASE,{objet:'ev-mariage',valeur:'2016-06-18'}),d=new J({unit:'pt',format:'a4'}),W=595,H=842,y=0,page=1;
  var pied=function(){d.setFont('helvetica','normal');d.setFontSize(8);d.setTextColor(110);d.text(latin('AIME G44 LAB - Démonstrateur indépendant, sans affiliation officielle à la MSA. Données fictives. Aucune opération administrative réelle.'),48,H-28);d.text(String(page),W-48,H-28,{align:'right'});d.setTextColor(20)};
  var neuve=function(){pied();d.addPage();page++;y=70};
  var T=function(t,o){o=o||{};var s=o.s||10.5;d.setFont('helvetica',o.b?'bold':'normal');d.setFontSize(s);if(o.c)d.setTextColor.apply(d,o.c);d.splitTextToSize(latin(t),W-96-(o.ind||0)).forEach(function(l){if(y>H-70)neuve();d.text(l,48+(o.ind||0),y);y+=s*1.42});d.setTextColor(20);y+=o.ap==null?4:o.ap};
  var titre=function(k,t){if(y>H-160)neuve();y+=10;T(k,{b:1,s:9,c:[180,89,58],ap:12});T(t,{b:1,s:18,ap:10})};
  /* couverture */
  d.setFillColor(246,244,239);d.rect(0,0,W,H,'F');d.setFillColor(243,194,172);d.rect(48,110,W-96,3,'F');y=170;
  T('AIME®',{b:1,s:40,ap:8});T('G44 LAB',{b:1,s:14,c:[180,89,58],ap:30});T('Le laboratoire des dépendances administratives',{b:1,s:22,ap:6});T('Dossier de présentation · version du '+fr(A.DATE_LABO),{s:11,c:[90,90,96],ap:120});
  T('Comprendre avant d\'agir. Relier avant de reconstruire. Prouver avant de promettre.',{s:12,ap:8});neuve();
  titre('01','Le problème');T('Dans un environnement à formulaires, une année de mariage erronée peut devenir difficile à corriger lorsqu\'un enfant est déjà rattaché au dossier familial : il faut parfois annuler, corriger, recréer, puis revérifier.');T('Statut de cette affirmation : observé. Difficulté rapportée par un professionnel ; circonstances, organisme et logiciel à confirmer.',{c:[90,90,96]});
  T('Une information erronée ne se corrige pas toujours indépendamment des autres : il faut comprendre ses relations avant d\'agir.',{b:1});
  titre('02','La proposition');T('Le laboratoire ne remplace aucun système. Il rend visibles les informations de référence, leur origine, leurs relations typées, leurs dépendances chronologiques, les règles, les opérations passées, les conséquences d\'une correction envisagée, les habilitations et les contrôles.');
  titre('03','La méthode de simulation');['Charger l\'état initial.','Identifier la valeur à corriger.','Construire un état de simulation isolé.','Parcourir les dépendances qui propagent (référence, dépendance, contrainte). Une chronologie ou une hypothèse ne transmet rien.','Appliquer uniquement les règles connues du scénario.','Relever les incohérences.','Proposer un ordre de contrôles.','Comparer les états.','Produire un rapport.','Abandonner ou archiver la simulation. Aucune correction réelle n\'est exécutée.'].forEach(function(s,i){T((i+1)+'. '+s,{ind:8,ap:2})});
  titre('04','Le scénario fictif : résultat de la simulation');T('Mariage enregistré : '+fr(BASE.objets['ev-mariage'].dates.evenement)+'. Valeur envisagée : '+fr(r.demande.vers)+'. Acte de mariage fictif : '+fr(BASE.objets['d-mariage'].mentionne['ev-mariage'])+'. Empreinte du rapport : '+r.empreinte+'.');
  T('Objets concernés : '+r.touches.map(function(t){return obj(t.id).nom}).join(' ; ')+'.');T('Bloquants : '+(r.bloquants.map(function(b){return b.regle+' - '+obj(b.id).nom}).join(' ; ')||'aucun')+'.');T('Incohérences : '+(r.incoherences.map(function(i){return i.regle+' - '+i.texte}).join(' ; ')||'aucune')+'.');
  T('Indépendants, inchangés : '+r.independants.map(function(x){return x.nom}).join(' ; ')+'.');T('Incertitudes : '+r.incertitudes.map(function(i){return i.nom+' (hypothèse non appliquée)'}).join(' ; ')+'.');
  T('Ordre de reprise proposé, à valider :',{b:1});r.plan.forEach(function(p){T(p.n+'. '+p.texte+' - '+p.qui+(p.habilitation?' ('+p.habilitation+')':'')+' - '+D.NIVEAUX[p.niveau].nom+(p.detail?'. '+p.detail:''),{ind:8,ap:2})});
  titre('05','Six laboratoires, avec leur état réel');LABS.forEach(function(l){T('LAB '+l[0]+' · '+l[1]+' - '+l[4]+'. '+l[2],{ap:3})});
  titre('06','Ce que nous savons, ce que nous testons');Object.keys(D.NIVEAUX).forEach(function(k){T(D.NIVEAUX[k].nom+' : '+D.NIVEAUX[k].def,{ap:3})});
  titre('07','Mesurer au lieu de promettre');T('Aucun gain n\'est annoncé. Protocole proposé : même dossier fictif, même objectif, même population de volontaires, parcours de référence et parcours augmenté en ordre alterné.');MES.forEach(function(m){T('- '+m[0]+' ('+m[1]+') : '+m[2]+'. Résultat : mesure à réaliser.',{ind:8,ap:2})});
  titre('08','Moteurs AIME existants');T('Inventaire déclaré : 130 dépôts, 1 191 modules. Capacités rouvertes dans le code et classées de 1 (fonctionnelle et vérifiée) à 5 (à développer).');MOT.forEach(function(m){T('['+m[2]+'] '+m[0]+' - '+m[1]+'. '+m[3],{ind:8,ap:2})});
  titre('09','Limites');['Règles R1 à R4 expérimentales et fictives : elles ne décrivent aucune procédure réelle.','Aucune connexion à un système d\'information ; aucune donnée réelle ; aucun numéro de sécurité sociale.','La procédure G44 du coefficient d\'emploi n\'est pas reconstituée tant que son document source n\'est pas versé et autorisé.','Contrôles d\'accès exécutés dans le navigateur : en production, ils devraient s\'appliquer côté serveur.','Aucun gain mesuré à ce jour.','Ce dossier ne constitue pas une analyse de brevetabilité ; un avis en propriété industrielle est à prévoir avant toute divulgation détaillée.'].forEach(function(s){T('- '+s,{ind:8,ap:2})});
  pied();d.save('AIME-G44-LAB-dossier.pdf');toast('Dossier de présentation téléchargé ('+page+' pages).')}).catch(function(e){toast('PDF impossible : '+e.message)}).then(function(){b.disabled=false;b.textContent='Télécharger le dossier de présentation'})}

/* ---------- démarrage ---------- */
membres();hero();graphe();labos();couches();lab03();lab04();lab06();mesures(false);visuels();verite();moteurs();fil();toutRendre();
$('anMoins').onclick=function(){annee(-1)};$('anPlus').onclick=function(){annee(1)};
$('simulerScen').onclick=function(){simuler();toast('Simulation '+S.annee+' : '+S.sim.touches.length+' objets concernés, '+S.sim.bloquants.length+' bloquant, '+S.sim.incoherences.length+' incohérence(s).')};
$('simuler').onclick=function(){simuler()};$('comparer').onclick=function(){if(!S.sim)return;S.diff=true;lab02();var b=$('diffBloc');b&&b.scrollIntoView({behavior:REDUIT?'auto':'smooth',block:'center'})};$('abandonner').onclick=abandonner;
$('synthBtn').onclick=function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));this.textContent=on?'Masquer les données synthétiques':'Afficher un exemple de données synthétiques';mesures(on)};
$('dossierPdf').onclick=dossierPdf;
window.G44={etat:function(){return BASE},simulation:function(){return S.sim},simuler:function(an){if(an){S.annee=an;$('an').textContent=an}return simuler()},abandonner:abandonner,analyser:analyser,ficheExemple:ficheExemple,lirePdf:lirePdf};
})();
