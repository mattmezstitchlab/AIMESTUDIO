const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('fenetre/index.html','utf8');
const bus=fs.readFileSync('fenetre/capsule-bus.js','utf8');
const mediaCode=fs.readFileSync('fenetre/media-capsule.js','utf8');
const contact=fs.readFileSync('fenetre/contact-capsule.js','utf8');
const manifest=JSON.parse(fs.readFileSync('fenetre/galerie.json','utf8'));

test('capsule typée: seuls les types connus changent le contexte',()=>{
 const sent=[];
 const context={module:{exports:{}},document:{dispatchEvent(e){sent.push(e.detail)}},CustomEvent:class{constructor(type,props){this.type=type;this.detail=props.detail;}}};
 vm.runInNewContext(bus,context);
 const api=context.module.exports;
 assert.deepEqual([...api.types],['temps','musique','media','contact','ticket']);
 assert.equal(api.activer({type:'media',id:'polaroid-centre',mediaId:'mariage'}),true);
 assert.equal(sent.length,1);
 assert.equal(sent[0].type,'media');
 assert.equal(sent[0].mediaId,'mariage');
 assert.equal(api.activer({type:'admin'}),false);
 assert.equal(api.activer({type:'media',id:'X'.repeat(90)}),false);
 assert.equal(sent.length,1);
});

test('galerie publique : images existantes, objets typés et positions bornées',()=>{
 assert.equal(manifest.version,1);
 assert.equal(manifest.status,'demonstration');
 assert.ok(manifest.media.length>=2);
 for(const m of manifest.media){
   assert.equal(m.type,'image');
   assert.match(m.src,/^\/media\/visuels\/[\w.-]+\.webp$/);
   assert.ok(fs.existsSync('.'+m.src),'media exists: '+m.src);
   assert.ok(m.id&&m.title&&m.alt);
 }
 const center=manifest.objects.filter(o=>o.offset===0);
 assert.equal(center.length,1);
 for(const o of manifest.objects){
   assert.equal(o.type,'polaroid');
   assert.equal(o.mode,'media');
   assert.equal(o.place,'slat');
   assert.ok(o.slat>=0&&o.slat<=1);
   assert.ok(o.x>=0&&o.x<=1);
 }
});

test('capsule Média greffée sans toucher aux 2 MP3 ni au contrôle du store',()=>{
 assert.ok(html.includes('src="capsule-bus.js" defer'));
 assert.ok(html.includes('src="media-capsule.js" defer'));
 assert.ok(html.includes('href="media-capsule.css"'));
 assert.ok(html.includes('id="timeRange"'));
 assert.ok(html.includes('id="blind"'));
 assert.ok(html.includes('src="contact-capsule.js"'));
 assert.doesNotThrow(()=>new vm.Script(mediaCode));
 assert.ok(mediaCode.includes("fetch('./galerie.json'"));
 assert.ok(mediaCode.includes("window.AIMECapsule.activer({type:'media'"));
 assert.ok(mediaCode.includes("append(card.node)"));
 assert.ok(mediaCode.includes('MutationObserver'));
 assert.ok(mediaCode.includes('setInterval'));
 assert.ok(mediaCode.includes('prefers-reduced-motion: reduce'));
 assert.ok(mediaCode.includes("document.addEventListener('openaime:compose'"));
 assert.ok(contact.includes("document.addEventListener('aime:capsule'"));
 assert.ok(!mediaCode.includes('audio.pause()'));
 const tag='<script type="application/json" id="oa-settings">';
 const a=html.indexOf(tag); const b=html.indexOf('</script>',a);
 const settings=JSON.parse(html.slice(a+tag.length,b));
 assert.equal(settings.music.tracks.length,2);
 settings.music.tracks.forEach(t=>assert.match(t.src,/\.(mp3)$/i));
});
