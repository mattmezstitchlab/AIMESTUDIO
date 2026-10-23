/* AIME · Design Systems, format « aime-design-system » 3.0.
   Un Design System change la présentation d'une réalisation, jamais son contenu. Ce module est pur (aucun DOM, aucun
   stockage). Il lit un système, le valide, puis le traduit vers ce que le moteur de pages comprend déjà (vitrine/rendu.js :
   ambiance, typographie, rayon). Il gère aussi le pointeur `presentation.design` d'un site (appliquer, annuler, restaurer)
   et calcule l'empreinte du contenu qui prouve que rien d'autre n'a bougé.

   Sécurité : aucune chaîne venue d'un fichier n'est copiée telle quelle dans le CSS.
   - Une couleur doit être exactement « #RRGGBB » : six chiffres hexadécimaux, rien d'autre.
   - Une police est un identifiant du registre POLICES. La pile CSS et la feuille Google Fonts viennent du registre, jamais
     du fichier.
   - Un nombre est borné selon son contexte (REGISTRE). Une valeur hors bornes est ramenée et signalée.
   - Un choix (casse, densité) fait partie d'une liste fermée.

     AIMEDesign.valider(objet, {bases})  → { ok, systeme, rapport:{erreurs, corrections, completees} }
     AIMEDesign.importer(texte, catalogue) → idem, depuis un fichier ; n'applique rien
     AIMEDesign.compiler(systeme)       → { id, nom, a, t, rayon, rayons, densite, fonts }   (forme du moteur de pages)
     AIMEDesign.catalogue([systemes])   → { ids, sources, compiles, rapports }
     AIMEDesign.appliquer(site, id, cat) / annuler(site) / restaurer(site) → { site, message }   (copies, jamais en place)
     AIMEDesign.empreinte(site)         → empreinte de tout ce qui n'est pas la présentation
     AIMEDesign.ecarts(a, b) / contrastes(c) → jetons qui changent, paires de contraste vérifiées */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEDesign=factory()})(typeof self!=='undefined'?self:this,function(){'use strict';
var FORMAT='aime-design-system',MAJEURE=3,VERSION='3.0.0',HISTO=20,TAILLE_MAX=200000;
var HEX=/^#[0-9A-Fa-f]{6}$/,ID=/^[a-z0-9][a-z0-9-]{0,39}$/,REV=/^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/* Les polices autorisées : pile CSS et famille Google Fonts, écrites ici, jamais lues dans un fichier. */
var POLICES={
 'outfit':{nom:'Outfit',pile:'"Outfit", "Inter Tight", system-ui, sans-serif',google:'Outfit:wght@400..700'},
 'inter':{nom:'Inter',pile:'"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',google:'Inter:wght@400..700'},
 'inter-tight':{nom:'Inter Tight',pile:'"Inter Tight", "Inter", system-ui, sans-serif',google:'Inter+Tight:wght@400..800'},
 'instrument-serif':{nom:'Instrument Serif',pile:'"Instrument Serif", Georgia, "Times New Roman", serif',google:'Instrument+Serif:ital@0;1'},
 'space-grotesk':{nom:'Space Grotesk',pile:'"Space Grotesk", "Inter Tight", system-ui, sans-serif',google:'Space+Grotesk:wght@400..700'},
 'jetbrains-mono':{nom:'JetBrains Mono',pile:'"JetBrains Mono", ui-monospace, monospace',google:'JetBrains+Mono:wght@400;500;600'},
 'fraunces':{nom:'Fraunces',pile:'"Fraunces", Georgia, serif',google:'Fraunces:opsz,wght@9..144,400..700'},
 'dm-sans':{nom:'DM Sans',pile:'"DM Sans", system-ui, sans-serif',google:'DM+Sans:opsz,wght@9..40,400..700'},
 'atkinson':{nom:'Atkinson Hyperlegible',pile:'"Atkinson Hyperlegible", Verdana, sans-serif',google:'Atkinson+Hyperlegible:wght@400;700'},
 'georgia':{nom:'Georgia (système)',pile:'Georgia, "Times New Roman", serif',google:null},
 'systeme':{nom:'Police du système',pile:'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',google:null}};

/* Le registre des propriétés : type, bornes selon le contexte, choix fermés. Les rayons ont chacun leur contexte : une
   surface (section, carte) supporte un arrondi moyen ; un contrôle (bouton, champ) reste plus serré pour garder sa forme
   lisible ; un média (image, vidéo, plan) peut s'arrondir davantage ; une pastille peut être entièrement ronde. */
var COULEURS=['fond','surface','surfaceHaute','texte','texteDoux','bordure','primaire','secondaire','relief','accent','succes','alerte','danger'];
var REGISTRE={
 'typographie.titres':{type:'police'},'typographie.texte':{type:'police'},'typographie.mono':{type:'police'},
 'typographie.graisseTitres':{type:'nombre',min:300,max:900,pas:100},
 'typographie.interligneTitres':{type:'nombre',min:0.85,max:1.4},
 'typographie.interligneTexte':{type:'nombre',min:1.3,max:1.9},
 'typographie.approche':{type:'nombre',min:-0.06,max:0.12,unite:'em'},
 'typographie.casse':{type:'choix',options:['none','uppercase']},
 'typographie.echelle':{type:'nombre',min:1,max:1.5},
 'structure.rayons.surface':{type:'nombre',min:0,max:32,unite:'px',contexte:'sections et cartes'},
 'structure.rayons.controle':{type:'nombre',min:0,max:24,unite:'px',contexte:'boutons et champs'},
 'structure.rayons.media':{type:'nombre',min:0,max:40,unite:'px',contexte:'images, vidéos, plans'},
 'structure.rayons.pastille':{type:'nombre',min:0,max:999,unite:'px',contexte:'pastilles et avatars'},
 'structure.bordure':{type:'nombre',min:0,max:4,unite:'px'},
 'structure.densite':{type:'choix',options:['compact','aere']}};
COULEURS.forEach(function(k){REGISTRE['couleurs.'+k]={type:'couleur'}});
/* Les paires lues comme du texte : AA (4,5:1). « relief » est la couleur des fonds d'avatars, des bandes et des dégradés :
   le texte y est grand (initiales), donc 3:1. */
var PAIRES=[['texte','fond',4.5],['texte','surface',4.5],['texteDoux','fond',4.5],['primaire','fond',4.5],['texte','relief',3]];

function copie(o){return JSON.parse(JSON.stringify(o))}
function lire(o,ch){return ch.split('.').reduce(function(v,k){return v!=null&&typeof v==='object'&&Object.prototype.hasOwnProperty.call(v,k)?v[k]:undefined},o)}
function poser(o,ch,v){var p=ch.split('.'),x=o;for(var i=0;i<p.length-1;i++){if(!x[p[i]]||typeof x[p[i]]!=='object')x[p[i]]={};x=x[p[i]]}x[p[p.length-1]]=v}

/* ---------- contraste WCAG ---------- */
function rgb(h){return[1,3,5].map(function(i){return parseInt(h.slice(i,i+2),16)})}
function lum(h){return rgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce(function(a,v,i){return a+v*[.2126,.7152,.0722][i]},0)}
function contraste(a,b){var x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}

/* ---------- validation : les six règles ---------- */
function valider(obj,o){o=o||{};var r={erreurs:[],corrections:[],completees:[]},s={};
 /* 1. format et version majeure : une majeure inconnue (future ou ancienne) est refusée */
 if(!obj||typeof obj!=='object'||Array.isArray(obj)){r.erreurs.push('Le fichier ne contient pas un Design System.');return{ok:false,systeme:null,rapport:r}}
 if(obj.format!==FORMAT){r.erreurs.push('Format attendu : « '+FORMAT+' ».');return{ok:false,systeme:null,rapport:r}}
 var maj=parseInt(String(obj.version||'').split('.')[0],10);
 if(maj!==MAJEURE){r.erreurs.push('Version '+String(obj.version).slice(0,12)+' non prise en charge : ce Canevas lit la version '+MAJEURE+'.');return{ok:false,systeme:null,rapport:r}}
 /* 2. identité : identifiant stable, révision, mode */
 if(!ID.test(String(obj.id||'')))r.erreurs.push('Identifiant invalide (minuscules, chiffres et tirets, 40 caractères au plus).');
 if(!REV.test(String(obj.revision||'')))r.erreurs.push('Révision invalide (forme 1.0.0).');
 var mode=obj.mode==='clair'||obj.mode==='sombre'?obj.mode:null;if(!mode)r.erreurs.push('Mode attendu : « clair » ou « sombre ».');
 if(r.erreurs.length)return{ok:false,systeme:null,rapport:r};
 s.format=FORMAT;s.version=VERSION;s.id=obj.id;s.revision=obj.revision;s.mode=mode;
 s.nom=String(obj.nom||obj.id).replace(/[<>]/g,'').slice(0,60);s.description=String(obj.description||'').replace(/[<>]/g,'').slice(0,240);s.jetons={};
 /* 5. complétude : ce qui manque vient du système de base du MÊME mode (jamais un thème sombre sous un thème clair) */
 var base=o.bases&&o.bases[mode]||null,j=obj.jetons||{};
 Object.keys(REGISTRE).forEach(function(ch){var d=REGISTRE[ch],v=lire(j,ch);
  if(v===undefined){var b=base?lire(base.jetons,ch):undefined;if(b===undefined){r.erreurs.push('« '+ch+' » manque, sans système de base pour le compléter.');return}poser(s.jetons,ch,b);r.completees.push(ch);return}
  /* 3. types : couleur #RRGGBB, police du registre, nombre fini, choix de la liste */
  if(d.type==='couleur'){if(typeof v!=='string'||!HEX.test(v)){r.erreurs.push('« '+ch+' » n\'est pas une couleur #RRGGBB.');return}poser(s.jetons,ch,v.toUpperCase());return}
  if(d.type==='police'){if(typeof v!=='string'||!Object.prototype.hasOwnProperty.call(POLICES,v)){r.erreurs.push('« '+ch+' » : police inconnue.');return}poser(s.jetons,ch,v);return}
  if(d.type==='choix'){if(d.options.indexOf(v)<0){r.erreurs.push('« '+ch+' » : valeur hors de la liste ('+d.options.join(', ')+').');return}poser(s.jetons,ch,v);return}
  var n=typeof v==='number'?v:NaN;if(!isFinite(n)){r.erreurs.push('« '+ch+' » n\'est pas un nombre.');return}
  /* 4. bornes selon le contexte : la valeur est ramenée et signalée */
  var c=Math.max(d.min,Math.min(d.max,n));if(d.pas)c=Math.round(c/d.pas)*d.pas;c=Math.round(c*1000)/1000;
  if(c!==n)r.corrections.push('« '+ch+' » : '+n+' ramené à '+c+(d.unite||'')+(d.contexte?' ('+d.contexte+')':'')+'.');poser(s.jetons,ch,c)});
 if(r.erreurs.length)return{ok:false,systeme:null,rapport:r};
 /* 6. contraste : les paires lues comme du texte doivent passer, sinon le système est refusé */
 var k=s.jetons.couleurs;PAIRES.forEach(function(p){var x=contraste(k[p[0]],k[p[1]]);if(x<p[2])r.erreurs.push('Contraste insuffisant entre « '+p[0]+' » et « '+p[1]+' » : '+x.toFixed(2)+':1 (minimum '+p[2]+':1).')});
 return{ok:!r.erreurs.length,systeme:r.erreurs.length?null:s,rapport:r}}

/* Un fichier importé : taille bornée, JSON seulement ; rien n'est appliqué ni enregistré ici. */
function importer(texte,cat){if(typeof texte!=='string'||texte.length>TAILLE_MAX)return{ok:false,systeme:null,rapport:{erreurs:['Fichier absent ou trop lourd (200 Ko au plus).'],corrections:[],completees:[]}};
 var o;try{o=JSON.parse(texte)}catch(e){return{ok:false,systeme:null,rapport:{erreurs:['Ce fichier n\'est pas du JSON valide.'],corrections:[],completees:[]}}}
 return valider(o,{bases:cat&&cat.bases})}

/* ---------- traduction vers le moteur de pages ---------- */
function polices(ids){var f=[];ids.forEach(function(i){var p=POLICES[i];if(p&&p.google&&f.indexOf(p.google)<0)f.push(p.google)});return f.length?'https://fonts.googleapis.com/css2?family='+f.join('&family=')+'&display=swap':''}
function compiler(s){var k=s.jetons.couleurs,t=s.jetons.typographie,st=s.jetons.structure;
 return{id:s.id,nom:s.nom,revision:s.revision,mode:s.mode,
  a:{id:s.id,nom:s.nom,c1:k.primaire,c2:k.relief,fond:k.fond,encre:k.texte,rayon:st.rayons.surface},
  t:{nom:POLICES[t.titres].nom,titre:POLICES[t.titres].pile,texte:POLICES[t.texte].pile,mono:POLICES[t.mono].pile,graisse:t.graisseTitres,casse:t.casse,interligne:t.interligneTitres,approche:t.approche+'em'},
  rayon:st.rayons.surface,rayons:{surface:st.rayons.surface,controle:st.rayons.controle,media:st.rayons.media,pastille:st.rayons.pastille},densite:st.densite,
  fonts:polices([t.titres,t.texte,t.mono]),couleurs:copie(k)}}

/* Le catalogue : les systèmes livrés avec AIME, validés au chargement. Les bases de complétion : Minimal (clair), Original (sombre). */
function catalogue(liste){var c={ids:[],sources:{},compiles:{},rapports:{},bases:{}},brut={};(liste||[]).forEach(function(o){if(o&&o.id)brut[o.id]=o});
 if(brut['aime-minimal'])c.bases.clair=brut['aime-minimal'];if(brut['aime-original'])c.bases.sombre=brut['aime-original'];
 (liste||[]).forEach(function(o){var v=valider(o,{bases:c.bases});c.rapports[o&&o.id||'?']=v.rapport;if(!v.ok)return;c.ids.push(v.systeme.id);c.sources[v.systeme.id]=v.systeme;c.compiles[v.systeme.id]=compiler(v.systeme)});return c}

/* ---------- le pointeur d'une réalisation : appliquer, annuler, restaurer ---------- */
function pointeur(site){var d=site&&site.presentation&&site.presentation.design;return d&&typeof d==='object'&&ID.test(String(d.id||''))?{id:d.id,revision:REV.test(String(d.revision||''))?d.revision:null}:null}
function memoriser(s){var h=Array.isArray(s.presentation.historique)?s.presentation.historique.slice(-(HISTO-1)):[];h.push({design:pointeur(s)});s.presentation.historique=h}
function appliquer(site,id,cat){var s=copie(site),avant=pointeur(site);
 if(id&&!(cat&&cat.compiles&&cat.compiles[id]))return{site:site,change:false,message:'Ce Design System n\'est pas disponible.'};
 if((avant?avant.id:null)===(id||null))return{site:site,change:false,message:id?'Ce Design System est déjà appliqué.':'La réalisation a déjà son apparence d\'origine.'};
 memoriser(s);s.presentation.design=id?{id:id,revision:cat.compiles[id].revision}:null;
 return{site:s,change:true,message:id?'Design System « '+cat.compiles[id].nom+' » appliqué. Le contenu n\'a pas changé.':'Apparence d\'origine rétablie.'}}
function annuler(site){var h=site&&site.presentation&&Array.isArray(site.presentation.historique)?site.presentation.historique:[];
 if(!h.length)return{site:site,change:false,message:'Rien à annuler.'};var s=copie(site),e=s.presentation.historique.pop();s.presentation.design=e&&e.design?e.design:null;
 return{site:s,change:true,message:'Changement d\'apparence annulé.'}}
function restaurer(site){if(!pointeur(site))return{site:site,change:false,message:'La réalisation a déjà son apparence d\'origine.'};var s=copie(site);memoriser(s);s.presentation.design=null;
 return{site:s,change:true,message:'Apparence d\'origine rétablie. Le contenu n\'a pas changé.'}}
/* Le moteur de pages lit ce pointeur seulement s'il désigne un système du catalogue ; sinon l'ambiance d'origine s'applique. */
function resoudre(site,cat){var p=pointeur(site);return p&&cat&&cat.compiles&&cat.compiles[p.id]||null}

/* ---------- preuves ---------- */
function stable(v){if(Array.isArray(v))return'['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return'{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k])}).join(',')+'}';return JSON.stringify(v)}
/* tout sauf la présentation (et la date de mise à jour) : pages, sections, listes, infos, médias, relations */
function empreinte(site){var o={};Object.keys(site||{}).forEach(function(k){if(k!=='presentation'&&k!=='majLe')o[k]=site[k]});var t=stable(o),h=0x811c9dc5;
 for(var i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return('0000000'+h.toString(16)).slice(-8)+'-'+t.length}
var LIBELLES={c1:'Couleur principale',c2:'Couleur secondaire',fond:'Fond',encre:'Texte',titre:'Police des titres',texte:'Police du texte',graisse:'Graisse des titres',casse:'Casse des titres',interligne:'Interligne des titres',approche:'Approche des titres',rayon:'Rayon des surfaces'};
function ecarts(A,B){var L=[];['c1','c2','fond','encre'].forEach(function(k){if(A.a[k]!==B.a[k])L.push({jeton:LIBELLES[k],avant:A.a[k],apres:B.a[k],couleur:true})});
 [['titre','nom'],['texte',null],['graisse',null],['casse',null],['interligne',null],['approche',null]].forEach(function(p){var x=A.t[p[0]],y=B.t[p[0]];if(String(x)!==String(y))L.push({jeton:LIBELLES[p[0]],avant:String(x).split(',')[0].replace(/"/g,''),apres:String(y).split(',')[0].replace(/"/g,'')})});
 if(+A.rayon!==+B.rayon)L.push({jeton:LIBELLES.rayon,avant:(+A.rayon||0)+' px',apres:(+B.rayon||0)+' px'});return L}
function contrastes(C){var a=C.a;return[{paire:'Texte sur fond',ratio:contraste(a.encre,a.fond),min:4.5},{paire:'Couleur principale sur fond',ratio:contraste(a.c1,a.fond),min:4.5},
 {paire:'Bouton (texte sur couleur principale)',ratio:Math.max(contraste(a.c1,a.fond),contraste(a.c1,a.encre)),min:4.5}].map(function(x){x.ok=x.ratio>=x.min;x.ratio=Math.round(x.ratio*100)/100;return x})}

return{FORMAT:FORMAT,VERSION:VERSION,MAJEURE:MAJEURE,POLICES:POLICES,REGISTRE:REGISTRE,COULEURS:COULEURS,PAIRES:PAIRES,HISTO:HISTO,
 valider:valider,importer:importer,compiler:compiler,catalogue:catalogue,appliquer:appliquer,annuler:annuler,restaurer:restaurer,resoudre:resoudre,pointeur:pointeur,
 empreinte:empreinte,ecarts:ecarts,contrastes:contrastes,contraste:contraste}});
