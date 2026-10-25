
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('fenetre/index.html','utf8');
const contact=fs.readFileSync('fenetre/contact-capsule.js','utf8');
const match=html.match(/<script type="application\\/json" id="oa-settings">([\\s\\S]*?)<\\/script>/);
test('fenêtre AIME intacte, route autonome, sans modifier la landing',()=>{
 assert.ok(html.includes('id="stage"'));
 assert.ok(html.includes('id="blind"'));
 assert.ok(html.includes('id="timeRange"'));
 assert.ok(html.includes('src="scenes.js"'));
 assert.ok(html.includes('src="contact-capsule.js"'));
 assert.ok(html.includes('href="contact-capsule.css"'));
 assert.ok(!html.includes('src="visitor-note.js"'));
 assert.ok(html.includes('if (pi.show)'));
 assert.ok(html.includes('task ? wrapWords'));
 assert.ok(html.includes('content="noindex"'));
});
test('post-it visible et vierge, média épinglé pendant migration',()=>{
 assert.ok(match);
 const s=JSON.parse(match[1]);
 assert.equal(s.name,'AIME');
 assert.equal(s.postit.tasks,'');
 assert.equal(s.postit.show,true);
 assert.equal(s.postit.showTime,false);
 assert.ok(s.music.tracks.length>0);
 for(const t of s.music.tracks)assert.ok(t.src.startsWith('https://raw.githubusercontent.com/mattmezstitchlab/OpenAime/'));
});
test('contact dans le même écran, API/Resend exclusivement sur AIME Studio',()=>{
 assert.doesNotThrow(()=>new vm.Script(contact));
 assert.ok(contact.includes("fetch('/api/contact'"));
 assert.ok(!contact.includes('RESEND_API_KEY'));
 assert.ok(!contact.includes('window.location.assign'));
 assert.ok(contact.includes('consentement:'));
 assert.ok(contact.includes('credentials:'));
 for(const key of ['evenement','site','refonte','supports','partenariat','autre'])assert.ok(contact.includes(key));
});
