/* Navigation audit: the global header owns the original, single filter form.
   No duplicated inputs or listeners; existing story filters remain authoritative. */
export function mountNavigation(){
 const $=s=>document.querySelector(s),header=$('.immersive-nav'),toolbar=$('#filters');
 if(!header||!toolbar||$('.reader-filters'))return;
 header.setAttribute('aria-label','Le Monde AIME · navigation du récit');
 const menu=document.createElement('details');menu.className='reader-filters';
 const trigger=document.createElement('summary');trigger.id='reader-filters-trigger';trigger.setAttribute('aria-controls','filters');trigger.innerHTML='<span aria-hidden="true">☷</span><span class="filters-label">Filtres</span><span class="filter-dot" aria-hidden="true"></span>';
 const label=toolbar.querySelector('.toolbar-label');if(label)label.textContent='AFFINER LE RÉCIT';
 toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Filtres et mode de lecture');
 menu.append(trigger,toolbar);header.insertBefore(menu,$('.immersive-nav-right'));
 const sync=()=>{const active=$('#specialty').value!==''||$('#kind').value!=='all';menu.dataset.active=String(active);trigger.setAttribute('aria-label','Filtres du récit'+(active?' · filtres actifs':''))};
 toolbar.addEventListener('change',sync);toolbar.addEventListener('click',e=>{if(e.target.closest('#reset'))sync()});new MutationObserver(sync).observe($('#result-count'),{childList:true});sync();
 document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;trigger.focus();e.stopPropagation()}});
 document.addEventListener('union:perspective',()=>menu.open=false);
}
