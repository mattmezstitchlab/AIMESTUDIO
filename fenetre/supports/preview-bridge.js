/* Injecté uniquement dans une copie isolée du Studio : modèles publics, jamais un document privé. */
try {
 const x=UNION_OBJECT_PAYLOAD,pack=x.publicTemplate?.packId;
 if(!Object.prototype.hasOwnProperty.call(PK,pack)||!Object.prototype.hasOwnProperty.call(FL,x.format))throw Error('Référence publique inconnue');
 const up=newProject(pack);up.id='context'+crypto.randomUUID().replaceAll('-','');up.name=x.name+' · exemple';up.formats=[x.format];up.unionReferences=x.binding;
 // Brand/content are the existing public profession pack, not arbitrary user data.
 const v=up.versions[0];v.d.title='Atelier Fil Rouge';v.d.sub='Exemple fictif · '+x.name;v.d.date='';v.d.time='';v.d.url='';v.d.contact='Exemple de composition · aucune donnée client';v.d.client='Client fictif · aucune pièce officielle';v.d.docno='EXEMPLE';v.d.legal='Exemple fictif à personnaliser. Aucun document émis ou conformité garantie.';up.day=-20;
 const root=document.createElement('div');root.id='union-preview-render';root.style.cssText='position:fixed;inset:0;display:grid;place-items:center;padding:22px;background:#eeeae1;overflow:auto';document.body.append(root);
 const st=document.createElement('style');st.textContent='body>*:not(#union-preview-render){display:none!important}body{background:#eeeae1!important}#union-preview-render .mini{margin:auto;box-shadow:0 8px 35px #17211122}';document.head.append(st);
 function paint(){root.innerHTML=withoutLogo(()=>miniOf(up,x.format,Math.max(200,innerHeight-44),Math.max(180,innerWidth-44)));root.querySelectorAll('.mini>div').forEach(n=>fitEl(n));}paint();addEventListener('resize',paint);
 parent.postMessage({type:'aime-support-preview',request:x.request,prepared:up,format:x.format},x.parentOrigin);
}catch(e){parent.postMessage({type:'aime-support-preview-error',request:UNION_OBJECT_PAYLOAD.request,message:String(e.message)},UNION_OBJECT_PAYLOAD.parentOrigin)}
