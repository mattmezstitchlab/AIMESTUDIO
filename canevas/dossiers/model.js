/* Extension de dossier du Canevas ; coordonnées et cadrage réutilisent scene.js. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../scene.js'));else root.AIMEDossiers=factory(root.AIMECanevasScene)})(typeof self!=='undefined'?self:this,function(C){'use strict';
const FORMAT='aime-canevas-dossier',VERSION=1,MAX_BYTES=12*1024*1024;
const TYPES=['verticality','module','text','image','note','document','media','fragment','link','composition'];
const copy=o=>JSON.parse(JSON.stringify(o));
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'d-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const text=(s,n=2000)=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').slice(0,n);
function num(n,min,max){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Coordonnée ou dimension invalide.');return n}
function id(s){if(typeof s!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(s)||['__proto__','constructor','prototype'].includes(s))throw Error('Identifiant invalide.');return s}
function link(s){try{const u=new URL(s,'https://aime.invalid');return (u.origin==='https://aime.invalid'&&s.startsWith('/')&&!s.startsWith('//')||u.protocol==='https:')&&!u.username&&!u.password?String(s):null}catch{return null}}
function create(title='Nouveau dossier'){return{format:FORMAT,schema:VERSION,id:uid(),title:text(title,120).trim()||'Sans titre',scope:'device',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),view:{x:-100,y:-100,z:1},objects:[],relations:[],resources:[],revision:0}}
function object(type,props={},source=null,x=0,y=0){if(!TYPES.includes(type))throw Error('Type d’objet inconnu.');return{id:uid(),type,x,y,w:type==='verticality'?380:320,h:type==='verticality'?300:type==='note'?230:190,locked:false,groupId:null,props:{title:text(props.title||({text:'Votre texte',note:'Une idée à garder',image:'Image'}[type]||'Objet'),200),text:text(props.text||'',10000),color:/^#[0-9a-fA-F]{6}$/.test(props.color||'')?props.color:type==='note'?'#f2dfb0':'#ffffff'},source:source?copy(source):null}}
function validate(input,catalog){if(!input||input.format!==FORMAT||input.schema!==VERSION)throw Error('Format de dossier inconnu. Aucun fichier existant n’a été modifié.');
 if(JSON.stringify(input).length>MAX_BYTES)throw Error('Dossier trop volumineux (12 Mo maximum).');
 if(!Array.isArray(input.objects)||input.objects.length>500||!Array.isArray(input.resources)||input.resources.length>100||!Array.isArray(input.relations)||input.relations.length>1000)throw Error('Collections du dossier invalides.');
 const d=create(input.title);d.id=id(input.id);d.createdAt=text(input.createdAt,60);d.updatedAt=text(input.updatedAt,60);d.revision=Number.isInteger(input.revision)&&input.revision>=0?input.revision:0;
 const v=input.view;d.view={x:num(v?.x,-1e7,1e7),y:num(v?.y,-1e7,1e7),z:num(v?.z,C.Z_MIN,C.Z_MAX)};
 const seen=new Set(),resources=new Set();
 d.resources=input.resources.map(r=>{id(r.id);if(resources.has(r.id))throw Error('Ressource dupliquée.');resources.add(r.id);if(r.kind!=='image'||typeof r.data!=='string'||r.data.length>3000000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(r.data))throw Error('Image locale non prise en charge. PNG, JPEG ou WebP uniquement.');return{id:r.id,kind:'image',name:text(r.name,150),data:r.data}});
 d.objects=input.objects.map(o=>{id(o.id);if(seen.has(o.id))throw Error('Identifiant d’objet dupliqué.');seen.add(o.id);if(!TYPES.includes(o.type))throw Error('Type d’objet inconnu.');
 let source=null;if(o.source){source={};if(o.source.verticalityId){id(o.source.verticalityId);if(catalog&&!catalog.verticalities.some(v=>v.id===o.source.verticalityId))throw Error('Verticalité source absente du catalogue.');source.verticalityId=o.source.verticalityId}if(o.source.moduleId){id(o.source.moduleId);if(catalog&&!catalog.modules.some(m=>m.id===o.source.moduleId))throw Error('Module source absent du catalogue.');source.moduleId=o.source.moduleId}if(o.source.resourceId){if(!resources.has(o.source.resourceId))throw Error('Image source manquante.');source.resourceId=o.source.resourceId}if(o.source.href){const href=link(o.source.href);if(!href)throw Error('Lien source interdit.');source.href=href}}
 if(o.type==='image'&&!source?.resourceId)throw Error('Une image doit conserver sa ressource.');
 return{id:o.id,type:o.type,x:num(o.x,-1e6,1e6),y:num(o.y,-1e6,1e6),w:num(o.w,48,4000),h:num(o.h,48,4000),locked:o.locked===true,groupId:o.groupId?id(o.groupId):null,props:{title:text(o.props?.title,200),text:text(o.props?.text,10000),color:/^#[0-9a-fA-F]{6}$/.test(o.props?.color||'')?o.props.color:'#ffffff'},source}});
 d.relations=input.relations.map(r=>{id(r.id);if(!seen.has(r.from)||!seen.has(r.to)||r.from===r.to)throw Error('Relation sans objets valides.');return{id:r.id,from:r.from,to:r.to,label:text(r.label,200)}});return d}
function bounds(objects){if(!objects.length)return null;const x=Math.min(...objects.map(o=>o.x)),y=Math.min(...objects.map(o=>o.y));return{x,y,l:Math.max(...objects.map(o=>o.x+o.w))-x,h:Math.max(...objects.map(o=>o.y+o.h))-y}}
function fit(d,w,h){return C.ajuster(bounds(d.objects),w,h,Math.min(70,w*.08))}
function cloneObjects(d,ids){const added=d.objects.filter(o=>ids.includes(o.id)).map(o=>({...copy(o),id:uid(),x:o.x+32,y:o.y+32,locked:false,groupId:null}));d.objects.push(...added);return added.map(o=>o.id)}
function remove(d,ids){d.objects=d.objects.filter(o=>!ids.includes(o.id)||o.locked);const set=new Set(d.objects.map(o=>o.id));d.relations=d.relations.filter(r=>set.has(r.from)&&set.has(r.to))}
return{FORMAT,VERSION,MAX_BYTES,TYPES,create,object,validate,bounds,fit,cloneObjects,remove,copy,uid,link,text,scene:C};
});
