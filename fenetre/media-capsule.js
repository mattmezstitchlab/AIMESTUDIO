/* AIME · Media capsule, polaroids bound to actual Venetian slats.
   Demonstration only: manifest in this repository, no user-upload/storage,
   no ambient sound interruption, and no automatic carousel on arrival. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const host = $('commandCapsule'), wrap = document.querySelector('.capsule-wrap'), slats = $('slats');
  if (!host || !wrap || !slats || !window.AIMECapsule) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const button = (id, label, text, cls='icon') => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button'; b.className = cls;
    b.setAttribute('aria-label', label); b.title = label;
    b.textContent = text;
    return b;
  };

  const quick = button('quickMedia', 'Médias : parcourir les polaroids', '▧');
  $('commandAdd').after(quick);
  const menuEntry = button('toolMedia', 'Médias : parcourir les polaroids', '▧ Médias', '');
  const menu = $('commandModes');
  const info = menu.querySelector('p');
  if (info) menu.insertBefore(menuEntry, info);
  else menu.append(menuEntry);

  const capsule = document.createElement('section');
  capsule.id='mediaCapsule'; capsule.className='day oa-media-capsule';
  capsule.hidden=true;
  capsule.setAttribute('aria-label','Navigation dans les médias de la fenêtre');
  const back = button('mediaBack','Revenir à la capsule précédente','←');
  const prev = button('mediaPrevious','Photo précédente','‹','icon oa-media-step');
  const next = button('mediaNext','Photo suivante','›','icon oa-media-step');
  const title = document.createElement('span'); title.className='oa-media-name'; title.textContent='Médias';
  const number = document.createElement('span'); number.className='oa-media-number'; number.setAttribute('aria-live','polite');
  const auto = button('mediaAuto','Faire défiler les photos','Défiler','oa-media-auto'); auto.setAttribute('aria-pressed','false');
  const detail = document.createElement('span'); detail.className='oa-media-description';
  capsule.append(back,prev,title,number,next,auto,detail);
  wrap.insertBefore(capsule,host);

  let active=false, current=0, media=[], definitions=[], cards=[], cycle=null;
  const mediaById=new Map();
  function stop() {
    if (cycle !== null) { clearInterval(cycle); cycle=null; }
    auto.setAttribute('aria-pressed','false');
    auto.textContent='Défiler';
  }
  function labels() {
    if(!media.length){
      title.textContent='Galerie indisponible'; number.textContent=''; detail.textContent=''; return;
    }
    const selected=media[current];
    title.textContent=selected.title;
    number.textContent=(current+1)+' / '+media.length;
    detail.textContent=selected.description || 'Galerie de démonstration AIME';
    for (const card of cards) {
      const index=(current+card.def.offset%media.length+media.length)%media.length;
      const entry=media[index];
      if(card.image.getAttribute('src')!==entry.src)card.image.src=entry.src;
      card.image.alt=entry.alt;
      card.label.textContent=entry.title;
      card.node.dataset.selected=String(card.def.offset===0);
      card.node.setAttribute('aria-pressed',String(card.def.offset===0));
      card.node.setAttribute('aria-label',entry.title+' · ouvrir ce média dans la capsule');
      card.mediaId=entry.id;
    }
  }
  function mount() {
    if(!cards.length) return;
    const targets=Array.from(slats.children).filter(x=>x.classList.contains('slat'));
    if(!targets.length) return;
    for(const card of cards){
      const i=Math.max(1,Math.min(targets.length-1,Math.round(card.def.slat*(targets.length-1))));
      if(card.node.parentNode!==targets[i])targets[i].append(card.node);
    }
  }
  function makeCards() {
    cards=[];
    for(const def of definitions){
      const node=document.createElement('button');node.type='button';node.className='oa-polaroid';
      node.dataset.objectId=def.id;
      node.style.setProperty('--left',(def.x*100).toFixed(1)+'%');
      node.style.setProperty('--rotation',def.offset===0?'3deg':def.offset<0?'-7deg':'8deg');
      const image=document.createElement('img');image.decoding='async';image.loading='lazy';
      const label=document.createElement('span');label.className='oa-polaroid-label';
      node.append(image,label);
      const card={def,node,image,label,mediaId:''};
      node.addEventListener('click',e=>{
        e.stopPropagation();
        window.AIMECapsule.activer({type:'media',id:def.id,mediaId:card.mediaId});
      });
      cards.push(card);
    }
    mount(); labels();
  }
  function setMode(on,restore=true) {
    active=Boolean(on);
    capsule.hidden=!active;
    document.body.classList.toggle('oa-gallery-open',active);
    if(active){
      host.hidden=true;
      for(const id of ['commandModes','commandMore','sceneCatalog','pop','plPop']){
        const n=$(id);if(n)n.hidden=true;
      }
      for(const id of ['commandAdd','commandOptions']){
        const n=$(id);if(n)n.setAttribute('aria-expanded','false');
      }
      labels();mount();
    }else{
      stop();
      if(restore && $('visitorNote').hidden)host.hidden=false;
    }
  }
  function select(id) {
    if(!media.length)return;
    const index=media.findIndex(x=>x.id===id);
    if(index>=0)current=index;
    labels();
  }
  function shift(amount) {
    if(!media.length)return;
    current=(current+amount+media.length)%media.length;
    labels();
  }
  function openMedia(id='') {
    setMode(true);
    if(id)select(id);
    if(media.length)prev.focus();else title.textContent='Chargement des médias…';
  }
  quick.addEventListener('click',()=>window.AIMECapsule.activer({type:'media'}));
  menuEntry.addEventListener('click',()=>window.AIMECapsule.activer({type:'media'}));
  back.addEventListener('click',()=>{window.AIMECapsule.activer({type:host.classList.contains('music-mode')?'musique':'temps'});quick.focus()});
  prev.addEventListener('click',()=>shift(-1));
  next.addEventListener('click',()=>shift(1));
  auto.addEventListener('click',()=>{
    if(cycle!==null){stop();return}
    if(reduced){detail.textContent='Défilement automatique désactivé en mode mouvements réduits.';return}
    if(!media.length)return;
    auto.setAttribute('aria-pressed','true');auto.textContent='Pause';
    cycle=setInterval(()=>{
      if(document.hidden||!active){stop();return}
      shift(1);
    },4200);
  });
  for(const id of ['toolTime','toolMusic']){
    const n=$(id);if(n)n.addEventListener('click',()=>setMode(false,true));
  }
  document.addEventListener('openaime:compose',()=>setMode(false,false));
  document.addEventListener('aime:capsule',e=>{
    const o=e.detail||{};
    if(o.type==='media')openMedia(o.mediaId||'');
    else if(o.type==='contact') {
      setMode(false,false);
      document.dispatchEvent(new CustomEvent('openaime:compose'));
    } else if(o.type==='temps'||o.type==='musique'){
      setMode(false,true);
      // Delegate to the existing capsule, so the original music engine stays intact.
      const target=$(o.type==='musique'?'toolMusic':'toolTime');
      if(target)target.click();
    } else setMode(false,true);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  const observer=new MutationObserver(mount);
  observer.observe(slats,{childList:true});
  fetch('./galerie.json',{credentials:'same-origin'}).then(r=>{
    if(!r.ok)throw new Error('galerie indisponible');
    return r.json();
  }).then(d=>{
    if(d.version!==1||!Array.isArray(d.media)||!Array.isArray(d.objects))throw new Error('galerie invalide');
    media=d.media.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&
      x.type==='image'&&typeof x.alt==='string'&&
      typeof x.src==='string'&&/^\/media\/visuels\/[\w.-]+\.webp$/.test(x.src)).slice(0,30);
    definitions=d.objects.filter(o=>o&&o.type==='polaroid'&&o.mode==='media'&&
      typeof o.id==='string'&&o.id.length<=80&&Number.isFinite(o.x)&&o.x>=.12&&o.x<=.88&&
      Number.isFinite(o.slat)&&o.slat>=0&&o.slat<=1&&[-1,0,1].includes(o.offset)).slice(0,3);
    mediaById.clear();for(const item of media)mediaById.set(item.id,item);
    if(!media.length||!definitions.length)throw new Error('galerie vide');
    makeCards();
    if(active)labels();
  }).catch(()=>{media=[];definitions=[];title.textContent='Galerie indisponible';number.textContent='';auto.disabled=true});
})();
