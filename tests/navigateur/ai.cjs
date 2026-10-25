/* AI, mon environnement : le premier parcours réel, de bout en bout, dans de vrais navigateurs et contre une base PostgreSQL de TEST.
   Un visiteur envoie une demande depuis le formulaire Contact ; le propriétaire du site se connecte (lien magique), la retrouve dans AI,
   l'ouvre, revient en arrière ; ouvre et change de projet sans rechargement, sans qu'aucune donnée d'un projet ne reste dans l'autre,
   même quand le réseau répond dans le désordre ; une personne invitée n'a ni « À traiter » ni accès aux demandes.
   Comptes et données fictifs (adresses exemple.test) ; jamais la production.
   Usage : TEST_DATABASE_URL=postgresql://…/aime_test node tests/navigateur/ai.cjs     (CAPTURES=dossier pour garder les captures) */
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const URLT = process.env.TEST_DATABASE_URL; if (!URLT) { console.log('TEST_DATABASE_URL absent : parcours AI non lancé'); process.exit(0); }
const PORT = 8792, B = 'http://localhost:' + PORT, LIENS = path.join(os.tmpdir(), 'aime-liens-ai-' + process.pid + '.txt'), CAP = process.env.CAPTURES || null;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PROPRIO = { id: 'proprio-test-ai-0001', email: 'proprietaire.ai@exemple.test', nom: 'Matt Test' }, MEMBRE = { email: 'invitee.ai@exemple.test', nom: 'Inès Invitée' };
let echecs = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) echecs++; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pg = require('pg'), pool = new pg.Pool({ connectionString: URLT.replace('?sslmode=disable', '') });
  await pool.query('truncate "user", spaces, invitations, live_journal, audit cascade');
  for (const t of ['quotas', 'demandes restart identity cascade']) await pool.query('truncate ' + t).catch(() => {});
  /* le propriétaire du site : un compte connu d'avance, pour que AIME_PROPRIETAIRES le désigne (comme la variable Vercel) */
  await pool.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)', [PROPRIO.id, PROPRIO.nom, PROPRIO.email]);
  try { fs.unlinkSync(LIENS); } catch {}
  const env = Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', AIME_COMPTES_TEST: '1', AIME_LIENS: LIENS, AIME_PROPRIETAIRES: PROPRIO.id });
  for (const k of ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM']) delete env[k];   /* aucun e-mail réel : la demande est notée « non configuré » */
  const srv = spawn(process.execPath, [path.join(__dirname, '../../scripts/serveur-test.cjs')], { env, stdio: 'inherit' });
  process.on('exit', () => { try { srv.kill(); } catch {} });
  await attendre(1200);
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let ip = 20;
  const contexte = (app) => b.newContext(Object.assign({ locale: 'fr-FR', extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.' + (ip++) } }, app));
  async function connecter(ctx, qui, retour) {
    const r = await ctx.request.post(B + '/api/auth/sign-in/magic-link', { data: { email: qui.email, name: qui.nom, callbackURL: retour || '/projets/' }, headers: { origin: B } });
    if (r.status() !== 200) throw new Error('lien magique ' + qui.email + ' : ' + r.status());
    await attendre(150);
    const lien = fs.readFileSync(LIENS, 'utf8').trim().split('\n').map(JSON.parse).filter(x => x.to === qui.email).pop().lien;
    const p = await ctx.newPage(); await p.goto(lien, { waitUntil: 'networkidle' }); return p;
  }
  const capture = async (p, nom) => { if (!CAP) return; fs.mkdirSync(CAP, { recursive: true }); await p.screenshot({ path: path.join(CAP, nom + '.png') }); };
  const axe = async (p, nom) => { await p.addScriptTag({ content: AXE }); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(x => x.id + ' (' + x.nodes.length + ') ' + x.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + ((n.any[0] || {}).message || '').slice(0, 90)).join(' | ')));
    ok(!v.length, nom + ' : aucune anomalie WCAG 2.2 AA' + (v.length ? ' — ' + v.join(', ') : '')); };
  const dock = p => p.evaluate(() => [...document.querySelectorAll('#dock-site .dock-e .dock-t')].map(x => x.textContent));
  const marquer = p => p.evaluate(() => { window.__sansRechargement = 1; });
  const marque = p => p.evaluate(() => window.__sansRechargement === 1);
  try {
    console.log('1. Un visiteur envoie une demande depuis Contact (iPhone)');
    const vis = await contexte(devices['iPhone 13']), pv = await vis.newPage();
    await pv.goto(B + '/contact/', { waitUntil: 'networkidle' });
    await pv.fill('[name=prenom]', 'Léa'); await pv.fill('[name=nom]', 'Fictive'); await pv.fill('[name=email]', 'lea.fictive@exemple.test');
    await pv.check('input[name=projet][value=projet]', { force: true });
    await pv.fill('[name=message]', 'Bonjour, nous préparons un mariage fictif à New York en juin et cherchons un saxophoniste pour le cocktail.');
    await pv.check('#c-accord', { force: true }); await attendre(3200); await pv.click('#c-envoyer');
    await pv.waitForFunction(() => /Merci|abouti/.test(document.getElementById('c-etat').textContent));
    ok(/Merci/.test(await pv.locator('#c-etat').innerText()), 'le visiteur voit « Merci »');
    const [dm] = (await pool.query("select cle, statut, email_statut from demandes where email = 'lea.fictive@exemple.test'")).rows;
    ok(dm && dm.statut === 'nouvelle' && dm.email_statut === 'non_configure', 'la demande est en base (nouvelle), l\'e-mail noté « non configuré » (aucun Resend en test)');

    console.log('2. Le propriétaire se connecte : AI, et la demande dans « À traiter »');
    const proD = await contexte({ viewport: { width: 1440, height: 900 } }), pd = await connecter(proD, PROPRIO);
    await pd.waitForSelector('#aTraiter:not([hidden]) [data-demande]', { timeout: 8000 });
    ok((await pd.locator('#tTitre').innerText()) === 'AI', 'le titre est « AI »');
    ok(JSON.stringify(await dock(pd)) === JSON.stringify(['AI', 'ME']), 'le Dock connecté : AI · + · ME (ni Exemples ni Le cœur)');
    ok(/Léa Fictive/.test(await pd.locator('#demandes').innerText()) && /Nouvelle/.test(await pd.locator('#demandes').innerText()), 'la demande de Léa, « Nouvelle »');
    await capture(pd, 'AI__ordinateur__1-ai'); await axe(pd, 'AI (ordinateur)');

    console.log('3. Le détail, puis le retour du navigateur, sans rechargement');
    await marquer(pd); await pd.click('[data-demande="' + dm.cle + '"]');
    await pd.waitForSelector('#dTitre'); ok(new URL(pd.url()).searchParams.get('demande') === dm.cle, 'l\'adresse porte la demande');
    ok(/saxophoniste pour le cocktail/.test(await pd.locator('#dCorps').innerText()), 'le message complet');
    ok(/E-mail non configuré/.test(await pd.locator('#dCorps').innerText()) && await pd.locator('#dCorps button', { hasText: 'Renvoyer' }).count() === 1, 'les deux statuts : la demande, et l\'e-mail (avec « Renvoyer »)');
    await attendre(600); ok((await pool.query('select statut from demandes where cle = $1', [dm.cle])).rows[0].statut === 'lue', 'consultée : « lue » au serveur');
    await capture(pd, 'AI__ordinateur__2-demande'); await axe(pd, 'Détail d\'une demande (ordinateur)');
    await pd.goBack(); await pd.waitForSelector('#espaces:not([hidden])');
    ok(await marque(pd), 'retour : AI, sans rechargement'); ok(await pd.locator('#demande').isHidden(), 'le détail est fermé');

    console.log('4. Créer un projet, l\'ouvrir sans recharger, avec le Dock du serveur');
    await pd.fill('#eTitre', 'Mariage New York (test)'); await pd.click('#fEspace button[type=submit]');
    await pd.waitForFunction(() => /Mariage New York/.test(document.getElementById('tTitre').textContent), null, { timeout: 8000 });
    ok(await marque(pd), 'le nouveau projet s\'ouvre sans rechargement');
    const A = new URL(pd.url()).searchParams.get('espace'); ok(!!A, 'l\'adresse porte le projet');
    const dA = await dock(pd); ok(dA.includes('Mon accès') && !dA.includes('AI'), 'le Dock du projet (composé au serveur) : ' + dA.join(' · '));
    await capture(pd, 'AI__ordinateur__3-projet');
    const r2 = await proD.request.post(B + '/api/espaces', { data: { action: 'creer', titre: 'Séminaire fictif (test)', modele: 'seminaire' }, headers: { origin: B } });
    const Bid = (await r2.json()).id;

    console.log('5. Changer de projet : rien du précédent ne reste, même si le réseau répond dans le désordre');
    await pd.click('#pChanger summary'); await pd.waitForSelector('#pChangerListe [data-ouvrir="' + Bid + '"]');
    await pd.click('#pChangerListe [data-ouvrir="' + Bid + '"]');
    await pd.waitForFunction(() => /Séminaire fictif/.test(document.getElementById('tTitre').textContent));
    ok(!/Mariage New York/.test(await pd.locator('main').innerText()), 'B ouvert : aucun mot de A dans l\'écran');
    ok(await marque(pd), 'sans rechargement');
    /* le désordre : A répond lentement, B tout de suite ; on demande A puis B ; seul B doit s'afficher */
    await pd.route('**/api/page?espace=' + A + '*', async r => { await attendre(1500); await r.continue(); });
    await pd.evaluate(([a, b]) => { AIMEAI.ouvrirProjet(a); setTimeout(() => AIMEAI.ouvrirProjet(b), 50); }, [A, Bid]);
    await attendre(2200);
    ok(/Séminaire fictif/.test(await pd.locator('#tTitre').innerText()) && !/Mariage New York/.test(await pd.locator('main').innerText()), 'réponse tardive de A ignorée : l\'écran reste celui de B');
    await pd.unroute('**/api/page?espace=' + A + '*');
    /* et vers AI : une réponse de projet en vol ne s'affiche pas dans AI */
    await pd.route('**/api/page?espace=' + A + '*', async r => { await attendre(1200); await r.continue(); });
    await pd.evaluate(a => { AIMEAI.ouvrirProjet(a); setTimeout(() => AIMEAI.aller('/projets/'), 50); }, A);
    await attendre(1800);
    ok(await pd.locator('#projet').isHidden() && (await pd.locator('#tTitre').innerText()) === 'AI', 'réponse tardive d\'un projet ignorée : AI reste AI');
    ok(JSON.stringify(await dock(pd)) === JSON.stringify(['AI', 'ME']), 'le Dock personnel est revenu');
    await pd.unroute('**/api/page?espace=' + A + '*');

    console.log('6. Retour du navigateur et lien « ← AI »');
    await pd.click('[data-ouvrir="' + A + '"]'); await pd.waitForFunction(() => /Mariage New York/.test(document.getElementById('tTitre').textContent));
    await pd.goBack(); await pd.waitForSelector('#espaces:not([hidden])'); ok((await pd.locator('#tTitre').innerText()) === 'AI', 'Retour : AI');
    await pd.goForward(); await pd.waitForFunction(() => /Mariage New York/.test(document.getElementById('tTitre').textContent)); ok(true, 'Suivant : le projet');
    await pd.click('#projet [data-vers-ai]'); await pd.waitForSelector('#espaces:not([hidden])'); ok(await marque(pd), '« ← AI » : sans rechargement');
    await pd.reload({ waitUntil: 'networkidle' }); await pd.waitForSelector('#aTraiter:not([hidden]) [data-demande]'); await pd.waitForSelector('#liste article');
    ok((await pd.locator('#liste').innerText()).includes('Mariage New York'), 'après rechargement : la demande et les projets sont toujours là (persistance)');

    console.log('7. Une personne invitée : sa perspective, ni « À traiter » ni demandes');
    const inv = await (await proD.request.post(B + '/api/espaces', { data: { action: 'inviter', espace: A, role: 'guest', email: MEMBRE.email }, headers: { origin: B } })).json();
    const memb = await contexte(devices['iPhone 13']), pm = await connecter(memb, MEMBRE, '/projets/?invitation=' + new URL(inv.lien).searchParams.get('invitation'));
    await pm.waitForFunction(() => /Mariage New York/.test(document.getElementById('tTitre').textContent), null, { timeout: 8000 });
    const dM = await dock(pm); ok(!dM.includes('AI'), 'l\'invitée arrive dans le projet, avec le Dock de son rôle : ' + dM.join(' · '));
    await capture(pm, 'AI__iphone__invitee-projet');
    await pm.click('#projet [data-vers-ai]'); await pm.waitForSelector('#espaces:not([hidden])'); await attendre(500);
    ok(await pm.locator('#aTraiter').isHidden(), 'son AI : pas de « À traiter »');
    ok((await memb.request.get(B + '/api/demandes')).status() === 404, 'GET /api/demandes : 404 pour elle');
    ok((await memb.request.get(B + '/api/demandes?cle=' + dm.cle)).status() === 404, 'le détail : 404 pour elle');
    await pm.goto(B + '/projets/?demande=' + dm.cle, { waitUntil: 'networkidle' }); await pm.waitForSelector('#dCorps .alerte');
    ok(!/Léa|saxophoniste/.test(await pm.locator('main').innerText()), 'par l\'adresse directe : aucune donnée de la demande');
    await capture(pm, 'AI__iphone__invitee-ai'); await axe(pm, 'AI de l\'invitée (iPhone)');

    console.log('8. Le propriétaire sur iPhone : AI, le détail, ME');
    const proT = await contexte(devices['iPhone 13']), pt = await connecter(proT, PROPRIO);
    await pt.waitForSelector('#aTraiter:not([hidden]) [data-demande]'); await capture(pt, 'AI__iphone__1-ai'); await axe(pt, 'AI (iPhone)');
    const deb = await pt.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); ok(!deb, 'iPhone : aucun défilement horizontal');
    await pt.click('[data-demande="' + dm.cle + '"]'); await pt.waitForSelector('#dTitre'); await capture(pt, 'AI__iphone__2-demande'); await axe(pt, 'Détail (iPhone)');
    await pt.goBack(); await pt.waitForSelector('#espaces:not([hidden])');
    await pt.click('#dock-site a[data-lieu="me"]'); await pt.waitForURL(/\/compte\/$/); await pt.waitForSelector('#profil:not([hidden])');
    ok(true, 'ME : /compte/ s\'ouvre depuis le Dock'); await capture(pt, 'AI__iphone__3-me');
  } catch (e) { echecs++; console.error(e); }
  await b.close(); await pool.end(); try { srv.kill(); } catch {}
  console.log(echecs ? '\nparcours AI : ' + echecs + ' échec(s)' : '\nparcours AI : tout est vert');
  process.exit(echecs ? 1 : 0);
})();
