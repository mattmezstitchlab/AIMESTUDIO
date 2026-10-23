/* Accessibilité V1 : contrôle automatique WCAG 2.1 AA (axe-core) des pages publiques, sur ordinateur et téléphone,
   après défilement complet (les éléments qui apparaissent au défilement sont contrôlés aussi).
   Échoue (code 1) si une page a une anomalie « critique » ou « sérieuse ». Usage comme parcours.cjs. */
const { chromium } = require('playwright'); const fs = require('fs');
const B = process.env.BASE || 'http://localhost:8771', AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PAGES = ['/', '/exemples/', '/exemples/?u=world', '/exemples/?u=seminaire', '/exemples/?u=g44', '/exemples/?u=stitch', '/exemples/?u=magazine', '/point-zero/', '/aime/', '/cube/', '/bureau/', '/bureau/espace/', '/canevas/', '/reseau/', '/compte/', '/regie/', '/sites/', '/canevas/?publication=exemple-aime-magazine', '/publication/?exemple=aime-magazine', '/maitre/', '/magazine/', '/magazine/edito.html', '/magazine/point-zero.html', '/magazine/metiers.html'];
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); let n = 0;
  for (const [nom, vp] of [['ordinateur', { width: 1440, height: 900 }], ['téléphone', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    for (const u of PAGES) {
      const p = await ctx.newPage(); await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
      for (let y = 0; y < 30; y++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(80); } await p.waitForTimeout(1200);
      await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.filter(x => x.impact === 'critical' || x.impact === 'serious').map(x => x.id + '×' + x.nodes.length + ' (' + x.nodes[0].target.join(' ') + ')'));
      console.log((v.length ? '  ✗ ' : '  ✓ ') + nom + ' ' + u + (v.length ? ' : ' + v.join(', ') : '')); n += v.length; await p.close();
    }
    await ctx.close();
  }
  await b.close(); console.log(n ? '\n' + n + ' anomalie(s) bloquante(s)' : '\naccessibilité : aucune anomalie bloquante'); process.exit(n ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
