/* Canevas universel, mode Site (/sites/) : la tranche verticale du brief « AIME Universal Studio ».
   Trois panneaux autour du moteur de pages existant ; aucun bloc ni rendu réécrit ; chaque bouton affiché agit. */
const assert=require('assert'),fs=require('fs'),path=require('path');const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const t=(nom,f)=>{try{f()}catch(e){e.message=nom+' : '+e.message;throw e}n++};
const html=lire('sites/index.html'),ed=lire('sites/editeur.js'),css=lire('sites/studio.css');
const S=require('../vitrine/rendu.js').site,D=require('../design/systemes.js');
t('trois panneaux, un rail d\'outils, une bande des pages, quatre onglets d\'inspecteur',()=>{
 assert.ok(html.includes('class="st-rail"')&&html.includes('id="bande"'));
 for(const o of['section','contenu','style','source'])assert.ok(html.includes('data-onglet="'+o+'"')&&html.includes('id="o-'+o+'"'),o);
 assert.ok(html.includes('/design/systemes.js')&&html.includes('/design/charger.js'),'Design Systems chargés');
 assert.ok(html.includes('href="/canevas/?publication=nouvelle"'),'le mode Publication mène au Studio Publication existant')});
t('chaque bouton du rail, du zoom et des Design Systems a son geste',()=>{
 const rails=[...html.matchAll(/data-rail="([a-z]+)"/g)].map(m=>m[1]);assert.equal(rails.length,6);
 for(const r of rails)assert.ok(ed.includes("r==='"+r+"'"),'rail '+r);
 assert.ok(ed.includes('if(d.zoom)')&&ed.includes('if(d.ds)')&&ed.includes('if(d.dsAvant)')&&ed.includes("b.id==='modeDS'")&&ed.includes("b.id==='bandeAjout'"))});
t('le Design System passe par design/systemes.js (pointeur seulement) et par l\'historique de l\'éditeur',()=>{
 assert.ok(/AIMEDesign\.appliquer\(site,/.test(ed)&&/changer\(function\(s\)\{s\.presentation=r\.site\.presentation\}\)/.test(ed));
 const site=S.vide('mariage');const cat=D.catalogue(['aime-original','aime-editorial'].map(i=>JSON.parse(lire('design/catalogue/'+i+'.json'))));
 const r=D.appliquer(site,'aime-editorial',cat);assert.ok(r.change);assert.equal(D.empreinte(r.site),D.empreinte(site),'le contenu ne change pas')});
t('Source : fixe ou référence interne, lue dans les dépendances du moteur (DEPS), sans promesse de synchronisation externe',()=>{
 assert.ok(ed.includes('function regSource()')&&ed.includes('S.DEPS[k].indexOf(s.type)'));
 assert.ok(ed.includes('Contenu fixe')&&ed.includes('Référence interne'));assert.ok(/instantanés figés[^']*ne sont pas encore disponibles/.test(ed),'le figé est dit « à venir »');
 assert.ok(S.DEPS.date.includes('hero')&&S.DEPS.tarifs.includes('tarifs'))});
t('miniatures et « avant » : rendues par le moteur, sans script, dans un cadre sans permission de script',()=>{
 assert.ok(ed.includes('function sansScript(')&&/sandbox="allow-same-origin"/.test(ed)&&/id="apercuAvant"[^>]*sandbox="allow-same-origin"/.test(html));
 assert.ok(!/allow-scripts/.test((html.match(/id="apercuAvant"[^>]*>/)||[''])[0]))});
t('l\'habillage reste dans body.gen et prévoit le téléphone',()=>{assert.ok(/@media \(max-width:720px\)/.test(css));assert.ok(!/(^|\})\s*(body|html)\s*\{/.test(css),'aucune règle globale hors body.gen')});
console.log('canevas-universel : '+n+' vérifications');
