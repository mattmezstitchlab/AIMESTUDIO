/* AIME STITCH · branché sur le cœur (coeur/coeur.js) : un patron, quatre personnes, quatre écrans.
   La créatrice, la boutique, la brodeuse (qui a acquis le patron) et la visiteuse lisent le MÊME patron canonique
   (stitch/data/patrons) et le MÊME produit (stitch/data/catalogue.json) : dimensions, fils et écheveaux se calculent
   depuis le patron (StitchPatron), jamais recopiés. Ce que chacune peut faire vient d'une règle explicite par geste,
   écrite ici pour le prototype ; en production, ces contrôles seraient vérifiés côté serveur.
   Démonstration : boutiques et créatrice fictives, aucune vente ni aucun paiement réels. */
(function(root){'use strict';
var P=root.StitchPatron;if(!root.AIMECoeur||!P)return;
var esc=function(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var PAT='pat-mesange',PROD='prod-mesange',X={},IMG={};
/* les gestes, et la règle de chacun : qui peut, et pourquoi */
var GESTES={
 'voir-apercu':{nom:'Voir l\'aperçu',qui:{creatrice:1,boutique:1,brodeuse:1,visiteuse:1},raison:'Public : c\'est la vitrine du patron.'},
 'voir-grille':{nom:'Lire la grille complète',qui:{creatrice:1,brodeuse:1},raison:'Réservée à la créatrice et aux personnes qui ont acquis le patron.'},
 'modifier-patron':{nom:'Modifier le patron',qui:{creatrice:1},raison:'Seule la créatrice modifie son œuvre ; chaque modification crée une version.'},
 'fixer-prix':{nom:'Fixer le prix',qui:{boutique:1},raison:'La boutique fixe le prix et la mise en vente.'},
 'acquerir':{nom:'Acquérir le patron',qui:{visiteuse:1},raison:'Démonstration : aucun paiement n\'est demandé ni enregistré.'},
 'broder':{nom:'Broder et garder sa progression',qui:{brodeuse:1},raison:'Le lecteur est ouvert à qui a acquis le patron.'},
 'voir-boite':{nom:'Voir la boîte à fils',qui:{brodeuse:1},raison:'La boîte à fils appartient à la brodeuse : personne d\'autre ne la lit.'}};
function peut(qui,g){return!!GESTES[g].qui[qui]}
function j(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u);return r.json()})}
/* l'image du patron, dessinée une fois depuis la grille (une case = un pixel) ; l'aperçu public est volontairement grossier */
function image(p,pas){var c=document.createElement('canvas'),l=Math.ceil(p.l/pas),h=Math.ceil(p.h/pas);c.width=l;c.height=h;var g=c.getContext('2d'),m=P.matrice(p),cols=p.palette.map(function(z){return(X.dmc[z.dmc]||{}).hex||'#999'});
 g.fillStyle='#F4F4F2';g.fillRect(0,0,l,h);for(var y=0;y<h;y++)for(var x=0;x<l;x++){var v=m[(y*pas)*p.l+x*pas];if(v){g.fillStyle=cols[v-1];g.fillRect(x,y,1,1)}}return c.toDataURL('image/png')}
var CSS='@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("/fonts/InterVariable-latin.woff2") format("woff2-variations")}'+
 '*{box-sizing:border-box}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}body{margin:0;background:#F4F4F2;color:#141416;font:400 15px/1.5 "Inter Variable",Inter,system-ui,sans-serif}'+
 '.h{min-height:420px;display:grid;align-content:end;padding:28px 24px 30px}.h .k{margin:0 0 10px;font:600 10px/1 "Inter Variable",sans-serif;letter-spacing:.2em;text-transform:uppercase}'+
 '.h h1{margin:0;font:600 40px/1.02 "Inter Variable",sans-serif;letter-spacing:-.03em}.h p{margin:12px 0 0;font-size:15px}'+
 '.s{padding:24px;border-top:1px solid #DCDCE1}.s h2{margin:0 0 14px;font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#55555E}'+
 '.l{list-style:none;margin:0;padding:0;display:grid;gap:10px}.l li{display:grid;gap:2px}.l b{font-weight:600}.l span{color:#55555E;font-size:13.5px}'+
 '.g li{grid-template-columns:auto 1fr;column-gap:10px;align-items:baseline}.e{font:600 11px/1 "Inter Variable",sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:5px 7px;border-radius:6px;border:1px solid #141416}.e.non{border-color:#C9C9CF;color:#55555E}'+
 '.img{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:8px;border:1px solid #DCDCE1}.m{color:#55555E;font-size:13px;margin:10px 0 0}.fils{display:flex;flex-wrap:wrap;gap:6px}.fils i{width:18px;height:18px;border-radius:50%;border:1px solid #C9C9CF;display:inline-block}';
function section(t,h){return'<section class="s"><h2>'+esc(t)+'</h2>'+h+'</section>'}
function prix(perso){var v=parseFloat(String(perso&&perso.prix||'').replace(',','.'));return v>0&&v<1000?v:X.prod.prix}
function eur(v){return v.toLocaleString('fr-FR',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})+' €'}
var NOMS={creatrice:'La créatrice',boutique:'La boutique',brodeuse:'La brodeuse',visiteuse:'La visiteuse'};
function page(role,perso,k){var q=role.angle,p=X.pat,d=P.dimensions(p),f=P.fournitures(p),b=X.boutique,v=prix(perso);
 var h='<header class="h" style="background:'+k.c+';color:'+k.e+'"><p class="k">AIME Stitch · '+esc(b.nom)+' (fictive)</p><h1>'+esc(p.titre)+'</h1><p>'+esc(X.prod.accroche)+'</p></header>';
 /* l'image : la grille complète si la règle le permet, sinon l'aperçu grossier */
 h+=section(peut(q,'voir-grille')?'La grille complète':'L\'aperçu','<img class="img" alt="'+esc(peut(q,'voir-grille')?'Grille complète du patron':'Aperçu réduit du patron')+'" src="'+(peut(q,'voir-grille')?IMG.grille:IMG.apercu)+'">'+(peut(q,'voir-grille')?'':'<p class="m">La grille, les symboles et les fils arrivent avec l\'acquisition.</p>'));
 if(q==='visiteuse')h+=section('Le patron',
  '<ul class="l"><li><b>'+eur(v)+'</b><span>'+esc(b.nom)+', '+esc(b.ville)+'</span></li><li><b>'+d.cm.l+' × '+d.cm.h+' cm</b><span>sur toile Aïda '+p.toile.count+'</span></li><li><b>'+f.length+' couleurs</b><span>'+esc(X.prod.licence)+'</span></li></ul>');
 if(q==='boutique')h+=section('En vente','<ul class="l"><li><b>'+eur(v)+'</b><span>Prix fixé par la boutique</span></li><li><b>'+(X.prod.statut==='publie'?'Publié':'Brouillon')+'</b><span>Collection « '+esc(X.prod.collection)+' »</span></li><li><b>Licence</b><span>'+esc(X.prod.licence)+'</span></li><li><b>Formats</b><span>'+X.prod.formats.map(esc).join(' · ')+'</span></li></ul>');
 if(q==='creatrice')h+=section('Mon patron','<ul class="l"><li><b>'+d.points.l+' × '+d.points.h+' points</b><span>'+d.cm.l+' × '+d.cm.h+' cm en Aïda '+p.toile.count+'</span></li><li><b>Version '+p.version+'</b><span>'+(p.historique||[]).map(function(x){return esc(x.date+' · '+x.note)}).join('<br>')+'</span></li><li><b>Provenance</b><span>'+esc(p.provenance&&p.provenance.auteur)+'</span></li><li><b>Vendu par</b><span>'+esc(b.nom)+' · '+eur(v)+'</span></li></ul>');
 if(peut(q,'voir-grille'))h+=section('Les fils ('+f.length+')','<div class="fils">'+f.map(function(x){return'<i title="DMC '+esc(x.dmc)+'" style="background:'+((X.dmc[x.dmc]||{}).hex||'#999')+'"></i>'}).join('')+'</div><p class="m">'+f.reduce(function(s,x){return s+x.echeveaux},0)+' écheveaux estimés (hypothèse : 1 800 points par écheveau en 14 ct).</p>');
 if(peut(q,'voir-boite')){var manque=f.filter(function(x){return X.boite.indexOf(String(x.dmc))<0});h+=section('Ma boîte à fils',manque.length?'<ul class="l">'+manque.map(function(x){return'<li><b>DMC '+esc(x.dmc)+'</b><span>'+esc((X.dmc[x.dmc]||{}).nom||'')+' · '+x.echeveaux+' écheveau'+(x.echeveaux>1?'x':'')+' à prévoir</span></li>'}).join('')+'</ul>':'<p class="m">Tous les fils sont déjà dans la boîte.</p>')}
 h+=section('Mes gestes','<ul class="l g">'+Object.keys(GESTES).map(function(g){var o=peut(q,g);return'<li><span class="e'+(o?'':' non')+'">'+(o?'Autorisé':'Refusé')+'</span><span><b>'+esc(GESTES[g].nom)+'</b><br>'+esc(GESTES[g].raison)+'</span></li>'}).join('')+'</ul>');
 return'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><title>'+esc(NOMS[q]||q)+'</title><style>'+CSS+'</style></head><body>'+h+'</body></html>'}
function droits(roles,perso){var v=prix(perso),f=P.fournitures(X.pat),ligne=function(t,fn){return{titre:t,valeurs:roles.map(function(r){return fn(r.angle)})}};
 var L=[ligne('Ce qu\'elle voit du patron',function(q){return peut(q,'voir-grille')?'<b>La grille</b><small>'+f.length+' fils, symboles</small>':'<b>L\'aperçu</b><small>réduit</small>'}),
  ligne('Le prix',function(q){return'<b>'+eur(v)+'</b>'+(q==='boutique'?'<small>elle le fixe</small>':'')})];
 Object.keys(GESTES).forEach(function(g){L.push(ligne(GESTES[g].nom,function(q){return'<b>'+(peut(q,g)?'Autorisé':'Refusé')+'</b>'}))});return L}
root.AIMECoeur.adaptateurs.stitch={
 charger:function(){return Promise.all([j('/stitch/data/patrons/'+PAT+'.json'),j('/stitch/data/catalogue.json'),j('/stitch/data/dmc.json'),j('/stitch/data/boite-demo.json')]).then(function(r){
  X.pat=P.charger(r[0]);X.prod=r[1].produits.filter(function(x){return x.id===PROD})[0];X.boutique=r[1].boutiques.filter(function(b){return b.id===X.prod.boutique})[0];
  X.dmc={};r[2].fils.forEach(function(f){X.dmc[f.code]=f});X.boite=(r[3].fils||[]).map(String);
  IMG.grille=image(X.pat,1);IMG.apercu=image(X.pat,6)})},
 page:page,droits:droits,
 etiquette:function(r){return{creatrice:'Autrice',boutique:'Vente',brodeuse:'A acquis le patron',visiteuse:'Sans compte'}[r.angle]||''}};
})(typeof self!=='undefined'?self:this);
