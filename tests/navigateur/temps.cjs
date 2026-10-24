/* Le parcours de démonstration du module Temps, de bout en bout, dans de vrais navigateurs : six personnes, six sessions,
   le même projet, la même ressource (une base PostgreSQL de TEST), le même Dock. Prouve la phase fondatrice (docs/TEMPS.md § 6) :
   chacun voit sa vue ; Léa décale le cocktail ; les autres écrans changent sans rechargement ; la proposition, la confirmation,
   la Comparaison, l'historique ; le rechargement garde la modification ; aucune anomalie d'accessibilité bloquante.
   Usage (jamais contre la production) :
     TEST_DATABASE_URL=postgresql://…/aime_test node tests/navigateur/temps.cjs     (CAPTURES=dossier pour garder les captures) */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const URLT = process.env.TEST_DATABASE_URL; if (!URLT) { console.log('TEST_DATABASE_URL absent : parcours Temps non lancé'); process.exit(0); }
const PORT = 8790, B = 'http://localhost:' + PORT, LIENS = path.join(os.tmpdir(), 'aime-liens-' + process.pid + '.txt'), CAP = process.env.CAPTURES || null;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'), DEMO = require('../../modules/temps/demo-camille-gabriel.json');
const APPAREILS = { camille: { viewport: { width: 1440, height: 900 } }, gabriel: { viewport: { width: 1440, height: 900 } }, lea: { viewport: { width: 1440, height: 900 } },
  alex: devices['iPhone 13'], sarah: devices['iPad Mini'], emma: devices['iPhone 13'] };
let echecs = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) echecs++; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pg = require('pg'), pool = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', '') });
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade'); await pool.query('truncate quotas').catch(() => {});
  try { fs.unlinkSync(LIENS); } catch {}
  const srv = spawn(process.execPath, [path.join(__dirname, '../../scripts/serveur-test.cjs')], { env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', AIME_COMPTES_TEST: '1', AIME_LIENS: LIENS }), stdio: 'inherit' });
  process.on('exit', () => { try { srv.kill(); } catch {} });   /* jamais de serveur orphelin, même après un échec */
  await attendre(1200);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = {}, page = {};
  try {
    /* 1. six vraies sessions, par lien magique (les liens sont écrits dans un fichier par le serveur de test) */
    for (const p of DEMO.personnes) {
      ctx[p.cle] = await b.newContext(Object.assign({ locale: 'fr-FR', extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.' + (10 + DEMO.personnes.indexOf(p)) } }, APPAREILS[p.cle]));   /* une adresse par personne (limites de Better Auth) */
      const r = await ctx[p.cle].request.post(B + '/api/auth/sign-in/magic-link', { data: { email: p.email, name: p.nom, callbackURL: '/projets/' }, headers: { origin: B } });
      if (r.status() !== 200) throw new Error('lien magique ' + p.cle + ' : ' + r.status());
      await attendre(150);
      const lien = fs.readFileSync(LIENS, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.to === p.email).pop().lien;
      page[p.cle] = await ctx[p.cle].newPage(); await page[p.cle].goto(lien, { waitUntil: 'networkidle' });
      await pool.query('update "user" set name = $1 where email = $2', [p.nom, p.email]);
    }
    /* 2. le projet de démonstration, semé par le même code que scripts/temps-demo.mjs */
    process.env.DATABASE_URL = URLT; process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'x'.repeat(40); delete process.env.VERCEL_ENV;
    const A = await import('../../api/_auth/auth.mjs'), M = await import('../../api/_temps/moteur.mjs'); A.auth();
    const comptes = {}; for (const p of DEMO.personnes) comptes[p.cle] = (await pool.query('select id, email from "user" where email = $1', [p.email])).rows[0];
    const { espace } = await M.semerDemo(A._pool(), DEMO, comptes);
    const programme = B + '/projets/?espace=' + espace + '&page=deroule';
    const capture = async (k, nom) => { if (CAP) { fs.mkdirSync(CAP, { recursive: true }); await page[k].screenshot({ path: path.join(CAP, nom + '.png'), fullPage: true });
      const y = await page[k].evaluate(() => scrollY); await page[k].evaluate(() => scrollTo(0, 0)); await page[k].screenshot({ path: path.join(CAP, nom + '__ecran.png') }); await page[k].evaluate(v => scrollTo(0, v), y); } };   /* la page entière, et ce que l'écran montre (Dock compris) */
    const texte = k => page[k].locator('#pCorps').innerText();
    for (const k of Object.keys(page)) { await page[k].goto(programme, { waitUntil: 'networkidle' }); await page[k].waitForSelector('.tp-m', { timeout: 8000 }); }

    console.log('Vues de départ');
    ok((await page.camille.locator('.tp-m').count()) === 9, 'Camille : 9 moments');
    ok((await page.alex.locator('.tp-m').count()) === 8 && !/Point coordination/.test(await texte('alex')), 'Alex : 8 moments, pas le point de l\'organisation');
    ok((await page.emma.locator('.tp-m').count()) === 5, 'Emma : 5 moments publics');
    ok(!/Bars ouverts|prise 16 A/.test(await texte('emma')), 'Emma : aucune consigne d\'équipe');
    ok((await page.emma.locator('.tp-act button').count()) === 0, 'Emma : aucun geste');
    ok((await page.alex.locator('[data-id="cocktail"] .tp-act button').count()) === 0 && (await page.alex.locator('[data-id="set-cocktail"] .tp-act button').count()) > 0, 'Alex : ses moments seulement');
    for (const k of ['camille', 'lea', 'emma']) { const d = await page[k].locator('#dock-site').innerText(); ok(/Programme/.test(d), k + ' : le Dock du site, avec « Programme »'); }
    for (const k of Object.keys(page)) await capture(k, 'TEMPS__' + k.toUpperCase() + '__programme__depart');

    console.log('Une seule navigation générale : le Dock');
    for (const k of Object.keys(page)) {
      const r = await page[k].evaluate(() => ({ onglets: [...document.querySelectorAll('.p-onglets')].filter(n => n.offsetParent).length,
        navs: [...document.querySelectorAll('main nav')].filter(n => n.offsetParent).length, dock: !!document.querySelector('#dock-site nav.dock'),
        titre: document.querySelector('#tTitre').textContent, role: document.querySelector('#tSous').textContent, module: (document.querySelector('#pTitre') || {}).textContent,
        fond: getComputedStyle(document.querySelector('.cpt-fond')).display, modes: [...document.querySelectorAll('.tp-modes button')].map(b => b.textContent) }));
      ok(r.onglets === 0 && r.navs === 0 && r.dock, k + ' : aucune rangée d\'onglets, le Dock seul');
      ok(r.titre === DEMO.titre && r.role && r.module === 'Programme' && r.modes.includes('Liste') && r.modes.includes('Chronologie'), k + ' : projet « ' + r.titre + ' », participation « ' + r.role + ' », module et ses modes');
      ok(r.fond === 'none', k + ' : pas de photo derrière la zone de travail');
    }
    /* clavier, retour du navigateur, lien direct */
    const cam = page.camille, dockLieu = n => cam.locator('#dock-site nav.dock').getByRole('link', { name: n }).or(cam.locator('#dock-site nav.dock').getByRole('button', { name: n })).first();
    await dockLieu('Journal').focus(); await cam.keyboard.press('Enter');
    await cam.waitForFunction(() => document.querySelector('#pTitre') && document.querySelector('#pTitre').textContent === 'Journal');
    ok(/page=journal/.test(cam.url()) && await cam.evaluate(() => document.activeElement && document.activeElement.id === 'pTitre'), 'Camille : le Dock au clavier ouvre le Journal, le focus va au titre de la page');
    await cam.goBack(); await cam.waitForSelector('.tp-m');
    ok(/page=deroule/.test(cam.url()) && (await cam.locator('#pTitre').textContent()) === 'Programme', 'Camille : le retour du navigateur revient au Programme');
    await cam.goForward(); await cam.waitForFunction(() => document.querySelector('#pTitre') && document.querySelector('#pTitre').textContent === 'Journal');
    ok(true, 'Camille : l\'avance du navigateur rouvre le Journal');
    await cam.goto(B + '/projets/?espace=' + espace + '&page=personnes', { waitUntil: 'networkidle' }); await cam.waitForFunction(() => document.querySelector('#pTitre') && document.querySelector('#pTitre').textContent === 'Personnes');
    ok(true, 'lien direct vers Personnes');
    ok(await cam.evaluate(() => [...document.querySelectorAll('#dock-site nav.dock [aria-current="page"]')].some(n => /Personnes/.test(n.textContent))), 'le Dock marque la page en cours (aria-current)');
    await cam.goto(programme, { waitUntil: 'networkidle' }); await cam.waitForSelector('.tp-m');
    /* iPhone : rien sous le Dock en bas de page, pas de défilement horizontal */
    for (const k of ['emma', 'alex']) {
      const r = await page[k].evaluate(async () => { scrollTo(0, document.documentElement.scrollHeight); await new Promise(f => setTimeout(f, 300));
        const d = document.querySelector('#dock-site nav.dock').getBoundingClientRect(), h = document.querySelector('.tp-hist').getBoundingClientRect(), m = [...document.querySelectorAll('.tp-m')].pop().getBoundingClientRect();
        return { sous: Math.max(h.bottom, m.bottom) - d.top, large: document.documentElement.scrollWidth - innerWidth }; });
      ok(r.sous <= 0 && r.large <= 1, k + ' (iPhone) : le dernier moment et l\'historique restent au-dessus du Dock (' + Math.round(r.sous) + ' px), sans défilement horizontal');
    }
    /* repli : sans le Dock universel (script absent), la rangée d'onglets revient et chaque page reste atteignable */
    const sans = await b.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 900 }, storageState: await ctx.lea.storageState(), extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.40' } });
    await sans.route('**/dock/dock.js', r => r.abort());
    const ps = await sans.newPage(); await ps.goto(programme, { waitUntil: 'networkidle' }); await ps.waitForSelector('.tp-m');
    const liens = await ps.locator('.p-onglets a').allTextContents();
    ok(['Mon accès', 'Journal', 'Programme', 'Personnes'].every(n => liens.includes(n)), 'sans Dock : les quatre pages restent atteignables (' + liens.join(', ') + ')');
    await ps.locator('.p-onglets a', { hasText: 'Journal' }).click(); await ps.waitForFunction(() => document.querySelector('#pTitre').textContent === 'Journal');
    ok(true, 'sans Dock : le repli ouvre le Journal'); await sans.close();

    console.log('Léa décale le cocktail de 15 minutes');
    await page.lea.getByRole('button', { name: 'Décaler « Cocktail » de 15 minutes' }).click();
    await page.lea.waitForFunction(() => /16:15 – 18:45/.test(document.querySelector('#pCorps').innerText), null, { timeout: 5000 });
    ok(true, 'Léa : 16:15 – 18:45');
    const t0 = Date.now();
    for (const k of ['camille', 'gabriel', 'alex', 'sarah', 'emma']) {
      try { await page[k].waitForFunction(() => /16:15 – 18:45/.test(document.querySelector('#pCorps').innerText), null, { timeout: 6000 }); ok(true, k + ' : vu sans recharger (' + Math.round((Date.now() - t0) / 100) / 10 + ' s)'); }
      catch { ok(false, k + ' : le changement n\'est pas arrivé'); }
    }
    ok(/prévu 16:00/.test(await texte('emma')), 'Emma : l\'heure prévue reste lisible');
    ok(/18:30 – 21:30/.test(await page.emma.locator('[data-id="diner"]').innerText()), 'le dîner n\'a pas bougé tout seul');
    await page.lea.waitForSelector('.tp-props'); ok(/Dîner/.test(await page.lea.locator('.tp-props').innerText()), 'Léa : le dîner est une proposition à décider');
    await page.sarah.waitForSelector('.tp-confirmer'); ok(/Cocktail/.test(await page.sarah.locator('.tp-confirmer').innerText()), 'Sarah : nouvel horaire à confirmer');
    ok((await page.alex.locator('.tp-props').count()) === 0 && (await page.emma.locator('.tp-props').count()) === 0, 'aucune proposition à qui ne peut pas décider');
    for (const k of Object.keys(page)) await capture(k, 'TEMPS__' + k.toUpperCase() + '__programme__apres-decalage');

    console.log('Confirmation, refus, persistance');
    await page.sarah.getByRole('button', { name: /Confirmer le nouvel horaire de « Cocktail »/ }).click();
    await page.sarah.waitForFunction(() => !document.querySelector('.tp-confirmer'), null, { timeout: 5000 }); ok(true, 'Sarah a confirmé');
    const refus = await page.emma.evaluate(async e => (await fetch('/api/temps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'geste', espace: e, geste: { action: 'retarder', p: { moment: 'cocktail', minutes: 60 } }, rev: 99 }) })).status, espace);
    ok(refus === 403, 'Emma force un geste à la main : refusé par le serveur (' + refus + ')');
    await page.emma.reload({ waitUntil: 'networkidle' }); await page.emma.waitForSelector('.tp-m');
    ok(/16:15 – 18:45/.test(await texte('emma')), 'Emma recharge : la modification est toujours là');

    console.log('Chronologie, Comparaison, historique');
    await page.alex.getByRole('button', { name: 'Chronologie' }).click(); await page.alex.waitForSelector('.tp-bloc');
    ok((await page.alex.locator('.tp-bloc').count()) === 8, 'Alex : la même ressource en chronologie'); await capture('alex', 'TEMPS__ALEX__programme__chronologie');
    ok((await page.lea.getByRole('button', { name: 'Comparer les vues' }).count()) === 0, 'Léa : pas de Comparaison');
    await page.camille.getByRole('button', { name: 'Comparer les vues' }).click(); await page.camille.waitForSelector('.tp-comp select option:nth-child(2)', { state: 'attached' });
    const val = await page.camille.locator('.tp-comp select option', { hasText: 'Emma' }).getAttribute('value');
    await page.camille.locator('.tp-comp select').selectOption(val); await page.camille.waitForSelector('.tp-cols');
    const col = await page.camille.locator('.tp-col').nth(1).innerText();
    ok(/5 moments/i.test(col) && /Absent de sa vue/i.test(col), 'Camille compare avec Emma : 5 moments, les absents nommés pour elle seule'); await capture('camille', 'TEMPS__CAMILLE__programme__comparer-emma');
    await page.emma.locator('.tp-hist summary').click(); await page.emma.waitForSelector('.tp-hist-l li');
    const h = await page.emma.locator('.tp-hist-l').innerText();
    ok(/Cocktail/.test(h) && !/importé|Point coordination|Installation/.test(h), 'Emma : l\'historique, réduit à ses moments');

    console.log('Accessibilité (axe-core, WCAG 2.1 AA)');
    for (const k of ['camille', 'alex', 'emma']) {
      await page[k].addScriptTag({ content: AXE });
      const v = await page[k].evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.filter(x => x.impact === 'critical' || x.impact === 'serious').map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0] && n.any[0].message || '').slice(0, 90)).join(' | ')));
      ok(!v.length, k + ' : ' + (v.length ? v.join(', ') : 'aucune anomalie bloquante'));
    }
    const verif = await M.verifier(A._pool(), espace); ok(verif.ok, 'le journal rejoué redonne exactement la table (rev ' + verif.rev + ')');
    await A._pool().end();
  } finally { await b.close(); srv.kill(); await pool.end(); }
  console.log(echecs ? '\n' + echecs + ' échec(s)' : '\nparcours Temps : tout est conforme'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
