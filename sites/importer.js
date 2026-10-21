/* AIME · générateur : régénérer un site à partir d'un dossier ou d'un .zip HTML (un site qui vous appartient).
   Lecture par règles fixes, vérifiables, sans IA : titres → sections, images du dossier → galerie, dates / adresses / e-mails /
   téléphones → infos (donc en-tête, compte à rebours, lieu, contact), horaires → programme, questions → FAQ, prix → tarifs,
   couleurs et polices → l'ambiance la plus proche. Chaque fichier .html devient une page. Rien n'est exécuté : les scripts du
   site d'origine sont ignorés. Un compte rendu dit ce qui a été reconnu, et ce qui ne l'a pas été.
   AIMEImport.lire(fichiers, {ambiances, typographies}, tri) → Promise<{ site, rapport }>   fichiers : [{ chemin, blob }]
   Avant toute lecture, trier() applique les LIMITES (documentées dans docs/SITES.md) : nombre de fichiers, volume, taille par
   type, chemins suspects, contenus actifs. Une archive n'est décompressée qu'après ce tri, fichier par fichier, et la taille
   réelle est vérifiée à mesure. Le rapport range tout en quatre catégories : reconnu, transformé, ignoré, à vérifier. */
(function(root){'use strict';
var S=root.AIMESite;
var MOIS=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function propre(t){return String(t||'').replace(/\s+/g,' ').trim()}
function dateDans(t){var n=norm(t),m=n.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(m)return m[0];m=n.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/);if(m)return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
 m=n.match(/\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})\b/);return m?m[3]+'-'+('0'+(MOIS.indexOf(m[2])+1)).slice(-2)+'-'+('0'+m[1]).slice(-2):''}
function heureDans(t){var m=String(t||'').match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i);return m?('0'+m[1]).slice(-2)+':'+(m[2]||'00'):''}
function mailDans(t){return(String(t||'').match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)||[])[0]||''}
function telDans(t){var m=String(t||'').match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/);return m?m[0]:''}
function adresseDans(t){var m=String(t||'').match(/(\d{1,4}(?:[ \t]?(?:bis|ter))?,?[ \t]+[^,\n]{3,60}?),?[ \t]+(\d{5})[ \t]+([A-ZÀ-Ü][\wÀ-ÿ' -]{1,40})/);return m?{adresse:propre(m[1]+', '+m[2]),ville:propre(m[3])}:null}
var THEMES=[['programme',/programme|planning|deroule|horaires|agenda|journee/],['faq',/faq|questions|on vous repond/],['tarifs',/tarif|prix|offre|formule|prestations/],['contact',/contact|nous ecrire|joindre/],['galerie',/galerie|photos|portfolio|realisations|images/],['lieu',/lieu|acces|venir|adresse|plan/],['hebergement',/hebergement|hotel|dormir|logement/],['cadeaux',/cadeau|liste de mariage|cagnotte/],['menu',/menu|carte des|repas/],['personnes',/equipe|qui sommes|temoins|intervenants|team/],['rsvp',/rsvp|repondre|reponse|inscription/]];
function theme(t){var n=norm(t);for(var i=0;i<THEMES.length;i++)if(THEMES[i][1].test(n))return THEMES[i][0];return null}
function hex(c){c=String(c).trim();var m=c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(m){var h=m[1];if(h.length===3)h=h.replace(/./g,'$&$&');return'#'+h.toUpperCase()}m=c.match(/^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/i);return m?'#'+[m[1],m[2],m[3]].map(function(v){return('0'+(+v).toString(16)).slice(-2)}).join('').toUpperCase():''}
function rgb(h){h=h.replace('#','');return[0,2,4].map(function(i){return parseInt(h.slice(i,i+2),16)})}
function dist(a,b){var x=rgb(a),y=rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])}
function lum(h){var c=rgb(h);return(c[0]*299+c[1]*587+c[2]*114)/1000}
function sat(h){var c=rgb(h),mx=Math.max.apply(0,c),mn=Math.min.apply(0,c);return mx?(mx-mn)/mx:0}
function lireBlob(b,mode){return new Promise(function(ok,ko){var r=new FileReader();r.onload=function(){ok(r.result)};r.onerror=ko;mode==='url'?r.readAsDataURL(b):r.readAsText(b)})}
function reduire(dataUrl){return new Promise(function(ok){var im=new Image();im.onload=function(){var k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.82))};im.onerror=function(){ok('')};im.src=dataUrl})}
function resoudre(base,src){if(!src||/^(data:|https?:|\/\/)/i.test(src))return null;var p=base.split('/').slice(0,-1),parts=src.split(/[?#]/)[0].split('/');parts.forEach(function(x){if(x==='..')p.pop();else if(x&&x!=='.')p.push(x)});return p.join('/')}

/* ---------- limites et tri, avant toute lecture ---------- */
var LIMITES={archive:25e6,entrees:400,decompresse:60e6,html:2e6,css:1e6,image:8e6,pages:12,images:24,cheminMax:240};
function mo(n){return String(Math.round(n/1e5)/10).replace('.',',')+' Mo'}
function genre(c){return/\.html?$/i.test(c)?'html':/\.css$/i.test(c)?'css':/\.(png|jpe?g|gif|webp|avif)$/i.test(c)?'image':/\.svg$/i.test(c)?'svg':/\.(m?js|php\d?|phtml|asp|aspx|jsp|cgi|pl|py|sh|bat|cmd|exe|dll|jar|wasm|htaccess)$/i.test(c)?'actif':'autre'}
function cheminSuspect(c){c=String(c);if(/\0/.test(c))return'caractère nul dans le nom';if(c.length>LIMITES.cheminMax)return'chemin trop long';if(/\\/.test(c))return'barre oblique inverse dans le chemin';if(/^\/|^[A-Za-z]:/.test(c))return'chemin absolu';if(c.split('/').some(function(x){return x==='..'}))return'chemin qui remonte hors du dossier (..)';return''}
/* entrees : [{chemin, taille}] (taille -1 si inconnue) → { garder, ignores:[{chemin,raison}], erreur } ; n'ouvre aucun fichier */
function trier(entrees){var out={garder:[],ignores:[],caches:0,erreur:''};
 if(entrees.length>LIMITES.entrees){out.erreur='Ce dossier contient '+entrees.length+' fichiers ; la limite est de '+LIMITES.entrees+'. Rien n\'a été importé.';return out}
 var total=0;entrees.forEach(function(e){var c=String(e.chemin||''),g=genre(c),t=+e.taille,susp=cheminSuspect(c);
  if(susp){out.ignores.push({chemin:c.slice(0,120),raison:'chemin suspect : '+susp});return}
  if(/(^|\/)(__MACOSX|\.)/.test(c)){out.caches++;return}
  if(g==='actif'){out.ignores.push({chemin:c,raison:'contenu actif, jamais exécuté ni repris'});return}
  if(g==='svg'){out.ignores.push({chemin:c,raison:'image SVG : elle peut contenir du code, non reprise'});return}
  if(g==='autre')return;
  var lim=LIMITES[g];if(t>lim){out.ignores.push({chemin:c,raison:'fichier trop lourd ('+mo(t)+', limite '+mo(lim)+')'});return}
  if(t>0)total+=t;out.garder.push(e)});
 if(total>LIMITES.decompresse){out.erreur='Une fois décompressé, ce site pèserait '+mo(total)+' ; la limite est de '+mo(LIMITES.decompresse)+'. Rien n\'a été importé.';return out}
 if(!out.garder.some(function(e){return genre(e.chemin)==='html'}))out.erreur='Aucune page HTML lisible dans ce dossier'+(out.ignores.length?' ('+out.ignores.length+' fichier(s) écarté(s))':'')+'. Rien n\'a été importé.';
 return out}
function racineCommune(L){var r=L.map(function(f){return f.chemin.split('/')[0]});return r.length&&r.every(function(x){return x===r[0]})&&L.every(function(f){return f.chemin.indexOf('/')>0})?r[0]+'/':''}
var TYPES={html:'text/html',css:'text/css',image:'application/octet-stream'};
/* une archive (contrat JSZip : forEach(chemin, entrée), entrée.async('uint8array'), entrée._data.uncompressedSize) → { fichiers, tri }
   JSZip « assainit » les chemins en « ../ » : c'est le nom d'origine (unsafeOriginalName) qui est jugé, pour signaler le piège.
   tailles déclarées vérifiées avant, tailles réelles vérifiées après chaque fichier, un seul fichier décompressé à la fois */
function depuisArchive(z){var E=[];z.forEach(function(chemin,f){if(f.dir)return;var t=f._data&&typeof f._data.uncompressedSize==='number'?f._data.uncompressedSize:-1;E.push({chemin:f.unsafeOriginalName||chemin,taille:t,f:f})});
 var tri=trier(E);if(tri.erreur)return Promise.reject(new Error(tri.erreur));var total=0,fichiers=[];
 return tri.garder.reduce(function(pr,e){return pr.then(function(){return e.f.async('uint8array').then(function(u){var g=genre(e.chemin);
  if(u.length>LIMITES[g]){tri.ignores.push({chemin:e.chemin,raison:'fichier trop lourd une fois décompressé ('+mo(u.length)+')'});return}
  total+=u.length;if(total>LIMITES.decompresse)throw new Error('Le contenu réel de l\'archive dépasse '+mo(LIMITES.decompresse)+' une fois décompressé. Import arrêté, rien n\'a été modifié.');
  fichiers.push({chemin:e.chemin,blob:new Blob([u],{type:TYPES[g]})})})})},Promise.resolve()).then(function(){var c=racineCommune(fichiers);return{fichiers:fichiers.map(function(f){return{chemin:f.chemin.slice(c.length),blob:f.blob}}),tri:tri}})}
/* une sélection de fichiers ou un dossier : les tailles sont connues sans rien lire */
function depuisFichiers(L){var tri=trier(L.map(function(f){return{chemin:f.chemin,taille:f.blob&&f.blob.size!=null?f.blob.size:-1,blob:f.blob}}));if(tri.erreur)throw new Error(tri.erreur);return{fichiers:tri.garder.map(function(e){return{chemin:e.chemin,blob:e.blob}}),tri:tri}}
/* le compte rendu en quatre catégories */
function classer(R){var c={reconnu:[],transforme:[],ignore:[],aVerifier:[]};
 Object.keys(R.sections||{}).forEach(function(k){c.reconnu.push(R.sections[k]+' section'+(R.sections[k]>1?'s':'')+' « '+(S&&S.BLOCS&&S.BLOCS[k]?S.BLOCS[k].nom:k)+' »')});(R.infos||[]).forEach(function(t){c.reconnu.push('Info : '+t)});
 (R.transformes||[]).forEach(function(t){c.transforme.push(t)});if(R.images)c.transforme.push(R.images+' image'+(R.images>1?'s':'')+' recompressée'+(R.images>1?'s':'')+' (JPEG, 1600 px au plus)');if(R.ambiance)c.transforme.push('Couleurs → ambiance la plus proche : '+R.ambiance);if(R.typo)c.transforme.push('Polices → typographie : '+R.typo);
 (R.ignores||[]).forEach(function(t){c.ignore.push(t)});
 (R.nonReconnu||[]).forEach(function(t){c.aVerifier.push(t)});
 c.aVerifier.push('La mise en page d\'origine n\'est pas reproduite : le site est recomposé avec les blocs AIME. Relisez chaque texte, la lecture se fait par règles fixes, sans IA.');
 return c}

function lire(fichiers,P,tri){P=P||{};var parFichier={};fichiers.forEach(function(f){parFichier[f.chemin.replace(/^\.?\//,'')]=f.blob});
 var htmls=Object.keys(parFichier).filter(function(c){return/\.html?$/i.test(c)}).sort(function(a,b){var ia=/(^|\/)index\.html?$/i.test(a),ib=/(^|\/)index\.html?$/i.test(b);return(ib-ia)||a.split('/').length-b.split('/').length||a.localeCompare(b)});
 var R={pages:0,sections:{},infos:[],images:0,ignores:[],nonReconnu:[],transformes:[],ambiance:null,typo:null};
 if(tri){tri.ignores.forEach(function(x){R.ignores.push(x.chemin+' : '+x.raison)});if(tri.caches)R.ignores.push(tri.caches+' fichier(s) caché(s) ou système (__MACOSX, .DS_Store…)')}
 if(!htmls.length)return Promise.reject(new Error('Aucune page HTML dans ce dossier.'));
 var trop=htmls.filter(function(c){return parFichier[c]&&parFichier[c].size>LIMITES.html});if(trop.length){trop.forEach(function(c){R.ignores.push(c+' : page trop lourde (limite '+mo(LIMITES.html)+')')});htmls=htmls.filter(function(c){return trop.indexOf(c)<0});if(!htmls.length)return Promise.reject(new Error('Toutes les pages dépassent '+mo(LIMITES.html)+'. Rien n\'a été importé.'))}
 var site=S.vide('vierge'),couleurs={},polices={},tout='';site.pages=[];site.nom='Site importé';
 var css=Object.keys(parFichier).filter(function(c){return/\.css$/i.test(c)});
 return Promise.all(css.filter(function(c){return!(parFichier[c].size>LIMITES.css)}).map(function(c){return lireBlob(parFichier[c]).then(function(t){tout+=t+'\n'})})).then(function(){
  return htmls.slice(0,LIMITES.pages).reduce(function(pr,chemin,ip){return pr.then(function(){return lireBlob(parFichier[chemin]).then(function(html){
   var doc=new DOMParser().parseFromString(html,'text/html');[].forEach.call(doc.querySelectorAll('style'),function(st){tout+=st.textContent+'\n'});[].forEach.call(doc.querySelectorAll('[style]'),function(e){tout+=e.getAttribute('style')+';\n'});
   ['script','iframe','form','video','canvas','object','embed'].forEach(function(t){var n=doc.querySelectorAll(t).length;if(n)R.ignores.push(n+' '+t+(n>1?'s':'')+' ('+chemin+') : contenu actif, jamais exécuté')});
   var act=0;[].forEach.call(doc.querySelectorAll('*'),function(e){[].forEach.call(e.attributes,function(a){if(/^on/i.test(a.name)||/^\s*javascript:/i.test(a.value))act++})});if(act)R.ignores.push(act+' attribut'+(act>1?'s':'')+' actif'+(act>1?'s':'')+' (onclick, javascript:…) ('+chemin+') : jamais exécuté'+(act>1?'s':''));
   var mr=doc.querySelectorAll('meta[http-equiv],base').length;if(mr)R.ignores.push(mr+' redirection(s) ou base d\'adresse ('+chemin+') : ignorée(s)');
   [].forEach.call(doc.querySelectorAll('script,style,noscript,template,svg,iframe,nav,header nav,form'),function(e){e.remove()});
   var corps=doc.body||doc.documentElement;[].forEach.call(corps.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,div,section,article,td,tr,dd,dt,address,blockquote,figcaption'),function(e){e.appendChild(doc.createTextNode('\n'))});[].forEach.call(corps.querySelectorAll('br'),function(e){e.replaceWith(doc.createTextNode('\n'))});
   var texte=String(corps.textContent).replace(/[ \t]+/g,' ');
   if(!ip){site.infos.titre=propre((doc.querySelector('h1')||{}).textContent)||propre((doc.querySelector('title')||{}).textContent);site.nom=(site.infos.titre||'Site')+' · importé';
    var md=doc.querySelector('meta[name=description]');site.infos.sous=md?propre(md.getAttribute('content')):'';}
   if(!site.infos.date){var d=dateDans(texte);if(d){site.infos.date=d;R.infos.push('date : '+d)}}
   if(!site.infos.email){var m=(doc.querySelector('a[href^="mailto:"]')||{}).href;m=m?m.replace(/^mailto:/i,'').split('?')[0]:mailDans(texte);if(m){site.infos.email=m;R.infos.push('e-mail')}}
   if(!site.infos.tel){var t=(doc.querySelector('a[href^="tel:"]')||{}).href;t=t?t.replace(/^tel:/i,''):telDans(texte);if(t){site.infos.tel=t;R.infos.push('téléphone')}}
   if(!site.infos.adresse){var a=adresseDans(texte);if(a){site.infos.adresse=a.adresse;site.infos.ville=a.ville;R.infos.push('adresse : '+a.adresse+', '+a.ville)}}
   /* les sections : chaque h2 et ce qui le suit */
   var page={id:ip?S.slug(propre((doc.querySelector('h1,title')||{}).textContent)||chemin.replace(/\.html?$/i,'')).slice(0,30)||'page-'+ip:'index',titre:ip?(propre((doc.querySelector('h1')||doc.querySelector('title')||{}).textContent)||'Page '+(ip+1)).slice(0,40):'Accueil',mode:'sections',sections:[]};
   while(site.pages.some(function(p){return p.id===page.id}))page.id+='-2';
   if(!ip)page.sections.push({type:'hero',variante:'plein'});
   var titres=[].slice.call(corps.querySelectorAll('h2'));if(!titres.length&&ip===0){var ps=[].map.call(corps.querySelectorAll('p'),function(p){return propre(p.textContent)}).filter(Boolean);if(ps.length)page.sections.push({type:'texte',texte:ps.slice(0,8).join('\n\n')})}
   titres.forEach(function(h){var nom=propre(h.textContent),blocs=[],n=h.nextElementSibling;while(n&&!/^H[12]$/.test(n.tagName)){blocs.push(n);n=n.nextElementSibling}
    var th=theme(nom),lignes=[];blocs.forEach(function(b){[].forEach.call(b.matches('ul,ol,dl,table')?[b]:b.querySelectorAll('ul,ol,dl,table'),function(l){[].forEach.call(l.querySelectorAll('li,tr,dt'),function(li){lignes.push(li)})})});
    var txt=blocs.map(function(b){return propre(b.textContent)}).filter(Boolean),horaires=lignes.filter(function(l){return heureDans(l.textContent)});
    if(th==='programme'||(!th&&horaires.length>=2)){(horaires.length?horaires:lignes).forEach(function(l){var t=propre(l.textContent),h0=heureDans(t);site.listes.programme.push({heure:h0,titre:propre(t.replace(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/i,'').replace(/^[\s:–—-]+/,'')).slice(0,90),detail:''})});page.sections.push({type:'programme',titre:nom});return}
    if(th==='faq'){var qs=[].slice.call(blocs).reduce(function(a,b){return a.concat([].slice.call(b.matches('h3,h4,dt,summary,strong')?[b]:b.querySelectorAll('h3,h4,dt,summary')))},[]);qs.forEach(function(q){var r=q.nextElementSibling;site.listes.faq.push({q:propre(q.textContent).slice(0,140),r:propre(r&&r.textContent).slice(0,600)})});if(!qs.length)txt.forEach(function(t){if(/\?/.test(t)){var p=t.split('?');site.listes.faq.push({q:p[0]+' ?',r:propre(p.slice(1).join('?'))})}});page.sections.push({type:'faq',titre:nom});return}
    if(th==='tarifs'){(lignes.length?lignes:blocs).forEach(function(l){var t=propre(l.textContent),m=t.match(/(\d[\d\s.,]*\s?€|€\s?\d[\d\s.,]*)/);if(m&&t.length<160&&!site.listes.tarifs.some(function(x){return x.nom===t.replace(m[0],'').trim()}))site.listes.tarifs.push({nom:propre(t.replace(m[0],'')).replace(/[\s:–—-]+$/,'').slice(0,60),prix:propre(m[0]),detail:''})});if(site.listes.tarifs.length){page.sections.push({type:'tarifs',titre:nom});return}}
    if(th==='galerie'){page.sections.push({type:'galerie',titre:nom});return}
    if(th==='contact'){page.sections.push({type:'contact',titre:nom});return}
    if(th==='lieu'){var a2=adresseDans(txt.join(' '));if(a2&&!site.infos.adresse){site.infos.adresse=a2.adresse;site.infos.ville=a2.ville}if(!site.infos.lieu)site.infos.lieu=nom.length<50&&!/acces|venir|plan/.test(norm(nom))?nom:'';if(!site.infos.acces)site.infos.acces=txt.join(' ').slice(0,200);page.sections.push({type:'lieu',titre:nom});return}
    if(th==='personnes'&&lignes.length){lignes.forEach(function(l){var t=propre(l.textContent).split(/\s[–—-]\s|,|:/);site.listes.personnes.push({nom:propre(t[0]).slice(0,50),role:propre(t.slice(1).join(' ')).slice(0,60)})});page.sections.push({type:'personnes',titre:nom});return}
    if(th&&['hebergement','cadeaux','menu'].indexOf(th)>=0&&lignes.length){var k={hebergement:'hebergements',cadeaux:'cadeaux',menu:'menu'}[th];lignes.forEach(function(l){var t=propre(l.textContent);site.listes[k].push(k==='menu'?{plat:t.slice(0,80),detail:''}:k==='cadeaux'?{titre:t.slice(0,80),detail:'',lien:''}:{nom:t.slice(0,80),detail:'',lien:''})});page.sections.push({type:th,titre:nom});return}
    if(th==='rsvp'){page.sections.push({type:'rsvp',titre:nom});return}
    if(txt.length){page.sections.push({type:'texte',titre:nom,texte:txt.join('\n\n').slice(0,3000)})}else R.nonReconnu.push('« '+nom+' » ('+chemin+') : titre sans contenu lisible')});
   [].forEach.call(corps.querySelectorAll('blockquote'),function(q){var t=propre(q.textContent);if(t&&t.length<300)page.sections.push({type:'citation',texte:t})});
   /* les images du dossier */
   var srcs=[].map.call(corps.querySelectorAll('img[src]'),function(i){return{c:resoudre(chemin,i.getAttribute('src')),alt:propre(i.getAttribute('alt'))}}).filter(function(x){return x.c&&parFichier[x.c]&&!(parFichier[x.c].size>LIMITES.image)});
   var ext=[].filter.call(corps.querySelectorAll('img[src]'),function(i){return/^(https?:)?\/\//.test(i.getAttribute('src'))}).length;if(ext)R.ignores.push(ext+' image'+(ext>1?'s':'')+' hébergée'+(ext>1?'s':'')+' ailleurs ('+chemin+') : non reprise'+(ext>1?'s':''));
   if(srcs.length>LIMITES.images-site.listes.galerie.length)R.ignores.push((srcs.length-Math.max(0,LIMITES.images-site.listes.galerie.length))+' image(s) au-delà de '+LIMITES.images+' ('+chemin+')');
   return srcs.slice(0,Math.max(0,LIMITES.images-site.listes.galerie.length)).reduce(function(p2,x){return p2.then(function(){return lireBlob(parFichier[x.c],'url').then(reduire).then(function(u){if(u&&!site.listes.galerie.some(function(g){return g.src===u})){site.listes.galerie.push({src:u,legende:x.alt});R.images++}})})},Promise.resolve()).then(function(){
    if(!ip&&site.listes.galerie.length&&!page.sections.some(function(s){return s.type==='galerie'}))page.sections.push({type:'galerie'});
    if(!ip&&(site.infos.email||site.infos.tel)&&!page.sections.some(function(s){return s.type==='contact'}))page.sections.push({type:'contact'});
    if(!ip&&site.infos.date&&!page.sections.some(function(s){return s.type==='compte'}))page.sections.splice(1,0,{type:'compte'});
    page.sections=page.sections.map(function(x){x.id=S.uid('x');x.variante=x.variante||Object.keys(S.BLOCS[x.type].variantes)[0];x.audience='public';R.sections[x.type]=(R.sections[x.type]||0)+1;return x});
    site.pages.push(page);R.pages++})})})},Promise.resolve())}).then(function(){
  /* couleurs et polices → l'ambiance et la typographie les plus proches */
  (tout.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]*\)/gi)||[]).forEach(function(c){var h=hex(c);if(h)couleurs[h]=(couleurs[h]||0)+1});
  (tout.match(/font-family\s*:\s*([^;}{]+)/gi)||[]).forEach(function(f){var n=norm(f.replace(/font-family\s*:/i,'')).split(',')[0].replace(/["']/g,'').trim();if(n)polices[n]=(polices[n]||0)+1});
  var cs=Object.keys(couleurs).sort(function(a,b){return couleurs[b]-couleurs[a]});
  var bgm=tout.match(/body[^{]*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6}|rgba?\([^)]*\))/i),fond=bgm?hex(bgm[1]):(cs.filter(function(c){return lum(c)>225})[0]||'#FFFFFF');
  var vive=cs.filter(function(c){return sat(c)>.35&&lum(c)>40&&lum(c)<215})[0]||cs.filter(function(c){return c!==fond})[0]||'#111111';
  if(P.ambiances&&P.ambiances.length){var best=null,bd=1e9;P.ambiances.forEach(function(a){var d=dist(a.c1,vive)*1.4+dist(a.fond,fond);if(d<bd){bd=d;best=a}});site.presentation.ambiance=best.id;R.ambiance=best.nom+' (couleur dominante '+vive+', fond '+fond+')'}
  var pol=Object.keys(polices).sort(function(a,b){return polices[b]-polices[a]})[0];
  if(pol&&P.typographies){var tk=Object.keys(P.typographies).filter(function(k){return norm(P.typographies[k].titre+' '+P.typographies[k].texte).indexOf(pol)>=0})[0];if(tk){site.presentation.typo=tk;R.typo=P.typographies[tk].nom}else R.transformes.push('Police « '+pol+' » : remplacée par celle de l\'ambiance')}
  if(htmls.length>LIMITES.pages)R.ignores.push((htmls.length-LIMITES.pages)+' page(s) au-delà de '+LIMITES.pages+' : non reprises');
  if(site.infos.date)R.nonReconnu.push('Date retenue : la première trouvée ('+site.infos.date+'). Vérifiez que c\'est bien celle de l\'événement.');
  if(!site.infos.titre)site.infos.titre=site.nom;
  R.categories=classer(R);return{site:S.migrer(site),rapport:R}})}
root.AIMEImport={lire:lire,LIMITES:LIMITES,trier:trier,depuisArchive:depuisArchive,depuisFichiers:depuisFichiers,classer:classer,cheminSuspect:cheminSuspect,dateDans:dateDans,heureDans:heureDans,adresseDans:adresseDans,telDans:telDans};
})(typeof self!=='undefined'?self:this);
