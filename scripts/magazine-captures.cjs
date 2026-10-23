/* AIME Magazine : les vrais écrans, capturés avec des DONNÉES FICTIVES, reproductibles.
   Usage : serveur local lancé (PORT=8771 node scripts/serveur-test.cjs), puis
     BASE=http://localhost:8771 [CHROMIUM=/chemin/chromium] node scripts/magazine-captures.cjs
   Écrit magazine/medias/ecran-*.webp (conversion par ImageMagick `convert`). Relancer après un changement d'interface,
   puis `node scripts/magazine.cjs` pour régénérer les pages.
   Jamais de compte, jamais la Régie, jamais de donnée réelle : le projet « Renard d'automne » est inventé ; les références
   DMC sont publiques. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const R = path.join(__dirname, '..'), OUT = path.join(R, 'magazine', 'medias'), TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aime-mag-'));
const B = process.env.BASE || 'http://localhost:8771';
const S = require(R + '/vitrine/rendu.js').site, Br = require(R + '/pointzero/broderie.js'), M = require(R + '/pointzero/modes.js'), MS = require(R + '/pointzero/minisite.js');

function projetFictif() {
  const p = { id: 'renard-automne', type: 'broderie', titre: 'Renard d\'automne', cree: '2026-10-01T09:00:00Z', choix: { largeurCm: 15, usage: 'patron', toile: 'aida14', finesse: 'fidele', couleurs: 'equilibre' }, confirme: { format: true, dmc: true }, ratio: 1.25,
    palette: [{ dmc: '310', nom: 'Noir', hex: '#000000', ecran: '#050505', points: 400 }, { dmc: '720', nom: 'Orange foncé', hex: '#E55C0C', ecran: '#E55C0C', points: 900 }, { dmc: '3865', nom: 'Blanc d\'hiver', hex: '#F9F7F1', ecran: '#F9F7F1', points: 300 }, { dmc: '3371', nom: 'Brun noir', hex: '#1E1108', ecran: '#1E1108', points: 220 }],
    cases: new Uint8Array([1, 2]), dims: { l: 2, h: 1 } };
  p.grille = Br.grille(p.choix, p.ratio); M.decider(p, 'largeurCm', 15, 'Largeur : 15 cm', 'utilisateur'); return MS.depuis(p, { S, B: Br, M });
}
const ECRANS = [
  // [nom, url, largeur, hauteur, préparation dans la page]
  ['ecran-point-zero', '/point-zero/', 1440, 900, null],
  ['ecran-canevas-minisite', '/canevas/?site=SID&projet=renard-automne&de=/point-zero/', 1440, 900, null],
  ['ecran-canevas-design-system', '/canevas/?site=SID&projet=renard-automne&de=/point-zero/', 1440, 900, async p => { await p.click('.cvs-ds-b'); await p.waitForTimeout(400); await p.click('.cvs-ds-o:has(input[value=aime-editorial])'); await p.waitForTimeout(1600); }],
  ['ecran-comparaison', '/canevas/?site=SID&projet=renard-automne&de=/point-zero/', 1440, 900, async p => { await p.click('.cvs-ds-b'); await p.waitForTimeout(400); await p.click('.cvs-ds-o:has(input[value=aime-minimal])'); await p.waitForTimeout(900); await p.click('.cvs-ds-o:has(input[value=aime-editorial])'); await p.waitForTimeout(900); await p.click('[data-a=comparer]'); await p.waitForTimeout(2200); }],
  ['ecran-canevas-mobile', '/canevas/?site=SID&projet=renard-automne&de=/point-zero/', 390, 844, null],
  ['ecran-cube', '/cube/', 1440, 900, null],
  ['ecran-bureau', '/bureau/', 1440, 900, null],
];
(async () => {
  const site = projetFictif(), b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  fs.mkdirSync(OUT, { recursive: true });
  for (const [nom, u, l, h, prep] of ECRANS) {
    const ctx = await b.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: l < 500 ? 2 : 1, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(B + '/canevas/'); await p.evaluate(s => { localStorage.clear(); localStorage.setItem('aime-sites', JSON.stringify({ sites: { [s.id]: s }, cur: s.id })); }, site);
    await p.goto(B + u.replace('SID', site.id), { waitUntil: 'networkidle' }); await p.waitForTimeout(1800); if (prep) await prep(p);
    const png = path.join(TMP, nom + '.png'); await p.screenshot({ path: png });
    execFileSync('convert', [png, '-strip', '-quality', '80', '-define', 'webp:method=6', path.join(OUT, nom + '.webp')]);
    console.log('✓ ' + nom); await ctx.close();
  }
  await b.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
