/* AIME · générateur : régénérer un site à partir d'un dossier ou d'un .zip HTML (un site qui vous appartient).
   Lecture par règles fixes, vérifiables, sans IA : titres → sections, images du dossier → galerie, dates / adresses / e-mails /
   téléphones → infos (donc en-tête, compte à rebours, lieu, contact), horaires → programme, questions → FAQ, prix → tarifs,
   couleurs et polices → l'ambiance la plus proche. Chaque fichier .html devient une page. Rien n'est exécuté : les scripts du
   site d'origine sont ignorés. Un compte rendu dit ce qui a été reconnu, et ce qui ne l'a pas été.
   AIMEImport.lire(fichiers, {ambiances, typographies}) → Promise<{ site, rapport }>   fichiers : [{ chemin, blob }] */
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

function lire(fichiers,P){P=P||{};var parFichier={};fichiers.forEach(function(f){parFichier[f.chemin.replace(/^\.?\//,'')]=f.blob});
 var htmls=Object.keys(parFichier).filter(function(c){return/\.html?$/i.test(c)}).sort(function(a,b){var ia=/(^|\/)index\.html?$/i.test(a),ib=/(^|\/)index\.html?$/i.test(b);return(ib-ia)||a.split('/').length-b.split('/').length||a.localeCompare(b)});
 var R={pages:0,sections:{},infos:[],images:0,ignores:[],nonReconnu:[],ambiance:null,typo:null};
 if(!htmls.length)return Promise.reject(new Error('Aucune page HTML dans ce dossier.'));
 var site=S.vide('vierge'),couleurs={},polices={},tout='';site.pages=[];site.nom='Site importé';
 var css=Object.keys(parFichier).filter(function(c){return/\.css$/i.test(c)});
 return Promise.all(css.map(function(c){return lireBlob(parFichier[c]).then(function(t){tout+=t+'\n'})})).then(function(){
  return htmls.slice(0,12).reduce(function(pr,chemin,ip){return pr.then(function(){return lireBlob(parFichier[chemin]).then(function(html){
   var doc=new DOMParser().parseFromString(html,'text/html');[].forEach.call(doc.querySelectorAll('style'),function(st){tout+=st.textContent+'\n'});[].forEach.call(doc.querySelectorAll('[style]'),function(e){tout+=e.getAttribute('style')+';\n'});
   ['script','iframe','form','video','canvas','object','embed'].forEach(function(t){var n=doc.querySelectorAll(t).length;if(n)R.ignores.push(n+' '+t+(n>1?'s':'')+' ('+chemin+')')});
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
   var srcs=[].map.call(corps.querySelectorAll('img[src]'),function(i){return{c:resoudre(chemin,i.getAttribute('src')),alt:propre(i.getAttribute('alt'))}}).filter(function(x){return x.c&&parFichier[x.c]});
   var ext=[].filter.call(corps.querySelectorAll('img[src]'),function(i){return/^(https?:)?\/\//.test(i.getAttribute('src'))}).length;if(ext)R.nonReconnu.push(ext+' image'+(ext>1?'s':'')+' hébergée'+(ext>1?'s':'')+' ailleurs ('+chemin+') : non reprise'+(ext>1?'s':''));
   return srcs.slice(0,24-site.listes.galerie.length).reduce(function(p2,x){return p2.then(function(){return lireBlob(parFichier[x.c],'url').then(reduire).then(function(u){if(u&&!site.listes.galerie.some(function(g){return g.src===u})){site.listes.galerie.push({src:u,legende:x.alt});R.images++}})})},Promise.resolve()).then(function(){
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
  if(pol&&P.typographies){var tk=Object.keys(P.typographies).filter(function(k){return norm(P.typographies[k].titre+' '+P.typographies[k].texte).indexOf(pol)>=0})[0];if(tk){site.presentation.typo=tk;R.typo=P.typographies[tk].nom}else R.nonReconnu.push('police « '+pol+' » : remplacée par celle de l\'ambiance')}
  if(htmls.length>12)R.nonReconnu.push((htmls.length-12)+' page(s) au-delà de 12 : non reprises');
  if(!site.infos.titre)site.infos.titre=site.nom;
  return{site:S.migrer(site),rapport:R}})}
root.AIMEImport={lire:lire,dateDans:dateDans,heureDans:heureDans,adresseDans:adresseDans,telDans:telDans};
})(typeof self!=='undefined'?self:this);
