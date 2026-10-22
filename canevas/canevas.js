/* AIME · /canevas/ : ouvre un canevas vide, ou un projet (?projet=<id>) avec son adaptateur. Garde la vue et les notes
   sur cet appareil (localStorage « aime-canevas »), jamais le contenu du projet, qui reste dans le projet. */
(function(){'use strict';
var C=window.AIMECanevasScene,CLE='aime-canevas',MAX=60;
var q=new URLSearchParams(location.search),id=String(q.get('projet')||'').replace(/[^a-z0-9-]/gi,'').slice(0,60),de=q.get('de');
/* ?cube=<facette> : le cube-personne, déplié (adaptateur cube) ; ?cube seul ouvre tout le cube */
var cube=q.has('cube')?String(q.get('cube')||'').replace(/[^a-z]/g,'').slice(0,20):null;
/* ?maitre=<facette> : le Cube Maître (le site AIME en six facettes), déplié, en lecture seule (adaptateur maitre) */
var maitre=cube===null&&q.has('maitre')?String(q.get('maitre')||'').replace(/[^a-z]/g,'').slice(0,20):null;
/* ?site=<id> : une page du moteur (le mini-site d'un projet) s'édite ici, avec l'adaptateur aime-site ; ?projet= et ?de= règlent le retour */
var site=String(q.get('site')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||null;
var ORIGINES={'/point-zero/':'Point Zéro','/bureau/':'Bureau','/projet/':'Mini-site','/cube/':'Mon cube','/maitre/':'Cube Maître'};if(!ORIGINES[de])de=cube!==null?'/cube/':maitre!==null?'/maitre/':id?'/projet/':'/bureau/';
var r=document.getElementById('retour');r.href=de==='/projet/'?'/projet/?id='+encodeURIComponent(id):de+(id&&cube===null?'?projet='+encodeURIComponent(id):'');r.textContent='← '+ORIGINES[de];
if(site&&id){r.textContent='← Retour au projet';r.href=(de==='/projet/'||de==='/cube/'?'/point-zero/':de)+(id?'?projet='+encodeURIComponent(id):'')}
function lire(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.scenes)return o}catch(e){}return{scenes:{}}}
function sauver(s){var o=lire();o.scenes[s.id]=Object.assign({},s,{garde:new Date().toISOString()});var k=Object.keys(o.scenes);
 if(k.length>MAX)k.sort(function(a,b){return String(o.scenes[a].garde).localeCompare(String(o.scenes[b].garde))}).slice(0,k.length-MAX).forEach(function(x){delete o.scenes[x]});
 try{localStorage.setItem(CLE,JSON.stringify(o));return true}catch(e){return false}}
var sid=maitre!==null?'cv-maitre':cube!==null?'cv-cube':site?'cv-site-'+site:id?'cv-'+id:'cv-vide',garde=lire().scenes[sid],S=C.relire(garde)||C.vide({id:sid,titre:maitre!==null?'Cube Maître':cube!==null?'Mon cube':site?'Mini-site':id?'Projet':'Canevas vide',source:maitre!==null?{type:'maitre',facette:maitre}:cube!==null?{type:'cube',facette:cube}:site?{type:'site',site:site,projet:id,de:de}:id?{type:'broderie',id:id}:null});
if(maitre!==null)S.source={type:'maitre',facette:maitre};else if(cube!==null)S.source={type:'cube',facette:cube};else if(site)S.source={type:'site',site:site,projet:id,de:de};else if(id&&!S.source)S.source={type:'broderie',id:id};
window.AIMECanevasActif=window.AIMECanevas.monter(document.getElementById('plan'),{scene:S,vueGardee:!!(garde&&garde.vue),sauver:sauver,adaptateurs:{broderie:'/canevas/adaptateurs/broderie.js',cube:'/canevas/adaptateurs/cube.js',maitre:'/canevas/adaptateurs/maitre.js',site:'/canevas/adaptateurs/site.js'}});
})();
