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
    /* 0. l'accueil public : l'aperçu du Temps se choisit et se zoome, sans compte et sans base */
    console.log('Accueil : choisir un moment, zoomer, revenir');
    const ctxA = await b.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } }), pa = await ctxA.newPage();
    await pa.goto(B + '/', { waitUntil: 'networkidle' });
    await pa.waitForSelector('#tempsDemoMoments button', { timeout: 8000 });
    ok((await pa.locator('#tempsDemoMoments button').count()) === 9, 'accueil : Camille voit 9 moments dans le Programme');
    await pa.getByRole('button', { name: 'Circle', exact: true }).click();
    await pa.waitForSelector('#tempsDemoMomentsCercle button');
    ok((await pa.locator('#tempsDemoSvg .v-td-arc').count()) === 9, 'accueil : Circle dessine les 9 moments de la vue');
    await pa.getByRole('button', { name: /^Cocktail / }).focus(); await pa.keyboard.press('Enter');
    await pa.waitForFunction(() => /Cadran restreint à 15:30 – 19:00/.test(document.querySelector('#tempsDemoLegende').textContent), null, { timeout: 5000 });
    ok(true, 'accueil : choisir « Cocktail » resserre le cadran sur 15:30 – 19:00');
    ok((await pa.locator('#tempsDemoMomentsCercle button[aria-current="true"]').count()) === 1, 'accueil : la légende marque le moment choisi (aria-current)');
    ok(!(await pa.locator('#tempsDemoJour').isHidden()), 'accueil : « Revenir à la journée entière » apparaît');
    ok(/Cocktail · 16:00 – 18:30/.test(await pa.locator('#tempsDemoDetail').innerText()), 'accueil : le détail annonce le moment choisi');
    ok((await pa.locator('#tempsDemoSvg .v-td-arc').count()) < 9, 'accueil : le cadran zoomé ne montre que sa fenêtre');
    await pa.locator('#tempsDemoJour').click();
    await pa.waitForFunction(() => /journée de 24 heures/.test(document.querySelector('#tempsDemoSvgT').textContent), null, { timeout: 5000 });
    ok((await pa.locator('#tempsDemoSvg .v-td-arc').count()) === 9 && await pa.locator('#tempsDemoJour').isHidden(), 'accueil : la journée entière revient, le bouton disparaît');
    await pa.locator('#tempsDemoQui').selectOption('emma');
    await pa.waitForFunction(() => document.querySelectorAll('#tempsDemoMomentsCercle button').length === 5, null, { timeout: 5000 });
    const nomsA = await pa.locator('#tempsDemoMomentsCercle button').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label')));
    ok(!nomsA.some(n => /Installation des prestataires|Point coordination et traiteur|Set acoustique|Démontage/.test(n)), 'accueil (Emma) : seuls ses 5 moments sont proposés');
    ok((await pa.locator('#tempsDemoSvg .v-td-arc').count()) === 5, 'accueil (Emma) : le cadran ne dessine que ses 5 moments');
    await pa.addScriptTag({ content: AXE });
    const vA = await pa.evaluate(async () => (await axe.run(document.querySelector('#temps'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.filter(x => x.impact === 'critical' || x.impact === 'serious').map(x => x.id + ' (' + x.nodes.length + ')'));
    ok(!vA.length, 'accueil, la section Temps : ' + (vA.length ? vA.join(', ') : 'aucune anomalie bloquante'));
    await ctxA.close();
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
    console.log('AI : les programmes actifs sont retrouvables, avec la même vue filtrée');
    const attendusAI = { camille: 9, gabriel: 9, lea: 9, alex: 8, sarah: 8, emma: 5 };
    for (const k of Object.keys(page)) {
      await page[k].goto(B + '/projets/', { waitUntil: 'networkidle' });
      await page[k].waitForSelector('#aTemps:not([hidden]) .ai-temps-carte', { timeout: 8000 });
      const carte = page[k].locator('#aTemps .ai-temps-carte').first(), texteAI = await carte.innerText();
      ok((await carte.locator('.ai-temps-badge').innerText()).includes(String(attendusAI[k])), k + ' : AI montre ' + attendusAI[k] + ' moments visibles, pas un programme élargi');
      ok(/Ouvrir le programme/.test(texteAI) && /Ouvrir Circle/.test(texteAI), k + ' : les deux vues sont directement retrouvables dans AI');
      if (k === 'emma') ok(!/Installation des prestataires|Point coordination|Bars ouverts|prise 16 A/.test(texteAI), 'Emma : AI ne révèle aucun moment ou détail hors de sa vue');
    }
    await page.emma.locator('#aTemps [data-vue-temps="cercle"]').first().click();
    await page.emma.waitForSelector('.tp-arc');
    ok(/page=deroule/.test(page.emma.url()) && /vue=cercle/.test(page.emma.url()), 'AI ouvre Circle dans le projet et garde sa vue dans l\'adresse');
    console.log('Le propriétaire fixe la date du Jour J (migration 08)');
    await page.camille.goto(programme, { waitUntil: 'networkidle' }); await page.camille.waitForSelector('.tp-m');
    const entete = async k => (await page[k].locator('.tp-jour').textContent()).trim();
    ok(/^Jour J$/.test(await entete('camille')), 'Camille : sans date, l’en-tête dit « Jour J »');
    await page.camille.getByRole('button', { name: 'Fixer la date du Jour J' }).click();
    await page.camille.fill('#tpJourChamp', '2027-06-12');
    await page.camille.locator('.tp-jour-f button[type="submit"]').click();
    await page.camille.waitForFunction(() => /12 juin 2027/.test(document.querySelector('.tp-jour').textContent), null, { timeout: 5000 });
    ok(/samedi 12 juin 2027/.test(await entete('camille')), 'Camille : la date s’affiche en toutes lettres (' + (await entete('camille')) + ')');
    await page.emma.goto(programme, { waitUntil: 'networkidle' }); await page.emma.waitForSelector('.tp-m');
    await page.emma.waitForFunction(() => /12 juin 2027/.test(document.querySelector('.tp-jour').textContent), null, { timeout: 5000 });
    ok(true, 'Emma : la même date, sans aucun geste');
    ok((await page.emma.locator('.tp-jour-b, .tp-jour-f').count()) === 0, 'Emma : rien pour fixer la date');
    await page.lea.goto(B + '/projets/', { waitUntil: 'networkidle' });
    await page.lea.waitForSelector('#aTemps:not([hidden]) .ai-temps-carte');
    ok(/12 juin 2027/.test(await page.lea.locator('#aTemps').innerText()), 'AI : la synthèse porte la date du Jour J');
    /* retirée, la date disparaît de l'écran, du cadran et de la synthèse */
    await page.camille.getByRole('button', { name: 'Changer la date' }).click();
    await page.camille.locator('.tp-jour-f button', { hasText: 'Retirer' }).click();
    await page.camille.waitForFunction(() => !/2027/.test(document.querySelector('.tp-jour').textContent), null, { timeout: 5000 });
    ok(true, 'Camille : la date retirée, l’en-tête redit « Jour J »');
    await page.lea.goto(B + '/projets/', { waitUntil: 'networkidle' });
    await page.lea.waitForSelector('#aTemps:not([hidden]) .ai-temps-carte');
    await page.lea.waitForFunction(() => !/2027/.test(document.querySelector('#aTemps').textContent), null, { timeout: 5000 });
    ok(true, 'AI : plus de date quand elle est retirée');
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
      ok(r.titre === DEMO.titre && r.role && r.module === 'Programme' && r.modes.includes('Liste') && r.modes.includes('Circle') && !r.modes.includes('Chronologie'), k + ' : projet « ' + r.titre + ' », participation « ' + r.role + ' », module et ses modes');
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

    console.log('Circle : la même ressource sur un cadran de 24 heures');
    const arcs = async k => page[k].locator('.tp-arc').count(), arc = (k, id) => page[k].locator('.tp-arc[data-id="' + id + '"]');
    /* toucher un arc comme un doigt : au milieu de son tracé (le centre de sa boîte tombe à l'intérieur du cercle) */
    /* le milieu d'un moment à l'écran : son tracé, ou sa pastille quand il est très court */
    const MILIEU = `window.__milieu = i => { const n = document.querySelector('.tp-arc[data-id="' + i + '"] .tp-trait-m, .tp-arc[data-id="' + i + '"] .tp-pastille'), m = n.getScreenCTM();
      const q = n.tagName === 'circle' ? { x: +n.getAttribute('cx'), y: +n.getAttribute('cy') } : n.getPointAtLength(n.getTotalLength() / 2); return { x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f }; };`;
    const toucher = async (k, id) => { await page[k].addScriptTag({ content: MILIEU }); const pt = await page[k].evaluate(i => { document.querySelector('.tp-cadran').scrollIntoView({ block: 'center' }); return window.__milieu(i); }, id); await page[k].mouse.click(pt.x, pt.y); };
    for (const k of ['emma', 'alex', 'lea']) { await page[k].getByRole('button', { name: 'Circle', exact: true }).click(); await page[k].waitForSelector('.tp-arc'); }
    ok(await arcs('emma') === 5 && await arcs('alex') === 8 && await arcs('lea') === 9, 'Circle : 5 arcs pour Emma, 8 pour Alex, 9 pour Léa : exactement leurs vues');
    /* non-régression du noyau radial (PR A) : le cadran dessiné est identique, au caractère près, à celui figé sur la tête de #131
       (iPhone pour Emma et Alex, ordinateur pour Léa). Régénérer : REFERENCE=ecrire, seulement sur un cadran validé. */
    { const F = path.join(__dirname, '..', 'references', 'temps-cadran-dom.json'), dom = {};
      for (const k of ['emma', 'alex', 'lea']) dom[k] = await page[k].locator('.tp-cadran').evaluate(e => e.outerHTML);
      if (process.env.REFERENCE === 'ecrire') { fs.writeFileSync(F, JSON.stringify(dom, null, 1) + '\n'); ok(true, 'référence du cadran écrite'); }
      else { const ref = JSON.parse(fs.readFileSync(F, 'utf8')); for (const k of Object.keys(ref)) ok(dom[k] === ref[k], k + ' : le cadran est identique à la référence d\'avant l\'extraction (' + ref[k].length + ' caractères)'); } }
    ok((await page.emma.locator('.tp-zone').count()) === 0 && (await page.lea.locator('.tp-zone').count()) === 1, 'la conséquence à décider (ambre) seulement chez qui peut décider');
    ok(/décalé de 15 min, prévu 16:00/.test(await arc('emma', 'cocktail').getAttribute('aria-label')), 'Emma : l\'arc du cocktail dit son décalage en mots');
    ok((await page.emma.locator('.tp-cadran').evaluate(e => e.getAttribute('role'))) === 'group' && !(await page.emma.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'Emma (iPhone) : cadran interactif (pas une image), sans défilement horizontal');
    /* un arc ouvre le même panneau que la Liste, avec les mêmes gestes */
    await toucher('lea', 'cocktail'); await page.lea.waitForSelector('.tp-detail .tp-m[data-id="cocktail"]');
    ok((await page.lea.locator('.tp-detail').getByRole('button', { name: 'Décaler « Cocktail » de 15 minutes' }).count()) === 1, 'Léa : l\'arc ouvre le panneau de la Liste, avec ses gestes');
    ok(/vue=cercle/.test(page.lea.url()) && /moment=cocktail/.test(page.lea.url()), 'Léa : le mode et le moment sont dans l\'adresse');
    await toucher('emma', 'cocktail'); await page.emma.waitForSelector('.tp-detail .tp-m');
    ok((await page.emma.locator('.tp-detail button').count()) === 0, 'Emma : le même panneau, sans aucun geste');
    await capture('lea', 'TEMPS__LEA__programme__cercle-cocktail'); if (CAP) { await page.lea.evaluate(() => document.querySelector('.tp-cadran').scrollIntoView({ block: 'center' })); await page.lea.screenshot({ path: path.join(CAP, 'TEMPS__LEA__cercle__ordinateur__cadran.png') }); } await capture('emma', 'TEMPS__EMMA__programme__cercle-cocktail'); await capture('alex', 'TEMPS__ALEX__programme__cercle');
    /* changer de mode garde le moment ; recharger garde tout */
    await page.lea.getByRole('button', { name: 'Liste', exact: true }).click(); await page.lea.waitForSelector('.tp-m.choisi');
    ok((await page.lea.locator('.tp-m.choisi').getAttribute('data-id')) === 'cocktail' && /moment=cocktail/.test(page.lea.url()) && !/vue=/.test(page.lea.url()), 'Léa : en Liste, le cocktail reste choisi');
    await page.lea.getByRole('button', { name: 'Circle', exact: true }).click(); await page.lea.reload({ waitUntil: 'networkidle' }); await page.lea.waitForSelector('.tp-detail .tp-m[data-id="cocktail"]');
    ok(true, 'Léa recharge : Circle et le cocktail sont rouverts depuis l\'adresse');
    /* clavier : flèches de moment en moment, Entrée ouvre */
    await arc('lea', 'cocktail').focus(); await page.lea.keyboard.press('ArrowRight');
    const suivant = await page.lea.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-id'));
    await page.lea.keyboard.press('Enter'); await page.lea.waitForSelector('.tp-detail .tp-m[data-id="' + suivant + '"]');
    ok(suivant === 'set-cocktail', 'Léa au clavier : flèche droite → « ' + suivant + ' », Entrée ouvre son détail');
    /* un geste dans Circle se voit dans la Liste d'une autre personne, et l'inverse */
    await toucher('lea', 'bal'); await page.lea.waitForSelector('.tp-detail .tp-m[data-id="bal"]');
    await page.lea.locator('.tp-detail').getByRole('button', { name: 'Décaler « Ouverture du bal » de 5 minutes' }).click();
    await page.camille.waitForFunction(() => /22:05 – 01:35/.test((document.querySelector('[data-id="bal"]') || {}).innerText || ''), null, { timeout: 6000 }).then(() => ok(true, 'geste dans Circle (Léa) → Liste de Camille : 22:05'), () => ok(false, 'geste dans Circle non propagé'));
    await page.camille.locator('[data-id="discours"]').getByRole('button', { name: 'Décaler « Discours des témoins » de 5 minutes' }).click();
    await page.emma.waitForFunction(() => /21:05 à 21:25/.test((document.querySelector('.tp-arc[data-id="discours"]') || { getAttribute: () => '' }).getAttribute('aria-label') || ''), null, { timeout: 6000 }).then(() => ok(true, 'geste dans la Liste (Camille) → Circle d\'Emma : 21:05'), () => ok(false, 'geste dans la Liste non propagé au cercle'));
    await capture('camille', 'TEMPS__CAMILLE__programme__liste-apres-gestes');

    console.log('Circle sur iPhone : toucher, Dock, en-tête, taille, rotation, légende, date');
    const em = page.emma;
    for (const id of await em.$$eval('.tp-arc', l => l.map(x => x.getAttribute('data-id')))) {
      await toucher('emma', id); await em.waitForSelector('.tp-detail .tp-m[data-id="' + id + '"]', { timeout: 3000 }).then(() => {}, () => {});
      ok((await em.locator('.tp-detail .tp-m').getAttribute('data-id')) === id, 'Emma (iPhone) : un doigt sur « ' + id + ' » ouvre son panneau');
    }
    /* un doigt un peu à côté d'un arc court (le discours : 20 min, couloir intérieur) */
    await em.evaluate(() => document.querySelector('.tp-cadran').scrollIntoView({ block: 'center' })); await em.waitForTimeout(100);   /* le cadran à l'écran avant de viser */
    await em.addScriptTag({ content: MILIEU });
    const pres = await em.evaluate(() => { const o = window.__milieu('discours'), x = o.x, y = o.y, c = document.querySelector('.tp-cadran').getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2, d = Math.hypot(x - cx, y - cy);
      /* on vise 14 px à côté, du côté où aucun autre moment ne se trouve : vers l'extérieur s'il est dans le couloir extérieur, sinon vers l'intérieur */
      const rayons = [...document.querySelectorAll('.tp-arc')].map(g => { const o2 = window.__milieu(g.getAttribute('data-id')); return Math.round(Math.hypot(o2.x - cx, o2.y - cy)); });
      const sens = Math.round(d) >= Math.max(...rayons) - 1 ? 1 : -1;
      return { x: x + sens * (x - cx) / d * 14, y: y + sens * (y - cy) / d * 14 }; });
    await em.mouse.click(pres.x, pres.y); await em.waitForTimeout(150);
    ok((await em.locator('.tp-detail .tp-m').getAttribute('data-id')) === 'discours', 'Emma : un arc de 20 min touché 14 px à côté reste sélectionnable');
    const vue = await em.evaluate(() => { const d = document.querySelector('#dock-site nav.dock').getBoundingClientRect(), p = document.querySelector('.tp-detail').getBoundingClientRect(),
      fixes = [...document.querySelectorAll('body *')].filter(n => { const st = getComputedStyle(n).position; return (st === 'fixed' || st === 'sticky') && n.offsetParent !== null && n.getBoundingClientRect().height > 0 && !n.closest('#dock-site'); }).map(n => n.className || n.tagName);
      const c = document.querySelector('.tp-cadran').getBoundingClientRect(), h = [...document.querySelectorAll('.tp-heure-c')].map(t => t.getBoundingClientRect());
      return { panneau: p.top < d.top, dockBas: Math.round(innerHeight - d.bottom), fixes, tete: getComputedStyle(document.querySelector('.tete')).position, large: c.width / innerWidth, heures: h.every(r => r.left >= 0 && r.right <= innerWidth), deborde: document.documentElement.scrollWidth > innerWidth + 1,
        cle: [...document.querySelectorAll('.tp-cle li')].map(l => l.textContent), jour: (document.querySelector('.tp-jour') || {}).textContent }; });
    ok(vue.panneau, 'Emma : le panneau ouvert apparaît au-dessus du Dock');
    ok(vue.dockBas <= 12 && vue.fixes.length === 0 && vue.tete === 'static', 'Emma : le Dock est la seule zone fixe, en bas (' + vue.dockBas + ' px) ; l\'en-tête défile avec la page' + (vue.fixes.length ? ' — fixes : ' + vue.fixes.join(', ') : ''));
    ok(vue.large >= 0.95 && vue.heures && !vue.deborde, 'Emma : le cadran occupe ' + Math.round(vue.large * 100) + ' % de la largeur, libellés horaires entiers, sans défilement horizontal');
    ok(vue.cle.join('|') === 'horaire prévu', 'Emma : la légende ne nomme que les états présents (' + vue.cle.join(', ') + ')');
    ok(vue.jour === 'Jour J', 'la date du programme est affichée (« Jour J » tant que les moments n\'ont pas de date en base)');
    const cleAlex = await page.alex.$$eval('.tp-cle li', l => l.map(x => x.textContent)); ok(cleAlex.includes('vos moments') && cleAlex.includes('horaire prévu'), 'Alex : la légende ajoute « vos moments » (' + cleAlex.join(', ') + ')');
    await capture('emma', 'TEMPS__EMMA__cercle__iphone-portrait');
    if (CAP) { await em.evaluate(() => document.querySelector('.tp-cadran').scrollIntoView({ block: 'start' })); await em.screenshot({ path: path.join(CAP, 'TEMPS__EMMA__cercle__iphone-portrait__cadran.png') }); }
    /* rotation : paysage, le cadran et le panneau côte à côte, sans débordement */
    await em.setViewportSize({ width: 844, height: 390 }); await em.waitForTimeout(300);
    const pay = await em.evaluate(() => { const c = document.querySelector('.tp-cadran').getBoundingClientRect(), p = document.querySelector('.tp-detail').getBoundingClientRect(); return { cote: c.right <= p.left + 1, haut: c.height <= innerHeight, deborde: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(pay.cote && pay.haut && !pay.deborde, 'Emma tourne son iPhone : cadran et panneau côte à côte, le cadran tient dans la hauteur, sans débordement');
    if (CAP) { await em.evaluate(() => document.querySelector('.tp-cadran').scrollIntoView({ block: 'center' })); await em.screenshot({ path: path.join(CAP, 'TEMPS__EMMA__cercle__iphone-paysage.png') }); }
    await em.setViewportSize({ width: 390, height: 664 }); await em.waitForTimeout(200);

    console.log('Comparaison, historique');
    ok((await page.lea.getByRole('button', { name: 'Comparer les vues' }).count()) === 0, 'Léa : pas de Comparaison');
    await page.camille.getByRole('button', { name: 'Comparer les vues' }).click(); await page.camille.waitForSelector('.tp-comp select option:nth-child(2)', { state: 'attached' });
    const val = await page.camille.locator('.tp-comp select option', { hasText: 'Emma' }).getAttribute('value');
    await page.camille.locator('.tp-comp select').selectOption(val); await page.camille.waitForSelector('.tp-cols');
    const col = await page.camille.locator('.tp-col').nth(1).innerText();
    ok(/5 moments/i.test(col) && /Absent de sa vue/i.test(col), 'Camille compare avec Emma : 5 moments, les absents nommés pour elle seule'); await capture('camille', 'TEMPS__CAMILLE__programme__comparer-emma');
    await page.emma.locator('.tp-hist summary').click(); await page.emma.waitForSelector('.tp-hist-l li');
    const h = await page.emma.locator('.tp-hist-l').innerText();
    ok(/Cocktail/.test(h) && !/importé|Point coordination|Installation/.test(h), 'Emma : l\'historique, réduit à ses moments');

    console.log('Accessibilité (axe-core, WCAG 2.2 AA : les règles 2.0, 2.1 et 2.2)');
    for (const k of ['camille', 'alex', 'emma']) {
      await page[k].addScriptTag({ content: AXE });
      const v = await page[k].evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.filter(x => x.impact === 'critical' || x.impact === 'serious').map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0] && n.any[0].message || '').slice(0, 90)).join(' | ')));
      ok(!v.length, k + ' : ' + (v.length ? v.join(', ') : 'aucune anomalie bloquante'));
    }
    /* Circle lui-même, sur ordinateur (Léa) et sur iPhone (Emma), un moment ouvert : mêmes règles WCAG 2.2 AA */
    for (const k of ['lea', 'emma']) {
      await page[k].goto(programme + '&vue=cercle&moment=cocktail', { waitUntil: 'networkidle' }); await page[k].waitForSelector('.tp-arc'); await page[k].waitForSelector('.tp-detail .tp-m');
      await page[k].addScriptTag({ content: AXE });
      const v = await page[k].evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.filter(x => x.impact === 'critical' || x.impact === 'serious').map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')));
      ok(!v.length, k + ' (Circle, un moment ouvert) : ' + (v.length ? v.join(', ') : 'aucune anomalie bloquante'));
    }
    const verif = await M.verifier(A._pool(), espace); ok(verif.ok, 'le journal rejoué redonne exactement la table (rev ' + verif.rev + ')');
    await A._pool().end();
  } finally { await b.close(); srv.kill(); await pool.end(); }
  console.log(echecs ? '\n' + echecs + ' échec(s)' : '\nparcours Temps : tout est conforme'); process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
