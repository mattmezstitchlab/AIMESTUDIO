/* AIME · mode « planche » du moteur de pages : la composition éditoriale (magazines, catalogues, portfolios, dossiers,
   rapports, livrets, supports de formation). Ce n'est pas un second moteur : il se déclare dans AIMESite (vitrine/rendu.js)
   comme un mode de page, et compose les MÊMES blocs, avec quelques blocs éditoriaux de plus.

   Modèle (tout est facultatif ; un site sans `publication` ni page « planche » ne change pas d'un octet) :
     site.publication = { format:{l:3,h:4}, numero, date }                    la publication et son format de page
     page = { id, titre, rubrique, mode:'planche', pages:1|2, gabarit, fonds:['surface','fond'], sommaire:true|false, sections }
     section = { …le bloc…, place:{p,x,y,w,h,z}, lecture, verrou, role, ton:'normal'|'inverse', aligne, cadrage, reperes, liste }
   La grille est celle de la Grille universelle d'AIMEPROJET : 12 colonnes × 16 rangées PAR PAGE. Sur une page 3:4, une case
   est carrée : le ratio d'un emplacement vaut w/h. `p` = la page de la double page (0 gauche, 1 droite).
   `lecture` = l'ordre de lecture : celui du DOM, donc du lecteur d'écran et du téléphone, où la double page se lit en colonne
   au lieu d'être réduite. Une section sans `place` est « en réserve » : gardée, jamais rendue (rien n'est perdu).

   Hiérarchie des styles : Design System (jetons, global) → publication (format) → page (fonds) → section (ton, alignement,
   taille bornée). Une surcharge locale ne porte jamais de valeur libre : des noms de jetons et des nombres bornés. */
(function(root,factory){if(typeof module==='object'&&module.exports){var R=require('../vitrine/rendu.js');module.exports=factory(R.site)}else root.AIMEPlanche=factory(root.AIMESite)})(typeof self!=='undefined'?self:this,function(S){'use strict';
if(!S||!S.declarerMode)throw new Error('Le moteur de pages (vitrine/rendu.js) doit être chargé avant publication/planche.js.');
var COL=12,RANG=16,esc=S.esc,HEX=/^#[0-9A-Fa-f]{6}$/,PILE=/^[\w\s"',.-]{1,160}$/;
var FONDS={fond:'var(--fond)',surface:'var(--surface,color-mix(in srgb,var(--fond) 70%,#fff))',surface2:'var(--surface2,color-mix(in srgb,var(--c2) 30%,var(--fond)))',encre:'var(--encre)',primaire:'var(--c1)',relief:'var(--c2)'};
var TONS={normal:1,inverse:1},ALIGNE={gauche:'left',centre:'center',droite:'right'};

function borne(v,a,b,d){v=Math.round(+v);return isFinite(v)?Math.max(a,Math.min(b,v)):d}
/* un emplacement toujours valide : dans sa page, au moins 1 × 1 */
function placer(pl,pages){if(!pl||typeof pl!=='object')return null;var p=borne(pl.p,0,(pages||2)-1,0),w=borne(pl.w,1,COL,4),h=borne(pl.h,1,RANG,4),x=borne(pl.x,0,COL-w,0),y=borne(pl.y,0,RANG-h,0);return{p:p,x:x,y:y,w:w,h:h,z:borne(pl.z,0,9,0)}}
function nbPages(page){return page&&page.pages===1?1:2}
/* la pagination de toute la publication : le numéro de la première page physique de chaque planche */
function folios(pages){var n=1,m={};(pages||[]).forEach(function(p){if(p.mode!=='planche')return;m[p.id]=n;n+=nbPages(p)});return m}
function entreesSommaire(pages,unePage){var f=folios(pages);return(pages||[]).filter(function(p){return p.mode==='planche'&&p.sommaire!==false}).map(function(p){return{id:p.id,rubrique:String(p.rubrique||'').slice(0,8),titre:String(p.titre||'').slice(0,120),page:f[p.id],lien:unePage?'#'+p.id:(p.id==='index'?'index.html':p.id+'.html')}})}

/* ---------- les blocs éditoriaux (déclarés dans le catalogue commun : utilisables aussi ailleurs) ---------- */
S.declarerBloc('titraille',{nom:'Titraille',cat:'texte',variantes:{moyen:'Moyen',grand:'Grand',monumental:'Monumental',masthead:'Titre de couverture'},champs:['surtitre','titre','texte'],
 rendre:function(x,s){if(!s.titre&&!s.surtitre&&!s.texte)return x.edition?'<p class="s-vide">Écrivez un titre (*mot* pour l\'accent italique).</p>':'';var v=s.variante||'moyen',H=v==='masthead'?'h1':'h2',sur=s.surtitre?'<p class="tt-s"><i aria-hidden="true"></i>'+esc(s.surtitre)+'</p>':'';
  return'<div class="tt tt-'+esc(v)+'">'+(v==='masthead'?'':sur)+(s.titre?'<'+H+' class="tt-t">'+S.enrichir(s.titre)+'</'+H+'>':'')+(v==='masthead'?sur:'')+(s.texte?'<p class="tt-c">'+esc(s.texte)+'</p>':'')+'</div>'}});
S.declarerBloc('encadre',{nom:'Encadré',cat:'texte',variantes:{simple:'Simple'},champs:['titre','texte'],
 rendre:function(x,s){if(!s.texte&&!s.titre)return x.edition?'<p class="s-vide">Écrivez le texte de l\'encadré.</p>':'';return'<aside class="enc">'+(s.titre?'<p class="enc-t">'+esc(s.titre)+'</p>':'')+String(s.texte||'').split(/\n{2,}/).map(function(p){return'<p>'+esc(p)+'</p>'}).join('')+'</aside>'}});
S.declarerBloc('folio',{nom:'Folio',cat:'texte',variantes:{simple:'Numéro et rubrique',sceau:'Avec le sceau AIME'},champs:['texte'],
 rendre:function(x,s){var n=x.folio&&s.numero!==false?String(x.folio):'';return'<p class="fol">'+(n?'<span class="fol-n">'+esc(n)+'</span>':'')+(s.texte?'<span>'+esc(s.texte)+'</span>':'')+(s.variante==='sceau'?'<i class="sceau" aria-hidden="true"></i>':'')+'</p>'}});
S.declarerBloc('sommaire',{nom:'Sommaire',cat:'texte',variantes:{liste:'Liste'},champs:['titre'],
 rendre:function(x,s){var L=(x.sommaire||[]).filter(function(e){return e.titre});if(!L.length)return x.edition?'<p class="s-vide">Le sommaire se remplit avec les titres des pages.</p>':'';
  return(s.titre?'<p class="som-t">'+esc(s.titre)+'</p>':'')+'<ol class="som">'+L.map(function(e){return'<li><a href="'+esc(e.lien)+'"><span class="som-r">'+esc(e.rubrique)+'</span><span class="som-x">'+esc(e.titre)+'</span><span class="som-p">p. '+esc(String(e.page))+'</span></a></li>'}).join('')+'</ol>'}});
/* comparaison : « les quatre directions » est rendue EN DIRECT depuis le catalogue des Design Systems (jamais une capture) */
S.declarerBloc('comparaison',{nom:'Comparaison',cat:'texte',variantes:{'design-systems':'Les Design Systems','avant-apres':'Avant / après'},champs:['titre','texte','src','src2','avant','apres'],
 rendre:function(x,s){var v=s.variante||'design-systems',t=s.titre?'<p class="cmp-t">'+esc(s.titre)+'</p>':'';
  if(v==='avant-apres'){var a=S.img(s.src),b=S.img(s.src2);if(!a&&!b)return x.edition?'<p class="s-vide">Choisissez les images « avant » et « après ».</p>':'';
   var fig=function(u,l){return'<figure>'+(u?'<img src="'+esc(u)+'" alt="'+esc(l||'')+'" loading="lazy">':'<span class="img-vide" role="img" aria-label="Image à venir"></span>')+'<figcaption>'+esc(l||'')+'</figcaption></figure>'};
   return t+'<div class="cmp-aa">'+fig(a,s.avant||'Avant')+fig(b,s.apres||'Après')+'</div>'+(s.texte?'<p class="cmp-n">'+esc(s.texte)+'</p>':'')}
  var D=x.systemes,ids=D?Object.keys(D):[];if(!ids.length)return x.edition?'<p class="s-vide">Les Design Systems ne sont pas chargés.</p>':'';
  var cur=x.site&&x.site.presentation&&x.site.presentation.design&&x.site.presentation.design.id;
  return t+'<ul class="cmp-ds">'+ids.slice(0,8).map(function(id){var c=D[id],a=c&&c.a;if(!a||![a.fond,a.encre,a.c1,a.c2].every(function(h){return HEX.test(h)})||!PILE.test(c.t.titre))return'';var r=Math.max(0,Math.min(32,+c.rayons.surface||0));
   return'<li'+(id===cur?' aria-current="true"':'')+'><span class="cmp-sw" style="background:'+a.fond+';color:'+a.encre+';border-radius:'+r+'px"><span style="font-family:'+esc(c.t.titre)+'">Aa</span><span class="cmp-pt"><i style="background:'+a.c1+'"></i><i style="background:'+a.c2+'"></i></span></span><b>'+esc(c.nom)+'</b><span>'+esc(String(c.t.titre).split(',')[0].replace(/"/g,''))+' · '+(c.mode==='sombre'?'sombre':'clair')+'</span><span>contraste <b>'+String(Math.round(S.contraste(a.encre,a.fond)*10)/10).replace('.',',')+':1</b></span></li>'}).join('')+'</ul>'+(s.texte?'<p class="cmp-n">'+esc(s.texte)+'</p>':'')}});

/* ---------- le rendu d'une planche ---------- */
function composer(page,sections,x,ctx){var n=nbPages(page),f=folios(ctx.site.pages)[page.id]||1,som=entreesSommaire(ctx.site.pages,ctx.unePage);
 var fonds=(Array.isArray(page.fonds)?page.fonds:[]).slice(0,n).map(function(k,i){return FONDS[k]&&k!=='fond'?'<span class="pl-fond" style="grid-column:'+(i*COL+1)+' / span '+COL+';background:'+FONDS[k]+'" aria-hidden="true"></span>':''}).join('');
 var placees=sections.map(function(s,i){return{s:s,pl:placer(s.place,n),i:i}}).filter(function(o){return o.pl}).sort(function(a,b){var la=+a.s.lecture||999,lb=+b.s.lecture||999;return(la-lb)||(a.i-b.i)});
 var corps=placees.map(function(o){var s=o.s,pl=o.pl,h=ctx.bloc(s,{planche:true,folio:f+pl.p,sommaire:som,largeur:pl.w});if(!h)return'';
  var ar=Math.max(.66,Math.min(1.6,pl.w/pl.h)),ton=TONS[s.ton]?s.ton:'normal',al=ALIGNE[s.aligne]||'',tx=s.taille!=null?Math.max(.7,Math.min(1.5,+s.taille||1)):1;
  return'<div id="'+esc(s.id)+'" class="pl pl-'+esc(s.type)+' ton-'+ton+(pl.w>=9?' pl-large':'')+(s.verrou?' pl-verrou':'')+'" data-t="'+esc(s.type)+'"'+(ctx.edition?' data-sec="'+esc(s.id)+'"':'')+' style="grid-column:'+(pl.p*COL+pl.x+1)+' / span '+pl.w+';grid-row:'+(pl.y+1)+' / span '+pl.h+';z-index:'+pl.z+';--ar:'+ar.toFixed(3)+(al?';text-align:'+al:'')+(tx!==1?';--tx:'+tx:'')+'">'+h+'</div>'}).join('');
 var reserve=sections.length-placees.length;
 return'<section class="planche planche-'+n+'" id="'+esc(page.id)+'" aria-label="'+esc(page.titre||'Page')+'" style="--m:'+(n===2?1:2)+'">'+fonds+corps+(n===2?'<span class="pl-pli" aria-hidden="true"></span>':'')+(ctx.edition&&reserve?'<p class="pl-reserve">'+reserve+' bloc'+(reserve>1?'s':'')+' en réserve, hors de la page</p>':'')+'</section>'}

/* les polices des autres Design Systems, pour la comparaison rendue en direct */
function polices(x){var D=x.systemes||{};return Object.keys(D).map(function(k){return D[k]&&D[k].fonts}).filter(Boolean)}

var u='var(--u)';
var CSS='body.publication{background:color-mix(in srgb,var(--encre) 8%,var(--fond))}body.publication main{display:grid;gap:clamp(24px,4vw,56px);padding:clamp(16px,3vw,48px) clamp(0px,2vw,32px)}'+
 '.planche{--u:calc(1cqw*var(--m,1));container-type:inline-size;position:relative;display:grid;grid-template-columns:repeat(24,minmax(0,1fr));grid-template-rows:repeat(16,minmax(0,1fr));aspect-ratio:6/4;width:min(100%,1440px);margin:0 auto;background:var(--fond);color:var(--encre);overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.14)}'+
 'main>section.planche{padding:0}main>section.planche>*{max-width:none;margin:0}'+
 '.planche-1{grid-template-columns:repeat(12,minmax(0,1fr));aspect-ratio:3/4;width:min(100%,720px)}'+
 '.pl-fond{grid-row:1 / span 16;z-index:0}.pl-pli{position:absolute;left:50%;top:0;bottom:0;width:6%;transform:translateX(-50%);background:linear-gradient(90deg,transparent,rgba(0,0,0,.07) 48%,rgba(0,0,0,.12) 50%,rgba(255,255,255,.05) 52%,transparent);pointer-events:none;z-index:8}'+
 '.pl{position:relative;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box;font-size:max(11px,calc('+u+'*.94*var(--tx,1)));line-height:1.6}'+
 '.pl>*{margin:0}.pl h2{margin:0}.pl .s-vide{opacity:.6;font-size:12px}'+
 /* titraille */
 '.tt{display:flex;flex-direction:column;gap:calc('+u+'*1.1)}.tt-s{display:flex;align-items:center;gap:.7em;font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;margin:0;opacity:.78}.tt-s i{width:.55em;height:.55em;border-radius:50%;background:var(--c1);flex:none}'+
 '.tt-t{font-family:var(--ft);font-weight:var(--fw);line-height:.94;letter-spacing:-.02em;text-wrap:balance;margin:0;font-size:calc('+u+'*3*var(--tx,1))}.tt-t em{color:var(--c1)}.tt-grand .tt-t{font-size:calc('+u+'*5*var(--tx,1))}.tt-monumental .tt-t{font-size:calc('+u+'*7.2*var(--tx,1))}'+
 '.tt-masthead .tt-t{font-size:calc('+u+'*13.6*var(--tx,1));line-height:.82;letter-spacing:-.03em}.tt-masthead .tt-s{letter-spacing:.5em;opacity:1;margin-top:.4em}.tt-masthead .tt-s i{display:none}'+
 '.tt-c{font-size:max(13px,calc('+u+'*1.28));line-height:1.5;max-width:36em;margin:0;opacity:.9}'+
 /* texte, citation, encadré, folio, sommaire */
 '.pl .texte p{max-width:none;margin:0 0 .8em}.pl-large .texte{columns:2;column-gap:calc('+u+'*2.1)}.pl .texte-lettrine p:first-child::first-letter{font-size:4.6em;padding:.06em .12em 0 0}'+
 '.pl .cit{text-align:left}.pl .cit p{font:italic var(--fw) calc('+u+'*1.74*var(--tx,1))/1.18 var(--ft);max-width:none;margin:0}.pl .cit-grande p{font-size:calc('+u+'*2.6*var(--tx,1))}.pl .cit-encadree{border:0;border-left:2px solid var(--c1);border-radius:0;padding:.2em 0 .2em 1em}.pl .cit cite{font-size:.86em;margin-top:.6em}.pl .cit em{color:var(--c1)}'+
 '.enc{background:var(--surface,color-mix(in srgb,var(--fond) 70%,#fff));border:1px solid var(--bordure,color-mix(in srgb,var(--encre) 18%,transparent));padding:1.2em 1.4em;display:grid;gap:.4em;height:100%;box-sizing:border-box}.enc p{margin:0}.enc-t{font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--c1)}'+
 '.fol{display:flex;align-items:center;gap:1em;height:100%;font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace);letter-spacing:.12em;text-transform:uppercase;opacity:.8;border-top:1px solid var(--bordure,color-mix(in srgb,var(--encre) 18%,transparent));padding-top:.6em;box-sizing:border-box}.fol-n{font-weight:600}'+
 '.sceau{width:1.4em;height:1.4em;border-radius:50%;flex:none;margin-left:auto;background:conic-gradient(#FB7185,#F59E0B,#7C5CFF,#22D3EE,#FB7185)}'+
 '.som-t{font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;padding-bottom:.7em;border-bottom:2px solid var(--c1)}.som{list-style:none;margin:0;padding:0}.som a{display:grid;grid-template-columns:3em 1fr auto;gap:1em;align-items:baseline;padding:.7em 0;border-bottom:1px solid var(--bordure,color-mix(in srgb,var(--encre) 18%,transparent));text-decoration:none}.som-r,.som-p{font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace)}.som-r{color:var(--c1)}.som-x{font:400 max(15px,calc('+u+'*1.45)) var(--ft)}.som a:hover .som-x,.som a:focus-visible .som-x{text-decoration:underline}'+
 /* images : la case est le cadre ; le point d'intérêt et le zoom viennent du cadrage */
 '.pl-image .imgb{height:100%;display:flex;flex-direction:column;gap:.6em;margin:0;padding:0;border:0}.pl-image .imgb-m{flex:1;min-height:0}.pl-image .imgb img,.pl-image .img-vide{width:100%;height:100%;object-fit:cover;border-radius:0}.pl-image figcaption{font-size:max(11px,calc('+u+'*.83));opacity:.82;text-align:left;margin:0}'+
 '.pl-image .imgb-r{flex:none;width:100%;max-height:100%}'+
 '.imgb-voile .imgb-m::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(20,14,10,.42),transparent 26%,transparent 52%,rgba(20,14,10,.74));pointer-events:none}'+
 '.img-vide{display:block;min-height:120px;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--encre) 6%,transparent) 0 10px,transparent 10px 20px),var(--surface2,color-mix(in srgb,var(--c2) 30%,var(--fond)))}'+
 '.pl .rep{width:calc('+u+'*1.8);height:calc('+u+'*1.8);margin:calc('+u+'*-.9) 0 0 calc('+u+'*-.9);font-size:calc('+u+'*.84);min-width:22px;min-height:22px}'+
 /* texte sur image : une encre claire fixe, quel que soit le Design System */
 '.ton-inverse{color:#FFFDF8;text-shadow:0 1px 18px rgba(0,0,0,.25)}.ton-inverse .tt-t em{color:#F2C4A8}.ton-inverse .tt-s,.ton-inverse .tt-c{opacity:.95}'+
 /* étapes, comparaison, lien */
 '.pl .etapes-n li>span>b{font-size:max(16px,calc('+u+'*1.55))}.pl .etapes-n li>span>span{display:block;font-size:max(11px,calc('+u+'*.94))}'+
 '.cmp-t{font:500 max(10.5px,calc('+u+'*.76)) var(--fm,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;padding-bottom:.7em;margin-bottom:1em;border-bottom:2px solid var(--c1)}'+
 '.cmp-ds{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:calc('+u+'*.7)}.cmp-ds li{display:flex;flex-direction:column;gap:.35em;font-size:max(11px,calc('+u+'*.8));line-height:1.4}.cmp-ds li>b{font:400 max(14px,calc('+u+'*1.3)) var(--ft)}.cmp-ds li[aria-current] .cmp-sw{outline:2px solid var(--c1);outline-offset:3px}'+
 '.cmp-sw{aspect-ratio:1.15;display:flex;flex-direction:column;justify-content:space-between;padding:.8em;box-sizing:border-box;border:1px solid rgba(0,0,0,.08)}.cmp-sw>span:first-child{font-size:calc('+u+'*2.1);line-height:1}.cmp-pt{display:flex;gap:.3em}.cmp-pt i{width:1em;height:1em;border-radius:50%}'+
 '.cmp-aa{display:grid;grid-template-columns:1fr 1fr;gap:calc('+u+'*.8)}.cmp-aa figure{margin:0;display:grid;gap:.4em}.cmp-aa img,.cmp-aa .img-vide{width:100%;aspect-ratio:16/10;object-fit:cover}.cmp-aa figcaption,.cmp-n{font-size:max(11px,calc('+u+'*.83));opacity:.82}'+
 '.pl .cta{justify-items:start;text-align:left}.pl .cta-large{padding:1.2em 1.4em}.pl .btn{font-size:max(12px,calc('+u+'*.9))}'+
 '.pl-reserve{position:absolute;right:8px;bottom:8px;margin:0;padding:4px 10px;border-radius:999px;background:#121216;color:#EDEDF0;font:600 12px system-ui,sans-serif;z-index:9}'+
 /* téléphone et tablette : la double page se lit dans l'ordre de lecture, en colonne ; rien n'est réduit */
 '@media (max-width:1023px){body.publication main{padding:0;gap:0}main>section.planche{padding:0 0 48px;margin-bottom:28px}.planche,.planche-1{display:flex;flex-direction:column;gap:22px;aspect-ratio:auto;width:100%;padding:0 0 40px;box-shadow:none;border-bottom:1px solid color-mix(in srgb,var(--encre) 14%,transparent)}.pl-fond,.pl-pli{display:none}'+
 '.pl{overflow:visible;padding:0 16px;font-size:16px}.pl-image{padding:0}.pl-image figcaption{padding:0 16px;font-size:13px}.pl-image .imgb-m{aspect-ratio:var(--ar);flex:none}.ton-inverse{color:inherit;text-shadow:none}.ton-inverse .tt-t em{color:var(--c1)}'+
 '.tt{gap:12px}.tt-t{font-size:clamp(30px,8vw,40px)}.tt-grand .tt-t{font-size:clamp(36px,10vw,48px)}.tt-monumental .tt-t{font-size:clamp(42px,12vw,58px)}.tt-masthead .tt-t{font-size:clamp(72px,24vw,112px)}.tt-s,.som-t,.cmp-t,.enc-t,.fol{font-size:11px}.tt-c{font-size:17px}'+
 '.pl-large .texte{columns:1}.pl .cit p{font-size:24px}.pl .cit-grande p{font-size:28px}.som-x{font-size:18px}.cmp-ds{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.cmp-ds li{font-size:13px}.cmp-sw>span:first-child{font-size:30px}.pl .rep{width:24px;height:24px;margin:-12px 0 0 -12px;font-size:12px}.pl .etapes-n li>span>b{font-size:19px}.pl .etapes-n li>span>span{font-size:15px}}'+
 '@media print{body.publication main{padding:0;gap:0}.planche{box-shadow:none;break-after:page}}';

S.declarerMode('planche',{rendre:composer,css:CSS,polices:polices});
return{COL:COL,RANG:RANG,FONDS:Object.keys(FONDS),placer:placer,folios:folios,entreesSommaire:entreesSommaire,nbPages:nbPages}});
