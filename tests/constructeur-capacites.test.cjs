const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../constructeur/capacites.js');
const lire=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('registre unique non mutable et sans carte postale',()=>{
 const a=R.tous();assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 assert.ok(R.trouver('canevas'));assert.ok(R.trouver('timbre-identite'));
 assert.equal(R.trouver('carte-postale'),null);
 a[0].nom='ALTÉRÉ';assert.notEqual(R.tous()[0].nom,'ALTÉRÉ');
});
test('les modules futurs ne sont pas présentés comme des blocs fonctionnels',()=>{
 assert.equal(R.trouver('ripplecircle').statut,'externe');
 assert.equal(R.trouver('magazine').statut,'propose');
 assert.equal(R.trouver('studio').statut,'a-adapter');
 assert.ok(!R.disponibles().some(x=>['magazine','ripplecircle','studio'].includes(x.id)));
});
test('le constructeur vivant du Monde AIME reste intact et demeure la référence',()=>{
 const page=lire('aime/index.html'),zero=lire('index.html');
 assert.match(page,/id="build" aria-label="Construire votre site"/);
 assert.match(page,/id="cnv5"/);assert.match(page,/function add\(k,x,y,w\)/);
 assert.match(page,/function siteAdd\(kind\)/);assert.match(page,/id="plus5"/);
 assert.ok(!/href="\/(lab|aime)\//.test(zero),'le Lab et Le Monde AIME sortent de la navigation publique (brief du 24/10)');assert.ok(require('../nav/registre.js').ENTREES.some(e=>e.href==='/aime/'&&e.cat==='jeux'));
});
