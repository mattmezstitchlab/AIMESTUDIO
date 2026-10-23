/* AIME · le Bureau : ce que ce navigateur contient réellement, outil par outil.
   Chaque source LIT ses propres clés (jamais n'écrit) et dit comment rouvrir ce qu'elle trouve. Une source qui ne sait pas
   lister ses projets n'invente rien : elle n'apparaît que comme lien dans « Ouvrir un outil ».
   S : tout objet au contrat de localStorage (getItem, key, length) ; les tests passent un faux stockage.
   Sauvegarde / restauration : TOUTES les clés de ce site, ancien Bureau compris ; une restauration n'efface jamais rien. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEBureauSources=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
function lire(S,k){try{var v=S.getItem(k);return v==null?null:JSON.parse(v)}catch(e){return null}}
function cles(S){var out=[];try{for(var i=0;i<S.length;i++){var k=S.key(i);if(k!=null)out.push(k)}}catch(e){}return out.sort()}
function quand(t){if(t==null||t==='')return null;var n=typeof t==='number'?t:Date.parse(t);return isNaN(n)?null:n}
/* un lien enregistré ne mène qu'à une page de ce site : l'origine est retirée, le reste refusé */
function interne(u,base){u=String(u||'');var m=u.match(/^https?:\/\/[^\/]+(\/.*)?$/);if(m)u=m[1]||'/';if(u.charAt(0)==='#'||u.charAt(0)==='?')return base+u;return/^\/(?![\/\\])/.test(u)?u:base}
/* les contrats d'ouverture des outils, réutilisés tels quels : Studio « #open.<id> », événement « #ev.<id> » (voir aimeOpenHash dans studio/index.html) */
function studioLien(h,id,re){return re.test(String(id))?'/studio/#'+h+'.'+id:'/studio/'}
function nb(n,un,plusieurs){return n+' '+(n>1?plusieurs:un)}

/* les données de l'ancien Bureau à fenêtres (retiré le 20/10/2026) : plus lues par aucune page, gardées telles quelles */
/* « aime-os » n'y figure que s'il garde le format de l'ancien Bureau (sans « fenetres ») */
var ANCIEN_BUREAU=['aime-os','aime-a11y','aime-lang','aime-m4','aime-orb-intro','aime-tld','aime-tlh2','aime-tlp','aime-tlz','aime-tour','aime-uv','aime-wp','aime-wps'];

var SOURCES=[
 {id:'carte',outil:'zero',nom:'Ma Carte',lister:function(S){var c=lire(S,'aime-carte');if(!c||c.format!=='aime-carte')return[];
  var n=['nom','intention','couleurs','moments','formations','voyages','competences','interets','reves','territoires'].filter(function(k){var v=c[k];return Array.isArray(v)?v.length:!!v}).length;
  return[{id:c.id,titre:c.nom||'Ma Carte',detail:'Version '+c.version+' · '+nb(n,'rubrique remplie','rubriques remplies')+(c.publication&&c.publication.publiee?' · publiée':' · privée'),quand:quand((c.historique&&c.historique.length&&c.historique[c.historique.length-1].date)||c.creeLe),lien:'/aime/',action:'La voir dans Le Monde AIME'}]}},
 {id:'studio',outil:'studio',nom:'Studio · supports',lister:function(S){var db=lire(S,'echos:v2');if(!db||!Array.isArray(db.projects))return[];
  return db.projects.filter(function(p){return p&&p.id}).map(function(p){return{id:p.id,titre:p.name||'Projet sans titre',detail:(p.pack?'Univers '+p.pack:'Supports')+(db.cur===p.id?' · ouvert en dernier':''),quand:quand(p.updated),lien:studioLien('open',p.id,/^[A-Za-z0-9]+$/),action:/^[A-Za-z0-9]+$/.test(String(p.id))?'Ouvrir ce projet':'Ouvrir le Studio',enCours:db.cur===p.id}})}},
 {id:'evenements',outil:'studio',nom:'Événements',lister:function(S){var a=lire(S,'aime-app');if(!a||!Array.isArray(a.events))return[];
  return a.events.filter(function(e){return e&&e.id}).map(function(e){return{id:e.id,titre:e.title||e.names||e.name||'Événement',detail:(e.type==='seminaire'?'Séminaire':e.type==='mariage'?'Mariage':'Événement')+(e.date?' · '+e.date:''),quand:null,lien:studioLien('ev',e.id,/^[A-Za-z0-9_-]+$/),action:/^[A-Za-z0-9_-]+$/.test(String(e.id))?'Ouvrir ses supports':'Ouvrir le Studio',enCours:a.cur===e.id}})}},
 {id:'stitch',outil:'stitch',nom:'Stitch · brouillons',lister:function(S){var b=lire(S,'stitch-brouillons');if(!b||typeof b!=='object')return[];
  return Object.keys(b).map(function(id){var p=b[id]||{};return{id:id,titre:p.titre||id,detail:'Brouillon · version '+(p.version||1)+(p.palette?' · '+nb(p.palette.length,'couleur','couleurs'):''),quand:quand(p.modifieLe||p.majLe),lien:'/stitch/atelier/?brouillon='+encodeURIComponent(id),action:'Rouvrir dans l\'atelier'}})}},
 {id:'broderies',outil:'stitch',nom:'Stitch · broderies en cours',lister:function(S){return cles(S).filter(function(k){return k.indexOf('stitch-progression:')===0}).map(function(k){var g=lire(S,k)||{},id=k.slice(19);
  return{id:id,titre:(function(t){return t.charAt(0).toUpperCase()+t.slice(1)})(id.split('@')[0].replace(/^pat-/,'').replace(/-/g,' ')),detail:(g.n?nb(g.n,'point fait','points faits'):'Commencée')+' · version '+(id.split('@')[1]||'?'),quand:quand(g.t||g.date),lien:'/stitch/broder/',action:'Ouvrir la bibliothèque'}})}},
 {id:'compositions',outil:'synchroview',nom:'SynchroView · comparaisons',lister:function(S){var a=lire(S,'sv-compositions');if(!Array.isArray(a))return[];
  return a.filter(function(c){return c&&c.url}).map(function(c,i){return{id:'cmp'+i,titre:c.name||'Comparaison',detail:'Comparaison enregistrée',quand:null,lien:interne(c.url,'/synchroview/'),action:'Rouvrir'}})}},
 {id:'infinity',outil:'infinity',nom:'INFINITY · partie',lister:function(S){var p=lire(S,'aime-infinity');if(!p||!p.L)return[];
  return[{id:'partie',titre:'Partie en cours',detail:'Niveau '+p.L+(p.record&&p.record.L?' · record niveau '+p.record.L:''),quand:null,lien:'/infinity/',action:'Reprendre la partie'}]}},
 {id:'simulations',outil:'world',nom:'Démonstrateurs · simulations',demo:true,lister:function(S){return cles(S).filter(function(k){return/^aime-sim-[a-z0-9-]+$/.test(k)}).map(function(k){var j=lire(S,k),u=k.slice(9);if(!Array.isArray(j)||!j.length)return null;
  return{id:u,titre:u==='world'?'AIME WORLD':u==='mariage'?'Mariage Léa & Marc':u==='seminaire'?'Séminaire Maison Orée':u,detail:'Simulation : '+nb(j.length,'action','actions')+' · données fictives',quand:null,lien:u==='world'?'/vitrine/world/':'/vitrine/site/?u='+encodeURIComponent(u),action:'Reprendre la simulation'}}).filter(Boolean)}},
 {id:'sites',outil:'sites',nom:'Sites',lister:function(S){var o=lire(S,'aime-sites');if(!o||!o.sites)return[];return Object.keys(o.sites).map(function(id){var x=o.sites[id]||{};var n=(x.pages||[]).length;
  return{id:id,titre:x.nom||'Site',detail:n+' page'+(n>1?'s':'')+(x.infos&&x.infos.titre?' · '+x.infos.titre:''),quand:quand(x.majLe),lien:'/canevas/?site='+encodeURIComponent(id)+'&de=%2Fbureau%2F',action:'Modifier dans le Canevas',enCours:o.cur===id}})}},
 {id:'timeline',outil:'timeline',nom:'Timeline Jour J',lister:function(S){var k=S.getItem('jourj-plan-v5')!=null?'jourj-plan-v5':S.getItem('jourj-plan-v4')!=null?'jourj-plan-v4':null;if(!k)return[];
  return[{id:k,titre:'Plan du jour J',detail:'Dans l\'ancienne Timeline (/v1/)',quand:null,lien:'/v1/',action:'Ouvrir la Timeline'}]}}];

function inventaire(S){var out={sources:[],projets:[],ancienBureau:[],total:cles(S).length};
 SOURCES.forEach(function(src){var l=[];try{l=src.lister(S)||[]}catch(e){l=[]}l.forEach(function(p){p.source=src.id;p.outil=src.outil;if(src.demo)p.demo=true});out.sources.push({id:src.id,nom:src.nom,outil:src.outil,demo:!!src.demo,projets:l});out.projets=out.projets.concat(l)});
 out.ancienBureau=ANCIEN_BUREAU.filter(function(k){try{if(S.getItem(k)==null)return false}catch(e){return false}
  if(k!=='aime-os')return true;var v=lire(S,k);return!!v&&typeof v==='object'&&!Array.isArray(v.fenetres)});return out}
/* reprendre : d'abord ce qui est marqué « en cours », puis le plus récent daté ; jamais de projet fictif sauf s'il est dit fictif */
function reprendre(inv,n){var l=inv.projets.filter(function(p){return p.source!=='carte'});
 return l.slice().sort(function(a,b){return(b.enCours?1:0)-(a.enCours?1:0)||(b.quand||0)-(a.quand||0)||(a.demo?1:0)-(b.demo?1:0)}).slice(0,n||3)}

/* ---------- sauvegarde et restauration ---------- */
function sauvegarder(S,date){var c={};cles(S).forEach(function(k){try{c[k]=S.getItem(k)}catch(e){}});return{format:'aime-sauvegarde',schema:1,date:date||null,nombre:Object.keys(c).length,cles:c}}
/* les bases du navigateur (IndexedDB) : les projets du Point Zéro et leurs images. Encodage en JSON sans perte :
   un Blob devient {__aime:'blob',type,data:'data:…'}, un tableau typé {__aime:'ta',t,data:base64}. La lecture des Blob
   (asynchrone) est fournie par l'appelant ; ici, seulement la forme, testée sous node. */
var BASES={'aime-point-zero':['fichiers','projets']},TA=['Uint8Array','Uint8ClampedArray','Int16Array','Uint16Array','Int32Array','Uint32Array','Float32Array','Float64Array'];
function b64(u8){var s='';for(var i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return typeof btoa==='function'?btoa(s):Buffer.from(s,'binary').toString('base64')}
function deB64(t){var s=typeof atob==='function'?atob(t):Buffer.from(t,'base64').toString('binary'),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function encoder(v,lireBlob){if(v==null||typeof v!=='object')return Promise.resolve(v);
 if(typeof Blob!=='undefined'&&v instanceof Blob)return lireBlob(v).then(function(d){return{__aime:'blob',type:v.type||'',data:d}});
 if(ArrayBuffer.isView(v)&&TA.indexOf(v.constructor.name)>=0)return Promise.resolve({__aime:'ta',t:v.constructor.name,data:b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))});
 if(v instanceof ArrayBuffer)return Promise.resolve({__aime:'ab',data:b64(new Uint8Array(v))});
 if(Array.isArray(v))return Promise.all(v.map(function(x){return encoder(x,lireBlob)}));
 var k=Object.keys(v);return Promise.all(k.map(function(x){return encoder(v[x],lireBlob)})).then(function(L){var o={};k.forEach(function(x,i){o[x]=L[i]});return o})}
function decoder(v){if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(decoder);
 if(v.__aime==='ta'&&TA.indexOf(v.t)>=0){var u=deB64(v.data),C=(typeof self!=='undefined'?self:global)[v.t];return new C(u.buffer,u.byteOffset,u.byteLength/C.BYTES_PER_ELEMENT)}
 if(v.__aime==='ab')return deB64(v.data).buffer;
 if(v.__aime==='blob'&&typeof v.data==='string'&&/^data:/.test(v.data)){var m=/^data:([^;,]*)(;base64)?,(.*)$/.exec(v.data);if(m&&typeof Blob!=='undefined')return new Blob([m[2]?deB64(m[3]):decodeURIComponent(m[3])],{type:v.type||m[1]})}
 var o={};Object.keys(v).forEach(function(k){o[k]=decoder(v[k])});return o}
/* une base valide dans un fichier : seulement les bases et magasins connus, des enregistrements avec un id */
function basesValides(b){if(b==null)return{};if(typeof b!=='object')throw new Error('Sauvegarde abîmée : bases illisibles.');var o={};
 Object.keys(b).forEach(function(n){if(!BASES[n])return;o[n]={};BASES[n].forEach(function(s){var L=b[n][s];if(L==null)return;if(!Array.isArray(L))throw new Error('Sauvegarde abîmée : '+n+'/'+s+'.');o[n][s]=L.filter(function(x){return x&&typeof x==='object'&&(typeof x.id==='string'||typeof x.id==='number')})})});return o}
function compterBases(b){var n=0;Object.keys(b||{}).forEach(function(k){Object.keys(b[k]).forEach(function(s){n+=b[k][s].length})});return n}
function lireSauvegarde(texte){var o=typeof texte==='string'?JSON.parse(texte):texte;if(!o||o.format!=='aime-sauvegarde'||!o.cles||typeof o.cles!=='object')throw new Error('Ce fichier n\'est pas une sauvegarde AIME.');o.bases=basesValides(o.bases);
 Object.keys(o.cles).forEach(function(k){if(typeof o.cles[k]!=='string')throw new Error('Sauvegarde abîmée : « '+k+' » n\'est pas du texte.')});return o}
/* l'aperçu, avant toute écriture : ce qui est nouveau, ce qui diffère, ce qui est identique */
function apercu(S,sauv){var a={nouvelles:[],differentes:[],identiques:[]};Object.keys(sauv.cles).sort().forEach(function(k){var v=null;try{v=S.getItem(k)}catch(e){}if(v==null)a.nouvelles.push(k);else if(v===sauv.cles[k])a.identiques.push(k);else a.differentes.push(k)});return a}
/* restaurer : ajoute ce qui manque ; ne remplace une clé différente que si remplacer === true ; n'efface jamais */
function restaurer(S,sauv,remplacer){var ap=apercu(S,sauv),ecrites=[],erreurs=[];ap.nouvelles.concat(remplacer===true?ap.differentes:[]).forEach(function(k){try{S.setItem(k,sauv.cles[k]);ecrites.push(k)}catch(e){erreurs.push(k)}});return{ecrites:ecrites,gardees:remplacer===true?[]:ap.differentes,erreurs:erreurs}}

return{BASES:BASES,encoder:encoder,decoder:decoder,basesValides:basesValides,compterBases:compterBases,interne:interne,SOURCES:SOURCES,ANCIEN_BUREAU:ANCIEN_BUREAU,inventaire:inventaire,reprendre:reprendre,cles:cles,sauvegarder:sauvegarder,lireSauvegarde:lireSauvegarde,apercu:apercu,restaurer:restaurer};
});
