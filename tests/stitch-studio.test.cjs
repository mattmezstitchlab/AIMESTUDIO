/* Stitchlab (dans le Studio) s'appuie sur AIME Stitch : mêmes fils DMC, même moteur de conversion pour les aplats. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const R=p=>path.join(__dirname,'..',p);
test('Studio et AIME Stitch : les mêmes 489 fils DMC, dans le même ordre, sans aucune référence altérée',()=>{
 const s=fs.readFileSync(R('studio/index.html'),'utf8'),raw=s.match(/const DMC_RAW='([^']*)'/)[1].split(';').map(r=>r.split('|'));
 const L=JSON.parse(fs.readFileSync(R('stitch/data/dmc.json'))).fils;assert.equal(raw.length,L.length);
 raw.forEach((r,i)=>{assert.equal(r[0],L[i].code);assert.equal(r[1],L[i].nom);assert.equal('#'+r[2].toUpperCase(),L[i].hex.toUpperCase())})});
test('Stitchlab charge le moteur d\'AIME Stitch et l\'utilise pour les aplats nets',()=>{
 const s=fs.readFileSync(R('studio/index.html'),'utf8');
 assert.ok(s.indexOf('<script src="/stitch/js/couleur.js">')>0&&s.indexOf('<script src="/stitch/js/conversion.js">')>s.indexOf('/stitch/js/couleur.js'));
 assert.match(s,/else if\(window\.StitchConversion\)\{cells=pzParStitch\(c,w,h\)\}/);assert.match(s,/StitchConversion\.convertir\(/)});
