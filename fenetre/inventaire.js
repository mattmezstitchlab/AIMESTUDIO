/* Lecture uniquement. Jamais de jetons/session, pas de migration ni de fusion. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AIMEFenetreInventaire=factory()})(typeof self!=='undefined'?self:this,function(){
const KEYS=['aime-carte','aime-carte-sauvegarde','echos:v2','aime-sites','aime:cards','aime:uni','aime:unilinks','aime:uniat','aime-union-supports-v1'];
function read(storage){return KEYS.flatMap(key=>{const raw=storage.getItem(key);if(raw===null)return[];let valid=true;try{JSON.parse(raw)}catch{valid=false}return[{key,raw,valid,characters:raw.length}]})}
function backup(storage){return{format:'aime-fenetre-sauvegarde-locale',version:1,created:new Date().toISOString(),scope:'Clés locales connues uniquement. Pas les fichiers IndexedDB, pas la base du compte.',entries:read(storage).map(({key,raw})=>({key,raw}))}}
return {KEYS,read,backup};
});
