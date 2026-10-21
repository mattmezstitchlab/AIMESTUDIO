/* Reconstruit sites/bibliotheque/ depuis une sélection (choix.json : catégorie → {index: texte alternatif}) et un inventaire candidats.tsv (dépôt, chemin, fichier extrait). Usage : node scripts/bibliotheque-construire.cjs <dossier de travail> sites/bibliotheque ; nécessite sharp. */
const sharp=require('sharp'),fs=require('fs'),path=require('path');const S=process.argv[2],OUT=process.argv[3];
const L=fs.readFileSync(S+'/candidats.tsv','utf8').trim().split('\n').map(l=>l.split('\t'));const C=JSON.parse(fs.readFileSync(S+'/choix.json','utf8'));
(async()=>{const items=[];let tot=0;for(const cat of Object.keys(C)){for(const [i,alt] of Object.entries(C[cat])){const [depot,chemin,src]=L[+i];const id=cat+'-'+path.basename(chemin).replace(/\.[a-z]+$/i,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase();
 const g=OUT+'/'+id+'.webp',v=OUT+'/'+id+'.v.webp';const m=await sharp(src).metadata();
 await sharp(src).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:66}).toFile(g);await sharp(src).rotate().resize(360,360,{fit:'cover'}).webp({quality:60}).toFile(v);
 tot+=fs.statSync(g).size+fs.statSync(v).size;const mg=await sharp(g).metadata();items.push({id,cat,fichier:id+'.webp',vignette:id+'.v.webp',l:mg.width,h:mg.height,alt,source:{depot,chemin}})}}
 fs.writeFileSync(OUT+'/bibliotheque.json',JSON.stringify({format:'aime-bibliotheque',version:1,categories:{ceremonie:'Cérémonie et couples',reception:'Réception et tables',lieux:'Lieux',details:'Détails et objets',fonds:'Fonds et textures',scene:'Scène et prestataires'},images:items},null,1));
 console.log(items.length,'images',(tot/1e6).toFixed(1)+' Mo')})();
