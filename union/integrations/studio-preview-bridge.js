/* Injecté dans la portée de la copie de prévisualisation du Studio, jamais dans sa source originale. */
try {
 const x=UNION_OBJECT_PAYLOAD,allowed=['card','badge','progfo'];if(!allowed.includes(x.format))throw Error('Format hors expérimentation');
 const up=newProject('vierge');up.id='union'+crypto.randomUUID().replaceAll('-','');up.name=x.name;up.formats=[x.format];up.unionReferences=x.binding;up.aime='union-support:'+x.objectId+':'+x.binding.momentId+':'+x.binding.sourceRevision;
 const v=up.versions[0];Object.keys(v.d).forEach(k=>v.d[k]='');Object.assign(v.d,x.fields);v.b.motifOn=false;v.b.flat=1;up.day=-20;
 const root=document.createElement('div');root.id='union-preview-render';root.style.cssText='position:fixed;inset:0;display:grid;place-items:center;padding:22px;background:#e7e6dd;overflow:auto';document.body.append(root);
 const st=document.createElement('style');st.textContent='body>*:not(#union-preview-render){display:none!important}body{background:#e7e6dd!important}#union-preview-render .mini{margin:auto;box-shadow:0 8px 35px #17211122}';document.head.append(st);
 function paint(){root.innerHTML=withoutLogo(()=>miniOf(up,x.format,Math.max(200,innerHeight-44),Math.max(180,innerWidth-44)));root.querySelectorAll('.mini>div').forEach(n=>fitEl(n));}paint();addEventListener('resize',paint);
 parent.postMessage({type:'aime-support-preview',request:x.request,prepared:up,format:x.format},UNION_OBJECT_PAYLOAD.parentOrigin);
}catch(e){parent.postMessage({type:'aime-support-preview-error',request:UNION_OBJECT_PAYLOAD.request,message:String(e.message)},UNION_OBJECT_PAYLOAD.parentOrigin)}
