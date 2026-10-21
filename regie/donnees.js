/* AIME · RÉGIE · le modèle. Deux fichiers distincts, jamais mélangés :
   - la configuration du site (« site.json ») : appareils posés sur les pages, textes remplacés, orbe par site.
     Elle est publique : elle se publie avec le site.
   - la comptabilité (devis, factures, clients) : privée. Elle vit dans le navigateur de l'auto-entrepreneur et
     s'exporte en sauvegarde. Elle n'est JAMAIS écrite dans site.json.
   Tout ce qui vient d'un fichier ou d'un formulaire est assaini ici : types connus, nombres bornés, adresses
   limitées aux chemins du site, à la bibliothèque, aux médias importés et au https. Fonctions pures, testées sous node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMERegie=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';

/* ---------- les appareils ---------- */
var APPAREILS={
 iphone:{nom:'iPhone',ecran:[390,844],l:18},
 ipad:{nom:'iPad',ecran:[820,1180],l:30},
 macbook:{nom:'MacBook',ecran:[1440,900],l:58}};
var CONTENUS={vide:'Écran vide',image:'Image',video:'Vidéo',page:'Une page du site',url:'Une adresse web (https)'};
var MOBILE={visible:'Visible, à la même place',masque:'Masqué sur tablette et téléphone',pile:'Sous le contenu, pleine largeur'};

function txt(v,max){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').slice(0,max||200)}
function nb(v,min,max,def){var x=typeof v==='number'?v:parseFloat(v);if(!isFinite(x))return def;return Math.round(Math.min(max,Math.max(min,x))*100)/100}
function un(v,liste,def){return Object.prototype.hasOwnProperty.call(liste,v)?v:def}
function idOk(v){return typeof v==='string'&&/^[a-z0-9][a-z0-9-]{1,47}$/.test(v)}
function nouvelId(prefixe){return(prefixe||'a')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}

/* un chemin du site : commence par une seule barre, sans espace ni guillemet ni chevron ni barre oblique inverse */
function cheminOk(v){return typeof v==='string'&&v.length<=300&&/^\/(?!\/)[^\s"'<>\\]*$/.test(v)}
function httpsOk(v){if(typeof v!=='string'||v.length>500||!/^https:\/\/[^\s"'<>\\]+$/i.test(v))return false;try{var u=new URL(v);return u.protocol==='https:'&&!!u.hostname}catch(e){return false}}
/* une source d'image ou de vidéo */
function sourceOk(v){return typeof v==='string'&&(/^biblio:[a-z0-9-]{2,80}$/.test(v)||/^media:[a-z0-9-]{4,48}$/.test(v)||cheminOk(v)||httpsOk(v))}
/* une cible de suggestion : un chemin, une ancre, ou https */
function cibleOk(v){return typeof v==='string'&&(cheminOk(v)||/^#[A-Za-z][\w-]{0,60}$/.test(v)||httpsOk(v))}

/* /studio, /studio/, /studio/index.html → /studio/ ; / reste / */
function cleDePage(p){p=String(p||'/').split('#')[0].split('?')[0];if(!cheminOk(p))return'/';p=p.replace(/\/index\.html?$/i,'/').replace(/\.html?$/i,'');if(p!=='/'&&!/\/$/.test(p))p+='/';return p.replace(/\/{2,}/g,'/')}

function appareil(a){a=a||{};var t=un(a.type,APPAREILS,'iphone'),c=a.contenu||{},ct=un(c.type,CONTENUS,'vide'),src=null;
 if(ct==='image'||ct==='video')src=sourceOk(c.src)?c.src:null;else if(ct==='page')src=cheminOk(c.src)?c.src:null;else if(ct==='url')src=httpsOk(c.src)?c.src:null;
 if(ct!=='vide'&&!src)ct='vide';
 return{id:idOk(a.id)?a.id:nouvelId(t),type:t,ancre:typeof a.ancre==='string'&&a.ancre.length<=200&&!/[<>{}]/.test(a.ancre)&&a.ancre.trim()?a.ancre.trim():'body',
  x:nb(a.x,-40,140,10),y:nb(a.y,-40,140,10),l:nb(a.l,3,100,APPAREILS[t].l),rot:nb(a.rot,-45,45,0),z:Math.round(nb(a.z,1,60,5)),
  paysage:t!=='macbook'&&a.paysage===true,mobile:un(a.mobile,MOBILE,'visible'),
  contenu:{type:ct,src:src,ajustement:c.ajustement==='contain'?'contain':'cover',muet:c.muet!==false},
  lien:cibleOk(a.lien)?a.lien:'',alt:txt(a.alt,240)}}

function texte(r){r=r||{};var sel=typeof r.sel==='string'?r.sel.trim().slice(0,300):'';if(!sel||/[<>{}]/.test(sel))return null;return{sel:sel,texte:txt(r.texte,2000),avant:txt(r.avant,2000)}}

/* ---------- l'orbe, par site ---------- */
var PRESENCES={aucune:'Absente',bouton:'Bouton d\'orbe et ses suggestions',compagnon:'Compagnon (commente et propose)','les-deux':'Les deux'};
var OPTIONS_COMPAGNON={commentaires:'Commenter au survol',clic:'Menu au clic sur un contenu',envie:'Flèche vers ce que l\'orbe veut essayer',hesitation:'Proposer de réfléchir après 3 s d\'hésitation',pointeur:'L\'orbe suit le pointeur'};
function orbe(o){o=o||{};var c=o.compagnon||{},cc={};Object.keys(OPTIONS_COMPAGNON).forEach(function(k){cc[k]=c[k]===true});
 var s=Array.isArray(o.suggestions)?o.suggestions:[];
 return{presence:un(o.presence,PRESENCES,'aucune'),cote:o.cote==='gauche'?'gauche':'droite',taille:Math.round(nb(o.taille,36,96,56)),
  accueil:txt(o.accueil,240),compagnon:cc,
  suggestions:s.map(function(x){x=x||{};var l=txt(x.libelle,60).trim();return l&&cibleOk(x.cible)?{libelle:l,cible:x.cible}:null}).filter(Boolean).slice(0,6)}}

/* ---------- la configuration complète ---------- */
function vide(){return{format:'aime-regie',version:1,maj:null,pages:{},orbe:{},medias:{}}}
function config(o){var r=vide();if(!o||typeof o!=='object')return r;if(o.format&&o.format!=='aime-regie')throw new Error('Ce fichier n\'est pas une configuration de la régie AIME.');
 r.maj=typeof o.maj==='string'?o.maj.slice(0,40):null;
 var P=o.pages&&typeof o.pages==='object'?o.pages:{};Object.keys(P).slice(0,200).forEach(function(k){var p=P[k]||{},cle=cleDePage(k),vus={};
  var app=(Array.isArray(p.appareils)?p.appareils:[]).slice(0,40).map(appareil).filter(function(a){if(vus[a.id])return false;vus[a.id]=1;return true});
  var tx=(Array.isArray(p.textes)?p.textes:[]).slice(0,200).map(texte).filter(Boolean);
  if(app.length||tx.length)r.pages[cle]={appareils:app,textes:tx}});
 var O=o.orbe&&typeof o.orbe==='object'?o.orbe:{};Object.keys(O).slice(0,100).forEach(function(k){if(idOk(k)||k==='*')r.orbe[k]=orbe(O[k])});
 var M=o.medias&&typeof o.medias==='object'?o.medias:{};Object.keys(M).slice(0,300).forEach(function(k){var m=M[k]||{};if(/^[a-z0-9-]{4,48}$/.test(k)&&/^(webp|jpg|jpeg|png|gif|avif|mp4|webm)$/.test(m.ext))r.medias[k]={nom:txt(m.nom,120),ext:m.ext,type:/^(mp4|webm)$/.test(m.ext)?'video':'image'}});
 return r}

/* où pointe une source, une fois publiée (les médias importés partent dans regie/medias/) */
function resoudre(src,cfg){if(typeof src!=='string')return null;var m;
 if((m=/^biblio:([a-z0-9-]+)$/.exec(src)))return'/sites/bibliotheque/'+m[1]+'.webp';
 if((m=/^media:([a-z0-9-]+)$/.exec(src))){var d=cfg&&cfg.medias&&cfg.medias[m[1]];return d?'/regie/medias/'+m[1]+'.'+d.ext:null}
 return cheminOk(src)||httpsOk(src)?src:null}

/* quel site (au sens du registre) porte une adresse : le préfixe le plus long gagne */
function siteDe(chemin,entrees){chemin=cleDePage(chemin);var best=null,lg=-1;(entrees||[]).forEach(function(e){var a=cleDePage(String(e.href||e.adresse||'').split('?')[0]);if(a==='/'?chemin==='/':chemin.indexOf(a)===0){if(a.length>lg){lg=a.length;best=e.id}}});return best}

/* l'orbe qui s'applique à un site : son réglage, sinon le réglage commun « * », sinon absente */
function orbeDe(cfg,siteId){return(cfg.orbe&&(cfg.orbe[siteId]||cfg.orbe['*']))||orbe({})}

/* ================= comptabilité : devis, factures, avoirs ================= */
var TYPES_DOC={devis:{nom:'Devis',prefixe:'D'},facture:{nom:'Facture',prefixe:'F'},avoir:{nom:'Avoir',prefixe:'A'}};
var STATUTS={devis:{brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé'},facture:{brouillon:'Brouillon',emise:'Émise',payee:'Payée'},avoir:{brouillon:'Brouillon',emise:'Émis'}};
var MENTIONS_DEFAUT={
 tva:'TVA non applicable, art. 293 B du CGI',
 paiement:'Paiement à réception de facture, par virement.',
 penalites:'En cas de retard de paiement, des pénalités sont dues au taux de trois fois le taux d\'intérêt légal.',
 indemnite:'Pour un client professionnel : indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).',
 escompte:'Pas d\'escompte pour paiement anticipé.',
 validite:30};
function emetteurVide(){return{statut:'EI',nom:'',commercial:'',adresse:'',siren:'',siret:'',ape:'',email:'',tel:'',site:'',iban:'',bic:'',banque:'',assurance:'',tva:MENTIONS_DEFAUT.tva,paiement:MENTIONS_DEFAUT.paiement,penalites:MENTIONS_DEFAUT.penalites,indemnite:MENTIONS_DEFAUT.indemnite,escompte:MENTIONS_DEFAUT.escompte,validite:MENTIONS_DEFAUT.validite}}
function comptaVide(){return{format:'aime-compta',version:1,emetteur:emetteurVide(),clients:[],docs:[],compteurs:{},sauvegarde:null}}
function dateOk(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))}
function client(c){c=c||{};return{id:idOk(c.id)?c.id:nouvelId('c'),nom:txt(c.nom,120),societe:txt(c.societe,120),adresse:txt(c.adresse,400),email:txt(c.email,160),tel:txt(c.tel,40),siren:txt(c.siren,20),pro:c.pro===true}}
function ligne(l){l=l||{};return{designation:txt(l.designation,600),quantite:nb(l.quantite,-100000,100000,1),unite:txt(l.unite,20),pu:nb(l.pu,-1e7,1e7,0)}}
function doc(d){d=d||{};var t=un(d.type,TYPES_DOC,'devis');return{id:idOk(d.id)?d.id:nouvelId(t[0]),type:t,numero:typeof d.numero==='string'&&/^[DFA]-\d{4}-\d{3,}$/.test(d.numero)?d.numero:null,
 statut:un(d.statut,STATUTS[t],'brouillon'),clientId:idOk(d.clientId)?d.clientId:null,client:d.client?client(d.client):null,emetteur:d.emetteur||null,
 date:dateOk(d.date)?d.date:null,echeance:dateOk(d.echeance)?d.echeance:null,prestation:txt(d.prestation,120),objet:txt(d.objet,200),
 lignes:(Array.isArray(d.lignes)?d.lignes:[]).slice(0,200).map(ligne),notes:txt(d.notes,2000),
 origine:idOk(d.origine)?d.origine:null,paiement:d.paiement&&dateOk(d.paiement.date)?{date:d.paiement.date,mode:txt(d.paiement.mode,60)}:null,cree:typeof d.cree==='string'?d.cree.slice(0,30):null}}
function compta(o){var r=comptaVide();if(!o)return r;if(typeof o==='string')o=JSON.parse(o);if(o.format!=='aime-compta')throw new Error('Ce fichier n\'est pas une sauvegarde des devis et factures AIME.');
 var e=o.emetteur||{},E=emetteurVide();Object.keys(E).forEach(function(k){if(k==='validite')E[k]=Math.round(nb(e[k],1,365,30));else if(e[k]!=null)E[k]=txt(e[k],k==='adresse'?400:300)});r.emetteur=E;
 r.clients=(Array.isArray(o.clients)?o.clients:[]).slice(0,2000).map(client);r.docs=(Array.isArray(o.docs)?o.docs:[]).slice(0,5000).map(doc);
 var C=o.compteurs||{};Object.keys(C).forEach(function(k){if(/^[DFA]-\d{4}$/.test(k))r.compteurs[k]=Math.round(nb(C[k],0,1e6,0))});
 /* les compteurs ne reculent jamais en dessous des numéros déjà attribués */
 r.docs.forEach(function(d){if(d.numero){var p=d.numero.split('-'),k=p[0]+'-'+p[1],n=parseInt(p[2],10);if(!(r.compteurs[k]>=n))r.compteurs[k]=n}});
 r.sauvegarde=typeof o.sauvegarde==='string'?o.sauvegarde.slice(0,40):null;return r}

function centimes(x){return Math.round(x*100)}
function totalLigne(l){return centimes(l.quantite*l.pu)/100}
function total(d){return d.lignes.reduce(function(s,l){return s+centimes(l.quantite*l.pu)},0)/100}
function euros(x){return(Math.round(x*100)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}).replace(/\u202f/g,'\u00a0')}
function plusJours(date,j){var t=new Date(date+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+j);return t.toISOString().slice(0,10)}

/* ce qui manque pour émettre : la liste vide veut dire « prêt » */
function manques(c,d){var E=c.emetteur,m=[],cl=d.client||c.clients.filter(function(x){return x.id===d.clientId})[0];
 if(!E.nom.trim())m.push('Votre nom (émetteur)');if(!E.adresse.trim())m.push('Votre adresse');
 if(d.type!=='devis'&&!/^\d{9}$/.test(E.siren.replace(/\s/g,''))&&!/^\d{14}$/.test(E.siret.replace(/\s/g,'')))m.push('Votre SIREN (9 chiffres) ou SIRET (14 chiffres)');
 if(!cl||!(cl.nom.trim()||cl.societe.trim()))m.push('Le client');else if(!cl.adresse.trim()&&d.type!=='devis')m.push('L\'adresse du client');
 if(!d.lignes.length||!d.lignes.some(function(l){return l.designation.trim()}))m.push('Au moins une ligne (désignation)');
 if(d.type!=='devis'&&!d.prestation.trim())m.push('La date ou la période de la prestation');
 if(d.type==='avoir'&&!d.origine)m.push('La facture d\'origine');
 return m}

function prochainNumero(c,type,date){var y=(date||new Date().toISOString()).slice(0,4),k=TYPES_DOC[type].prefixe+'-'+y,n=(c.compteurs[k]||0)+1;return{cle:k,n:n,numero:k+'-'+('00'+n).slice(-Math.max(3,String(n).length))}}

/* émettre : numéro chronologique sans trou, client et émetteur figés dans le document. Une facture émise ne se
   modifie plus : on l'annule par un avoir. Renvoie une NOUVELLE comptabilité (l'ancienne reste intacte). */
function emettre(c,id,date){var c2=JSON.parse(JSON.stringify(c)),d=c2.docs.filter(function(x){return x.id===id})[0];if(!d)throw new Error('Document introuvable.');
 if(d.numero)throw new Error('Ce document est déjà émis ('+d.numero+').');date=dateOk(date)?date:new Date().toISOString().slice(0,10);
 var m=manques(c2,d);if(m.length)throw new Error('Il manque : '+m.join(', ')+'.');
 /* la date d'une facture ne précède jamais celle de la précédente de la même série */
 var pref=TYPES_DOC[d.type].prefixe,der=c2.docs.filter(function(x){return x.numero&&x.numero[0]===pref&&x.numero.slice(2,6)===date.slice(0,4)}).map(function(x){return x.date}).sort().pop();
 if(d.type!=='devis'&&der&&date<der)throw new Error('La date ('+date+') précède celle de la dernière '+(d.type==='avoir'?'pièce':'facture')+' émise ('+der+') : la numérotation doit rester chronologique.');
 var p=prochainNumero(c2,d.type,date);c2.compteurs[p.cle]=p.n;d.numero=p.numero;d.date=date;
 var cl=c2.clients.filter(function(x){return x.id===d.clientId})[0];if(cl)d.client=client(cl);d.emetteur=JSON.parse(JSON.stringify(c2.emetteur));
 if(d.type==='devis'){d.statut='envoye';if(!d.echeance)d.echeance=plusJours(date,c2.emetteur.validite||30)}else{d.statut='emise';if(!d.echeance)d.echeance=date}
 return c2}
/* un devis accepté devient une facture brouillon (lignes reprises, devis marqué accepté) */
function devisVersFacture(c,id){var c2=JSON.parse(JSON.stringify(c)),d=c2.docs.filter(function(x){return x.id===id})[0];if(!d||d.type!=='devis')throw new Error('Devis introuvable.');
 d.statut='accepte';var f=doc({type:'facture',clientId:d.clientId,objet:d.objet,prestation:d.prestation,lignes:d.lignes,notes:d.numero?'Selon devis '+d.numero+'.':'',origine:d.id,cree:new Date().toISOString()});c2.docs.push(f);return{compta:c2,id:f.id}}
/* un avoir annule tout ou partie d'une facture émise (montants négatifs, référence à la facture) */
function avoirDe(c,id){var c2=JSON.parse(JSON.stringify(c)),d=c2.docs.filter(function(x){return x.id===id})[0];if(!d||d.type!=='facture'||!d.numero)throw new Error('Seule une facture émise peut recevoir un avoir.');
 var a=doc({type:'avoir',clientId:d.clientId,objet:'Avoir sur facture '+d.numero,prestation:d.prestation,lignes:d.lignes.map(function(l){return{designation:l.designation,quantite:-l.quantite,unite:l.unite,pu:l.pu}}),notes:'Annule la facture '+d.numero+'.',origine:d.id,cree:new Date().toISOString()});c2.docs.push(a);return{compta:c2,id:a.id}}

/* les mentions imprimées en pied de document */
function mentions(d,E){E=E||d.emetteur||emetteurVide();var m=[];if(E.tva)m.push(E.tva);
 if(d.type==='devis'){m.push('Devis valable '+(E.validite||30)+' jours à compter de sa date d\'émission.');m.push('Bon pour accord : date, signature et mention « devis reçu avant l\'exécution des travaux ».')}
 else{if(d.echeance)m.push('Date d\'échéance : '+frDate(d.echeance)+'.');if(E.paiement)m.push(E.paiement);if(E.escompte)m.push(E.escompte);if(E.penalites)m.push(E.penalites);if(E.indemnite)m.push(E.indemnite)}
 if(E.assurance)m.push('Assurance professionnelle : '+E.assurance+'.');return m}
function frDate(s){if(!dateOk(s))return'';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]}

return{APPAREILS:APPAREILS,CONTENUS:CONTENUS,MOBILE:MOBILE,PRESENCES:PRESENCES,OPTIONS_COMPAGNON:OPTIONS_COMPAGNON,
 cheminOk:cheminOk,httpsOk:httpsOk,sourceOk:sourceOk,cibleOk:cibleOk,cleDePage:cleDePage,appareil:appareil,texte:texte,orbe:orbe,vide:vide,config:config,resoudre:resoudre,siteDe:siteDe,orbeDe:orbeDe,nouvelId:nouvelId,
 TYPES_DOC:TYPES_DOC,STATUTS:STATUTS,MENTIONS_DEFAUT:MENTIONS_DEFAUT,emetteurVide:emetteurVide,comptaVide:comptaVide,compta:compta,client:client,ligne:ligne,doc:doc,
 total:total,totalLigne:totalLigne,euros:euros,manques:manques,prochainNumero:prochainNumero,emettre:emettre,devisVersFacture:devisVersFacture,avoirDe:avoirDe,mentions:mentions,frDate:frDate,plusJours:plusJours}});
