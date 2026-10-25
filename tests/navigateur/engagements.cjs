/* Les engagements d'un projet (V1, PR P6), dans de vrais navigateurs, contre une base PostgreSQL de TEST (jamais la production).
   Le couple (ordinateur) crée un mariage et invite son DJ (iPhone) → « Mon accès » montre les engagements → le + du Dock « Prendre un
   engagement » met le focus dans le formulaire → le couple demande au DJ « Envoyer la playlist » → le DJ le retrouve dans AI
   (« Mes engagements », réponse attendue), l'ouvre, l'accepte puis le déclare tenu → le couple le voit clos. Accessibilité, débordement,
   et aucun identifiant de compte dans les pages.
   Usage : TEST_DATABASE_URL=postgresql://…/aime_test node tests/navigateur/engagements.cjs     (CAPTURES=dossier pour garder les captures) */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const URLT = process.env.TEST_DATABASE_URL; if (!URLT) { console.log('TEST_DATABASE_URL absent : parcours Engagements non lancé'); process.exit(0); }
const PORT = 8797, B = 'http://localhost:' + PORT, LIENS = path.join(os.tmpdir(), 'aime-liens-eng-' + process.pid + '.txt'), CAP = process.env.CAPTURES || null;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const COUPLE = { email: 'camille.eng@exemple.test', nom: 'Camille Fictive' }, DJ = { email: 'alex.eng@exemple.test', nom: 'Alex DJ' };
let echecs = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) echecs++; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pg = require('pg'), pool = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', '') });
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  await pool.query('truncate quotas').catch(() => {});
  try { fs.unlinkSync(LIENS); } catch {}
  const srv = spawn(process.execPath, [path.join(__dirname, '../../scripts/serveur-test.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', AIME_COMPTES_TEST: '1', AIME_LIENS: LIENS }), stdio: 'inherit' });
  process.on('exit', () => { try { srv.kill(); } catch {} });
  await attendre(1200);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let ip = 60;
  const contexte = app => b.newContext(Object.assign({ locale: 'fr-FR', extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.' + (ip++) } }, app));
  async function connecter(ctx, qui, retour) {
    const r = await ctx.request.post(B + '/api/auth/sign-in/magic-link', { data: { email: qui.email, name: qui.nom, callbackURL: retour || '/projets/' }, headers: { origin: B } });
    if (r.status() !== 200) throw new Error('lien magique ' + qui.email + ' : ' + r.status());
    await attendre(150);
    const lien = fs.readFileSync(LIENS, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.to === qui.email).pop().lien;
    const p = await ctx.newPage(); await p.goto(lien, { waitUntil: 'networkidle' }); return p;
  }
  const axe = async (p, nom) => { await p.addScriptTag({ content: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')));
    ok(!v.length, nom + ' : aucune anomalie WCAG 2.2 AA' + (v.length ? ' — ' + v.join(', ') : '')); };
  const large = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const ecran = async (p, nom, sel) => { if (!CAP) return; fs.mkdirSync(CAP, { recursive: true }); const o = { path: path.join(CAP, nom + '.png') }; if (sel) await p.locator(sel).screenshot(o); else await p.screenshot(Object.assign(o, { fullPage: true })); };
  const sansIdentifiant = async (p, nom) => { const ids = (await pool.query('select id from "user"')).rows.map(r => r.id), html = await p.content(); ok(!ids.some(id => html.includes(id)), nom + ' : aucun identifiant de compte dans la page'); };
  try {
    console.log('1. Le couple crée son mariage et invite son DJ, qui rejoint le projet');
    const bur = await contexte({ viewport: { width: 1280, height: 860 } }), pc = await connecter(bur, COUPLE);
    const cr = await (await bur.request.post(B + '/api/espaces', { data: { action: 'creer', titre: 'Mariage de Camille', modele: 'mariage' }, headers: { origin: B } })).json();
    const inv = await (await bur.request.post(B + '/api/espaces', { data: { action: 'inviter', espace: cr.id, role: 'contributor', relation: 'DJ', email: DJ.email }, headers: { origin: B } })).json();
    const tel = await contexte(devices['iPhone 13']), pd = await connecter(tel, DJ);
    const rj = await tel.request.post(B + '/api/espaces', { data: { action: 'rejoindre', jeton: new URL(inv.lien).searchParams.get('invitation') }, headers: { origin: B } });
    ok(rj.status() === 200, 'le DJ a rejoint le projet');

    console.log('2. « Mon accès » du couple : les engagements, et le + du Dock « Prendre un engagement »');
    await pc.goto(B + '/projets/?espace=' + cr.id, { waitUntil: 'networkidle' }); await pc.waitForSelector('.p-engagements', { timeout: 8000 });
    await pc.waitForFunction(() => /Aucun engagement en cours/.test(document.querySelector('.p-engagements').textContent), null, { timeout: 6000 });
    ok(true, 'la section Engagements est là, vide');
    await pc.click('#dock-site .dock-plus'); await pc.waitForTimeout(300);
    const gm = await pc.evaluate(() => [...document.querySelectorAll('#dock-site .dock-menu .dock-g')].map(a => a.textContent.trim()).join(' · '));
    ok(/Prendre un engagement/.test(gm), 'le + du couple : ' + gm);
    await pc.click('#dock-site .dock-menu .dock-g:has-text("Prendre un engagement")');
    await pc.waitForFunction(() => document.activeElement && document.activeElement.id === 'pEngTitre', null, { timeout: 5000 });
    ok(true, '« Prendre un engagement » : le focus est dans le formulaire');
    await pc.fill('#pEngTitre', 'Envoyer la playlist du bal'); await pc.selectOption('#pEngDe', { label: 'Alex DJ' });
    const ech = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10); await pc.fill('#pEngDate', ech);
    ok(await large(pc) <= 1, 'Mon accès sur ordinateur : aucun défilement horizontal'); await axe(pc, 'Mon accès, engagements (ordinateur)'); await ecran(pc, 'ENG__1-couple-formulaire', '.p-engagements');
    await pc.click('#pEngagement button[type=submit]');
    await pc.waitForFunction(() => /attend la réponse/.test(document.getElementById('pVivant').textContent), null, { timeout: 6000 });
    await pc.waitForFunction(() => /Envoyer la playlist du bal/.test(document.querySelector('.p-engagements').textContent), null, { timeout: 6000 });
    ok(/En attente de réponse/.test(await pc.locator('.p-engagements').innerText()), 'demandé : en attente de la réponse du DJ');
    const en = (await pool.query("select etat, de_qui from engagements where titre = 'Envoyer la playlist du bal'")).rows[0];
    ok(en && en.etat === 'propose', 'en base : proposé');

    console.log('3. Le DJ (iPhone) le retrouve dans AI, l\'ouvre, l\'accepte puis le déclare tenu');
    await pd.goto(B + '/projets/', { waitUntil: 'networkidle' }); await pd.waitForSelector('#aEngagements:not([hidden]) .dm', { timeout: 8000 });
    const ai = await pd.locator('#aEngagements').innerText();
    ok(/Envoyer la playlist du bal/.test(ai) && /Mariage de Camille/.test(ai) && /Réponse attendue/.test(ai), 'AI : « Mes engagements », le projet et « Réponse attendue »');
    ok(await large(pd) <= 1, 'AI sur iPhone : aucun défilement horizontal'); await axe(pd, 'AI, mes engagements (iPhone)'); await sansIdentifiant(pd, 'AI du DJ'); await ecran(pd, 'ENG__2-dj-ai');
    await pd.click('#aEngagements .dm'); await pd.waitForSelector('.p-engagements button:has-text("Accepter")', { timeout: 8000 });
    ok(true, 'un toucher ouvre le projet, à « Mon accès »');
    await pd.click('.p-engagements button:has-text("Accepter")');
    await pd.waitForFunction(() => /Engagement accepté/.test(document.getElementById('pVivant').textContent), null, { timeout: 6000 });
    await pd.waitForSelector('.p-engagements button:has-text("Marquer comme tenu")', { timeout: 6000 });
    ok(/En cours/.test(await pd.locator('.p-engagements').innerText()), 'accepté : en cours');
    await axe(pd, 'Mon accès, engagement accepté (iPhone)'); await sansIdentifiant(pd, 'Mon accès du DJ'); ok(await large(pd) <= 1, 'Mon accès sur iPhone : aucun défilement horizontal'); await ecran(pd, 'ENG__3-dj-projet');
    await pd.click('.p-engagements button:has-text("Marquer comme tenu")');
    await pd.waitForFunction(() => /tenu : c'est noté/.test(document.getElementById('pVivant').textContent), null, { timeout: 6000 });
    ok((await pool.query("select etat from engagements where titre = 'Envoyer la playlist du bal'")).rows[0].etat === 'tenu', 'en base : tenu');

    console.log('4. Le couple le voit clos ; son journal le dit, sans le texte');
    await pc.reload({ waitUntil: 'networkidle' }); await pc.waitForSelector('.p-engagements details', { timeout: 8000 });
    ok(/Engagements clos \(1\)/.test(await pc.locator('.p-engagements').innerText()), 'clos (1)');
    const j = await (await bur.request.get(B + '/api/page?espace=' + cr.id + '&gabarit=journal')).json();
    const t = j.blocs.map(x => x.texte).join(' | ');
    ok(/Alex DJ a tenu un engagement/.test(t) && !/playlist/.test(t), 'journal : « Alex DJ a tenu un engagement », jamais le texte');
  } catch (e) { echecs++; console.error(e); }
  await b.close(); await pool.end(); try { srv.kill(); } catch {}
  console.log(echecs ? '\nparcours Engagements : ' + echecs + ' échec(s)' : '\nparcours Engagements : tout est vert');
  process.exit(echecs ? 1 : 0);
})();
