const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const lire=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const Porte=require('../porte/porte.js');
test('Page Zéro : une seule entrée par intention, sans imposer le Bureau ni la connexion ; Le Monde AIME reste libre, au Lab',()=>{
 const z=lire('index.html'),P=require('../dock/plus.js');
 assert.ok(require('../nav/registre.js').ENTREES.some(e=>e.href==='/aime/'&&e.cat==='jeux'));
 assert.doesNotMatch(z,/id="bureau" href="\/bureau\/"/);
 assert.match(z,/AIMEPlus\.brancher/);assert.equal(P.etat({connecte:false}).items[0].href,'/?commencer=1');
 assert.equal(Porte.etat({connecte:false}).href,'/point-zero/?intention=identite');
});
test('Le Timbre confirmé rejoint la facette du Monde AIME et non le Bureau',()=>{
 const a=lire('porte/arrivee.js'),monde=lire('aime/index.html');
 assert.match(a,/a\.href=u\.demo\?'\/point-zero\/\?intention=identite':'\/aime\/#story2'/);
 assert.match(a,/Découvrir Le Monde AIME/);
 assert.doesNotMatch(a,/Aller au Bureau/);
 assert.match(monde,/id="story2"/);
 assert.match(monde,/\/porte\/arrivee\.js/);
});
test('Timbre d identité distinct du projet Studio',()=>{
 const i=lire('compte/timbre.js'),p=lire('adaptateurs/studio-timbre.js');
 assert.match(i,/window\.AIMETimbre/);
 assert.match(p,/echos:v2/);
 assert.doesNotMatch(p,/\/api\/identite|\/api\/auth/);
});
