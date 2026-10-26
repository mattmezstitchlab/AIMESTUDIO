/* Presentation only: every action delegates to the original reader and access-filtered pool. */
export function mountEditorial(B){
 const $=s=>document.querySelector(s), {data}=B;
 document.body.classList.add('editorial-world');
 const ruler=$('.ruler');if(ruler){ruler.hidden=true;ruler.setAttribute('aria-hidden','true')}
 document.querySelectorAll('.light-choices button,.dock-actions button').forEach(b=>{if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label',b.textContent.trim())});
 const brand=$('.immersive-brand');brand.replaceChildren();brand.append('LE MONDE');const line=document.createElement('span');line.textContent='AIME®';brand.append(line);
 const title=$('#perspective-title');
 const syncTitle=()=>{if(!B.getSpecialty()&&title.textContent!==data.project.name)title.textContent=data.project.name};
 new MutationObserver(syncTitle).observe(title,{childList:true});syncTitle();
 const nav=document.createElement('nav');nav.className='editorial-index';nav.setAttribute('aria-label','Les entrées du récit');
 const actions=[['L’OUVERTURE',()=>$('#immersive').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})],['LE RÉCIT',()=>$('#to-story').click()],['LES ACTIVITÉS',()=>$('#profession-open').click()],['LES DOCUMENTS',()=>$('#documents-open').click()]];
 actions.forEach(([label,action],i)=>{const b=document.createElement('button'),n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');b.append(n,label);b.onclick=action;nav.append(b)});document.body.append(nav);
 const cards=$('#floating-cards');cards.classList.add('editorial-moments');cards.setAttribute('aria-label','Quelques moments accessibles du récit');$('#immersive').after(cards);
 const label=document.createElement('label');label.className='editorial-progress';label.innerHTML='<span class="sr">Position dans les moments autorisés du récit</span><input type="range" min="0" max="0" value="0" aria-label="Position narrative autorisée"><output></output>';
 $('.dock-playback').before(label);const range=label.querySelector('input'),out=label.querySelector('output');
 // Compact transport: retain the original controls, move ambience into an explicit popover.
 const dock=$('.immersive-dock');dock.setAttribute('aria-label','Commandes du récit');
 const ambiance=document.createElement('details');ambiance.className='capsule-ambiance';
 const trigger=document.createElement('summary');trigger.setAttribute('aria-label','Ambiance et vitesse de lecture');trigger.title='Ambiance et vitesse de lecture';trigger.innerHTML='<span aria-hidden="true">☼</span><span class="ambiance-label">Ambiance</span>';
 const options=document.createElement('div');options.className='capsule-options';
 options.append($('.light-choices'));const speed=$('.dock-speed');if(speed)options.append(speed);
 ambiance.append(trigger,options);dock.prepend(ambiance);
 options.addEventListener('click',e=>{if(e.target.closest('[data-light]'))ambiance.open=false});
 document.addEventListener('click',e=>{if(!ambiance.contains(e.target))ambiance.open=false});
 ambiance.addEventListener('keydown',e=>{if(e.key==='Escape'){ambiance.open=false;trigger.focus();e.stopPropagation()}});
 for(const [selector,name] of [['#documents-open','Documents'],['#perspectives-open','Perspectives'],['#dock-story','Sommaire du récit']]){const b=$(selector);b.title=name;b.setAttribute('aria-label',name)}
 const update=()=>{const state=window.AIMEWindowNarrative?.state();if(!state)return;range.max=Math.max(0,state.total-1);range.value=state.index;range.disabled=!state.total;out.textContent=(state.total?state.index+1:0)+' / '+state.total;range.setAttribute('aria-valuetext',out.textContent+' · '+state.title)};
 range.oninput=()=>{const index=Number(range.value);window.AIMEWindowNarrative?.pause();window.AIMEWindowNarrative?.go(index);update()};document.addEventListener('union:moment',update);new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-perspective-ready']});update();
}
