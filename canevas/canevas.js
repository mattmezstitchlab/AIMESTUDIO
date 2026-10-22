/* AIME · /canevas/ : ouvre un canevas vide, ou un projet (?projet=<id>) avec son adaptateur. Garde la vue et les notes
   sur cet appareil (localStorage « aime-canevas »), jamais le contenu du projet, qui reste dans le projet. */
(function(){'use strict';
var C=window.AIMECanevasScene,CLE='aime-canevas',MAX=60;
var q=new URLSearchParams(location.search),id=String(q.get('projet')||'').replace(/[^a-z0-9-]/gi,'').slice(0,60),de=q.get('de');
var ORIGINES={'/point-zero/':'Point Zéro','/bureau/':'Bureau','/projet/':'Mini-site'};if(!ORIGINES[de])de=id?'/projet/':'/bureau/';
var r=document.getElementById('retour');r.href=de==='/projet/'?'/projet/?id='+encodeURIComponent(id):de+(id?'?projet='+encodeURIComponent(id):'');r.textContent='← '+ORIGINES[de];
function lire(){try{var o=JSON.parse(localStorage.getItem(CLE)||'null');if(o&&o.scenes)return o}catch(e){}return{scenes:{}}}
function sauver(s){var o=lire();o.scenes[s.id]=Object.assign({},s,{garde:new Date().toISOString()});var k=Object.keys(o.scenes);
 if(k.length>MAX)k.sort(function(a,b){return String(o.scenes[a].garde).localeCompare(String(o.scenes[b].garde))}).slice(0,k.length-MAX).forEach(function(x){delete o.scenes[x]});
 try{localStorage.setItem(CLE,JSON.stringify(o));return true}catch(e){return false}}
var sid=id?'cv-'+id:'cv-vide',garde=lire().scenes[sid],S=C.relire(garde)||C.vide({id:sid,titre:id?'Projet':'Canevas vide',source:id?{type:'broderie',id:id}:null});
if(id&&!S.source)S.source={type:'broderie',id:id};
window.AIMECanevas.monter(document.getElementById('plan'),{scene:S,vueGardee:!!(garde&&garde.vue),sauver:sauver,adaptateurs:{broderie:'/canevas/adaptateurs/broderie.js'}});
})();
