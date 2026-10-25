const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('zero/openaime-contact.js','utf8');
function run(hash){
 const nodes={'c-message':{value:''},compte:{textContent:''}};
 let replaced='';
 vm.runInNewContext(script,{URLSearchParams,window:{location:{hash,pathname:'/contact/openaime/',search:''},history:{replaceState(a,b,c){replaced=c}}},document:{getElementById(id){return nodes[id]}}});
 return {nodes,replaced};
}
test('hands off text literally and clears fragment',()=>{
 const {nodes,replaced}=run('#mot='+encodeURIComponent('<img src=x onerror=alert(1)> Bonjour'));
 assert.equal(replaced,'/contact/openaime/');
 assert.equal(nodes['c-message'].value,'[OpenAime · post-it privé]\n<img src=x onerror=alert(1)> Bonjour');
 assert.equal(nodes.compte.textContent,String(nodes['c-message'].value.length));
});
test('ignores oversized and unrelated input, never restores consent or identity',()=>{
 assert.equal(run('#mot='+'a'.repeat(18000)).nodes['c-message'].value,'');
 assert.equal(run('#email=someone&consentement=true').nodes['c-message'].value,'');
});
test('normal contact page is not changed and the handoff uses existing submit handler',()=>{
 assert.ok(!fs.readFileSync('contact/index.html','utf8').includes('openaime-contact.js'));
 const page=fs.readFileSync('contact/openaime/index.html','utf8');
 assert.ok(page.includes('/zero/contact.js'));
 assert.ok(!page.includes('speed-insights'));
 assert.ok(!script.includes('fetch('));
 assert.ok(!page.includes('name="consentement" checked'));
});
