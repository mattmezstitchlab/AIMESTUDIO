/* Phase B : la révélation du Monde AIME ; le timbre entre dans le titre. */
const assert=require('assert'),fs=require('fs'),path=require('path');const lire=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0;const t=(nom,f)=>{f();n++};
t('la révélation se branche sur la porte et ne bloque jamais',()=>{const r=lire('porte/revelation.js'),p=lire('porte/porte.js');assert.ok(/P\.revelation=function/.test(r));assert.ok(/setTimeout\(partir,2600\)/.test(p),'départ garanti');assert.ok(/RM\)\{h\.classList\.add\('rv-leve'\);return setTimeout\(ok,120\)/.test(r),'mouvement réduit : immédiat');
 for(const f of ['index.html','point-zero/index.html','bureau/index.html'])assert.ok(lire(f).includes('/porte/revelation.js'),f)});
t('le rideau ne soulève que la partie visible, et le voile se dissipe à l\'arrivée',()=>{const c=lire('porte/revelation.css');assert.ok(/clip-path:inset\(var\(--rv-y/.test(c));assert.ok(/html\.rv-arrivee::after[^}]*animation:rv-dissipe/.test(c));assert.ok(/prefers-reduced-motion/.test(c))});
t('Le Monde AIME : voile dès le premier rendu, titre et cube inchangés',()=>{const a=lire('aime/index.html');assert.ok(/<head>\n<meta charset="utf-8">\n<script>if\(\/\[\?&\]\(depuis=porte\|demo=timbre\)\//.test(a));
 assert.ok(a.includes('<h1 class="h0t" id="h0t" aria-label="Le monde AIME"><span aria-hidden="true">Le m<span class="hcube" id="hcube"><span class="hc3" id="hc3"></span></span>nde</span>'),'titre intact');assert.ok(a.includes('/porte/arrivee.js'))});
t('arrivée : seulement avec un timbre confirmé, ou en démonstration dite comme telle ; adresse nettoyée ; découverte du Monde AIME',()=>{const a=lire('porte/arrivee.js');assert.ok(/u&&i\.timbre\?/.test(a),'timbre confirmé exigé');assert.ok(/demo-camille/.test(a)&&/Démonstration/.test(a));
 assert.ok(/history\.replaceState/.test(a));assert.ok(a.includes("'/aime/#story2'"));assert.ok(!a.includes("Aller au Bureau"));assert.ok(!/email/.test(a),'aucune adresse affichée')});
console.log('révélation : '+n+' tests ok');
