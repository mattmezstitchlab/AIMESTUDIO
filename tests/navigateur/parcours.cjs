/* Parcours V1 dans un vrai navigateur (ordinateur, téléphone, mouvement réduit), sur le serveur de test.
   Échoue (code 1) à la première rupture. Usage : node scripts/serveur-test.cjs & node tests/navigateur/parcours.cjs
   Variables : BASE (défaut http://localhost:8771), CHROMIUM (chemin d'un Chromium, sinon celui de Playwright). */
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://localhost:8771';
const echecs = [], ok = (c, m) => { if (!c) echecs.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const IGNORE = /fonts\.g|Failed to load resource|Blocked script execution|net::ERR/;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  for (const [n, vp, rm] of [['ordinateur', { width: 1440, height: 900 }, false], ['téléphone', { width: 390, height: 844 }, false], ['mouvement réduit', { width: 1280, height: 800 }, true]]) {
    console.log('— ' + n);
    const ctx = await b.newContext({ viewport: vp, reducedMotion: rm ? 'reduce' : 'no-preference', isMobile: n === 'téléphone', hasTouch: n === 'téléphone' });
    const p = await ctx.newPage(), err = [];
    p.on('pageerror', e => err.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) err.push(m.text()); });
    const deborde = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    // pages principales : chargées, sans erreur, sans débordement
    for (const u of ['/', '/point-zero/', '/aime/', '/bureau/', '/bureau/espace/', '/cube/', '/canevas/', '/reseau/', '/compte/']) {
      await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); ok(!(await deborde()), u + ' sans débordement horizontal');
    }
    // le dock : Réseau et Canevas ; ni ancien générateur ni Régie pour le public
    await p.goto(B + '/bureau/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
    const dock = await p.$$eval('#dockApps [data-app]', a => a.map(x => x.dataset.app));
    ok(dock.includes('reseau') && dock.includes('canevas'), 'dock : Réseau et Canevas'); ok(!dock.includes('sites'), 'dock : pas l\'ancien générateur');
    // l'ancien Bureau (« aime-os ») survit à l'ouverture et à la fermeture d'une fenêtre
    const ANCIEN = JSON.stringify({ folders: [{ id: 'f1', n: 'Mariage' }], memos: ['penser au sax'], me: { nom: 'Matt' } });
    await p.evaluate(v => localStorage.setItem('aime-os', v), ANCIEN);
    await p.goto(B + '/bureau/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    await p.click('#dockApps [data-app="canevas"]').catch(() => {}); await p.waitForTimeout(800);
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(500);
    const garde = await p.evaluate(() => ({ a: localStorage.getItem('aime-os'), v2: localStorage.getItem('aime-os-v2') }));
    ok(garde.a === ANCIEN, 'ancien Bureau : « aime-os » intact après une fenêtre ouverte');
    ok(!!garde.v2 && /fenetres/.test(garde.v2), 'OS : son état vit sous « aime-os-v2 »');
    await p.evaluate(() => { localStorage.removeItem('aime-os'); localStorage.removeItem('aime-os-v2') });
    // Point Zéro : une photo devient un projet (image dessinée dans la page, déposée comme un fichier)
    await p.goto(B + '/point-zero/', { waitUntil: 'networkidle' });
    ok(await p.$eval('[data-donnees]', e => /ce navigateur/.test(e.textContent) && !!e.querySelector('a[href="/bureau/espace/"]')).catch(() => false), 'Point Zéro : la mention « où sont mes données » est visible');
    await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 240; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#F3E9D8'; g.fillRect(0, 0, 240, 300); g.fillStyle = '#D2691E'; g.beginPath(); g.moveTo(120, 50); g.lineTo(200, 230); g.lineTo(40, 230); g.fill();
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'renard.png', { type: 'image/png' })); const i = document.querySelector('input[type=file]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); });
    // les confirmations arrivent au rythme de l'orbe : on attend chacune (au plus 20 s), puis on confirme
    const CONF = /^(Confirmer|Valider)/;
    for (let k = 0; k < 8; k++) {
      const h = await p.waitForFunction(re => [...document.querySelectorAll('button')].some(x => x.offsetParent && new RegExp(re).test(x.textContent.trim())) || [...document.querySelectorAll('a,button')].some(x => x.offsetParent && /Modifier dans le Canevas/.test(x.textContent)), CONF.source, { timeout: 20000 }).catch(() => null);
      if (!h) break; const fini = await p.evaluate(() => [...document.querySelectorAll('a,button')].some(x => x.offsetParent && /Modifier dans le Canevas/.test(x.textContent))); if (fini) break;
      await p.evaluate(re => { const x = [...document.querySelectorAll('button')].find(x => x.offsetParent && new RegExp(re).test(x.textContent.trim())); x && x.click(); }, CONF.source); await p.waitForTimeout(600);
    }
    const lien = await p.$('a:has-text("Modifier dans le Canevas"), button:has-text("Modifier dans le Canevas")'); ok(!!lien, 'Point Zéro : le projet propose « Modifier dans le Canevas »');
    if (lien) { await lien.evaluate(e => e.click()); await p.waitForURL(/\/canevas\/\?site=/, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(2500); ok(/Mini-site/.test(await p.textContent('body')), 'Canevas : le mini-site du projet est ouvert'); }
    // Design System (démonstration) : une direction en un clic, contenu identique, annulation, puis l'aperçu du projet relit le choix
    if (lien && await p.$('.cvs-ds-b')) {
      const ds = await p.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); 
        document.querySelector('.cvs-ds-b').click(); await w(500); const r = [...document.querySelectorAll('.cvs-ds input')].map(i => i.value);
        const lu = () => (document.querySelector('.cvs-if').contentDocument.querySelector('style').textContent.match(/--c1:[^;]+/) || [''])[0];
        const avant = lu(); document.querySelector('.cvs-ds input[value=aime-editorial]').click(); await w(1200); const apres = lu();
        document.querySelector('[data-a=annuler]').click(); await w(1000); const annule = lu();
        document.querySelector('.cvs-ds input[value=aime-editorial]').click(); await w(1000);
        const b = [...document.querySelectorAll('.cvs-barre button')].find(x => /Enregistrer/.test(x.textContent)); if (b) b.click(); await w(400);
        return { r, avant, apres, annule, dit: document.querySelector('.cvs-ds-dit').textContent }; });
      ok(ds.r.length === 5 && ds.apres === '--c1:#99472C' && ds.annule === ds.avant, 'Canevas : Design System Éditorial appliqué puis annulé (' + ds.avant + ' → ' + ds.apres + ' → ' + ds.annule + ')');
      ok(/contenu n'a pas changé/.test(ds.dit), 'Canevas : le contenu reste identique');
      const pid = new URL(p.url()).searchParams.get('projet');
      await p.goto(B + '/projet/?id=' + encodeURIComponent(pid), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
      const c1 = await p.evaluate(() => { const f = document.getElementById('site'); return f && f.srcdoc ? (f.srcdoc.match(/--c1:[^;]+/) || [''])[0] : ''; });
      ok(c1 === '--c1:#99472C', 'Projet : l\'aperçu montre le Design System enregistré (' + c1 + ')');
    }
    // Réseau : la carte du projet, puis un module ajouté après les sept vérifications
    await p.goto(B + '/reseau/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    ok((await p.$$('.rx-carte')).length > 0, 'Réseau : la carte du projet');
    await p.click('[role=tab]:nth-child(5)'); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => { const w = ms => new Promise(x => setTimeout(x, ms)); const c = document.querySelector('.rx-carte'); [...c.querySelectorAll('button')].find(b => /Ajouter/.test(b.innerText)).click(); await w(1200);
      const v = [...document.querySelectorAll('.rx-ver li')].map(l => l.className); const conf = [...document.querySelectorAll('.rx-voile button')].find(b => /Confirmer/.test(b.innerText)); if (conf) conf.click(); await w(800); return v; });
    ok(r.length === 7 && r.every(x => x === 'ok'), 'Réseau : sept vérifications au vert avant l\'ajout');
    ok(err.length === 0, 'aucune erreur JavaScript' + (err.length ? ' : ' + err.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(echecs.length ? '\n' + echecs.length + ' échec(s)' : '\nparcours : tout est vert'); process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
